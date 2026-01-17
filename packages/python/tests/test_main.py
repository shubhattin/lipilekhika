"""Tests for the lipilekhika main module."""

import pytest

from lipilekhika import (
    ALL_SCRIPT_LANG_LIST,
    LANG_LIST,
    SCRIPT_LIST,
    get_all_options,
    get_normalized_script_name,
    get_schwa_status_for_script,
    preload_script_data,
    transliterate,
)


class TestPreloadScriptData:
    """Test preload_script_data function."""

    def test_preload_devanagari(self):
        """Test preloading Devanagari script data."""
        # Should not raise any errors
        preload_script_data("Devanagari")

    def test_preload_multiple_scripts(self):
        """Test preloading multiple scripts."""
        scripts = ["Devanagari", "Tamil", "Telugu", "Kannada"]
        for script in scripts:
            preload_script_data(script)

    def test_preload_normalized_name(self):
        """Test preloading with normalized script name."""
        # Should not raise any errors
        preload_script_data("dev")

    def test_preload_all_major_scripts(self):
        """Test preloading all major scripts in SCRIPT_LIST."""
        # Load first 5 scripts from the list
        for script in SCRIPT_LIST[:5]:
            preload_script_data(script)


class TestGetSchwaStatusForScript:
    """Test get_schwa_status_for_script function."""

    def test_get_schwa_status_devanagari(self):
        """Test getting schwa status for Devanagari."""
        status = get_schwa_status_for_script("Devanagari")
        assert isinstance(status, bool)

    def test_get_schwa_status_tamil(self):
        """Test getting schwa status for Tamil."""
        status = get_schwa_status_for_script("Tamil")
        assert isinstance(status, bool)

    def test_get_schwa_status_multiple_scripts(self):
        """Test getting schwa status for multiple scripts."""
        scripts = ["Devanagari", "Tamil", "Telugu", "Kannada", "Malayalam"]
        for script in scripts:
            status = get_schwa_status_for_script(script)
            assert isinstance(status, bool)

    def test_get_schwa_status_normalized_name(self):
        """Test getting schwa status with normalized name."""
        status = get_schwa_status_for_script("dev")
        assert isinstance(status, bool)

    def test_get_schwa_status_invalid_script(self):
        """Test getting schwa status for invalid script raises error."""
        with pytest.raises(ValueError):
            get_schwa_status_for_script("InvalidScript")


class TestGetAllOptions:
    """Test get_all_options function."""

    def test_get_all_options_normal_to_devanagari(self):
        """Test getting all options for Normal to Devanagari."""
        options = get_all_options("Normal", "Devanagari")
        assert isinstance(options, list)
        assert all(isinstance(opt, str) for opt in options)

    def test_get_all_options_devanagari_to_tamil(self):
        """Test getting all options for Devanagari to Tamil."""
        options = get_all_options("Devanagari", "Tamil")
        assert isinstance(options, list)
        assert all(isinstance(opt, str) for opt in options)

    def test_get_all_options_normalized_names(self):
        """Test getting all options with normalized script names."""
        options = get_all_options("Normal", "dev")
        assert isinstance(options, list)

    def test_get_all_options_invalid_scripts(self):
        """Test getting all options with invalid scripts raises error."""
        with pytest.raises(ValueError):
            get_all_options("InvalidScript", "Devanagari")

        with pytest.raises(ValueError):
            get_all_options("Normal", "InvalidScript")

    def test_get_all_options_multiple_pairs(self):
        """Test getting all options for various script pairs."""
        pairs = [
            ("Normal", "Devanagari"),
            ("Normal", "Tamil"),
            ("Devanagari", "Tamil"),
            ("Tamil", "Telugu"),
        ]

        for from_script, to_script in pairs:
            options = get_all_options(from_script, to_script)
            assert isinstance(options, list)


class TestGetNormalizedScriptName:
    """Test get_normalized_script_name function."""

    def test_get_normalized_script_name_devanagari(self):
        """Test normalizing 'Devanagari'."""
        result = get_normalized_script_name("Devanagari")
        assert isinstance(result, str)
        assert result == "Devanagari"

    def test_get_normalized_script_name_acronym(self):
        """Test normalizing script acronym."""
        result = get_normalized_script_name("dev")
        assert isinstance(result, str)
        assert result == "Devanagari"

    def test_get_normalized_script_name_case_insensitive(self):
        """Test normalization is case insensitive."""
        result1 = get_normalized_script_name("devanagari")
        result2 = get_normalized_script_name("DEVANAGARI")
        result3 = get_normalized_script_name("Devanagari")
        assert result1 == result2 == result3

    def test_get_normalized_script_name_multiple_scripts(self):
        """Test normalizing various script names."""
        scripts = ["dev", "tamil", "telugu", "kannada", "mal"]
        for script in scripts:
            result = get_normalized_script_name(script)
            assert isinstance(result, str)
            assert len(result) > 0

    def test_get_normalized_script_name_invalid(self):
        """Test normalizing invalid script name raises error."""
        with pytest.raises(ValueError):
            get_normalized_script_name("InvalidScript")

    def test_get_normalized_script_name_all_scripts(self):
        """Test normalizing all scripts in SCRIPT_LIST."""
        for script in SCRIPT_LIST[:10]:  # Test first 10
            result = get_normalized_script_name(script)
            assert isinstance(result, str)
            assert len(result) > 0


class TestConstants:
    """Test module-level constants."""

    def test_script_list_type(self):
        """Test SCRIPT_LIST is a list of strings."""
        assert isinstance(SCRIPT_LIST, list)
        assert len(SCRIPT_LIST) > 0
        assert all(isinstance(script, str) for script in SCRIPT_LIST)

    def test_script_list_contains_major_scripts(self):
        """Test SCRIPT_LIST contains major scripts."""
        major_scripts = ["Devanagari", "Tamil", "Telugu", "Kannada"]
        for script in major_scripts:
            assert script in SCRIPT_LIST

    def test_lang_list_type(self):
        """Test LANG_LIST is a list of strings."""
        assert isinstance(LANG_LIST, list)
        assert len(LANG_LIST) > 0
        assert all(isinstance(lang, str) for lang in LANG_LIST)

    def test_all_script_lang_list_type(self):
        """Test ALL_SCRIPT_LANG_LIST is a list of strings."""
        assert isinstance(ALL_SCRIPT_LANG_LIST, list)
        assert len(ALL_SCRIPT_LANG_LIST) > 0
        assert all(isinstance(item, str) for item in ALL_SCRIPT_LANG_LIST)

    def test_all_script_lang_list_contains_both(self):
        """Test ALL_SCRIPT_LANG_LIST contains both scripts and languages."""
        # Should contain all items from SCRIPT_LIST
        for script in SCRIPT_LIST[:5]:  # Test a few
            assert script in ALL_SCRIPT_LANG_LIST

        # Should contain all items from LANG_LIST
        for lang in LANG_LIST[:5]:  # Test a few
            assert lang in ALL_SCRIPT_LANG_LIST

    def test_all_script_lang_list_length(self):
        """Test ALL_SCRIPT_LANG_LIST has reasonable length."""
        # Should be at least as long as either list
        assert len(ALL_SCRIPT_LANG_LIST) >= len(SCRIPT_LIST)
        assert len(ALL_SCRIPT_LANG_LIST) >= len(LANG_LIST)
        # Should be less than or equal to sum (due to deduplication)
        assert len(ALL_SCRIPT_LANG_LIST) <= len(SCRIPT_LIST) + len(LANG_LIST)

    def test_script_list_unique(self):
        """Test SCRIPT_LIST contains unique values."""
        assert len(SCRIPT_LIST) == len(set(SCRIPT_LIST))

    def test_lang_list_unique(self):
        """Test LANG_LIST contains unique values."""
        assert len(LANG_LIST) == len(set(LANG_LIST))

    def test_all_script_lang_list_unique(self):
        """Test ALL_SCRIPT_LANG_LIST contains unique values."""
        assert len(ALL_SCRIPT_LANG_LIST) == len(set(ALL_SCRIPT_LANG_LIST))
