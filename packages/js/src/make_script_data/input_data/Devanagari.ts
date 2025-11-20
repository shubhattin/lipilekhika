import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';

const Devanagari: InputBrahmicScriptType = {
  script_name: 'Devanagari',
  script_id: script_list_obj['Devanagari'],
  script_type: 'brahmic',
  halant: '्',
  nuqta: '़',
  //  No schwa property for Devanagari(Sanskrit)
  schwa_property: false,
  list: []
  // manual_krama_key_map: {}
};

export default Devanagari;
