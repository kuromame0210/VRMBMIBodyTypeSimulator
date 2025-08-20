// ====== 開発用表情データ適用切り替えボタン ======
// TODO: 本番環境では削除または無効化すること
// このファイルは開発中のデバッグ用です
// 削除時は以下のファイルからの import も削除してください:
// - src/app/page.tsx (使用箇所があれば)

'use client';

import { useState, useEffect } from 'react';
import { getFaceFeatures } from '@/utils/localStorage';

interface FaceDataToggleProps {
  onToggle: (enabled: boolean) => void;
  initialEnabled?: boolean;
}

export default function FaceDataToggle({ onToggle, initialEnabled = true }: FaceDataToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [hasFaceData, setHasFaceData] = useState(false);
  const [faceFeatures, setFaceFeatures] = useState<any>(null);

  useEffect(() => {
    // 表情データの存在確認
    const features = getFaceFeatures();
    setHasFaceData(!!features);
    setFaceFeatures(features);
  }, []);

  const handleToggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    onToggle(newState);
  };

  // 表情データがない場合は表示しない
  if (!hasFaceData) {
    return null;
  }

  // 開発環境でのみ表示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 z-10 bg-black bg-opacity-75 text-white p-3 rounded text-xs max-w-xs">
      <button
        onClick={handleToggle}
        className={`px-3 py-2 text-sm rounded border transition-colors mb-2 block ${
          isEnabled 
            ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200' 
            : 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200'
        }`}
        title={`表情データ適用を${isEnabled ? '無効' : '有効'}にする (デバッグ用)`}
      >
        {isEnabled ? '📷 ON' : '📷 OFF'} 表情データ
      </button>
      
      {/* ローカルストレージの値を表示 */}
      {faceFeatures && (
        <div className="text-xs space-y-1">
          <div className="font-bold">📊 顔特徴データ:</div>
          <div>👁️ 目の幅: {faceFeatures.features?.eyeWidth?.toFixed(4)}</div>
          <div>👃 鼻の幅: {faceFeatures.features?.noseWidth?.toFixed(4)}</div>
          <div>👄 口の幅: {faceFeatures.features?.mouthWidth?.toFixed(4)}</div>
          <div>🦴 あご: {faceFeatures.features?.jawWidth?.toFixed(4)}</div>
          <div>📐 顔の幅: {faceFeatures.features?.faceWidth?.toFixed(4)}</div>
          <div>💫 BlendShape数: {faceFeatures.blendShapeValues ? Object.keys(faceFeatures.blendShapeValues).length : 0}</div>
          
          <div className="font-bold mt-2 text-yellow-300">🎭 輪郭系BlendShape:</div>
          {faceFeatures.blendShapeValues?.Face_Round !== undefined && (
            <div>🔴 Face_Round: {faceFeatures.blendShapeValues.Face_Round.toFixed(3)}</div>
          )}
          {faceFeatures.blendShapeValues?.Face_Long !== undefined && (
            <div>⭕ Face_Long: {faceFeatures.blendShapeValues.Face_Long.toFixed(3)}</div>
          )}
          {faceFeatures.blendShapeValues?.Chin_Sharp !== undefined && (
            <div>🔸 Chin_Sharp: {faceFeatures.blendShapeValues.Chin_Sharp.toFixed(3)}</div>
          )}
          {faceFeatures.blendShapeValues?.Chin_Round !== undefined && (
            <div>🔹 Chin_Round: {faceFeatures.blendShapeValues.Chin_Round.toFixed(3)}</div>
          )}
          <div className="text-gray-300">更新: {faceFeatures.timestamp ? new Date(faceFeatures.timestamp).toLocaleString() : 'N/A'}</div>
        </div>
      )}
    </div>
  );
}