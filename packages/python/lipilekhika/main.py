from __future__ import annotations

from ._lipilekhika import (  # ty:ignore[import-not-found]
    get_all_options as _get_all_options,
    get_normalized_script_name as _get_normalized_script_name,
    get_schwa_status_for_script as _get_schwa_status_for_script,
    get_script_list_data,
    preload_script_data as _preload_script_data,
    transliterate as _transliterate,
)
from .types import (
    LangListType,
    ScriptAndLangListType,
    ScriptLangType,
    ScriptListType,
    TransliterationOptionsType,
)

# ^ generated on build time
# with `bun run make-script-data` (repo root, see lipi_script_data)


def transliterate(
    text: str,
    from_script: ScriptLangType,
    to_script: ScriptLangType,
    options: dict[TransliterationOptionsType, bool] | None = None,
) -> str:
    """Transliterates text from one script/language to another.

    A lone surrogate in `text` (which can not be encoded as UTF-8) is read as U+FFFD,
    like the JS package does.

    Args:
        text: The text to transliterate
        from_script: The script/language to transliterate from
        to_script: The script/language to transliterate to
        options: Optional custom transliteration options for the transliteration

    Returns:
        The transliterated text

    Raises:
        ValueError: If a script name or an option name is invalid
        TypeError: If an argument or an option value has the wrong type
    """
    return _transliterate(text, from_script, to_script, options or {})


def preload_script_data(script_name: ScriptLangType) -> None:
    """Preloads the script data for the given script/language.

    This is useful for avoiding fetch latency in applications where
    you want to ensure the script data is loaded before use.

    Args:
        script_name: The name of the script/language to preload

    Raises:
        ValueError: If an invalid script name is provided
    """
    _preload_script_data(script_name)


def get_schwa_status_for_script(script_name: ScriptLangType) -> bool | None:
    """Returns the schwa deletion characteristic of the script provided.

    This is the property in which an inherent vowel 'a' (अ) is added to
    the end of vyanjana (consonant) characters.

    Args:
        script_name: The script/language name to check

    Returns:
        True if the script has schwa deletion, False if it doesn't,
        None if the script is not a brahmic script

    Raises:
        ValueError: If an invalid script name is provided
    """
    return _get_schwa_status_for_script(script_name)


def get_all_options(
    from_script: ScriptLangType, to_script: ScriptLangType
) -> list[TransliterationOptionsType]:
    """Returns the list of all supported custom options for transliterations.

    This function returns all available custom options for the provided
    script pair that can be used in the transliterate function.

    Args:
        from_script: The script/language to transliterate from
        to_script: The script/language to transliterate to

    Returns:
        The list of all supported custom options for the provided script pair

    Raises:
        ValueError: If an invalid script name is provided
    """
    return _get_all_options(from_script, to_script)


def get_normalized_script_name(script_name: ScriptLangType) -> ScriptListType:
    """Get the normalized script name for the given script/language.

    This function maps language names to their corresponding script names
    and validates that the provided name is a valid script/language.

    Args:
        script_name: The script/language name to normalize

    Returns:
        The normalized script name

    Raises:
        ValueError: If an invalid script name is provided
    """
    return _get_normalized_script_name(script_name)


SCRIPT_LIST_DATA = get_script_list_data()
"""Raw script list data containing all script and language mappings."""

SCRIPT_LIST = list[ScriptListType](SCRIPT_LIST_DATA.scripts)
"""The list of all supported script names."""

LANG_LIST = list[LangListType](SCRIPT_LIST_DATA.langs)
"""The list of all supported language names which are mapped to a script."""

ALL_SCRIPT_LANG_LIST = list[ScriptAndLangListType](
    dict.fromkeys(LANG_LIST + SCRIPT_LIST)
)
"""Combined list of all supported scripts and languages (languages first, the same order as
`ALL_LANG_SCRIPT_LIST` of the JS package)."""

__all__ = [
    "ALL_SCRIPT_LANG_LIST",
    "LANG_LIST",
    "SCRIPT_LIST",
    "get_all_options",
    "get_normalized_script_name",
    "get_schwa_status_for_script",
    "preload_script_data",
    "transliterate",
]
