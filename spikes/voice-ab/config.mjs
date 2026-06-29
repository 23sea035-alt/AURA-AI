// Voice A/B harness — editable config.
// Mirrors §5a of docs/planning/realtime-voice-call-research.md (persona → voice config).
// SPIKE DRAFT: voiceId values marked "TODO" must be filled with real provider voice IDs
// before that provider will run (OpenAI presets are already filled). See README.md.

const round = (n) => Math.round(n * 100) / 100;

// ── Layer 1: base voice identity per persona ────────────────────────────────
// brief = casting guidance; pick a voice in each provider's library that matches it,
// then paste its ID/name here. OpenAI uses fixed preset voice names (already set).
export const PERSONA_VOICE = {
  aurora: {
    brief: "warm feminine, soft-spoken, slightly breathy, unhurried, soothing; mid-low pitch",
    voiceId: { openai: "shimmer", elevenlabs: "TODO", cartesia: "TODO", inworld: "TODO" },
  },
  orion: {
    brief: "grounded masculine, clear & steady, warm but direct; mid pitch, measured pace",
    voiceId: { openai: "onyx", elevenlabs: "TODO", cartesia: "TODO", inworld: "TODO" },
  },
  lyra: {
    brief: "bright, lively, curious; light & expressive; mid-high pitch, quicker cadence",
    voiceId: { openai: "nova", elevenlabs: "TODO", cartesia: "TODO", inworld: "TODO" },
  },
};

// Representative trait set per persona for this test (matches each persona's character).
// Trait axes: warmth(reserved|warm|affectionate) energy(calm|balanced|playful) verbosity(...).
export const PERSONA_TRAITS = {
  aurora: { warmth: "warm", energy: "calm", verbosity: "balanced" },
  orion: { warmth: "warm", energy: "balanced", verbosity: "balanced" },
  lyra: { warmth: "warm", energy: "playful", verbosity: "balanced" },
};

// ── Layer 2: traits → provider-neutral delivery intent ──────────────────────
// verbosity is a TEXT-length trait (handled in generation) — it does NOT touch voice.
const WARMTH = { reserved: 0.25, warm: 0.6, affectionate: 0.9 };
const ENERGY = { calm: 0.2, balanced: 0.5, playful: 0.85 };

export function deliveryIntent(traits) {
  const energy = ENERGY[traits.energy] ?? 0.5;
  return {
    warmth: WARMTH[traits.warmth] ?? 0.6,
    energy,
    pace: round(0.85 + energy * 0.25), // calm → slower, playful → quicker
  };
}

// Crisis override: pinned calm config regardless of persona/traits (steady & warm, never playful).
export const CRISIS_DELIVERY = { warmth: 0.7, energy: 0.15, pace: 0.9 };

// ── Layer 3: resolve intent to each provider's control surface ──────────────
export function resolveElevenLabs(d) {
  return {
    stability: round(0.65 - d.energy * 0.25), // calmer = steadier; livelier = more variation
    similarity_boost: 0.75,
    style: round(0.2 + ((d.warmth + d.energy) / 2) * 0.5),
    use_speaker_boost: true,
    speed: round(d.pace), // EL accepts 0.7–1.2
  };
}

// gpt-4o-mini-tts: delivery is a natural-language instruction, NOT sliders.
export function resolveOpenAIInstruction(d) {
  const warmth = d.warmth > 0.7 ? "tender and affectionate" : d.warmth > 0.4 ? "warm and caring" : "calm and attentive";
  const energy = d.energy > 0.6 ? "lively, with a light, playful lift" : d.energy < 0.35 ? "slow, steady, and grounding" : "an even, natural energy";
  return `Speak in a ${warmth} tone with ${energy}. Sound human and present, never robotic.`;
}

// ── Sample lines (fixed across every run; em-dash-free per product copy rule) ──
// Cover the registers a companion hits. The crisis line uses CRISIS_DELIVERY.
export const LINES = [
  { id: "greeting", register: "greeting", crisis: false,
    text: "Hey, it's good to hear your voice. How's your day been?" },
  { id: "warm", register: "warm reflection", crisis: false,
    text: "That sounds like it's been weighing on you. I'm here, so take your time." },
  { id: "playful", register: "playful", crisis: false,
    text: "Okay, okay, bold choice. I kind of love it. Tell me everything." },
  { id: "deflection", register: "boundary / deflection", crisis: false,
    text: "I really care about you, but I'm not the right one for medical advice. Let's get you to someone who is." },
  { id: "crisis", register: "crisis (calm delivery)", crisis: true,
    text: "I'm really glad you told me. You matter. Please reach the 988 Suicide and Crisis Lifeline, call or text 988, right now. I'll stay with you." },
];
