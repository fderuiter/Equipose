import { RandomizationConfig } from '../models/randomization.model';
import { UnifiedValidationAuthority } from '../validation/unified-validator';

/**
 * Validates a configuration and throws if invalid.
 */
function validateConfig(config: RandomizationConfig): RandomizationConfig {
  const errors = UnifiedValidationAuthority.validate(config);
  
  if (errors.length > 0) {
    const errorMsg = errors.map(e => `[${e.code}] ${e.property}: ${e.message}`).join(', ');
    throw new Error(`Invalid preset configuration: ${errorMsg}`);
  }
  
  // Enforce the modern token syntax for subject ID
  if (!config.subjectIdMask.includes('{SITE}') || (!config.subjectIdMask.includes('{SEQ}') && !config.subjectIdMask.includes('{SEQ:'))) {
    throw new Error(`Invalid preset configuration: subjectIdMask must use modern {SITE}-{SEQ} token syntax`);
  }

  // Ensure no test specific leak: strictly typed via RandomizationConfig already prevents most, 
  // but we return a deep copy to prevent mutation.
  return JSON.parse(JSON.stringify(config));
}

const SimplePreset: RandomizationConfig = {
  protocolId: 'SIMP-001',
  studyName: 'Simple Study',
  phase: 'Phase 1',
  arms: [
    { id: 'arm-1', name: 'Treatment A', ratio: 1 },
    { id: 'arm-2', name: 'Control B', ratio: 1 }
  ],
  blockSizes: [4],
  sites: ['Site01'],
  strata: [],
  stratumCaps: [],
  seed: 'simple-seed-123',
  subjectIdMask: '{SITE}-{SEQ:3}',
  randomizationMethod: 'BLOCK'
};

const StandardPreset: RandomizationConfig = {
  protocolId: 'STD-002',
  studyName: 'Standard Study',
  phase: 'Phase 2',
  arms: [
    { id: 'arm-1', name: 'Treatment', ratio: 2 },
    { id: 'arm-2', name: 'Control', ratio: 1 }
  ],
  blockSizes: [3, 6],
  sites: ['Site01', 'Site02'],
  strata: [
    { id: 'age', name: 'Age Group', levels: ['<65', '>=65'] }
  ],
  stratumCaps: [],
  seed: 'standard-seed-456',
  subjectIdMask: '{SITE}-{SEQ:4}',
  randomizationMethod: 'BLOCK'
};

const ComplexPreset: RandomizationConfig = {
  protocolId: 'CMPX-003',
  studyName: 'Complex Study',
  phase: 'Phase 3',
  arms: [
    { id: 'arm-1', name: 'Treatment A', ratio: 1 },
    { id: 'arm-2', name: 'Treatment B', ratio: 1 },
    { id: 'arm-3', name: 'Control', ratio: 1 }
  ],
  blockSizes: [3, 6, 9],
  sites: ['Site01', 'Site02', 'Site03'],
  strata: [
    { id: 'age', name: 'Age Group', levels: ['<65', '>=65'] },
    { id: 'gender', name: 'Gender', levels: ['M', 'F'] }
  ],
  stratumCaps: [],
  seed: 'complex-seed-789',
  subjectIdMask: '{SITE}-{SEQ:5}',
  randomizationMethod: 'BLOCK',
  globalBlockStrategy: {
    selectionType: 'RANDOM_POOL',
    sizes: [3, 6, 9]
  }
};

const MinimalPreset: RandomizationConfig = {
  protocolId: 'MIN-001',
  studyName: 'Minimization Study',
  phase: 'Phase 2',
  arms: [
    { id: 'arm-1', name: 'Treatment A', ratio: 1 },
    { id: 'arm-2', name: 'Control B', ratio: 1 }
  ],
  blockSizes: [],
  sites: ['Site01', 'Site02'],
  strata: [
    { id: 'age', name: 'Age Group', levels: ['<65', '>=65'] }
  ],
  stratumCaps: [],
  seed: 'min-seed-123',
  subjectIdMask: '{SITE}-{SEQ:4}',
  randomizationMethod: 'MINIMIZATION',
  minimizationConfig: { totalSampleSize: 100, p: 0.8 }
};

/**
 * Unified Domain Presets Registry
 */
export const StudyPresets = {
  Simple: validateConfig(SimplePreset),
  Standard: validateConfig(StandardPreset),
  Complex: validateConfig(ComplexPreset),
  Minimization: validateConfig(MinimalPreset),
  
  /**
   * Extends a default preset safely.
   */
  extend: (base: RandomizationConfig, overrides: Partial<RandomizationConfig>): RandomizationConfig => {
    return validateConfig({
      ...base,
      ...overrides
    });
  }
};
