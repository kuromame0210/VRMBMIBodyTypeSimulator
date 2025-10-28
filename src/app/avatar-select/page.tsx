'use client';

import { useState } from 'react';
import { useAvatarState } from '@/hooks/useAvatarState';
import { useRouter } from 'next/navigation';
import { AvatarData, getAdultAvatars, getAdultAvatarsByGender } from '@/utils/avatarConfig';
import ThumbnailManager from '@/components/ThumbnailManager';
import PageWrapper from '@/components/PageWrapper';
import LoadingSpinner from '@/components/LoadingSpinner';
import AvatarCard from '@/components/AvatarCard';
import GenderFilter from '@/components/GenderFilter';
import Link from 'next/link';

function AvatarSelectContent() {
  const router = useRouter();
  const { 
    isClient, 
    isInitializing, 
    selectedAvatar, 
    updateSelectedAvatar, 
    navigateToHome 
  } = useAvatarState();
  
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [showThumbnailManager, setShowThumbnailManager] = useState(false);

  // 大人用アバターのみ表示（子供用アバターを除外）
  const adultAvatars = getAdultAvatars();
  const filteredAvatars = genderFilter === 'all'
    ? adultAvatars
    : getAdultAvatarsByGender(genderFilter);

  // デバッグログ
  //   currentAvatarId,
  //   selectedAvatar: selectedAvatar?.id,
  //   genderFilter,
  //   filteredAvatarsCount: filteredAvatars.length,
  //   showThumbnailManager,
  //   totalAvatars: AVATAR_LIST.length
  // });

  // 初回のみアバターリストの内容を確認
  if (adultAvatars.length > 0) {
  }

  const handleAvatarSelect = (avatar: AvatarData) => {
    updateSelectedAvatar(avatar);
  };

  const handleConfirm = () => {
    if (selectedAvatar) {
      navigateToHome(selectedAvatar.id);
    }
  };

  const handleCancel = () => {
    navigateToHome();
  };

  // 初期化中またはクライアントサイドでない場合
  if (!isClient || isInitializing) {
    return <LoadingSpinner message="アバター設定を確認中..." />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-black">アバター選択</h1>
            <div className="flex items-center space-x-4">
              {/* <button
                onClick={() => setShowThumbnailManager(!showThumbnailManager)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showThumbnailManager 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-black hover:bg-gray-300'
                }`}
              >
                🛠️ サムネイル管理
              </button> */}
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-black hover:text-black transition-colors"
              >
                ✕ 閉じる
              </button>
            </div>
          </div>

          {/* サムネイル管理モード */}
          {showThumbnailManager && (
            <div className="mb-6">
              <ThumbnailManager />
            </div>
          )}

          {/* アバター選択UI - サムネイル管理モード以外で表示 */}
          {!showThumbnailManager && (
            <>
              {/* 性別フィルター */}
              <GenderFilter 
                currentFilter={genderFilter} 
                onFilterChange={setGenderFilter} 
              />

          {/* 選択されたアバターの詳細 */}
          {selectedAvatar ? (
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-black mb-4">選択中のアバター</h2>
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={selectedAvatar.thumbnailPath}
                    alt={selectedAvatar.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-avatar.png';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black mb-2">
                    {selectedAvatar.name}
                  </h3>
                  <p className="text-black mb-2">{selectedAvatar.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-black">
                    <span>性別: {selectedAvatar.gender === 'male' ? '男性' : '女性'}</span>
                    <span>ID: {selectedAvatar.id}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col gap-3">
                  <button
                    onClick={handleConfirm}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    このアバターで体系シミュレーションを開始
                  </button>
                  <button
                    onClick={() => {
                      if (selectedAvatar) {
                        router.push('/child-obesity-prediction');
                      }
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    小児肥満を予測する
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-lg p-6 mb-6 border border-yellow-200">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">💡 アバターを選択してください</h2>
              <p className="text-yellow-700 text-sm">
                下のアバターリストからお好みのアバターを選択すると、詳細情報と開始ボタンがここに表示されます。
              </p>
            </div>
          )}

          {/* アバターグリッド */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {filteredAvatars.map((avatar) => (
              <AvatarCard
                key={avatar.id}
                avatar={avatar}
                isSelected={selectedAvatar?.id === avatar.id}
                onSelect={handleAvatarSelect}
              />
            ))}
          </div>

              {/* アクションボタン */}
              <div className="flex justify-between">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    if (!selectedAvatar) {
                      alert('まずアバターを選択してください。');
                      return;
                    }
                    router.push('/face-analysis');
                  }}
                  className={`px-6 py-3 text-white rounded-lg transition-colors font-medium ${
                    selectedAvatar 
                      ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  📸 【写真からアバターを作る】
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AvatarSelectPage() {
  return (
    <PageWrapper loadingMessage="アバター選択画面を読み込み中...">
      <AvatarSelectContent />
    </PageWrapper>
  );
}