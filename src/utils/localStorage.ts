// ローカルストレージでアバター選択状態と顔特徴データを管理

import { FaceFeatures } from '../types/face';

const AVATAR_SELECTION_KEY = 'vrm-bmi-simulator-selected-avatar';
const FACE_FEATURES_KEY = 'vrm-bmi-simulator-face-features';

// 保存される顔特徴データの型定義
export interface SavedFaceFeatures {
  timestamp: number;
  features: FaceFeatures;
  blendShapeValues: Record<string, number>;
  photoDataUrl?: string;
}

export const saveSelectedAvatar = (avatarId: string): void => {
  try {
    localStorage.setItem(AVATAR_SELECTION_KEY, avatarId);
  } catch {
    // ローカルストレージへの保存に失敗
  }
};

export const getSelectedAvatar = (): string | null => {
  try {
    return localStorage.getItem(AVATAR_SELECTION_KEY);
  } catch {
    // ローカルストレージからの読み込みに失敗
    return null;
  }
};

export const clearSelectedAvatar = (): void => {
  try {
    localStorage.removeItem(AVATAR_SELECTION_KEY);
  } catch {
    // ローカルストレージからの削除に失敗
  }
};

export const hasSelectedAvatar = (): boolean => {
  return getSelectedAvatar() !== null;
};

// === 顔特徴データ管理 ===

export const saveFaceFeatures = (faceFeatures: SavedFaceFeatures): void => {
  try {
    localStorage.setItem(FACE_FEATURES_KEY, JSON.stringify(faceFeatures));
  } catch {
    // 顔特徴データの保存に失敗
  }
};

export const getFaceFeatures = (): SavedFaceFeatures | null => {
  try {
    const data = localStorage.getItem(FACE_FEATURES_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    // 顔特徴データの読み込みに失敗
    return null;
  }
};

export const clearFaceFeatures = (): void => {
  try {
    localStorage.removeItem(FACE_FEATURES_KEY);
  } catch {
    // 顔特徴データの削除に失敗
  }
};

export const hasFaceFeatures = (): boolean => {
  return getFaceFeatures() !== null;
};

// 便利関数: 顔特徴データの作成
export const createFaceFeatureData = (
  features: FaceFeatures, 
  blendShapeValues: Record<string, number>,
  photoDataUrl?: string
): SavedFaceFeatures => {
  return {
    timestamp: Date.now(),
    features,
    blendShapeValues,
    photoDataUrl
  };
};

// 表情情報の存在確認とステータス取得
export const getFacialExpressionStatus = () => {
  const faceFeatures = getFaceFeatures();
  return {
    hasFaceData: !!faceFeatures,
    timestamp: faceFeatures?.timestamp || null,
    lastUpdated: faceFeatures?.timestamp ? new Date(faceFeatures.timestamp).toLocaleString('ja-JP') : null
  };
};

// アバター選択情報の存在確認とステータス取得
export const getAvatarSelectionStatus = () => {
  const selectedAvatarId = getSelectedAvatar();
  return {
    hasCustomSelection: !!selectedAvatarId,
    avatarId: selectedAvatarId,
    isDefaultAvatar: !selectedAvatarId
  };
};

// 全体的なローカルストレージ状態の取得
export const getLocalStorageStatus = () => {
  const faceStatus = getFacialExpressionStatus();
  const avatarStatus = getAvatarSelectionStatus();
  
  return {
    face: faceStatus,
    avatar: avatarStatus,
    hasAnyData: faceStatus.hasFaceData || avatarStatus.hasCustomSelection
  };
};