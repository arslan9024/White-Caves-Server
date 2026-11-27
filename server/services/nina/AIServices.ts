// @ts-nocheck
import { AIIntentClassifier } from './ai/AIIntentClassifier.js';
import { AILeadScorer } from './ai/AILeadScorer.js';
import { AISentimentAnalyzer } from './ai/AISentimentAnalyzer.js';
import { AILanguageDetector } from './ai/AILanguageDetector.js';
import { AIResponseGenerator } from './ai/AIResponseGenerator.js';
import { AIEntityExtractor } from './ai/AIEntityExtractor.js';
import { AISmartRouter } from './ai/AISmartRouter.js';

export const intentClassifier = new AIIntentClassifier();
export const leadScorer = new AILeadScorer();
export const sentimentAnalyzer = new AISentimentAnalyzer();
export const languageDetector = new AILanguageDetector();
export const responseGenerator = new AIResponseGenerator();
export const entityExtractor = new AIEntityExtractor();
export const smartRouter = new AISmartRouter();

export default {
  intentClassifier,
  leadScorer,
  sentimentAnalyzer,
  languageDetector,
  responseGenerator,
  entityExtractor,
  smartRouter,
  version: '2.0.0',
  type: 'open-source',
  cost: 'free'
};
