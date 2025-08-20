'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import BMICalculator from '../components/BMICalculator';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { calculateBMI } from '../utils/calculations';
import { useAvatarState } from '@/hooks/useAvatarState';
import PageWrapper from '@/components/PageWrapper';
import LoadingSpinner from '@/components/LoadingSpinner';
import AvatarCard from '@/components/AvatarCard';


// VRMViewer
const SimpleVRMViewer = dynamic(() => import('../components/SimpleVRMViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
        <p>🚀 VRMビューアーを読み込み中...</p>
      </div>
    </div>
  )
});

function HomeContent() {
  const { 
    isClient, 
    isInitializing, 
    selectedAvatar, 
    currentFaceFeatures,
    navigateToFaceAnalysis,
    navigateToAvatarSelect
  } = useAvatarState();
  const [userData, setUserData] = useState({
    height: 170,
    weight: 60,
    age: 30,
    gender: 'male' as 'male' | 'female',
    excessCalories: '普通'
  });
  const [currentBMI, setCurrentBMI] = useState(0);
  const [futureBMI, setFutureBMI] = useState<Array<{ period: number; weight: number; bmi: number }>>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  const [startSimulation, setStartSimulation] = useState(false);
  const [stopSimulation, setStopSimulation] = useState(false);

  const handleBMIChange = (bmi: number) => {
    setCurrentBMI(bmi);
  };

  const handleFutureBMIChange = (predictions: Array<{ period: number; weight: number; bmi: number }>) => {
    setFutureBMI(predictions);
  };

  const handleUserDataChange = (newUserData: {
    height: number;
    weight: number;
    age: number;
    gender: 'male' | 'female';
    excessCalories: string;
  }) => {
    setUserData(newUserData);
  };

  const handleAnimationStateChange = (animating: boolean) => {
    setIsAnimating(animating);
    // アニメーション停止時はリセット
    if (!animating) {
      // 少し遅延してリセット（アニメーション完了を待つ）
      setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    }
  };

  const handleSimulationStateChange = (running: boolean) => {
    setIsSimulationRunning(running);
    // 制御フラグをリセット
    setStartSimulation(false);
    setStopSimulation(false);
  };

  const handlePredictionButtonClick = () => {
    if (isSimulationRunning) {
      // console.log('🛑 未来予測を中止');
      setStopSimulation(true);
    } else if (simulationCompleted) {
      // console.log('🔄 リセット実行');
      setStopSimulation(true); // リセット処理を実行
      setSimulationCompleted(false);
    } else {
      // console.log('🔮 未来予測を開始');
      setStartSimulation(true);
    }
  };

  const handleSimulationCompletedChange = (completed: boolean) => {
    setSimulationCompleted(completed);
  };


  // アバターが変更された時にユーザーデータの性別を同期
  useEffect(() => {
    if (selectedAvatar) {
      setUserData(prev => ({ ...prev, gender: selectedAvatar.gender }));
    }
  }, [selectedAvatar]);

  useEffect(() => {
    if (selectedAvatar) {
      const bmi = calculateBMI(userData.weight, userData.height);
      setCurrentBMI(bmi);
    }
  }, [userData.weight, userData.height, selectedAvatar]);

  // デバッグ用ログ
  // console.log('📊 Page状態:', {
  //   avatarId: avatarId,
  //   selectedAvatar: selectedAvatar?.id,
  //   selectedAvatarName: selectedAvatar?.name,
  //   showWelcome: !avatarId && !selectedAvatar,
  //   searchParamsString: searchParams.toString()
  // });

  // SSR時またはクライアント初期化中の処理
  if (!isClient || isInitializing || !selectedAvatar) {
    return <LoadingSpinner message="アバター設定を確認中..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">VRM BMI体型シミュレーター</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[80vh]">
          {/* 左側: BMI計算フォーム */}
          <div className="flex justify-center">
            <BMICalculator 
              onBMIChange={handleBMIChange}
              onFutureBMIChange={handleFutureBMIChange}
              onUserDataChange={handleUserDataChange}
              onAnimationStateChange={handleAnimationStateChange}
              onPredictionButtonClick={handlePredictionButtonClick}
              isSimulationRunning={isSimulationRunning}
              simulationCompleted={simulationCompleted}
            />
          </div>
          
          {/* 右側: アバター表示エリア */}
          <div className="flex flex-col gap-4">
            {/* 右上: アバター表示 */}
            <div className="bg-white rounded-lg shadow-lg p-4 flex-1">
              <ErrorBoundary>
                <SimpleVRMViewer 
                  currentBMI={currentBMI}
                  avatarData={selectedAvatar}
                  age={userData.age}
                  height={userData.height}
                  faceFeatures={currentFaceFeatures}
                  dailySurplusCalories={userData.excessCalories === '少ない' ? -100 : userData.excessCalories === '多い' ? 100 : 0}
                  onSimulationStateChange={handleSimulationStateChange}
                  onSimulationCompletedChange={handleSimulationCompletedChange}
                  startSimulation={startSimulation}
                  stopSimulation={stopSimulation}
                />
              </ErrorBoundary>
            </div>
            
            {/* 右下: アバター詳細・変更ボタン */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">現在のアバター</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={navigateToFaceAnalysis}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                  >
                    📷 写真から作成
                  </button>
                  <button
                    onClick={navigateToAvatarSelect}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    🎭 アバター選択
                  </button>
                </div>
              </div>
              
              <AvatarCard 
                avatar={selectedAvatar} 
                isSelected={false} 
                onSelect={() => {}} 
                variant="detail" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <PageWrapper loadingMessage="メインページを読み込み中...">
      <HomeContent />
    </PageWrapper>
  );
}