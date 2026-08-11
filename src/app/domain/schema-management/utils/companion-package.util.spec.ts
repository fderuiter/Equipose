import { describe, it, expect } from 'vitest';
import { RandomizationConfig } from '@domain/core/models/randomization.model';
import {
  generateTestDataCsv,
  generateCompanionTestFile,
  MT19937_R,
  MT19937_SAS,
  MT19937_DO
} from './companion-package.util';

describe('companion-package.util', () => {
  const mockConfig: RandomizationConfig = {
    protocolId: 'TEST-COMPANION',
    studyName: 'Test Companion',
    phase: 'Phase I',
    arms: [
      { id: 'A', name: 'Arm A', ratio: 1 },
      { id: 'B', name: 'Arm B', ratio: 1 }
    ],
    sites: ['Site1'],
    strata: [{ id: 'gender', name: 'Gender', levels: ['Male', 'Female'] }],
    blockSizes: [4],
    stratumCaps: [],
    seed: 'companion_test_seed',
    subjectIdMask: '{SITE}-{SEQ:4}'
  };

  const mockSchema = [
    {
      subjectId: 'Site1-Male-0001',
      site: 'Site1',
      stratum: { gender: 'Male' },
      stratumCode: 'Male',
      blockNumber: 1,
      blockSize: 4,
      treatmentArm: 'Arm A',
      treatmentArmId: 'A'
    },
    {
      subjectId: 'Site1-Female-0002',
      site: 'Site1',
      stratum: { gender: 'Female' },
      stratumCode: 'Female',
      blockNumber: 1,
      blockSize: 4,
      treatmentArm: 'Arm B',
      treatmentArmId: 'B'
    }
  ];

  it('should define the embedded MT19937 dependency runtimes', () => {
    expect(MT19937_R).toContain('init_mt <- function');
    expect(MT19937_SAS).toContain('%macro mt19937_init');
    expect(MT19937_DO).toContain('void init_mt');
  });

  it('should generate test data CSV padded to exactly 100 rows plus 1 header row', () => {
    const csv = generateTestDataCsv(mockConfig, mockSchema);
    const lines = csv.split('\n').filter(line => line.trim().length > 0);
    
    expect(lines.length).toBe(101); // 1 header + 100 mock subjects
    expect(lines[0]).toBe('SubjectID,Site,Treatment,BlockNumber,BlockSize,StratumCode,gender');
    expect(lines[1]).toBe('Site1-Male-0001,Site1,Arm A,1,4,Male,Male');
    expect(lines[2]).toBe('Site1-Female-0002,Site1,Arm B,1,4,Female,Female');
    // Ensure padding works using modulo pattern
    expect(lines[3]).toContain('MOCK-PAD-1002');
  });

  it('should generate companion test script for Python containing seed hash', () => {
    const pyScript = generateCompanionTestFile('Python', mockConfig);
    expect(pyScript).toContain('def test_seed_alignment():');
    expect(pyScript).toContain('def test_subject_randomization():');
    expect(pyScript).toContain('pd.read_csv("test_data.csv")');
  });

  it('should generate companion test script for R containing seed hash', () => {
    const rScript = generateCompanionTestFile('R', mockConfig);
    expect(rScript).toContain('library(testthat)');
    expect(rScript).toContain('test_that("PRNG Seed Alignment');
    expect(rScript).toContain('test_that("Subject Randomization');
  });

  it('should generate companion test script for SAS', () => {
    const sasScript = generateCompanionTestFile('SAS', mockConfig);
    expect(sasScript).toContain('proc import datafile="test_data.csv"');
    expect(sasScript).toContain('%macro compare_schema');
  });

  it('should generate companion test script for STATA', () => {
    const stataScript = generateCompanionTestFile('STATA', mockConfig);
    expect(stataScript).toContain('program compare_schemas');
    expect(stataScript).toContain('compare_schemas "randomization_schema.do"');
  });
});
