import { Injectable, inject } from '@angular/core';
import { RandomizationResult } from '../../core/models/randomization.model';
import { MethodologySpecificationService } from './methodology-specification.service';
import { DateUtil } from '../../../core/utils/date.util';
import { APP_VERSION } from '../../../../environments/version';
import { ThemeService } from '../../../core/services/theme.service';
import { OpenXmlWriter } from '../../../core/utils/openxml.util';
import { FileSecurityUtil } from '../../../core/utils/file-security.util';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Unified Export Service providing native CSV and Excel exports.
 * Removes third-party heavy dependencies for native Web APIs.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly methodologySpec = inject(MethodologySpecificationService);
  private readonly domainTheme = inject(ThemeService);

  // ---------------------------------------------------------------------------
  // CSV Export
  // ---------------------------------------------------------------------------

  exportCsv(result: RandomizationResult, isUnblinded: boolean): void {
    const strataHeaders = result.metadata.strata?.map(s => s.name || s.id) || [];
    const headers = ['Subject ID', 'Site', ...strataHeaders, 'Block Number', 'Block Size', 'Treatment Arm']
      .map(h => FileSecurityUtil.sanitizeCsvValue(h));

    const rows = result.schema.map(r => {
      const strataValues = result.metadata.strata?.map(s => r.stratum[s.id] || '') || [];
      return [
        r.subjectId,
        r.site,
        ...strataValues,
        r.blockNumber.toString(),
        r.blockSize.toString(),
        isUnblinded ? r.treatmentArm : '*** BLINDED ***'
      ].map(val => FileSecurityUtil.sanitizeCsvValue(val));
    });

    const watermark = "DRAFT SCHEMA - DO NOT USE FOR ENROLLMENT. Execute the generated R/SAS/Python script to generate the official trial schema for RTSM/IRT implementation.";
    const timestamp = DateUtil.getIsoTimestamp(new Date(result.metadata.generatedAt));
    const methodologyComments = this.methodologySpec.formatForCsv(
      this.methodologySpec.generateNarrative(result.metadata.config)
    );
    const csvContent = [
      `"${watermark}"`,
      `# Protocol ID: ${result.metadata.protocolId}`,
      `# Study Name: ${result.metadata.studyName}`,
      `# App Version: ${APP_VERSION}`,
      `# Generated At: ${timestamp}`,
      `# PRNG Algorithm: Mersenne Twister (MT19937)`,
      `# PRNG Seed: ${result.metadata.seed}`,
      `# SHA-256 Audit Hash: ${result.metadata.auditHash}`,
      methodologyComments,
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeProtocol = FileSecurityUtil.sanitizeFilename(result.metadata.protocolId);
    const dateStamp = DateUtil.getFileDatestamp(new Date());
    link.setAttribute('href', url);
    link.setAttribute('download', `randomization_${dateStamp}_${safeProtocol}_${isUnblinded ? 'unblinded' : 'blinded'}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // ---------------------------------------------------------------------------
  // Excel Export
  // ---------------------------------------------------------------------------

  async exportXlsx(result: RandomizationResult, isUnblinded: boolean): Promise<void> {
    const writer = new OpenXmlWriter();
    writer.creator = `Clinical Randomization Generator ${APP_VERSION}`;
    writer.created = new Date(result.metadata.generatedAt);
    
    this.buildSchemaSheet(writer, result, isUnblinded);
    this.buildAuditSheet(writer, result);

    const buffer = await writer.generateAsync();
    const blob = new Blob([buffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const blindLabel = isUnblinded ? 'unblinded' : 'blinded';
    const safeProtocol = FileSecurityUtil.sanitizeFilename(result.metadata.protocolId);
    const dateStamp = DateUtil.getFileDatestamp(new Date());
    link.setAttribute('download', `randomization_${dateStamp}_${safeProtocol}_${blindLabel}.xlsx`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  private buildSchemaSheet(writer: OpenXmlWriter, result: RandomizationResult, isUnblinded: boolean): void {
    const strataFactors = result.metadata.strata;
    const headerLabels = [
      'Subject ID',
      'Site',
      ...strataFactors.map(s => s.name || s.id),
      'Block Number',
      'Block Size',
      'Treatment Arm',
    ];

    const maxWidths = headerLabels.map(h => h.length);
    
    // Header Style (indigo-600)
    const headerStyle = writer.addStyle(
      { bold: true, color: 'FFFFFFFF' },
      { fgColor: 'FF4F46E5' },
      'vertical="center" horizontal="center"'
    );

    const textStyleId = writer.addStyle({}, {}, '', 49);

    const sheetRows: any[] = [];
    
    // Header row
    sheetRows.push({
      height: 22,
      cells: headerLabels.map(h => ({ val: h, styleId: headerStyle }))
    });

    const arms = result.metadata.config.arms;
    const armStyles = new Map<string, number>();

    for (const schema of result.schema) {
      const rowValues = [
        schema.subjectId,
        schema.site,
        ...strataFactors.map(f => schema.stratum[f.id] ?? ''),
        String(schema.blockNumber),
        String(schema.blockSize),
        isUnblinded ? schema.treatmentArm : '*** BLINDED ***'
      ];

      const cells = rowValues.map((val, colIdx) => {
        if (val.length > maxWidths[colIdx]) {
          maxWidths[colIdx] = val.length;
        }

        let styleId = textStyleId; // Default explicit Text format (@)
        if (colIdx === rowValues.length - 1 && isUnblinded) {
          const armIndex = arms.findIndex(a => a.id === schema.treatmentArmId);
          if (armIndex !== -1) {
            const hex = this.domainTheme.getArmColor(armIndex).hex;
            const argb = 'FF' + hex.substring(1).toUpperCase();
            if (!armStyles.has(argb)) {
              armStyles.set(argb, writer.addStyle({ bold: true, color: argb }, {}, '', 49));
            }
            styleId = armStyles.get(argb)!;
          }
        }
        return { val, styleId };
      });

      sheetRows.push({ cells });
    }

    const cols = maxWidths.map(w => Math.min(60, w + 3));
    
    const lastColLetter = OpenXmlWriter.getColLetter(headerLabels.length);
    const autoFilterRef = `A1:${lastColLetter}1`;

    writer.addWorksheet('Schema', sheetRows, {
      cols,
      freezePanes: true,
      autoFilterRef
    });
  }

  private buildAuditSheet(writer: OpenXmlWriter, result: RandomizationResult): void {
    const sheetRows: any[] = [];
    
    const headerStyle = writer.addStyle({ bold: true, sz: 12, color: 'FFFFFFFF' }, { fgColor: 'FF4F46E5' }, 'vertical="center"');
    const labelStyle = writer.addStyle({ bold: true }, { fgColor: 'FFEDE9FE' });
    const valueStyle = writer.addStyle({}, {}, 'wrapText="1"', 49); // explicitly format values as Text
    
    const watermarkStyle = writer.addStyle({ bold: true, color: 'FF991B1B' }, { fgColor: 'FFFEF2F2' }, 'wrapText="1"');
    
    // Watermark
    sheetRows.push({
      height: 30,
      cells: [
        {
          val: 'DRAFT SCHEMA - DO NOT USE FOR ENROLLMENT. Execute the generated R/SAS/Python/STATA script to generate the official trial schema for RTSM/IRT implementation.',
          styleId: watermarkStyle,
          mergeAcross: 1
        }
      ]
    });
    
    // Blank row
    sheetRows.push({ cells: [] });
    
    const addSectionHeader = (label: string) => {
      sheetRows.push({
        height: 20,
        cells: [{ val: label, styleId: headerStyle, mergeAcross: 1 }]
      });
    };

    const addMetaRow = (label: string, value: string) => {
      sheetRows.push({
        cells: [
          { val: label, styleId: labelStyle },
          { val: value, styleId: valueStyle }
        ]
      });
    };

    // Trial Metadata
    addSectionHeader('Trial Metadata');
    const timestamp = DateUtil.getIsoTimestamp(new Date(result.metadata.generatedAt));
    addMetaRow('Protocol ID', result.metadata.protocolId);
    addMetaRow('Study Name', result.metadata.studyName);
    addMetaRow('Phase', result.metadata.phase);
    addMetaRow('App Version', APP_VERSION);
    addMetaRow('Generated At (ISO 8601)', timestamp);
    
    sheetRows.push({ cells: [] }); // blank

    // PRNG & Audit
    addSectionHeader('PRNG & Audit');
    addMetaRow('PRNG Algorithm', 'Mersenne Twister (MT19937)');
    addMetaRow('PRNG Seed', result.metadata.seed);
    addMetaRow('SHA-256 Audit Hash', result.metadata.auditHash);
    
    sheetRows.push({ cells: [] }); // blank

    // Methodology Narrative
    addSectionHeader('Randomization Methodology');
    const narrative = this.methodologySpec.generateNarrative(result.metadata.config);
    const narrativeParagraphs = narrative.split('\n\n');
    
    for (const paragraph of narrativeParagraphs) {
      const val = paragraph.replace(/\n/g, ' ');
      sheetRows.push({
        height: Math.max(20, Math.ceil(val.length / 100) * 15),
        cells: [{ val, styleId: valueStyle, mergeAcross: 1 }]
      });
    }

    writer.addWorksheet('Audit & Configuration', sheetRows, { cols: [30, 80] });
  }

  // ---------------------------------------------------------------------------
  // PDF Export (Accessible / PDF/UA-1 Compliant)
  // ---------------------------------------------------------------------------

  exportPdf(result: RandomizationResult, isUnblinded: boolean): void {
    const doc = new (jsPDF as any)({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      tagged: true,             // Critical for Tagged PDF structure tree
      pdfVersion: '1.7',        // Standard supporting structured tagging
      putOnlyUsedFonts: true,
      compress: true
    });

    if (typeof (doc as any).setLanguage === 'function') {
      (doc as any).setLanguage('en-US');
    }
    doc.setProperties({
      title: 'Randomization Generation Certificate',
      author: 'Clinical Export Pipeline Service',
      subject: 'Trial Design Metadata Verification',
      keywords: 'randomization, clinical-trial, pdf-ua'
    });
    if (typeof (doc as any).viewerPreferences === 'function') {
      (doc as any).viewerPreferences({
        DisplayDocTitle: true
      });
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const timestamp = DateUtil.getIsoTimestamp(new Date(result.metadata.generatedAt));
    const auditHash = result.metadata.auditHash;
    const truncatedHash = auditHash ? `${auditHash.substring(0, 16)}…${auditHash.substring(48, 64)}` : 'N/A';

    // ── Certificate Header (H1) ─────────────────────────────────────────────
    if (typeof (doc as any).markContentBegins === 'function') (doc as any).markContentBegins('H1');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('RTSM/IRT RANDOMIZATION GENERATION CERTIFICATE', pageWidth / 2, 18, { align: 'center' });
    if (typeof (doc as any).markContentEnds === 'function') (doc as any).markContentEnds();

    // ── Intro Paragraph (P) ──────────────────────────────────────────────
    if (typeof (doc as any).markContentBegins === 'function') (doc as any).markContentBegins('P');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const statement =
      'This document certifies the algorithmic generation of the RTSM/IRT randomization schema detailed ' +
      'below. The integrity of this dataset is mathematically verified by the attached cryptographic hash.';
    const splitStatement = doc.splitTextToSize(statement, pageWidth - 28);
    doc.text(splitStatement, 14, 26);
    if (typeof (doc as any).markContentEnds === 'function') (doc as any).markContentEnds();

    // ── Metadata Block ─────────────────────────────────────────────────────
    const metaStartY = 26 + splitStatement.length * 5 + 4;
    const metaRows: [string, string][] = [
      ['Protocol ID', result.metadata.protocolId],
      ['Study Name', result.metadata.studyName],
      ['Phase', result.metadata.phase],
      ['App Version', APP_VERSION],
      ['PRNG Algorithm', 'Mersenne Twister (MT19937)'],
      ['PRNG Seed', result.metadata.seed],
      ['Generated At (ISO 8601)', timestamp],
      ['SHA-256 Audit Hash', auditHash],
    ];

    autoTable(doc, {
      startY: metaStartY,
      head: [['Field', 'Value']],
      body: metaRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { cellWidth: 'auto', font: 'courier' } },
      didParseCell: (hookData) => {
        if (hookData.row.index === metaRows.length - 1 && hookData.section === 'body') {
          hookData.cell.styles.fillColor = [235, 232, 255];
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    });

    // ── Randomization Plan & Specifications (H2 & P) ───────────────────────
    const planStartY = (doc as any).lastAutoTable?.finalY + 8 || metaStartY + 60;

    if (typeof (doc as any).markContentBegins === 'function') (doc as any).markContentBegins('H2');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Randomization Plan & Specifications', 14, planStartY);
    if (typeof (doc as any).markContentEnds === 'function') (doc as any).markContentEnds();

    if (typeof (doc as any).markContentBegins === 'function') (doc as any).markContentBegins('P');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);

    const narrative = this.methodologySpec.generateNarrative(result.metadata.config);
    const narrativeLines = doc.splitTextToSize(narrative, pageWidth - 28);
    doc.text(narrativeLines, 14, planStartY + 6);
    if (typeof (doc as any).markContentEnds === 'function') (doc as any).markContentEnds();

    const planEndY = planStartY + 6 + narrativeLines.length * 4.5;

    // ── Data Table ─────────────────────────────────────────────────────────
    const tableStartY = planEndY + 6;

    const strataHeaders = result.metadata.strata?.map(s => s.name || s.id) || [];
    const headers = [['Subject ID', 'Site', ...strataHeaders, 'Block', 'Treatment Arm']];

    const rows = result.schema.map(r => {
      const strataValues = result.metadata.strata?.map(s => r.stratum[s.id] || '') || [];
      return [
        r.subjectId,
        r.site,
        ...strataValues,
        `${r.blockNumber} (n=${r.blockSize})`,
        isUnblinded ? r.treatmentArm : '*** BLINDED ***'
      ];
    });

    autoTable(doc, {
      startY: tableStartY,
      head: headers,
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9, cellPadding: 3 },
      didDrawPage: (hookData) => {
        if (typeof (doc as any).markContentBegins === 'function') (doc as any).markContentBegins('Artifact');
        const pageCount = (doc as any).internal.getNumberOfPages();
        const footerY = doc.internal.pageSize.getHeight() - 8;
        doc.setFontSize(7);
        doc.setTextColor(130);
        doc.text(
          `Protocol: ${result.metadata.protocolId}  |  Page ${hookData.pageNumber} of ${pageCount}  |  Hash: ${truncatedHash}`,
          pageWidth / 2,
          footerY,
          { align: 'center' }
        );
        if (typeof (doc as any).markContentEnds === 'function') (doc as any).markContentEnds();
      }
    });

    const safeProtocol = FileSecurityUtil.sanitizeFilename(result.metadata.protocolId);
    doc.save(`randomization_${safeProtocol}_${isUnblinded ? 'unblinded' : 'blinded'}.pdf`);
  }
}
