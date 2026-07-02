import PQueue from "p-queue";
import { TURN_QUEUE_CONCURRENCY, INWORLD_CONCURRENT_LIMIT } from "@aura/shared";

// Higher priority number = runs first in p-queue's max-heap.
const PRIORITY_PREMIUM = 1;
const PRIORITY_FREE = 0;
// Below every live turn (including free users): background work only runs on capacity a live reply
// isn't using.
const PRIORITY_BACKGROUND = -1;

const turnQueue = new PQueue({ concurrency: TURN_QUEUE_CONCURRENCY });
const ttsQueue = new PQueue({ concurrency: INWORLD_CONCURRENT_LIMIT });

export function enqueueTurn<T>(fn: () => Promise<T>, opts: { isPremium: boolean }): Promise<T> {
  const priority = opts.isPremium ? PRIORITY_PREMIUM : PRIORITY_FREE;
  return turnQueue.add(fn, { priority }) as Promise<T>;
}

// Premium voice calls get TTS-lane priority too, so a paying user's audio never waits behind
// free users' synthesis when the Inworld concurrency budget is saturated. Defaults to free.
export function enqueueTts<T>(fn: () => Promise<T>, opts?: { isPremium?: boolean }): Promise<T> {
  const priority = opts?.isPremium ? PRIORITY_PREMIUM : PRIORITY_FREE;
  return ttsQueue.add(fn, { priority }) as Promise<T>;
}

// Memory consolidation (async, latency-insensitive) shares the live turn queue's Groq 70B budget but
// sits below every live turn, so during peaks it yields the whole budget to live generation and only
// consumes otherwise-idle capacity. The memory worker is sequential, so at most one background call
// is ever queued — it can't flood the lane.
export function enqueueBackground<T>(fn: () => Promise<T>): Promise<T> {
  return turnQueue.add(fn, { priority: PRIORITY_BACKGROUND }) as Promise<T>;
}

export function turnQueueSize(): number {
  return turnQueue.size + turnQueue.pending;
}

export function ttsQueueSize(): number {
  return ttsQueue.size + ttsQueue.pending;
}
