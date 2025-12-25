import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';
import {
  COMMON_NUMBER_TYPING_DATA,
  COMMON_SCRIPT_TYPING_DATA,
  COMMON_SVARA_MATRA_TYPING_DATA
} from './_common_typing';

const Gujarati: InputBrahmicScriptType = {
  script_type: 'brahmic',
  script_name: 'Gujarati',
  script_id: script_list_obj['Gujarati'],
  halant: '્',
  nuqta: '઼',
  schwa_property: true,
  typing_list: [
    ...COMMON_SCRIPT_TYPING_DATA,
    ...COMMON_NUMBER_TYPING_DATA,
    ...COMMON_SVARA_MATRA_TYPING_DATA
  ],
  manual_krama_text_map: {
    '0': '૦',
    '1': '૧',
    '2': '૨',
    '3': '૩',
    '4': '૪',
    '5': '૫',
    '6': '૬',
    '7': '૭',
    '8': '૮',
    '9': '૯',
    AUM: 'ૐ',
    anusvAra: 'ં',
    anunAnAsika: 'ઁ',
    visarga: 'ઃ',
    saMkShepachihna: '॰',
    avagraha: 'ઽ',
    halant: '્',
    nuqta: '઼',
    anudAttA: '॒',
    'udAtta-1': '॑',
    'udAtta-2': '᳚',
    'udAtta-3': '᳛',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    {
      text: 'ૐ',
      text_krama: ['AUM'],
      duplicates: ['ॐ'],
      type: 'anya'
    },

    // Svara
    {
      text: 'અ',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'આ',
      mAtrA: 'ા',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ઇ',
      mAtrA: 'િ',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ઈ',
      mAtrA: 'ી',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ઉ',
      mAtrA: 'ુ',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ઊ',
      mAtrA: 'ૂ',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ઋ',
      mAtrA: 'ૃ',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ૠ',
      mAtrA: 'ૄ',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ઌ',
      mAtrA: 'ૢ',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ૡ',
      mAtrA: 'ૣ',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ઍ',
      mAtrA: 'ૅ',
      text_krama: ['aiI-svara'],
      mAtrA_text_krama: ['aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: 'એ',
      mAtrA: 'ે',
      text_krama: ['E-svara', 'e-svara'],
      mAtrA_text_krama: ['E-mAtrA', 'e-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ઐ',
      mAtrA: 'ૈ',
      text_krama: ['ai-svara'],
      mAtrA_text_krama: ['ai-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ઑ',
      mAtrA: 'ૉ',
      text_krama: ['auU-svara'],
      mAtrA_text_krama: ['auU-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ઓ',
      mAtrA: 'ો',
      text_krama: ['O-svara', 'o-svara'],
      mAtrA_text_krama: ['O-mAtrA', 'o-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ઔ',
      mAtrA: 'ૌ',
      text_krama: ['au-svara'],
      mAtrA_text_krama: ['au-mAtrA'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: 'ક',
      text_krama: ['k'],
      type: 'vyanjana'
    },
    {
      text: 'ક઼',
      text_krama: ['kz'],
      type: 'vyanjana'
    },
    {
      text: 'ખ',
      text_krama: ['kh'],
      type: 'vyanjana'
    },
    {
      text: 'ખ઼',
      text_krama: ['khz'],
      type: 'vyanjana'
    },
    {
      text: 'ગ',
      text_krama: ['g', 'g1'],
      type: 'vyanjana'
    },
    {
      text: 'ગ઼',
      text_krama: ['gz'],
      type: 'vyanjana'
    },
    {
      text: 'ઘ',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: 'ઙ',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: 'ચ',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: 'છ',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: 'જ',
      text_krama: ['j', 'j1'],
      type: 'vyanjana'
    },
    {
      text: 'જ઼',
      text_krama: ['jz'],
      type: 'vyanjana'
    },
    {
      text: 'ઝ',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: 'ઞ',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: 'ટ',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: 'ઠ',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: 'ડ',
      text_krama: ['D'],
      type: 'vyanjana'
    },
    {
      text: 'ડ઼',
      text_krama: ['Dz', 'D1'],
      type: 'vyanjana'
    },
    {
      text: 'ઢ',
      text_krama: ['Dh'],
      type: 'vyanjana'
    },
    {
      text: 'ઢ઼',
      text_krama: ['Dhz'],
      type: 'vyanjana'
    },
    {
      text: 'ણ',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: 'ત',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: 'થ',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: 'દ',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: 'ધ',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: 'ન',
      text_krama: ['n'],
      type: 'vyanjana'
    },
    {
      text: 'ન઼',
      text_krama: ['nz'],
      type: 'vyanjana'
    },
    {
      text: 'પ',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: 'ફ',
      text_krama: ['ph'],
      type: 'vyanjana'
    },
    {
      text: 'ફ઼',
      text_krama: ['phz'],
      type: 'vyanjana'
    },
    {
      text: 'બ',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: 'ભ',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: 'મ',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: 'ય',
      text_krama: ['y'],
      type: 'vyanjana'
    },
    {
      text: 'ય઼',
      text_krama: ['yz'],
      type: 'vyanjana'
    },
    {
      text: 'ર',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: 'ર઼',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: 'લ',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: 'ળ',
      text_krama: ['L'],
      type: 'vyanjana'
    },
    {
      text: 'ળ઼',
      text_krama: ['Lz'],
      type: 'vyanjana'
    },
    {
      text: 'વ',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: 'શ',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: 'ષ',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: 'સ',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: 'હ',
      text_krama: ['h'],
      type: 'vyanjana'
    }
  ]
};

export default Gujarati;
