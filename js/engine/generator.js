// js/engine/generator.js -- more detailed generator
function generate(payload){
  const v = payload.vehicle || {};
  const parts = payload.parts || [];
  const concept = payload.concept || 'stability';
  const items = [];
  const push = (name, value, reason, confidence='理論ベース', apply='適用条件未指定')=> items.push({name, value, reason, confidence, apply});

  const drive = (v.drive || 'FR').toUpperCase();

  // Camber
  if(parts.includes('tires') || parts.includes('suspension')){
    if(concept==='grip') push('フロントキャンバー', '-2.0° 前後', 'コーナリング中のタイヤ接地面を増やしグリップを提高', '理論ベース', '適合: 調整可能なキャンバーボルト/サスペンション');
    else if(concept==='agility') push('フロントキャンバー', '-1.8° 前後', '初期応答を改善', '理論ベース', '適合: 調整可能');
    else if(concept==='stability') push('フロントキャンバー', '-1.5°', '安定性とタイヤ摩耗のバランス', '理論ベース');
    else if(concept==='drift') push('フロントキャンバー', '-1.0°', 'ドリフト時の舵角と荷重移動を優先', '暫定推定');

    if(concept==='drift') push('リアキャンバー', '-1.5°〜-2.5°', 'リアの接地を犠牲にしてスライドを誘発', '暫定推定');
    else push('リアキャンバー', '-1.0°〜-1.8°', 'リアの安定性とグリップのバランス', '理論ベース');
  } else {
    push('キャンバー', '調整不可（タイヤ/サスペンション未装着）', '調整パーツが必要', '検証済み');
  }

  // Toe
  if(parts.includes('suspension')){
    push('フロントトー', 'わずかなトーイン (0.0〜0.1)', '直進安定性を保ちながら応答を確保', '理論ベース');
    push('リアトー', 'わずかなトーアウトまたはゼロ', '旋回終盤の安定を保つため', '理論ベース');
  }

  // Ride frequency / spring
  if(parts.includes('suspension')){
    if(concept==='grip') push('固有振動数（前後）', '6.0Hz 前後 (車種依存)', 'コーナリング時のタイヤ接地性を改善', '理論ベース', '適用: 調整型サスペンション');
    if(concept==='stability') push('固有振動数（前後）', '5.0–6.0Hz', '乗りやすさと安定性のバランス', '理論ベース');
    if(concept==='drift') push('固有振動数（前後）', 'やや低め (4.0–5.5Hz)', 'スライドしやすい特性', '暫定推定');
  }

  // Dampers
  if(parts.includes('suspension')){
    push('ダンパー（縮み/伸び）', '縮み: 中〜硬め / 伸び: 中', '車体の収束性と路面追従性のバランス', '理論ベース');
  }

  // ARB
  if(parts.includes('arb')){
    if(concept==='stability') push('ARB 前/後', '中 / 中', 'ロール剛性でバランスを保つ', '理論ベース');
    if(concept==='grip') push('ARB 前/後', '前: やや硬め / 後: 中', 'コーナリングでのグリップを確保', '理論ベース');
    if(concept==='agility') push('ARB 前/後', '前: 柔らかめ / 後: 中', '素早い向き変えを助ける', '理論ベース');
    if(concept==='drift') push('ARB 前/後', '前: 柔らかめ / 後: 柔らかめ', '曲げやすさを優先', '暫定推定');
  }

  // LSD
  if(parts.includes('diff')){
    if(drive==='FR' || drive==='RR'){
      if(concept==='grip') push('LSD 初期トルク', 'やや高め', '立ち上がりでのトラクション', '理論ベース');
      if(concept==='drift') push('LSD 初期トルク', '低め', 'リアを滑らせやすくする', '理論ベース');
      if(concept==='stability') push('LSD 初期トルク', '中', 'コントロールしやすいトラクション', '理論ベース');
    } else if(drive==='4WD'){
      push('LSD（中/後）', '車種依存の既定値', '4WDはトルク配分で挙動が変わる', '暫定推定');
    }
    push('LSD 加速/減速効き', '加速: 中 / 減速: 中', '立ち上がりとブレーキングでの安定性', '理論ベース');
  }

  // Aero
  if(parts.includes('aero')){
    if(concept==='grip' || concept==='stability'){
      push('フロントダウンフォース', '中', '旋回時の前後バランスを保つ', '理論ベース');
      push('リアダウンフォース', '中〜高', '高速での安定性向上', '理論ベース');
    } else if(concept==='drift'){
      push('フロント/リアDF', '低め', 'スライド操作の自由度を確保', '暫定推定');
    }
  }

  // Brakes
  if(parts.includes('brakes')){
    push('ブレーキバランス', 'フロント寄り（車種依存）', 'ブレーキング時の安定性確保', '理論ベース');
  }

  // Tires
  if(parts.includes('tires')){
    push('タイヤコンパウンド', 'スポーツS / レーシング', '走行環境とコンセプトに合わせる', '理論ベース');
  }

  // Transmission / final
  push('最終減速比', '車種依存 推奨変更範囲を参照', '加速特性と最高速のトレードオフ', '暫定推定');

  // Ballast
  push('バラスト', '前後で微調整', '重量配分で前後バランスを最適化', '理論ベース');

  // Provide tests
  const tests = generateTests(v, concept);

  return { summary: `${v.maker||'車両不明'} ${v.model||''} - ${concept}`, items, tests };
}

function generateTests(vehicle, concept){
  const baseSpeed = vehicle.weight_kg ? Math.max(80, Math.round(2000 / Math.max(800, vehicle.weight_kg))) : 100;
  const tests = [];
  tests.push({ id:'t1', title:'制動安定性', purpose:'直線ブレーキングの安定性を確認', recommendedTrack:'短いストレート→ブレーキングポイント', operation:`目安速度: 約${baseSpeed} km/h でフルブレーキ`, observe:'車体の沈み込み、旋回前の安定性', successCriteria:'安定して減速できる', adjustments:['ブレーキバランスをフロント寄り','フロントキャンバー調整']});
  tests.push({ id:'t2', title:'低速コーナー', purpose:'ターンインと立ち上がりを確認', recommendedTrack:'ヘアピン等', operation:'60-80km/hで進入', observe:'アンダー/オーバーの発生', successCriteria:'立ち上がりでトラクションが得られる', adjustments:['LSD調整','キャンバー']});
  tests.push({ id:'t3', title:'中速コーナー', purpose:'ライン維持と応答性', recommendedTrack:'S字等', operation:'一定速度で周回', observe:'ライン維持と安定性', successCriteria:'安定したラップが取れる', adjustments:['車高/ダンパー/ARB']});
  tests.push({ id:'t4', title:'高速コーナー', purpose:'高速域の安定性', recommendedTrack:'高速コーナー', operation:'高速でのコーナリング', observe:'リアの安定感', successCriteria:'安心して速度を保てる', adjustments:['ダウンフォース増加','車高調整']});
  tests.push({ id:'t5', title:'切り返し・縁石', purpose:'挙動の回復力', recommendedTrack:'縁石があるコーナー', operation:'縁石通過後の姿勢回復を観察', observe:'姿勢の戻り', successCriteria:'すぐに姿勢が戻る', adjustments:['ダンパー伸び側','ARB']});
  tests.push({ id:'t6', title:'再現性', purpose:'複数周での安定性', recommendedTrack:'周回できる任意のコース', operation:'3-5周で平均とばらつきを確認', observe:'ラップの安定性', successCriteria:'ばらつきが小さい', adjustments:['空気圧/小幅な車高変更']});
  return tests;
}
