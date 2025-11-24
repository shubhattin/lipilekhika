import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';

const Bengali = {
  script_type: 'brahmic',
  script_name: 'Bengali',
  script_id: script_list_obj['Bengali'],
  halant: '্',
  nuqta: '়',
  schwa_property: true,
  manual_krama_text_map: {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
    AUM: 'ওঁ',
    anusvAra: 'ং',
    anunAnAsika: 'ঁ',
    visarga: 'ঃ',
    saMkShepachihna: '॰',
    avagraha: 'ঽ',
    halant: '্',
    nuqta: '়',
    anudAttA: '॒',
    'udAtta-1': '॑',
    'udAtta-2': '᳚',
    'udAtta-3': '᳛',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    // Svara
    {
      text: 'অ',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'আ',
      mAtrA: 'া',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ই',
      mAtrA: 'ি',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ঈ',
      mAtrA: 'ী',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: 'উ',
      mAtrA: 'ু',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ঊ',
      mAtrA: 'ূ',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ঋ',
      mAtrA: 'ৃ',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ৠ',
      mAtrA: 'ৄ',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ঌ',
      mAtrA: 'ৢ',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ৡ',
      mAtrA: 'ৣ',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'এ',
      mAtrA: 'ে',
      text_krama: ['E-svara', 'e-svara'],
      mAtrA_text_krama: ['E-mAtrA', 'e-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ঐ',
      mAtrA: 'ৈ',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ও',
      mAtrA: 'ো',
      text_krama: ['O-svara', 'o-svara'],
      mAtrA_text_krama: ['O-mAtrA', 'o-mAtrA'],
      mAtrA_duplicates: ['ো'],
      type: 'svara'
    },
    {
      text: 'ঔ',
      mAtrA: 'ৌ',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      mAtrA_duplicates: ['ৌ'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: 'ক',
      text_krama: ['k'],
      type: 'vyanjana'
    },
    {
      text: 'ক়',
      text_krama: ['kz'],
      type: 'vyanjana'
    },
    {
      text: 'খ',
      text_krama: ['kh'],
      type: 'vyanjana'
    },
    {
      text: 'খ়',
      text_krama: ['khz'],
      type: 'vyanjana'
    },
    {
      text: 'গ',
      text_krama: ['g', 'g1'],
      type: 'vyanjana'
    },
    {
      text: 'গ়',
      text_krama: ['gz'],
      type: 'vyanjana'
    },
    {
      text: 'ঘ',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: 'ঙ',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: 'চ',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: 'ছ',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: 'জ',
      text_krama: ['j', 'j1'],
      type: 'vyanjana'
    },
    {
      text: 'জ়',
      text_krama: ['jz'],
      type: 'vyanjana'
    },
    {
      text: 'ঝ',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: 'ঞ',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: 'ট',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: 'ঠ',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: 'ড',
      text_krama: ['D', 'D1'],
      type: 'vyanjana'
    },
    {
      text: 'ড়',
      text_krama: ['Dz'],
      duplicates: ['ড়'],
      type: 'vyanjana'
    },
    {
      text: 'ঢ',
      text_krama: ['Dh'],
      type: 'vyanjana'
    },
    {
      text: 'ঢ়',
      text_krama: ['Dhz'],
      duplicates: ['ঢ়'],
      type: 'vyanjana'
    },
    {
      text: 'ণ',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: 'ত',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: 'থ',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: 'দ',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: 'ধ',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: 'ন',
      text_krama: ['n'],
      type: 'vyanjana'
    },
    {
      text: 'ন়',
      text_krama: ['nz'],
      type: 'vyanjana'
    },
    {
      text: 'প',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: 'ফ',
      text_krama: ['ph'],
      type: 'vyanjana'
    },
    {
      text: 'ফ়',
      text_krama: ['phz'],
      type: 'vyanjana'
    },
    {
      text: 'ব',
      text_krama: ['b', 'v', 'b1'],
      type: 'vyanjana'
    },
    {
      text: 'ভ',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: 'ম',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: 'য',
      text_krama: ['y'],
      type: 'vyanjana'
    },
    {
      text: 'য়',
      text_krama: ['yz'],
      duplicates: ['য়'],
      type: 'vyanjana'
    },
    {
      text: 'র',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: 'র়',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: 'ল',
      text_krama: ['l', 'L'],
      type: 'vyanjana'
    },
    {
      text: 'ল়',
      text_krama: ['Lz'],
      type: 'vyanjana'
    },
    {
      text: 'শ',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: 'ষ',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: 'স',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: 'হ',
      text_krama: ['h'],
      type: 'vyanjana'
    }
  ]
} satisfies InputBrahmicScriptType;

export default Bengali;
