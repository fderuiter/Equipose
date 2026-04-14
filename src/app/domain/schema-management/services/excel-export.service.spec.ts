import { TestBed } from '@angular/core/testing';
import { ExcelExportService } from './excel-export.service';
import { RandomizationResult } from '../../core/models/randomization.model';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Shared mock state – vi.hoisted ensures initialisation runs before vi.mock
// factories are evaluated (vi.mock calls are hoisted to the top of the file).
// ---------------------------------------------------------------------------

const mockState = vi.hoisted(() => ({
  workbooks: [] as Array<{
    creator: string;
    created: Date;
    _sheets: ReturnType<typeof createMockSheet>[];
    addWorksheet: ReturnType<typeof vi.fn>;
    xlsx: { writeBuffer: ReturnType<typeof vi.fn> };
  }>,
}));

// ---------------------------------------------------------------------------
// Mock cell / row / sheet factories (defined at module scope so both the
// vi.mock factory AND the test assertions can reference them).
// ---------------------------------------------------------------------------

function createMockCell() {
  return {
    value: undefined as unknown,
    numFmt: undefined as string | undefined,
    font: undefined as unknown,
    fill: undefined as unknown,
    alignment: undefined as unknown,
  };
}

function createMockRow() {
  const cells: Record<number, ReturnType<typeof createMockCell>> = {};
  return {
    getCell: (idx: number) => {
      if (!cells[idx]) cells[idx] = createMockCell();
      return cells[idx];
    },
    font: undefined as unknown,
    fill: undefined as unknown,
    alignment: undefined as unknown,
    height: undefined as unknown,
    _cells: cells,
  };
}

function createMockSheet(name: string) {
  const namedRows: Record<number, ReturnType<typeof createMockRow>> = {};
  const dataRows: ReturnType<typeof createMockRow>[] = [];
  return {
    name,
    columns: [] as unknown[],
    views: [] as unknown[],
    autoFilter: undefined as unknown,
    _namedRows: namedRows,
    _dataRows: dataRows,
    addRow: vi.fn(() => {
      const r = createMockRow();
      dataRows.push(r);
      return r;
    }),
    getRow: (idx: number) => {
      if (!namedRows[idx]) namedRows[idx] = createMockRow();
      return namedRows[idx];
    },
    getColumn: vi.fn(() => ({ width: undefined as unknown })),
    mergeCells: vi.fn(),
  };
}

vi.mock('exceljs', () => {
  const WorkbookMock = class {
    creator = '';
    created = new Date();
    _sheets: ReturnType<typeof createMockSheet>[] = [];

    addWorksheet = vi.fn((name: string) => {
      const s = createMockSheet(name);
      this._sheets.push(s);
      return s;
    });

    xlsx = {
      writeBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
    };

    constructor() {
      mockState.workbooks.push(this as any);
    }
  };
  return { default: { Workbook: WorkbookMock } };
});

// ---------------------------------------------------------------------------

const buildMockResult = (): RandomizationResult => ({
  metadata: {
    protocolId: 'PROTO-001',
    studyName: 'Test Study',
    phase: 'Phase II',
    seed: 'seed-abc',
    generatedAt: '2024-01-15T10:00:00.000Z',
    strata: [
      { id: 'sex', name: 'Sex', levels: ['M', 'F'] },
      { id: 'age', name: 'Age Group', levels: ['<65', '>=65'] },
    ],
    auditHash: 'aabbccdd00112233aabbccdd00112233aabbccdd00112233aabbccdd00112233',
    config: {
      protocolId: 'PROTO-001',
      studyName: 'Test Study',
      phase: 'Phase II',
      arms: [
        { id: 'a', name: 'Active', ratio: 1 },
        { id: 'p', name: 'Placebo', ratio: 1 },
      ],
      sites: ['Site A', 'Site B'],
      blockSizes: [4],
      strata: [
        { id: 'sex', name: 'Sex', levels: ['M', 'F'] },
        { id: 'age', name: 'Age Group', levels: ['<65', '>=65'] },
      ],
      stratumCaps: [],
      seed: 'seed-abc',
      subjectIdMask: '{SITE}-{SEQ:3}',
    },
  },
  schema: [
    {
      subjectId: 'Site A-001',
      site: 'Site A',
      stratum: { sex: 'M', age: '<65' },
      stratumCode: 'MAL',
      blockNumber: 1,
      blockSize: 4,
      treatmentArm: 'Active',
      treatmentArmId: 'a',
    },
    {
      subjectId: 'Site A-002',
      site: 'Site A',
      stratum: { sex: 'F', age: '>=65' },
      stratumCode: 'FEM',
      blockNumber: 1,
      blockSize: 4,
      treatmentArm: 'Placebo',
      treatmentArmId: 'p',
    },
  ],
});

// ---------------------------------------------------------------------------

describe('ExcelExportService', () => {
  let service: ExcelExportService;

  // Spy on DOM link manipulation to avoid navigation errors in jsdom.
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockState.workbooks = [];

    TestBed.configureTestingModule({});
    service = TestBed.inject(ExcelExportService);

    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((n: any) => n);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((n: any) => n);
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── Workbook structure ───────────────────────────────────────────────────

  it('should create exactly two worksheets per export', async () => {
    await service.exportXlsx(buildMockResult(), true);
    const workbook = mockState.workbooks[0];
    expect(workbook.addWorksheet).toHaveBeenCalledTimes(2);
  });

  it('should create the "Schema" sheet as the first worksheet', async () => {
    await service.exportXlsx(buildMockResult(), true);
    const workbook = mockState.workbooks[0];
    expect(workbook.addWorksheet).toHaveBeenNthCalledWith(1, 'Schema');
  });

  it('should create the "Audit & Configuration" sheet as the second worksheet', async () => {
    await service.exportXlsx(buildMockResult(), true);
    const workbook = mockState.workbooks[0];
    expect(workbook.addWorksheet).toHaveBeenNthCalledWith(2, 'Audit & Configuration');
  });

  // ── Schema sheet – cell formatting ───────────────────────────────────────

  it('should set numFmt "@" on every schema data cell to enforce Text type', async () => {
    await service.exportXlsx(buildMockResult(), true);
    const schemaSheet = mockState.workbooks[0]._sheets[0];
    // Two data rows, each with 6 columns (subjectId, site, sex, age, blockNum, blockSize, treatmentArm → 7 cols total)
    for (const dataRow of schemaSheet._dataRows) {
      for (let colIdx = 1; colIdx <= 7; colIdx++) {
        const cell = dataRow.getCell(colIdx);
        expect(cell.numFmt).toBe('@');
      }
    }
  });

  it('should write the Subject ID as a plain string value', async () => {
    await service.exportXlsx(buildMockResult(), true);
    const schemaSheet = mockState.workbooks[0]._sheets[0];
    const firstRow = schemaSheet._dataRows[0];
    // Column 1 is Subject ID
    expect(firstRow.getCell(1).value).toBe('Site A-001');
  });

  // ── Blinding behaviour ───────────────────────────────────────────────────

  it('should show real treatment arm when isUnblinded is true', async () => {
    await service.exportXlsx(buildMockResult(), true);
    const schemaSheet = mockState.workbooks[0]._sheets[0];
    const firstRow = schemaSheet._dataRows[0];
    // treatmentArm is the last column (index 7 for 2 strata factors)
    expect(firstRow.getCell(7).value).toBe('Active');
  });

  it('should mask treatment arm with "*** BLINDED ***" when isUnblinded is false', async () => {
    await service.exportXlsx(buildMockResult(), false);
    const schemaSheet = mockState.workbooks[0]._sheets[0];
    for (const dataRow of schemaSheet._dataRows) {
      expect(dataRow.getCell(7).value).toBe('*** BLINDED ***');
    }
  });

  // ── Download mechanics ───────────────────────────────────────────────────

  it('should trigger a download with an .xlsx filename', async () => {
    await service.exportXlsx(buildMockResult(), true);

    expect(appendChildSpy).toHaveBeenCalled();
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.getAttribute('download')).toMatch(/\.xlsx$/);
  });

  it('should include "unblinded" in filename when isUnblinded is true', async () => {
    await service.exportXlsx(buildMockResult(), true);
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.getAttribute('download')).toContain('unblinded');
  });

  it('should include "blinded" in filename when isUnblinded is false', async () => {
    await service.exportXlsx(buildMockResult(), false);
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.getAttribute('download')).toContain('blinded');
  });

  it('should include the protocol ID in the filename', async () => {
    await service.exportXlsx(buildMockResult(), true);
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.getAttribute('download')).toContain('PROTO-001');
  });

  it('should sanitize special characters in the protocol ID for the filename', async () => {
    const result = buildMockResult();
    result.metadata.protocolId = 'PROTO/001 (test)';
    await service.exportXlsx(result, true);

    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    const filename = anchor.getAttribute('download') ?? '';
    expect(filename).not.toMatch(/[/ ()]/);
  });

  it('should defer DOM cleanup by 100ms', async () => {
    await service.exportXlsx(buildMockResult(), true);

    expect(removeChildSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it('should revoke the object URL after 100ms', async () => {
    await service.exportXlsx(buildMockResult(), true);

    expect(revokeObjectURLSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});

