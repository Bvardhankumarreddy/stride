import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { config as loadEnv } from 'dotenv';

// Load .env from the demo/ directory
loadEnv({ path: path.resolve(__dirname, '../.env') });

// ─── Config ────────────────────────────────────────────────────────────────
const CONFIG = {
  baseUrl: process.env.APP_URL || 'https://stride-frontend-production.up.railway.app',
  email: process.env.DEMO_EMAIL || '',
  password: process.env.DEMO_PASSWORD || '',
  inviteEmail: process.env.DEMO_INVITE_EMAIL || 'newmember@example.com',
  outputDir: path.resolve('./demo-output'),
  viewport: { width: 1440, height: 900 },
  slowMo: 80,
  pauseShort: 1500,
  pauseMedium: 2500,
  pauseLong: 4000,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function goto(page: Page, path: string) {
  await page.goto(`${CONFIG.baseUrl}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(CONFIG.pauseShort);
}

async function showTitleCard(page: Page, title: string, subtitle: string = '') {
  await page.evaluate(({ title, subtitle }: { title: string; subtitle: string }) => {
    const existing = document.getElementById('demo-title-card');
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn  { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes fadeOut { from { opacity:1; } to { opacity:0; } }
    `;
    document.head.appendChild(style);
    const card = document.createElement('div');
    card.id = 'demo-title-card';
    card.style.cssText = `
      position:fixed; bottom:40px; left:50%; transform:translateX(-50%);
      background:rgba(15,17,25,0.92); border:1px solid rgba(109,40,217,0.5);
      border-radius:12px; padding:16px 28px; z-index:99999; text-align:center;
      backdrop-filter:blur(8px); box-shadow:0 8px 32px rgba(0,0,0,0.4); animation:fadeIn 0.4s ease;
    `;
    card.innerHTML = `
      <div style="color:#E8EAF0;font-size:15px;font-weight:600;font-family:Inter,sans-serif;">${title}</div>
      ${subtitle ? `<div style="color:#8B90A0;font-size:12px;margin-top:4px;font-family:Inter,sans-serif;">${subtitle}</div>` : ''}
    `;
    document.body.appendChild(card);
  }, { title, subtitle } as { title: string; subtitle: string });
  await page.waitForTimeout(400);
}

async function hideTitleCard(page: Page) {
  await page.evaluate(() => {
    const card = document.getElementById('demo-title-card');
    if (card) { card.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => card.remove(), 300); }
  });
  await page.waitForTimeout(400);
}

// ─── Main Demo Script ────────────────────────────────────────────────────────
async function recordDemo() {
  if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });

  console.log('🎬 Starting Stride demo recording...');
  console.log(`📁 Output: ${CONFIG.outputDir}`);

  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: CONFIG.slowMo,
    args: ['--start-maximized'],
  });

  const context: BrowserContext = await browser.newContext({
    viewport: CONFIG.viewport,
    recordVideo: { dir: CONFIG.outputDir, size: CONFIG.viewport },
    deviceScaleFactor: 2,
  });

  const page: Page = await context.newPage();

  try {

    // ──────────────────────────────────────────────────────────────
    // SCENE 1: Login
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 1: Login');

    await goto(page, '/login');
    await showTitleCard(page, '👋 Welcome to Stride', 'Project management, docs, and AI — in one workspace');
    await page.waitForTimeout(CONFIG.pauseLong);
    await hideTitleCard(page);

    // Use fill() for credentials — reliable, no keystroke delays
    await page.locator('#email').fill(CONFIG.email);
    await page.waitForTimeout(400);
    await page.locator('#password').fill(CONFIG.password);
    await page.waitForTimeout(400);

    await showTitleCard(page, '🔐 Signing in...');
    await page.locator('button[type="submit"]').click();
    // Wait for redirect away from /login (may land on /dashboard or /change-password)
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 20000 });
    await page.waitForTimeout(CONFIG.pauseMedium);
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 2: My Work Dashboard
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 2: Dashboard');

    await showTitleCard(page, '🏠 My Work Dashboard', 'Everything you need to start your day — in one view');
    await page.waitForTimeout(CONFIG.pauseLong);
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(CONFIG.pauseMedium);
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(CONFIG.pauseMedium);
    await page.mouse.wheel(0, -700);
    await page.waitForTimeout(CONFIG.pauseShort);
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 3: Issues List
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 3: Issues');

    await goto(page, '/issues');
    await showTitleCard(page, '📋 Issues', 'All your work — filtered, sorted, grouped your way');
    await page.waitForTimeout(CONFIG.pauseLong);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(CONFIG.pauseShort);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(CONFIG.pauseShort);
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 4: Create Issue with Custom Fields → instant refresh
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 4: Create Issue');

    await showTitleCard(page, '✨ Create an issue in seconds', 'Custom fields captured right in the create dialog');
    await page.waitForTimeout(CONFIG.pauseMedium);

    // Click New Issue button (header area, top-right)
    const newIssueBtn = page.locator('button', { hasText: /new issue/i }).first();
    await newIssueBtn.hover();
    await page.waitForTimeout(300);
    await newIssueBtn.click();
    await page.waitForTimeout(CONFIG.pauseShort);
    await hideTitleCard(page);

    // Fill issue title — wait for modal input to be ready first
    const titleInput = page.locator('input[placeholder="Issue title"]');
    await titleInput.waitFor({ state: 'visible', timeout: 10000 });
    await titleInput.fill('Add dark mode support to the dashboard');
    await page.waitForTimeout(CONFIG.pauseShort);

    // Set priority to High
    const prioritySelect = page.locator('select').filter({ hasText: /medium/i }).first();
    await prioritySelect.selectOption('high');
    await page.waitForTimeout(500);

    // Custom field if visible
    const customFieldSelect = page.locator('select').filter({ hasText: /select/i }).first();
    if (await customFieldSelect.isVisible().catch(() => false)) {
      await showTitleCard(page, '🗂️ Custom Fields', 'Captured at creation — no extra steps');
      await page.waitForTimeout(CONFIG.pauseShort);
      await customFieldSelect.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      await hideTitleCard(page);
    }

    await showTitleCard(page, '⚡ Creating issue...', 'Watch it appear instantly — no page refresh needed');
    await page.waitForTimeout(CONFIG.pauseShort);
    // Wait for submit button to be enabled (title is filled)
    const submitBtn = page.locator('button[type="submit"]', { hasText: /create issue/i });
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    await submitBtn.click();
    await page.waitForTimeout(CONFIG.pauseMedium);
    await hideTitleCard(page);

    await showTitleCard(page, '✅ Issue appears instantly', 'Real-time update — no refresh required');
    await page.waitForTimeout(CONFIG.pauseLong);
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 5: Issue Detail
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 5: Issue Detail');

    const firstIssue = page.locator('a[href*="/issues/"]').first();
    if (await firstIssue.isVisible().catch(() => false)) {
      await firstIssue.hover();
      await page.waitForTimeout(300);
      await firstIssue.click();
      await page.waitForTimeout(CONFIG.pauseMedium);
      await showTitleCard(page, '🎯 Issue Detail', 'Full context — custom fields, activity, comments');
      await page.waitForTimeout(CONFIG.pauseLong);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(CONFIG.pauseMedium);
      await page.mouse.wheel(0, -400);
      await page.waitForTimeout(CONFIG.pauseShort);
      await hideTitleCard(page);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(CONFIG.pauseShort);
    }

    // ──────────────────────────────────────────────────────────────
    // SCENE 6: Settings → Custom Fields
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 6: Settings');

    await goto(page, '/settings');
    await showTitleCard(page, '⚙️ Custom Fields', 'Define your own fields — text, number, date, select, checkbox');
    await page.waitForTimeout(CONFIG.pauseLong);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(CONFIG.pauseMedium);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(CONFIG.pauseShort);
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 7: Members → Send Invite
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 7: Invite Member');

    await goto(page, '/settings/members');
    await showTitleCard(page, '✉️ Invite Team Members', 'Send an email invite — powered by AWS SES');
    await page.waitForTimeout(CONFIG.pauseMedium);

    const inviteInput = page.locator('input[type="email"]').first();
    if (await inviteInput.isVisible().catch(() => false)) {
      await inviteInput.click();
      await page.waitForTimeout(200);
      await inviteInput.pressSequentially(CONFIG.inviteEmail, { delay: 80 });
      await page.waitForTimeout(CONFIG.pauseShort);

      await showTitleCard(page, '📨 Sending invite...', `Delivery to ${CONFIG.inviteEmail} via AWS SES`);
      const sendBtn = page.locator('button', { hasText: /send|invite/i }).first();
      await sendBtn.hover();
      await page.waitForTimeout(300);
      await sendBtn.click();
      await page.waitForTimeout(CONFIG.pauseMedium);
      await hideTitleCard(page);

      await showTitleCard(page, '✅ Invite sent!', "They'll receive an email with a 48-hour link to join");
      await page.waitForTimeout(CONFIG.pauseLong);
      await hideTitleCard(page);
    } else {
      await page.waitForTimeout(CONFIG.pauseLong);
      await hideTitleCard(page);
    }

    // ──────────────────────────────────────────────────────────────
    // SCENE 8: Document Editor
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 8: Docs');

    await goto(page, '/docs');
    await showTitleCard(page, '📝 Document Editor', 'Docs and issues in one place — always in sync');
    await page.waitForTimeout(CONFIG.pauseShort);

    const firstDoc = page.locator('a[href*="/docs/"]').first();
    if (await firstDoc.isVisible().catch(() => false)) {
      await firstDoc.hover();
      await page.waitForTimeout(300);
      await firstDoc.click();
      await page.waitForTimeout(CONFIG.pauseMedium);
      await page.waitForTimeout(CONFIG.pauseLong);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(CONFIG.pauseMedium);
      await hideTitleCard(page);

      await showTitleCard(page, '⚡ Slash Commands', 'Type / to insert blocks, AI content, issue links');
      await page.waitForTimeout(CONFIG.pauseShort);
      const editor = page.locator('[contenteditable="true"]').first();
      if (await editor.isVisible().catch(() => false)) {
        await editor.click();
        await page.waitForTimeout(500);
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('/');
        await page.waitForTimeout(CONFIG.pauseMedium);
        await page.keyboard.press('Escape');
      }
    } else {
      await page.waitForTimeout(CONFIG.pauseLong);
    }
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 9: Roadmap
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 9: Roadmap');

    await goto(page, '/roadmap');
    await showTitleCard(page, '🗺️ Roadmap', 'Auto-generated from your epics — no manual updates');
    await page.waitForTimeout(CONFIG.pauseLong);
    await page.mouse.wheel(300, 0);
    await page.waitForTimeout(CONFIG.pauseShort);
    await page.mouse.wheel(-300, 0);
    await page.waitForTimeout(CONFIG.pauseShort);
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 10: AI Command Bar
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 10: AI Command Bar');

    await showTitleCard(page, '⌘K — AI Command Bar', 'Search, create, or ask anything');
    await page.waitForTimeout(CONFIG.pauseShort);
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(CONFIG.pauseMedium);
    await page.keyboard.type('Generate release notes for this sprint');
    await page.waitForTimeout(CONFIG.pauseLong);
    await page.keyboard.press('Escape');
    await hideTitleCard(page);
    await page.waitForTimeout(CONFIG.pauseShort);

    // ──────────────────────────────────────────────────────────────
    // SCENE 11: Closing
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 11: Closing');

    await goto(page, '/dashboard');
    await showTitleCard(page, '🚀 Try Stride Free', 'stride-frontend-production.up.railway.app');
    await page.waitForTimeout(CONFIG.pauseLong + 2000);
    await hideTitleCard(page);

    console.log('✅ Demo recording complete!');

  } catch (error) {
    console.error('❌ Error during recording:', error);
  } finally {
    await context.close();
    await browser.close();

    const files = fs.readdirSync(CONFIG.outputDir).filter((f: string) => f.endsWith('.webm'));
    if (files.length > 0) {
      const latest = files[files.length - 1];
      const newName = `stride-demo-${new Date().toISOString().split('T')[0]}.webm`;
      fs.renameSync(
        path.join(CONFIG.outputDir, latest),
        path.join(CONFIG.outputDir, newName),
      );
      console.log(`🎥 Video saved: ${newName}`);
      console.log(`📁 Location: ${CONFIG.outputDir}/${newName}`);
    }
  }
}

recordDemo();
