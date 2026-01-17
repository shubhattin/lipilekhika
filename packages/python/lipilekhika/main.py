from __future__ import annotations

from ._lipilekhika import (  # ty:ignore[unresolved-import]
    transliterate as _transliterate,
    preload_script_data as _preload_script_data,
    get_schwa_status_for_script as _get_schwa_status_for_script,
    get_all_options as _get_all_options,
    get_normalized_script_name as _get_normalized_script_name,
    get_script_list_data,
)
from .types import (
    ScriptLangType,
    TransliterationOptionsType,
    ScriptListType,
    LangListType,
    ScriptAndLangListType,
)
# ^ generated on build time
# with `bun make-script-data` in packages/js


def transliterate(
    text: str,
    from_script: ScriptLangType,
    to_script: ScriptLangType,
    options: dict[TransliterationOptionsType, bool] | None = None,
) -> str:
    return _transliterate(text, from_script, to_script, options or {})


def preload_script_data(script_name: ScriptLangType) -> None:
    _preload_script_data(script_name)


def get_schwa_status_for_script(script_name: ScriptLangType) -> bool | None:
    return _get_schwa_status_for_script(script_name)


def get_all_options(
    from_script: ScriptLangType, to_script: ScriptLangType
) -> list[TransliterationOptionsType]:
    return _get_all_options(from_script, to_script)


def get_normalized_script_name(script_name: ScriptLangType) -> ScriptListType:
    return _get_normalized_script_name(script_name)


SCRIPT_LIST_DATA = get_script_list_data()
SCRIPT_LIST = list[ScriptListType](SCRIPT_LIST_DATA.scripts.keys())
LANG_LIST = list[LangListType](SCRIPT_LIST_DATA.langs.keys())
ALL_SCRIPT_LANG_LIST = list[ScriptAndLangListType](set(SCRIPT_LIST + LANG_LIST))

__all__ = [
    "transliterate",
    "preload_script_data",
    "get_schwa_status_for_script",
    "get_all_options",
    "get_normalized_script_name",
    "SCRIPT_LIST",
    "LANG_LIST",
    "ALL_SCRIPT_LANG_LIST",
]
