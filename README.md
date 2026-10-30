# 5km持続走 ペース配分

このコースでの目標タイムを入力すると、コース特性（起伏・路面・カーブ）を反映したペース配分を表示する。
平地5km TTの記録を入力すると、目標の達成可能性を判定する。

## ファイル構成
| ファイル | 内容 |
|---|---|
| index.html | 画面 |
| pace.js | 計算ロジック・補正パラメータ |
| courses.js | コースデータ（コース追加はここ） |

## 走り方
- **イーブンエフォート**：各区間のきつさが同じになるよう配分
- **イーブンペース**：全区間同一ペース
- **ネガティブスプリット**：イーブンエフォートを基準に、前半+2%〜後半−2%で傾斜

## 算定の根拠

### 計算式
各200m区間の所要時間 = 基準ペース × 距離 × 勾配係数 × 路面係数 × 経験係数 ＋ カーブロス
基準ペースは合計が目標タイムに一致するよう逆算する。

### 勾配（論文＋経験）
Minetti et al. (2002) の走行エネルギーコスト式を適用。

Cr(i) = 155.4i⁵ − 30.4i⁴ − 43.3i³ + 46.3i² + 19.5i + 3.6 [J/kg/m]

代謝出力一定なら速度 ∝ 1/Cr、所要時間 ∝ Cr として、勾配係数 = Cr(i)/Cr(0)。±1%で約+5.5%／−5.3%。
区間内に上りと下りが混在する場合は、長さを上り量:下り量で按分する。

下りは、式による短縮効果の75%のみ反映する（**経験値**、`PARAMS.downEff`）。トレッドミルで測った代謝コストほど、実際の下りでは速く走れないため。

### 砂利道 +2%（間接根拠）
締まった砂利道を走って直接測った論文はない。次の3つから2〜5%の範囲と推定し、締まった路面として下限の2%を採用。

| 根拠 | 値 |
|---|---|
| 芝生の走行（Sassi et al. 2011） | 舗装比 約+5%（Cr 4.02→4.22 J/kg/m） |
| 凹凸路の走行（Voloshina & Ferris 2015、段差最大2.5cm、2.3m/s） | 約+5% |
| 未舗装路の歩行（Soule & Goldman 1972） | 舗装比 +10% |
| 走行/歩行の地形感度比（Voloshina & Ferris 2015：歩行+27%、走行+5%） | 約1/5 → 未舗装路の走行は約+2% |

芝の係数も Sassi et al. に合わせて1.05とした。

### 直角カーブ 0.5秒/か所（推定）
走速度での90°カーブの測定はない（低速180°折返しのみ：Hatamoto et al. 2014）。仮置き値。

推定値は、実走ラップとの差を courses.js の `kmExp`（km毎の経験係数）で校正する。

### 達成判定（論文）
1. 平地TT記録 × コース係数 ＋ カーブロス = このコースでの予測タイム
2. 差 = (予測 − 目標) / 予測
3. 差を日間変動係数 CV（2.0%）で割り、判定

| 判定 | 条件 |
|---|---|
| 余裕 | 目標が予測より1CV以上遅い |
| 妥当 | 目標が予測以下 |
| 挑戦的 | 予測より0〜1CV速い（普段の変動内） |
| 困難 | 1〜2CV速い（好調時のみ） |
| 現状では非現実的 | 2CV超速い |

CVの根拠：5km前後の記録の個人内変動は上位ランナーで1.2〜1.9%、遅いランナーほど大きい（Hopkins & Hewson 2001）。5km TTで0.95%（Hurst & Board 2017）。一般隊員を想定し2.0%とした（`pace.js` の `PARAMS.cv` で変更可）。
達成確率は記録が正規分布でばらつくと仮定した1回あたりの目安。練習による向上は含まない。

### 文献
- Minetti AE, Moia C, Roi GS, Susta D, Ferretti G. Energy cost of walking and running at extreme uphill and downhill slopes. J Appl Physiol 93:1039–1046, 2002.
- Voloshina AS, Ferris DP. Biomechanics and energetics of running on uneven terrain. J Exp Biol 218:711–719, 2015.
- Sassi A, et al. The cost of running on natural grass and artificial turf surfaces. J Strength Cond Res 25:606–611, 2011.
- Soule RG, Goldman RF. Terrain coefficients for energy cost prediction. J Appl Physiol 32:706–708, 1972.
- Hatamoto Y, et al. The relationship between running velocity and the energy cost of turning during running. PLoS ONE 9(1):e81850, 2014.
- Hopkins WG, Hewson DJ. Variability of competitive performance of distance runners. Med Sci Sports Exerc 33:1588–1592, 2001.
- Hurst P, Board L. Reliability of 5-km running performance in a competitive environment. Meas Phys Educ Exerc Sci 21:10–14, 2017.

## コースデータ（神町駐屯地）
- 標高：GPS記録の詳細グラフを10m間隔で読み取り（135.5〜152.9m、累積上り36.9m・下り26.0m）
- 砂利道：0.85–1.35km、3.10–3.49km、3.70–4.10km、4.87–5.00km
- 直角カーブ：13か所（地図から判読）
- 経路略図・高低図：上記データから描画
- 空中写真：国土地理院 地理院タイル（シームレス空中写真）。出典表示により申請不要で利用。経路の重ね合わせは概略位置（GPXなし）。画面の「位置合わせ」で調整し、表示された geo 値を courses.js に反映すると既定値になる

## コースの追加
`courses.js` に以下を追記する。追加するとコース選択が有効になる。

```js
COURSES.push({
  id: "course-b",
  name: "Bコース",
  note: "備考（任意）",
  kmExp: [1.00, 1.00, 1.00, 1.00, 1.00],
  segments: [
    { up: 0, down: 0, surface: "paved", turns: 0, uturns: 0 },
    // …200m毎に25区間。路面混在は surface: { paved: 0.4, gravel: 0.6 }
  ],
  // 以下は図の表示用（任意。省略すると図は非表示）
  gravel: [[0.85, 1.35]],      // 砂利道区間(km)
  elev: [135.5, 136.4 /* … */], // 50m毎の標高(m)
  route: [[530, 500] /* … */],  // 経路略図の座標（北が上、相対値）
  geo: { ax: 225, ay: 375, lat: 38.40195, lon: 140.39909, mpp: 1.37, rot: 0 } // 空中写真への重ね合わせ
});
```

## 公開（GitHub Pages）
1. リポジトリ：https://github.com/okada198803/5km-lap-time
2. Settings → Pages → Branch: `main` / `/(root)` → Save
3. `https://okada198803.github.io/5km-lap-time/` で表示
