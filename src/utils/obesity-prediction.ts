/**
 * 小児肥満予測計算モジュール
 *
 * PHPプログラム (CoController.php, CoCoefTable.php) を基にした
 * 6歳、11歳、14歳時点での肥満リスク予測
 */

// ========================================
// 定数定義 (const_co.php)
// ========================================

// 回答内容インデックス
const CO_UNIQUE_ID = 'CO_UNIQUE_ID';				// 固有番号
const CO_ENTRY_DAY = 'CO_ENTRY_DAY';				// 登録日
const CO_CHILD_AGE = 'CO_CHILD_AGE';				// 子どもの年齢（年齢）
const CO_CHILD_AGE_MONTH = 'CO_CHILD_AGE_MONTH';	// 子どもの年齢（月齢）
const CO_CHILD_HEIGHT = 'CO_CHILD_HEIGHT';			// 子どもの身長
const CO_CHILD_WEIGHT = 'CO_CHILD_WEIGHT';			// 子どもの体重
const CO_CHILD_GENDER = 'CO_CHILD_GENDER';			// 子どもの性別
const CO_CHILD_BMIZ = 'CO_CHILD_BMIZ';				// 子どものBMIzの計算値
const CO_CHILD_OVERWIGHT = 'CO_CHILD_OVERWIGHT';	// 子どもの過体重フラグ
const CO_MOTHER_AGE = 'CO_MOTHER_AGE';				// 母親の年齢（歳）
const CO_MOTHER_HEIGHT = 'CO_MOTHER_HEIGHT';		// 母親の身長
const CO_MOTHER_WEIGHT = 'CO_MOTHER_WEIGHT';		// 母親の体重
const CO_CHILDBIRTH_EXPERIENCE = 'CO_CHILDBIRTH_EXPERIENCE';	// 出産経験
const CO_DRINKING_HISTORY = 'CO_DRINKING_HISTORY';	// 飲酒履歴
const CO_SMOKING_HISTORY = 'CO_SMOKING_HISTORY';	// 喫煙履歴

// 計算結果のインデックス
const CO_SUM_COEF_VAL_1 = 'CO_SUM_COEF_VAL_1';		// 係数合計1
const CO_SUM_COEF_VAL_2 = 'CO_SUM_COEF_VAL_2';		// 係数合計2
const CO_SUM_COEF_VAL_3 = 'CO_SUM_COEF_VAL_3';		// 係数合計3
const CO_SUM_COEF_VAL_4 = 'CO_SUM_COEF_VAL_4';		// 係数合計4

const CO_E_EXP_VAL_1 = 'CO_E_EXP_VAL_1';			// 計算途中の値1(e^-係数)
const CO_E_EXP_VAL_2 = 'CO_E_EXP_VAL_2';			// 計算途中の値2(e^-係数)
const CO_E_EXP_VAL_3 = 'CO_E_EXP_VAL_3';			// 計算途中の値3(e^-係数)
const CO_E_EXP_VAL_4 = 'CO_E_EXP_VAL_4';			// 計算途中の値4(e^-係数)

const CO_RISK_SCORE_PER_1 = 'CO_RISK_SCORE_PER_1';	// 計算結果1(36-43か月)
const CO_RISK_SCORE_PER_2 = 'CO_RISK_SCORE_PER_2';	// 計算結果2(72か月)
const CO_RISK_SCORE_PER_3 = 'CO_RISK_SCORE_PER_3';	// 計算結果3(132か月)
const CO_RISK_SCORE_PER_4 = 'CO_RISK_SCORE_PER_4';	// 計算結果4(168か月)

// 係数は係数テーブルに定義(CoCoefTable.php)

// 係数インデックス
const CO_COEF_X1 = 0;
const CO_COEF_X2 = 1;
const CO_COEF_X3 = 2;
const CO_COEF_X4 = 3;
const CO_COEF_X5 = 4;
const CO_COEF_X6 = 5;
const CO_COEF_X7 = 6;
const CO_COEF_X_MAX = CO_COEF_X7 + 1;

const CO_CH_MONTH_FROM_1 = 18;			// 18-23か月
const CO_CH_MONTH_TO_1 = 23;
const CO_CH_MONTH_FROM_2 = 36;			// 36-47か月
const CO_CH_MONTH_TO_2 = 47;
const CO_CH_MONTH_FROM_3 = 72;			// 6歳
const CO_CH_MONTH_FROM_3_H = 78;
const CO_CH_MONTH_TO_3 = 83;
const CO_CH_MONTH_FROM_4 = 132;			// 11歳
const CO_CH_MONTH_TO_4 = 143;

const CO_SCORE_IDX_1 = 0;				// 計算結果1(36-43か月)
const CO_SCORE_IDX_2 = 1;				// 計算結果2(72か月)
const CO_SCORE_IDX_3 = 2;				// 計算結果3(132か月)
const CO_SCORE_IDX_4 = 3;				// 計算結果4(168か月)

const CO_SCORE_DISP_TYPE_1 = 0;			// 計算結果表示1(18-23か月)
const CO_SCORE_DISP_TYPE_2 = 1;			// 計算結果表示1(36-43か月)
const CO_SCORE_DISP_TYPE_3 = 2;			// 計算結果表示1(72か月)
const CO_SCORE_DISP_TYPE_4 = 3;			// 計算結果表示1(132か月)

const CO_SEL_1ST = 1;					// 回答：初回
const CO_SEL_TOO_2ND = 2;				// 回答：2回目以降
const CO_SEL_NO = 1;					// 回答：いいえ
const CO_SEL_YES = 2;					// 回答：はい
const CO_SEL_BOY = 1;					// 回答：男の子
const CO_SEL_GIRL = 2;					// 回答：女の子

// ========================================
// 係数テーブルクラス (CoCoefTable.php)
// ========================================

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
  0: PredictionCoefficients;  // 36-47か月係数
  1: PredictionCoefficients;  // 6歳(72か月)係数
  2: PredictionCoefficients;  // 11歳(132か月)係数
  3: PredictionCoefficients;  // 14歳(168か月)係数
}

// 小児肥満、月齢別計算係数の定義テーブル

// 18-23か月係数テーブル
const CO_AGE_18to23_MONTH: CoefficientsTable = {
  // BMIz算出テーブル(男の子)
  boy: {
    L: [+1.4345E-06, -0.000119864, -0.037620259, +0.624077322],
    S: [-7.58553e-08, +2.1302e-05, -0.001094812, +0.090651064],
    M: [-7.67459E-05, +0.007173901, -0.251765964, +18.77518828],
  },
  // BMIz算出テーブル(女の子)
  girl: {
    L: [+3.47613E-07, -2.38575E-05, -0.037631412, +0.795846301],
    S: [-1.0218e-07, +2.31971e-05, -0.000923983, +0.08896935],
    M: [-0.000168505, +0.013702125, -0.385286062, +19.15626964],
  },

  // 36-47か月係数
  0: {
    BMIZ_BASE_VALUE: 0.04410, 		// BMIz算出用の基礎値
    CHILD_OVERWIGHT: 11.40, 		// X1:過体重
    MOTHER_AGE: 0.99, 				// X2:妊娠判明時の母親の年齢
    CHILDBIRTH_EXPERIENCE: 0.89, 	// X3:出産経験
    MOTHER_BMI: 1.10, 				// X4:母親のBMI
    DRINKING_HISTORY: 1.25, 		// X5:妊娠判明時の飲酒歴
    SMOKING_HISTORY: 0.72, 			// X6:妊娠判明時の喫煙歴
    CHILD_GENDER: 0.75, 			// X7:こどもの性別
  },
  // 6歳(72か月)係数
  1: {
    BMIZ_BASE_VALUE: 0.00193, 		// BMIz算出用の基礎値
    CHILD_OVERWIGHT: 3.42, 			// X1:過体重
    MOTHER_AGE: 0.98, 				// X2:妊娠判明時の母親の年齢
    CHILDBIRTH_EXPERIENCE: 1.38, 	// X3:出産経験
    MOTHER_BMI: 1.26, 				// X4:母親のBMI
    DRINKING_HISTORY: 0.75, 		// X5:妊娠判明時の飲酒歴
    SMOKING_HISTORY: 1.09, 			// X6:妊娠判明時の喫煙歴
    CHILD_GENDER: 0.90, 			// X7:こどもの性別
  },
  // 11歳(132か月)係数
  2: {
    BMIZ_BASE_VALUE: 0.00663, 		// BMIz算出用の基礎値
    CHILD_OVERWIGHT: 2.06, 			// X1:過体重
    MOTHER_AGE: 0.96, 				// X2:妊娠判明時の母親の年齢
    CHILDBIRTH_EXPERIENCE: 0.61, 	// X3:出産経験
    MOTHER_BMI: 1.30, 				// X4:母親のBMI
    DRINKING_HISTORY: 0.64, 		// X5:妊娠判明時の飲酒歴
    SMOKING_HISTORY: 1.00, 			// X6:妊娠判明時の喫煙歴
    CHILD_GENDER: 0.73, 			// X7:こどもの性別
  },
  // 14歳(168か月)係数
  3: {
    BMIZ_BASE_VALUE: 0.00182, 		// BMIz算出用の基礎値
    CHILD_OVERWIGHT: 2.07, 			// X1:過体重
    MOTHER_AGE: 0.98, 				// X2:妊娠判明時の母親の年齢
    CHILDBIRTH_EXPERIENCE: 1.06, 	// X3:出産経験
    MOTHER_BMI: 1.23, 				// X4:母親のBMI
    DRINKING_HISTORY: 1.05, 		// X5:妊娠判明時の飲酒歴
    SMOKING_HISTORY: 0.96, 			// X6:妊娠判明時の喫煙歴
    CHILD_GENDER: 1.23, 			// X7:こどもの性別
  },
};

// 36-47か月係数テーブル
const CO_AGE_36to47_MONTH: CoefficientsTable = {
  // BMIz算出テーブル(男の子)
  boy: {
    L: [+1.4345E-06, -0.000119864, -0.037620259, +0.624077322],
    S: [-7.58553e-08, +2.1302e-05, -0.001094812, +0.090651064],
    M: [-3.88384e-06, +0.001076046, -0.081944537, +17.20118685],
  },
  // BMIz算出テーブル(女の子)
  girl: {
    L: [+3.47613E-07, -2.38575E-05, -0.037631412, +0.795846301],
    S: [-1.0218e-07, +2.31971e-05, -0.000923983, +0.08896935],
    M: [-4.80005e-07, +0.000350143, -0.031651293, +16.03450105],
  },

  // 36-47か月係数は使用されない（ダミー）
  0: {
    BMIZ_BASE_VALUE: 0.00200,  // ダミー（使用されない）
    CHILD_OVERWIGHT: 8.07,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 1.68,
    MOTHER_BMI: 1.26,
    DRINKING_HISTORY: 0.80,
    SMOKING_HISTORY: 0.94,
    CHILD_GENDER: 1.12,
  },
  // 6歳(72か月)係数
  1: {
    BMIZ_BASE_VALUE: 0.00200, 		// BMIz算出用の基礎値
    CHILD_OVERWIGHT: 8.07, 			// X1:過体重
    MOTHER_AGE: 0.97, 				// X2:妊娠判明時の母親の年齢
    CHILDBIRTH_EXPERIENCE: 1.68, 	// X3:出産経験
    MOTHER_BMI: 1.26, 				// X4:母親のBMI
    DRINKING_HISTORY: 0.80, 		// X5:妊娠判明時の飲酒歴
    SMOKING_HISTORY: 0.94, 			// X6:妊娠判明時の喫煙歴
    CHILD_GENDER: 1.12, 			// X7:こどもの性別
  },
  // 11歳(132か月)係数
  2: {
    BMIZ_BASE_VALUE: 0.01270, 		// BMIz算出用の基礎値
    CHILD_OVERWIGHT: 3.21, 			// X1:過体重
    MOTHER_AGE: 0.95, 				// X2:妊娠判明時の母親の年齢
    CHILDBIRTH_EXPERIENCE: 0.57, 	// X3:出産経験
    MOTHER_BMI: 1.27, 				// X4:母親のBMI
    DRINKING_HISTORY: 0.78, 		// X5:妊娠判明時の飲酒歴
    SMOKING_HISTORY: 0.84, 			// X6:妊娠判明時の喫煙歴
    CHILD_GENDER: 0.70, 			// X7:こどもの性別
  },
  // 14歳(168か月)係数
  3: {
    BMIZ_BASE_VALUE: 0.00147, 		// BMIz算出用の基礎値
    CHILD_OVERWIGHT: 3.17, 			// X1:過体重
    MOTHER_AGE: 0.97, 				// X2:妊娠判明時の母親の年齢
    CHILDBIRTH_EXPERIENCE: 1.17, 	// X3:出産経験
    MOTHER_BMI: 1.21, 				// X4:母親のBMI
    DRINKING_HISTORY: 1.47, 		// X5:妊娠判明時の飲酒歴
    SMOKING_HISTORY: 1.00, 			// X6:妊娠判明時の喫煙歴
    CHILD_GENDER: 1.30, 			// X7:こどもの性別
  },
};

// 6歳(72か月)係数テーブル
const CO_AGE_72_MONTH: CoefficientsTable = {
  // BMIz算出テーブル(男の子)
  boy: {
    L: [+1.4345E-06, -0.000119864, -0.037620259, +0.624077322],
    L2: [-3.06037e-06, +0.001387949, -0.190798754, +5.531514491],
    S: [-7.58553e-08, +2.1302e-05, -0.001094812, +0.090651064],
    M: [-3.88384e-06, +0.001076046, -0.081944537, +17.20118685],
  },
  // BMIz算出テーブル(女の子)
  girl: {
    L: [-5.83768e-06, +0.002194825, -0.255465003, +7.295142629],
    L2: [-5.83768e-06, +0.002194825, -0.255465003, +7.295142629], // dummy(L copy)
    S: [-1.0218e-07, +2.31971e-05, -0.000923983, +0.08896935],
    M: [-4.80005e-07, +0.000350143, -0.031651293, +16.03450105],
  },

  // 36-47か月係数は使用されない（ダミー）
  0: {
    BMIZ_BASE_VALUE: 0.00200,  // ダミー（使用されない）
    CHILD_OVERWIGHT: 8.07,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 1.68,
    MOTHER_BMI: 1.26,
    DRINKING_HISTORY: 0.80,
    SMOKING_HISTORY: 0.94,
    CHILD_GENDER: 1.12,
  },
  // 6歳(72か月)係数は使用されない（ダミー）
  1: {
    BMIZ_BASE_VALUE: 0.00200,  // ダミー（使用されない）
    CHILD_OVERWIGHT: 8.07,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 1.68,
    MOTHER_BMI: 1.26,
    DRINKING_HISTORY: 0.80,
    SMOKING_HISTORY: 0.94,
    CHILD_GENDER: 1.12,
  },
  // 11歳(132か月)係数
  2: {
    BMIZ_BASE_VALUE: 0.03040, 		// BMIz算出用の基礎値
    CHILD_OVERWIGHT: 25.30, 		// X1:過体重
    MOTHER_AGE: 0.97, 				// X2:妊娠判明時の母親の年齢
    CHILDBIRTH_EXPERIENCE: 0.37, 	// X3:出産経験
    MOTHER_BMI: 1.21, 				// X4:母親のBMI
    DRINKING_HISTORY: 0.72, 		// X5:妊娠判明時の飲酒歴
    SMOKING_HISTORY: 0.74, 			// X6:妊娠判明時の喫煙歴
    CHILD_GENDER: 0.64, 			// X7:こどもの性別
  },
  // 14歳(168か月)係数
  3: {
    BMIZ_BASE_VALUE: 0.00331, 		// BMIz算出用の基礎値
    CHILD_OVERWIGHT: 14.90, 		// X1:過体重
    MOTHER_AGE: 0.98, 				// X2:妊娠判明時の母親の年齢
    CHILDBIRTH_EXPERIENCE: 0.86, 	// X3:出産経験
    MOTHER_BMI: 1.12, 				// X4:母親のBMI
    DRINKING_HISTORY: 1.51, 		// X5:妊娠判明時の飲酒歴
    SMOKING_HISTORY: 0.95, 			// X6:妊娠判明時の喫煙歴
    CHILD_GENDER: 1.50, 			// X7:こどもの性別
  },
};

// 11歳(132か月)係数テーブル
const CO_AGE_132_MONTH: CoefficientsTable = {
  // BMIz算出テーブル(男の子)
  boy: {
    L: [-3.06037e-06, +0.001387949, -0.190798754, +5.531514491],
    S: [+1.99415e-08, -1.37006e-05, +0.002877807, -0.053198893],
    M: [-3.94748e-06, +0.001761925, -0.203856428, +22.66402577],
  },
  // BMIz算出テーブル(女の子)
  girl: {
    L: [-5.83768e-06, +0.002194825, -0.255465003, +7.295142629],
    S: [+2.10831e-08, -1.43497e-05, +0.002839146, -0.035441889],
    M: [-3.03967e-06, +0.001541344, -0.183867689, +21.95124139],
  },

  // 36-47か月係数は使用されない（ダミー）
  0: {
    BMIZ_BASE_VALUE: 0.00200,  // ダミー（使用されない）
    CHILD_OVERWIGHT: 8.07,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 1.68,
    MOTHER_BMI: 1.26,
    DRINKING_HISTORY: 0.80,
    SMOKING_HISTORY: 0.94,
    CHILD_GENDER: 1.12,
  },
  // 6歳(72か月)係数は使用されない（ダミー）
  1: {
    BMIZ_BASE_VALUE: 0.00200,  // ダミー（使用されない）
    CHILD_OVERWIGHT: 8.07,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 1.68,
    MOTHER_BMI: 1.26,
    DRINKING_HISTORY: 0.80,
    SMOKING_HISTORY: 0.94,
    CHILD_GENDER: 1.12,
  },
  // 11歳(132か月)係数は使用されない（ダミー）
  2: {
    BMIZ_BASE_VALUE: 0.03040,  // ダミー（使用されない）
    CHILD_OVERWIGHT: 25.30,
    MOTHER_AGE: 0.97,
    CHILDBIRTH_EXPERIENCE: 0.37,
    MOTHER_BMI: 1.21,
    DRINKING_HISTORY: 0.72,
    SMOKING_HISTORY: 0.74,
    CHILD_GENDER: 0.64,
  },
  // 14歳(168か月)係数
  3: {
    BMIZ_BASE_VALUE: 0.00116, 		// BMIz算出用の基礎値
    CHILD_OVERWIGHT: 30.10, 		// X1:過体重
    MOTHER_AGE: 1.00, 				// X2:妊娠判明時の母親の年齢
    CHILDBIRTH_EXPERIENCE: 1.59, 	// X3:出産経験
    MOTHER_BMI: 1.07, 				// X4:母親のBMI
    DRINKING_HISTORY: 1.81, 		// X5:妊娠判明時の飲酒歴
    SMOKING_HISTORY: 0.91, 			// X6:妊娠判明時の喫煙歴
    CHILD_GENDER: 2.14, 			// X7:こどもの性別
  },
};

const th_month_of_age_1 = 18 + 6;
const th_month_of_age_2 = 36 + 12;
const th_month_of_age_3 = 72 + 12;
const th_month_of_age_4 = 132 + 12;

function getCoCoefTable(monthOfAge: number): CoefficientsTable {
  if (monthOfAge < th_month_of_age_1) {
    // 18 - 23か月
    return CO_AGE_18to23_MONTH;
  } else if (monthOfAge < th_month_of_age_2) {
    // 36 - 47か月
    return CO_AGE_36to47_MONTH;
  } else if (monthOfAge < th_month_of_age_3) {
    // 72 - 83か月
    return CO_AGE_72_MONTH;
  } else if (monthOfAge < th_month_of_age_4) {
    // 132 - 143か月
    return CO_AGE_132_MONTH;
  }

  // 範囲外なので最初のテーブルを返す
  return CO_AGE_18to23_MONTH;
}

// ========================================
// コントローラークラス (CoController.php)
// ========================================

const DEBUG_PRINT = 0;

// BMI計算
function calcBMI(h: number, w: number): number {
  if (h === 0) {
    // Zero Divide
    return 0;
  }
  return (w / 10) / ((h / 1000) * (h / 1000));		// kg/(m*m)
}

// 月齢別計算種類を判定
function getChildMonthType(chMonth: number): number {
  let disp_type = CO_SCORE_DISP_TYPE_1;
  if ((chMonth >= CO_CH_MONTH_FROM_1) && (chMonth <= CO_CH_MONTH_TO_1)) {
    // 18-23か月
    disp_type = CO_SCORE_DISP_TYPE_1;
  } else if ((chMonth >= CO_CH_MONTH_FROM_2) && (chMonth <= CO_CH_MONTH_TO_2)) {
    // 36-47か月
    disp_type = CO_SCORE_DISP_TYPE_2;
  } else if ((chMonth >= CO_CH_MONTH_FROM_3) && (chMonth <= CO_CH_MONTH_TO_3)) {
    // 6歳
    disp_type = CO_SCORE_DISP_TYPE_3;
  } else if ((chMonth >= CO_CH_MONTH_FROM_4) && (chMonth <= CO_CH_MONTH_TO_4)) {
    // 11歳
    disp_type = CO_SCORE_DISP_TYPE_4;
  }
  return disp_type;
}

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

// CO値を計算する
function exec_calc(
  childHeight: number,        // mm単位
  childWeight: number,        // 100g単位
  childGender: number,        // 1=男の子, 2=女の子
  childMonths: number,        // 月齢
  motherAge: number,          // 歳
  motherHeight: number,       // mm単位
  motherWeight: number,       // 100g単位
  birthExperience: number,    // 1=初産, 2=経産
  drinkingHistory: number,    // 1=なし, 2=あり
  smokingHistory: number      // 1=なし, 2=あり
): {
  age6Probability: number;
  age11Probability: number;
  age14Probability: number;
  childBMI: number;
  childBMIz: number;
  motherBMI: number;
} {
  let co_val = 0;
  const coef_parm = [
    //   X1 X2 X3 X4 X5 X6 X7
    [0, 0, 0, 0, 0, 0, 0], 	// 36-47か月
    [0, 0, 0, 0, 0, 0, 0], 	// 6歳
    [0, 0, 0, 0, 0, 0, 0], 	// 11歳
    [0, 0, 0, 0, 0, 0, 0], 	// 14歳
  ];

  // 前処理
  // 月齢取得
  const chMonth = childMonths;
  const chGen = childGender;
  let chGenIdx: 'boy' | 'girl';
  if (chGen === 1) {
    // 男の子
    chGenIdx = 'boy';
  } else {
    // 女の子
    chGenIdx = 'girl';
  }

  const calcIdx: number[] = [];
  const disp_type = getChildMonthType(chMonth);
  switch (disp_type) {
    case CO_SCORE_DISP_TYPE_1:
      // 18-23か月
    default:
      // 範囲外なので、仮に最小(18ヶ月)で計算
      calcIdx.push(CO_SCORE_IDX_1);
      calcIdx.push(CO_SCORE_IDX_2);
      calcIdx.push(CO_SCORE_IDX_3);
      calcIdx.push(CO_SCORE_IDX_4);
      break;
    case CO_SCORE_DISP_TYPE_2:
      // 36-47か月
      calcIdx.push(CO_SCORE_IDX_2);
      calcIdx.push(CO_SCORE_IDX_3);
      calcIdx.push(CO_SCORE_IDX_4);
      break;
    case CO_SCORE_DISP_TYPE_3:
      // 6歳
      calcIdx.push(CO_SCORE_IDX_3);
      calcIdx.push(CO_SCORE_IDX_4);
      break;
    case CO_SCORE_DISP_TYPE_4:
      // 11歳
      calcIdx.push(CO_SCORE_IDX_4);
      break;
  }

  // 係数テーブルの選択
  const co_coef = getCoCoefTable(chMonth);

  // X1:過体重
  const curChildBMI = calcBMI(childHeight, childWeight);

  // 係数選択
  let l = co_coef[chGenIdx]['L'];
  if (disp_type === CO_SCORE_DISP_TYPE_3) {
    // 6歳6-11か月は別テーブルを選択
    if (chMonth >= CO_CH_MONTH_FROM_3_H) {
      // 78-83
      l = co_coef[chGenIdx]['L2']!;
    }
  }
  const m = co_coef[chGenIdx]['M'];
  const s = co_coef[chGenIdx]['S'];

  // L, M, S計算
  const l_val = l[0] * Math.pow(chMonth, 3) + l[1] * Math.pow(chMonth, 2) + l[2] * chMonth + l[3];
  const m_val = m[0] * Math.pow(chMonth, 3) + m[1] * Math.pow(chMonth, 2) + m[2] * chMonth + m[3];
  const s_val = s[0] * Math.pow(chMonth, 3) + s[1] * Math.pow(chMonth, 2) + s[2] * chMonth + s[3];

  // BMIz = ((bmi/M)^L-1)/(L*S)
  const valBMIz = (Math.pow((curChildBMI / m_val), l_val) - 1) / (l_val * s_val);
  let valX = 0;
  if (valBMIz > 1.0) {
    valX = 1;
  }
  for (const index of calcIdx) {
    coef_parm[index][CO_COEF_X1] = co_coef[index as keyof CoefficientsTable]['CHILD_OVERWIGHT'] * valX;
  }

  // X2:妊娠判明時の母親の年齢
  // 標準化年齢を計算
  // 標準化年齢＝(実年齢-26.6)/3.8
  const val2 = motherAge;
  const valX2 = ((val2 - 26.6) / 3.8);
  for (const index of calcIdx) {
    coef_parm[index][CO_COEF_X2] = co_coef[index as keyof CoefficientsTable]['MOTHER_AGE'] * valX2;
  }

  // X3:出産経験
  const val3 = birthExperience;
  let valX3 = 0;
  if (val3 === CO_SEL_TOO_2ND) {
    // 2回目以降
    valX3 = 1;
  }
  for (const index of calcIdx) {
    coef_parm[index][CO_COEF_X3] = co_coef[index as keyof CoefficientsTable]['CHILDBIRTH_EXPERIENCE'] * valX3;
  }

  // X4:母親のBMI
  // 標準化BMIを計算
  // BMI＝体重(㎏)/身長 (m)/身長 (m）
  // 標準化BMI＝(BMI-20.5)/2.6
  const valBMI = calcBMI(motherHeight, motherWeight);
  const valX4 = ((valBMI - 20.5) / 2.6);
  for (const index of calcIdx) {
    coef_parm[index][CO_COEF_X4] = co_coef[index as keyof CoefficientsTable]['MOTHER_BMI'] * valX4;
  }

  // X5:妊娠判明時の飲酒歴
  const val5 = drinkingHistory;
  let valX5 = 0;
  if (val5 === CO_SEL_YES) {
    // はい
    valX5 = 1;
  }
  for (const index of calcIdx) {
    coef_parm[index][CO_COEF_X5] = co_coef[index as keyof CoefficientsTable]['DRINKING_HISTORY'] * valX5;
  }

  // X6:妊娠判明時の喫煙歴
  const val6 = smokingHistory;
  let valX6 = 0;
  if (val6 === CO_SEL_YES) {
    // はい
    valX6 = 1;
  }
  for (const index of calcIdx) {
    coef_parm[index][CO_COEF_X6] = co_coef[index as keyof CoefficientsTable]['SMOKING_HISTORY'] * valX6;
  }

  // X7:こどもの性別
  const val7 = childGender;
  let valX7 = 0;
  if (val7 === CO_SEL_GIRL) {
    // 女の子
    valX7 = 1;
  }
  for (const index of calcIdx) {
    coef_parm[index][CO_COEF_X7] = co_coef[index as keyof CoefficientsTable]['CHILD_GENDER'] * valX7;
  }

  // 係数の合計を計算する
  let age6Probability = 0;
  let age11Probability = 0;
  let age14Probability = 0;

  for (const index of calcIdx) {
    // 係数の合計を計算
    co_val = 0;
    co_val = co_coef[index as keyof CoefficientsTable]['BMIZ_BASE_VALUE'];
    for (const coef of coef_parm[index]) {
      co_val += coef;
    }

    // e^-係数の計算
    const co_e_exp = Math.exp(-co_val);

    // リスクスコアの計算
    const co_risk_score = 1 / (1 + co_e_exp);

    //係数の合計を保存
    switch (index) {
      case CO_SCORE_IDX_1:
        // 36-47か月（現在未使用）
        break;
      case CO_SCORE_IDX_2:
        age6Probability = co_risk_score;
        break;
      case CO_SCORE_IDX_3:
        age11Probability = co_risk_score;
        break;
      case CO_SCORE_IDX_4:
        age14Probability = co_risk_score;
        break;
    }
  }

  if (DEBUG_PRINT === 1) {
    console.log({
      valBMIz,
      curChildBMI,
      valBMI,
      age6Probability,
      age11Probability,
      age14Probability
    });
  }

  return {
    age6Probability,
    age11Probability,
    age14Probability,
    childBMI: curChildBMI,
    childBMIz: valBMIz,
    motherBMI: valBMI,
  };
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
  // 入力データをPHPと同じ単位系に変換
  const childHeightMm = input.childHeight * 10;  // cm → mm
  const childWeight100g = input.childWeight * 10; // kg → 100g単位
  const motherHeightMm = input.motherHeight * 10;
  const motherWeight100g = input.motherWeight * 10;

  // 性別・その他の情報を数値に変換
  const childGender = input.childGender === 'boy' ? CO_SEL_BOY : CO_SEL_GIRL;
  const birthExperience = input.birthExperience === '初産' ? CO_SEL_1ST : CO_SEL_TOO_2ND;
  const drinkingHistory = input.drinkingHistory === 'なし' ? CO_SEL_NO : CO_SEL_YES;
  const smokingHistory = input.smokingHistory === 'なし' ? CO_SEL_NO : CO_SEL_YES;

  return exec_calc(
    childHeightMm,
    childWeight100g,
    childGender,
    input.childMonths,
    input.motherAge,
    motherHeightMm,
    motherWeight100g,
    birthExperience,
    drinkingHistory,
    smokingHistory
  );
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