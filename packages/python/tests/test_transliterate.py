"""Transliteration Tests"""

import yaml
import pytest
from pathlib import Path
from pydantic import BaseModel, ConfigDict
from lipilekhika import transliterate, preload_script_data
from test_stats import increment_assertion_count

# Test data folder
TEST_DATA_FOLDER = Path(__file__).parent.parent.parent.parent / "test_data" / "transliteration"
TEST_FILES_TO_IGNORE = []

# Vedic svaras for special handling
VEDIC_SVARAS = ['॒', '॑', '᳚', '᳛']


class TransliterationDataItem(BaseModel):
    """Schema for transliteration test data items."""
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    index: int | float | str = "unknown"  # index can be int, float, or 'unknown'
    from_: str  # 'from' is a Python keyword, use alias
    to: str
    input: str
    output: str
    reversible: bool = False
    todo: bool = False
    options: dict[str, bool] | None = None

    def __init__(self, **data):
        # Handle 'from' -> 'from_' conversion
        if 'from' in data:
            data['from_'] = data.pop('from')
        super().__init__(**data)


def list_yaml_files(directory: Path) -> list[Path]:
    """Recursively list all YAML files in a directory."""
    collected = []
    for entry in directory.iterdir():
        if entry.is_dir():
            collected.extend(list_yaml_files(entry))
        elif entry.is_file() and entry.suffix == '.yaml':
            collected.append(entry)
    return collected


def has_vedic_svara(text: str) -> bool:
    """Check if text contains any Vedic svara."""
    return any(svara in text for svara in VEDIC_SVARAS)


class TestTransliteration:
    """Test suite for transliteration functionality."""

    @pytest.fixture(scope="class")
    def yaml_files(self):
        """Get all YAML test files."""
        return list_yaml_files(TEST_DATA_FOLDER)

    def test_yaml_files_found(self, yaml_files):
        """Ensure we found test files."""
        assert len(yaml_files) > 0, "No YAML test files found"

    @pytest.mark.parametrize("yaml_file", list_yaml_files(TEST_DATA_FOLDER))
    def test_transliteration_from_yaml(self, yaml_file: Path):
        """Test transliteration based on YAML test data."""
        relative_path = yaml_file.relative_to(TEST_DATA_FOLDER)
        file_name = yaml_file.name

        # Skip ignored files
        if str(relative_path) in TEST_FILES_TO_IGNORE or file_name in TEST_FILES_TO_IGNORE:
            pytest.skip(f"File {relative_path} is in ignore list")

        # Load test data
        with open(yaml_file, 'r', encoding='utf-8') as f:
            raw_test_data = yaml.safe_load(f)

        assert isinstance(raw_test_data, list), f"Expected list in {yaml_file}"

        for item_data in raw_test_data:
            # Parse test item using Pydantic model
            test_item = TransliterationDataItem(**item_data)

            # Extract test parameters
            index = test_item.index
            from_script = test_item.from_
            to_script = test_item.to
            input_text = test_item.input
            expected_output = test_item.output
            reversible = test_item.reversible
            todo = test_item.todo
            options = test_item.options if test_item.options is not None else {}

            # Skip TODO tests
            if todo:
                continue

            # Preload script data for performance
            preload_script_data(from_script)
            preload_script_data(to_script)

            # Perform transliteration
            result = transliterate(input_text, from_script, to_script, options)

            # Special handling for Tamil-Extended with Vedic svaras
            # The old implementation had issues with vedic svara tails in Tamil Extended
            if file_name.startswith('auto') and to_script == 'Tamil-Extended' and has_vedic_svara(result):
                continue

            # Forward transliteration test
            error_message = (
                f"Transliteration failed:\n"
                f"  File: {relative_path}\n"
                f"  Index: {index}\n"
                f"  From: {from_script}\n"
                f"  To: {to_script}\n"
                f"  Input: \"{input_text}\"\n"
                f"  Expected: \"{expected_output}\"\n"
                f"  Actual: \"{result}\""
            )
            assert result == expected_output, error_message
            increment_assertion_count(1, 'test_transliterate.py')

            # Reversible transliteration test
            if reversible:
                result_reversed = transliterate(result, to_script, from_script, options)

                error_message_reversed = (
                    f"Reversed Transliteration failed:\n"
                    f"  File: {relative_path}\n"
                    f"  Index: {index}\n"
                    f"  From: {to_script}\n"
                    f"  To: {from_script}\n"
                    f"  Input: \"{result}\"\n"
                    f"  Original Input: \"{input_text}\"\n"
                    f"  Reversed Output: \"{result_reversed}\""
                )
                assert result_reversed == input_text, error_message_reversed
                increment_assertion_count(1, 'test_transliterate.py')
