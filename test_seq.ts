import { generateRandomizationSchema } from './src/app/domain/randomization-engine/core/randomization-algorithm';
const config = {
  protocolId: 'ALG-001', studyName: 'Algorithm Test', phase: 'Phase II',
  arms: [{ id: 'A', name: 'Active', ratio: 1 }, { id: 'B', name: 'Placebo', ratio: 1 }],
  sites: ['Site1'], strata: [], blockSizes: [8], stratumCaps: [{ levelIds: {}, cap: 8 }],
  seed: 'cross_platform_seed_v1', subjectIdMask: '[SiteID]-[001]'
};
console.log(generateRandomizationSchema(config).schema.map(r => r.treatmentArmId));
