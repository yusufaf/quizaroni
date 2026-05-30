import { useRef } from "react";

const useSpeechSynthesis = () => {
  const audioRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<any>(null);

  const getVoice = (voiceURI?: string): SpeechSynthesisVoice | null => {
    if (!voiceURI || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find((v) => v.voiceURI === voiceURI) || null;
  };

  const speak = (text: string, delay: number = 0, voiceURI?: string) => {
    if (!window.speechSynthesis) {
      console.error("Web Speech API is not supported in this browser.");
      return;
    }

    // Cancel previous speech and timeout
    if (audioRef.current) {
      window.speechSynthesis.cancel();
      clearTimeout(timeoutRef.current!);
    }

    const audio = new SpeechSynthesisUtterance();
    audio.text = text;

    const voice = getVoice(voiceURI);
    if (voice) {
      audio.voice = voice;
    }

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

  return { speak, cancel, getVoice };
};

export default useSpeechSynthesis;
