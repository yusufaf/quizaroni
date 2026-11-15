import { describe, expect, test } from 'bun:test';
import { buildSystemPrompt } from './prompts';

const cards = Array.from({ length: 51 }, (_, i) => ({
    term: `term-${i + 1}`,
    definition: `def-${i + 1}`,
}));

describe('buildSystemPrompt', () => {
    test('includes the title, description and the first 50 cards', () => {
        const prompt = buildSystemPrompt('chat', {
            title: 'Cell biology',
            description: 'Organelles',
            cards,
        });
        expect(prompt).toContain('**Title:** Cell biology');
        expect(prompt).toContain('**Description:** Organelles');
        expect(prompt).toContain('1. Term: "term-1" -> Definition: "def-1"');
        expect(prompt).toContain('50. Term: "term-50"');
        expect(prompt).not.toContain('term-51');
        expect(prompt).toContain('friendly, knowledgeable study buddy');
    });

    test('adds the instructions for the chosen mode', () => {
        const ctx = { title: 'T', cards: [] };
        expect(buildSystemPrompt('quiz', ctx)).toContain('Socratic tutor');
        expect(buildSystemPrompt('suggestCards', ctx)).toContain(
            '{"cards":[{"term":"...","definition":"..."}]}'
        );
        expect(buildSystemPrompt('keyConcepts', ctx)).toContain(
            'A suggested study order'
        );
        expect(buildSystemPrompt('explain', ctx)).toContain('analogies');
    });

    test('treats a missing description as empty', () => {
        expect(
            buildSystemPrompt('chat', { title: 'T', description: null, cards: [] })
        ).toContain('**Description:** \n');
    });
});
