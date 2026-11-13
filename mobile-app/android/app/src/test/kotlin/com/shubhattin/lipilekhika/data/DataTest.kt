package com.shubhattin.lipilekhika.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** The app's own logic (no Android or Rust needed) */
class DataTest {
    private fun search(query: String) =
        Scripts.filter(Scripts.list(withNormal = true), query).map { it.name }

    @Test
    fun scriptSearch() {
        assertEquals("Devanagari", search("dev").first())
        assertEquals("Devanagari", search("hi").first())
        assertEquals("Devanagari", search("sanskrit").first())
        assertEquals(listOf("Gurumukhi"), search("punjabi"))
        assertEquals("Harvard-Kyoto", search("hk").first())
        assertEquals(listOf("IAST"), search("kṛṣṇa"))
        // a section name lists its section only when nothing else matches
        assertEquals(listOf("Modi"), search("mod"))
        assertEquals(
            Scripts.ALL.filter { it.category == ScriptCategory.ANCIENT }.map { it.name },
            search("ancient"),
        )
        assertTrue(search("xyz").isEmpty())
        assertEquals(Scripts.ALL.size, search("").size)
        assertFalse(Scripts.list(withNormal = false).any { it.name == "Normal" })
    }

    @Test
    fun presets() {
        val available =
            listOf(
                "all_to_normal:replace_avagraha_with_a",
                "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra",
                "all_to_normal:preserve_specific_chars",
            )
        val tsc = Presets.get("tsc_portal")
        assertEquals(
            mapOf(
                "all_to_normal:replace_avagraha_with_a" to true,
                "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra" to true,
                "all_to_normal:preserve_specific_chars" to false,
            ),
            Presets.apply(tsc, available, "Devanagari", "Telugu"),
        )
        // the conditional rule only for Devanagari → Telugu / Kannada
        assertEquals(
            false,
            Presets.apply(tsc, available, "Devanagari", "Tamil")[
                    "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra"],
        )
        assertTrue(
            Presets.apply(Presets.get("none"), available, "Devanagari", "Telugu").values.none { it }
        )
        assertEquals("none", Presets.get("not a preset").key)
    }

    @Test
    fun fileNames() {
        assertEquals(
            "lipilekhika-source-devanagari.txt",
            TextFiles.fileName("source", "Devanagari"),
        )
        assertEquals(
            "lipilekhika-output-harvard-kyoto.txt",
            TextFiles.fileName("output", "Harvard-Kyoto"),
        )
        assertEquals(
            "lipilekhika-output-tamil-extended.txt",
            TextFiles.fileName("output", "Tamil-Extended"),
        )
        assertEquals("lipilekhika-source-slp1.txt", TextFiles.fileName("source", "SLP1"))
    }

    @Test
    fun scriptDetection() {
        assertEquals("Devanagari", ScriptDetect.detect("नमस्ते दुनिया"))
        assertEquals("Telugu", ScriptDetect.detect("నమస్తే"))
        assertEquals("Assamese", ScriptDetect.detect("অসমীয়া ৰাজ্য"))
        assertEquals("Bengali", ScriptDetect.detect("বাংলা"))
        assertEquals("Tamil-Extended", ScriptDetect.detect("க³ங்கா³"))
        assertEquals("Brahmi", ScriptDetect.detect("𑀦𑀫𑀲𑁆𑀢𑁂"))
        assertEquals("Normal", ScriptDetect.detect("namaste"))
        assertEquals("Romanized", ScriptDetect.detect("kṛṣṇa"))
        assertEquals("Normal", ScriptDetect.detect(""))
        // most letters decide
        assertEquals("Devanagari", ScriptDetect.detect("ok नमस्ते"))
    }
}
