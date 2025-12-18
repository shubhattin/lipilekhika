import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';
import Bengali from './Bengali';

const Assamese = JSON.parse(JSON.stringify(Bengali)) as InputBrahmicScriptType;

Assamese.script_name = 'Assamese';
Assamese.script_id = script_list_obj['Assamese'];

// Changes are there in the ra and va
// ba and va
const prev_bengali_ba = Bengali.list.findIndex((item) => item.text === 'ব');
type AssameseListType = InputBrahmicScriptType['list'][number];
Assamese.list[prev_bengali_ba] = {
  text: 'ব',
  text_krama: ['b', 'b1'],
  type: 'vyanjana'
} satisfies AssameseListType;
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
} as AssameseListType;
const prev_bengali_ra_nuqta = Bengali.list.findIndex((item) => item.text === 'র' + Bengali.nuqta);
Assamese.list[prev_bengali_ra_nuqta] = {
  text: 'ৰ' + Bengali.nuqta,
  text_krama: ['rz'],
  duplicates: ['র' + Bengali.nuqta],
  type: 'vyanjana'
} as AssameseListType;
export default Assamese;
