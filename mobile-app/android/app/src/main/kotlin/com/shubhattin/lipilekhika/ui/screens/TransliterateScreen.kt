package com.shubhattin.lipilekhika.ui.screens

import android.text.InputType
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.input.TextFieldLineLimits
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.automirrored.outlined.Redo
import androidx.compose.material.icons.automirrored.outlined.Undo
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.FileOpen
import androidx.compose.material.icons.outlined.Keyboard
import androidx.compose.material.icons.outlined.KeyboardHide
import androidx.compose.material.icons.outlined.MoreVert
import androidx.compose.material.icons.outlined.Save
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.InterceptPlatformTextInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.PlatformTextInputInterceptor
import androidx.compose.ui.platform.PlatformTextInputMethodRequest
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shubhattin.lipilekhika.data.TextFiles
import com.shubhattin.lipilekhika.state.AppStore
import com.shubhattin.lipilekhika.state.SourceNote
import com.shubhattin.lipilekhika.ui.components.CopyButton
import com.shubhattin.lipilekhika.ui.components.IconAction
import com.shubhattin.lipilekhika.ui.components.LipiCard
import com.shubhattin.lipilekhika.ui.components.OptionsPanel
import com.shubhattin.lipilekhika.ui.components.Pill
import com.shubhattin.lipilekhika.ui.components.ScriptBar
import com.shubhattin.lipilekhika.ui.components.ScriptPickerSheet
import com.shubhattin.lipilekhika.ui.components.TypingOptionChips
import com.shubhattin.lipilekhika.ui.components.TypingOptionsSheet
import com.shubhattin.lipilekhika.ui.theme.LocalLipiColors
import com.shubhattin.lipilekhika.ui.theme.scriptFont
import com.shubhattin.lipilekhika.ui.typinghelp.TypingHelpSheet

/** The sheets this screen can show (one at a time) */
private enum class Sheet {
    FROM,
    TO,
    TYPING_OPTIONS,
    TYPING_HELP,
}

/** What the file buttons do (the launchers live in the screen) */
private class TextActions(
    val open: () -> Unit,
    val saveSource: () -> Unit,
    val saveOutput: () -> Unit,
)

/**
 * The transliteration page: the script bar, the source card (with realtime typing), the output card
 * and the options, the same parts as the web app's /app. Side by side on a wide screen.
 */
@Composable
fun TransliterateScreen(store: AppStore) {
    var sheet by rememberSaveable { mutableStateOf<Sheet?>(null) }
    val context = LocalContext.current
    val resolver = context.contentResolver

    // the system file pickers (like <input type="file"> and a download)
    val openFile =
        rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) store.openFile(resolver, uri)
        }
    var textToSave by remember { mutableStateOf("") }
    val saveFile =
        rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/plain")) {
            uri ->
            if (uri != null) {
                store.saveFile(resolver, uri, textToSave) { ok ->
                    Toast.makeText(
                            context,
                            if (ok) "Saved" else "Couldn't save the file",
                            Toast.LENGTH_SHORT,
                        )
                        .show()
                }
            }
        }
    val actions =
        TextActions(
            open = { openFile.launch(arrayOf("text/plain")) },
            saveSource = {
                textToSave = store.source.text.toString()
                saveFile.launch(TextFiles.fileName("source", store.fromScript))
            },
            saveOutput = {
                textToSave = store.output
                saveFile.launch(TextFiles.fileName("output", store.toScript))
            },
        )

    BoxWithConstraints(Modifier.fillMaxSize()) {
        val wide = maxWidth >= 720.dp
        // the two boxes share the height of the screen (the preset and the options are just
        // below, a scroll away), and grow with their text up to about half the screen
        val minBox =
            if (wide) ((maxHeight.value - 190f)).coerceIn(160f, 560f).dp
            else ((maxHeight.value - 300f) / 2f).coerceIn(132f, 400f).dp
        val maxBox = (maxHeight.value * 0.45f).coerceIn(220f, 520f).dp.coerceAtLeast(minBox)

        Column(
            Modifier.fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(horizontal = 14.dp, vertical = 12.dp)
                .navigationBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            ScriptBar(
                from = store.fromScript,
                to = store.toScript,
                onFrom = { sheet = Sheet.FROM },
                onTo = { sheet = Sheet.TO },
                onSwap = store::swap,
            )
            if (wide) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SourceCard(store, minBox, maxBox, actions, { sheet = it }, Modifier.weight(1f))
                    OutputCard(store, minBox, maxBox, actions, Modifier.weight(1f))
                }
            } else {
                SourceCard(store, minBox, maxBox, actions, { sheet = it })
                OutputCard(store, minBox, maxBox, actions)
            }
            OptionsPanel(
                presetKey = store.presetKey,
                onPreset = store::selectPreset,
                options = store.options,
                onToggle = store::setOption,
                modifier = Modifier.widthIn(max = 760.dp),
            )
            Spacer(Modifier.height(4.dp))
        }
    }

    when (sheet) {
        Sheet.FROM ->
            ScriptPickerSheet(
                current = store.fromScript,
                withNormal = false,
                title = "Type in",
                onSelect = {
                    store.selectFrom(it)
                    sheet = null
                },
                onDismiss = { sheet = null },
            )
        Sheet.TO ->
            ScriptPickerSheet(
                current = store.toScript,
                withNormal = true,
                title = "Convert to",
                onSelect = {
                    store.selectTo(it)
                    sheet = null
                },
                onDismiss = { sheet = null },
            )
        Sheet.TYPING_OPTIONS ->
            TypingOptionsSheet(
                script = store.fromScript,
                useNativeNumerals = store.useNativeNumerals,
                includeInherentVowel = store.includeInherentVowel,
                onNativeNumerals = store::setNativeNumerals,
                onInherentVowel = store::setInherentVowel,
                onDismiss = { sheet = null },
            )
        Sheet.TYPING_HELP ->
            TypingHelpSheet(script = store.fromScript, onDismiss = { sheet = null })
        null -> {}
    }
}

/** The keyboard as Compose asks for it */
private val PlainKeyboard = PlatformTextInputInterceptor { request, next ->
    next.startInputMethod(request)
}

/**
 * The keyboard for realtime typing: "visible password" text (what Flutter asks for when suggestions
 * are off). Keyboards like Gboard then neither suggest nor compose words, so each key reaches the
 * typing on its own; unlike a password field it is not secret (no secure keyboard, the screen can
 * be captured).
 */
private val NoSuggestionsKeyboard = PlatformTextInputInterceptor { request, next ->
    next.startInputMethod(
        PlatformTextInputMethodRequest { outAttributes ->
            val connection = request.createInputConnection(outAttributes)
            outAttributes.inputType =
                InputType.TYPE_CLASS_TEXT or
                    InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD or
                    InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS or
                    InputType.TYPE_TEXT_FLAG_MULTI_LINE
            connection
        }
    )
}

/** The text style of the two boxes, in the font of their script */
@Composable
private fun boxTextStyle(script: String, color: Color) =
    TextStyle(fontFamily = scriptFont(script), fontSize = 19.sp, lineHeight = 30.sp, color = color)

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun SourceCard(
    store: AppStore,
    minBox: Dp,
    maxBox: Dp,
    actions: TextActions,
    openSheet: (Sheet) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LocalLipiColors.current
    val from = store.fromScript
    val typing = store.typingEnabled && from != "Normal"
    val text = store.source.text
    val canUndo = store.source.undoState.canUndo
    val canRedo = store.source.undoState.canRedo
    val replaced =
        store.replaced?.takeIf { it.after.length == text.length && it.after == text.toString() }
    var menu by remember { mutableStateOf(false) }

    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        LipiCard {
            Column {
                // the top row: typing on/off, the guide, and the box's actions
                Row(
                    Modifier.fillMaxWidth().padding(start = 12.dp, end = 4.dp, top = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Pill(onClick = store::toggleTyping, active = store.typingEnabled) {
                        Icon(
                            if (store.typingEnabled) Icons.Outlined.Keyboard
                            else Icons.Outlined.KeyboardHide,
                            contentDescription = null,
                            modifier = Modifier.size(15.dp),
                        )
                        Text("Typing")
                    }
                    if (from != "Normal") {
                        HelpPill(seen = store.typingGuideSeen) {
                            store.markTypingGuideSeen()
                            openSheet(Sheet.TYPING_HELP)
                        }
                    }
                    Spacer(Modifier.weight(1f))
                    CopyButton(
                        "Copy source text",
                        { store.source.text.toString() },
                        enabled = text.isNotEmpty(),
                    )
                    Box {
                        IconAction(Icons.Outlined.MoreVert, "More", { menu = true })
                        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                            DropdownMenuItem(
                                text = { Text("Typing options") },
                                leadingIcon = { Icon(Icons.Outlined.Tune, null) },
                                onClick = {
                                    menu = false
                                    openSheet(Sheet.TYPING_OPTIONS)
                                },
                            )
                            // a setting: the menu stays open, so the tick is seen to change
                            DropdownMenuItem(
                                text = { Text("Remember text") },
                                leadingIcon = {
                                    Checkbox(checked = store.rememberText, onCheckedChange = null)
                                },
                                onClick = { store.updateRememberText(!store.rememberText) },
                            )
                            DropdownMenuItem(
                                text = { Text("Open .txt file…") },
                                leadingIcon = { Icon(Icons.Outlined.FileOpen, null) },
                                onClick = {
                                    menu = false
                                    actions.open()
                                },
                            )
                            DropdownMenuItem(
                                text = { Text("Save as .txt") },
                                leadingIcon = { Icon(Icons.Outlined.Save, null) },
                                enabled = text.isNotEmpty(),
                                onClick = {
                                    menu = false
                                    actions.saveSource()
                                },
                            )
                        }
                    }
                }
                // the text: grows with its content. While typing in a script the keyboard is
                // asked for "visible password" text: no suggestions or autocorrect, so each key
                // comes on its own (the typing needs that), without it being a secret field
                InterceptPlatformTextInput(if (typing) NoSuggestionsKeyboard else PlainKeyboard) {
                    BasicTextField(
                        state = store.source,
                        modifier =
                            Modifier.fillMaxWidth()
                                .heightIn(min = minBox, max = maxBox)
                                .padding(horizontal = 16.dp, vertical = 10.dp)
                                .onFocusChanged { if (!it.isFocused) store.clearTypingContext() },
                        inputTransformation = if (typing) store.typingTransformation else null,
                        textStyle = boxTextStyle(from, MaterialTheme.colorScheme.onSurface),
                        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                        keyboardOptions =
                            KeyboardOptions(
                                autoCorrectEnabled = false,
                                capitalization = KeyboardCapitalization.None,
                            ),
                        lineLimits = TextFieldLineLimits.MultiLine(),
                        decorator = { field ->
                            Box {
                                if (text.isEmpty()) {
                                    Text(
                                        if (typing) "Type with English letters to write in $from"
                                        else "Enter text to transliterate",
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = colors.mutedForeground.copy(alpha = 0.8f),
                                    )
                                }
                                field()
                            }
                        },
                    )
                }
                // the bottom row: the typing toggles, undo / redo, clear
                Row(
                    Modifier.fillMaxWidth().padding(start = 12.dp, end = 4.dp, bottom = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    if (typing) {
                        TypingOptionChips(
                            script = from,
                            useNativeNumerals = store.useNativeNumerals,
                            includeInherentVowel = store.includeInherentVowel,
                            onNativeNumerals = store::setNativeNumerals,
                            onInherentVowel = store::setInherentVowel,
                        )
                    }
                    Spacer(Modifier.weight(1f))
                    if (canUndo || canRedo) {
                        IconAction(
                            Icons.AutoMirrored.Outlined.Undo,
                            "Undo",
                            store::undo,
                            enabled = canUndo,
                        )
                        IconAction(
                            Icons.AutoMirrored.Outlined.Redo,
                            "Redo",
                            store::redo,
                            enabled = canRedo,
                        )
                    }
                    when {
                        replaced != null ->
                            Pill(onClick = store::undoReplace, active = true) {
                                Icon(
                                    Icons.AutoMirrored.Outlined.Undo,
                                    null,
                                    Modifier.size(14.dp),
                                )
                                Text(if (replaced.by == "clear") "Undo clear" else "Undo open")
                            }
                        text.isEmpty() ->
                            Pill(onClick = actions.open) {
                                Icon(Icons.Outlined.FileOpen, null, Modifier.size(14.dp))
                                Text("Open .txt")
                            }
                        else ->
                            IconAction(
                                Icons.Outlined.Close,
                                "Clear source text (and the kept copy)",
                                store::clear,
                            )
                    }
                }
            }
        }
        SourceNoteText(store.note)
    }
}

@Composable
private fun SourceNoteText(note: SourceNote?) {
    val colors = LocalLipiColors.current
    val (message, error) =
        when (note) {
            SourceNote.Restored ->
                "Restored from your last visit. Clear removes it from this device; to stop keeping text, turn off Remember text in ⋮." to
                    false
            SourceNote.TooLong ->
                "This text is too long to keep on this device, so it won't be here next time. Save it as .txt to keep it." to
                    false
            is SourceNote.FileError -> note.message to true
            null -> return
        }
    Text(
        message,
        style = MaterialTheme.typography.bodySmall,
        color = if (error) MaterialTheme.colorScheme.error else colors.mutedForeground,
        modifier = Modifier.padding(horizontal = 6.dp),
    )
}

@Composable
private fun OutputCard(
    store: AppStore,
    minBox: Dp,
    maxBox: Dp,
    actions: TextActions,
    modifier: Modifier = Modifier,
) {
    val colors = LocalLipiColors.current
    val output = store.output
    val primary = MaterialTheme.colorScheme.primary
    LipiCard(modifier) {
        Column(Modifier.background(primary.copy(alpha = 0.035f))) {
            Row(
                Modifier.fillMaxWidth().padding(start = 12.dp, end = 4.dp, top = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Pill(onClick = store::toggleAutoConvert, active = store.autoConvert) {
                    Icon(Icons.Outlined.Bolt, null, Modifier.size(15.dp))
                    Text("Auto convert")
                }
                if (!store.autoConvert) {
                    Pill(
                        onClick = store::convertNow,
                        active = true,
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 5.dp),
                    ) {
                        Icon(Icons.Outlined.Sync, null, Modifier.size(15.dp))
                        Text("Convert")
                    }
                }
                Spacer(Modifier.weight(1f))
                CopyButton("Copy output text", { store.output }, enabled = output.isNotEmpty())
                IconAction(
                    Icons.Outlined.Save,
                    "Save as .txt",
                    actions.saveOutput,
                    enabled = output.isNotEmpty(),
                )
            }
            Box(
                Modifier.fillMaxWidth()
                    .heightIn(min = minBox, max = maxBox)
                    .verticalScroll(rememberScrollState())
                    .padding(start = 16.dp, end = 16.dp, top = 10.dp, bottom = 16.dp)
            ) {
                if (output.isEmpty()) {
                    Text(
                        "The ${store.toScript} text shows here",
                        style = MaterialTheme.typography.bodyLarge,
                        color = colors.mutedForeground.copy(alpha = 0.8f),
                    )
                } else {
                    SelectionContainer {
                        Text(
                            output,
                            style =
                                boxTextStyle(store.toScript, MaterialTheme.colorScheme.onSurface),
                        )
                    }
                }
            }
        }
    }
}

/** "Help": the typing guide, with a pulsing dot until it was opened once */
@Composable
private fun HelpPill(seen: Boolean, onClick: () -> Unit) {
    val sky = Color(0xFF0EA5E9)
    Box {
        Pill(onClick = onClick, active = true, activeColor = sky) {
            Icon(Icons.AutoMirrored.Outlined.MenuBook, null, Modifier.size(15.dp))
            Text("Help")
        }
        if (!seen) {
            val pulse = rememberInfiniteTransition(label = "pulse")
            val alpha by
                pulse.animateFloat(
                    0.35f,
                    1f,
                    infiniteRepeatable(tween(900), RepeatMode.Reverse),
                    label = "dot",
                )
            Box(
                Modifier.align(Alignment.TopEnd)
                    .offset(x = 1.dp, y = (-1).dp)
                    .size(8.dp)
                    .alpha(alpha)
                    .background(sky, CircleShape)
            )
        }
    }
}
