export class FileSecurityUtil {
  static sanitizeFilename(s: string): string {
    return s.replace(/[^A-Za-z0-9._-]/g, '_').trim();
  }

  static sanitizeCsvValue(value: string | null | undefined): string {
    if (value === null || value === undefined) {
      return '""';
    }
    const strValue = String(value);
    const escapedValue = strValue.replace(/"/g, '""');

    // Check for formula injection prefixes
    if (/^[=+\-@\t\r]/.test(escapedValue)) {
      return `"'${escapedValue}"`;
    }
    return `"${escapedValue}"`;
  }
}
