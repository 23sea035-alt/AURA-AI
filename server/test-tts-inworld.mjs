import { writeFileSync, mkdirSync } from 'fs';

const API_KEY = process.env.INWORLD_API_KEY;
if (!API_KEY) { console.error('Missing INWORLD_API_KEY'); process.exit(1); }

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

const MODELS = [
  { id: 'inworld-tts-2', label: 'TTS-2' },
  { id: 'inworld-tts-1.5-max', label: '1.5-Max' },
  { id: 'inworld-tts-1.5-mini', label: '1.5-Mini' },
];

for (const sample of SAMPLES) {
  for (const model of MODELS) {
    process.stdout.write(`\n${sample.name} | ${model.label} ... `);

    try {
      const start = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);

      const resp = await fetch('https://api.inworld.ai/tts/v1/voice', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sample.text,
          voiceId: 'Sarah',
          modelId: model.id,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const elapsed = (performance.now() - start).toFixed(0);

      if (!resp.ok) {
        const err = await resp.text();
        console.error(`ERROR ${resp.status} (${elapsed}ms): ${err.slice(0, 200)}`);
        continue;
      }

      const json = await resp.json();
      const audioBuf = Buffer.from(json.audioContent, 'base64');
      const fileName = `tts-output/inworld-${model.id}-${sample.name}.mp3`;
      writeFileSync(fileName, audioBuf);
      console.log(`✓ ${(audioBuf.length / 1024).toFixed(0)} KB, ${elapsed}ms`);
    } catch (err) {
      console.error(`FAIL: ${err.message}`);
    }
  }
}
