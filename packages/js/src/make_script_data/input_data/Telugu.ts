import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';
import {
  COMMON_NUMBER_TYPING_DATA,
  COMMON_SCRIPT_TYPING_DATA,
  COMMON_SVARA_MATRA_TYPING_DATA,
  COMMON_VEDIC_SANSKRIT_SYMBOLS
} from './_common_typing';

const Telugu: InputBrahmicScriptType = {
  script_type: 'brahmic',
  script_name: 'Telugu',
  script_id: script_list_obj['Telugu'],
  halant: '్',
  schwa_property: false,
  typing_list: [
    ...COMMON_SCRIPT_TYPING_DATA,
    ...COMMON_NUMBER_TYPING_DATA,
    ...COMMON_SVARA_MATRA_TYPING_DATA,
    ...COMMON_VEDIC_SANSKRIT_SYMBOLS
  ],
  manual_krama_text_map: {
    '0': '౦',
    '1': '౧',
    '2': '౨',
    '3': '౩',
    '4': '౪',
    '5': '౫',
    '6': '౬',
    '7': '౭',
    '8': '౮',
    '9': '౯',
    AUM: 'ఓం',
    anusvAra: 'ం',
    anunAnAsika: 'ఁ',
    visarga: 'ః',
    saMkShepachihna: '॰',
    avagraha: 'ఽ',
    halant: '్',
    anudAttA: '॒',
    'svarita-1': '॑',
    'svarita-2': '᳚',
    'svarita-3': '᳛',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    {
      text: 'ఓం',
      text_krama: ['AUM'],
      duplicates: ['ॐ'],
      type: 'anya'
    },

    {
      text: 'అ',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఆ',
      mAtrA: 'ా',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఇ',
      mAtrA: 'ి',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఈ',
      mAtrA: 'ీ',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఉ',
      mAtrA: 'ు',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఊ',
      mAtrA: 'ూ',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఋ',
      mAtrA: 'ృ',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ౠ',
      mAtrA: 'ౄ',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఌ',
      mAtrA: 'ౢ',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ౡ',
      mAtrA: 'ౣ',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఎ',
      mAtrA: 'ె',
      text_krama: ['e-svara'],
      mAtrA_text_krama: ['e-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఏ',
      mAtrA: 'ే',
      text_krama: ['E-svara'],
      mAtrA_text_krama: ['E-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఐ',
      mAtrA: 'ై',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఒ',
      mAtrA: 'ొ',
      text_krama: ['o-svara'],
      mAtrA_text_krama: ['o-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఓ',
      mAtrA: 'ో',
      text_krama: ['O-svara'],
      mAtrA_text_krama: ['O-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ఔ',
      mAtrA: 'ౌ',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: 'క',
      text_krama: ['k', 'kz'],
      type: 'vyanjana'
    },
    {
      text: 'ఖ',
      text_krama: ['kh', 'khz'],
      type: 'vyanjana'
    },
    {
      text: 'గ',
      text_krama: ['g', 'gz', 'g1'],
      type: 'vyanjana'
    },
    {
      text: 'ఘ',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: 'ఙ',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: 'చ',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: 'ఛ',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: 'జ',
      text_krama: ['j', 'jz', 'j1'],
      type: 'vyanjana'
    },
    {
      text: 'ఝ',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: 'ఞ',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: 'ట',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: 'ఠ',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: 'డ',
      text_krama: ['D', 'Dz', 'D1'],
      type: 'vyanjana'
    },
    {
      text: 'ఢ',
      text_krama: ['Dh', 'Dhz'],
      type: 'vyanjana'
    },
    {
      text: 'ణ',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: 'త',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: 'థ',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: 'ద',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: 'ధ',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: 'న',
      text_krama: ['n', 'nz'],
      type: 'vyanjana'
    },
    {
      text: 'ప',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: 'ఫ',
      text_krama: ['ph', 'phz'],
      type: 'vyanjana'
    },
    {
      text: 'బ',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: 'భ',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: 'మ',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: 'య',
      text_krama: ['y', 'yz'],
      type: 'vyanjana'
    },
    {
      text: 'ర',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: 'ఱ',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: 'ల',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: 'ళ',
      text_krama: ['L'],
      type: 'vyanjana'
    },
    {
      text: 'ఴ',
      text_krama: ['Lz'],
      type: 'vyanjana'
    },
    {
      text: 'వ',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: 'శ',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: 'ష',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: 'స',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: 'హ',
      text_krama: ['h'],
      type: 'vyanjana'
    }
  ]
};

export default Telugu;
