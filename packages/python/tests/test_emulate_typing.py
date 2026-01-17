"""Typing Emulation Tests"""

from lipilekhika.typing import create_typing_context, TypingContextOptions
from lipilekhika import transliterate
import yaml
import pytest
from pathlib import Path
from pydantic import BaseModel, ConfigDict
from test_stats import increment_assertion_count

# Vedic svaras for special handling
VEDIC_SVARAS = ['॒', '॑', '᳚', '᳛']


class EmulateTypingDataItem(BaseModel):
    """Schema for transliteration test data items (for emulate typing)."""
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    index: int | float | str
    from_: str
    to: str
    input: str
    output: str
    reversible: bool = False
    todo: bool = False
    options: dict[str, bool] | None = None

    def __init__(self, **data):
        if 'from' in data:
            data['from_'] = data.pop('from')
        super().__init__(**data)


class TypingModeDataItem(BaseModel):
    """Schema for typing mode test data items."""
    model_config = ConfigDict(extra="ignore")

    index: int | float | str
    text: str
    output: str
    script: str
    preserve_check: bool = False
    todo: bool = False
    options: dict[str, bool | int | str | None] | None = None


def emulate_typing(text: str, script: str, options=None):
    """Helper function to emulate typing character by character."""
    # Convert dict options to TypingContextOptions if needed
    if options is not None and isinstance(options, dict):
        options = TypingContextOptions(
            use_native_numerals=options.get('useNativeNumerals'),
            include_inherent_vowel=options.get('includeInherentVowel'),
            auto_context_clear_time_ms=options.get('autoContextClearTimeMs')
        )

    ctx = create_typing_context(script, options)
    result = ""
    for char in text:
        diff = ctx.take_key_input(char)
        if diff.to_delete_chars_count > 0:
            result = result[: -diff.to_delete_chars_count]
        result += diff.diff_add_text

    return result


def has_vedic_svara(text: str) -> bool:
    """Check if text contains any Vedic svara."""
    return any(svara in text for svara in VEDIC_SVARAS)


def list_yaml_files(directory: Path) -> list[Path]:
    """Recursively list all YAML files in a directory, excluding 'context' directories."""
    collected = []
    for entry in directory.iterdir():
        if entry.is_dir():
            # Skip 'context' directories
            if entry.name != 'context':
                collected.extend(list_yaml_files(entry))
        elif entry.is_file() and entry.suffix == '.yaml':
            collected.append(entry)
    return collected


class TestEmulateTyping:
    """Test suite for emulate typing functionality based on transliteration data."""

    # Test data folders for auto-nor transliteration tests
    INPUT_FOLDERS = [
        Path(__file__).parent.parent.parent.parent / "test_data" / "transliteration" / "auto-nor-brahmic",
        Path(__file__).parent.parent.parent.parent / "test_data" / "transliteration" / "auto-nor-other"
    ]

    @pytest.mark.parametrize("folder", INPUT_FOLDERS)
    def test_emulate_typing_from_transliteration_data(self, folder: Path):
        """Test emulate typing using transliteration test data (Normal -> Script)."""
        if not folder.exists():
            pytest.skip(f"Folder {folder} does not exist")

        yaml_files = [f for f in folder.iterdir() if f.suffix == '.yaml']

        total_comparisons = 0
        total_skipped = 0

        for yaml_file in yaml_files:
            with open(yaml_file, 'r', encoding='utf-8') as f:
                raw_data = yaml.safe_load(f)

            assert isinstance(raw_data, list), f"Expected list in {yaml_file}"

            # Parse with Pydantic
            test_data = [EmulateTypingDataItem(**item) for item in raw_data]

            file_comparisons = 0
            file_skipped = 0

            for test_item in test_data:
                # Only test Normal -> Script conversions (not Script -> Normal)
                if test_item.from_ != 'Normal' or test_item.to == 'Normal':
                    continue

                # Skip TODO tests
                if test_item.todo:
                    file_skipped += 1
                    continue

                input_text = test_item.input
                to_script = test_item.to
                expected_output = test_item.output

                # Perform emulate typing
                result = emulate_typing(input_text, to_script)

                # Special handling for Tamil-Extended with Vedic svaras
                if yaml_file.name.startswith('auto') and to_script == 'Tamil-Extended' and has_vedic_svara(result):
                    file_skipped += 1
                    continue

                # Assertion with detailed error message
                error_message = (
                    f"Emulate Typing failed:\n"
                    f"  File: {yaml_file.name}\n"
                    f"  Index: {test_item.index}\n"
                    f"  From: {test_item.from_}\n"
                    f"  To: {to_script}\n"
                    f"  Input: \"{input_text}\"\n"
                    f"  Expected: \"{expected_output}\"\n"
                    f"  Actual: \"{result}\""
                )
                assert result == expected_output, error_message
                increment_assertion_count()
                file_comparisons += 1

            total_comparisons += file_comparisons
            total_skipped += file_skipped

        print(f"\n  ✓ {folder.name}: {total_comparisons} comparisons passed, {total_skipped} skipped")


class TestTypingMode:
    """Test suite for typing mode specific tests."""

    TEST_DATA_FOLDER = Path(__file__).parent.parent.parent.parent / "test_data" / "typing"

    @pytest.mark.parametrize("yaml_file", list_yaml_files(TEST_DATA_FOLDER) if (Path(__file__).parent.parent.parent.parent / "test_data" / "typing").exists() else [])
    def test_typing_mode_from_yaml(self, yaml_file: Path):
        """Test typing mode based on YAML test data."""
        with open(yaml_file, 'r', encoding='utf-8') as f:
            raw_data = yaml.safe_load(f)

        assert isinstance(raw_data, list), f"Expected list in {yaml_file}"

        # Parse with Pydantic
        test_data = [TypingModeDataItem(**item) for item in raw_data]

        comparison_count = 0
        skipped_count = 0

        for test_item in test_data:
            # Skip TODO tests
            if test_item.todo:
                skipped_count += 1
                continue

            text = test_item.text
            script = test_item.script
            expected_output = test_item.output
            options = test_item.options

            # Perform emulate typing
            result = emulate_typing(text, script, options)

            # Assertion
            error_message = (
                f"Typing Mode failed:\n"
                f"  File: {yaml_file.name}\n"
                f"  Index: {test_item.index}\n"
                f"  Script: {script}\n"
                f"  Input: \"{text}\"\n"
                f"  Expected: \"{expected_output}\"\n"
                f"  Actual: \"{result}\""
            )
            assert result == expected_output, error_message
            increment_assertion_count()
            comparison_count += 1

            # Preserve check: type -> transliterate back -> should get original
            if test_item.preserve_check:
                # Transliterate back to Normal
                result_back = transliterate(
                    result,
                    script,
                    'Normal',
                    {'all_to_normal:preserve_specific_chars': True}
                )

                error_message_preserve = (
                    f"Preserve Check failed:\n"
                    f"  File: {yaml_file.name}\n"
                    f"  Index: {test_item.index}\n"
                    f"  Script: {script}\n"
                    f"  Original Input: \"{text}\"\n"
                    f"  Typed Output: \"{result}\"\n"
                    f"  Transliterated Back: \"{result_back}\""
                )
                assert result_back == text, error_message_preserve
                increment_assertion_count()
                comparison_count += 1

        print(f"\n  ✓ {yaml_file.name}: {comparison_count} comparisons passed, {skipped_count} skipped")
