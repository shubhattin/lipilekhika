import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';

const Sinhala = {
  script_type: 'brahmic',
  script_name: 'Sinhala',
  script_id: script_list_obj['Sinhala'],
  halant: '්',
  schwa_property: false,
  manual_krama_text_map: {
    '0': '෦',
    '1': '෧',
    '2': '෨',
    '3': '෩',
    '4': '෪',
    '5': '෫',
    '6': '෬',
    '7': '෭',
    '8': '෮',
    '9': '෯',
    AUM: 'ॐ',
    anusvAra: 'ං',
    anunAnAsika: 'ඁ',
    visarga: 'ඃ',
    saMkShepachihna: '॰',
    avagraha: 'ऽ',
    // Devanagari avagraha as not there in Sinhala
    halant: '්',
    anudAttA: '॒',
    'udAtta-1': '॑',
    'udAtta-2': '᳚',
    'udAtta-3': '᳛',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    {
      text: 'අ',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ආ',
      mAtrA: 'ා',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඇ',
      mAtrA: 'ැ',
      text_krama: ['aiI-svara'],
      mAtrA_text_krama: ['aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඈ',
      mAtrA: 'ෑ',
      text_krama: ['auU-svara'],
      mAtrA_text_krama: ['auU-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඉ',
      mAtrA: 'ි',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඊ',
      mAtrA: 'ී',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: 'උ',
      mAtrA: 'ු',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඌ',
      mAtrA: 'ූ',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඍ',
      mAtrA: 'ෘ',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඎ',
      mAtrA: 'ෲ',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඏ',
      mAtrA: 'ෟ',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඐ',
      mAtrA: 'ෳ',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'එ',
      mAtrA: 'ෙ',
      text_krama: ['e-svara'],
      mAtrA_text_krama: ['e-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඒ',
      mAtrA: 'ේ',
      text_krama: ['E-svara'],
      mAtrA_text_krama: ['E-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඓ',
      mAtrA: 'ෛ',
      text_krama: ['ai-svara'],
      mAtrA_text_krama: ['ai-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ඔ',
      mAtrA: 'ො',
      text_krama: ['o-svara'],
      mAtrA_text_krama: ['o-mAtrA'],
      mAtrA_duplicates: ['ො'],
      type: 'svara'
    },
    {
      text: 'ඕ',
      mAtrA: 'ෝ',
      text_krama: ['O-svara'],
      mAtrA_text_krama: ['O-mAtrA'],
      mAtrA_duplicates: ['ෝ'],
      type: 'svara'
    },
    {
      text: 'ඖ',
      mAtrA: 'ෞ',
      text_krama: ['au-svara'],
      mAtrA_text_krama: ['au-mAtrA'],
      mAtrA_duplicates: ['ෞ'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: 'ක',
      text_krama: ['k', 'kz'],
      type: 'vyanjana'
    },
    {
      text: 'ඛ',
      text_krama: ['kh', 'khz'],
      type: 'vyanjana'
    },
    {
      text: 'ග',
      text_krama: ['g', 'g1', 'gz'],
      type: 'vyanjana'
    },
    {
      text: 'ඝ',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: 'ඞ',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: 'ච',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: 'ඡ',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: 'ජ',
      text_krama: ['j', 'j1', 'jz'],
      type: 'vyanjana'
    },
    {
      text: 'ඣ',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: 'ඤ',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: 'ඥ',
      text_krama: [],
      fallback: ['J', 'halant', 'j'],
      type: 'vyanjana'
    },
    {
      text: 'ට',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: 'ඨ',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: 'ඩ',
      text_krama: ['D', 'D1', 'Dz'],
      type: 'vyanjana'
    },
    {
      text: 'ඪ',
      text_krama: ['Dh', 'Dhz'],
      type: 'vyanjana'
    },
    {
      text: 'ණ',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: 'ඬ',
      text_krama: [],
      fallback: ['N', 'halant', 'D'],
      type: 'vyanjana'
    },
    {
      text: 'ත',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: 'ථ',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: 'ද',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: 'ධ',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: 'න',
      text_krama: ['n', 'nz'],
      type: 'vyanjana'
    },
    {
      text: 'ඳ',
      text_krama: [],
      fallback: ['n', 'halant', 'd'],
      type: 'vyanjana'
    },
    {
      text: 'ප',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: 'ඵ',
      text_krama: ['ph'],
      type: 'vyanjana'
    },

    {
      text: 'ෆ',
      text_krama: ['phz'],
      type: 'vyanjana'
    },
    {
      text: 'බ',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: 'භ',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: 'ම',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: 'ඹ',
      text_krama: [],
      fallback: ['m', 'halant', 'b'],
      type: 'vyanjana'
    },
    {
      text: 'ය',
      text_krama: ['y', 'yz'],
      type: 'vyanjana'
    },
    {
      text: 'ර',
      text_krama: ['r', 'rz'],
      type: 'vyanjana'
    },
    {
      text: 'ල',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: 'ව',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: 'ශ',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: 'ෂ',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: 'ස',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: 'හ',
      text_krama: ['h'],
      type: 'vyanjana'
    },
    {
      text: 'ළ',
      text_krama: ['L', 'Lz'],
      type: 'vyanjana'
    }
  ]
} satisfies InputBrahmicScriptType;

export default Sinhala;
