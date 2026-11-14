import { z } from 'zod';

export const SUPPORTED_EXERCISES = ['understanding-emotional-triggers'] as const;

export const completeExerciseSchema = z.object({
  exerciseId: z.literal('understanding-emotional-triggers', {
    errorMap: () => ({
      message: 'Invalid or unsupported exerciseId. Currently supported: "understanding-emotional-triggers"',
    }),
  }),
  reflectionEntryId: z
    .string({ required_error: 'reflectionEntryId is required' })
    .uuid('reflectionEntryId must be a valid UUID'),
});

export const activityLogQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1, {
      message: 'Page must be an integer greater than or equal to 1',
    }),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 50, {
      message: 'Limit must be an integer between 1 and 50',
    }),
});

export type CompleteExerciseInput = z.infer<typeof completeExerciseSchema>;
export type ActivityLogQueryInput = z.infer<typeof activityLogQuerySchema>;
