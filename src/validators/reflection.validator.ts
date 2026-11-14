import { z } from 'zod';

export const createReflectionSchema = z.object({
  questionOne: z
    .string({ required_error: 'Answer to question one is required' })
    .trim()
    .min(1, 'Answer to question one cannot be empty')
    .max(1000, 'Answer to question one cannot exceed 1000 characters'),
  questionTwo: z
    .string({ required_error: 'Answer to question two is required' })
    .trim()
    .min(1, 'Answer to question two cannot be empty')
    .max(1000, 'Answer to question two cannot exceed 1000 characters'),
  questionThree: z
    .string({ required_error: 'Answer to question three is required' })
    .trim()
    .min(1, 'Answer to question three cannot be empty')
    .max(1000, 'Answer to question three cannot exceed 1000 characters'),
});

export const reflectionParamSchema = z.object({
  id: z.string().uuid('Invalid reflection ID format. Must be a valid UUID.'),
});

export const reflectionQuerySchema = z.object({
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

export type CreateReflectionInput = z.infer<typeof createReflectionSchema>;
export type ReflectionQueryInput = z.infer<typeof reflectionQuerySchema>;

