package com.shubhattin.lipilekhika.data

/**
 * What the app shows about each script: its section, a hint, search keywords, the avatar glyph. The
 * same data as the web app (`docs-and-web-client/src/components/script/script_meta.ts` and
 * `script_avatar.ts`), keep them in sync.
 */
enum class ScriptCategory(val title: String, val short: String) {
    MODERN("Modern Indian Scripts", "Modern"),
    LATIN("Latin Scripts", "Latin"),
    ANCIENT("Ancient Scripts", "Ancient"),
}

/** A script of the picker */
data class ScriptMeta(
    val name: String,
    val category: ScriptCategory,
    /** The glyph of its avatar circle */
    val avatar: String,
    /** A short line under the name (also searched) */
    val hint: String? = null,
    /** Codes and aliases, searched but not shown */
    val keywords: List<String> = emptyList(),
    /** Lipi Lekhika's own scheme (tagged "custom") */
    val custom: Boolean = false,
)

object Scripts {
    private val M = ScriptCategory.MODERN
    private val L = ScriptCategory.LATIN
    private val A = ScriptCategory.ANCIENT

    /** All the scripts, in the order of the picker (the sections, then this order) */
    val ALL: List<ScriptMeta> =
        listOf(
            ScriptMeta(
                "Devanagari",
                M,
                "अ",
                "Hindi, Sanskrit, Marathi, Nepali",
                listOf("dev", "hi", "hin", "sa", "san", "mar", "ne", "nep"),
            ),
            ScriptMeta("Telugu", M, "అ", keywords = listOf("te", "tel")),
            ScriptMeta("Tamil", M, "அ", keywords = listOf("tam", "ta")),
            ScriptMeta("Bengali", M, "অ", "Bangla", listOf("ben", "be")),
            ScriptMeta("Kannada", M, "ಅ", keywords = listOf("ka", "kan")),
            ScriptMeta("Gujarati", M, "અ", keywords = listOf("gu", "guj")),
            ScriptMeta("Malayalam", M, "അ", keywords = listOf("mal")),
            ScriptMeta("Odia", M, "ଅ", "Oriya", listOf("or", "od")),
            ScriptMeta("Gurumukhi", M, "ਅ", "Punjabi", listOf("gur", "pun", "gurmukhi")),
            ScriptMeta("Assamese", M, "অ", keywords = listOf("as")),
            ScriptMeta("Sinhala", M, "අ", keywords = listOf("si", "sin", "sinh", "sinhalese")),
            ScriptMeta(
                "Tamil-Extended",
                M,
                "அ",
                "Tamil with superscript marks",
                listOf("tam-ext", "ta-ext"),
            ),
            ScriptMeta("Purna-Devanagari", M, "अ", "Devanagari for all Indian scripts"),
            // Lipi Lekhika's own schemes first, then the standard ones
            ScriptMeta(
                "Normal",
                L,
                "a",
                "Plain English letters",
                listOf("en", "eng", "english", "ascii", "custom"),
                custom = true,
            ),
            ScriptMeta(
                "Romanized",
                L,
                "ā",
                "With diacritics",
                listOf("rom", "roman", "custom"),
                custom = true,
            ),
            ScriptMeta("IAST", L, "IA", "kṛṣṇa"),
            ScriptMeta("ITRANS", L, "IT", "kRRiShNa"),
            ScriptMeta("Harvard-Kyoto", L, "HK", "kRSNa", listOf("hk")),
            ScriptMeta("SLP1", L, "SL", "kfzRa", listOf("slp")),
            ScriptMeta("Brahmi", A, "𑀅"),
            ScriptMeta("Sharada", A, "𑆃"),
            ScriptMeta("Granth", A, "𑌅", keywords = listOf("grantha")),
            ScriptMeta("Modi", A, "𑘀"),
            ScriptMeta("Siddham", A, "𑖀"),
        )

    private val BY_NAME = ALL.associateBy { it.name }

    /** The data of a script name (a script, not a language: see `getNormalizedScriptName`) */
    fun meta(script: String): ScriptMeta = BY_NAME[script] ?: ScriptMeta(script, L, "a")

    /** The scripts of the picker, without `Normal` when [withNormal] is false */
    fun list(withNormal: Boolean): List<ScriptMeta> =
        if (withNormal) ALL else ALL.filter { it.name != "Normal" }

    private fun norm(s: String) = s.lowercase().replace(Regex("[\\s_-]+"), "")

    /** The score of a query that only matches the section name of a script */
    private const val SECTION_MATCH = 10

    /** How well [script] matches [query]: 0 no match, higher is better (as on the web) */
    fun score(script: ScriptMeta, query: String): Int {
        val q = norm(query)
        if (q.isEmpty()) return 1
        val name = norm(script.name)
        if (name == q) return 100
        if (name.startsWith(q)) return 80
        if (script.keywords.any { norm(it) == q }) return 70
        val hint = script.hint.orEmpty()
        if (hint.split(Regex("[\\s,]+")).map(::norm).any { it.startsWith(q) }) return 60
        if (script.keywords.any { norm(it).startsWith(q) }) return 50
        if (name.contains(q)) return 40
        if (norm(hint).contains(q)) return 20
        // a section name ("latin", "ancient") lists the whole section
        if (norm(script.category.short).startsWith(q)) return SECTION_MATCH
        return 0
    }

    /**
     * The scripts matching [query], in display order. A section name lists its section only when
     * nothing else matches, so "mod" gives Modi, not all of Modern.
     */
    fun filter(scripts: List<ScriptMeta>, query: String): List<ScriptMeta> {
        val scored = scripts.map { it to score(it, query) }
        val direct = scored.filter { it.second > SECTION_MATCH }
        return (direct.ifEmpty { scored.filter { it.second > 0 } }).map { it.first }
    }
}
