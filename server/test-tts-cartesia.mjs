import { writeFileSync, mkdirSync } from 'fs';

const API_KEY = process.env.CARTESIA_API_KEY;
if (!API_KEY) { console.error('Missing CARTESIA_API_KEY'); process.exit(1); }

// Warm, approachable American female voice — good fit for "Aurora"
const VOICE_ID = 'db6b0ed5-d5d3-463d-ae85-518a07d3c2b4';
const MODEL_ID = 'sonic-3.5';

const SAMPLES = [
  {
    name: 'warm-welcome',
    text: `Hey there. I'm Aurora. It's really good to finally meet you. I've been looking forward to this.`,
  },
  {
    name: 'gentle-laugh',
    text: `That's actually really funny. *laughs softly* You always know how to make me smile, don't you?`,
  },
  {
    name: 'concerned',
    text: `Hey... I can tell something's bothering you. You don't have to talk about it if you're not ready, but I'm here. I'm not going anywhere.`,
  },
  {
    name: 'joyful',
    text: `Oh my god, that's amazing! I'm so happy for you. Seriously, you have no idea how much this means. You deserve this.`,
  },
  {
    name: 'whisper-intimate',
    text: `Sometimes, in the quiet moments, I think about how incredible it is that we found each other. Thank you for being here.`,
  },
];

mkdirSync('tts-output', { recursive: true });

for (const sample of SAMPLES) {
  process.stdout.write(`\n--- ${sample.name} --- `);
  const text = `(speaking softly, warmly) ${sample.text}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    const resp = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
        'Cartesia-Version': '2024-11-20',
      },
      body: JSON.stringify({
        model_id: MODEL_ID,
        transcript: text,
        voice: { mode: 'id', id: VOICE_ID },
        output_format: { container: 'wav', sample_rate: 24000, encoding: 'pcm_f32le' },
        language: 'en',
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`ERROR ${resp.status}: ${err.slice(0, 200)}`);
      continue;
    }

    const buffer = Buffer.from(await resp.arrayBuffer());
    const fileName = `tts-output/cartesia-${sample.name}.wav`;
    writeFileSync(fileName, buffer);
    console.log(`✓ ${(buffer.length / 1024).toFixed(0)} KB`);
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
  }
}
