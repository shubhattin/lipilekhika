import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';
import {
  COMMON_NUMBER_TYPING_DATA,
  COMMON_SCRIPT_TYPING_DATA,
  COMMON_SVARA_MATRA_TYPING_DATA,
  COMMON_VEDIC_SANSKRIT_SYMBOLS
} from './_common_typing';

const Brahmi: InputBrahmicScriptType = {
  script_type: 'brahmic',
  script_name: 'Brahmi',
  script_id: script_list_obj['Brahmi'],
  non_bmp_script: true,
  halant: '𑁆',
  schwa_property: false,
  typing_list: [
    ...COMMON_SCRIPT_TYPING_DATA,
    ...COMMON_NUMBER_TYPING_DATA,
    ...COMMON_SVARA_MATRA_TYPING_DATA,
    ...COMMON_VEDIC_SANSKRIT_SYMBOLS
  ],
  manual_krama_text_map: {
    '0': '𑁦',
    '1': '𑁧',
    '2': '𑁨',
    '3': '𑁩',
    '4': '𑁪',
    '5': '𑁫',
    '6': '𑁬',
    '7': '𑁭',
    '8': '𑁮',
    '9': '𑁯',
    AUM: 'ॐ',
    anusvAra: '𑀁',
    anunAnAsika: '𑀀',
    visarga: '𑀂',
    saMkShepachihna: '॰',
    avagraha: 'ऽ',
    halant: '𑁆',
    anudAttA: '↓',
    'udAtta-1': '↑',
    'udAtta-2': '↑↑',
    'udAtta-3': '↑↑↑',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    {
      text: '।',
      text_krama: ['virama'],
      type: 'anya',
      duplicates: ['𑁇']
    },
    {
      text: '॥',
      text_krama: ['double_virama'],
      type: 'anya',
      duplicates: ['𑁈']
      // ^ Brahmi's own dandas are also read
    },
    // Svara
    {
      text: '𑀅',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀆',
      mAtrA: '𑀸',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA'],
      type: 'svara'
    },
    {
      // Bhattiprolu AA: only a mAtrA form (no independent letter, A1-svara is 𑀆 above).
      // A list item so that the A1 mAtrA is typed as a mAtrA (k.A1 -> 𑀓𑁆𑀹)
      text: '𑀅𑀹',
      mAtrA: '𑀹',
      text_krama: [],
      mAtrA_text_krama: ['A1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀇',
      mAtrA: '𑀺',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀈',
      mAtrA: '𑀻',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀉',
      mAtrA: '𑀼',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀊',
      mAtrA: '𑀽',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀋',
      mAtrA: '𑀾',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀌',
      mAtrA: '𑀿',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀍',
      mAtrA: '𑁀',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀎',
      mAtrA: '𑁁',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀏',
      mAtrA: '𑁂',
      text_krama: ['E-svara', 'e-svara'],
      mAtrA_text_krama: ['E-mAtrA', 'e-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀐',
      mAtrA: '𑁃',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀑',
      mAtrA: '𑁄',
      text_krama: ['O-svara', 'o-svara'],
      mAtrA_text_krama: ['O-mAtrA', 'o-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑀒',
      mAtrA: '𑁅',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: '𑀓',
      text_krama: ['k', 'kz'],
      type: 'vyanjana'
    },
    {
      text: '𑀔',
      text_krama: ['kh', 'khz'],
      type: 'vyanjana'
    },
    {
      text: '𑀕',
      text_krama: ['g', 'gz', 'g1'],
      type: 'vyanjana'
    },
    {
      text: '𑀖',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: '𑀗',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: '𑀘',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: '𑀙',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: '𑀚',
      text_krama: ['j', 'jz', 'j1'],
      type: 'vyanjana'
    },
    {
      text: '𑀛',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: '𑀜',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: '𑀝',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: '𑀞',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: '𑀟',
      text_krama: ['D', 'Dz', 'D1'],
      type: 'vyanjana'
    },
    {
      text: '𑀠',
      text_krama: ['Dh', 'Dhz'],
      type: 'vyanjana'
    },
    {
      text: '𑀡',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: '𑀢',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: '𑀣',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: '𑀤',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: '𑀥',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: '𑀦',
      text_krama: ['n'],
      type: 'vyanjana'
    },
    {
      text: '𑀷',
      text_krama: ['nz'],
      type: 'vyanjana'
    },
    {
      text: '𑀧',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: '𑀨',
      text_krama: ['ph', 'phz'],
      type: 'vyanjana'
    },
    {
      text: '𑀩',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: '𑀪',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: '𑀫',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: '𑀬',
      text_krama: ['y', 'yz'],
      type: 'vyanjana'
    },
    {
      text: '𑀭',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: '𑀶',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: '𑀮',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: '𑀯',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: '𑀰',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: '𑀱',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: '𑀲',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: '𑀳',
      text_krama: ['h'],
      type: 'vyanjana'
    },
    {
      text: '𑀴',
      text_krama: ['L'],
      type: 'vyanjana'
    },
    {
      text: '𑀵',
      text_krama: ['Lz'],
      type: 'vyanjana'
    }
  ]
};

export default Brahmi;
