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
  } catch (error) {
    console.warn('ローカルストレージへの保存に失敗:', error);
  }
};

export const getSelectedAvatar = (): string | null => {
  try {
    return localStorage.getItem(AVATAR_SELECTION_KEY);
  } catch (error) {
    console.warn('ローカルストレージからの読み込みに失敗:', error);
    return null;
  }
};

export const clearSelectedAvatar = (): void => {
  try {
    localStorage.removeItem(AVATAR_SELECTION_KEY);
  } catch (error) {
    console.warn('ローカルストレージからの削除に失敗:', error);
  }
};

export const hasSelectedAvatar = (): boolean => {
  return getSelectedAvatar() !== null;
};

// === 顔特徴データ管理 ===

export const saveFaceFeatures = (faceFeatures: SavedFaceFeatures): void => {
  try {
    localStorage.setItem(FACE_FEATURES_KEY, JSON.stringify(faceFeatures));
  } catch (error) {
    console.warn('顔特徴データの保存に失敗:', error);
  }
};

export const getFaceFeatures = (): SavedFaceFeatures | null => {
  try {
    const data = localStorage.getItem(FACE_FEATURES_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('顔特徴データの読み込みに失敗:', error);
    return null;
  }
};

export const clearFaceFeatures = (): void => {
  try {
    localStorage.removeItem(FACE_FEATURES_KEY);
  } catch (error) {
    console.warn('顔特徴データの削除に失敗:', error);
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