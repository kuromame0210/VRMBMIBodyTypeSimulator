// ====== 開発用デバッグモーダル ======
// TODO: 本番環境では削除または無効化すること
// このファイルは開発中の動作確認用です
// 削除時は以下のファイルからの import も削除してください:
// - src/components/FaceDataIndicator.tsx

'use client';

import { useState, useEffect } from 'react';
import { getLocalStorageStatus, getFaceFeatures, clearFaceFeatures, clearSelectedAvatar } from '@/utils/localStorage';

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DebugModal({ isOpen, onClose }: DebugModalProps) {
  const [storageData, setStorageData] = useState<any>(null);
  const [faceFeatures, setFaceFeatures] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      const status = getLocalStorageStatus();
      const features = getFaceFeatures();
      setStorageData(status);
      setFaceFeatures(features);
    }
  }, [isOpen]);

  const handleClearFaceData = () => {
    clearFaceFeatures();
    const updatedStatus = getLocalStorageStatus();
    setStorageData(updatedStatus);
    setFaceFeatures(null);
  };

  const handleClearAvatarData = () => {
    clearSelectedAvatar();
    const updatedStatus = getLocalStorageStatus();
    setStorageData(updatedStatus);
  };

  const handleClearAllData = () => {
    clearFaceFeatures();
    clearSelectedAvatar();
    const updatedStatus = getLocalStorageStatus();
    setStorageData(updatedStatus);
    setFaceFeatures(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">🛠️ 開発用デバッグ情報</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* ストレージ状態概要 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">📊 ストレージ状態</h3>
          <div className="bg-gray-50 p-3 rounded">
            <p><strong>データ有無:</strong> {storageData?.hasAnyData ? '✅ データあり' : '❌ データなし'}</p>
            <p><strong>表情データ:</strong> {storageData?.face.hasFaceData ? '✅ あり' : '❌ なし'}</p>
            <p><strong>アバター選択:</strong> {storageData?.avatar.hasCustomSelection ? '✅ 選択済み' : '❌ デフォルト'}</p>
            {storageData?.avatar.avatarId && (
              <p><strong>アバターID:</strong> {storageData.avatar.avatarId}</p>
            )}
          </div>
        </div>

        {/* 表情データ詳細 */}
        {faceFeatures && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">📷 表情データ詳細</h3>
            <div className="bg-blue-50 p-3 rounded text-sm">
              <p><strong>作成日時:</strong> {new Date(faceFeatures.timestamp).toLocaleString('ja-JP')}</p>
              <p><strong>BlendShape数:</strong> {Object.keys(faceFeatures.blendShapeValues).length}</p>
              <p><strong>写真データ:</strong> {faceFeatures.photoDataUrl ? '✅ あり' : '❌ なし'}</p>
              
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">BlendShape値を表示 ({Object.keys(faceFeatures.blendShapeValues).length}個)</summary>
                <div className="mt-2 bg-white p-2 rounded border text-xs max-h-60 overflow-y-auto">
                  {Object.entries(faceFeatures.blendShapeValues)
                    .sort(([,a], [,b]) => Math.abs(b as number) - Math.abs(a as number)) // 値の大きさで降順ソート
                    .map(([key, value]) => {
                      const numValue = value as number;
                      const processedValue = Math.abs(numValue) <= 1 ? Math.abs(numValue) : Math.max(0, Math.min(1, (numValue + 1) / 2));
                      const finalValue = Math.min(1, processedValue * 1.5);
                      const isSignificant = Math.abs(numValue) > 0.1;
                      
                      return (
                        <div key={key} className={`flex justify-between text-xs ${isSignificant ? 'font-medium text-blue-700' : 'text-gray-500'}`}>
                          <span className="truncate mr-2">{key}:</span>
                          <span className="text-right">
                            原値{numValue.toFixed(3)} → 最終{finalValue.toFixed(3)}
                            {isSignificant && ' 🎯'}
                          </span>
                        </div>
                      );
                    })}
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  🎯 = 有意な値 (&gt;0.1) / 青字 = 影響度大
                </div>
              </details>
            </div>
          </div>
        )}

        {/* データクリアボタン */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">🗑️ データクリア</h3>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleClearFaceData}
              disabled={!storageData?.face.hasFaceData}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              表情データクリア
            </button>
            <button
              onClick={handleClearAvatarData}
              disabled={!storageData?.avatar.hasCustomSelection}
              className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              アバター選択クリア
            </button>
            <button
              onClick={handleClearAllData}
              disabled={!storageData?.hasAnyData}
              className="px-3 py-1 bg-red-700 text-white text-sm rounded hover:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              全データクリア
            </button>
          </div>
        </div>

        {/* ローストレージ生データ */}
        <details className="mb-4">
          <summary className="text-lg font-semibold cursor-pointer">🔍 生データ (JSON)</summary>
          <div className="mt-2 bg-gray-100 p-3 rounded text-xs">
            <pre className="whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify({ storageData, faceFeatures }, null, 2)}
            </pre>
          </div>
        </details>

        <div className="text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}