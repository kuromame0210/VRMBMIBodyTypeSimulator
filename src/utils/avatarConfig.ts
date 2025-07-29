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
  // 男性アバター (3体)
  {
    id: 'm_0_22',
    name: '男性タイプA',
    gender: 'male',
    vrmPath: '/vrm-models/m_0_22.vrm',
    thumbnailPath: '/vrm-models/thumbnails/m_0_22.png',
    description: 'スタンダードな男性アバター',
    blendShapeNames: {
      belly: 'Belly',
      weight: 'Weight'
    }
  },
  {
    id: 'm_1_22',
    name: '男性タイプB',
    gender: 'male',
    vrmPath: '/vrm-models/m_1_22.vrm',
    thumbnailPath: '/vrm-models/thumbnails/m_1_22.png',
    description: 'アスリート系男性アバター',
    blendShapeNames: {
      belly: 'belly',
      fat: 'Fat'
    }
  },
  {
    id: 'm_2_22',
    name: '男性タイプC',
    gender: 'male',
    vrmPath: '/vrm-models/m_2_22.vrm',
    thumbnailPath: '/vrm-models/thumbnails/m_2_22.png',
    description: 'ビジネス系男性アバター',
    blendShapeNames: {
      belly: 'Belly'
    }
  },
  // 女性アバター (9体)
  {
    id: 'f_0_17',
    name: '女性タイプA (スリム)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_17.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_0_17.png',
    description: 'スリムな女性アバター (BMI17相当)',
    blendShapeNames: {
      belly: 'Belly',
      weight: 'Weight'
    }
  },
  {
    id: 'f_0_18',
    name: '女性タイプA (細め)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_18.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_0_18.png',
    description: '細めの女性アバター (BMI18相当)',
    blendShapeNames: {
      belly: 'Belly',
      weight: 'Weight'
    }
  },
  {
    id: 'f_0_19',
    name: '女性タイプA (標準-)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_19.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_0_19.png',
    description: '標準より細めの女性アバター (BMI19相当)',
    blendShapeNames: {
      belly: 'Belly',
      weight: 'Weight'
    }
  },
  {
    id: 'f_0_20',
    name: '女性タイプA (標準)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_20.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_0_20.png',
    description: '標準的な女性アバター (BMI20相当)',
    blendShapeNames: {
      belly: 'Belly',
      weight: 'Weight'
    }
  },
  {
    id: 'f_0_22',
    name: '女性タイプA (理想)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_22.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_0_22.png',
    description: '理想的な女性アバター (BMI22相当)',
    blendShapeNames: {
      belly: 'Belly',
      weight: 'Weight'
    }
  },
  {
    id: 'f_0_25',
    name: '女性タイプA (ふっくら)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_25.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_0_25.png',
    description: 'ふっくらした女性アバター (BMI25相当)',
    blendShapeNames: {
      belly: 'Belly',
      weight: 'Weight'
    }
  },
  {
    id: 'f_1_22',
    name: '女性タイプB',
    gender: 'female',
    vrmPath: '/vrm-models/f_1_22.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_1_22.png',
    description: 'カジュアル系女性アバター',
    blendShapeNames: {
      belly: 'belly'
    }
  },
  {
    id: 'f_1_25',
    name: '女性タイプB (ふっくら)',
    gender: 'female',
    vrmPath: '/vrm-models/f_1_25.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_1_25.png',
    description: 'ふっくらしたカジュアル系女性アバター',
    blendShapeNames: {
      belly: 'belly',
      fat: 'Fat'
    }
  },
  {
    id: 'f_2_22',
    name: '女性タイプC',
    gender: 'female',
    vrmPath: '/vrm-models/f_2_22.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_2_22.png',
    description: 'エレガント系女性アバター',
    blendShapeNames: {
      belly: 'Belly',
      fat: 'Fat'
    }
  },
  // fatnessブレンドシェイプテスト用
  {
    id: 'f_0_17_fatness',
    name: '女性タイプA (Fatnessテスト)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_17_fatness.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_0_17.png',
    description: 'Fatnessブレンドシェイプ付きテストアバター',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // 新しいfatness VRMファイル
  {
    id: 'f_0_17_temp_fatness',
    name: '女性タイプA (新Fatnessテスト)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_17.temp1738768042_1.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_0_17.png',
    description: '新しいFatnessブレンドシェイプ付きテストアバター（fatness, fatness1含む）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // fatnessのみのVRMファイル
  {
    id: 'f_0_17_temp_fatness_2',
    name: '女性タイプA (Fatnessシンプル)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_17.temp1738768042_2.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_0_17.png',
    description: 'Fatnessブレンドシェイプ単体テストアバター（fatnessのみ）',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // 最新のfatness VRMファイル
  {
    id: 'f_0_17_temp_fatness_latest',
    name: '女性タイプA (Fatness最新版)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_17.temp1738768042.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_0_17.png',
    description: '最新のFatnessブレンドシェイプテストアバター',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // Fatness V21テストファイル
  {
    id: 'f_0_17_temp_fatness_v21',
    name: '女性タイプA (Fatness V21)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_17.temp1738768042_21.vrm',
    thumbnailPath: '/vrm-models/thumbnails/f_0_17.png',
    description: 'Fatness V21ブレンドシェイプテストアバター',
    blendShapeNames: {
      fatness: 'fatness'
    }
  },
  // 新しいGLBファイル（アニメーション対応）
  {
    id: 'f_0_17_glb_anim',
    name: '女性タイプA (GLB + アニメーション)',
    gender: 'female',
    vrmPath: '/vrm-models/f_0_17.20250729.glb',
    thumbnailPath: '/vrm-models/thumbnails/f_0_17.png',
    description: 'GLB形式 + Mixamoアニメーション対応アバター（fatnessブレンドシェイプ付き）',
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

// デフォルトアバター（fatnessテストキャラクター）
export const getDefaultAvatar = (): AvatarData => {
  return getAvatarById('f_0_17_glb_anim') || getAvatarById('f_0_17_temp_fatness_v21') || getAvatarById('f_0_17_temp_fatness_latest') || getAvatarById('f_0_17_temp_fatness_2') || getAvatarById('f_0_17_temp_fatness') || getAvatarById('f_0_17_fatness') || AVATAR_LIST[0];
};