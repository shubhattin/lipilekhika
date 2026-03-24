import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import yaml
from rich.console import Console
from rich.table import Table

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

BULK_SEPARATOR = "\n"


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


def build_transliteration_batches(
    test_data: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Group by from-to; join inputs with newline; bulk calls ignore custom options."""
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in test_data:
        key = f"{item['from']}-{item['to']}"
        grouped[key].append(item)
    batches = []
    for _key, items in grouped.items():
        batches.append(
            {
                "from": items[0]["from"],
                "to": items[0]["to"],
                "input": BULK_SEPARATOR.join(str(i["input"]) for i in items),
            }
        )
    return batches


def build_typing_batches(
    transliteration_test_data: list[dict[str, Any]],
    typing_test_data: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Group by target script; join inputs with newline; bulk calls ignore custom options."""
    grouped: dict[str, list[str]] = defaultdict(list)
    for item in transliteration_test_data:
        if item.get("from") != "Normal":
            continue
        grouped[str(item["to"])].append(str(item["input"]))
    for item in typing_test_data:
        grouped[str(item["script"])].append(str(item["text"]))
    return [
        {"script": script, "input": BULK_SEPARATOR.join(parts)}
        for script, parts in grouped.items()
    ]


def emulate_typing(
    text: str, typing_lang: ScriptListType, options: dict[str, Any] | None = None
) -> str:
    """Emulate typing text character by character."""
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
        if diff.to_delete_chars_count > 0:
            result = result[: -diff.to_delete_chars_count]
        result += diff.diff_add_text

    return result


def preload_data() -> None:
    """Preload all script data."""
    for script in SCRIPT_LIST:
        preload_script_data(script)


def measure_individual_transliteration(test_data: list[dict[str, Any]]) -> float:
    start = time.perf_counter()
    for td in test_data:
        transliterate(
            td["input"],
            td["from"],
            td["to"],
            td.get("options"),
        )
    end = time.perf_counter()
    return (end - start) * 1000


def measure_bulk_transliteration(batches: list[dict[str, Any]]) -> float:
    start = time.perf_counter()
    for batch in batches:
        transliterate(batch["input"], batch["from"], batch["to"], None)
    end = time.perf_counter()
    return (end - start) * 1000


def measure_individual_typing(
    test_data: list[dict[str, Any]], typing_test_data: list[dict[str, Any]]
) -> float:
    normal_to_others = [td for td in test_data if td["from"] == "Normal"]
    start = time.perf_counter()
    for test_data in normal_to_others:
        emulate_typing(test_data["input"], test_data["to"])
    for test_data in typing_test_data:
        emulate_typing(test_data["text"], test_data["script"], test_data.get("options"))
    end = time.perf_counter()
    return (end - start) * 1000


def measure_bulk_typing(batches: list[dict[str, Any]]) -> float:
    start = time.perf_counter()
    for batch in batches:
        emulate_typing(batch["input"], batch["script"])
    end = time.perf_counter()
    return (end - start) * 1000


def format_ms(ms: float) -> str:
    return f"{ms:.2f} ms"


def benchmark() -> None:
    """Run all benchmarks (iterated vs bulk, matching JS script layout)."""
    test_data = get_test_data()
    typing_test_data = get_typing_test_data()
    transliteration_batches = build_transliteration_batches(test_data)
    typing_batches = build_typing_batches(test_data, typing_test_data)

    console.print("[bold cyan]Benchmark Results[/bold cyan]")
    console.print(
        f"[dim]Precomputed {len(transliteration_batches)} bulk batches from "
        f"{len(test_data)} transliteration cases by from-to, ignoring custom options.[/dim]"
    )
    console.print(
        f"[dim]Precomputed {len(typing_batches)} typing bulk batches, grouped by target script "
        "and ignoring custom options.[/dim]"
    )

    preload_data()

    transliteration_iterated = measure_individual_transliteration(test_data)
    transliteration_bulk = measure_bulk_transliteration(transliteration_batches)

    typing_iterated = measure_individual_typing(test_data, typing_test_data)
    typing_bulk = measure_bulk_typing(typing_batches)

    table = Table(show_header=True, header_style="bold")
    table.add_column("Benchmark")
    table.add_column("Iterated", justify="right")
    table.add_column("Bulk", justify="right")
    table.add_row(
        "Transliteration Cases",
        format_ms(transliteration_iterated),
        format_ms(transliteration_bulk),
    )
    table.add_row(
        "Typing Emulation",
        format_ms(typing_iterated),
        format_ms(typing_bulk),
    )
    console.print(table)


if __name__ == "__main__":
    benchmark()
