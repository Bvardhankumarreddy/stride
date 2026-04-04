import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

// ─── Config ────────────────────────────────────────────────────────────────
const CONFIG = {
  baseUrl: process.env.APP_URL || 'https://stride-frontend-production.up.railway.app',
  email: process.env.DEMO_EMAIL || 'vardhankumar_bhopathi@srmap.edu.in',
  password: process.env.DEMO_PASSWORD || '',
  inviteEmail: process.env.DEMO_INVITE_EMAIL || 'newmember@example.com',
  outputDir: path.resolve('./demo-output'),
  viewport: { width: 1440, height: 900 },
  slowMo: 80,          // ms between actions — makes it look human
  pauseShort: 1500,    // pause after navigation
  pauseMedium: 2500,   // pause to let viewer read
  pauseLong: 4000,     // pause on key screens
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function smoothClick(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await el.hover();
  await page.waitForTimeout(300);
  await el.click();
}

async function humanType(page: Page, selector: string, text: string) {
  await page.locator(selector).click();
  await page.waitForTimeout(200);
  await page.locator(selector).pressSequentially(text, { delay: 80 });
}

async function showTitleCard(page: Page, title: string, subtitle: string = '') {
  await page.evaluate(({ title, subtitle }: { title: string; subtitle: string }) => {
    const existing = document.getElementById('demo-title-card');
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.id = 'demo-title-card';
    card.style.cssText = `
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 17, 25, 0.92);
      border: 1px solid rgba(109, 40, 217, 0.5);
      border-radius: 12px;
      padding: 16px 28px;
      z-index: 99999;
      text-align: center;
      backdrop-filter: blur(8px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      animation: fadeIn 0.4s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    `;
    document.head.appendChild(style);

    card.innerHTML = `
      <div style="color: #E8EAF0; font-size: 15px; font-weight: 600; font-family: Inter, sans-serif;">${title}</div>
      ${subtitle ? `<div style="color: #8B90A0; font-size: 12px; margin-top: 4px; font-family: Inter, sans-serif;">${subtitle}</div>` : ''}
    `;
    document.body.appendChild(card);
  }, { title, subtitle } as { title: string; subtitle: string });
  await page.waitForTimeout(400);
}

async function hideTitleCard(page: Page) {
  await page.evaluate(() => {
    const card = document.getElementById('demo-title-card');
    if (card) {
      card.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => card.remove(), 300);
    }
  });
  await page.waitForTimeout(400);
}

// ─── Main Demo Script ────────────────────────────────────────────────────────
async function recordDemo() {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  console.log('🎬 Starting Stride demo recording...');
  console.log(`📁 Output directory: ${CONFIG.outputDir}`);

  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: CONFIG.slowMo,
    args: ['--start-maximized'],
  });

  const context: BrowserContext = await browser.newContext({
    viewport: CONFIG.viewport,
    recordVideo: {
      dir: CONFIG.outputDir,
      size: CONFIG.viewport,
    },
    deviceScaleFactor: 2,
  });

  const page: Page = await context.newPage();

  try {

    // ──────────────────────────────────────────────────────────────
    // SCENE 1: Login
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 1: Login');

    await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(CONFIG.pauseMedium);

    await showTitleCard(page, '👋 Welcome to Stride', 'Project management, docs, and AI — in one workspace');
    await page.waitForTimeout(CONFIG.pauseLong);
    await hideTitleCard(page);

    await humanType(page, 'input[type="email"], input[name="email"], #email', CONFIG.email);
    await page.waitForTimeout(500);
    await humanType(page, 'input[type="password"], input[name="password"], #password', CONFIG.password);
    await page.waitForTimeout(500);

    await showTitleCard(page, '🔐 Signing in...');
    await smoothClick(page, 'button[type="submit"]');
    await page.waitForURL(`${CONFIG.baseUrl}/**`, { timeout: 15000 });
    await page.waitForTimeout(CONFIG.pauseMedium);
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 2: My Work Dashboard
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 2: My Work Dashboard');

    await showTitleCard(page, '🏠 My Work Dashboard', 'Everything you need to start your day — in one view');
    await page.waitForTimeout(CONFIG.pauseLong);

    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(CONFIG.pauseMedium);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(CONFIG.pauseMedium);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(CONFIG.pauseShort);
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 3: Issue List View
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 3: Issue List');

    const issuesLink = page.locator('a[href*="issues"], nav >> text=Issues').first();
    await issuesLink.hover();
    await page.waitForTimeout(300);
    await issuesLink.click();
    await page.waitForURL(`${CONFIG.baseUrl}/issues`, { timeout: 10000 });
    await page.waitForTimeout(CONFIG.pauseMedium);

    await showTitleCard(page, '📋 Issues', 'All your work — filtered, sorted, grouped your way');
    await page.waitForTimeout(CONFIG.pauseLong);

    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(CONFIG.pauseShort);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(CONFIG.pauseShort);
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 4: Create Issue with Custom Fields → instant list refresh
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 4: Create Issue with Custom Fields');

    await showTitleCard(page, '✨ Create an issue in seconds', 'Custom fields captured right in the create dialog');
    await page.waitForTimeout(CONFIG.pauseMedium);

    // Open create issue modal
    const newIssueBtn = page.locator('button:has-text("New Issue"), button:has-text("New issue"), a:has-text("New Issue")').first();
    await newIssueBtn.hover();
    await page.waitForTimeout(300);
    await newIssueBtn.click();
    await page.waitForTimeout(CONFIG.pauseShort);
    await hideTitleCard(page);

    // Type issue title
    await humanType(page, 'input[placeholder="Issue title"]', 'Add dark mode support to the dashboard');
    await page.waitForTimeout(CONFIG.pauseShort);

    // Set priority to High
    const prioritySelect = page.locator('select').filter({ hasText: 'Medium' }).first();
    await prioritySelect.selectOption('high');
    await page.waitForTimeout(500);

    // Fill custom field if visible (Issue Type → Epic)
    const customFieldSelect = page.locator('select').filter({ hasText: '— select —' }).first();
    const customFieldVisible = await customFieldSelect.isVisible().catch(() => false);
    if (customFieldVisible) {
      await showTitleCard(page, '🗂️ Custom Fields', 'Captured at creation — no extra steps');
      await page.waitForTimeout(CONFIG.pauseShort);
      await customFieldSelect.selectOption({ index: 1 }); // pick first option
      await page.waitForTimeout(500);
      await hideTitleCard(page);
    }

    await showTitleCard(page, '⚡ Creating issue...', 'Watch it appear instantly — no page refresh needed');
    await page.waitForTimeout(CONFIG.pauseShort);

    // Submit the form
    await smoothClick(page, 'button[type="submit"]:has-text("Create issue"), button:has-text("Create issue")');
    await page.waitForTimeout(CONFIG.pauseMedium);
    await hideTitleCard(page);

    // Pause to let viewer see the new issue appear in the list immediately
    await showTitleCard(page, '✅ Issue appears instantly', 'Real-time update — no refresh required');
    await page.waitForTimeout(CONFIG.pauseLong);
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 5: Issue Detail View
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 5: Issue Detail');

    const issueRow = page.locator('[class*="issue"], [class*="row"], tbody tr').first();
    await issueRow.hover();
    await page.waitForTimeout(300);
    await issueRow.click();
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

    // ──────────────────────────────────────────────────────────────
    // SCENE 6: Settings → Custom Fields
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 6: Settings → Custom Fields');

    const settingsLink = page.locator('a[href*="settings"], nav >> text=Settings').first();
    await settingsLink.hover();
    await page.waitForTimeout(300);
    await settingsLink.click();
    await page.waitForTimeout(CONFIG.pauseMedium);

    await showTitleCard(page, '⚙️ Custom Fields', 'Define your own fields — text, number, date, select, checkbox');
    await page.waitForTimeout(CONFIG.pauseLong);

    // Scroll to show existing custom fields
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(CONFIG.pauseMedium);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(CONFIG.pauseShort);
    await hideTitleCard(page);

    // ──────────────────────────────────────────────────────────────
    // SCENE 7: Settings → Members — Send Email Invite
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 7: Invite Team Member');

    const membersLink = page.locator('a[href*="members"], text=Members').first();
    const membersVisible = await membersLink.isVisible().catch(() => false);
    if (membersVisible) {
      await membersLink.hover();
      await page.waitForTimeout(300);
      await membersLink.click();
      await page.waitForTimeout(CONFIG.pauseMedium);
    } else {
      await page.goto(`${CONFIG.baseUrl}/settings/members`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(CONFIG.pauseMedium);
    }

    await showTitleCard(page, '✉️ Invite Team Members', 'Send an email invite — powered by AWS SES');
    await page.waitForTimeout(CONFIG.pauseMedium);

    // Fill in invite email
    const inviteInput = page.locator('input[type="email"][placeholder*="email"], input[placeholder*="invite"], input[placeholder*="Email"]').first();
    const inviteVisible = await inviteInput.isVisible().catch(() => false);
    if (inviteVisible) {
      await inviteInput.click();
      await page.waitForTimeout(200);
      await inviteInput.pressSequentially(CONFIG.inviteEmail, { delay: 80 });
      await page.waitForTimeout(CONFIG.pauseShort);

      await showTitleCard(page, '📨 Sending invite...', `Delivery to ${CONFIG.inviteEmail} via AWS SES`);

      // Click send invite button
      const sendBtn = page.locator('button:has-text("Send"), button:has-text("Invite"), button:has-text("invite")').last();
      await sendBtn.hover();
      await page.waitForTimeout(300);
      await sendBtn.click();
      await page.waitForTimeout(CONFIG.pauseMedium);

      await hideTitleCard(page);
      await showTitleCard(page, '✅ Invite sent!', 'They\'ll receive an email with a 48-hour link to join');
      await page.waitForTimeout(CONFIG.pauseLong);
      await hideTitleCard(page);
    } else {
      await page.waitForTimeout(CONFIG.pauseLong);
      await hideTitleCard(page);
    }

    // ──────────────────────────────────────────────────────────────
    // SCENE 8: Document Editor
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 8: Document Editor');

    const docsLink = page.locator('a[href*="docs"], nav >> text=Docs').first();
    await docsLink.hover();
    await page.waitForTimeout(300);
    await docsLink.click();
    await page.waitForTimeout(CONFIG.pauseMedium);

    await showTitleCard(page, '📝 Document Editor', 'Docs and issues in one place — always in sync');
    await page.waitForTimeout(CONFIG.pauseShort);

    const firstDoc = page.locator('[class*="doc"], [class*="page"], main a').first();
    const docVisible = await firstDoc.isVisible().catch(() => false);
    if (docVisible) {
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

      const editor = page.locator('[contenteditable="true"], .ProseMirror, [class*="editor"]').first();
      const editorVisible = await editor.isVisible().catch(() => false);
      if (editorVisible) {
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
    // SCENE 9: Roadmap View
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 9: Roadmap');

    const roadmapLink = page.locator('a[href*="roadmap"], nav >> text=Roadmap').first();
    await roadmapLink.hover();
    await page.waitForTimeout(300);
    await roadmapLink.click();
    await page.waitForTimeout(CONFIG.pauseMedium);

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
    // SCENE 11: Closing Shot
    // ──────────────────────────────────────────────────────────────
    console.log('📍 Scene 11: Closing');

    const homeLink = page.locator('a[href*="dashboard"], nav >> text=My Work').first();
    await homeLink.click();
    await page.waitForTimeout(CONFIG.pauseMedium);

    await showTitleCard(
      page,
      '🚀 Try Stride Free',
      'stride-frontend-production.up.railway.app'
    );
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
        path.join(CONFIG.outputDir, newName)
      );
      console.log(`🎥 Video saved: ${newName}`);
      console.log(`📁 Location: ${CONFIG.outputDir}/${newName}`);
    }
  }
}

recordDemo();
