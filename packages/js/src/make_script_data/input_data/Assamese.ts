import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';
import Bengali from './Bengali';

const Assamese = JSON.parse(JSON.stringify(Bengali)) satisfies InputBrahmicScriptType;

Assamese.script_name = 'Assamese';
Assamese.script_id = script_list_obj['Assamese'];

// Changes are there in the ra and va
// ba and va
const prev_bengali_ba = Bengali.list.findIndex((item) => item.text === 'ব');
Assamese.list[prev_bengali_ba] = {
  text: 'ব',
  text_krama: ['b', 'b1'],
  type: 'vyanjana'
} satisfies InputBrahmicScriptType['list'][number];
Assamese.list.push({
  text: 'ৱ',
  text_krama: ['v'],
  type: 'vyanjana'
});
const prev_bengali_ra = Bengali.list.findIndex((item) => item.text === 'র');
Assamese.list[prev_bengali_ra] = {
  text: 'ৰ',
  text_krama: ['r'],
  duplicates: ['র'],
  type: 'vyanjana'
} satisfies InputBrahmicScriptType['list'][number];

export default Assamese;
