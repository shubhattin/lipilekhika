"""Tests for the lipilekhika typing module."""

import pytest

from lipilekhika.typing import (
    DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
    DEFAULT_INCLUDE_INHERENT_VOWEL,
    DEFAULT_USE_NATIVE_NUMERALS,
    ScriptTypingDataMap,
    TypingContext,
    TypingContextOptions,
    TypingDiff,
    create_typing_context,
    get_script_typing_data_map,
)
from lipilekhika.types import ScriptLangType


class TestConstants:
    """Test default constants."""

    def test_default_auto_context_clear_time_ms(self):
        """Test DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS is a positive integer."""
        assert isinstance(DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS, int)
        assert DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS > 0

    def test_default_use_native_numerals(self):
        """Test DEFAULT_USE_NATIVE_NUMERALS is a boolean."""
        assert isinstance(DEFAULT_USE_NATIVE_NUMERALS, bool)

    def test_default_include_inherent_vowel(self):
        """Test DEFAULT_INCLUDE_INHERENT_VOWEL is a boolean."""
        assert isinstance(DEFAULT_INCLUDE_INHERENT_VOWEL, bool)


class TestTypingContextOptions:
    """Test TypingContextOptions class."""

    def test_default_construction(self):
        """Test creating TypingContextOptions with default values."""
        options = TypingContextOptions()
        assert hasattr(options, "auto_context_clear_time_ms")
        assert hasattr(options, "use_native_numerals")
        assert hasattr(options, "include_inherent_vowel")

    def test_custom_construction(self):
        """Test creating TypingContextOptions with custom values."""
        options = TypingContextOptions(
            auto_context_clear_time_ms=2000,
            use_native_numerals=True,
            include_inherent_vowel=False,
        )
        assert options.auto_context_clear_time_ms == 2000
        assert options.use_native_numerals is True
        assert options.include_inherent_vowel is False

    def test_partial_construction(self):
        """Test creating TypingContextOptions with some custom values."""
        options = TypingContextOptions(use_native_numerals=False)
        assert isinstance(options.auto_context_clear_time_ms, int)
        assert options.use_native_numerals is False
        assert isinstance(options.include_inherent_vowel, bool)


class TestCreateTypingContext:
    """Test create_typing_context function."""

    def test_create_context_devanagari(self):
        """Test creating a typing context for Devanagari."""
        ctx = create_typing_context("Devanagari")
        assert isinstance(ctx, TypingContext)

    def test_create_context_tamil(self):
        """Test creating a typing context for Tamil."""
        ctx = create_typing_context("Tamil")
        assert isinstance(ctx, TypingContext)

    def test_create_context_with_options(self):
        """Test creating a typing context with custom options."""
        options = TypingContextOptions(
            use_native_numerals=True, include_inherent_vowel=False
        )
        ctx = create_typing_context("Devanagari", options)
        assert isinstance(ctx, TypingContext)

    def test_create_context_invalid_script(self):
        """Test creating a typing context with an invalid script raises ValueError."""
        with pytest.raises(ValueError):
            create_typing_context("InvalidScriptName")  # ty:ignore[invalid-argument-type]

    def test_create_context_normalized_names(self):
        """Test creating a typing context with script acronyms/aliases."""
        # Test with acronym
        ctx = create_typing_context("dev")
        assert isinstance(ctx, TypingContext)


class TestTypingContext:
    """Test TypingContext class."""

    def test_clear_context(self):
        """Test clear_context method."""
        ctx = create_typing_context("Devanagari")
        diff = ctx.take_key_input("k")
        ctx.clear_context()
        # After clearing, context should start fresh
        diff = ctx.take_key_input("k")
        assert isinstance(diff, TypingDiff)

    def test_take_key_input_basic(self):
        """Test basic key input."""
        ctx = create_typing_context("Devanagari")
        diff = ctx.take_key_input("k")
        assert isinstance(diff, TypingDiff)
        assert isinstance(diff.to_delete_chars_count, int)
        assert isinstance(diff.diff_add_text, str)
        assert diff.to_delete_chars_count >= 0
        assert len(diff.diff_add_text) > 0

    def test_take_key_input_sequence(self):
        """Test a sequence of key inputs (simulating 'namaste')."""
        ctx = create_typing_context("Devanagari")
        result_chars = []

        for char in "namaste":
            diff = ctx.take_key_input(char)
            # Simulate deleting chars
            if diff.to_delete_chars_count > 0:
                result_chars = result_chars[: -diff.to_delete_chars_count]
            # Add new text
            result_chars.extend(diff.diff_add_text)

        result = "".join(result_chars)
        assert len(result) > 0
        # Result should be in Devanagari script
        assert result != "namaste"  # Should be transliterated

    def test_update_use_native_numerals(self):
        """Test updating native numerals setting."""
        ctx = create_typing_context("Devanagari")
        ctx.update_use_native_numerals(True)
        assert ctx.get_use_native_numerals() is True
        ctx.update_use_native_numerals(False)
        assert ctx.get_use_native_numerals() is False

    def test_update_include_inherent_vowel(self):
        """Test updating inherent vowel setting."""
        ctx = create_typing_context("Devanagari")
        ctx.update_include_inherent_vowel(True)
        assert ctx.get_include_inherent_vowel() is True
        ctx.update_include_inherent_vowel(False)
        assert ctx.get_include_inherent_vowel() is False

    def test_get_use_native_numerals(self):
        """Test getting native numerals setting."""
        options = TypingContextOptions(use_native_numerals=True)
        ctx = create_typing_context("Devanagari", options)
        assert ctx.get_use_native_numerals() is True

    def test_get_include_inherent_vowel(self):
        """Test getting inherent vowel setting."""
        options = TypingContextOptions(include_inherent_vowel=False)
        ctx = create_typing_context("Devanagari", options)
        assert ctx.get_include_inherent_vowel() is False


class TestTypingDiff:
    """Test TypingDiff class."""

    def test_typing_diff_properties(self):
        """Test TypingDiff properties."""
        ctx = create_typing_context("Devanagari")
        diff = ctx.take_key_input("a")
        assert isinstance(diff.to_delete_chars_count, int)
        assert isinstance(diff.diff_add_text, str)
        assert diff.to_delete_chars_count >= 0

    def test_typing_diff_repr(self):
        """Test TypingDiff __repr__ method."""
        ctx = create_typing_context("Devanagari")
        diff = ctx.take_key_input("k")
        repr_str = repr(diff)
        assert isinstance(repr_str, str)
        assert "TypingDiff" in repr_str
        assert "to_delete_chars_count" in repr_str
        assert "diff_add_text" in repr_str


class TestGetScriptTypingDataMap:
    """Test get_script_typing_data_map function."""

    def test_get_data_map_devanagari(self):
        """Test getting typing data map for Devanagari."""
        data_map = get_script_typing_data_map("Devanagari")
        assert isinstance(data_map, ScriptTypingDataMap)
        assert isinstance(data_map.common_krama_map, list)
        assert isinstance(data_map.script_specific_krama_map, list)

    def test_get_data_map_tamil(self):
        """Test getting typing data map for Tamil."""
        data_map = get_script_typing_data_map("Tamil")
        assert isinstance(data_map, ScriptTypingDataMap)
        assert len(data_map.common_krama_map) > 0

    def test_get_data_map_invalid_script(self):
        """Test getting typing data map with invalid script raises ValueError."""
        with pytest.raises(ValueError):
            get_script_typing_data_map("InvalidScript")  # ty:ignore[invalid-argument-type]

    def test_get_data_map_normal_script(self):
        """Test getting typing data map for Normal/English raises ValueError."""
        with pytest.raises(ValueError):
            get_script_typing_data_map("Normal")

    def test_get_data_map_normalized_names(self):
        """Test getting typing data map with script acronyms."""
        data_map = get_script_typing_data_map("dev")
        assert isinstance(data_map, ScriptTypingDataMap)


class TestScriptTypingDataMap:
    """Test ScriptTypingDataMap class."""

    def test_script_typing_data_map_structure(self):
        """Test ScriptTypingDataMap structure."""
        data_map = get_script_typing_data_map("Devanagari")
        assert hasattr(data_map, "common_krama_map")
        assert hasattr(data_map, "script_specific_krama_map")

    def test_common_krama_map_items(self):
        """Test common_krama_map contains valid items."""
        data_map = get_script_typing_data_map("Devanagari")
        assert len(data_map.common_krama_map) > 0

        for item in data_map.common_krama_map[:5]:  # Check first 5 items
            assert isinstance(item, tuple)
            assert len(item) == 3
            text, list_type, mappings = item
            assert isinstance(text, str)
            assert isinstance(list_type, str)
            assert list_type in ("anya", "vyanjana", "matra", "svara")
            assert isinstance(mappings, list)
            for mapping in mappings:
                assert isinstance(mapping, str)

    def test_script_specific_krama_map_items(self):
        """Test script_specific_krama_map contains valid items."""
        data_map = get_script_typing_data_map("Devanagari")

        for item in data_map.script_specific_krama_map[:5]:  # Check first 5 items
            assert isinstance(item, tuple)
            assert len(item) == 3
            text, list_type, mappings = item
            assert isinstance(text, str)
            assert isinstance(list_type, str)
            assert list_type in ("anya", "vyanjana", "matra", "svara")
            assert isinstance(mappings, list)

    def test_script_typing_data_map_repr(self):
        """Test ScriptTypingDataMap __repr__ method."""
        data_map = get_script_typing_data_map("Devanagari")
        repr_str = repr(data_map)
        assert isinstance(repr_str, str)
        assert "ScriptTypingDataMap" in repr_str
        assert "common_krama_map" in repr_str
        assert "script_specific_krama_map" in repr_str


class TestTypingDataMapItem:
    """Test TypingDataMapItem type."""

    def test_typing_data_map_item_structure(self):
        """Test TypingDataMapItem structure matches expected type."""
        data_map = get_script_typing_data_map("Devanagari")

        if len(data_map.common_krama_map) > 0:
            item = data_map.common_krama_map[0]
            assert isinstance(item, tuple)
            assert len(item) == 3

            text, list_type, mappings = item
            assert isinstance(text, str) and len(text) > 0
            # Type check for ListType
            assert list_type in ("anya", "vyanjana", "matra", "svara")
            assert isinstance(mappings, list)
            assert all(isinstance(m, str) for m in mappings)


class TestListType:
    """Test ListType literal type."""

    def test_list_type_values(self):
        """Test ListType can hold expected values."""
        data_map = get_script_typing_data_map("Devanagari")
        all_types = set()

        for item in data_map.common_krama_map:
            _, list_type, _ = item
            all_types.add(list_type)

        # All list types should be one of the defined literals
        valid_types = {"anya", "vyanjana", "matra", "svara"}
        assert all_types.issubset(valid_types)


class TestIntegrationScenarios:
    """Integration tests for realistic usage scenarios."""

    def test_typing_workflow_devanagari(self):
        """Test a complete typing workflow for Devanagari."""
        ctx = create_typing_context("Devanagari")
        result_chars = []

        # Type "namaste"
        for char in "namaste":
            diff = ctx.take_key_input(char)
            if diff.to_delete_chars_count > 0:
                result_chars = result_chars[: -diff.to_delete_chars_count]
            result_chars.extend(diff.diff_add_text)

        result = "".join(result_chars)
        assert len(result) > 0
        assert result != "namaste"  # Should be transliterated

    def test_typing_with_native_numerals(self):
        """Test typing with native numerals enabled."""
        options = TypingContextOptions(use_native_numerals=True)
        ctx = create_typing_context("Devanagari", options)

        result_chars = []
        for char in "123":
            diff = ctx.take_key_input(char)
            if diff.to_delete_chars_count > 0:
                result_chars = result_chars[: -diff.to_delete_chars_count]
            result_chars.extend(diff.diff_add_text)

        result = "".join(result_chars)
        assert len(result) > 0
        # With native numerals, should get Devanagari numerals
        assert result != "123"

    def test_context_clear_resets_state(self):
        """Test that clearing context resets the state properly."""
        ctx = create_typing_context("Devanagari")

        # Type something
        ctx.take_key_input("k")
        ctx.take_key_input("a")

        # Clear and start fresh
        ctx.clear_context()

        # Type again
        diff = ctx.take_key_input("k")
        # Should behave as if starting fresh (no deletions from previous state)
        assert isinstance(diff, TypingDiff)

    def test_multiple_scripts(self):
        """Test creating contexts for multiple scripts."""
        scripts = list[ScriptLangType](["Devanagari", "Tamil", "Telugu", "Kannada"])

        for script in scripts:
            ctx = create_typing_context(script)
            diff = ctx.take_key_input("a")
            assert isinstance(diff, TypingDiff)
            assert len(diff.diff_add_text) > 0

    def test_data_map_has_mappings(self):
        """Test that data maps actually contain useful mappings."""
        data_map = get_script_typing_data_map("Devanagari")

        # Find items that have mappings
        items_with_mappings = [
            item for item in data_map.common_krama_map if len(item[2]) > 0
        ]

        assert len(items_with_mappings) > 0

        # Check that mappings are reasonable
        for text, list_type, mappings in items_with_mappings[:10]:
            assert len(text) > 0
            assert len(mappings) > 0
            # Each mapping should be a reasonable length
            for mapping in mappings:
                assert len(mapping) > 0
                assert len(mapping) < 20  # No mapping should be too long
