package com.shubhattin.lipilekhika.data

/**
 * The transliteration options (their names and descriptions) and the presets. The same as the web
 * app (`components/script/CustomOptions.svelte`, `tools/presets.ts`), keep them in sync.
 */
data class OptionInfo(val name: String, val description: String)

object Options {
    private val INFO =
        mapOf(
            "all_to_normal:preserve_specific_chars" to
                OptionInfo(
                    "Preserve Specific Characters",
                    "Preserves script-specific characters when converting to Normal script. Can be useful for studying script specific characters.",
                ),
            "all_to_normal:remove_virAma_and_double_virAma" to
                OptionInfo(
                    "Remove Virāma and Double Virāma",
                    "Removes virāma (।) and pūrṇa virāma (॥) punctuation from Normal/Romanized output.",
                ),
            "all_to_normal:replace_avagraha_with_a" to
                OptionInfo(
                    "Replace Avagraha with a",
                    "Replaces avagraha (ऽ) with 'a' in Normal/Romanized output.",
                ),
            "all_to_sinhala:use_conjunct_enabling_halant" to
                OptionInfo(
                    "Use Conjunct Enabling Halant",
                    "Uses conjunct-enabling halant for Sinhala output to properly form conjunct consonants.",
                ),
            "all_to_normal:replace_pancham_varga_varna_with_n" to
                OptionInfo(
                    "Replace Pancham Varga Varna with n",
                    "Replaces ङ (G) and ञ (J) with 'n' for more natural output.",
                ),
            "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra" to
                OptionInfo(
                    "Replace Pancham Varga Varna with Anusvāra",
                    "Replaces 5th varga consonants (ङ्, ञ्, ण्, न्, म्) with anusvāra (ं) when followed by consonants of the same varga.",
                ),
            "normal_to_all:use_typing_chars" to
                OptionInfo(
                    "Use Typing Characters",
                    "Enables typing mode characters including duplicate alternatives and script-specific characters. Equivalent to typing mode.",
                ),
            "normal_to_brahmic:include_inherent_vowel" to
                OptionInfo(
                    "Include Inherent Vowel",
                    "Keeps the inherent vowel (schwa) at the end of a word instead of adding a halant: kamal → कमल (default कमल्).",
                ),
            "normal_to_brahmic:keep_ascii_numerals" to
                OptionInfo(
                    "Keep ASCII Numerals",
                    "Keeps ASCII digits (0-9) as they are instead of writing them as the native numerals of the script.",
                ),
        )

    fun info(key: String): OptionInfo = INFO[key] ?: OptionInfo(key, "No description available.")
}

/** A preset: options that are turned on (when they apply to the pair of scripts) */
data class Preset(
    val key: String,
    val label: String,
    val description: String?,
    val directRules: List<String>,
    /** (rule, from, to): turned on only for that pair */
    val conditionalRules: List<Triple<String, String, String>>,
)

object Presets {
    /** Scripts in which `replace_pancham_varga_varna_with_anusvAra` is turned on */
    private val SCRIPTS_TO_REPLACE_WITH_ANUNASIK = listOf("Telugu", "Kannada")

    val ALL: List<Preset> =
        listOf(
            Preset("none", "None", "No Default Transliteration Options", emptyList(), emptyList()),
            Preset(
                "tsc_portal",
                "The Sanskrit Channel",
                "Default Transliteration Options used in The Sanskrit Channel Projects Portal",
                listOf(
                    "all_to_normal:remove_virAma_and_double_virAma",
                    "all_to_normal:replace_avagraha_with_a",
                    "all_to_normal:replace_pancham_varga_varna_with_n",
                    "all_to_sinhala:use_conjunct_enabling_halant",
                ),
                SCRIPTS_TO_REPLACE_WITH_ANUNASIK.map {
                    Triple(
                        "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra",
                        "Devanagari",
                        it,
                    )
                },
            ),
        )

    fun get(key: String): Preset = ALL.firstOrNull { it.key == key } ?: ALL.first()

    fun isPreset(key: String?): Boolean = ALL.any { it.key == key }

    /**
     * The options of a pair of scripts with [preset] applied: all [available] options off, then the
     * preset's rules that apply to the pair on.
     */
    fun apply(
        preset: Preset,
        available: List<String>,
        from: String,
        to: String,
    ): Map<String, Boolean> {
        val options = available.associateWith { false }.toMutableMap()
        for (rule in preset.directRules) if (rule in options) options[rule] = true
        for ((rule, f, t) in preset.conditionalRules) {
            if (rule in options && f == from && t == to) options[rule] = true
        }
        return options
    }
}
