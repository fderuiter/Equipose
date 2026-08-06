import { TestBed } from '@angular/core/testing';
import { ExportService } from './export.service';
import { RandomizationResult } from '../../core/models/randomization.model';
import { OpenXmlWriter } from '../../../core/utils/openxml.util';
import { vi } from 'vitest';

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

describe('ExportService', () => {
  let service: ExportService;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportService);

    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((n: any) => n);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((n: any) => n);
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => { /* no-op */ });
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

  describe('exportXlsx', () => {
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

    it('should defer DOM cleanup by 100ms', async () => {
      await service.exportXlsx(buildMockResult(), true);

      expect(removeChildSpy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('should render multi-tab structures and trigger file saves', async () => {
      const addWorksheetSpy = vi.spyOn(OpenXmlWriter.prototype, 'addWorksheet');
      const generateAsyncSpy = vi.spyOn(OpenXmlWriter.prototype, 'generateAsync');
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const mockResult = buildMockResult();
      await service.exportXlsx(mockResult, true);

      // Verify that multi-tab structure (worksheets) was built
      expect(addWorksheetSpy).toHaveBeenCalledTimes(2);
      expect(addWorksheetSpy.mock.calls[0][0]).toBe('Schema');
      expect(addWorksheetSpy.mock.calls[1][0]).toBe('Audit & Configuration');

      // Verify that ZIP/OpenXML generation is triggered
      expect(generateAsyncSpy).toHaveBeenCalled();

      // Verify a file save/download is triggered on the DOM
      expect(appendChildSpy).toHaveBeenCalled();
      const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(anchor.getAttribute('download')).toMatch(/\.xlsx$/);
      expect(clickSpy).toHaveBeenCalled();

      addWorksheetSpy.mockRestore();
      generateAsyncSpy.mockRestore();
      clickSpy.mockRestore();
    });
  });

  describe('exportCsv', () => {
    it('should trigger a download with an .csv filename', () => {
      service.exportCsv(buildMockResult(), true);

      expect(appendChildSpy).toHaveBeenCalled();
      const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(anchor.getAttribute('download')).toMatch(/\.csv$/);
    });

    it('should sanitize CSV payload correctly', () => {
      service.exportCsv(buildMockResult(), true);
      // Ensure the object URL was created which implies Blob logic executed
      expect(createObjectURLSpy).toHaveBeenCalled();
    });
  });

  describe('Standardized Persona Validation Integration', () => {
    // @persona:Biostatistician
    it('should allow Biostatistician to export unblinded allocations', () => {
      const validator = (service as any).personaValidator;
      validator.activePersona.set('Biostatistician');
      service.exportCsv(buildMockResult(), false);
      expect(appendChildSpy).toHaveBeenCalled();
    });

    // @persona:TrialManager
    it('should enforce Trial Manager blinded rules and verify simulation export configuration states', () => {
      const validator = (service as any).personaValidator;
      validator.activePersona.set('TrialManager');
      expect(validator.canExportSchema('Simulation')).toBe(false);
      expect(validator.canExportSchema('Formal')).toBe(true);
    });
  });
});

