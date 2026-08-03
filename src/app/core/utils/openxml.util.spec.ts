import { OpenXmlWriter } from './openxml.util';

describe('OpenXmlWriter', () => {
  describe('getColLetter (Base-26 Translation)', () => {
    it('should translate standard single-character columns correctly', () => {
      expect(OpenXmlWriter.getColLetter(1)).toBe('A');
      expect(OpenXmlWriter.getColLetter(3)).toBe('C');
      expect(OpenXmlWriter.getColLetter(26)).toBe('Z');
    });

    it('should translate multi-character columns correctly', () => {
      expect(OpenXmlWriter.getColLetter(27)).toBe('AA');
      expect(OpenXmlWriter.getColLetter(28)).toBe('AB');
      expect(OpenXmlWriter.getColLetter(52)).toBe('AZ');
      expect(OpenXmlWriter.getColLetter(53)).toBe('BA');
      expect(OpenXmlWriter.getColLetter(702)).toBe('ZZ');
      expect(OpenXmlWriter.getColLetter(703)).toBe('AAA');
    });

    it('should translate boundary/extreme column coordinates correctly', () => {
      // Excel max limit is column index 16384, which should translate to XFD
      expect(OpenXmlWriter.getColLetter(16384)).toBe('XFD');
      // Some very large number should translate cleanly
      expect(OpenXmlWriter.getColLetter(1000000)).toBe('BDWGN');
    });
  });

  describe('Spreadsheet Style Generation & Deduplication', () => {
    it('should deduplicate identical style configurations', () => {
      const writer = new OpenXmlWriter();

      // Register first style
      const styleId1 = writer.addStyle(
        { sz: 12, color: 'FFFF0000', bold: true },
        { fgColor: '00FF00' },
        'align-center',
        1
      );

      // Register identical style
      const styleId2 = writer.addStyle(
        { sz: 12, color: 'FFFF0000', bold: true },
        { fgColor: '00FF00' },
        'align-center',
        1
      );

      // Register a different style
      const styleId3 = writer.addStyle(
        { sz: 12, color: 'FFFF0000', bold: false }, // different bold
        { fgColor: '00FF00' },
        'align-center',
        1
      );

      // Register another different style
      const styleId4 = writer.addStyle(
        { sz: 12, color: 'FFFF0000', bold: true },
        { fgColor: '0000FF' }, // different fill
        'align-center',
        1
      );

      expect(styleId1).toBe(styleId2); // Reused identical style
      expect(styleId1).not.toBe(styleId3); // Distinct bold
      expect(styleId1).not.toBe(styleId4); // Distinct fill
    });

    it('should use default values if style parameters are omitted', () => {
      const writer = new OpenXmlWriter();
      const styleId1 = writer.addStyle({}, {});
      const styleId2 = writer.addStyle({ sz: 11, color: 'FF000000', bold: false }, {});

      expect(styleId1).toBe(styleId2);
    });
  });
});
