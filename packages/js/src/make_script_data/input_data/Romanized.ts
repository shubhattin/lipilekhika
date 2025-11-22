import { script_list_obj } from '../../utils/lang_list';
import type { InputOtherScriptType } from '../input_script_data_schema';

const Romanized = {
  script_name: 'Romanized',
  script_id: script_list_obj['Romanized'],
  script_type: 'other',
  manual_krama_text_map: {}
  //   list: []
} satisfies InputOtherScriptType;

export default Romanized;
