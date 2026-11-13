package com.shubhattin.lipilekhika.core

import java.io.File
import kotlin.test.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

/**
 * Typing key by key: the `Normal` → script cases of the generated `auto-nor-*` transliteration data
 * (typing gives the same text), like the Python and Dart packages.
 */
@RunWith(Parameterized::class)
class EmulateTypingYamlTest(
    @Suppress("unused") private val name: String,
    private val file: File,
    private val case: TransliterationCase,
) {
    companion object {
        private val FOLDERS = listOf("auto-nor-brahmic", "auto-nor-other")

        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun cases(): List<Array<Any>> = FOLDERS.flatMap { folder ->
            val root = TestData.dir.resolve("transliteration/$folder")
            TestData.yamlFiles(root).flatMap { file ->
                TestData.load(file)
                    .map(TransliterationCase::of)
                    .filter { it.from == "Normal" && it.to != "Normal" && !it.todo }
                    .map { arrayOf("$folder/${file.name} ${it.index}: ${it.to}", file, it) }
            }
        }
    }

    @Test
    fun typesLikeItTransliterates() {
        val result = TestData.emulateTyping(case.input, case.to)
        if (TestData.skipTamilExtendedVedic(file, case.to, result)) return
        assertEquals(
            case.output,
            result,
            "${file.name} ${case.index}: typing ${case.to}, input \"${case.input}\"",
        )
    }
}

/** A case of `test_data/typing` */
data class TypingModeCase(
    val index: Any?,
    val text: String,
    val output: String,
    val script: String,
    val preserveCheck: Boolean,
    val options: TypingContextOptions?,
) {
    companion object {
        @Suppress("UNCHECKED_CAST")
        fun of(item: Map<String, Any?>): TypingModeCase {
            val options =
                (item["options"] as Map<String, Any?>?)?.let {
                    TypingContextOptions(
                        autoContextClearTimeMs =
                            (it["autoContextClearTimeMs"] as Number?)?.toLong()
                                ?: DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
                        useNativeNumerals =
                            it["useNativeNumerals"] as Boolean? ?: DEFAULT_USE_NATIVE_NUMERALS,
                        includeInherentVowel =
                            it["includeInherentVowel"] as Boolean?
                                ?: DEFAULT_INCLUDE_INHERENT_VOWEL,
                    )
                }
            return TypingModeCase(
                index = item["index"] ?: "unknown",
                text = item["text"] as String,
                output = item["output"] as String,
                script = item["script"] as String,
                preserveCheck = item["preserve_check"] as Boolean? ?: false,
                options = options,
            )
        }
    }
}

/**
 * The typing cases of `test_data/typing` (without its `context` folder, which no package reads),
 * and their preserve checks: the typed text transliterated back to Normal gives the keys typed.
 */
@RunWith(Parameterized::class)
class TypingModeYamlTest(
    @Suppress("unused") private val name: String,
    private val file: File,
    private val case: TypingModeCase,
    private val preserveCheck: Boolean,
) {
    companion object {
        private val ROOT = TestData.dir.resolve("typing")

        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun cases(): List<Array<Any>> =
            TestData.yamlFiles(ROOT, skipFolders = setOf("context")).flatMap { file ->
                TestData.load(file)
                    .filterNot { it["todo"] == true }
                    .map(TypingModeCase::of)
                    .flatMap { case ->
                        val name = "${file.name} ${case.index}: ${case.script}"
                        buildList {
                            add(arrayOf(name, file, case, false))
                            if (case.preserveCheck) {
                                add(arrayOf("$name (preserve check)", file, case, true))
                            }
                        }
                    }
            }
    }

    @Test
    fun types() {
        val result = TestData.emulateTyping(case.text, case.script, case.options)
        if (!preserveCheck) {
            assertEquals(
                case.output,
                result,
                "${file.name} ${case.index}: typing ${case.script}, keys \"${case.text}\"",
            )
        } else {
            val back =
                transliterate(
                    result,
                    case.script,
                    "Normal",
                    mapOf("all_to_normal:preserve_specific_chars" to true),
                )
            assertEquals(
                case.text,
                back,
                "${file.name} ${case.index}: preserve check ${case.script}, typed \"$result\"",
            )
        }
    }
}
