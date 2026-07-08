import type { Moderator, InputVerdict, OutputVerdict, UserContext } from "./moderator.js";
import { runL0 } from "./deterministic.js";
import { runL1 } from "./prompt-guard.js";
import { runL2Input, runL3Output } from "./openai-omni.js";
import type { OmniResult } from "./openai-omni.js";
import type { PromptGuardResult } from "./prompt-guard.js";
import { adjudicate, runOutputFallback } from "./safeguard.js";
import { SAFE_FALLBACK_REPLY } from "@aura/shared";
import type { LLMProvider } from "../llm/index.js";
import { getLLMProvider } from "../llm/index.js";
import { createTaskSpecificProvider } from "../llm/model-selector.js";
import { logger } from "../../lib/logger.js";
import { incrementMetric } from "../../lib/metrics.js";

const POLICY_VERSION = "2026-06-23-001";

/**
 * Degraded runs must be loud: a 429ing omni key otherwise routes EVERY turn through the
 * safeguard fallback with zero log evidence (observed live 2026-07-07 — prod could run
 * degraded for weeks unnoticed). WARN once per turn + a counter on /api/admin/metrics.
 */
function noteDegraded(layer: "L2" | "L3", error: string | undefined): void {
  incrementMetric(`moderation.${layer.toLowerCase()}_degraded`);
  logger.warn({ layer, error }, "Omni moderation degraded — safeguard fallback in use");
}

export class ModerationEngine implements Moderator {
  private inputGuardProvider?: LLMProvider;
  private outputGuardProvider?: LLMProvider;

  /** Get the Groq API key from the environment (bypassing full env validation). */
  private getGroqApiKey(): string | undefined {
    return process.env.GROQ_API_KEY;
  }

  private getInputGuardProvider(): LLMProvider | undefined {
    if (!this.inputGuardProvider) {
      const key = this.getGroqApiKey();
      if (key) {
        try {
          this.inputGuardProvider = createTaskSpecificProvider("moderate-input", key);
        } catch {
          // fall through to undefined
        }
      }
    }
    return this.inputGuardProvider;
  }

  private getOutputGuardProvider(): LLMProvider | undefined {
    if (!this.outputGuardProvider) {
      const key = this.getGroqApiKey();
      if (key) {
        try {
          this.outputGuardProvider = createTaskSpecificProvider("moderate-output", key);
        } catch {
          // fall through to undefined
        }
      }
    }
    return this.outputGuardProvider;
  }
  async screenInput(text: string, ctx: UserContext): Promise<InputVerdict> {
    try {
      const l0 = runL0(text);
      if (l0.action === "block") {
        return {
          action: "block", categories: [{ category: l0.category ?? "unknown", score: 1 }],
          escalated: false, layer: "L0", policyVersion: POLICY_VERSION, reason: l0.reason,
        };
      }
      if (l0.action === "crisis") {
        return {
          action: "crisis", categories: [{ category: l0.category ?? "self-harm/crisis", score: 1 }],
          escalated: false, layer: "L0", policyVersion: POLICY_VERSION,
          crisisResources: ["988 Suicide & Crisis Lifeline: Call or text 988 (US)"],
          reason: l0.reason,
        };
      }

      let l1Category: string | undefined;
      let l2Categories: string[] = [];

      const [l1Result, l2Result] = await Promise.all([
        runL1(text, this.getInputGuardProvider()).catch((): PromptGuardResult => ({ injectionProb: 1, action: "block", error: "L1 failed" })),
        runL2Input(text).catch((): OmniResult => ({ flagged: true, categories: [], error: "L2 failed" })),
      ]);

      if (l1Result.action === "block") {
        return {
          action: "block", categories: [{ category: "injection", score: l1Result.injectionProb }],
          escalated: false, layer: "L1", policyVersion: POLICY_VERSION, reason: "Injection blocked by prompt-guard",
        };
      }
      l1Category = l1Result.action === "escalate" ? "injection" : undefined;

      if (l2Result.error) {
        noteDegraded("L2", l2Result.error);
        const fallback = await adjudicate(text, l1Category, [], this.getOutputGuardProvider(), "L2_degraded_fallback").catch(() => null);
        if (!fallback || fallback.action === "block") {
          return {
            action: "block", categories: [],
            escalated: false, layer: "safeguard", policyVersion: POLICY_VERSION,
            reason: `L2 degraded (${l2Result.error}) — safeguard fallback: ${fallback?.reason ?? "unavailable"}`,
          };
        }
        if (fallback.action === "crisis") {
          return {
            action: "crisis", categories: [],
            escalated: false, layer: "safeguard", policyVersion: POLICY_VERSION,
            crisisResources: ["988 Suicide & Crisis Lifeline: Call or text 988 (US)"],
          };
        }
        return {
          action: "allow", categories: [],
          escalated: true, layer: "safeguard", policyVersion: POLICY_VERSION,
          reason: `L2 degraded (${l2Result.error}) — cleared by safeguard fallback`,
        };
      }

      const criticalCat = l2Result.categories.find(c => c.category === "sexual/minors");
      if (criticalCat) {
        return {
          action: "block", categories: l2Result.categories,
          escalated: false, layer: "L2", policyVersion: POLICY_VERSION, reason: "Zero-tolerance: sexual/minors",
        };
      }

      const crisisCat = l2Result.categories.find(c => c.category.startsWith("self-harm"));
      if (crisisCat) {
        return {
          action: "crisis", categories: l2Result.categories,
          escalated: false, layer: "L2", policyVersion: POLICY_VERSION,
          crisisResources: ["988 Suicide & Crisis Lifeline: Call or text 988 (US)"],
        };
      }

      l2Categories = l2Result.categories.map(c => c.category);

      if (l2Result.flagged || l1Result.action === "escalate") {
        if (ctx.recentSafetyEvents && ctx.recentSafetyEvents > 0) {
          return {
            action: "block", categories: l2Result.categories,
            escalated: false, layer: "L2", policyVersion: POLICY_VERSION,
            reason: "Blocked: recent safety events + escalated classification",
          };
        }

        const safeguardVerdict = await adjudicate(text, l1Category, l2Categories, this.getOutputGuardProvider(), "L2_escalated_adjudicate");
        return {
          action: safeguardVerdict.action,
          categories: l2Result.categories,
          escalated: true,
          layer: "safeguard",
          policyVersion: POLICY_VERSION,
          reason: safeguardVerdict.reason,
        };
      }

      return {
        action: "allow", categories: [], escalated: false, layer: "L0-L2",
        policyVersion: POLICY_VERSION,
      };
    } catch (err) {
      return {
        action: "block", categories: [], escalated: false,
        layer: "fail-closed-safety-net", policyVersion: POLICY_VERSION,
        reason: `Unexpected moderation error: ${err instanceof Error ? err.message : "unknown"}`,
      };
    }
  }

  async screenOutput(text: string): Promise<OutputVerdict> {
    try {
      const l3 = await runL3Output(text);
      if (l3.error) {
        noteDegraded("L3", l3.error);
        const fallback = await runOutputFallback(text, this.getOutputGuardProvider(), "L3_degraded_fallback").catch(() => null);
        if (fallback?.action === "allow") {
          return {
            action: "allow", categories: [], escalated: true,
            layer: "safeguard", policyVersion: POLICY_VERSION,
            reason: `L3 degraded (${l3.error}) — cleared by output safeguard fallback`,
          };
        }
        return {
          action: "block", categories: [], escalated: false,
          layer: "safeguard", policyVersion: POLICY_VERSION,
          safeFallback: SAFE_FALLBACK_REPLY,
          reason: `L3 degraded (${l3.error}) — safeguard fallback: ${fallback?.reason ?? "unavailable"}`,
        };
      }
      if (l3.flagged) {
        return {
          action: "block", categories: l3.categories, escalated: false,
          layer: "L3", policyVersion: POLICY_VERSION,
          safeFallback: SAFE_FALLBACK_REPLY,
        };
      }
      return {
        action: "allow", categories: [], escalated: false,
        layer: "L3", policyVersion: POLICY_VERSION,
      };
    } catch (err) {
      return {
        action: "block", categories: [], escalated: false,
        layer: "fail-closed-safety-net", policyVersion: POLICY_VERSION,
        safeFallback: SAFE_FALLBACK_REPLY,
        reason: `Unexpected output moderation error: ${err instanceof Error ? err.message : "unknown"}`,
      };
    }
  }
}

let instance: ModerationEngine | null = null;

export function createModerator(): ModerationEngine {
  if (!instance) instance = new ModerationEngine();
  return instance;
}
