import { useEffect, useState } from 'react';

export type SpeechVoice = {
    name: string;
    lang: string;
    default: boolean;
    localService: boolean;
    voiceURI: string;
};

const useSpeechVoices = () => {
    const [voices, setVoices] = useState<SpeechVoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!window.speechSynthesis) {
            setIsLoading(false);
            return;
        }

        const loadVoices = () => {
            const available = window.speechSynthesis.getVoices();
            const mapped = available.map((v) => ({
                name: v.name,
                lang: v.lang,
                default: v.default,
                localService: v.localService,
                voiceURI: v.voiceURI,
            }));
            // Sort: default first, then by name
            mapped.sort((a, b) => {
                if (a.default !== b.default) return a.default ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
            setVoices(mapped);
            setIsLoading(false);
        };

        // Voices may already be loaded
        loadVoices();

        // Chrome loads voices asynchronously
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const getVoiceByURI = (voiceURI: string): SpeechSynthesisVoice | null => {
        if (!window.speechSynthesis) return null;
        const all = window.speechSynthesis.getVoices();
        return all.find((v) => v.voiceURI === voiceURI) || null;
    };

    return { voices, isLoading, getVoiceByURI };
};

export default useSpeechVoices;
