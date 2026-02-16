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
    ...get_list('Ā', ['A^', 'aa^']),
    ...get_list('Ī', ['I^', 'ii^', 'ee^']),
    ...get_list('Ū', ['U^', 'uu^', 'oo^']),
    ...get_list('Ē', 'E^'),
    ...get_list('Ê', 'aiI^'),
    ...get_list('Ō', 'O^'),
    ...get_list('Ô', 'auU^'),
    ...get_list('Ṛ', 'R^'),
    ...get_list('Ṝ', 'RR^'),
    ...get_list('L̥', 'LR^'),
    ...get_list('L̥̄', 'LRR^'),
    ...get_list('Ṁ', 'M^'),
    ...get_list('M̐', 'MM^'),
    ...get_list('Ḥ', 'H^'),
    ...get_list('Ṅ', 'G^'),
    ...get_list('Ñ', 'J^'),
    ...get_list('Ṉ', 'nz^'),
    ...get_list('Ṭ', 'T^'),
    ...get_list('Ṭh', 'Th^'),
    ...get_list('Ḍ', 'D^'),
    ...get_list('R̤', 'Dz^'),
    ...get_list('Ḍh', 'Dh^'),
    ...get_list('R̤h', 'Dhz^'),
    ...get_list('Ṇ', 'N^'),
    ...get_list('Ṟ', 'rz^'),
    ...get_list('Ḷ', 'L^'),
    ...get_list('Ḻ', 'Lz^'),
    ...get_list('Ś', 'sh^'),
    ...get_list('Ṣ', 'Sh^'),
    // Capital Letter forms (Pure)
    ...get_list('A', 'A#'),
    ...get_list('I', 'I#'),
    ...get_list('U', 'U#'),
    ...get_list('E', 'E#'),
    ...get_list('O', 'O#'),
    ...get_list('R', 'R#'),
    ...get_list('M', 'M#'),
    ...get_list('H', 'H#'),
    ...get_list('Ṭ', 'T#'),
    ...get_list('Ḍ', 'D#'),
    ...get_list('Ṇ', 'N#'),
    ...get_list('Ḷ', 'L#')
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

function get_list<T extends string | string[]>(specific_text: string, custom_normal_keys: T) {
  if (typeof custom_normal_keys === 'string') {
    return [
      {
        type: 'custom_script_char' as const,
        custom_normal_key: custom_normal_keys,
        specific_text: specific_text
      }
    ];
  }
  return custom_normal_keys.map((custom_normal_key) => ({
    type: 'custom_script_char' as const,
    custom_normal_key: custom_normal_key,
    specific_text: specific_text
  }));
}

export default Romanized;
