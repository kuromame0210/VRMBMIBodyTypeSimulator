# **VRM BMI体型シミュレーター 要件整理 & Claude Code実装ガイド**

## **プロジェクト要件整理**

### **プロジェクト概要**
**目的:** ユーザーの身体データ（身長・体重・年齢・性別）を入力し、将来のBMI変化をVRMアバターで視覚的にシミュレーションするウェブアプリケーション

**技術スタック:** Next.js + Vercel + Three.js + @pixiv/three-vrm

**フェーズ1スコープ:** ローカルファイル読み込み機能は不要、public配置のVRMファイルを使用

### **主要機能要件**

#### **UI構成**
- **左側：入力フォーム**
  - 身長（cm）：テキストボックス（手動入力可能）
  - 体重（kg）：テキストボックス（手動入力可能）
  - 年齢：テキストボックス（手動入力可能）
  - 性別：選択肢（男性/女性）
  - 余剰カロリー：「少ない(-100)」「普通(0)」「多い(+100)」の自動入力
  - 「自動計算」ボタン

- **右側：VRMアバター表示エリア**
  - 3D体型表示
  - BMI計算結果に連動した体型変化
  - 3秒ごとの自動体型変化機能

#### **計算ロジック（重要：仕様書の修正）**

**BMI計算（修正版）:**
$$BMI = \frac{体重(kg) \times 10000}{身長(cm)^2}$$

**基礎代謝量計算（Mifflin-St Jeor式）:**
- **男性:** $$13.397 \times 体重(kg) + 4.799 \times 身長(cm) - 5.677 \times 年齢 + 88.362$$
- **女性:** $$9.247 \times 体重(kg) + 3.098 \times 身長(cm) - 4.33 \times 年齢 + 447.593$$

**将来体重予測:**
$$体重変化(kg) = \frac{余剰kcal \times 日数}{7200}$$

**予測期間:**
- 1ヶ月後（30日）、1年後（365日）、3年後（1095日）、5年後（1825日）、10年後（3650日）

#### **VRM制御仕様**
- **必須条件:** VRMファイルに`Belly`または`belly`のBlendShape（シェイプキー）が事前設定されていること
- **制御方法:** BMI値に基づいてBlendShapeの適用度合い（0-1.0）を調整
- **自動変化:** 3秒間隔での滑らかな体型遷移

---

## **Claude Code実装用 詳細情報**

### **1. プロジェクト初期設定**

```bash
# プロジェクト作成
npx create-next-app@latest bmi-vrm-simulator --typescript --tailwind --eslint
cd bmi-vrm-simulator

# 必要ライブラリのインストール
npm install three @pixiv/three-vrm
npm install -D @types/three
```

### **2. 重要な設定ファイル**

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader']
    });
    return config;
  },
  
  async headers() {
    return [
      {
        source: '/vrm-models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  },
  
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
```

### **3. ファイル構成**
```
project-root/
├── public/
│   └── vrm-models/
│       └── avatar.vrm          # BlendShape含むVRMファイル
├── src/
│   ├── components/
│   │   ├── BMICalculator.tsx   # 計算フォーム
│   │   ├── VRMViewer.tsx       # 3D表示
│   │   └── LoadingSpinner.tsx  # ローディングUI
│   ├── utils/
│   │   └── calculations.ts     # 計算ロジック
│   └── pages/
│       └── index.tsx           # メインページ
```

### **4. 核心となる計算ロジック**

**utils/calculations.ts:**
```typescript
export const calculateBMI = (weight: number, height: number): number => {
  return (weight * 10000) / (height * height);
};

export const calculateBMR = (weight: number, height: number, age: number, gender: 'male' | 'female'): number => {
  if (gender === 'male') {
    return 13.397 * weight + 4.799 * height - 5.677 * age + 88.362;
  } else {
    return 9.247 * weight + 3.098 * height - 4.33 * age + 447.593;
  }
};

export const calculateFutureWeight = (currentWeight: number, excessCalories: number, days: number): number => {
  const weightChange = (excessCalories * days) / 7200;
  return currentWeight + weightChange;
};

export const calculateAllFutureBMI = (height: number, weight: number, excessCalories: number) => {
  const periods = [30, 365, 1095, 1825, 3650];
  return periods.map(days => {
    const futureWeight = calculateFutureWeight(weight, excessCalories, days);
    return {
      period: days,
      weight: futureWeight,
      bmi: calculateBMI(futureWeight, height)
    };
  });
};
```

### **5. VRMBlendShape制御の核心ロジック**

```typescript
const updateBodyShape = (bmiValue: number) => {
  if (!vrm) return;
  
  vrm.scene.traverse((object: any) => {
    if (object.isSkinnedMesh && object.morphTargetDictionary) {
      const bellyIndex = object.morphTargetDictionary['Belly'] || 
                        object.morphTargetDictionary['belly'];
      
      if (bellyIndex !== undefined) {
        let blendValue = 0;
        
        // BMI値に基づく制御ロジック
        if (bmiValue >= 30) {
          blendValue = Math.min((bmiValue - 25) / 15, 1.0);
        } else if (bmiValue >= 25) {
          blendValue = (bmiValue - 25) / 5 * 0.5;
        }
        
        object.morphTargetInfluences[bellyIndex] = blendValue;
      }
    }
  });
};
```

### **6. コンポーネント設計指針**

#### **pages/index.tsx の状態管理:**
```typescript
const [userData, setUserData] = useState({
  height: 170,
  weight: 60,
  age: 30,
  gender: 'male' as 'male' | 'female',
  excessCalories: 0
});

const [currentBMI, setCurrentBMI] = useState(0);
const [futurePredictions, setFuturePredictions] = useState([]);
```

#### **VRMViewer.tsx の重要ポイント:**
```typescript
// 動的インポートでSSR無効化
const VRMViewer = dynamic(() => import('../components/VRMViewer'), {
  ssr: false,
  loading: () => <div>3Dアバターを読み込み中...</div>
});

// VRMViewer内での重要な処理
useEffect(() => {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  
  loader.load('/vrm-models/avatar.vrm', (gltf) => {
    const vrm = gltf.userData.vrm;
    scene.add(vrm.scene);
    VRMUtils.rotateVRM0(vrm);
  });
}, []);
```

### **7. 実装優先順位**

#### **Phase 1: 基本機能（1-2週間）**
1. Next.jsプロジェクト初期化
2. BMI計算フォーム実装
3. 基本的なVRM表示機能
4. 計算ロジックの実装

#### **Phase 2: 統合機能（1週間）**
1. BMI計算結果とVRM連動
2. BlendShape制御の実装
3. 将来予測機能の追加

#### **Phase 3: 仕上げ（1週間）**
1. 3秒ごとの自動変化機能
2. ローディングUI改善
3. エラーハンドリング
4. Vercelデプロイ設定

### **8. Claude Code向けの具体的指示**

**最初に実装すべきコンポーネント:**
1. **BMI計算フォーム** - 入力フィールドと計算ボタン
2. **計算ロジック** - utils/calculations.tsの関数群
3. **基本的なVRMViewer** - Three.jsシーンとVRM読み込み
4. **BlendShape制御** - BMI値に基づく体型変化

**重要な注意点:**
- VRMViewerは必ず`dynamic`インポートで`ssr: false`に設定
- VRMファイルは`public/vrm-models/`に配置
- BlendShape名は`Belly`、`belly`、`Fat`、`Weight`等を想定
- 計算結果の表示とVRM更新を適切に連動させる

**テスト用データ:**
```javascript
const testData = {
  height: 170,
  weight: 70,
  age: 30,
  gender: 'male',
  excessCalories: 100
};
```

この要件整理とClaude Code向けの実装情報により、段階的かつ効率的にVRM BMI体型シミュレーターを開発できます。特に重要なのは、VRMファイルに事前にBlendShapeが設定されていることと、Next.jsでのクライアントサイドレンダリングの適切な実装です。

追加要件
アバター６種類の中から選択する必要があるとのことでした、その選択画面も作りたい