// ペース配分計算ロジック
(function (root) {
  // 補正パラメータ（根拠は README.md 参照）
  const PARAMS = {
    // 勾配：Minetti et al. (2002) J Appl Physiol 93:1039 の走行エネルギーコスト多項式（上り・下りとも適用）
    // 同一代謝出力なら速度∝1/Cr → 所要時間∝Cr として時間係数に換算
    downEff: 1.0,    // 下りの短縮効果の反映率。1.0=Minetti式どおり（17:00目標の経験値と整合）
    surface: { paved: 1.00, track: 1.00, dirt: 1.02, gravel: 1.02, grass: 1.05 }, // 砂利は間接根拠（Soule & Goldman 1972 ほか）、芝は Sassi et al. 2011
    turnLoss: 0.5,   // 直角カーブ1か所あたりのロス（秒）推定値
    uturnLoss: 4.0,  // 折り返し1か所あたりのロス（秒）推定値
    negSplit: 0.03,  // ネガティブスプリット：開始+3% → 終了-3%（経験値に合わせ設定）
    distScale: 0.34, // ペース配分の起伏・路面効果の縮小率（経験値：最速km−最遅kmの差15秒以内に合わせ設定）
    refTime: 1020,   // 増減幅（秒）の基準タイム。この時の最速km−最遅kmの差が15秒
    // 目標タイム帯ごとの最速km−最遅kmの許容差（秒）（経験値）：〜19分台 15秒、20〜23分台 20秒、24分以降 28秒
    rangeBands: [[1200, 15], [1440, 19.7], [Infinity, 27.5]] // 秒丸めで許容差を超えないよう 19.7・27.5 とする
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

  // course: コース定義, T: このコースでの目標タイム(秒), strat: even_effort | even_pace | negative
  function plan(course, T, strat) {
    const segs = buildSegs(course);
    const total = segs.reduce((a, s) => a + s.len, 0);
    // 効果の縮小率。目標タイムに反比例させてkm毎の増減秒数を一定にし、タイム帯の許容差に比例して拡げる
    const band = PARAMS.rangeBands.find(([lim]) => T < lim)[1];
    const k = PARAMS.distScale * PARAMS.refTime / T * band / 15;

    segs.forEach(s => {
      if (strat === "even_pace") { s.w = s.len; s.c = 0; return; }
      let f = gradeCoef(s.up, s.down, s.len);
      f *= surfCoef(s.surface);
      f *= (course.kmExp && course.kmExp[s.km]) || 1;
      f = 1 + k * (f - 1);
      if (strat === "negative") {
        const x = (s.start + s.end) / 2 / total;
        f *= 1 + k * PARAMS.negSplit * (1 - 2 * x);
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

    return { total, T, avgPerKm, segs, kms };
  }

  const api = { PARAMS, SURFACE_NAME, plan, minetti, gradeCoef, surfCoef };
  if (typeof module !== "undefined") module.exports = api;
  root.Pace = api;
})(typeof window !== "undefined" ? window : globalThis);
