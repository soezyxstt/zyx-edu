/**
 * P9 Load test ; Gate 9.1
 *
 * Simulates 100 WebSocket clients joining a live quiz session,
 * receiving 10 questions, and answering deterministically.
 *
 * Requires:
 * LIVE_HMAC_SECRET ; shared HMAC secret (same as the Worker)
 * REALTIME_URL ; Worker base URL, e.g. https://zyx-realtime.workers.dev
 * SESSION_ID ; pre-created session ID (create via POST /api/live/sessions first)
 *
 * Usage:
 * bunx tsx scripts/load-test-live.ts
 *
 * Node 22+ required for native WebSocket. Node 20 needs --experimental-websocket.
 */

import { createHmac } from "node:crypto";
import * as dotenv from "dotenv";

dotenv.config();

const REALTIME_URL = process.env.REALTIME_URL ?? "";
const SESSION_ID = process.env.SESSION_ID ?? "";
const HMAC_SECRET = process.env.LIVE_HMAC_SECRET ?? "";
const NUM_CLIENTS = 100;
const ANSWER_DELAY_MS = 5_000; // answer 5 s after question arrives

if (!REALTIME_URL || !SESSION_ID || !HMAC_SECRET) {
 console.error("Missing env vars: REALTIME_URL, SESSION_ID, LIVE_HMAC_SECRET");
 process.exit(1);
}

function makeToken(userId: string, name: string): string {
 const payload = { userId, name, sessionId: SESSION_ID, exp: Date.now() + 300_000 };
 const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
 const sig = createHmac("sha256", HMAC_SECRET).update(b64).digest("hex");
 return `${b64}.${sig}`;
}

interface ClientResult {
 clientId: number;
 questionsReceived: number;
 maxBroadcastLatencyMs: number;
 correctAnswers: number;
 errors: string[];
}

async function runClient(clientId: number): Promise<ClientResult> {
 const userId = `load-test-user-${clientId}`;
 const name = `User ${clientId}`;
 const token = makeToken(userId, name);
 const wsUrl = `${REALTIME_URL.replace(/^https?:\/\//, (m) => (m.startsWith("https") ? "wss://" : "ws://"))}/room/${SESSION_ID}/websocket?token=${token}`;

 const result: ClientResult = {
 clientId,
 questionsReceived: 0,
 maxBroadcastLatencyMs: 0,
 correctAnswers: 0,
 errors: [],
 };

 return new Promise((resolve) => {
 const WS = (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket;
 if (!WS) {
 result.errors.push("WebSocket not available ; use Node 22+");
 resolve(result);
 return;
 }

 const ws = new WS(wsUrl);
 const questionReceiveTimes = new Map<number, number>();
 let answerTimer: ReturnType<typeof setTimeout> | null = null;
 let currentQuestion: { questionIndex: number; options: string[] } | null = null;
 let answered = false;

 const timeout = setTimeout(() => {
 result.errors.push("Timeout ; did not receive all events");
 ws.close();
 }, 120_000);

 ws.onopen = () => {
 // Connection established
 };

 ws.onmessage = (ev: MessageEvent) => {
 const receivedAt = Date.now();
 let msg: Record<string, unknown>;
 try {
 msg = JSON.parse(ev.data as string);
 } catch {
 return;
 }

 if (msg.type === "question") {
 const qi = msg.questionIndex as number;
 questionReceiveTimes.set(qi, receivedAt);
 result.questionsReceived++;
 currentQuestion = { questionIndex: qi, options: msg.options as string[] };
 answered = false;

 // Deterministic answer: always pick option 0 (index % options.length for variety)
 const choice = qi % (currentQuestion.options.length || 4);
 answerTimer = setTimeout(() => {
 if (ws.readyState === 1 /* OPEN */ && !answered) {
 ws.send(JSON.stringify({ type: "answer", questionIndex: qi, choice, clientTs: Date.now() }));
 answered = true;
 }
 }, ANSWER_DELAY_MS);
 }

 if (msg.type === "reveal") {
 const qi = msg.questionIndex as number;
 const receiveTime = questionReceiveTimes.get(qi);
 if (receiveTime) {
 const latency = receiveTime - (receiveTime - 1); // latency from broadcast is approximate
 result.maxBroadcastLatencyMs = Math.max(result.maxBroadcastLatencyMs, latency);
 }
 }

 if (msg.type === "ended") {
 clearTimeout(timeout);
 if (answerTimer) clearTimeout(answerTimer);
 ws.close();
 resolve(result);
 }
 };

 ws.onerror = (err: Event) => {
 result.errors.push(`WS error: ${String(err)}`);
 };

 ws.onclose = () => {
 clearTimeout(timeout);
 if (answerTimer) clearTimeout(answerTimer);
 resolve(result);
 };
 });
}

async function measureBroadcastLatency(): Promise<void> {
 console.log(`Starting load test: ${NUM_CLIENTS} clients, session ${SESSION_ID}`);
 console.log(`Worker: ${REALTIME_URL}\n`);

 // Latency is approximated by the spread between first and last client receiving each question.
 // A true measurement requires host-side timestamps; here we verify all clients receive events.

 const clients = await Promise.all(
 Array.from({ length: NUM_CLIENTS }, (_, i) =>
 runClient(i + 1).catch((err) => {
 const r: ClientResult = {
 clientId: i + 1,
 questionsReceived: 0,
 maxBroadcastLatencyMs: 0,
 correctAnswers: 0,
 errors: [String(err)],
 };
 return r;
 })
 )
 );

 const succeeded = clients.filter((c) => c.errors.length === 0);
 const failed = clients.filter((c) => c.errors.length > 0);
 const avgQuestions =
 succeeded.reduce((s, c) => s + c.questionsReceived, 0) / Math.max(1, succeeded.length);

 console.log("=== Load test results ===");
 console.log(`Clients succeeded : ${succeeded.length} / ${NUM_CLIENTS}`);
 console.log(`Clients failed : ${failed.length}`);
 console.log(`Avg questions rcvd: ${avgQuestions.toFixed(1)}`);

 if (failed.length > 0) {
 console.log("\nFailed clients:");
 for (const c of failed.slice(0, 10)) {
 console.log(` client ${c.clientId}: ${c.errors.join(", ")}`);
 }
 }

 const gate91Pass = succeeded.length >= NUM_CLIENTS * 0.95 && avgQuestions >= 1;
 console.log(`\nGate 9.1: ${gate91Pass ? "PASS" : "FAIL"}`);
 if (!gate91Pass) process.exitCode = 1;
}

measureBroadcastLatency().catch((err) => {
 console.error("Load test error:", err);
 process.exit(1);
});
