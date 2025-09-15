'use client';

import { useState, useEffect } from 'react';
import { getLocalStorageStatus } from '@/utils/localStorage';
import { getAvatarById } from '@/utils/avatarConfig';
// 開発用デバッグモーダル - 本番環境では削除すること
import DebugModal from './DebugModal';

interface LocalStorageStatus {
  face: {
    hasFaceData: boolean;
    timestamp: number | null;
    lastUpdated: string | null;
  };
  avatar: {
    hasCustomSelection: boolean;
    avatarId: string | null;
    isDefaultAvatar: boolean;
  };
  hasAnyData: boolean;
}

export default function FaceDataIndicator() {
  const [storageStatus, setStorageStatus] = useState<LocalStorageStatus | null>(null);
  // 開発用デバッグモーダル用の状態 - 本番環境では削除すること
  const [showDebugModal, setShowDebugModal] = useState(false);

  useEffect(() => {
    const status = getLocalStorageStatus();
    setStorageStatus(status);
  }, []);

  // 開発環境でのダブルクリックでデバッグモーダル表示
  const handleDoubleClick = () => {
    if (process.env.NODE_ENV === 'development') {
      setShowDebugModal(true);
    }
  };

  if (!storageStatus?.hasAnyData) {
    return null;
  }

  const indicators = [];

  // 表情データのインディケーター
  if (storageStatus.face.hasFaceData) {
    indicators.push(
      <span 
        key="face" 
        className="text-xs text-black bg-gray-50 px-2 py-1 rounded border cursor-pointer hover:bg-gray-100"
        onDoubleClick={handleDoubleClick}
        title="開発中: ダブルクリックで詳細表示"
      >
        📷 表情データあり {storageStatus.face.lastUpdated && `(${storageStatus.face.lastUpdated})`}
      </span>
    );
  }

  // アバター選択のインディケーター
  if (storageStatus.avatar.hasCustomSelection && storageStatus.avatar.avatarId) {
    const avatarInfo = getAvatarById(storageStatus.avatar.avatarId);
    indicators.push(
      <span key="avatar" className="text-xs text-black bg-blue-50 px-2 py-1 rounded border border-blue-200">
        🎭 選択アバター: {avatarInfo?.name || 'Unknown'}
      </span>
    );
  } else if (storageStatus.avatar.isDefaultAvatar) {
    indicators.push(
      <span key="default" className="text-xs text-black bg-gray-50 px-2 py-1 rounded border">
        🎭 デフォルトアバター
      </span>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {indicators}
      </div>
      
      {/* 開発用デバッグモーダル - 本番環境では削除すること */}
      {process.env.NODE_ENV === 'development' && (
        <DebugModal 
          isOpen={showDebugModal} 
          onClose={() => setShowDebugModal(false)} 
        />
      )}
    </>
  );
}