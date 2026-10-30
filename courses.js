// コース定義ファイル
// コースを追加する場合は COURSES.push({...}) を追記する（書式は README.md 参照）
window.COURSES = window.COURSES || [];

COURSES.push({
  id: "jinmachi",
  name: "神町駐屯地 5kmコース",
  note: "標高135〜153m、累積上り37m・下り26m。砂利道4区間、直角カーブ13か所。",
  // 経験係数（1km毎）。実走ラップで調整。1.00=補正なし
  kmExp: [1.00, 1.00, 1.00, 1.00, 1.00],
  // 200m毎。up/down: 区間内の上り量・下り量(m)  surface: 路面（混在は割合）  turns: 直角カーブ数
  // 標高はGPS記録（詳細グラフ）から10m間隔で読み取り
  segments: [
    // 1km目
    { up: 4.7, down: 0, surface: "paved", turns: 0, uturns: 0 }, // 0-200m 標高135.5→140.2m
    { up: 3.8, down: 0, surface: "paved", turns: 0, uturns: 0 }, // 200-400m 標高140.2→144.0m
    { up: 3.8, down: 0, surface: "paved", turns: 0, uturns: 0 }, // 400-600m 標高144.0→147.9m
    { up: 3.1, down: 0, surface: "paved", turns: 1, uturns: 0 }, // 600-800m 標高147.9→150.9m
    { up: 2.0, down: 0.8, surface: { paved: 0.25, gravel: 0.75 }, turns: 1, uturns: 0 }, // 800-1000m 標高150.9→152.1m
    // 2km目
    { up: 0, down: 1.9, surface: "gravel", turns: 0, uturns: 0 }, // 1000-1200m 標高152.1→150.2m
    { up: 0, down: 1.8, surface: "gravel", turns: 0, uturns: 0 }, // 1200-1400m 標高150.2→148.4m
    { up: 0, down: 2.4, surface: "gravel", turns: 1, uturns: 0 }, // 1400-1600m 標高148.4→146.0m
    { up: 0, down: 1.8, surface: "gravel", turns: 1, uturns: 0 }, // 1600-1800m 標高146.0→144.3m
    { up: 0.1, down: 2.0, surface: "gravel", turns: 0, uturns: 0 }, // 1800-2000m 標高144.3→142.4m
    // 3km目
    { up: 0.3, down: 2.5, surface: "gravel", turns: 1, uturns: 0 }, // 2000-2200m 標高142.4→140.1m
    { up: 0, down: 2.8, surface: { paved: 0.25, gravel: 0.75 }, turns: 0, uturns: 0 }, // 2200-2400m 標高140.1→137.3m
    { up: 0, down: 1.8, surface: "paved", turns: 1, uturns: 0 }, // 2400-2600m 標高137.3→135.6m
    { up: 0.7, down: 0.1, surface: "paved", turns: 0, uturns: 0 }, // 2600-2800m 標高135.6→136.2m
    { up: 0.6, down: 0.5, surface: "paved", turns: 0, uturns: 0 }, // 2800-3000m 標高136.2→136.2m
    // 4km目
    { up: 0.9, down: 0, surface: { paved: 0.5, gravel: 0.5 }, turns: 1, uturns: 0 }, // 3000-3200m 標高136.2→137.1m
    { up: 3.6, down: 0, surface: "gravel", turns: 0, uturns: 0 }, // 3200-3400m 標高137.1→140.6m
    { up: 3.9, down: 0, surface: { paved: 0.55, gravel: 0.45 }, turns: 1, uturns: 0 }, // 3400-3600m 標高140.6→144.5m
    { up: 3.7, down: 0, surface: { paved: 0.5, gravel: 0.5 }, turns: 1, uturns: 0 }, // 3600-3800m 標高144.5→148.2m
    { up: 2.7, down: 0, surface: "gravel", turns: 0, uturns: 0 }, // 3800-4000m 標高148.2→150.9m
    // 5km目
    { up: 1.4, down: 0, surface: { paved: 0.5, gravel: 0.5 }, turns: 1, uturns: 0 }, // 4000-4200m 標高150.9→152.4m
    { up: 0.2, down: 1.2, surface: "paved", turns: 1, uturns: 0 }, // 4200-4400m 標高152.4→151.4m
    { up: 0, down: 3.4, surface: "paved", turns: 0, uturns: 0 }, // 4400-4600m 標高151.4→148.0m
    { up: 0, down: 2.9, surface: "paved", turns: 1, uturns: 0 }, // 4600-4800m 標高148.0→145.1m
    { up: 1.4, down: 0.1, surface: { paved: 0.35, gravel: 0.65 }, turns: 1, uturns: 0 }, // 4800-5000m 標高145.1→146.4m
  ]
});
