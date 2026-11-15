import {
  AIReflectionInput,
  AIReflectionProvider,
  AIReflectionResult,
} from './ai-provider.interface';

type SituationCategory = 'work' | 'relationships' | 'change' | 'burnout' | 'general';
type FeelingCategory = 'anxiety' | 'sadness' | 'anger' | 'exhaustion' | 'calm' | 'mixed';
type NeedCategory = 'rest' | 'boundaries' | 'connection' | 'clarity' | 'compassion' | 'nourishment';

export class MockAIReflectionProvider implements AIReflectionProvider {
  public readonly name = 'mock' as const;
  private readonly modelName = 'mock-reflection-engine-v1';

  public async generateReflection(
    input: AIReflectionInput
  ): Promise<AIReflectionResult> {
    const q1 = input.questionOne.trim();
    const q2 = input.questionTwo.trim();
    const q3 = input.questionThree.trim();
    const style = input.communicationStyle?.trim().toLowerCase();

    const situation = this.classifySituation(q1);
    const feeling = this.classifyFeeling(q2);
    const need = this.classifyNeed(q3);

    // Build the dynamic, context-aware reflection
    const acknowledgment = this.getAcknowledgment(situation, style);
    const validation = this.getValidation(feeling);
    const recognition = this.getNeedRecognition(need);
    const reflectionQuestion = this.getReflectionQuestion(situation, need);

    const generatedText = `${acknowledgment} ${validation} ${recognition} ${reflectionQuestion}`;
    const keyThemes = this.deriveThemes(situation, feeling, need);

    // Operational logging only - NEVER log journal content or generated text
    console.log(
      `[MockAIReflectionProvider] Generated mock reflection (category: ${situation}/${feeling}/${need}, words: ${this.countWords(generatedText)})`
    );

    return {
      generatedText,
      keyThemes,
      model: this.modelName,
      provider: 'mock',
      generatedAt: new Date().toISOString(),
    };
  }

  private classifySituation(text: string): SituationCategory {
    const lower = text.toLowerCase();
    if (
      lower.includes('work') ||
      lower.includes('job') ||
      lower.includes('boss') ||
      lower.includes('colleague') ||
      lower.includes('deadline') ||
      lower.includes('project') ||
      lower.includes('client') ||
      lower.includes('career') ||
      lower.includes('exam') ||
      lower.includes('study')
    ) {
      return 'work';
    }
    if (
      lower.includes('partner') ||
      lower.includes('friend') ||
      lower.includes('family') ||
      lower.includes('parent') ||
      lower.includes('husband') ||
      lower.includes('wife') ||
      lower.includes('conflict') ||
      lower.includes('argument') ||
      lower.includes('relationship')
    ) {
      return 'relationships';
    }
    if (
      lower.includes('change') ||
      lower.includes('decision') ||
      lower.includes('future') ||
      lower.includes('transition') ||
      lower.includes('new') ||
      lower.includes('moving') ||
      lower.includes('unknown')
    ) {
      return 'change';
    }
    if (
      lower.includes('overwhelm') ||
      lower.includes('busy') ||
      lower.includes('hectic') ||
      lower.includes('rush') ||
      lower.includes('pressure') ||
      lower.includes('too much')
    ) {
      return 'burnout';
    }
    return 'general';
  }

  private classifyFeeling(text: string): FeelingCategory {
    const lower = text.toLowerCase();
    if (
      lower.includes('anxious') ||
      lower.includes('nervous') ||
      lower.includes('panic') ||
      lower.includes('chest') ||
      lower.includes('tight') ||
      lower.includes('stress') ||
      lower.includes('racing') ||
      lower.includes('worry')
    ) {
      return 'anxiety';
    }
    if (
      lower.includes('sad') ||
      lower.includes('down') ||
      lower.includes('heavy') ||
      lower.includes('crying') ||
      lower.includes('hurt') ||
      lower.includes('grief') ||
      lower.includes('lonely') ||
      lower.includes('loss')
    ) {
      return 'sadness';
    }
    if (
      lower.includes('angry') ||
      lower.includes('frustrated') ||
      lower.includes('annoyed') ||
      lower.includes('irritated') ||
      lower.includes('mad') ||
      lower.includes('resentful')
    ) {
      return 'anger';
    }
    if (
      lower.includes('tired') ||
      lower.includes('exhausted') ||
      lower.includes('drained') ||
      lower.includes('depleted') ||
      lower.includes('fatigue') ||
      lower.includes('burnout')
    ) {
      return 'exhaustion';
    }
    if (
      lower.includes('calm') ||
      lower.includes('peaceful') ||
      lower.includes('grateful') ||
      lower.includes('relieved') ||
      lower.includes('content')
    ) {
      return 'calm';
    }
    return 'mixed';
  }

  private classifyNeed(text: string): NeedCategory {
    const lower = text.toLowerCase();
    if (
      lower.includes('rest') ||
      lower.includes('sleep') ||
      lower.includes('break') ||
      lower.includes('pause') ||
      lower.includes('quiet') ||
      lower.includes('slow') ||
      lower.includes('unplug')
    ) {
      return 'rest';
    }
    if (
      lower.includes('boundary') ||
      lower.includes('boundaries') ||
      lower.includes('say no') ||
      lower.includes('space') ||
      lower.includes('alone') ||
      lower.includes('protect')
    ) {
      return 'boundaries';
    }
    if (
      lower.includes('talk') ||
      lower.includes('hug') ||
      lower.includes('listen') ||
      lower.includes('friend') ||
      lower.includes('support') ||
      lower.includes('understood') ||
      lower.includes('connection')
    ) {
      return 'connection';
    }
    if (
      lower.includes('clarity') ||
      lower.includes('focus') ||
      lower.includes('plan') ||
      lower.includes('organize') ||
      lower.includes('direction')
    ) {
      return 'clarity';
    }
    if (
      lower.includes('kind') ||
      lower.includes('gentle') ||
      lower.includes('compassion') ||
      lower.includes('patience') ||
      lower.includes('forgive') ||
      lower.includes('grace')
    ) {
      return 'compassion';
    }
    return 'nourishment';
  }

  private getAcknowledgment(situation: SituationCategory, style?: string): string {
    const isDirect = style?.includes('direct') || style?.includes('practical');

    switch (situation) {
      case 'work':
        return isDirect
          ? 'Navigating demands in your workspace requires conscious focus, and stepping back to reflect here brings immediate grounding and perspective.'
          : 'Navigating demanding moments in your daily work calls on genuine energy, and honoring your experience through this pause shows deep self-care.';

      case 'relationships':
        return isDirect
          ? 'Interpersonal interactions can create real emotional friction, and pausing to identify what unfolded gives you useful clarity moving forward.'
          : 'Holding space for delicate interactions with people around you takes courage, and sitting with this moment is a gentle gift to yourself.';

      case 'change':
        return isDirect
          ? 'Facing transitions and uncertain choices demands focused mental energy, and taking a breath to examine the path ahead is very constructive.'
          : 'Stepping through change and unfamiliar territory naturally brings questions, and giving yourself this sanctuary to pause is deeply grounding.';

      case 'burnout':
        return isDirect
          ? 'Managing full schedules and high pressure is taxing, and stopping right now allows your nervous system to begin resetting with purpose.'
          : 'Carrying a heavy load through busy days asks a lot of your mind and body, and choosing this quiet pause is an act of restoration.';

      case 'general':
      default:
        return isDirect
          ? 'Examining the circumstances in front of you creates clarity, and taking time to document your thoughts is a practical way forward.'
          : 'Every experience you navigate shapes your inner landscape, and creating room to reflect on today is a meaningful practice of sanctuary.';
    }
  }

  private getValidation(feeling: FeelingCategory): string {
    switch (feeling) {
      case 'anxiety':
        return 'It is completely natural that tension and restless signals surfaced; your body is simply trying to keep you safe and alert.';

      case 'sadness':
        return 'The sadness and heaviness you noticed are deeply valid emotional signals, deserving gentle compassion and patient understanding rather than rush or self-criticism.';

      case 'anger':
        return 'Feeling frustration or irritation is an authentic response when things feel unfair or strained, and acknowledging it helps release that internal charge.';

      case 'exhaustion':
        return 'Noticing real depletion and fatigue in your mind and body is essential self-awareness, gently reminding you that your energy is precious and not infinite.';

      case 'calm':
        return 'Experiencing a pocket of peace and relief amidst your day is a deeply nourishing balance that allows your nervous system to soften and recharge.';

      case 'mixed':
      default:
        return 'The layered feelings and bodily sensations stirring inside reflect the natural complexity of being human, and they are entirely welcome here without judgment.';
    }
  }

  private getNeedRecognition(need: NeedCategory): string {
    switch (need) {
      case 'rest':
        return 'Recognizing that you need quiet rest, an unhurried pause, and room to recharge is a vital step toward honoring your personal boundaries.';

      case 'boundaries':
        return 'Identifying your need for healthy boundaries and protected personal space reflects strong self-advocacy and a commitment to guarding your inner peace.';

      case 'connection':
        return 'Naming your desire for supportive connection, empathy, and patient understanding is a healthy affirmation of your natural human need to be seen and heard.';

      case 'clarity':
        return 'Articulating your need for clarity and grounded focus helps settle swirling thoughts and transform overwhelming emotions into steady, manageable moments.';

      case 'compassion':
        return 'Giving yourself permission to receive patience, grace, and tenderness softens rigid internal expectations and creates room for authentic healing when you need it most.';

      case 'nourishment':
      default:
        return 'Acknowledging what your system truly asks for right now is a powerful, loving foundation for steady restoration and compassionate self-care.';
    }
  }

  private getReflectionQuestion(situation: SituationCategory, need: NeedCategory): string {
    switch (need) {
      case 'rest':
        return 'As you look ahead to the rest of today, what is one quiet moment of rest you can protect for yourself?';

      case 'boundaries':
        return 'When you consider your day, what is one compassionate boundary you can set right now to preserve your inner sanctuary?';

      case 'connection':
        return 'Who or what in your life offers you that reassuring warmth and gentle listening, even in a small way, today?';

      case 'clarity':
        return 'What is one single, gentle step or mindful breath that would bring a sense of ease to your mind right now?';

      case 'compassion':
        return 'If you spoke to yourself with the warmth of a dear, caring friend, what reassuring words would you say in this moment?';

      case 'nourishment':
      default:
        return situation === 'work'
          ? 'How can you transition into your next task with a little more breath and gentle lightness?'
          : 'What is one gentle kindness or moment of peaceful breathing you can offer your body and mind before this day ends?';
    }
  }

  private deriveThemes(
    situation: SituationCategory,
    feeling: FeelingCategory,
    need: NeedCategory
  ): string[] {
    const themes: string[] = [];

    // Theme 1: Situation context
    const situationThemes: Record<SituationCategory, string> = {
      work: 'Workplace Well-being',
      relationships: 'Interpersonal Harmony',
      change: 'Navigating Change',
      burnout: 'Pacing & Recovery',
      general: 'Mindful Awareness',
    };
    themes.push(situationThemes[situation]);

    // Theme 2: Emotional somatic awareness
    const feelingThemes: Record<FeelingCategory, string> = {
      anxiety: 'Mind-Body Grounding',
      sadness: 'Gentle Self-Compassion',
      anger: 'Releasing Tension',
      exhaustion: 'Restorative Care',
      calm: 'Savoring Stillness',
      mixed: 'Emotional Acceptance',
    };
    themes.push(feelingThemes[feeling]);

    // Theme 3: Actionable care need
    const needThemes: Record<NeedCategory, string> = {
      rest: 'Restful Boundaries',
      boundaries: 'Healthy Limits',
      connection: 'Seeking Support',
      clarity: 'Centered Perspective',
      compassion: 'Patience with Self',
      nourishment: 'Self-Nourishment',
    };
    themes.push(needThemes[need]);

    return themes.slice(0, 3);
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
}
