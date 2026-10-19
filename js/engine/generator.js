// js/engine/generator.js -- simple rule-based generator
// expose function generate(payload) -> { summary, items: [{name,value,reason,confidence}], tests: [...] }
function generate(payload){
  const v = payload.vehicle;
  const parts = payload.parts || [];
  const concept = payload.concept;
  const items = [];

  // helper
  const push = (name, value, reason, confidence='理論ベース')=> items.push({name, value, reason, confidence});

  // base rules
  const drive = v.drive || 'FR';
  // ride height
  if(parts.includes('suspension')){
    if(concept==='stability') push('車高', '中 - 標準よりやや低め', '安定性と乗り心地を両立するため。', '理論ベース');
    if(concept==='grip') push('車高', '低め', '重心を下げてコーナリング荷重を向上させるため。', '理論ベース');
    if(concept==='agility') push('車高', 'やや低め（前略）', '回頭性向上のため...', '理論ベース');
    if(concept==='drift') push('車高', '高め（リア寄り）', 'ドリフトするためにリアの荷重移動を促す', '暫定推定');
  } else {
    push('車高', '調整不可（サスペンション未装着）', 'サスペンションパーツが装着されていないため。', '検証済み');
  }

  // ARB
  if(parts.includes('arb')){
    if(concept==='stability') push('アンチロールバー（前後）', '前: 中 / 後: 中', 'ロール制御でバランスを保つ', '理論ベース');
    if(concept==='grip') push('アンチロールバー（前後）', '前: やや硬め / 後: 中', 'コーナリングでのカーブフラット化', '理論ベース');
    if(concept==='agility') push('アンチロールバー（前後）', '前: 柔らかめ / 後: 中', '前荷重での応答向上', '理論ベース');
    if(concept==='drift') push('アンチロールバー（前後）', '前: 柔らかめ / 後: 柔らかめ', '車体を旋回しやすくする', '暫定推定');
  }

  // diff
  if(parts.includes('diff')){
    if(drive==='FR'){
      if(concept==='stability') push('LSD 初期トルク', '中', '安定したトラクション', '理論ベース');
      if(concept==='grip') push('LSD 初期トルク', 'やや高め', '立ち上がりでのトラクションを確保', '理論ベース');
      if(concept==='drift') push('LSD 初期トルク', '低め', 'リアを滑らせやすくする', '理論ベース');
    } else {
      push('LSD 初期トルク', '既定値', '駆動方式により最適値が異なるため', '暫定推定');
    }
  }

  // aero
  if(parts.includes('aero')){
    if(concept==='grip' || concept==='stability'){
      push('リアウイング', '中〜高ダウンフォース', '高速域とコーナーでの安定性向上', '理論ベース');
      push('フロントダウンフォース', '中', '前後バランスを保つため', '理論ベース');
    }
    if(concept==='drift'){
      push('リアウイング', '低め', '旋回での自由度を確保', '暫定推定');
    }
  }

  // tires
  if(parts.includes('tires')){
    push('タイヤコンパウンド', 'スポーツS or レーシング', 'コンセプトとコースに合わせて選択', '理論ベース');
  }

  // fallback recommendations
  push('ブレーキバランス', 'フロント寄り（車種依存）', '制動時の安定性を優先', '理論ベース');
  push('バラスト', '必要なら前後調整', '重量配分でバランスを取る', '理論ベース');

  const tests = generateTests(v, concept);

  return { summary: `${v.maker} ${v.model} - ${concept}`, items, tests };
}

function generateTests(vehicle, concept){
  const baseSpeed = vehicle.weight_kg ? Math.max(1000 / (vehicle.weight_kg/1000), 100) : 100;
  // produce 6 tests with descriptions adapted
  const tests = [];
  tests.push({
    id: 't1',
    title: '制動安定性',
    purpose: '直線ブレーキング時の車体安定性とコーナー進入時の挙動を確認',
    recommendedTrack: '短いストレートとブレーキングポイントのあるコースの直線',
    operation: `推奨速度目安: 約${Math.round(baseSpeed)} km/h でフルブレーキング→コーナー進入。ブレーキングの初期は強めに行い、その後一定で保持。`,
    observe: 'ブレーキング時の車体の前後の沈み、ステア入力に対する反応、ABSの干渉を観察',
    successCriteria: '車体が安定して直線から減速し、進入で大きなヨー方向の乱れが無いこと',
    adjustments: ['ブレーキバランスをフロント寄りに','フロントのキャンバー軽減','フロントのLSDの調整（ある場合）']
  });

  tests.push({
    id: 't2',
    title: '低速コーナー',
    purpose: 'ターンインの応答性と立ち上がりのトラクションを確認',
    recommendedTrack: '低速ヘアピンやタイトなコーナー',
    operation: '約60~80km/hで進入し、ターンインのステアリングの初期反応を観察',
    observe: 'アンダーステア/オーバーステアの発生、立ち上がりでのタイヤのグリップ',
    successCriteria: 'ターンインで期待どおりの向き変化があり、立ち上がりでトラクションが確保されること',
    adjustments: ['キャンバー（前後）','LSD設定','トルク配分（4WDの場合）']
  });

  tests.push({
    id: 't3',
    title: '中速コーナー',
    purpose: '旋回中の前後バランスとライン維持能力を確認',
    recommendedTrack: '中速のS字やコーナーの連続する区間',
    operation: '一定の速度で複数周回して安定性とラップタイムを比較',
    observe: 'アンダー/オーバーの発生頻度、ステアリングの中立状態',
    successCriteria: 'ラインが維持できラップタイムが安定すること',
    adjustments: ['車高調整','ダンパーの縮み/伸び','ARB調整']
  });

  tests.push({
    id: 't4',
    title: '高速コーナー',
    purpose: '高速域での安定性と安心感を確認',
    recommendedTrack: '高速コーナーを含むコース',
    operation: '高速でのコーナリングを行い、車体のリヤの動きを観察',
    observe: 'リアの落ち着き、速度維持、空力の影響',
    successCriteria: '高速でラインを維持できること。大きな不安定さが無いこと',
    adjustments: ['ダウンフォース増加','リアウイング調整','車高の再確認']
  });

  tests.push({
    id: 't5',
    title: '切り返し・縁石・路面の凹凸',
    purpose: '切り返しや縁石通過時の姿勢変化と回復力を確認',
    recommendedTrack: '縁石のあるコーナーや切り返しの多いコース',
    operation: '意図的に軽く縁石を利用して通過し、車体の収束性を観察',
    observe: '姿勢の乱れ、ステアリングの戻り、トラクションの喪失',
    successCriteria: '段差通過後も姿勢が素早く戻ること',
    adjustments: ['ダンパー伸び側の調整','バネレートの見直し','ARB変更']
  });

  tests.push({
    id: 't6',
    title: '再現性',
    purpose: '同条件で複数周によりラップタイムの安定性を評価',
    recommendedTrack: 'テストしたい区間を周回できる短〜中距離コース',
    operation: '同じセッティングで3〜5周実施し、平均とばらつきを確認',
    observe: 'ラップタイムのばらつき、コントロールのしやすさ、ミスの頻度',
    successCriteria: '平均ラップが安定し、ばらつきが小さいこと',
    adjustments: ['ステアリング入力の安定化','タイヤ空気圧の調整','小幅な車高変更']
  });

  // tailor small notes by concept
  tests.forEach(t=>{
    if(concept==='drift') t.note = 'スライドの誘発を目的とした操作（リア滑らせ）も観察してください。ただし安全運転で。';
    if(concept==='grip') t.note = '最大グリップを引き出すために、一貫したブレーキングと回転を意識してください。';
  });

  return tests;
}
