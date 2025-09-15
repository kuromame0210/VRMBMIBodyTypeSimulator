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
import FaceDataIndicator from '@/components/FaceDataIndicator';


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
    muscleMass: 45,
    age: 30,
    gender: 'male' as 'male' | 'female',
    excessCalories: '普通'
  });
  const [currentBMI, setCurrentBMI] = useState(0);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  const [startSimulation, setStartSimulation] = useState(false);
  const [stopSimulation, setStopSimulation] = useState(false);
  const [resetSimulation, setResetSimulation] = useState(false);
  const [showRiskPopup, setShowRiskPopup] = useState(false);
  const [riskPercentage, setRiskPercentage] = useState(0);

  const handleBMIChange = (bmi: number) => {
    setCurrentBMI(bmi);
  };

  const handleFutureBMIChange = (predictions: Array<{ period: number; weight: number; bmi: number }>) => {
    // 未来予測データを受け取る（現在は表示のみのため保存不要）
  };

  const handleUserDataChange = (newUserData: {
    height: number;
    weight: number;
    muscleMass: number;
    age: number;
    gender: 'male' | 'female';
    excessCalories: string;
  }) => {
    setUserData(newUserData);
  };

  const handleRiskPopupChange = (show: boolean, percentage: number) => {
    setShowRiskPopup(show);
    setRiskPercentage(percentage);
  };

  const handleAnimationStateChange = (animating: boolean) => {
    // アニメーション状態の変更を受け取る（現在は処理不要）
  };

  const handleSimulationStateChange = (running: boolean) => {
    setIsSimulationRunning(running);
    // 制御フラグをリセット
    setStartSimulation(false);
    setStopSimulation(false);
    setResetSimulation(false);
  };

  const handlePredictionButtonClick = () => {
    if (isSimulationRunning) {
      setStopSimulation(true);
    } else if (simulationCompleted) {
      setResetSimulation(true); // 手動リセット専用フラグ
      setSimulationCompleted(false);
    } else {
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
  //   avatarId: avatarId,
  //   selectedAvatar: selectedAvatar?.id,
  //   selectedAvatarName: selectedAvatar?.name,
  //   showWelcome: !avatarId && !selectedAvatar,
  //   searchParamsString: searchParams.toString()
  // });

  // SSR時またはクライアント初期化中の処理
  if (!isClient || isInitializing) {
    return <LoadingSpinner message="アバター設定を確認中..." />;
  }

  // アバターが未選択の場合（リダイレクト処理中）
  if (!selectedAvatar) {
    return <LoadingSpinner message="アバター選択画面に移動中..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-black">健康相談エージェント・デジタルツイン</h1>
          <FaceDataIndicator />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 h-[80vh]">
          {/* 左側: BMI計算フォーム */}
          <div className="flex justify-center items-start">
            <div className="w-full max-w-md">
              <BMICalculator 
                onBMIChange={handleBMIChange}
                onFutureBMIChange={handleFutureBMIChange}
                onUserDataChange={handleUserDataChange}
                onAnimationStateChange={handleAnimationStateChange}
                onPredictionButtonClick={handlePredictionButtonClick}
                onRiskPopupChange={handleRiskPopupChange}
                isSimulationRunning={isSimulationRunning}
                simulationCompleted={simulationCompleted}
              />
            </div>
          </div>
          
          {/* 右側: アバター表示エリア */}
          <div className="flex flex-col gap-4">
            {/* 右上: アバター表示 */}
            <div className="bg-white rounded-lg shadow-lg p-2 lg:p-4 flex-1">
              <ErrorBoundary>
                <SimpleVRMViewer 
                  currentBMI={currentBMI}
                  avatarData={selectedAvatar}
                  age={userData.age}
                  height={userData.height}
                  faceFeatures={currentFaceFeatures || undefined}
                  dailySurplusCalories={userData.excessCalories === '少ない' ? -100 : userData.excessCalories === '多い' ? 100 : 0}
                  onSimulationStateChange={handleSimulationStateChange}
                  onSimulationCompletedChange={handleSimulationCompletedChange}
                  startSimulation={startSimulation}
                  stopSimulation={stopSimulation}
                  resetSimulation={resetSimulation}
                  showRiskPopup={showRiskPopup}
                  riskPercentage={riskPercentage}
                />
              </ErrorBoundary>
            </div>
            
            {/* 右下: アバター詳細・変更ボタン */}
            <div className="bg-white rounded-lg shadow-lg p-3 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h2 className="text-lg lg:text-xl font-bold text-black">現在のアバター</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={navigateToFaceAnalysis}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs lg:text-sm"
                  >
                    📷 写真から作成
                  </button>
                  <button
                    onClick={navigateToAvatarSelect}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs lg:text-sm"
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