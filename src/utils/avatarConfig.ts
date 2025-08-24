export interface AvatarData {
  id: string;
  name: string;
  gender: 'male' | 'female';
  vrmPath: string;
  thumbnailPath: string;
  description: string;
  blendShapeNames: {
    belly?: string;
    weight?: string;
    fat?: string;
    fatness?: string;
  };
}

export const AVATAR_LIST: AvatarData[] = [
  // 女性アバター (3体) - 新モデル
  {
    id: 'f_0',
    name: '女性A',
    gender: 'female',
    vrmPath: '/vrm-models/f_0.glb',
    thumbnailPath: '/vrm-models/thumbnails/f_0.png',
    description: '女性アバターA（顔特徴・アニメーション対応）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'f_1',
    name: '女性B',
    gender: 'female',
    vrmPath: '/vrm-models/f_1.glb',
    thumbnailPath: '/vrm-models/thumbnails/f_1.png',
    description: '女性アバターB（顔特徴・アニメーション対応）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'f_2',
    name: '女性C',
    gender: 'female',
    vrmPath: '/vrm-models/f_2.glb',
    thumbnailPath: '/vrm-models/thumbnails/f_2.png',
    description: '女性アバターC（顔特徴・アニメーション対応）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // 男性アバター (3体) - 新モデル
  {
    id: 'm_0',
    name: '男性A',
    gender: 'male',
    vrmPath: '/vrm-models/m_0.glb',
    thumbnailPath: '/vrm-models/thumbnails/m_0.png',
    description: '男性アバターA（顔特徴・アニメーション対応）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'm_1',
    name: '男性B',
    gender: 'male',
    vrmPath: '/vrm-models/m_1.glb',
    thumbnailPath: '/vrm-models/thumbnails/m_1.png',
    description: '男性アバターB（顔特徴・アニメーション対応）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'm_2',
    name: '男性C',
    gender: 'male',
    vrmPath: '/vrm-models/m_2.glb',
    thumbnailPath: '/vrm-models/thumbnails/m_2.png',
    description: '男性アバターC（顔特徴・アニメーション対応）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  }
];

export const getAvatarById = (id: string): AvatarData | undefined => {
  return AVATAR_LIST.find(avatar => avatar.id === id);
};

export const getAvatarsByGender = (gender: 'male' | 'female'): AvatarData[] => {
  return AVATAR_LIST.filter(avatar => avatar.gender === gender);
};

// fatnessブレンドシェイプを持つアバターのみを取得
export const getAvatarsWithFatness = (): AvatarData[] => {
  return AVATAR_LIST.filter(avatar => 
    avatar.blendShapeNames.fatness || 
    avatar.blendShapeNames.fat ||
    avatar.blendShapeNames.belly ||
    avatar.blendShapeNames.weight
  );
};

// 性別でフィルタしたfatnessブレンドシェイプ付きアバターを取得
export const getAvatarsWithFatnessByGender = (gender: 'male' | 'female'): AvatarData[] => {
  return getAvatarsWithFatness().filter(avatar => avatar.gender === gender);
};

// デフォルトアバター（最初のアバターを使用）
export const getDefaultAvatar = (): AvatarData => {
  return AVATAR_LIST[0];
};