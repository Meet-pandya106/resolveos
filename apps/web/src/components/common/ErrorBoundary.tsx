import { AlertTriangle, RefreshCw } from "lucide-react";
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
		error: null,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("[ResolveOS ErrorBoundary] Caught error:", error, errorInfo);
	}

	public render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
					<div className="max-w-md w-full p-8 rounded-2xl bg-card border border-destructive/40 shadow-2xl space-y-4">
						<div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
							<AlertTriangle className="w-6 h-6" />
						</div>
						<h1 className="text-lg font-bold text-foreground">
							Something interrupted this view
						</h1>
						<p className="text-xs text-muted-foreground leading-relaxed">
							An unexpected client error occurred. Your pending changes remain
							securely stored in your local offline queue.
						</p>
						{this.state.error && (
							<div className="p-3 rounded-lg bg-muted/40 font-mono text-[11px] text-left text-muted-foreground break-all">
								{this.state.error.message}
							</div>
						)}
						<button
							onClick={() => window.location.reload()}
							className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center justify-center gap-2 mx-auto"
						>
							<RefreshCw className="w-3.5 h-3.5" />
							<span>Reload Application</span>
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
