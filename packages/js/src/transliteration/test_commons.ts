import { z } from 'zod';
import type { script_and_lang_list_type } from '../utils/lang_list';
import { createTypingContext } from '../typing';

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
/**
 * Simulates typing a string using a typing context for the specified script/language.
 *
 * @param text - Input characters to feed to the typing context in order
 * @param typing_lang - Script and language selector used to create the typing context
 * @param options - Optional configuration forwarded to create the typing context
 * @returns The resulting string after applying the typing context's additions and deletions for each input character
 */
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