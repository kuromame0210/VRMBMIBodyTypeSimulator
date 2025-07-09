import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

export interface VRMBlendShapeDetail {
  name: string;
  index: number;
  currentValue: number;
  meshName: string;
  vertexCount: number;
  estimatedMemoryUsage: number;
  category: 'body' | 'face' | 'emotion' | 'unknown';
}

export interface VRMDetailedAnalysis {
  vrmPath: string;
  meshes: {
    name: string;
    blendShapeCount: number;
    blendShapes: VRMBlendShapeDetail[];
  }[];
  totalBlendShapes: number;
  totalMemoryUsage: number;
  bodyBlendShapes: VRMBlendShapeDetail[];
  faceBlendShapes: VRMBlendShapeDetail[];
  emotionBlendShapes: VRMBlendShapeDetail[];
  unknownBlendShapes: VRMBlendShapeDetail[];
}

export class VRMDebugAnalyzer {
  /**
   * VRMファイルを詳細に分析
   */
  static async analyzeVRMFile(vrmPath: string): Promise<VRMDetailedAnalysis> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      loader.load(
        vrmPath,
        (gltf) => {
          const vrm = gltf.userData.vrm;
          if (!vrm) {
            reject(new Error('VRMデータが見つかりません'));
            return;
          }

          const analysis = this.performDetailedAnalysis(vrm, vrmPath);
          resolve(analysis);
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * VRMの詳細分析を実行
   */
  static performDetailedAnalysis(vrm: any, vrmPath: string): VRMDetailedAnalysis {
    const meshes: any[] = [];
    const allBlendShapes: VRMBlendShapeDetail[] = [];
    let totalMemoryUsage = 0;

    vrm.scene.traverse((object: any) => {
      if (object.isSkinnedMesh && object.morphTargetDictionary) {
        const meshData = {
          name: object.name || 'unnamed',
          blendShapeCount: 0,
          blendShapes: [] as VRMBlendShapeDetail[]
        };

        const dictionary = object.morphTargetDictionary;
        const influences = object.morphTargetInfluences;

        Object.keys(dictionary).forEach(name => {
          const index = dictionary[name];
          const currentValue = influences ? influences[index] : 0;
          const vertexCount = this.getVertexCount(object.geometry, index);
          const estimatedMemoryUsage = vertexCount * 3 * 4; // xyz * float32

          const blendShapeDetail: VRMBlendShapeDetail = {
            name,
            index,
            currentValue,
            meshName: object.name || 'unnamed',
            vertexCount,
            estimatedMemoryUsage,
            category: this.categorizeBlendShape(name)
          };

          meshData.blendShapes.push(blendShapeDetail);
          allBlendShapes.push(blendShapeDetail);
          totalMemoryUsage += estimatedMemoryUsage;
        });

        meshData.blendShapeCount = meshData.blendShapes.length;
        meshes.push(meshData);
      }
    });

    // カテゴリ別に分類
    const bodyBlendShapes = allBlendShapes.filter(bs => bs.category === 'body');
    const faceBlendShapes = allBlendShapes.filter(bs => bs.category === 'face');
    const emotionBlendShapes = allBlendShapes.filter(bs => bs.category === 'emotion');
    const unknownBlendShapes = allBlendShapes.filter(bs => bs.category === 'unknown');

    return {
      vrmPath,
      meshes,
      totalBlendShapes: allBlendShapes.length,
      totalMemoryUsage,
      bodyBlendShapes,
      faceBlendShapes,
      emotionBlendShapes,
      unknownBlendShapes
    };
  }

  /**
   * 頂点数を取得
   */
  static getVertexCount(geometry: THREE.BufferGeometry, index: number): number {
    if (!geometry.morphAttributes || !geometry.morphAttributes.position || !geometry.morphAttributes.position[index]) {
      return 0;
    }
    return geometry.morphAttributes.position[index].count;
  }

  /**
   * ブレンドシェイプをカテゴリに分類
   */
  static categorizeBlendShape(name: string): 'body' | 'face' | 'emotion' | 'unknown' {
    const lowerName = name.toLowerCase();
    
    // 体型関連
    if (lowerName.includes('belly') || lowerName.includes('fat') || lowerName.includes('weight') || 
        lowerName.includes('muscle') || lowerName.includes('body') || lowerName.includes('chest') ||
        lowerName.includes('waist') || lowerName.includes('hip') || lowerName.includes('breast') ||
        lowerName.includes('butt') || lowerName.includes('thigh') || lowerName.includes('arm')) {
      return 'body';
    }
    
    // 感情表現関連
    if (lowerName.includes('smile') || lowerName.includes('angry') || lowerName.includes('sad') ||
        lowerName.includes('happy') || lowerName.includes('surprised') || lowerName.includes('fear') ||
        lowerName.includes('disgust') || lowerName.includes('neutral') || lowerName.includes('joy') ||
        lowerName.includes('sorrow') || lowerName.includes('fun') || lowerName.includes('angry')) {
      return 'emotion';
    }
    
    // 顔のパーツ関連
    if (lowerName.includes('eye') || lowerName.includes('mouth') || lowerName.includes('brow') ||
        lowerName.includes('cheek') || lowerName.includes('nose') || lowerName.includes('jaw') ||
        lowerName.includes('face') || lowerName.includes('head') || lowerName.includes('ear') ||
        lowerName.includes('lip') || lowerName.includes('tongue') || lowerName.includes('eyelid')) {
      return 'face';
    }
    
    return 'unknown';
  }

  /**
   * 分析結果をコンソールに出力
   */
  static printAnalysisResults(analysis: VRMDetailedAnalysis): void {
    console.log('\n🔍 VRM詳細分析結果');
    console.log('====================');
    console.log(`📁 ファイル: ${analysis.vrmPath}`);
    console.log(`🎯 総メッシュ数: ${analysis.meshes.length}`);
    console.log(`🗂️ 総ブレンドシェイプ数: ${analysis.totalBlendShapes}`);
    console.log(`💾 総メモリ使用量: ${this.formatBytes(analysis.totalMemoryUsage)}`);
    
    console.log('\n📊 カテゴリ別統計:');
    console.log(`  🏋️ 体型関連: ${analysis.bodyBlendShapes.length}個`);
    console.log(`  😊 感情表現: ${analysis.emotionBlendShapes.length}個`);
    console.log(`  👤 顔パーツ: ${analysis.faceBlendShapes.length}個`);
    console.log(`  ❓ 不明: ${analysis.unknownBlendShapes.length}個`);
    
    console.log('\n🎯 体型関連ブレンドシェイプ詳細:');
    analysis.bodyBlendShapes.forEach(bs => {
      console.log(`  - ${bs.name} (${bs.meshName})`);
      console.log(`    インデックス: ${bs.index}, 現在値: ${bs.currentValue}`);
      console.log(`    頂点数: ${bs.vertexCount}, メモリ: ${this.formatBytes(bs.estimatedMemoryUsage)}`);
    });
    
    console.log('\n🔧 メッシュ別詳細:');
    analysis.meshes.forEach(mesh => {
      console.log(`  📦 ${mesh.name}: ${mesh.blendShapeCount}個のブレンドシェイプ`);
      mesh.blendShapes.forEach(bs => {
        const icon = bs.category === 'body' ? '🏋️' : 
                    bs.category === 'emotion' ? '😊' : 
                    bs.category === 'face' ? '👤' : '❓';
        console.log(`    ${icon} ${bs.name} (${bs.index})`);
      });
    });
  }

  /**
   * バイト数を読みやすい形式に変換
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 特定のVRMファイルのブレンドシェイプ名のみを取得
   */
  static async getBlendShapeNames(vrmPath: string): Promise<string[]> {
    const analysis = await this.analyzeVRMFile(vrmPath);
    return analysis.bodyBlendShapes.map(bs => bs.name);
  }

  /**
   * BMI調整に使用可能なブレンドシェイプを推奨
   */
  static recommendBMIBlendShapes(analysis: VRMDetailedAnalysis): string[] {
    const recommendations: string[] = [];
    
    // 優先度順でブレンドシェイプを推奨
    const priorityKeywords = [
      'belly', 'fat', 'weight', 'body', 'muscle', 
      'chest', 'waist', 'hip', 'thigh', 'arm'
    ];
    
    priorityKeywords.forEach(keyword => {
      const matches = analysis.bodyBlendShapes.filter(bs => 
        bs.name.toLowerCase().includes(keyword)
      );
      matches.forEach(match => {
        if (!recommendations.includes(match.name)) {
          recommendations.push(match.name);
        }
      });
    });
    
    return recommendations;
  }
}