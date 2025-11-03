/**
 * 小児肥満予測計算モジュール
 *
 * PHPプログラム (CoController.php, CoCoefTable.php) を基にした
 * 6歳、11歳、14歳時点での肥満リスク予測
 */

// ===== 型定義 =====

export interface ObesityPredictionInput {
  // 児の情報
  childHeight: number;        // cm
  childWeight: number;        // kg
  childGender: 'boy' | 'girl';
  childMonths: number;        // 月齢 (72, 132, 168)

  // 母親の情報
  motherAge: number;          // 歳
  motherHeight: number;       // cm
  motherWeight: number;       // kg

  // その他の情報
  birthExperience: '初産' | '経産';
  drinkingHistory: 'なし' | 'あり';
  smokingHistory: 'なし' | 'あり';
}

export interface ObesityPredictionResult {
  age6Probability: number;    // 6歳時点の肥満確率 (0.0 ~ 1.0)
  age11Probability: number;   // 11歳時点の肥満確率 (0.0 ~ 1.0)
  age14Probability: number;   // 14歳時点の肥満確率 (0.0 ~ 1.0)
  childBMI: number;
  childBMIz: number;
  motherBMI: number;
}

// ===== 係数テーブル定義 =====

interface LMSCoefficients {
  L: [number, number, number, number];  // 3次多項式係数
  L2?: [number, number, number, number]; // 6歳用の追加L係数
  S: [number, number, number, number];
  M: [number, number, number, number];
}

interface PredictionCoefficients {
  BMIZ_BASE_VALUE: number;
  CHILD_OVERWIGHT: number;      // X1
  MOTHER_AGE: number;           // X2
  CHILDBIRTH_EXPERIENCE: number;// X3
  MOTHER_BMI: number;           // X4
  DRINKING_HISTORY: number;     // X5
  SMOKING_HISTORY: number;      // X6
  CHILD_GENDER: number;         // X7
}

interface CoefficientsTable {
  boy: LMSCoefficients;
  girl: LMSCoefficients;
  1: PredictionCoefficients;  // 6歳(72か月)係数
  2: PredictionCoefficients;  // 11歳(132か月)係数
  3: PredictionCoefficients;  // 14歳(168か月)係数
}

// 18-23か月係数テーブル
const CO_AGE_18to23_MONTH: CoefficientsTable = {
  boy: {
    L: [+1.4345E-06, -0.000119864, -0.037620259, +0.624077322],
    S: [-7.58553e-08, +2.1302e-05, -0.001094812, +0.090651064],
    M: [-7.67459E-05, +0.007173901, -0.251765964, +18.77518828],
  },
  girl: {
    L: [+3.47613E-07, -2.38575E-05, -0.037631412, +0.795846301],
    S: [-1.0218e-07, +2.31971e-05, -0.000923983, +0.08896935],
    M: [-0.000168505, +0.013702125, -0.385286062, +19.15626964],
  },
  1: {
    BMIZ_BASE_VALUE: 0.00193,
    CHILD_OVERWIGHT: 3.42,
    MOTHER_AGE: 0.98,
    CHILDBIRTH_EXPERIENCE: 1.38,
    MOTHER_BMI: 1.26,
    DRINKING_HISTORY: 0.75,
    SMOKING_HISTORY: 1.09,
    CHILD_GENDER: 0.90,
  },
  2: {
    BMIZ_BASE_VALUE: 0.00663,
    CHILD_OVERWIGHT: 2.06,
    MOTHER_AGE: 0.96,
    CHILDBIRTH_EXPERIENCE: 0.61,
    MOTHER_BMI: 1.30,
    DRINKING_HISTORY: 0.64,
    SMOKING_HISTORY: 1.00,
    CHILD_GENDER: 0.73,
  },
  3: {
    BMIZ_BASE_VALUE: 0.00182,
    CHILD_OVERWIGHT: 2.07,
    MOTHER_AGE: 0.98,
    CHILDBIRTH_EXPERIENCE: 1.06,
    MOTHER_BMI: 1.23,
    DRINKING_HISTORY: 1.05,
    SMOKING_HISTORY: 0.96,
    CHILD_GENDER: 1.23,
  },
};

// 36-47か月係数テーブル
const CO_AGE_36to47_MONTH: CoefficientsTable = {
  boy: {
    L: [+1.4345E-06, -0.000119864, -0.037620259, +0.624077322],
    S: [-7.58553e-08, +2.1302e-05, -0.001094812, +0.090651064],
    M: [-3.88384e-06, +0.001076046, -0.081944537, +17.20118685],
  },
  girl: {
    L: [+3.47613E-07, -2.38575E-05, -0.037631412, +0.795846301],
    S: [-1.0218e-07, +2.31971e-05, -0.000923983, +0.08896935],
    M: [-4.80005e-07, +0.000350143, -0.031651293, +16.03450105],
  },
  1: {
    BMIZ_BASE_VALUE: 0.00200,
    CHILD_OVERWIGHT: 8.07,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 1.68,
    MOTHER_BMI: 1.26,
    DRINKING_HISTORY: 0.80,
    SMOKING_HISTORY: 0.94,
    CHILD_GENDER: 1.12,
  },
  2: {
    BMIZ_BASE_VALUE: 0.01270,
    CHILD_OVERWIGHT: 3.21,
    MOTHER_AGE: 0.95,
    CHILDBIRTH_EXPERIENCE: 0.57,
    MOTHER_BMI: 1.27,
    DRINKING_HISTORY: 0.78,
    SMOKING_HISTORY: 0.84,
    CHILD_GENDER: 0.70,
  },
  3: {
    BMIZ_BASE_VALUE: 0.00147,
    CHILD_OVERWIGHT: 3.17,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 1.17,
    MOTHER_BMI: 1.21,
    DRINKING_HISTORY: 1.47,
    SMOKING_HISTORY: 1.00,
    CHILD_GENDER: 1.30,
  },
};

// 6歳(72か月)係数テーブル
const CO_AGE_72_MONTH: CoefficientsTable = {
  boy: {
    L: [+1.4345E-06, -0.000119864, -0.037620259, +0.624077322],
    L2: [-3.06037e-06, +0.001387949, -0.190798754, +5.531514491],
    S: [-7.58553e-08, +2.1302e-05, -0.001094812, +0.090651064],
    M: [-3.88384e-06, +0.001076046, -0.081944537, +17.20118685],
  },
  girl: {
    L: [-5.83768e-06, +0.002194825, -0.255465003, +7.295142629],
    L2: [-5.83768e-06, +0.002194825, -0.255465003, +7.295142629],
    S: [-1.0218e-07, +2.31971e-05, -0.000923983, +0.08896935],
    M: [-4.80005e-07, +0.000350143, -0.031651293, +16.03450105],
  },
  1: {
    BMIZ_BASE_VALUE: 0.00200,  // dummy (使用されない)
    CHILD_OVERWIGHT: 8.07,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 1.68,
    MOTHER_BMI: 1.26,
    DRINKING_HISTORY: 0.80,
    SMOKING_HISTORY: 0.94,
    CHILD_GENDER: 1.12,
  },
  2: {
    BMIZ_BASE_VALUE: 0.03040,
    CHILD_OVERWIGHT: 25.30,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 0.37,
    MOTHER_BMI: 1.21,
    DRINKING_HISTORY: 0.72,
    SMOKING_HISTORY: 0.74,
    CHILD_GENDER: 0.64,
  },
  3: {
    BMIZ_BASE_VALUE: 0.00331,
    CHILD_OVERWIGHT: 14.90,
    MOTHER_AGE: 0.98,
    CHILDBIRTH_EXPERIENCE: 0.86,
    MOTHER_BMI: 1.12,
    DRINKING_HISTORY: 1.51,
    SMOKING_HISTORY: 0.95,
    CHILD_GENDER: 1.50,
  },
};

// 11歳(132か月)係数テーブル
const CO_AGE_132_MONTH: CoefficientsTable = {
  boy: {
    L: [-3.06037e-06, +0.001387949, -0.190798754, +5.531514491],
    S: [+1.99415e-08, -1.37006e-05, +0.002877807, -0.053198893],
    M: [-3.94748e-06, +0.001761925, -0.203856428, +22.66402577],
  },
  girl: {
    L: [-5.83768e-06, +0.002194825, -0.255465003, +7.295142629],
    S: [+2.10831e-08, -1.43497e-05, +0.002839146, -0.035441889],
    M: [-3.03967e-06, +0.001541344, -0.183867689, +21.95124139],
  },
  1: {
    BMIZ_BASE_VALUE: 0.00200,  // dummy (使用されない)
    CHILD_OVERWIGHT: 8.07,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 1.68,
    MOTHER_BMI: 1.26,
    DRINKING_HISTORY: 0.80,
    SMOKING_HISTORY: 0.94,
    CHILD_GENDER: 1.12,
  },
  2: {
    BMIZ_BASE_VALUE: 0.03040,  // dummy (使用されない)
    CHILD_OVERWIGHT: 25.30,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 0.37,
    MOTHER_BMI: 1.21,
    DRINKING_HISTORY: 0.72,
    SMOKING_HISTORY: 0.74,
    CHILD_GENDER: 0.64,
  },
  3: {
    BMIZ_BASE_VALUE: 0.00116,
    CHILD_OVERWIGHT: 30.10,
    MOTHER_AGE: 1.00,
    CHILDBIRTH_EXPERIENCE: 1.59,
    MOTHER_BMI: 1.07,
    DRINKING_HISTORY: 1.81,
    SMOKING_HISTORY: 0.91,
    CHILD_GENDER: 2.14,
  },
};

// ===== ヘルパー関数 =====

/**
 * BMI計算
 * @param height 身長(cm)
 * @param weight 体重(kg)
 * @returns BMI
 */
function calculateBMI(height: number, weight: number): number {
  if (height === 0) return 0;
  // BMI = 体重(kg) / (身長(m))^2
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

/**
 * 3次多項式の計算
 */
function calcPolynomial(
  coeffs: [number, number, number, number],
  x: number
): number {
  return coeffs[0] * Math.pow(x, 3) +
         coeffs[1] * Math.pow(x, 2) +
         coeffs[2] * x +
         coeffs[3];
}

/**
 * 月齢に応じた係数テーブルを取得
 */
function getCoefficientsTable(monthOfAge: number): CoefficientsTable {
  const th_month_of_age_1 = 18 + 6;   // 24
  const th_month_of_age_2 = 36 + 12;  // 48
  const th_month_of_age_3 = 72 + 12;  // 84
  const th_month_of_age_4 = 132 + 12; // 144

  if (monthOfAge < th_month_of_age_1) {
    return CO_AGE_18to23_MONTH;
  } else if (monthOfAge < th_month_of_age_2) {
    return CO_AGE_36to47_MONTH;
  } else if (monthOfAge < th_month_of_age_3) {
    return CO_AGE_72_MONTH;
  } else if (monthOfAge < th_month_of_age_4) {
    return CO_AGE_132_MONTH;
  }

  return CO_AGE_18to23_MONTH;
}

/**
 * BMIz (標準化BMI) の計算
 */
function calculateBMIz(
  childBMI: number,
  childMonths: number,
  childGender: 'boy' | 'girl',
  coeffTable: CoefficientsTable
): number {
  const genderCoeffs = coeffTable[childGender];

  // L係数の選択 (6歳6-11か月の場合は別テーブル)
  let lCoeffs = genderCoeffs.L;
  if (childMonths >= 78 && childMonths <= 83 && genderCoeffs.L2) {
    lCoeffs = genderCoeffs.L2;
  }

  const l = calcPolynomial(lCoeffs, childMonths);
  const m = calcPolynomial(genderCoeffs.M, childMonths);
  const s = calcPolynomial(genderCoeffs.S, childMonths);

  // BMIz = ((BMI/M)^L - 1) / (L * S)
  const bmiz = (Math.pow(childBMI / m, l) - 1) / (l * s);

  return bmiz;
}

/**
 * リスクスコア計算 (ロジスティック回帰)
 */
function calculateRiskScore(
  coeffs: PredictionCoefficients,
  factors: {
    x1: number; // 過体重
    x2: number; // 母親年齢
    x3: number; // 出産経験
    x4: number; // 母親BMI
    x5: number; // 飲酒歴
    x6: number; // 喫煙歴
    x7: number; // 児性別
  }
): number {
  const sumCoeff =
    coeffs.BMIZ_BASE_VALUE +
    coeffs.CHILD_OVERWIGHT * factors.x1 +
    coeffs.MOTHER_AGE * factors.x2 +
    coeffs.CHILDBIRTH_EXPERIENCE * factors.x3 +
    coeffs.MOTHER_BMI * factors.x4 +
    coeffs.DRINKING_HISTORY * factors.x5 +
    coeffs.SMOKING_HISTORY * factors.x6 +
    coeffs.CHILD_GENDER * factors.x7;

  const eExp = Math.exp(-sumCoeff);
  const riskScore = 1 / (1 + eExp);

  return riskScore;
}

// ===== メイン予測関数 =====

/**
 * 小児肥満リスク予測
 *
 * @param input 入力データ
 * @returns 6歳、11歳、14歳時点の肥満確率
 */
export function predictChildObesity(
  input: ObesityPredictionInput
): ObesityPredictionResult {
  // BMI計算
  const childBMI = calculateBMI(input.childHeight, input.childWeight);
  const motherBMI = calculateBMI(input.motherHeight, input.motherWeight);

  // 係数テーブルの取得
  const coeffTable = getCoefficientsTable(input.childMonths);

  // BMIzの計算
  const childBMIz = calculateBMIz(
    childBMI,
    input.childMonths,
    input.childGender,
    coeffTable
  );

  // 7つの因子の計算
  const factors = {
    // X1: 過体重 (BMIz > 1.0)
    x1: childBMIz > 1.0 ? 1 : 0,

    // X2: 母親の年齢 (標準化)
    x2: (input.motherAge - 26.6) / 3.8,

    // X3: 出産経験
    x3: input.birthExperience === '経産' ? 1 : 0,

    // X4: 母親のBMI (標準化)
    x4: (motherBMI - 20.5) / 2.6,

    // X5: 飲酒歴
    x5: input.drinkingHistory === 'あり' ? 1 : 0,

    // X6: 喫煙歴
    x6: input.smokingHistory === 'あり' ? 1 : 0,

    // X7: 児の性別 (女の子=1)
    x7: input.childGender === 'girl' ? 1 : 0,
  };

  // 各年齢のリスクスコア計算
  const age6Probability = calculateRiskScore(coeffTable[1], factors);
  const age11Probability = calculateRiskScore(coeffTable[2], factors);
  const age14Probability = calculateRiskScore(coeffTable[3], factors);

  return {
    age6Probability,
    age11Probability,
    age14Probability,
    childBMI,
    childBMIz,
    motherBMI,
  };
}

/**
 * 確率をパーセント表記に変換
 */
export function formatProbabilityAsPercent(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

/**
 * 確率に応じたBMIを計算 (18 ~ 25の範囲)
 */
export function calculateTargetBMIFromProbability(probability: number): number {
  return 18 + 7 * probability;
}
