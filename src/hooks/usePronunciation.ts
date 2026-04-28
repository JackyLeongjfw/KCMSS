import { useState, useCallback } from 'react';

export function usePronunciation() {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    setIsSynthesizing(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    
    // Get voices - Note: getVoices() can be empty on first load
    const voices = window.speechSynthesis.getVoices();
    
    // Helper to select a female voice
    const selectFemaleVoice = (voiceList: SpeechSynthesisVoice[]) => {
      // Priority 1: High quality Google voices
      let voice = voiceList.find(v => (v.name.includes('Google') || v.name.includes('Natural')) && 
                                     (v.name.includes('Female') || v.name.includes('UK English Female') || v.name.includes('US English')) &&
                                     !v.name.toLowerCase().includes('male'));
      
      // Priority 2: Named female voices
      if (!voice) voice = voiceList.find(v => v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Victoria'));
      
      // Priority 3: Any English voice that doesn't say "male"
      if (!voice) voice = voiceList.find(v => (v.lang.startsWith('en-')) && !v.name.toLowerCase().includes('male'));
      
      return voice;
    };

    const targetVoice = selectFemaleVoice(voices);
    if (targetVoice) utterance.voice = targetVoice;

    utterance.onend = () => setIsSynthesizing(false);
    utterance.onerror = () => setIsSynthesizing(false);
    
    window.speechSynthesis.speak(utterance);
  }, []);

  const testPronunciation = useCallback((targetText: string): Promise<number> => {
    return new Promise((resolve) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('Speech Recognition not supported');
        resolve(0);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsRecognizing(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        const confidence = event.results[0][0].confidence;
        
        // Simple fuzzy match
        const cleanTarget = targetText.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        const cleanResult = transcript.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        
        let score = 0;
        if (cleanResult === cleanTarget) {
          score = 100;
        } else {
          // Word-based scoring
          const targetWords = cleanTarget.split(/\s+/).filter(Boolean);
          const resultWords = cleanResult.split(/\s+/).filter(Boolean);
          
          if (targetWords.length === 0) {
            score = 0;
          } else {
            // Find matches and calculate similarity
            let matches = 0;
            const tempResultWords = [...resultWords];
            
            targetWords.forEach(tWord => {
              const matchIndex = tempResultWords.findIndex(rWord => 
                rWord === tWord || 
                (tWord.length > 3 && (rWord.includes(tWord) || tWord.includes(rWord)))
              );
              if (matchIndex !== -1) {
                matches++;
                tempResultWords.splice(matchIndex, 1);
              }
            });
            
            const wordScore = (matches / targetWords.length) * 100;
            
            // Adjust score based on confidence and length difference
            const lengthRatio = Math.min(cleanResult.length, cleanTarget.length) / Math.max(cleanResult.length, cleanTarget.length);
            score = Math.floor(wordScore * 0.8 + (confidence * 100) * 0.1 + (lengthRatio * 100) * 0.1);
          }
        }

        setLastResult(score);
        resolve(score);
      };

      recognition.onend = () => setIsRecognizing(false);
      recognition.onerror = () => {
        setIsRecognizing(false);
        resolve(0);
      };
    });
  }, []);

  return { speak, testPronunciation, isSynthesizing, isRecognizing, lastResult };
}
