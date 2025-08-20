import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AvatarData, getAvatarById, getDefaultAvatar } from '@/utils/avatarConfig';
import { 
  saveSelectedAvatar, 
  getSelectedAvatar, 
  hasFaceFeatures,
  getFaceFeatures,
  SavedFaceFeatures 
} from '@/utils/localStorage';

export function useAvatarState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const avatarId = searchParams.get('avatar');
  
  const [isClient, setIsClient] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarData | null>(null);
  const [currentFaceFeatures, setCurrentFaceFeatures] = useState<SavedFaceFeatures | null>(null);

  // クライアントサイド確認
  useEffect(() => {
    setIsClient(true);
  }, []);

  // アバター状態の初期化
  useEffect(() => {
    if (!isClient) return;
    
    const initializeAvatarSelection = () => {
      // URLパラメータでアバターが指定されている場合
      if (avatarId) {
        const avatar = getAvatarById(avatarId);
        if (avatar) {
          setSelectedAvatar(avatar);
          saveSelectedAvatar(avatar.id);
          setIsInitializing(false);
          return;
        }
      }

      // ローカルストレージから既存の選択をチェック
      const savedAvatarId = getSelectedAvatar();
      if (savedAvatarId) {
        const savedAvatar = getAvatarById(savedAvatarId);
        if (savedAvatar) {
          setSelectedAvatar(savedAvatar);
          setIsInitializing(false);
          return;
        }
      }

      // 顔特徴データがある場合はデフォルトアバターを設定
      if (hasFaceFeatures()) {
        const defaultAvatar = getDefaultAvatar();
        setSelectedAvatar(defaultAvatar);
        saveSelectedAvatar(defaultAvatar.id);
        setIsInitializing(false);
        return;
      }

      // 初回アクセス - 顔解析画面にリダイレクト
      setIsInitializing(false);
      router.push('/face-analysis');
    };

    initializeAvatarSelection();
  }, [avatarId, router, isClient]);

  // 顔特徴データの読み込み
  useEffect(() => {
    if (!isClient) return;
    
    const faceData = getFaceFeatures();
    setCurrentFaceFeatures(faceData);
  }, [isClient]);

  const updateSelectedAvatar = (avatar: AvatarData) => {
    setSelectedAvatar(avatar);
    saveSelectedAvatar(avatar.id);
  };

  const navigateToFaceAnalysis = () => {
    router.push('/face-analysis');
  };

  const navigateToAvatarSelect = () => {
    router.push(`/avatar-select?current=${selectedAvatar?.id || ''}`);
  };

  const navigateToHome = (avatarId?: string) => {
    const url = avatarId ? `/?avatar=${avatarId}` : '/';
    router.push(url);
  };

  return {
    isClient,
    isInitializing,
    selectedAvatar,
    currentFaceFeatures,
    updateSelectedAvatar,
    navigateToFaceAnalysis,
    navigateToAvatarSelect,
    navigateToHome
  };
}