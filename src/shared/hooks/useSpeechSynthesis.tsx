import { useRef } from 'react';

const useSpeechSynthesis = () => {
    const audioRef = useRef<SpeechSynthesisUtterance | null>(null);
    const timeoutRef = useRef<any>(null);

    const speak = (text: string, delay: number = 0) => {
        if (!window.speechSynthesis) {
            console.error('Web Speech API is not supported in this browser.');
            return;
        }

        // Cancel previous speech and timeout
        if (audioRef.current) {
            window.speechSynthesis.cancel();
            clearTimeout(timeoutRef.current!);
        }

        const audio = new SpeechSynthesisUtterance();
        audio.text = text;

        // Store the audio reference to allow cancelation if needed
        audioRef.current = audio;

        // Delay speech if needed
        if (delay > 0) {
            timeoutRef.current = setTimeout(() => {
                window.speechSynthesis.speak(audio);
            }, delay);
        } else {
            window.speechSynthesis.speak(audio);
        }
    };

    const cancel = () => {
        if (audioRef.current) {
            window.speechSynthesis.cancel();
            audioRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    return { speak, cancel };
};

export default useSpeechSynthesis;
