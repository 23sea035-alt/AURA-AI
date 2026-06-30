const CRISIS_PATTERNS = [
  { pattern: /\b(kill myself|end my life)\b/i, category: "self-harm/crisis" },
  { pattern: /\b(suicide|suicidal|self-harm|self harm)\b/i, category: "self-harm/crisis" },
  { pattern: /\b(cutting|hurt myself|not worth living|better off (dead|without))\b/i, category: "self-harm/crisis" },
  { pattern: /\b(no reason to live|want to end it|can't go on)\b/i, category: "self-harm/crisis" },
];

const HARD_BLOCK_PATTERNS = [
  { pattern: /\b(sexualize|sexualizing)\s+(a|the|my)\s+(minor|child|underage)\b/i, category: "sexual/minors" },
  { pattern: /\b(how\s+to\s+)?(build|make)\s+(a\s+)?(bomb|weapon|explosive)\b/i, category: "violence/weapons" },
  { pattern: /\b(mass shooting|school shooting)\s+(guide|plan|how to)\b/i, category: "violence/weapons" },
  { pattern: /\bstrip\s+search\b/i, category: "sexual/minors" },
  { pattern: /\bdecode\s+(this\s+)?base64\b/i, category: "injection" },
];

function normalizeEncoding(text: string): string {
  return text
    .replace(/[а-яА-Я]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x410 + 0x41))
    .replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/4/g, "a")
    .replace(/5/g, "s").replace(/7/g, "t").replace(/@/g, "a").replace(/\$/g, "s");
}

export interface L0Result {
  action: "allow" | "block" | "crisis";
  reason?: string;
  category?: string;
  matchedPattern?: string;
}

export function runL0(text: string): L0Result {
  const normalized = normalizeEncoding(text);

  for (const hp of HARD_BLOCK_PATTERNS) {
    if (hp.pattern.test(text) || hp.pattern.test(normalized)) {
      return { action: "block", reason: `Hard-block: ${hp.category}`, category: hp.category, matchedPattern: hp.pattern.source };
    }
  }

  for (const cp of CRISIS_PATTERNS) {
    if (cp.pattern.test(text) || cp.pattern.test(normalized)) {
      return { action: "crisis", reason: `Crisis pattern matched: ${cp.category}`, category: cp.category, matchedPattern: cp.pattern.source };
    }
  }

  return { action: "allow" };
}
