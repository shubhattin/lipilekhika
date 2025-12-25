import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';
import {
  COMMON_NUMBER_TYPING_DATA,
  COMMON_SCRIPT_TYPING_DATA,
  COMMON_SVARA_MATRA_TYPING_DATA,
  COMMON_VEDIC_SANSKRIT_SYMBOLS,
  DEVANAGARI_SPECIFIC_VEDIC_SANSKRIT_SYMBOLS
} from './_common_typing';

const Devanagari: InputBrahmicScriptType = {
  script_type: 'brahmic',
  script_name: 'Devanagari',
  script_id: script_list_obj['Devanagari'],
  halant: '्',
  nuqta: '़',
  schwa_property: false,
  typing_list: [
    ...COMMON_SCRIPT_TYPING_DATA,
    ...COMMON_NUMBER_TYPING_DATA,
    ...COMMON_SVARA_MATRA_TYPING_DATA,
    ...COMMON_VEDIC_SANSKRIT_SYMBOLS,
    ...DEVANAGARI_SPECIFIC_VEDIC_SANSKRIT_SYMBOLS
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
    anusvAra: 'ं',
    anunAnAsika: 'ँ',
    visarga: 'ः',
    saMkShepachihna: '॰',
    avagraha: 'ऽ',
    halant: '्',
    nuqta: '़',
    anudAttA: '॒',
    'svarita-1': '॑',
    'svarita-2': '᳚',
    'svarita-3': '᳛',
    virama: '।',
    double_virama: '॥'
  },
  list: [
    // Svara
    {
      text: 'अ',
      mAtrA: '',
      text_krama: ['a-svara', 'a1-svara'],
      mAtrA_text_krama: ['a-mAtrA', 'a1-mAtrA'],
      duplicates: ['ॳ'],
      mAtrA_duplicates: ['ऺ'],
      type: 'svara'
    },
    {
      text: 'आ',
      mAtrA: 'ा',
      text_krama: ['A-svara', 'A1-svara'],
      mAtrA_text_krama: ['A-mAtrA', 'A1-mAtrA'],
      duplicates: ['ॴ'],
      mAtrA_duplicates: ['ऻ'],
      type: 'svara'
    },
    {
      text: 'इ',
      mAtrA: 'ि',
      text_krama: ['i-svara'],
      mAtrA_text_krama: ['i-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ई',
      mAtrA: 'ी',
      text_krama: ['I-svara'],
      mAtrA_text_krama: ['I-mAtrA'],
      type: 'svara'
    },
    {
      text: 'उ',
      mAtrA: 'ु',
      text_krama: ['u-svara', 'u1-svara'],
      mAtrA_text_krama: ['u-mAtrA', 'u1-mAtrA'],
      duplicates: ['ॶ'],
      mAtrA_duplicates: ['ॖ'],
      type: 'svara'
    },
    {
      text: 'ऊ',
      mAtrA: 'ू',
      text_krama: ['U-svara', 'U1-svara'],
      mAtrA_text_krama: ['U-mAtrA', 'U1-mAtrA'],
      duplicates: ['ॷ'],
      mAtrA_duplicates: ['ॗ'],
      type: 'svara'
    },
    {
      text: 'ऋ',
      mAtrA: 'ृ',
      text_krama: ['R-svara'],
      mAtrA_text_krama: ['R-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ॠ',
      mAtrA: 'ॄ',
      text_krama: ['RR-svara'],
      mAtrA_text_krama: ['RR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ऌ',
      mAtrA: 'ॢ',
      text_krama: ['LR-svara'],
      mAtrA_text_krama: ['LR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ॡ',
      mAtrA: 'ॣ',
      text_krama: ['LRR-svara'],
      mAtrA_text_krama: ['LRR-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ऍ',
      mAtrA: 'ॅ',
      text_krama: ['aiI-svara'],
      mAtrA_text_krama: ['aiI-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ए',
      mAtrA: 'े',
      text_krama: ['E-svara', 'e-svara'],
      mAtrA_text_krama: ['E-mAtrA', 'e-mAtrA'],
      duplicates: ['ऎ'],
      mAtrA_duplicates: ['ॆ'],
      type: 'svara'
    },
    {
      text: 'ऐ',
      mAtrA: 'ै',
      text_krama: ['ai-svara'],
      mAtrA_text_krama: ['ai-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ऑ',
      mAtrA: 'ॉ',
      text_krama: ['auU-svara'],
      mAtrA_text_krama: ['auU-mAtrA'],
      type: 'svara'
    },
    {
      text: 'ओ',
      mAtrA: 'ो',
      text_krama: ['O-svara', 'o-svara'],
      mAtrA_text_krama: ['O-mAtrA', 'o-mAtrA'],
      duplicates: ['ऒ'],
      mAtrA_duplicates: ['ॊ'],
      type: 'svara'
    },
    {
      text: 'औ',
      mAtrA: 'ौ',
      text_krama: ['au-svara'],
      mAtrA_text_krama: ['au-mAtrA'],
      type: 'svara'
    },

    // Vyanjana
    {
      text: 'क',
      text_krama: ['k'],
      type: 'vyanjana'
    },
    {
      text: 'क़',
      text_krama: ['kz'],
      duplicates: ['क़'],
      type: 'vyanjana'
    },
    {
      text: 'ख़',
      text_krama: ['khz'],
      duplicates: ['ख़'],
      type: 'vyanjana'
    },
    {
      text: 'ख',
      text_krama: ['kh'],
      type: 'vyanjana'
    },
    {
      text: 'ग',
      text_krama: ['g', 'g1'],
      duplicates: ['ॻ'],
      type: 'vyanjana'
    },
    {
      text: 'ग़',
      text_krama: ['gz'],
      duplicates: ['ग़'],
      type: 'vyanjana'
    },
    {
      text: 'घ',
      text_krama: ['gh'],
      type: 'vyanjana'
    },
    {
      text: 'ङ',
      text_krama: ['G'],
      type: 'vyanjana'
    },
    {
      text: 'च',
      text_krama: ['C'],
      type: 'vyanjana'
    },
    {
      text: 'छ',
      text_krama: ['Ch'],
      type: 'vyanjana'
    },
    {
      text: 'ज',
      text_krama: ['j', 'j1'],
      duplicates: ['ॼ'],
      type: 'vyanjana'
    },
    {
      text: 'ज़',
      text_krama: ['jz'],
      duplicates: ['ज़'],
      type: 'vyanjana'
    },
    {
      text: 'झ',
      text_krama: ['jh'],
      type: 'vyanjana'
    },
    {
      text: 'ञ',
      text_krama: ['J'],
      type: 'vyanjana'
    },
    {
      text: 'ट',
      text_krama: ['T'],
      type: 'vyanjana'
    },
    {
      text: 'ठ',
      text_krama: ['Th'],
      type: 'vyanjana'
    },
    {
      text: 'ड',
      text_krama: ['D', 'D1'],
      duplicates: ['ॾ'],
      type: 'vyanjana'
    },
    {
      text: 'ड़',
      text_krama: ['Dz'],
      duplicates: ['ड़'],
      type: 'vyanjana'
    },
    {
      text: 'ढ',
      text_krama: ['Dh'],
      type: 'vyanjana'
    },
    {
      text: 'ढ़',
      text_krama: ['Dhz'],
      duplicates: ['ढ़'],
      type: 'vyanjana'
    },
    {
      text: 'ण',
      text_krama: ['N'],
      type: 'vyanjana'
    },
    {
      text: 'त',
      text_krama: ['t'],
      type: 'vyanjana'
    },
    {
      text: 'थ',
      text_krama: ['th'],
      type: 'vyanjana'
    },
    {
      text: 'द',
      text_krama: ['d'],
      type: 'vyanjana'
    },
    {
      text: 'ध',
      text_krama: ['dh'],
      type: 'vyanjana'
    },
    {
      text: 'न',
      text_krama: ['n'],
      type: 'vyanjana'
    },
    {
      text: 'ऩ',
      text_krama: ['nz'],
      duplicates: ['ऩ'],
      type: 'vyanjana'
    },
    {
      text: 'प',
      text_krama: ['p'],
      type: 'vyanjana'
    },
    {
      text: 'फ',
      text_krama: ['ph'],
      type: 'vyanjana'
    },
    {
      text: 'फ़',
      text_krama: ['phz'],
      duplicates: ['फ़'],
      type: 'vyanjana'
    },
    {
      text: 'ब',
      text_krama: ['b', 'b1'],
      duplicates: ['ॿ'],
      type: 'vyanjana'
    },
    {
      text: 'भ',
      text_krama: ['bh'],
      type: 'vyanjana'
    },
    {
      text: 'म',
      text_krama: ['m'],
      type: 'vyanjana'
    },
    {
      text: 'य',
      text_krama: ['y'],
      type: 'vyanjana'
    },
    {
      text: 'य़',
      text_krama: ['yz'],
      duplicates: ['य़'],
      type: 'vyanjana'
    },
    {
      text: 'र',
      text_krama: ['r'],
      type: 'vyanjana'
    },
    {
      text: 'ऱ',
      text_krama: ['rz'],
      duplicates: ['ऱ'],
      type: 'vyanjana'
    },
    {
      text: 'ल',
      text_krama: ['l'],
      type: 'vyanjana'
    },
    {
      text: 'ळ',
      text_krama: ['L'],
      type: 'vyanjana'
    },
    {
      text: 'ऴ',
      text_krama: ['Lz'],
      duplicates: ['ऴ'],
      type: 'vyanjana'
    },
    {
      text: 'व',
      text_krama: ['v'],
      type: 'vyanjana'
    },
    {
      text: 'श',
      text_krama: ['sh'],
      type: 'vyanjana'
    },
    {
      text: 'ष',
      text_krama: ['Sh'],
      type: 'vyanjana'
    },
    {
      text: 'स',
      text_krama: ['s'],
      type: 'vyanjana'
    },
    {
      text: 'ह',
      text_krama: ['h'],
      type: 'vyanjana'
    }
  ]
};

export default Devanagari;
