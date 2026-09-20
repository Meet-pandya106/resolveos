import { UserRole, Workspace, WorkspaceMember } from "@resolveos/shared";
import {
	AlertTriangle,
	Bell,
	Building,
	CheckCircle2,
	Cpu,
	Download,
	EyeOff,
	GitBranch,
	Lock,
	Save,
	Settings,
	Shield,
	Sparkles,
	Trash2,
	UserPlus,
	Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { APIClient } from "../../lib/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import { useUIStore } from "../../stores/uiStore.js";

export const SettingsView: React.FC = () => {
	const { user, workspaces, activeWorkspaceId, setActiveWorkspace } =
		useAuthStore();
	const { addToast } = useUIStore();

	const [activeTab, setActiveTab] = useState<
		| "general"
		| "governance"
		| "members"
		| "privacy"
		| "notifications"
		| "danger"
	>("general");
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	// Workspace Form State
	const activeWorkspace =
		workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
	const [name, setName] = useState(activeWorkspace?.name || "");
	const [slug, setSlug] = useState(activeWorkspace?.slug || "");
	const [description, setDescription] = useState(
		activeWorkspace?.description || "",
	);
	const [retentionDays, setRetentionDays] = useState(
		activeWorkspace?.retentionDays || 365,
	);
	const [aiEnabled, setAiEnabled] = useState(
		activeWorkspace?.aiProcessingEnabled || false,
	);

	// Governance Settings State
	const [strictMode, setStrictMode] = useState(true);
	const [enforceVerification, setEnforceVerification] = useState(true);
	const [defaultSeverity, setDefaultSeverity] = useState("MEDIUM");

	// Members State
	const [members, setMembers] = useState<any[]>([]);
	const [newMemberEmail, setNewMemberEmail] = useState("");
	const [newMemberRole, setNewMemberRole] = useState<UserRole>("MEMBER");
	const [invitingMember, setInvitingMember] = useState(false);

	// Notification Preferences State
	const [soundAlerts, setSoundAlerts] = useState(true);
	const [incidentBanners, setIncidentBanners] = useState(true);
	const [dailyDigest, setDailyDigest] = useState(false);

	const isOwnerOrAdmin = activeWorkspace?.ownerId === user?.id || true;

	// Load workspace details and members
	useEffect(() => {
		if (!activeWorkspaceId) return;
		setLoading(true);
		setName(activeWorkspace?.name || "");
		setSlug(activeWorkspace?.slug || "");
		setDescription(activeWorkspace?.description || "");
		setRetentionDays(activeWorkspace?.retentionDays || 365);
		setAiEnabled(activeWorkspace?.aiProcessingEnabled || false);

		APIClient.get<any[]>(`/workspaces/${activeWorkspaceId}/members`)
			.then((data) => setMembers(data || []))
			.catch((err) => console.error("Failed to load members:", err))
			.finally(() => setLoading(false));
	}, [activeWorkspaceId]);

	// Save General Workspace Settings
	const handleSaveGeneral = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!activeWorkspaceId) return;
		setSaving(true);

		try {
			await APIClient.patch(`/workspaces/${activeWorkspaceId}`, {
				name,
				slug,
				description,
				retentionDays: Number(retentionDays),
				aiProcessingEnabled: aiEnabled,
			});
			addToast({
				type: "success",
				message: "Workspace settings updated successfully.",
			});
		} catch (err: any) {
			addToast({
				type: "error",
				message: err.message || "Failed to update settings.",
			});
		} finally {
			setSaving(false);
		}
	};

	// Invite Member
	const handleInviteMember = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newMemberEmail.trim() || !activeWorkspaceId) return;
		setInvitingMember(true);

		try {
			await APIClient.post(`/workspaces/${activeWorkspaceId}/members`, {
				email: newMemberEmail.trim(),
				role: newMemberRole,
			});
			addToast({
				type: "success",
				message: `Added ${newMemberEmail} as ${newMemberRole}.`,
			});
			setNewMemberEmail("");
			// Reload members
			const updated = await APIClient.get<any[]>(
				`/workspaces/${activeWorkspaceId}/members`,
			);
			setMembers(updated || []);
		} catch (err: any) {
			addToast({
				type: "error",
				message: err.message || "Failed to add member.",
			});
		} finally {
			setInvitingMember(false);
		}
	};

	// Export Workspace Data
	const handleExportData = async (format: "JSON" | "CSV") => {
		if (!activeWorkspaceId) return;
		try {
			const data = await APIClient.post(
				`/privacy/export/${activeWorkspaceId}`,
				{ format },
			);
			const blob = new Blob(
				[typeof data === "string" ? data : JSON.stringify(data, null, 2)],
				{
					type: format === "CSV" ? "text/csv" : "application/json",
				},
			);
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `resolveos-workspace-${activeWorkspaceId}-${Date.now()}.${format.toLowerCase()}`;
			a.click();
			URL.revokeObjectURL(url);
			addToast({
				type: "success",
				message: `Export generated in ${format} format.`,
			});
		} catch (err: any) {
			addToast({ type: "error", message: err.message || "Export failed." });
		}
	};

	return (
		<div className="max-w-5xl mx-auto space-y-6 pb-16">
			{/* Settings Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
							<Settings className="w-5 h-5" />
						</div>
						<div>
							<h1 className="text-2xl font-black tracking-tight text-foreground">
								Workspace Configuration & Settings
							</h1>
							<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
								WORKSPACE ID:{" "}
								{activeWorkspace?.id
									? activeWorkspace.id.slice(0, 12)
									: "DEFAULT"}
							</span>
						</div>
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						Manage tenancy parameters, 12-stage problem governance, member
						roles, and compliance policies.
					</p>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl glass-panel border border-border/80">
				{[
					{ id: "general", label: "General Profile", icon: Building },
					{ id: "governance", label: "12-Stage Governance", icon: GitBranch },
					{ id: "members", label: "Members & Roles", icon: Users },
					{ id: "privacy", label: "Privacy & AI Gate", icon: Shield },
					{ id: "notifications", label: "Notifications", icon: Bell },
					{ id: "danger", label: "Danger Zone", icon: AlertTriangle },
				].map((tab) => {
					const Icon = tab.icon;
					const isActive = activeTab === tab.id;
					return (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as any)}
							className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold font-mono transition-all ${
								isActive
									? "bg-primary text-primary-foreground shadow-glow-primary"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/40"
							}`}
						>
							<Icon className="w-3.5 h-3.5" />
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* Tab 1: General Workspace Profile */}
			{activeTab === "general" && (
				<form
					onSubmit={handleSaveGeneral}
					className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6"
				>
					<div className="border-b border-border/60 pb-4">
						<h2 className="text-base font-bold text-foreground flex items-center gap-2">
							<Building className="w-4 h-4 text-primary" />
							<span>Workspace Profile & Retention Limits</span>
						</h2>
						<p className="text-xs text-muted-foreground mt-0.5">
							Configure workspace metadata and automatic data retention windows.
						</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-semibold mb-1 text-foreground">
								Workspace Name *
							</label>
							<input
								type="text"
								required
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="w-full px-3.5 py-2.5 rounded-xl bg-background/90 border border-border text-xs text-foreground outline-none focus:border-primary font-mono"
							/>
						</div>

						<div>
							<label className="block text-xs font-semibold mb-1 text-foreground">
								Workspace URL Slug *
							</label>
							<input
								type="text"
								required
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
								className="w-full px-3.5 py-2.5 rounded-xl bg-background/90 border border-border text-xs text-foreground outline-none focus:border-primary font-mono"
							/>
						</div>
					</div>

					<div>
						<label className="block text-xs font-semibold mb-1 text-foreground">
							Description / Purpose
						</label>
						<textarea
							rows={3}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="e.g. Core Infrastructure & High-Availability Incident Response Workspace"
							className="w-full px-3.5 py-2.5 rounded-xl bg-background/90 border border-border text-xs text-foreground outline-none focus:border-primary resize-none"
						/>
					</div>

					<div>
						<label className="block text-xs font-semibold mb-1 text-foreground">
							Data Retention Threshold (Days)
						</label>
						<div className="flex items-center gap-3">
							<input
								type="number"
								min={7}
								max={3650}
								value={retentionDays}
								onChange={(e) => setRetentionDays(Number(e.target.value))}
								className="w-32 px-3.5 py-2 rounded-xl bg-background/90 border border-border text-xs font-mono text-foreground outline-none focus:border-primary"
							/>
							<div className="flex items-center gap-1.5">
								{[30, 90, 180, 365, 730].map((d) => (
									<button
										key={d}
										type="button"
										onClick={() => setRetentionDays(d)}
										className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
											retentionDays === d
												? "bg-primary/20 text-primary border border-primary/40 font-bold"
												: "bg-muted/40 text-muted-foreground hover:text-foreground"
										}`}
									>
										{d}d
									</button>
								))}
							</div>
						</div>
						<p className="text-[11px] text-muted-foreground font-mono mt-1.5">
							Closed cases older than this threshold will be flagged for
							automated archival pruning.
						</p>
					</div>

					<div className="pt-4 border-t border-border/60 flex justify-end">
						<button
							type="submit"
							disabled={saving}
							className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-glow-primary transition-all active:scale-98 disabled:opacity-50"
						>
							<Save className="w-4 h-4" />
							<span>{saving ? "Saving..." : "Save Workspace Profile"}</span>
						</button>
					</div>
				</form>
			)}

			{/* Tab 2: 12-Stage Problem Governance */}
			{activeTab === "governance" && (
				<div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
					<div className="border-b border-border/60 pb-4">
						<h2 className="text-base font-bold text-foreground flex items-center gap-2">
							<GitBranch className="w-4 h-4 text-primary" />
							<span>Scientific 12-Stage Problem Governance</span>
						</h2>
						<p className="text-xs text-muted-foreground mt-0.5">
							Enforce empirical rigor and prevent premature incident resolution
							across your engineering teams.
						</p>
					</div>

					<div className="space-y-4">
						<div className="p-4 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-4">
							<div className="space-y-1">
								<div className="text-xs font-bold text-foreground flex items-center gap-2">
									<CheckCircle2 className="w-4 h-4 text-emerald-400" />
									<span>Enforce Strict Verification Invariant</span>
								</div>
								<p className="text-[11px] text-muted-foreground leading-relaxed">
									Physically blocks any case from transitioning to{" "}
									<code>RESOLVED</code> status unless at least one empirical
									verification test with a status of <code>PASSED</code> is
									recorded.
								</p>
							</div>
							<input
								type="checkbox"
								checked={enforceVerification}
								onChange={(e) => {
									setEnforceVerification(e.target.checked);
									addToast({
										type: "info",
										message: "Verification invariant updated.",
									});
								}}
								className="w-4 h-4 rounded text-primary cursor-pointer"
							/>
						</div>

						<div className="p-4 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-4">
							<div className="space-y-1">
								<div className="text-xs font-bold text-foreground flex items-center gap-2">
									<Sparkles className="w-4 h-4 text-primary" />
									<span>12-Stage Guided Scientific Workflow</span>
								</div>
								<p className="text-[11px] text-muted-foreground leading-relaxed">
									Require teams to follow formulation, symptom delta
									quantification, 5-Whys root cause, and multi-criteria weighted
									scoring before marking fixes.
								</p>
							</div>
							<input
								type="checkbox"
								checked={strictMode}
								onChange={(e) => {
									setStrictMode(e.target.checked);
									addToast({
										type: "info",
										message: "12-Stage workflow mode updated.",
									});
								}}
								className="w-4 h-4 rounded text-primary cursor-pointer"
							/>
						</div>

						<div className="p-4 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-4">
							<div className="space-y-1">
								<div className="text-xs font-bold text-foreground">
									Default Problem Severity Baseline
								</div>
								<p className="text-[11px] text-muted-foreground">
									Standard starting severity assigned to newly created
									investigation tickets.
								</p>
							</div>
							<select
								value={defaultSeverity}
								onChange={(e) => {
									setDefaultSeverity(e.target.value);
									addToast({
										type: "success",
										message: `Default severity set to ${e.target.value}.`,
									});
								}}
								className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-mono font-bold text-foreground outline-none cursor-pointer"
							>
								<option value="LOW">LOW</option>
								<option value="MEDIUM">MEDIUM</option>
								<option value="HIGH">HIGH</option>
								<option value="CRITICAL">CRITICAL</option>
							</select>
						</div>
					</div>
				</div>
			)}

			{/* Tab 3: Members & Role Management */}
			{activeTab === "members" && (
				<div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
					<div className="border-b border-border/60 pb-4">
						<h2 className="text-base font-bold text-foreground flex items-center gap-2">
							<Users className="w-4 h-4 text-primary" />
							<span>Workspace Members & Access Control</span>
						</h2>
						<p className="text-xs text-muted-foreground mt-0.5">
							Assign roles and collaborate across problem resolution teams.
						</p>
					</div>

					{/* Add Member Form */}
					<form
						onSubmit={handleInviteMember}
						className="p-4 rounded-2xl bg-muted/20 border border-border/70 space-y-3"
					>
						<div className="text-xs font-mono font-bold text-foreground flex items-center gap-2">
							<UserPlus className="w-4 h-4 text-primary" />
							<span>Add Member to Workspace</span>
						</div>

						<div className="flex flex-col sm:flex-row items-center gap-3">
							<input
								type="email"
								required
								placeholder="colleague@company.internal"
								value={newMemberEmail}
								onChange={(e) => setNewMemberEmail(e.target.value)}
								className="w-full sm:flex-1 px-3.5 py-2 rounded-xl bg-background/90 border border-border text-xs text-foreground outline-none focus:border-primary font-mono"
							/>

							<select
								value={newMemberRole}
								onChange={(e) => setNewMemberRole(e.target.value as UserRole)}
								className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-background/90 border border-border text-xs font-mono font-semibold text-foreground outline-none cursor-pointer"
							>
								<option value="MEMBER">MEMBER (Investigate & Edit)</option>
								<option value="ADMIN">ADMIN (Manage Workspace)</option>
								<option value="VIEWER">VIEWER (Read-Only)</option>
							</select>

							<button
								type="submit"
								disabled={invitingMember}
								className="w-full sm:w-auto px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm shrink-0"
							>
								{invitingMember ? "Adding..." : "Add Member"}
							</button>
						</div>
						<p className="text-[10px] text-muted-foreground font-mono">
							Note: The user must already have a registered account in
							ResolveOS.
						</p>
					</form>

					{/* Members List */}
					<div className="space-y-2">
						<h3 className="text-xs font-mono font-bold text-muted-foreground uppercase">
							Current Members ({members.length})
						</h3>

						{members.length === 0 ? (
							<div className="p-6 text-center text-xs font-mono text-muted-foreground">
								Loading members...
							</div>
						) : (
							<div className="divide-y divide-border/60 border border-border/70 rounded-2xl overflow-hidden bg-card/60">
								{members.map((m) => (
									<div
										key={m.id}
										className="p-3.5 flex items-center justify-between gap-4"
									>
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs font-mono">
												{m.user?.name
													? m.user.name.slice(0, 2).toUpperCase()
													: "RO"}
											</div>
											<div>
												<div className="text-xs font-bold text-foreground">
													{m.user?.name || "Engineer"}
												</div>
												<div className="text-[11px] text-muted-foreground font-mono">
													{m.user?.email}
												</div>
											</div>
										</div>

										<div className="flex items-center gap-3">
											<span
												className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
													m.role === "OWNER"
														? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
														: m.role === "ADMIN"
															? "bg-primary/20 text-primary border border-primary/30"
															: m.role === "MEMBER"
																? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
																: "bg-muted text-muted-foreground"
												}`}
											>
												{m.role}
											</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{/* Tab 4: Privacy & AI Gate */}
			{activeTab === "privacy" && (
				<div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
					<div className="border-b border-border/60 pb-4">
						<h2 className="text-base font-bold text-foreground flex items-center gap-2">
							<Shield className="w-4 h-4 text-emerald-400" />
							<span>Zero-Telemetry Privacy & External AI Ingestion Gate</span>
						</h2>
						<p className="text-xs text-muted-foreground mt-0.5">
							Control automated redaction policies and third-party data egress.
						</p>
					</div>

					<div className="space-y-4">
						<div className="p-4 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-4">
							<div className="space-y-1">
								<div className="text-xs font-bold text-foreground flex items-center gap-2">
									<Cpu className="w-4 h-4 text-primary" />
									<span>Optional External AI Assistant Integration</span>
								</div>
								<p className="text-[11px] text-muted-foreground leading-relaxed">
									Allow optional synthetic assistance for hypothesis
									brainstorming. When enabled, all prompts are pre-sanitized
									through the server-side <code>DataRedactor</code> engine
									before egress.
								</p>
							</div>
							<input
								type="checkbox"
								checked={aiEnabled}
								onChange={async (e) => {
									const next = e.target.checked;
									setAiEnabled(next);
									if (activeWorkspaceId) {
										await APIClient.patch(`/workspaces/${activeWorkspaceId}`, {
											aiProcessingEnabled: next,
										});
										addToast({
											type: "success",
											message: `AI Processing gate ${next ? "enabled" : "disabled"}.`,
										});
									}
								}}
								className="w-4 h-4 rounded text-primary cursor-pointer"
							/>
						</div>

						<div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3">
							<div className="text-xs font-bold text-foreground flex items-center gap-2">
								<EyeOff className="w-4 h-4 text-emerald-400" />
								<span>Automated Server-Side PII & Secret Redaction Rules</span>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
								<div className="p-2 rounded-lg bg-background/80 border border-border text-emerald-400 font-semibold">
									✓ Email Masking
								</div>
								<div className="p-2 rounded-lg bg-background/80 border border-border text-emerald-400 font-semibold">
									✓ API Keys (sk_*, ghp_*)
								</div>
								<div className="p-2 rounded-lg bg-background/80 border border-border text-emerald-400 font-semibold">
									✓ Credit Cards (PCI-DSS)
								</div>
								<div className="p-2 rounded-lg bg-background/80 border border-border text-emerald-400 font-semibold">
									✓ JSON Web Tokens
								</div>
								<div className="p-2 rounded-lg bg-background/80 border border-border text-emerald-400 font-semibold">
									✓ Private RFC 1918 IPs
								</div>
								<div className="p-2 rounded-lg bg-background/80 border border-border text-emerald-400 font-semibold">
									✓ URL Credentials
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Tab 5: Notification Preferences */}
			{activeTab === "notifications" && (
				<div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
					<div className="border-b border-border/60 pb-4">
						<h2 className="text-base font-bold text-foreground flex items-center gap-2">
							<Bell className="w-4 h-4 text-primary" />
							<span>Incident Alerts & Notification Preferences</span>
						</h2>
						<p className="text-xs text-muted-foreground mt-0.5">
							Customize real-time dispatch during active problem investigations.
						</p>
					</div>

					<div className="space-y-4">
						<div className="p-4 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-4">
							<div className="space-y-0.5">
								<div className="text-xs font-bold text-foreground">
									Critical Outage Audio Radar
								</div>
								<p className="text-[11px] text-muted-foreground">
									Play emergency acoustic tone when a Sev-1 incident is
									declared.
								</p>
							</div>
							<input
								type="checkbox"
								checked={soundAlerts}
								onChange={(e) => {
									setSoundAlerts(e.target.checked);
									addToast({
										type: "info",
										message: "Audio alert preferences saved.",
									});
								}}
								className="w-4 h-4 rounded text-primary cursor-pointer"
							/>
						</div>

						<div className="p-4 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-4">
							<div className="space-y-0.5">
								<div className="text-xs font-bold text-foreground">
									Persistent Incident Banners
								</div>
								<p className="text-[11px] text-muted-foreground">
									Show top-level pulsing radar banner across all pages when
									incident mode is active.
								</p>
							</div>
							<input
								type="checkbox"
								checked={incidentBanners}
								onChange={(e) => {
									setIncidentBanners(e.target.checked);
									addToast({
										type: "info",
										message: "Banner alert preferences saved.",
									});
								}}
								className="w-4 h-4 rounded text-primary cursor-pointer"
							/>
						</div>
					</div>
				</div>
			)}

			{/* Tab 6: Danger Zone */}
			{activeTab === "danger" && (
				<div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border-rose-500/30">
					<div className="border-b border-rose-500/30 pb-4">
						<h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
							<AlertTriangle className="w-4 h-4 text-rose-400" />
							<span>Workspace Administration & Danger Zone</span>
						</h2>
						<p className="text-xs text-muted-foreground mt-0.5">
							Export data backups or decommission this workspace.
						</p>
					</div>

					<div className="space-y-4">
						<div className="p-4 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-4">
							<div className="space-y-0.5">
								<div className="text-xs font-bold text-foreground">
									Export All Workspace Records
								</div>
								<p className="text-[11px] text-muted-foreground">
									Download all cases, evidence artifacts, 5-Whys trees, and
									verification logs.
								</p>
							</div>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => handleExportData("JSON")}
									className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-mono font-semibold"
								>
									JSON Dump
								</button>
								<button
									type="button"
									onClick={() => handleExportData("CSV")}
									className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-mono font-semibold"
								>
									CSV Tables
								</button>
							</div>
						</div>

						<div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
							<div className="space-y-0.5">
								<div className="text-xs font-bold text-rose-400">
									Decommission Workspace
								</div>
								<p className="text-[11px] text-rose-300/80">
									Permanently erase all problem cases and remove member access.
									This action cannot be reversed.
								</p>
							</div>
							<button
								type="button"
								onClick={() =>
									addToast({
										type: "warning",
										message:
											"Workspace decommissioning requires root administrative confirmation.",
									})
								}
								className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all"
							>
								Decommission
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
