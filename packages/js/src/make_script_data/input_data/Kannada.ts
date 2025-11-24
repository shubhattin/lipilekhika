import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';

const Kannada = {
  script_type: 'brahmic',
  script_name: 'Kannada',
  script_id: script_list_obj['Kannada'],
  halant: '್',
  nuqta: '಼',
  schwa_property: false,
  manual_krama_text_map: {
    '0': '೦',
    '1': '೧',
    '2': '೨',
    '3': '೩',
    '4': '೪',
    '5': '೫',
    '6': '೬',
    '7': '೭',
    '8': '೮',
    '9': '೯',
    AUM: 'ಓಂ',
    anusvAra: 'ಂ',
    anunAnAsika: 'ಁ',
    visarga: 'ಃ',
    nuqta: '಼',
    saMkShepachihna: '॰',
    avagraha: 'ಽ',
    halant: '್',
    anudAttA: '॒',
    'udAtta-1': '॑',
    'udAtta-2': '᳚',
    'udAtta-3': '᳛',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    {
      text: 'ಅ',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ಆ',
      mAtrA: 'ಾ',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ಇ',
      mAtrA: 'ಿ',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ಈ',
      mAtrA: 'ೀ',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      mAtrA_duplicates: ['ೀ'],
      type: 'svara'
    },
    {
      text: 'ಉ',
      mAtrA: 'ು',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ಊ',
      mAtrA: 'ೂ',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ಋ',
      mAtrA: 'ೃ',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ೠ',
      mAtrA: 'ೄ',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ಌ',
      mAtrA: 'ೢ',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ೡ',
      mAtrA: 'ೣ',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ಎ',
      mAtrA: 'ೆ',
      text_krama: ['e-svara'],
      mAtrA_text_krama: ['e-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ಏ',
      mAtrA: 'ೇ',
      text_krama: ['E-svara'],
      mAtrA_text_krama: ['E-mAtrA'],
      mAtrA_duplicates: ['ೇ', 'ೇ'],
      type: 'svara'
    },
    {
      text: 'ಐ',
      mAtrA: 'ೈ',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      mAtrA_duplicates: ['ೈ'],
      type: 'svara'
    },
    {
      text: 'ಒ',
      mAtrA: 'ೊ',
      text_krama: ['o-svara'],
      mAtrA_text_krama: ['o-mAtrA'],
      mAtrA_duplicates: ['ೊ'],
      type: 'svara'
    },
    {
      text: 'ಓ',
      mAtrA: 'ೋ',
      text_krama: ['O-svara'],
      mAtrA_text_krama: ['O-mAtrA'],
      mAtrA_duplicates: ['ೋ'],
      type: 'svara'
    },
    {
      text: 'ಔ',
      mAtrA: 'ೌ',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: 'ಕ',
      text_krama: ['k'],
      type: 'vyanjana'
    },
    {
      text: 'ಕ಼',
      text_krama: ['kz'],
      type: 'vyanjana'
    },
    {
      text: 'ಖ',
      text_krama: ['kh'],
      type: 'vyanjana'
    },
    {
      text: 'ಖ಼',
      text_krama: ['khz'],
      type: 'vyanjana'
    },
    {
      text: 'ಗ',
      text_krama: ['g', 'g1'],
      type: 'vyanjana'
    },
    {
      text: 'ಗ಼',
      text_krama: ['gz'],
      type: 'vyanjana'
    },
    {
      text: 'ಘ',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: 'ಙ',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: 'ಚ',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: 'ಛ',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: 'ಜ',
      text_krama: ['j', 'j1'],
      type: 'vyanjana'
    },
    {
      text: 'ಜ಼',
      text_krama: ['jz'],
      type: 'vyanjana'
    },
    {
      text: 'ಝ',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: 'ಞ',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: 'ಟ',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: 'ಠ',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: 'ಡ',
      text_krama: ['D', 'D1'],
      type: 'vyanjana'
    },
    {
      text: 'ಡ಼',
      text_krama: ['Dz'],
      type: 'vyanjana'
    },
    {
      text: 'ಢ',
      text_krama: ['Dh'],
      type: 'vyanjana'
    },
    {
      text: 'ಢ಼',
      text_krama: ['Dhz'],
      type: 'vyanjana'
    },
    {
      text: 'ಣ',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: 'ತ',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: 'ಥ',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: 'ದ',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: 'ಧ',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: 'ನ',
      text_krama: ['n'],
      type: 'vyanjana'
    },
    {
      text: 'ನ಼',
      text_krama: ['nz'],
      type: 'vyanjana'
    },
    {
      text: 'ಪ',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: 'ಫ',
      text_krama: ['ph'],
      type: 'vyanjana'
    },
    {
      text: 'ಫ಼',
      text_krama: ['phz'],
      type: 'vyanjana'
    },
    {
      text: 'ಬ',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: 'ಭ',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: 'ಮ',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: 'ಯ',
      text_krama: ['y'],
      type: 'vyanjana'
    },
    {
      text: 'ಯ಼',
      text_krama: ['yz'],
      type: 'vyanjana'
    },
    {
      text: 'ರ',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: 'ಱ',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: 'ಲ',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: 'ಳ',
      text_krama: ['L'],
      type: 'vyanjana'
    },
    {
      text: 'ೞ',
      text_krama: ['Lz'],
      type: 'vyanjana'
    },
    {
      text: 'ವ',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: 'ಶ',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: 'ಷ',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: 'ಸ',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: 'ಹ',
      text_krama: ['h'],
      type: 'vyanjana'
    }
    // {
    //   text: 'ೱ',
    //   text_krama: [],
    //   type: 'anya'
    // },
    // {
    //   text: 'ೲ',
    //   text_krama: [],
    //   type: 'anya'
    // },
  ]
} satisfies InputBrahmicScriptType;

export default Kannada;
