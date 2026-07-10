// E-2: the mailer is a SEAM — no sending domain exists yet, so the active implementation must
// refuse loudly (log + return false), never silently pretend the email went out.
import { describe, it, expect, vi } from "vitest";

const mockWarn = vi.fn();
vi.mock("../lib/logger.js", () => ({ logger: { info: vi.fn(), warn: mockWarn, error: vi.fn() } }));

describe("mailer (noop seam)", () => {
  it("returns false and logs a warning — the caller must know nothing was sent", async () => {
    const { getMailer } = await import("../lib/mailer.js");
    const sent = await getMailer().send({ to: "user@example.com", subject: "Your export", text: "hi" });
    expect(sent).toBe(false);
    expect(mockWarn).toHaveBeenCalled();
    // The warning must not include the message body (could carry sensitive content).
    const logged = JSON.stringify(mockWarn.mock.calls);
    expect(logged).not.toContain('"text"');
  });
});
