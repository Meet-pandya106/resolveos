/**
 * ResolveOS Backend API Server Root
 */

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { closeDatabase, getDatabase } from "@resolveos/database";
import crypto from "crypto";
import dotenv from "dotenv";
import fastify from "fastify";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { aiRoutes } from "./routes/ai.js";
import { authRoutes } from "./routes/auth.js";
import { caseRoutes } from "./routes/cases.js";
import { privacyRoutes } from "./routes/privacy.js";
import { searchRoutes } from "./routes/search.js";
import { syncRoutes } from "./routes/sync.js";
import { workspaceRoutes } from "./routes/workspaces.js";
import { RealtimeService } from "./services/RealtimeService.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pkgVersion = "1.0.0";
try {
	const pkgPath = path.resolve(__dirname, "../package.json");
	if (fs.existsSync(pkgPath)) {
		pkgVersion = JSON.parse(fs.readFileSync(pkgPath, "utf8")).version || "1.0.0";
	}
} catch {
	pkgVersion = "1.0.0";
}

const port = parseInt(process.env.PORT || "4000", 10);
const host = process.env.HOST || "0.0.0.0";

// Production configuration guard (Rules 7, 18, 19, 122)
if (process.env.NODE_ENV === "production") {
	const forbiddenDefaults = ["default", "resolveos_secret", "password", "secret", "changeme", "example", "demo", "test"];
	if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
		throw new Error("[FATAL SECURITY CONFIGURATION] In production mode, JWT_SECRET must be set to a secure unique random value of at least 32 characters.");
	}
	for (const pattern of forbiddenDefaults) {
		if (process.env.JWT_SECRET.toLowerCase().includes(pattern)) {
			throw new Error(`[FATAL SECURITY CONFIGURATION] In production mode, JWT_SECRET cannot contain predictable default substring '${pattern}'.`);
		}
	}

	if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
		throw new Error("[FATAL SECURITY CONFIGURATION] In production mode, SESSION_SECRET must be set to a secure unique random value of at least 32 characters.");
	}
	for (const pattern of forbiddenDefaults) {
		if (process.env.SESSION_SECRET.toLowerCase().includes(pattern)) {
			throw new Error(`[FATAL SECURITY CONFIGURATION] In production mode, SESSION_SECRET cannot contain predictable default substring '${pattern}'.`);
		}
	}

	const dbUrl = process.env.DATABASE_URL || process.env.RESOLVEOS_DATABASE_URL;
	if (!dbUrl || (!dbUrl.startsWith("postgres:") && !dbUrl.startsWith("postgresql:") && !dbUrl.startsWith("postgresql+"))) {
		throw new Error("[FATAL DATABASE CONFIGURATION] In production mode, a valid PostgreSQL DATABASE_URL is strictly required. Memory/JSON fallback is strictly prohibited.");
	}
}

const jwtSecret =
	process.env.JWT_SECRET ||
	"resolveos_default_development_jwt_secret_key_32_chars";
const sessionSecret =
	process.env.SESSION_SECRET ||
	"resolveos_default_development_session_secret_key_32_chars";

// Initialize Database
getDatabase();

const server = fastify({
	logger: process.env.NODE_ENV !== "test" ? { level: "info" } : false,
	genReqId: () => crypto.randomUUID(),
	trustProxy: true,
	bodyLimit: 10 * 1024 * 1024, // 10MB JSON request body limit
});

// 1. Security Headers (Helmet + Nonce-based / Restrictive CSP)
await server.register(helmet, {
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'"],
			styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
			fontSrc: ["'self'", "https://fonts.gstatic.com"],
			imgSrc: ["'self'", "data:", "blob:", "https:"],
			connectSrc: ["'self'", "ws:", "wss:"],
		},
	},
	crossOriginResourcePolicy: { policy: "same-site" },
});

// 2. CORS (Explicit Origin Validation)
const allowedOrigins = (
	process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:4000"
)
	.split(",")
	.map((s) => s.trim());

await server.register(cors, {
	origin: (origin, cb) => {
		// Allow server-to-server or non-browser requests
		if (!origin) return cb(null, true);
		if (
			allowedOrigins.includes(origin) ||
			process.env.NODE_ENV === "development"
		) {
			return cb(null, true);
		}
		return cb(new Error("CORS request rejected: Origin not allowed"), false);
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

// 3. Global & Per-Route Rate Limiting
await server.register(rateLimit, {
	max: parseInt(process.env.RATE_LIMIT_MAX || "120", 10),
	timeWindow: parseInt(process.env.RATE_LIMIT_TIME_WINDOW_MS || "60000", 10),
	errorResponseBuilder: (request, context) => ({
		statusCode: 429,
		error: "Too Many Requests",
		message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
		requestId: request.id,
	}),
});

// 4. Cookies & JWT
await server.register(cookie, {
	secret: sessionSecret,
});

await server.register(jwt, {
	secret: jwtSecret,
	sign: { expiresIn: "7d" },
});

// 5. Authenticated WebSocket Realtime Engine
await server.register(websocket);

server.register(async (fastify) => {
	fastify.get("/ws", { websocket: true }, async (connection, req) => {
		try {
			const url = new URL(req.url || "", "http://localhost");
			const ticket = url.searchParams.get("ticket");
			let userId: string | null = null;

			if (ticket) {
				// Rule 57: Validate and burn one-time short-lived WebSocket ticket
				userId = RealtimeService.consumeTicket(ticket);
				if (!userId) {
					connection.close(4401, "Invalid, expired, or already used WebSocket ticket");
					return;
				}
			} else {
				// Fallback to HttpOnly cookie, Sec-WebSocket-Protocol header, or non-production token
				let token = (req as any).cookies?.token;
				if (!token && req.headers["sec-websocket-protocol"]) {
					token = req.headers["sec-websocket-protocol"];
				}
				if (!token && process.env.NODE_ENV !== "production") {
					token = url.searchParams.get("token") || undefined;
				}

				if (!token) {
					connection.close(
						4401,
						"Authentication ticket or token required for WebSocket connection",
					);
					return;
				}

				const decoded = (await (server as any).jwt.verify(token)) as {
					id: string;
					email: string;
				};
				userId = decoded.id;
			}

			const workspaceId = url.searchParams.get("workspaceId") || undefined;
			await RealtimeService.registerClient(connection, userId, workspaceId);
		} catch (err) {
			connection.close(4401, "Invalid authentication credential");
		}
	});
});

// 6. Register Application REST Routes
await server.register(authRoutes, { prefix: "/api/auth" });
await server.register(workspaceRoutes, { prefix: "/api/workspaces" });
await server.register(caseRoutes, { prefix: "/api/workspaces" });
await server.register(searchRoutes, { prefix: "/api/search" });
await server.register(privacyRoutes, { prefix: "/api/privacy" });
await server.register(aiRoutes, { prefix: "/api/ai" });
await server.register(syncRoutes, { prefix: "/api/workspaces" });

// 7. Health & Readiness Observability Endpoints
server.get("/health", async (request, reply) => {
	return reply.send({
		status: "ok",
		version: pkgVersion,
		timestamp: new Date().toISOString(),
	});
});

server.get("/readiness", async (request, reply) => {
	try {
		const db = getDatabase();
		if (db.isPostgres()) {
			const pool = (db as any).getPool();
			await pool.query("SELECT 1;");
		}
		return reply.status(200).send({
			status: "ready",
			database: "connected",
			engine: db.isPostgres() ? "postgresql" : "memory",
			timestamp: new Date().toISOString(),
		});
	} catch (err: any) {
		request.log.error({ err }, "Readiness check failed: Database unreachable");
		return reply.status(503).send({
			status: "not_ready",
			database: "disconnected",
			error: err.message,
			timestamp: new Date().toISOString(),
		});
	}
});

// 8. Global Centralized Error Boundary
server.setErrorHandler((error: any, request, reply) => {
	request.log.error(
		{ err: error, reqId: request.id },
		"Unhandled Request Error",
	);

	if (error.name === "ZodError") {
		return reply.status(400).send({
			statusCode: 400,
			error: "Bad Request",
			message: "Validation failed for request parameters or body.",
			details: error.errors,
			requestId: request.id,
		});
	}

	const statusCode = error.statusCode || 500;
	const message =
		statusCode >= 500 && process.env.NODE_ENV === "production"
			? "An internal server error occurred. Please contact system support."
			: error.message;

	return reply.status(statusCode).send({
		statusCode,
		error: error.name || "InternalServerError",
		message,
		requestId: request.id,
	});
});

// Graceful Shutdown Handlers (Rule 38, 84)
let isShuttingDown = false;
export async function gracefulShutdown(signal: string) {
	if (isShuttingDown) return;
	isShuttingDown = true;
	console.log(`[RESOLVEOS] Received ${signal}. Starting graceful shutdown...`);

	try {
		await server.close();
		console.log("[RESOLVEOS] Fastify server closed.");
		closeDatabase();
		console.log("[RESOLVEOS] Database connections closed.");
		process.exit(0);
	} catch (err) {
		console.error("[RESOLVEOS] Error during graceful shutdown:", err);
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== "test") {
	process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
	process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

// Start Server
export async function startServer() {
	try {
		await server.listen({ port, host });
		console.log(`[RESOLVEOS] API server running on http://${host}:${port}`);
		return server;
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== "test") {
	startServer();
}

export { server };
