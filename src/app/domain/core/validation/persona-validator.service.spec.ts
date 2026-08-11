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
  it('should restrict Trial Manager treatment visibility based on unblinded state and segment', () => {
    service.activePersona.set('TrialManager');
    expect(service.canBypassBlinding()).toBe(false);

    // Under standard Sponsor segment, Trial Manager cannot unblind
    service.activeSegment.set('Sponsor');
    expect(service.getMaskedTreatment('Active Arm', false)).toBe('*** BLINDED ***');
    expect(service.getMaskedTreatment('Active Arm', true)).toBe('*** BLINDED ***');

    // Under Academic segment, Trial Manager can unblind
    service.activeSegment.set('Academic');
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
  it('should support Compliance Officer persona and secure baseline behaviors based on segment', () => {
    service.activePersona.set('ComplianceOfficer');
    expect(service.canBypassBlinding()).toBe(false);

    // Under standard Sponsor segment, Compliance Officer cannot unblind
    service.activeSegment.set('Sponsor');
    expect(service.getMaskedTreatment('Active Arm', false)).toBe('*** BLINDED ***');
    expect(service.getMaskedTreatment('Active Arm', true)).toBe('*** BLINDED ***');

    // Under Academic segment, Compliance Officer can unblind
    service.activeSegment.set('Academic');
    expect(service.getMaskedTreatment('Active Arm', false)).toBe('*** BLINDED ***');
    expect(service.getMaskedTreatment('Active Arm', true)).toBe('Active Arm');
  });

  it('should authorize Academic users and Biostatisticians for unmasking, but deny others', () => {
    // Biostatisticians from Sponsor segment can unblind
    service.activeSegment.set('Sponsor');
    service.activePersona.set('Biostatistician');
    expect(service.canUnblind()).toBe(true);

    // Academic users of any role can unblind
    service.activeSegment.set('Academic');
    service.activePersona.set('TrialManager');
    expect(service.canUnblind()).toBe(true);

    service.activeSegment.set('Academic');
    service.activePersona.set('ComplianceOfficer');
    expect(service.canUnblind()).toBe(true);

    // CRO users of non-Biostatistician roles cannot unblind
    service.activeSegment.set('CRO');
    service.activePersona.set('TrialManager');
    expect(service.canUnblind()).toBe(false);

    // Sponsor users of non-Biostatistician roles cannot unblind
    service.activeSegment.set('Sponsor');
    service.activePersona.set('ComplianceOfficer');
    expect(service.canUnblind()).toBe(false);
  });
});
