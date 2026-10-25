/* ============================================================================
   Strategy → EA v2 · engine.js
   The constraint engine. Three jobs:

   1 · applicability  — a field is IN or OUT of play (state.__active[key]).
                        Out-of-play fields are never emitted, so a setting can
                        never be silently ignored by a generator.
   2 · availability   — an option inside a field can be ruled out by an earlier
                        aspect. The blocked option stays visible with a reason
                        instead of quietly vanishing.
   3 · coercion       — if the current value becomes impossible, it is moved to
                        the first legal value and the move is reported.

   Resolution runs to a fixpoint, because chains settle over several passes:
   lens → family → mechanic → mechanic parameters.
   ========================================================================== */
(function (root) {
  'use strict';

  var SEA = root.SEA;

  /* ---- primitives --------------------------------------------------------- */

  function isActiveField(key, state) {
    var f = SEA.FIELDS[key];
    if (!f || !f.applies) return true;
    try { return !!f.applies.f(state); } catch (e) { return true; }
  }

  function appliesWhy(key) {
    var f = SEA.FIELDS[key];
    return (f && f.applies && f.applies.why) || 'not applicable for the current selection';
  }

  /* The option list can depend on the rest of the state (e.g. the mechanic list
     is owned by the selected family). */
  function optionsFor(key, state) {
    var f = SEA.FIELDS[key];
    if (!f) return [];
    if (typeof f.optionSource === 'function') {
      try { return f.optionSource(state) || []; } catch (e) { return f.options || []; }
    }
    return f.options || [];
  }

  function optionOk(key, opt, state) {
    var f = SEA.FIELDS[key];
    if (!f || typeof f.optAvail !== 'function') return true;
    try { return f.optAvail(opt, state) === true; } catch (e) { return true; }
  }

  function optionWhy(key, opt, state) {
    var f = SEA.FIELDS[key];
    if (!f || typeof f.optAvail !== 'function') return '';
    try {
      var r = f.optAvail(opt, state);
      return r === true ? '' : String(r);
    } catch (e) { return ''; }
  }

  function labelOf(key, value) {
    var f = SEA.FIELDS[key];
    if (!f || f.kind !== 'select') return String(value);
    return String(value);
  }

  /* ---- resolution --------------------------------------------------------- */

  function resolve(state) {
    if (!state.__active) state.__active = {};
    var order = SEA.KEYS;
    var notes = [], cautions = [], seen = {};
    var prevSig = null;

    function note(kind, key, from, to, reason) {
      var sig = kind + '|' + key + '|' + from + '|' + to + '|' + reason;
      if (seen[sig]) return;
      seen[sig] = true;
      notes.push({ kind: kind, key: key, from: from, to: to, reason: reason });
    }

    for (var pass = 0; pass < 6; pass++) {
      for (var i = 0; i < order.length; i++) {
        var key = order[i], f = SEA.FIELDS[key];
        if (!f) continue;

        /* 1 · force — an authoritative value wins over whatever is stored */
        var active = isActiveField(key, state);
        if (active && typeof f.force === 'function') {
          var forced;
          try { forced = f.force(state); } catch (e) { forced = undefined; }
          if (forced !== undefined && state[key] !== forced) {
            note('coerced', key, labelOf(key, state[key]), labelOf(key, forced),
              f.forceWhy || 'required by another setting');
            state[key] = forced;
          }
        }

        /* 2 · applicability */
        active = isActiveField(key, state);
        state.__active[key] = active;
        if (!active) continue;

        /* 3 · numeric clamping */
        if (typeof f.min === 'number' && typeof f.max === 'number') {
          var v = Number(state[key]);
          if (isNaN(v)) v = f.def;
          var c = Math.min(f.max, Math.max(f.min, v));
          if (c !== v) {
            note('coerced', key, String(v), String(c),
              'outside the allowed range ' + f.min + '–' + f.max);
            state[key] = c;
          }
        }

        /* 4 · option availability — move off an impossible choice */
        if (f.kind === 'select') {
          var opts = optionsFor(key, state);
          var avail = opts.filter(function (o) { return optionOk(key, o, state); });
          if (avail.length && avail.indexOf(state[key]) < 0) {
            var why = optionWhy(key, state[key], state) || 'ruled out by an earlier aspect';
            note('coerced', key, labelOf(key, state[key]), labelOf(key, avail[0]), why);
            state[key] = avail[0];
          }
        }
      }

      var sig = JSON.stringify(order.map(function (k) { return state[k]; })) +
        JSON.stringify(order.map(function (k) { return !!state.__active[k]; }));
      if (sig === prevSig) break;
      prevSig = sig;
    }

    /* 5 · options that are currently ruled out (reported, never hidden) */
    for (var j = 0; j < order.length; j++) {
      var k2 = order[j], f2 = SEA.FIELDS[k2];
      if (!f2 || f2.kind !== 'select' || !state.__active[k2]) continue;
      var list = optionsFor(k2, state);
      for (var m = 0; m < list.length; m++) {
        var o = list[m];
        if (o === state[k2]) continue;
        if (!optionOk(k2, o, state)) {
          note('blocked', k2, String(o), '', optionWhy(k2, o, state));
        }
      }
    }

    /* 6 · cautions — legal but worth knowing */
    function on(key) { return !!(state.__active && state.__active[key]); }
    for (var c = 0; c < SEA.CAUTIONS.length; c++) {
      var res;
      try { res = SEA.CAUTIONS[c](state, on); } catch (e) { res = null; }
      if (res && res.text) cautions.push(res);
    }
    var seenText = {};
    cautions = cautions.filter(function (x) {
      if (seenText[x.text]) return false;
      seenText[x.text] = true;
      return true;
    });

    return { notes: notes, cautions: cautions };
  }

  /* ---- convenience -------------------------------------------------------- */

  function activeKeys(state) {
    return SEA.KEYS.filter(function (k) { return !!(state.__active && state.__active[k]); });
  }
  function inactiveKeys(state) {
    return SEA.KEYS.filter(function (k) { return !(state.__active && state.__active[k]); });
  }
  function summary(state) {
    var n = 0;
    SEA.KEYS.forEach(function (k) {
      if (!state.__active[k]) return;
      var f = SEA.FIELDS[k];
      if (f.kind !== 'select') return;
      optionsFor(k, state).forEach(function (o) { if (o !== state[k] && !optionOk(k, o, state)) n++; });
    });
    return n;
  }

  root.ENGINE = {
    resolve: resolve,
    optionOk: optionOk,
    optionWhy: optionWhy,
    optionsFor: optionsFor,
    appliesWhy: appliesWhy,
    isActiveField: isActiveField,
    activeKeys: activeKeys,
    inactiveKeys: inactiveKeys,
    summary: summary
  };
})(window);
