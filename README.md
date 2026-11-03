# First Impressions: A Game of Delicate Hostilities — Card Creator v6

A self-contained Regency-inspired card design editor for an AP Literature classroom.

## Open the editor

Open `first-impressions-card-creator-v6.html` in Chrome or Edge, or use `index.html` with the source files alongside it. No web server is required.

## What's new in v6

- **Landscape Setting cards** (1040 × 720 base pixels; 2080 × 1440 PNG export) with a wide artwork panel, two formatted effects, and quotation. Character cards remain portrait (720 × 1040 base pixels).
- The editor, gallery, export and direct image drag-controls now respond to each card’s orientation.
- Two editable interactions/effects on **every** card (character and setting).
- Rich-text editors for each interaction, with **Bold** and *Italic* controls and Ctrl/Cmd+B and Ctrl/Cmd+I shortcuts.
- Text-fitting canvas renderer: all ability text is drawn, with automatically reduced font size instead of ellipses or truncated lines. Very long text can become hard to read in print; concise descriptions remain preferable.
- Same renderer for live preview, gallery, and high-resolution PNG export.

## Existing cards

The browser storage key is unchanged from earlier versions, and imported v1–v3 cards are converted from their old one-ability format to the new first interaction field. The second interaction starts empty on legacy cards. Newly exported JSON uses `ability1` and `ability2` containing safe HTML with only `<b>`, `<i>`, and `<br>` tags.

## Included files

- `index.html` — markup
- `app.js` — card editor, data conversion, rendering, export
- `styles.css` — layout and Regency styling
- `assets/` — source image and ornament resources

Drafts are saved in the current browser. Use JSON export/import to transfer cards between devices.
