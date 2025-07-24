'use client';

import { useState, useEffect, useRef } from 'react';
import { calculateBMI, calculateFutureWeight, getPeriodLabel } from '../utils/calculations';

interface FuturePredictionAnimatorProps {
  userData: {
    height: number;
    weight: number;
    age: number;
    gender: 'male' | 'female';
    excessCalories: '少ない' | '普通' | '多い';
  };
  excessCaloriesValue: number;
  onBMIChange: (bmi: number) => void;
  onAnimationStateChange: (isAnimating: boolean) => void;
}

interface PredictionFrame {
  period: string;
  days: number;
  weight: number;
  bmi: number;
  accumulatedKcal: number;
  fatnessValue: number;
}

export default function FuturePredictionAnimator({ 
  userData, 
  excessCaloriesValue, 
  onBMIChange,
  onAnimationStateChange 
}: FuturePredictionAnimatorProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward'>('forward');
  const [currentFrame, setCurrentFrame] = useState<PredictionFrame | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // アニメーションフレームデータを生成
  const generateFrames = (): PredictionFrame[] => {
    const periods = [
      { days: 30, period: '1ヶ月後' },
      { days: 365, period: '1年後' },
      { days: 1095, period: '3年後' },
      { days: 1825, period: '5年後' },
      { days: 3650, period: '10年後' }
    ];

    return periods.map(({ days, period }) => {
      const futureWeight = calculateFutureWeight(userData.weight, excessCaloriesValue, days);
      const futureBMI = calculateBMI(futureWeight, userData.height);
      const accumulatedKcal = excessCaloriesValue * days;
      
      // 期間に応じたお腹の膨らみ度合いを段階的に設定
      let fatnessValue = 0;
      if (days === 30) {
        // 1ヶ月後: 20%
        fatnessValue = 0.2;
      } else if (days === 365) {
        // 1年後: 40%
        fatnessValue = 0.4;
      } else if (days === 1095) {
        // 3年後: 60%
        fatnessValue = 0.6;
      } else if (days === 1825) {
        // 5年後: 80%
        fatnessValue = 0.8;
      } else if (days === 3650) {
        // 10年後: 100%
        fatnessValue = 1.0;
      }

      return {
        period,
        days,
        weight: futureWeight,
        bmi: futureBMI,
        accumulatedKcal,
        fatnessValue
      };
    });
  };

  const startAnimation = () => {
    if (isAnimating) {
      // アニメーション中の場合は何もしない
      return;
    }
    
    if (currentFrame) {
      // 現在フレームがある場合は「元に戻る」処理
      setAnimationDirection('backward');
      setFrameIndex(4); // 最後のフレームから開始
    } else {
      // 新規アニメーション開始
      setAnimationDirection('forward');
      setFrameIndex(0);
    }
    
    setIsAnimating(true);
    onAnimationStateChange(true);
  };

  const stopAnimation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsAnimating(false);
    onAnimationStateChange(false);
  };

  const resetToOriginal = () => {
    setCurrentFrame(null);
    setFrameIndex(0);
    onBMIChange(calculateBMI(userData.weight, userData.height));
    
    // お腹の大きさを一気にリセット（0%に戻す）
    // この関数が呼ばれた時、親コンポーネントでfatnessValue=0のアニメーションが実行される
  };

  // アニメーションループ
  useEffect(() => {
    if (!isAnimating) return;

    const frames = generateFrames();
    
    intervalRef.current = setInterval(() => {
      if (animationDirection === 'forward') {
        if (frameIndex < frames.length) {
          const frame = frames[frameIndex];
          setCurrentFrame(frame);
          onBMIChange(frame.bmi);
          setFrameIndex(prev => prev + 1);
        } else {
          // アニメーション完了
          stopAnimation();
        }
      } else {
        // 逆方向（元に戻る）
        if (frameIndex > 0) {
          const frame = frames[frameIndex - 1];
          setCurrentFrame(frame);
          onBMIChange(frame.bmi);
          setFrameIndex(prev => prev - 1);
        } else {
          // 元の状態に戻る（完全リセット）
          resetToOriginal();
          stopAnimation();
          setAnimationDirection('forward');
          setFrameIndex(0);
        }
      }
    }, 3000); // 3秒間隔

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAnimating, frameIndex, animationDirection, userData, excessCaloriesValue]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, []);

  const getButtonText = () => {
    if (isAnimating) {
      return animationDirection === 'forward' ? '予測中...' : '元に戻り中...';
    }
    return currentFrame ? '元に戻る' : '未来を予測する';
  };

  const getButtonColor = () => {
    if (isAnimating) {
      return 'bg-yellow-500 hover:bg-yellow-600';
    }
    return currentFrame ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600';
  };

  return (
    <div className="w-full">
      <button
        onClick={startAnimation}
        disabled={isAnimating}
        className={`w-full py-3 text-white rounded-md transition-colors font-medium mb-4 ${getButtonColor()} ${
          isAnimating ? 'cursor-wait' : 'cursor-pointer'
        }`}
      >
        {getButtonText()}
      </button>

      {currentFrame && (
        <div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm">
          <div>
            <p className="font-semibold">{currentFrame.period}</p>
            <p className="text-yellow-300">BMI: {currentFrame.bmi.toFixed(1)}</p>
          </div>
        </div>
      )}

      {isAnimating && (
        <div className="text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span>
              {animationDirection === 'forward' 
                ? `未来予測アニメーション中... (${frameIndex + 1}/5)` 
                : `元に戻り中... (${5 - frameIndex}/5)`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}