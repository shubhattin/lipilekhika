import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';

const Malayalam = {
  script_type: 'brahmic',
  script_name: 'Malayalam',
  script_id: script_list_obj['Malayalam'],
  halant: '്',
  schwa_property: false,
  manual_krama_text_map: {
    '0': '൦',
    '1': '൧',
    '2': '൨',
    '3': '൩',
    '4': '൪',
    '5': '൫',
    '6': '൬',
    '7': '൭',
    '8': '൮',
    '9': '൯',
    AUM: 'ഓം',
    anusvAra: 'ം',
    anunAnAsika: 'ഁ',
    visarga: 'ഃ',
    saMkShepachihna: '॰',
    avagraha: 'ഽ',
    halant: '്',
    anudAttA: '॒',
    'udAtta-1': '॑',
    'udAtta-2': '᳚',
    'udAtta-3': '᳛',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    {
      text: 'അ',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ആ',
      mAtrA: 'ാ',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ഇ',
      mAtrA: 'ി',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ഈ',
      mAtrA: 'ീ',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ഉ',
      mAtrA: 'ു',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ഊ',
      mAtrA: 'ൂ',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ഋ',
      mAtrA: 'ൃ',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ൠ',
      mAtrA: 'ൄ',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ഌ',
      mAtrA: 'ൢ',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ൡ',
      mAtrA: 'ൣ',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'എ',
      mAtrA: 'െ',
      text_krama: ['e-svara'],
      mAtrA_text_krama: ['e-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ഏ',
      mAtrA: 'േ',
      text_krama: ['E-svara'],
      mAtrA_text_krama: ['E-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ഐ',
      mAtrA: 'ൈ',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ഒ',
      mAtrA: 'ൊ',
      text_krama: ['o-svara'],
      mAtrA_text_krama: ['o-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ഓ',
      mAtrA: 'ോ',
      text_krama: ['O-svara'],
      mAtrA_text_krama: ['O-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ഔ',
      mAtrA: 'ൗ',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      mAtrA_duplicates: ['ൌ'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: 'ക',
      text_krama: ['k', 'kz'],
      duplicates: ['ൿ'],
      type: 'vyanjana'
    },
    {
      text: 'ഖ',
      text_krama: ['kh', 'khz'],
      type: 'vyanjana'
    },
    {
      text: 'ഗ',
      text_krama: ['g', 'gz', 'g1'],
      type: 'vyanjana'
    },
    {
      text: 'ഘ',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: 'ങ',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: 'ച',
      text_krama: ['C', 'Cz'],
      type: 'vyanjana'
    },
    {
      text: 'ഛ',
      text_krama: ['Ch', 'Chz'],
      type: 'vyanjana'
    },
    {
      text: 'ജ',
      text_krama: ['j', 'jz', 'j1'],
      type: 'vyanjana'
    },
    {
      text: 'ഝ',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: 'ഞ',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: 'ട',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: 'ഠ',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: 'ഡ',
      text_krama: ['D', 'Dz', 'D1'],
      type: 'vyanjana'
    },
    {
      text: 'ഢ',
      text_krama: ['Dh', 'Dhz'],
      type: 'vyanjana'
    },
    {
      text: 'ണ',
      text_krama: ['N'],
      duplicates: ['ൺ'],
      type: 'vyanjana'
    },
    {
      text: 'ത',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: 'ഥ',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: 'ദ',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: 'ധ',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: 'ന',
      text_krama: ['n'],
      duplicates: ['ൻ'],
      type: 'vyanjana'
    },
    {
      text: 'ഩ',
      text_krama: ['nz'],
      type: 'vyanjana'
    },
    {
      text: 'പ',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: 'ഫ',
      text_krama: ['ph', 'phz'],
      type: 'vyanjana'
    },
    {
      text: 'ബ',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: 'ഭ',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: 'മ',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: 'യ',
      text_krama: ['y', 'yz'],
      type: 'vyanjana'
    },
    {
      text: 'ര',
      text_krama: ['r'],
      duplicates: ['ർ'],
      type: 'vyanjana'
    },
    {
      text: 'റ',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: 'ല',
      text_krama: ['l'],
      duplicates: ['ൽ'],
      type: 'vyanjana'
    },
    {
      text: 'ള',
      text_krama: ['L'],
      duplicates: ['ൾ'],
      type: 'vyanjana'
    },
    {
      text: 'ഴ',
      text_krama: ['Lz'],
      type: 'vyanjana'
    },
    {
      text: 'വ',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: 'ശ',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: 'ഷ',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: 'സ',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: 'ഹ',
      text_krama: ['h'],
      type: 'vyanjana'
    },
    {
      text: '഻',
      text_krama: [],
      type: 'anya'
    },
    {
      text: '഼',
      text_krama: [],
      type: 'anya'
    },

    // Numbers
    {
      text: '൰',
      text_krama: [],
      fallback: ['1', '0'],
      type: 'anya'
    },
    {
      text: '൱',
      text_krama: [],
      fallback: ['1', '0', '0'],
      type: 'anya'
    },
    {
      text: '൲',
      text_krama: [],
      fallback: ['1', '0', '0', '0'],
      type: 'anya'
    }
  ]
} satisfies InputBrahmicScriptType;

export default Malayalam;
