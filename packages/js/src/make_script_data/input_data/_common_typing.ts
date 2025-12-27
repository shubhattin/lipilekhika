import type { InputTypingListDataType } from '../input_script_data_schema';

export const COMMON_SCRIPT_TYPING_DATA = [
  // context clear
  // pressing q will clear the context
  // to type q use qq
  {
    type: 'custom_script_char',
    specific_text: '',
    custom_normal_key: 'q'
  },
  {
    type: 'custom_script_char',
    specific_text: 'q',
    custom_normal_key: 'qq'
  },
  {
    // zero width joiner
    type: 'custom_script_char',
    specific_text: '\u200d',
    custom_normal_key: '.q'
  },

  // mAtrA
  {
    type: 'duplicates',
    ref_krama_key: 'A-svara',
    // as in normal svara and mAtrA forms so we dont have to add for it separately
    duplicates: ['aa']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'I-svara',
    duplicates: ['ii', 'ee']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'U-svara',
    duplicates: ['uu', 'oo']
  },

  // vyanjana and anya
  {
    type: 'duplicates',
    ref_krama_key: 'phz',
    duplicates: ['f']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'jz',
    duplicates: ['z']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'rz',
    duplicates: ['r1']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'nz',
    duplicates: ['n1']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'Lz',
    duplicates: ['zh']
  },

  // anya
  {
    type: 'duplicates',
    ref_krama_key: 'halant',
    duplicates: ['.h']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'avagraha',
    duplicates: [';']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'saMkShepachihna',
    duplicates: ['Q']
  },
  {
    // allow typing Q with QQ
    type: 'custom_script_char',
    specific_text: 'Q',
    custom_normal_key: 'QQ'
  }
] satisfies InputTypingListDataType[];

export const COMMON_NUMBER_TYPING_DATA = [
  {
    type: 'duplicates',
    ref_krama_key: '0',
    duplicates: ['.0']
  },
  {
    type: 'duplicates',
    ref_krama_key: '1',
    duplicates: ['.1']
  },
  {
    type: 'duplicates',
    ref_krama_key: '2',
    duplicates: ['.2']
  },
  {
    type: 'duplicates',
    ref_krama_key: '3',
    duplicates: ['.3']
  },
  {
    type: 'duplicates',
    ref_krama_key: '4',
    duplicates: ['.4']
  },
  {
    type: 'duplicates',
    ref_krama_key: '5',
    duplicates: ['.5']
  },
  {
    type: 'duplicates',
    ref_krama_key: '6',
    duplicates: ['.6']
  },
  {
    type: 'duplicates',
    ref_krama_key: '7',
    duplicates: ['.7']
  },
  {
    type: 'duplicates',
    ref_krama_key: '8',
    duplicates: ['.8']
  },
  {
    type: 'duplicates',
    ref_krama_key: '9',
    duplicates: ['.9']
  }
] satisfies InputTypingListDataType[];

export const COMMON_SVARA_MATRA_TYPING_DATA = [
  {
    type: 'duplicates',
    ref_krama_key: 'A-mAtrA',
    duplicates: ['.A']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'A1-mAtrA',
    duplicates: ['.A1']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'i-mAtrA',
    duplicates: ['.i']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'I-mAtrA',
    duplicates: ['.I']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'u-mAtrA',
    duplicates: ['.u']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'U-mAtrA',
    duplicates: ['.U']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'u1-mAtrA',
    duplicates: ['.u1']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'U1-mAtrA',
    duplicates: ['.U1']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'e-mAtrA',
    duplicates: ['.e']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'E-mAtrA',
    duplicates: ['.E']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'aiI-mAtrA',
    duplicates: ['.aiI']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'O-mAtrA',
    duplicates: ['.O']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'o-mAtrA',
    duplicates: ['.o']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'auU-mAtrA',
    duplicates: ['.auU']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'R-mAtrA',
    duplicates: ['.R']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'RR-mAtrA',
    duplicates: ['.RR']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'LR-mAtrA',
    duplicates: ['.LR']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'LRR-mAtrA',
    duplicates: ['.LRR']
  }
] satisfies InputTypingListDataType[];

export const COMMON_VEDIC_SANSKRIT_SYMBOLS = [
  // allows typing of vedic sanskrit symbols in normal script
  {
    type: 'duplicates',
    ref_krama_key: 'anudAttA',
    duplicates: ['_']
  },
  {
    type: 'duplicates',
    ref_krama_key: 'udAtta-3',
    duplicates: ["'''"]
  },
  {
    type: 'duplicates',
    ref_krama_key: 'udAtta-2',
    duplicates: ["''"]
  },
  {
    type: 'duplicates',
    ref_krama_key: 'udAtta-1',
    duplicates: ["'"]
  }
] satisfies InputTypingListDataType[];

export const DEVANAGARI_SPECIFIC_VEDIC_SANSKRIT_SYMBOLS = [
  {
    type: 'custom_script_char',
    specific_text: '꣠',
    custom_normal_key: '#0'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣡',
    custom_normal_key: '#1'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣢',
    custom_normal_key: '#2'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣣',
    custom_normal_key: '#3'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣤',
    custom_normal_key: '#4'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣥',
    custom_normal_key: '#5'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣦',
    custom_normal_key: '#6'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣧',
    custom_normal_key: '#7'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣨',
    custom_normal_key: '#8'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣩',
    custom_normal_key: '#9'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣱',
    custom_normal_key: "#'"
  },
  {
    type: 'custom_script_char',
    specific_text: 'ꣳ',
    custom_normal_key: '#M'
  },
  {
    type: 'custom_script_char',
    specific_text: 'ꣲ',
    custom_normal_key: '#M1'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣫',
    custom_normal_key: '#u'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣬',
    custom_normal_key: '#k'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣭',
    custom_normal_key: '#n'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣮',
    custom_normal_key: '#p'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣯',
    custom_normal_key: '#r'
  },
  {
    type: 'custom_script_char',
    specific_text: '꣰',
    custom_normal_key: '#v'
  },
  {
    type: 'custom_script_char',
    specific_text: 'ᳵ',
    custom_normal_key: '#H'
  },
  {
    type: 'custom_script_char',
    specific_text: 'ᳶ',
    custom_normal_key: '#H1'
  }
] satisfies InputTypingListDataType[];
