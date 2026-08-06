import { describe, it, expect } from 'vitest';
import { buildHashPayload, sha256Hex, computeAuditHash, syncSha256 } from './crypto-hash';
import { RandomizationResult } from '../../core/models/randomization.model';
import { StudyPresets } from '../../core/presets/study-presets';

// ─────────────────────────────────────────────────────────────────────────────
// buildHashPayload
// ─────────────────────────────────────────────────────────────────────────────

describe('buildHashPayload', () => {
  const baseConfig = StudyPresets.extend(StudyPresets.Simple, {
    protocolId: 'TEST-001',
    studyName: 'Test Study',
    phase: 'Phase II',
    arms: [{ id: 'A', name: 'Active', ratio: 1 }],
    sites: ['Site1'],
    strata: [],
    blockSizes: [4],
    stratumCaps: [],
    seed: 'seedabc123',
    subjectIdMask: '{SITE}-{SEQ:3}'
  });

  it('returns a valid JSON string', () => {
    const payload = buildHashPayload(baseConfig, [], '2024-01-01T00:00:00.000Z');
    expect(() => JSON.parse(payload)).not.toThrow();
  });

  it('is deterministic regardless of property insertion order', () => {
    // Reversed-key config should yield the same payload string
    const configReordered = {
      subjectIdMask: baseConfig.subjectIdMask,
      seed: baseConfig.seed,
      stratumCaps: baseConfig.stratumCaps,
      blockSizes: baseConfig.blockSizes,
      strata: baseConfig.strata,
      sites: baseConfig.sites,
      arms: baseConfig.arms,
      phase: baseConfig.phase,
      studyName: baseConfig.studyName,
      protocolId: baseConfig.protocolId,
      randomizationMethod: baseConfig.randomizationMethod
    };

    const p1 = buildHashPayload(baseConfig as typeof baseConfig, [], '2024-01-01T00:00:00.000Z');
    const p2 = buildHashPayload(configReordered as typeof baseConfig, [], '2024-01-01T00:00:00.000Z');
    expect(p1).toBe(p2);
  });

  it('produces different payloads when the seed differs', () => {
    const p1 = buildHashPayload(baseConfig, [], '2024-01-01T00:00:00.000Z');
    const p2 = buildHashPayload({ ...baseConfig, seed: 'different' }, [], '2024-01-01T00:00:00.000Z');
    expect(p1).not.toBe(p2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sha256Hex
// ─────────────────────────────────────────────────────────────────────────────

describe('sha256Hex', () => {
  it('returns a 64-character hex string', async () => {
    const hex = await sha256Hex('hello world');
    expect(hex).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hex)).toBe(true);
  });

  it('is deterministic for the same input', async () => {
    const h1 = await sha256Hex('same input');
    const h2 = await sha256Hex('same input');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different inputs', async () => {
    const h1 = await sha256Hex('input A');
    const h2 = await sha256Hex('input B');
    expect(h1).not.toBe(h2);
  });

  it('matches known SHA-256 value for empty string', async () => {
    // SHA-256('') = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const hex = await sha256Hex('');
    expect(hex).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeAuditHash
// ─────────────────────────────────────────────────────────────────────────────

describe('computeAuditHash', () => {
  const mockResult: RandomizationResult = {
    metadata: {
      protocolId: 'AUDIT-001',
      studyName: 'Audit Test',
      phase: 'Phase III',
      seed: 'fixedseed123',
      generatedAt: '2024-06-01T12:00:00.000Z',
      strata: [],
      config: StudyPresets.extend(StudyPresets.Simple, {
        protocolId: 'AUDIT-001',
        studyName: 'Audit Test',
        phase: 'Phase III',
        arms: [{ id: 'A', name: 'Active', ratio: 1 }],
        sites: ['Site1'],
        strata: [],
        blockSizes: [2],
        stratumCaps: [],
        seed: 'fixedseed123',
        subjectIdMask: '{SITE}-{SEQ:3}'
      }),
      auditHash: '' // excluded from hash computation
    },
    schema: []
  };

  it('returns a 64-character hex string', async () => {
    const hash = await computeAuditHash(mockResult);
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it('is deterministic for the same result', async () => {
    const h1 = await computeAuditHash(mockResult);
    const h2 = await computeAuditHash(mockResult);
    expect(h1).toBe(h2);
  });

  it('changes when the seed changes', async () => {
    const modified: RandomizationResult = {
      ...mockResult,
      metadata: { ...mockResult.metadata, seed: 'differentseed123', config: { ...mockResult.metadata.config, seed: 'differentseed123' } }
    };
    const h1 = await computeAuditHash(mockResult);
    const h2 = await computeAuditHash(modified);
    expect(h1).not.toBe(h2);
  });

  it('does not include the auditHash field itself in the payload', async () => {
    // The auditHash field in metadata should not affect the computed hash
    const withDifferentHash: RandomizationResult = {
      ...mockResult,
      metadata: { ...mockResult.metadata, auditHash: 'some_previous_hash' }
    };
    // buildHashPayload uses config + schema + generatedAt, not auditHash itself
    const h1 = await computeAuditHash(mockResult);
    // Since auditHash is NOT included in buildHashPayload, both should be equal
    // (the hash covers config, schema, generatedAt only)
    const h2 = await computeAuditHash(withDifferentHash);
    expect(h1).toBe(h2);
  });

  it('changes when the schema changes', async () => {
    const modified: RandomizationResult = {
      ...mockResult,
      schema: [
        {
          subjectId: 'S-001',
          site: 'Site1',
          stratum: {},
          stratumCode: '',
          blockNumber: 1,
          blockSize: 2,
          treatmentArm: 'Active',
          treatmentArmId: 'A'
        }
      ]
    };
    const h1 = await computeAuditHash(mockResult);
    const h2 = await computeAuditHash(modified);
    expect(h1).not.toBe(h2);
  });

  it('changes when the generatedAt timestamp changes', async () => {
    const modified: RandomizationResult = {
      ...mockResult,
      metadata: { ...mockResult.metadata, generatedAt: '2024-06-01T12:00:01.000Z' }
    };
    const h1 = await computeAuditHash(mockResult);
    const h2 = await computeAuditHash(modified);
    expect(h1).not.toBe(h2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// syncSha256
// ─────────────────────────────────────────────────────────────────────────────

describe('syncSha256', () => {
  it('returns a 64-character hex string matching standard SHA-256', () => {
    const hex = syncSha256('hello world');
    expect(hex).toHaveLength(64);
    expect(hex).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('matches known SHA-256 value for empty string', () => {
    const hex = syncSha256('');
    expect(hex).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('is deterministic for the same input', () => {
    const h1 = syncSha256('test value');
    const h2 = syncSha256('test value');
    expect(h1).toBe(h2);
  });
});

