// js/engine/generator.js -- simple rule-based generator
// expose function generate(payload) -> { summary, items: [{name,value,reason,confidence}] }
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

  return { summary: `${v.maker} ${v.model} - ${concept}`, items };
}
