# **VRM BMI体型シミュレーター アバター選択機能 追加要件整理**

## **追加要件概要**

**目的:** ユーザーが6種類のVRMアバターから好みのものを選択し、選択したアバターでBMI体型シミュレーションを実行する機能を追加します。これにより、よりパーソナライズされた体験を提供し、ユーザーエンゲージメントの向上を図ります。

**実装方針:** 既存の「左側フォーム、右側3D表示」のレイアウトを維持しつつ、アバター選択UIを統合します。段階的な実装により、既存機能への影響を最小限に抑えながら新機能を追加します。

---

## **更新されたシステム構成**

### **UI/UX設計**

**基本レイアウト（更新版）:**
- **左側：入力フォーム**
  - ① **アバター選択セクション**（新規追加）
    - 6つのアバターサムネイル表示
    - 性別フィルター機能（全て/男性/女性）
    - 選択状態の視覚的フィードバック
  - ② 身体データ入力フォーム（既存）
    - 身長・体重・年齢・性別・余剰カロリー
    - 自動計算ボタン

- **右側：VRMアバター表示エリア**
  - 選択されたアバターの3D表示
  - BMI変化に連動した体型変化
  - 3秒ごとの自動体型変化機能

### **ファイル構成（更新版）**

```
project-root/
├── public/
│   └── vrm-models/
│       ├── male/
│       │   ├── avatar-male-01.vrm      # 男性アバター1
│       │   ├── avatar-male-02.vrm      # 男性アバター2
│       │   └── avatar-male-03.vrm      # 男性アバター3
│       ├── female/
│       │   ├── avatar-female-01.vrm    # 女性アバター1
│       │   ├── avatar-female-02.vrm    # 女性アバター2
│       │   └── avatar-female-03.vrm    # 女性アバター3
│       └── thumbnails/                 # サムネイル画像
│           ├── avatar-male-01.jpg
│           ├── avatar-male-02.jpg
│           ├── avatar-male-03.jpg
│           ├── avatar-female-01.jpg
│           ├── avatar-female-02.jpg
│           └── avatar-female-03.jpg
├── src/
│   ├── components/
│   │   ├── AvatarSelector.tsx          # アバター選択UI（新規）
│   │   ├── BMICalculator.tsx           # 計算フォーム（更新）
│   │   ├── VRMViewer.tsx               # 3D表示（更新）
│   │   └── LoadingSpinner.tsx          # ローディングUI
│   ├── utils/
│   │   ├── calculations.ts             # 計算ロジック
│   │   └── avatarConfig.ts             # アバター設定（新規）
│   └── pages/
│       └── index.tsx                   # メインページ（更新）
```

---

## **技術実装の詳細**

### **1. アバター設定データ構造**

**utils/avatarConfig.ts:**
```typescript
export interface AvatarData {
  id: string;
  name: string;
  gender: 'male' | 'female';
  vrmPath: string;
  thumbnailPath: string;
  description: string;
  blendShapeNames: {
    belly?: string;
    weight?: string;
    fat?: string;
  };
}

export const AVATAR_LIST: AvatarData[] = [
  {
    id: 'male-01',
    name: '男性アバターA',
    gender: 'male',
    vrmPath: '/vrm-models/male/avatar-male-01.vrm',
    thumbnailPath: '/vrm-models/thumbnails/avatar-male-01.jpg',
    description: 'スタンダードな男性アバター',
    blendShapeNames: {
      belly: 'Belly',
      weight: 'Weight'
    }
  },
  {
    id: 'male-02',
    name: '男性アバターB',
    gender: 'male',
    vrmPath: '/vrm-models/male/avatar-male-02.vrm',
    thumbnailPath: '/vrm-models/thumbnails/avatar-male-02.jpg',
    description: 'アスリート系男性アバター',
    blendShapeNames: {
      belly: 'belly',
      fat: 'Fat'
    }
  },
  {
    id: 'male-03',
    name: '男性アバターC',
    gender: 'male',
    vrmPath: '/vrm-models/male/avatar-male-03.vrm',
    thumbnailPath: '/vrm-models/thumbnails/avatar-male-03.jpg',
    description: 'ビジネス系男性アバター',
    blendShapeNames: {
      belly: 'Belly'
    }
  },
  {
    id: 'female-01',
    name: '女性アバターA',
    gender: 'female',
    vrmPath: '/vrm-models/female/avatar-female-01.vrm',
    thumbnailPath: '/vrm-models/thumbnails/avatar-female-01.jpg',
    description: 'スタンダードな女性アバター',
    blendShapeNames: {
      belly: 'Belly',
      weight: 'Weight'
    }
  },
  {
    id: 'female-02',
    name: '女性アバターB',
    gender: 'female',
    vrmPath: '/vrm-models/female/avatar-female-02.vrm',
    thumbnailPath: '/vrm-models/thumbnails/avatar-female-02.jpg',
    description: 'カジュアル系女性アバター',
    blendShapeNames: {
      belly: 'belly'
    }
  },
  {
    id: 'female-03',
    name: '女性アバターC',
    gender: 'female',
    vrmPath: '/vrm-models/female/avatar-female-03.vrm',
    thumbnailPath: '/vrm-models/thumbnails/avatar-female-03.jpg',
    description: 'エレガント系女性アバター',
    blendShapeNames: {
      belly: 'Belly',
      fat: 'Fat'
    }
  }
];

export const getAvatarById = (id: string): AvatarData | undefined => {
  return AVATAR_LIST.find(avatar => avatar.id === id);
};

export const getAvatarsByGender = (gender: 'male' | 'female'): AvatarData[] => {
  return AVATAR_LIST.filter(avatar => avatar.gender === gender);
};
```

### **2. アバター選択コンポーネント**

**components/AvatarSelector.tsx:**
```typescript
import { useState } from 'react';
import { AvatarData } from '../utils/avatarConfig';

interface AvatarSelectorProps {
  avatars: AvatarData[];
  selectedAvatar: AvatarData | null;
  onAvatarSelect: (avatar: AvatarData) => void;
}

export default function AvatarSelector({ 
  avatars, 
  selectedAvatar, 
  onAvatarSelect 
}: AvatarSelectorProps) {
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  const filteredAvatars = genderFilter === 'all' 
    ? avatars 
    : avatars.filter(avatar => avatar.gender === genderFilter);

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">アバター選択</h3>
      
      {/* 性別フィルター */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setGenderFilter('all')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            genderFilter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          すべて
        </button>
        <button
          onClick={() => setGenderFilter('male')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            genderFilter === 'male' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          男性
        </button>
        <button
          onClick={() => setGenderFilter('female')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            genderFilter === 'female' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          女性
        </button>
      </div>

      {/* アバター選択グリッド */}
      <div className="grid grid-cols-2 gap-3">
        {filteredAvatars.map((avatar) => (
          <div
            key={avatar.id}
            onClick={() => onAvatarSelect(avatar)}
            className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-2 ${
              selectedAvatar?.id === avatar.id 
                ? 'border-blue-500 ring-2 ring-blue-200' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="p-3">
              {/* サムネイル */}
              <div className="aspect-square mb-2 bg-gray-100 rounded overflow-hidden">
                <img
                  src={avatar.thumbnailPath}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-avatar.png';
                  }}
                />
              </div>
              
              {/* アバター情報 */}
              <h4 className="text-sm font-semibold text-gray-800 mb-1">
                {avatar.name}
              </h4>
              <p className="text-xs text-gray-600 mb-2">{avatar.description}</p>
              
              {selectedAvatar?.id === avatar.id && (
                <div className="text-blue-600 text-xs font-medium">✓ 選択中</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### **3. 更新されたVRMViewer**

**components/VRMViewer.tsx（重要な更新部分）:**
```typescript
import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { AvatarData } from '../utils/avatarConfig';

interface VRMViewerProps {
  currentBMI: number;
  avatarData: AvatarData;
  userData: {
    height: number;
    weight: number;
    age: number;
    gender: 'male' | 'female';
    excessCalories: number;
  };
}

export default function VRMViewer({ currentBMI, avatarData, userData }: VRMViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // VRMの動的ロード関数
  const loadVRM = useCallback(async (avatarData: AvatarData) => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    // 既存VRMの削除とメモリ解放
    if (vrmRef.current) {
      sceneRef.current.remove(vrmRef.current.scene);
      vrmRef.current.dispose();
      vrmRef.current = null;
    }

    try {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const gltf = await loader.loadAsync(avatarData.vrmPath);
      const vrm = gltf.userData.vrm;
      
      vrmRef.current = vrm;
      sceneRef.current.add(vrm.scene);
      VRMUtils.rotateVRM0(vrm);

      // カメラ位置の自動調整
      const box = new THREE.Box3().setFromObject(vrm.scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = cameraRef.current.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      
      
      cameraRef.current.position.set(center.x, center.y + size.y / 4, cameraZ);
      cameraRef.current.lookAt(center);

    } catch (error) {
      console.error('VRM読み込みエラー:', error);
    }
  }, []);

  // BMI値に基づく体型更新（アバター固有のBlendShape対応）
  const updateBodyShape = useCallback((bmiValue: number) => {
    if (!vrmRef.current) return;

    vrmRef.current.scene.traverse((object: any) => {
      if (object.isSkinnedMesh && object.morphTargetDictionary) {
        // アバター設定に基づいてBlendShape名を特定
        const blendShapeNames = avatarData.blendShapeNames;
        let bellyIndex = undefined;

        // 優先順位に基づいてBlendShapeを検索
        if (blendShapeNames.belly && object.morphTargetDictionary[blendShapeNames.belly] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.belly];
        } else if (blendShapeNames.weight && object.morphTargetDictionary[blendShapeNames.weight] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.weight];
        } else if (blendShapeNames.fat && object.morphTargetDictionary[blendShapeNames.fat] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.fat];
        }

        if (bellyIndex !== undefined) {
          let blendValue = 0;
          
          // BMI値に基づく制御ロジック
          if (bmiValue <= 25) {
            blendValue = 0;
          } else if (bmiValue > 25 && bmiValue <= 30) {
            blendValue = ((bmiValue - 25) / 5) * 0.5;
          } else if (bmiValue > 30) {
            blendValue = Math.min(0.5 + ((bmiValue - 30) / 10) * 0.5, 1.0);
          }

          object.morphTargetInfluences[bellyIndex] = blendValue;
        }
      }
    });
  }, [avatarData]);

  // 初期化
  useEffect(() => {
    if (!mountRef.current) return;

    // Three.jsシーンの初期化
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75, 
      mountRef.current.clientWidth / mountRef.current.clientHeight, 
      0.1, 
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xf0f0f0, 1);
    mountRef.current.appendChild(renderer.domElement);

    // ライティング設定
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // レンダリングループ
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      if (vrmRef.current) {
        vrmRef.current.update(renderer.info.render.frame);
      }
      renderer.render(scene, camera);
    };
    animate();

    // リサイズ対応
    const handleResize = () => {
      if (mountRef.current && camera && renderer) {
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (vrmRef.current) {
        scene.remove(vrmRef.current.scene);
        vrmRef.current.dispose();
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // アバター変更時のVRM再ロード
  useEffect(() => {
    if (avatarData) {
      loadVRM(avatarData);
    }
  }, [avatarData, loadVRM]);

  // BMI変化時の体型更新
  useEffect(() => {
    updateBodyShape(currentBMI);
  }, [currentBMI, updateBodyShape]);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full bg-gray-100 rounded-lg overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
}
```

### **4. 更新されたメインページ**

**pages/index.tsx（重要な更新部分）:**
```typescript
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AVATAR_LIST, getAvatarById, AvatarData } from '../utils/avatarConfig';
import AvatarSelector from '../components/AvatarSelector';
import { calculateBMI, calculateBMR, calculateAllFutureBMI } from '../utils/calculations';

const VRMViewer = dynamic(() => import('../components/VRMViewer'), {
  ssr: false,
  loading: () => <div className="flex justify-center items-center h-full text-lg">3Dアバターを読み込み中...</div>
});

export default function Home() {
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarData>(AVATAR_LIST[0]);
  const [userData, setUserData] = useState({
    height: 170,
    weight: 60,
    age: 30,
    gender: 'male' as 'male' | 'female',
    excessCalories: 0
  });

  const [currentBMI, setCurrentBMI] = useState(0);
  const [currentBMR, setCurrentBMR] = useState(0);
  const [futurePredictions, setFuturePredictions] = useState<
    { period: number; weight: number; bmi: number }[]
  >([]);
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);

  // アバター選択ハンドラ
  const handleAvatarSelect = (avatar: AvatarData) => {
    setSelectedAvatar(avatar);
    // アバターの性別に応じてユーザーデータの性別も更新
    setUserData(prev => ({ ...prev, gender: avatar.gender }));
  };

  // 計算実行ハンドラ
  const handleCalculate = () => {
    const bmi = calculateBMI(userData.weight, userData.height);
    setCurrentBMI(bmi);

    const bmr = calculateBMR(userData.weight, userData.height, userData.age, userData.gender);
    setCurrentBMR(bmr);

    const predictions = calculateAllFutureBMI(userData.height, userData.weight, userData.excessCalories);
    setFuturePredictions(predictions);
    setCurrentPredictionIndex(0);
  };

  // 3秒ごとの自動体型変化
  useEffect(() => {
    if (futurePredictions.length === 0) return;

    const interval = setInterval(() => {
      setCurrentPredictionIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % futurePredictions.length;
        setCurrentBMI(futurePredictions[nextIndex].bmi);
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [futurePredictions]);

  // 初期計算
  useEffect(() => {
    handleCalculate();
  }, []);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 p-4">
      {/* 左側：入力フォーム */}
      <div className="lg:w-1/3 p-6 bg-white rounded-lg shadow-md mb-4 lg:mb-0 lg:mr-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          BMI体型シミュレーター
        </h2>

        {/* アバター選択セクション */}
        <AvatarSelector
          avatars={AVATAR_LIST}
          selectedAvatar={selectedAvatar}
          onAvatarSelect={handleAvatarSelect}
        />

        {/* 身体データ入力フォーム */}
        <div className="space-y-4">
          <div>
            <label htmlFor="height" className="block text-sm font-medium text-gray-700">
              身長 (cm):
            </label>
            <input
              type="number"
              id="height"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={userData.height}
              onChange={(e) => setUserData({ ...userData, height: Number(e.target.value) })}
            />
          </div>

          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
              体重 (kg):
            </label>
            <input
              type="number"
              id="weight"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={userData.weight}
              onChange={(e) => setUserData({ ...userData, weight: Number(e.target.value) })}
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700">
              年齢:
            </label>
            <input
              type="number"
              id="age"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={userData.age}
              onChange={(e) => setUserData({ ...userData, age: Number(e.target.value) })}
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
              性別:
            </label>
            <select
              id="gender"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={userData.gender}
              onChange={(e) => setUserData({ ...userData, gender: e.target.value as 'male' | 'female' })}
              disabled={true} // アバター選択により自動設定されるため無効化
            >
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              ※ 選択されたアバターに基づいて自動設定されます
            </p>
          </div>

          <div>
            <label htmlFor="excessCalories" className="block text-sm font-medium text-gray-700">
              余剰カロリー (kcal/日):
            </label>
            <select
              id="excessCalories"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              value={userData.excessCalories}
              onChange={(e) => setUserData({ ...userData, excessCalories: Number(e.target.value) })}
            >
              <option value={-100}>少ない (-100)</option>
              <option value={0}>普通 (0)</option>
              <option value={100}>多い (+100)</option>
            </select>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            自動計算
          </button>
        </div>

        {/* 計算結果表示 */}
        {currentBMI > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-xl font-semibold mb-3 text-blue-800">計算結果:</h3>
            <p className="text-gray-700">
              現在のBMI: <span className="font-bold text-blue-900">{currentBMI.toFixed(2)}</span>
            </p>
            <p className="text-gray-700">
              基礎代謝量 (BMR): <span className="font-bold text-blue-900">{currentBMR.toFixed(0)} kcal</span>
            </p>

            <h4 className="text-lg font-semibold mt-4 mb-2 text-blue-800">将来予測:</h4>
            {futurePredictions.length > 0 && (
              <ul className="list-disc pl-5 space-y-1">
                {futurePredictions.map((prediction, index) => (
                  <li 
                    key={index} 
                    className={index === currentPredictionIndex ? 'font-bold text-blue-900' : 'text-gray-700'}
                  >
                    {prediction.period === 30 ? '1ヶ月後' :
                     prediction.period === 365 ? '1年後' :
                     prediction.period === 1095 ? '3年後' :
                     prediction.period === 1825 ? '5年後' : '10年後'}:
                    体重 {prediction.weight.toFixed(1)} kg, BMI {prediction.bmi.toFixed(2)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* 右側：VRMアバター表示エリア */}
      <div className="lg:w-2/3 h-[500px] lg:h-auto bg-white rounded-lg shadow-md">
        <VRMViewer
          currentBMI={currentBMI}
          avatarData={selectedAvatar}
          userData={userData}
        />
      </div>
    </div>
  );
}
```

---

## **実装優先順位（更新版）**

### **Phase 1: 基本機能（1-2週間）**
1. Next.jsプロジェクト初期化
2. BMI計算フォーム実装
3. 基本的なVRM表示機能
4. 計算ロジックの実装

### **Phase 2: アバター選択機能（1-2週間）**
1. `utils/avatarConfig.ts`の作成
2. `AvatarSelector`コンポーネントの実装
3. VRMファイルとサムネイル画像の準備
4. VRMViewerの動的ロード機能実装

### **Phase 3: 統合機能（1週間）**
1. BMI計算結果とVRM連動
2. アバター固有のBlendShape制御の実装
3. 将来予測機能の追加
4. メモリ管理とパフォーマンス最適化

### **Phase 4: 仕上げ（1週間）**
1. 3秒ごとの自動変化機能
2. エラーハンドリングとローディングUI改善
3. レスポンシブデザインの調整
4. Vercelデプロイ設定

---

## **重要な実装上の注意点**

### **技術的考慮事項**

**メモリ管理:**
- VRM切り替え時の適切な`dispose()`処理
- Three.jsオブジェクトのメモリリーク対策
- アニメーションフレームの適切なクリーンアップ

**パフォーマンス最適化:**
- サムネイル画像の軽量化（推奨: 200x200px以下、JPEG形式）
- VRMファイルサイズの最適化（推奨: 5MB以下）
- 必要に応じたテクスチャ圧縮

**エラーハンドリング:**
- VRMファイル読み込み失敗時のフォールバック処理
- サムネイル画像読み込み失敗時のプレースホルダー表示
- BlendShape未対応アバターへの対応

### **BlendShape対応**

**必須要件:**
- 各VRMファイルに体型変化用のBlendShapeが設定されていること
- BlendShape名は`Belly`、`belly`、`Weight`、`Fat`のいずれかを推奨
- アバター設定ファイルで個別のBlendShape名を指定可能

**代替案:**
- BlendShapeが設定されていないアバターの場合、スケール変更による体型変化
- 複数のBlendShapeを組み合わせた体型制御

### **ユーザビリティ向上**

**視覚的フィードバック:**
- アバター選択時の明確な視覚的フィードバック
- ローディング状態の適切な表示
- エラー状態の分かりやすい通知

**操作性:**
- 性別フィルターによるアバター絞り込み機能
- アバター選択に応じた自動的な性別設定
- レスポンシブデザインによるモバイル対応

この追加要件により、ユーザーは自分好みのアバターを選択してBMIシミュレーションを楽しむことができ、より個人化された体験を提供できるようになります。実装時は段階的なアプローチを取り、既存機能に影響を与えないよう注意深く進めることが重要です。