import { VocabCard } from '../types';

export const SmartTextProcessor = {
  processSentence(sentence: string, targetWord: string, showFirstLetter: boolean = false) {
    const baseWord = targetWord.toLowerCase().split('/')[0].trim();
    if (!baseWord) return [sentence, ""];

    // Basic regex to find the word in the sentence (case insensitive, whole word)
    const regex = new RegExp(`\\b${baseWord}[a-z]*\\b`, 'gi');
    const match = sentence.match(regex);

    if (match) {
      const bestMatch = match[0];
      const index = sentence.indexOf(bestMatch);
      let replacement = "_______";
      
      if (showFirstLetter && bestMatch.length > 0) {
        replacement = bestMatch[0] + "_".repeat(bestMatch.length - 1);
      }
      
      const blanked = sentence.substring(0, index) + replacement + sentence.substring(index + bestMatch.length);
      return [blanked, bestMatch];
    }

    return [sentence, ""];
  }
};

export const generateQuiz = (pool: VocabCard[], mode: number) => {
  const selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, 10);
  
  return selected.map(card => {
    // Mode Logic:
    // 0: Meaning (MC)
    // 1: Fill Blank (MC)
    // 2: Listening (MC)
    // 3: Dictation (Text)
    // 4: Hard No Hint (Text)
    
    const samePosDistractors = pool
      .filter(c => c.id !== card.id && c.partOfSpeech === card.partOfSpeech)
      .sort(() => 0.5 - Math.random());
    
    const otherDistractors = pool
      .filter(c => c.id !== card.id && c.partOfSpeech !== card.partOfSpeech)
      .sort(() => 0.5 - Math.random());

    const distractors = [...samePosDistractors, ...otherDistractors].slice(0, 3);

    let questionText = "";
    let options: string[] = [];
    let correctAnswer = "";

    if (mode === 0) {
      questionText = `What is the meaning of "${card.word}"?`;
      options = [...distractors.map(d => d.meaning), card.meaning].sort(() => 0.5 - Math.random());
      correctAnswer = card.meaning;
    } else if (mode === 1 || mode === 2) {
      const [blanked, answer] = SmartTextProcessor.processSentence(card.sentence, card.word);
      questionText = mode === 1 ? blanked : "🔊 Listen and select the missing word";
      options = [...distractors.map(d => d.word), answer].sort(() => 0.5 - Math.random());
      correctAnswer = answer;
    } else if (mode === 3 || mode === 4) {
      const [blanked, answer] = SmartTextProcessor.processSentence(card.sentence, card.word, mode === 4);
      questionText = mode === 3 ? "🔊 Listen and type the sentence / word" : blanked;
      correctAnswer = answer;
    }

    return {
      card,
      questionText,
      options,
      correctAnswer,
      type: options.length > 0 ? 'mc' : 'text'
    };
  });
};
