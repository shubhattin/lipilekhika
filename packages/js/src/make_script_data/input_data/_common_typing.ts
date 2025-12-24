import type { InputTypingListDataType } from '../input_script_data_schema';

export const COMMON_SCRIPT_TYPING_DATA = [
  // duplicates

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
  },
  {
    type: 'duplicates',
    ref_krama_key: 'Lz',
    duplicates: ['zh']
  }
] satisfies InputTypingListDataType[];
