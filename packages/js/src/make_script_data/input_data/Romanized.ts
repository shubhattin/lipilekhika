import { script_list_obj } from '../../utils/lang_list';
import type { InputOtherScriptType } from '../input_script_data_schema';

const Romanized: InputOtherScriptType = {
  script_name: 'Romanized',
  script_id: script_list_obj['Romanized'],
  script_type: 'other',
  manual_krama_key_map: {}
  //   list: []
};

export default Romanized;
