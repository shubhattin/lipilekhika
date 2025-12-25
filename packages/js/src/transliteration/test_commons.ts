import { z } from 'zod';
import type { script_and_lang_list_type } from '../utils/lang_list';
import { createTypingContext } from '../typing';
import { VEDIC_SVARAS, TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS } from './helpers';

export const TestDataTypeSchema = z.object({
  index: z.number(),
  from: z.string(),
  to: z.string(),
  input: z.string(),
  output: z.string(),
  reversible: z.boolean().optional(),
  todo: z.boolean().optional(),
  options: z.record(z.string(), z.boolean()).optional()
});

type Options = Parameters<typeof createTypingContext>[1];
export async function emulateTyping(
  text: string,
  typing_lang: script_and_lang_list_type,
  options?: Options
) {
  const ctx = createTypingContext(typing_lang, options);
  await ctx.ready;
  let result = '';
  for (const char of text) {
    const { diff_add_text, to_delete_chars_count } = ctx.takeKeyInput(char);
    if (to_delete_chars_count > 0) {
      result = result.slice(0, -to_delete_chars_count);
    }
    result += diff_add_text;
  }
  return result;
}

export const patch_old_tamil_extended_vedic_text = (text: string) => {
  for (const svara of VEDIC_SVARAS) {
    for (const num of TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS) {
      text = text.replace(num + svara, svara + num);
    }
  }
  return text;
};
