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
    thumbnailPath: '/vrm-models/thumbnails/female_01.png',
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
    thumbnailPath: '/vrm-models/thumbnails/female_02.png',
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
    thumbnailPath: '/vrm-models/thumbnails/female_01.png',
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
    thumbnailPath: '/vrm-models/thumbnails/male_01.png',
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
    thumbnailPath: '/vrm-models/thumbnails/male_02.png',
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
    thumbnailPath: '/vrm-models/thumbnails/male_03.png',
    description: '男性アバターC（顔特徴・アニメーション対応）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // 小児肥満予測用アバター - 女性（f0）
  {
    id: 'child_f_0_06',
    name: 'アバターA（6歳）',
    gender: 'female',
    vrmPath: '/vrm-models/childAvator/f0/f_0_06.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターA（6歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_f_0_11',
    name: 'アバターA（11歳）',
    gender: 'female',
    vrmPath: '/vrm-models/childAvator/f0/f_0_11.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターA（11歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_f_0_14',
    name: 'アバターA（14歳）',
    gender: 'female',
    vrmPath: '/vrm-models/childAvator/f0/f_0_14.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターA（14歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // 小児肥満予測用アバター - 女性（f1）
  {
    id: 'child_f_1_06',
    name: 'アバターB（6歳）',
    gender: 'female',
    vrmPath: '/vrm-models/childAvator/f1/f_1_06.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターB（6歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_f_1_11',
    name: 'アバターB（11歳）',
    gender: 'female',
    vrmPath: '/vrm-models/childAvator/f1/f_1_11.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターB（11歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_f_1_14',
    name: 'アバターB（14歳）',
    gender: 'female',
    vrmPath: '/vrm-models/childAvator/f1/f_1_14.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターB（14歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // 小児肥満予測用アバター - 女性（f2）
  {
    id: 'child_f_2_06',
    name: 'アバターC（6歳）',
    gender: 'female',
    vrmPath: '/vrm-models/childAvator/f2/f_2_06.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターC（6歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_f_2_11',
    name: 'アバターC（11歳）',
    gender: 'female',
    vrmPath: '/vrm-models/childAvator/f2/f_2_11.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターC（11歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_f_2_14',
    name: 'アバターC（14歳）',
    gender: 'female',
    vrmPath: '/vrm-models/childAvator/f2/f_2_14.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターC（14歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // 小児肥満予測用アバター - 男性（m0）
  {
    id: 'child_m_0_06',
    name: 'アバターA（6歳）',
    gender: 'male',
    vrmPath: '/vrm-models/childAvator/m0/m_0_06.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターA（6歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_m_0_11',
    name: 'アバターA（11歳）',
    gender: 'male',
    vrmPath: '/vrm-models/childAvator/m0/m_0_11.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターA（11歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_m_0_14',
    name: 'アバターA（14歳）',
    gender: 'male',
    vrmPath: '/vrm-models/childAvator/m0/m_0_14.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターA（14歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // 小児肥満予測用アバター - 男性（m1）
  {
    id: 'child_m_1_06',
    name: 'アバターB（6歳）',
    gender: 'male',
    vrmPath: '/vrm-models/childAvator/m1/m_1_06.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターB（6歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_m_1_11',
    name: 'アバターB（11歳）',
    gender: 'male',
    vrmPath: '/vrm-models/childAvator/m1/m_1_11.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターB（11歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_m_1_14',
    name: 'アバターB（14歳）',
    gender: 'male',
    vrmPath: '/vrm-models/childAvator/m1/m_1_14.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターB（14歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // 小児肥満予測用アバター - 男性（m2）
  {
    id: 'child_m_2_06',
    name: 'アバターC（6歳）',
    gender: 'male',
    vrmPath: '/vrm-models/childAvator/m2/m_2_06.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターC（6歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_m_2_11',
    name: 'アバターC（11歳）',
    gender: 'male',
    vrmPath: '/vrm-models/childAvator/m2/m_2_11.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターC（11歳・小児肥満予測用）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  {
    id: 'child_m_2_14',
    name: 'アバターC（14歳）',
    gender: 'male',
    vrmPath: '/vrm-models/childAvator/m2/m_2_14.glb',
    thumbnailPath: '/placeholder-avatar.png',
    description: 'アバターC（14歳・小児肥満予測用）',
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

// 大人用アバターのみを取得（子供用アバターを除外）
export const getAdultAvatars = (): AvatarData[] => {
  return AVATAR_LIST.filter(avatar => !avatar.id.startsWith('child_'));
};

// 大人用アバターで性別フィルタ
export const getAdultAvatarsByGender = (gender: 'male' | 'female'): AvatarData[] => {
  return getAdultAvatars().filter(avatar => avatar.gender === gender);
};