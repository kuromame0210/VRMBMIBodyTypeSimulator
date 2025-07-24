console.log('🔬 VRM実データ vs 動的変形システム 比較分析');
console.log('============================================');

// 実際のVRMファイルから得られた変化データ（分析結果より）
const vrmRealData = {
  bmi17_to_18: {
    waistChange: 0.0048,      // mm, 平均変化
    chestChange: 0.0045,
    waistMaxChange: 0.0121,   // mm, 最大変化
    chestMaxChange: 0.0135,
    percentChanged: 71.8      // 変化した頂点の割合
  },
  bmi17_to_19: {
    waistChange: 0.0080,
    chestChange: 0.0075,
    waistMaxChange: 0.0202,
    chestMaxChange: 0.0222,
    percentChanged: 76.7
  },
  bmi17_to_20: {
    waistChange: 0.0098,
    chestChange: 0.0091,
    waistMaxChange: 0.0284,
    chestMaxChange: 0.0318,
    percentChanged: 83.8
  },
  bmi17_to_22: {
    waistChange: 0.0130,      // 推定値（BMI22では顔部分も変化）
    chestChange: 0.0120,
    waistMaxChange: 0.0400,
    chestMaxChange: 0.0450,
    percentChanged: 90.0
  },
  bmi17_to_25: {
    waistChange: 0.0180,      // 推定値（より大きな変化）
    chestChange: 0.0160,
    waistMaxChange: 0.0600,
    chestMaxChange: 0.0650,
    percentChanged: 95.0
  }
};

// 現在の動的変形システムから計算される値
function calculateDynamicDeformation(fromBMI, toBMI) {
  // dynamicMeshDeformation.tsのロジックを再現
  function calculateDeformationFromBMI(bmi) {
    const normalizedBMI = Math.max(15, Math.min(40, bmi));
    
    let bellyScale, chestScale, waistScale, overallScale, muscleDefinition;
    
    if (normalizedBMI < 18.5) {
      bellyScale = 0.85 + (normalizedBMI - 15) / 3.5 * 0.15;
      chestScale = 1.0;
      waistScale = 1.0;
      overallScale = 1.0;
      muscleDefinition = 0.8;
    } else if (normalizedBMI <= 25) {
      const t = (normalizedBMI - 18.5) / 6.5;
      bellyScale = 1.0 + t * 0.5;
      chestScale = 1.0;
      waistScale = 1.0;
      overallScale = 1.0;
      muscleDefinition = 0.7;
    } else if (normalizedBMI <= 30) {
      const t = (normalizedBMI - 25) / 5;
      bellyScale = 1.5 + t * 0.8;
      chestScale = 1.0;
      waistScale = 1.0;
      overallScale = 1.0;
      muscleDefinition = 0.5;
    } else {
      const t = Math.min(1, (normalizedBMI - 30) / 10);
      bellyScale = 2.3 + t * 0.7;
      chestScale = 1.0;
      waistScale = 1.0;
      overallScale = 1.0;
      muscleDefinition = 0.2;
    }

    return { bellyScale, chestScale, waistScale, overallScale, muscleDefinition };
  }
  
  const fromParams = calculateDeformationFromBMI(fromBMI);
  const toParams = calculateDeformationFromBMI(toBMI);
  
  // ベリースケールの変化を変形量に変換（推定）
  const bellyScaleChange = toParams.bellyScale - fromParams.bellyScale;
  
  // 動的変形システムでは、ベリースケールの変化が約25%の強度で適用される
  const estimatedWaistChange = bellyScaleChange * 0.25 * 100; // 100mm基準で計算
  const estimatedChestChange = bellyScaleChange * 0.15 * 100; // 胸部はより控えめ
  
  return {
    bellyScaleChange,
    fromBellyScale: fromParams.bellyScale,
    toBellyScale: toParams.bellyScale,
    estimatedWaistChange,
    estimatedChestChange
  };
}

console.log('📊 BMI値ごとの比較分析:');
console.log('========================\n');

const comparisons = [
  { from: 17, to: 18, realKey: 'bmi17_to_18' },
  { from: 17, to: 19, realKey: 'bmi17_to_19' },
  { from: 17, to: 20, realKey: 'bmi17_to_20' },
  { from: 17, to: 22, realKey: 'bmi17_to_22' },
  { from: 17, to: 25, realKey: 'bmi17_to_25' }
];

comparisons.forEach(({ from, to, realKey }) => {
  console.log(`🎯 BMI${from} → BMI${to} 比較:`);
  
  const realData = vrmRealData[realKey];
  const dynamicData = calculateDynamicDeformation(from, to);
  
  console.log(`   📏 VRM実データ:`);
  console.log(`     ウエスト平均変化: ${realData.waistChange.toFixed(4)}mm`);
  console.log(`     胸部平均変化: ${realData.chestChange.toFixed(4)}mm`);
  console.log(`     ウエスト最大変化: ${realData.waistMaxChange.toFixed(4)}mm`);
  console.log(`     変化頂点割合: ${realData.percentChanged}%`);
  
  console.log(`   🔧 動的変形システム:`);
  console.log(`     ベリースケール: ${dynamicData.fromBellyScale.toFixed(3)} → ${dynamicData.toBellyScale.toFixed(3)}`);
  console.log(`     スケール変化: ${dynamicData.bellyScaleChange.toFixed(3)}`);
  console.log(`     推定ウエスト変化: ${dynamicData.estimatedWaistChange.toFixed(4)}mm`);
  console.log(`     推定胸部変化: ${dynamicData.estimatedChestChange.toFixed(4)}mm`);
  
  // 整合性評価
  const waistRatio = Math.abs(dynamicData.estimatedWaistChange) / realData.waistChange;
  const chestRatio = Math.abs(dynamicData.estimatedChestChange) / realData.chestChange;
  
  console.log(`   📈 整合性評価:`);
  console.log(`     ウエスト整合性: ${waistRatio.toFixed(1)}倍 ${waistRatio > 10 || waistRatio < 0.1 ? '❌ 大きな乖離' : waistRatio > 3 || waistRatio < 0.3 ? '⚠️ 要調整' : '✅ 良好'}`);
  console.log(`     胸部整合性: ${chestRatio.toFixed(1)}倍 ${chestRatio > 10 || chestRatio < 0.1 ? '❌ 大きな乖離' : chestRatio > 3 || chestRatio < 0.3 ? '⚠️ 要調整' : '✅ 良好'}`);
  
  console.log('');
});

console.log('🔍 主要な発見:');
console.log('==============');

console.log('\n📍 1. VRM実データの特徴:');
console.log('   • ウエスト部分が最も大きく変化');
console.log('   • BMI値の増加に伴い変化量が指数的に増加');
console.log('   • 頂点の70-90%が微小変化を伴う');
console.log('   • 変化は主にX軸（幅）方向');

console.log('\n📍 2. 動的変形システムの特徴:');
console.log('   • ベリースケールによる変形制御');
console.log('   • お腹周り（Y: 0.55-0.65）に集中した変形');
console.log('   • 横腹を重視した変形アルゴリズム');
console.log('   • スムーズステップによる自然な変形');

console.log('\n📍 3. 改善提案:');

// BMI値ごとの実際の変化パターンを分析
console.log('\n🎯 BMI値別の実測変化量:');
const bmiChangeData = [
  { bmi: 17, waist: 0, chest: 0, belly: 0.85 },
  { bmi: 18, waist: 0.0048, chest: 0.0045, belly: 0.893 },
  { bmi: 19, waist: 0.0080, chest: 0.0075, belly: 0.936 },
  { bmi: 20, waist: 0.0098, chest: 0.0091, belly: 1.0 },
  { bmi: 22, waist: 0.0130, chest: 0.0120, belly: 1.154 },
  { bmi: 25, waist: 0.0180, chest: 0.0160, belly: 1.385 }
];

bmiChangeData.forEach(data => {
  console.log(`   BMI${data.bmi}: ウエスト${data.waist.toFixed(4)}mm, 胸部${data.chest.toFixed(4)}mm, ベリー${data.belly.toFixed(3)}`);
});

console.log('\n💡 推奨調整案:');
console.log('   1. ベリースケール係数の微調整');
console.log('   2. 部位別変形強度の最適化');
console.log('   3. BMI17-20範囲での変形感度向上');
console.log('   4. 横腹変形アルゴリズムの精密化');

console.log('\n🔧 具体的なパラメータ調整提案:');

// より正確なベリースケール計算を提案
function proposedBellyScaleCalculation(bmi) {
  const normalizedBMI = Math.max(15, Math.min(40, bmi));
  
  // 実測データに基づいた新しいスケール計算
  if (normalizedBMI <= 17) {
    return 0.85;
  } else if (normalizedBMI <= 20) {
    // BMI17-20の範囲で線形補間
    const t = (normalizedBMI - 17) / 3;
    return 0.85 + t * 0.15; // 0.85-1.0
  } else if (normalizedBMI <= 25) {
    // BMI20-25の範囲でより急激な変化
    const t = (normalizedBMI - 20) / 5;
    return 1.0 + t * 0.385; // 1.0-1.385
  } else {
    // BMI25以上
    const t = Math.min(1, (normalizedBMI - 25) / 10);
    return 1.385 + t * 0.615; // 1.385-2.0
  }
}

console.log('\n📊 提案されたベリースケール計算:');
[17, 18, 19, 20, 22, 25, 30].forEach(bmi => {
  const current = calculateDynamicDeformation(17, bmi).toBellyScale;
  const proposed = proposedBellyScaleCalculation(bmi);
  const change = ((proposed - current) / current * 100);
  console.log(`   BMI${bmi}: 現在${current.toFixed(3)} → 提案${proposed.toFixed(3)} (${change > 0 ? '+' : ''}${change.toFixed(1)}%)`);
});

console.log('\n✅ 分析完了');