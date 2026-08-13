import { describe, expect, it } from 'vitest';
import { StaticMappingGuard } from './static-mapping.guard';
import { RandomizationConfig } from '../../../core/models/randomization.model';

describe('StaticMappingGuard STATA Orphaned Variables', () => {
  const mockConfig: RandomizationConfig = {
    protocolId: 'Simulation',
    seed: '009f22b3edf94168e8b39bf218527051',
    arms: [
      { id: 'A', name: 'Active', ratio: 1 },
      { id: 'B', name: 'Placebo', ratio: 1 },
    ],
    sites: ['101'],
    strata: [
      {
        id: 'age',
        name: 'Age Group',
        levels: ['<65', '>=65'],
      },
    ],
    blockSizes: [4],
    randomizationMethod: 'BLOCK',
  } as any;

  it('should catch orphaned treatment arms', () => {
    const seedHash = "1530624355";
    const output = `
* Randomization Schema Configuration
set seed ${seedHash}
local arm_name_1 \`"Active"'
local arm_name_2 \`"Placebo"'
local arm_name_3 \`"OrphanedArm"'
local strata_1 \`"age"'
* Level: \`"<65"'
* Level: \`">=65"'
* Ratios: 1, 1

replace SubjectID=\`"SIM-101-AGE-001"' in 1
replace Site=\`"101"' in 1
replace Treatment=\`"Active"' in 1
replace BlockNumber=1 in 1
replace BlockSize=4 in 1
replace StratumCode=\`"AGE"' in 1
replace age=\`"<65"' in 1
    `;

    expect(() => StaticMappingGuard.verify('STATA', mockConfig, output)).toThrow(/Orphaned variable: Treatment arm "OrphanedArm"/);
  });

  it('should catch orphaned strata', () => {
    const seedHash = "1530624355";
    const output = `
* Randomization Schema Configuration
set seed ${seedHash}
local arm_name_1 \`"Active"'
local arm_name_2 \`"Placebo"'
local strata_1 \`"age"'
local strata_2 \`"orphaned_strata"'
* Level: \`"<65"'
* Level: \`">=65"'
* Ratios: 1, 1

replace SubjectID=\`"SIM-101-AGE-001"' in 1
replace Site=\`"101"' in 1
replace Treatment=\`"Active"' in 1
replace BlockNumber=1 in 1
replace BlockSize=4 in 1
replace StratumCode=\`"AGE"' in 1
replace age=\`"<65"' in 1
    `;

    expect(() => StaticMappingGuard.verify('STATA', mockConfig, output)).toThrow(/Orphaned variable: Stratum "orphaned_strata"/);
  });
});

describe('StaticMappingGuard R Orphaned Variables', () => {
  const mockConfig: RandomizationConfig = {
    protocolId: 'Simulation',
    seed: '009f22b3edf94168e8b39bf218527051',
    arms: [
      { id: 'A', name: 'Active', ratio: 1 },
      { id: 'B', name: 'Placebo', ratio: 1 },
    ],
    sites: ['101'],
    strata: [
      {
        id: 'age',
        name: 'Age Group',
        levels: ['<65', '>=65'],
      },
    ],
    blockSizes: [4],
    randomizationMethod: 'BLOCK',
  } as any;

  it('should catch R orphaned treatment arms', () => {
    const seedHash = "1530624355";
    const output = `
# build_block
init_mt(${seedHash})
# Ratios: 1, 1
# Stratum: age, Levels: <65, >=65
arms <- list(
  list(name = "Active", ratio = 1),
  list(name = "Placebo", ratio = 1),
  list(name = "OrphanedArm", ratio = 1)
)
strata=list("age"="<65")
    `;
    expect(() => StaticMappingGuard.verify('R', mockConfig, output)).toThrow(/Orphaned variable: Treatment arm "OrphanedArm"/);
  });

  it('should catch R orphaned strata', () => {
    const seedHash = "1530624355";
    const output = `
# build_block
init_mt(${seedHash})
# Ratios: 1, 1
# Stratum: age, Levels: <65, >=65
arms <- list(
  list(name = "Active", ratio = 1),
  list(name = "Placebo", ratio = 1)
)
strata=list("age"="<65", "orphaned_strata"="something")
    `;
    expect(() => StaticMappingGuard.verify('R', mockConfig, output)).toThrow(/Orphaned variable: Stratum "orphaned_strata"/);
  });
});

describe('StaticMappingGuard Python Orphaned Variables', () => {
  const mockConfig: RandomizationConfig = {
    protocolId: 'Simulation',
    seed: '009f22b3edf94168e8b39bf218527051',
    arms: [
      { id: 'A', name: 'Active', ratio: 1 },
      { id: 'B', name: 'Placebo', ratio: 1 },
    ],
    sites: ['101'],
    strata: [
      {
        id: 'age',
        name: 'Age Group',
        levels: ['<65', '>=65'],
      },
    ],
    blockSizes: [4],
    randomizationMethod: 'BLOCK',
  } as any;

  it('should catch Python orphaned treatment arms', () => {
    const seedHash = "1530624355";
    const output = `
# build_block
MT19937(${seedHash})
# Ratios: 1, 1
# Stratum: age, Levels: <65, >=65
arms = [
  {"name": "Active", "ratio": 1},
  {"name": "Placebo", "ratio": 1},
  {"name": "OrphanedArm", "ratio": 1}
]
"strata_dict": {"age": "<65"}
    `;
    expect(() => StaticMappingGuard.verify('Python', mockConfig, output)).toThrow(/Orphaned variable: Treatment arm "OrphanedArm"/);
  });

  it('should catch Python orphaned strata', () => {
    const seedHash = "1530624355";
    const output = `
# build_block
MT19937(${seedHash})
# Ratios: 1, 1
# Stratum: age, Levels: <65, >=65
arms = [
  {"name": "Active", "ratio": 1},
  {"name": "Placebo", "ratio": 1}
]
"strata_dict": {"age": "<65", "orphaned_strata": "something"}
    `;
    expect(() => StaticMappingGuard.verify('Python', mockConfig, output)).toThrow(/Orphaned variable: Stratum "orphaned_strata"/);
  });
});
