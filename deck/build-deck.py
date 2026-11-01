from pptx import Presentation
from pptx.util import Inches as In, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from lxml import etree as _et

import sys

LANG = (sys.argv[1] if len(sys.argv) > 1 else 'en').lower()
ZH = LANG in ('cn', 'zh', 'zh-tw', 'zh_hant', 'tc')

TR = {
 'STRATEGY  →  EA  v2      ·      A FRAMEWORK FOR SYSTEMATIC TRADING':
   'STRATEGY  →  EA  v2      ·      系統化交易的框架',
 'Ten questions decide the strategy. One constraint engine checks that the answers agree. The same decisions are then emitted as a technical specification, an MQL5 expert advisor and a Pine Script strategy — with no setting left behind.':
   '十個問題決定一套策略。一個約束引擎負責檢查答案是否互相一致，再把同一組決定輸出成技術規格書、MQL5 專家顧問與 Pine Script 策略——沒有任何一個設定被漏掉。',
 'Your trading idea, written once': '你的交易想法，只寫一次',
 'and rendered three ways': '呈現為三種形式',
 'INPUT': '輸入',
 '10 aspects': '10 個面向',
 '60 settings in the model. Only the ones the chosen path needs ever switch on.':
   '模型共有 60 個設定，只有所選路徑真正需要的才會啟用。',
 'CONSTRAINT ENGINE': '約束引擎',
 'Three gates': '三道關卡',
 'Applicability, availability and contradiction — re-checked on every change you make.':
   '適用性、可用性與矛盾檢查——每次改動都重新驗算。',
 'Verified across 13,856 configurations   ·   no setting reaches one artefact and not the others   ·   no contradictory pair is reachable':
   '已驗證 13,856 種組合   ·   沒有任何設定只到達其中一份產物   ·   無法選出互相矛盾的組合',
 'Technical Spec': '技術規格書',
 'the document a reviewer reads': '審閱者閱讀的文件',
 'MQL5 Expert Advisor': 'MQL5 專家顧問',
 'the executable for MetaTrader 5': 'MetaTrader 5 的執行檔',
 'the backtest in TradingView': 'TradingView 上的回測',
 '41 / 41 settings': '41 / 41 個設定',

 'A   ·   THE BASIC LOGIC': 'A   ·   基本邏輯',
 'The framework is a cascade, not a form': '這是一條層層收窄的決策鏈，不是一張表格',
 'MARKET LENS': '市場視角',
 'What regime must the market be in?': '市場必須處於什麼狀態？',
 'Trend · Range · Volatility · Session bias': '趨勢 · 區間 · 波動 · 時段偏向',
 'FAMILY': '策略家族',
 'Which edge suits that regime?': '哪一種優勢適合這種狀態？',
 'A Range lens rules out Breakout and Momentum': '選了區間視角，就排除突破與動能',
 'MECHANIC': '具體機制',
 'Which exact algorithm is emitted?': '實際輸出的是哪一個演算法？',
 'Breakout offers Donchian or opening range only': '突破家族只有 Donchian 或開盤區間可選',
 'PARAMETERS': '參數',
 'Which numbers does that algorithm need?': '這個演算法需要哪些數字？',
 'the mechanic decides which settings exist at all': '機制決定哪些設定才存在',
 'GATE 01': '關卡 01',
 'APPLICABILITY · when does a field exist?': '適用性 · 欄位何時才存在？',
 'A field is only in play if its parent choice is on. Turn the session window off and both clock fields leave all three artefacts — they do not linger as ignored inputs.':
   '欄位只有在它的上位選擇開啟時才生效。把時段視窗關掉，兩個時間欄位就會從三份產物中一併消失——不會留下被忽略的輸入。',
 'GATE 02': '關卡 02',
 'AVAILABILITY · which options can be picked?': '可用性 · 哪些選項可以被選？',
 'Options outside the current chain stay visible but blocked, with the reason attached. You cannot select a mechanic that belongs to another family.':
   '不在當前鏈上的選項仍然看得見，但被鎖住並附上原因。你無法選到屬於其他家族的機制。',
 'GATE 03': '關卡 03',
 'CONTRADICTION · what changes when you change course?': '矛盾 · 改變方向時會連帶改變什麼？',
 'Moving the lens re-seats the family and the mechanic. Both adjustments are reported, so nothing silently disagrees with what you asked for.':
   '換了視角，家族與機制都會重新就位。兩項調整都會被回報，不會有任何東西默默與你的選擇不一致。',
 'Result: a short, lawful decision path from idea to running code.':
   '結果：從想法到可執行程式，一條簡短而有規則可循的決策路徑。',

 'B   ·   WHAT IT IS WORTH': 'B   ·   它的價值',
 'A consistency engine, a risk gate, a teaching tool': '一部一致性引擎、一道風險關卡、一個教學工具',
 'Three engines, one answer': '三部引擎，一個答案',
 'Spec, MT5 expert advisor and TradingView strategy are built from one set of decisions, so they cannot describe different systems.':
   '規格書、MT5 專家顧問與 TradingView 策略都由同一組決定產生，因此不可能描述成兩套不同的系統。',
 'No setting that does nothing': '沒有不起作用的設定',
 'Every control either changes the generated code or is greyed out with its reason. Dead inputs are the commonest way a backtest lies.':
   '每個控制項不是改變產生的程式碼，就是連同原因一起變灰。無效輸入正是回測最常見的說謊方式。',
 'An audit trail you can hand over': '可交付的稽核軌跡',
 'The spec reads as a document — reviewable by a partner, a prop firm or a risk committee without opening a chart.':
   '規格書讀起來像一份文件——合作夥伴、自營交易公司或風控委員會不用打開圖表就能審閱。',
 'Risk rules compiled, not promised': '風險規則寫進程式，不是口頭承諾',
 'Daily loss cap, peak-to-trough halt, exposure ceiling and one-position-per-direction ship inside both engines.':
   '單日虧損上限、由高點回撤即停、持倉曝險上限與每方向僅持一倉，全部內建於兩部引擎。',
 'A checklist for judging any strategy': '用來評判任何策略的清單',
 'The ten aspects double as an interrogation order for someone else’s system — or a vendor’s black box.':
   '這十個面向同時也是一套盤問順序，可以用來檢視別人的系統——或供應商的封閉黑箱。',
 'Variants in minutes, not weekends': '幾分鐘做出變體，而不是整個週末',
 'Change the lens or the mechanic and everything downstream re-derives; the report names what that invalidated.':
   '換掉視角或機制，下游全部重新推導；報告會指出哪些東西因此失效。',
 'What it does not do: choose the edge for you. It makes the arithmetic behind your choice explicit and repeatable.':
   '它不做的事：替你決定優勢在哪。它只把你選擇背後的計算方式攤開，讓它明確、可重複。',

 'C   ·   HOW IT WORKS': 'C   ·   如何使用',
 'Ten questions, answered in order': '十個問題，依次回答',
 'Scope it': '界定範圍',
 'Instrument, timeframe and the trading session you actually trade.':
   '交易標的、時間週期，以及你真正會交易的時段。',
 'Name the regime': '說出市場狀態',
 'Pick the lens. It sets the regime gate and limits the families below it.':
   '選定視角。它決定狀態關卡，並限制其下的策略家族。',
 'Choose the edge': '選擇優勢',
 'Family first, then the exact mechanic that will be coded.':
   '先選家族，再選要寫成程式的那個機制。',
 'Set entry, exit, size': '設定進出場與部位',
 'Trigger, confirmation, stop, target, trailing, exposure.':
   '觸發、確認、停損、目標、移動停損、曝險。',
 'Generate and read the report': '產生並閱讀報告',
 'All three artefacts at once, with warnings and what changed.':
   '三份產物一次產出，附上警示與變動說明。',
 '10 ASPECTS': '10 個面向',
 'Target Market': '目標市場',
 'Market Lens': '市場視角',
 'Strategy / Edge': '策略／優勢',
 'Entry Logic': '進場邏輯',
 'Trend': '趨勢',
 'Range': '區間',
 'Volatility': '波動',
 'Session bias': '時段偏向',
 'USER MANUAL': '使用手冊',
 '2  ·  MARKET LENS': '2  ·  市場視角',
 'Auto-adjusted: family Breakout → Mean Reversion': '自動調整：家族 Breakout → Mean Reversion',
 'Donchian lookback (bars)': 'Donchian 回看根數（K 棒）',
 'not applicable — only used by Breakout': '不適用——僅 Breakout 使用',
 '✓   No conflicting selections': '✓   沒有互相衝突的選擇',
 '2 auto-adjustments made · 3 options currently ruled out, each with its reason.':
   '已自動調整 2 項 · 目前有 3 個選項被排除，並附上原因。',
 'Coverage:  spec 41/41   ·   MQL5 41/41   ·   Pine 41/41':
   '覆蓋率　規格 / MQL5 / Pine 各 41/41',
 'Each active field carries a SPEC · MQL5 · PINE badge, so you can see where it lands.':
   '每個啟用中的欄位都掛有 SPEC · MQL5 · PINE 標記，可看出它落在哪裡。',
 'Nothing is hidden: blocked options stay on screen with their reason.':
   '不做隱藏：被封鎖的選項仍留在畫面上，並附上原因。',

 'D   ·   EXAMPLE OUTPUT': 'D   ·   輸出範例',
 'The same trade, described three ways': '同一筆交易，三種描述',
 'Trend lens  ·  Breakout family  ·  Donchian channel  ·  EURUSD H1  ·  41 of 60 settings active — all 41 present in all three files':
   'Trend 視角  ·  Breakout 家族  ·  Donchian 通道  ·  EURUSD H1  ·  60 個設定中啟用 41 個，三份產物全部具備',
 'TECHNICAL SPEC': '技術規格書',
 'the document': '文件',
 'MQL5 EXPERT ADVISOR': 'MQL5 專家顧問',
 'the executable': '執行檔',
 'the backtest': '回測',
 '§5  Filters': '§5  過濾',
 '§6  Exit logic': '§6  出場邏輯',
 '§7  Risk & position size': '§7  風險與部位大小',
 'Trend filter': '趨勢過濾',
 'only with trend': '僅順勢',
 'Trend reference': '趨勢參考',
 'Session filter': '時段過濾',
 'Stop distance': '停損距離',
 'Target method': '目標方式',
 'Risk multiple (R)': '風險倍數（R）',
 'Reward : risk': '盈虧比',
 'Trailing': '移動停損',
 'ATR trail, 1.5 × ATR': 'ATR 追蹤，1.5 × ATR',
 'Sizing': '部位計算',
 'Risk-based %': '依風險百分比',
 'Risk per trade': '每筆風險',
 '1% of equity': '淨值的 1%',
 'One pass, no manual translation.  The stop, the target, the trailing distance and the risk figure are the same numbers in all three artefacts — so the backtest and the live EA cannot drift apart.':
   '一次完成，無需人手轉譯。停損、目標、移動停損距離與風險金額，在三份產物中是同一組數字——回測與實盤 EA 無法背離。',
 'Strategy → EA v2  ·  framework overview': 'Strategy → EA v2  ·  框架總覽',
}

def tr(s):
    return TR.get(s, s) if ZH else s

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

SERIF, SANS, MONO = (('Microsoft JhengHei','Microsoft JhengHei','Consolas') if ZH
                     else ('Cambria','Calibri','Consolas'))

# minimum type size used anywhere in this deck
MIN = 10

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
    txt = tr(txt)
    assert size >= MIN, f'{size}pt below the {MIN}pt floor: {txt[:40]!r}'
    r = p.add_run(); r.text = txt
    f = r.font
    f.size, f.bold, f.italic, f.name = Pt(size), bold, italic, font
    f.color.rgb = color
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
    text(s, ML, 0.42, CW, 0.26, kicker, size=10.5, color=BLUE, bold=True)
    text(s, ML, 0.70, CW, 0.62, title, size=25, color=INK, bold=True, font=SERIF)
    foot(s, page)


def foot(s, page):
    ln = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, In(ML), In(6.98), In(ML + CW), In(6.98))
    ln.line.color.rgb = RULE; ln.line.width = Pt(0.75)
    text(s, ML, 7.08, 7.4, 0.24, 'Strategy → EA v2  ·  framework overview', size=10, color=DIM)
    text(s, ML + CW - 1.2, 7.08, 1.2, 0.24, f'{page:02d}', size=10, color=DIM, align=PP_ALIGN.RIGHT)


def new(kicker, title, page, bg=PAPER):
    s = prs.slides.add_slide(BLANK)
    rect(s, 0, 0, W, H, fill=bg, line=None)
    header(s, kicker, title, page)
    return s


# ══════════════════════════════════════════════════ 1 · TITLE
s = prs.slides.add_slide(BLANK)
rect(s, 0, 0, W, H, fill=PAPER, line=None)
text(s, ML, 0.60, 8.2, 0.26, 'STRATEGY  →  EA  v2      ·      A FRAMEWORK FOR SYSTEMATIC TRADING',
     size=10.5, color=BLUE, bold=True)

SITE = 'https://strategy-to-ea-v2-mwlai.zocomputer.io/'
pill = rect(s, 9.08, 0.53, 3.50, 0.36, fill=BF, line=RGBColor(0xC9,0xDA,0xF8), radius=0.5)
_tf = pill.text_frame
_tf.word_wrap = False
_tf.margin_left = _tf.margin_right = 0
_tf.vertical_anchor = MSO_ANCHOR.MIDDLE
_p = _tf.paragraphs[0]; _p.alignment = PP_ALIGN.CENTER
_r = run(_p, 'strategy-to-ea-v2-mwlai.zocomputer.io  ↗', 10, BLUE, True)
_r.hyperlink.address = SITE
_rid = pill.part.relate_to(SITE, RT.HYPERLINK, is_external=True)
_hl = _et.SubElement(pill._element.nvSpPr.cNvPr, qn('a:hlinkClick'))
_hl.set(qn('r:id'), _rid)

text(s, ML, 0.94, 11.3, 1.30,
     [('Your trading idea, written once', {'line': 1.06}),
      ('and rendered three ways', {'line': 1.06})],
     size=34, color=INK, bold=True, font=SERIF)
text(s, ML, 2.42, 10.2, 0.82,
     'Ten questions decide the strategy. One constraint engine checks that the answers agree. '
     'The same decisions are then emitted as a technical specification, an MQL5 expert advisor '
     'and a Pine Script strategy — with no setting left behind.',
     size=12.5, color=BODY, line=1.32)

hy, hh = 4.00, 1.78
c = rect(s, ML, hy, 2.85, hh, fill=BF, line=RGBColor(0xC9,0xDA,0xF8))
text(s, ML + 0.26, hy + 0.22, 2.35, 0.22, 'INPUT', size=10, color=BLUE, bold=True)
text(s, ML + 0.26, hy + 0.48, 2.35, 0.44, '10 aspects', size=20, color=INK, bold=True, font=SERIF)
text(s, ML + 0.26, hy + 1.00, 2.32, 0.68,
     '60 settings in the model. Only the ones the chosen path needs ever switch on.',
     size=11, color=BODY, line=1.28)

c = rect(s, 4.02, hy, 2.95, hh, fill=VF, line=RGBColor(0xDD,0xD0,0xF6))
text(s, 4.28, hy + 0.22, 2.45, 0.22, 'CONSTRAINT ENGINE', size=10, color=VIOLET, bold=True)
text(s, 4.28, hy + 0.48, 2.45, 0.44, 'Three gates', size=20, color=INK, bold=True, font=SERIF)
text(s, 4.28, hy + 1.00, 2.42, 0.68,
     'Applicability, availability and contradiction — re-checked on every change you make.',
     size=11, color=BODY, line=1.28)

for ax in (3.62, 7.04):
    a = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, In(ax), In(hy + hh/2), In(ax + 0.30), In(hy + hh/2))
    a.line.color.rgb = RGBColor(0xB4, 0xB9, 0xC4); a.line.width = Pt(1.5)
    ar = shape(s, MSO_SHAPE.ISOSCELES_TRIANGLE, ax + 0.30, hy + hh/2 - 0.06, 0.14, 0.12, fill=RGBColor(0xB4,0xB9,0xC4))
    ar.rotation = 90

outs = [('Technical Spec', 'the document a reviewer reads', BLUE, BF),
        ('MQL5 Expert Advisor', 'the executable for MetaTrader 5', AMBER, AF),
        ('Pine Script v6', 'the backtest in TradingView', GREEN, GF)]
oy, oh, gap = 3.28, 0.90, 0.15
for i, (t1, t2, acc, fl) in enumerate(outs):
    y = oy + i * (oh + gap)
    rect(s, 7.52, y, 5.06, oh, fill=WHITE, line=RULE, radius=0.14)
    rect(s, 7.52, y, 0.075, oh, fill=acc, line=None)
    text(s, 7.74, y + 0.11, 3.0, 0.30, t1, size=14.5, color=INK, bold=True, font=SERIF)
    text(s, 7.74, y + 0.47, 2.85, 0.24, t2, size=10.5, color=DIM)
    text(s, 10.55, y + 0.31, 1.85, 0.28, '41 / 41 settings', size=10.5, color=acc, bold=True, align=PP_ALIGN.RIGHT)

text(s, ML, 6.44, CW, 0.28,
     'Verified across 13,856 configurations   ·   no setting reaches one artefact and not the others   ·   no contradictory pair is reachable',
     size=10.5, color=DIM)
foot(s, 1)

# ══════════════════════════════════════════════════ 2 · LOGIC
s = new('A   ·   THE BASIC LOGIC', 'The framework is a cascade, not a form', 2)
stages = [
    ('1', 'MARKET LENS', 'What regime must the market be in?', 'Trend · Range · Volatility · Session bias', BLUE, BF),
    ('2', 'FAMILY', 'Which edge suits that regime?', 'A Range lens rules out Breakout and Momentum', VIOLET, VF),
    ('3', 'MECHANIC', 'Which exact algorithm is emitted?', 'Breakout offers Donchian or opening range only', TEAL, TF),
    ('4', 'PARAMETERS', 'Which numbers does that algorithm need?', 'the mechanic decides which settings exist at all', AMBER, AF),
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
    run(bp, n, 11.5, acc, True, font=SERIF)
    text(s, ML + 0.88, y + 0.15, 3.82, 0.22, name, size=10, color=acc, bold=True)
    text(s, ML + 0.88, y + 0.36, 3.82, 0.28, q, size=12.5, color=INK, bold=True, font=SERIF)
    text(s, ML + 0.88, y + 0.66, 3.82, 0.22, sub, size=10.5, color=DIM)

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
gy, gh, ggap = 1.62, 1.40, 0.14
for i, (tag, title, acc, fl, body) in enumerate(gates):
    y = gy + i * (gh + ggap)
    rect(s, gx, y, gw, gh, fill=WHITE, line=RULE, radius=0.10)
    rect(s, gx, y, gw, 0.05, fill=acc, line=None)
    text(s, gx + 0.28, y + 0.20, 1.9, 0.22, tag, size=10, color=acc, bold=True)
    text(s, gx + 0.28, y + 0.42, gw - 0.56, 0.26, title, size=12.5, color=INK, bold=True, font=SERIF)
    text(s, gx + 0.28, y + 0.72, gw - 0.56, 0.60, body, size=11, color=BODY, line=1.26)

text(s, gx, 6.28, gw, 0.26, 'Result: a short, lawful decision path from idea to running code.',
     size=11, color=INK, bold=True)

# ══════════════════════════════════════════════════ 3 · BENEFITS
s = new('B   ·   WHAT IT IS WORTH', 'A consistency engine, a risk gate, a teaching tool', 3)
ben = [
    ('01', 'Three engines, one answer', 'Spec, MT5 expert advisor and TradingView strategy are built from one set of decisions, so they cannot describe different systems.', BLUE),
    ('02', 'No setting that does nothing', 'Every control either changes the generated code or is greyed out with its reason. Dead inputs are the commonest way a backtest lies.', VIOLET),
    ('03', 'An audit trail you can hand over', 'The spec reads as a document — reviewable by a partner, a prop firm or a risk committee without opening a chart.', TEAL),
    ('04', 'Risk rules compiled, not promised', 'Daily loss cap, peak-to-trough halt, exposure ceiling and one-position-per-direction ship inside both engines.', AMBER),
    ('05', 'A checklist for judging any strategy', 'The ten aspects double as an interrogation order for someone else\u2019s system — or a vendor\u2019s black box.', GREEN),
    ('06', 'Variants in minutes, not weekends', 'Change the lens or the mechanic and everything downstream re-derives; the report names what that invalidated.', RED),
]
cw3 = (CW - 2 * 0.26) / 3
for i, (n, head, body, acc) in enumerate(ben):
    col, row = i % 3, i // 3
    x = ML + col * (cw3 + 0.26)
    y = 1.62 + row * (1.96 + 0.28)
    rect(s, x, y, cw3, 1.96, fill=WHITE, line=RULE, radius=0.10)
    rect(s, x, y, cw3, 0.05, fill=acc, line=None)
    text(s, x + 0.26, y + 0.18, 1.0, 0.22, n, size=10.5, color=acc, bold=True)
    text(s, x + 0.26, y + 0.42, cw3 - 0.52, 0.56, head, size=14, color=INK, bold=True, font=SERIF, line=1.10)
    text(s, x + 0.26, y + 0.88, cw3 - 0.52, 0.98, body, size=11.5, color=BODY, line=1.26)

text(s, ML, 6.30, CW, 0.28,
     'What it does not do: choose the edge for you. It makes the arithmetic behind your choice explicit and repeatable.',
     size=11, color=DIM)

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
    b = shape(s, MSO_SHAPE.OVAL, ML, y, 0.42, 0.42, fill=BLUE, line=None)
    b.text_frame.margin_left = b.text_frame.margin_right = 0
    b.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
    bp = b.text_frame.paragraphs[0]; bp.alignment = PP_ALIGN.CENTER
    run(bp, str(i + 1), 11.5, WHITE, True, font=SERIF)
    text(s, ML + 0.60, y - 0.04, 5.0, 0.28, head, size=13, color=INK, bold=True, font=SERIF)
    text(s, ML + 0.60, y + 0.26, 5.0, 0.32, body, size=11, color=BODY, line=1.24)

mx, my, mw, mh = 6.55, 1.60, 6.03, 4.46
rect(s, mx, my, mw, mh, fill=WHITE, line=RULE, radius=0.05)
rect(s, mx, my, 2.06, mh, fill=FILL, line=None, radius=0.05)
text(s, mx + 0.20, my + 0.20, 1.72, 0.24, '10 ASPECTS', size=10, color=DIM, bold=True)
for i, lab in enumerate(['Target Market', 'Market Lens', 'Strategy / Edge', 'Entry Logic']):
    ry = my + 0.52 + i * 0.36
    if i == 1:
        rect(s, mx + 0.12, ry - 0.06, 1.82, 0.34, fill=WHITE, line=BLUE, radius=0.3, lw=1.0)
        text(s, mx + 0.22, ry, 1.6, 0.22, f'{i+1}   ' + lab, size=10.5, color=BLUE, bold=True)
    else:
        text(s, mx + 0.26, ry, 1.6, 0.22, f'{i+1}   ' + lab, size=10.5, color=BODY)
rect(s, mx + 0.18, my + 2.08, 1.70, 0.010, fill=RGBColor(0xD6,0xD5,0xCE), line=None)
text(s, mx + 0.20, my + 2.24, 1.72, 0.22, 'USER MANUAL', size=10, color=DIM, bold=True)
text(s, mx + 0.20, my + 2.52, 1.72, 0.24, 'PDF   \u2197', size=10.5, color=BLUE, bold=True)

text(s, mx + 2.24, my + 0.20, 3.44, 0.22, '2  ·  MARKET LENS', size=10, color=DIM, bold=True)
lens = [('Trend', False), ('Range', True), ('Volatility', False), ('Session bias', False)]
lw_ = [0.64, 0.64, 0.94, 1.14]
lx = mx + 2.24
for (lab, on), ww in zip(lens, lw_):
    if on:
        rect(s, lx, my + 0.48, ww, 0.34, fill=BF, line=BLUE, radius=0.5, lw=1.0)
        text(s, lx, my + 0.535, ww, 0.22, lab, size=10.5, color=BLUE, bold=True, align=PP_ALIGN.CENTER)
    else:
        rect(s, lx, my + 0.48, ww, 0.34, fill=WHITE, line=RULE, radius=0.5)
        text(s, lx, my + 0.535, ww, 0.22, lab, size=10.5, color=BODY, align=PP_ALIGN.CENTER)
    lx += ww + 0.07

text(s, mx + 2.24, my + 1.00, 3.60, 0.24, 'Auto-adjusted: family Breakout \u2192 Mean Reversion',
     size=10.5, color=AMBER, bold=True)
rect(s, mx + 2.24, my + 1.32, 3.58, 0.66, fill=RGBColor(0xF7,0xF6,0xF2), line=RULE, radius=0.10)
text(s, mx + 2.40, my + 1.40, 3.26, 0.24, 'Donchian lookback (bars)', size=10.5, color=RGBColor(0x9C,0xA3,0xB2))
text(s, mx + 2.40, my + 1.64, 3.26, 0.22, 'not applicable — only used by Breakout', size=10, color=RGBColor(0x9C,0xA3,0xB2))

rect(s, mx + 2.24, my + 2.12, 3.58, 1.08, fill=GF, line=RGBColor(0xC6,0xE9,0xD5), radius=0.10)
text(s, mx + 2.40, my + 2.20, 3.26, 0.24, '\u2713   No conflicting selections', size=10.5, color=RGBColor(0x14,0x6B,0x3C), bold=True)
text(s, mx + 2.40, my + 2.48, 3.26, 0.60,
     '2 auto-adjustments made · 3 options currently ruled out, each with its reason.',
     size=10, color=RGBColor(0x2A,0x5C,0x42), line=1.20)

text(s, mx + 2.24, my + 3.30, 3.58, 0.24, 'Coverage:  spec 41/41   ·   MQL5 41/41   ·   Pine 41/41',
     size=10, color=DIM, bold=True)
text(s, mx + 2.24, my + 3.72, 3.58, 0.42,
     'Each active field carries a SPEC · MQL5 · PINE badge, so you can see where it lands.',
     size=10, color=DIM, line=1.20)

text(s, ML, 6.22, 5.5, 0.52,
     'Nothing is hidden: blocked options stay on screen with their reason.',
     size=10.5, color=DIM)

# ══════════════════════════════════════════════════ 5 · EXAMPLE
s = new('D   ·   EXAMPLE OUTPUT', 'The same trade, described three ways', 5)
text(s, ML, 1.36, CW, 0.26,
     'Trend lens  ·  Breakout family  ·  Donchian channel  ·  EURUSD H1  ·  41 of 60 settings active — all 41 present in all three files',
     size=10.5, color=DIM)

cols = [
    ('TECHNICAL SPEC', 'the document', BLUE, [
        ('h', '\u00a75  Filters'),
        ('r', ('Trend filter', 'only with trend')),
        ('r', ('Trend reference', 'SMA(50)')),
        ('r', ('Session filter', '8:00 \u2013 16:00')),
        ('h', '\u00a76  Exit logic'),
        ('r', ('Stop distance', '2 \u00d7 ATR(14)')),
        ('r', ('Target method', 'Risk multiple (R)')),
        ('r', ('Reward : risk', '1 : 3')),
        ('r', ('Trailing', 'ATR trail, 1.5 \u00d7 ATR')),
        ('h', '\u00a77  Risk & position size'),
        ('r', ('Sizing', 'Risk-based %')),
        ('r', ('Risk per trade', '1% of equity')),
    ]),
    ('MQL5 EXPERT ADVISOR', 'the executable', AMBER, [
        ('c', 'input double Inp_SlAtr = 2;'),
        ('c', 'input double Inp_TrailAtr = 1.5;'),
        ('c', 'input double Inp_RrTarget = 3;'),
        ('c', 'input double Inp_RiskPercent = 1;'),
        ('c', 'input double Inp_MaxDailyLoss = 3;'),
        ('c', 'input double Inp_MaxDrawdown = 20;'),
        ('c', 'input int Inp_MaxOpenTrades = 1;'),
        ('s', ''),
        ('c', 'regimeOK = adxBuf[1] >= Inp_AdxMin'),
        ('c', '        && atrPctNow >= Inp_AtrPct;'),
        ('s', ''),
        ('c', 'if(Inp_OnlyTrend)'),
        ('c', '   trendOK = close > trendSMA;'),
    ]),
    ('PINE SCRIPT v6', 'the backtest', GREEN, [
        ('c', "strategy('EURUSD H1 \u00b7 Donchian',"),
        ('c', "         overlay=true, ...)"),
        ('c', 'lookback     = input.int(55, ...)'),
        ('c', 'slAtrMult    = input.float(2, ...)'),
        ('c', 'trailAtrMult = input.float(1.5, ...)'),
        ('c', 'rrTarget     = input.float(3, ...)'),
        ('s', ''),
        ('c', 'donHi = ta.highest(high, lookback)'),
        ('c', 'longSig = close > donHi'),
        ('c', 'longSig := longSig and gateOK'),
        ('s', ''),
        ('c', 'plotshape(goLong and'),
        ('c', '  strategy.position_size == 0)'),
    ]),
]
cw5 = (CW - 2 * 0.24) / 3
for i, (tab, sub_, acc, lines) in enumerate(cols):
    x = ML + i * (cw5 + 0.24)
    rect(s, x, 1.72, cw5, 4.10, fill=WHITE, line=RULE, radius=0.06)
    rect(s, x, 1.72, cw5, 0.05, fill=acc, line=None)
    text(s, x + 0.24, 1.90, cw5 - 0.48, 0.24, tab, size=10.5, color=acc, bold=True)
    text(s, x + 0.24, 2.16, cw5 - 0.48, 0.22, sub_, size=10, color=DIM, italic=True)
    y = 2.42
    for kind, item in lines:
        if kind == 'h':
            y += 0.13
            text(s, x + 0.24, y, cw5 - 0.48, 0.22, item, size=10.5, color=INK, bold=True)
            y += 0.27
        elif kind == 's':
            y += 0.18
        elif kind == 'r':
            k, v = item
            text(s, x + 0.24, y, 1.32, 0.22, k, size=10.5, color=DIM)
            text(s, x + 1.54, y, cw5 - 1.78, 0.22, v, size=10.5, color=INK)
            y += 0.235
        else:
            text(s, x + 0.24, y, cw5 - 0.44, 0.22, item, size=10, color=RGBColor(0x2B,0x38,0x4E),
                 font=MONO, line=1.0)
            y += 0.235

rect(s, ML, 5.94, CW, 0.74, fill=BF, line=RGBColor(0xC9,0xDA,0xF8), radius=0.12)
text(s, ML + 0.30, 6.06, CW - 0.6, 0.50,
     'One pass, no manual translation.  The stop, the target, the trailing distance and the risk figure are the same '
     'numbers in all three artefacts — so the backtest and the live EA cannot drift apart.',
     size=10.5, color=RGBColor(0x1B,0x3B,0x7A), line=1.24)

OUT = '/home/workspace/slide-decks/strategy-to-ea-v2/Strategy-to-EA-v2-Framework' + ('-CN' if ZH else '') + '.pptx'
prs.save(OUT)
print('saved', len(prs.slides._sldIdLst))
