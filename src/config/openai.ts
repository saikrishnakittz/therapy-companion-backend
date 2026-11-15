import OpenAI from 'openai';
import { getOpenAiConfig, isOpenAiConfigured } from './env';

let openAiInstance: OpenAI | null = null;

/**
 * Returns a cached singleton instance of the OpenAI client.
 * Uses the server-side API key strictly on the backend.
 */
export const getOpenAiClient = (): OpenAI => {
  if (!isOpenAiConfigured()) {
    throw new Error(
      'OpenAI API is not configured on the server. Please set OPENAI_API_KEY in the environment.'
    );
  }

  if (!openAiInstance) {
    const config = getOpenAiConfig();
    openAiInstance = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  return openAiInstance;
};

export { isOpenAiConfigured };
