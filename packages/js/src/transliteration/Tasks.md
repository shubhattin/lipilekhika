# Tasks

- Make sure of how Tamil Extended and Vedic Accents marks work together
- Add Support for Reversed Script Transliteration for Granth, Modi, Sharada, Siddham
- Add Conversion of all Scripts to Normal Scripts Test (Important)

## Todo for Ancient Scripts

- **Consider Surrogate ranges**
- *High surrogates*: 0xD800 - 0xDBFF (1,024 values)
- *Low surrogates*: 0xDC00 - 0xDFFF (1,024 values)
- A Low Surrogate must follow a high surrogate.
- Also carefully handle the next as they can also contain surrogate pair values

## Todo for Ranges

- Add Ranges for Additional characters used shall be added manually
- Make changes to `make_output_script_data.ts` to scan the target script data and any extra required range manually
