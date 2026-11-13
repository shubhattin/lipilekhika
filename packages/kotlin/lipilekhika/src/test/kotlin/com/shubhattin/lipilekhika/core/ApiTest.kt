package com.shubhattin.lipilekhika.core

import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.junit.Test

/** The API of the main functions (ported from the Python tests `test_main` / `test_api_edges`) */
class ApiTest {
    @Test
    fun transliterates() {
        assertEquals("namastE", transliterate("नमस्ते", "Devanagari", "Normal"))
        assertEquals("నమస్తే", transliterate("नमस्ते", "Hindi", "tel"))
    }

    @Test
    fun appliesOptions() {
        val key = "all_to_normal:replace_avagraha_with_a"
        assertTrue(key in getAllOptions("Devanagari", "Normal"))
        assertEquals("sO`ham", transliterate("सोऽहम्", "Devanagari", "Normal"))
        assertEquals("sOaham", transliterate("सोऽहम्", "Devanagari", "Normal", mapOf(key to true)))
    }

    @Test
    fun unknownOptionKeyIsAnError() {
        val e =
            assertFailsWith<UnknownOptionException> {
                transliterate("a", "Normal", "Devanagari", mapOf("not_an_option" to true))
            }
        assertTrue("not_an_option" in e.message.orEmpty())
    }

    @Test
    fun unknownScriptIsAnError() {
        assertFailsWith<InvalidScriptException> { transliterate("a", "Klingon", "Devanagari") }
        assertFailsWith<InvalidScriptException> { transliterate("a", "Normal", "Klingon") }
        assertFailsWith<InvalidScriptException> { preloadScriptData("Klingon") }
        assertFailsWith<InvalidScriptException> { getSchwaStatusForScript("Klingon") }
        assertFailsWith<InvalidScriptException> { getAllOptions("Klingon", "Devanagari") }
        assertFailsWith<InvalidScriptException> { getNormalizedScriptName("Klingon") }
        assertFailsWith<InvalidScriptException> { getScriptTypingDataMap("Klingon") }
        assertFailsWith<InvalidScriptException> { getScriptKramaData("Klingon") }
        assertFailsWith<InvalidScriptException> { createTypingContext("Klingon") }
    }

    @Test
    fun surroundingSpacesAreNotAScriptName() {
        for (name in listOf(" Devanagari", "Devanagari ", " dev ")) {
            assertFailsWith<InvalidScriptException> { getNormalizedScriptName(name) }
            assertFailsWith<InvalidScriptException> { transliterate("a", "Normal", name) }
        }
    }

    @Test
    fun sameScriptGivesTheTextAsItIs() {
        val text = "kRSNa ॐ 123"
        assertEquals(text, transliterate(text, "Hindi", "Sanskrit"))
        assertEquals(text, transliterate(text, "Devanagari", "dev"))
    }

    @Test
    fun loneSurrogateIsReadAsReplacementCharacter() {
        // like the JS and Python packages (UTF-8 would make it `?`)
        assertEquals("क�", transliterate("k\uD800", "Normal", "Devanagari").replace("्", ""))
        // a pair is the character it encodes
        assertEquals("𑀓", transliterate("क", "Devanagari", "Brahmi"))
        assertEquals("क", transliterate("𑀓", "Brahmi", "Devanagari"))
        assertEquals("ab", wellFormed("ab"))
        assertEquals("a�b�", wellFormed("a\uDC00b\uD800"))
        assertEquals("a𑀓", wellFormed("a𑀓"))
    }

    @Test
    fun preloadsScripts() {
        for (script in listOf("Devanagari", "Tamil", "Telugu", "dev")) preloadScriptData(script)
        SCRIPT_LIST.forEach(::preloadScriptData)
    }

    @Test
    fun schwaStatus() {
        assertEquals(false, getSchwaStatusForScript("Devanagari"))
        assertEquals(true, getSchwaStatusForScript("Bengali"))
        assertEquals(false, getSchwaStatusForScript("dev"))
        assertNull(getSchwaStatusForScript("Normal"))
        assertNull(getSchwaStatusForScript("Romanized"))
    }

    @Test
    fun allOptions() {
        assertTrue(getAllOptions("Normal", "Devanagari").isNotEmpty())
        assertEquals(getAllOptions("Normal", "Devanagari"), getAllOptions("Normal", "dev"))
        // Hindi and Sanskrit are both Devanagari: nothing to transliterate, no options
        assertEquals(emptyList(), getAllOptions("Hindi", "Sanskrit"))
        assertEquals(emptyList(), getAllOptions("Devanagari", "Devanagari"))
    }

    @Test
    fun normalizedScriptName() {
        assertEquals("Devanagari", getNormalizedScriptName("Devanagari"))
        assertEquals("Devanagari", getNormalizedScriptName("dev"))
        assertEquals("Devanagari", getNormalizedScriptName("Hindi"))
        assertEquals("Devanagari", getNormalizedScriptName("devanagari"))
        assertEquals("Devanagari", getNormalizedScriptName("DEVANAGARI"))
        for (script in SCRIPT_LIST) assertEquals(script, getNormalizedScriptName(script))
    }

    @Test
    fun scriptLists() {
        val data = getScriptListData()
        for (script in listOf("Devanagari", "Tamil", "Telugu", "Kannada", "Normal", "Brahmi")) {
            assertTrue(script in SCRIPT_LIST, script)
        }
        assertTrue("Hindi" in LANG_LIST)
        assertEquals("Devanagari", data.langScriptMap["Hindi"])
        assertEquals("Devanagari", data.scriptAlternatesMap["dev"])
        // languages first, each name once (the order of the JS package)
        assertEquals(LANG_LIST + SCRIPT_LIST.filterNot { it in LANG_LIST }, ALL_SCRIPT_LANG_LIST)
        assertEquals(LANG_LIST.toSet(), data.langScriptMap.keys)
        // every language and alias resolves to the script of the map
        for ((name, script) in data.langScriptMap + data.scriptAlternatesMap) {
            assertEquals(script, getNormalizedScriptName(name), name)
        }
    }
}
