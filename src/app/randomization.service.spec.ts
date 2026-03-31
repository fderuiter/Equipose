import { TestBed } from '@angular/core/testing';
import { RandomizationService, RandomizationConfig } from './randomization.service';

describe('RandomizationService', () => {
  let service: RandomizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RandomizationService);
  });

  it('should generate schema with distinct stratum caps', () => {
    return new Promise<void>((resolve) => {
      const config: RandomizationConfig = {
        protocolId: 'TEST-123',
        studyName: 'Test Study',
        phase: 'Phase 1',
        arms: [
          { id: '1', name: 'Arm A', ratio: 1 },
          { id: '2', name: 'Arm B', ratio: 1 }
        ],
        sites: ['Site1'],
        strata: [
          { id: 'strata1', name: 'Strata 1', levels: ['Low', 'High'] },
          { id: 'strata2', name: 'Strata 2', levels: ['Yes', 'No'] }
        ],
        blockSizes: [2], // Use size 2 to exactly match 1:1 ratio
        stratumCaps: [
          { levels: ['Low', 'Yes'], cap: 2 },  // 1 block
          { levels: ['Low', 'No'], cap: 4 },   // 2 blocks
          { levels: ['High', 'Yes'], cap: 6 }, // 3 blocks
          { levels: ['High', 'No'], cap: 8 }   // 4 blocks
        ],
        seed: 'test_seed',
        subjectIdMask: '[SiteID]-[StratumCode]-[001]'
      };

      service.generateSchema(config).subscribe(result => {
        expect(result).toBeTruthy();
        const schema = result.schema;

        // Count subjects by stratum combination
        const counts = {
          'Low|Yes': 0,
          'Low|No': 0,
          'High|Yes': 0,
          'High|No': 0
        };

        schema.forEach(row => {
          const key = `${row.stratum['strata1']}|${row.stratum['strata2']}`;
          counts[key as keyof typeof counts]++;
        });

        expect(counts['Low|Yes']).toBe(2);
        expect(counts['Low|No']).toBe(4);
        expect(counts['High|Yes']).toBe(6);
        expect(counts['High|No']).toBe(8);

        // Total subjects should be 2+4+6+8 = 20
        expect(schema.length).toBe(20);

        resolve();
      });
    });
  });

  it('should handle block math validation errors', () => {
    return new Promise<void>((resolve, reject) => {
      const config: RandomizationConfig = {
        protocolId: 'TEST-123',
        studyName: 'Test Study',
        phase: 'Phase 1',
        arms: [
          { id: '1', name: 'Arm A', ratio: 1 },
          { id: '2', name: 'Arm B', ratio: 2 } // total ratio 3
        ],
        sites: ['Site1'],
        strata: [],
        blockSizes: [4], // 4 is not a multiple of 3
        stratumCaps: [{ levels: [], cap: 10 }],
        seed: 'test_seed',
        subjectIdMask: '[SiteID]-[StratumCode]-[001]'
      };

      service.generateSchema(config).subscribe({
        next: () => {
          reject(new Error('Should have thrown an error'));
        },
        error: (err) => {
          expect(err.error.error).toBe('Block size 4 is not a multiple of total ratio 3');
          resolve();
        }
      });
    });
  });
});
