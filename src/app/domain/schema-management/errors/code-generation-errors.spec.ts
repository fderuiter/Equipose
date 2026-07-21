import { describe, it, expect } from 'vitest';
import {
  CodeGenerationError,
  TemplateCompilationError,
  StrataParsingError,
  UnsupportedLanguageError,
  ConfigurationValidationError
} from './code-generation-errors';
import { RandomizationConfig } from 'src/app/domain/core/models/randomization.model';

describe('Code Generation Errors', () => {
  const mockConfig: Partial<RandomizationConfig> = {
    protocolId: 'TEST-001',
    studyName: 'Test Study'
  };

  describe('CodeGenerationError', () => {
    it('should initialize correctly with message and context', () => {
      const message = 'Base error message';
      const error = new CodeGenerationError(message, mockConfig);

      expect(error.message).toBe(message);
      expect(error.name).toBe('CodeGenerationError');
      expect(error.context).toEqual(mockConfig);
      expect(error).toBeInstanceOf(CodeGenerationError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should initialize with null context if not provided', () => {
      const error = new CodeGenerationError('Test');
      expect(error.context).toBeNull();
    });
  });

  describe('TemplateCompilationError', () => {
    it('should initialize correctly with language, cause and context', () => {
      const language = 'R';
      const cause = new Error('Syntax error');
      const error = new TemplateCompilationError(language, cause, mockConfig);

      expect(error.message).toContain(`Failed to compile ${language} template`);
      expect(error.message).toContain(cause.message);
      expect(error.name).toBe('TemplateCompilationError');
      expect(error.context).toEqual(mockConfig);
      expect(error).toBeInstanceOf(TemplateCompilationError);
      expect(error).toBeInstanceOf(CodeGenerationError);
    });

    it('should handle string cause correctly', () => {
      const error = new TemplateCompilationError('Python', 'Missing variable');
      expect(error.message).toContain('Missing variable');
    });
  });

  describe('StrataParsingError', () => {
    it('should initialize correctly', () => {
      const language = 'SAS';
      const cause = 'Invalid ID';
      const error = new StrataParsingError(language, cause, mockConfig);

      expect(error.message).toContain(`Failed to parse strata levels for ${language} output`);
      expect(error.message).toContain(cause);
      expect(error.name).toBe('StrataParsingError');
      expect(error.context).toEqual(mockConfig);
      expect(error).toBeInstanceOf(StrataParsingError);
      expect(error).toBeInstanceOf(CodeGenerationError);
    });
  });

  describe('UnsupportedLanguageError', () => {
    it('should initialize correctly', () => {
      const language = 'Java';
      const error = new UnsupportedLanguageError(language, mockConfig);

      expect(error.message).toContain(`Unsupported output language: "${language}"`);
      expect(error.name).toBe('UnsupportedLanguageError');
      expect(error.context).toEqual(mockConfig);
      expect(error).toBeInstanceOf(UnsupportedLanguageError);
      expect(error).toBeInstanceOf(CodeGenerationError);
    });
  });

  describe('ConfigurationValidationError', () => {
    it('should initialize correctly', () => {
      const failures = [{ code: 'ERR_TEST', property: 'protocolId', message: 'Missing protocol ID' }];
      const error = new ConfigurationValidationError(failures, mockConfig);

      expect(error.message).toContain(`Configuration validation failed: [ERR_TEST] protocolId: Missing protocol ID`);
      expect(error.name).toBe('ConfigurationValidationError');
      expect(error.context).toEqual(mockConfig);
      expect(error.failures).toEqual(failures);
      expect(error).toBeInstanceOf(ConfigurationValidationError);
      expect(error).toBeInstanceOf(CodeGenerationError);
    });
  });
});
