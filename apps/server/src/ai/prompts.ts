export const AI_MODES = [
    'chat',
    'quiz',
    'explain',
    'keyConcepts',
    'suggestCards',
] as const;
export type AiMode = (typeof AI_MODES)[number];

export type StudysetContext = {
    title: string;
    description?: string | null;
    cards: { term: string; definition: string }[];
};

const PROMPT_CARDS_MAX = 50;

export const TEST_SYSTEM_PROMPT =
    'You are a testing bot. Say "Connection successful" and nothing else.';
export const TEST_MESSAGE =
    'Say exactly: "Connection successful" and nothing else.';

const INSTRUCTIONS: Record<AiMode, string> = {
    quiz: `You are a Socratic tutor. Quiz the student on this material.
Ask ONE question at a time. Wait for their answer.
Give feedback. Track which cards they struggle with.
Use varied question formats (fill-in-blank, multiple choice, open-ended).`,
    explain: `Explain concepts from this study set in depth.
Use analogies, examples, and simple language.
Break complex ideas into digestible parts.`,
    keyConcepts: `Analyze this study set and provide:
1. The 3-5 most important concepts
2. How they connect to each other
3. Common misconceptions
4. A suggested study order`,
    suggestCards: `Generate new flashcards that fit this study set's topic and style, complementing the existing cards without duplicating them.
Respond with STRICT JSON only and nothing else (no prose, no markdown fences).
Format: {"cards":[{"term":"...","definition":"..."}]}
Generate 5 cards unless the user requests a different number.`,
    chat: `You are a friendly, knowledgeable study buddy.
Answer questions about this material.
If asked about something outside the study set, politely redirect.`,
};

export function buildSystemPrompt(mode: AiMode, ctx: StudysetContext): string {
    const cards = ctx.cards
        .slice(0, PROMPT_CARDS_MAX)
        .map(
            (c, i) =>
                `${i + 1}. Term: "${c.term}" -> Definition: "${c.definition}"`
        )
        .join('\n');
    return `You are an AI study assistant for a flashcard app called Quizaroni.
You are helping a student study the following set:

**Title:** ${ctx.title}
**Description:** ${ctx.description ?? ''}

**Cards:**
${cards}

${INSTRUCTIONS[mode]}`;
}
