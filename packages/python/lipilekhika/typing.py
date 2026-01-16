from __future__ import annotations

from typing import TYPE_CHECKING

from ._lipilekhika import (  # ty:ignore[unresolved-import]
    create_typing_context as _create_typing_context,
    default_auto_context_clear_time_ms as _default_auto_context_clear_time_ms,
    default_use_native_numerals as _default_use_native_numerals,
    default_include_inherent_vowel as _default_include_inherent_vowel,
    TypingContextOptions as _TypingContextOptions,
    TypingDiff as _TypingDiff,
    TypingContext as _TypingContext,
)


# Default constants
DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS = _default_auto_context_clear_time_ms()
"""Default time in milliseconds after which the context will be cleared automatically."""

DEFAULT_USE_NATIVE_NUMERALS = _default_use_native_numerals()
"""Default value for using native numerals while typing."""

DEFAULT_INCLUDE_INHERENT_VOWEL = _default_include_inherent_vowel()
"""Default value for including inherent vowels while typing. By default avoids schwa deletion."""


# Stub Classes for Editor Support and Tooling


class TypingContextOptions:
    auto_context_clear_time_ms: int
    """The time in milliseconds after which the context will be cleared automatically."""

    use_native_numerals: bool
    """Whether to use native numerals in transliteration/typing."""

    include_inherent_vowel: bool
    """Whether to include inherent vowels (schwa character) in transliteration/typing."""

    def __init__(
        self,
        auto_context_clear_time_ms: int | None = None,
        use_native_numerals: bool | None = None,
        include_inherent_vowel: bool | None = None,
    ) -> None:
        pass


class TypingDiff:
    @property
    def to_delete_chars_count(self) -> int:  # ty:ignore[invalid-return-type]
        """Number of characters that should be deleted from the current input state."""
        pass

    @property
    def diff_add_text(self) -> str:  # ty:ignore[invalid-return-type]
        """Text that should be inserted into the current input state."""
        pass

    def __repr__(self) -> str:  # ty:ignore[invalid-return-type]
        """Return a string representation of the TypingDiff."""
        pass


class TypingContext:
    def clear_context(self) -> None:
        """
        Clear all internal state and contexts.

        This resets the typing context to its initial state, useful when
        starting fresh input or clearing the current composition.
        """
        ...

    def take_key_input(self, key: str) -> TypingDiff:  # ty:ignore[invalid-return-type]
        ...

    def update_use_native_numerals(self, use_native_numerals: bool) -> None: ...

    def update_include_inherent_vowel(self, include_inherent_vowel: bool) -> None: ...

    def get_use_native_numerals(self) -> bool:  # ty:ignore[invalid-return-type]
        pass

    def get_include_inherent_vowel(self) -> bool:  # ty:ignore[invalid-return-type]
        pass


if not TYPE_CHECKING:
    # Replace stub classes with actual native implementations at runtime
    TypingContextOptions = _TypingContextOptions
    TypingDiff = _TypingDiff
    TypingContext = _TypingContext


class ListType:
    """Type of a character in a script's list."""

    Anya = "Anya"
    Vyanjana = "Vyanjana"
    Matra = "Matra"
    Svara = "Svara"


TypingDataMapItem = tuple[str, str, list[str]]
"""An item in the typing data map containing the text, its type, and associated input mappings."""


class ScriptTypingDataMap:
    """Result containing typing data for a script."""

    def __init__(
        self,
        common_krama_map: list[TypingDataMapItem],
        script_specific_krama_map: list[TypingDataMapItem],
    ):
        self.common_krama_map = common_krama_map
        self.script_specific_krama_map = script_specific_krama_map


def create_typing_context(
    typing_lang: str, options: TypingContextOptions | None = None
) -> TypingContext:
    return _create_typing_context(typing_lang, options)


def get_script_typing_data_map(script: str) -> ScriptTypingDataMap:
    """
    Get the typing data map for a specific script.

    Args:
        script: The script name to get typing data for.

    Returns:
        ScriptTypingDataMap: The typing data map for the script.

    Raises:
        NotImplementedError: This function is not yet implemented in the native binding.
    """
    # This would need to be implemented in the native binding
    # For now, return a placeholder that matches the expected structure
    raise NotImplementedError(
        "get_script_typing_data_map needs to be implemented in the native binding"
    )


__all__ = [
    "DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS",
    "DEFAULT_USE_NATIVE_NUMERALS",
    "DEFAULT_INCLUDE_INHERENT_VOWEL",
    "TypingContextOptions",
    "TypingDiff",
    "TypingContext",
    # "ListType",
    # "TypingDataMapItem",
    # "ScriptTypingDataMap",
    "create_typing_context",
    # "get_script_typing_data_map",
]
