@file:JvmName("LipilekhikaTyping")

/**
 * Typing in a script key by key (the realtime typing of the apps), and the typing data of the
 * scripts (the typing help). From Java the functions are static methods of `LipilekhikaTyping`.
 */
package com.shubhattin.lipilekhika.core

/**
 * A typing context: the state of the text being typed in one script. [takeKeyInput] takes each key
 * and returns a [TypingDiff], the change to make to the text. [createTypingContext] makes one.
 *
 * It holds a Rust object: [close] frees it at once (or `use { }`), otherwise it is freed after the
 * context is garbage collected. Its methods can be called from any thread (one call at a time), and
 * throw an [IllegalStateException] after [close].
 *
 * @throws LipiException for an unknown script name or a negative clear time
 */
class TypingContext
@JvmOverloads
constructor(typingScript: String, options: TypingContextOptions? = null) : AutoCloseable {
    /** The pointer to the Rust object, `0` once freed (only read under the lock of `this`) */
    private class Handle(var pointer: Long) : Runnable {
        override fun run() {
            val pointer = pointer
            this.pointer = 0
            if (pointer != 0L) NativeLib.typingContextFree(pointer)
        }
    }

    private val handle =
        Handle(
            NativeLib.typingContextNew(
                typingScript,
                options != null,
                options?.autoContextClearTimeMs ?: 0,
                options?.useNativeNumerals ?: false,
                options?.includeInherentVowel ?: false,
            )
        )
    private val cleanable = NativeCleaner.register(this, handle)

    /** The pointer, for a call (made while the lock of `this` is held) */
    private fun pointer(): Long {
        val pointer = handle.pointer
        check(pointer != 0L) { "the TypingContext is closed" }
        return pointer
    }

    /** Frees the Rust object (it is freed after garbage collection otherwise); idempotent */
    @Synchronized override fun close() = cleanable.clean()

    /** Clears the context: the next key starts anew */
    @Synchronized fun clearContext() = nativeClearContext(pointer())

    /** Takes one key and returns the change it makes to the text */
    @Synchronized
    fun takeKeyInput(key: String): TypingDiff {
        val counts = IntArray(2)
        val added = nativeTakeKeyInput(pointer(), key, counts)
        return TypingDiff(counts[0], added, counts[1])
    }

    @Synchronized
    fun updateUseNativeNumerals(useNativeNumerals: Boolean) =
        nativeUpdateUseNativeNumerals(pointer(), useNativeNumerals)

    @Synchronized
    fun updateIncludeInherentVowel(includeInherentVowel: Boolean) =
        nativeUpdateIncludeInherentVowel(pointer(), includeInherentVowel)

    @Synchronized fun getUseNativeNumerals(): Boolean = nativeGetUseNativeNumerals(pointer())

    @Synchronized fun getIncludeInherentVowel(): Boolean = nativeGetIncludeInherentVowel(pointer())

    /** The script the context types in (a language name is resolved to its script) */
    @Synchronized fun getNormalizedScript(): String = nativeGetNormalizedScript(pointer())

    // Instance methods, so `this` stays reachable (not freed by the cleaner) during a call. The
    // Rust functions are `Java_com_shubhattin_lipilekhika_core_TypingContext_<method>`.
    private external fun nativeClearContext(handle: Long)

    /** [counts] gets `[toDeleteCharsCount, contextLength]`, the added text is returned */
    private external fun nativeTakeKeyInput(handle: Long, key: String, counts: IntArray): String

    private external fun nativeUpdateUseNativeNumerals(handle: Long, value: Boolean)

    private external fun nativeUpdateIncludeInherentVowel(handle: Long, value: Boolean)

    private external fun nativeGetUseNativeNumerals(handle: Long): Boolean

    private external fun nativeGetIncludeInherentVowel(handle: Long): Boolean

    private external fun nativeGetNormalizedScript(handle: Long): String
}

/**
 * The change one key makes: delete [toDeleteCharsCount] characters (code points) from the end of
 * the text, then add [diffAddText]. See [applyTo] and [deleteCountIn].
 */
data class TypingDiff(
    /**
     * Characters to delete from the end of the text, counted in code points (a character outside
     * the BMP, eg. Brahmi `𑀓`, is 2 `Char`s of a Kotlin `String`)
     */
    val toDeleteCharsCount: Int,
    /** Text to add after the deletion */
    val diffAddText: String,
    /** Length of the context kept (0 after it was cleared) */
    val contextLength: Int,
)

/** The kind of a character: `ANYA` (other), `VYANJANA` (consonant), `MATRA`, `SVARA` (vowel) */
enum class ListType {
    ANYA,
    VYANJANA,
    MATRA,
    SVARA,
}

/** A character of a script and the keys that type it (the main key first) */
data class TypingDataMapItem(val text: String, val listType: ListType, val mappings: List<String>)

/** The typing data of a script: the characters common to the scripts, and its own ones */
data class ScriptTypingDataMap(
    /** Characters shared by the scripts (from the krama list) */
    val commonKramaMap: List<TypingDataMapItem>,
    /** Characters of this script only */
    val scriptSpecificKramaMap: List<TypingDataMapItem>,
)

/** A character of the krama list of a script and its kind */
data class KramaDataItem(val text: String, val listType: ListType)

private val LIST_TYPES = ListType.entries

/** Default idle time (ms) after which a typing context is cleared */
val DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS: Long by lazy {
    NativeLib.defaultAutoContextClearTimeMs()
}

/** Default for typing digits as the numerals of the script */
val DEFAULT_USE_NATIVE_NUMERALS: Boolean by lazy { NativeLib.defaultUseNativeNumerals() }

/** Default for keeping the inherent vowel (`k` → क instead of क्) */
val DEFAULT_INCLUDE_INHERENT_VOWEL: Boolean by lazy {
    NativeLib.defaultIncludeInherentVowel()
}

/** Options of a typing context */
data class TypingContextOptions
@JvmOverloads
constructor(
    /**
     * Idle time in milliseconds after which the context is cleared, so the next key starts anew
     * (`0`: after any pause). Must not be negative.
     */
    val autoContextClearTimeMs: Long = DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
    /** Type digits as the numerals of the script (`1` → १) */
    val useNativeNumerals: Boolean = DEFAULT_USE_NATIVE_NUMERALS,
    /** Keep the inherent vowel: `k` → क (Hindi, Bengali, ...) instead of क् (Sanskrit, ...) */
    val includeInherentVowel: Boolean = DEFAULT_INCLUDE_INHERENT_VOWEL,
)

/**
 * A typing context for [typingScript] (a script or language name).
 *
 * @throws LipiException for an unknown script name or a negative clear time
 */
@JvmOverloads
fun createTypingContext(
    typingScript: String,
    options: TypingContextOptions? = null,
): TypingContext = TypingContext(typingScript, options)

/**
 * The number of `Char`s (UTF-16 units) to delete from the end of [text] for this diff:
 * [TypingDiff.toDeleteCharsCount] counts code points, and a character outside the BMP (eg. Brahmi
 * 𑀓) is two `Char`s. At most the whole text.
 */
fun TypingDiff.deleteCountIn(text: String): Int {
    var end = text.length
    var left = toDeleteCharsCount
    while (left > 0 && end > 0) {
        end -=
            if (end >= 2 && text[end - 1].isLowSurrogate() && text[end - 2].isHighSurrogate()) 2
            else 1
        left--
    }
    return text.length - end
}

/** [text] with this diff applied: its deletion from the end, then its added text. */
fun TypingDiff.applyTo(text: String): String =
    text.substring(0, text.length - deleteCountIn(text)) + diffAddText

/**
 * The typing data of a script: its characters and the keys that type them.
 *
 * @throws LipiException for an unknown script name
 */
fun getScriptTypingDataMap(script: String): ScriptTypingDataMap {
    val (common, specific) = NativeLib.getScriptTypingDataMap(script)
    fun items(list: Array<Array<String>>) = list.map { item ->
        TypingDataMapItem(item[0], LIST_TYPES[item[1].toInt()], item.asList().subList(2, item.size))
    }
    return ScriptTypingDataMap(items(common), items(specific))
}

/**
 * The krama list of a script, the characters and their kinds. The lists of all the scripts are
 * index-aligned: the same index is the same character in every script.
 *
 * @throws LipiException for an unknown script name
 */
fun getScriptKramaData(script: String): List<KramaDataItem> =
    NativeLib.getScriptKramaData(script).map { (text, listType) ->
        KramaDataItem(text, LIST_TYPES[listType.toInt()])
    }
