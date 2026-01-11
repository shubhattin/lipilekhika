import z from 'zod';
import { SCRIPT_LIST } from '../utils/lang_list';
// import type { OutputScriptData } from './output_script_data_schema';

const MAX_U8_INT = 255;

const max_int = z.int().max(MAX_U8_INT);
const max_int_min_0 = max_int.min(0);

const commonScriptDataSchema = z.strictObject({
  /**  [krama_key: string, list_arr_ref: number | null] */
  krama_text_arr: z.tuple([z.string(), max_int_min_0.nullable()]).array(),
  krama_text_arr_index: max_int_min_0.array(),
  text_to_krama_map: z
    .tuple([
      z.string(), // text
      z.strictObject({
        next: z.string().array().nullable().optional(),
        krama: max_int.array().nullable().optional(),
        fallback_list_ref: max_int_min_0.nullable().optional()
      })
    ])
    .array(),
  list: z
    .strictObject({
      krama_ref: max_int_min_0.array(),
      type: z.literal('anya')
    })
    .array(),
  typing_text_to_krama_map: z
    .tuple([
      z.string(), // text
      z.strictObject({
        next: z.string().array().nullable().optional(),
        krama: max_int.array().nullable().optional(),
        custom_back_ref: max_int_min_0.nullable().optional(),
        fallback_list_ref: max_int_min_0.nullable().optional()
      })
    ])
    .array(),
  custom_script_chars_arr: z
    .tuple([
      z.string(), // text
      max_int_min_0.nullable(),
      max_int_min_0.nullable()
    ])
    .array(),

  // input script origin attributes
  script_name: z.enum(SCRIPT_LIST),
  script_id: max_int_min_0,
  script_type: z.enum(['brahmic', 'other']),
  schwa_character: z.string()
});

const brahmicScriptDataSchema = commonScriptDataSchema
  .omit({
    list: true,
    schwa_character: true
  })
  .extend({
    halant: z.string(),
    nuqta: z.string().nullable().optional(),
    schwa_property: z.boolean(),

    list: z
      .discriminatedUnion('type', [
        z.strictObject({
          type: z.enum(['anya', 'vyanjana', 'mAtrA']),
          krama_ref: max_int_min_0.array()
        }),
        z.strictObject({
          type: z.literal('svara'),
          krama_ref: max_int_min_0.array(),
          // if there is krama_ref for svara in brahmic type then there also will
          // be mAtrA ref
          mAtrA_krama_ref: max_int_min_0.array()
        })
      ])
      .array()
  });

const otherScriptDataSchema = commonScriptDataSchema;

/**
 * This schema will not be used for actual application use.
 * It defines the `OutputScriptData` independently without relying on `InputScriptData`.
 *
 * This helps us implementing in other languages where they will only parse the `OutputScriptData`.
 *
 * This will also be used to validate the generate output script data.
 */
export const scriptDataSchema = z.union([brahmicScriptDataSchema, otherScriptDataSchema]);

export type ScriptData = z.infer<typeof scriptDataSchema>;

// export const _type: ScriptData = {} as OutputScriptData;
