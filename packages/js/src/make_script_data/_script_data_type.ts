import z from 'zod';
import { SCRIPT_LIST } from '../utils/lang_list';
// import type { OutputScriptData } from './output_script_data_schema';

const listSchema = z.object({
  krama_ref: z.int().min(0).array(),
  type: z.literal('anya')
});

const commonScriptDataSchema = z.object({
  /**  [krama_key: string, list_arr_ref: number | null] */
  krama_text_arr: z.tuple([z.string(), z.int().min(0).nullable()]).array(),
  krama_text_arr_index: z.number().array(),
  text_to_krama_map: z
    .tuple([
      z.string(), // text
      z.object({
        next: z.string().array().nullable().optional(),
        krama: z.int().min(0).array().nullable().optional(),
        fallback_list_ref: z.int().min(0).nullable().optional()
      })
    ])
    .array(),
  list: listSchema.array(),
  typing_text_to_krama_map: z
    .tuple([
      z.string(), // text
      z.object({
        next: z.string().array().nullable(),
        krama: z.int().min(0).array().nullable(),
        custom_back_ref: z.int().min(0).nullable(),
        fallback_list_ref: z.int().min(0).nullable()
      })
    ])
    .array(),
  custom_script_chars_arr: z
    .tuple([
      z.string(), // text
      z.int().min(0).nullable(),
      z.int().min(0).nullable()
    ])
    .array(),

  // input script origin attributes
  script_name: z.enum(SCRIPT_LIST),
  script_id: z.int().min(0),
  script_type: z.enum(['brahmic', 'other']),
  schwa_property: z.string()
});

const brahmicScriptDataSchema = commonScriptDataSchema
  .omit({
    list: true
  })
  .extend({
    halant: z.string(),
    nuqta: z.string().nullable().optional(),
    schwa_property: z.boolean(),

    list: listSchema
      .pick({ krama_ref: true })
      .extend(
        z.union([
          z.object({
            type: z.enum(['vyanjana', 'anya', 'mAtrA'])
          }),
          z.object({
            type: z.literal('svara'),
            mAtrA_krama_ref: z.int().min(0).array().nullable().optional()
          })
        ])
      )
      .array()
  });

const otherScriptDataSchema = commonScriptDataSchema.extend(commonScriptDataSchema);

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
