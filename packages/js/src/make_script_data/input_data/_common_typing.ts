import type { InputTypingListDataType } from '../input_script_data_schema';

export const COMMON_SCRIPT_TYPING_DATA = [
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
  }, // duplicates

  {
    type: 'duplicates',
    ref_krama_key: 'Lz',
    duplicates: ['zh']
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
