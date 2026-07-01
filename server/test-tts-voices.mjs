import { writeFileSync, mkdirSync } from 'fs';

const API_KEY = process.env.INWORLD_API_KEY;
if (!API_KEY) { console.error('Missing INWORLD_API_KEY — set it in server/.env'); process.exit(1); }

const VOICE_IDS = {
  aurora: process.env.INWORLD_VOICE_ID_AURORA,
  orion: process.env.INWORLD_VOICE_ID_ORION,
  lyra: process.env.INWORLD_VOICE_ID_LYRA,
};

if (!VOICE_IDS.aurora || !VOICE_IDS.orion || !VOICE_IDS.lyra) {
  console.error('Missing one or more INWORLD_VOICE_ID_* env vars'); process.exit(1);
}

mkdirSync('tts-output', { recursive: true });

const PERSONAS = [
  {
    key: 'aurora',
    voiceId: VOICE_IDS.aurora,
    styleTag: '[warm and gentle]',
    deliveryMode: 'BALANCED',
  },
  {
    key: 'orion',
    voiceId: VOICE_IDS.orion,
    styleTag: '[direct and grounded]',
    deliveryMode: 'STABLE',
  },
  {
    key: 'lyra',
    voiceId: VOICE_IDS.lyra,
    styleTag: '[bright and expressive]',
    deliveryMode: 'CREATIVE',
  },
];

const CRISIS_TAG = '[calm and measured]';

const TEXTS = [
  {
    name: 'welcome',
    text: "Hey there. I'm really glad to finally meet you. I've been looking forward to this.",
  },
  {
    name: 'warm-response',
    text: "That's actually really lovely. You always know how to make me smile, don't you?",
  },
  {
    name: 'concerned',
    text: "I can tell something's bothering you. You don't have to talk about it if you're not ready, but I'm here.",
  },
  {
    name: 'crisis',
    text: "Please know that you're not alone. Call or text 988 for support — you can also text HOME to 741741 for the Crisis Text Line.",
  },
];

let passed = 0;
let failed = 0;

for (const persona of PERSONAS) {
  for (const sample of TEXTS) {
    const isCrisis = sample.name === 'crisis';
    const styleTag = isCrisis ? CRISIS_TAG : persona.styleTag;
    const deliveryMode = isCrisis ? 'STABLE' : persona.deliveryMode;
    const fileName = `tts-output/${persona.key}-${isCrisis ? 'crisis-' : ''}${sample.name}.mp3`;

    process.stdout.write(`${persona.key} | ${styleTag} ${deliveryMode} | ${sample.name} ... `);

    try {
      const res = await fetch('https://api.inworld.ai/tts/v1/voice', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `${styleTag} ${sample.text}`,
          voiceId: persona.voiceId,
          modelId: 'inworld-tts-2',
          deliveryMode,
          audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`ERROR ${res.status}: ${err.slice(0, 200)}`);
        failed++;
        continue;
      }

      const json = await res.json();
      writeFileSync(fileName, Buffer.from(json.audioContent, 'base64'));
      console.log(`OK`);
      passed++;
    } catch (err) {
      console.error(`FAIL: ${err.message}`);
      failed++;
    }
  }
}

console.log(`\nDone. ${passed} OK, ${failed} failed. Files in tts-output/`);
