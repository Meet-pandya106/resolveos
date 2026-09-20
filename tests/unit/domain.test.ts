import { describe, it, expect } from 'vitest';
import {
  CaseStateMachine,
  ProblemScorer,
  SolutionScorer,
  ConflictResolver,
  RootCauseAnalyzer
} from '../../packages/domain/src/index.js';

describe('Domain: Case State Machine', () => {
  it('allows valid state transitions', () => {
    expect(CaseStateMachine.canTransition('DRAFT', 'OPEN')).toBe(true);
    expect(CaseStateMachine.canTransition('OPEN', 'INVESTIGATING')).toBe(true);
    expect(CaseStateMachine.canTransition('INVESTIGATING', 'VERIFYING')).toBe(true);
    expect(CaseStateMachine.canTransition('VERIFYING', 'RESOLVED')).toBe(true);
    expect(CaseStateMachine.canTransition('RESOLVED', 'REOPENED')).toBe(true);
  });

  it('rejects invalid state transitions', () => {
    expect(CaseStateMachine.canTransition('DRAFT', 'RESOLVED')).toBe(false);
    expect(CaseStateMachine.canTransition('OPEN', 'RESOLVED')).toBe(false);
  });

  it('enforces verification check before resolving unless override is granted', () => {
    const unverified = CaseStateMachine.validateTransition('VERIFYING', 'RESOLVED', {
      hasVerificationPassed: false,
      overridePermission: false
    });
    expect(unverified.valid).toBe(false);

    const verified = CaseStateMachine.validateTransition('VERIFYING', 'RESOLVED', {
      hasVerificationPassed: true,
      overridePermission: false
    });
    expect(verified.valid).toBe(true);
  });
});

describe('Domain: Problem Statement Quality Scorer', () => {
  it('scores empty statement as 0% INCOMPLETE', () => {
    const res = ProblemScorer.calculateScore(null);
    expect(res.score).toBe(0);
    expect(res.rating).toBe('INCOMPLETE');
    expect(res.missingFields.length).toBeGreaterThan(0);
  });

  it('calculates comprehensive score for complete statement', () => {
    const res = ProblemScorer.calculateScore({
      title: 'Production API Gateway Latency Spike',
      statement: 'During the flash sale event, latency exceeded 4.8 seconds for checkout transactions.',
      expectedBehavior: 'Transactions acknowledge under 250ms at p99.',
      observedBehavior: 'Transactions timed out after 5,000ms with connection pool exhaustion.',
      impact: '$48,000 delayed revenue and user drop-offs.',
      affectedUsers: 'All mobile and web checkout shoppers globally.',
      environment: 'Kubernetes us-east-1 production',
      knownConstraints: 'No schema migrations permitted during sale',
      frequency: 'INTERMITTENT',
      startedAt: new Date().toISOString()
    });

    expect(res.score).toBeGreaterThanOrEqual(85);
    expect(res.rating).toBe('COMPREHENSIVE');
    expect(res.missingFields.length).toBe(0);
  });
});

describe('Domain: Solution Matrix Scorer', () => {
  it('calculates weighted score with penalty inversions for effort and risk', () => {
    const solution = {
      id: 'sol-1',
      caseId: 'case-1',
      name: 'PgBouncer Connection Pooler',
      description: 'Deploy connection pooler',
      costScore: 1, // low cost (favorable)
      effortScore: 2, // low effort (favorable)
      riskScore: 1, // low risk (favorable)
      impactScore: 5, // high impact (favorable)
      timeToImplementDays: 1,
      reversibility: 'HIGH' as const,
      isChosen: false,
      proposedBy: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const score = SolutionScorer.calculateWeightedScore(solution);
    expect(score).toBeGreaterThan(8.0);
  });
});

describe('Domain: Conflict Resolution', () => {
  it('merges non-conflicting field mutations cleanly', () => {
    const base = { title: 'Base Title', description: 'Base Desc', severity: 'MEDIUM' };
    const local = { title: 'Updated Title', description: 'Base Desc', severity: 'MEDIUM' };
    const remote = { title: 'Base Title', description: 'Updated Remote Desc', severity: 'MEDIUM' };

    const res = ConflictResolver.mergeEntities(base, local, remote);
    expect(res.hasConflicts).toBe(false);
    expect(res.merged.title).toBe('Updated Title');
    expect(res.merged.description).toBe('Updated Remote Desc');
  });

  it('flags overlapping field edits as conflicts', () => {
    const base = { title: 'Base Title' };
    const local = { title: 'Local Choice' };
    const remote = { title: 'Remote Choice' };

    const res = ConflictResolver.mergeEntities(base, local, remote);
    expect(res.hasConflicts).toBe(true);
    expect(res.conflictingFields).toContain('title');
  });
});
