import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generatePdf } from './pdf-layout-engine';
import { RandomizationResult } from '../../core/models/randomization.model';

const mocks = vi.hoisted(() => {
  return {
    mockSave: vi.fn(),
    mockSetLanguage: vi.fn(),
    mockSetProperties: vi.fn(),
    mockViewerPreferences: vi.fn(),
    mockMarkContentBegins: vi.fn(),
    mockMarkContentEnds: vi.fn(),
    mockSplitTextToSize: vi.fn((text: string) => [text]),
    mockText: vi.fn(),
    mockSetFontSize: vi.fn(),
    mockSetFont: vi.fn(),
    mockSetTextColor: vi.fn(),
    mockAutoTable: vi.fn((_doc: any, options: any) => {
      if (options && typeof options.didDrawPage === 'function') {
        options.didDrawPage({ pageNumber: 1 });
      }
    })
  };
});

vi.mock('jspdf', () => {
  return {
    default: class {
      internal = {
        pageSize: {
          getWidth: () => 210,
          getHeight: () => 297,
        },
        getNumberOfPages: () => 1
      };
      save = mocks.mockSave;
      setLanguage = mocks.mockSetLanguage;
      setProperties = mocks.mockSetProperties;
      viewerPreferences = mocks.mockViewerPreferences;
      markContentBegins = mocks.mockMarkContentBegins;
      markContentEnds = mocks.mockMarkContentEnds;
      splitTextToSize = mocks.mockSplitTextToSize;
      text = mocks.mockText;
      setFontSize = mocks.mockSetFontSize;
      setFont = mocks.mockSetFont;
      setTextColor = mocks.mockSetTextColor;
    }
  };
});

vi.mock('jspdf-autotable', () => {
  return {
    default: mocks.mockAutoTable
  };
});

const buildMockResult = (): RandomizationResult => ({
  metadata: {
    protocolId: 'PROTO-999',
    studyName: 'Isolated Engine Study',
    phase: 'Phase III',
    seed: 'seed-xyz',
    generatedAt: '2026-07-30T18:00:00.000Z',
    strata: [
      { id: 'region', name: 'Region', levels: ['US', 'EU'] }
    ],
    auditHash: '1122334455667788112233445566778811223344556677881122334455667788',
    config: {
      protocolId: 'PROTO-999',
      studyName: 'Isolated Engine Study',
      phase: 'Phase III',
      arms: [
        { id: 'active', name: 'Active', ratio: 1 },
        { id: 'placebo', name: 'Placebo', ratio: 1 },
      ],
      sites: ['Site 1'],
      blockSizes: [4],
      strata: [
        { id: 'region', name: 'Region', levels: ['US', 'EU'] }
      ],
      stratumCaps: [],
      seed: 'seed-xyz',
      subjectIdMask: '{SITE}-{SEQ:3}',
    },
  },
  schema: [
    {
      subjectId: 'Site 1-001',
      site: 'Site 1',
      stratum: { region: 'US' },
      stratumCode: 'US',
      blockNumber: 1,
      blockSize: 4,
      treatmentArm: 'Active',
      treatmentArmId: 'active',
    },
  ],
});

describe('PdfLayoutEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should construct doc and set standard versioning and structural content properties', () => {
    const result = buildMockResult();
    const narrative = 'Standard block randomization...';
    
    generatePdf(result, true, narrative, '1.35.0');

    // Verify PDF/UA properties and version configuration
    expect(mocks.mockSetLanguage).toHaveBeenCalledWith('en-US');
    expect(mocks.mockSetProperties).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Randomization Generation Certificate',
      keywords: expect.stringContaining('pdf-ua')
    }));
    expect(mocks.mockViewerPreferences).toHaveBeenCalledWith({
      DisplayDocTitle: true
    });
  });

  it('should add structured tags (H1, P, H2, Artifact) to the document', () => {
    const result = buildMockResult();
    const narrative = 'Sample narrative specifications';

    generatePdf(result, true, narrative, '1.35.0');

    // Assert that markContentBegins and markContentEnds were called for header, intro, section, and page footer
    expect(mocks.mockMarkContentBegins).toHaveBeenCalledWith('H1');
    expect(mocks.mockMarkContentBegins).toHaveBeenCalledWith('P');
    expect(mocks.mockMarkContentBegins).toHaveBeenCalledWith('H2');
    expect(mocks.mockMarkContentBegins).toHaveBeenCalledWith('Artifact');
    expect(mocks.mockMarkContentEnds).toHaveBeenCalled();
  });

  it('should call autoTable to render the metadata block and randomization tables', () => {
    const result = buildMockResult();
    const narrative = 'Specifications description';

    generatePdf(result, true, narrative, '1.35.0');

    // There should be two tables rendered via autoTable: the metadata block and the data grid.
    expect(mocks.mockAutoTable).toHaveBeenCalledTimes(2);

    // Assert first autoTable call (metadata block) has Field and Value headers
    const firstCallArgs = mocks.mockAutoTable.mock.calls[0][1];
    expect(firstCallArgs.head).toEqual([['Field', 'Value']]);

    // Assert second autoTable call (data grid) has proper structure
    const secondCallArgs = mocks.mockAutoTable.mock.calls[1][1];
    expect(secondCallArgs.head).toEqual([['Subject ID', 'Site', 'Region', 'Block', 'Treatment Arm']]);
  });

  it('should support isUnblinded parameter controlling blind masking of treatment arms', () => {
    const result = buildMockResult();
    const narrative = 'Methodology description';

    // 1. Unblinded
    generatePdf(result, true, narrative, '1.35.0');
    let secondCallArgs = mocks.mockAutoTable.mock.calls[1][1];
    expect(secondCallArgs.body[0][4]).toBe('Active');

    vi.clearAllMocks();

    // 2. Blinded
    generatePdf(result, false, narrative, '1.35.0');
    secondCallArgs = mocks.mockAutoTable.mock.calls[1][1];
    expect(secondCallArgs.body[0][4]).toBe('*** BLINDED ***');
  });

  it('should invoke save to prompt a client download with correct sanitized filename format', () => {
    const result = buildMockResult();
    const narrative = 'Clinical protocol export';

    generatePdf(result, true, narrative, '1.35.0');

    expect(mocks.mockSave).toHaveBeenCalledWith('randomization_PROTO-999_unblinded.pdf');
  });
});
