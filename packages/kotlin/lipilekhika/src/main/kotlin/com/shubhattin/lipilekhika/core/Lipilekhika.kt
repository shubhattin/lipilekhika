@file:JvmName("Lipilekhika")

/**
 * Lipi Lekhika for Kotlin (and Java): transliteration between Indian Brahmic scripts and typing in
 * them, a wrapper around the Rust library (`packages/rust`) through UniFFI.
 *
 * From Java the functions are static methods of the `Lipilekhika` class.
 */
package com.shubhattin.lipilekhika.core

import com.shubhattin.lipilekhika.core.ffi.TransOption
import com.shubhattin.lipilekhika.core.ffi.getAllOptions as ffiGetAllOptions
import com.shubhattin.lipilekhika.core.ffi.getNormalizedScriptName as ffiGetNormalizedScriptName
import com.shubhattin.lipilekhika.core.ffi.getSchwaStatusForScript as ffiGetSchwaStatusForScript
import com.shubhattin.lipilekhika.core.ffi.getScriptListData as ffiGetScriptListData
import com.shubhattin.lipilekhika.core.ffi.preloadScriptData as ffiPreloadScriptData
import com.shubhattin.lipilekhika.core.ffi.transliterate as ffiTransliterate

/**
 * The error of an invalid argument, one of [InvalidScriptException], [UnknownOptionException] and
 * [InvalidArgumentException].
 */
typealias LipiException = com.shubhattin.lipilekhika.core.ffi.LipiException

/** A script or language name that is not known */
typealias InvalidScriptException = com.shubhattin.lipilekhika.core.ffi.LipiException.InvalidScript

/** A transliteration option key that is not known */
typealias UnknownOptionException = com.shubhattin.lipilekhika.core.ffi.LipiException.UnknownOption

/** An argument out of its range (eg. a negative clear time of a typing context) */
typealias InvalidArgumentException =
    com.shubhattin.lipilekhika.core.ffi.LipiException.InvalidArgument

/**
 * Transliterates [text] from [fromScript] to [toScript].
 *
 * The scripts are script or language names, or their aliases (eg. `Devanagari`, `Hindi`, `dev`).
 * [options] are the custom transliteration options (keys from [getAllOptions]) and their values.
 *
 * @throws LipiException for an unknown script name or option key
 */
@JvmOverloads
fun transliterate(
    text: String,
    fromScript: String,
    toScript: String,
    options: Map<String, Boolean>? = null,
): String =
    ffiTransliterate(
        wellFormed(text),
        fromScript,
        toScript,
        options?.map { (key, value) -> TransOption(key, value) },
    )

/**
 * Loads the data of a script ahead of its first use (it is loaded on first use otherwise).
 *
 * @throws LipiException for an unknown script name
 */
fun preloadScriptData(scriptName: String) = ffiPreloadScriptData(scriptName)

/**
 * The schwa deletion property of a Brahmic script (`true`: the inherent vowel is dropped at the end
 * of a word, eg. Hindi), `null` for the scripts without one (Normal, Romanized, ...).
 *
 * @throws LipiException for an unknown script name
 */
fun getSchwaStatusForScript(scriptName: String): Boolean? = ffiGetSchwaStatusForScript(scriptName)

/**
 * The custom transliteration option keys that apply from [fromScript] to [toScript] (none for two
 * names of the same script).
 *
 * @throws LipiException for an unknown script name
 */
fun getAllOptions(fromScript: String, toScript: String): List<String> =
    ffiGetAllOptions(fromScript, toScript)

/**
 * The script name of a script, language or alias name (eg. `hi` → `Devanagari`).
 *
 * @throws LipiException for an unknown script name
 */
fun getNormalizedScriptName(scriptName: String): String = ffiGetNormalizedScriptName(scriptName)

/** The lists of scripts, languages and aliases, in the order of the data */
data class ScriptListData(
    /** The script names */
    val scripts: List<String>,
    /** The language names (each is written in a script, see [langScriptMap]) */
    val langs: List<String>,
    /** Every language and the script it is written in */
    val langScriptMap: Map<String, String>,
    /** Every alias (eg. `dev`) and the script it names */
    val scriptAlternatesMap: Map<String, String>,
)

private val cachedScriptListData: ScriptListData by lazy {
    val data = ffiGetScriptListData()
    ScriptListData(
        scripts = data.scripts,
        langs = data.langs,
        // LinkedHashMap: in the order of the data
        langScriptMap = data.langScriptMap.associate { it.key to it.value },
        scriptAlternatesMap = data.scriptAlternatesMap.associate { it.key to it.value },
    )
}

/** The lists of scripts, languages and aliases */
fun getScriptListData(): ScriptListData = cachedScriptListData

/** The script names */
val SCRIPT_LIST: List<String>
    get() = cachedScriptListData.scripts

/** The language names (each is written in one of the scripts) */
val LANG_LIST: List<String>
    get() = cachedScriptListData.langs

/** The languages and scripts, the languages first (the order of the JS package) */
val ALL_SCRIPT_LANG_LIST: List<String> by lazy {
    LinkedHashSet<String>()
        .apply {
            addAll(LANG_LIST)
            addAll(SCRIPT_LIST)
        }
        .toList()
}

/**
 * The text with each lone surrogate (half of a UTF-16 pair, which UTF-8 can not hold) replaced by
 * U+FFFD, like the JS and Python packages read it. (Converting to UTF-8 would make it `?`.)
 */
internal fun wellFormed(text: String): String {
    var i = 0
    while (i < text.length) {
        val c = text[i]
        if (c.isSurrogate()) break
        i++
    }
    if (i == text.length) return text
    val out = StringBuilder(text.length)
    out.append(text, 0, i)
    while (i < text.length) {
        val c = text[i]
        when {
            c.isHighSurrogate() && i + 1 < text.length && text[i + 1].isLowSurrogate() -> {
                out.append(c).append(text[i + 1])
                i += 2
                continue
            }
            c.isSurrogate() -> out.append('�')
            else -> out.append(c)
        }
        i++
    }
    return out.toString()
}
