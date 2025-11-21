import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';

const Devanagari = {
  script_name: 'Devanagari',
  script_id: script_list_obj['Devanagari'],
  script_type: 'brahmic',
  halant: '्',
  nuqta: '़',
  //  No schwa property for Devanagari(Sanskrit)
  schwa_property: false,
  list: [
    {
      text: 'अ',
      type: 'svara',
      mAtrA: '',
      mAtrA_text_krama: ['a-mAtrA'],
      text_krama: ['a-svara']
    },
    {
      text: 'ए',
      type: 'svara',
      mAtrA: 'े',
      mAtrA_text_krama: ['e-mAtrA', 'E-mAtrA'],
      text_krama: ['e-svara', 'E-svara']
    }
  ]
  // manual_krama_key_map: {}
} satisfies InputBrahmicScriptType;

export default Devanagari;
