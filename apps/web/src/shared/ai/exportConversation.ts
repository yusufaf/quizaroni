import { AIMessage, AI_CHAT_MODES, AIChatMode } from './providers';

const formatTimestamp = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
};

/**
 * Builds a markdown transcript of an AI conversation.
 */
export const buildConversationMarkdown = (
    studysetTitle: string,
    messages: AIMessage[]
): string => {
    const header = `# ${studysetTitle} — AI Conversation\n\n_Exported ${new Date().toLocaleString()}_\n`;

    const body = messages
        .filter((m) => m.role !== 'system')
        .map((m) => {
            const speaker = m.role === 'user' ? '**You**' : '**AI**';
            const ts = formatTimestamp(m.timestamp);
            const modeLabel = m.mode
                ? ` _(${AI_CHAT_MODES[m.mode as AIChatMode]?.name ?? m.mode})_`
                : '';
            const meta = [ts && `_${ts}_`, modeLabel.trim()]
                .filter(Boolean)
                .join(' ');
            return `### ${speaker}${meta ? ` — ${meta}` : ''}\n\n${m.content}\n`;
        })
        .join('\n');

    return `${header}\n${body}`;
};

/**
 * Triggers a browser download of the conversation as a markdown file.
 */
export const exportConversation = (
    studysetTitle: string,
    messages: AIMessage[]
): void => {
    const markdown = buildConversationMarkdown(studysetTitle, messages);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const anchor = document.createElement('a');
    anchor.download = `${studysetTitle}_AI_Conversation.md`;
    anchor.href = window.URL.createObjectURL(blob);
    anchor.click();
    anchor.remove();
};
