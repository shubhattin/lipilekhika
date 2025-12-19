import { z } from 'zod';
import type { script_and_lang_list_type } from '../utils/lang_list';
import { createTypingContext } from '..';

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

export async function emulateTyping(text: string, typing_lang: script_and_lang_list_type) {
  const ctx = createTypingContext(typing_lang);
  let result = '';
  for (const char of text) {
    const { output, context_length } = await ctx.takeKeyInput(char);
    if (context_length === 0) {
      result += output;
    }
  }
  const last_output = ctx.getCurrentOutput();
  if (last_output.length > 0) {
    result += last_output;
  }
  return result;
}
