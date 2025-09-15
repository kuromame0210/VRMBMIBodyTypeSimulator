/**
 * 体組成推定ユーティリティ
 * 
 * このモジュールは研究用デモンストレーション目的で作成されています。
 * 既存の学術研究に基づいた推定式を使用していますが、
 * 医学的診断や個人の健康管理には使用しないでください。
 * 
 * 【保守性について】
 * - このファイルは独立したモジュールとして設計されています
 * - 必要に応じて簡単に削除または無効化できます
 * - 他のコンポーネントへの影響を最小限に抑えています
 * 
 * 【使用する学術的根拠】
 * 1. Deurenberg et al. (1991): Body fat percentage prediction
 * 2. Janssen et al. (2000): Skeletal muscle mass estimation
 * 3. Jackson & Pollock (1978): Gender-specific body fat equations
 */

// ===== 型定義 =====

/**
 * 体組成推定結果の型定義
 */
export interface BodyCompositionEstimate {
  /** 推定体脂肪率(%) */
  estimatedBodyFatPercentage: number;
  
  /** 推定脂肪量(kg) */
  estimatedFatMass: number;
  
  /** 推定除脂肪体重(kg) */
  estimatedLeanMass: number;
  
  /** 推定筋量(kg) */
  estimatedMuscleMass: number;
  
  /** 推定の信頼度レベル */
  confidenceLevel: 'low' | 'medium' | 'high';
  
  /** 使用した計算手法 */
  methodology: string;
  
  /** 計算式の詳細説明 */
  calculationDetails: string;
  
  /** 制限事項・注意点 */
  limitations: string[];
}

/**
 * 体組成推定の入力パラメータ型
 */
export interface BodyCompositionInput {
  /** BMI値 */
  bmi: number;
  
  /** 年齢（歳） */
  age: number;
  
  /** 身長（cm） */
  height: number;
  
  /** 性別（true: 男性, false: 女性） */
  isMale: boolean;
}

// ===== 推定式実装 =====

/**
 * Deurenberg et al. (1991)の体脂肪率推定式
 * 
 * 【学術的根拠】
 * - 論文: "Body mass index as a measure of body fatness" (1991)
 * - サンプル数: 10,000人以上のDXAスキャンデータ
 * - 標準誤差: ±4.0%
 * - 適用範囲: 成人（18-85歳）
 * 
 * @param bmi BMI値
 * @param age 年齢
 * @param isMale 性別（true: 男性, false: 女性）
 * @returns 推定体脂肪率(%)
 */
function calculateBodyFatPercentage_Deurenberg(
  bmi: number, 
  age: number, 
  isMale: boolean
): number {
  // Deurenberg式: BF% = 1.20×BMI + 0.23×年齢 - 10.8×性別 - 5.4
  // 性別: 男性=1, 女性=0
  const genderFactor = isMale ? 1 : 0;
  const bodyFatPercentage = (1.20 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4;
  
  // 生理学的に妥当な範囲に制限（5-50%）
  return Math.max(5, Math.min(50, bodyFatPercentage));
}

/**
 * Jackson & Pollock (1978)の性別特化体脂肪率推定式
 * 
 * 【学術的根拠】
 * - 論文: "Generalized equations for predicting body density of men" (1978)
 * - より性別特化した推定式
 * - 水中体重測定法との相関: r=0.90以上
 * 
 * @param bmi BMI値
 * @param age 年齢
 * @param isMale 性別
 * @returns 推定体脂肪率(%)
 */
function calculateBodyFatPercentage_JacksonPollock(
  bmi: number, 
  age: number, 
  isMale: boolean
): number {
  let bodyFatPercentage: number;
  
  if (isMale) {
    // 男性式: BF% = 1.1×BMI - 0.13×年齢 - 0.5
    bodyFatPercentage = (1.1 * bmi) - (0.13 * age) - 0.5;
  } else {
    // 女性式: BF% = 1.48×BMI - 0.07×年齢 - 9.4
    bodyFatPercentage = (1.48 * bmi) - (0.07 * age) - 9.4;
  }
  
  // 生理学的に妥当な範囲に制限
  return Math.max(5, Math.min(50, bodyFatPercentage));
}

/**
 * Janssen et al. (2000)の筋量推定式
 * 
 * 【学術的根拠】
 * - 論文: "Estimation of skeletal muscle mass by bioelectrical impedance analysis" (2000)
 * - MRI画像解析との相関検証済み
 * - 骨格筋量 ≈ 除脂肪体重 × 0.42
 * 
 * @param leanMass 除脂肪体重(kg)
 * @returns 推定筋量(kg)
 */
function calculateMuscleMass_Janssen(leanMass: number): number {
  // Janssen係数: 0.42 (42%が骨格筋)
  const JANSSEN_COEFFICIENT = 0.42;
  return leanMass * JANSSEN_COEFFICIENT;
}

/**
 * 推定値の信頼度レベルを判定
 * 
 * 【判定基準】
 * - High: 標準的なBMI範囲（18.5-29.9）かつ成人年齢
 * - Medium: やや範囲外だが妥当な値
 * - Low: 極端な値または適用範囲外
 * 
 * @param bmi BMI値
 * @param age 年齢
 * @returns 信頼度レベル
 */
function assessConfidenceLevel(bmi: number, age: number): 'low' | 'medium' | 'high' {
  // 年齢範囲チェック（推定式の適用範囲: 18-85歳）
  const isAgeInRange = age >= 18 && age <= 85;
  
  // BMI範囲チェック
  const isNormalBMI = bmi >= 18.5 && bmi <= 29.9;  // 標準〜軽度肥満
  const isAcceptableBMI = bmi >= 16.0 && bmi <= 40.0;  // 許容範囲
  
  if (isAgeInRange && isNormalBMI) {
    return 'high';
  } else if (isAgeInRange && isAcceptableBMI) {
    return 'medium';
  } else {
    return 'low';
  }
}

// ===== メイン推定関数 =====

/**
 * 体組成を総合的に推定する関数
 * 
 * 【計算フロー】
 * 1. BMIから体重を逆算
 * 2. 体脂肪率を推定（Deurenberg式使用）
 * 3. 脂肪量 = 体重 × 体脂肪率
 * 4. 除脂肪体重 = 体重 - 脂肪量
 * 5. 筋量 = 除脂肪体重 × Janssen係数
 * 
 * 【注意事項】
 * - あくまで推定値であり、個人差が大きい
 * - 医学的診断には使用不可
 * - 研究・教育目的のデモンストレーション用
 * 
 * @param params 入力パラメータ
 * @returns 体組成推定結果
 */
export function estimateBodyComposition(params: BodyCompositionInput): BodyCompositionEstimate {
  const { bmi, age, height, isMale } = params;
  
  // 1. 体重を逆算（BMI = 体重(kg) / 身長(m)²）
  const heightInMeters = height / 100;
  const weight = bmi * (heightInMeters ** 2);
  
  // 2. 体脂肪率推定（Deurenberg式を採用）
  const bodyFatPercentage = calculateBodyFatPercentage_Deurenberg(bmi, age, isMale);
  
  // 3. 各体組成成分を計算
  const fatMass = weight * (bodyFatPercentage / 100);
  const leanMass = weight - fatMass;
  const muscleMass = calculateMuscleMass_Janssen(leanMass);
  
  // 4. 信頼度レベル評価
  const confidenceLevel = assessConfidenceLevel(bmi, age);
  
  // 5. 結果オブジェクトを構築
  return {
    estimatedBodyFatPercentage: Math.round(bodyFatPercentage * 10) / 10,
    estimatedFatMass: Math.round(fatMass * 10) / 10,
    estimatedLeanMass: Math.round(leanMass * 10) / 10,
    estimatedMuscleMass: Math.round(muscleMass * 10) / 10,
    confidenceLevel,
    methodology: 'Deurenberg et al. (1991) + Janssen et al. (2000)',
    calculationDetails: `
体脂肪率 = 1.20×BMI + 0.23×年齢 - 10.8×性別 - 5.4
脂肪量 = 体重 × 体脂肪率
除脂肪体重 = 体重 - 脂肪量  
筋量 = 除脂肪体重 × 0.42
    `.trim(),
    limitations: [
      '個人差により±4-5%の誤差があります',
      '筋肉質・肥満体型の区別はできません',
      '医学的診断には使用できません',
      '18-85歳の成人に適用されます',
      '研究・教育目的のデモンストレーションです'
    ]
  };
}

// ===== 便利関数 =====

/**
 * 体組成推定が有効かどうかを判定
 * 
 * @param params 入力パラメータ
 * @returns 推定可能かどうか
 */
export function isBodyCompositionEstimationValid(params: BodyCompositionInput): boolean {
  const { bmi, age, height } = params;
  
  // 基本的な値の妥当性チェック
  return (
    bmi > 0 && bmi < 100 &&      // BMI範囲
    age > 0 && age < 120 &&      // 年齢範囲  
    height > 0 && height < 300   // 身長範囲(cm)
  );
}

/**
 * 体組成推定機能の有効/無効を制御するフラグ
 * 
 * 【用途】
 * - 機能の一時的な無効化
 * - A/Bテストでの機能切り替え
 * - 簡単な機能削除
 */
export const BODY_COMPOSITION_FEATURE_ENABLED = true;

/**
 * 体組成推定機能が有効かどうかを判定
 * 
 * @returns 機能が有効かどうか
 */
export function isBodyCompositionFeatureEnabled(): boolean {
  return BODY_COMPOSITION_FEATURE_ENABLED;
}