import fs from 'fs';
import path from 'path';
import https from 'https';
import { config as loadEnv } from 'dotenv';

// Load .env from the demo/ directory
loadEnv({ path: path.resolve(__dirname, '../.env') });

// ─── Config ─────────────────────────────────────────────────────────────────
// ElevenLabs keys are plain hex — strip the "sk_" prefix if present
const rawKey = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_API_KEY = rawKey.startsWith('sk_') ? rawKey.slice(3) : rawKey;

const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // "Adam" — professional male voice
// Other voices:
//   "EXAVITQu4vr4xnSDxMaL" — Bella (female, warm)
//   "ErXwobaYiN019PkySvjV" — Antoni (male, clear)
//   "MF3mGyEYCl7XYWbV9V6O" — Elli (female, young)

const AUDIO_DIR = path.resolve('./demo-output/audio');

// ─── Voiceover Script — One line per scene ───────────────────────────────────
// Timing matches the Playwright script scenes
const VOICEOVER_SCRIPT: { scene: string; text: string }[] = [
  {
    scene: '01_welcome',
    text: 'Welcome to Stride. Project management, docs, and AI — all in one workspace. No more switching between Jira, Confluence, and Notion.',
  },
  {
    scene: '02_dashboard',
    text: 'This is your My Work dashboard. Every morning, Stride gives you an AI digest — what closed yesterday, what is at risk, and what needs your attention today. Your issues and recent docs are right here.',
  },
  {
    scene: '03_issues',
    text: 'The Issues view gives you a full picture of your sprint. Filter by assignee, sprint, or priority. Group by status. Select multiple issues and bulk-update them in one click.',
  },
  {
    scene: '04_create_issue',
    text: 'Creating an issue takes one field. Type the title, press Enter — the issue is created instantly. No forms. No required fields. No page reload.',
  },
  {
    scene: '05_issue_detail',
    text: 'Click any issue to see the full detail. Description, sub-tasks, activity feed, and all your custom fields — in a clean two-column layout. Comments and system events appear in the same timeline.',
  },
  {
    scene: '06_custom_fields',
    text: 'In Settings, you can define custom fields for your workspace — text, number, date, dropdown, or checkbox. These fields appear on every issue and are available for filtering.',
  },
  {
    scene: '07_invite',
    text: 'Inviting your team is simple. Enter their email address and send. They will receive a link to join your workspace, valid for 48 hours.',
  },
  {
    scene: '08_docs',
    text: 'The document editor is where Stride earns its unified claim. Write specs, embed live issue cards, add callouts and code blocks — all with a simple slash command. Your docs always know about your tickets.',
  },
  {
    scene: '09_roadmap',
    text: 'The roadmap builds itself from your epics and milestones. No PowerPoint. No manual updates. It reflects what is actually happening in your sprints — in real time.',
  },
  {
    scene: '10_ai_command',
    text: 'Press Command K from anywhere to open the AI command bar. Search across issues, docs, and people — or ask in plain language. Generate release notes, create issues, find decisions — all from one place.',
  },
  {
    scene: '11_closing',
    text: 'Stride is free to try — no credit card required. Sign up today and replace Jira, Confluence, and Notion with one workspace your team will actually want to use.',
  },
];

// ─── ElevenLabs API Call ─────────────────────────────────────────────────────
async function generateAudio(text: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',   // current fast model (replaces eleven_monolingual_v1)
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${VOICE_ID}`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          const body = Buffer.concat(chunks).toString('utf8');
          reject(new Error(`ElevenLabs ${res.statusCode}: ${body}`));
          return;
        }
        fs.writeFileSync(outputPath, Buffer.concat(chunks));
        resolve();
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function generateAllVoiceovers() {
  if (!ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY is not set in environment');
    process.exit(1);
  }

  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  console.log(`🎙️ Generating ${VOICEOVER_SCRIPT.length} voiceover clips...`);
  console.log(`🔊 Voice: Adam (ElevenLabs)\n`);

  for (const { scene, text } of VOICEOVER_SCRIPT) {
    const outputPath = path.join(AUDIO_DIR, `${scene}.mp3`);
    process.stdout.write(`  ⏳ ${scene}... `);
    await generateAudio(text, outputPath);
    console.log(`✅ saved`);

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n✅ All voiceovers saved to: ${AUDIO_DIR}`);
  console.log(`\n📋 Next step — merge audio with video:`);
  console.log(`   npm run merge-audio\n`);
}

generateAllVoiceovers();
