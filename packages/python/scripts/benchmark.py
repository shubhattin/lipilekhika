import time
from pathlib import Path
import yaml
from typing import Any
from rich.console import Console

from lipilekhika import transliterate, preload_script_data, SCRIPT_LIST
from lipilekhika.typing import create_typing_context, TypingContextOptions
from lipilekhika.types import ScriptListType

console = Console()

# Test data paths
TEST_DATA_FOLDER = (
    Path(__file__).resolve().parent.parent.parent.parent
    / "test_data"
    / "transliteration"
)
TYPING_TEST_DATA_FOLDER = (
    Path(__file__).resolve().parent.parent.parent.parent / "test_data" / "typing"
)


def get_test_data() -> list[dict[str, Any]]:
    """Load all transliteration test data from YAML files."""
    data = []

    def scan_yaml_files(directory: Path) -> list[Path]:
        yaml_files = []
        for entry in directory.rglob("*.yaml"):
            if entry.is_file():
                yaml_files.append(entry)
        return yaml_files

    all_yaml_files = scan_yaml_files(TEST_DATA_FOLDER)

    for yaml_file in all_yaml_files:
        with open(yaml_file, "r", encoding="utf-8") as f:
            test_data = yaml.safe_load(f)
            if isinstance(test_data, list):
                data.extend(test_data)

    return data


def get_typing_test_data() -> list[dict[str, Any]]:
    """Load all typing test data from YAML files."""
    data = []

    def scan_yaml_files(directory: Path) -> list[Path]:
        yaml_files = []
        for entry in directory.rglob("*.yaml"):
            # Skip context subdirectory
            if entry.is_file() and "context" not in entry.parts:
                yaml_files.append(entry)
        return yaml_files

    all_yaml_files = scan_yaml_files(TYPING_TEST_DATA_FOLDER)

    for yaml_file in all_yaml_files:
        with open(yaml_file, "r", encoding="utf-8") as f:
            test_data = yaml.safe_load(f)
            if isinstance(test_data, list):
                data.extend(test_data)

    return data


def emulate_typing(
    text: str, typing_lang: ScriptListType, options: dict[str, Any] | None = None
) -> str:
    """Emulate typing text character by character."""
    # Convert dict to TypingContextOptions if provided
    typing_options = None
    if options:
        typing_options = TypingContextOptions(
            auto_context_clear_time_ms=options.get("auto_context_clear_time_ms"),
            use_native_numerals=options.get("use_native_numerals"),
            include_inherent_vowel=options.get("include_inherent_vowel"),
        )

    ctx = create_typing_context(typing_lang, typing_options)
    result = ""

    for char in text:
        diff = ctx.take_key_input(char)
        # Delete characters if needed
        if diff.to_delete_chars_count > 0:
            result = result[: -diff.to_delete_chars_count]
        # Add new text
        result += diff.diff_add_text

    return result


def preload_data() -> None:
    """Preload all script data."""
    for script in SCRIPT_LIST:
        preload_script_data(script)


def benchmark():
    """Run all benchmarks."""
    TEST_DATA = get_test_data()
    TYPING_TEST_DATA = get_typing_test_data()

    # Transliteration Cases
    console.print("[bold cyan]Transliteration Cases:[/bold cyan]")
    preload_data()

    start = time.perf_counter()
    for test_data in TEST_DATA:
        transliterate(
            test_data["input"],
            test_data["from"],
            test_data["to"],
            test_data.get("options"),
        )
    end = time.perf_counter()
    elapsed_ms = (end - start) * 1000
    console.print(f"Time taken: [yellow]{elapsed_ms:.2f} ms[/yellow]")

    # Typing Emulation
    console.print("[bold cyan]Typing Emulation:[/bold cyan]")

    # 1. Emulate on Normal to others
    normal_to_others_test_data = [td for td in TEST_DATA if td["from"] == "Normal"]

    start = time.perf_counter()
    for test_data in normal_to_others_test_data:
        emulate_typing(test_data["input"], test_data["to"])

    # 2. Emulate on others to Normal
    for test_data in TYPING_TEST_DATA:
        emulate_typing(test_data["text"], test_data["script"], test_data.get("options"))
    end = time.perf_counter()
    elapsed_ms = (end - start) * 1000
    console.print(f"Time taken: [yellow]{elapsed_ms:.2f} ms[/yellow]")


if __name__ == "__main__":
    benchmark()
