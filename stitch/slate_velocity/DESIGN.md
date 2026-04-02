# The Architectural Intent: A Design System for Fluid Productivity

## 1. Overview & Creative North Star
**The Creative North Star: "The Digital Atelier"**

This design system rejects the cluttered, industrial complexity of legacy project management tools. Instead, it adopts the persona of a high-end architectural studio: a space that is intentionally sparse, hyper-organized, and premium. We are building the "anti-Jira"—a workspace that feels as calm as a blank sheet of heavy-stock paper but possesses the underlying power of a high-performance engine.

The system breaks the "template" look by prioritizing **intentional asymmetry** and **tonal depth** over rigid grids and lines. By leveraging expansive whitespace (using the `20` and `24` spacing tokens) and sophisticated editorial typography, we transform a utility tool into a signature experience.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a "cool-neutral" base, punctuated by high-chroma accents that signal intent and AI-driven intelligence.

### The "No-Line" Rule
To achieve a high-end editorial feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must never be structural; they must be perceived. Define regions through:
- **Tonal Shifts:** Placing a `surface_container_low` sidebar against a `background` canvas.
- **Negative Space:** Using the `10` (3.5rem) spacing token to create a natural visual break.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, physical layers—like fine vellum paper. 
- **Base Layer:** `background` (#f8f9fb)
- **Primary Content:** `surface_container_lowest` (#ffffff)
- **Nested Contexts:** (e.g., a property panel inside a task) should use `surface_container` (#edeef0) to create "inset" depth without needing a stroke.

### The "Glass & Gradient" Rule
For elements that exist "above" the workflow (modals, command bars, AI suggestions), use **Glassmorphism**:
- **Token:** `surface_container_lowest` at 80% opacity.
- **Effect:** 20px Backdrop Blur.
- **CTA Soul:** Primary actions should use a subtle linear gradient from `primary` (#0058be) to `primary_container` (#2170e4) at a 135° angle. This adds a "lithographic" depth that flat hex codes lack.

---

## 3. Typography: The Editorial Engine
We utilize a dual-font strategy to separate "The System" (Navigation/UI) from "The Work" (Documentation/Content).

| Level | Token | Font | Size | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Inter | 3.5rem | High-impact, low-information-density headers. |
| **Headline** | `headline-md` | Inter | 1.75rem | Bold, authoritative section titles. |
| **Title** | `title-lg` | Newsreader* | 1.375rem | Used for Document Titles to feel like a published essay. |
| **Body** | `body-lg` | Newsreader* | 1.0rem | The primary reading experience. High legibility, serif warmth. |
| **Label** | `label-md` | Inter | 0.75rem | UI metadata, buttons, and keyboard hints. |

*\*Newsreader/Lora acts as our "high-end" surrogate for document body text, providing a humanistic contrast to the precision of Inter.*

---

## 4. Elevation & Depth
In this system, elevation is a product of light and layering, not shadows.

- **The Layering Principle:** Avoid `elevation-1` shadows. Instead, place a `surface_container_lowest` card on a `surface_container_low` background. This "Tonal Lift" is cleaner and more modern.
- **Ambient Shadows:** Only for floating elements (Command Palette, Popovers). Use a 4% opacity shadow with a 40px blur, tinted with `surface_tint` (#005ac2). It should feel like a soft glow, not a dark smudge.
- **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., input fields), use `outline_variant` at **20% opacity**. Never use a 100% opaque border.

---

## 5. Signature Components

### Buttons: The Tactile Command
- **Primary:** Gradient-filled (`primary` to `primary_container`), `DEFAULT` (0.5rem) roundedness. 1.4rem horizontal padding.
- **Secondary:** Transparent background with a `Ghost Border`.
- **AI Action:** `secondary` (#6b38d4) background with a subtle "shimmer" animation—this signals the "Violet" AI thread of the system.

### The Command Bar (AI-Native)
A floating `xl` (1.5rem) rounded container using Glassmorphism. This is the heart of the "keyboard-centric" experience. Every action should have a `label-sm` keyboard hint (e.g., `⌘K`) in `on_surface_variant`.

### Cards & Lists (The Anti-Grid)
- **No Dividers:** Prohibit the use of lines between list items. Use `spacing-2` to separate items and a subtle `surface_container_high` hover state.
- **Asymmetric Metadata:** In a list item, place the title on the left and metadata (status/owner) slightly offset to create an editorial layout rather than a spreadsheet row.

### Status Indicators (High-Performance Signals)
- **In-Progress:** `Orange` (#F59E0B) soft-glow dot.
- **Urgent:** `Red` (#EF4444) pill with `on_error_container` text.
- **The AI "Spark":** A violet-tinted micro-interaction that appears when the AI is "reading" a document block.

---

## 6. Do’s and Don’ts

### Do
- **Use "Aggressive" Whitespace:** If you think there’s enough space, add one more spacing unit (`3` to `4`).
- **Leverage Serif for Long-Form:** Use the Newsreader/Lora scale for any text longer than two sentences.
- **Keyboard-First:** Ensure every primary action has a visible (but subtle) keyboard shortcut hint.

### Don't
- **Don't use 1px Borders:** Never "box in" your content. Let the surfaces breathe.
- **Don't use Pure Black:** Use `on_surface` (#191c1e) for text to maintain the "calm" atmosphere.
- **Don't Over-Animate:** Transitions should be fast (200ms) and linear-out. The system must feel "fast and opinionated," not heavy or "bouncy."

---

## 7. Interaction Note
The "Performance" aspect of this system comes from its responsiveness. Hover states should be instant. Surfaces should transition via opacity, not movement, to maintain the feeling of a stable, high-performance workspace. When the AI is active, the `secondary_container` color should subtly pulse, indicating the "brain" of the workspace is engaged.