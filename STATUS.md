# advisorpouya.com status

Live preview: https://claude.ai/artifact/4kbR43p57GGPPxJECrW4Ty
Site source: `site/` (open `site/index.html`, or run `python3 -m http.server 8000` inside `site/`)

## Decided
- Tokens: Ink #1E2A36, Paper #F6F7F5, Firuzeh #13706F (only accent), Slate #5B6670. Radius 4px on buttons only. No shadows, no divider rules.
- Type: Literata variable, self-hosted Latin WOFF2 (`site/fonts/`). Hero h1 measure 22ch, spans the hero.
- Hero headline in one weight and color. No section eyebrows, no arrow glyphs, no card tags.
- Who I help: three rows (audience, situation, decisions). Standalone decisions section removed.
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
6. From Pouya: hero image alt text, About photo, firm branding requirement (if yes, swap tokens only).

## Notes
- The artifact preview blocks Calendly and Plausible, so the calendar shows the 8-second fallback message there. Both load on the real domain.
- Goal calculator link uses utm_source=advisorpouya.com instead of the Instagram tags.
- PDFs of the current site: `exports/advisorpouya-site-desktop.pdf` and `exports/advisorpouya-site-mobile.pdf` (calendar shown as a labeled placeholder).
- Pending decision: Public Sans for UI text only (nav, buttons, contact labels, footer nav) to make the page read less like a newsletter.
