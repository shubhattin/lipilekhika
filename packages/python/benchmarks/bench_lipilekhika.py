"""Benchmarks (pytest-benchmark) over the `test_data` cases.

Same workloads as the rust criterion bench (`packages/rust/src/benches/benchmark.rs`);
one round = one full pass over the cases. Not collected by the regular `uv run pytest`.

    uv run pytest benchmarks/bench_lipilekhika.py
    uv run pytest benchmarks/bench_lipilekhika.py --benchmark-autosave      # save a run
    uv run pytest benchmarks/bench_lipilekhika.py --benchmark-compare       # compare with the last saved run

Measures the installed build: run `uvx maturin develop --release` after rust changes.
"""

from pathlib import Path
from typing import Any

import pytest
import yaml

from lipilekhika import SCRIPT_LIST, preload_script_data, transliterate
from lipilekhika.typing import TypingContextOptions, create_typing_context

TEST_DATA = Path(__file__).resolve().parents[3] / "test_data"


def _load_cases(directory: Path, skip_context: bool = False) -> list[dict[str, Any]]:
    if not directory.is_dir():
        pytest.skip(
            f"{directory} not found (run `bun run gen:test-data` from the repo root)",
            allow_module_level=True,
        )
    cases: list[dict[str, Any]] = []
    for path in sorted(directory.rglob("*.yaml")):
        if skip_context and "context" in path.relative_to(directory).parts:
            continue
        items = yaml.safe_load(path.read_text(encoding="utf-8"))
        if isinstance(items, list):
            cases.extend(c for c in items if not c.get("todo"))
    return cases


TRANSLITERATION_CASES = _load_cases(TEST_DATA / "transliteration")
NORMAL_TO_OTHERS = [c for c in TRANSLITERATION_CASES if c["from"] == "Normal"]
TYPING_CASES = _load_cases(TEST_DATA / "typing", skip_context=True)

for _script in SCRIPT_LIST:
    preload_script_data(_script)


def _typing_options(options: dict[str, Any] | None) -> TypingContextOptions | None:
    # YAML keys are camelCase (same files as the JS / rust / go tests)
    if not options:
        return None
    return TypingContextOptions(
        use_native_numerals=options.get("useNativeNumerals"),
        include_inherent_vowel=options.get("includeInherentVowel"),
    )


def _emulate_typing(
    text: str, script: str, options: TypingContextOptions | None = None
) -> str:
    """Types `text` key by key, keeping the output like an input field would."""
    ctx = create_typing_context(script, options)  # ty: ignore[invalid-argument-type]
    result = ""
    for key in text:
        diff = ctx.take_key_input(key)
        if diff.to_delete_chars_count > 0:
            result = result[: -diff.to_delete_chars_count]
        result += diff.diff_add_text
    return result


def _transliteration_pass() -> None:
    for c in TRANSLITERATION_CASES:
        transliterate(str(c["input"]), c["from"], c["to"], c.get("options"))


def _typing_normal_to_others_pass() -> None:
    for c in NORMAL_TO_OTHERS:
        _emulate_typing(str(c["input"]), c["to"])


_TYPING_CASES_PREPARED = [
    (str(c["text"]), c["script"], _typing_options(c.get("options")))
    for c in TYPING_CASES
]


def _typing_cases_pass() -> None:
    for text, script, options in _TYPING_CASES_PREPARED:
        _emulate_typing(text, script, options)


def test_transliteration_all_cases(benchmark: Any) -> None:
    benchmark(_transliteration_pass)


def test_typing_emulation_normal_to_others(benchmark: Any) -> None:
    benchmark(_typing_normal_to_others_pass)


def test_typing_emulation_typing_cases(benchmark: Any) -> None:
    benchmark(_typing_cases_pass)
