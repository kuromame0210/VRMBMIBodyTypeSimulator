'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AVATAR_LIST, AvatarData, getAvatarById, getAvatarsWithFatness, getAvatarsWithFatnessByGender, getDefaultAvatar } from '../../utils/avatarConfig';
import { saveSelectedAvatar } from '../../utils/localStorage';
import ThumbnailManager from '../../components/ThumbnailManager';

function AvatarSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentAvatarId = searchParams.get('current');
  
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarData | null>(
    currentAvatarId ? getAvatarById(currentAvatarId) || getDefaultAvatar() : getDefaultAvatar()
  );
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
    // console.log('🎯 アバター選択:', avatar.name, '(ID:', avatar.id, ')');
    setSelectedAvatar(avatar);
  };

  const handleConfirm = () => {
    if (selectedAvatar) {
      // console.log('✅ アバター確定:', selectedAvatar.name, '→ メイン画面に遷移');
      // ローカルストレージに保存
      saveSelectedAvatar(selectedAvatar.id);
      router.push(`/?avatar=${selectedAvatar.id}`);
    } else {
      // console.error('❌ アバターが選択されていません');
    }
  };

  const handleCancel = () => {
    // console.log('❌ アバター選択をキャンセル → メイン画面に戻る');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">アバター選択</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowThumbnailManager(!showThumbnailManager)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showThumbnailManager 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🛠️ サムネイル管理
              </button>
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
              <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                genderFilter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              すべて ({fatnessAvatars.length}体)
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                genderFilter === 'male' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              男性 ({getAvatarsWithFatnessByGender('male').length}体)
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                genderFilter === 'female' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              女性 ({getAvatarsWithFatnessByGender('female').length}体)
            </button>
          </div>

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
              <div
                key={avatar.id}
                onClick={() => handleAvatarSelect(avatar)}
                className={`bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer border-3 ${
                  selectedAvatar?.id === avatar.id 
                    ? 'border-blue-500 ring-4 ring-blue-200 scale-105' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="p-4">
                  <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={avatar.thumbnailPath}
                      alt={avatar.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-avatar.png';
                      }}
                    />
                  </div>
                  
                  <h3 className="font-semibold text-gray-800 mb-2 text-center">
                    {avatar.name}
                  </h3>
                  <p className="text-sm text-gray-600 text-center mb-3 line-clamp-2">
                    {avatar.description}
                  </p>
                  
                  {selectedAvatar?.id === avatar.id && (
                    <div className="text-blue-600 text-sm font-medium text-center bg-blue-50 py-1 rounded">
                      ✓ 選択中
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

              {/* アクションボタン */}
              <div className="flex justify-end">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  キャンセル
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
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
        <p>読み込み中...</p>
      </div>
    </div>}>
      <AvatarSelectContent />
    </Suspense>
  );
}