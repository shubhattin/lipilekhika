# Tasks

- Make sure Tamil Extended and Vedic Accents marks work together.
- Add Conversion of all Scripts to Normal Scripts Test (Important)
- Add Conversion of Normal Scripts to all other Scripts Test (for Typing Tool)
- *Test Data Order and Grouping* : Consider changing the nested-iteration order in `gen-test-data.ts` to group the test data by script instead of by input. Evaluate the tradeoffs, as this approach will no longer keep the same text input together in the test data as it does now.
- *For Non-Reversible Scripts*
  - If dev-gur is not reversible then make sure that gur (taken as input) produces consistent results with the old lipi lekhika transliteration.
  - Example: कृ -> ਕ੍ਰਿ => ਕ੍ਰਿ -> क्रि
  - One more thing that can be done is identify patterns in which case it is irreversible and use the strategy above only in those cases; otherwise it will be reversible.
  - This can be identified for different scripts.

## Todo for Ranges

- Add ranges for additional characters that need to be included manually.
- Make changes to `make_output_script_data.ts` to scan the target script data and any extra required range manually.

## Support for Custom Transliteration Options (Future)

- `brahmic` -> `Normal`: add a option to normalise panchamAkShara when in combination with thier corresponding vargas. Eg :- काङ्क्षते -> kAnkShate instead of kAGkShate (Gk -> nk)
- 'brahmic' -> `other`:
  - Option to replace avagraha(`''`) with `a`
  - Option to remove virAma (.) and pUrNa virAma (..)
- `panchAmAkShara` -> `anunAsika` replacement when converting from *Devanagari/Purna-Devanagari* to other `brahmic` scripts (like Telugu, Kannada).
Eg. काङ्क्षते -> kAMkShate instead of kAGkShate (Gk -> Mk)
- Some `Sinhala` specific options. Look at the old lipi lekhika used in `thesanskritchannel_projects` repo for more details.
