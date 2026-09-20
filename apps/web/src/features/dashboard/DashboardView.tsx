import { Case } from "@resolveos/shared";
import {
	Activity,
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	Clock,
	Filter,
	GitBranch,
	Layers,
	PlusCircle,
	Search,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	TrendingUp,
	Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { APIClient } from "../../lib/api.js";
import { useAuthStore } from "../../stores/authStore.js";

export const DashboardView: React.FC = () => {
	const { activeWorkspaceId } = useAuthStore();
	const navigate = useNavigate();
	const [cases, setCases] = useState<Case[]>([]);
	const [loading, setLoading] = useState(true);
	const [filterMode, setFilterMode] = useState<
		"ALL" | "INCIDENT" | "VERIFYING" | "RESOLVED"
	>("ALL");
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (!activeWorkspaceId) return;
		setLoading(true);
		APIClient.get<Case[]>(`/workspaces/${activeWorkspaceId}/cases`)
			.then((data) => setCases(data || []))
			.catch((err) => console.error("Failed to load dashboard cases:", err))
			.finally(() => setLoading(false));
	}, [activeWorkspaceId]);

	const openCases = cases.filter(
		(c) => c.status !== "RESOLVED" && c.status !== "ARCHIVED",
	);
	const criticalCases = cases.filter(
		(c) => c.severity === "CRITICAL" && c.status !== "RESOLVED",
	);
	const incidentCases = cases.filter(
		(c) => c.incidentMode && c.status !== "RESOLVED",
	);
	const resolvedCases = cases.filter((c) => c.status === "RESOLVED");
	const verifyingCases = cases.filter((c) => c.status === "VERIFYING");

	// Filtered list
	const displayCases = cases.filter((c) => {
		if (filterMode === "INCIDENT" && !c.incidentMode) return false;
		if (filterMode === "VERIFYING" && c.status !== "VERIFYING") return false;
		if (filterMode === "RESOLVED" && c.status !== "RESOLVED") return false;
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			return (
				c.title.toLowerCase().includes(q) ||
				(c.description && c.description.toLowerCase().includes(q))
			);
		}
		return true;
	});

	// 12-Stage lifecycle distribution estimation
	const stageStats = [
		{
			label: "Formulation",
			count: cases.filter((c) => c.status === "DRAFT").length,
			color: "bg-blue-500",
		},
		{
			label: "Investigation",
			count: cases.filter((c) => c.status === "INVESTIGATING").length,
			color: "bg-amber-500",
		},
		{
			label: "Verification",
			count: cases.filter((c) => c.status === "VERIFYING").length,
			color: "bg-purple-500",
		},
		{
			label: "Resolved",
			count: cases.filter((c) => c.status === "RESOLVED").length,
			color: "bg-emerald-500",
		},
	];

	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{/* Top Header & Fast Action */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-black tracking-tight text-foreground">
							Resolution Operations Center
						</h1>
						<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
							LIVE TELEMETRY
						</span>
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						Enforced 12-stage scientific problem lifecycle monitoring and
						incident governance.
					</p>
				</div>

				<div className="flex items-center gap-3">
					<button
						onClick={() => navigate("/cases?incident=true")}
						className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
					>
						<Zap className="w-3.5 h-3.5 animate-pulse" />
						<span>Incident Command</span>
					</button>

					<button
						onClick={() => navigate("/cases/new")}
						className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-glow-primary transition-all active:scale-95"
					>
						<PlusCircle className="w-4 h-4" />
						<span>New Case</span>
					</button>
				</div>
			</div>

			{/* Incident Command Radar Banner (if active) */}
			{incidentCases.length > 0 && (
				<div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 via-rose-900/30 to-background border border-rose-500/40 shadow-glow-rose flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-center gap-3.5">
						<div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-bold relative shrink-0">
							<Zap className="w-5 h-5 animate-pulse" />
							<span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 animate-ping" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
									Critical Alert
								</span>
								<span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-200">
									SEV-1 ACTIVE
								</span>
							</div>
							<h2 className="text-sm font-bold text-foreground mt-0.5">
								{incidentCases.length} Critical Outage
								{incidentCases.length > 1 ? "s" : ""} in Rapid Containment Mode
							</h2>
							<p className="text-[11px] text-muted-foreground">
								Live collaboration, emergency root-cause verification, and
								telemetry active.
							</p>
						</div>
					</div>

					<button
						onClick={() => navigate("/cases?incident=true")}
						className="self-start sm:self-auto px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-sm"
					>
						Open Incident Command Room →
					</button>
				</div>
			)}

			{/* 4 Glowing Metric KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Open Cases */}
				<div className="p-5 rounded-2xl glass-panel border border-border/80 relative overflow-hidden group hover:border-primary/50 transition-all">
					<div className="flex items-center justify-between">
						<span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
							Active Cases
						</span>
						<div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
							<AlertCircle className="w-4 h-4" />
						</div>
					</div>
					<div className="text-3xl font-black mt-2 font-mono">
						{openCases.length}
					</div>
					<div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<span className="text-primary font-semibold">12-Stage</span>{" "}
						pipeline active
					</div>
				</div>

				{/* Critical Severity */}
				<div className="p-5 rounded-2xl glass-panel border border-border/80 relative overflow-hidden group hover:border-rose-500/50 transition-all">
					<div className="flex items-center justify-between">
						<span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
							Critical Severity
						</span>
						<div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
							<ShieldAlert className="w-4 h-4" />
						</div>
					</div>
					<div className="text-3xl font-black mt-2 text-rose-400 font-mono">
						{criticalCases.length}
					</div>
					<div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<span className="text-rose-400 font-semibold">
							{incidentCases.length}
						</span>{" "}
						under incident mode
					</div>
				</div>

				{/* Awaiting Verification */}
				<div className="p-5 rounded-2xl glass-panel border border-border/80 relative overflow-hidden group hover:border-amber-500/50 transition-all">
					<div className="flex items-center justify-between">
						<span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
							Awaiting Verification
						</span>
						<div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
							<Clock className="w-4 h-4" />
						</div>
					</div>
					<div className="text-3xl font-black mt-2 text-amber-400 font-mono">
						{verifyingCases.length}
					</div>
					<div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<span className="text-amber-400 font-semibold">
							Invariant Guard:
						</span>{" "}
						Blocked till pass
					</div>
				</div>

				{/* Resolved Cases */}
				<div className="p-5 rounded-2xl glass-panel border border-border/80 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
					<div className="flex items-center justify-between">
						<span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
							Empirically Verified
						</span>
						<div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
							<CheckCircle2 className="w-4 h-4" />
						</div>
					</div>
					<div className="text-3xl font-black mt-2 text-emerald-400 font-mono">
						{resolvedCases.length}
					</div>
					<div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<TrendingUp className="w-3 h-3 text-emerald-400" />
						<span className="text-emerald-400 font-semibold">
							100% verified
						</span>{" "}
						zero regression
					</div>
				</div>
			</div>

			{/* 12-Stage Lifecycle Distribution Bar */}
			<div className="p-5 rounded-2xl glass-panel border border-border/80 space-y-3">
				<div className="flex items-center justify-between text-xs">
					<div className="flex items-center gap-2 font-mono font-semibold text-foreground">
						<GitBranch className="w-4 h-4 text-primary" />
						<span>12-Stage Scientific Resolution Distribution</span>
					</div>
					<span className="text-muted-foreground font-mono text-[11px]">
						{cases.length} Total Registered Cases
					</span>
				</div>

				<div className="w-full h-3 rounded-full bg-muted/40 overflow-hidden flex gap-0.5 p-0.5">
					{stageStats.map((st, i) => {
						const pct =
							cases.length > 0
								? Math.max((st.count / cases.length) * 100, 3)
								: 25;
						return (
							<div
								key={i}
								style={{ width: `${pct}%` }}
								className={`${st.color} h-full rounded-sm transition-all`}
								title={`${st.label}: ${st.count}`}
							/>
						);
					})}
				</div>

				<div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-muted-foreground pt-1">
					{stageStats.map((st, i) => (
						<div key={i} className="flex items-center gap-1.5">
							<span className={`w-2 h-2 rounded-full ${st.color}`} />
							<span>{st.label}</span>
							<span className="text-foreground font-bold">({st.count})</span>
						</div>
					))}
				</div>
			</div>

			{/* Active Pipeline & Search */}
			<div className="p-5 sm:p-6 rounded-2xl glass-panel border border-border/80 space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
					<div className="flex items-center gap-2">
						<Activity className="w-4 h-4 text-primary" />
						<h3 className="text-sm font-bold text-foreground">
							Active Case Stream
						</h3>
						<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
							{displayCases.length} showing
						</span>
					</div>

					{/* Quick Filter Tabs */}
					<div className="flex flex-wrap items-center gap-1.5">
						{(["ALL", "INCIDENT", "VERIFYING", "RESOLVED"] as const).map(
							(mode) => (
								<button
									key={mode}
									onClick={() => setFilterMode(mode)}
									className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
										filterMode === mode
											? "bg-primary text-primary-foreground shadow-glow-primary"
											: "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
									}`}
								>
									{mode === "ALL"
										? "All Cases"
										: mode === "INCIDENT"
											? "🚨 Incidents"
											: mode === "VERIFYING"
												? "⏳ Verifying"
												: "✓ Resolved"}
								</button>
							),
						)}
					</div>
				</div>

				{/* Search Bar */}
				<div className="relative">
					<input
						type="text"
						placeholder="Search cases by title, hypothesis, or failure summary..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-9 pr-4 py-2 rounded-xl bg-background/80 border border-border text-xs text-foreground outline-none focus:border-primary font-mono transition-colors"
					/>
					<Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
				</div>

				{/* Case Cards List */}
				{loading ? (
					<div className="p-12 text-center text-xs text-muted-foreground font-mono animate-pulse">
						Querying workspace telemetry...
					</div>
				) : displayCases.length === 0 ? (
					<div className="p-12 text-center space-y-3">
						<div className="w-12 h-12 rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center mx-auto">
							<Layers className="w-6 h-6" />
						</div>
						<p className="text-xs text-muted-foreground font-mono">
							No matching cases found for the selected filter.
						</p>
						<button
							onClick={() => navigate("/cases/new")}
							className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
						>
							Create New Problem Case
						</button>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
						{displayCases.map((c) => (
							<div
								key={c.id}
								onClick={() => navigate(`/cases/${c.id}`)}
								className="p-4 rounded-xl border border-border/80 bg-card/60 hover:bg-card hover:border-primary/40 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
							>
								<div className="space-y-2">
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-center gap-2 flex-wrap">
											{c.incidentMode && (
												<span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold flex items-center gap-1 border border-rose-500/30">
													<Zap className="w-3 h-3" />
													INCIDENT
												</span>
											)}
											<span
												className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
													c.severity === "CRITICAL"
														? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
														: c.severity === "HIGH"
															? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
															: "bg-muted/60 text-muted-foreground"
												}`}
											>
												{c.severity}
											</span>
											<span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
												{c.status}
											</span>
										</div>

										<ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
									</div>

									<h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
										{c.title}
									</h4>
									<p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
										{c.description || "No structured description provided."}
									</p>
								</div>

								{/* Completeness & Metadata */}
								<div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
									<div className="flex items-center gap-2">
										<span className="text-foreground font-semibold">
											12-Stage Engine
										</span>
										<span>•</span>
										<span>v{c.version || 1}</span>
									</div>
									<span className="text-primary font-semibold hover:underline">
										Investigate →
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};
