import { script_list_obj } from '../../utils/lang_list';
import type { InputOtherScriptType } from '../input_script_data_schema';
import { COMMON_SCRIPT_TYPING_DATA, COMMON_SVARA_MATRA_TYPING_DATA } from './_common_typing';

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
    ऋ: 'r̥',
    'ृ': 'r̥',
    ॠ: 'r̥̄',
    'ॄ': 'r̥̄',
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
    च: 'C',
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
    ड़: 'ṛ',
    ॾ: 'ḍ',
    ढ: 'ḍh',
    ढ़: 'ṛh',
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
    '॥': '..'
  },
  typing_list: [...COMMON_SCRIPT_TYPING_DATA, ...COMMON_SVARA_MATRA_TYPING_DATA],
  list: [
    {
      text: 'C',
      text_krama: ['C'],
      duplicates: ['ch']
    },
    {
      text: 'Ch',
      text_krama: ['Ch'],
      duplicates: ['chh']
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
      text: 'r̥',
      text_krama: ['R-svara', 'R-mAtrA'],
      duplicates: ['R̥']
    },
    {
      text: 'r̥̄',
      text_krama: ['RR-svara', 'RR-mAtrA'],
      duplicates: ['R̥̄']
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
      text_krama: ['N'],
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
      text: 'ṛ',
      text_krama: ['Dz'],
      duplicates: ['Ṛ']
    },
    {
      text: 'ḍh',
      text_krama: ['Dh'],
      duplicates: ['Ḍh']
    },
    {
      text: 'ṛh',
      text_krama: ['Dhz'],
      duplicates: ['Ṛh']
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
