/**
 * @resolveos/shared
 * Universal domain types, enums, constants, error codes, and event schemas.
 */

// ==========================================
// User & Auth
// ==========================================

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  twoFactorEnabled: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  ownerId: string;
  retentionDays: number;
  aiProcessingEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
  user?: User;
}

export interface UserSession {
  id: string;
  userId: string;
  userAgent: string;
  ipAddress: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  isRevoked: boolean;
}

// ==========================================
// Case Lifecycle & Resolution
// ==========================================

export type CaseStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'INVESTIGATING'
  | 'BLOCKED'
  | 'MITIGATION'
  | 'VERIFYING'
  | 'RESOLVED'
  | 'ARCHIVED'
  | 'REOPENED';

export type CaseSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ProblemStatement {
  title: string;
  statement: string;
  affectedUsers?: string | null;
  startedAt?: string | null;
  expectedBehavior?: string | null;
  observedBehavior?: string | null;
  impact?: string | null;
  severity: CaseSeverity;
  frequency?: 'CONSTANT' | 'INTERMITTENT' | 'ONE_OFF' | 'UNKNOWN';
  environment?: string | null;
  knownConstraints?: string | null;
  completenessScore: number; // 0 to 100
}

export interface Case {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  status: CaseStatus;
  severity: CaseSeverity;
  priority: CasePriority;
  ownerId: string;
  incidentMode: boolean;
  version: number;
  problemStatement?: ProblemStatement | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  deletedAt?: string | null;
  owner?: User;
}

// ==========================================
// Evidence & Relationships
// ==========================================

export type EvidenceType =
  | 'OBSERVATION'
  | 'DOCUMENT'
  | 'SCREENSHOT'
  | 'LOG'
  | 'MEASUREMENT'
  | 'USER_REPORT'
  | 'EXTERNAL_SOURCE';

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERIFIED';

export interface Evidence {
  id: string;
  caseId: string;
  title: string;
  description: string;
  type: EvidenceType;
  source?: string | null;
  capturedAt: string;
  uploadedBy: string;
  confidence: ConfidenceLevel;
  tags: string[];
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CaseEvidence = Evidence;

export type RelationshipType =
  | 'SUPPORTS'
  | 'CONTRADICTS'
  | 'CAUSED_BY'
  | 'DERIVED_FROM'
  | 'VALIDATED_BY'
  | 'DEPENDS_ON';

export interface EvidenceRelationship {
  id: string;
  caseId: string;
  sourceType: 'evidence' | 'hypothesis' | 'root_cause' | 'solution' | 'problem';
  sourceId: string;
  targetType: 'evidence' | 'hypothesis' | 'root_cause' | 'solution' | 'action';
  targetId: string;
  relationship: RelationshipType;
  notes?: string | null;
  createdAt: string;
}

// ==========================================
// Questions & Hypotheses
// ==========================================

export interface CaseQuestion {
  id: string;
  caseId: string;
  question: string;
  answer?: string | null;
  isAnswered: boolean;
  askedBy: string;
  answeredBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HypothesisStatus =
  | 'UNTESTED'
  | 'SUPPORTED'
  | 'WEAKENED'
  | 'REJECTED'
  | 'CONFIRMED';

export interface Hypothesis {
  id: string;
  caseId: string;
  description: string;
  confidence: ConfidenceLevel;
  status: HypothesisStatus;
  testsDescription?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Root Cause Analysis (5-Whys / Fishbone)
// ==========================================

export type FishboneCategory =
  | 'PEOPLE'
  | 'PROCESS'
  | 'TECHNOLOGY'
  | 'ENVIRONMENT'
  | 'MATERIALS'
  | 'MEASUREMENT';

export interface RootCause {
  id: string;
  caseId: string;
  method: 'FIVE_WHYS' | 'FISHBONE' | 'CONTRIBUTING_FACTORS';
  category?: FishboneCategory | null;
  whyLevel?: number | null; // 1 to 5 for 5-Whys
  parentCauseId?: string | null;
  statement: string;
  isConfirmed: boolean;
  identifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Solutions & Decision Matrix
// ==========================================

export interface Solution {
  id: string;
  caseId: string;
  name: string;
  description: string;
  costScore: number; // 1 (low cost) to 5 (high cost)
  effortScore: number; // 1 (easy) to 5 (very hard)
  riskScore: number; // 1 (low risk) to 5 (high risk)
  impactScore: number; // 1 (minor) to 5 (transformative)
  timeToImplementDays: number;
  reversibility: 'HIGH' | 'MEDIUM' | 'LOW' | 'IRREVERSIBLE';
  dependencies?: string | null;
  weightedScore?: number;
  isChosen: boolean;
  proposedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: string;
  caseId: string;
  context: string;
  chosenSolutionId?: string | null;
  reasoning: string;
  assumptions: string[];
  risks: string[];
  decisionMakerId: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Actions & Verification
// ==========================================

export type ActionStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';

export interface CaseAction {
  id: string;
  caseId: string;
  title: string;
  description?: string | null;
  ownerId: string;
  priority: CasePriority;
  status: ActionStatus;
  deadline?: string | null;
  dependencies: string[];
  verificationCriteria?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: User;
}

export type VerificationStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'INCONCLUSIVE';

export interface Verification {
  id: string;
  caseId: string;
  expectedResult: string;
  observedResult?: string | null;
  status: VerificationStatus;
  notes?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Retrospective & Activity
// ==========================================

export interface Retrospective {
  id: string;
  caseId: string;
  whatHappened: string;
  whatCausedIt: string;
  whatSolvedIt: string;
  whatWeMissed?: string | null;
  whatToMonitor?: string | null;
  preventiveActions?: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityEventType =
  | 'CASE_CREATED'
  | 'CASE_UPDATED'
  | 'CASE_STATUS_CHANGED'
  | 'EVIDENCE_ADDED'
  | 'QUESTION_ASKED'
  | 'QUESTION_ANSWERED'
  | 'HYPOTHESIS_CREATED'
  | 'HYPOTHESIS_STATUS_CHANGED'
  | 'ROOT_CAUSE_IDENTIFIED'
  | 'SOLUTION_ADDED'
  | 'DECISION_RECORDED'
  | 'ACTION_CREATED'
  | 'ACTION_COMPLETED'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'
  | 'CASE_RESOLVED'
  | 'CASE_REOPENED'
  | 'COMMENT_ADDED';

export interface CaseActivity {
  id: string;
  caseId: string;
  userId: string;
  eventType: ActivityEventType;
  details: Record<string, any>;
  createdAt: string;
  user?: User;
}

// ==========================================
// Audit, Privacy & Security
// ==========================================

export type AuditAction =
  | 'LOGIN'
  | 'FAILED_LOGIN'
  | 'PASSWORD_CHANGED'
  | 'SESSION_REVOKED'
  | 'ROLE_CHANGED'
  | 'CASE_VIEWED'
  | 'CASE_EXPORTED'
  | 'FILE_DOWNLOADED'
  | 'DATA_EXPORTED'
  | 'ACCOUNT_DELETED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'PRIVACY_CONSENT_UPDATED'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'ALL_SESSIONS_REVOKED';

export interface AuditEvent {
  id: string;
  workspaceId?: string | null;
  userId?: string | null;
  action: AuditAction;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface APIKey {
  id: string;
  workspaceId: string;
  name: string;
  keyFingerprint: string; // e.g. "ro_live_••••••••7F3A"
  scopes: string[];
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  createdBy: string;
  createdAt: string;
  isRevoked: boolean;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: 'AI_PROCESSING' | 'ERROR_LOGGING' | 'OFFLINE_CACHE';
  version: string;
  status: 'GRANTED' | 'WITHDRAWN';
  timestamp: string;
}

// ==========================================
// Offline & Synchronization
// ==========================================

export interface SyncMutation {
  id: string;
  workspaceId: string;
  entityType: 'case' | 'evidence' | 'hypothesis' | 'solution' | 'decision' | 'action' | 'verification';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  clientTimestamp: number;
  status: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  retryCount: number;
  conflictData?: {
    serverVersion: any;
    clientVersion: any;
  } | null;
}

// ==========================================
// API Error Format
// ==========================================

export interface APIErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  requestId: string;
  details?: Record<string, any>;
}
