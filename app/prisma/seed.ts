import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";

const adapter = new PrismaLibSql({
  url: `file:${path.resolve(process.cwd(), "prisma/dev.db")}`,
});
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  // Users
  const alex = await prisma.user.upsert({
    where: { email: "alex@stride.app" },
    update: {},
    create: {
      name: "Alex Rivera",
      email: "alex@stride.app",
      password: await hash("password123", 12),
      initials: "AR",
      role: "admin",
    },
  });

  const jordan = await prisma.user.upsert({
    where: { email: "jordan@stride.app" },
    update: {},
    create: {
      name: "Jordan Lee",
      email: "jordan@stride.app",
      password: await hash("password123", 12),
      initials: "JL",
      role: "member",
    },
  });

  const morgan = await prisma.user.upsert({
    where: { email: "morgan@stride.app" },
    update: {},
    create: {
      name: "Morgan Kim",
      email: "morgan@stride.app",
      password: await hash("password123", 12),
      initials: "MK",
      role: "member",
    },
  });

  // Project
  const project = await prisma.project.upsert({
    where: { id: "payments-team" },
    update: {},
    create: {
      id: "payments-team",
      name: "Payments Team",
      description: "Core payments platform and checkout flows",
    },
  });

  // Sprint
  const sprint = await prisma.sprint.upsert({
    where: { id: "sprint-24" },
    update: {},
    create: {
      id: "sprint-24",
      name: "Sprint 24",
      status: "active",
      projectId: project.id,
    },
  });

  // Issues
  const issues = [
    { id: "STR-439", title: "Investigate failed payout transactions for JP region", status: "in-progress", priority: "urgent", assigneeId: alex.id, sprintId: sprint.id, labels: '["Incident"]', estimate: 8 },
    { id: "STR-441", title: "Draft Q3 merchant fee policy updates", status: "in-progress", priority: "medium", assigneeId: jordan.id, sprintId: sprint.id, labels: '["Legal"]', estimate: 3 },
    { id: "STR-448", title: "Apple Pay integration for recurring subscriptions", status: "in-progress", priority: "high", assigneeId: morgan.id, sprintId: sprint.id, labels: '["iOS","Backend"]', estimate: 5 },
    { id: "STR-442", title: "Refactor Stripe webhook signature validation", status: "todo", priority: "medium", assigneeId: alex.id, sprintId: null, labels: '["Backend"]', estimate: 5 },
    { id: "STR-445", title: "Update invoice template with new brand assets", status: "todo", priority: "low", assigneeId: null, sprintId: sprint.id, labels: '["Design"]', estimate: 2 },
    { id: "STR-430", title: "Audit log for manual ledger adjustments", status: "in-review", priority: "medium", assigneeId: morgan.id, sprintId: sprint.id, labels: '["Compliance"]', estimate: 5 },
    { id: "STR-422", title: "Migrate legacy payout engine to v3 API", status: "done", priority: "high", assigneeId: jordan.id, sprintId: sprint.id, labels: '[]', estimate: 13 },
  ];

  for (const issue of issues) {
    await prisma.issue.upsert({
      where: { id: issue.id },
      update: {},
      create: {
        id: issue.id,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        estimate: issue.estimate,
        labels: issue.labels,
        projectId: project.id,
        sprintId: issue.sprintId ?? undefined,
        assigneeId: issue.assigneeId ?? undefined,
        creatorId: alex.id,
      },
    });
  }

  // Document
  await prisma.document.upsert({
    where: { id: "mobile-specs" },
    update: {},
    create: {
      id: "mobile-specs",
      title: "Mobile Checkout Redesign — Spec v2",
      emoji: "📱",
      status: "draft",
      authorId: alex.id,
      projectId: project.id,
      content: JSON.stringify({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "The objective of this redesign is to reduce friction during the mobile payment phase." }] },
        ],
      }),
    },
  });

  // Notifications
  const notifData = [
    { type: "mention", title: `Jordan Lee mentioned you in STR-439`, body: "@alex can you take a look at the JP payout failures?", userId: alex.id, issueId: "STR-439", read: false },
    { type: "assigned", title: "You were assigned to STR-448", body: "Apple Pay integration for recurring subscriptions — due Sept 22", userId: alex.id, issueId: "STR-448", read: false },
    { type: "review", title: "Morgan Kim requested your review on STR-430", body: "Audit log for manual ledger adjustments — PR #241 is ready.", userId: alex.id, issueId: "STR-430", read: false },
    { type: "status", title: "STR-422 was moved to Done", body: "Migrate legacy payout engine to v3 API has been completed.", userId: alex.id, issueId: "STR-422", read: true },
    { type: "ai", title: "Stride AI flagged a new blocker", body: "STR-439 has been in progress for 4 days without a status update.", userId: alex.id, issueId: null, read: true },
  ];

  for (const n of notifData) {
    await prisma.notification.create({
      data: {
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        userId: n.userId,
        issueId: n.issueId ?? undefined,
      },
    });
  }

  console.log("✅ Seed complete");
  console.log(`   Users: ${[alex, jordan, morgan].map((u) => u.email).join(", ")}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
