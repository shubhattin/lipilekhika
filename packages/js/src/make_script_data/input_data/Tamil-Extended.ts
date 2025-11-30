import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';

const Tamil_Extended = {
  script_type: 'brahmic',
  script_name: 'Tamil-Extended',
  script_id: script_list_obj['Tamil-Extended'],
  halant: '்',
  schwa_property: false,
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
    AUM: 'ॐ',
    anusvAra: 'ம்²',
    anunAnAsika: 'ம்³',
    visarga: 'ஃ',
    saMkShepachihna: '॰',
    avagraha: 'ऽ',
    halant: '்',
    anudAttA: '॒',
    'udAtta-1': '॑',
    'udAtta-2': '᳚',
    'udAtta-3': '᳛',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    {
      text: 'அ',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ஆ',
      mAtrA: 'ா',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'இ',
      mAtrA: 'ி',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ஈ',
      mAtrA: 'ீ',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: 'உ',
      mAtrA: 'ு',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ஊ',
      mAtrA: 'ூ',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      type: 'svara'
    },
    {
      text: 'எ',
      mAtrA: 'ெ',
      text_krama: ['e-svara'],
      mAtrA_text_krama: ['e-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ஏ',
      mAtrA: 'ே',
      text_krama: ['E-svara'],
      mAtrA_text_krama: ['E-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ஐ',
      mAtrA: 'ை',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ஒ',
      mAtrA: 'ொ',
      text_krama: ['o-svara'],
      mAtrA_text_krama: ['o-mAtrA'],
      mAtrA_duplicates: ['ொ'],
      type: 'svara'
    },
    {
      text: 'ஓ',
      mAtrA: 'ோ',
      text_krama: ['O-svara'],
      mAtrA_text_krama: ['O-mAtrA'],
      mAtrA_duplicates: ['ோ'],
      type: 'svara'
    },
    {
      text: 'ஔ',
      mAtrA: 'ௌ',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      mAtrA_duplicates: ['ௌ'],
      type: 'svara'
    },
    {
      text: 'ரு²',
      mAtrA: 'ிரு²',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ரூ²',
      mAtrA: 'ிரூ²',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ல்ரி²',
      mAtrA: '்ல்ரி²',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ல்ரீ²',
      mAtrA: '்ல்ரீ²',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: 'க',
      text_krama: ['k', 'kz', 'kh', 'khz', 'g', 'gz', 'g1', 'gh'],
      type: 'vyanjana'
    },
    {
      text: 'க²',
      text_krama: ['kh', 'khz'],
      type: 'vyanjana'
    },
    {
      text: 'க³',
      text_krama: ['g', 'gz', 'g1'],
      type: 'vyanjana'
    },
    {
      text: 'க⁴',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: 'ங',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: 'ச',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: 'ச²',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: 'ஜ',
      text_krama: ['j', 'jz', 'j1'],
      type: 'vyanjana'
    },
    {
      text: 'ஜ²',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: 'ஞ',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: 'ட',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: 'ட²',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: 'ட³',
      text_krama: ['D', 'Dz', 'D1'],
      type: 'vyanjana'
    },
    {
      text: 'ட⁴',
      text_krama: ['Dh', 'Dhz'],
      type: 'vyanjana'
    },
    {
      text: 'ண',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: 'த',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: 'த²',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: 'த³',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: 'த⁴',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: 'ந',
      text_krama: ['n'],
      type: 'vyanjana'
    },
    {
      text: 'ன',
      text_krama: ['nz'],
      type: 'vyanjana'
    },
    {
      text: 'ப',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: 'ப²',
      text_krama: ['ph', 'phz'],
      type: 'vyanjana'
    },
    {
      text: 'ப³',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: 'ப⁴',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: 'ம',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: 'ய',
      text_krama: ['y', 'yz'],
      type: 'vyanjana'
    },
    {
      text: 'ர',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: 'ற',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: 'ல',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: 'ள',
      text_krama: ['L'],
      type: 'vyanjana'
    },
    {
      text: 'ழ',
      text_krama: ['Lz'],
      type: 'vyanjana'
    },
    {
      text: 'வ',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: 'ஶ',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: 'ஷ',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: 'ஸ',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: 'ஹ',
      text_krama: ['h'],
      type: 'vyanjana'
    },
    // Numerals
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
      text_krama: [],
      fallback: ['1', '0', '0', '0'],
      type: 'anya'
    }
    // {
    //   text: '௳',
    //   text_krama: [],
    //   type: 'anya'
    // },
    // {
    //   text: '௴',
    //   text_krama: [],
    //   type: 'anya'
    // },
    // {
    //   text: '௵',
    //   text_krama: [],
    //   type: 'anya'
    // }
  ]
} satisfies InputBrahmicScriptType;

export default Tamil_Extended;
