import { getOpenAiClient, isOpenAiConfigured } from '../../config/openai';
import { env } from '../../config/env';
import {
  AIReflectionInput,
  AIReflectionProvider,
  AIReflectionResult,
} from './ai-provider.interface';

const SYSTEM_PROMPT = `You are an empathetic, reflective wellness journaling companion for the Therapy Companion app.

CORE BOUNDARIES & SAFETY GUIDELINES:
- You are a private, reflective journaling companion, NOT a licensed therapist, counselor, psychologist, psychiatrist, doctor, or clinical medical provider.
- Never claim, imply, or suggest that you are a therapist or healthcare provider.
- Never provide clinical diagnoses, psychiatric assessments, treatment plans, medication suggestions, or clinical therapy advice.
- Maintain a warm, non-judgmental, compassionate, and grounded tone.
- Validate the user's emotions, highlight their self-awareness, and encourage gentle self-compassion.
- Length: STRICTLY keep your reflection between 80 and 120 words. Concise, heartfelt, and easy to absorb.

OUTPUT FORMAT:
Return a valid JSON object with the following schema:
{
  "reflection": "A thoughtful, empathetic reflection between 80 and 120 words.",
  "themes": ["2 to 3 short themes like 'Self-Compassion', 'Mind-Body Awareness', 'Patience'"]
}`;

export class OpenAiReflectionProvider implements AIReflectionProvider {
  public readonly name = 'openai' as const;

  public async generateReflection(
    input: AIReflectionInput
  ): Promise<AIReflectionResult> {
    if (!isOpenAiConfigured()) {
      throw new Error(
        'OpenAI provider is active (AI_PROVIDER=openai), but OPENAI_API_KEY is not configured in the environment.'
      );
    }

    const openai = getOpenAiClient();
    const model = env.OPENAI_MODEL || 'gpt-4o-mini';
    const startTime = Date.now();

    const userContent = [
      `Question 1 (Situation): "${input.questionOne.trim()}"`,
      `Question 2 (Mind & Body Signals): "${input.questionTwo.trim()}"`,
      `Question 3 (Personal Needs): "${input.questionThree.trim()}"`,
      input.communicationStyle ? `Preferred Tone: ${input.communicationStyle}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    // Never log raw journal answers or userContent
    console.log(`[OpenAiReflectionProvider] Initiating reflection generation with model ${model}`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.6,
    });

    const rawChoice = response.choices[0]?.message?.content;
    if (!rawChoice) {
      throw new Error('OpenAI returned an empty response. Please try again.');
    }

    let parsedReflection = '';
    let parsedThemes: string[] = ['Mindful Reflection', 'Self-Awareness'];

    try {
      const json = JSON.parse(rawChoice);
      if (typeof json.reflection === 'string' && json.reflection.trim()) {
        parsedReflection = json.reflection.trim();
      }
      if (Array.isArray(json.themes) && json.themes.length > 0) {
        parsedThemes = json.themes.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 3);
      }
    } catch {
      parsedReflection = rawChoice.trim();
    }

    if (!parsedReflection) {
      throw new Error('Unable to parse reflection response from OpenAI provider.');
    }

    const durationMs = Date.now() - startTime;
    console.log(`[OpenAiReflectionProvider] Generated reflection in ${durationMs}ms (model: ${model})`);

    return {
      generatedText: parsedReflection,
      keyThemes: parsedThemes,
      model,
      provider: 'openai',
      generatedAt: new Date().toISOString(),
    };
  }
}
