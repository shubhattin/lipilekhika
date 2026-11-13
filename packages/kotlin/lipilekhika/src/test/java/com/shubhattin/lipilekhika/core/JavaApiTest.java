package com.shubhattin.lipilekhika.core;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import com.shubhattin.lipilekhika.core.ffi.LipiException;
import com.shubhattin.lipilekhika.core.ffi.TypingContext;
import java.util.Map;
import org.junit.Test;

/**
 * The API as Java sees it: static methods of `Lipilekhika` and `LipilekhikaTyping`. Java does not
 * see the Kotlin type aliases, so it imports their classes from the `ffi` package.
 */
public class JavaApiTest {
    @Test
    public void transliterates() {
        assertEquals("నమస్తే", Lipilekhika.transliterate("नमस्ते", "Devanagari", "Telugu"));
        assertEquals(
                "sOaham",
                Lipilekhika.transliterate(
                        "सोऽहम्",
                        "Devanagari",
                        "Normal",
                        Map.of("all_to_normal:replace_avagraha_with_a", true)));
        assertEquals("Devanagari", Lipilekhika.getNormalizedScriptName("hi"));
        assertThrows(
                LipiException.InvalidScript.class,
                () -> Lipilekhika.transliterate("a", "Klingon", "Devanagari"));
    }

    @Test
    public void types() {
        try (TypingContext ctx = LipilekhikaTyping.createTypingContext("Devanagari")) {
            String text = "";
            for (String key : new String[] {"n", "a", "m", "a", "s", "t", "e"}) {
                text = LipilekhikaTyping.applyTo(ctx.takeKeyInput(key), text);
            }
            assertEquals("नमस्ते", text);
        }
        TypingContextOptions options = new TypingContextOptions(1000L, false);
        assertEquals(false, options.getUseNativeNumerals());
        try (TypingContext ctx = LipilekhikaTyping.createTypingContext("Devanagari", options)) {
            assertEquals("1", ctx.takeKeyInput("1").getDiffAddText());
        }
    }
}
