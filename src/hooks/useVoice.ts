
import { useState, useCallback, useEffect, useRef } from 'react';

export function useSpeechRecognition(onResult: (text: string) => void, language: string) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language;

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        onResult(text);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onResult, language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.lang = language;
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start listening', e);
      }
    }
  }, [isListening, language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return { isListening, startListening, stopListening };
}

export function useSpeechSynthesis() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const speak = useCallback((text: string, voiceType: 'male' | 'female', language: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      // Clean markdown symbols for speech
      const cleanText = text
        .replace(/\*\*/g, '') // Remove bold
        .replace(/\*/g, '')  // Remove single asterisks (causes the "tara" issue)
        .replace(/#/g, '')   // Remove headers
        .replace(/_/g, '')   // Remove underscores
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Clean links but keep text
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = language;

      // Better matching logic
      const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
      
      // Filter by language first
      const langVoices = availableVoices.filter(v => v.lang.startsWith(language.split('-')[0]));
      
      const preferredVoice = langVoices.find(v => {
        const name = v.name.toLowerCase();
        if (voiceType === 'female') {
          return name.includes('female') || name.includes('samantha') || name.includes('victoria') || name.includes('google') || name.includes('zira');
        } else {
          return name.includes('male') || name.includes('daniel') || name.includes('alex') || name.includes('david') || name.includes('guy');
        }
      }) || langVoices[0]; // Fallback to any voice of the same language

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Adjust pitch and rate to emphasize gender if perfect match not found
      if (voiceType === 'female') {
        utterance.pitch = 1.1;
        utterance.rate = 1.0;
      } else {
        utterance.pitch = 0.8;
        utterance.rate = 0.95;
      }

      window.speechSynthesis.speak(utterance);
    }
  }, [voices]);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stopSpeaking };
}
