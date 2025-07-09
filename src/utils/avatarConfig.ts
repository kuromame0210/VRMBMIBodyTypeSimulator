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
  }
];

export const getAvatarById = (id: string): AvatarData | undefined => {
  return AVATAR_LIST.find(avatar => avatar.id === id);
};

export const getAvatarsByGender = (gender: 'male' | 'female'): AvatarData[] => {
  return AVATAR_LIST.filter(avatar => avatar.gender === gender);
};