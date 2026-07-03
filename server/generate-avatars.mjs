import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import https from "node:https";
import sharp from "sharp";

const OUT_DIR = resolve("client/assets/avatars/batch1");

// ── Portrait definitions (6 total, covering all requirements) ─────

const PORTRAITS = [
  {
    id: "batch1-01",
    desc: "Restyle of Aurora — warm woman, deep brown skin, long braids, wine-red wrap",
    coverage: { restyle: true, feminine: true, deepSkin: true, longHair: true },
    prompt:
      "A warm flat-illustration companion portrait in the exact same style as the reference. " +
      "This is a restyle of Aurora: keep her face (same bone structure, warm eyes, gentle chin-on-hand pose, slight forward lean), " +
      "but change her hair to long neat braids, change her skin tone to rich deep brown, " +
      "and change her shirt to a wine-red wrap-neck top with a soft cream shawl over one shoulder. " +
      "Same warm matte gouache / paper texture style, simplified flat shading, clean face. " +
      "Same cream-ground background. Same warm palette (cream, warm browns, terracotta, small wine accent). " +
      "Square 1:1, head-and-shoulders, face centered with margin. Clearly an adult woman, 30s. " +
      "Fully clothed, tasteful, warm, friendly expression. No photoreal, no 3D, no anime."
  },
  {
    id: "batch1-02",
    desc: "New person — bald Black man, warm smile, deep skin, cream henley",
    coverage: { newFace: true, masculine: true, deepSkin: true, bald: true },
    prompt:
      "A warm flat-illustration companion portrait in the exact same style as the reference. " +
      "A new character: a warm Black man in his 40s with a bald head, rich deep brown skin, " +
      "a warm genuine smile with kind brown eyes, wearing a soft cream henley shirt. " +
      "Broad gentle face, warm expression, head-and-shoulders, face centered with margin. " +
      "Same warm matte gouache / paper texture style, simplified flat shading, clean face. " +
      "Same cream-ground background. Same warm palette (cream, warm browns, terracotta). " +
      "Square 1:1. Clearly an adult, 40+. Fully clothed, tasteful. " +
      "No photoreal, no 3D, no anime."
  },
  {
    id: "batch1-03",
    desc: "New person — androgynous, short curly salt-and-pepper hair, tan skin, terracotta top",
    coverage: { newFace: true, androgynous: true, mediumSkin: true },
    prompt:
      "A warm flat-illustration companion portrait in the exact same style as the reference. " +
      "A new character: an androgynous-presenting person in their 30s, medium-tan skin, " +
      "short curly salt-and-pepper hair, warm amber eyes, a calm thoughtful expression. " +
      "Wearing a soft terracotta mock-neck top. Head-and-shoulders, face centered, " +
      "upper body only. Same warm matte gouache / paper texture style, simplified flat shading, " +
      "clean face. Same cream-ground background. Same warm palette. Square 1:1. " +
      "Clearly an adult, 30s. Fully clothed, tasteful. No photoreal, no 3D, no anime."
  },
  {
    id: "batch1-04",
    desc: "Restyle of Orion — olive skin, short fade with grey temples, oatmeal sweater",
    coverage: { restyle: true, masculine: true, oliveSkin: true },
    prompt:
      "A warm flat-illustration companion portrait in the exact same style as the reference. " +
      "This is a restyle of Orion: keep his face (same bone structure, calm steady expression, rooted upright posture), " +
      "but change his hair to a short fade with grey at the temples, change his skin tone to warm olive, " +
      "and change his shirt to a soft oatmeal knit sweater. " +
      "Same warm matte gouache / paper texture style, simplified flat shading, clean face. " +
      "Same cream-ground background. Same warm palette. Square 1:1, head-and-shoulders, face centered with margin. " +
      "Clearly an adult man, 40s. Fully clothed, tasteful. No photoreal, no 3D, no anime."
  },
  {
    id: "batch1-05",
    desc: "New person — feminine, long auburn waves, fair skin with freckles, cream scoop-neck + wine shawl",
    coverage: { newFace: true, feminine: true, fairSkin: true, longHair: true },
    prompt:
      "A warm flat-illustration companion portrait in the exact same style as the reference. " +
      "A new character: a woman in her late 20s with long flowing auburn waves, fair skin with light freckles across the nose, " +
      "bright warm green eyes, a soft genuine smile. Wearing a cream scoop-neck top with a soft wine-red shawl draped over one shoulder. " +
      "Head-and-shoulders, face slightly turned, centered with margin. " +
      "Same warm matte gouache / paper texture style, simplified flat shading, clean face. " +
      "Same cream-ground background. Same warm palette. Square 1:1. " +
      "Clearly an adult, late 20s. Fully clothed, tasteful. No photoreal, no 3D, no anime."
  },
  {
    id: "batch1-06",
    desc: "New person — masculine, warm brown skin, close natural hair, rust henley",
    coverage: { newFace: true, masculine: true, brownSkin: true },
    prompt:
      "A warm flat-illustration companion portrait in the exact same style as the reference. " +
      "A new character: a warm man in his 30s with warm medium-brown skin, close-cropped natural black hair, " +
      "kind dark brown eyes, a friendly genuine smile. Wearing a rust-colored henley shirt. " +
      "Head-and-shoulders, face centered with margin, upright warm posture. " +
      "Same warm matte gouache / paper texture style, simplified flat shading, clean face. " +
      "Same cream-ground background. Same warm palette. Square 1:1. " +
      "Clearly an adult, 30s. Fully clothed, tasteful. No photoreal, no 3D, no anime."
  }
];

// ── Verify coverage ────────────────────────────────────────────────

function verifyCoverage() {
  const c = { restyle: 0, newFace: 0, masc: 0, fem: 0, andro: 0, deepSkin: 0, bald: 0, longHair: 0 };
  for (const p of PORTRAITS) {
    if (p.coverage.restyle) c.restyle++;
    if (p.coverage.newFace) c.newFace++;
    if (p.coverage.masculine) c.masc++;
    if (p.coverage.feminine) c.fem++;
    if (p.coverage.androgynous) c.andro++;
    if (p.coverage.deepSkin) c.deepSkin++;
    if (p.coverage.bald) c.bald++;
    if (p.coverage.longHair) c.longHair++;
  }
  const issues = [];
  if (c.restyle < 1) issues.push("Need ≥1 restyle (have " + c.restyle + ")");
  if (c.newFace < 2) issues.push("Need ≥2 new faces (have " + c.newFace + ")");
  if (!c.masc || !c.fem || !c.andro) issues.push("Need masc + fem + andro");
  if (c.deepSkin < 1) issues.push("Need ≥1 deep skin tone");
  if (c.bald < 1) issues.push("Need ≥1 bald");
  if (c.longHair < 1) issues.push("Need ≥1 long hair");
  if (issues.length) throw new Error("Coverage FAIL:\n" + issues.join("\n"));
  console.log("Coverage check PASSED");
  console.log("  Restyles:", c.restyle, "| New faces:", c.newFace);
  console.log("  Masc:", c.masc, "| Fem:", c.fem, "| Andro:", c.andro);
  console.log("  Deep skin:", c.deepSkin, "| Bald:", c.bald, "| Long hair:", c.longHair);
}

// ── DALL-E generation ──────────────────────────────────────────────

function callDalE(prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    });
    const req = https.request({
      hostname: "api.openai.com",
      path: "/v1/images/generations",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const j = JSON.parse(data);
          if (j.error) reject(new Error(j.error.message));
          else resolve(j.data[0].b64_json);
        } catch (e) {
          reject(new Error("Parse failed: " + data.slice(0, 200)));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── GPT-4o grading ─────────────────────────────────────────────────

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

function callVision(portrait, imageB64, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: RUBRIC + "\n\nPortrait: " + portrait.desc },
            { type: "image_url", image_url: { url: "data:image/png;base64," + imageB64, detail: "high" } },
          ],
        },
      ],
      max_tokens: 1000,
    });
    const req = https.request({
      hostname: "api.openai.com",
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const j = JSON.parse(data);
          if (j.error) reject(new Error(j.error.message));
          else {
            const content = j.choices?.[0]?.message?.content || "";
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) resolve(JSON.parse(jsonMatch[0]));
            else reject(new Error("No JSON in: " + content.slice(0, 300)));
          }
        } catch (e) {
          reject(new Error("Parse failed: " + data.slice(0, 300)));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  verifyCoverage();

  const apiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    console.log("\nOPENAI_API_KEY is not set in the environment.");
    console.log("The pipeline is ready to run — set the key and re-run:");
    console.log("  $env:OPENAI_API_KEY='sk-...'; node server/generate-avatars.mjs\n");
    console.log("Portrait descriptions ready for generation:");
    for (const p of PORTRAITS) {
      console.log("  " + p.id + " — " + p.desc);
    }
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const results = [];

  for (const portrait of PORTRAITS) {
    console.log("\n─── " + portrait.id + " ───");
    console.log("  " + portrait.desc);

    // Generate
    console.log("  Generating with DALL-E 3...");
    let b64;
    try {
      b64 = await callDalE(portrait.prompt, apiKey);
    } catch (err) {
      console.log("  FAILED:", err.message);
      results.push({ id: portrait.id, error: err.message });
      continue;
    }

    // Decode and resize to 1254x1254
    const imgBuf = Buffer.from(b64, "base64");
    const resized = await sharp(imgBuf).resize(1254, 1254, { fit: "cover", position: "center" }).png().toBuffer();
    const outPath = resolve(OUT_DIR, portrait.id + ".png");
    writeFileSync(outPath, resized);
    console.log("  Saved " + portrait.id + ".png (" + resized.length + " bytes)");

    // Grade
    console.log("  Grading with GPT-4o...");
    let grade;
    try {
      grade = await callVision(portrait, b64, apiKey);
    } catch (err) {
      console.log("  Grading failed:", err.message);
      results.push({ id: portrait.id, path: outPath, gradeError: err.message });
      continue;
    }

    console.log("  Verdict:", grade.verdict);
    console.log("  Adult gate:", grade.adultGate, "| Appropriate gate:", grade.appropriateGate);
    console.log("  Scores:", JSON.stringify(grade.scores));
    if (grade.fixes?.length) {
      console.log("  Fixes:", grade.fixes.join("; "));
    }

    results.push({
      id: portrait.id,
      path: outPath,
      desc: portrait.desc,
      grade,
    });
  }

  // ── Write notes.md ──────────────────────────────────────────────

  let notes = "# Batch 1 — Companion Avatars\n\n";
  notes += "Generated: " + new Date().toISOString().slice(0, 10) + "\n";
  notes += "Tool: DALL-E 3 + GPT-4o grading\n\n";
  notes += "## Coverage\n\n";
  notes += "- Restyles: " + PORTRAITS.filter((p) => p.coverage.restyle).length + " (01, 04)\n";
  notes += "- New faces: " + PORTRAITS.filter((p) => p.coverage.newFace).length + " (02, 03, 05, 06)\n";
  notes += "- Masc/Fem/Andro: " +
    PORTRAITS.filter((p) => p.coverage.masculine).length + "/" +
    PORTRAITS.filter((p) => p.coverage.feminine).length + "/" +
    PORTRAITS.filter((p) => p.coverage.androgynous).length + "\n";
  notes += "- Skin tones: deep (01, 02), olive (04), tan (03), fair (05), brown (06)\n";
  notes += "- Bald: 1 (02) | Long hair: 2 (01, 05)\n\n";
  notes += "## Per-Portrait Results\n\n";

  for (const r of results) {
    notes += "### " + r.id + ".png\n\n";
    notes += "**Description:** " + r.desc + "\n\n";
    if (r.error) {
      notes += "**Generation failed:** " + r.error + "\n\n";
    } else if (r.gradeError) {
      notes += "**Grading error:** " + r.gradeError + "\n\n";
    } else {
      notes += "**Verdict:** " + r.grade.verdict + "\n\n";
      notes += "| Gate | Result |\n|------|--------|\n";
      notes += "| Adult | " + r.grade.adultGate + " |\n";
      notes += "| Appropriate | " + r.grade.appropriateGate + " |\n\n";
      notes += "| Dimension | Score |\n|-----------|-------|\n";
      notes += "| Style match | " + r.grade.scores.style_match + " |\n";
      notes += "| Circle-safe framing | " + r.grade.scores.circle_safe + " |\n";
      notes += "| Warmth / Appeal | " + r.grade.scores.warmth + " |\n";
      notes += "| Skin-tone rendering | " + r.grade.scores.skin_tone + " |\n";
      notes += "| Anatomy & Artifacts | " + r.grade.scores.anatomy + " |\n";
      notes += "| Distinctness | " + r.grade.scores.distinctness + " |\n";
      notes += "| Background | " + r.grade.scores.background + " |\n\n";
      if (r.grade.fixes?.length) {
        notes += "**Fixes needed:**\n";
        for (const f of r.grade.fixes) notes += "- " + f + "\n";
        notes += "\n";
      }
    }
    notes += "---\n\n";
  }

  const notesPath = resolve(OUT_DIR, "notes.md");
  writeFileSync(notesPath, notes);
  console.log("\n✓ notes.md written to " + notesPath);
  console.log("✓ All files in " + OUT_DIR);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
