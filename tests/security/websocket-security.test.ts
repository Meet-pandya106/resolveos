import EventEmitter from "events";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { server } from "../../apps/api/src/index.js";
import { RealtimeService } from "../../apps/api/src/services/RealtimeService.js";
import {
	closeDatabase,
	initDatabase,
} from "../../packages/database/src/index.js";

describe("Security: WebSocket Real-Time Tenant Isolation & Authorization", () => {
	let userAId: string;
	let userBId: string;
	let workspaceAId: string;
	let workspaceBId: string;
	let caseAId: string;

	beforeAll(async () => {
		initDatabase(":memory:");
		await server.ready();

		// Register User A
		const regA = await server.inject({
			method: "POST",
			url: "/api/auth/register",
			payload: {
				email: "alice.ws@test.local",
				password: "Password#1234A",
				name: "Alice WS",
			},
		});
		const bodyA = JSON.parse(regA.payload);
		userAId = bodyA.user.id;
		workspaceAId = bodyA.defaultWorkspaceId;

		// Register User B
		const regB = await server.inject({
			method: "POST",
			url: "/api/auth/register",
			payload: {
				email: "bob.ws@test.local",
				password: "Password#1234B",
				name: "Bob WS",
			},
		});
		const bodyB = JSON.parse(regB.payload);
		userBId = bodyB.user.id;
		workspaceBId = bodyB.defaultWorkspaceId;

		// Alice creates Case in Workspace A
		const caseRes = await server.inject({
			method: "POST",
			url: `/api/workspaces/${workspaceAId}/cases`,
			headers: { authorization: `Bearer ${bodyA.token}` },
			payload: { title: "Confidential Incidents", severity: "HIGH" },
		});
		caseAId = JSON.parse(caseRes.payload).id;
	});

	afterAll(async () => {
		await server.close();
		closeDatabase();
	});

	function createMockWebSocket() {
		const ws = new EventEmitter() as any;
		ws.readyState = 1; // WebSocket.OPEN
		ws.sentMessages = [] as string[];
		ws.send = (data: string) => {
			ws.sentMessages.push(data);
		};
		ws.close = () => {
			ws.emit("close");
		};
		return ws;
	}

	it("blocks unauthorized client from subscribing to another tenant workspace events", async () => {
		const mockWs = createMockWebSocket();
		// User B connects
		await RealtimeService.registerClient(mockWs, userBId);

		// User B attempts to subscribe to Workspace A
		mockWs.emit(
			"message",
			Buffer.from(
				JSON.stringify({
					type: "SUBSCRIBE_WORKSPACE",
					workspaceId: workspaceAId,
				}),
			),
		);

		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(mockWs.sentMessages.length).toBeGreaterThan(0);
		const lastMsg = JSON.parse(
			mockWs.sentMessages[mockWs.sentMessages.length - 1],
		);
		expect(lastMsg.type).toBe("ERROR");
		expect(lastMsg.message).toContain(
			"Unauthorized workspace subscription rejected",
		);
	});

	it("blocks unauthorized client from focusing on another tenant case", async () => {
		const mockWs = createMockWebSocket();
		// User B connects
		await RealtimeService.registerClient(mockWs, userBId);

		// User B attempts to focus Case A
		mockWs.emit(
			"message",
			Buffer.from(
				JSON.stringify({
					type: "FOCUS_CASE",
					caseId: caseAId,
				}),
			),
		);

		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(mockWs.sentMessages.length).toBeGreaterThan(0);
		const lastMsg = JSON.parse(
			mockWs.sentMessages[mockWs.sentMessages.length - 1],
		);
		expect(lastMsg.type).toBe("ERROR");
		expect(lastMsg.message).toContain(
			"Unauthorized case subscription rejected",
		);
	});

	it("permits authorized client to subscribe to their own workspace events", async () => {
		const mockWs = createMockWebSocket();
		// User A connects
		await RealtimeService.registerClient(mockWs, userAId);

		// User A subscribes to Workspace A
		mockWs.emit(
			"message",
			Buffer.from(
				JSON.stringify({
					type: "SUBSCRIBE_WORKSPACE",
					workspaceId: workspaceAId,
				}),
			),
		);

		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(mockWs.sentMessages.length).toBeGreaterThan(0);
		const lastMsg = JSON.parse(
			mockWs.sentMessages[mockWs.sentMessages.length - 1],
		);
		expect(lastMsg.type).toBe("SUBSCRIBED");
		expect(lastMsg.workspaceId).toBe(workspaceAId);
	});

	it("issues short-lived one-time WebSocket tickets and burns them on consumption (Rule 57)", async () => {
		// User A requests a WS ticket
		const ticket = RealtimeService.issueTicket(userAId);
		expect(ticket.ticket).toHaveLength(64);
		expect(ticket.expiresInSeconds).toBe(60);

		// First consumption succeeds and returns the user ID
		const consumedUserId = RealtimeService.consumeTicket(ticket.ticket);
		expect(consumedUserId).toBe(userAId);

		// Replay attempt immediately fails because ticket is burned on use
		const replayUserId = RealtimeService.consumeTicket(ticket.ticket);
		expect(replayUserId).toBeNull();
	});
});

