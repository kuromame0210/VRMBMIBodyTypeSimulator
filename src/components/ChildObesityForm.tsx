'use client';

import { useState, useEffect } from 'react';

interface ChildObesityFormProps {
  onDataChange: (data: {
    childAgeYears: number;
    childAgeMonths: number;
    childHeight: number;
    childWeight: number;
    childBMI: number;
    motherAge: number;
    birthExperience: string;
    motherHeight: number;
    motherWeight: number;
    motherBMI: number;
    drinkingHistory: string;
    smokingHistory: string;
    birthWeight: number;
    bmiChange18Months: number;
  }) => void;
  onSimulationButtonClick?: () => void;
  isSimulationRunning?: boolean;
  simulationCompleted?: boolean;
}

export default function ChildObesityForm({
  onDataChange,
  onSimulationButtonClick,
  isSimulationRunning = false,
  simulationCompleted = false
}: ChildObesityFormProps) {
  const [formData, setFormData] = useState({
    childAgeYears: 1,
    childAgeMonths: 6,
    childHeight: 82,      // 1歳6ヶ月の標準身長
    childWeight: 11,      // 1歳6ヶ月の標準体重
    childBMI: 0,
    motherAge: 30,
    birthExperience: '初産',
    motherHeight: 160,
    motherWeight: 55,
    motherBMI: 0,
    drinkingHistory: 'なし',
    smokingHistory: 'なし',
    birthWeight: 3.0,
    bmiChange18Months: 0
  });

  // BMI計算関数
  const calculateBMI = (weight: number, height: number): number => {
    if (height === 0) return 0;
    return weight / ((height / 100) ** 2);
  };

  // 入力変更ハンドラ - BMIを自動計算
  const handleInputChange = (field: string, value: string | number) => {
    const newFormData = {
      ...formData,
      [field]: value
    };

    // 児または母親の身長・体重が変更されたらBMIを自動計算
    if (['childHeight', 'childWeight'].includes(field)) {
      newFormData.childBMI = calculateBMI(
        field === 'childWeight' ? Number(value) : formData.childWeight,
        field === 'childHeight' ? Number(value) : formData.childHeight
      );
    }
    if (['motherHeight', 'motherWeight'].includes(field)) {
      newFormData.motherBMI = calculateBMI(
        field === 'motherWeight' ? Number(value) : formData.motherWeight,
        field === 'motherHeight' ? Number(value) : formData.motherHeight
      );
    }

    setFormData(newFormData);

    if (onDataChange) {
      onDataChange(newFormData);
    }
  };

  // データ変更時の通知
  useEffect(() => {
    if (onDataChange) {
      onDataChange(formData);
    }
  }, [formData, onDataChange]);

  return (
    <div className="w-full p-3 bg-white rounded-lg shadow-lg">
      <h2 className="text-lg font-bold mb-3 text-black">小児肥満予測入力</h2>

      {/* 児の現在の年齢 */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-black mb-1">児の現在の年齢</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-black mb-0.5">年齢(歳)</label>
            <input
              type="number"
              value={formData.childAgeYears}
              onChange={(e) => handleInputChange('childAgeYears', Number(e.target.value))}
              className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              min="0"
              max="20"
            />
          </div>
          <div>
            <label className="block text-xs text-black mb-0.5">月数(0-11)</label>
            <input
              type="number"
              value={formData.childAgeMonths}
              onChange={(e) => handleInputChange('childAgeMonths', Number(e.target.value))}
              className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              min="0"
              max="11"
            />
          </div>
        </div>
      </div>

      {/* 児のBMI（身長・体重入力） */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-black mb-1">児のBMI（Z score）</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-black mb-0.5">身長(cm)</label>
            <input
              type="number"
              value={formData.childHeight}
              onChange={(e) => handleInputChange('childHeight', Number(e.target.value))}
              className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              min="50"
              max="200"
            />
          </div>
          <div>
            <label className="block text-xs text-black mb-0.5">体重(kg)</label>
            <input
              type="number"
              value={formData.childWeight}
              onChange={(e) => handleInputChange('childWeight', Number(e.target.value))}
              className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              min="5"
              max="100"
              step="0.1"
            />
          </div>
        </div>
        <div className="mt-1">
          <label className="block text-xs text-black mb-0.5">BMI</label>
          <input
            type="number"
            value={formData.childBMI > 0 ? formData.childBMI.toFixed(1) : ''}
            readOnly
            className="w-full p-1.5 text-sm bg-gray-100 border border-gray-300 rounded-md text-black placeholder-black"
            placeholder="自動計算されます"
          />
        </div>
      </div>

      {/* 出産時の母親の年齢 */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-black mb-1">出産時の母親の年齢（Z score）</label>
        <input
          type="number"
          value={formData.motherAge}
          onChange={(e) => handleInputChange('motherAge', Number(e.target.value))}
          className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
          min="15"
          max="60"
        />
      </div>

      {/* 出産経験 */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-black mb-1">出産経験</label>
        <select
          value={formData.birthExperience}
          onChange={(e) => handleInputChange('birthExperience', e.target.value)}
          className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
        >
          <option value="初産">初産</option>
          <option value="経産">経産</option>
        </select>
      </div>

      {/* 出産時の母親のBMI */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-black mb-1">出産時の母親のBMI（Z score）</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-black mb-0.5">身長(cm)</label>
            <input
              type="number"
              value={formData.motherHeight}
              onChange={(e) => handleInputChange('motherHeight', Number(e.target.value))}
              className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              min="140"
              max="200"
            />
          </div>
          <div>
            <label className="block text-xs text-black mb-0.5">体重(kg)</label>
            <input
              type="number"
              value={formData.motherWeight}
              onChange={(e) => handleInputChange('motherWeight', Number(e.target.value))}
              className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              min="30"
              max="150"
            />
          </div>
        </div>
        <div className="mt-1">
          <label className="block text-xs text-black mb-0.5">BMI</label>
          <input
            type="number"
            value={formData.motherBMI > 0 ? formData.motherBMI.toFixed(1) : ''}
            readOnly
            className="w-full p-1.5 text-sm border border-gray-300 rounded-md text-black placeholder-black"
            placeholder="自動計算されます"
          />
        </div>
      </div>

      {/* 妊娠判明時の飲酒歴 */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-black mb-1">妊娠判明時の飲酒歴</label>
        <select
          value={formData.drinkingHistory}
          onChange={(e) => handleInputChange('drinkingHistory', e.target.value)}
          className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
        >
          <option value="なし">なし</option>
          <option value="あり">あり</option>
        </select>
      </div>

      {/* 妊娠判明時の喫煙歴 */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-black mb-1">妊娠判明時の喫煙歴</label>
        <select
          value={formData.smokingHistory}
          onChange={(e) => handleInputChange('smokingHistory', e.target.value)}
          className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
        >
          <option value="なし">なし</option>
          <option value="あり">あり</option>
        </select>
      </div>

      {/* 出生時体重 */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-black mb-1">出生時体重(kg)</label>
        <input
          type="number"
          value={formData.birthWeight}
          onChange={(e) => handleInputChange('birthWeight', Number(e.target.value))}
          className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
          min="1.0"
          max="6.0"
          step="0.1"
        />
      </div>

      {/* 1歳半までのBMI変化量 */}
      <div className="mb-2">
        <label className="block text-xs font-medium text-black mb-1">1歳半までのBMI変化量</label>
        <input
          type="number"
          value={formData.bmiChange18Months}
          onChange={(e) => handleInputChange('bmiChange18Months', Number(e.target.value))}
          className="w-full p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
          step="0.1"
        />
      </div>

      {/* シミュレーションボタン */}
      <button
        onClick={() => {
          if (onSimulationButtonClick) {
            onSimulationButtonClick();
          }
        }}
        className={`w-full py-2.5 rounded-md font-medium text-sm transition-colors ${
          isSimulationRunning
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        {isSimulationRunning
          ? '⏹️ シミュレーションを隠す'
          : '🎬 成長シミュレーション開始'
        }
      </button>
    </div>
  );
}
