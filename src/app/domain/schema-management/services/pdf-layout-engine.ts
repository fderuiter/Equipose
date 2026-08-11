import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RandomizationResult } from '../../core/models/randomization.model';
import { DateUtil } from '../../../core/utils/date.util';
import { FileSecurityUtil } from '../../../core/utils/file-security.util';
import { PersonaValidationService } from '../../core/validation/persona-validator.service';

/**
 * Isolated PDF Generation function supporting structured content tags and standard 1.7 versioning.
 * This function can be run and tested in isolation.
 */
export function generatePdf(
  result: RandomizationResult,
  isUnblinded: boolean,
  narrative: string,
  appVersion: string,
  personaValidator?: PersonaValidationService
): void {
  const validator = personaValidator || new PersonaValidationService();
  if (!personaValidator) {
    // Default to an authorized context for standalone PDF generation calls/tests
    validator.activeSegment.set('Academic');
  }
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
    ['App Version', appVersion],
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
      validator.getMaskedTreatment(r.treatmentArm, isUnblinded)
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
