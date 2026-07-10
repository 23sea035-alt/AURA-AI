// Deterministic loudness survey of the audition clips (EBU R128 via ffmpeg) — the input to the
// per-persona playback-gain map (docs/specs/voice-casting-guide.md §Output volume).
//
//   pnpm voices:levels                # measure server/audition-clips/*.mp3
//   pnpm voices:levels -- --target -18   # override the target loudness (LUFS)
//
// Per clip: integrated loudness (I, LUFS — perceptual program loudness) and true peak (dBTP).
// Suggested gain = min(target − I, headroom), where headroom = −1.0 dBTP − TP keeps the boosted
// signal clear of clipping. Default target: the median I of the measured clips. The suggestion is
// an input to the owner's decision, not the decision.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLIP_DIR = path.resolve(fileURLToPath(new URL("../../audition-clips/", import.meta.url)));
const PERSONAS = [
  "aurora", "orion", "lyra", "sage", "amara", "eli",
  "selene", "soren", "juno", "thea", "cyrus", "wren",
];
const TRUE_PEAK_CEILING_DBTP = -1.0;

const targetFlag = process.argv.indexOf("--target");
const targetOverride = targetFlag > -1 ? Number(process.argv[targetFlag + 1]) : null;

function measure(file) {
  const res = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  if (res.error) throw res.error; // ffmpeg not installed / not on PATH
  const text = `${res.stdout ?? ""}\n${res.stderr ?? ""}`; // the summary lands on stderr
  const integrated = text.match(/Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+) LUFS/);
  const peak = text.match(/True peak:\s*\n\s*Peak:\s*(-?[\d.]+) dBFS/);
  if (!integrated || !peak) throw new Error(`could not parse ebur128 summary for ${file}`);
  return { lufs: Number(integrated[1]), truePeak: Number(peak[1]) };
}

const files = readdirSync(CLIP_DIR).filter((f) => f.endsWith(".mp3")).sort();
if (files.length === 0) {
  console.error(`No clips in ${CLIP_DIR} — run pnpm voices:audition first.`);
  process.exit(1);
}

const rows = files.map((f) => {
  const persona = f.split("-")[0];
  const { lufs, truePeak } = measure(path.join(CLIP_DIR, f));
  return { file: f, persona, lufs, truePeak, headroom: TRUE_PEAK_CEILING_DBTP - truePeak };
});

const sorted = [...rows].sort((a, b) => a.lufs - b.lufs);
const mid = [...rows].map((r) => r.lufs).sort((a, b) => a - b);
const median = mid.length % 2 ? mid[(mid.length - 1) / 2] : (mid[mid.length / 2 - 1] + mid[mid.length / 2]) / 2;
const target = targetOverride ?? median;

console.log(`\nTarget: ${target.toFixed(1)} LUFS (${targetOverride != null ? "--target override" : "median of measured clips"})`);
console.log(`True-peak ceiling: ${TRUE_PEAK_CEILING_DBTP.toFixed(1)} dBTP\n`);
console.table(
  sorted.map((r) => {
    const wanted = target - r.lufs;
    const gain = Math.min(wanted, r.headroom);
    return {
      persona: r.persona,
      clip: r.file,
      "I (LUFS)": r.lufs.toFixed(1),
      "TP (dBTP)": r.truePeak.toFixed(1),
      "gap to target (dB)": wanted.toFixed(1),
      "max safe boost (dB)": r.headroom.toFixed(1),
      "suggested gain (dB)": gain > 0.25 ? gain.toFixed(1) : "0",
      "peak-limited?": wanted > r.headroom + 0.05 ? "YES" : "",
    };
  }),
);

const present = new Set(rows.map((r) => r.persona));
const missing = PERSONAS.filter((p) => !present.has(p));
if (missing.length > 0) {
  console.log(`Missing personas (${missing.length}/12): ${missing.join(", ")}`);
  console.log("The median target is unreliable until all 12 are measured.");
}
