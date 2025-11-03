'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getAvatarById } from '@/utils/avatarConfig';
import PageWrapper from '@/components/PageWrapper';
import LoadingSpinner from '@/components/LoadingSpinner';
import AvatarCard from '@/components/AvatarCard';
import ChildObesityForm from '@/components/ChildObesityForm';
import Link from 'next/link';
import { getSelectedAvatar } from '@/utils/localStorage';
import {
  predictChildObesity,
  formatProbabilityAsPercent,
  calculateTargetBMIFromProbability,
  type ObesityPredictionInput
} from '@/utils/obesity-prediction';

// SimpleVRMViewerを動的インポート（ホーム画面と同じ）
const SimpleVRMViewer = dynamic(() => import('@/components/SimpleVRMViewer'), {
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

function ChildObesityPredictionContent() {
  const [isClient, setIsClient] = useState(false);

  // シミュレーション制御用のステート
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);

  // アバター選択画面から選択されたアバターを取得
  const [selectedAvatarInfo, setSelectedAvatarInfo] = useState<{
    gender: 'male' | 'female';
    type: string;
  } | null>(null);

  const [childData, setChildData] = useState({
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

  // 予測確率の状態管理
  const [predictions, setPredictions] = useState({
    age6Probability: 0,
    age11Probability: 0,
    age14Probability: 0
  });

  // localStorageから選択されたアバターを取得し、性別とタイプを抽出
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAvatarId = getSelectedAvatar();
      if (savedAvatarId) {
        // アバターIDから性別とタイプを抽出
        // 例: "m_0" -> gender: 'male', type: '0'
        // 例: "f_1" -> gender: 'female', type: '1'
        const parts = savedAvatarId.split('_');
        if (parts.length >= 2) {
          const gender = parts[0] === 'm' ? 'male' : 'female';
          const type = parts[1];
          setSelectedAvatarInfo({ gender, type });
        }
      } else {
        // デフォルト: 女性、タイプA
        setSelectedAvatarInfo({ gender: 'female', type: '0' });
      }
    }
  }, []);

  // 性別とアバタータイプから3つのアバターIDを生成
  const getAvatarIds = () => {
    if (!selectedAvatarInfo) {
      // デフォルト
      return ['child_f_0_06', 'child_f_0_11', 'child_f_0_14'];
    }
    const prefix = selectedAvatarInfo.gender === 'male' ? 'm' : 'f';
    return [
      `child_${prefix}_${selectedAvatarInfo.type}_06`,
      `child_${prefix}_${selectedAvatarInfo.type}_11`,
      `child_${prefix}_${selectedAvatarInfo.type}_14`
    ];
  };

  const childAvatarIds = getAvatarIds();
  const childAgesMap = [6, 11, 14]; // 各アバターの年齢（歳）

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDataChange = (data: typeof childData) => {
    setChildData(data);
  };

  const handleSimulationButtonClick = () => {
    if (!isSimulationRunning) {
      // シミュレーション開始時に予測計算を実行
      calculatePredictions();
    }
    setIsSimulationRunning(!isSimulationRunning);
  };

  // 予測確率を計算
  const calculatePredictions = () => {
    if (!selectedAvatarInfo) {
      console.error('selectedAvatarInfo が未設定です');
      return;
    }

    // アバターIDから性別を判定 (f = 女性, m = 男性)
    const childGender = selectedAvatarInfo.gender === 'female' ? 'girl' : 'boy';

    // 現在の月齢を計算
    const currentMonths = childData.childAgeYears * 12 + childData.childAgeMonths;

    console.log('予測計算開始:', {
      childGender,
      currentMonths,
      childHeight: childData.childHeight,
      childWeight: childData.childWeight,
      motherAge: childData.motherAge,
    });

    // 現在の月齢を使用して予測を計算（1回の呼び出しで3つの予測を取得）
    const result = predictChildObesity({
      childHeight: childData.childHeight,
      childWeight: childData.childWeight,
      childGender,
      childMonths: currentMonths, // 現在の月齢を使用
      motherAge: childData.motherAge,
      motherHeight: childData.motherHeight,
      motherWeight: childData.motherWeight,
      birthExperience: childData.birthExperience as '初産' | '経産',
      drinkingHistory: childData.drinkingHistory as 'なし' | 'あり',
      smokingHistory: childData.smokingHistory as 'なし' | 'あり',
    });

    console.log('予測結果:', {
      age6: result.age6Probability,
      age11: result.age11Probability,
      age14: result.age14Probability,
      childBMI: result.childBMI,
      childBMIz: result.childBMIz,
    });

    setPredictions({
      age6Probability: result.age6Probability,
      age11Probability: result.age11Probability,
      age14Probability: result.age14Probability,
    });
  };

  // SSR時の処理
  if (!isClient) {
    return <LoadingSpinner message="ページを読み込み中..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="relative flex items-center justify-center gap-2 mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-black">小児肥満予測システム</h1>
          <Link
            href="/avatar-select"
            className="absolute right-0 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            アバター選択画面へ
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 h-[80vh]">
          {/* 左側: 入力フォーム */}
          <div className="flex justify-center items-start">
            <div className="w-full max-w-md">
              <ChildObesityForm
                onDataChange={handleDataChange}
                onSimulationButtonClick={handleSimulationButtonClick}
                isSimulationRunning={isSimulationRunning}
                simulationCompleted={false}
              />
            </div>
          </div>

          {/* 右側: アバター表示エリア */}
          <div className="flex flex-col gap-4">
            {!isSimulationRunning ? (
              <>
                {/* シミュレーション前: アバター説明 */}
                <div className="bg-white rounded-lg shadow-lg p-6 flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-black mb-4">成長シミュレーション</h2>
                    <p className="text-black mb-2">左のフォームでパラメータを設定してください</p>
                    <p className="text-black">「成長シミュレーション開始」ボタンを押すと</p>
                    <p className="text-black">選択したアバターの成長過程（6歳、11歳、14歳）が表示されます</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* シミュレーション中: 3体のアバターを横並びに表示 */}
                <div className="bg-white rounded-lg shadow-lg p-2 lg:p-4 flex-1">
                  <h2 className="text-lg lg:text-xl font-bold text-black mb-4 text-center">成長シミュレーション結果</h2>
                  <div className="grid grid-cols-3 gap-2" style={{ height: 'calc(100% - 3rem)' }}>
                    {childAvatarIds.map((avatarId, index) => {
                      const avatar = getAvatarById(avatarId);
                      if (!avatar) return null;

                      // 各アバターに対応する確率を取得
                      const probabilities = [
                        predictions.age6Probability,
                        predictions.age11Probability,
                        predictions.age14Probability
                      ];
                      const currentProbability = probabilities[index];

                      // 確率をfatnessシェイプキー値に変換 (0〜1の範囲)
                      // 0% → 0.0 (痩せ), 100% → 1.0 (太い)
                      const fatnessValue = currentProbability;

                      // デバッグログ
                      console.log(`アバター${index} (${childAgesMap[index]}歳):`, {
                        probability: currentProbability,
                        probabilityPercent: (currentProbability * 100).toFixed(1) + '%',
                        fatnessValue,
                        avatarId
                      });

                      return (
                        <div key={avatarId} className="flex flex-col h-full">
                          <div className="text-center mb-2">
                            <p className="text-sm font-bold text-black">{childAgesMap[index]}歳</p>
                            <p className="text-lg font-bold text-red-600">
                              {formatProbabilityAsPercent(currentProbability)}
                            </p>
                          </div>
                          <div className="flex-1 border border-gray-200 rounded overflow-hidden" style={{ minHeight: 0 }}>
                            <ErrorBoundary>
                              <SimpleVRMViewer
                                currentBMI={18}
                                muscleMass={20}
                                avatarData={avatar}
                                age={childAgesMap[index]}
                                height={childData.childHeight}
                                childMonths={childAgesMap[index] * 12}
                                isChildMode={true}
                                fatnessOverride={fatnessValue}
                              />
                            </ErrorBoundary>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 説明文章ボックス */}
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <div className="text-sm text-black">
                    説明文章
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChildObesityPredictionPage() {
  return (
    <PageWrapper loadingMessage="小児肥満予測画面を読み込み中...">
      <ChildObesityPredictionContent />
    </PageWrapper>
  );
}
