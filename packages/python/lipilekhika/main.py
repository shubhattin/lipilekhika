
# from ._lipilekhika import ( 
#     transliterate,
#     create_typing_context,
#     TypingContext,
#     TypingContextOptions,
#     TypingDiff,
# )

from ._rust import transliterate as _transliterate  # ty:ignore[unresolved-import]


def transliterate(text:str, from_script:str, to_script:str, options:dict[str, bool]={}) -> str:
    return _transliterate(text, from_script, to_script, options)

__all__ = [
    "transliterate"
]


