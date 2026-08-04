
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CodeGeneratorModalComponent } from './code-generator-modal.component';
import { RandomizationEngineFacade } from '../../randomization-engine/randomization-engine.facade';
import { CodeGeneratorService } from '../services/code-generator.service';
import { CodeGenerationError } from '../errors/code-generation-errors';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { RandomizationConfig } from '../../core/models/randomization.model';

describe('CodeGeneratorModalComponent (domain)', () => {
  let component: CodeGeneratorModalComponent;
  let mockFacade: unknown;
  let mockCodeGeneratorService: unknown;

  beforeEach(async () => {
    mockFacade = {
      config: signal<RandomizationConfig | null>(null),
      results: signal(null),
      isGenerating: signal(false),
      error: signal(null),
      showCodeGenerator: signal(false),
      codeLanguage: signal('R'),
      generateSchema: vi.fn(),
      generateSchemaAsync: vi.fn().mockResolvedValue({
        metadata: {
          auditHash: 'fake_hash',
          generatedAt: new Date().toISOString(),
          config: { seed: 'fake_seed' }
        }
      }),
      openCodeGenerator: vi.fn(),
      closeCodeGenerator: vi.fn(),
      clearResults: vi.fn()
    };

    mockCodeGeneratorService = {
      generate: vi.fn().mockReturnValue('Mock Generated Code'),
      generateR: vi.fn().mockReturnValue('Mock R Code'),
      generatePython: vi.fn().mockReturnValue('Mock Python Code'),
      generateSas: vi.fn().mockReturnValue('Mock SAS Code'),
      generateStatic: vi.fn().mockReturnValue('Mock Static Code'),
      generateDynamic: vi.fn().mockReturnValue('Mock Dynamic Code')
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: RandomizationEngineFacade, useValue: mockFacade },
        { provide: CodeGeneratorService, useValue: mockCodeGeneratorService }
      ]
    });

    await TestBed.runInInjectionContext(async () => {
      component = new CodeGeneratorModalComponent();
      await component.ngOnInit();
    });
  });

  describe('when config is fully populated', () => {
    let mockConfig: RandomizationConfig;

    beforeEach(() => {
      mockConfig = {
        protocolId: 'TEST-123',
        studyName: 'Test Study',
        phase: 'Phase 1',
        arms: [
          { id: '1', name: 'Arm A', ratio: 1 },
          { id: '2', name: 'Arm B', ratio: 2 }
        ],
        sites: ['Site1', 'Site2'],
        strata: [
          { id: 'strata1', name: 'Strata 1', levels: ['Low', 'High'] },
          { id: 'strata2', name: 'Strata 2', levels: ['Yes', 'No'] }
        ],
        blockSizes: [3, 6],
        stratumCaps: [
          { levelIds: {}, cap: 10 },
          { levelIds: {}, cap: 15 },
          { levelIds: {}, cap: 5 },
          { levelIds: {}, cap: 20 }
        ],
        seed: 'test_seed',
        subjectIdMask: '[SiteID]-[StratumCode]-[001]'
      };
      (mockFacade as any).config.set(mockConfig);
    });

    it('should generate valid R code', async () => {
      (mockCodeGeneratorService as any).generate.mockReturnValue('Mock R Code');
      await component.setActiveTab('R');
      const code = component.currentCode;
      expect((mockCodeGeneratorService as any).generate).toHaveBeenCalledWith('R', mockConfig, expect.anything());
      expect(code).toBe('Mock R Code');
    });

    it('should generate valid Python code', async () => {
      (mockCodeGeneratorService as any).generate.mockReturnValue('Mock Python Code');
      await component.setActiveTab('Python');
      const code = component.currentCode;
      expect((mockCodeGeneratorService as any).generate).toHaveBeenCalledWith('Python', mockConfig, expect.anything());
      expect(code).toBe('Mock Python Code');
    });

    it('should generate valid SAS code', async () => {
      (mockCodeGeneratorService as any).generate.mockReturnValue('Mock SAS Code');
      await component.setActiveTab('SAS');
      const code = component.currentCode;
      expect((mockCodeGeneratorService as any).generate).toHaveBeenCalledWith('SAS', mockConfig, expect.anything());
      expect(code).toBe('Mock SAS Code');
    });
  });

  describe('when config properties are undefined', () => {
    beforeEach(() => {
      (mockFacade as any).config.set(null);
    });

    it('should handle missing config gracefully', async () => {
      await component.setActiveTab('R');
      const code = component.currentCode;
      expect(code).toBe('');
      expect((mockCodeGeneratorService as any).generate).not.toHaveBeenCalled();
    });
  });

  describe('downloadCode()', () => {
    let mockConfig: RandomizationConfig;

    beforeEach(() => {
      vi.useFakeTimers();
      globalThis.URL.createObjectURL = vi.fn(() => "mock://url") as unknown as (obj: Blob | MediaSource) => string;
      globalThis.URL.revokeObjectURL = vi.fn() as unknown as (url: string) => void;

      mockConfig = {
        protocolId: 'DL-TEST',
        studyName: 'Download Test',
        phase: 'Phase I',
        arms: [{ id: '1', name: 'Active', ratio: 1 }],
        sites: ['Site1'],
        strata: [],
        blockSizes: [2],
        stratumCaps: [],
        seed: 'dl_seed',
        subjectIdMask: '[SiteID]-[001]'
      };
      (mockFacade as any).config.set(mockConfig);
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    const verifyDownloadFilename = async (language: 'R' | 'SAS' | 'Python' | 'STATA', expectedFilename: string) => {
      const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n as Node);
      vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n as Node);

      await component.setActiveTab(language);
      component.downloadCode();

      const anchorEl = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(anchorEl.getAttribute('download')).toBe(expectedFilename);
    };

    it('should use randomization_schema.R as the filename for R code', async () => {
      await verifyDownloadFilename('R', 'randomization_schema.R');
    });

    it('should use randomization_schema.sas as the filename for SAS code', async () => {
      await verifyDownloadFilename('SAS', 'randomization_schema.sas');
    });

    it('should use randomization_schema.py as the filename for Python code', async () => {
      await verifyDownloadFilename('Python', 'randomization_schema.py');
    });

    it('should use randomization_schema.do as the filename for STATA code', async () => {
      await verifyDownloadFilename('STATA', 'randomization_schema.do');
    });

    it('should call URL.createObjectURL with a Blob', async () => {
      vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n as Node);
      vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n as Node);

      await component.setActiveTab('R');
      component.downloadCode();

      expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });

    it('should initiate ZIP file generation when exportMode is BOTH', async () => {
      const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n as Node);
      const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n as Node);
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      component.exportMode.set('BOTH');
      await component.setActiveTab('R');
      await component.downloadCode();

      expect((mockCodeGeneratorService as any).generateStatic).toHaveBeenCalledWith('R', mockConfig, undefined);
      expect((mockCodeGeneratorService as any).generateDynamic).toHaveBeenCalledWith('R', mockConfig, undefined);

      expect(appendSpy).toHaveBeenCalled();
      const anchorEl = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(anchorEl.getAttribute('download')).toBe('randomization_schema_bundle.zip');
      expect(clickSpy).toHaveBeenCalled();

      appendSpy.mockRestore();
      removeSpy.mockRestore();
      clickSpy.mockRestore();
    });
  });

  describe('copyCode()', () => {
    let mockConfig: RandomizationConfig;

    beforeEach(async () => {
      mockConfig = {
        protocolId: 'COPY-TEST',
        studyName: 'Copy Test',
        phase: 'Phase I',
        arms: [{ id: '1', name: 'Active', ratio: 1 }],
        sites: ['Site1'],
        strata: [],
        blockSizes: [2],
        stratumCaps: [],
        seed: 'copy_seed',
        subjectIdMask: '[SiteID]-[001]'
      };
      (mockFacade as any).config.set(mockConfig);
      (mockCodeGeneratorService as any).generate.mockReturnValue('Mock R Code');
      await component.setActiveTab('R');
    });

    it('should write the current code to the clipboard', () => {
      const clipboardWriteSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: clipboardWriteSpy },
        configurable: true,
        writable: true
      });

      component.copyCode();
      expect(clipboardWriteSpy).toHaveBeenCalledWith('Mock R Code');
    });

    it('should set the copied signal to true immediately after calling copyCode()', () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
        writable: true
      });

      component.copyCode();
      expect(component.copied()).toBe(true);
    });
  });

  describe('error handling', () => {
    let mockConfig: RandomizationConfig;

    beforeEach(() => {
      mockConfig = {
        protocolId: 'ERR-TEST',
        studyName: 'Error Test',
        phase: 'Phase I',
        arms: [{ id: '1', name: 'Active', ratio: 1 }],
        sites: ['Site1'],
        strata: [],
        blockSizes: [2],
        stratumCaps: [],
        seed: 'err_seed',
        subjectIdMask: '[SiteID]-[001]'
      };
      (mockFacade as any).config.set(mockConfig);
    });

    it('should set errorState when the code generator throws a CodeGenerationError', async () => {
      const codeGenErr = new CodeGenerationError('Specific failure', mockConfig);
      (mockCodeGeneratorService as any).generate.mockImplementation(() => { throw codeGenErr; });

      await component.setActiveTab('R');

      expect(component.errorState()).toBe(codeGenErr);
      expect(component.currentCode).toBe('');
    });

    it('should wrap non-CodeGenerationError exceptions in a CodeGenerationError', async () => {
      (mockCodeGeneratorService as any).generate.mockImplementation(() => {
        throw new Error('raw failure');
      });

      await component.setActiveTab('R');

      const err = component.errorState();
      expect(err).toBeInstanceOf(CodeGenerationError);
      expect(err!.message).toContain('raw failure');
    });

    it('should clear errorState and show code when switching to a tab that succeeds', async () => {
      (mockCodeGeneratorService as any).generate.mockImplementationOnce(() => { throw new CodeGenerationError('bad', mockConfig); });
      await component.setActiveTab('R');
      expect(component.errorState()).not.toBeNull();

      (mockCodeGeneratorService as any).generate.mockReturnValue('Good SAS code');
      await component.setActiveTab('SAS');
      expect(component.errorState()).toBeNull();
      expect(component.currentCode).toBe('Good SAS code');
    });
  });

  describe('Pocock-Simon Minimization specific behavior', () => {
    let minConfig: RandomizationConfig;

    beforeEach(() => {
      minConfig = {
        protocolId: 'MIN-TEST',
        studyName: 'Minimization Study',
        phase: 'Phase II',
        arms: [{ id: '1', name: 'Active', ratio: 1 }],
        sites: ['Site1'],
        strata: [],
        blockSizes: [],
        stratumCaps: [],
        seed: 'min_seed',
        subjectIdMask: '[SiteID]-[001]',
        randomizationMethod: 'MINIMIZATION',
        minimizationConfig: { p: 0.8, totalSampleSize: 100 }
      };
      (mockFacade as any).config.set(minConfig);
    });

    it('should detect minimization and set isMinimization to true', () => {
      expect(component.isMinimization()).toBe(true);
    });

    it('should normalize exportMode to STATIC on initialization for minimization', async () => {
      component.exportMode.set('DYNAMIC');
      await component.ngOnInit();
      expect(component.exportMode()).toBe('STATIC');
    });

    it('should not allow switching exportMode away from STATIC when isMinimization is true', async () => {
      await component.ngOnInit();
      expect(component.exportMode()).toBe('STATIC');

      await component.setExportMode('DYNAMIC');
      expect(component.exportMode()).toBe('STATIC');

      await component.setExportMode('BOTH');
      expect(component.exportMode()).toBe('STATIC');
    });
  });

  describe('PRNG Sequence Parity Warning Banner Rendering', () => {
    let fixture: ComponentFixture<CodeGeneratorModalComponent>;
    let renderedComponent: CodeGeneratorModalComponent;
    let mockConfig: RandomizationConfig;

    beforeEach(async () => {
      mockConfig = {
        protocolId: 'TEST-BANNER',
        studyName: 'Banner Study',
        phase: 'Phase III',
        arms: [
          { id: '1', name: 'Arm A', ratio: 1 },
          { id: '2', name: 'Arm B', ratio: 1 }
        ],
        sites: ['Site1'],
        strata: [],
        blockSizes: [2],
        stratumCaps: [],
        seed: 'banner_seed',
        subjectIdMask: '[SiteID]-[001]'
      };
      (mockFacade as any).config.set(mockConfig);

      fixture = TestBed.createComponent(CodeGeneratorModalComponent);
      renderedComponent = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should render warning banner when activeTab is SAS', async () => {
      renderedComponent.activeTab.set('SAS');
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('[data-testid="parity-warning-banner"]'));
      expect(banner).not.toBeNull();
      const text = banner.query(By.css('[data-testid="parity-warning-text"]')).nativeElement.textContent;
      expect(text).toContain('SAS script does not guarantee bit-for-bit sequence parity');
    });

    it('should render warning banner when activeTab is STATA', async () => {
      renderedComponent.activeTab.set('STATA');
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('[data-testid="parity-warning-banner"]'));
      expect(banner).not.toBeNull();
      const text = banner.query(By.css('[data-testid="parity-warning-text"]')).nativeElement.textContent;
      expect(text).toContain('STATA script does not guarantee bit-for-bit sequence parity');
    });

    it('should NOT render warning banner when activeTab is R', async () => {
      renderedComponent.activeTab.set('R');
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('[data-testid="parity-warning-banner"]'));
      expect(banner).toBeNull();
    });

    it('should NOT render warning banner when activeTab is Python', async () => {
      renderedComponent.activeTab.set('Python');
      fixture.detectChanges();
      const banner = fixture.debugElement.query(By.css('[data-testid="parity-warning-banner"]'));
      expect(banner).toBeNull();
    });
  });
});
