import { z } from 'zod';

export const SUPPORTED_EMOTIONS = [
  'Happy',
  'Calm',
  'Grateful',
  'Excited',
  'Neutral',
  'Sad',
  'Anxious',
  'Frustrated',
  'Overwhelmed',
  'Tired',
] as const;

export type SupportedEmotion = (typeof SUPPORTED_EMOTIONS)[number];

export const createCheckInSchema = z.object({
  emotion: z.enum(SUPPORTED_EMOTIONS, {
    errorMap: () => ({
      message: `Invalid emotion. Supported options: ${SUPPORTED_EMOTIONS.join(', ')}`,
    }),
  }),
  intensity: z
    .number({ required_error: 'Intensity is required' })
    .int('Intensity must be an integer')
    .min(1, 'Intensity must be at least 1')
    .max(5, 'Intensity cannot exceed 5'),
  optionalNote: z
    .string()
    .trim()
    .max(500, 'Journal note cannot exceed 500 characters')
    .optional()
    .nullable(),
});

export const checkInQuerySchema = z.object({
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

export type CreateCheckInInput = z.infer<typeof createCheckInSchema>;
export type CheckInQueryInput = z.infer<typeof checkInQuerySchema>;

