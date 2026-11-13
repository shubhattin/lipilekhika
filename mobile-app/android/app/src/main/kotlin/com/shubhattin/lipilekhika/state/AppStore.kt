package com.shubhattin.lipilekhika.state

import android.app.Application
import android.content.ContentResolver
import android.net.Uri
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.text.input.InputTransformation
import androidx.compose.foundation.text.input.TextFieldBuffer
import androidx.compose.foundation.text.input.TextFieldState
import androidx.compose.foundation.text.input.setTextAndPlaceCursorAtEnd
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.text.TextRange
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.shubhattin.lipilekhika.core.DEFAULT_INCLUDE_INHERENT_VOWEL
import com.shubhattin.lipilekhika.core.DEFAULT_USE_NATIVE_NUMERALS
import com.shubhattin.lipilekhika.core.LipiException
import com.shubhattin.lipilekhika.core.TypingContext
import com.shubhattin.lipilekhika.core.TypingContextOptions
import com.shubhattin.lipilekhika.core.createTypingContext
import com.shubhattin.lipilekhika.core.getAllOptions
import com.shubhattin.lipilekhika.core.getNormalizedScriptName
import com.shubhattin.lipilekhika.core.preloadScriptData
import com.shubhattin.lipilekhika.core.transliterate
import com.shubhattin.lipilekhika.data.Prefs
import com.shubhattin.lipilekhika.data.Presets
import com.shubhattin.lipilekhika.data.SavedText
import com.shubhattin.lipilekhika.data.TextFiles
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** The screens of the app (no router needed for two) */
enum class Screen {
    TRANSLITERATE,
    ABOUT,
}

/** A note under the source box */
sealed interface SourceNote {
    /** The text was restored from the last visit */
    data object Restored : SourceNote

    /** The text is too long to keep for the next visit */
    data object TooLong : SourceNote

    /** A file could not be opened */
    data class FileError(val message: String) : SourceNote
}

/** The text that Clear / Open replaced, offered back by "Undo clear" / "Undo open" */
data class Replaced(val by: String, val after: String)

/**
 * The state of the app, in one place: the equivalent of a Svelte store module (or a React context +
 * reducer). Each `var x by mutableStateOf(...)` is like a Svelte `$state` / writable: a composable
 * that reads it re-renders when it changes. The screens only read these and call the functions
 * below (like dispatching actions), they never change the state themselves.
 *
 * It is a ViewModel, so it lives across screen rotations.
 */
@OptIn(ExperimentalFoundationApi::class, FlowPreview::class)
class AppStore(app: Application) : AndroidViewModel(app) {
    private val prefs = Prefs(app)
    private val savedText = SavedText(app)

    // ---- settings (saved) ----

    /** The script typed in (the source) */
    var fromScript by mutableStateOf(validScript(prefs.fromScript, "Devanagari"))
        private set

    var toScript by mutableStateOf(validScript(prefs.toScript, "Romanized"))
        private set

    var presetKey by mutableStateOf(prefs.preset?.takeIf(Presets::isPreset) ?: "none")
        private set

    var useNativeNumerals by mutableStateOf(prefs.useNativeNumerals ?: DEFAULT_USE_NATIVE_NUMERALS)
        private set

    var includeInherentVowel by
        mutableStateOf(prefs.includeInherentVowel ?: DEFAULT_INCLUDE_INHERENT_VOWEL)
        private set

    /** "system", "light" or "dark" */
    var theme by mutableStateOf(prefs.theme)
        private set

    var typingGuideSeen by mutableStateOf(prefs.typingGuideSeen)
        private set

    /** "Remember text": the source text is kept for the next launch */
    var rememberText by mutableStateOf(prefs.rememberText)
        private set

    // ---- page state ----

    var screen by mutableStateOf(Screen.TRANSLITERATE)

    /** The options of the pair of scripts, and their values */
    var options by mutableStateOf<Map<String, Boolean>>(emptyMap())
        private set

    /** Realtime typing: English keys type in the source script */
    var typingEnabled by mutableStateOf(true)
        private set

    /** Convert while typing (otherwise the Convert button) */
    var autoConvert by mutableStateOf(true)
        private set

    /** The source text (the text field's own state, with its undo history) */
    val source = TextFieldState(if (prefs.rememberText) savedText.load() else "")

    var output by mutableStateOf("")
        private set

    var note by
        mutableStateOf<SourceNote?>(if (source.text.isNotEmpty()) SourceNote.Restored else null)
        private set

    /**
     * Set by Clear / Open, for their Undo button (shown while the text is still [Replaced.after])
     */
    var replaced by mutableStateOf<Replaced?>(null)
        private set

    private var typingContext: TypingContext? = null

    /** Where the last typed key ended: typing anywhere else starts a new context */
    private var lastTypedEnd = -1

    private var noteJob: Job? = null

    init {
        reloadOptions()
        recreateTypingContext()
        // like a Svelte `$effect`: re-runs when what it reads changes
        viewModelScope.launch {
            snapshotFlow {
                ConvertRequest(
                    // without auto convert, typing does not convert (the button does)
                    text = if (autoConvert) source.text.toString() else null,
                    from = fromScript,
                    to = toScript,
                    options = options,
                )
            }
                .distinctUntilChanged()
                .collectLatest { convert(it.copy(text = it.text ?: source.text.toString())) }
        }
        // the source text is kept for the next launch, half a second after typing stops
        viewModelScope.launch {
            snapshotFlow { source.text.toString() }
                .distinctUntilChanged()
                .drop(1)
                .collectLatest {
                    if (note == SourceNote.Restored) note = null
                    delay(SAVE_DELAY_MS)
                    save(it)
                }
        }
        viewModelScope.launch(Dispatchers.Default) {
            // loads the data before the first key (the first transliteration is then fast)
            runCatching {
                preloadScriptData(fromScript)
                preloadScriptData(toScript)
            }
        }
    }

    private data class ConvertRequest(
        val text: String?,
        val from: String,
        val to: String,
        val options: Map<String, Boolean>,
    )

    private suspend fun convert(req: ConvertRequest) {
        val text = req.text.orEmpty()
        output =
            if (text.isEmpty()) ""
            else
                withContext(Dispatchers.Default) {
                    try {
                        transliterate(text, req.from, req.to, req.options.ifEmpty { null })
                    } catch (_: LipiException) {
                        ""
                    }
                }
    }

    /** The Convert button (auto convert off) */
    fun convertNow() {
        viewModelScope.launch {
            convert(ConvertRequest(source.text.toString(), fromScript, toScript, options))
        }
    }

    // ---- scripts, preset and options ----

    fun selectFrom(script: String) {
        if (script == fromScript) return
        fromScript = script
        prefs.fromScript = script
        recreateTypingContext()
        reloadOptions()
    }

    fun selectTo(script: String) {
        if (script == toScript) return
        toScript = script
        prefs.toScript = script
        reloadOptions()
    }

    /** Swaps the scripts and the texts (swap again to undo it) */
    fun swap() {
        val newText = output
        val oldFrom = fromScript
        fromScript = toScript
        toScript = oldFrom
        prefs.fromScript = fromScript
        prefs.toScript = toScript
        source.setTextAndPlaceCursorAtEnd(newText)
        source.undoState.clearHistory()
        replaced = null
        recreateTypingContext()
        reloadOptions()
    }

    fun selectPreset(key: String) {
        presetKey = key
        prefs.preset = key
        reloadOptions()
    }

    /** A manual change of an option: the preset no longer applies (it becomes None) */
    fun setOption(key: String, value: Boolean) {
        options = options + (key to value)
        if (presetKey != "none") {
            presetKey = "none"
            prefs.preset = "none"
        }
    }

    /** The options of the pair, as the preset sets them */
    private fun reloadOptions() {
        val available =
            try {
                getAllOptions(fromScript, toScript)
            } catch (_: LipiException) {
                emptyList()
            }
        options = Presets.apply(Presets.get(presetKey), available, fromScript, toScript)
    }

    // ---- typing ----

    fun toggleTyping() {
        typingEnabled = !typingEnabled
        clearTypingContext()
    }

    fun toggleAutoConvert() {
        autoConvert = !autoConvert
    }

    fun setNativeNumerals(value: Boolean) {
        useNativeNumerals = value
        prefs.useNativeNumerals = value
        typingContext?.updateUseNativeNumerals(value)
    }

    fun setInherentVowel(value: Boolean) {
        includeInherentVowel = value
        prefs.includeInherentVowel = value
        typingContext?.updateIncludeInherentVowel(value)
    }

    private fun recreateTypingContext() {
        typingContext?.close()
        typingContext =
            try {
                createTypingContext(
                    fromScript,
                    TypingContextOptions(
                        useNativeNumerals = useNativeNumerals,
                        includeInherentVowel = includeInherentVowel,
                    ),
                )
            } catch (_: LipiException) {
                null
            }
        lastTypedEnd = -1
    }

    /** The next key starts anew (after a jump of the cursor, a paste, an undo, ...) */
    fun clearTypingContext() {
        typingContext?.clearContext()
        lastTypedEnd = -1
    }

    /**
     * Realtime typing, run by the text field on each edit before it is shown (like an `oninput`
     * handler that can rewrite the change). A single key typed at the cursor goes through the
     * typing context: it may delete some characters before it and adds the script text. Anything
     * else (delete, paste, a selection replaced) is kept as it is and starts a new context.
     */
    val typingTransformation = InputTransformation { applyTyping() }

    private fun TextFieldBuffer.applyTyping() {
        val ctx = typingContext
        if (!typingEnabled || ctx == null) return
        if (changes.changeCount != 1) return clearTypingContext()
        val range = changes.getRange(0)
        val original = changes.getOriginalRange(0)
        val text = asCharSequence()
        val key = text.subSequence(range.start, range.end).toString()
        val oneKey =
            original.collapsed &&
                key.isNotEmpty() &&
                key.codePointCount(0, key.length) == 1 &&
                selection.collapsed &&
                selection.start == range.end
        if (!oneKey) return clearTypingContext()
        if (range.start != lastTypedEnd) ctx.clearContext()

        val diff = ctx.takeKeyInput(key)
        val deleteCount = utf16Count(text, range.start, diff.toDeleteCharsCount)
        val start = range.start - deleteCount
        replace(start, range.end, diff.diffAddText)
        val end = start + diff.diffAddText.length
        selection = TextRange(end)
        lastTypedEnd = end
    }

    /** The UTF-16 length of the last [codePoints] code points before [end] */
    private fun utf16Count(text: CharSequence, end: Int, codePoints: Int): Int {
        var i = end
        var left = codePoints
        while (left > 0 && i > 0) {
            i -=
                if (i >= 2 && text[i - 1].isLowSurrogate() && text[i - 2].isHighSurrogate()) 2
                else 1
            left--
        }
        return end - i
    }

    // ---- undo / redo, clear, files ----

    fun undo() {
        source.undoState.undo()
        clearTypingContext()
    }

    fun redo() {
        source.undoState.redo()
        clearTypingContext()
    }

    /** Clear: also removes the kept copy at once */
    fun clear() {
        replaceSource("", by = "clear")
        save("")
    }

    /** The text before the last Clear / Open (one undo step) */
    fun undoReplace() {
        if (replaced == null) return
        replaced = null
        undo()
    }

    private fun replaceSource(text: String, by: String) {
        val old = source.text.toString()
        if (old == text) return
        source.setTextAndPlaceCursorAtEnd(text)
        replaced = if (old.isNotEmpty()) Replaced(by, text) else null
        clearTypingContext()
    }

    /** Opens a `.txt` file into the source box */
    fun openFile(resolver: ContentResolver, uri: Uri) {
        viewModelScope.launch {
            when (val result = withContext(Dispatchers.IO) { TextFiles.read(resolver, uri) }) {
                is TextFiles.ReadResult.Ok -> replaceSource(result.text, by = "open")
                is TextFiles.ReadResult.Error -> showNote(SourceNote.FileError(result.message))
            }
        }
    }

    /** Text shared from another app ("Share → Lipi Lekhika") */
    fun openSharedText(text: String) {
        screen = Screen.TRANSLITERATE
        replaceSource(text, by = "open")
    }

    /** Saves [text] to a document; calls [onDone] with false when it failed */
    fun saveFile(resolver: ContentResolver, uri: Uri, text: String, onDone: (Boolean) -> Unit) {
        viewModelScope.launch {
            onDone(withContext(Dispatchers.IO) { TextFiles.write(resolver, uri, text) })
        }
    }

    private fun showNote(value: SourceNote, forMs: Long = 6000) {
        noteJob?.cancel()
        note = value
        noteJob = viewModelScope.launch {
            delay(forMs)
            if (note == value) note = null
        }
    }

    /** Keeps the source text now (the app goes to the background) */
    fun flushSave() = save(source.text.toString())

    private fun save(text: String) {
        if (!rememberText) return
        val result = savedText.save(text)
        if (result == SavedText.Result.TOO_LARGE) note = SourceNote.TooLong
        else if (note == SourceNote.TooLong) note = null
    }

    /** Off also removes the kept copy now (not only later saves); on keeps the text at once */
    fun updateRememberText(on: Boolean) {
        rememberText = on
        prefs.rememberText = on
        if (on) {
            save(source.text.toString())
        } else {
            savedText.save("")
            if (note == SourceNote.Restored || note == SourceNote.TooLong) note = null
        }
    }

    // ---- app ----

    fun selectTheme(value: String) {
        theme = value
        prefs.theme = value
    }

    fun markTypingGuideSeen() {
        typingGuideSeen = true
        prefs.typingGuideSeen = true
    }

    override fun onCleared() {
        typingContext?.close()
    }

    private companion object {
        const val SAVE_DELAY_MS = 500L

        /** A saved script name, if it is still a script, else [fallback] */
        fun validScript(name: String?, fallback: String): String =
            name?.let { runCatching { getNormalizedScriptName(it) }.getOrNull() } ?: fallback
    }
}
