/**
 * @resolveos/database
 * Drizzle ORM schema definition for SQLite and PostgreSQL.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// 1. Users Table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  twoFactorSecret: text('two_factor_secret'),
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).notNull().default(false),
  recoveryCodes: text('recovery_codes', { mode: 'json' }), // string[]
  isEmailVerified: integer('is_email_verified', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at')
});

// 2. Workspaces Table
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  ownerId: text('owner_id').notNull().references(() => users.id),
  retentionDays: integer('retention_days').notNull().default(365),
  aiProcessingEnabled: integer('ai_processing_enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at')
});

// 3. Workspace Members Table
export const workspaceMembers = sqliteTable('workspace_members', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('MEMBER'), // 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  joinedAt: text('joined_at').notNull()
});

// 4. Cases Table
export const cases = sqliteTable('cases', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  status: text('status').notNull().default('OPEN'), // 'DRAFT' | 'OPEN' | 'INVESTIGATING' | 'BLOCKED' | 'MITIGATION' | 'VERIFYING' | 'RESOLVED' | 'ARCHIVED' | 'REOPENED'
  severity: text('severity').notNull().default('MEDIUM'), // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  priority: text('priority').notNull().default('MEDIUM'), // 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  ownerId: text('owner_id').notNull().references(() => users.id),
  incidentMode: integer('incident_mode', { mode: 'boolean' }).notNull().default(false),
  version: integer('version').notNull().default(1),
  problemStatement: text('problem_statement', { mode: 'json' }), // ProblemStatement JSON object
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  resolvedAt: text('resolved_at'),
  deletedAt: text('deleted_at')
});

// 5. Case Evidence Table
export const caseEvidence = sqliteTable('case_evidence', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  type: text('type').notNull().default('OBSERVATION'),
  source: text('source'),
  capturedAt: text('captured_at').notNull(),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  confidence: text('confidence').notNull().default('MEDIUM'),
  tags: text('tags', { mode: 'json' }), // string[]
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// 6. Evidence Relationships Table
export const evidenceRelationships = sqliteTable('evidence_relationships', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  relationship: text('relationship').notNull(), // 'SUPPORTS' | 'CONTRADICTS' | 'CAUSED_BY' | 'DERIVED_FROM' | 'VALIDATED_BY' | 'DEPENDS_ON'
  notes: text('notes'),
  createdAt: text('created_at').notNull()
});

// 7. Case Questions Table
export const caseQuestions = sqliteTable('case_questions', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer'),
  isAnswered: integer('is_answered', { mode: 'boolean' }).notNull().default(false),
  askedBy: text('asked_by').notNull().references(() => users.id),
  answeredBy: text('answered_by').references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// 8. Hypotheses Table
export const hypotheses = sqliteTable('hypotheses', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  confidence: text('confidence').notNull().default('MEDIUM'),
  status: text('status').notNull().default('UNTESTED'),
  testsDescription: text('tests_description'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// 9. Root Causes Table
export const rootCauses = sqliteTable('root_causes', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  method: text('method').notNull().default('FIVE_WHYS'),
  category: text('category'),
  whyLevel: integer('why_level'),
  parentCauseId: text('parent_cause_id'),
  statement: text('statement').notNull(),
  isConfirmed: integer('is_confirmed', { mode: 'boolean' }).notNull().default(false),
  identifiedBy: text('identified_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// 10. Solutions Table
export const solutions = sqliteTable('solutions', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  costScore: integer('cost_score').notNull().default(3),
  effortScore: integer('effort_score').notNull().default(3),
  riskScore: integer('risk_score').notNull().default(3),
  impactScore: integer('impact_score').notNull().default(3),
  timeToImplementDays: integer('time_to_implement_days').notNull().default(7),
  reversibility: text('reversibility').notNull().default('MEDIUM'),
  dependencies: text('dependencies'),
  isChosen: integer('is_chosen', { mode: 'boolean' }).notNull().default(false),
  proposedBy: text('proposed_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// 11. Decisions Table
export const decisions = sqliteTable('decisions', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  context: text('context').notNull(),
  chosenSolutionId: text('chosen_solution_id').references(() => solutions.id),
  reasoning: text('reasoning').notNull(),
  assumptions: text('assumptions', { mode: 'json' }), // string[]
  risks: text('risks', { mode: 'json' }), // string[]
  decisionMakerId: text('decision_maker_id').notNull().references(() => users.id),
  revision: integer('revision').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// 12. Actions Table
export const caseActions = sqliteTable('case_actions', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  ownerId: text('owner_id').notNull().references(() => users.id),
  priority: text('priority').notNull().default('MEDIUM'),
  status: text('status').notNull().default('TODO'),
  deadline: text('deadline'),
  dependencies: text('dependencies', { mode: 'json' }), // string[]
  verificationCriteria: text('verification_criteria'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// 13. Verifications Table
export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  expectedResult: text('expected_result').notNull(),
  observedResult: text('observed_result'),
  status: text('status').notNull().default('PENDING'),
  notes: text('notes'),
  verifiedBy: text('verified_by').references(() => users.id),
  verifiedAt: text('verified_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// 14. Retrospectives Table
export const retrospectives = sqliteTable('retrospectives', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  whatHappened: text('what_happened').notNull(),
  whatCausedIt: text('what_caused_it').notNull(),
  whatSolvedIt: text('what_solved_it').notNull(),
  whatWeMissed: text('what_we_missed'),
  whatToMonitor: text('what_to_monitor'),
  preventiveActions: text('preventive_actions'),
  authorId: text('author_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

// 15. Case Activities Table
export const caseActivities = sqliteTable('case_activities', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  eventType: text('event_type').notNull(),
  details: text('details', { mode: 'json' }),
  createdAt: text('created_at').notNull()
});

// 16. Audit Events Table
export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id'),
  userId: text('user_id'),
  action: text('action').notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent').notNull(),
  details: text('details', { mode: 'json' }),
  createdAt: text('created_at').notNull()
});

// 17. Notifications Table
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  link: text('link'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull()
});

// 18. User Sessions Table
export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userAgent: text('user_agent').notNull(),
  ipAddress: text('ip_address').notNull(),
  deviceType: text('device_type').notNull().default('desktop'),
  lastActiveAt: text('last_active_at').notNull(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false)
});

// 19. API Keys Table
export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  keyFingerprint: text('key_fingerprint').notNull(),
  scopes: text('scopes', { mode: 'json' }), // string[]
  expiresAt: text('expires_at'),
  lastUsedAt: text('last_used_at'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull(),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false)
});

// 20. Consent Records Table
export const consentRecords = sqliteTable('consent_records', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  consentType: text('consent_type').notNull(),
  version: text('version').notNull(),
  status: text('status').notNull(), // 'GRANTED' | 'WITHDRAWN'
  timestamp: text('timestamp').notNull()
});

// 21. Privacy Requests Table
export const privacyRequests = sqliteTable('privacy_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'EXPORT' | 'DELETE_ACCOUNT' | 'ACCESS'
  status: text('status').notNull().default('PENDING'),
  requestedAt: text('requested_at').notNull(),
  completedAt: text('completed_at'),
  downloadUrl: text('download_url')
});

// 22. Export Jobs Table
export const exportJobs = sqliteTable('export_jobs', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  format: text('format').notNull().default('JSON'),
  status: text('status').notNull().default('PENDING'),
  resultUrl: text('result_url'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at')
});

// 23. Sync Events Table
export const syncEvents = sqliteTable('sync_events', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  payload: text('payload', { mode: 'json' }),
  clientTimestamp: integer('client_timestamp').notNull(),
  syncedAt: text('synced_at').notNull()
});
