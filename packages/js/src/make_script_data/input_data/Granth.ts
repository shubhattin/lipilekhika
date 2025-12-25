import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';
import {
  COMMON_NUMBER_TYPING_DATA,
  COMMON_SCRIPT_TYPING_DATA,
  COMMON_SVARA_MATRA_TYPING_DATA
} from './_common_typing';

const Granth: InputBrahmicScriptType = {
  script_type: 'brahmic',
  script_name: 'Granth',
  script_id: script_list_obj['Granth'],
  non_bmp_script: true,
  halant: '𑍍',
  nuqta: '𑌼',
  schwa_property: false,
  typing_list: [
    ...COMMON_SCRIPT_TYPING_DATA,
    ...COMMON_NUMBER_TYPING_DATA,
    ...COMMON_SVARA_MATRA_TYPING_DATA
  ],
  manual_krama_text_map: {
    '0': '௦',
    '1': '௧',
    '2': '௨',
    '3': '௩',
    '4': '௪',
    '5': '௫',
    '6': '௬',
    '7': '௭',
    '8': '௮',
    '9': '௯',
    AUM: '𑍐',
    anusvAra: '𑌀',
    anunAnAsika: '𑌁',
    visarga: '𑌃',
    saMkShepachihna: '𑙃',
    avagraha: '𑌽',
    halant: '𑍍',
    nuqta: '𑌼',
    anudAttA: '↓',
    'udAtta-1': '↑',
    'udAtta-2': '↑↑',
    'udAtta-3': '↑↑↑',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    {
      text: '𑍐',
      text_krama: ['AUM'],
      duplicates: ['ॐ'],
      type: 'anya'
    },

    {
      text: '𑌀',
      text_krama: ['anusvAra'],
      duplicates: ['𑌂'],
      type: 'anya'
    },
    {
      text: '௰',
      text_krama: [],
      fallback: ['1', '0'],
      type: 'anya'
    },
    {
      text: '௱',
      text_krama: [],
      fallback: ['1', '0', '0'],
      type: 'anya'
    },
    {
      text: '௲',
      text_krama: ['1', '0', '0', '0'],
      type: 'anya'
    },
    {
      text: '𑌅',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },

    // Svara
    {
      text: '𑌆',
      mAtrA: '𑌾',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑌇',
      mAtrA: '𑌿',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑌈',
      mAtrA: '𑍀',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑌉',
      mAtrA: '𑍁',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑌊',
      mAtrA: '𑍂',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑌋',
      mAtrA: '𑍃',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑍠',
      mAtrA: '𑍄',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑌌',
      mAtrA: '𑍢',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑍡',
      mAtrA: '𑍣',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑌏',
      mAtrA: '𑍇',
      text_krama: ['E-svara', 'e-svara'],
      mAtrA_text_krama: ['E-mAtrA', 'e-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑌐',
      mAtrA: '𑍈',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑌓',
      mAtrA: '𑍋',
      text_krama: ['O-svara', 'o-svara'],
      mAtrA_text_krama: ['O-mAtrA', 'o-mAtrA'],
      mAtrA_duplicates: ['𑍋'],
      type: 'svara'
    },
    {
      text: '𑌔',
      mAtrA: '𑍌',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      mAtrA_duplicates: ['𑍌'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: '𑌕',
      text_krama: ['k'],
      type: 'vyanjana'
    },
    {
      text: '𑌕𑌼',
      text_krama: ['kz'],
      type: 'vyanjana'
    },
    {
      text: '𑌖',
      text_krama: ['kh'],
      type: 'vyanjana'
    },
    {
      text: '𑌖𑌼',
      text_krama: ['khz'],
      type: 'vyanjana'
    },
    {
      text: '𑌗',
      text_krama: ['g', 'g1'],
      type: 'vyanjana'
    },
    {
      text: '𑌗𑌼',
      text_krama: ['gz'],
      type: 'vyanjana'
    },
    {
      text: '𑌘',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: '𑌙',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: '𑌚',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: '𑌛',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: '𑌜',
      text_krama: ['j', 'j1'],
      type: 'vyanjana'
    },
    {
      text: '𑌜𑌼',
      text_krama: ['jz'],
      type: 'vyanjana'
    },
    {
      text: '𑌝',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: '𑌞',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: '𑌟',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: '𑌠',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: '𑌡',
      text_krama: ['D', 'D1'],
      type: 'vyanjana'
    },
    {
      text: '𑌡𑌼',
      text_krama: ['Dz'],
      type: 'vyanjana'
    },
    {
      text: '𑌢',
      text_krama: ['Dh'],
      type: 'vyanjana'
    },
    {
      text: '𑌢𑌼',
      text_krama: ['Dhz'],
      type: 'vyanjana'
    },
    {
      text: '𑌣',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: '𑌤',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: '𑌥',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: '𑌦',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: '𑌧',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: '𑌨',
      text_krama: ['n', 'nz'],
      type: 'vyanjana'
    },
    {
      text: '𑌨𑌼',
      text_krama: ['nz'],
      type: 'vyanjana'
    },
    {
      text: '𑌪',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: '𑌫',
      text_krama: ['ph'],
      type: 'vyanjana'
    },
    {
      text: '𑌫𑌼',
      text_krama: ['phz'],
      type: 'vyanjana'
    },
    {
      text: '𑌬',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: '𑌭',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: '𑌮',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: '𑌯',
      text_krama: ['y'],
      type: 'vyanjana'
    },
    {
      text: '𑌯𑌼',
      text_krama: ['yz'],
      type: 'vyanjana'
    },
    {
      text: '𑌰',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: '𑌰𑌼',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: '𑌲',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: '𑌳',
      text_krama: ['L'],
      type: 'vyanjana'
    },
    {
      text: '𑌳𑌼',
      text_krama: ['Lz'],
      type: 'vyanjana'
    },
    {
      text: '𑌵',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: '𑌶',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: '𑌷',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: '𑌸',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: '𑌹',
      text_krama: ['h'],
      type: 'vyanjana'
    }
  ]
};

export default Granth;
