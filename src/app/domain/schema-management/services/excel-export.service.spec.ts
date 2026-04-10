import { TestBed } from '@angular/core/testing';
import { ExcelExportService } from './excel-export.service';
import { RandomizationResult } from '../../core/models/randomization.model';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal ExcelJS mock – avoids pulling in the real library during unit tests
// ---------------------------------------------------------------------------

const mockCell = () => ({
  value: undefined as unknown,
  dataValidation: undefined as unknown,
  type: undefined as unknown,
  numFmt: undefined as string | undefined,
  font: undefined as unknown,
  fill: undefined as unknown,
  alignment: undefined as unknown,
});

const mockRow = () => {
  const cells: Record<number, ReturnType<typeof mockCell>> = {};
  const row = {
    getCell: (idx: number) => {
      if (!cells[idx]) cells[idx] = mockCell();
      return cells[idx];
    },
    font: undefined as unknown,
    fill: undefined as unknown,
    alignment: undefined as unknown,
    height: undefined as unknown,
    _cells: cells,
  };
  return row;
};

const mockSheet = () => {
  const rows: Record<number, ReturnType<typeof mockRow>> = {};
  const sheet = {
    columns: [] as unknown[],
    views: [] as unknown[],
    autoFilter: undefined as unknown,
    addRow: vi.fn(() => {
      const r = mockRow();
      // Give addRow a getCell method too
      return r;
    }),
    getRow: (idx: number) => {
      if (!rows[idx]) rows[idx] = mockRow();
      return rows[idx];
    },
    getColumn: vi.fn(() => ({ width: undefined as unknown })),
    mergeCells: vi.fn(),
  };
  return sheet;
};

vi.mock('exceljs', () => {
  const WorkbookMock = class {
    creator: string = '';
    created: Date = new Date();
    _sheets: ReturnType<typeof mockSheet>[] = [];

    addWorksheet = vi.fn(() => {
      const s = mockSheet();
      this._sheets.push(s);
      return s;
    });

    xlsx = {
      writeBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
    };
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

  it('should trigger a download with an .xlsx filename', async () => {
    const result = buildMockResult();
    await service.exportXlsx(result, true);

    expect(appendChildSpy).toHaveBeenCalled();
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.getAttribute('download')).toMatch(/\.xlsx$/);
  });

  it('should include "unblinded" in filename when isUnblinded is true', async () => {
    const result = buildMockResult();
    await service.exportXlsx(result, true);

    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.getAttribute('download')).toContain('unblinded');
  });

  it('should include "blinded" in filename when isUnblinded is false', async () => {
    const result = buildMockResult();
    await service.exportXlsx(result, false);

    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.getAttribute('download')).toContain('blinded');
  });

  it('should include the protocol ID in the filename', async () => {
    const result = buildMockResult();
    await service.exportXlsx(result, true);

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
    const result = buildMockResult();
    await service.exportXlsx(result, true);

    expect(removeChildSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it('should revoke the object URL after 100ms', async () => {
    const result = buildMockResult();
    await service.exportXlsx(result, true);

    expect(revokeObjectURLSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});
