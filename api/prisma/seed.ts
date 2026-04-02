import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const hash = await bcrypt.hash('password123', 12);

  // ── Organization ────────────────────────────────────────────────────────────
  const org = await (prisma as any).organization.upsert({
    where: { slug: 'payments-team' },
    update: { name: 'Payments Team' },
    create: { id: 'org-payments', name: 'Payments Team', slug: 'payments-team', plan: 'pro' },
  });

  // ── Users ────────────────────────────────────────────────────────────────────
  const alex = await prisma.user.upsert({
    where: { email: 'alex@stride.app' },
    update: { organizationId: org.id } as any,
    create: { name: 'Alex Rivera', email: 'alex@stride.app', password: hash, initials: 'AR', role: 'admin', organizationId: org.id } as any,
  });

  const jordan = await prisma.user.upsert({
    where: { email: 'jordan@stride.app' },
    update: { organizationId: org.id } as any,
    create: { name: 'Jordan Lee', email: 'jordan@stride.app', password: hash, initials: 'JL', organizationId: org.id } as any,
  });

  const morgan = await prisma.user.upsert({
    where: { email: 'morgan@stride.app' },
    update: { organizationId: org.id } as any,
    create: { name: 'Morgan Kim', email: 'morgan@stride.app', password: hash, initials: 'MK', organizationId: org.id } as any,
  });

  // ── Org members ───────────────────────────────────────────────────────────────
  for (const [user, role] of [[alex, 'owner'], [jordan, 'member'], [morgan, 'member']] as const) {
    await (prisma as any).organizationMember.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      update: {},
      create: { userId: user.id, organizationId: org.id, role },
    });
  }

  // ── Project ───────────────────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: 'project-payments' },
    update: { organizationId: org.id } as any,
    create: { id: 'project-payments', name: 'Payments Team', description: 'Core payments infrastructure and merchant tooling', organizationId: org.id } as any,
  });

  // ── Sprint ────────────────────────────────────────────────────────────────────
  const sprint = await prisma.sprint.upsert({
    where: { id: 'sprint-24' },
    update: {},
    create: { id: 'sprint-24', name: 'Sprint 24', status: 'active', startDate: new Date('2024-10-14'), endDate: new Date('2024-10-28'), projectId: project.id },
  });

  // ── Issues ────────────────────────────────────────────────────────────────────
  const issues = [
    { id: 'STR-439', title: 'Investigate failed payout transactions for JP region', status: 'in-progress', priority: 'urgent', estimate: 8, assigneeId: alex.id, creatorId: alex.id, projectId: project.id, sprintId: sprint.id, labels: ['Incident'], organizationId: org.id },
    { id: 'STR-441', title: 'Draft Q3 merchant fee policy updates', status: 'in-progress', priority: 'medium', estimate: 3, assigneeId: jordan.id, creatorId: alex.id, projectId: project.id, sprintId: sprint.id, labels: ['Legal'], organizationId: org.id },
    { id: 'STR-442', title: 'Refactor Stripe webhook signature validation', status: 'todo', priority: 'medium', estimate: 5, assigneeId: alex.id, creatorId: jordan.id, projectId: project.id, labels: ['Backend'], organizationId: org.id },
    { id: 'STR-445', title: 'Update invoice template with new brand assets', status: 'todo', priority: 'low', estimate: 2, creatorId: morgan.id, projectId: project.id, sprintId: sprint.id, labels: ['Design'], organizationId: org.id },
    { id: 'STR-448', title: 'Apple Pay integration for recurring subscriptions', status: 'in-progress', priority: 'high', estimate: 5, assigneeId: morgan.id, creatorId: alex.id, projectId: project.id, sprintId: sprint.id, labels: ['iOS', 'Backend'], organizationId: org.id },
  ];

  for (const issue of issues) {
    await prisma.issue.upsert({ where: { id: issue.id }, update: { organizationId: org.id } as any, create: issue as any });
  }

  // ── Document ──────────────────────────────────────────────────────────────────
  await prisma.document.upsert({
    where: { id: 'doc-checkout' },
    update: { organizationId: org.id } as any,
    create: { id: 'doc-checkout', title: 'Mobile Checkout Redesign — Spec v2', emoji: '📱', status: 'draft', authorId: alex.id, projectId: project.id, organizationId: org.id, content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Spec content here.' }] }] } } as any,
  });

  // ── Notifications ─────────────────────────────────────────────────────────────
  const notifTypes = [
    { type: 'assigned', title: 'New issue assigned to you', body: 'Alex assigned STR-448 to you', userId: morgan.id, issueId: 'STR-448' },
    { type: 'mention', title: 'You were mentioned', body: 'Jordan mentioned you in STR-441', userId: alex.id, issueId: 'STR-441' },
    { type: 'review', title: 'Review requested', body: 'Morgan requested your review on STR-445', userId: jordan.id, issueId: 'STR-445' },
  ];

  for (const n of notifTypes) {
    const exists = await prisma.notification.findFirst({ where: { userId: n.userId, type: n.type } });
    if (!exists) await prisma.notification.create({ data: n });
  }

  console.log(`Seed complete — org: ${org.slug} (${org.id})`);
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
