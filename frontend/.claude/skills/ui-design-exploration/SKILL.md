---
name: ui-design-exploration
description: Senior UI/UX design exploration skill for generative design research and concept development. Use when exploring design directions, generating multiple visual concepts, defining page structures, applying known UI patterns, producing original proposals, building isolated prototypes, performing visual comparisons, and evaluating candidate designs. Also use when working on UX flows, information architecture, responsive layouts, accessibility, interaction design, technical feasibility assessment, design selection, and handoff to implementation. Covers moodboards, style variations, layout exploration, component composition, design rationale, trade-off analysis, and design-quality gates before committing to a final direction.
---

# UI Design Exploration

## Mission

Act as a senior UI/UX design explorer.

The goal is to move from a vague brief to a small, well-understood, and justified set of design directions before any implementation begins. The outcome is not a single pixel-perfect screen but a clear exploration that lets the team compare options, understand trade-offs, and select a direction with confidence.

Balance:

- breadth (enough distinct directions to be meaningful);
- depth (each direction concrete enough to evaluate);
- speed (avoid over-polishing throwaway concepts);
- honesty (evaluate ideas on merit, not attachment).

Never jump straight to a single design without evidence that other options were considered.

---

## Activation Rules

Use this skill whenever a task includes or implies:

- exploring visual or layout directions for a page, screen, or component;
- generating 5–10 candidate design directions from a brief;
- defining information architecture and page structure;
- applying established UI patterns (navigation, cards, dashboards, forms, editors);
- proposing original or differentiated concepts;
- building isolated prototypes to test a concept;
- comparing designs side by side (visual comparison);
- defining UX flows and interaction behavior;
- responsive behaviour across breakpoints;
- accessibility requirements in the chosen direction;
- evaluating technical feasibility of a proposal;
- selecting a final design direction;
- handing off the selected direction to implementation.

When the brief is small and the direction is obvious, keep the exploration lightweight. When the design is ambitious, risky, or high-visibility, run the full exploration workflow.

---

# 1. Clarify the Brief Before Designing

Never start generating visuals on an ambiguous brief.

Identify:

1. Objective — what must this design achieve for the user and the product?
2. Audience — who is the primary user and what do they care about?
3. Context — where does this live (marketing, product, dashboard, editor)?
4. Constraints — brand, tokens, technical stack, existing components.
5. Success criteria — how will we know the design is good?
6. Open questions — anything that would materially change the direction.

If a decision would change the direction and is not answered, ask before designing. Do not invent critical brand or product requirements.

---

# 2. Generate Multiple Directions (5–10)

Produce a set of distinct, comparable directions.

A healthy exploration looks like:

- 5–10 directions for a page or screen;
- 3–5 directions for a smaller area or component;
- grouped by a driving idea, not superficial variation.

Make each direction differ on substance, not just color. Difference drivers include:

- layout hierarchy (single column, split, dashboard grid, editorial);
- information architecture (few vs many sections, density);
- visual tone (minimal, bold, playful, technical, premium);
- interaction model (static, animated, progressive disclosure);
- content emphasis (visual-first, typography-first, data-first);
- mood and atmosphere (calm, energetic, trustworthy, experimental).

Name each direction with a short readable label and state the core idea in one sentence.

---

# 3. Structure the Page (Information Architecture)

Before styling, define structure.

For each direction, specify:

- primary goal of the page;
- IA: sections and their order;
- hierarchy: what is most important to see first;
- entry/exit points and primary action per section;
- relationship between content types (text, code, data, media).

A good structure answers: what does the user need, in what order, with what emphasis.

---

# 4. Apply Known Patterns Intententionally

Use established patterns as a baseline, and deviate deliberately.

Recognized patterns to draw from:

- navigation: top bar, bottom bar (mobile), sidebar, breadcrumbs, tabs;
- content: cards, lists, tables, grids, feeds;
- data: dashboards, metrics, progress, charts;
- forms: single-column, grouped, wizard, inline validation;
- editors: code editors, rich text, split panes;
- feedback: toasts, banners, modals, inline states.

For each pattern used, note what it solves and why it fits. Do not use a pattern just because it is familiar — choose it because it serves the structure.

---

# 5. Produce Original Proposals

Derive at least one direction that is not a direct reuse of a common template.

An original proposal typically:

- recombines familiar patterns in a new way;
- rethinks the hierarchy or interaction model;
- introduces a signature visual or interaction element;
- reframes what the user perceives as the primary surface.

Originality must serve the objective, not decoration. An original idea that ignores usability is a failed proposal.

---

# 6. Build Isolated Prototypes

Turn the most promising directions into testable artifacts.

Prototype level depends on confidence:

- low confidence / high risk: throwaway HTML/CSS, static mockups, wireframes;
- medium confidence: interactive prototype of the core flow;
- high confidence: refined prototype at target resolution.

Prototypes should be isolated: no production code, no full app. They exist to validate a concept quickly.

---

# 7. Visual Comparison

Compare directions side by side against the same criteria.

Evaluate each direction on:

- clarity — is the purpose instantly understood?
- hierarchy — is the important content emphasized correctly?
- usability — will the user complete the goal easily?
- accessibility — does it meet contrast, focus, and keyboard requirements?
- responsiveness — does it hold up at mobile, tablet, and desktop?
- performance — is it cheap to render (no gratuitous graphics)?
- brand fit — does it feel like the product?
- differentiation — does it stand out or look generic?
- implementation cost — how hard is it to build and maintain?

Use a simple score or ranked list. Be explicit about trade-offs: one direction may win on wow factor but lose on implementation cost.

---

# 8. Evaluate UX and Interaction

For the leading directions, validate the experience:

- user flow: is the path to the goal short and clear?
- states: idle, hover, focus, active, disabled, loading, error, empty;
- feedback: does the user always know what happened?
- error handling: are failures explained and recoverable?
- keyboard navigation and focus order;
- touch targets and interaction affordances.

A direction can look good and still fail on interaction. Evaluate both.

---

# 9. Evaluate Responsive and Accessibility

Every direction must be evaluated at:

- mobile (320px–639px);
- tablet (640px–1023px);
- desktop (1024px+).

Accessibility minimum:

- WCAG 2.1 AA contrast;
- visible focus;
- keyboard operable;
- semantic HTML;
- `prefers-reduced-motion` respected;
- ARIA only where needed.

A design that only works at desktop, or that ignores accessibility, should be flagged and corrected or dropped.

---

# 10. Evaluate Technical Feasibility

Confirm the leading direction can be built within the stack.

Check:

- available component library and design tokens;
- whether the layout needs new primitives;
- whether animations are CSS or require a library;
- data load and rendering cost;
- maintainability and reusability of the pieces.

If a direction requires substantial new infrastructure, note it as a cost. If it is infeasible, drop or simplify it.

---

# 11. Select a Direction

Select a final direction with explicit reasoning.

Record:

- selected direction and why;
- criteria it scored highest on;
- trade-offs accepted;
- rejected directions and the reason each was rejected;
- any hybrid merging of two directions.

The selection must be defensible, not an aesthetic preference presented as fact.

---

# 12. Handoff to Implementation

Produce a handoff that lets implementation proceed without guessing.

Handoff includes:

- selected direction and rationale;
- page structure and IA;
- layout at each breakpoint;
- component list and responsiblity;
- states and interactions;
- design tokens used;
- accessibility requirements;
- open items and decisions still needed.

The handoff should be specific and actionable. It must allow an implementation agent to build without reconstructing design intent from assumptions.

---

## Quality Gates

Before declaring the exploration complete:

- the brief was clarified and ambiguous decisions resolved;
- 5–10 directions were produced and named;
- each direction has a stated core idea;
- page structure and IA were defined;
- known patterns were used intentionally;
- at least one original proposal exists;
- leading directions were prototyped;
- visual comparison used explicit criteria;
- UX flow and states were evaluated;
- responsive and accessibility were evaluated;
- technical feasibility was confirmed;
- a final direction was selected with reasoning recorded;
- handoff documentation is complete.

---

## Final Output

The exploration should end with a clear, structured result that answers:

- what was explored;
- what was compared;
- what was selected;
- why;
- what is needed to implement it.

The deliverable is a decision, not just a collection of pretty screens.

---

End of UI Design Exploration skill.
