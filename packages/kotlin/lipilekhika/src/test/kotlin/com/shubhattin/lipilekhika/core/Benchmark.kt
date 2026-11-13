package com.shubhattin.lipilekhika.core

import org.junit.Assume.assumeTrue
import org.junit.BeforeClass
import org.junit.Test

/**
 * The benchmark of the other packages (same workloads as the rust criterion bench): one pass over
 * the transliteration cases of `test_data`, and typing the `Normal` cases key by key. Warm-up
 * passes, then the average and the fastest of the measured passes.
 *
 * Skipped in the normal test run, run it with:
 * ```sh
 * ./gradlew :lipilekhika:testDebugUnitTest --tests '*Benchmark*' -Plipilekhika.bench=true --rerun
 * ```
 */
class Benchmark {
    companion object {
        private const val WARMUP = 3
        private const val SAMPLES = 10

        private lateinit var cases: List<TransliterationCase>
        private lateinit var normalCases: List<TransliterationCase>

        @JvmStatic
        @BeforeClass
        fun load() {
            assumeTrue(
                "the benchmark runs with -Plipilekhika.bench=true",
                System.getProperty("lipilekhika.bench") == "true",
            )
            cases =
                TestData.yamlFiles(TestData.dir.resolve("transliteration"))
                    .flatMap(TestData::load)
                    .map(TransliterationCase::of)
                    .filterNot { it.todo }
            normalCases = cases.filter { it.from == "Normal" }
            getScriptListData().scripts.forEach(::preloadScriptData)
        }

        /** Runs [pass] [WARMUP] + [SAMPLES] times, prints the average and the fastest pass */
        private fun measure(name: String, pass: () -> Unit) {
            repeat(WARMUP) { pass() }
            val times =
                List(SAMPLES) {
                    val start = System.nanoTime()
                    pass()
                    (System.nanoTime() - start) / 1e6
                }
            println(
                "%-36s avg %9.2f ms   min %9.2f ms   (%d passes)"
                    .format(name, times.average(), times.min(), SAMPLES)
            )
        }
    }

    @Test
    fun transliterationAllCases() {
        println(
            "${cases.size} transliteration cases, ${normalCases.size} Normal -> others typing cases"
        )
        measure("transliteration_all_cases") {
            for (c in cases) transliterate(c.input, c.from, c.to, c.options)
        }
    }

    @Test
    fun typingEmulationNormalToOthers() {
        measure("typing_emulation_normal_to_others") {
            for (c in normalCases) TestData.emulateTyping(c.input, c.to)
        }
    }
}
