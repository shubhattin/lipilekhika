"""API edges (#185): arguments and results checked like the JS package does."""

import copy
import pickle
import subprocess
import sys
import threading
import time

import pytest

from lipilekhika import ALL_SCRIPT_LANG_LIST, LANG_LIST, SCRIPT_LIST, transliterate
from lipilekhika.typing import (
    TypingContext,
    TypingContextOptions,
    TypingDiff,
    create_typing_context,
)


class TestScriptNames:
    @pytest.mark.parametrize("name", [" Hindi", "Normal ", " dev "])
    def test_surrounding_spaces_are_not_a_script_name(self, name):
        # JS and Rust do not accept them either
        with pytest.raises(ValueError):
            transliterate("ka", name, "Devanagari")
        with pytest.raises(ValueError):
            create_typing_context(name)


class TestLoneSurrogates:
    """A lone surrogate is read as U+FFFD, like in the JS package and the Rust crate."""

    def test_transliterate(self):
        assert transliterate("ka\ud800kha", "Normal", "Devanagari") == "क�ख"
        assert transliterate("\udc00ka", "Normal", "Devanagari") == "�क"

    def test_typing_key(self):
        ctx = create_typing_context("Devanagari")
        assert ctx.take_key_input("k").diff_add_text == "क्"
        diff = ctx.take_key_input("\ud801")
        assert (
            diff.to_delete_chars_count,
            diff.diff_add_text,
            diff.context_length,
        ) == (
            0,
            "�",
            0,
        )


class TestListOrder:
    def test_all_script_lang_list_has_the_order_of_the_js_package(self):
        # JS: `Array.from(new Set([...LANG_LIST, ...SCRIPT_LIST]))`
        assert ALL_SCRIPT_LANG_LIST == list(dict.fromkeys(LANG_LIST + SCRIPT_LIST))

    def test_order_does_not_change_between_runs(self):
        code = (
            "import lipilekhika as l; from lipilekhika.main import SCRIPT_LIST_DATA as d; "
            "print(l.ALL_SCRIPT_LANG_LIST, list(d.lang_script_map.items()), "
            "list(d.script_alternates_map.items()))"
        )
        outputs = {
            subprocess.run(
                [sys.executable, "-c", code],
                env={"PYTHONHASHSEED": seed},
                capture_output=True,
                text=True,
                check=True,
            ).stdout
            for seed in ("1", "2", "3")
        }
        assert len(outputs) == 1


class TestTypingContext:
    def test_get_normalized_script(self):
        assert create_typing_context("hi").get_normalized_script() == "Devanagari"
        assert create_typing_context("Brahmi").get_normalized_script() == "Brahmi"

    @pytest.mark.parametrize("ms", [-1, -4500])
    def test_negative_auto_clear_time_is_a_value_error(self, ms):
        with pytest.raises(ValueError, match="auto_context_clear_time_ms"):
            TypingContextOptions(ms)
        with pytest.raises(ValueError, match="auto_context_clear_time_ms"):
            TypingContextOptions(auto_context_clear_time_ms=ms)
        options = TypingContextOptions()
        with pytest.raises(ValueError, match="auto_context_clear_time_ms"):
            options.auto_context_clear_time_ms = ms

    def test_reprs(self):
        ctx = create_typing_context("Devanagari")
        assert (
            repr(ctx.take_key_input("k"))
            == "TypingDiff(to_delete_chars_count=0, diff_add_text='क्', context_length=1)"
        )
        assert (
            repr(ctx)
            == "TypingContext(script='Devanagari', use_native_numerals=True, include_inherent_vowel=False)"
        )
        assert (
            repr(TypingContextOptions(1000, False, True))
            == "TypingContextOptions(auto_context_clear_time_ms=1000, use_native_numerals=False, include_inherent_vowel=True)"
        )

    def test_classes_are_in_the_typing_module(self):
        for cls in (TypingContext, TypingContextOptions, TypingDiff):
            assert cls.__module__ == "lipilekhika.typing"

    def test_options_can_be_pickled_and_copied(self):
        options = TypingContextOptions(1000, False, True)
        for clone in (
            pickle.loads(pickle.dumps(options)),
            copy.deepcopy(options),
            copy.copy(options),
        ):
            assert repr(clone) == repr(options)
            assert clone is not options


class TestGil:
    def test_transliterate_releases_the_gil(self):
        """Another Python thread keeps running during a long transliteration."""
        text = "namaste saMskRRitam " * 300_000
        ticks = 0
        stop = threading.Event()

        def ticker():
            nonlocal ticks
            while not stop.is_set():
                ticks += 1
                time.sleep(0.001)

        thread = threading.Thread(target=ticker)
        thread.start()
        try:
            start = time.perf_counter()
            transliterate(text, "Normal", "Devanagari")
            elapsed = time.perf_counter() - start
        finally:
            stop.set()
            thread.join()
        # holding the GIL the ticker got about 1 tick in the whole call
        assert elapsed > 0.02, "the text is too short to measure"
        assert ticks >= 5, f"{ticks} ticks in {elapsed:.3f} s"


class TestReviewEdges:
    """Review of #188"""

    def test_same_script_returns_the_text_as_it_is(self):
        # like the JS package, which returns the input of a same-script pair unchanged
        assert transliterate("ka\ud800", "Normal", "Normal") == "ka\ud800"
        assert transliterate("क\ud800", "Hindi", "Sanskrit") == "क\ud800"
        assert transliterate("ka", "Normal", "Normal") == "ka"

    @pytest.mark.parametrize("ms", [2**64, -(2**63) - 1])
    def test_out_of_range_auto_clear_time_is_a_value_error(self, ms):
        # was OverflowError, like a negative time it is a ValueError
        with pytest.raises(ValueError, match="auto_context_clear_time_ms"):
            TypingContextOptions(ms)

    def test_large_auto_clear_time_is_accepted(self):
        assert TypingContextOptions(2**64 - 1).auto_context_clear_time_ms == 2**64 - 1
