import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';

const Gujarati: InputBrahmicScriptType = {
  script_name: 'Gujarati',
  script_id: script_list_obj['Gujarati'],
  script_type: 'brahmic',
  halant: '્',
  nuqta: '઼',
  //  No schwa property for Gujarati Language
  schwa_property: true,
  list: []
  // manual_krama_key_map: {}
};

export default Gujarati;
