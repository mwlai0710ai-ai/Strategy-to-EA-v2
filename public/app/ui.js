/* ─────────────────────────────────────────────────────────────
   UI layer — renders the framework, the live constraint report,
   the coverage proof and the three generated outputs.
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var MODEL = window.MODEL, ENGINE = window.ENGINE;
  var STATE_KEY = 's2ea-v2-state';

  var state, lastResolve, tab = 'spec', currentAspect = 0, visited = {};

  /* ── state ───────────────────────────────────────────────── */
  function defaultState() {
    var s = {};
    MODEL.fieldList().forEach(function (k) { s[k] = MODEL.FIELD_DEFS[k].def; });
    return s;
  }

  function load() {
    state = defaultState();
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        Object.keys(saved).forEach(function (k) { if (k in state) state[k] = saved[k]; });
      }
    } catch (e) { /* private mode or corrupt payload — defaults are fine */ }
  }

  function save() {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ── helpers ─────────────────────────────────────────────── */
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  function landingBadges(k) {
    var f = MODEL.FIELD_DEFS[k], L = f.land || { mql: 'logic', pine: 'logic' };
    var out = ['<span class="land spec">Spec</span>'];
    out.push('<span class="land ' + L.mql + '" title="' + (L.mql === 'logic' ? 'Enforced in the generated logic' : 'Documented in the script header') + '">MQL5' + (L.mql === 'doc' ? '·doc' : '') + '</span>');
    out.push('<span class="land ' + L.pine + '" title="' + (L.pine === 'logic' ? 'Enforced in the generated logic' : 'Documented in the script header') + '">Pine' + (L.pine === 'doc' ? '·doc' : '') + '</span>');
    return '<span class="lands">' + out.join('') + '</span>';
  }

  /* ── aspect menu ─────────────────────────────────────────── */
  function renderMenu() {
    var host = el('menu'), html = '';
    MODEL.ASPECTS.forEach(function (a, i) {
      var na = a.keys.filter(function (k) { return !state.__active[k]; }).length;
      var all = a.keys.length;
      var chip = na === 0 ? '<span class="m-chip ok">' + all + '</span>'
        : (na === all ? '<span class="m-chip na">n/a</span>' : '<span class="m-chip part">' + (all - na) + '/' + all + '</span>');
      html += '<button class="mitem' + (i === currentAspect ? ' active' : '') + '" data-aspect="' + i + '" style="--c:' + a.color + '">' +
        '<span class="m-num">' + a.id + '</span><span class="m-name">' + esc(a.name) + '</span>' + chip +
        (visited[i] ? '<span class="m-dot" aria-hidden="true"></span>' : '') +
        '</button>';
    });
    host.innerHTML = html;
    Array.prototype.forEach.call(host.querySelectorAll('.mitem'), function (b) {
      b.addEventListener('click', function () {
        currentAspect = Number(b.getAttribute('data-aspect'));
        visited[currentAspect] = true;
        renderMenu(); renderDetail();
        el('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  /* ── one control ─────────────────────────────────────────── */
  function control(key) {
    var f = MODEL.FIELD_DEFS[key];
    var v = state[key];
    var active = !!state.__active[key];
    var reason = active ? '' : (typeof f.appliesReason === 'function' ? f.appliesReason(state) : (f.appliesReason || 'not applicable'));
    var html = '<div class="field' + (active ? '' : ' off') + '" data-field="' + key + '">';
    html += '<div class="f-head"><span class="f-label">' + esc(f.label) + '</span>';
    html += active ? '' : '<span class="f-na">not applicable</span>';
    html += '</div>';
    if (f.hint) html += '<div class="f-hint">' + esc(f.hint) + '</div>';
    if (!active) html += '<div class="f-reason">' + esc(reason) + '</div>';

    if (f.kind === 'select') {
      html += '<div class="opts">';
      ENGINE.optionsFor(key, state).forEach(function (o) {
        var ok = active && ENGINE.optionOk(key, o, state);
        var why = (!active) ? reason : (ok ? '' : ENGINE.optionWhy(key, o, state));
        html += '<button class="opt' + (v === o ? ' sel' : '') + (ok ? '' : ' blocked') + '"' +
          ' data-key="' + key + '" data-val="' + esc(o) + '"' + (ok ? '' : ' disabled') + '>' +
          '<span class="opt-v">' + esc(o) + '</span>' +
          (ok ? '' : '<span class="opt-why">' + esc(why) + '</span>') +
          '</button>';
      });
      html += '</div>';
    } else if (f.kind === 'range') {
      html += '<div class="row"><input type="range" data-key="' + key + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + v + '"' + (active ? '' : ' disabled') + '>' +
        '<output class="ro" data-out="' + key + '">' + v + '</output></div>';
    } else if (f.kind === 'toggle') {
      html += '<div class="seg" role="group">' +
        '<button class="seg-b' + (v === true ? ' on' : '') + '" data-key="' + key + '" data-val="true"' + (active ? '' : ' disabled') + '>' + esc(f.on || 'On') + '</button>' +
        '<button class="seg-b' + (v === false ? ' on' : '') + '" data-key="' + key + '" data-val="false"' + (active ? '' : ' disabled') + '>' + esc(f.off || 'Off') + '</button>' +
        '</div>';
    } else {
      html += '<div class="row"><input type="text" data-key="' + key + '" value="' + esc(v) + '"' + (active ? '' : ' disabled') + '></div>';
    }
    html += '<div class="f-foot">' + landingBadges(key) + '</div>';
    html += '</div>';
    return html;
  }

  /* ── detail panel ────────────────────────────────────────── */
  function renderDetail() {
    var a = MODEL.ASPECTS[currentAspect];
    var host = el('detail');
    var html = '<div class="d-head" style="--c:' + a.color + '"><span class="d-num">' + a.id + '</span><h2>' + esc(a.name) + '</h2></div>' +
      '<p class="d-q">' + esc(a.q) + '</p>' +
      (a.tip ? '<p class="d-tip">' + esc(a.tip) + '</p>' : '') +
      '<div class="d-fields">';
    a.keys.forEach(function (k) { html += control(k); });
    html += '</div>';
    host.innerHTML = html;
    wireControls(host);
  }

  /* ── settings panel ─────────────────────────────────────── */
  function renderInputs() {
    var host = el('inputs'), html = '';
    MODEL.ASPECTS.forEach(function (a) {
      var na = a.keys.filter(function (k) { return !state.__active[k]; }).length;
      html += '<section class="is-group">' +
        '<div class="is-title"><span class="is-num" style="--c:' + a.color + '">' + a.id + '</span>' + esc(a.name) +
        (na ? '<span class="is-na">' + na + ' n/a</span>' : '') + '</div>' +
        '<div class="is-body">';
      a.keys.forEach(function (k) { html += control(k); });
      html += '</div></section>';
    });
    host.innerHTML = html;
    wireControls(host);
  }

  /* ── constraint report ──────────────────────────────────── */
  function renderReport(res) {
    var host = el('report'), html = '';
    var coerced = res.notes.filter(function (n) { return n.kind === 'coerced'; });
    var blocked = res.notes.filter(function (n) { return n.kind === 'blocked'; });

    html += '<div class="rep-card ' + (coerced.length ? 'warn' : 'ok') + '">';
    html += '<div class="rep-h">' + (coerced.length ? '⟳ ' + coerced.length + ' auto-adjustment' + (coerced.length === 1 ? '' : 's') : '✓ No conflicting selections') + '</div>';
    if (coerced.length) {
      html += '<ul class="rep-list">';
      coerced.forEach(function (n) {
        html += '<li><code>' + esc(MODEL.label(n.key)) + '</code> moved <b>' + esc(n.from) + '</b> → <b>' + esc(n.to) + '</b><span class="rep-why">' + esc(n.reason) + '</span></li>';
      });
      html += '</ul>';
    } else {
      html += '<div class="rep-sub">Every choice you made is compatible with the ones before it.</div>';
    }
    html += '</div>';

    html += '<div class="rep-card ' + (blocked.length ? 'info' : 'ok') + '">';
    html += '<div class="rep-h">' + blocked.length + ' option' + (blocked.length === 1 ? '' : 's') + ' currently ruled out</div>';
    if (blocked.length) {
      html += '<ul class="rep-list">';
      blocked.slice(0, 24).forEach(function (n) {
        html += '<li><code>' + esc(MODEL.label(n.key)) + '</code> · <b>' + esc(n.from) + '</b><span class="rep-why">' + esc(n.reason) + '</span></li>';
      });
      if (blocked.length > 24) html += '<li class="rep-more">…and ' + (blocked.length - 24) + ' more</li>';
      html += '</ul>';
    }
    html += '</div>';

    var ca = res.cautions;
    html += '<div class="rep-card ' + (ca.length ? 'caution' : 'ok') + '">';
    html += '<div class="rep-h">' + (ca.length ? '⚠ ' + ca.length + ' caution' + (ca.length === 1 ? '' : 's') : '✓ No cautions') + '</div>';
    if (ca.length) {
      html += '<ul class="rep-list">';
      ca.forEach(function (c) {
        html += '<li>' + esc(c.text) + (c.fix ? ' <button class="mini" data-fix="' + esc(JSON.stringify(c.fix)) + '">apply fix</button>' : '') + '</li>';
      });
      html += '</ul>';
    }
    html += '</div>';

    host.innerHTML = html;
    Array.prototype.forEach.call(host.querySelectorAll('[data-fix]'), function (b) {
      b.addEventListener('click', function () {
        try {
          var fix = JSON.parse(b.getAttribute('data-fix'));
          state[fix.key] = fix.to;
          commit();
        } catch (e) { /* ignore */ }
      });
    });
  }

  /* ── coverage proof ─────────────────────────────────────── */
  function renderCoverage(activeKeys, consumed) {
    var host = el('coverage');
    var rows = [['Spec', consumed.spec], ['MQL5', consumed.mql], ['Pine v6', consumed.pine]];
    var allOk = true;
    var html = '';
    rows.forEach(function (r) {
      var missing = activeKeys.filter(function (k) { return !r[1][k]; });
      if (missing.length) allOk = false;
      html += '<div class="cov-row' + (missing.length ? ' bad' : '') + '">' +
        '<span class="cov-name">' + r[0] + '</span>' +
        '<span class="cov-n">' + (activeKeys.length - missing.length) + ' / ' + activeKeys.length + '</span>' +
        (missing.length ? '<span class="cov-miss">missing: ' + esc(missing.map(MODEL.label).join(', ')) + '</span>' : '<span class="cov-ok">all settings present</span>') +
        '</div>';
    });
    html += '<div class="cov-note">' + (allOk
      ? 'Every setting you selected appears in all three outputs.'
      : 'Some selected settings are missing from an output — that is a bug, please report it.') + '</div>';
    host.innerHTML = html;
    host.className = 'coverage ' + (allOk ? 'ok' : 'bad');
    var chip = el('cov-chip');
    if (chip) {
      chip.textContent = allOk ? 'all 3 outputs carry every setting ✓' : 'coverage gap detected';
      chip.className = 'chip ' + (allOk ? 'good' : 'bad');
    }
  }

  /* ── outputs ────────────────────────────────────────────── */
  var outputs = { spec: '', mql: '', pine: '' };
  var fileNames = { spec: 'technical-spec.txt', mql: 'Strategy.mq5', pine: 'Strategy.pine' };

  function regenerate() {
    outputs.spec = window.GEN_SPEC.build(state);
    outputs.mql = window.GEN_MQL.build(state);
    outputs.pine = window.GEN_PINE.build(state);
  }

  function renderOutputs() {
    var o = outputs[tab];
    el('output').textContent = o.text;
    el('out-title').textContent = ({ spec: 'Technical Spec', mql: 'MQL5 Expert Advisor', pine: 'Pine Script v6' })[tab];
    el('out-sub').textContent = o.text.split('\n').length + ' lines · ' + o.text.length.toLocaleString() + ' characters';
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
    el('linecount').textContent = ({ spec: 'spec', mql: 'MQL5', pine: 'Pine' })[tab] + ' · ' + o.text.split('\n').length + ' lines';
    renderCoverage(activeKeys(), {
      spec: outputs.spec.consumed, mql: outputs.mql.consumed, pine: outputs.pine.consumed
    });
  }

  function activeKeys() {
    return MODEL.fieldList().filter(function (k) { return state.__active[k]; });
  }

  /* ── wiring ─────────────────────────────────────────────── */
  function wireControls(host) {
    Array.prototype.forEach.call(host.querySelectorAll('.opt'), function (b) {
      if (b.disabled) return;
      b.addEventListener('click', function () {
        state[b.getAttribute('data-key')] = b.getAttribute('data-val');
        commit();
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll('.seg-b'), function (b) {
      if (b.disabled) return;
      b.addEventListener('click', function () {
        state[b.getAttribute('data-key')] = b.getAttribute('data-val') === 'true';
        commit();
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll('input[type=range]'), function (r) {
      if (r.disabled) return;
      r.addEventListener('input', function () {
        var k = r.getAttribute('data-key');
        state[k] = Number(r.value);
        var out = host.querySelector('[data-out="' + k + '"]');
        if (out) out.textContent = r.value;
        commitLight();
      });
      r.addEventListener('change', function () { commit(); });
    });
    Array.prototype.forEach.call(host.querySelectorAll('input[type=text]'), function (t) {
      if (t.disabled) return;
      t.addEventListener('input', function () {
        var k = t.getAttribute('data-key');
        state[k] = (k === 'magic') ? (t.value.replace(/[^0-9]/g, '') || '0') : t.value;
        commitLight();
      });
      t.addEventListener('blur', function () { commit(); });
    });
  }

  /* ── render ─────────────────────────────────────────────── */
  function commitLight() {
    lastResolve = ENGINE.resolve(state);
    regenerate();
    renderOutputs();
  }

  function commit() {
    lastResolve = ENGINE.resolve(state);
    save();
    renderMenu();
    renderDetail();
    renderInputs();
    renderReport(lastResolve);
    regenerate();
    renderOutputs();
  }

  /* ── copy / download / reset ────────────────────────────── */
  function copyOut() {
    var txt = outputs[tab].text;
    var done = function () { flash('Copied ' + ({ spec: 'spec', mql: 'MQL5 source', pine: 'Pine source' })[tab] + ' to the clipboard.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { fallback(txt, done); });
    } else fallback(txt, done);
  }
  function fallback(txt, done) {
    var ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
  }
  function downloadOut() {
    var blob = new Blob([outputs[tab].text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileNames[tab];
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 400);
  }
  var flashT = null;
  function flash(msg) {
    var t = el('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(flashT); flashT = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ── exhaustive coverage verification ───────────────────── */
  var LENS = ['Trend', 'Range', 'Volatility', 'Session bias'];
  var FAM = ['Breakout', 'Momentum', 'Mean Reversion', 'SMC / ICT'];
  var MECH = ['Donchian channel', 'Opening range (ORB)', 'EMA cross', 'MACD', 'Bollinger reversion', 'RSI reversion', 'Fair value gap (FVG)', 'Liquidity sweep'];
  var SL = ['ATR multiple', 'Fixed points', 'Swing structure'];
  var TP = ['Risk multiple (R)', 'Fixed points'];
  var TR = ['Off', 'ATR trail', 'Points trail'];
  var OT = ['Market', 'Limit', 'Stop'];
  var RM = ['Risk-based %', 'Fixed lots'];
  var ST = ['Attached with order', 'Separate modify'];

  function combos() {
    var out = [];
    LENS.forEach(function (lens) { FAM.forEach(function (family) { MECH.forEach(function (sub) {
      SL.forEach(function (sl) { TP.forEach(function (tp) { TR.forEach(function (tr) {
        OT.forEach(function (ot) { RM.forEach(function (rm) { ST.forEach(function (st) {
          out.push({ lens: lens, family: family, sub: sub, slMode: sl, tpMode: tp, trail: tr, orderType: ot, riskMode: rm, setSlTp: st });
        }); }); }); }); }); });
    }); }); });
    return out;
  }

  function verifyAll() {
    var all = combos();
    var idx = 0, gaps = [], total = all.length, checked = 0;
    var toggles = [
      { onlyTrend: true, sessionGate: true, closeOnSessionEnd: true, maxTradesPerDay: 5, maxRetries: 2 },
      { onlyTrend: false, sessionGate: false, closeOnSessionEnd: false, maxTradesPerDay: 0, maxRetries: 0 },
      { onlyTrend: true, sessionGate: false, closeOnSessionEnd: false, maxTradesPerDay: 0, maxRetries: 2 }
    ];
    el('verify-out').innerHTML = '<span class="spin">⢄</span> verifying 0 / ' + total + ' …';
    function step() {
      var t0 = Date.now();
      while (idx < total && Date.now() - t0 < 120) {
        var c = all[idx];
        var probe = defaultState();
        Object.keys(c).forEach(function (k) { probe[k] = c[k]; });
        toggles.forEach(function (tg) {
          Object.keys(tg).forEach(function (k) { probe[k] = tg[k]; });
          ENGINE.resolve(probe);
          var act = MODEL.fieldList().filter(function (k) { return probe.__active[k]; });
          var gens = { spec: window.GEN_SPEC.build(probe).consumed, mql: window.GEN_MQL.build(probe).consumed, pine: window.GEN_PINE.build(probe).consumed };
          ['spec', 'mql', 'pine'].forEach(function (g) {
            act.forEach(function (k) {
              if (!gens[g][k] && gaps.length < 20) gaps.push(c.lens + '/' + c.family + '/' + c.sub + '/' + c.slMode + '/' + c.tpMode + '/' + c.trail + '/' + c.orderType + ' → ' + g + ' missing ' + k);
            });
          });
          checked++;
        });
        idx++;
      }
      if (idx < total) {
        el('verify-out').innerHTML = '<span class="spin">⢄</span> verifying ' + Math.round(idx / total * 100) + '% …';
        setTimeout(step, 0);
      } else {
        el('verify-out').innerHTML = gaps.length
          ? '<span class="bad-t">✗ ' + gaps.length + ' coverage gap(s) found</span><ul class="rep-list">' + gaps.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>'
          : '<span class="ok-t">✓ ' + checked.toLocaleString() + ' full configurations checked — every selected setting appears in the spec, the MQL5 EA and the Pine script.</span>';
      }
    }
    setTimeout(step, 0);
  }

  /* ── boot ───────────────────────────────────────────────── */
  function boot() {
    load();
    lastResolve = ENGINE.resolve(state);
    visited[0] = true;

    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      t.addEventListener('click', function () { tab = t.getAttribute('data-tab'); renderOutputs(); });
    });
    el('copy').addEventListener('click', copyOut);
    el('download').addEventListener('click', downloadOut);
    el('reset').addEventListener('click', function () {
      state = defaultState();
      lastResolve = ENGINE.resolve(state);
      visited = { 0: true }; currentAspect = 0;
      save(); renderMenu(); renderDetail(); renderInputs(); renderReport(lastResolve);
      regenerate(); renderOutputs();
      flash('Reset to the framework defaults.');
    });
    el('verify').addEventListener('click', verifyAll);

    renderMenu(); renderDetail(); renderInputs(); renderReport(lastResolve);
    regenerate(); renderOutputs();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
