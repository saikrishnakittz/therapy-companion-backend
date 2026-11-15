/**
 * Therapy Companion - AI Reflection Provider Interface
 *
 * Defines the contract for AI reflection generation providers.
 * Both MockAIReflectionProvider (current development mode) and
 * OpenAiReflectionProvider (future production integration) implement this interface.
 */

export interface AIReflectionInput {
  questionOne: string;
  questionTwo: string;
  questionThree: string;
  communicationStyle?: string;
}

export interface AIReflectionResult {
  generatedText: string;
  keyThemes: string[];
  model: string;
  provider: 'mock' | 'openai';
  generatedAt: string;
}

export interface AIReflectionProvider {
  /**
   * The identifier of this provider ('mock' or 'openai').
   */
  readonly name: 'mock' | 'openai';

  /**
   * Generates an empathetic, non-clinical reflection from three guided questions.
   *
   * Safety contract:
   * - Must NEVER claim to be a licensed therapist.
   * - Must NEVER provide clinical diagnoses or medical/treatment recommendations.
   * - Must maintain a supportive, non-judgmental tone.
   * - Must strictly adhere to ~80-120 words.
   * - Must NEVER log raw input answers or generated text.
   */
  generateReflection(input: AIReflectionInput): Promise<AIReflectionResult>;
}
