import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';
import {
  COMMON_NUMBER_TYPING_DATA,
  COMMON_SCRIPT_TYPING_DATA,
  COMMON_SVARA_MATRA_TYPING_DATA,
  COMMON_VEDIC_SANSKRIT_SYMBOLS
} from './_common_typing';

const HALANT = '𑖿';

const Siddham: InputBrahmicScriptType = {
  script_type: 'brahmic',
  script_name: 'Siddham',
  script_id: script_list_obj['Siddham'],
  non_bmp_script: true,
  halant: '𑖿',
  nuqta: '𑗀',
  schwa_property: false,
  typing_list: [
    ...COMMON_SCRIPT_TYPING_DATA,
    ...COMMON_NUMBER_TYPING_DATA,
    ...COMMON_SVARA_MATRA_TYPING_DATA,
    ...COMMON_VEDIC_SANSKRIT_SYMBOLS
  ],
  manual_krama_text_map: {
    '0': '०',
    '1': '१',
    '2': '२',
    '3': '३',
    '4': '४',
    '5': '५',
    '6': '६',
    '7': '७',
    '8': '८',
    '9': '९',
    AUM: 'ॐ',
    anusvAra: '𑖽',
    anunAnAsika: '𑖼',
    visarga: '𑖾',
    nuqta: '𑗀',
    saMkShepachihna: '॰',
    avagraha: 'ऽ',
    halant: HALANT,
    anudAttA: '↓',
    'udAtta-1': '↑',
    'udAtta-2': '↑↑',
    'udAtta-3': '↑↑↑',
    virama: '𑗂',
    double_virama: '𑗃'
  },
  list: [
    {
      text: '𑖀',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑖁',
      mAtrA: '𑖯',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑖂',
      mAtrA: '𑖰',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      duplicates: ['𑗘', '𑗙'],
      type: 'svara'
    },
    {
      text: '𑖃',
      mAtrA: '𑖱',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      duplicates: ['𑗚'],
      type: 'svara'
    },
    {
      text: '𑖄',
      mAtrA: '𑖲',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      duplicates: ['𑗛'],
      mAtrA_duplicates: ['𑗜'],
      type: 'svara'
    },
    {
      text: '𑖅',
      mAtrA: '𑖳',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      mAtrA_duplicates: ['𑗝'],
      type: 'svara'
    },
    {
      text: '𑖆',
      mAtrA: '𑖴',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑖇',
      mAtrA: '𑖵',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑖈',
      mAtrA: HALANT + '𑖩𑖿𑖨𑖰',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑖉',
      mAtrA: HALANT + '𑖩𑖿𑖨𑖱',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara',
      prevent_auto_matching: true
    },
    {
      text: '𑖊',
      mAtrA: '𑖸',
      text_krama: ['E-svara', 'e-svara'],
      mAtrA_text_krama: ['E-mAtrA', 'e-mAtrA'],
      type: 'svara',
      prevent_auto_matching: true
    },
    {
      text: '𑖋',
      mAtrA: '𑖹',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑖌',
      mAtrA: '𑖺',
      text_krama: ['O-svara', 'o-svara'],
      mAtrA_text_krama: ['O-mAtrA', 'o-mAtrA'],
      duplicates: ['𑖺'],
      type: 'svara'
    },
    {
      text: '𑖍',
      mAtrA: '𑖻',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      duplicates: ['𑖻'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: '𑖎',
      text_krama: ['k'],
      type: 'vyanjana'
    },
    {
      text: '𑖎𑗀',
      text_krama: ['kz'],
      type: 'vyanjana'
    },
    {
      text: '𑖏',
      text_krama: ['kh'],
      type: 'vyanjana'
    },
    {
      text: '𑖏𑗀',
      text_krama: ['khz'],
      type: 'vyanjana'
    },
    {
      text: '𑖐',
      text_krama: ['g', 'g1'],
      type: 'vyanjana'
    },
    {
      text: '𑖐𑗀',
      text_krama: ['gz'],
      type: 'vyanjana'
    },
    {
      text: '𑖑',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: '𑖒',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: '𑖓',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: '𑖔',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: '𑖕',
      text_krama: ['j', 'j1'],
      type: 'vyanjana'
    },
    {
      text: '𑖕𑗀',
      text_krama: ['jz'],
      type: 'vyanjana'
    },
    {
      text: '𑖖',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: '𑖗',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: '𑖘',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: '𑖙',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: '𑖚',
      text_krama: ['D', 'D1'],
      type: 'vyanjana'
    },
    {
      text: '𑖚𑗀',
      text_krama: ['Dz'],
      type: 'vyanjana'
    },
    {
      text: '𑖛',
      text_krama: ['Dh'],
      type: 'vyanjana'
    },
    {
      text: '𑖛𑗀',
      text_krama: ['Dhz'],
      type: 'vyanjana'
    },
    {
      text: '𑖜',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: '𑖝',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: '𑖞',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: '𑖟',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: '𑖠',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: '𑖡',
      text_krama: ['n'],
      type: 'vyanjana'
    },
    {
      text: '𑖡𑗀',
      text_krama: ['nz'],
      type: 'vyanjana'
    },
    {
      text: '𑖢',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: '𑖣',
      text_krama: ['ph'],
      type: 'vyanjana'
    },
    {
      text: '𑖣𑗀',
      text_krama: ['phz'],
      type: 'vyanjana'
    },
    {
      text: '𑖤',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: '𑖥',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: '𑖦',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: '𑖧',
      text_krama: ['y'],
      type: 'vyanjana'
    },
    {
      text: '𑖧𑗀',
      text_krama: ['yz'],
      type: 'vyanjana'
    },
    {
      text: '𑖨',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: '𑖨𑗀',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: '𑖩',
      text_krama: ['l', 'L'],
      type: 'vyanjana'
    },
    {
      text: '𑖩𑗀',
      text_krama: ['Lz'],
      type: 'vyanjana'
    },
    {
      text: '𑖪',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: '𑖫',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: '𑖬',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: '𑖭',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: '𑖮',
      text_krama: ['h'],
      type: 'vyanjana'
    }
  ]
};

export default Siddham;
