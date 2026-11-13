@file:JvmName("LipilekhikaTyping")

/**
 * Typing in a script key by key (the realtime typing of the apps), and the typing data of the
 * scripts (the typing help). From Java the functions are static methods of `LipilekhikaTyping`.
 */
package com.shubhattin.lipilekhika.core

import com.shubhattin.lipilekhika.core.ffi.TypingContextOptions as FfiTypingContextOptions
import com.shubhattin.lipilekhika.core.ffi.defaultAutoContextClearTimeMs
import com.shubhattin.lipilekhika.core.ffi.defaultIncludeInherentVowel
import com.shubhattin.lipilekhika.core.ffi.defaultUseNativeNumerals
import com.shubhattin.lipilekhika.core.ffi.getScriptKramaData as ffiGetScriptKramaData
import com.shubhattin.lipilekhika.core.ffi.getScriptTypingDataMap as ffiGetScriptTypingDataMap

/**
 * A typing context: the state of the text being typed in one script. [TypingContext.takeKeyInput]
 * takes each key and returns a [TypingDiff], the change to make to the text.
 *
 * It holds a Rust object: [TypingContext.close] frees it at once (or `use { }`), otherwise it is
 * freed after the context is garbage collected. Its methods can be called from any thread.
 */
typealias TypingContext = com.shubhattin.lipilekhika.core.ffi.TypingContext

/**
 * The change one key makes: delete [TypingDiff.toDeleteCharsCount] characters (code points) from
 * the end of the text, then add [TypingDiff.diffAddText]. See [applyTo] and [deleteCountIn].
 */
typealias TypingDiff = com.shubhattin.lipilekhika.core.ffi.TypingDiff

/** The kind of a character: `ANYA` (other), `VYANJANA` (consonant), `MATRA`, `SVARA` (vowel) */
typealias ListType = com.shubhattin.lipilekhika.core.ffi.ListType

/** A character of a script and the keys that type it (the main key first) */
typealias TypingDataMapItem = com.shubhattin.lipilekhika.core.ffi.TypingDataMapItem

/** The typing data of a script: the characters common to the scripts, and its own ones */
typealias ScriptTypingDataMap = com.shubhattin.lipilekhika.core.ffi.ScriptTypingDataMap

/** A character of the krama list of a script and its kind */
typealias KramaDataItem = com.shubhattin.lipilekhika.core.ffi.KramaDataItem

/** Default idle time (ms) after which a typing context is cleared */
val DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS: Long by lazy { defaultAutoContextClearTimeMs() }

/** Default for typing digits as the numerals of the script */
val DEFAULT_USE_NATIVE_NUMERALS: Boolean by lazy { defaultUseNativeNumerals() }

/** Default for keeping the inherent vowel (`k` → क instead of क्) */
val DEFAULT_INCLUDE_INHERENT_VOWEL: Boolean by lazy { defaultIncludeInherentVowel() }

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
): TypingContext =
    TypingContext(
        typingScript,
        options?.let {
            FfiTypingContextOptions(
                autoContextClearTimeMs = it.autoContextClearTimeMs,
                useNativeNumerals = it.useNativeNumerals,
                includeInherentVowel = it.includeInherentVowel,
            )
        },
    )

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
fun getScriptTypingDataMap(script: String): ScriptTypingDataMap = ffiGetScriptTypingDataMap(script)

/**
 * The krama list of a script, the characters and their kinds. The lists of all the scripts are
 * index-aligned: the same index is the same character in every script.
 *
 * @throws LipiException for an unknown script name
 */
fun getScriptKramaData(script: String): List<KramaDataItem> = ffiGetScriptKramaData(script)
