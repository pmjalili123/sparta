# Scorecard iteration 01

Commit measured: b26b653
Date: 2026-10-06T03:05:47.696Z

## Total: 68.93 / 100

| Category | Score | Max |
|---|---|---|
| A. Lighthouse (mobile, throttled) | 29.93 | 30 |
| B. Accessibility audit | 19 | 20 |
| C. Layout integrity | 0 | 20 |
| D. Type and rendering | 0 | 10 |
| E. Function | 10 | 10 |
| F. Copy and code hygiene | 10 | 10 |

## Failures, ranked by points lost

1. [D, -5] call-booked main p renders Literata instead of Public Sans
2. [D, -5] call-booked main a renders Literata instead of Public Sans
3. [D, -5] call-booked: Public Sans font-display=undefined preloaded=false
4. [D, -5] 404 main p renders Literata instead of Public Sans
5. [D, -5] 404 .btn renders Literata instead of Public Sans
6. [D, -5] 404: Public Sans font-display=undefined preloaded=false
7. [C, -3] 320: tap targets <44px: A "About" 43x44; A "FAQ" 30x44
8. [C, -3] 360: tap targets <44px: A "About" 43x44; A "FAQ" 30x44
9. [C, -3] 390: tap targets <44px: A "About" 43x44; A "FAQ" 30x44
10. [C, -3] 768: tap targets <44px: A "About" 43x44; A "FAQ" 30x44
11. [C, -3] 1024: tap targets <44px: A "About" 43x44; A "FAQ" 30x44
12. [C, -3] 1280: tap targets <44px: A "About" 43x44; A "FAQ" 30x44
13. [C, -3] 1920: tap targets <44px: A "About" 43x44; A "FAQ" 30x44
14. [C, -3] 1280@200%: tap targets <44px: A "About" 43x44; A "FAQ" 30x44
15. [C, -2] hero h1 is 6 lines at 360px (max 5)
16. [C, -2] hero h1 is 5 lines at 1280px (max 4)
17. [B, -1] axe moderate index|region: All page content should be contained by landmarks at 360px/default, 360px/biz+faq, 1280px/default, 1280px/biz+faq [#toTop]
18. [A, -0.08] Lighthouse performance median 0.99: performance/largest-contentful-paint 0.94 (2.3 s); performance/first-contentful-paint 0.99 (1.1 s)

## Assumptions

- A: Lighthouse runs with --blocked-url-patterns for plausible.io and calendly.com because the sandbox proxy blocks both; otherwise the blocked request is logged as a console error that production would not have.
- B: each distinct axe rule failing on a page counts once, de-duplicated across 360/1280 and across UI states (index is also scanned with the Business owners tab and all FAQ items open).
- C: 1280 at 200% zoom is measured as a 640x400 CSS viewport at deviceScaleFactor 2. Inline links inside running sentences are exempt from the 44px rule (WCAG 2.5.8 inline exception). Fixed elements are excluded from the overlap scan and checked separately.
- D: the rendered font is read with CDP CSS.getPlatformFontsForNode (the font Chromium actually used for the glyphs), not from CSS. An element class counts once per page.
- E: checks run with Calendly and Plausible stubbed (empty 200 script), except the Calendly lazy-load/fallback check, which aborts the script to simulate a block.
- F: JSON-LD is validated offline by type-checking it against schema-dts (the schema.org vocabulary as TypeScript types) with tsc --strict, because schema.org and validator.schema.org are blocked by the sandbox proxy. html-validate uses its "standard" preset (HTML conformance).

## Raw tool output

### A. Lighthouse runs

- Run 1: {"performance":0.99,"accessibility":1,"best-practices":1,"seo":1} LCP 2.3 s; non-perfect audits: performance/largest-contentful-paint 0.94 (2.3 s)
- Run 2: {"performance":0.98,"accessibility":1,"best-practices":1,"seo":1} LCP 2.3 s; non-perfect audits: performance/first-contentful-paint 0.99 (1.1 s); performance/largest-contentful-paint 0.94 (2.3 s)
- Run 3: {"performance":0.99,"accessibility":1,"best-practices":1,"seo":1} LCP 2.3 s; non-perfect audits: performance/largest-contentful-paint 0.94 (2.3 s)
- Median: {"performance":0.99,"accessibility":1,"best-practices":1,"seo":1}

### B. axe-core violations

- index|region (moderate): All page content should be contained by landmarks at 360px/default, 360px/biz+faq, 1280px/default, 1280px/biz+faq; #toTop

### B. Keyboard walkthrough (1280px)

- Reachability: {"nav links":true,"hero chips":true,"tab bar":true,"FAQ accordion":true,"back-to-top":true}
- Operability: {"hero chip (Enter)":true,"tab bar (arrows/Home)":true,"FAQ (Enter/Space)":true,"back-to-top (Enter)":true,"nav link (Enter)":true}
- Tab stops (88):

```
A "Skip to content"
A "Pouya Jalili, CPFA®"
A "Who I help"
A "How I work"
A "About"
A "FAQ"
A "Contact"
A "Book a call"
A "I have RSUs or stock options"
A "I'm a physician"
A "I own a small business"
A "Book a 30-min call"
BUTTON#tab-tech[tab] "Tech & biotech"
DIV#panel-tech[tabpanel] "Tech and biotech employees
          You"
A "Talk through your equity"
SUMMARY "What happens on the first call?"
SUMMARY "Who do you work with?"
SUMMARY "Where is your office?"
SUMMARY "Which states can you work in?"
SUMMARY "Can we talk in Persian?"
SUMMARY "What is a CPFA®?"
A "617-544-2879"
A "774-843-4919"
A "pjalili@baystatefinancial.com"
A "@advisorpouya"
A "Pouya Jalili, CPFA®"
A "Try my goal calculator"
A "Pouya Jalili, CPFA®"
A "Text 617-544-2879"
A "Office 774-843-4919"
A "pjalili@baystatefinancial.com"
A "Who I help"
A "How I work"
A "About"
A "FAQ"
A "Book a call"
A "Instagram"
A "LinkedIn"
A "SIPC"
A "Check my background on FINRA BrokerCheck"
A#toTop ""
A "Skip to content"
A "Pouya Jalili, CPFA®"
A "Who I help"
A "How I work"
A "About"
A "FAQ"
A "Contact"
A "Book a call"
A "I have RSUs or stock options"
A "I'm a physician"
A "I own a small business"
A "Book a 30-min call"
BUTTON#tab-tech[tab] "Tech & biotech"
DIV#panel-tech[tabpanel] "Tech and biotech employees
          You"
A "Talk through your equity"
SUMMARY "What happens on the first call?"
SUMMARY "Who do you work with?"
SUMMARY "Where is your office?"
SUMMARY "Which states can you work in?"
SUMMARY "Can we talk in Persian?"
SUMMARY "What is a CPFA®?"
A "617-544-2879"
A "774-843-4919"
A "pjalili@baystatefinancial.com"
A "@advisorpouya"
A "Pouya Jalili, CPFA®"
A "Try my goal calculator"
A "Pouya Jalili, CPFA®"
A "Text 617-544-2879"
A "Office 774-843-4919"
A "pjalili@baystatefinancial.com"
A "Who I help"
A "How I work"
A "About"
A "FAQ"
A "Book a call"
A "Instagram"
A "LinkedIn"
A "SIPC"
A "Check my background on FINRA BrokerCheck"
A#toTop ""
A "Skip to content"
A "Pouya Jalili, CPFA®"
A "Who I help"
A "How I work"
A "About"
A "FAQ"
```

### C. Layout per viewport

- 320: h1 7 lines; tap targets <44px: A "About" 43x44; A "FAQ" 30x44
- 360: h1 6 lines; tap targets <44px: A "About" 43x44; A "FAQ" 30x44
- 390: h1 6 lines; tap targets <44px: A "About" 43x44; A "FAQ" 30x44
- 768: h1 5 lines; tap targets <44px: A "About" 43x44; A "FAQ" 30x44
- 1024: h1 5 lines; tap targets <44px: A "About" 43x44; A "FAQ" 30x44
- 1280: h1 5 lines; tap targets <44px: A "About" 43x44; A "FAQ" 30x44
- 1920: h1 6 lines; tap targets <44px: A "About" 43x44; A "FAQ" 30x44
- 1280@200%: h1 5 lines; tap targets <44px: A "About" 43x44; A "FAQ" 30x44
- Screenshots: /tmp/claude-0/-home-user-sparta/7e75b982-fe14-553a-a63a-90b86911b20b/scratchpad/tools/shots/iter-01

### D. Rendered fonts (CDP getPlatformFontsForNode)

- index `.hero h1` expected Literata, checked 1 nodes: ok
- index `h2` expected Literata, checked 5 nodes: ok
- index `.quote` expected Literata, checked 1 nodes: ok
- index `.statement` expected Literata, checked 1 nodes: ok
- index `.btn` expected Public Sans, checked 4 nodes: ok
- index `.tab` expected Public Sans, checked 3 nodes: ok
- index `.site-header .nav-link` expected Public Sans, checked 5 nodes: ok
- index `.chip` expected Public Sans, checked 3 nodes: ok
- index `main p:not(.quote):not(.statement)` expected Public Sans, checked 10 nodes: ok
- index `footer p` expected Public Sans, checked 4 nodes: ok
- index font faces: Literata display=swap loaded; Public Sans display=swap loaded; preloads: fonts/literata-latin-var.woff2, fonts/publicsans-latin-var.woff2
- call-booked `h1` expected Literata, checked 1 nodes: ok
- call-booked `main p` expected Public Sans, checked 1 nodes: BAD Literata
- call-booked `main a` expected Public Sans, checked 1 nodes: BAD Literata
- call-booked font faces: Literata display=swap loaded; preloads: /fonts/literata-latin-var.woff2
- 404 `h1` expected Literata, checked 1 nodes: ok
- 404 `main p` expected Public Sans, checked 1 nodes: BAD Literata
- 404 `.btn` expected Public Sans, checked 1 nodes: BAD Literata
- 404 font faces: Literata display=swap loaded; preloads: /fonts/literata-latin-var.woff2

### E. Function checks

- PASS hero chips scroll to and open the right tab
- PASS tab bar by click
- PASS tab bar by keyboard
- PASS FAQ opens and closes
- PASS header transparent over hero, solid past it
- PASS back-to-top appears past hero and returns to top
- PASS Calendly lazy-loads near viewport
- PASS Calendly 8s fallback when script blocked
- PASS mobile CTA bar appears past hero
- PASS mobile CTA bar hides at Contact
- PASS prefers-reduced-motion disables all animation
- Reduced-motion probe: {"r0":{"live":[],"slowTransitions":0,"pending":0,"smooth":"auto"},"r1":{"live":[],"slowTransitions":0,"pending":0,"smooth":"auto"}}

### F. Hygiene

- PASS zero em dashes: none
- PASS zero console errors: none
- PASS zero broken anchors / internal links: none
- PASS every image has width/height: all set
- PASS valid HTML (html-validate standard): no errors
- PASS canonical, OG and JSON-LD present and valid: meta ok; JSON-LD validates against schema-dts Graph
