'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AVATAR_LIST, AvatarData, getAvatarById, getDefaultAvatar } from '../utils/avatarConfig';
import BMICalculator from '../components/BMICalculator';
import WelcomeScreen from '../components/WelcomeScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { calculateBMI } from '../utils/calculations';

const VRMViewer = dynamic(() => import('../components/VRMViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
        <p>🎛️ 改良版VRMビューアーを読み込み中...</p>
      </div>
    </div>
  )
});

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const avatarId = searchParams.get('avatar');
  
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarData>(() => {
    console.log('🔧 初期アバター設定 - avatarId:', avatarId);
    if (avatarId) {
      const avatar = getAvatarById(avatarId);
      if (avatar) {
        console.log('✅ 初期アバター見つかりました:', avatar.name);
        return avatar;
      } else {
        console.log('❌ 初期アバターが見つかりません、デフォルトを使用');
      }
    }
    return getDefaultAvatar();
  });
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

  const handleOpenAvatarSelect = () => {
    router.push(`/avatar-select?current=${selectedAvatar.id}`);
  };

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


  useEffect(() => {
    const bmi = calculateBMI(userData.weight, userData.height);
    setCurrentBMI(bmi);
  }, [userData.weight, userData.height]);

  useEffect(() => {
    if (avatarId) {
      const avatar = getAvatarById(avatarId);
      if (avatar) {
        console.log('🔄 アバター更新:', avatar.name, '(ID:', avatar.id, ')');
        setSelectedAvatar(avatar);
        setUserData(prev => ({ ...prev, gender: avatar.gender }));
      } else {
        console.log('❌ 指定されたアバターが見つかりません:', avatarId);
      }
    }
  }, [avatarId]);

  // デバッグ用ログ
  console.log('📊 Page状態:', {
    avatarId: avatarId,
    selectedAvatar: selectedAvatar?.id,
    selectedAvatarName: selectedAvatar?.name,
    showWelcome: !avatarId && !selectedAvatar,
    searchParamsString: searchParams.toString()
  });

  // アバターが選択されていない場合はウェルカム画面を表示
  if (!avatarId && !selectedAvatar) {
    console.log('ウェルカム画面を表示中');
    return <WelcomeScreen />;
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
            />
          </div>
          
          {/* 右側: アバター表示エリア */}
          <div className="flex flex-col gap-4">
            {/* 右上: アバター表示 */}
            <div className="bg-white rounded-lg shadow-lg p-4 flex-1">
              <ErrorBoundary>
                <VRMViewer 
                  currentBMI={currentBMI}
                  futureBMI={futureBMI}
                  avatarData={selectedAvatar}
                  userData={userData}
                  onBMIChange={handleBMIChange}
                  isAnimating={isAnimating}
                />
              </ErrorBoundary>
            </div>
            
            {/* 右下: アバター詳細・変更ボタン */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">選択中のアバター</h2>
                <button
                  onClick={handleOpenAvatarSelect}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  アバターを変更
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={selectedAvatar.thumbnailPath}
                    alt={selectedAvatar.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-avatar.png';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {selectedAvatar.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">{selectedAvatar.description}</p>
                  <div className="text-xs text-gray-500">
                    性別: {selectedAvatar.gender === 'male' ? '男性' : '女性'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
        <p>読み込み中...</p>
      </div>
    </div>}>
      <HomeContent />
    </Suspense>
  );
}