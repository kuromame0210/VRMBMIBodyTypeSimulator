// ブレンドシェイプ関連の型定義

export interface BlendShapeConfig {
  // 目の調整
  eyes: {
    eyeSize: BlendShapeMapping;           // 目の大きさ（大きく/小さく）
    eyeShape: BlendShapeMapping;          // 目の縦横比（つり目/たれ目）
    eyeDistance: BlendShapeMapping;       // 両目の間隔（近く/遠く）
  };
  
  // 鼻の調整
  nose: {
    noseWidth: BlendShapeMapping;         // 鼻の幅（太く/細く）
    noseHeight: BlendShapeMapping;        // 鼻の高さ（高く/低く）
  };
  
  // 口の調整
  mouth: {
    mouthWidth: BlendShapeMapping;        // 口の幅（大きく/小さく）
    lipThickness: BlendShapeMapping;      // 唇の厚さ（厚く/薄く）
  };
  
  // 顔の輪郭
  face: {
    faceWidth: BlendShapeMapping;         // 顔の幅（丸顔/面長）
    chinShape: BlendShapeMapping;         // 顎の形（シャープ/丸み）
  };
}

export interface BlendShapeMapping {
  // GLBモデルのブレンドシェイプ名（複数指定可能）
  blendShapeNames: string[];
  
  // 値の変換設定
  valueMapping: {
    min: number;        // 最小値（例：-1.0）
    max: number;        // 最大値（例：1.0）
    default: number;    // デフォルト値（例：0.0）
  };
  
  // 顔特徴値からブレンドシェイプ値への変換関数タイプ
  conversionType: 'linear' | 'exponential' | 'custom';
  
  // カスタム変換関数（必要時）
  customConverter?: (faceFeatureValue: number) => number;
}

export interface BlendShapeValues {
  [blendShapeName: string]: number;
}

export interface FaceFeatureToBlendShape {
  // MediaPipeの顔特徴値（0-100）からブレンドシェイプ値への変換結果
  eyeSize: number;
  eyeShape: number;
  eyeDistance: number;
  noseWidth: number;
  noseHeight: number;
  mouthWidth: number;
  lipThickness: number;
  faceWidth: number;
  chinShape: number;
}