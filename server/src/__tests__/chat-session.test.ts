import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────
const mockCheckFreeTierLimit = vi.fn();
const mockScreenInput = vi.fn();
const mockScreenOutput = vi.fn();
const mockBuildCrisisResponse = vi.fn();
const mockLogSafetyEvent = vi.fn();
const mockPersistMessages = vi.fn();
const mockGetLLMProvider = vi.fn();
const mockGenerateReply = vi.fn();
const mockRetrieveMemories = vi.fn();
const mockEnqueueMemoryJob = vi.fn().mockResolvedValue(undefined);
const mockAssemblePrompt = vi.fn();
const mockShouldShowBreakReminder = vi.fn();

// Async-iterable helper: yields the given deltas in order.
function streamOf(deltas: string[]): AsyncIterable<string> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const d of deltas) yield d;
    },
  };
}
function throwingStream(): AsyncIterable<string> {
  return {
    async *[Symbol.asyncIterator]() {
      throw new Error("stream boom");
      yield ""; // unreachable; keeps this a generator
    },
  };
}

// DB mock — phase-aware chain for companions / messages / safety_events
vi.mock("../db/src/index.js", () => {
  const usersTable = { __t: "users" };
  const companionsTable = { __t: "companions" };
  const messagesTable = { __t: "messages" };
  const safetyEventsTable = { __t: "safety_events", id: "id", userId: "user_id", createdAt: "created_at" };

  const companionRow = { id: "c1", userId: "u1", name: "Aurora", personaKey: "aurora", traits: { warmth: "warm", energy: "balanced", verbosity: "balanced" }, messageCount: 5 };
  const msgRows = Array.from({ length: 5 }, (_, i) => ({ id: `m${i}`, role: i % 2 === 0 ? "user" : "assistant", content: `msg ${i}`, createdAt: new Date(Date.now() - (5 - i) * 60000), turnId: `t${i}` }));

  const promiseLike = (result: unknown[]) => ({
    limit: () => Promise.resolve(result),
    orderBy: () => Promise.resolve(result),
    then: (onF: (v: unknown[]) => unknown, onR?: (e: unknown) => unknown) => Promise.resolve(result).then(onF, onR),
  });

  const rowsFor = (table: unknown): unknown[] => {
    if (table === companionsTable) return [companionRow];
    if (table === messagesTable) return msgRows;
    return []; // users, safety_events → empty (recentSafetyEvents = 0)
  };

  const selectChain = () => ({
    from: (table: unknown) => ({
      where: () => promiseLike(rowsFor(table)),
      orderBy: () => Promise.resolve(rowsFor(table)),
      limit: () => Promise.resolve(rowsFor(table)),
    }),
  });

  return {
    db: {
      select: vi.fn(() => selectChain()),
      insert: vi.fn(() => ({ values: () => Promise.resolve(undefined) })),
      transaction: vi.fn(async (cb: (t: unknown) => Promise<unknown>) => {
        const tx = {
          insert: () => ({ values: () => ({ returning: () => Promise.resolve([{ id: "ai-id", role: "assistant", content: "x" }]) }) }),
          update: () => ({ set: () => ({ where: () => Promise.resolve(undefined) }) }),
        };
        return await cb(tx);
      }),
    },
    usersTable, companionsTable, messagesTable, safetyEventsTable,
  };
});

vi.mock("../services/chat/free-tier.js", () => ({ checkFreeTierLimit: mockCheckFreeTierLimit }));
vi.mock("../services/moderation/moderation-engine.js", () => ({
  createModerator: () => ({ screenInput: mockScreenInput, screenOutput: mockScreenOutput }),
}));
vi.mock("../services/moderation/crisis.js", () => ({ buildCrisisResponse: mockBuildCrisisResponse }));
vi.mock("../services/llm/index.js", () => ({ getLLMProvider: mockGetLLMProvider }));
vi.mock("../services/memory.js", () => ({ retrieveMemories: mockRetrieveMemories, enqueueMemoryJob: mockEnqueueMemoryJob }));
vi.mock("../services/chat/safety-logging.js", () => ({ logSafetyEvent: mockLogSafetyEvent }));
const mockFetchExistingTurn = vi.fn().mockResolvedValue(null);
vi.mock("../services/chat/persistence.js", () => ({
  persistMessages: mockPersistMessages,
  fetchExistingTurn: mockFetchExistingTurn,
  isTurnUniqueViolation: (err: unknown) => err instanceof Error && err.message.includes("unique"),
}));
vi.mock("../services/chat/prompt-assembler.js", () => ({
  assemblePrompt: mockAssemblePrompt,
  GENERATION_FALLBACK_REPLY: "I lost my train of thought for a second — say that again?",
}));
vi.mock("../services/chat/break-reminder.js", () => ({ shouldShowBreakReminder: mockShouldShowBreakReminder }));
vi.mock("../lib/logger.js", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../lib/observability.js", () => ({ captureException: vi.fn() }));
vi.mock("../lib/metrics.js", () => ({ incrementMetric: vi.fn() }));

const FALLBACK = "I lost my train of thought for a second — say that again?";

// ── Fixtures ─────────────────────────────────────────────────────────
const defaultParams = () => ({
  userId: "u1", companionId: "c1", content: "Hello!",
  isPremium: true, isMinor: false,
  sessionStartedAt: new Date().toISOString(), providedTurnId: "t-turn-1",
});
const defaultMemories = () => [{ id: "mem1", content: "User likes hiking.", category: "preference", importance: 0.8 }];

const mockOnComplete = vi.fn();
const mockOnAbort = vi.fn();
const mockOnToken = vi.fn();
const callbacks = () => ({ onToken: mockOnToken, onComplete: mockOnComplete, onAbort: mockOnAbort });

/** Configure the LLM provider: streaming (deltas) or blocking (whole reply). */
function setStreamingProvider(deltas: string[]): void {
  mockGetLLMProvider.mockReturnValue({
    generateReply: mockGenerateReply,
    generateReplyStream: () => streamOf(deltas),
  });
}
function setBlockingProvider(reply: string): void {
  mockGenerateReply.mockResolvedValue(reply);
  mockGetLLMProvider.mockReturnValue({ generateReply: mockGenerateReply });
}

function setupHappyPath(): void {
  mockCheckFreeTierLimit.mockResolvedValue({ allowed: true, used: 5, limit: 30 });
  mockScreenInput.mockResolvedValue({ action: "allow", categories: [], escalated: false, layer: "L0-L2", policyVersion: "v" });
  mockScreenOutput.mockResolvedValue({ action: "allow", categories: [], escalated: false, layer: "L3", policyVersion: "v" });
  mockBuildCrisisResponse.mockReturnValue("You matter. Please reach out to 988.");
  setBlockingProvider("Hello! How can I help you today?");
  mockRetrieveMemories.mockResolvedValue(defaultMemories());
  mockAssemblePrompt.mockReturnValue({ systemPrompt: "You are Aurora.", messages: [{ role: "user", content: "Hello!" }] });
  mockPersistMessages.mockResolvedValue({ userMessage: { id: "um1", role: "user", content: "Hello!" }, aiMessage: { id: "am1", role: "assistant", content: "reply" } });
  mockShouldShowBreakReminder.mockReturnValue({ remind: false, reason: "" });
  mockFetchExistingTurn.mockReset();
  mockFetchExistingTurn.mockResolvedValue(null);
}

// ── Tests ────────────────────────────────────────────────────────────
describe("ChatSession", () => {
  beforeEach(() => {
    [mockCheckFreeTierLimit, mockScreenInput, mockScreenOutput, mockBuildCrisisResponse,
      mockLogSafetyEvent, mockPersistMessages, mockGetLLMProvider,
      mockGenerateReply, mockRetrieveMemories, mockEnqueueMemoryJob, mockAssemblePrompt,
      mockShouldShowBreakReminder, mockOnComplete, mockOnAbort, mockOnToken,
    ].forEach((m) => m.mockClear());
    setupHappyPath();
  });

  // ── Constructor ────────────────────────────────────────────────────
  it("generates a turnId when not provided", async () => {
    const { ChatSession } = await import("../services/chat/chat-session.js");
    const session = new ChatSession({ userId: "u1", companionId: "c1", content: "hi", isPremium: true, isMinor: false });
    expect(session.turnId).toBeTruthy();
    expect(typeof session.turnId).toBe("string");
  });

  it("uses the provided turnId", async () => {
    const { ChatSession } = await import("../services/chat/chat-session.js");
    expect(new ChatSession(defaultParams()).turnId).toBe("t-turn-1");
  });

  // ── Idempotency ────────────────────────────────────────────────────
  it("replays an already-committed turn without regenerating or re-moderating", async () => {
    mockFetchExistingTurn.mockResolvedValueOnce({
      userMessage: { id: "um-old", role: "user" },
      aiMessage: { id: "am-old", role: "assistant", content: "prior reply" },
    });
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
      aiMessage: expect.objectContaining({ id: "am-old" }),
    }));
    expect(mockScreenInput).not.toHaveBeenCalled();
    expect(mockGenerateReply).not.toHaveBeenCalled();
  });

  it("replays on a concurrent persist collision (same-turnId race)", async () => {
    mockFetchExistingTurn
      .mockResolvedValueOnce(null) // upfront check: not committed yet
      .mockResolvedValueOnce({ userMessage: { id: "um-r" }, aiMessage: { id: "am-r" } }); // after collision
    mockPersistMessages.mockRejectedValueOnce(new Error("duplicate key value violates unique constraint"));
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
      aiMessage: expect.objectContaining({ id: "am-r" }),
    }));
  });

  it("does not do an idempotency lookup when no turnId is provided", async () => {
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession({ ...defaultParams(), providedTurnId: undefined }).run(callbacks());
    expect(mockFetchExistingTurn).not.toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
  });

  // ── Happy path (blocking provider) ─────────────────────────────────
  it("blocking provider: sends the reply and completes", async () => {
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockOnToken).toHaveBeenCalledWith(expect.stringContaining("Hello! How can I help you today?"));
    expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({ turnId: "t-turn-1", memoriesUsed: true }));
    expect(mockOnAbort).not.toHaveBeenCalled();
    expect(mockEnqueueMemoryJob).toHaveBeenCalled();
  });

  // ── Streaming: sentence-gated release ──────────────────────────────
  it("streaming provider: releases one onToken per approved sentence", async () => {
    setStreamingProvider(["I hear you completely. ", "That sounds really hard. "]);
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockScreenOutput).toHaveBeenCalledTimes(2);
    expect(mockOnToken).toHaveBeenCalledTimes(2);
    expect(mockOnToken).toHaveBeenNthCalledWith(1, expect.stringContaining("I hear you completely."));
    expect(mockOnToken).toHaveBeenNthCalledWith(2, expect.stringContaining("That sounds really hard."));
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it("streaming: an unsafe sentence is NEVER forwarded (fail-closed gating)", async () => {
    // First sentence clears L3, second is blocked → only the first reaches the client.
    mockScreenOutput
      .mockResolvedValueOnce({ action: "allow", categories: [], escalated: false, layer: "L3", policyVersion: "v" })
      .mockResolvedValueOnce({ action: "block", categories: [{ category: "hate", score: 0.9 }], escalated: false, layer: "L3", policyVersion: "v" });
    setStreamingProvider(["A perfectly nice opening line. ", "An unsafe second sentence here. "]);
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());

    // The unsafe sentence was withheld: only the first sentence was ever sent.
    expect(mockOnToken).toHaveBeenCalledTimes(1);
    expect(mockOnToken).toHaveBeenCalledWith(expect.stringContaining("A perfectly nice opening line."));
    expect(mockOnToken).not.toHaveBeenCalledWith(expect.stringContaining("unsafe second sentence"));
    // Safety event logged, memory NOT enqueued on a blocked output.
    expect(mockLogSafetyEvent).toHaveBeenCalledWith("u1", "output_blocked", expect.any(Object));
    expect(mockEnqueueMemoryJob).not.toHaveBeenCalled();
    // The safe prefix is persisted; the turn still completes coherently.
    expect(mockPersistMessages).toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it("streaming: a blocked FIRST sentence sends nothing and persists the safe fallback", async () => {
    mockScreenOutput.mockResolvedValue({ action: "block", categories: [], escalated: false, layer: "L3", policyVersion: "v" });
    setStreamingProvider(["This whole thing is unsafe. "]);
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockOnToken).not.toHaveBeenCalled();
    expect(mockLogSafetyEvent).toHaveBeenCalledWith("u1", "output_blocked", expect.any(Object));
    expect(mockEnqueueMemoryJob).not.toHaveBeenCalled();
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it("streaming: a stream error degrades to the safe fallback line", async () => {
    mockGetLLMProvider.mockReturnValue({ generateReply: mockGenerateReply, generateReplyStream: () => throwingStream() });
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockOnToken).toHaveBeenCalledWith(FALLBACK);
    expect(mockOnComplete).toHaveBeenCalled();
  });

  // ── Free-tier gate ─────────────────────────────────────────────────
  it("free-tier blocked calls onAbort with free_limit_reached", async () => {
    mockCheckFreeTierLimit.mockResolvedValue({ allowed: false, used: 30, limit: 30 });
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession({ ...defaultParams(), isPremium: false }).run(callbacks());
    expect(mockOnAbort).toHaveBeenCalledWith("free_limit_reached");
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  // ── D-2: crisis is never swallowed by the paywall ──────────────────
  it("D-2: a free-tier-exhausted user in crisis is routed to support, not dropped by the cap", async () => {
    // Real runL0 flags the explicit crisis phrase; the free-tier gate must never see this turn.
    mockCheckFreeTierLimit.mockResolvedValue({ allowed: false, used: 30, limit: 30 });
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession({ ...defaultParams(), isPremium: false, content: "I want to kill myself." }).run(callbacks());

    // Crisis handled: logged critical, the 988 reply delivered, resources returned — and NOT aborted.
    expect(mockLogSafetyEvent).toHaveBeenCalledWith("u1", "crisis_detected", expect.objectContaining({ severity: "critical" }));
    expect(mockOnToken).toHaveBeenCalledWith("You matter. Please reach out to 988.", { crisis: true });
    expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
      crisisResources: expect.arrayContaining([expect.stringContaining("988")]),
    }));
    expect(mockOnAbort).not.toHaveBeenCalled();

    // The crux: the crisis pre-filter short-circuits BEFORE the paywall and full moderation ever run.
    expect(mockCheckFreeTierLimit).not.toHaveBeenCalled();
    expect(mockScreenInput).not.toHaveBeenCalled();
    expect(mockGenerateReply).not.toHaveBeenCalled();
  });

  it("D-2: a free-tier-exhausted user sending ordinary content is still capped (paywall intact)", async () => {
    // Non-crisis content must still hit the free-tier gate — the pre-filter must not open the paywall.
    mockCheckFreeTierLimit.mockResolvedValue({ allowed: false, used: 30, limit: 30 });
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession({ ...defaultParams(), isPremium: false, content: "what's a good recipe for dinner?" }).run(callbacks());
    expect(mockCheckFreeTierLimit).toHaveBeenCalled();
    expect(mockOnAbort).toHaveBeenCalledWith("free_limit_reached");
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  // ── Input moderation ──────────────────────────────────────────────
  it("input block (injection layer) logs injection_detected and aborts", async () => {
    mockScreenInput.mockResolvedValue({ action: "block", categories: [{ category: "injection", score: 0.95 }], escalated: false, layer: "L1", policyVersion: "v", reason: "Injection blocked by prompt-guard" });
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockLogSafetyEvent).toHaveBeenCalledWith("u1", "injection_detected", expect.any(Object));
    // Policy: the violation is logged (above) + the user warned (onAbort below); no auto-suspension,
    // and no session drop for non-zero-tolerance categories (third arg undefined).
    expect(mockOnAbort).toHaveBeenCalledWith("input_blocked", "Injection blocked by prompt-guard", undefined);
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it("D-3: a sexual/minors block is logged CRITICAL and drops the session (zero-tolerance)", async () => {
    mockScreenInput.mockResolvedValue({ action: "block", categories: [{ category: "sexual/minors", score: 0.9 }], escalated: false, layer: "L2", policyVersion: "v", reason: "Zero-tolerance" });
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockLogSafetyEvent).toHaveBeenCalledWith("u1", "input_blocked", expect.objectContaining({ severity: "critical" }));
    expect(mockOnAbort).toHaveBeenCalledWith("input_blocked", "Zero-tolerance", { terminateSession: true });
  });

  it("an ordinary content block stays warning severity with no session drop", async () => {
    mockScreenInput.mockResolvedValue({ action: "block", categories: [{ category: "hate", score: 0.8 }], escalated: false, layer: "L2", policyVersion: "v", reason: "Blocked" });
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockLogSafetyEvent).toHaveBeenCalledWith("u1", "input_blocked", expect.objectContaining({ severity: "warning" }));
    expect(mockOnAbort).toHaveBeenCalledWith("input_blocked", "Blocked", undefined);
  });

  it("D-3: a sexual/minors OUTPUT block is logged critical (model-fault: no session drop)", async () => {
    mockScreenOutput.mockResolvedValue({ action: "block", categories: [{ category: "sexual/minors", score: 0.9 }], escalated: false, layer: "L3", policyVersion: "v" });
    setStreamingProvider(["A sentence that fails L3. "]);
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockLogSafetyEvent).toHaveBeenCalledWith("u1", "output_blocked", expect.objectContaining({ severity: "critical" }));
    expect(mockOnComplete).toHaveBeenCalled(); // turn completes with the safe fallback; no drop
  });

  it("input crisis returns crisis resources and does not generate", async () => {
    mockScreenInput.mockResolvedValue({ action: "crisis", categories: [], escalated: false, layer: "L2", policyVersion: "v", crisisResources: ["988 Suicide & Crisis Lifeline: Call or text 988 (US)"] });
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockLogSafetyEvent).toHaveBeenCalledWith("u1", "crisis_detected", expect.objectContaining({ severity: "critical" }));
    expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({
      crisisResources: expect.arrayContaining([expect.stringContaining("988")]),
      memoriesUsed: false,
    }));
    expect(mockGenerateReply).not.toHaveBeenCalled();
  });

  // ── Generation fallback (blocking provider) ────────────────────────
  it("blocking provider generation failure falls back to the safe line", async () => {
    mockGenerateReply.mockRejectedValue(new Error("LLM timeout"));
    mockGetLLMProvider.mockReturnValue({ generateReply: mockGenerateReply });
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockOnToken).toHaveBeenCalledWith(FALLBACK);
    expect(mockOnComplete).toHaveBeenCalled();
  });

  // ── Abort ──────────────────────────────────────────────────────────
  it("abort() before run returns early with no callbacks", async () => {
    const { ChatSession } = await import("../services/chat/chat-session.js");
    const session = new ChatSession(defaultParams());
    session.abort();
    await session.run(callbacks());
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(mockOnAbort).not.toHaveBeenCalled();
  });

  it("abort during generation prevents persist", async () => {
    const { ChatSession } = await import("../services/chat/chat-session.js");
    const session = new ChatSession(defaultParams());
    mockGenerateReply.mockImplementation(async () => { session.abort(); return "Should not persist"; });
    mockGetLLMProvider.mockReturnValue({ generateReply: mockGenerateReply });
    await session.run(callbacks());
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(mockPersistMessages).not.toHaveBeenCalled();
  });

  // ── Result shape ───────────────────────────────────────────────────
  it("memoriesUsed is false when no memories retrieved", async () => {
    mockRetrieveMemories.mockResolvedValue([]);
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({ memoriesUsed: false }));
  });

  it("includes breakReminder when due", async () => {
    mockShouldShowBreakReminder.mockReturnValue({ remind: true, reason: "Time for a break!" });
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockOnComplete).toHaveBeenCalledWith(expect.objectContaining({ breakReminder: "Time for a break!" }));
  });

  it("unexpected error calls onAbort internal_error", async () => {
    mockScreenInput.mockRejectedValue(new Error("Unexpected crash"));
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run(callbacks());
    expect(mockOnAbort).toHaveBeenCalledWith("internal_error", "Unexpected crash");
  });

  it("works when no onToken callback is provided", async () => {
    const { ChatSession } = await import("../services/chat/chat-session.js");
    await new ChatSession(defaultParams()).run({ onComplete: mockOnComplete, onAbort: mockOnAbort });
    expect(mockOnComplete).toHaveBeenCalled();
  });
});
