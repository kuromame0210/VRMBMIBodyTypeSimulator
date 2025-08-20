'use client';

import { useState } from 'react';
import { useAvatarState } from '@/hooks/useAvatarState';
import { AvatarData, getAvatarsWithFatness, getAvatarsWithFatnessByGender } from '@/utils/avatarConfig';
import ThumbnailManager from '@/components/ThumbnailManager';
import PageWrapper from '@/components/PageWrapper';
import LoadingSpinner from '@/components/LoadingSpinner';
import AvatarCard from '@/components/AvatarCard';
import GenderFilter from '@/components/GenderFilter';

function AvatarSelectContent() {
  const { 
    isClient, 
    isInitializing, 
    selectedAvatar, 
    updateSelectedAvatar, 
    navigateToHome 
  } = useAvatarState();
  
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [showThumbnailManager, setShowThumbnailManager] = useState(false);

  // fatnessブレンドシェイプ付きアバターのみ表示
  const fatnessAvatars = getAvatarsWithFatness();
  const filteredAvatars = genderFilter === 'all' 
    ? fatnessAvatars 
    : getAvatarsWithFatnessByGender(genderFilter);

  // デバッグログ
  // console.log('🎮 アバター選択画面 状態:', {
  //   currentAvatarId,
  //   selectedAvatar: selectedAvatar?.id,
  //   genderFilter,
  //   filteredAvatarsCount: filteredAvatars.length,
  //   showThumbnailManager,
  //   totalAvatars: AVATAR_LIST.length
  // });

  // 初回のみAVATAR_LISTの内容を確認
  if (AVATAR_LIST.length > 0) {
    // console.log('📋 利用可能なアバター:', AVATAR_LIST.map(a => ({ id: a.id, name: a.name, gender: a.gender })));
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
            <h1 className="text-3xl font-bold text-gray-800">アバター選択</h1>
            <div className="flex items-center space-x-4">
              {/* <button
                onClick={() => setShowThumbnailManager(!showThumbnailManager)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showThumbnailManager 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🛠️ サムネイル管理
              </button> */}
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
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
          {selectedAvatar && (
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">選択中のアバター</h2>
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
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {selectedAvatar.name}
                  </h3>
                  <p className="text-gray-600 mb-2">{selectedAvatar.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>性別: {selectedAvatar.gender === 'male' ? '男性' : '女性'}</span>
                    <span>ID: {selectedAvatar.id}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={handleConfirm}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    このアバターで体型シミュレーションを開始
                  </button>
                </div>
              </div>
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
                {selectedAvatar && (
                  <button
                    onClick={handleConfirm}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    このアバターを選択
                  </button>
                )}
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