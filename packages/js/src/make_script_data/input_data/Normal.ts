import { script_list_obj } from '../../utils/lang_list';
import type { InputOtherScriptType } from '../input_script_data_schema';

const Normal: InputOtherScriptType = {
  script_name: 'Normal',
  script_id: script_list_obj['Normal'],
  script_type: 'other',
  manual_krama_key_map: {}
  //   list: []
};

export default Normal;
