import { env } from '../../config/env';
import { AIReflectionProvider } from './ai-provider.interface';
import { MockAIReflectionProvider } from './mock.provider';
import { OpenAiReflectionProvider } from './openai.provider';

let mockProviderInstance: MockAIReflectionProvider | null = null;
let openAiProviderInstance: OpenAiReflectionProvider | null = null;

/**
 * Returns the configured AI reflection provider based on the AI_PROVIDER environment variable.
 * Defaults to 'mock' for local development and testing without paid API keys.
 */
export const getAIReflectionProvider = (
  overrideProvider?: 'mock' | 'openai'
): AIReflectionProvider => {
  const providerType = overrideProvider || env.AI_PROVIDER || 'mock';

  if (providerType === 'openai') {
    if (!openAiProviderInstance) {
      openAiProviderInstance = new OpenAiReflectionProvider();
    }
    return openAiProviderInstance;
  }

  // Default to MockAIReflectionProvider
  if (!mockProviderInstance) {
    mockProviderInstance = new MockAIReflectionProvider();
  }
  return mockProviderInstance;
};
