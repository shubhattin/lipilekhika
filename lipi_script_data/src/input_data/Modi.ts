import { script_list_obj } from '../lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';
import {
  COMMON_NUMBER_TYPING_DATA,
  COMMON_SCRIPT_TYPING_DATA,
  COMMON_SVARA_MATRA_TYPING_DATA,
  COMMON_VEDIC_SANSKRIT_SYMBOLS
} from './_common_typing';

const Modi: InputBrahmicScriptType = {
  script_type: 'brahmic',
  script_name: 'Modi',
  script_id: script_list_obj['Modi'],
  non_bmp_script: true,
  halant: '𑘿',
  schwa_property: false,
  typing_list: [
    ...COMMON_SCRIPT_TYPING_DATA,
    ...COMMON_NUMBER_TYPING_DATA,
    ...COMMON_SVARA_MATRA_TYPING_DATA,
    ...COMMON_VEDIC_SANSKRIT_SYMBOLS
  ],
  manual_krama_text_map: {
    '0': '𑙐',
    '1': '𑙑',
    '2': '𑙒',
    '3': '𑙓',
    '4': '𑙔',
    '5': '𑙕',
    '6': '𑙖',
    '7': '𑙗',
    '8': '𑙘',
    '9': '𑙙',
    AUM: 'ॐ',
    anusvAra: '𑘽',
    anunAnAsika: '𑙀',
    visarga: '𑘾',
    saMkShepachihna: '𑙃',
    avagraha: 'ऽ',
    halant: '𑘿',
    anudAttA: '↓',
    'udAtta-1': '↑',
    'udAtta-2': '↑↑',
    'udAtta-3': '↑↑↑',
    virama: '𑙁',
    double_virama: '𑙂'
  },
  list: [
    {
      text: '𑘀',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘁',
      mAtrA: '𑘰',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘂',
      mAtrA: '𑘱',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘃',
      mAtrA: '𑘲',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘄',
      mAtrA: '𑘳',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘅',
      mAtrA: '𑘴',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘆',
      mAtrA: '𑘵',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘇',
      mAtrA: '𑘶',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘈',
      mAtrA: '𑘷',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘉',
      mAtrA: '𑘸',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘊',
      mAtrA: '𑘹',
      text_krama: ['E-svara', 'e-svara'],
      mAtrA_text_krama: ['E-mAtrA', 'e-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘋',
      mAtrA: '𑘺',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘌',
      mAtrA: '𑘻',
      text_krama: ['O-svara', 'o-svara'],
      mAtrA_text_krama: ['O-mAtrA', 'o-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑘍',
      mAtrA: '𑘼',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: '𑘎',
      text_krama: ['k', 'kz'],
      type: 'vyanjana'
    },
    {
      text: '𑘏',
      text_krama: ['kh', 'khz'],
      type: 'vyanjana'
    },
    {
      text: '𑘐',
      text_krama: ['g', 'gz', 'g1'],
      type: 'vyanjana'
    },
    {
      text: '𑘑',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: '𑘒',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: '𑘓',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: '𑘔',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: '𑘕',
      text_krama: ['j', 'jz', 'j1'],
      type: 'vyanjana'
    },
    {
      text: '𑘖',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: '𑘗',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: '𑘘',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: '𑘙',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: '𑘚',
      text_krama: ['D', 'Dz', 'D1'],
      type: 'vyanjana'
    },
    {
      text: '𑘛',
      text_krama: ['Dh', 'Dhz'],
      type: 'vyanjana'
    },
    {
      text: '𑘜',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: '𑘝',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: '𑘞',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: '𑘟',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: '𑘠',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: '𑘡',
      text_krama: ['n', 'nz'],
      type: 'vyanjana'
    },
    {
      text: '𑘢',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: '𑘣',
      text_krama: ['ph', 'phz'],
      type: 'vyanjana'
    },
    {
      text: '𑘤',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: '𑘥',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: '𑘦',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: '𑘧',
      text_krama: ['y', 'yz'],
      type: 'vyanjana'
    },
    {
      text: '𑘨',
      text_krama: ['r', 'rz'],
      type: 'vyanjana'
    },
    {
      text: '𑘩',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: '𑘪',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: '𑘫',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: '𑘬',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: '𑘭',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: '𑘮',
      text_krama: ['h'],
      type: 'vyanjana'
    },
    {
      text: '𑘯',
      text_krama: ['L', 'Lz'],
      type: 'vyanjana'
    }
  ]
};

export default Modi;
