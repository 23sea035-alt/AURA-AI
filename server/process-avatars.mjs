import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import https from "node:https";
import sharp from "sharp";

const SRC = resolve("png");
const OUT = resolve("client/assets/avatars/batch1");

// Map generated files to named portraits (chronological order = prompt order)
const FILES = [
  { src: "1783043983e707.png", name: "batch1-01", desc: "Restyle of Aurora — warm woman, deep brown skin, long braids, wine-red wrap" },
  { src: "178304408797b4.png", name: "batch1-02", desc: "New person — bald Black man, warm smile, deep skin, cream henley" },
  { src: "1783044159d6a9.png", name: "batch1-03", desc: "New person — androgynous, short curly salt-and-pepper hair, tan skin, terracotta top" },
  { src: "178304421034b5.png", name: "batch1-04", desc: "Restyle of Orion — olive skin, short fade with grey temples, oatmeal sweater" },
  { src: "178304426816b4.png", name: "batch1-05", desc: "New person — feminine, long auburn waves, fair skin with freckles, cream scoop-neck + wine shawl" },
  { src: "1783044321c1f5.png", name: "batch1-06", desc: "New person — masculine, warm brown skin, close natural hair, rust henley" },
];

const RUBRIC =
  "You are grading an AI-generated companion avatar for a mobile app. The target style is a warm, " +
  "FLAT ILLUSTRATION (not photorealistic, not 3D, not anime) of a friendly adult, head-and-shoulders, " +
  "shown in a CIRCLE crop (corners are cut off), on a plain warm background.\n\n" +
  "Score the attached image 1–5 on each dimension (5 = excellent). Then give a total, a PASS/FAIL, and " +
  "a short bullet list of concrete fixes.\n\n" +
  "1. STYLE MATCH — warm flat-illustration look (not photo/3D/anime); consistent line weight and palette.\n" +
  "2. CIRCLE-SAFE FRAMING — face centered with margin; nothing important in the corners; upper-body only.\n" +
  "3. WARMTH / APPEAL — reads as a warm, friendly companion; not cold, stiff, or uncanny.\n" +
  "4. SKIN-TONE RENDERING — skin looks natural and warmly lit; darker tones are NOT flat, grey, or muddy.\n" +
  "5. ANATOMY & ARTIFACTS — no extra/warped fingers, distorted features, weird eyes/teeth, or AI glitches.\n" +
  "6. DISTINCTNESS — reads as its own clear character (unless it's an intentional restyle of an existing one).\n" +
  "7. BACKGROUND — plain and consistent with a warm avatar background.\n\n" +
  "GATES (each is a hard PASS/FAIL, independent of the scores):\n" +
  "- ADULT: the person clearly reads as an adult (~25+). If they look youthful, childlike, or age-ambiguous -> FAIL.\n" +
  "- APPROPRIATE: fully clothed, tasteful, non-sexualized -> otherwise FAIL.\n\n" +
  "Final verdict = PASS only if BOTH gates PASS and EVERY dimension is 4 or 5. Otherwise FAIL, and list " +
  "exactly what to change.\n\n" +
  "Respond with JSON: {\"verdict\":\"PASS\"|\"FAIL\",\"adultGate\":\"PASS\"|\"FAIL\",\"appropriateGate\":\"PASS\"|\"FAIL\"," +
  "\"scores\":{\"style_match\":1-5,\"circle_safe\":1-5,\"warmth\":1-5,\"skin_tone\":1-5,\"anatomy\":1-5,\"distinctness\":1-5,\"background\":1-5}," +
  "\"fixes\":[\"...\"]}";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseGradeResponse(content) {
  // Try JSON match first
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  // Try to extract scores from text
  const extract = (label) => {
    const m = content.match(new RegExp(label + '.*?([1-5])', 'i'));
    return m ? parseInt(m[1]) : null;
  };
  const verdict = content.includes("PASS") && !content.includes("FAIL") ? "PASS" : "FAIL";
  const adultGate = content.includes("Adult Gate: PASS") || content.includes("Adult.*PASS") ? "PASS" : "?";
  return {
    verdict,
    adultGate: content.match(/Adult[:\s]+Gate[:\s]*(PASS|FAIL)/i)?.[1] || (content.includes("adult") && !content.includes("FAIL") ? "PASS" : "?"),
    appropriateGate: content.match(/Appropriate[:\s]+Gate[:\s]*(PASS|FAIL)/i)?.[1] || (content.includes("appropriate") && !content.includes("FAIL") ? "PASS" : "?"),
    scores: {
      style_match: extract("STYLE MATCH") || extract("style_match") || extract("1\\.") || "?",
      circle_safe: extract("CIRCLE-SAFE") || extract("circle_safe") || extract("2\\.") || "?",
      warmth: extract("WARMTH") || extract("warmth") || extract("3\\.") || "?",
      skin_tone: extract("SKIN-TONE") || extract("skin_tone") || extract("4\\.") || "?",
      anatomy: extract("ANATOMY") || extract("anatomy") || extract("5\\.") || "?",
      distinctness: extract("DISTINCTNESS") || extract("distinctness") || extract("6\\.") || "?",
      background: extract("BACKGROUND") || extract("background") || extract("7\\.") || "?",
    },
    fixes: content.match(/- [^\\n]+/g)?.slice(0, 5) || [],
  };
}

async function gradeImage(portrait, imageB64, apiKey, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await gradeOnce(portrait, imageB64, apiKey);
      if (!result.error) return result;
      if (attempt < retries) {
        console.log("  Retry " + (attempt + 1) + "...");
        await sleep(3000);
      } else {
        return result;
      }
    } catch (e) {
      if (attempt < retries) {
        console.log("  Retry " + (attempt + 1) + "...");
        await sleep(3000);
      } else {
        return { error: e.message };
      }
    }
  }
}

function gradeOnce(portrait, imageB64, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "meta/llama-3.2-90b-vision-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: RUBRIC + "\n\nPortrait: " + portrait.desc + "\n\nIMPORTANT: Respond with ONLY a JSON object. No markdown, no explanation, just the JSON." },
            { type: "image_url", image_url: { url: "data:image/png;base64," + imageB64 } },
          ],
        },
      ],
      max_tokens: 1000,
    });
    const req = https.request({
      hostname: "integrate.api.nvidia.com",
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      timeout: 30000,
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const j = JSON.parse(data);
          if (j.error) resolve({ error: j.error.message });
          else {
            const content = j.choices?.[0]?.message?.content || "";
            resolve(parseGradeResponse(content));
          }
        } catch (e) {
          resolve({ error: "Parse failed: " + data.slice(0, 300) });
        }
      });
    });
    req.on("error", (e) => resolve({ error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ error: "timeout" }); });
    req.write(body);
    req.end();
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const nvidiaKey = (process.env.NVIDIA_API_KEY || "").trim();
  const useGrader = nvidiaKey && nvidiaKey.length > 10;

  const results = [];

  for (const f of FILES) {
    const srcPath = resolve(SRC, f.src);
    const outPath = resolve(OUT, f.name + ".png");

    // Resize to 1254x1254
    const img = sharp(srcPath);
    const resized = await img.resize(1254, 1254, { fit: "cover", position: "center" }).png().toBuffer();
    writeFileSync(outPath, resized);
    console.log(f.name + ".png — " + f.desc.slice(0, 50) + "... — " + resized.length + " bytes");

    if (useGrader) {
      console.log("  Grading...");
      const b64 = readFileSync(srcPath).toString("base64");
      const grade = await gradeImage(f, b64, nvidiaKey);
      console.log("  Result:", grade.verdict || grade.error?.slice(0, 100));
      results.push({ ...f, grade });
    } else {
      results.push({ ...f, grade: { verdict: "PENDING", note: "NVIDIA_API_KEY needed for grading" } });
    }
  }

  // Write notes.md
  let notes = "# Batch 1 — Companion Avatars\n\n";
  notes += "Generated: 2026-07-03\n";
  notes += "Tool: Nano Banana (Gemini)\n";
  notes += "Grading: NVIDIA llama-3.2-90b-vision-instruct\n\n";
  notes += "## Coverage\n\n";
  notes += "- Restyles: 2 (01: Aurora restyle, 04: Orion restyle)\n";
  notes += "- New faces: 4 (02, 03, 05, 06)\n";
  notes += "- Masc/Fem/Andro: 3/2/1\n";
  notes += "- Skin tones: deep (01, 02), olive (04), tan (03), fair (05), brown (06)\n";
  notes += "- Bald: 1 (02) | Long hair: 2 (01, 05)\n\n";
  notes += "## Per-Portrait Results\n\n";

  for (const r of results) {
    notes += "### " + r.name + ".png\n\n";
    notes += "**Description:** " + r.desc + "\n\n";
    if (r.grade.error) {
      notes += "**Grading error:** " + r.grade.error + "\n\n";
    } else if (r.grade.verdict === "PENDING") {
      notes += "**Grading:** PENDING — set NVIDIA_API_KEY and re-run\n\n";
    } else {
      notes += "**Verdict:** " + r.grade.verdict + "\n\n";
      notes += "| Gate | Result |\n|------|--------|\n";
      notes += "| Adult | " + (r.grade.adultGate || "?") + " |\n";
      notes += "| Appropriate | " + (r.grade.appropriateGate || "?") + " |\n\n";
      notes += "| Dimension | Score |\n|-----------|-------|\n";
      const s = r.grade.scores || {};
      notes += "| Style match | " + (s.style_match ?? "?") + " |\n";
      notes += "| Circle-safe framing | " + (s.circle_safe ?? "?") + " |\n";
      notes += "| Warmth / Appeal | " + (s.warmth ?? "?") + " |\n";
      notes += "| Skin-tone rendering | " + (s.skin_tone ?? "?") + " |\n";
      notes += "| Anatomy & Artifacts | " + (s.anatomy ?? "?") + " |\n";
      notes += "| Distinctness | " + (s.distinctness ?? "?") + " |\n";
      notes += "| Background | " + (s.background ?? "?") + " |\n\n";
      if (r.grade.fixes?.length) {
        notes += "**Fixes needed:**\n";
        for (const fx of r.grade.fixes) notes += "- " + fx + "\n";
        notes += "\n";
      }
    }
    notes += "---\n\n";
  }

  writeFileSync(resolve(OUT, "notes.md"), notes);
  console.log("\n✓ notes.md written");
  console.log("✓ All files in " + OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
