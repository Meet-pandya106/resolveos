/**
 * @resolveos/domain
 * Core business logic: Case state machine, Problem statement quality scoring,
 * 5-Whys / Fishbone analysis, Multi-criteria solution matrix, Conflict resolution,
 * and Retrospective synthesis.
 */

import {
	CaseActivity,
	CaseSeverity,
	CaseStatus,
	FishboneCategory,
	ProblemStatement,
	Retrospective,
	Solution,
} from "@resolveos/shared";

// =========================================================================
// 1. Case State Machine
// =========================================================================

export const VALID_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
	DRAFT: ["OPEN", "ARCHIVED"],
	OPEN: ["INVESTIGATING", "BLOCKED", "ARCHIVED"],
	INVESTIGATING: ["MITIGATION", "BLOCKED", "VERIFYING", "ARCHIVED"],
	BLOCKED: ["INVESTIGATING", "MITIGATION", "ARCHIVED"],
	MITIGATION: ["VERIFYING", "INVESTIGATING", "BLOCKED", "ARCHIVED"],
	VERIFYING: ["RESOLVED", "MITIGATION", "INVESTIGATING", "BLOCKED"],
	RESOLVED: ["REOPENED", "ARCHIVED"],
	REOPENED: ["INVESTIGATING", "MITIGATION", "ARCHIVED"],
	ARCHIVED: ["DRAFT", "OPEN", "REOPENED"],
};

export class CaseStateMachine {
	static canTransition(from: CaseStatus, to: CaseStatus): boolean {
		const allowed = VALID_TRANSITIONS[from];
		return allowed ? allowed.includes(to) : false;
	}

	static validateTransition(
		from: CaseStatus,
		to: CaseStatus,
		context: {
			hasVerificationPassed?: boolean;
			overridePermission?: boolean;
		} = {},
	): { valid: boolean; reason?: string } {
		if (!this.canTransition(from, to)) {
			return {
				valid: false,
				reason: `Invalid state transition from ${from} to ${to}. Allowed transitions: ${VALID_TRANSITIONS[from]?.join(", ") || "none"}`,
			};
		}

		// Domain invariant: Cannot transition to RESOLVED without passing verification or explicit override
		if (to === "RESOLVED") {
			const hasPassed = context.hasVerificationPassed ?? false;
			const hasOverride = context.overridePermission ?? false;
			if (!hasPassed && !hasOverride) {
				return {
					valid: false,
					reason:
						"Case cannot transition to RESOLVED without a passed verification result or explicit override permission.",
				};
			}
		}

		return { valid: true };
	}
}

// =========================================================================
// 2. Problem Statement Quality Scorer
// =========================================================================

export interface ProblemScoreResult {
	score: number; // 0 to 100
	rating: "INCOMPLETE" | "BASIC" | "ACTIONABLE" | "COMPREHENSIVE";
	missingFields: string[];
	suggestions: string[];
}

export class ProblemScorer {
	static calculateScore(
		statement?: Partial<ProblemStatement> | null,
	): ProblemScoreResult {
		if (!statement) {
			return {
				score: 0,
				rating: "INCOMPLETE",
				missingFields: [
					"title",
					"statement",
					"expectedBehavior",
					"observedBehavior",
					"affectedUsers",
					"impact",
				],
				suggestions: [
					"Start by providing a title and clear problem statement.",
				],
			};
		}

		let score = 0;
		const missing: string[] = [];
		const suggestions: string[] = [];

		// Title (15%)
		if (statement.title && statement.title.trim().length >= 5) {
			score += 15;
		} else {
			missing.push("Clear Title");
			suggestions.push(
				"Add a concise, descriptive title (at least 5 characters).",
			);
		}

		// Core Statement (25%)
		if (statement.statement && statement.statement.trim().length >= 20) {
			score += 25;
		} else if (statement.statement && statement.statement.trim().length > 0) {
			score += 10;
			suggestions.push(
				"Elaborate on the problem statement to explain what is happening.",
			);
		} else {
			missing.push("Problem Statement");
			suggestions.push("Provide a detailed description of the core problem.");
		}

		// Expected vs Observed Behavior (20% total, 10% each)
		if (
			statement.expectedBehavior &&
			statement.expectedBehavior.trim().length >= 10
		) {
			score += 10;
		} else {
			missing.push("Expected Behavior");
			suggestions.push(
				"Clarify what should have happened under normal conditions.",
			);
		}

		if (
			statement.observedBehavior &&
			statement.observedBehavior.trim().length >= 10
		) {
			score += 10;
		} else {
			missing.push("Observed Behavior");
			suggestions.push(
				"Document what actually happened when the problem manifested.",
			);
		}

		// Impact & Affected Users (20% total, 10% each)
		if (statement.impact && statement.impact.trim().length >= 5) {
			score += 10;
		} else {
			missing.push("Business/Operational Impact");
			suggestions.push(
				"Quantify or describe the severity and consequence of the problem.",
			);
		}

		if (statement.affectedUsers && statement.affectedUsers.trim().length > 0) {
			score += 10;
		} else {
			missing.push("Affected Users / Stakeholders");
			suggestions.push("Identify who is impacted by this issue.");
		}

		// Environment & Constraints (10% total, 5% each)
		if (statement.environment && statement.environment.trim().length > 0) {
			score += 5;
		}
		if (
			statement.knownConstraints &&
			statement.knownConstraints.trim().length > 0
		) {
			score += 5;
		}

		// Frequency & Timeline (10% total, 5% each)
		if (statement.frequency && statement.frequency !== "UNKNOWN") {
			score += 5;
		}
		if (statement.startedAt) {
			score += 5;
		}

		let rating: "INCOMPLETE" | "BASIC" | "ACTIONABLE" | "COMPREHENSIVE" =
			"INCOMPLETE";
		if (score >= 85) rating = "COMPREHENSIVE";
		else if (score >= 60) rating = "ACTIONABLE";
		else if (score >= 35) rating = "BASIC";

		return {
			score,
			rating,
			missingFields: missing,
			suggestions,
		};
	}
}

// =========================================================================
// 3. Root Cause Analysis (5-Whys & Fishbone)
// =========================================================================

export interface FiveWhyNode {
	level: number;
	statement: string;
	isConfirmed: boolean;
	children: FiveWhyNode[];
}

export class RootCauseAnalyzer {
	static organizeFiveWhys(
		causes: Array<{
			id: string;
			whyLevel?: number | null;
			parentCauseId?: string | null;
			statement: string;
			isConfirmed: boolean;
		}>,
	): FiveWhyNode[] {
		const rootNodes: FiveWhyNode[] = [];
		const map = new Map<string, FiveWhyNode>();

		// First pass create nodes
		causes.forEach((c) => {
			map.set(c.id, {
				level: c.whyLevel || 1,
				statement: c.statement,
				isConfirmed: c.isConfirmed,
				children: [],
			});
		});

		// Second pass link parent-children
		causes.forEach((c) => {
			const node = map.get(c.id)!;
			if (c.parentCauseId && map.has(c.parentCauseId)) {
				map.get(c.parentCauseId)!.children.push(node);
			} else {
				rootNodes.push(node);
			}
		});

		return rootNodes;
	}

	static organizeFishbone(
		causes: Array<{
			category?: FishboneCategory | null;
			statement: string;
			isConfirmed: boolean;
		}>,
	): Record<
		FishboneCategory,
		Array<{ statement: string; isConfirmed: boolean }>
	> {
		const categories: FishboneCategory[] = [
			"PEOPLE",
			"PROCESS",
			"TECHNOLOGY",
			"ENVIRONMENT",
			"MATERIALS",
			"MEASUREMENT",
		];
		const result: Record<
			FishboneCategory,
			Array<{ statement: string; isConfirmed: boolean }>
		> = {
			PEOPLE: [],
			PROCESS: [],
			TECHNOLOGY: [],
			ENVIRONMENT: [],
			MATERIALS: [],
			MEASUREMENT: [],
		};

		causes.forEach((c) => {
			const cat =
				c.category && categories.includes(c.category)
					? c.category
					: "TECHNOLOGY";
			result[cat].push({
				statement: c.statement,
				isConfirmed: c.isConfirmed,
			});
		});

		return result;
	}
}

// =========================================================================
// 4. Solution Multi-Criteria Scoring Matrix
// =========================================================================

export interface SolutionWeightCriteria {
	impactWeight: number; // e.g. 0.35
	effortWeight: number; // e.g. 0.25 (lower effort is better)
	riskWeight: number; // e.g. 0.20 (lower risk is better)
	costWeight: number; // e.g. 0.20 (lower cost is better)
}

export const DEFAULT_WEIGHT_CRITERIA: SolutionWeightCriteria = {
	impactWeight: 0.4,
	effortWeight: 0.25,
	riskWeight: 0.2,
	costWeight: 0.15,
};

export class SolutionScorer {
	/**
	 * Computes a normalized weighted score between 0.0 and 10.0 under the user-defined criteria.
	 * Note: Higher impact is positive; Higher effort, risk, and cost are penalties.
	 */
	static calculateWeightedScore(
		solution: Solution,
		weights: SolutionWeightCriteria = DEFAULT_WEIGHT_CRITERIA,
	): number {
		// Normalize weights to sum to 1.0
		const totalWeight =
			weights.impactWeight +
			weights.effortWeight +
			weights.riskWeight +
			weights.costWeight;
		const iw = weights.impactWeight / totalWeight;
		const ew = weights.effortWeight / totalWeight;
		const rw = weights.riskWeight / totalWeight;
		const cw = weights.costWeight / totalWeight;

		// Normalizing 1..5 scales to 0..10
		const impactFactor = ((solution.impactScore - 1) / 4) * 10;
		// Invert penalties so 1 is best (10 pts) and 5 is worst (0 pts)
		const effortFactor = ((5 - solution.effortScore) / 4) * 10;
		const riskFactor = ((5 - solution.riskScore) / 4) * 10;
		const costFactor = ((5 - solution.costScore) / 4) * 10;

		const weightedScore =
			impactFactor * iw + effortFactor * ew + riskFactor * rw + costFactor * cw;
		return Number(weightedScore.toFixed(2));
	}

	static rankSolutions(
		solutions: Solution[],
		weights: SolutionWeightCriteria = DEFAULT_WEIGHT_CRITERIA,
	): Solution[] {
		return [...solutions]
			.map((s) => ({
				...s,
				weightedScore: this.calculateWeightedScore(s, weights),
			}))
			.sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0));
	}
}

// =========================================================================
// 5. Offline Sync Conflict Resolver
// =========================================================================

export interface ConflictDetail {
	field: string;
	baseValue: any;
	localValue: any;
	remoteValue: any;
}

export interface MergeResult<T> {
	merged: T;
	hasConflicts: boolean;
	conflictingFields: string[];
	conflicts: ConflictDetail[];
}

export class ConflictResolver {
	/**
	 * Field-level 3-way conflict detector and automatic merger where safe.
	 */
	static mergeEntities<T extends Record<string, any>>(
		base: T,
		local: T,
		remote: T,
	): MergeResult<T> {
		const merged: Record<string, any> = { ...base };
		const conflictingFields: string[] = [];
		const conflicts: ConflictDetail[] = [];
		const allKeys = Array.from(
			new Set([
				...Object.keys(base),
				...Object.keys(local),
				...Object.keys(remote),
			]),
		);

		for (const key of allKeys) {
			const baseVal = base[key];
			const localVal = local[key];
			const remoteVal = remote[key];

			const localChanged = JSON.stringify(baseVal) !== JSON.stringify(localVal);
			const remoteChanged =
				JSON.stringify(baseVal) !== JSON.stringify(remoteVal);

			if (!localChanged && !remoteChanged) {
				merged[key] = baseVal;
			} else if (localChanged && !remoteChanged) {
				merged[key] = localVal;
			} else if (!localChanged && remoteChanged) {
				merged[key] = remoteVal;
			} else {
				// Both changed: check if identical
				if (JSON.stringify(localVal) === JSON.stringify(remoteVal)) {
					merged[key] = localVal;
				} else {
					// Genuine conflict
					conflictingFields.push(key);
					conflicts.push({
						field: key,
						baseValue: baseVal,
						localValue: localVal,
						remoteValue: remoteVal,
					});
					// Default: preserve remote on server side until manual review
					merged[key] = remoteVal;
				}
			}
		}

		return {
			merged: merged as T,
			hasConflicts: conflictingFields.length > 0,
			conflictingFields,
			conflicts,
		};
	}

	static merge3Way<T extends Record<string, any>>(
		base: T,
		local: T,
		remote: T,
	): MergeResult<T> {
		return this.mergeEntities(base, local, remote);
	}
}

// =========================================================================
// 6. Retrospective Synthesis Engine
// =========================================================================

export class RetrospectiveGenerator {
	static generateDraft(caseData: {
		title: string;
		description: string;
		problemStatement?: ProblemStatement | null;
		confirmedRootCauses?: Array<{ statement: string }>;
		chosenSolution?: Solution | null;
		activities: CaseActivity[];
	}): Partial<Retrospective> {
		const whatHappened =
			caseData.problemStatement?.statement ||
			caseData.description ||
			`Case "${caseData.title}" was identified and investigated.`;
		const whatCausedIt =
			caseData.confirmedRootCauses && caseData.confirmedRootCauses.length > 0
				? caseData.confirmedRootCauses.map((c) => `• ${c.statement}`).join("\n")
				: "Root cause analysis identified operational deviations in the affected system.";
		const whatSolvedIt = caseData.chosenSolution
			? `Implemented solution: ${caseData.chosenSolution.name}.\n${caseData.chosenSolution.description}`
			: "Corrective actions were executed and verified against defined acceptance criteria.";

		return {
			whatHappened,
			whatCausedIt,
			whatSolvedIt,
			whatWeMissed:
				"Document any symptoms that were initially overlooked during triage.",
			whatToMonitor:
				"Establish automated telemetry monitoring and threshold alerts for recurrence.",
			preventiveActions:
				"Update operational runbooks and implement automated validation checks.",
		};
	}
}
