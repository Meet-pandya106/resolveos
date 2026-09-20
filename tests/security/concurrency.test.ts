import { describe, it, expect } from 'vitest';
import { ConflictResolver } from '../../packages/domain/src/index.js';

describe('Concurrency & 3-Way Differential Merge Engine', () => {
  it('merges non-conflicting field updates across local and remote snapshots', () => {
    const base = { title: 'Initial Case', severity: 'LOW', priority: 'P3' };
    const local = { title: 'Updated Title Locally', severity: 'LOW', priority: 'P3' };
    const remote = { title: 'Initial Case', severity: 'HIGH', priority: 'P3' };

    const result = ConflictResolver.merge3Way(base, local, remote);
    expect(result.hasConflicts).toBe(false);
    expect(result.conflicts).toHaveLength(0);
    expect(result.merged.title).toBe('Updated Title Locally');
    expect(result.merged.severity).toBe('HIGH');
    expect(result.merged.priority).toBe('P3');
  });

  it('detects concurrent conflicting field modifications without silent overwrite', () => {
    const base = { title: 'Base Title', status: 'OPEN' };
    const local = { title: 'Local Overwrite A', status: 'INVESTIGATING' };
    const remote = { title: 'Remote Overwrite B', status: 'MITIGATION' };

    const result = ConflictResolver.merge3Way(base, local, remote);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts.length).toBe(2);

    const titleConflict = result.conflicts.find(c => c.field === 'title');
    expect(titleConflict).toBeDefined();
    expect(titleConflict?.baseValue).toBe('Base Title');
    expect(titleConflict?.localValue).toBe('Local Overwrite A');
    expect(titleConflict?.remoteValue).toBe('Remote Overwrite B');
  });
});
