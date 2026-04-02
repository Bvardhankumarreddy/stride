# Jira + Confluence Alternative — Figma Design Specification
> One workspace for project management, documentation, and AI — fast, simple, opinionated.

---

## 1. Past → Present → Future Analysis

### Past (2002–2015): The Enterprise Bureaucracy Era

**What Jira was built for:**
- Jira launched in 2002 for bug tracking in waterfall software teams
- Confluence launched in 2004 as a corporate wiki / intranet
- Both designed for large enterprises with complex approval workflows
- XML configuration files, heavyweight Java architecture, long load times
- Admins configured everything — engineers just survived

**What was painful:**
- Creating a ticket required selecting from 30 fields — most of which nobody understood
- Finding a document in Confluence required knowing it existed first
- Workflows had 8 statuses: "Open → In Analysis → In Design → Pending Dev → In Dev → In QA → In UAT → Done"
- Custom fields, screens, permission schemes, issue type schemes — a full-time admin job
- Search was notoriously broken ("JQL" — a programming language just to filter tickets)
- Confluence pages got created and never found again

---

### Present (2016–2025): The Challenger Era

**What teams do today:**
- Jira remains the default at large companies (muscle memory + procurement)
- Linear emerged (2020) — beautiful, fast, keyboard-first, opinionated — beloved by startups
- Notion (2018) — reimagined docs as databases, became the Confluence replacement
- GitHub Issues — simple, code-adjacent, but too basic for product teams
- Shortcut, ClickUp, Asana, Monday.com — all competing for the middle

**What is still painful:**
- Linear and Notion are separate tools — teams still maintain both
- AI was bolted on to Jira (Atlassian Intelligence) — it feels forced, not native
- Notion is too flexible — teams spend more time setting up workspaces than doing work
- No tool connects: roadmap → spec doc → ticket → PR → release notes automatically
- Stand-ups still require manually checking 3 places
- "What's the status of X?" still requires asking a human

**Who is winning at what:**
- Linear: best issue tracking UX — fast, clean, keyboard-first
- Notion: best doc flexibility — but becomes a mess at scale
- GitHub Projects: closest to code, but poor for non-engineers
- Nobody has nailed the combination of both with AI at the core

---

### Future (2026+): The Unified AI-Native Workspace Era

**What this product changes:**
- Docs and issues live in the same workspace — a spec doc can spawn tickets with one click
- AI fills in the details: write a one-line task → AI expands it with acceptance criteria, linked docs, estimated effort
- Roadmap is auto-generated from the tickets in progress — not a manually maintained deck
- Stand-up is replaced by an AI digest: "Yesterday: 3 tickets closed. Today: 4 in progress. Blockers: 1"
- Search is conversational: "What did we decide about the payments redesign?"
- Release notes write themselves from merged PRs and closed tickets

**Design principles:**
- **Speed first**: every action should feel instant — no spinners, no page loads
- **Minimal by default**: show less, reveal more on demand — not 40 fields on a ticket
- **AI is a teammate, not a button**: AI acts in the background, surfaces insights, suggests — never interrupts
- **Docs and issues are one thing**: a ticket can have a doc; a doc can have tickets
- **Keyboard-driven**: power users should never need a mouse

---

## 2. Design System

### Color Palette
```
Background (light mode):        #F8F9FB
Surface / Cards:                #FFFFFF
Border:                         #E4E7ED
Text Primary:                   #111827
Text Secondary:                 #6B7280
Text Muted:                     #9CA3AF

Background (dark mode):         #111318
Surface dark:                   #1A1D24
Border dark:                    #252830

Accent Blue (primary actions):  #3B82F6
Accent Violet (AI elements):    #8B5CF6
Accent Green (done/success):    #10B981
Accent Orange (in progress):    #F59E0B
Accent Red (blocked/urgent):    #EF4444
Accent Grey (backlog/default):  #9CA3AF

Priority: Urgent #EF4444 | High #F97316 | Medium #F59E0B | Low #6B7280
Status:   Todo #9CA3AF | In Progress #3B82F6 | In Review #8B5CF6 | Done #10B981 | Blocked #EF4444
```

### Typography
```
Font Family:    Inter (UI), Georgia or Lora (doc body text for readability)
Heading XL:     32px / 700 — doc titles, project names
Heading L:      24px / 600 — section headers
Heading M:      18px / 600 — card titles, issue titles
Body:           15px / 400 — descriptions, doc content
Small:          13px / 400 — metadata, timestamps, labels
Label:          12px / 500 uppercase — field labels
```

### Spacing
```
4px base unit
Card padding: 16px / 20px
List row height: 36px (compact) / 48px (comfortable)
Sidebar width: 220px (collapsed: 48px)
Right panel: 320px
Page max-width: 1280px
```

---

## 3. Screen Specifications + Figma AI Prompts

---

### Screen 1: My Work — Personal Dashboard

**What it replaces:** The Jira homepage (a confusing grid of boards and project links)

**Layout:**
- Left sidebar: navigation
- Main area top: "Good morning, Alex" greeting with date
- AI Digest card: bullet summary of team activity generated by AI
- My Issues section: grouped by status — In Progress, Up Next, Waiting for Review
- Recent Docs section: last 5 docs you viewed or edited
- Right: Team activity feed — what teammates are working on

**Key UX improvement:** Land here and know exactly what to do today. No hunting.

---

**FIGMA AI PROMPT — My Work Dashboard:**
```
Design a clean, modern project management dashboard (light mode) called "My Work" — the personal home screen.

Left sidebar (220px, white background with subtle right border):
- App logo top left (abstract mark + "Plane" wordmark)
- Navigation items with icons: My Work (active), Inbox, Projects, Issues, Docs, Roadmap, Settings
- Active item: filled blue background pill, blue text
- Bottom: user avatar, name, workspace switcher

Main content area (white/light grey #F8F9FB background):

Top section:
- "Good morning, Alex" in large 28px font, today's date below
- AI Digest card (subtle violet gradient border, rounded):
  - Sparkle icon + "Your AI Digest"
  - Bullet points:
    - "3 issues closed yesterday by your team"
    - "Sprint 24 ends in 3 days — 7 issues still in progress"
    - "You have 2 issues waiting on review"
  - Very subtle, calm design

"My Issues" section:
- Section title with issue count badge
- Horizontal status filter tabs: All | In Progress (3) | Up Next (5) | Review (2) | Blocked (1)
- "In Progress" active
- Issue list rows (compact, 40px height each):
  - Priority dot (colored) | Issue ID (grey, monospace) | Title | Project badge | Due date | Assignee avatar
  - 3 rows shown
  - "View all 12 issues" link at bottom

"Recent Docs" section below:
- 5 doc items in a horizontal scroll row, each a small card:
  - Doc icon | Title | Project | Last edited time
  - Hover state: subtle elevation

Style: Bright, clean, spacious. Not Jira. Feels like a great productivity app. Minimal color, used intentionally.
```

---

### Screen 2: Project Board — Kanban View

**What it replaces:** Jira Scrum/Kanban board (slow, bloated, hard to customize)

**Layout:**
- Top bar: Project name, view switcher (Board / List / Timeline / Table), filters, "New Issue" button
- Board: Horizontal columns by status — Todo | In Progress | In Review | Done
- Cards: minimal — title, priority dot, assignee avatar, label chips
- Column header shows count and optional WIP limit indicator
- Empty states: friendly, not blank — "Drop issues here or create one"

**Key UX improvement:** Cards are scannable in 1 second. No noise. Click to expand.

---

**FIGMA AI PROMPT — Project Kanban Board:**
```
Design a clean, modern Kanban board for a project management app (light mode).

Top navigation bar:
- Back arrow + "Payments Team" project name with team avatar
- View switcher tabs: Board (active, underlined) | List | Timeline | Table
- Right side: Filter button, Group by dropdown, "New Issue" blue button

Board area (full width, horizontal scroll):
4 columns, each ~280px wide, with small gap between:

Column structure for each:
- Column header: Status name in colored text (grey/blue/purple/green), issue count badge, "+" add button
- Issues stack vertically as cards

"To Do" column (grey header):
- 4 issue cards

"In Progress" column (blue header, WIP limit bar showing 3/5):
- 3 issue cards, one highlighted with blue left border

"In Review" column (purple header):
- 2 issue cards

"Done" column (green header):
- 5 issue cards, slightly desaturated/faded

Issue card design (white, subtle shadow, rounded 8px):
- Priority colored dot (top right: red/orange/yellow/grey)
- Issue title (15px, 2 lines max)
- Bottom row: Issue ID (grey, small) | Label chip(s) | Assignee avatar (right)
- Hover: subtle elevation increase, blue border appear

One card in "In Progress" is expanded slightly to show: description snippet, due date badge, linked PR badge

Empty column example: "Done" shows "🎉 Drop issues here" placeholder text

Style: Lots of white space. Cards feel light. Status colors are used only in column headers and priority dots, not on the cards themselves. Similar to Linear's aesthetic.
```

---

### Screen 3: Issue Detail View

**What it replaces:** Jira issue view (cramped, 40+ fields, constant page reloads)

**Layout:**
- Left (65%): Title (editable inline), description (rich text editor), sub-tasks, activity log
- Right (35%): Compact metadata panel — status, priority, assignee, project, sprint, labels, dates
- "Linked Items" section in right: linked docs, linked PRs, linked issues, linked deploys
- AI Panel at bottom of right: "AI Actions" — generate acceptance criteria, summarize thread, find similar issues
- Breadcrumb: Project > Epic name > INC-482

**Key UX improvement:**
- Feels like editing a Google Doc — not filling out a form
- Right panel is compact — only 8 fields max, not 40
- AI generates acceptance criteria from a one-line title

---

**FIGMA AI PROMPT — Issue Detail View:**
```
Design a clean, modern issue detail page for a project management app (light mode).

Full-page layout with subtle left sidebar visible (collapsed, icon-only).

Top breadcrumb: Payments Team > Sprint 24 > INC-482
Top right actions: "Open in full page" | "Copy link" | "..." more | "X" close (this is a slide-over panel)

Left content area (65%):
- Large editable title (24px, bold): "Redesign checkout flow for mobile"
- Status pills row: Blue "In Progress" dropdown | Orange "High" priority | "Feature" type badge | Assignee avatar chip
- Rich text editor for description:
  - Shows formatted content: a paragraph of text, then a bullet list of requirements
  - Subtle toolbar appears on hover/selection (Bold, Italic, Link, Code, mention @)
- "Sub-tasks" section: collapsible, showing 3 sub-tasks as compact checkboxes with titles
- Activity section: mix of comments and system events (status change, PR linked, assignment)
  - Comment with avatar, relative time, text
  - System event: smaller text, muted color ("Linked PR #892 — @alex")
- Text area at bottom to add comment

Right metadata panel (35%, subtle grey background #F8F9FB, rounded left border):
- Sections with compact label+value rows:
  - Status: "In Progress" blue dropdown
  - Priority: orange dot + "High"
  - Assignee: avatar + "Alex Kim" + change link
  - Project: Payments Team badge
  - Sprint: Sprint 24
  - Due date: date picker — shows "Mar 28"
  - Labels: "mobile" chip, "ux" chip, "+ add" link

  Divider

  "Linked Items" section:
  - PR icon: "#892 Checkout redesign — Open" (green dot)
  - Doc icon: "Mobile Checkout Spec" with link
  - "Link item" button

  Divider

  AI Actions card (violet gradient border):
  - Sparkle icon + "AI Actions"
  - Three action buttons (outline style):
    - "Generate acceptance criteria"
    - "Find similar issues"
    - "Summarize comments"

Style: Minimal form factor. No wasted space but not cramped. Light grey right panel creates clear content hierarchy. Feels fast and modern.
```

---

### Screen 4: Document Editor

**What it replaces:** Confluence (cluttered, hard to navigate, bloated editor)

**Layout:**
- Full-width centered editor (max 740px content width) — like Notion but faster
- Top: Breadcrumb path, last edited time, collaborator avatars (live presence dots), Share button
- Title: Large, single H1 — editable directly
- Body: Clean rich text — headings, bullets, callouts, code blocks, tables, embeds
- Right margin: floating comment bubbles (inline comments on selected text)
- Left margin: block drag handles appear on hover
- Slash command: type "/" → menu of block types

**Key UX improvement:**
- "/" command is the entire formatting interface — no toolbar to learn
- Inline tickets: @-mention an issue → it embeds as a live card in the doc
- "Create tickets from this doc" — select any section → "Turn into issue"

---

**FIGMA AI PROMPT — Document Editor:**
```
Design a clean, minimal document editor page for a project management + docs app (light mode).

Top bar (white, thin border bottom):
- Left: Breadcrumb — "Payments Team > Specs > Mobile Checkout Redesign"
- Center: Last saved indicator "Saved 2 min ago" in small grey text
- Right: 3 small collaborator avatar circles (with colored presence borders), "Share" button, "Publish" button

Document area (centered, max-width 740px, white background):
- Large page icon above title (emoji-style: 📱)
- H1 title: "Mobile Checkout Redesign — Spec v2" (32px, bold, editable)
- Metadata row below title: Author avatar + name, Created date, Status badge "Draft"

Document body content:
- H2 heading: "Overview"
  - Paragraph of body text (2-3 lines)

- H2 heading: "Goals"
  - Bulleted list (3 items)
  - One bullet has an inline comment indicator (orange dot on right margin, partially visible)

- H2 heading: "Scope"
  - A callout block (light yellow background, ⚠️ icon): "This redesign affects the iOS app only in Q1"

- H2 heading: "Tasks"
  - Two embedded issue cards (like Notion linked databases):
    - Each card: issue ID + title + status badge + assignee avatar
    - Cards have light blue-grey background, rounded
  - Below: "Create new issue from this doc +" link in muted text

- A code block: dark background, monospace font, short API example

Floating slash command menu (show as overlay mid-page):
- Clean dropdown: "/ — Insert block"
- Menu items: Heading 1, Heading 2, Bulleted List, Numbered List, Callout, Code Block, Issue, Table, Divider
- One item highlighted in blue

Right margin: One inline comment indicator (small orange circle) floating beside the text it's on.

Style: Notion-like cleanliness. No sidebar clutter. Just the document. Comfortable reading line length. Georgia or similar for body text feels editorial.
```

---

### Screen 5: Roadmap View

**What it replaces:** Manually maintained spreadsheets or Jira Advanced Roadmaps (requires Premium, confusing)

**Layout:**
- Top: Time axis (months), zoom controls (Quarter / Month / Week), "Export" button
- Left column: Epics list with color dots
- Timeline bars: draggable, resizable horizontal bars per epic
- Milestone markers: diamonds on the timeline
- Below timeline: "Now" vertical line
- Group by options: Team / Quarter / Status

**Key UX improvement:** Roadmap is auto-generated from existing epics and issues — not a separate thing you maintain manually.

---

**FIGMA AI PROMPT — Roadmap Timeline View:**
```
Design a clean roadmap timeline page for a project management app (light mode).

Top bar:
- "Roadmap" page title (bold)
- Left controls: "Quarter" | "Month" (active) | "Week" zoom tabs
- Right controls: "Group by: Team" dropdown, "Filters" button, "Export" button, "New Epic" blue button

Roadmap area (full width):

Left column (200px): List of epic names with colored dot indicators:
- 🔵 Mobile Checkout Redesign
- 🟠 Auth & Security Overhaul
- 🟢 Analytics Dashboard v2
- 🟣 API Rate Limiting
- 🔴 Performance Optimization
- 🔵 Notification System

Right area: Timeline grid
- Column headers: months (Feb | Mar | Apr | May | Jun | Jul)
- Subtle vertical grid lines at month boundaries
- "Today" vertical line in blue with "Today" label at top

Timeline bars (colored, rounded pill shape, matching epic color):
- Mobile Checkout: spans Feb 15 → Apr 10, blue
- Auth & Security: spans Mar 1 → May 20, orange
- Analytics Dashboard: spans Apr 1 → Jun 30, green
- API Rate Limiting: spans Mar 15 → Apr 30, purple
- Performance: spans May 1 → Jun 15, red

- Diamond milestone markers at: Apr 10 "Q1 Release" and Jun 30 "Q2 Release"
- Bars are draggable (show drag cursor hint on one bar)
- One bar (Analytics) has a "delayed" indicator — small warning icon on the bar

One epic row is expanded (Mobile Checkout) showing child issues as smaller bars within the parent

Bottom: AI insight banner: "At current velocity, 2 epics will miss Q2 — Analytics Dashboard and Performance Optimization. Suggested adjustment shown."

Style: Clean, Gantt-chart inspired but modern. Pastel colors for bars, not neon. Feels like a premium product, not Excel.
```

---

### Screen 6: AI Command Bar + AI Write Mode

**What it replaces:** Manual ticket creation, manual doc writing, manually writing release notes

**Layout (Command Bar — full overlay):**
- Dark overlay behind
- Centered input box (wide, prominent)
- Below input: suggested actions as chips
- Results list below: contextual matches (issues, docs, people, projects)

**AI Write Mode (within doc editor):**
- Side-by-side: User prompt on left, AI draft on right
- "Accept", "Regenerate", "Edit" actions
- Used for: writing spec from bullet points, expanding tickets, generating release notes

---

**FIGMA AI PROMPT — AI Command Bar:**
```
Design a command bar overlay for a project management app — the universal AI-powered search and action interface.

Full screen with dark semi-transparent overlay (#000 at 50% opacity) behind.

Center: Large command bar card (640px wide, white, 16px rounded corners, subtle shadow):

Top: Search/command input (full width, 52px height):
- Left: Colorful AI sparkle icon (violet/blue gradient)
- Input placeholder: "Search, create, or ask anything..."
- Right: "esc to close" small grey text
- Input has focus ring in violet

Below input, two sections:

Section 1 "Quick Actions" (if input is empty):
- Row of action chips:
  - "+ New Issue" (blue)
  - "+ New Doc" (grey)
  - "📊 This week's summary" (violet, AI)
  - "🚀 Generate release notes" (violet, AI)

Section 2 "Recent" (if input is empty, show recents):
- 4 result rows, each: icon | title | subtitle | keyboard shortcut (right)
- Types: issue (square icon), doc (page icon), project (folder icon), person (@)

Typed state (show input filled with "generate release notes for sprint 24"):
- AI badge "AI Action" shown
- Single result row: sparkle icon + "Generate release notes for Sprint 24 — AI will summarize 14 closed issues"
- "Press Enter to run" hint

Below the card: "Tip: Use @ to mention people, # to reference issues, / for commands"

---

Also design: AI Writing Assistant panel (show as secondary frame):
- Split panel design (light mode)
- Left: "Your prompt" (smaller, grey background): text input with bullet points the user wrote
- Right: "AI Draft" (white): formatted content generated, with subtle violet left border
- Bottom action row: "Accept all" (blue filled) | "Regenerate" (outline) | "Edit" (outline)
- Small text: "AI-generated — review before saving"

Style: Fast, clean, trustworthy. Not gimmicky. The command bar feels like a natural extension of the keyboard.
```

---

### Screen 7: List View (Power User View)

**What it replaces:** Jira's backlog view + table view (slow, clunky, hard to bulk edit)

**Layout:**
- Dense table with sortable columns
- Inline editing: click any cell to edit directly
- Bulk selection: checkbox on left, action bar appears at top when items selected
- Grouping: by sprint, epic, status, assignee
- Column picker: show/hide columns

**Key UX improvement:** Feels like a spreadsheet, but it's a ticket manager. Excel-familiar for PMs.

---

**FIGMA AI PROMPT — Issue List View:**
```
Design a dense, spreadsheet-style issue list view for a project management app (light mode).

Top bar:
- "Issues" title with issue count (142)
- View switcher: Board | List (active, underlined) | Timeline | Table
- Filter chips: "Sprint 24 ×" | "Assignee: Me ×" | "+ Add filter"
- Right: "Group by: Status" dropdown, "Columns" button, "Export" button

Table area:
- Column headers (sticky): ☐ checkbox | Priority | ID | Title | Status | Assignee | Sprint | Due Date | Labels | Estimate
- Column headers have subtle sort arrows, drag handles

Row groups (collapsed/expanded):
- Group header row: "▼ In Progress (8)" — blue text, light blue background, full width
- 5 issue rows under it
- Group header row: "▼ To Do (14)" — grey text

Issue row design (36px height, alternating subtle stripe):
- Checkbox (left) | Priority dot (colored circle) | ID "INC-482" (grey, monospace, 10%) | Title (30%) | Status badge (10%) | Assignee avatar+name (15%) | Sprint chip (10%) | Due date (10%) | Label chips (10%) | Estimate (5%)

One row is selected (blue checkbox, entire row has blue-tinted background).
Bulk action bar appears at top when selected: "1 selected — Change status | Reassign | Move to sprint | Delete"

Inline edit state: One cell (status) is clicked and shows a dropdown menu appearing in place.

At bottom: "Load 25 more" link | Pagination info "Showing 25 of 142"

One row at the top has a red "Blocked" status badge and a subtle red tint on the priority cell.

Style: Functional, dense, but not ugly. Clean lines. Hover states on rows. This is for power users who live in this view.
```

---

## 4. Navigation Structure

```
Sidebar Navigation:
├── My Work (personal dashboard)
├── Inbox (mentions, assignments, notifications)
├── Projects
│   ├── Payments Team
│   ├── Mobile App
│   ├── Platform Infra
│   └── + New Project
├── Issues (cross-project view)
├── Docs
│   ├── Company Wiki
│   ├── Team Spaces
│   └── My Docs
├── Roadmap
├── Sprints
└── Settings
    ├── Workspace
    ├── Members & Roles
    ├── Integrations (GitHub, Slack, Figma, Linear import...)
    └── AI Settings
```

---

## 5. Key Interaction Patterns

### Keyboard-First
```
⌘K          — Open command bar
⌘N          — New issue (from anywhere)
⌘⇧N         — New doc
⌘/          — Focus search
C           — Create issue (on board view)
T           — Toggle title edit (on issue)
E           — Edit description
Space       — Open issue detail (from list)
⌘↵          — Save and close
```

### Inline Creation
- Click "+ Add issue" at bottom of any column or group
- Type title → press Enter → issue created instantly
- No modal, no form, no page load

### @-Mentions and # References
- @person → notify and assign
- #issue-id → embed live issue card
- /doc → link a document inline

---

## 6. What Changes from Jira / Confluence

| Pain Point Today | How This Solves It |
|---|---|
| 40 required fields to create a ticket | 1 field (title) — AI suggests the rest |
| JQL to filter issues | Natural language: "my issues due this week" |
| Confluence separate from Jira | Docs live in same sidebar as issues |
| Roadmap is a manual slide deck | Auto-generated from epics and milestones |
| Stand-up = reading tickets aloud | AI digest: "Here's what your team did yesterday" |
| Release notes = hours of work | AI generates from closed tickets in one click |
| Ticket estimation = guessing | AI suggests based on historical similar issues |
| Onboarding takes 2 weeks | Opinionated defaults — works day one |

---

## 7. Onboarding Flow Specification

**Screen 1 — Welcome:**
- "What kind of team are you?" — Software / Design / Marketing / Operations
- Single question, visual option cards

**Screen 2 — Import:**
- "Start fresh" or "Import from Jira / Linear / Asana / Notion"
- One-click import shows preview before confirming

**Screen 3 — Invite:**
- Paste emails or share link
- "Your team will get a 14-day free trial"

**Screen 4 — First Issue:**
- Guided: "Create your first issue"
- AI suggests title completions as you type
- Shows the board populating live

---

**FIGMA AI PROMPT — Onboarding Welcome Screen:**
```
Design a clean, friendly onboarding screen for a project management app (light mode).

Centered layout, max 560px wide, lots of white space.

Top: App logo (abstract mark + "Plane" wordmark) — centered

Big heading (32px bold): "What kind of team are you?"
Subtext (16px grey): "We'll set up your workspace based on your team type"

4 option cards in 2x2 grid:
Each card: 120px x 120px, rounded 16px, white with subtle border, hover state shows blue border
- 💻 Software Engineering
- 🎨 Design & Product
- 📢 Marketing
- ⚙️ Operations

Below grid: Small text link "Skip — I'll set up manually"

Progress indicator at bottom: 4 dots, first one filled blue (step 1 of 4)

"Continue" blue button (full width, 52px height) below cards — disabled until selection made

Background: Very light grey #F8F9FB. The centered card floats on it.

Style: Friendly, not corporate. Feels like a modern consumer app, not an enterprise tool.
```

---

*Spec Version 1.0 — Generated 2026-03-23*



Name	Why
Stride	Moving forward. Fast, purposeful, positive. Docs + issues + progress.
Craft	Building things together. Work feels intentional, not bureaucratic.
Slate	Clean slate — the anti-Jira. Write docs, track work, start fresh.
Axis	The center around which all work revolves. Projects, docs, roadmap.
Brief	Keep it short. Fast, minimal, anti-bloat — the opposite of Jira/Confluence.
Sage	Wise, AI-native. Knows your team's context, suggests, remembers.
Weave —	Docs and issues woven together. Collaborative, creative, integrated.


Frontend
Layer	Choice	Why
Framework	Next.js + TypeScript	Same stack, consistent team skills
Styling	Tailwind CSS	Rapid UI, light mode first
Doc Editor	TipTap	Powers Notion-like editing, slash commands, embeds
Real-time Collab	Liveblocks or PartyKit	Google Docs-style multiplayer presence
State	Zustand	Simple, no boilerplate
Drag & Drop (kanban)	dnd-kit	Best-in-class, accessible


Backend
Layer	Choice	Why
Primary API	Node.js + NestJS	Faster dev velocity for CRUD-heavy app
Real-time / Collab	Liveblocks (managed) or Y.js + WebSockets	CRDT for conflict-free doc editing
AI Features	Python (FastAPI)	Claude API for ticket generation, doc writing
Background Jobs	BullMQ (Redis-backed)	Email digests, AI summaries, notifications
Auth	Clerk	Built-in org/team management

Database
Layer	Choice	Why
Primary (issues, docs, users)	PostgreSQL	Everything structured lives here
Doc Storage	PostgreSQL (JSONB)	Flexible doc content without separate DB
Caching + Sessions	Redis	Fast lookups, presence indicators
Search	Typesense	Self-hosted, instant search across issues + docs


NextAuth v5 + JWT + Prisma + SQLite
Zustand (kanban state + notifications)
Tiptap rich text editor
⌘K command bar
Vitest unit tests + Playwright e2e tests
Next.js 16 proxy (auth guard)


Phase 1 — Core API (NestJS)

Set up NestJS monorepo alongside the Next.js app
Migrate SQLite → PostgreSQL (prod-ready)
REST/GraphQL endpoints for: Issues, Projects, Sprints, Docs, Comments, Users
Connect Next.js frontend to NestJS API (replace static mock data)

Phase 2 — AI Service (FastAPI + Claude)

Python FastAPI microservice
Claude API integration for:
Generate acceptance criteria from issue title
Summarize comments on an issue
Find similar/duplicate issues
AI daily digest (sprint health, blockers)
Generate release notes from sprint

Phase 3 — Background Jobs (BullMQ + Redis)

Redis setup
Job queues for:
Email digests (morning summary)
AI summaries triggered on sprint close
Notification fan-out
Webhook events (GitHub PR links)
Phase 4 — Search (Typesense)

Self-hosted Typesense
Index issues + docs
Wire up the /search page to real results