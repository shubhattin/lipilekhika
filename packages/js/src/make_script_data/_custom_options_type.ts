// import type { TransOptionsType } from './custom_options_input';
import { z } from 'zod';
import { SCRIPT_LIST } from '../index';

const CheckInEnum = z.enum(['input', 'output']);
const ScriptTypeEnum = z.enum(['brahmic', 'other', 'all']);

export const CustomOptionsSchema = z.record(
  z.string(),
  z.strictObject({
    from_script_name: z.enum(SCRIPT_LIST).array().optional(),
    from_script_type: ScriptTypeEnum.optional(),
    to_script_name: z.enum(SCRIPT_LIST).array().optional(),
    to_script_type: ScriptTypeEnum.optional(),
    check_in: CheckInEnum.optional(),
    rules: z
      .discriminatedUnion('type', [
        z.strictObject({
          type: z.literal('replace_prev_krama_keys'),
          prev: z.array(z.int()),
          following: z.array(z.int()),
          replace_with: z.array(z.int()),
          check_in: CheckInEnum.optional()
        }),
        z.strictObject({
          type: z.literal('direct_replace'),
          to_replace: z.array(z.array(z.int())),
          replace_text: z.string().optional(),
          replace_with: z.array(z.int()),
          check_in: CheckInEnum.optional()
        })
      ])
      .array()
  })
);

export type CustomOptions = z.infer<typeof CustomOptionsSchema>;
