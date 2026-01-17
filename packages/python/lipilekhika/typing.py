from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from ._lipilekhika import (  # ty:ignore[unresolved-import]
    create_typing_context as _create_typing_context,
    default_auto_context_clear_time_ms as _default_auto_context_clear_time_ms,
    default_use_native_numerals as _default_use_native_numerals,
    default_include_inherent_vowel as _default_include_inherent_vowel,
    TypingContextOptions as _TypingContextOptions,
    TypingDiff as _TypingDiff,
    TypingContext as _TypingContext,
    get_script_typing_data_map as _get_script_typing_data_map,
    ScriptTypingDataMap as _ScriptTypingDataMap,
)
from .types import ScriptLangType


# Default constants
DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS = int(_default_auto_context_clear_time_ms())
"""Default time in milliseconds after which the context will be cleared automatically."""

DEFAULT_USE_NATIVE_NUMERALS = bool(_default_use_native_numerals())
"""Default value for using native numerals while typing."""

DEFAULT_INCLUDE_INHERENT_VOWEL = bool(_default_include_inherent_vowel())
"""Default value for including inherent vowels while typing. By default avoids schwa deletion."""


# Type definitions
ListType = Literal["anya", "vyanjana", "matra", "svara"]
"""Type of a character in a script's list."""

TypingDataMapItem = tuple[str, ListType, list[str]]
"""An item in the typing data map: (text, list_type, mappings).
- `text`: The displayed character/text in the target script.
- `list_type`: One of "anya", "vyanjana", "matra", "svara".
- `mappings`: List of input key sequences that produce this character.
"""


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
        """Accepts character by character input and returns the diff.
        
        Args:
            key: The key to take input for
        
        Returns:
            The diff containing the number of characters to delete and the text to add
        """
        ...

    def update_use_native_numerals(self, use_native_numerals: bool) -> None: ...

    def update_include_inherent_vowel(self, include_inherent_vowel: bool) -> None: ...

    def get_use_native_numerals(self) -> bool:  # ty:ignore[invalid-return-type]
        pass

    def get_include_inherent_vowel(self) -> bool:  # ty:ignore[invalid-return-type]
        pass


class ScriptTypingDataMap:
    """Result containing typing data for a script."""

    @property
    def common_krama_map(self) -> list[TypingDataMapItem]:  # ty:ignore[invalid-return-type]
        """Mappings for common characters across scripts."""
        pass

    @property
    def script_specific_krama_map(
        self,
    ) -> list[TypingDataMapItem]:  # ty:ignore[invalid-return-type]
        """Mappings for script-specific characters."""
        pass

    def __repr__(self) -> str:  # ty:ignore[invalid-return-type]
        """Return a string representation of the ScriptTypingDataMap."""
        pass


if not TYPE_CHECKING:
    # Replace stub classes with actual native implementations at runtime
    TypingContextOptions = _TypingContextOptions
    TypingDiff = _TypingDiff
    TypingContext = _TypingContext
    ScriptTypingDataMap = _ScriptTypingDataMap


def create_typing_context(
    typing_lang: ScriptLangType, options: TypingContextOptions | None = None
) -> TypingContext:
    """Creates a stateful isolated context for character by character input typing.
    
    This is the main function which returns a context object with methods for
    handling typing input. Different realtime schemes can be implemented using this.
    
    **Note**: Script data is loaded in the background, but it's recommended to
    ensure the context is ready before first use (though not strictly required).
    
    Args:
        typing_lang: The script/language to type in
        options: Optional configuration for the typing context
    
    Returns:
        A typing context object with the following methods:
        - `clear_context()`: Clears all internal states and contexts
        - `take_key_input(key)`: Accepts character input and returns the diff
        - `update_use_native_numerals(use_native_numerals)`: Update native numerals setting
        - `update_include_inherent_vowel(include_inherent_vowel)`: Update inherent vowel setting
        - `get_use_native_numerals()`: Get current native numerals setting
        - `get_include_inherent_vowel()`: Get current inherent vowel setting
    
    Raises:
        Exception: If an invalid script name is provided
    """
    return _create_typing_context(typing_lang, options)


def get_script_typing_data_map(script: ScriptLangType) -> ScriptTypingDataMap:
    """Returns the typing data map for a script.
    
    This function can be used to compare the krama array of two scripts.
    It's especially useful for brahmic scripts, as they have a direct correlation.
    
    Args:
        script: The script to get the typing data map for
    
    Returns:
        A ScriptTypingDataMap object containing:
        - `common_krama_map`: Mappings for common characters across scripts
        - `script_specific_krama_map`: Mappings for script-specific characters
        
        Each mapping is a tuple of (text, type, mappings) where:
        - text: The displayed character in the target script
        - type: One of "anya", "vyanjana", "matra", "svara"
        - mappings: List of input key sequences that produce this character
    
    Raises:
        Exception: If an invalid script name is provided or if 'Normal' is used
    """
    return _get_script_typing_data_map(script)


__all__ = [
    "DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS",
    "DEFAULT_USE_NATIVE_NUMERALS",
    "DEFAULT_INCLUDE_INHERENT_VOWEL",
    "TypingContextOptions",
    "TypingDiff",
    "TypingContext",
    "create_typing_context",
    # typing map data
    "ScriptTypingDataMap",
    "ListType",
    "TypingDataMapItem",
    "get_script_typing_data_map",
]
