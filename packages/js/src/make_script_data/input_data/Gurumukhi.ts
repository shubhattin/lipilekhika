import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';
import {
  COMMON_NUMBER_TYPING_DATA,
  COMMON_SCRIPT_TYPING_DATA,
  COMMON_SVARA_MATRA_TYPING_DATA
} from './_common_typing';

const HALANT = '੍';

const Gurumukhi: InputBrahmicScriptType = {
  script_type: 'brahmic',
  script_name: 'Gurumukhi',
  script_id: script_list_obj['Gurumukhi'],
  halant: '੍',
  nuqta: '਼',
  schwa_property: true,
  typing_list: [
    ...COMMON_SCRIPT_TYPING_DATA,
    ...COMMON_NUMBER_TYPING_DATA,
    ...COMMON_SVARA_MATRA_TYPING_DATA
  ],
  manual_krama_text_map: {
    '0': '੦',
    '1': '੧',
    '2': '੨',
    '3': '੩',
    '4': '੪',
    '5': '੫',
    '6': '੬',
    '7': '੭',
    '8': '੮',
    '9': '੯',
    AUM: 'ੴ',
    anusvAra: 'ਂ',
    anunAnAsika: 'ਁ',
    visarga: 'ਃ',
    saMkShepachihna: '॰',
    avagraha: 'ऽ',
    halant: HALANT,
    nuqta: '਼',
    anudAttA: '॒',
    'udAtta-1': '॑',
    'udAtta-2': '᳚',
    'udAtta-3': '᳛',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    {
      text: 'ੴ',
      text_krama: ['AUM'],
      duplicates: ['ॐ'],
      type: 'anya'
    },

    // Svara
    {
      text: 'ਅ',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ਆ',
      mAtrA: 'ਾ',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ਇ',
      mAtrA: 'ਿ',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ਈ',
      mAtrA: 'ੀ',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ਉ',
      mAtrA: 'ੁ',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ਊ',
      mAtrA: 'ੂ',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ਏ',
      mAtrA: 'ੇ',
      text_krama: ['E-svara', 'e-svara'],
      mAtrA_text_krama: ['E-mAtrA', 'e-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ਐ',
      mAtrA: 'ੈ',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ਓ',
      mAtrA: 'ੋ',
      text_krama: ['O-svara', 'o-svara'],
      mAtrA_text_krama: ['O-mAtrA', 'o-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ਔ',
      mAtrA: 'ੌ',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ਰਿ',
      mAtrA: HALANT + 'ਰਿ',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara',
      prevent_auto_matching: true
    },
    {
      text: 'ਰੀ',
      mAtrA: HALANT + 'ਰੀ',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara',
      prevent_auto_matching: true
    },
    {
      text: 'ਲ੍ਰਿ',
      mAtrA: HALANT + 'ਲ੍ਰਿ',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara',
      prevent_auto_matching: true
    },
    {
      text: 'ਲ੍ਰੀ',
      mAtrA: HALANT + 'ਲ੍ਰੀ',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara',
      prevent_auto_matching: true
    },

    // vyanjana
    {
      text: 'ਕ',
      text_krama: ['k'],
      type: 'vyanjana'
    },
    {
      text: 'ਕ਼',
      text_krama: ['kz'],
      type: 'vyanjana'
    },
    {
      text: 'ਖ',
      text_krama: ['kh'],
      type: 'vyanjana'
    },
    {
      text: 'ਖ਼',
      text_krama: ['khz'],
      duplicates: ['ਖ਼'],
      type: 'vyanjana'
    },
    {
      text: 'ਗ',
      text_krama: ['g', 'g1'],
      type: 'vyanjana'
    },
    {
      text: 'ਗ਼',
      text_krama: ['gz'],
      duplicates: ['ਗ਼'],
      type: 'vyanjana'
    },
    {
      text: 'ਘ',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: 'ਙ',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: 'ਚ',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: 'ਛ',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: 'ਜ',
      text_krama: ['j', 'j1'],
      type: 'vyanjana'
    },
    {
      text: 'ਜ਼',
      text_krama: ['jz'],
      duplicates: ['ਜ਼'],
      type: 'vyanjana'
    },
    {
      text: 'ਝ',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: 'ਞ',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: 'ਟ',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: 'ਠ',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: 'ਡ',
      text_krama: ['D', 'D1'],
      type: 'vyanjana'
    },
    {
      text: 'ੜ',
      text_krama: ['Dz'],
      duplicates: ['ਡ਼'],
      type: 'vyanjana'
    },
    {
      text: 'ਢ',
      text_krama: ['Dh'],
      type: 'vyanjana'
    },
    {
      text: 'ੜ੍ਹ',
      text_krama: ['Dhz'],
      duplicates: ['ਢ਼'],
      type: 'vyanjana'
    },
    {
      text: 'ਣ',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: 'ਤ',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: 'ਥ',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: 'ਦ',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: 'ਧ',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: 'ਨ',
      text_krama: ['n'],
      type: 'vyanjana'
    },
    {
      text: 'ਨ਼',
      text_krama: ['nz'],
      type: 'vyanjana'
    },
    {
      text: 'ਪ',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: 'ਫ',
      text_krama: ['ph'],
      type: 'vyanjana'
    },
    {
      text: 'ਫ਼',
      text_krama: ['phz'],
      duplicates: ['ਫ਼'],
      type: 'vyanjana'
    },
    {
      text: 'ਬ',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: 'ਭ',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: 'ਮ',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: 'ਯ',
      text_krama: ['y'],
      type: 'vyanjana'
    },
    {
      text: 'ਯ਼',
      text_krama: ['yz'],
      type: 'vyanjana'
    },
    {
      text: 'ਰ',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: 'ਰ਼',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: 'ਲ',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: 'ਲ਼',
      text_krama: ['L', 'Lz'],
      type: 'vyanjana'
    },
    {
      text: 'ਵ',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: 'ਸ਼',
      text_krama: ['sh', 'Sh'],
      type: 'vyanjana'
    },
    {
      text: 'ਸ',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: 'ਹ',
      text_krama: ['h'],
      type: 'vyanjana'
    }
    // {
    //   text: 'ੰ',
    //   text_krama: [],
    //   type: 'anya'
    // },
    // {
    //   text: 'ੱ',
    //   text_krama: [],
    //   type: 'anya'
    // },
    // {
    //   text: 'ੲ',
    //   text_krama: [],
    //   type: 'vyanjana'
    // },
    // {
    //   text: 'ੳ',
    //   text_krama: [],
    //   type: 'vyanjana'
    // }
  ]
};

export default Gurumukhi;
