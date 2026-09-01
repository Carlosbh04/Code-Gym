---
name: animation-performance-engineering
description: Senior frontend animation engineering skill for designing, implementing, reviewing, debugging, and optimizing UI motion. Use when working on CSS animations, transitions, transforms, opacity, filters, shadows, layout animations, React motion, scroll-linked effects, parallax, page transitions, microinteractions, loaders, progress animations, celebratory effects, particles/confetti, or any visual interaction where rendering performance, responsive behavior, accessibility, or smoothness matters. Always analyze rendering cost before recommending an implementation; distinguish layout/reflow, paint/repaint, compositing, CPU, GPU, memory, and React rendering costs. Prefer the simplest implementation that achieves the required visual result, measure real performance when risk is meaningful, and adapt motion for mobile/tablet/desktop and prefers-reduced-motion.
---

# Animation Performance Engineering

## Mission

Act as a senior frontend rendering and motion engineer.

The goal is not merely to make an animation work. The goal is to achieve the intended visual result with the best practical balance of:

- visual quality;
- responsiveness;
- rendering cost;
- CPU/GPU/memory usage;
- battery impact on mobile devices;
- React rendering behavior;
- accessibility;
- maintainability;
- implementation complexity.

Never optimize by dogma. Do not assume that `transform`, `opacity`, GPU compositing, `will-change`, CSS, Canvas, or any library is automatically the best solution. Evaluate the concrete effect and its constraints.

---

## Activation Rules

Use this skill whenever a task includes or implies:

- animation or transition work;
- modal, drawer, menu, tooltip, accordion, tabs, toast, or overlay motion;
- page/route transitions;
- hover/focus/pressed microinteractions;
- expanding/collapsing layout;
- list enter/exit/stagger animations;
- scroll animations;
- parallax;
- sticky or scroll-linked effects;
- loading/skeleton motion;
- progress/counting animations;
- success/error feedback;
- confetti or particles;
- canvas animation;
- `requestAnimationFrame`;
- Web Animations API;
- React state used to drive animation;
- animation jank, dropped frames, flickering, flashing, lag, or high CPU/GPU use;
- responsive animation behavior;
- `prefers-reduced-motion`;
- performance review of existing motion.

When the task is low-risk and obvious, keep the analysis lightweight. When the task is expensive, continuous, layout-heavy, or reported as janky, use the full diagnostic workflow.

---

# 1. First Principle: Define the Visual Goal

Before choosing a technique, identify what the user should perceive.

Ask internally:

1. What is entering, leaving, moving, resizing, morphing, or changing state?
2. What is the intended hierarchy?
3. Is the motion decorative, explanatory, navigational, or feedback?
4. Does the animation need to interpolate real geometry, or can it be faked visually?
5. Does it run once, frequently, continuously, or for every item in a large collection?
6. Is the interaction pointer-driven, touch-driven, keyboard-driven, scroll-driven, or automatic?

Prefer the least expensive mechanism that produces the intended perception without compromising usability.

---

# 2. Rendering Pipeline

Reason using the browser rendering pipeline conceptually:

```text
Style calculation
      ↓
Layout / reflow
      ↓
Paint / repaint
      ↓
Composite
```

Do not reduce performance analysis to a simplistic "GPU vs CPU" label.

For every meaningful animation, determine which stages are likely to be invalidated and whether work can be kept out of repeated layout and paint.

## Layout / Reflow

Treat changes to geometry as potentially layout-triggering. Examples include, depending on context:

- `width`
- `height`
- `top`
- `left`
- `margin-*`
- `padding-*`
- `font-size`
- geometry-affecting layout properties

If the visual goal can be achieved with a transform without changing document geometry, prefer evaluating that option first.

## Paint / Repaint

Treat visual properties such as these as potentially paint-expensive depending on context:

- `box-shadow`
- `filter`
- backgrounds
- borders
- color changes
- complex clipping/masking

Do not claim a property always causes exactly one rendering stage. Browser behavior depends on the element, property, platform, browser, and compositing context.

## Compositing

`transform` and `opacity` are strong candidates for compositor-friendly animation, but do not assume they are free.

Evaluate:

- layer creation;
- texture size;
- memory use;
- overdraw;
- large surfaces;
- blur/filter cost;
- low-end device behavior.

---

# 3. Property Cost Analysis

When reviewing an animation, classify each animated property:

```text
Property
  ↓
Can it affect layout?
  ↓
Can it require paint?
  ↓
Can it be composited efficiently?
  ↓
What is the practical cost for this element and frequency?
```

Typical strong candidates:

```css
transform
opacity
```

Potentially expensive or layout-sensitive:

```css
width
height
top
left
margin
padding
```

Potentially paint-heavy depending on context:

```css
box-shadow
filter
backdrop-filter
complex backgrounds
```

When proposing an alternative, preserve the visual requirement as much as possible.

---

# 4. Never Say "GPU = Faster" Without Qualification

Do not recommend GPU/compositing as a universal optimization.

A compositor layer can reduce repeated layout/paint work, but layers consume memory and may introduce other costs.

Evaluate:

- how many elements are promoted;
- how large they are;
- whether they overlap;
- whether they are animated frequently;
- whether they remain promoted unnecessarily;
- device capability.

Avoid blanket rules such as:

```css
* {
  will-change: transform;
}
```

or indiscriminate layer promotion.

---

# 5. `will-change`

Treat `will-change` as a targeted hint, not a default animation utility.

Use it only when there is evidence or a concrete reason it improves a meaningful animation.

Check:

- whether the browser can already optimize the property;
- how long the element remains promoted;
- layer count;
- memory impact;
- whether the hint can be scoped to the period around the interaction.

Remove or avoid persistent `will-change` when it is no longer useful.

---

# 6. Frame Budget

Use frame timing as an engineering constraint, not a magic pass/fail threshold.

Reference values:

```text
60 FPS  ≈ 16.67 ms/frame
120 FPS ≈  8.33 ms/frame
```

Remember that the total frame includes all relevant work, not just JavaScript.

Reason about:

```text
JavaScript
+ style/layout
+ paint
+ compositing
+ browser overhead
```

A smooth animation should leave headroom rather than consuming the entire nominal frame budget.

---

# 7. Layout Thrashing / Forced Synchronous Layout

Detect patterns where writes and layout reads are interleaved repeatedly:

```js
node.style.width = '100px';
node.getBoundingClientRect();
node.style.height = '200px';
node.offsetWidth;
```

Treat repeated:

```text
write → read → write → read
```

as a potential forced-layout pattern.

Prefer:

```text
read measurements
↓
compute
↓
write changes
```

Batch DOM reads and writes where practical.

When measurements are required for an animation, consider whether a FLIP-style approach or an explicit measurement phase is appropriate.

---

# 8. FLIP

Know and evaluate:

```text
First
Last
Invert
Play
```

Use FLIP when the UI needs to visually animate a real layout change but the animation can be represented as a transform between measured states.

Do not introduce FLIP when a simple CSS transition already solves the problem. Complexity must be justified by the visual requirement.

---

# 9. Choosing the Animation Mechanism

Select the smallest appropriate tool.

## CSS

Prefer CSS for:

- simple transitions;
- state-based UI motion;
- hover/focus/pressed states;
- simple enter/exit;
- opacity/transform sequences;
- declarative effects that do not require complex runtime orchestration.

## Web Animations API

Consider WAAPI when:

- animations require runtime control;
- the animation is still fundamentally an element animation;
- imperative play/pause/reverse/finish behavior is useful;
- a library would be unnecessary overhead.

## `requestAnimationFrame`

Use for cases that genuinely require per-frame JavaScript coordination.

Do not use it merely because an effect is visually animated.

Do not call React state setters on every frame unless there is a compelling reason.

## Canvas

Consider Canvas for:

- many independent particles;
- confetti at high counts;
- particle effects;
- effects where large numbers of DOM nodes would be expensive.

Do not use Canvas when a few CSS elements can provide the same result more simply and accessibly.

## Animation libraries

Use a library only when its capabilities materially reduce complexity or provide behavior that is expensive to reproduce correctly.

Do not add a heavy library for a few simple transitions.

---

# 10. React Animation Engineering

React is not the animation engine by default.

When reviewing React animation code, ask:

- Is state changing every animation frame?
- Is that causing unnecessary reconciliation?
- Could a ref or CSS custom property be used instead?
- Is DOM mutation appropriate for the purely visual part?
- Is a component rerendering because animation state leaked into business state?
- Are effects/listeners correctly cleaned up?

Avoid patterns such as:

```js
setProgress(value);
```

inside a 60 FPS animation loop without a strong reason.

Separate:

```text
business state
vs
visual animation state
```

When possible, let CSS or the animation API own the interpolation while React controls the semantic state transition.

---

# 11. Responsive Motion

Responsive motion is part of animation engineering, not an afterthought.

Every meaningful animation must be evaluated for:

- mobile;
- tablet;
- desktop.

Consider:

- viewport width;
- available space;
- interaction model;
- touch vs hover;
- text wrapping;
- animation distance;
- duration;
- amount of simultaneous motion;
- device performance;
- orientation.

A desktop animation may need a different distance, duration, density, or even behavior on mobile.

Example reasoning:

```text
Desktop:
large drawer distance + richer motion

Mobile:
smaller travel distance + simpler motion
```

Do not create separate components solely because motion differs by breakpoint unless the interaction or structure genuinely differs.

Prefer responsive CSS and behavior changes where appropriate.

---

# 12. Touch vs Hover

Never make essential behavior depend only on hover.

For interactive motion, determine:

- pointer interaction;
- touch interaction;
- keyboard interaction;
- focus behavior.

Use hover as enhancement, not as the only way to access information or controls.

For touch devices, ensure:

- motion does not delay the interaction unnecessarily;
- targets are appropriately sized;
- swipe/drag is not the only route to an action;
- animation does not interfere with scrolling.

---

# 13. Scroll Performance

When reviewing scroll-driven effects, inspect:

- scroll event frequency;
- passive listeners;
- unnecessary synchronous work;
- `requestAnimationFrame` coordination;
- IntersectionObserver opportunities;
- excessive DOM measurements;
- scroll-linked CSS capabilities where appropriate;
- work performed on every scroll event.

Do not automatically throttle everything without understanding the required behavior.

Prefer event-independent mechanisms such as IntersectionObserver for visibility-triggered reveals when appropriate.

---

# 14. Particles and Confetti

Choose the rendering strategy based on scale.

For a small number of decorative particles:

```text
CSS / small DOM set
```

For large numbers of simultaneously animated particles:

```text
Canvas or another efficient rendering strategy
```

Evaluate:

- particle count;
- duration;
- spawn rate;
- DOM node count;
- per-frame JavaScript work;
- memory;
- mobile behavior;
- reduced-motion behavior.

Do not make celebrations so expensive that the celebration itself causes jank.

---

# 15. Filters, Blur, Shadows, and Effects

Be cautious with:

- large blur radii;
- `backdrop-filter`;
- constantly changing shadows;
- large translucent surfaces;
- multiple overlapping effects;
- full-screen effects.

When an effect is visually important but expensive:

1. determine whether it must animate continuously;
2. reduce the affected area;
3. reduce intensity during motion;
4. limit duration;
5. remove the expensive effect after the transition;
6. provide a simpler mobile version where appropriate.

Do not remove visual quality unnecessarily. Optimize the expensive part that contributes least to perception.

---

# 16. Enter / Exit Motion

For components that mount/unmount, ensure exit transitions are architecturally supported.

Consider:

- whether the element must remain mounted until the exit finishes;
- whether a CSS state transition is sufficient;
- focus behavior;
- pointer-events during exit;
- cleanup of timers/listeners;
- unmount timing.

Do not introduce complex presence-management infrastructure for a simple transition unless necessary.

---

# 17. Layout Animations

For expanding/collapsing content, determine whether the requirement is:

A. animate visual scale only;
B. animate actual layout height;
C. animate between measured layouts;
D. reveal content with clipping;
E. crossfade between states.

Do not blindly animate `height: auto` through JavaScript measurements.

Choose the strategy that best preserves:

- layout correctness;
- accessibility;
- content reflow;
- performance;
- maintainability.

---

# 18. Accessibility and Reduced Motion

Every animation system must support:

```css
@media (prefers-reduced-motion: reduce) {
  /* provide a useful reduced-motion state */
}
```

Reduced motion must not remove essential information or make the interface confusing.

When reduced motion is requested, prefer:

- instant state changes;
- minimal opacity changes where appropriate;
- reduced distance;
- no parallax;
- no decorative particle effects;
- shorter or removed transitions.

Also consider:

- focus movement;
- screen reader announcements;
- keyboard behavior;
- motion that can cause distraction or disorientation.

Motion must never be the only carrier of meaning.

---

# 19. Browser and Device Reality

Do not promise a universal rendering result from a property name alone.

When performance matters, consider:

- browser engine;
- viewport size;
- device pixel ratio;
- GPU capability;
- CPU capability;
- memory constraints;
- thermal throttling;
- battery usage;
- low-end mobile behavior.

A change that is smooth on a desktop workstation may still be expensive on a mobile device.

---

# 20. Measurement and Chrome DevTools

When there is a real or likely performance problem, measure it.

Suggested workflow:

```text
Reproduce
   ↓
Record Performance trace
   ↓
Inspect frames
   ↓
Inspect Main thread
   ↓
Inspect Layout / Paint / Composite
   ↓
Find long tasks or repeated work
   ↓
Form hypothesis
   ↓
Change implementation
   ↓
Record again
   ↓
Compare
```

Look for:

- long tasks;
- repeated layout;
- excessive paint;
- heavy JavaScript;
- frame gaps;
- large layer surfaces;
- too many animated elements;
- memory pressure;
- event handlers doing excessive work.

Do not claim that an optimization worked unless it is justified by reasoning or measurement appropriate to the task.

---

# 21. Performance Triage Levels

Classify work before overengineering it.

## LOW RISK

Examples:

- one button hover;
- simple fade;
- opacity/transform transition;
- one modal entrance.

Action:

Implement the simple approach and verify basic responsive/accessibility requirements.

## MEDIUM RISK

Examples:

- multiple animated cards;
- staggered lists;
- larger drawers;
- several simultaneous transitions;
- scroll reveals.

Action:

Choose an efficient technique and review frame cost conceptually. Measure if the effect is continuous or dense.

## HIGH RISK

Examples:

- hundreds of particles;
- continuous parallax;
- large blur/backdrop effects;
- many DOM nodes animating simultaneously;
- per-frame React state updates;
- reported jank.

Action:

Use DevTools and measure before and after optimization.

---

# 22. Anti-Patterns

Detect and challenge these when relevant:

```text
setState() every frame without justification
animating layout properties when a visual transform would work
unbounded will-change
large numbers of animated DOM nodes
expensive blur on large areas continuously
heavy box-shadow changes at high frequency
unbounded scroll-handler work
read-after-write layout thrashing
unnecessary requestAnimationFrame loops
animation libraries for trivial effects
Canvas for effects CSS can handle simply
CSS complexity for interactions that require real measurement
hover-only essential interactions
animations with no reduced-motion path
infinite decorative animations with no user value
```

Do not flag an anti-pattern merely because it exists. Explain the actual cost or risk.

---

# 23. Decision Tree

Use this internal decision process:

```text
What visual result is required?
        ↓
Can CSS solve it simply?
   ├── YES → use CSS
   └── NO
        ↓
Does runtime control matter?
   ├── YES → evaluate WAAPI
   └── NO
        ↓
Does it require per-frame JS coordination?
   ├── YES → evaluate requestAnimationFrame
   └── NO
        ↓
Is it a layout transition?
   ├── YES → evaluate measurement / FLIP
   └── NO
        ↓
Are there many particles/elements?
   ├── YES → evaluate Canvas/specialized renderer
   └── NO
        ↓
Would a library materially reduce complexity?
   ├── YES → evaluate library
   └── NO → keep implementation simple
```

Then evaluate:

```text
Performance
Responsive
Accessibility
Maintainability
```

---

# 24. Recommended Engineering Response Format

When the user asks for an animation or when reviewing an animation with meaningful performance implications, structure the response like this:

```text
Animation Analysis

Visual goal:
<what the motion is meant to communicate>

Recommended approach:
<technique>

Why:
<short engineering explanation>

Rendering cost:
<layout / paint / composite assessment>

CPU / GPU / memory:
<practical assessment>

Responsive:
<mobile / tablet / desktop considerations>

Accessibility:
<prefers-reduced-motion and interaction considerations>

Risk:
LOW | MEDIUM | HIGH

Measurement needed:
YES | NO
```

Do not produce a long report for a trivial animation. Use the level of detail appropriate to the actual risk.

---

# 25. Implementation Rules

When implementing an animation:

1. Preserve the intended visual behavior.
2. Prefer the simplest appropriate mechanism.
3. Avoid unnecessary layout work.
4. Avoid unnecessary per-frame JavaScript.
5. Keep business state separate from visual interpolation.
6. Make the interaction responsive from the first implementation.
7. Support keyboard and touch interaction where relevant.
8. Support reduced motion.
9. Clean up timers, listeners, animation frames, observers, and temporary layers/state.
10. Measure when the effect is complex, continuous, dense, or reported as slow.
11. Re-check the result after optimization.
12. Do not add a dependency unless its benefit justifies the cost.

---

# 26. Review Checklist

Before declaring an animation complete, check:

### Visual

- Intended motion is achieved.
- Entry and exit states are coherent.
- Feedback hierarchy is clear.
- No accidental flicker or flash.

### Rendering

- Layout work is justified.
- Paint-heavy effects are limited appropriately.
- Composite-friendly techniques are used where useful.
- Layer promotion is not excessive.

### React

- No unnecessary render loop.
- No avoidable per-frame state updates.
- Cleanup is correct.

### Responsive

- Mobile works.
- Tablet works.
- Desktop works.
- Touch works.
- Hover is not essential.

### Accessibility

- Keyboard works.
- Focus is correct.
- Screen reader behavior remains understandable.
- `prefers-reduced-motion` is respected.
- Motion is not the only information channel.

### Performance

- High-risk animation has been measured.
- No obvious forced layout loop.
- No runaway timers/RAF loops.
- Particle count is bounded.
- Heavy effects are bounded in area and duration.

### Maintainability

- Technique matches the actual complexity.
- No unnecessary library.
- No premature abstraction.
- Cleanup is explicit.
- Code remains understandable to another engineer.

---

# 27. Definition of Success

A successful animation is not the animation with the most effects.

A successful animation is one that:

```text
looks intentional
+
communicates state
+
feels responsive
+
works across devices
+
is accessible
+
uses an appropriate rendering strategy
+
avoids unnecessary work
+
is measurable when risk warrants it
+
remains maintainable
```

Optimize for perceived quality and engineering quality together.
