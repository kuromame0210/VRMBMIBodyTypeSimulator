'use client';

import { useState, useEffect } from 'react';
import { calculateBMI, calculateBMR, calculateAllFutureBMI, getPeriodLabel, getExcessCaloriesValue } from '../utils/calculations';


interface BMICalculatorProps {
  currentBMI: number; // 外部で計算されたBMI値
  onBMIChange: (bmi: number) => void;
  onFutureBMIChange: (futureBMI: Array<{ period: number; weight: number; bmi: number }>) => void;
  onUserDataChange: (userData: {
    height: number;
    weight: number;
    muscleMass: number;
    age: number;
    gender: 'male' | 'female';
    excessCalories: string;
    excessCaloriesValue: number;
  }) => void;
  onAnimationStateChange?: (isAnimating: boolean) => void;
  onPredictionButtonClick?: () => void;
  onRiskPopupChange?: (show: boolean, percentage: number) => void;
  isSimulationRunning?: boolean;
  simulationCompleted?: boolean;
}

export default function BMICalculator({ 
  currentBMI,
  onBMIChange, 
  onFutureBMIChange, 
  onUserDataChange, 
  onAnimationStateChange,
  onPredictionButtonClick,
  onRiskPopupChange,
  isSimulationRunning = false,
  simulationCompleted = false
}: BMICalculatorProps) {
  const [userData, setUserData] = useState({
    height: 170,
    weight: 65, // 標準的な30代男性に近い値に調整
    muscleMass: 23.5, // 標準的な30代男性の骨格筋量を参考
    age: 30,
    gender: 'male' as 'male' | 'female',
    excessCalories: '普通' as '少ない' | '普通' | '多い',
    excessCaloriesValue: 0
  });

  // currentBMIはpropsから受け取るため、ローカル状態は不要
  const [currentBMR, setCurrentBMR] = useState(0);
  const [currentMMH2, setCurrentMMH2] = useState(0);
  const [futurePredictions, setFuturePredictions] = useState<Array<{ period: number; weight: number; bmi: number }>>([]);
  const [showCalculatedValues, setShowCalculatedValues] = useState(false);
  const [showRiskPopup, setShowRiskPopup] = useState(false);
  const [riskPercentage, setRiskPercentage] = useState(0);
  

  const handleCalculate = () => {
    try {
      // BMI計算は外部で実行済み、currentBMIを使用
      const mmh2 = userData.muscleMass / userData.height / userData.height / 10000;
      
      // 基礎代謝計算（指定された係数）
      const bmr = userData.gender === 'male' 
        ? 13.4 * userData.weight + 4.8 * userData.height - 5.7 * userData.age + 88
        : 9.2 * userData.weight + 3.1 * userData.height - 4.3 * userData.age + 448;
      
      setCurrentBMR(bmr);
      setCurrentMMH2(mmh2);
      setShowCalculatedValues(true);
      
      // BMI値は既に外部で計算済みなので、そのまま通知
      if (onBMIChange) {
        onBMIChange(currentBMI);
      }
    } catch {
      // 計算エラーは無視
    }
  };

  const handleFuturePrediction = () => {
    try {
      const excessCaloriesValue = userData.excessCaloriesValue;
      const predictions = calculateAllFutureBMI(userData.height, userData.weight, excessCaloriesValue);
      
      setFuturePredictions(predictions);
      if (onFutureBMIChange) {
        onFutureBMIChange(predictions);
      }
      
      // アニメーション開始をVRMViewerに通知
      if (onAnimationStateChange) {
        onAnimationStateChange(true);
      }
    } catch {
    }
  };

  const getExcessCaloriesCategory = (value: number): '少ない' | '普通' | '多い' => {
    if (value <= -100) return '少ない';
    if (value >= 100) return '多い';
    return '普通';
  };

  const handleInputChange = (field: string, value: string | number) => {
    try {
      let newUserData = {
        ...userData,
        [field]: value
      };
      
      // 余剰カロリーの値が変更された場合、カテゴリも自動更新
      if (field === 'excessCaloriesValue') {
        newUserData.excessCalories = getExcessCaloriesCategory(Number(value));
      }
      
      setUserData(newUserData);
      
      if (onUserDataChange) {
        onUserDataChange(newUserData);
      }
    } catch {
      // 入力変更エラーは無視
    }
  };

  // ユーザーデータ変更時の通知のみ（自動計算は削除）
  useEffect(() => {
    if (onUserDataChange) {
      onUserDataChange(userData);
    }
  }, [userData, onUserDataChange]);

  return (
    <div className="w-full p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-black">肥満症予測デジタルツイン</h2>
      
      <div className="mb-3">
        <label className="block text-sm font-medium text-black mb-2">性別（男・女）</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="gender"
              value="male"
              checked={userData.gender === 'male'}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="mr-2"
            />
            男性
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="gender"
              value="female"
              checked={userData.gender === 'female'}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              className="mr-2"
            />
            女性
          </label>
        </div>
      </div>

      {/* 2列レイアウト */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-black mb-2">年齢</label>
          <input
            type="number"
            value={userData.age}
            onChange={(e) => handleInputChange('age', Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
            min="1"
            max="120"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-2">身長(cm)</label>
          <input
            type="number"
            value={userData.height}
            onChange={(e) => handleInputChange('height', Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
            min="100"
            max="250"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-2">体重(kg)</label>
          <input
            type="number"
            value={userData.weight}
            onChange={(e) => handleInputChange('weight', Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
            min="20"
            max="200"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-2">BMI</label>
          <input
            type="number"
            value={showCalculatedValues ? currentBMI.toFixed(1) : ''}
            readOnly
            className="w-full p-2 border border-gray-300 rounded-md text-black placeholder-black"
            placeholder="計算されていません"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-black mb-2">筋肉量(kg)</label>
          <input
            type="number"
            value={userData.muscleMass}
            onChange={(e) => handleInputChange('muscleMass', Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
            min="10"
            max="80"
            step="0.1"
            placeholder="筋肉量を入力してください"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-2">MM/H²</label>
          <input
            type="number"
            value={showCalculatedValues ? currentMMH2.toFixed(1) : ''}
            readOnly
            className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md text-black placeholder-black"
            placeholder="計算されていません"
          />
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-black mb-2">基礎代謝(kcal)</label>
        <input
          type="number"
          value={showCalculatedValues ? currentBMR.toFixed(0) : ''}
          readOnly
          className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md text-black placeholder-black"
          placeholder="計算されていません"
        />
      </div>


      <div className="mb-3">
        <label className="block text-sm font-medium text-black mb-2">1日の余剰kcal</label>
        <div className="flex gap-4 mb-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="excessCalories"
              value="少ない"
              checked={userData.excessCalories === '少ない'}
              onChange={(e) => {
                handleInputChange('excessCaloriesValue', -100);
              }}
              className="mr-2"
            />
            少ない
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="excessCalories"
              value="普通"
              checked={userData.excessCalories === '普通'}
              onChange={(e) => {
                handleInputChange('excessCaloriesValue', 0);
              }}
              className="mr-2"
            />
            普通
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="excessCalories"
              value="多い"
              checked={userData.excessCalories === '多い'}
              onChange={(e) => {
                handleInputChange('excessCaloriesValue', 100);
              }}
              className="mr-2"
            />
            多い
          </label>
        </div>
        <input
          type="number"
          value={userData.excessCaloriesValue}
          onChange={(e) => handleInputChange('excessCaloriesValue', Number(e.target.value))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
        />
      </div>

      <button
        onClick={() => {
          if (!isSimulationRunning && !simulationCompleted) {
            // 「未来を予測する」状態の時のみ実行
            handleCalculate();
            handleFuturePrediction();
            
            // 疾患リスク計算（簡易版）
            const bmi = currentBMI; // propsから受け取ったBMI値を使用
            let risk = 0;
            if (bmi < 18.5) {
              risk = Math.floor(Math.random() * 15) + 5; // 5-20%
            } else if (bmi < 25) {
              risk = Math.floor(Math.random() * 10) + 3; // 3-12%
            } else if (bmi < 30) {
              risk = Math.floor(Math.random() * 20) + 15; // 15-35%
            } else {
              risk = Math.floor(Math.random() * 25) + 35; // 35-60%
            }
            
            // リスクポップアップをVRMViewerに表示
            if (onRiskPopupChange) {
              onRiskPopupChange(true, risk);
              
              // 2秒後に非表示
              setTimeout(() => {
                onRiskPopupChange(false, 0);
              }, 2000);
            }
          }
          
          // 常に実行（ボタン状態の制御）
          if (onPredictionButtonClick) {
            onPredictionButtonClick();
          }
        }}
        className={`w-full py-3 rounded-md font-medium mb-4 transition-colors ${
          isSimulationRunning
            ? 'bg-red-500 text-white hover:bg-red-600'
            : simulationCompleted
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        {isSimulationRunning 
          ? '⏹️ 中止する' 
          : simulationCompleted 
          ? '🔄 リセットする' 
          : '未来を予測する'
        }
      </button>

      {futurePredictions.length > 0 && (
        <div className="space-y-2 mt-2">
          {futurePredictions.map((prediction, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-base">
              <span className="w-16 text-black font-medium text-base">{getPeriodLabel(prediction.period)}</span>
              
              <div className="flex items-center gap-2">
                <span className="text-black text-base">BMI</span>
                <span className="px-3 py-2 text-base font-medium">
                  {prediction.bmi.toFixed(1)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-black text-base">余剰kcal</span>
                <span className="px-3 py-2 text-base font-medium">
                  {(userData.excessCaloriesValue * prediction.period) > 0 ? '+' : ''}{(userData.excessCaloriesValue * prediction.period).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}