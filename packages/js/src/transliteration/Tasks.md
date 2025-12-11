# Tasks

- Make sure Tamil Extended and Vedic Accents marks work together.

## Todo for Ranges

- Add ranges for additional characters that need to be included manually.
- Make changes to `make_output_script_data.ts` to scan the target script data and any extra required range manually.

## Support for Custom Transliteration Options (Future)

- `brahmic` -> `Normal`: add a option to normalise panchamAkShara when in combination with thier corresponding vargas. Eg :- काङ्क्षते -> kAnkShate instead of kAGkShate (Gk -> nk)
- 'brahmic' -> `other`:
  - Option to replace avagraha(`''`) with `a`
  - Option to remove virAma (.) and pUrNa virAma (..)
- `panchAmAkShara` -> `anunAsika` replacement when converting from _Devanagari/Purna-Devanagari_ to other `brahmic` scripts (like Telugu, Kannada).
  Eg. काङ्क्षते -> kAMkShate instead of kAGkShate (Gk -> Mk)
- Some `Sinhala` specific options. Look at the old lipi lekhika used in `thesanskritchannel_projects` repo for more details.
