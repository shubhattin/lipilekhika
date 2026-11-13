package com.shubhattin.lipilekhika.data

/**
 * Guesses the script of a text (for the quick convert sheet, which gets text from other apps): the
 * Unicode block most of its letters are in. Latin letters with diacritics give `Romanized`, plain
 * ASCII `Normal`.
 */
object ScriptDetect {
    private val BLOCKS: List<Triple<Int, Int, String>> =
        listOf(
            Triple(0x0900, 0x097F, "Devanagari"),
            Triple(0xA8E0, 0xA8FF, "Devanagari"),
            Triple(0x0980, 0x09FF, "Bengali"),
            Triple(0x0A00, 0x0A7F, "Gurumukhi"),
            Triple(0x0A80, 0x0AFF, "Gujarati"),
            Triple(0x0B00, 0x0B7F, "Odia"),
            Triple(0x0B80, 0x0BFF, "Tamil"),
            Triple(0x0C00, 0x0C7F, "Telugu"),
            Triple(0x0C80, 0x0CFF, "Kannada"),
            Triple(0x0D00, 0x0D7F, "Malayalam"),
            Triple(0x0D80, 0x0DFF, "Sinhala"),
            Triple(0x11000, 0x1107F, "Brahmi"),
            Triple(0x11180, 0x111DF, "Sharada"),
            Triple(0x11300, 0x1137F, "Granth"),
            Triple(0x11580, 0x115FF, "Siddham"),
            Triple(0x11600, 0x1165F, "Modi"),
        )

    fun detect(text: String): String {
        val counts = HashMap<String, Int>()
        var latin = 0
        var diacritics = 0
        var i = 0
        var seen = 0
        while (i < text.length && seen < 2000) {
            val cp = text.codePointAt(i)
            i += Character.charCount(cp)
            val block = BLOCKS.firstOrNull { cp in it.first..it.second }
            if (block != null) {
                counts.merge(block.third, 1, Int::plus)
                seen++
            } else if (Character.isLetter(cp)) {
                latin++
                if (cp > 0x7F) diacritics++
                seen++
            }
        }
        val best = counts.maxByOrNull { it.value }
        if (best != null && best.value >= latin) {
            return when {
                // Assamese has its own ra and wa
                best.key == "Bengali" && (text.contains('ৰ') || text.contains('ৱ')) -> "Assamese"
                // Tamil-Extended marks the consonants with superscript digits
                best.key == "Tamil" && text.any { it in "²³⁴" } -> "Tamil-Extended"
                else -> best.key
            }
        }
        return if (diacritics > 0) "Romanized" else "Normal"
    }
}
