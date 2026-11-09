# Stash

Local-first knowledge vault. Square cover-flow cards, a double-sided revise face, a living graph, and a quiet product site.

Notes stay in the browser (IndexedDB) until you export them. There is no account.

## Use it

- **Open the vault** from the landing page.
- **Swipe** sideways to move, **double-tap** or Space to flip, **swipe up** to read, **pull down** to Remember.
- Dock icons: gestures, Remember, new note, graph, export.
- Carry out as Obsidian markdown, CSV, JSON, or a drop link.

## Mark

A card with a folded corner. The three gaps are notes that found each other — stashed first, linked when you are ready.

## Source map

- `src/routes/index.tsx` — product landing
- `src/routes/vault.tsx` — the vault
- `src/components/vault-app.tsx` — deck, reader, gestures, export
- `src/components/graph-view.tsx` — force graph
- `src/lib/stash/` — cards, taxonomy, IndexedDB
- `public/favicon.svg` — the mark

Repository: https://github.com/Nishantpositive/stash-vault
