import { TestBed } from '@angular/core/testing';
import { PersonaValidationService } from './persona-validator.service';

describe('PersonaValidationService', () => {
  let service: PersonaValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PersonaValidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // @persona:Biostatistician
  it('should allow Biostatistician to bypass blinding and view full treatment allocations', () => {
    service.activePersona.set('Biostatistician');
    expect(service.canBypassBlinding()).toBe(true);
    expect(service.getMaskedTreatment('Active Arm', false)).toBe('Active Arm');
    expect(service.getMaskedTreatment('Active Arm', true)).toBe('Active Arm');
  });

  // @persona:TrialManager
  it('should restrict Trial Manager treatment visibility based on unblinded state', () => {
    service.activePersona.set('TrialManager');
    expect(service.canBypassBlinding()).toBe(false);
    expect(service.getMaskedTreatment('Active Arm', false)).toBe('*** BLINDED ***');
    expect(service.getMaskedTreatment('Active Arm', true)).toBe('Active Arm');
  });

  // @persona:TrialManager
  it('should disable structural schema exports when in draft simulation mode', () => {
    service.activePersona.set('TrialManager');
    expect(service.canExportSchema('Simulation')).toBe(false);
    expect(service.canExportSchema('Draft')).toBe(false);
    expect(service.canExportSchema('Formal-Trial-123')).toBe(true);
  });

  // @persona:ComplianceOfficer
  it('should support Compliance Officer persona and secure baseline behaviors', () => {
    service.activePersona.set('ComplianceOfficer');
    expect(service.canBypassBlinding()).toBe(false);
    expect(service.getMaskedTreatment('Active Arm', false)).toBe('*** BLINDED ***');
    expect(service.getMaskedTreatment('Active Arm', true)).toBe('Active Arm');
  });
});
