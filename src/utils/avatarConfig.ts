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
  // 女性アバター (2体)
  {
    id: 'female_01',
    name: '女性A',
    gender: 'female',
    vrmPath: '/vrm-models/female_01.glb',
    thumbnailPath: '/vrm-models/thumbnails/female_01.png',
    description: '女性アバターA（体型シミュレーション対応）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'female_02',
    name: '女性B',
    gender: 'female',
    vrmPath: '/vrm-models/female_02.glb',
    thumbnailPath: '/vrm-models/thumbnails/female_02.png',
    description: '女性アバターB（体型シミュレーション対応）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // 男性アバター (3体)
  {
    id: 'male_01',
    name: '男性A',
    gender: 'male',
    vrmPath: '/vrm-models/male_01.glb',
    thumbnailPath: '/vrm-models/thumbnails/male_01.png',
    description: '男性アバターA（体型シミュレーション対応）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'male_02',
    name: '男性B',
    gender: 'male',
    vrmPath: '/vrm-models/male_02.glb',
    thumbnailPath: '/vrm-models/thumbnails/male_02.png',
    description: '男性アバターB（体型シミュレーション対応）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'male_03',
    name: '男性C',
    gender: 'male',
    vrmPath: '/vrm-models/male_03.glb',
    thumbnailPath: '/vrm-models/thumbnails/male_03.png',
    description: '男性アバターC（体型シミュレーション対応）',
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