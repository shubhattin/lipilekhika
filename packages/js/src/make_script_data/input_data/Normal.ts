import { script_list_obj } from '../../utils/lang_list';
import type { InputOtherScriptType } from '../input_script_data_schema';

const Normal = {
  script_name: 'Normal',
  script_id: script_list_obj['Normal'],
  script_type: 'other',
  manual_krama_text_map: {
    क: 'k',
    ख: 'kh',
    च: 'C',
    छ: 'Ch'
  },
  list: [
    {
      text: 'C',
      text_krama: ['च'],
      duplicates: ['ch']
    },
    {
      text: 'Ch',
      text_krama: ['छ'],
      duplicates: ['chh']
    }
  ]
} satisfies InputOtherScriptType;

export default Normal;
