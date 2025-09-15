import { FaceFeatures } from '../types/face';
import { BlendShapeConfig, BlendShapeValues, FaceFeatureToBlendShape, BlendShapeMapping } from '../types/blendshape';

/**
 * 顔特徴値をブレンドシェイプ値に変換するクラス（WSL準拠・完全移植版）
 */
export class BlendShapeConverter {
  private config: BlendShapeConfig;

  constructor(config: BlendShapeConfig) {
    this.config = config;
  }

  /**
   * MediaPipeの顔特徴データをブレンドシェイプ値に変換（WSL準拠）
   */
  convertFaceFeaturesToBlendShapes(faceFeatures: FaceFeatures): BlendShapeValues {
    const converted = this.extractFaceFeatureValues(faceFeatures);
    const blendShapeValues: BlendShapeValues = {};

    // WSL準拠: 各特徴をブレンドシェイプ値に変換（詳細な設定適用）
    this.applyBlendShapeMapping(this.config.eyes.eyeSize, converted.eyeSize, blendShapeValues);
    this.applyBlendShapeMapping(this.config.eyes.eyeShape, converted.eyeShape, blendShapeValues);
    this.applyBlendShapeMapping(this.config.eyes.eyeDistance, converted.eyeDistance, blendShapeValues);
    
    this.applyBlendShapeMapping(this.config.nose.noseWidth, converted.noseWidth, blendShapeValues);
    this.applyBlendShapeMapping(this.config.nose.noseHeight, converted.noseHeight, blendShapeValues);
    
    this.applyBlendShapeMapping(this.config.mouth.mouthWidth, converted.mouthWidth, blendShapeValues);
    this.applyBlendShapeMapping(this.config.mouth.lipThickness, converted.lipThickness, blendShapeValues);
    
    this.applyBlendShapeMapping(this.config.face.faceWidth, converted.faceWidth, blendShapeValues);
    this.applyBlendShapeMapping(this.config.face.chinShape, converted.chinShape, blendShapeValues);

    return blendShapeValues;
  }

  /**
   * 顔特徴データから個別の特徴値を抽出（WSL準拠・詳細計算版）
   */
  private extractFaceFeatureValues(faceFeatures: FaceFeatures): FaceFeatureToBlendShape {
    return {
      // WSL準拠: 目の調整値（詳細な面積・形状計算）
      eyeSize: this.calculateEyeSize(faceFeatures),
      eyeShape: this.calculateEyeShape(faceFeatures),
      eyeDistance: this.normalizeEyeDistance(faceFeatures.eyeDistance),

      // WSL準拠: 鼻の調整値（正規化済み値を使用）
      noseWidth: this.normalizeNoseWidth(faceFeatures.noseWidth),
      noseHeight: this.normalizeNoseHeight(faceFeatures.noseHeight),

      // WSL準拠: 口の調整値（詳細な比率計算）
      mouthWidth: this.normalizeMouthWidth(faceFeatures.mouthWidth),
      lipThickness: this.calculateLipThickness(faceFeatures),

      // WSL準拠: 顔の輪郭調整値（アスペクト比・角度ベース）
      faceWidth: this.normalizeFaceWidth(faceFeatures.faceWidth),
      chinShape: this.calculateChinShape(faceFeatures)
    };
  }

  /**
   * WSL準拠: 目のサイズを計算（面積ベース・正規化済み）
   */
  private calculateEyeSize(features: FaceFeatures): number {
    // WSL仕様: 左目と右目の平均面積を計算し、標準値との比較
    const leftEyeArea = features.leftEyeWidth * features.leftEyeHeight;
    const rightEyeArea = features.rightEyeWidth * features.rightEyeHeight;
    const averageArea = (leftEyeArea + rightEyeArea) / 2;
    
    // WSL基準値: 0.001を標準として正規化（0-100スケール）
    const normalizedSize = (averageArea / 0.001) * 50; // 50が標準値
    return Math.max(0, Math.min(100, normalizedSize));
  }

  /**
   * WSL準拠: 目の形状を計算（角度ベース・つり目/たれ目）
   */
  private calculateEyeShape(features: FaceFeatures): number {
    // WSL仕様: 角度を0-100スケールに変換（50が標準、0がたれ目、100がつり目）
    const angleNormalized = (features.eyeAngle + 15) / 30; // -15°～+15°を0-1に正規化
    return Math.max(0, Math.min(100, angleNormalized * 100));
  }

  /**
   * WSL準拠: 目の間隔を正規化
   */
  private normalizeEyeDistance(eyeDistance: number): number {
    // WSL基準値: 0.3を標準として正規化
    const normalized = (eyeDistance / 0.3) * 50;
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * WSL準拠: 鼻の幅を正規化
   */
  private normalizeNoseWidth(noseWidth: number): number {
    // WSL基準値: 0.18を標準として正規化
    const normalized = (noseWidth / 0.18) * 50;
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * WSL準拠: 鼻の高さを正規化
   */
  private normalizeNoseHeight(noseHeight: number): number {
    // WSL基準値: 0.15を標準として正規化
    const normalized = (noseHeight / 0.15) * 50;
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * WSL準拠: 口の幅を正規化
   */
  private normalizeMouthWidth(mouthWidth: number): number {
    // WSL基準値: 0.375を標準として正規化
    const normalized = (mouthWidth / 0.375) * 50;
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * WSL準拠: 顔の幅（アスペクト比）を正規化
   */
  private normalizeFaceWidth(faceWidth: number): number {
    // WSL基準値: 1.3を標準として正規化
    const normalized = (faceWidth / 1.3) * 50;
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * WSL準拠: 唇の厚さを計算（正規化済み）
   */
  private calculateLipThickness(features: FaceFeatures): number {
    // WSL基準値: 0.02を標準として正規化
    const normalized = (features.lipThickness / 0.02) * 50;
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * WSL準拠: 顎の形状を計算（角度ベース・シャープ/丸み）
   */
  private calculateChinShape(features: FaceFeatures): number {
    // WSL仕様: jawWidthは0-1値で、0が丸、1がシャープ
    // 50を標準として0-100スケールに変換
    const sharpness = features.jawWidth * 100;
    return Math.max(0, Math.min(100, sharpness));
  }

  /**
   * ブレンドシェイプマッピングを適用
   */
  private applyBlendShapeMapping(
    mapping: BlendShapeMapping,
    featureValue: number,
    output: BlendShapeValues
  ): void {
    const convertedValue = this.convertValue(featureValue, mapping);
    
    mapping.blendShapeNames.forEach((shapeName: string) => {
      output[shapeName] = convertedValue;
    });
  }

  /**
   * WSL準拠: 値変換（0-100 → ブレンドシェイプ範囲）
   */
  private convertValue(value: number, mapping: BlendShapeMapping): number {
    const { min, max, default: defaultValue } = mapping.valueMapping;
    
    switch (mapping.conversionType) {
      case 'linear':
        return this.linearConversion(value, min, max, defaultValue);
      
      case 'exponential':
        return this.exponentialConversion(value, min, max, defaultValue);
      
      case 'sigmoid':
        return this.sigmoidConversion(value, min, max, defaultValue);
      
      case 'custom':
        return mapping.customConverter ? mapping.customConverter(value) : defaultValue;
      
      default:
        return this.linearConversion(value, min, max, defaultValue);
    }
  }

  /**
   * WSL準拠: 線形変換（改良版）
   */
  private linearConversion(value: number, min: number, max: number, defaultValue: number): number {
    // WSL仕様: 0-100を基準値50として、min-max範囲に変換（境界値保護付き）
    const normalized = Math.max(-1, Math.min(1, (value - 50) / 50)); // -1 to 1
    const result = defaultValue + normalized * (max - min) / 2;
    return Math.max(min, Math.min(max, result)); // 範囲保護
  }

  /**
   * WSL準拠: 指数変換（より自然な変化・改良版）
   */
  private exponentialConversion(value: number, min: number, max: number, defaultValue: number): number {
    const normalized = Math.max(-1, Math.min(1, (value - 50) / 50)); // -1 to 1
    const exponential = Math.sign(normalized) * Math.pow(Math.abs(normalized), 1.2); // WSL値: 1.2で自然な変化
    const result = defaultValue + exponential * (max - min) / 2;
    return Math.max(min, Math.min(max, result)); // 範囲保護
  }

  /**
   * WSL準拠: シグモイド変換（滑らかな変化）
   */
  private sigmoidConversion(value: number, min: number, max: number, defaultValue: number): number {
    // WSL新機能: シグモイド関数で滑らかな変化を実現
    const normalized = (value - 50) / 50; // -1 to 1
    const sigmoidValue = 2 / (1 + Math.exp(-4 * normalized)) - 1; // シグモイド変換
    const result = defaultValue + sigmoidValue * (max - min) / 2;
    return Math.max(min, Math.min(max, result)); // 範囲保護
  }
}

/**
 * デフォルトのブレンドシェイプ設定を生成
 */
export function createDefaultBlendShapeConfig(): BlendShapeConfig {
  const defaultMapping = {
    blendShapeNames: [],
    valueMapping: {
      min: -1.0,
      max: 1.0,
      default: 0.0
    },
    conversionType: 'linear' as const
  };

  return {
    eyes: {
      eyeSize: { 
        ...defaultMapping, 
        blendShapeNames: ['EyeSize_Large', 'EyeSize_Small']
      },
      eyeShape: { 
        ...defaultMapping, 
        blendShapeNames: ['Eye_Upward', 'Eye_Downward'] 
      },
      eyeDistance: { 
        ...defaultMapping, 
        blendShapeNames: ['EyeDistance_Close', 'EyeDistance_Wide'] 
      }
    },
    nose: {
      noseWidth: { 
        ...defaultMapping, 
        blendShapeNames: ['Nose_Wide', 'Nose_Narrow'] 
      },
      noseHeight: { 
        ...defaultMapping, 
        blendShapeNames: ['Nose_High', 'Nose_Low'] 
      }
    },
    mouth: {
      mouthWidth: { 
        ...defaultMapping, 
        blendShapeNames: ['Mouth_Wide', 'Mouth_Narrow'] 
      },
      lipThickness: { 
        ...defaultMapping, 
        blendShapeNames: ['Lip_Thick', 'Lip_Thin'] 
      }
    },
    face: {
      faceWidth: { 
        ...defaultMapping, 
        blendShapeNames: ['Face_Round', 'Face_Long'] 
      },
      chinShape: { 
        ...defaultMapping, 
        blendShapeNames: ['Chin_Sharp', 'Chin_Round'] 
      }
    }
  };
}