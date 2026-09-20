/**
 * Case Lifecycle & Problem Resolution Routes
 * Full CRUD for Cases, Problem Statements, Evidence, Hypotheses, 5-Whys/Fishbone,
 * Solutions Matrix, Decisions, Actions Kanban, Verifications, and Retrospectives.
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  getDatabase,
  cases,
  caseEvidence,
  evidenceRelationships,
  caseQuestions,
  hypotheses,
  rootCauses,
  solutions,
  decisions,
  caseActions,
  verifications,
  retrospectives,
  caseActivities,
  users,
  eq,
  and,
  desc
} from '@resolveos/database';
import {
  CreateCaseInputSchema,
  UpdateCaseInputSchema,
  CreateEvidenceInputSchema,
  CreateRelationshipInputSchema,
  CreateQuestionInputSchema,
  AnswerQuestionInputSchema,
  CreateHypothesisInputSchema,
  UpdateHypothesisInputSchema,
  CreateRootCauseInputSchema,
  CreateSolutionInputSchema,
  CreateDecisionInputSchema,
  CreateActionInputSchema,
  UpdateActionInputSchema,
  CreateVerificationInputSchema,
  UpdateVerificationInputSchema,
  CreateRetrospectiveInputSchema
} from '@resolveos/validation';
import { CaseStateMachine, ProblemScorer, SolutionScorer, RetrospectiveGenerator } from '@resolveos/domain';
import { authenticate, requireWorkspaceAccess } from '../middleware/auth.js';
import { RealtimeService } from '../services/RealtimeService.js';
import crypto from 'crypto';

export const caseRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.addHook('preHandler', authenticate);

  // Helper to record case activity
  function recordActivity(caseId: string, userId: string, eventType: string, details: Record<string, any>) {
    const db = getDatabase();
    db.insert(caseActivities)
      .values({
        id: crypto.randomUUID(),
        caseId,
        userId,
        eventType,
        details,
        createdAt: new Date().toISOString()
      })
      .run();
  }

  // 1. List Cases in Workspace
  server.get('/:workspaceId/cases', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const query = request.query as any;
    const db = getDatabase();

    const caseList = db
      .select({
        id: cases.id,
        workspaceId: cases.workspaceId,
        title: cases.title,
        description: cases.description,
        status: cases.status,
        severity: cases.severity,
        priority: cases.priority,
        incidentMode: cases.incidentMode,
        version: cases.version,
        problemStatement: cases.problemStatement,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt,
        resolvedAt: cases.resolvedAt,
        owner: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(cases)
      .leftJoin(users, eq(cases.ownerId, users.id))
      .where(and(eq(cases.workspaceId, workspaceId), eq(cases.deletedAt, null as any)))
      .orderBy(desc(cases.updatedAt))
      .all();

    return reply.send(caseList);
  });

  // 2. Create Case
  server.post('/:workspaceId/cases', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    const body = CreateCaseInputSchema.parse(request.body);
    const db = getDatabase();

    const caseId = crypto.randomUUID();
    const now = new Date().toISOString();

    let problemStmt = body.problemStatement;
    if (problemStmt) {
      const scoreRes = ProblemScorer.calculateScore(problemStmt);
      problemStmt = { ...problemStmt, completenessScore: scoreRes.score } as any;
    }

    db.insert(cases)
      .values({
        id: caseId,
        workspaceId,
        title: body.title,
        description: body.description || '',
        status: 'OPEN',
        severity: body.severity || 'MEDIUM',
        priority: body.priority || 'MEDIUM',
        ownerId: request.user!.id,
        incidentMode: body.incidentMode || false,
        version: 1,
        problemStatement: problemStmt || null,
        createdAt: now,
        updatedAt: now
      })
      .run();

    recordActivity(caseId, request.user!.id, 'CASE_CREATED', { title: body.title, severity: body.severity });
    RealtimeService.broadcastToWorkspace(workspaceId, 'CASE_CREATED', { caseId, title: body.title });

    return reply.status(201).send({ id: caseId, message: 'Case created successfully' });
  });

  // 3. Get Single Case Details with Aggregate Overview
  server.get('/:workspaceId/cases/:caseId', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { workspaceId, caseId } = request.params as { workspaceId: string; caseId: string };
    const db = getDatabase();

    const caseItem = db
      .select()
      .from(cases)
      .where(and(eq(cases.id, caseId), eq(cases.workspaceId, workspaceId), eq(cases.deletedAt, null as any)))
      .get();

    if (!caseItem) {
      return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Case not found', requestId: request.id });
    }

    const problemScore = ProblemScorer.calculateScore(caseItem.problemStatement as any);

    return reply.send({
      ...caseItem,
      problemQuality: problemScore
    });
  });

  // 4. Update Case / State Transition
  server.patch('/:workspaceId/cases/:caseId', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { workspaceId, caseId } = request.params as { workspaceId: string; caseId: string };
    const body = UpdateCaseInputSchema.parse(request.body);
    const db = getDatabase();

    const existing = db.select().from(cases).where(and(eq(cases.id, caseId), eq(cases.workspaceId, workspaceId))).get();
    if (!existing) return reply.status(404).send({ error: 'Case not found' });

    // Optimistic concurrency check
    if (body.expectedVersion && body.expectedVersion !== existing.version) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Case has been modified by another user. Please refresh and review latest changes.',
        requestId: request.id
      });
    }

    // State transition validation
    if (body.status && body.status !== existing.status) {
      const verificationsList = db.select().from(verifications).where(eq(verifications.caseId, caseId)).all();
      const hasPassed = verificationsList.some((v: any) => v.status === 'PASSED');

      const transitionCheck = CaseStateMachine.validateTransition(existing.status as any, body.status as any, {
        hasVerificationPassed: hasPassed,
        overridePermission: request.workspaceMember?.role === 'OWNER' || request.workspaceMember?.role === 'ADMIN'
      });

      if (!transitionCheck.valid) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: transitionCheck.reason || 'Invalid state transition',
          requestId: request.id
        });
      }
    }

    const now = new Date().toISOString();
    let problemStmt = body.problemStatement !== undefined ? body.problemStatement : existing.problemStatement;
    if (problemStmt) {
      const score = ProblemScorer.calculateScore(problemStmt as any);
      problemStmt = { ...(problemStmt as any), completenessScore: score.score };
    }

    db.update(cases)
      .set({
        title: body.title !== undefined ? body.title : existing.title,
        description: body.description !== undefined ? body.description : existing.description,
        status: body.status !== undefined ? body.status : existing.status,
        severity: body.severity !== undefined ? body.severity : existing.severity,
        priority: body.priority !== undefined ? body.priority : existing.priority,
        incidentMode: body.incidentMode !== undefined ? body.incidentMode : existing.incidentMode,
        problemStatement: problemStmt as any,
        version: existing.version + 1,
        resolvedAt: body.status === 'RESOLVED' ? now : existing.resolvedAt,
        updatedAt: now
      })
      .where(eq(cases.id, caseId))
      .run();

    if (body.status && body.status !== existing.status) {
      recordActivity(caseId, request.user!.id, 'CASE_STATUS_CHANGED', { from: existing.status, to: body.status });
    }

    RealtimeService.broadcastToCase(caseId, 'CASE_UPDATED', { caseId, updates: body });
    return reply.send({ message: 'Case updated successfully', version: existing.version + 1 });
  });

  // 5. Evidence Routes
  server.get('/:workspaceId/cases/:caseId/evidence', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = getDatabase();
    const list = db.select().from(caseEvidence).where(eq(caseEvidence.caseId, caseId)).all();
    return reply.send(list);
  });

  server.post('/:workspaceId/cases/:caseId/evidence', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { workspaceId, caseId } = request.params as { workspaceId: string; caseId: string };
    const body = CreateEvidenceInputSchema.parse(request.body);
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(caseEvidence)
      .values({
        id,
        caseId,
        title: body.title,
        description: body.description,
        type: body.type,
        source: body.source,
        capturedAt: body.capturedAt,
        uploadedBy: request.user!.id,
        confidence: body.confidence,
        tags: body.tags,
        fileUrl: body.fileUrl,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        createdAt: now,
        updatedAt: now
      })
      .run();

    recordActivity(caseId, request.user!.id, 'EVIDENCE_ADDED', { evidenceId: id, title: body.title });
    RealtimeService.broadcastToCase(caseId, 'EVIDENCE_ADDED', { id, title: body.title });

    return reply.status(201).send({ id, message: 'Evidence recorded successfully' });
  });

  // 6. Evidence Relationships
  server.get('/:workspaceId/cases/:caseId/relationships', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = getDatabase();
    const list = db.select().from(evidenceRelationships).where(eq(evidenceRelationships.caseId, caseId)).all();
    return reply.send(list);
  });

  server.post('/:workspaceId/cases/:caseId/relationships', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = CreateRelationshipInputSchema.parse(request.body);
    const db = getDatabase();
    const id = crypto.randomUUID();

    db.insert(evidenceRelationships)
      .values({
        id,
        caseId,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
        targetType: body.targetType,
        targetId: body.targetId,
        relationship: body.relationship,
        notes: body.notes,
        createdAt: new Date().toISOString()
      })
      .run();

    return reply.status(201).send({ id, message: 'Relationship established' });
  });

  // 7. Questions
  server.get('/:workspaceId/cases/:caseId/questions', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = getDatabase();
    const list = db.select().from(caseQuestions).where(eq(caseQuestions.caseId, caseId)).all();
    return reply.send(list);
  });

  server.post('/:workspaceId/cases/:caseId/questions', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = CreateQuestionInputSchema.parse(request.body);
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(caseQuestions)
      .values({
        id,
        caseId,
        question: body.question,
        answer: body.answer || null,
        isAnswered: body.isAnswered || false,
        askedBy: request.user!.id,
        createdAt: now,
        updatedAt: now
      })
      .run();

    recordActivity(caseId, request.user!.id, 'QUESTION_ASKED', { question: body.question });
    return reply.status(201).send({ id, message: 'Question created' });
  });

  server.patch('/:workspaceId/cases/:caseId/questions/:questionId', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { questionId, caseId } = request.params as { questionId: string; caseId: string };
    const body = AnswerQuestionInputSchema.parse(request.body);
    const db = getDatabase();

    db.update(caseQuestions)
      .set({
        answer: body.answer,
        isAnswered: true,
        answeredBy: request.user!.id,
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(caseQuestions.id, questionId), eq(caseQuestions.caseId, caseId)))
      .run();

    recordActivity(caseId, request.user!.id, 'QUESTION_ANSWERED', { questionId });
    return reply.send({ message: 'Question answered' });
  });

  // 8. Hypotheses
  server.get('/:workspaceId/cases/:caseId/hypotheses', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = getDatabase();
    const list = db.select().from(hypotheses).where(eq(hypotheses.caseId, caseId)).all();
    return reply.send(list);
  });

  server.post('/:workspaceId/cases/:caseId/hypotheses', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = CreateHypothesisInputSchema.parse(request.body);
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(hypotheses)
      .values({
        id,
        caseId,
        description: body.description,
        confidence: body.confidence,
        status: body.status,
        testsDescription: body.testsDescription,
        createdBy: request.user!.id,
        createdAt: now,
        updatedAt: now
      })
      .run();

    recordActivity(caseId, request.user!.id, 'HYPOTHESIS_CREATED', { description: body.description });
    return reply.status(201).send({ id, message: 'Hypothesis created' });
  });

  server.patch('/:workspaceId/cases/:caseId/hypotheses/:hypothesisId', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { hypothesisId, caseId } = request.params as { hypothesisId: string; caseId: string };
    const body = UpdateHypothesisInputSchema.parse(request.body);
    const db = getDatabase();

    db.update(hypotheses)
      .set({
        ...body,
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(hypotheses.id, hypothesisId), eq(hypotheses.caseId, caseId)))
      .run();

    if (body.status) {
      recordActivity(caseId, request.user!.id, 'HYPOTHESIS_STATUS_CHANGED', { hypothesisId, status: body.status });
    }
    return reply.send({ message: 'Hypothesis updated' });
  });

  // 9. Root Causes (5-Whys / Fishbone)
  server.get('/:workspaceId/cases/:caseId/root-causes', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = getDatabase();
    const list = db.select().from(rootCauses).where(eq(rootCauses.caseId, caseId)).all();
    return reply.send(list);
  });

  server.post('/:workspaceId/cases/:caseId/root-causes', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = CreateRootCauseInputSchema.parse(request.body);
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(rootCauses)
      .values({
        id,
        caseId,
        method: body.method,
        category: body.category,
        whyLevel: body.whyLevel,
        parentCauseId: body.parentCauseId,
        statement: body.statement,
        isConfirmed: body.isConfirmed,
        identifiedBy: request.user!.id,
        createdAt: now,
        updatedAt: now
      })
      .run();

    recordActivity(caseId, request.user!.id, 'ROOT_CAUSE_IDENTIFIED', { statement: body.statement });
    return reply.status(201).send({ id, message: 'Root cause record saved' });
  });

  // 10. Solutions Matrix
  server.get('/:workspaceId/cases/:caseId/solutions', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = getDatabase();
    const list = db.select().from(solutions).where(eq(solutions.caseId, caseId)).all();
    const ranked = SolutionScorer.rankSolutions(list as any);
    return reply.send(ranked);
  });

  server.post('/:workspaceId/cases/:caseId/solutions', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = CreateSolutionInputSchema.parse(request.body);
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(solutions)
      .values({
        id,
        caseId,
        name: body.name,
        description: body.description,
        costScore: body.costScore,
        effortScore: body.effortScore,
        riskScore: body.riskScore,
        impactScore: body.impactScore,
        timeToImplementDays: body.timeToImplementDays,
        reversibility: body.reversibility,
        dependencies: body.dependencies,
        isChosen: false,
        proposedBy: request.user!.id,
        createdAt: now,
        updatedAt: now
      })
      .run();

    recordActivity(caseId, request.user!.id, 'SOLUTION_ADDED', { name: body.name });
    return reply.status(201).send({ id, message: 'Solution proposed' });
  });

  // 11. Decisions Log
  server.get('/:workspaceId/cases/:caseId/decisions', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = getDatabase();
    const list = db.select().from(decisions).where(eq(decisions.caseId, caseId)).orderBy(desc(decisions.revision)).all();
    return reply.send(list);
  });

  server.post('/:workspaceId/cases/:caseId/decisions', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = CreateDecisionInputSchema.parse(request.body);
    const db = getDatabase();

    const existingDecisions = db.select().from(decisions).where(eq(decisions.caseId, caseId)).all();
    const nextRevision = existingDecisions.length + 1;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(decisions)
      .values({
        id,
        caseId,
        context: body.context,
        chosenSolutionId: body.chosenSolutionId,
        reasoning: body.reasoning,
        assumptions: body.assumptions,
        risks: body.risks,
        decisionMakerId: request.user!.id,
        revision: nextRevision,
        createdAt: now,
        updatedAt: now
      })
      .run();

    // Mark solution as chosen
    if (body.chosenSolutionId) {
      db.update(solutions).set({ isChosen: true }).where(eq(solutions.id, body.chosenSolutionId)).run();
    }

    recordActivity(caseId, request.user!.id, 'DECISION_RECORDED', { revision: nextRevision });
    return reply.status(201).send({ id, revision: nextRevision, message: 'Decision logged' });
  });

  // 12. Actions
  server.get('/:workspaceId/cases/:caseId/actions', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = getDatabase();
    const list = db.select().from(caseActions).where(eq(caseActions.caseId, caseId)).all();
    return reply.send(list);
  });

  server.post('/:workspaceId/cases/:caseId/actions', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = CreateActionInputSchema.parse(request.body);
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(caseActions)
      .values({
        id,
        caseId,
        title: body.title,
        description: body.description,
        ownerId: body.ownerId || request.user!.id,
        priority: body.priority,
        status: body.status,
        deadline: body.deadline,
        dependencies: body.dependencies,
        verificationCriteria: body.verificationCriteria,
        createdAt: now,
        updatedAt: now
      })
      .run();

    recordActivity(caseId, request.user!.id, 'ACTION_CREATED', { title: body.title });
    return reply.status(201).send({ id, message: 'Action scheduled' });
  });

  server.patch('/:workspaceId/cases/:caseId/actions/:actionId', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { actionId, caseId } = request.params as { actionId: string; caseId: string };
    const body = UpdateActionInputSchema.parse(request.body);
    const db = getDatabase();

    const now = new Date().toISOString();
    db.update(caseActions)
      .set({
        ...body,
        completedAt: body.status === 'DONE' ? now : null,
        updatedAt: now
      })
      .where(and(eq(caseActions.id, actionId), eq(caseActions.caseId, caseId)))
      .run();

    if (body.status === 'DONE') {
      recordActivity(caseId, request.user!.id, 'ACTION_COMPLETED', { actionId });
    }
    return reply.send({ message: 'Action updated' });
  });

  // 13. Verifications
  server.get('/:workspaceId/cases/:caseId/verifications', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = getDatabase();
    const list = db.select().from(verifications).where(eq(verifications.caseId, caseId)).all();
    return reply.send(list);
  });

  server.post('/:workspaceId/cases/:caseId/verifications', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = CreateVerificationInputSchema.parse(request.body);
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.insert(verifications)
      .values({
        id,
        caseId,
        expectedResult: body.expectedResult,
        observedResult: body.observedResult,
        status: body.status,
        notes: body.notes,
        verifiedBy: body.status !== 'PENDING' ? request.user!.id : null,
        verifiedAt: body.status !== 'PENDING' ? now : null,
        createdAt: now,
        updatedAt: now
      })
      .run();

    if (body.status === 'PASSED') {
      recordActivity(caseId, request.user!.id, 'VERIFICATION_PASSED', { id });
    }
    return reply.status(201).send({ id, message: 'Verification record initialized' });
  });

  // 14. Retrospectives
  server.get('/:workspaceId/cases/:caseId/retrospective', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = getDatabase();
    const retro = db.select().from(retrospectives).where(eq(retrospectives.caseId, caseId)).get();
    return reply.send(retro || null);
  });

  server.post('/:workspaceId/cases/:caseId/retrospective', { preHandler: [requireWorkspaceAccess(['OWNER', 'ADMIN', 'MEMBER'])] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const body = CreateRetrospectiveInputSchema.parse(request.body);
    const db = getDatabase();

    const existing = db.select().from(retrospectives).where(eq(retrospectives.caseId, caseId)).get();
    const now = new Date().toISOString();

    if (existing) {
      db.update(retrospectives)
        .set({
          ...body,
          updatedAt: now
        })
        .where(eq(retrospectives.id, existing.id))
        .run();
      return reply.send({ message: 'Retrospective updated' });
    }

    const id = crypto.randomUUID();
    db.insert(retrospectives)
      .values({
        id,
        caseId,
        ...body,
        authorId: request.user!.id,
        createdAt: now,
        updatedAt: now
      })
      .run();

    return reply.status(201).send({ id, message: 'Retrospective published' });
  });

  // 15. Activities Timeline
  server.get('/:workspaceId/cases/:caseId/activities', { preHandler: [requireWorkspaceAccess()] }, async (request, reply) => {
    const { caseId } = request.params as { caseId: string };
    const db = getDatabase();
    const list = db
      .select({
        id: caseActivities.id,
        caseId: caseActivities.caseId,
        userId: caseActivities.userId,
        eventType: caseActivities.eventType,
        details: caseActivities.details,
        createdAt: caseActivities.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(caseActivities)
      .leftJoin(users, eq(caseActivities.userId, users.id))
      .where(eq(caseActivities.caseId, caseId))
      .orderBy(desc(caseActivities.createdAt))
      .all();

    return reply.send(list);
  });
};
