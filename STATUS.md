# advisorpouya.com status

Live preview: https://claude.ai/artifact/4kbR43p57GGPPxJECrW4Ty
Site source: `site/` (open `site/index.html`, or run `python3 -m http.server 8000` inside `site/`)

## Decided
- Tokens: Ink #1E2A36, Paper #F6F7F5, Firuzeh #13706F (main accent), Slate #5B6670, plus derived tones (see v4 overrides below).
- v4 (Oct 4), modeled on patrickrmccormick.com's patterns: full-bleed photo hero with Ink wash and load animation, see-through header that turns solid Ink on scroll, persona picker, tabbed Who I help with hover cards, scroll-filled process line, FAQ accordion, Firuzeh contact band with Calendly card, three-column Ink footer with BrokerCheck link, back-to-top, phone booking bar.
- Overrides of the earlier spec (by request to make it feel like a real website): two fonts, rounded cards and pill buttons, soft shadows, motion (reduced-motion respected), dark footer.
- Type: Literata (display: h1, h2, statements, quote) + Public Sans (body and UI), both self-hosted Latin WOFF2 in `site/fonts/`.
- Color bands: photo hero, Paper 'Who I help' tabs, Ink 'How I work', Paper About, Mist FAQ, Firuzeh contact, Ink footer. Derived tones: Mist, Firuzeh-deep, Firuzeh-light, on-dark muted.
- Hero headline in one weight and color. No section eyebrows, no arrow glyphs, no card tags.
- Who I help: tabbed switcher (Tech & biotech / Physicians / Business owners), each with statement, Boston line and decision cards. Hero chips open the matching tab.
- Book a call buttons go to #contact and focus its heading.
- Three verticals: tech and biotech employees, physicians (residency through attending), small business owners.
- Contact: Calendly embed (8s fallback message) plus direct lines. No contact form.
- /call-booked/ confirmation page. Set it as the Calendly redirect, without passing event details.
- Footer MMLIS disclosure and license lists are frozen word for word.
- No em dashes, testimonials, client names, performance claims, or product/carrier names.
- Confirmed links: Calendly 30-min, Instagram @advisorpouya, LinkedIn slug with ® (encoded %C2%AE), goal calculator (contact card).
- Commonwealth Business Circle OK to name publicly.
- Analytics: Plausible on advisorpouya.com.

## Still open
1. [VERIFY] "How I get paid" wording. Visible on page.
2. [VERIFY] Firm-approved CPFA® sentence. Visible on page.
3. Tax/legal disclaimer: needed or not, and where (footer is frozen).
4. Hosting: canonical is https://advisorpouya.com (no www); host must serve 404.html.
5. Calendly event redirect to https://advisorpouya.com/call-booked/ (set in Calendly).
6. From Pouya: hero image alt text, firm branding requirement (if yes, swap tokens only).
7. Photos: 3-4 real photos (chamber event, Southborough office, candid outdoors, Rosie). Biggest remaining gap vs the reference site.
8. [VERIFY] Form CRS (Customer Relationship Summary) URL for a footer link, if wanted.
9. Decision card counts are 5 / 4 / 5; earlier spec said four. Keep or trim.
10. Wireframe (`wireframe/index.html`) shows the pre-v4 layout; redraw if needed.

## Notes
- The artifact preview blocks Calendly and Plausible, so the calendar shows the 8-second fallback message there. Both load on the real domain.
- Goal calculator link uses utm_source=advisorpouya.com instead of the Instagram tags.
- Reference teardown: patrickrmccormick.com (FMG Suite template 007). Taken: full-bleed hero, header that solidifies on scroll, hover/interactive blocks, accordion, dark 3-col footer. Skipped: stock photos, flip cards (need invented copy), testimonials, pinned CRS bar.
- PDFs of the pre-v4 site: `exports/advisorpouya-site-desktop.pdf` and `exports/advisorpouya-site-mobile.pdf` (calendar shown as a labeled placeholder).

## Scorecard loop (Oct 6): 68.93 to 99.93

Stopped after iteration 04: two consecutive runs at 99.93 (iterations 03 and 04). Reports: `reports/iteration-01.md` to `iteration-04.md`. Harness: `tools/scorecard/` (see its README).

| Category | Start (iter 01) | Final (iter 04) | Max |
|---|---|---|---|
| A. Lighthouse mobile, throttled (median of 3) | 29.93 | 29.93 | 30 |
| B. Accessibility (axe + keyboard) | 19 | 20 | 20 |
| C. Layout integrity | 0 | 20 | 20 |
| D. Type and rendering | 0 | 10 | 10 |
| E. Function | 10 | 10 | 10 |
| F. Copy and code hygiene | 10 | 10 | 10 |
| **Total** | **68.93** | **99.93** | 100 |

Lighthouse medians at the end: Performance 0.99, Accessibility 1.00, Best Practices 1.00, SEO 1.00. The remaining 0.08 points is mobile LCP (2.1 s, the hero photo under simulated slow 4G).

Changes, one line each:
- 41a4b63 Added the scorecard harness and baseline report (no site changes).
- 290d19d Hero h1: clamp(2rem, 2.4vw + 1.25rem, 3.5rem), max-width 21ch, hero text column 760px. Now 5 lines at 360px and 4 at 768 to 1920px (was 6 and 5).
- 290d19d 404 and /call-booked/: body text and buttons now render Public Sans (were Literata), with Public Sans @font-face and preload. h1 stays Literata. /call-booked/ is still script-free and reads nothing from the URL.
- 290d19d /call-booked/ "Back to the home page" link is a 44px target.
- 290d19d Footer nav links get min-width 44px ("About" was 43px wide, "FAQ" 30px).
- 290d19d Back-to-top button and phone booking bar moved inside the footer landmark (axe "region"), keeping their own focus-ring colors.
- 290d19d Hero image preloads get fetchpriority="high"; phone image sources get width/height 800x1000.
- 9d12b0e Literata file narrowed to the weight range the site uses (400 to 600, opsz untouched): 110 KB to 77 KB. Mobile LCP went from 2.3 s to 2.1 s. @font-face weight range updated on all three pages.
- 9d12b0e Harness fix only: the booking-bar-covers-content check ignores the bar's own text.
- c2ce979 Confirmation run, no site changes.

Harness corrections made during the baseline (logged in iteration-01): the first raw run scored 63.85 because of three harness bugs (FAQ stops double-counted when the Tab walk wrapped, text inside closed FAQ items read as visible, a removed TypeScript flag in the JSON-LD check). The baseline was re-measured after fixing them.

Needs Pouya: nothing is blocking the score. No fix required breaking a hard constraint.

Still open (not attempted): fee wording, CPFA® wording, tax/legal disclaimer, Form CRS link, real photos, hero alt text sign-off, decision card counts (5/4/5 vs 4/4/4), Calendly redirect to /call-booked/, hosting (apex domain, 404.html), wireframe file.

Not measurable here, and why:
- Calendly and Plausible are blocked by the sandbox proxy, so the real calendar embed and analytics were never loaded. Lighthouse blocks both hosts; other checks stub them. The 8-second fallback was tested with the script blocked.
- The official schema.org validator and Google Rich Results test are blocked. JSON-LD was validated offline by type-checking it against schema-dts (the schema.org vocabulary) with tsc --strict, and a deliberately wrong property was confirmed to fail.
- Only Chromium was tested (no Safari, Firefox or real phones). LCP is Lighthouse's simulated throttling against a local server, not a real host or CDN.
- 200% zoom was measured as a 640x400 CSS viewport at 2x pixel density, which is what the browser lays out at 1280px and 200%.
