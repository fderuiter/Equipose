import { RandomizationConfig } from 'src/app/domain/core/models/randomization.model';
import { ValidationFailure } from 'src/app/domain/core/validation/unified-validator';

/** Base error for all code-generation pipeline failures. */
export class CodeGenerationError extends Error {
  readonly context: Partial<RandomizationConfig> | null;

  constructor(message: string, context: Partial<RandomizationConfig> | null = null) {
    super(message);
    this.name = 'CodeGenerationError';
    this.context = context;
    // Restore prototype chain so `instanceof` checks work after TypeScript transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the target-language template string assembly fails. */
export class TemplateCompilationError extends CodeGenerationError {
  constructor(language: string, cause: unknown, context: Partial<RandomizationConfig> | null = null) {
    super(
      `Failed to compile ${language} template. ${cause instanceof Error ? cause.message : String(cause)}`,
      context
    );
    this.name = 'TemplateCompilationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the strata or stratumCaps matrices are malformed or missing expected properties. */
export class StrataParsingError extends CodeGenerationError {
  constructor(language: string, cause: unknown, context: Partial<RandomizationConfig> | null = null) {
    super(
      `Failed to parse strata levels for ${language} output. Ensure all stratification factors have valid alphanumeric IDs. ${cause instanceof Error ? cause.message : String(cause)}`,
      context
    );
    this.name = 'StrataParsingError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when an unrecognised language value is passed into the generator. */
export class UnsupportedLanguageError extends CodeGenerationError {
  constructor(language: string, context: Partial<RandomizationConfig> | null = null) {
    super(`Unsupported output language: "${language}". Expected R, SAS, Python, or STATA.`, context);
    this.name = 'UnsupportedLanguageError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the RandomizationConfig object fails pre-flight validation. */
export class ConfigurationValidationError extends CodeGenerationError {
  readonly failures: ValidationFailure[];

  constructor(failures: ValidationFailure[], context: Partial<RandomizationConfig> | null = null) {
    const detail = failures.map(f => `[${f.code}] ${f.property}: ${f.message}`).join(', ');
    super(`Configuration validation failed: ${detail}`, context);
    this.name = 'ConfigurationValidationError';
    this.failures = failures;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when static mapping guard detects a mismatch between schema variables and generated logic parameters. */
export class MappingMismatchError extends CodeGenerationError {
  constructor(language: string, detail: string, context: Partial<RandomizationConfig> | null = null) {
    super(`Mapping Mismatch in ${language} template: ${detail}`, context);
    this.name = 'MappingMismatchError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
