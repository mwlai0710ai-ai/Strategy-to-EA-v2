from pptx import Presentation
from pptx.util import Inches as In, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn

W, H = 13.333, 7.5
ML, CW = 0.75, 11.83

INK   = RGBColor(0x14, 0x1F, 0x33)
BODY  = RGBColor(0x3C, 0x4A, 0x63)
DIM   = RGBColor(0x74, 0x80, 0x94)
PAPER = RGBColor(0xFB, 0xFA, 0xF7)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
RULE  = RGBColor(0xE2, 0xE1, 0xDB)
FILL  = RGBColor(0xF4, 0xF3, 0xEE)

BLUE, AMBER, GREEN, VIOLET, TEAL, RED = (RGBColor(0x2F,0x6F,0xE4), RGBColor(0xC9,0x8A,0x12),
    RGBColor(0x1A,0x91,0x50), RGBColor(0x6F,0x42,0xD0), RGBColor(0x0F,0x7B,0x83), RGBColor(0xCF,0x24,0x38))
BF, AF, GF, VF, TF, RF = (RGBColor(0xEC,0xF2,0xFE), RGBColor(0xFD,0xF5,0xE4), RGBColor(0xE9,0xF8,0xEF),
    RGBColor(0xF3,0xEE,0xFD), RGBColor(0xE7,0xF5,0xF6), RGBColor(0xFD,0xED,0xEF))

SERIF, SANS = 'Cambria', 'Calibri'

prs = Presentation()
prs.slide_width, prs.slide_height = In(W), In(H)
BLANK = prs.slide_layouts[6]


def flat(shape, fill=None, line=None, lw=1.0):
    shape.shadow.inherit = False
    if fill is None:
        shape.fill.background()
    else:
        shape.fill.solid(); shape.fill.fore_color.rgb = fill
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line; shape.line.width = Pt(lw)
    if shape.has_text_frame:
        shape.text_frame.word_wrap = True
    return shape


def rect(s, x, y, w, h, fill=WHITE, line=RULE, radius=None, lw=1.0):
    kind = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    sh = s.shapes.add_shape(kind, In(x), In(y), In(w), In(h))
    if radius:
        sh.adjustments[0] = radius
    return flat(sh, fill, line, lw)


def shape(s, kind, x, y, w, h, fill=BLUE, line=None, lw=1.0):
    sh = s.shapes.add_shape(kind, In(x), In(y), In(w), In(h))
    return flat(sh, fill, line, lw)


def run(p, txt, size=11, color=BODY, bold=False, italic=False, font=SANS):
    r = p.add_run(); r.text = txt
    f = r.font
    f.size, f.bold, f.italic, f.name = Pt(size), bold, italic, font
    f.color.rgb = color
    # kill theme-font override so the chosen face is honoured
    rPr = r._r.get_or_add_rPr()
    for tag in ('a:latin', 'a:cs', 'a:ea'):
        e = rPr.find(qn(tag))
        if e is None:
            e = rPr.makeelement(qn(tag), {}); rPr.append(e)
        e.set('typeface', font)
    return r


def text(s, x, y, w, h, blocks, size=11, color=BODY, bold=False, font=SANS,
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, space=0, line=1.16, italic=False):
    tb = s.shapes.add_textbox(In(x), In(y), In(w), In(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    if isinstance(blocks, str):
        blocks = [(blocks, {})]
    for i, item in enumerate(blocks):
        txt, o = item if isinstance(item, tuple) else (item, {})
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = o.get('align', align)
        p.space_before = Pt(o.get('space', space if i else 0))
        p.line_spacing = o.get('line', line)
        run(p, txt, o.get('size', size), o.get('color', color),
            o.get('bold', bold), o.get('italic', italic), o.get('font', font))
    return tb


def header(s, kicker, title, page):
    text(s, ML, 0.44, CW, 0.24, kicker, size=9.5, color=BLUE, bold=True)
    text(s, ML, 0.70, CW, 0.62, title, size=25, color=INK, bold=True, font=SERIF)
    foot(s, page)


def foot(s, page):
    ln = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, In(ML), In(6.98), In(ML + CW), In(6.98))
    ln.line.color.rgb = RULE; ln.line.width = Pt(0.75)
    text(s, ML, 7.08, 7.0, 0.22, 'Strategy → EA v2  ·  framework overview', size=8.5, color=DIM)
    text(s, ML + CW - 1.2, 7.08, 1.2, 0.22, f'{page:02d}', size=8.5, color=DIM, align=PP_ALIGN.RIGHT)


def new(kicker, title, page, bg=PAPER):
    s = prs.slides.add_slide(BLANK)
    rect(s, 0, 0, W, H, fill=bg, line=None)
    header(s, kicker, title, page)
    return s


def chip(s, x, y, w, h, label, fill, fg, size=7.5):
    c = rect(s, x, y, w, h, fill=fill, line=None, radius=0.5)
    tf = c.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
    run(p, label, size, fg, True)
    return c


# ══════════════════════════════════════════════════ 1 · TITLE
s = prs.slides.add_slide(BLANK)
rect(s, 0, 0, W, H, fill=PAPER, line=None)
text(s, ML, 0.62, CW, 0.24, 'STRATEGY  →  EA  v2      ·      A FRAMEWORK FOR SYSTEMATIC TRADING',
     size=9.5, color=BLUE, bold=True)
text(s, ML, 0.94, 11.2, 1.30,
     [('Your trading idea, written once', {'line': 1.06}),
      ('and rendered three ways', {'line': 1.06})],
     size=34, color=INK, bold=True, font=SERIF)
text(s, ML, 2.42, 9.6, 0.80,
     'Ten questions decide the strategy. One constraint engine checks that the answers agree. '
     'The same decisions are then emitted as a technical specification, an MQL5 expert advisor '
     'and a Pine Script strategy — with no setting left behind.',
     size=12, color=BODY, line=1.34)

hy, hh = 4.00, 1.72
# input card
c = rect(s, ML, hy, 2.85, hh, fill=BF, line=RGBColor(0xC9,0xDA,0xF8))
text(s, ML + 0.26, hy + 0.24, 2.35, 0.22, 'INPUT', size=8, color=BLUE, bold=True)
text(s, ML + 0.26, hy + 0.50, 2.35, 0.42, '10 aspects', size=20, color=INK, bold=True, font=SERIF)
text(s, ML + 0.26, hy + 0.98, 2.30, 0.62,
     '60 settings in the model. Only the ones the chosen path needs ever switch on.',
     size=9.5, color=BODY, line=1.3)
# engine card
c = rect(s, 4.02, hy, 2.95, hh, fill=VF, line=RGBColor(0xDD,0xD0,0xF6))
text(s, 4.28, hy + 0.24, 2.45, 0.22, 'CONSTRAINT ENGINE', size=8, color=VIOLET, bold=True)
text(s, 4.28, hy + 0.50, 2.45, 0.42, 'Three gates', size=20, color=INK, bold=True, font=SERIF)
text(s, 4.28, hy + 0.98, 2.40, 0.62,
     'Applicability, availability and contradiction — re-checked on every change you make.',
     size=9.5, color=BODY, line=1.3)
# arrows
for ax in (3.62, 7.04):
    a = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, In(ax), In(hy + hh/2), In(ax + 0.30), In(hy + hh/2))
    a.line.color.rgb = RGBColor(0xB4, 0xB9, 0xC4); a.line.width = Pt(1.5)
    ar = shape(s, MSO_SHAPE.ISOSCELES_TRIANGLE, ax + 0.30, hy + hh/2 - 0.055, 0.13, 0.11, fill=RGBColor(0xB4,0xB9,0xC4))
    ar.rotation = 90
# outputs
outs = [('Technical Spec', 'the document a reviewer reads', BLUE, BF),
        ('MQL5 Expert Advisor', 'the executable for MetaTrader 5', AMBER, AF),
        ('Pine Script v6', 'the backtest in TradingView', GREEN, GF)]
oy, oh, gap = 3.34, 0.88, 0.17
for i, (t1, t2, acc, fl) in enumerate(outs):
    y = oy + i * (oh + gap)
    rect(s, 7.52, y, 5.06, oh, fill=WHITE, line=RULE, radius=0.14)
    rect(s, 7.52, y, 0.075, oh, fill=acc, line=None)
    text(s, 7.74, y + 0.16, 3.0, 0.26, t1, size=13, color=INK, bold=True, font=SERIF)
    text(s, 7.74, y + 0.44, 3.4, 0.22, t2, size=8.5, color=DIM)
    text(s, 10.55, y + 0.30, 1.85, 0.28, '41 / 41 settings', size=9, color=acc, bold=True, align=PP_ALIGN.RIGHT)

text(s, ML, 6.40, CW, 0.26,
     [('Verified across 13,856 configurations   ·   no setting reaches one artefact and not the others   ·   no contradictory pair is reachable', {})],
     size=9.5, color=DIM)
foot(s, 1)

# ══════════════════════════════════════════════════ 2 · LOGIC
s = new('A   ·   THE BASIC LOGIC', 'The framework is a cascade, not a form', 2)
stages = [
    ('1', 'MARKET LENS', 'What regime must the market be in?', 'Trend · Range · Volatility · Session bias', BLUE, BF),
    ('2', 'FAMILY', 'Which edge suits that regime?', 'A Range lens rules Breakout and Momentum out entirely', VIOLET, VF),
    ('3', 'MECHANIC', 'Which exact algorithm is emitted?', 'Breakout offers Donchian channel or opening range only', TEAL, TF),
    ('4', 'PARAMETERS', 'Which numbers does that algorithm need?', 'the mechanic decides which of the 60 settings exist at all', AMBER, AF),
]
sy, sh_, sgap = 1.62, 0.92, 0.30
for i, (n, name, q, sub, acc, fl) in enumerate(stages):
    y = sy + i * (sh_ + sgap)
    rect(s, ML, y, 4.82, sh_, fill=WHITE, line=RULE, radius=0.12)
    rect(s, ML, y, 0.065, sh_, fill=acc, line=None)
    b = shape(s, MSO_SHAPE.OVAL, ML + 0.24, y + 0.24, 0.44, 0.44, fill=fl, line=acc, lw=1.0)
    b.text_frame.margin_left = b.text_frame.margin_right = 0
    b.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    bp = b.text_frame.paragraphs[0]; bp.alignment = PP_ALIGN.CENTER
    run(bp, n, 11, acc, True, font=SERIF)
    text(s, ML + 0.88, y + 0.20, 3.8, 0.20, name, size=8, color=acc, bold=True)
    text(s, ML + 0.88, y + 0.40, 3.80, 0.26, q, size=11.5, color=INK, bold=True, font=SERIF)
    text(s, ML + 0.88, y + 0.67, 3.80, 0.22, sub, size=8.5, color=DIM)
    if i < 3:
        ar = shape(s, MSO_SHAPE.ISOSCELES_TRIANGLE, ML + 0.43, y + sh_ + 0.09, 0.10, 0.11, fill=RGBColor(0xC2,0xC7,0xD1))
        ar.rotation = 180

gx, gw = 6.12, 6.46
gates = [
    ('GATE 01', 'APPLICABILITY · when does a field exist?', BLUE, BF,
     'A field is only in play if its parent choice is on. Turn the session window off and both '
     'clock fields leave all three artefacts — they do not linger as ignored inputs.'),
    ('GATE 02', 'AVAILABILITY · which options can be picked?', VIOLET, VF,
     'Options outside the current chain stay visible but blocked, with the reason attached. '
     'You cannot select a mechanic that belongs to another family.'),
    ('GATE 03', 'CONTRADICTION · what changes when you change course?', TEAL, TF,
     'Moving the lens re-seats the family and the mechanic. Both adjustments are reported, so '
     'nothing silently disagrees with what you asked for.'),
]
gy, gh, ggap = 1.62, 1.36, 0.16
for i, (tag, title, acc, fl, body) in enumerate(gates):
    y = gy + i * (gh + ggap)
    rect(s, gx, y, gw, gh, fill=WHITE, line=RULE, radius=0.10)
    rect(s, gx, y, gw, 0.05, fill=acc, line=None)
    text(s, gx + 0.28, y + 0.24, 1.6, 0.20, tag, size=8, color=acc, bold=True)
    text(s, gx + 0.28, y + 0.46, gw - 0.56, 0.24, title, size=11.5, color=INK, bold=True, font=SERIF)
    text(s, gx + 0.28, y + 0.76, gw - 0.56, 0.50, body, size=9.5, color=BODY, line=1.28)

text(s, gx, 6.24, gw, 0.24, 'Result: a short, lawful decision path from idea to running code.',
     size=10, color=INK, bold=True)

# ══════════════════════════════════════════════════ 3 · BENEFITS
s = new('B   ·   WHAT IT IS WORTH', 'A consistency engine, a risk gate, a teaching tool', 3)
ben = [
    ('01', 'Three engines, one answer', 'Spec, MT5 expert advisor and TradingView strategy are built from one set of decisions, so they cannot describe different systems.', BLUE),
    ('02', 'No setting that does nothing', 'Every control either changes the generated code or is greyed out with its reason. Dead inputs are the commonest way a backtest lies.', VIOLET),
    ('03', 'An audit trail you can hand over', 'The spec reads as a document — reviewable by a partner, a prop firm or a risk committee without opening a chart.', TEAL),
    ('04', 'Risk rules are compiled, not promised', 'Daily loss cap, peak-to-trough halt, exposure ceiling and one-position-per-direction ship inside both engines.', AMBER),
    ('05', 'A checklist for judging any strategy', 'The ten aspects double as an interrogation order for someone else\u2019s system — or a vendor\u2019s black box.', GREEN),
    ('06', 'Variants in minutes, not weekends', 'Change the lens or the mechanic and everything downstream re-derives; the report names what that invalidated.', RED),
]
cw3 = (CW - 2 * 0.26) / 3
for i, (n, head, body, acc) in enumerate(ben):
    col, row = i % 3, i // 3
    x = ML + col * (cw3 + 0.26)
    y = 1.62 + row * (1.98 + 0.26)
    rect(s, x, y, cw3, 1.98, fill=WHITE, line=RULE, radius=0.10)
    rect(s, x, y, cw3, 0.05, fill=acc, line=None)
    text(s, x + 0.26, y + 0.26, 1.0, 0.20, n, size=8.5, color=acc, bold=True)
    text(s, x + 0.26, y + 0.44, cw3 - 0.52, 0.50, head, size=12.5, color=INK, bold=True, font=SERIF, line=1.12)
    text(s, x + 0.26, y + 0.94, cw3 - 0.52, 0.78, body, size=9.5, color=BODY, line=1.30)

text(s, ML, 6.22, CW, 0.26,
     'What it does not do: choose the edge for you. It makes the arithmetic behind your choice explicit and repeatable.',
     size=9.5, color=DIM)

# ══════════════════════════════════════════════════ 4 · HOW TO USE
s = new('C   ·   HOW IT WORKS', 'Ten questions, answered in order', 4)
steps = [
    ('Scope it', 'Instrument, timeframe and the trading session you actually trade.'),
    ('Name the regime', 'Pick the lens. It sets the regime gate and limits the families below it.'),
    ('Choose the edge', 'Family first, then the exact mechanic that will be coded.'),
    ('Set entry, exit, size', 'Trigger, confirmation, stop, target, trailing, exposure.'),
    ('Generate and read the report', 'All three artefacts at once, with warnings and what changed.'),
]
for i, (head, body) in enumerate(steps):
    y = 1.66 + i * 0.95
    b = shape(s, MSO_SHAPE.OVAL, ML, y, 0.40, 0.40, fill=BLUE, line=None)
    b.text_frame.margin_left = b.text_frame.margin_right = 0
    b.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    bp = b.text_frame.paragraphs[0]; bp.alignment = PP_ALIGN.CENTER
    run(bp, str(i + 1), 11, WHITE, True, font=SERIF)
    text(s, ML + 0.58, y - 0.02, 5.0, 0.26, head, size=12.5, color=INK, bold=True, font=SERIF)
    text(s, ML + 0.58, y + 0.28, 5.0, 0.30, body, size=9.5, color=BODY, line=1.25)

# UI mock
mx, my, mw, mh = 6.55, 1.60, 6.03, 4.42
rect(s, mx, my, mw, mh, fill=WHITE, line=RULE, radius=0.05)
rect(s, mx, my, 2.02, mh, fill=FILL, line=None, radius=0.05)
text(s, mx + 0.22, my + 0.24, 1.7, 0.22, '10 ASPECTS', size=7.5, color=DIM, bold=True)
for i, lab in enumerate(['Target Market', 'Market Lens', 'Strategy / Edge', 'Entry Logic']):
    ry = my + 0.52 + i * 0.34
    if i == 1:
        rect(s, mx + 0.14, ry - 0.05, 1.76, 0.31, fill=WHITE, line=BLUE, radius=0.3, lw=1.0)
        text(s, mx + 0.24, ry + 0.01, 1.5, 0.20, f'{i+1}   ' + lab, size=8.5, color=BLUE, bold=True)
    else:
        text(s, mx + 0.28, ry + 0.01, 1.5, 0.20, f'{i+1}   ' + lab, size=8.5, color=BODY)
rect(s, mx + 0.20, my + 2.02, 1.62, 0.008, fill=RGBColor(0xD6,0xD5,0xCE), line=None)
text(s, mx + 0.22, my + 2.16, 1.7, 0.20, 'USER MANUAL', size=7.5, color=DIM, bold=True)
text(s, mx + 0.22, my + 2.42, 1.7, 0.22, 'PDF   \u2197', size=9, color=BLUE, bold=True)

text(s, mx + 2.22, my + 0.24, 3.4, 0.20, '2  ·  MARKET LENS', size=7.5, color=DIM, bold=True)
lens = [('Trend', False), ('Range', True), ('Volatility', False), ('Session bias', False)]
lw_ = [0.72, 0.72, 0.86, 0.92]
lx = mx + 2.22
for (lab, on), ww in zip(lens, lw_):
    if on:
        c = rect(s, lx, my + 0.50, ww, 0.32, fill=BF, line=BLUE, radius=0.5, lw=1.0)
        text(s, lx, my + 0.565, ww, 0.20, lab, size=8.5, color=BLUE, bold=True, align=PP_ALIGN.CENTER)
    else:
        rect(s, lx, my + 0.50, ww, 0.32, fill=WHITE, line=RULE, radius=0.5)
        text(s, lx, my + 0.565, ww, 0.20, lab, size=8.5, color=BODY, align=PP_ALIGN.CENTER)
    lx += ww + 0.09

text(s, mx + 2.22, my + 1.00, 3.6, 0.20, 'Auto-adjusted: family Breakout → Mean Reversion',
     size=8, color=AMBER, bold=True)
# greyed field
rect(s, mx + 2.22, my + 1.30, 3.62, 0.62, fill=RGBColor(0xF7,0xF6,0xF2), line=RULE, radius=0.10)
text(s, mx + 2.40, my + 1.40, 3.3, 0.20, 'Donchian lookback (bars)', size=9.5, color=RGBColor(0x9C,0xA3,0xB2))
text(s, mx + 2.40, my + 1.62, 3.3, 0.20, 'not applicable — only used by Breakout', size=8, color=RGBColor(0x9C,0xA3,0xB2))
# report
rect(s, mx + 2.22, my + 2.10, 3.62, 1.02, fill=GF, line=RGBColor(0xC6,0xE9,0xD5), radius=0.10)
text(s, mx + 2.40, my + 2.22, 3.3, 0.20, '\u2713   No conflicting selections', size=9, color=RGBColor(0x14,0x6B,0x3C), bold=True)
text(s, mx + 2.40, my + 2.46, 3.3, 0.50,
     '2 auto-adjustments made · 3 options currently ruled out, each with its reason.',
     size=8, color=RGBColor(0x2A,0x5C,0x42), line=1.2)
text(s, mx + 2.22, my + 3.26, 3.62, 0.20, 'Coverage:  spec 41/41   ·   MQL5 41/41   ·   Pine 41/41',
     size=7.5, color=DIM, bold=True)

text(s, ML, 6.24, 5.4, 0.44,
     'Nothing is hidden: blocked options stay on screen with the reason, and every choice is written into all three outputs.',
     size=9, color=DIM, line=1.25)

# ══════════════════════════════════════════════════ 5 · EXAMPLE
s = new('D   ·   EXAMPLE OUTPUT', 'The same trade, described three ways', 5)
text(s, ML, 1.36, CW, 0.24,
     'Trend lens  ·  Breakout family  ·  Donchian channel  ·  EURUSD H1  ·  41 of 60 settings active — all 41 present in all three files',
     size=9, color=DIM)

cols = [
    ('TECHNICAL SPEC', 'the document', BLUE, BF, [
        ('h', '§5  Filters'),
        ('r', ('Trend filter', 'only with trend')),
        ('r', ('Trend reference', 'SMA(50)')),
        ('r', ('Session filter', '8:00 – 16:00')),
        ('h', '§6  Exit logic'),
        ('r', ('Stop distance', '2 × ATR(14)')),
        ('r', ('Target method', 'Risk multiple (R)')),
        ('r', ('Reward : risk', '1 : 3')),
        ('r', ('Trailing', 'ATR trail, 1.5 × ATR')),
        ('h', '§7  Risk & position size'),
        ('r', ('Sizing', 'Risk-based %')),
        ('r', ('Risk per trade', '1% of equity')),
    ]),
    ('MQL5 EXPERT ADVISOR', 'the executable', AMBER, AF, [
        ('c', 'input double Inp_SlAtr       = 2;'),
        ('c', 'input double Inp_TrailAtr    = 1.5;'),
        ('c', 'input double Inp_RrTarget    = 3;'),
        ('c', 'input double Inp_RiskPercent = 1;'),
        ('c', 'input double Inp_MaxDailyLoss = 3;'),
        ('c', 'input double Inp_MaxDrawdown = 20;'),
        ('c', 'input int    Inp_MaxOpenTrades = 1;'),
        ('h2', ''),
        ('c', 'bool regimeOK = adxBuf[1] >= Inp_AdxMin'),
        ('c', '             && atrPctNow >= Inp_AtrPct;'),
        ('h2', ''),
        ('c', 'if(Inp_OnlyTrend)'),
        ('c', '   trendOK = close > trendSMA;'),
    ]),
    ('PINE SCRIPT v6', 'the backtest', GREEN, GF, [
        ('c', "strategy('EURUSD H1 · Donchian channel',"),
        ('c', "         overlay=true, ...)"),
        ('c', 'lookback     = input.int(55, ...)'),
        ('c', 'slAtrMult    = input.float(2, ...)'),
        ('c', 'trailAtrMult = input.float(1.5, ...)'),
        ('c', 'rrTarget     = input.float(3, ...)'),
        ('h2', ''),
        ('c', 'donHi   = ta.highest(high, lookback)[1]'),
        ('c', 'longSig = close > donHi'),
        ('h2', ''),
        ('c', 'plotshape(goLong and'),
        ('c', '  strategy.position_size == 0, ...)'),
    ]),
]
cw5 = (CW - 2 * 0.24) / 3
for i, (tab, sub, acc, fl, lines) in enumerate(cols):
    x = ML + i * (cw5 + 0.24)
    rect(s, x, 1.72, cw5, 3.98, fill=WHITE, line=RULE, radius=0.06)
    rect(s, x, 1.72, cw5, 0.05, fill=acc, line=None)
    text(s, x + 0.26, 1.94, cw5 - 0.5, 0.22, tab, size=9.5, color=acc, bold=True)
    text(s, x + 0.26, 2.18, cw5 - 0.5, 0.20, sub, size=8, color=DIM, italic=True)
    y = 2.48
    for kind, item in lines:
        if kind == 'h':
            y += 0.09
            text(s, x + 0.26, y, cw5 - 0.5, 0.20, item, size=8.5, color=INK, bold=True, font=SANS)
            y += 0.25
        elif kind == 'h2':
            y += 0.14
        elif kind == 'r':
            k, v = item
            text(s, x + 0.26, y, 1.28, 0.20, k, size=8.5, color=DIM)
            text(s, x + 1.56, y, cw5 - 1.80, 0.20, v, size=8.5, color=INK)
            y += 0.225
        else:
            text(s, x + 0.26, y, cw5 - 0.48, 0.22, item, size=7.5, color=RGBColor(0x2B,0x38,0x4E), font=SANS, line=1.15)
            y += 0.235

rect(s, ML, 5.92, CW, 0.72, fill=BF, line=RGBColor(0xC9,0xDA,0xF8), radius=0.12)
text(s, ML + 0.30, 6.06, CW - 0.6, 0.46,
     'One pass, no manual translation.  The stop, the target, the trailing distance and the risk figure are the same '
     'numbers in all three artefacts — so the backtest and the live EA cannot drift apart.',
     size=9.5, color=RGBColor(0x1B,0x3B,0x7A), line=1.25)

prs.save('/home/workspace/slide-decks/strategy-to-ea-v2/Strategy-to-EA-v2-Framework.pptx')
print('saved', len(prs.slides.__iter__.__self__._sldIdLst))
