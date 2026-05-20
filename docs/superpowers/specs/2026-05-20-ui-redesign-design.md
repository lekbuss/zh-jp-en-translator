# UI Redesign Design Spec
Date: 2026-05-20

## Summary

Redesign the single-file frontend (`public/index.html`) of the Chinese↔Japanese/English translation learning tool. Goals: larger translation boxes dominating the viewport, Apple-inspired design language with warm orange-to-purple gradient accents, bolder/larger typography throughout, and guaranteed vocab panel display after every zh→foreign translation.

---

## Visual Direction

**Style:** Apple design language × warm gradient accent
- Font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif`
- Background: warm off-white `#faf8f5`
- Primary accent: linear gradient `#ff8c42 → #9b59f6` (orange → purple), applied to labels, active states, gradients
- Card surfaces: `#fff` with soft multi-layer box-shadow and `border-radius: 20px`
- Top bar: frosted glass — `rgba(255,255,255,0.75)` + `backdrop-filter: blur(20px)`

**Typography scale (all weights bolder than current):**
| Element | Size | Weight |
|---|---|---|
| Translation textarea / output | 19px | 400 |
| Vocab word | 18px | 700 |
| Language label (中文 / 日本語) | 15px | 700 |
| Vocab reading | 14px | 500 |
| Vocab meaning | 15px | 400 |
| Panel section title | 14px | 800 |
| Mode / style buttons | 14px | 600 |

**Dark mode:** same structure, `background: #0f0f0e`, cards `#1c1b19`, accents unchanged.

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│ [中→日] [中→英]          [普通][商务]   [🌙]        │  ← sticky frosted glass bar
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│   中文 textarea      │   日本語 output              │  ← 44vh, two equal columns
│   (19px, editable)   │   (19px, streaming cursor)  │
│                      │                              │
├──────────────────────┴──────────────────────────────┤
│ 学习面板                              [词汇] [语法] │
│ ─────────────────────────────────────────────────── │
│ 本日    ほんじつ    [名词]   今天（正式）         ✓ │
│ 忙しい  いそがしい  [形容词] 繁忙的              +  │
│ 休憩    きゅうけい  [名词]   休息                +  │
└─────────────────────────────────────────────────────┘
```

- Translation panels: `height: 44vh`, side-by-side grid, cards with `border-radius: 20px`
- Vocab panel: always below, hidden until first translation completes
- Vocab row columns: word (150px) | reading (110px) | type pill (90px) | meaning (flex) | save btn

---

## Vocab Panel — Reliability Fix

**Problem:** panel sometimes doesn't appear because it was triggered on the `grammar` SSE event, which can arrive empty or be skipped.

**Fix:** trigger `showLearningPanel()` on the `done` SSE event, using accumulated `vocabBuf` / `grammarBuf` arrays that were populated during streaming. Panel appears if `vocabBuf.length > 0` regardless of grammar presence.

```
SSE events:  char char char ... vocab grammar done
                                  ↓       ↓     ↓
                               buffer  buffer  SHOW PANEL ← always fires here
```

---

## Component Details

### Top bar
- Left: mode switcher pill `[中→日] [中→英]` — pill-shaped toggle, active tab gets white card + shadow
- Right: style pill `[普通] [商务]` — active gets gradient fill; dark mode icon `🌙/☀️`
- Sticky, `z-index: 10`

### Translation panels
- Source panel header: language label + char count (`N 字`)
- Target panel header: language label (gradient colored) + 复制 button
- `textarea` and output div share identical padding/font so text alignment matches
- Animated blinking cursor (gradient colored) shows during streaming

### Vocab row
- Clicking anywhere on row = save (same as current behavior)
- Save button shows `+` → `✓` + purple tint on save
- Type pill colors: 名词=purple, 形容词=orange, 动词=blue, 形容动词=green

### Grammar tab
- Rounded card per grammar point (`background: #faf8f5`, `border-radius: 12px`)
- Point title (14px 600) + explanation text (13px, color #888) + example (13px, italic)

---

## Dark Mode

Triggered by 🌙/☀️ button, preference stored in `localStorage`. Same structure:
- Background `#0f0f0e`
- Cards `#1c1b19`, border `rgba(255,255,255,0.06)`
- Text `#e8e5e0` / `#a09890`
- Top bar `rgba(15,15,14,0.75)` + blur
- Gradient accents unchanged

---

## Files Changed

| File | Change |
|---|---|
| `public/index.html` | Full CSS + layout rewrite, typography scale, vocab panel trigger fix |
| `server.js` | No changes needed |

---

## Out of Scope

- No changes to server.js, API endpoints, or SSE logic
- No new dependencies
- Mobile responsiveness not addressed (tool is desktop-only)
