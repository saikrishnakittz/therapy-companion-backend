import {
  AIReflectionInput,
  AIReflectionResult,
  AIReflectionProvider,
} from './ai/ai-provider.interface';
import { getAIReflectionProvider } from './ai/ai-provider.factory';

export type GenerateReflectionInput = AIReflectionInput;
export type GeneratedReflectionOutput = AIReflectionResult;

export class AiService {
  /**
   * Generates a compassionate, non-clinical AI reflection from the user's three guided answers.
   * Delegates to the configured provider (MockAIReflectionProvider or OpenAiReflectionProvider).
   * Note: Reflection answers and generated text are NEVER logged to preserve user privacy.
   */
  public static async generateReflection(
    input: AIReflectionInput,
    overrideProvider?: 'mock' | 'openai'
  ): Promise<AIReflectionResult> {
    const provider = getAIReflectionProvider(overrideProvider);
    return provider.generateReflection(input);
  }

  /**
   * Returns the currently active AI provider instance.
   */
  public static getActiveProvider(overrideProvider?: 'mock' | 'openai'): AIReflectionProvider {
    return getAIReflectionProvider(overrideProvider);
  }
}

export { AIReflectionInput, AIReflectionResult, AIReflectionProvider };
