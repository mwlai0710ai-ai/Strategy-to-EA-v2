# Strategy → EA v2 — framework deck

Five slides explaining the framework, generated from `build-deck.py` with `python-pptx`.
Every shape is a native PowerPoint object, so text and colours stay editable.

| File | What it is |
| --- | --- |
| `Strategy-to-EA-v2-Framework.pptx` | The deck (16:9, 5 slides) |
| `Strategy-to-EA-v2-Framework.pdf` | Same deck, for viewing without PowerPoint |
| `slide-01.png` … `slide-05.png` | Rendered previews |
| `build-deck.py` | Generator — the source of truth for the layout |

## Slides

1. **Cover** — idea in, three artefacts out, with the coverage figure.
2. **A · Basic logic** — the cascade: lens → family → mechanic → parameters, plus the three gates.
3. **B · What it is worth** — six benefits, and the one thing it does not do.
4. **C · How it works** — the five passes through the ten aspects, and what the screen reports back.
5. **D · Example output** — one trade shown as spec, MQL5 and Pine, with the same numbers in all three.

## Rebuilding

```bash
python3 build-deck.py                       # writes the .pptx
soffice --headless --convert-to pdf .       # optional PDF render
```

The working copy lives at `/home/workspace/slide-decks/strategy-to-ea-v2/`; this folder is the
copy committed to the repo. Rebuild in the working copy, then copy the outputs here.
