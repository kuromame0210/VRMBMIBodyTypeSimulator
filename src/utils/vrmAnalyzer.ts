import * as THREE from 'three';

export interface BlendShapeInfo {
  name: string;
  index: number;
  currentValue: number;
  isUsed: boolean;
  category: 'body' | 'face' | 'emotion' | 'unknown';
  estimatedMemory: number;
}

export interface VRMAnalysisResult {
  totalBlendShapes: number;
  blendShapesByCategory: { [key: string]: BlendShapeInfo[] };
  totalMemoryUsage: number;
  recommendations: string[];
}

export class VRMAnalyzer {
  /**
   * VRMファイルのブレンドシェイプを分析
   */
  static analyzeVRMBlendShapes(vrm: any): VRMAnalysisResult {
    const blendShapes: BlendShapeInfo[] = [];
    let totalMemoryUsage = 0;

    // VRMのすべてのメッシュを走査
    vrm.scene.traverse((object: any) => {
      if (object.isSkinnedMesh && object.morphTargetDictionary) {
        const dictionary = object.morphTargetDictionary;
        const influences = object.morphTargetInfluences;
        
        Object.keys(dictionary).forEach(name => {
          const index = dictionary[name];
          const currentValue = influences ? influences[index] : 0;
          
          const blendShapeInfo: BlendShapeInfo = {
            name,
            index,
            currentValue,
            isUsed: currentValue > 0,
            category: this.categorizeBlendShape(name),
            estimatedMemory: this.estimateBlendShapeMemory(object.geometry, index)
          };
          
          blendShapes.push(blendShapeInfo);
          totalMemoryUsage += blendShapeInfo.estimatedMemory;
        });
      }
    });

    // カテゴリ別にグループ化
    const blendShapesByCategory: { [key: string]: BlendShapeInfo[] } = {};
    blendShapes.forEach(bs => {
      if (!blendShapesByCategory[bs.category]) {
        blendShapesByCategory[bs.category] = [];
      }
      blendShapesByCategory[bs.category].push(bs);
    });

    // 推奨事項を生成
    const recommendations = this.generateRecommendations(blendShapesByCategory, totalMemoryUsage);

    return {
      totalBlendShapes: blendShapes.length,
      blendShapesByCategory,
      totalMemoryUsage,
      recommendations
    };
  }

  /**
   * ブレンドシェイプをカテゴリに分類
   */
  private static categorizeBlendShape(name: string): 'body' | 'face' | 'emotion' | 'unknown' {
    const lowerName = name.toLowerCase();
    
    // 体型関連
    if (lowerName.includes('belly') || lowerName.includes('fat') || lowerName.includes('weight') || 
        lowerName.includes('muscle') || lowerName.includes('body') || lowerName.includes('chest') ||
        lowerName.includes('waist') || lowerName.includes('hip')) {
      return 'body';
    }
    
    // 顔の表情関連
    if (lowerName.includes('smile') || lowerName.includes('angry') || lowerName.includes('sad') ||
        lowerName.includes('happy') || lowerName.includes('surprised') || lowerName.includes('fear') ||
        lowerName.includes('disgust') || lowerName.includes('neutral')) {
      return 'emotion';
    }
    
    // 顔のパーツ関連
    if (lowerName.includes('eye') || lowerName.includes('mouth') || lowerName.includes('brow') ||
        lowerName.includes('cheek') || lowerName.includes('nose') || lowerName.includes('jaw') ||
        lowerName.includes('face') || lowerName.includes('head')) {
      return 'face';
    }
    
    return 'unknown';
  }

  /**
   * ブレンドシェイプのメモリ使用量を推定
   */
  private static estimateBlendShapeMemory(geometry: THREE.BufferGeometry, index: number): number {
    if (!geometry.morphAttributes || !geometry.morphAttributes.position) {
      return 0;
    }
    
    const morphAttribute = geometry.morphAttributes.position[index];
    if (!morphAttribute) return 0;
    
    // 頂点数 × 3 (xyz) × 4 (float32) = バイト数
    return morphAttribute.count * 3 * 4;
  }

  /**
   * 最適化推奨事項を生成
   */
  private static generateRecommendations(
    blendShapesByCategory: { [key: string]: BlendShapeInfo[] },
    totalMemoryUsage: number
  ): string[] {
    const recommendations: string[] = [];
    
    // BMIシミュレーション以外の不要なブレンドシェイプを特定
    const bodyBlendShapes = blendShapesByCategory['body'] || [];
    const emotionBlendShapes = blendShapesByCategory['emotion'] || [];
    const faceBlendShapes = blendShapesByCategory['face'] || [];
    const unknownBlendShapes = blendShapesByCategory['unknown'] || [];

    // 体型関連以外は削除候補
    if (emotionBlendShapes.length > 0) {
      recommendations.push(`感情表現用ブレンドシェイプ ${emotionBlendShapes.length}個を削除可能（メモリ節約: ${this.formatMemorySize(emotionBlendShapes.reduce((sum, bs) => sum + bs.estimatedMemory, 0))}）`);
    }
    
    if (faceBlendShapes.length > 0) {
      recommendations.push(`顔パーツ用ブレンドシェイプ ${faceBlendShapes.length}個を削除可能（メモリ節約: ${this.formatMemorySize(faceBlendShapes.reduce((sum, bs) => sum + bs.estimatedMemory, 0))}）`);
    }
    
    if (unknownBlendShapes.length > 0) {
      recommendations.push(`不明なブレンドシェイプ ${unknownBlendShapes.length}個を確認・削除検討（メモリ節約: ${this.formatMemorySize(unknownBlendShapes.reduce((sum, bs) => sum + bs.estimatedMemory, 0))}）`);
    }

    // 体型関連のブレンドシェイプで使用されていないものを特定
    const unusedBodyBlendShapes = bodyBlendShapes.filter(bs => !bs.isUsed);
    if (unusedBodyBlendShapes.length > 0) {
      recommendations.push(`未使用の体型ブレンドシェイプ ${unusedBodyBlendShapes.length}個を削除可能（メモリ節約: ${this.formatMemorySize(unusedBodyBlendShapes.reduce((sum, bs) => sum + bs.estimatedMemory, 0))}）`);
    }

    // 全体のメモリ使用量が大きい場合の警告
    if (totalMemoryUsage > 50 * 1024 * 1024) { // 50MB以上
      recommendations.push(`ブレンドシェイプの総メモリ使用量が${this.formatMemorySize(totalMemoryUsage)}と大きいため、積極的な削除を推奨`);
    }

    return recommendations;
  }

  /**
   * メモリサイズを読みやすい形式でフォーマット
   */
  private static formatMemorySize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  /**
   * 特定のブレンドシェイプを無効化
   */
  static disableBlendShapes(vrm: any, blendShapeNames: string[]): void {
    vrm.scene.traverse((object: any) => {
      if (object.isSkinnedMesh && object.morphTargetDictionary) {
        const dictionary = object.morphTargetDictionary;
        const influences = object.morphTargetInfluences;
        
        blendShapeNames.forEach(name => {
          const index = dictionary[name];
          if (index !== undefined && influences) {
            influences[index] = 0;
          }
        });
      }
    });
  }

  /**
   * BMIシミュレーションに必要なブレンドシェイプのみを特定
   */
  static identifyRequiredBlendShapes(vrm: any): string[] {
    const requiredBlendShapes: string[] = [];
    
    vrm.scene.traverse((object: any) => {
      if (object.isSkinnedMesh && object.morphTargetDictionary) {
        const dictionary = object.morphTargetDictionary;
        
        Object.keys(dictionary).forEach(name => {
          const lowerName = name.toLowerCase();
          
          // BMIシミュレーションに必要なブレンドシェイプのみを特定
          if (lowerName.includes('belly') || lowerName.includes('fat') || 
              lowerName.includes('weight') || lowerName.includes('muscle') ||
              lowerName.includes('body') || lowerName.includes('chest') ||
              lowerName.includes('waist') || lowerName.includes('hip')) {
            requiredBlendShapes.push(name);
          }
        });
      }
    });
    
    return requiredBlendShapes;
  }
}