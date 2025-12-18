import { z } from 'zod';

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
