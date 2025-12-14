import { describe, it, expect } from 'vitest';
import { getNormalizedScriptName } from './script_normalization';

describe('getNormalizedScriptName', () => {
  describe('Script acronyms', () => {
    it('should normalize script acronyms correctly', () => {
      expect(getNormalizedScriptName('dev')).toBe('Devanagari');
      expect(getNormalizedScriptName('te')).toBe('Telugu');
      expect(getNormalizedScriptName('tel')).toBe('Telugu');
      expect(getNormalizedScriptName('tam')).toBe('Tamil');
      expect(getNormalizedScriptName('tam-ex')).toBe('Tamil-Extended');
      expect(getNormalizedScriptName('ben')).toBe('Bengali');
      expect(getNormalizedScriptName('be')).toBe('Bengali');
      expect(getNormalizedScriptName('ka')).toBe('Kannada');
      expect(getNormalizedScriptName('kan')).toBe('Kannada');
      expect(getNormalizedScriptName('gu')).toBe('Gujarati');
      expect(getNormalizedScriptName('guj')).toBe('Gujarati');
      expect(getNormalizedScriptName('mal')).toBe('Malayalam');
      expect(getNormalizedScriptName('or')).toBe('Odia');
      expect(getNormalizedScriptName('od')).toBe('Odia');
      expect(getNormalizedScriptName('oriya')).toBe('Odia');
      expect(getNormalizedScriptName('si')).toBe('Sinhala');
      expect(getNormalizedScriptName('sinh')).toBe('Sinhala');
      expect(getNormalizedScriptName('sin')).toBe('Sinhala');
      expect(getNormalizedScriptName('en')).toBe('Normal');
      expect(getNormalizedScriptName('rom')).toBe('Romanized');
      expect(getNormalizedScriptName('gur')).toBe('Gurumukhi');
      expect(getNormalizedScriptName('as')).toBe('Assamese');
    });

    it('should handle case-insensitive acronyms', () => {
      // @ts-ignore
      expect(getNormalizedScriptName('DEV')).toBe('Devanagari');
      // @ts-ignore
      expect(getNormalizedScriptName('Te')).toBe('Telugu');
      // @ts-ignore
      expect(getNormalizedScriptName('TEL')).toBe('Telugu');
      // @ts-ignore
      expect(getNormalizedScriptName('TAM-EX')).toBe('Tamil-Extended');
    });
  });

  describe('Language acronyms', () => {
    it('should normalize language acronyms to their script', () => {
      expect(getNormalizedScriptName('sa')).toBe('Devanagari');
      expect(getNormalizedScriptName('san')).toBe('Devanagari');
      expect(getNormalizedScriptName('hin')).toBe('Devanagari');
      expect(getNormalizedScriptName('hi')).toBe('Devanagari');
      expect(getNormalizedScriptName('mar')).toBe('Devanagari');
      expect(getNormalizedScriptName('ne')).toBe('Devanagari');
      expect(getNormalizedScriptName('nep')).toBe('Devanagari');
      expect(getNormalizedScriptName('pun')).toBe('Gurumukhi');
    });

    it('should handle case-insensitive language acronyms', () => {
      // @ts-ignore
      expect(getNormalizedScriptName('SA')).toBe('Devanagari');
      // @ts-ignore
      expect(getNormalizedScriptName('San')).toBe('Devanagari');
      // @ts-ignore
      expect(getNormalizedScriptName('HIN')).toBe('Devanagari');
    });
  });

  describe('Full script names', () => {
    it('should return script names as-is when they match exactly', () => {
      expect(getNormalizedScriptName('Devanagari')).toBe('Devanagari');
      expect(getNormalizedScriptName('Telugu')).toBe('Telugu');
      expect(getNormalizedScriptName('Tamil')).toBe('Tamil');
      expect(getNormalizedScriptName('Tamil-Extended')).toBe('Tamil-Extended');
      expect(getNormalizedScriptName('Bengali')).toBe('Bengali');
      expect(getNormalizedScriptName('Kannada')).toBe('Kannada');
      expect(getNormalizedScriptName('Gujarati')).toBe('Gujarati');
      expect(getNormalizedScriptName('Malayalam')).toBe('Malayalam');
      expect(getNormalizedScriptName('Odia')).toBe('Odia');
      expect(getNormalizedScriptName('Sinhala')).toBe('Sinhala');
      expect(getNormalizedScriptName('Normal')).toBe('Normal');
      expect(getNormalizedScriptName('Romanized')).toBe('Romanized');
      expect(getNormalizedScriptName('Gurumukhi')).toBe('Gurumukhi');
      expect(getNormalizedScriptName('Assamese')).toBe('Assamese');
    });

    it('should handle capitalized script names with dashes', () => {
      expect(getNormalizedScriptName('Tamil-Extended')).toBe('Tamil-Extended');
    });
  });

  describe('Full language names', () => {
    it('should normalize language names to their script', () => {
      expect(getNormalizedScriptName('Sanskrit')).toBe('Devanagari');
      expect(getNormalizedScriptName('Hindi')).toBe('Devanagari');
      expect(getNormalizedScriptName('Marathi')).toBe('Devanagari');
      expect(getNormalizedScriptName('Nepali')).toBe('Devanagari');
      expect(getNormalizedScriptName('Punjabi')).toBe('Gurumukhi');
      expect(getNormalizedScriptName('Bengali')).toBe('Bengali');
      expect(getNormalizedScriptName('Gujarati')).toBe('Gujarati');
      expect(getNormalizedScriptName('Kannada')).toBe('Kannada');
      expect(getNormalizedScriptName('Malayalam')).toBe('Malayalam');
      expect(getNormalizedScriptName('Odia')).toBe('Odia');
      expect(getNormalizedScriptName('Sinhala')).toBe('Sinhala');
      expect(getNormalizedScriptName('Tamil')).toBe('Tamil');
      expect(getNormalizedScriptName('Telugu')).toBe('Telugu');
      expect(getNormalizedScriptName('Assamese')).toBe('Assamese');
      expect(getNormalizedScriptName('English')).toBe('Normal');
    });
  });

  describe('Case variations', () => {
    it('should handle lowercase script names', () => {
      // @ts-ignore
      expect(getNormalizedScriptName('devanagari')).toBe('Devanagari');
      // @ts-ignore
      expect(getNormalizedScriptName('telugu')).toBe('Telugu');
      // @ts-ignore
      expect(getNormalizedScriptName('tamil-extended')).toBe('Tamil-Extended');
    });

    it('should handle mixed case script names', () => {
      // @ts-ignore
      expect(getNormalizedScriptName('devanagari')).toBe('Devanagari');
      // @ts-ignore
      expect(getNormalizedScriptName('Devanagari')).toBe('Devanagari');
      // @ts-ignore
      expect(getNormalizedScriptName('DEvanagari')).toBe('Devanagari');
    });

    it('should handle lowercase language names', () => {
      // @ts-ignore
      expect(getNormalizedScriptName('sanskrit')).toBe('Devanagari');
      // @ts-ignore
      expect(getNormalizedScriptName('hindi')).toBe('Devanagari');
      // @ts-ignore
      expect(getNormalizedScriptName('punjabi')).toBe('Gurumukhi');
    });
  });

  describe('Invalid inputs', () => {
    it('should return null for unknown acronyms', () => {
      // @ts-ignore
      expect(getNormalizedScriptName('xyz')).toBeNull();
      // @ts-ignore
      expect(getNormalizedScriptName('unknown')).toBeNull();
      // @ts-ignore
      expect(getNormalizedScriptName('abc')).toBeNull();
    });

    it('should return null for unknown script names', () => {
      // @ts-ignore
      expect(getNormalizedScriptName('UnknownScript')).toBeNull();
      // @ts-ignore
      expect(getNormalizedScriptName('Latin')).toBeNull();
      // @ts-ignore
      expect(getNormalizedScriptName('Cyrillic')).toBeNull();
    });

    it('should return null for empty string', () => {
      // @ts-ignore
      expect(getNormalizedScriptName('')).toBeNull();
    });

    it('should return null for invalid types', () => {
      // TypeScript will prevent this, but testing runtime behavior
      // @ts-ignore
      expect(getNormalizedScriptName('123')).toBeNull();
      // @ts-ignore
      expect(getNormalizedScriptName('!@#')).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle acronyms with dashes correctly', () => {
      // @ts-ignore
      expect(getNormalizedScriptName('tam-ex')).toBe('Tamil-Extended');
      // @ts-ignore
      expect(getNormalizedScriptName('TAM-EX')).toBe('Tamil-Extended');
      // @ts-ignore
      expect(getNormalizedScriptName('Tam-Ex')).toBe('Tamil-Extended');
    });

    it('should prioritize exact script matches over acronyms', () => {
      // If a script name matches exactly, it should return that
      expect(getNormalizedScriptName('Telugu')).toBe('Telugu');
      expect(getNormalizedScriptName('tel')).toBe('Telugu');
    });
  });
});
