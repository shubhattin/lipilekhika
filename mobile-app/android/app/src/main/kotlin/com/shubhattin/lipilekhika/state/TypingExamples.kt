package com.shubhattin.lipilekhika.state

import com.shubhattin.lipilekhika.core.TypingContextOptions
import com.shubhattin.lipilekhika.core.applyTo
import com.shubhattin.lipilekhika.core.createTypingContext

/** What a key types with an option off and on */
data class OnOff(val off: String, val on: String)

/**
 * Real examples of the two typing options in a script (`k` → क् / क, `1` → 1 / १), made by typing
 * with each setting, as the web app does. An option that makes no difference in the script (as in
 * the Latin ones) is null.
 */
data class TypingExamples(val vowel: OnOff?, val numerals: OnOff?) {
    companion object {
        private val cache = HashMap<String, TypingExamples>()

        fun of(script: String): TypingExamples =
            synchronized(cache) {
                cache.getOrPut(script) {
                    val vowel =
                        OnOff(type(script, "k", vowel = false), type(script, "k", vowel = true))
                    val numerals =
                        OnOff(
                            type(script, "1", numerals = false),
                            type(script, "1", numerals = true),
                        )
                    TypingExamples(
                        vowel.takeIf { it.off != it.on },
                        numerals.takeIf { it.off != it.on },
                    )
                }
            }

        private fun type(
            script: String,
            keys: String,
            vowel: Boolean = false,
            numerals: Boolean = true,
        ): String = runCatching {
            createTypingContext(
                    script,
                    TypingContextOptions(
                        useNativeNumerals = numerals,
                        includeInherentVowel = vowel,
                    ),
                )
                .use { ctx ->
                    keys.fold("") { text, key -> ctx.takeKeyInput(key.toString()).applyTo(text) }
                }
        }
            .getOrDefault(keys)
    }
}
