// ペース配分計算ロジック
(function (root) {
  // 補正パラメータ（根拠は README.md 参照）
  const PARAMS = {
    // 勾配：Minetti et al. (2002) J Appl Physiol 93:1039 の走行エネルギーコスト多項式（上り・下りとも適用）
    // 同一代謝出力なら速度∝1/Cr → 所要時間∝Cr として時間係数に換算
    downEff: 0.75,   // 下りの短縮効果の反映率（経験値）。1.0=Minetti式どおり
    surface: { paved: 1.00, track: 1.00, dirt: 1.02, gravel: 1.02, grass: 1.05 }, // 砂利は間接根拠（Soule & Goldman 1972 ほか）、芝は Sassi et al. 2011
    turnLoss: 0.5,   // 直角カーブ1か所あたりのロス（秒）推定値
    uturnLoss: 4.0,  // 折り返し1か所あたりのロス（秒）推定値
    negSplit: 0.02,  // ネガティブスプリット：開始+2% → 終了-2%
    cv: 0.020        // 5km記録の日間変動係数（Hopkins & Hewson 2001 / Hurst & Board 2017 を基に設定）
  };

  const SURFACE_NAME = { paved: "舗装", track: "トラック", dirt: "土", gravel: "砂利", grass: "芝" };

  // Minetti (2002) Cr(i) [J/kg/m], i = 勾配（小数）
  function minetti(i) {
    return 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6;
  }
  const C0 = minetti(0);

  // 区間の勾配係数。上り量・下り量が同じ区間に混在する場合は、
  // 長さを上り:下り = up:down で按分し、両部分の勾配を (up+down)/len とみなす
  function gradeCoef(up, down, len) {
    up = Math.max(0, up || 0); down = Math.max(0, down || 0);
    const v = up + down;
    if (v === 0) return 1;
    const g = v / len;
    const fu = up / v, fd = down / v;
    return fu * minetti(g) / C0 + fd * (1 + (minetti(-g) / C0 - 1) * PARAMS.downEff);
  }

  // 路面係数。文字列 or 割合指定 { paved: 0.25, gravel: 0.75 }
  function surfCoef(sf) {
    if (!sf) return 1;
    if (typeof sf === "string") return PARAMS.surface[sf] ?? 1;
    let c = 0, n = 0;
    for (const k in sf) { c += (PARAMS.surface[k] ?? 1) * sf[k]; n += sf[k]; }
    return n ? c / n : 1;
  }
  function surfKeys(sf) { return !sf ? [] : typeof sf === "string" ? [sf] : Object.keys(sf).filter(k => sf[k] > 0); }

  function buildSegs(course) {
    let pos = 0;
    return course.segments.map(s => {
      const len = s.len || 200;
      const seg = Object.assign({}, s, { len, start: pos, end: pos + len, km: Math.floor(pos / 1000) });
      pos += len;
      return seg;
    });
  }

  // 平坦・舗装・直線に対するコース全体の係数 { W: 重み付き距離, C: 固定ロス秒, total: 距離 }
  function courseFactor(course) {
    const segs = buildSegs(course);
    let W = 0, C = 0, total = 0;
    segs.forEach(s => {
      W += s.len * gradeCoef(s.up, s.down, s.len) * surfCoef(s.surface) * ((course.kmExp && course.kmExp[s.km]) || 1);
      C += (s.turns || 0) * PARAMS.turnLoss + (s.uturns || 0) * PARAMS.uturnLoss;
      total += s.len;
    });
    return { W, C, total };
  }

  // course: コース定義, T: このコースでの目標タイム(秒), strat: even_effort | even_pace | negative
  function plan(course, T, strat) {
    const segs = buildSegs(course);
    const total = segs.reduce((a, s) => a + s.len, 0);

    segs.forEach(s => {
      if (strat === "even_pace") { s.w = s.len; s.c = 0; return; }
      let f = gradeCoef(s.up, s.down, s.len);
      f *= surfCoef(s.surface);
      f *= (course.kmExp && course.kmExp[s.km]) || 1;
      if (strat === "negative") {
        const x = (s.start + s.end) / 2 / total;
        f *= 1 + PARAMS.negSplit * (1 - 2 * x);
      }
      s.w = s.len * f;
      s.c = (s.turns || 0) * PARAMS.turnLoss + (s.uturns || 0) * PARAMS.uturnLoss;
    });

    const W = segs.reduce((a, s) => a + s.w, 0);
    const C = segs.reduce((a, s) => a + s.c, 0);
    const b = (T - C) / W;
    if (b <= 0) throw new Error("目標タイムが短すぎます");

    let cum = 0;
    segs.forEach(s => { s.t = b * s.w + s.c; cum += s.t; s.cum = cum; });

    // 1km毎の集計
    const kms = [];
    segs.forEach(s => {
      let k = kms[s.km];
      if (!k) k = kms[s.km] = { km: s.km + 1, len: 0, t: 0, up: 0, down: 0, turns: 0, uturns: 0, surfaces: [], segs: [] };
      k.len += s.len; k.t += s.t; k.cum = s.cum;
      k.up += s.up || 0; k.down += s.down || 0;
      k.turns += s.turns || 0; k.uturns += s.uturns || 0;
      surfKeys(s.surface).forEach(x => { if (!k.surfaces.includes(x)) k.surfaces.push(x); });
      k.segs.push(s);
    });
    const avgPerKm = T / total * 1000;
    kms.forEach(k => { k.diff = k.t - avgPerKm * k.len / 1000; });

    // 平地換算：同じ負荷で平坦・舗装・直線5kmを走った場合のタイム
    const cf = courseFactor(course);
    const flatEq = (T - cf.C) / cf.W * cf.total;

    return { total, T, avgPerKm, segs, kms, flatEq };
  }

  // 達成判定。tt: 平地5km TT記録又は平地目標(秒), T: このコースでの目標(秒)
  function assess(course, tt, T) {
    const cf = courseFactor(course);
    const pred = tt * cf.W / cf.total + cf.C;      // このコースでの予測タイム
    const gap = (pred - T) / pred;                 // 正 = 目標が予測より速い
    const z = gap / PARAMS.cv;                     // 日間変動の何倍か
    let level;
    if (z <= -1) level = { key: "easy", label: "余裕" };
    else if (z <= 0) level = { key: "ok", label: "妥当" };
    else if (z <= 1) level = { key: "challenge", label: "挑戦的" };
    else level = { key: "hard", label: "困難" };
    return { pred, gap, z, level, cv: PARAMS.cv };
  }

  const api = { PARAMS, SURFACE_NAME, plan, assess, courseFactor, minetti, gradeCoef, surfCoef };
  if (typeof module !== "undefined") module.exports = api;
  root.Pace = api;
})(typeof window !== "undefined" ? window : globalThis);
