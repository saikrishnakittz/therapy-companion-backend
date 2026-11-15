import { z } from 'zod';

export const directAiReflectionSchema = z.object({
  consentGranted: z.literal(true, {
    errorMap: () => ({
      message: 'Explicit user consent is required before generating an AI reflection.',
    }),
  }),
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
  communicationStyle: z.string().trim().max(100).optional(),
});

export type DirectAiReflectionInput = z.infer<typeof directAiReflectionSchema>;
