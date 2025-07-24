'use client';

import { useState, useEffect } from 'react';
import { calculateBMI, calculateBMR, calculateAllFutureBMI, getPeriodLabel, getExcessCaloriesValue } from '../utils/calculations';

interface BMICalculatorProps {
  onBMIChange: (bmi: number) => void;
  onFutureBMIChange: (futureBMI: Array<{ period: number; weight: number; bmi: number }>) => void;
  onUserDataChange: (userData: {
    height: number;
    weight: number;
    age: number;
    gender: 'male' | 'female';
    excessCalories: string;
  }) => void;
  onAnimationStateChange?: (isAnimating: boolean) => void;
}

export default function BMICalculator({ onBMIChange, onFutureBMIChange, onUserDataChange, onAnimationStateChange }: BMICalculatorProps) {
  const [userData, setUserData] = useState({
    height: 170,
    weight: 60,
    age: 30,
    gender: 'male' as 'male' | 'female',
    excessCalories: '普通' as '少ない' | '普通' | '多い'
  });

  const [currentBMI, setCurrentBMI] = useState(0);
  const [currentBMR, setCurrentBMR] = useState(0);
  const [futurePredictions, setFuturePredictions] = useState<Array<{ period: number; weight: number; bmi: number }>>([]);

  const handleCalculate = () => {
    try {
      const bmi = calculateBMI(userData.weight, userData.height);
      const bmr = calculateBMR(userData.weight, userData.height, userData.age, userData.gender);
      
      setCurrentBMI(bmi);
      setCurrentBMR(bmr);
      
      if (onBMIChange) {
        onBMIChange(bmi);
      }
      if (onUserDataChange) {
        onUserDataChange(userData);
      }
    } catch (error) {
      console.error('BMI計算エラー:', error);
    }
  };

  const handleFuturePrediction = () => {
    try {
      const excessCaloriesValue = getExcessCaloriesValue(userData.excessCalories);
      const predictions = calculateAllFutureBMI(userData.height, userData.weight, excessCaloriesValue);
      
      setFuturePredictions(predictions);
      if (onFutureBMIChange) {
        onFutureBMIChange(predictions);
      }
      
      // アニメーション開始をVRMViewerに通知
      if (onAnimationStateChange) {
        onAnimationStateChange(true);
      }
    } catch (error) {
      console.error('未来予測計算エラー:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    try {
      const newUserData = {
        ...userData,
        [field]: value
      };
      setUserData(newUserData);
      if (onUserDataChange) {
        onUserDataChange(newUserData);
      }
    } catch (error) {
      console.error('入力変更エラー:', error);
    }
  };

  // 初期計算とユーザーデータ変更時の自動計算
  useEffect(() => {
    if (userData.height > 0 && userData.weight > 0) {
      handleCalculate();
    }
  }, [userData.height, userData.weight, userData.age, userData.gender]);

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-6 text-gray-800">BMI体型シミュレーター</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">性別（男・女）</label>
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

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">年齢</label>
        <input
          type="number"
          value={userData.age}
          onChange={(e) => handleInputChange('age', Number(e.target.value))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min="1"
          max="120"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">身長(cm)</label>
        <input
          type="number"
          value={userData.height}
          onChange={(e) => handleInputChange('height', Number(e.target.value))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min="100"
          max="250"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">体重(kg)</label>
        <input
          type="number"
          value={userData.weight}
          onChange={(e) => handleInputChange('weight', Number(e.target.value))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min="20"
          max="200"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">BMI</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={currentBMI.toFixed(1)}
            readOnly
            className="flex-1 p-2 bg-gray-100 border border-gray-300 rounded-md"
          />
          <button
            onClick={handleCalculate}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            計算
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">基礎代謝(kcal)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={currentBMR.toFixed(0)}
            readOnly
            className="flex-1 p-2 bg-gray-100 border border-gray-300 rounded-md"
          />
          <button
            onClick={handleCalculate}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            計算
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">1日の余剰kcal</label>
        <div className="flex gap-4 mb-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="excessCalories"
              value="少ない"
              checked={userData.excessCalories === '少ない'}
              onChange={(e) => handleInputChange('excessCalories', e.target.value)}
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
              onChange={(e) => handleInputChange('excessCalories', e.target.value)}
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
              onChange={(e) => handleInputChange('excessCalories', e.target.value)}
              className="mr-2"
            />
            多い
          </label>
        </div>
        <input
          type="number"
          value={getExcessCaloriesValue(userData.excessCalories)}
          readOnly
          className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md"
        />
      </div>

      <button
        onClick={handleFuturePrediction}
        className="w-full py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium mb-6"
      >
        未来を予測する
      </button>

      {futurePredictions.length > 0 && (
        <div className="space-y-3">
          {futurePredictions.map((prediction, index) => (
            <div key={index} className="flex items-center gap-4 text-sm">
              <span className="w-16 text-gray-600">{getPeriodLabel(prediction.period)}</span>
              <div className="flex gap-2">
                <span className="text-gray-600">BMI</span>
                <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {prediction.bmi.toFixed(1)}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-600">余剰kcal</span>
                <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {(getExcessCaloriesValue(userData.excessCalories) * prediction.period).toLocaleString()}kcal
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}