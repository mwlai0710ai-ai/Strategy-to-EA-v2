# Strategy → EA v2 — framework deck

A five-slide overview of the Strategy → EA v2 framework, built for someone who has never seen the tool.
16:9, 13.333 × 7.5 in. Every shape and text run is native PowerPoint — nothing is a flattened image, so
wording, colours and numbers are all editable.

| File | What it is |
| --- | --- |
| `Strategy-to-EA-v2-Framework.pptx` | The deck. Opens in PowerPoint, Keynote, Google Slides, WPS. |
| `Strategy-to-EA-v2-Framework.pdf` | Same deck, flattened, for sending to people who will not open a .pptx. |
| `slide-01.png` … `slide-05.png` | Per-slide renders at 150 dpi, for slideshows, web or chat. |
| `Strategy-to-EA-v2-Framework-CN.pptx` | Traditional Chinese (繁體) variant of the same deck. |
| `Strategy-to-EA-v2-Framework-CN.pdf` | Same, flattened. |
| `cn-slide-01.png` … `cn-slide-05.png` | Per-slide renders of the Chinese deck. |
| `build-deck.py` | Generator (python-pptx). `python3 build-deck.py` builds English, `python3 build-deck.py zh` builds the Chinese variant from the same source and the same type scale. |

The Chinese deck keeps English for product and parameter names (`Breakout`, `Donchian`,
`MQL5`, `ATR`, the spec fields) because those are what the tool and the generated code actually
say; only the explanatory prose, headings and section labels are translated.Traditional Chinese
is wider than Latin text at the same point size, so a few strings were shortened rather than
shrunk — no run in either deck is below 10 pt.

## Slide map

| # | Section | Says |
| --- | --- | --- |
| 1 | Opening | One set of decisions → one spec, one MQL5 EA, one Pine strategy. The 10 aspects, the three gates, the three artifacts. |
| 2 | **A · Basic logic** | The framework is a cascade — lens → family → mechanic → parameters — with the three gates (applicability, availability, contradiction) guarding each step. |
| 3 | **B · What it is worth** | Six benefits beyond "generate a strategy": parity across engines, no dead settings, an audit trail, risk rules compiled as code, a checklist for judging other systems, fast variants. |
| 4 | **C · How it works** | Five moves in order, plus a mock of the interface showing a blocked option, an auto-adjustment and the coverage line. |
| 5 | **D · Example output** | One configuration (Trend / Breakout / Donchian, EURUSD H1) shown as spec text, MQL5 inputs and Pine code. |

## Design system

- Paper `#FBFAF7`, ink `#16233A`, body `#46536B`, muted `#5B6A85`, rule `#E3E0D8`.
- Accents: blue `#2F6FE4` (spec), amber `#C98A12` (MQL5), green `#1A9150` (Pine), plus violet `#6F42D0` and teal `#0F7B83` for the engine and gates.
- Type: **Cambria** for titles and headlines, **Calibri** for everything else. Both ship with Office, so the deck looks the same on any Windows or Mac machine.

## Rebuilding

```bash
cd /home/workspace/slide-decks/strategy-to-ea-v2
python3 build-deck.py                      # writes the .pptx
soffice --headless --convert-to pdf Strategy-to-EA-v2-Framework.pptx
```

## Numbers used in the deck

Checked against the published build at <https://strategy-to-ea-v2-mwlai.zocomputer.io>:

- 10 aspects, 60 settings defined, 41 live in the default configuration.
- 4 families, 8 mechanics, 9 legal lens × family pairs.
- 13,856 configurations audited by `tools/audit-coverage.mjs` — no setting is lost and no contradictory pair is reachable (the in-page check runs 82,944).
- Example excerpts on slide 5 are copied from `tools/sample.mjs`.

If the framework changes, re-run the audits and `sample.mjs` before editing the deck — the numbers and
the code excerpts on slides 1, 2 and 5 come straight from those.

## Type scale

Body copy is set at 10.5–14 pt and nothing anywhere is below 10 pt, which is the
floor this deck is built to. Cambria for headings, Calibri for body, Consolas for
the code excerpts on slide 5. Every text run carries an explicit size — check with:

```
python3 -c "
from pptx import Presentation
p = Presentation('Strategy-to-EA-v2-Framework.pptx')
print(min(r.font.size.pt for s in p.slides for sh in s.shapes if sh.has_text_frame
          for pa in sh.text_frame.paragraphs for r in pa.runs if r.font.size))"
```
