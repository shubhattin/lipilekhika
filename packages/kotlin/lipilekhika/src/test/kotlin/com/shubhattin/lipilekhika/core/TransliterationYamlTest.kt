package com.shubhattin.lipilekhika.core

import java.io.File
import kotlin.test.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

/**
 * Every case of `test_data/transliteration` (and its reverse for the reversible ones), one test
 * each, like the Python and Dart packages.
 */
@RunWith(Parameterized::class)
class TransliterationYamlTest(
    @Suppress("unused") private val name: String,
    private val file: File,
    private val case: TransliterationCase,
    private val reverse: Boolean,
) {
    companion object {
        private val ROOT = TestData.dir.resolve("transliteration")

        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun cases(): List<Array<Any>> =
            TestData.yamlFiles(ROOT).flatMap { file ->
                val path = file.relativeTo(ROOT).path
                TestData.load(file)
                    .map(TransliterationCase::of)
                    .filterNot { it.todo }
                    .flatMap { case ->
                        val forward = "$path ${case.index}: ${case.from} → ${case.to}"
                        buildList {
                            add(arrayOf(forward, file, case, false))
                            if (case.reversible) {
                                add(
                                    arrayOf(
                                        "$path ${case.index}: ${case.to} ← ${case.from}",
                                        file,
                                        case,
                                        true,
                                    )
                                )
                            }
                        }
                    }
            }
    }

    @Test
    fun transliterates() {
        preloadScriptData(case.from)
        preloadScriptData(case.to)
        val result = transliterate(case.input, case.from, case.to, case.options)
        if (TestData.skipTamilExtendedVedic(file, case.to, result)) return

        if (!reverse) {
            assertEquals(
                case.output,
                result,
                "${file.name} ${case.index}: ${case.from} → ${case.to}, input \"${case.input}\"",
            )
        } else {
            val back = transliterate(result, case.to, case.from, case.options)
            assertEquals(
                case.input,
                back,
                "${file.name} ${case.index}: reversed ${case.to} → ${case.from}, input \"$result\"",
            )
        }
    }
}
