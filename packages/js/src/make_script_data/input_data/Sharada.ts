import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';

const Sharada = {
  script_type: 'brahmic',
  script_name: 'Sharada',
  script_id: script_list_obj['Sharada'],
  non_bmp_script: true,
  halant: '𑇀',
  nuqta: '𑇊',
  schwa_property: false,
  manual_krama_text_map: {
    '0': '𑇐',
    '1': '𑇑',
    '2': '𑇒',
    '3': '𑇓',
    '4': '𑇔',
    '5': '𑇕',
    '6': '𑇖',
    '7': '𑇗',
    '8': '𑇘',
    '9': '𑇙',
    AUM: '𑇄',
    anusvAra: '𑆁',
    anunAnAsika: '𑆀',
    visarga: '𑆂',
    saMkShepachihna: '॰',
    avagraha: '𑇁',
    halant: '𑇀',
    nuqta: '𑇊',
    anudAttA: '↓',
    'udAtta-1': '↑',
    'udAtta-2': '↑↑',
    'udAtta-3': '↑↑↑',
    virama: '𑇅',
    double_virama: '𑇆'
  },
  list: [
    {
      text: '𑆃',
      mAtrA: '',
      text_krama: ['a-svara'],
      mAtrA_text_krama: ['a-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆃𑇋',
      mAtrA: '𑇋',
      text_krama: ['a1-svara'],
      mAtrA_text_krama: ['a1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆃𑇋𑆳',
      mAtrA: '𑇋𑆳',
      text_krama: ['A1-svara'],
      mAtrA_text_krama: ['A1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆃𑇋𑆶',
      mAtrA: '𑇋𑆶',
      text_krama: ['u1-svara'],
      mAtrA_text_krama: ['u1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆃𑇋𑆷',
      mAtrA: '𑇋𑆷',
      text_krama: ['U1-svara'],
      mAtrA_text_krama: ['U1-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆄',
      mAtrA: '𑆳',
      text_krama: ['A-svara'],
      mAtrA_text_krama: ['A-mAtrA'],
      mAtrA_duplicates: ['𑇋𑆳'],
      type: 'svara'
    },
    {
      text: '𑆅',
      mAtrA: '𑆴',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆆',
      mAtrA: '𑆵',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆇',
      mAtrA: '𑆶',
      text_krama: ['u-svara'],
      mAtrA_text_krama: ['u-mAtrA'],
      mAtrA_duplicates: ['𑇋𑆶'],
      type: 'svara'
    },
    {
      text: '𑆈',
      mAtrA: '𑆷',
      text_krama: ['U-svara'],
      mAtrA_text_krama: ['U-mAtrA'],
      mAtrA_duplicates: ['𑇋𑆷'],
      type: 'svara'
    },
    {
      text: '𑆉',
      mAtrA: '𑆸',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆊',
      mAtrA: '𑆹',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆋',
      mAtrA: '𑆺',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆌',
      mAtrA: '𑆻',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆍',
      mAtrA: '𑆼',
      text_krama: ['E-svara', 'e-svara'],
      mAtrA_text_krama: ['E-mAtrA', 'e-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆎',
      mAtrA: '𑆽',
      text_krama: ['ai-svara', 'aiI-svara'],
      mAtrA_text_krama: ['ai-mAtrA', 'aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆏',
      mAtrA: '𑆾',
      text_krama: ['O-svara', 'o-svara'],
      mAtrA_text_krama: ['O-mAtrA', 'o-mAtrA'],
      type: 'svara'
    },
    {
      text: '𑆐',
      mAtrA: '𑆿',
      text_krama: ['au-svara', 'auU-svara'],
      mAtrA_text_krama: ['au-mAtrA', 'auU-mAtrA'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: '𑆑',
      text_krama: ['k'],
      type: 'vyanjana'
    },
    {
      text: '𑆑𑇊',
      text_krama: ['kz'],
      type: 'vyanjana'
    },
    {
      text: '𑆒',
      text_krama: ['kh'],
      type: 'vyanjana'
    },
    {
      text: '𑆒𑇊',
      text_krama: ['khz'],
      type: 'vyanjana'
    },
    {
      text: '𑆓',
      text_krama: ['g', 'g1'],
      type: 'vyanjana'
    },
    {
      text: '𑆓𑇊',
      text_krama: ['gz'],
      type: 'vyanjana'
    },
    {
      text: '𑆔',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: '𑆕',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: '𑆖',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: '𑆗',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: '𑆘',
      text_krama: ['j', 'j1'],
      type: 'vyanjana'
    },
    {
      text: '𑆘𑇊',
      text_krama: ['jz'],
      type: 'vyanjana'
    },
    {
      text: '𑆙',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: '𑆚',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: '𑆛',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: '𑆜',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: '𑆝',
      text_krama: ['D', 'D1'],
      type: 'vyanjana'
    },
    {
      text: '𑆝𑇊',
      text_krama: ['Dz'],
      type: 'vyanjana'
    },
    {
      text: '𑆞',
      text_krama: ['Dh'],
      type: 'vyanjana'
    },
    {
      text: '𑆞𑇊',
      text_krama: ['Dhz'],
      type: 'vyanjana'
    },
    {
      text: '𑆟',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: '𑆠',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: '𑆡',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: '𑆢',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: '𑆣',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: '𑆤',
      text_krama: ['n'],
      type: 'vyanjana'
    },
    {
      text: '𑆤𑇊',
      text_krama: ['nz'],
      type: 'vyanjana'
    },
    {
      text: '𑆥',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: '𑆦',
      text_krama: ['ph'],
      type: 'vyanjana'
    },
    {
      text: '𑆦𑇊',
      text_krama: ['phz'],
      type: 'vyanjana'
    },
    {
      text: '𑆧',
      text_krama: ['b', 'b1'],
      type: 'vyanjana'
    },
    {
      text: '𑆨',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: '𑆩',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: '𑆪',
      text_krama: ['y'],
      type: 'vyanjana'
    },
    {
      text: '𑆪𑇊',
      text_krama: ['yz'],
      type: 'vyanjana'
    },
    {
      text: '𑆫',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: '𑆫𑇊',
      text_krama: ['rz'],
      type: 'vyanjana'
    },
    {
      text: '𑆬',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: '𑆭',
      text_krama: ['L'],
      type: 'vyanjana'
    },
    {
      text: '𑆭𑇊',
      text_krama: ['Lz'],
      type: 'vyanjana'
    },
    {
      text: '𑆮',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: '𑆯',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: '𑆰',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: '𑆱',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: '𑆲',
      text_krama: ['h'],
      type: 'vyanjana'
    }
    // {
    //   text: '𑇚',
    //   text_krama: [],
    //   type: 'anya'
    // }
  ]
} satisfies InputBrahmicScriptType;

export default Sharada;
