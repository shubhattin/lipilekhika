# Tasks

- Make sure of how Tamil Extended and Vedic Accents marks work together
- Add Support for Reversed Script Transliteration for Granth, Modi, Sharada, Siddham
- Add Conversion of all Scripts to Normal Scripts Test (Important)

## Todo for Ancient Scripts

- Add Support for Reversed Script Transliteration for Granth, Modi, Sharada, Siddham
- Eliminate the initial \ud804 and \ud805 from the generated data. Use the respective language methods to resolve the multi lenth non bmp characters.
- ^ For this in the make script you will have to access the utf-16 code points with the new codepoint method in js.
- **Consider Surrogate ranges**
- *High surrogates*: 0xD800 - 0xDBFF (1,024 values)
- *Low surrogates*: 0xDC00 - 0xDFFF (1,024 values)
- A Low Surrogate must follow a high surrogate.

## Todo for Ranges

- Add Ranges for Additional charcters used shall be added manually
- Make changes to `make_output_script_data.ts` to scan the target script data and any extra required range manually
