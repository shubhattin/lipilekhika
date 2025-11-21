import { script_list_obj } from '../../utils/lang_list';
import type { InputOtherScriptType } from '../input_script_data_schema';

const Normal = {
  script_name: 'Normal',
  script_id: script_list_obj['Normal'],
  script_type: 'other',
  manual_krama_text_map: {
    k: 'k',
    kh: 'kh',
    C: 'C',
    Ch: 'Ch'
  },
  list: [
    {
      text: 'C',
      text_krama: ['C'],
      duplicates: ['ch']
    },
    {
      text: 'Ch',
      text_krama: ['Ch'],
      duplicates: ['chh']
    }
  ]
} satisfies InputOtherScriptType;

export default Normal;
