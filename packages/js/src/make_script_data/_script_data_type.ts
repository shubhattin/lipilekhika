import z from 'zod';
import { SCRIPT_LIST } from '../utils/lang_list';
// import type { OutputScriptData, SharedScriptData } from './output_script_data_schema';

const MAX_U8_INT = 255;

const max_int = z.int().max(MAX_U8_INT);
const max_int_min_0 = max_int.min(0);

const kramaTypeSchema = z.enum(['svara', 'mAtrA', 'vyanjana', 'anya']);

const textToKramaValueSchema = z.strictObject({
  next: z.string().array().optional(),
  krama: max_int.array().optional(),
  /** type of the text as a whole, else the type of the first krama index is used */
  type: kramaTypeSchema.optional(),
  /** only with the `svara` type */
  mAtrA_krama: max_int.min(-1).optional()
});

const typingTextToKramaValueSchema = z.strictObject({
  next: z.string().array().optional(),
  krama: max_int.array().optional(),
  custom_back_ref: max_int_min_0.optional(),
  type: kramaTypeSchema.optional()
});

/**
 * The data shared by the scripts (`src/shared_script_data.json`), see `SharedScriptData`
 */
export const sharedScriptDataSchema = z.strictObject({
  krama_type_arr: kramaTypeSchema.nullable().array(),
  typing_text_to_krama_map: z.tuple([z.string(), typingTextToKramaValueSchema]).array()
});

const commonScriptDataSchema = z.strictObject({
  /** text of each krama key */
  krama_text_arr: z.string().array(),
  text_to_krama_map: z.tuple([z.string(), textToKramaValueSchema]).array(),
  /** the difference from the shared typing map, `null` removes a shared entry */
  typing_text_to_krama_map: z
    .tuple([z.string(), typingTextToKramaValueSchema.nullable()])
    .array()
    .optional(),
  custom_script_chars_arr: z
    .tuple([
      z.string(), // text
      kramaTypeSchema.nullable(), // type
      z.string().nullable() // normal key
    ])
    .array(),

  // input script origin attributes
  script_name: z.enum(SCRIPT_LIST),
  script_id: max_int_min_0
});

const brahmicScriptDataSchema = commonScriptDataSchema.extend({
  script_type: z.literal('brahmic'),
  halant: z.string(),
  nuqta: z.string().nullable().optional(),
  schwa_property: z.boolean(),
  krama_type_overrides: z.tuple([max_int_min_0, kramaTypeSchema.nullable()]).array().optional(),
  svara_mAtrA_krama_overrides: z
    .tuple([max_int_min_0, max_int.min(-1)])
    .array()
    .optional(),
  dead_consonant_sign_index: max_int_min_0.optional()
});

const otherScriptDataSchema = commonScriptDataSchema.extend({
  script_type: z.literal('other'),
  schwa_character: z.string()
});

/**
 * This schema will not be used for actual application use.
 * It defines the `OutputScriptData` independently without relying on `InputScriptData`.
 *
 * This helps us implementing in other languages where they will only parse the `OutputScriptData`.
 *
 * This will also be used to validate the generate output script data.
 */
export const scriptDataSchema = z.discriminatedUnion('script_type', [
  brahmicScriptDataSchema,
  otherScriptDataSchema
]);

export type ScriptData = z.infer<typeof scriptDataSchema>;
export type SharedScriptData = z.infer<typeof sharedScriptDataSchema>;

// export const _type: ScriptData = {} as OutputScriptData;
