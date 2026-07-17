import {
    APIGatewayProxyEventV2WithLambdaAuthorizer,
    APIGatewayProxyResultV2,
    Handler,
} from 'aws-lambda';
import { AuthorizerContext } from 'models/auth';

const buildSystemPrompt = (mode: string, context: any): string => {
    const cardsList = context.cards.slice(0, 50).map((c: any, i: number) => 
        `${i + 1}. Term: "${c.term}" -> Definition: "${c.definition}"`
    ).join('\n');
    
    let instructions = '';
    switch (mode) {
        case 'quiz':
            instructions = `You are a Socratic tutor. Quiz the student on this material.\nAsk ONE question at a time. Wait for their answer.\nGive feedback. Track which cards they struggle with.\nUse varied question formats (fill-in-blank, multiple choice, open-ended).`;
            break;
        case 'explain':
            instructions = `Explain concepts from this study set in depth.\nUse analogies, examples, and simple language.\nBreak complex ideas into digestible parts.`;
            break;
        case 'keyConcepts':
            instructions = `Analyze this study set and provide:\n1. The 3-5 most important concepts\n2. How they connect to each other\n3. Common misconceptions\n4. A suggested study order`;
            break;
        case 'suggestCards':
            instructions = `Generate new flashcards that fit this study set's topic and style, complementing the existing cards without duplicating them.\nRespond with STRICT JSON only and nothing else (no prose, no markdown fences).\nFormat: {"cards":[{"term":"...","definition":"..."}]}\nGenerate 5 cards unless the user requests a different number.`;
            break;
        case 'chat':
        default:
            instructions = `You are a friendly, knowledgeable study buddy.\nAnswer questions about this material.\nIf asked about something outside the study set, politely redirect.`;
            break;
    }

    return `You are an AI study assistant for a flashcard app called Quizaroni.\nYou are helping a student study the following set:\n\n**Title:** ${context.title}\n**Description:** ${context.description || ''}\n\n**Cards:**\n${cardsList}\n\n${instructions}`;
};

export const handler: Handler = async (
    event: APIGatewayProxyEventV2WithLambdaAuthorizer<AuthorizerContext>,
    context
): Promise<APIGatewayProxyResultV2> => {
    try {
        const body = JSON.parse(event.body ?? '{}');
        const { provider, model, apiKey, messages, studysetContext, mode, isTest, action } = body;

        if (!provider || !apiKey) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing provider or apiKey' }),
            };
        }

        if (action === 'fetchModels') {
            let models: any[] = [];
            if (provider === 'openai') {
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                });
                if (!res.ok) throw new Error(`OpenAI models error: ${await res.text()}`);
                const data = await res.json();
                models = data.data.filter((m: any) => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3')).map((m: any) => ({
                    id: m.id,
                    name: m.id,
                }));
            } else if (provider === 'anthropic') {
                const res = await fetch('https://api.anthropic.com/v1/models', {
                    headers: { 
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01' 
                    },
                });
                if (!res.ok) throw new Error(`Anthropic models error: ${await res.text()}`);
                const data = await res.json();
                models = data.data.map((m: any) => ({
                    id: m.id,
                    name: m.display_name || m.id,
                }));
            } else if (provider === 'google') {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (!res.ok) throw new Error(`Google models error: ${await res.text()}`);
                const data = await res.json();
                models = data.models.filter((m: any) => m.name.includes('gemini')).map((m: any) => ({
                    id: m.name.replace('models/', ''),
                    name: m.displayName || m.name,
                }));
            }
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ models }),
            };
        }

        if (!model || !messages) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields for chat' }),
            };
        }

        const systemPrompt = isTest 
            ? 'You are a testing bot. Say "Connection successful" and nothing else.' 
            : buildSystemPrompt(mode, studysetContext);

        let aiResponseContent = '';

        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages
                    ],
                }),
            });
            if (!res.ok) throw new Error(`OpenAI API error: ${await res.text()}`);
            const data = await res.json();
            aiResponseContent = data.choices[0].message.content;
        } else if (provider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: messages,
                }),
            });
            if (!res.ok) throw new Error(`Anthropic API error: ${await res.text()}`);
            const data = await res.json();
            aiResponseContent = data.content[0].text;
        } else if (provider === 'google') {
            const googleMessages = messages.map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            }));
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    contents: googleMessages,
                }),
            });
            if (!res.ok) throw new Error(`Google API error: ${await res.text()}`);
            const data = await res.json();
            aiResponseContent = data.candidates[0].content.parts[0].text;
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid provider' }),
            };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: aiResponseContent }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: (error as Error).message }),
        };
    }
};
