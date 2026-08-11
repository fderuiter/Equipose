import { Injectable, signal, computed } from '@angular/core';

export type PersonaType = 'Biostatistician' | 'TrialManager' | 'ComplianceOfficer';
export type OrgSegment = 'Sponsor' | 'Academic' | 'CRO';

/**
 * PersonaValidationService
 *
 * Centralized, client-side, zero-trust strategic framework authority for target user personas.
 * Manages data exposure, data blinding masks, and export restriction rules.
 */
@Injectable({ providedIn: 'root' })
export class PersonaValidationService {
  /**
   * The currently active segment running client-side.
   * Default to 'Sponsor' as standard context.
   */
  readonly activeSegment = signal<OrgSegment>('Sponsor');

  /**
   * The currently active persona running entirely client-side.
   * Default to 'TrialManager' as a secure, blinded baseline.
   */
  readonly activePersona = signal<PersonaType>('TrialManager');

  /**
   * Reactive signal indicating if the active persona can bypass blinding to view raw allocations.
   * Biostatisticians have full verification rights, others do not.
   */
  readonly canBypassBlinding = computed(() => {
    return this.activePersona() === 'Biostatistician';
  });

  /**
   * Reactive signal indicating if the combined dual-tier persona/segment can unblind/toggle unblinding.
   * Academic users, or Biostatisticians from any segment, are authorized.
   */
  readonly canUnblind = computed(() => {
    return this.activeSegment() === 'Academic' || this.activePersona() === 'Biostatistician';
  });

  /**
   * Centralized policy check for exporting structural schemas (CSV, XLSX, PDF, JSON).
   * Disables structural schema exports when draft simulation mode is active (protocolId is 'Simulation' or 'Draft').
   */
  canExportSchema(protocolId: string): boolean {
    const isDraftSimulation = protocolId === 'Simulation' || protocolId === 'Draft';
    if (isDraftSimulation) {
      return false;
    }
    return true;
  }

  /**
   * Enforces centralized blinding policy by automatically replacing treatment allocations with masked markers
   * based on the active segment, persona and current unblinded state.
   */
  getMaskedTreatment(treatmentArm: string, isUnblinded: boolean): string {
    // Biostatisticians require full access to verify correctness, regardless of UI unblinding state
    if (this.canBypassBlinding()) {
      return treatmentArm;
    }
    
    // Academic users view masked markers unless unblinded
    if (this.activeSegment() === 'Academic' && isUnblinded) {
      return treatmentArm;
    }
    
    // Standard users in other segments cannot bypass masking
    return '*** BLINDED ***';
  }
}
