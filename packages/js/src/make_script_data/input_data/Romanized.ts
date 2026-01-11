import { script_list_obj } from '../../utils/lang_list';
import type { InputOtherScriptType } from '../input_script_data_schema';
import {
  COMMON_SCRIPT_TYPING_DATA,
  COMMON_SVARA_MATRA_TYPING_DATA,
  COMMON_VEDIC_SANSKRIT_SYMBOLS
} from './_common_typing';

const Romanized: InputOtherScriptType = {
  script_name: 'Romanized',
  script_id: script_list_obj['Romanized'],
  script_type: 'other',
  schwa_character: 'a',
  manual_krama_text_map: {
    ॐ: 'āūṁ',
    अ: 'a',
    '': 'a',
    ॳ: 'a',
    'ऺ': 'a',
    आ: 'ā',
    'ा': 'ā',
    ॴ: 'ā',
    'ऻ': 'ā',
    इ: 'i',
    'ि': 'i',
    ई: 'ī',
    'ी': 'ī',
    उ: 'u',
    'ु': 'u',
    ॶ: 'u',
    'ॖ': 'u',
    ऊ: 'ū',
    'ू': 'ū',
    ॷ: 'ū',
    'ॗ': 'ū',
    ए: 'ē',
    'े': 'ē',
    ऎ: 'e',
    'ॆ': 'e',
    ऐ: 'ai',
    'ै': 'ai',
    ऍ: 'ê',
    'ॅ': 'ê',
    ओ: 'ō',
    'ो': 'ō',
    ऒ: 'o',
    'ॊ': 'o',
    औ: 'au',
    'ौ': 'au',
    ऑ: 'ô',
    'ॉ': 'ô',
    ऋ: 'ṛ',
    'ृ': 'ṛ',
    ॠ: 'ṝ',
    'ॄ': 'ṝ',
    ऌ: 'l̥',
    'ॢ': 'l̥',
    ॡ: 'l̥̄',
    'ॣ': 'l̥̄',
    'ं': 'ṁ',
    'ँ': 'm̐',
    'ः': 'ḥ',
    ऽ: "''",
    '्': '',
    '़': '',
    // The dot here before is conflicting with the virAma dots
    // so for now removed
    '॰': '',
    क: 'k',
    क़: 'kz',
    ख: 'kh',
    ख़: 'khz',
    ग: 'g',
    ग़: 'gz',
    ॻ: 'g',
    घ: 'gh',
    ङ: 'ṅ',
    च: 'ch',
    छ: 'Ch',
    ज: 'j',
    ज़: 'jz',
    ॼ: 'j',
    झ: 'jh',
    ञ: 'ñ',
    त: 't',
    थ: 'th',
    द: 'd',
    ध: 'dh',
    न: 'n',
    ऩ: 'ṉ',
    ट: 'ṭ',
    ठ: 'ṭh',
    ड: 'ḍ',
    ड़: 'r̤',
    ॾ: 'ḍ',
    ढ: 'ḍh',
    ढ़: 'r̤h',
    ण: 'ṇ',
    प: 'p',
    फ: 'ph',
    फ़: 'phz',
    ब: 'b',
    ॿ: 'b',
    भ: 'bh',
    म: 'm',
    य: 'y',
    य़: 'y',
    व: 'v',
    र: 'r',
    ऱ: 'ṟ',
    ल: 'l',
    ळ: 'ḷ',
    ऴ: 'ḻ',
    ह: 'h',
    स: 's',
    श: 'ś',
    ष: 'ṣ',
    // 4 vedic accent symbols
    anudAttA: '↓',
    'udAtta-1': '↑',
    'udAtta-2': '↑↑',
    'udAtta-3': '↑↑↑',
    '०': '0',
    '१': '1',
    '२': '2',
    '३': '3',
    '४': '4',
    '५': '5',
    '६': '6',
    '७': '7',
    '८': '8',
    '९': '9',
    '।': '.',
    '॥': '..',
    avagraha: '`'
  },
  typing_list: [
    ...COMMON_SCRIPT_TYPING_DATA,
    ...COMMON_SVARA_MATRA_TYPING_DATA,
    ...COMMON_VEDIC_SANSKRIT_SYMBOLS,
    {
      type: 'custom_script_char',
      custom_normal_key: 'A^',
      specific_text: 'Ā'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'I^',
      specific_text: 'Ī'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'U^',
      specific_text: 'Ū'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'E^',
      specific_text: 'Ē'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'aiI^',
      specific_text: 'Ê'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'O^',
      specific_text: 'Ō'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'auU^',
      specific_text: 'Ô'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'R^',
      specific_text: 'Ṛ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'RR^',
      specific_text: 'Ṝ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'LR^',
      specific_text: 'L̥'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'LRR^',
      specific_text: 'L̥̄'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'M^',
      specific_text: 'Ṁ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'MM^',
      specific_text: 'M̐'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'H^',
      specific_text: 'Ḥ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'G^',
      specific_text: 'Ṅ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'J^',
      specific_text: 'Ñ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'nz^',
      specific_text: 'Ṉ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'T^',
      specific_text: 'Ṭ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'Th^',
      specific_text: 'Ṭh'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'D^',
      specific_text: 'Ḍ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'Dz^',
      specific_text: 'R̤'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'Dh^',
      specific_text: 'Ḍh'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'Dhz^',
      specific_text: 'R̤h'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'N^',
      specific_text: 'Ṇ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'rz^',
      specific_text: 'Ṟ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'L^',
      specific_text: 'Ḷ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'Lz^',
      specific_text: 'Ḻ'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'sh^',
      specific_text: 'Ś'
    },
    {
      type: 'custom_script_char',
      custom_normal_key: 'Sh^',
      specific_text: 'Ṣ'
    }
  ],
  list: [
    {
      text: 'C',
      text_krama: ['C'],
      duplicates: ['C']
    },
    {
      text: 'Ch',
      text_krama: ['Ch'],
      duplicates: ['chh']
    },
    {
      text: 'Sh',
      text_krama: ['Sh'],
      duplicates: ['shh']
    },

    // define duplicates for all Capital Letter Versions of the Letters
    {
      text: 'ā',
      text_krama: ['A-svara', 'A-mAtrA', 'A1-svara', 'A1-mAtrA'],
      duplicates: ['Ā']
    },
    {
      text: 'ī',
      text_krama: ['I-svara', 'I-mAtrA'],
      duplicates: ['Ī']
    },
    {
      text: 'ū',
      text_krama: ['U-svara', 'U-mAtrA', 'U1-svara', 'U1-mAtrA'],
      duplicates: ['Ū']
    },
    {
      text: 'ē',
      text_krama: ['E-svara', 'E-mAtrA'],
      duplicates: ['Ē']
    },
    {
      text: 'ê',
      text_krama: ['aiI-svara', 'aiI-mAtrA'],
      duplicates: ['Ê']
    },
    {
      text: 'ō',
      text_krama: ['O-svara', 'O-mAtrA'],
      duplicates: ['Ō']
    },
    {
      text: 'ô',
      text_krama: ['auU-svara', 'auU-mAtrA'],
      duplicates: ['Ô']
    },
    {
      text: 'ṛ',
      text_krama: ['R-svara', 'R-mAtrA'],
      duplicates: ['Ṛ', 'r̥', 'R̥']
    },
    {
      text: 'ṝ',
      text_krama: ['RR-svara', 'RR-mAtrA'],
      duplicates: ['Ṝ', 'r̥̄', 'R̥̄']
    },
    {
      text: 'l̥',
      text_krama: ['LR-svara', 'LR-mAtrA'],
      duplicates: ['L̥']
    },
    {
      text: 'l̥̄',
      text_krama: ['LRR-svara', 'LRR-mAtrA'],
      duplicates: ['L̥̄']
    },
    {
      text: 'ṁ',
      text_krama: ['anusvAra'],
      duplicates: ['Ṁ']
    },
    {
      text: 'm̐',
      text_krama: ['anunAnAsika'],
      duplicates: ['M̐']
    },
    {
      text: 'ḥ',
      text_krama: ['visarga'],
      duplicates: ['Ḥ']
    },
    {
      text: 'ṅ',
      text_krama: ['G'],
      duplicates: ['Ṅ']
    },
    {
      text: 'ñ',
      text_krama: ['J'],
      duplicates: ['Ñ']
    },
    {
      text: 'ṉ',
      text_krama: ['nz'],
      duplicates: ['Ṉ']
    },
    {
      text: 'ṭ',
      text_krama: ['T'],
      duplicates: ['Ṭ']
    },
    {
      text: 'ṭh',
      text_krama: ['Th'],
      duplicates: ['Ṭh']
    },
    {
      text: 'ḍ',
      text_krama: ['D', 'D1'],
      duplicates: ['Ḍ']
    },
    {
      text: 'r̤',
      text_krama: ['Dz'],
      duplicates: ['R̤']
    },
    {
      text: 'ḍh',
      text_krama: ['Dh'],
      duplicates: ['Ḍh']
    },
    {
      text: 'r̤h',
      text_krama: ['Dhz'],
      duplicates: ['R̤h']
    },
    {
      text: 'ṇ',
      text_krama: ['N'],
      duplicates: ['Ṇ']
    },
    {
      text: 'ṟ',
      text_krama: ['rz'],
      duplicates: ['Ṟ']
    },
    {
      text: 'ḷ',
      text_krama: ['L'],
      duplicates: ['Ḷ']
    },
    {
      text: 'ḻ',
      text_krama: ['Lz'],
      duplicates: ['Ḻ']
    },
    {
      text: 'ś',
      text_krama: ['sh'],
      duplicates: ['Ś']
    },
    {
      text: 'ṣ',
      text_krama: ['Sh'],
      duplicates: ['Ṣ']
    }
  ]
};

export default Romanized;
