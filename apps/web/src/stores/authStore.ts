/**
 * Auth & Workspace Zustand Store
 */

import { User, Workspace } from "@resolveos/shared";
import { create } from "zustand";
import { APIClient } from "../lib/api.js";

interface AuthState {
	user: User | null;
	workspaces: Workspace[];
	activeWorkspaceId: string | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (
		user: User,
		token: string,
		workspaces?: Workspace[],
		defaultWorkspaceId?: string,
	) => void;
	logout: () => void;
	setActiveWorkspace: (workspaceId: string) => void;
	fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
	user: null,
	workspaces: [],
	activeWorkspaceId: localStorage.getItem("resolveos_active_workspace") || null,
	isAuthenticated: !!localStorage.getItem("resolveos_token"),
	isLoading: true,

	login: (user, token, workspaces = [], defaultWorkspaceId) => {
		APIClient.setToken(token);
		const activeWs = defaultWorkspaceId || workspaces[0]?.id || null;
		if (activeWs) {
			localStorage.setItem("resolveos_active_workspace", activeWs);
		}
		set({
			user,
			workspaces,
			activeWorkspaceId: activeWs,
			isAuthenticated: true,
			isLoading: false,
		});
	},

	logout: async () => {
		try {
			await APIClient.post("/auth/logout");
		} catch {
			// Ignore network errors on logout
		}
		APIClient.setToken(null);
		localStorage.removeItem("resolveos_active_workspace");
		set({
			user: null,
			workspaces: [],
			activeWorkspaceId: null,
			isAuthenticated: false,
			isLoading: false,
		});
		window.location.href = "/login";
	},

	setActiveWorkspace: (workspaceId: string) => {
		localStorage.setItem("resolveos_active_workspace", workspaceId);
		set({ activeWorkspaceId: workspaceId });
	},

	fetchProfile: async () => {
		const token = APIClient.getToken();
		if (!token) {
			set({ isLoading: false, isAuthenticated: false });
			return;
		}

		try {
			const data = await APIClient.get("/auth/me");
			const savedActiveWs = localStorage.getItem("resolveos_active_workspace");
			const activeWs =
				data.workspaces &&
				data.workspaces.some((w: any) => w.id === savedActiveWs)
					? savedActiveWs
					: data.workspaces?.[0]?.id || null;

			if (activeWs) {
				localStorage.setItem("resolveos_active_workspace", activeWs);
			}

			set({
				user: data.user,
				workspaces: data.workspaces || [],
				activeWorkspaceId: activeWs,
				isAuthenticated: true,
				isLoading: false,
			});
		} catch {
			set({ user: null, isAuthenticated: false, isLoading: false });
		}
	},
}));
