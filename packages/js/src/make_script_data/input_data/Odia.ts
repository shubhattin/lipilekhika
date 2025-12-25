import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';
import {
  COMMON_NUMBER_TYPING_DATA,
  COMMON_SCRIPT_TYPING_DATA,
  COMMON_SVARA_MATRA_TYPING_DATA
} from './_common_typing';

const Odia: InputBrahmicScriptType = {
  script_type: 'brahmic',
  script_name: 'Odia',
  script_id: script_list_obj['Odia'],
  halant: '୍',
  nuqta: '଼',
  schwa_property: true,
  typing_list: [
    ...COMMON_SCRIPT_TYPING_DATA,
    ...COMMON_NUMBER_TYPING_DATA,
    ...COMMON_SVARA_MATRA_TYPING_DATA
  ],
  manual_krama_text_map: {
    '0': '୦',
    '1': '୧',
    '2': '୨',
    '3': '୩',
    '4': '୪',
    '5': '୫',
    '6': '୬',
    '7': '୭',
    '8': '୮',
    '9': '୯',
    AUM: 'ଓଁ',
    anusvAra: 'ଂ',
    anunAnAsika: 'ଁ',
    visarga: 'ଃ',
    saMkShepachihna: '॰',
    avagraha: 'ଽ',
    halant: '୍',
    nuqta: '଼',
    anudAttA: '॒',
    'udAtta-1': '॑',
    'udAtta-2': '᳚',
    'udAtta-3': '᳛',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    {
      text: 'ଓଁ',
      text_krama: ['AUM'],
      duplicates: ['ॐ'],
      type: 'anya'
    },

    {
      text: 'ଅ',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ଆ',
      mAtrA: 'ା',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ଇ',
      mAtrA: 'ି',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ଈ',
      mAtrA: 'ୀ',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ଉ',
      mAtrA: 'ୁ',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ଊ',
      mAtrA: 'ୂ',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ଋ',
      mAtrA: 'ୃ',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ୠ',
      mAtrA: 'ୄ',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ଌ',
      mAtrA: 'ୢ',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ୡ',
      mAtrA: 'ୣ',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ଏ',
      mAtrA: 'େ',
      text_krama: ['E-svara', 'e-svara'],
      mAtrA_text_krama: ['E-mAtrA', 'e-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ଐ',
      mAtrA: 'ୈ',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ଓ',
      mAtrA: 'ୋ',
      text_krama: ['O-svara', 'o-svara'],
      mAtrA_text_krama: ['O-mAtrA', 'o-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ଔ',
      mAtrA: 'ୌ',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: 'କ',
      text_krama: ['k'],
      type: 'vyanjana'
    },
    {
      text: 'କ଼',
      text_krama: ['kz'],
      type: 'vyanjana'
    },
    // {
    //   text: 'କ୍ଷ',
    //   text_krama: [],
    //   type: 'vyanjana'
    // },
    {
      text: 'ଖ',
      text_krama: ['kh'],
      type: 'vyanjana'
    },
    {
      text: 'ଖ଼',
      text_krama: ['khz'],
      type: 'vyanjana'
    },
    {
      text: 'ଗ',
      text_krama: ['g', 'g1'],
      type: 'vyanjana'
    },
    {
      text: 'ଗ଼',
      text_krama: ['gz'],
      type: 'vyanjana'
    },
    {
      text: 'ଘ',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: 'ଙ',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: 'ଚ',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: 'ଛ',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: 'ଜ',
      text_krama: ['j', 'j1'],
      type: 'vyanjana'
    },
    {
      text: 'ଜ଼',
      text_krama: ['jz'],
      type: 'vyanjana'
    },
    {
      text: 'ଝ',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: 'ଞ',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: 'ଟ',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: 'ଠ',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: 'ଡ',
      text_krama: ['D', 'D1'],
      type: 'vyanjana'
    },
    {
      text: 'ଡ଼',
      text_krama: ['Dz'],
      duplicates: ['ଡ଼'],
      type: 'vyanjana'
    },
    {
      text: 'ଢ',
      text_krama: ['Dh'],
      type: 'vyanjana'
    },
    {
      text: 'ଢ଼',
      text_krama: ['Dhz'],
      duplicates: ['ଢ଼'],
      type: 'vyanjana'
    },
    {
      text: 'ଣ',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: 'ତ',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: 'ଥ',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: 'ଦ',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: 'ଧ',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: 'ନ',
      text_krama: ['n'],
      type: 'vyanjana'
    },
    {
      text: 'ନ଼',
      text_krama: ['nz'],
      type: 'vyanjana'
    },
    {
      text: 'ପ',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: 'ଫ',
      text_krama: ['ph'],
      type: 'vyanjana'
    },
    {
      text: 'ଫ଼',
      text_krama: ['phz'],
      type: 'vyanjana'
    },
    {
      text: 'ବ',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: 'ଭ',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: 'ମ',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: 'ୟ',
      text_krama: ['y'],
      type: 'vyanjana'
    },
    {
      text: 'ଯ',
      text_krama: ['yz'],
      type: 'vyanjana'
    },
    {
      text: 'ର',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: 'ର଼',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: 'ଲ',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: 'ଳ',
      text_krama: ['L'],
      type: 'vyanjana'
    },
    {
      text: 'ଳ଼',
      text_krama: ['Lz'],
      type: 'vyanjana'
    },
    {
      text: 'ଵ',
      text_krama: ['v'],
      duplicates: ['ୱ'],
      type: 'vyanjana'
    },
    {
      text: 'ଶ',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: 'ଷ',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: 'ସ',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: 'ହ',
      text_krama: ['h'],
      type: 'vyanjana'
    }
    // {
    //   text: '୰',
    //   text_krama: [],
    //   type: 'anya'
    // },
    // {
    //   text: 'ୱ',
    //   text_krama: [],
    //   type: 'vyanjana'
    // }
  ]
};

export default Odia;
