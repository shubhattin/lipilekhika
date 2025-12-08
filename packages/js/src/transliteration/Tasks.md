# Tasks

- Make sure Tamil Extended and Vedic Accents marks work together.
- Add Conversion of all Scripts to Normal Scripts Test (Important)
- Add Conversion of Normal Scripts to all other Scripts Test (for Typing Tool)
- *Test Data Order and Grouping* : Consider changing order of nested iteration in `gen-test-data.ts` to group the test data by script instead of input. Evaluate the tradeoffs as in this approach the same text input wont be together in test data like its now.
- *For Non-Reversible Scripts*
  - If dev-gur is not reversible then make sure that gur (taken as input) produces consistent results with the old lipi lekhika transliteration.
  - Eg . कृ -> ਕ੍ਰਿ => ਕ੍ਰਿ -> क्रि
  - One more thing that can be done is identify patterns in which case the it is irreversible and use the stratergy above only in those cases and otherwise it will be reversible.
  - This can be identified for Different Scripts.

## Todo for Ranges

- Add Ranges for Additional characters used shall be added manually
- Make changes to `make_output_script_data.ts` to scan the target script data and any extra required range manually
