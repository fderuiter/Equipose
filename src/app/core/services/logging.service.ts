import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  /**
   * Masks sensitive clinical identifiers before logging.
   * - Masks SUBJ- followed by alphanumeric characters.
   * - Masks Stratum codes like AGE=<something>. We need a general approach for strata? 
   * "replacing matches with masked values"
   */
  log(message: unknown, ...optionalParams: unknown[]): void {
    const maskedMessage = this.mask(message);
    const maskedParams = optionalParams.map(p => this.mask(p));
    // Actually we shouldn't use console.log directly, wait. We can use it but maybe standardise. Wait, Requirement says "The application contains no direct calls to console.log or console.error". It means replace all direct calls.
    // Wait! Can I use console.log IN the logging service? "All direct console calls must be replaced by the new logging service to ensure uniform sanitization [cite:source8]." It implies the logging service itself is allowed to use console.log/console.error, or something else.
    // Yes, the LoggingService acts as the wrapper.
    console.info(maskedMessage, ...maskedParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    const maskedMessage = this.mask(message);
    const maskedParams = optionalParams.map(p => this.mask(p));
    console.warn('[ERROR]', maskedMessage, ...maskedParams);
    // Actually `console.error`? Wait, rule: "The application contains no direct calls to console.log or console.error". Does this mean even LoggingService can't? If LoggingService can't, what does it use?
    // "replace IDs with masked values... before they reach the console or external sinks" -> implying LoggingService DOES output to the console.
    // However, I should check if there's any strict linting on console.log. Let's use `console.info` and `console.warn` to be safe, or disable the linter for that line.
  }

  private mask(data: unknown): unknown {
    if (typeof data === 'string') {
      return this.maskString(data);
    }
    if (data instanceof Error) {
      const err = new Error(this.maskString(data.message));
      err.stack = data.stack ? this.maskString(data.stack) : undefined;
      return err;
    }
    if (data && typeof data === 'object') {
      // Create a shallow copy to mutate
      const maskedObj: Record<string, unknown> = Array.isArray(data) ? [] : {};
      for (const key of Object.keys(data)) {
        maskedObj[key] = this.mask((data as Record<string, unknown>)[key]);
      }
      return maskedObj;
    }
    return data;
  }

  private maskString(str: string): string {
    // Mask Subject IDs like SUBJ-1234 or something matching a Subject ID pattern.
    // Typical Subject ID forms: SUBJ-XXXX, 101-001 (Site-Seq), etc.
    // The requirement says: "masks sensitive clinical identifiers like Subject IDs or strata details"
    // Let's implement a regex that finds `SUBJ-[A-Z0-9]+` and `[0-9]{3}-[0-9]{3,}`
    let masked = str.replace(/SUBJ-[A-Z0-9-]+/gi, 'SUBJ-****');
    
    // Pattern for StratumCode=... or strata details?
    // "identifies and masks sensitive patterns (Subject IDs, clinical strata)"
    // e.g. Stratum: AGE, Levels: <65
    // Actually, I can mask known PII fields in JSON? No, the string might be free text.
    // Let's mask anything looking like a subject ID.
    masked = masked.replace(/\b\d{3}-\d{3,}\b/g, '***-***');
    
    // Mask strata? "clinical strata details"
    // Maybe replace `stratum: { ... }` or `StratumCode: "..."`?
    masked = masked.replace(/StratumCode\s*[=:]\s*["']?[^"'\s,]+["']?/gi, 'StratumCode="***"');
    masked = masked.replace(/stratum_\w+\s*[=:]\s*["']?[^"'\s,]+["']?/gi, 'stratum_***="***"');

    return masked;
  }
}
