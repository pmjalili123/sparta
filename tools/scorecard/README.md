# Scorecard harness

Measures site/ against the 100-point scorecard (Lighthouse, axe-core + keyboard, layout, rendered fonts, function, hygiene) and writes `reports/iteration-NN.md`.

Setup (outside the repo):

    npm install lighthouse axe-core html-validate playwright-core schema-dts typescript

Run (static server for site/ on port 8765):

    (cd site && python3 -m http.server 8765 &)
    SCORECARD_TOOLS=/path/to/tools NODE_PATH=/path/to/tools/node_modules node tools/scorecard/scorecard.cjs 02

Set CHROME to a Chromium binary if it is not at /opt/pw-browsers/chromium-1194/chrome-linux/chrome.
