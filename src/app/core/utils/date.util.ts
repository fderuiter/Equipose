export class DateUtil {
  /**
   * Returns a standard YYYYMMDD string for file naming conventions.
   */
  static getFileDatestamp(date: Date = new Date()): string {
    // en-CA locale formats as YYYY-MM-DD in local time
    return date.toLocaleDateString('en-CA').replace(/-/g, '');
  }

  /**
   * Returns a high-precision ISO-standard timestamp for code generation metadata.
   */
  static getIsoTimestamp(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * Returns the current year for copyright and citation purposes.
   */
  static getCurrentYear(date: Date = new Date()): number {
    return parseInt(date.toLocaleDateString('en-CA').substring(0, 4), 10);
  }
}
