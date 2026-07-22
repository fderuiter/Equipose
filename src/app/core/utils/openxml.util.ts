import { ZipWriter } from './zip.util';

export class OpenXmlWriter {
  private zip = new ZipWriter();
  private styles = {
    fonts: [{ sz: 11, color: 'FF000000', bold: false }], // 0: default
    fills: [{ type: 'none' }, { type: 'gray125' }],      // 0: none, 1: gray125
    cellXfs: [{ fontId: 0, fillId: 0, alignment: '', numFmtId: 0 }],  // 0: default
  };
  private worksheets: { name: string; xml: string; autoFilter?: string; freezePanes?: boolean; cols?: number[] }[] = [];

  public creator?: string;
  public created?: Date;

  constructor() {
  }

  public addStyle(font: { sz?: number, color?: string, bold?: boolean }, fill: { fgColor?: string }, alignment = '', numFmtId = 0): number {
    let fontId = this.styles.fonts.findIndex(f => f.sz === (font.sz || 11) && f.color === (font.color || 'FF000000') && !!f.bold === !!font.bold);
    if (fontId === -1) {
      fontId = this.styles.fonts.length;
      this.styles.fonts.push({ sz: font.sz || 11, color: font.color || 'FF000000', bold: !!font.bold });
    }

    let fillId = 0;
    if (fill.fgColor) {
      fillId = this.styles.fills.findIndex(f => (f as any).fgColor === fill.fgColor);
      if (fillId === -1) {
        fillId = this.styles.fills.length;
        this.styles.fills.push({ type: 'solid', fgColor: fill.fgColor } as any);
      }
    }

    let xfId = this.styles.cellXfs.findIndex(x => x.fontId === fontId && x.fillId === fillId && x.alignment === alignment && x.numFmtId === numFmtId);
    if (xfId === -1) {
      xfId = this.styles.cellXfs.length;
      this.styles.cellXfs.push({ fontId, fillId, alignment, numFmtId });
    }

    return xfId;
  }

  public addWorksheet(name: string, rows: { cells: { val: string, styleId?: number, mergeAcross?: number }[], height?: number }[], options: { autoFilterRef?: string, freezePanes?: boolean, cols?: number[] } = {}): void {
    let sheetData = '';
    let rowIndex = 1;
    const merges: string[] = [];

    for (const row of rows) {
      const ht = row.height ? ` ht="${row.height}" customHeight="1"` : '';
      sheetData += `<row r="${rowIndex}"${ht}>`;
      let colIndex = 1;
      for (const cell of row.cells) {
        const colLetter = OpenXmlWriter.getColLetter(colIndex);
        const ref = `${colLetter}${rowIndex}`;
        const s = cell.styleId ? ` s="${cell.styleId}"` : '';
        const escaped = this.escapeXml(cell.val);
        sheetData += `<c r="${ref}"${s} t="inlineStr"><is><t>${escaped}</t></is></c>`;
        
        if (cell.mergeAcross) {
          const endColLetter = OpenXmlWriter.getColLetter(colIndex + cell.mergeAcross);
          merges.push(`<mergeCell ref="${ref}:${endColLetter}${rowIndex}"/>`);
          colIndex += cell.mergeAcross;
        }
        colIndex++;
      }
      sheetData += `</row>`;
      rowIndex++;
    }

    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`;

    if (options.cols && options.cols.length > 0) {
      xml += `<cols>`;
      options.cols.forEach((width, idx) => {
        xml += `<col min="${idx + 1}" max="${idx + 1}" width="${width}" customWidth="1"/>`;
      });
      xml += `</cols>`;
    }

    xml += `<sheetData>${sheetData}</sheetData>`;

    if (options.autoFilterRef) {
      xml += `<autoFilter ref="${options.autoFilterRef}"/>`;
    }

    if (merges.length > 0) {
      xml += `<mergeCells count="${merges.length}">${merges.join('')}</mergeCells>`;
    }

    if (options.freezePanes) {
      // Freeze top row
      xml = xml.replace('<sheetData>', `<sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>`);
    }

    xml += `</worksheet>`;
    this.worksheets.push({ name, xml });
  }

  public async generateAsync(): Promise<Uint8Array> {
    const enc = new TextEncoder();

    let rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`;

    let contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`;

    if (this.creator || this.created) {
      let coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`;
      if (this.creator) coreXml += `<dc:creator>${this.escapeXml(this.creator)}</dc:creator>`;
      if (this.created) coreXml += `<dcterms:created xsi:type="dcterms:W3CDTF">${this.created.toISOString()}</dcterms:created>`;
      coreXml += `</cp:coreProperties>`;
      this.zip.addFile('docProps/core.xml', enc.encode(coreXml));
      
      rootRels += `\n  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>`;
      contentTypes += `\n  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`;
    }

    rootRels += `\n</Relationships>`;
    this.zip.addFile('_rels/.rels', enc.encode(rootRels));

    // Workbook
    let workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`;
    let workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;

    this.worksheets.forEach((ws, i) => {
      const sheetId = i + 1;
      const rId = `rIdSheet${sheetId}`;
      workbookXml += `<sheet name="${this.escapeXml(ws.name)}" sheetId="${sheetId}" r:id="${rId}"/>`;
      workbookRels += `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetId}.xml"/>`;
      contentTypes += `<Override PartName="/xl/worksheets/sheet${sheetId}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
      this.zip.addFile(`xl/worksheets/sheet${sheetId}.xml`, enc.encode(ws.xml));
    });

    workbookXml += `</sheets></workbook>`;
    workbookRels += `</Relationships>`;
    contentTypes += `</Types>`;

    this.zip.addFile('xl/workbook.xml', enc.encode(workbookXml));
    this.zip.addFile('xl/_rels/workbook.xml.rels', enc.encode(workbookRels));
    this.zip.addFile('[Content_Types].xml', enc.encode(contentTypes));

    // Styles
    let fontsXml = `<fonts count="${this.styles.fonts.length}">`;
    this.styles.fonts.forEach(f => {
      fontsXml += `<font><sz val="${f.sz}"/><color rgb="${f.color}"/>${f.bold ? '<b/>' : ''}<name val="Calibri"/></font>`;
    });
    fontsXml += `</fonts>`;

    let fillsXml = `<fills count="${this.styles.fills.length}">`;
    this.styles.fills.forEach(f => {
      if (f.type === 'none' || f.type === 'gray125') {
        fillsXml += `<fill><patternFill patternType="${f.type}"/></fill>`;
      } else {
        fillsXml += `<fill><patternFill patternType="solid"><fgColor rgb="${(f as any).fgColor}"/></patternFill></fill>`;
      }
    });
    fillsXml += `</fills>`;

    let cellXfsXml = `<cellXfs count="${this.styles.cellXfs.length}">`;
    this.styles.cellXfs.forEach(x => {
      const applyFont = x.fontId > 0 ? ' applyFont="1"' : '';
      const applyFill = x.fillId > 0 ? ' applyFill="1"' : '';
      const applyAlign = x.alignment ? ' applyAlignment="1"' : '';
      const applyNumFmt = x.numFmtId > 0 ? ' applyNumberFormat="1"' : '';
      cellXfsXml += `<xf numFmtId="${x.numFmtId}" fontId="${x.fontId}" fillId="${x.fillId}" borderId="0" xfId="0"${applyNumFmt}${applyFont}${applyFill}${applyAlign}>`;
      if (x.alignment) {
        cellXfsXml += `<alignment ${x.alignment}/>`;
      }
      cellXfsXml += `</xf>`;
    });
    cellXfsXml += `</cellXfs>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${fontsXml}
  ${fillsXml}
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  ${cellXfsXml}
</styleSheet>`;

    this.zip.addFile('xl/styles.xml', enc.encode(stylesXml));

    return this.zip.generateAsync();
  }

  public static getColLetter(colIndex: number): string {
    let letter = '';
    while (colIndex > 0) {
      const mod = (colIndex - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      colIndex = Math.floor((colIndex - mod) / 26);
    }
    return letter;
  }

  private escapeXml(unsafe: string): string {
    if (unsafe == null) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
