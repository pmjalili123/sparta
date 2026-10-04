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
