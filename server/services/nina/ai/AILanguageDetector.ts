// @ts-nocheck
import { EventEmitter } from 'events';

export class AILanguageDetector extends EventEmitter {
  constructor() {
    super();
    this.patterns = {
      arabic: { regex: /[\u0600-\u06FF\u0750-\u077F]/, name: 'Arabic', code: 'ar', rtl: true },
      hindi: { regex: /[\u0900-\u097F]/, name: 'Hindi', code: 'hi', rtl: false },
      chinese: { regex: /[\u4E00-\u9FFF]/, name: 'Chinese', code: 'zh', rtl: false },
      russian: { regex: /[\u0400-\u04FF]/, name: 'Russian', code: 'ru', rtl: false },
      urdu: { regex: /[\u0600-\u06FF][\u0750-\u077F]?/, name: 'Urdu', code: 'ur', rtl: true },
      persian: { regex: /[\u0600-\u06FF]/, name: 'Persian', code: 'fa', rtl: true }
    };

    this.commonPhrases = {
      arabic: ['مرحبا', 'شكرا', 'الله', 'خير', 'عقار', 'سعر'],
      english: ['hello', 'thank', 'please', 'property', 'price', 'bedroom']
    };
  }

  detect(text) {
    const results = [];
    const totalChars = text.replace(/\s/g, '').length;

    for (const [, config] of Object.entries(this.patterns)) {
      const matches = text.match(config.regex) || [];
      if (matches.length > 0) {
        const charCount = matches.join('').length;
        const percentage = (charCount / totalChars) * 100;
        results.push({
          language: config.name,
          code: config.code,
          confidence: Math.min(0.98, 0.5 + (percentage / 100)),
          rtl: config.rtl,
          percentage: Math.round(percentage)
        });
      }
    }

    if (results.length === 0 || results.every(r => r.percentage < 30)) {
      results.push({
        language: 'English',
        code: 'en',
        confidence: 0.85,
        rtl: false,
        percentage: 100 - results.reduce((sum, r) => sum + r.percentage, 0)
      });
    }

    results.sort((a, b) => b.confidence - a.confidence);
    const isMixed = results.length > 1 && results[1].percentage > 20;

    return {
      primary: results[0],
      detected: results,
      isMixed,
      suggestedResponse: isMixed ? 'bilingual' : results[0].code,
      timestamp: new Date().toISOString()
    };
  }
}
