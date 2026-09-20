import { APIKey, AuditEvent, UserSession } from "@resolveos/shared";
import {
	Check,
	Copy,
	History,
	Key,
	Laptop,
	PlusCircle,
	ShieldCheck,
	Smartphone,
	Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { APIClient } from "../../lib/api.js";
import { useAuthStore } from "../../stores/authStore.js";
import { useUIStore } from "../../stores/uiStore.js";

export const SecurityCenterView: React.FC = () => {
	const { user, activeWorkspaceId } = useAuthStore();
	const { addToast } = useUIStore();

	const [sessions, setSessions] = useState<
		(UserSession & { isCurrent?: boolean })[]
	>([]);
	const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
	const [apiKeysList, setApiKeysList] = useState<APIKey[]>([]);
	const [newKeyName, setNewKeyName] = useState("");
	const [createdSecret, setCreatedSecret] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const loadSecurityData = async () => {
		try {
			const [sessData, auditData] = await Promise.all([
				APIClient.get<any[]>("/auth/sessions"),
				APIClient.get<AuditEvent[]>("/privacy/audit-logs"),
			]);
			setSessions(sessData || []);
			setAuditLogs(auditData || []);

			if (activeWorkspaceId) {
				const keysData = await APIClient.get<APIKey[]>(
					`/workspaces/${activeWorkspaceId}/api-keys`,
				).catch(() => []);
				setApiKeysList(keysData || []);
			}
		} catch (err) {
			console.error("Failed to load security telemetry:", err);
		}
	};

	useEffect(() => {
		loadSecurityData();
	}, [activeWorkspaceId]);

	const handleRevokeSession = async (sessionId: string) => {
		try {
			await APIClient.delete(`/auth/sessions/${sessionId}`);
			addToast({ type: "success", message: "Session revoked." });
			loadSecurityData();
		} catch (err: any) {
			addToast({ type: "error", message: err.message });
		}
	};

	const handleCreateAPIKey = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newKeyName.trim() || !activeWorkspaceId) return;
		try {
			const res = await APIClient.post(
				`/workspaces/${activeWorkspaceId}/api-keys`,
				{
					name: newKeyName,
					scopes: ["read", "write"],
				},
			);
			setCreatedSecret(res.secretKey);
			setNewKeyName("");
			addToast({
				type: "success",
				message: "API key generated. Store it safely.",
			});
			loadSecurityData();
		} catch (err: any) {
			addToast({ type: "error", message: err.message });
		}
	};

	const handleCopySecret = () => {
		if (createdSecret) {
			navigator.clipboard.writeText(createdSecret);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<div className="max-w-5xl mx-auto space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">
					Security & Access Governance
				</h1>
				<p className="text-xs text-muted-foreground mt-1">
					Active session rotation, cryptographic key management, and
					tamper-resistant audit logs.
				</p>
			</div>

			{/* Active Sessions */}
			<div className="p-6 rounded-xl bg-card border border-border space-y-4">
				<h2 className="text-base font-bold flex items-center gap-2">
					<Laptop className="w-4 h-4 text-primary" />
					<span>Active Authenticated Sessions</span>
				</h2>

				<div className="space-y-3">
					{sessions.map((s) => (
						<div
							key={s.id}
							className="p-3.5 rounded-lg bg-muted/20 border border-border flex items-center justify-between"
						>
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
									<Laptop className="w-4 h-4" />
								</div>
								<div className="space-y-0.5">
									<div className="flex items-center gap-2">
										<span className="text-xs font-semibold">{s.userAgent}</span>
										{s.isCurrent && (
											<span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
												CURRENT DEVICE
											</span>
										)}
									</div>
									<p className="text-[11px] font-mono text-muted-foreground">
										IP: {s.ipAddress} • Last active:{" "}
										{new Date(s.lastActiveAt).toLocaleTimeString()}
									</p>
								</div>
							</div>

							{!s.isCurrent && (
								<button
									onClick={() => handleRevokeSession(s.id)}
									className="px-2.5 py-1 rounded text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
								>
									Revoke
								</button>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Workspace API Keys */}
			<div className="p-6 rounded-xl bg-card border border-border space-y-4">
				<h2 className="text-base font-bold flex items-center gap-2">
					<Key className="w-4 h-4 text-primary" />
					<span>Workspace Scoped API Keys</span>
				</h2>

				{createdSecret && (
					<div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
						<span className="text-xs font-bold text-emerald-400">
							Save Your API Key Secret Now:
						</span>
						<div className="flex items-center gap-2">
							<input
								type="text"
								readOnly
								value={createdSecret}
								className="flex-1 font-mono text-xs px-3 py-1.5 rounded bg-background border border-emerald-500/40 text-foreground"
							/>
							<button
								onClick={handleCopySecret}
								className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5"
							>
								{copied ? (
									<Check className="w-3.5 h-3.5" />
								) : (
									<Copy className="w-3.5 h-3.5" />
								)}
								<span>{copied ? "Copied" : "Copy"}</span>
							</button>
						</div>
					</div>
				)}

				<form onSubmit={handleCreateAPIKey} className="flex gap-3">
					<input
						type="text"
						required
						placeholder="Key name (e.g. CI/CD Automated Runner)..."
						value={newKeyName}
						onChange={(e) => setNewKeyName(e.target.value)}
						className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-foreground outline-none"
					/>
					<button
						type="submit"
						className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
					>
						Create API Key
					</button>
				</form>

				<div className="space-y-2 pt-2">
					{apiKeysList.map((k) => (
						<div
							key={k.id}
							className="p-3 rounded-lg bg-muted/20 border border-border flex items-center justify-between text-xs font-mono"
						>
							<span className="font-semibold text-foreground">{k.name}</span>
							<span className="text-muted-foreground">{k.keyFingerprint}</span>
						</div>
					))}
				</div>
			</div>

			{/* Security Audit Events */}
			<div className="p-6 rounded-xl bg-card border border-border space-y-4">
				<h2 className="text-base font-bold flex items-center gap-2">
					<History className="w-4 h-4 text-primary" />
					<span>Security Audit Trail</span>
				</h2>

				<div className="space-y-2">
					{auditLogs.map((log) => (
						<div
							key={log.id}
							className="p-3 rounded-lg bg-muted/20 border border-border/60 flex items-center justify-between text-xs"
						>
							<div className="flex items-center gap-2">
								<span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
									{log.action}
								</span>
								<span className="text-muted-foreground">
									IP: {log.ipAddress}
								</span>
							</div>
							<span className="font-mono text-[10px] text-muted-foreground">
								{new Date(log.createdAt).toLocaleString()}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
