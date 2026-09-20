/**
 * @resolveos/validation
 * Comprehensive Zod schemas for request validation, domain entities, import/export, and offline sync.
 */

import { z } from "zod";

// ==========================================
// User & Auth Schemas
// ==========================================

export const RegisterInputSchema = z.object({
	email: z.string().email("Invalid email address").max(255),
	password: z
		.string()
		.min(10, "Password must be at least 10 characters long")
		.max(128, "Password cannot exceed 128 characters")
		.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
		.regex(/[a-z]/, "Password must contain at least one lowercase letter")
		.regex(/[0-9]/, "Password must contain at least one number")
		.regex(
			/[^A-Za-z0-9]/,
			"Password must contain at least one special character",
		),
	name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
	email: z.string().email("Invalid email address").max(255),
	password: z.string().min(1, "Password is required").max(128),
	totpCode: z.string().length(6).optional(),
	recoveryCode: z.string().optional(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const UpdateProfileInputSchema = z.object({
	name: z.string().min(2).max(100).optional(),
	avatarUrl: z.string().url().max(1000).optional().nullable(),
});

export const ChangePasswordInputSchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: z
		.string()
		.min(10)
		.max(128)
		.regex(/[A-Z]/, "Must contain uppercase")
		.regex(/[a-z]/, "Must contain lowercase")
		.regex(/[0-9]/, "Must contain number")
		.regex(/[^A-Za-z0-9]/, "Must contain special char"),
});

export const TOTPVerifyInputSchema = z.object({
	code: z.string().length(6, "TOTP code must be 6 digits"),
});

export const TOTPEnableInputSchema = z.object({
	secret: z.string().min(16),
	code: z.string().length(6, "TOTP code must be 6 digits"),
});

export const TOTPDisableInputSchema = z.object({
	password: z.string().min(1),
	code: z.string().length(6, "TOTP code must be 6 digits"),
});

// ==========================================
// Workspace Schemas
// ==========================================

export const CreateWorkspaceInputSchema = z.object({
	name: z
		.string()
		.min(2, "Workspace name must be at least 2 characters")
		.max(100),
	slug: z
		.string()
		.min(2)
		.max(50)
		.regex(
			/^[a-z0-9-]+$/,
			"Slug can only contain lowercase letters, numbers, and hyphens",
		)
		.optional(),
	description: z.string().max(500).optional().nullable(),
	retentionDays: z.number().int().min(1).max(3650).default(365),
	aiProcessingEnabled: z.boolean().default(false),
});

export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>;

export const UpdateWorkspaceInputSchema = z.object({
	name: z.string().min(2).max(100).optional(),
	description: z.string().max(500).optional().nullable(),
	retentionDays: z.number().int().min(1).max(3650).optional(),
	aiProcessingEnabled: z.boolean().optional(),
});

export const AddMemberInputSchema = z.object({
	email: z.string().email(),
	role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});

export const UpdateMemberRoleInputSchema = z.object({
	role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

// ==========================================
// Case & Problem Statement Schemas
// ==========================================

export const CaseStatusSchema = z.enum([
	"DRAFT",
	"OPEN",
	"INVESTIGATING",
	"BLOCKED",
	"MITIGATION",
	"VERIFYING",
	"RESOLVED",
	"ARCHIVED",
	"REOPENED",
]);

export const CaseSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const CasePrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const ProblemStatementSchema = z.object({
	title: z.string().min(3, "Title must be at least 3 characters").max(255),
	statement: z
		.string()
		.min(10, "Problem statement must be at least 10 characters")
		.max(5000),
	affectedUsers: z.string().max(1000).optional().nullable(),
	startedAt: z.string().datetime().optional().nullable(),
	expectedBehavior: z.string().max(2500).optional().nullable(),
	observedBehavior: z.string().max(2500).optional().nullable(),
	impact: z.string().max(2500).optional().nullable(),
	severity: CaseSeveritySchema.default("MEDIUM"),
	frequency: z
		.enum(["CONSTANT", "INTERMITTENT", "ONE_OFF", "UNKNOWN"])
		.default("UNKNOWN"),
	environment: z.string().max(1000).optional().nullable(),
	knownConstraints: z.string().max(2000).optional().nullable(),
});

export type ProblemStatementInput = z.infer<typeof ProblemStatementSchema>;

export const CreateCaseInputSchema = z.object({
	title: z.string().min(3, "Title is required").max(255),
	description: z.string().max(5000).default(""),
	severity: CaseSeveritySchema.default("MEDIUM"),
	priority: CasePrioritySchema.default("MEDIUM"),
	incidentMode: z.boolean().default(false),
	problemStatement: ProblemStatementSchema.optional(),
});

export type CreateCaseInput = z.infer<typeof CreateCaseInputSchema>;

export const UpdateCaseInputSchema = z.object({
	title: z.string().min(3).max(255).optional(),
	description: z.string().max(5000).optional(),
	status: CaseStatusSchema.optional(),
	severity: CaseSeveritySchema.optional(),
	priority: CasePrioritySchema.optional(),
	ownerId: z.string().uuid().optional(),
	incidentMode: z.boolean().optional(),
	expectedVersion: z.number().int().optional(), // Optimistic concurrency check
	overrideVerification: z.boolean().optional(),
	overrideReason: z.string().min(5).max(1000).optional(),
	problemStatement: ProblemStatementSchema.optional(),
});

export type UpdateCaseInput = z.infer<typeof UpdateCaseInputSchema>;

// ==========================================
// Evidence Schemas
// ==========================================

export const EvidenceTypeSchema = z.enum([
	"OBSERVATION",
	"DOCUMENT",
	"SCREENSHOT",
	"LOG",
	"MEASUREMENT",
	"USER_REPORT",
	"EXTERNAL_SOURCE",
]);

export const ConfidenceLevelSchema = z.enum([
	"LOW",
	"MEDIUM",
	"HIGH",
	"VERIFIED",
]);

export const CreateEvidenceInputSchema = z.object({
	title: z.string().min(2).max(255),
	description: z.string().max(5000).default(""),
	type: EvidenceTypeSchema.default("OBSERVATION"),
	source: z.string().max(1000).optional().nullable(),
	capturedAt: z
		.string()
		.datetime()
		.optional()
		.default(() => new Date().toISOString()),
	confidence: ConfidenceLevelSchema.default("MEDIUM"),
	tags: z.array(z.string().max(50)).default([]),
	fileUrl: z.string().max(1000).optional().nullable(),
	fileName: z.string().max(255).optional().nullable(),
	fileSize: z
		.number()
		.int()
		.max(50 * 1024 * 1024)
		.optional()
		.nullable(), // 50MB max
	mimeType: z.string().max(100).optional().nullable(),
});

export type CreateEvidenceInput = z.infer<typeof CreateEvidenceInputSchema>;

export const RelationshipTypeSchema = z.enum([
	"SUPPORTS",
	"CONTRADICTS",
	"CAUSED_BY",
	"DERIVED_FROM",
	"VALIDATED_BY",
	"DEPENDS_ON",
]);

export const CreateRelationshipInputSchema = z.object({
	sourceType: z.enum([
		"evidence",
		"hypothesis",
		"root_cause",
		"solution",
		"problem",
	]),
	sourceId: z.string().uuid(),
	targetType: z.enum([
		"evidence",
		"hypothesis",
		"root_cause",
		"solution",
		"action",
	]),
	targetId: z.string().uuid(),
	relationship: RelationshipTypeSchema,
	notes: z.string().max(1000).optional().nullable(),
});

// ==========================================
// Questions & Hypotheses Schemas
// ==========================================

export const CreateQuestionInputSchema = z.object({
	question: z
		.string()
		.min(5, "Question must be at least 5 characters")
		.max(1000),
	answer: z.string().max(5000).optional().nullable(),
	isAnswered: z.boolean().default(false),
});

export const AnswerQuestionInputSchema = z.object({
	answer: z.string().min(1, "Answer is required").max(5000),
});

export const HypothesisStatusSchema = z.enum([
	"UNTESTED",
	"SUPPORTED",
	"WEAKENED",
	"REJECTED",
	"CONFIRMED",
]);

export const CreateHypothesisInputSchema = z.object({
	description: z.string().min(5, "Description is required").max(2500),
	confidence: ConfidenceLevelSchema.default("MEDIUM"),
	status: HypothesisStatusSchema.default("UNTESTED"),
	testsDescription: z.string().max(2500).optional().nullable(),
});

export const UpdateHypothesisInputSchema = z.object({
	description: z.string().min(5).max(2500).optional(),
	confidence: ConfidenceLevelSchema.optional(),
	status: HypothesisStatusSchema.optional(),
	testsDescription: z.string().max(2500).optional().nullable(),
});

// ==========================================
// Root Cause Analysis Schemas
// ==========================================

export const FishboneCategorySchema = z.enum([
	"PEOPLE",
	"PROCESS",
	"TECHNOLOGY",
	"ENVIRONMENT",
	"MATERIALS",
	"MEASUREMENT",
]);

export const CreateRootCauseInputSchema = z.object({
	method: z.enum(["FIVE_WHYS", "FISHBONE", "CONTRIBUTING_FACTORS"]),
	category: FishboneCategorySchema.optional().nullable(),
	whyLevel: z.number().int().min(1).max(5).optional().nullable(),
	parentCauseId: z.string().uuid().optional().nullable(),
	statement: z.string().min(3, "Statement is required").max(2000),
	isConfirmed: z.boolean().default(false),
});

// ==========================================
// Solutions & Decision Schemas
// ==========================================

export const CreateSolutionInputSchema = z.object({
	name: z.string().min(2, "Name is required").max(255),
	description: z.string().min(5).max(4000),
	costScore: z.number().int().min(1).max(5).default(3),
	effortScore: z.number().int().min(1).max(5).default(3),
	riskScore: z.number().int().min(1).max(5).default(3),
	impactScore: z.number().int().min(1).max(5).default(3),
	timeToImplementDays: z.number().int().min(1).max(365).default(7),
	reversibility: z
		.enum(["HIGH", "MEDIUM", "LOW", "IRREVERSIBLE"])
		.default("MEDIUM"),
	dependencies: z.string().max(1000).optional().nullable(),
});

export const CreateDecisionInputSchema = z.object({
	context: z.string().min(5).max(4000),
	chosenSolutionId: z.string().uuid().optional().nullable(),
	reasoning: z.string().min(5).max(4000),
	assumptions: z.array(z.string().max(500)).default([]),
	risks: z.array(z.string().max(500)).default([]),
});

// ==========================================
// Action Plan & Verification Schemas
// ==========================================

export const ActionStatusSchema = z.enum([
	"TODO",
	"IN_PROGRESS",
	"BLOCKED",
	"DONE",
	"CANCELLED",
]);

export const CreateActionInputSchema = z.object({
	title: z.string().min(3, "Action title is required").max(255),
	description: z.string().max(2500).optional().nullable(),
	ownerId: z.string().uuid().optional(),
	priority: CasePrioritySchema.default("MEDIUM"),
	status: ActionStatusSchema.default("TODO"),
	deadline: z.string().datetime().optional().nullable(),
	dependencies: z.array(z.string().uuid()).default([]),
	verificationCriteria: z.string().max(1000).optional().nullable(),
});

export const UpdateActionInputSchema = z.object({
	title: z.string().min(3).max(255).optional(),
	description: z.string().max(2500).optional().nullable(),
	ownerId: z.string().uuid().optional(),
	priority: CasePrioritySchema.optional(),
	status: ActionStatusSchema.optional(),
	deadline: z.string().datetime().optional().nullable(),
	dependencies: z.array(z.string().uuid()).optional(),
	verificationCriteria: z.string().max(1000).optional().nullable(),
});

export const VerificationStatusSchema = z.enum([
	"PENDING",
	"PASSED",
	"FAILED",
	"INCONCLUSIVE",
]);

export const CreateVerificationInputSchema = z.object({
	expectedResult: z.string().min(5, "Expected result is required").max(2000),
	observedResult: z.string().max(2000).optional().nullable(),
	status: VerificationStatusSchema.default("PENDING"),
	notes: z.string().max(2000).optional().nullable(),
});

export const UpdateVerificationInputSchema = z.object({
	observedResult: z.string().max(2000).optional().nullable(),
	status: VerificationStatusSchema,
	notes: z.string().max(2000).optional().nullable(),
});

// ==========================================
// Retrospective Schemas
// ==========================================

export const CreateRetrospectiveInputSchema = z.object({
	whatHappened: z.string().min(10).max(5000),
	whatCausedIt: z.string().min(10).max(5000),
	whatSolvedIt: z.string().min(10).max(5000),
	whatWeMissed: z.string().max(3000).optional().nullable(),
	whatToMonitor: z.string().max(3000).optional().nullable(),
	preventiveActions: z.string().max(3000).optional().nullable(),
});

// ==========================================
// Search & Filter Schemas
// ==========================================

export const GlobalSearchQuerySchema = z.object({
	query: z.string().max(200).default(""),
	workspaceId: z.string().uuid().optional(),
	status: CaseStatusSchema.optional(),
	severity: CaseSeveritySchema.optional(),
	priority: CasePrioritySchema.optional(),
	tag: z.string().max(50).optional(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	cursor: z.string().optional(),
});

export type GlobalSearchQuery = z.infer<typeof GlobalSearchQuerySchema>;

// ==========================================
// Privacy & Consent Schemas
// ==========================================

export const UpdateConsentInputSchema = z.object({
	consentType: z.enum(["AI_PROCESSING", "ERROR_LOGGING", "OFFLINE_CACHE"]),
	status: z.enum(["GRANTED", "WITHDRAWN"]),
	version: z.string().default("1.0"),
});

export const CreateAPIKeyInputSchema = z.object({
	name: z.string().min(2, "Name is required").max(100),
	scopes: z.array(z.string().max(50)).min(1, "At least one scope is required"),
	expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const ExportDataRequestSchema = z.object({
	format: z.enum(["JSON", "CSV", "ZIP"]).default("JSON"),
	includeAuditLogs: z.boolean().default(false),
});
