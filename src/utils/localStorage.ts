// ローカルストレージでアバター選択状態を管理

const AVATAR_SELECTION_KEY = 'vrm-bmi-simulator-selected-avatar';

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