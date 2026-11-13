package com.shubhattin.lipilekhika.core

import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import org.junit.Test

/** The typing API (ported from the Python `test_typing` and Go typing tests) */
class TypingApiTest {
    private fun type(ctx: TypingContext, keys: List<String>, start: String = ""): String =
        keys.fold(start) { text, key ->
            if (key.startsWith("pause:")) {
                Thread.sleep(key.removePrefix("pause:").toLong())
                text
            } else {
                ctx.takeKeyInput(key).applyTo(text)
            }
        }

    @Test
    fun defaults() {
        assertTrue(DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS > 0)
        assertTrue(DEFAULT_USE_NATIVE_NUMERALS)
        assertFalse(DEFAULT_INCLUDE_INHERENT_VOWEL)
        val options = TypingContextOptions()
        assertEquals(DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS, options.autoContextClearTimeMs)
        assertEquals(DEFAULT_USE_NATIVE_NUMERALS, options.useNativeNumerals)
        assertEquals(DEFAULT_INCLUDE_INHERENT_VOWEL, options.includeInherentVowel)
    }

    @Test
    fun typesKeyByKey() {
        createTypingContext("Devanagari").use { ctx ->
            assertEquals("नमस्ते", type(ctx, "namaste".map { it.toString() }))
        }
        createTypingContext("hi").use { ctx ->
            val diff = ctx.takeKeyInput("k")
            assertEquals(0, diff.toDeleteCharsCount)
            assertEquals("क्", diff.diffAddText)
            assertTrue(diff.contextLength > 0)
        }
    }

    @Test
    fun normalizedScript() {
        createTypingContext("Hindi").use { assertEquals("Devanagari", it.getNormalizedScript()) }
        createTypingContext("tamil").use { assertEquals("Tamil", it.getNormalizedScript()) }
    }

    @Test
    fun clearContext() {
        createTypingContext("Devanagari").use { ctx ->
            val typed = type(ctx, listOf("k"))
            ctx.clearContext()
            // a new start: `a` is not joined to the क् before it
            assertEquals("क्अ", type(ctx, listOf("a"), typed))
        }
    }

    @Test
    fun options() {
        createTypingContext(
                "Devanagari",
                TypingContextOptions(useNativeNumerals = false, includeInherentVowel = true),
            )
            .use { ctx ->
                assertFalse(ctx.getUseNativeNumerals())
                assertTrue(ctx.getIncludeInherentVowel())
                assertEquals("1क", type(ctx, listOf("1", "k")))
                ctx.clearContext()
                ctx.updateUseNativeNumerals(true)
                ctx.updateIncludeInherentVowel(false)
                assertTrue(ctx.getUseNativeNumerals())
                assertFalse(ctx.getIncludeInherentVowel())
                assertEquals("१क्", type(ctx, listOf("1", "k")))
            }
    }

    @Test
    fun clearTime() {
        // like Go, TS and Rust: a pause longer than the clear time starts anew, 0 after any pause
        val cases =
            listOf(
                Triple(30L, listOf("k", "pause:100", "a"), "क्अ"),
                Triple(1000L, listOf("k", "pause:5", "a"), "क"),
                Triple(0L, listOf("k", "pause:5", "a"), "क्अ"),
            )
        for ((ms, keys, want) in cases) {
            createTypingContext("Devanagari", TypingContextOptions(autoContextClearTimeMs = ms))
                .use { assertEquals(want, type(it, keys), "clear time $ms") }
        }
        createTypingContext(
                "Devanagari",
                TypingContextOptions(autoContextClearTimeMs = Long.MAX_VALUE),
            )
            .close()
        val e =
            assertFailsWith<InvalidArgumentException> {
                createTypingContext("Devanagari", TypingContextOptions(autoContextClearTimeMs = -1))
            }
        assertTrue("-1" in e.message.orEmpty())
    }

    @Test
    fun emptyKeyDoesNotChangeTheText() {
        createTypingContext("Devanagari").use { ctx ->
            type(ctx, listOf("k"))
            ctx.updateIncludeInherentVowel(true)
            val diff = ctx.takeKeyInput("")
            assertEquals(0, diff.toDeleteCharsCount)
            assertEquals("", diff.diffAddText)
            assertEquals(1, diff.contextLength)
        }
    }

    @Test
    fun diffCountsCodePoints() {
        // Brahmi is outside the BMP: a character is 2 Chars of a String
        createTypingContext("Brahmi").use { ctx ->
            val first = ctx.takeKeyInput("k")
            val text = first.applyTo("")
            assertEquals("𑀓𑁆", text)
            // `a` deletes the virama: one code point, two Chars
            val second = ctx.takeKeyInput("a")
            assertEquals(1, second.toDeleteCharsCount)
            assertEquals(2, second.deleteCountIn(text))
            assertEquals("𑀓", second.applyTo(text))
        }
        // at most the whole text is deleted
        createTypingContext("Devanagari").use { ctx ->
            ctx.takeKeyInput("k")
            val diff = ctx.takeKeyInput("a")
            // `a` removes the halant of क्
            assertEquals("क", diff.applyTo("क्"))
            assertEquals(1, diff.deleteCountIn("x"))
            assertEquals("", diff.applyTo(""))
        }
    }

    @Test
    fun longTextIsLinear() {
        createTypingContext("Devanagari").use { ctx ->
            val start = System.nanoTime()
            val keys = "ka".repeat(10_000).map { it.toString() }
            val sb = StringBuilder()
            for (key in keys) {
                val diff = ctx.takeKeyInput(key)
                sb.setLength(sb.length - diff.deleteCountIn(sb.toString()))
                sb.append(diff.diffAddText)
            }
            assertEquals("क".repeat(10_000), sb.toString())
            val seconds = (System.nanoTime() - start) / 1e9
            assertTrue(seconds < 10, "typing 20000 keys took ${seconds}s")
        }
    }

    @Test
    fun typingDataMap() {
        val data = getScriptTypingDataMap("Devanagari")
        assertTrue(data.commonKramaMap.isNotEmpty())
        assertTrue(data.commonKramaMap.all { it.text.isNotEmpty() })
        // `x` types क्ष (k, halant, Sh), it was not listed (#186)
        val x = data.commonKramaMap.filter { "x" in it.mappings }
        assertEquals(listOf(TypingDataMapItem("क्ष", ListType.VYANJANA, listOf("x"))), x)
        assertEquals(data, getScriptTypingDataMap("hi"))
    }

    @Test
    fun kramaData() {
        val dev = getScriptKramaData("Devanagari")
        assertTrue(dev.isNotEmpty())
        assertEquals(ListType.entries.toSet(), dev.map { it.listType }.toSet())
        // the lists are index-aligned across the scripts
        for (script in listOf("Tamil", "Telugu", "Kannada", "Bengali", "Malayalam")) {
            val other = getScriptKramaData(script)
            assertEquals(dev.size, other.size, script)
            assertEquals(dev.map { it.listType }, other.map { it.listType }, script)
        }
        val ka = dev.indexOfFirst { it.text == "क" }
        assertEquals("క", getScriptKramaData("Telugu")[ka].text)
    }

    @Test
    fun closedContextThrows() {
        val ctx = createTypingContext("Devanagari")
        ctx.close()
        ctx.close() // a second close does nothing
        assertFailsWith<IllegalStateException> { ctx.takeKeyInput("k") }
        assertFailsWith<IllegalStateException> { ctx.getNormalizedScript() }
    }

    @Test
    fun unclosedContextsAreFreedByTheCleaner() {
        // contexts left to the garbage collector (their Rust objects are freed by the cleaner)
        repeat(10_000) { createTypingContext("Devanagari").takeKeyInput("k") }
        System.gc()
        createTypingContext("Devanagari").use { assertEquals("क्", type(it, listOf("k"))) }
    }

    @Test
    fun keysOutsideTheBmpAndLoneSurrogates() {
        createTypingContext("Devanagari").use { ctx ->
            // a key is read as UTF-16, a lone surrogate as U+FFFD (no crash)
            ctx.takeKeyInput("\uD800")
            ctx.takeKeyInput("𑀓")
        }
    }
}
