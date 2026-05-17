# CarouselForge — Competitive Technical Analysis

**URL:** https://carouselforge.app/  
**Analyzed:** 2026-05-17  
**Method:** Playwright (Chromium headless) + app.js source analysis

---

## 1. What the App Does

CarouselForge is a **100% free, no-signup, client-side-only carousel generator** for social media. Its tagline is "Paste your text, get beautiful, platform-optimized carousel slides instantly."

### Core user flow:
1. User lands on a marketing homepage
2. Clicks "Start Creating Now" → scrolls/transitions to the in-page app workspace (no page navigation)
3. Pastes raw text (article, thread, bullet points, etc.)
4. Optionally sets branding (handle, avatar image)
5. Chooses theme, size, font, background
6. Clicks "Generate Slides" → client-side parsing produces slides instantly
7. Previews slides in a card grid (drag-to-reorder, inline edit, delete)
8. Downloads individual slides as PNG or all slides as a ZIP file

### Notable "AI" feature — actually just a prompt template:
There is no real AI generation in the app. The "AI Prompt Generator" feature builds a static text prompt that the user copies and pastes into an external chatbot (ChatGPT, Gemini, Claude). The app then parses the chatbot's output. The template reads:

```
Write a social media carousel about: [TOPIC]
Use EXACTLY this format:
[Write an attention-grabbing title for the carousel]
1. [First point title]
[2-3 sentences explaining this point]
...
Rules: no emojis, no bold, no markdown, keep each point under 40 words
```

---

## 2. Architecture — Completely Static, No Backend

This is one of the most important findings: **CarouselForge has zero backend**.

### Hosting:
- **Netlify** (confirmed by response headers: `server: Netlify`, `cache-status: "Netlify Edge"; hit`)
- Static HTML/CSS/JS only
- No API routes, no server-side rendering

### Response headers (main page):
```
server: Netlify
cache-control: public,max-age=0,must-revalidate
cache-status: "Netlify Edge"; hit
content-type: text/html; charset=UTF-8
strict-transport-security: max-age=31536000
```

### All 404 (no backend):
- `/api`, `/api/docs`, `/api/v1`, `/api/health`
- `/login`, `/signup`, `/register`, `/dashboard`
- `/pricing`, `/create`, `/editor`, `/app`, `/studio`

---

## 3. Frontend Tech Stack

| Component | Details |
|-----------|---------|
| Framework | **None** — plain vanilla JavaScript (ES5-style `function` declarations, IIFE wrapper) |
| Bundler | None — single `app.js` file (86,831 bytes unminified) |
| Styling | Custom CSS (no Tailwind, no CSS frameworks detected) |
| Fonts | Google Fonts |
| Export | `html2canvas` 1.x — renders DOM nodes to canvas |
| ZIP download | `JSZip` + `FileSaver.js` |
| Analytics | Google Analytics 4 (`G-NQ7Z1SX6WJ`) via Google Tag Manager |
| PWA | Yes — `manifest.json`, Service Worker (`sw.js` registered at runtime via `navigator.serviceWorker.register('./sw.js')`) |
| Install prompt | Custom "Install" button in app nav bar |

### Script files loaded:
```
https://carouselforge.app/lib/html2canvas.min.js
https://carouselforge.app/lib/jszip.min.js
https://carouselforge.app/lib/FileSaver.min.js
https://carouselforge.app/app.js
```

### Not present:
- No React, Vue, Angular, Next.js, Nuxt
- No Tailwind, Bootstrap
- No Supabase, Firebase, Clerk, Auth0
- No Stripe, LemonSqueezy
- No Vercel, Cloudflare

---

## 4. API / Network Calls

**There are none.** The entire application runs in the browser. The only outbound network calls during a session are:

1. Google Analytics 4 page_view and user_engagement events (to `www.google-analytics.com/g/collect`)
2. Google Tag Manager script load
3. Google Fonts (for font loading)

No XHR or fetch calls are made to any backend. All processing — text parsing, slide rendering, image export — happens in JavaScript in the browser.

---

## 5. Application State Model

The app maintains a single JavaScript state object:

```javascript
var state = {
    slides: [],             // Array of slide objects
    theme: 'midnight',      // Active theme name
    handle: '',             // Creator's @handle
    avatarBase64: null,     // Avatar image as base64 string
    size: '1080x1080',      // Slide dimensions
    fontSize: 28,           // Font size (px)
    fontFamily: 'playfair', // Font key
    rawText: '',            // Original pasted text
    customBg: {
        type: 'none',           // 'none' | 'color' | 'image'
        color: '#1e1b4b',       // Custom color hex
        imageBase64: null,      // Background image as base64
        overlayOpacity: 40      // Image overlay opacity %
    }
};
```

### Slide object shape:
```javascript
{
    type: 'cover' | 'content' | 'cta',
    numberLabel: '01',          // Zero-padded number
    title: 'Slide title text',
    body: 'Slide body text'
}
```

### Draft persistence:
State (minus the full image data) is saved to `localStorage` under key `carouselforge_draft`. Restored on next visit with a "Draft restored" toast.

Draft object:
```javascript
{
    rawText, theme, handle, avatarBase64, size,
    fontSize, fontFamily,
    customBg: { type, color, overlayOpacity }
    // NOTE: background imageBase64 is NOT saved to draft (too large)
}
```

---

## 6. Themes (11 total)

| Theme key | Display name | Description |
|-----------|-------------|-------------|
| `midnight` | Midnight | Midnight gradient (default) |
| `ocean` | Ocean | Ocean Breeze |
| `sunset` | Sunset | Sunset Warm |
| `minimal` | Minimal | Minimal Clean |
| `neon` | Neon | Neon Dark |
| `forest` | Forest | Forest Green |
| `coral` | Coral | Coral Reef |
| `lavender` | Lavender | Lavender Dream |
| `charcoal` | Charcoal | Charcoal Mono |
| `aurora` | Aurora | Aurora Borealis |
| `candy` | Candy | Candy Pop |

Themes are applied via CSS class (`theme-midnight`, `theme-ocean`, etc.) on the `.slide-inner` element.

---

## 7. Slide Sizes (6 formats)

| Size value | Display label | Aspect ratio | Use case |
|-----------|---------------|-------------|----------|
| `1080x1080` | 1:1 Square | Square | Instagram, default |
| `1080x1350` | 4:5 Portrait | Portrait | Instagram portrait |
| `1080x1920` | 9:16 Story | Story | Instagram/TikTok Stories |
| `1200x627` | LinkedIn | Landscape | LinkedIn |
| `1600x900` | Twitter / X | Landscape | Twitter/X |
| `1000x1500` | Pinterest | Portrait | Pinterest |

Size class applied via `getSizeClass()`:
- `1080x1350` → CSS class `portrait`
- `1080x1920` → CSS class `story`
- `1200x627` → CSS class `landscape-linkedin`
- `1600x900` → CSS class `landscape-twitter`
- `1000x1500` → CSS class `pinterest`
- `1080x1080` → no extra class (default square)

---

## 8. Font Options (7 fonts)

| Value | Display name |
|-------|-------------|
| `playfair` | Playfair Display (Elegant) — default |
| `inter` | Inter (Modern) |
| `poppins` | Poppins (Friendly) |
| `space` | Space Grotesk (Tech) |
| `merriweather` | Merriweather (Classic) |
| `outfit` | Outfit (Clean) |
| `urdu` | اردو نستعلیق (Urdu Poetry) |

Applied as CSS class `font-playfair`, `font-inter`, etc. on `.slide-inner`.

---

## 9. Text Parsing System (10 parsers)

The core intellectual property of the app is a multi-strategy text parser. It tries 10 different parsing strategies, scores each result, and picks the best:

| Parser | Score bonus | Trigger pattern |
|--------|------------|-----------------|
| `slideMarkers` | +20 | "Slide 1:", "Slide 2:" |
| `hookFormat` | +18 | "Hook:", "Title:", "CTA:" labels |
| `bracketMarkers` | +16 | `[1]`, `[Slide 1]` |
| `markdownHeadings` | +14 | `## Heading` |
| `numbered` | +12 | `1. Title\nbody` |
| `labeledSections` | +14 | `Point 1:`, `Tip 1:`, `Step 1:` |
| `twitter` | +10 | Twitter thread format |
| `boldMarkers` | +8 | `**Title**` |
| `dashSeparators` | +6 | `---` |
| `doubleNewlineBlocks` | +4 | Double newlines |
| `paragraphs` | +2 | Fallback paragraph split |

### Auto-balancing:
After parsing, slides are auto-balanced:
- Slides > 55 words → split at sentence boundary
- Consecutive slides < 8 words each → merged
- Slides renumbered after balance

### Smart CTA generation:
The CTA slide text is generated based on content keywords:
- "tip/hack/trick" → "Found these tips useful?"
- "step/guide/tutorial" → "Ready to take the next step?"
- "mistake/avoid/wrong" → "Don't make these mistakes!"
- "money/earn/income" → "Start building your [income]"
- Etc. (keyword-based pattern matching)

---

## 10. Export System

### Single slide download:
Uses `html2canvas` to render the slide's DOM node to a `<canvas>`, then calls `canvas.toBlob()` and triggers a download.

```javascript
html2canvas(el, {
    width: w,
    height: h,
    scale: 2,          // 2x resolution for sharpness
    backgroundColor: null,
    useCORS: true
})
```

### All slides download (ZIP):
Processes slides sequentially, renders each via `html2canvas`, collects PNG blobs in `JSZip`, then generates and saves `carousel-slides.zip`.

File naming: `slide-01.png`, `slide-02.png`, etc.

---

## 11. UI/UX Features

- **Inline slide editing** — modal dialog with title + body textareas, "Save Changes" button
- **Drag-to-reorder** — HTML5 drag & drop, updates `state.slides` array and re-renders
- **Per-slide actions** — edit, delete, download individual slide (3 icon buttons on hover)
- **Content status badges** — "Short slide (N words)" warning shown on slides with < ~15 words
- **Slide count badge** — shows "N slides" after generation
- **Download All (ZIP)** — hidden until slides are generated
- **Loading overlay** — "Preparing download... X / N slides" during ZIP generation
- **Toast notifications** — dismissible, auto-hide after 3 seconds
- **Keyboard shortcut** — `Ctrl+Enter` / `Cmd+Enter` triggers "Generate Slides"
- **Font size slider** — range slider, default 28px
- **Background options** — Theme (CSS gradient) | Solid Color (with color picker) | Custom Image (with overlay opacity slider)
- **Avatar upload** — base64 encoded, displayed as circle on slides
- **@handle branding** — text shown at bottom of slides
- **Slide page indicator** — "N / Total" shown on each slide (e.g. "1 / 7")
- **Accent text** — `*word*` wrapped in `<span class="accent-text">` for highlighting
- **Max 20 slides** enforced with toast warning

---

## 12. Homepage Structure

Single-page app with two views controlled by JS:

1. **`#homepageView`** — Marketing landing page (hidden when app is active)
   - Sections: hero, `#how-it-works`, `#features`, `#testimonials`, `#faq`, CTA banner, footer
   
2. **`#appWorkspace`** — The actual carousel editor (shown when CTA is clicked)
   - Left column: text input, prompt template, theme grid, avatar/handle, background picker, font controls, generate button
   - Right column: slides preview grid

Navigation between views is handled entirely in JavaScript with CSS visibility toggling.

---

## 13. AI Integration — Assessment

**No real AI.** The app does NOT call any AI API. The "AI Prompt Generator" is:
1. A text input for the user's topic
2. A hardcoded prompt template string that formats the topic
3. A "Copy Prompt" button that puts the prompt in clipboard
4. Instructions to paste it into ChatGPT/Gemini/Claude

The parsing logic (`parseTextToSlides`) is designed to handle the specific output format that chatbots return when given the template prompt.

---

## 14. Competitive Implications for My Creator Studio

### What CarouselForge does well:
- **Frictionless entry** — no account required, works immediately
- **Smart multi-format text parsing** — handles 10+ input formats robustly
- **Local-only export** — no server costs for image generation
- **PWA installable** — works offline after first load
- **Draft auto-save** via localStorage

### What My Creator Studio can do better:
- **Real AI generation** — directly call Gemini/Claude API instead of copy-paste prompt workaround
- **Instagram publishing** — actual posting to Instagram (CarouselForge has zero publishing features)
- **Account management** — multiple Instagram accounts
- **Post scheduling** — queue and auto-publish
- **Saved projects** — persistent storage in database (CarouselForge loses everything on clear)
- **Richer slide templates** — server-side rendering can produce more complex designs
- **Video/reel support** — CarouselForge is PNG-only
- **Brand presets** — save and reuse colors, fonts, handle, avatar

### Architectural gap:
CarouselForge is fundamentally a client-side tool. It cannot publish to Instagram, store history, or do real AI generation. My Creator Studio's server-side FastAPI + PostgreSQL + Instagrapi stack gives access to all these capabilities at the cost of more setup friction.

---

## 15. Files and Artifacts

| File | Description |
|------|-------------|
| `https://carouselforge.app/app.js` | Main app — 86,831 bytes of vanilla JS, unminified |
| `https://carouselforge.app/lib/html2canvas.min.js` | Canvas rendering library |
| `https://carouselforge.app/lib/jszip.min.js` | ZIP file creation |
| `https://carouselforge.app/lib/FileSaver.min.js` | Browser file download trigger |
| `https://carouselforge.app/manifest.json` | PWA manifest |
| `https://carouselforge.app/sw.js` | Service Worker (PWA offline support) |

Screenshots captured during analysis are in `C:/tmp/playwright-research/screenshots/`.

---

*Analysis performed using Playwright (Chromium) + Node.js. App.js downloaded and analyzed statically. Editor interaction tested by injecting text and clicking Generate.*
