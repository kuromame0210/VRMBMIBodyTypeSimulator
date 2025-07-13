import * as THREE from 'three';

export interface DeformationOptions {
  bellyScale: number;      // お腹の膨らみ (0-2)
  chestScale: number;      // 胸の膨らみ (0-2)
  waistScale: number;      // ウエストの細さ (0.5-1.5)
  overallScale: number;    // 全体的な体格 (0.8-1.3)
  muscleDefinition: number; // 筋肉の定義 (0-1)
}

export class DynamicMeshDeformer {
  private originalVertices: Map<string, Float32Array> = new Map();
  private boundingBoxCache: Map<string, THREE.Box3> = new Map();

  /**
   * メッシュの元の頂点データを保存
   */
  saveOriginalVertices(mesh: THREE.SkinnedMesh): void {
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    
    // 元の頂点データをコピーして保存
    const originalPositions = new Float32Array(positions.array.length);
    originalPositions.set(positions.array);
    
    this.originalVertices.set(mesh.uuid, originalPositions);
    
    // バウンディングボックスを計算・保存
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      this.boundingBoxCache.set(mesh.uuid, geometry.boundingBox.clone());
    }
  }

  /**
   * BMI値から変形パラメータを自動計算
   */
  calculateDeformationFromBMI(bmi: number): DeformationOptions {
    // BMI値を正規化
    const normalizedBMI = Math.max(15, Math.min(40, bmi)); // 15-40の範囲に制限
    
    let bellyScale, chestScale, waistScale, overallScale, muscleDefinition;
    
    if (normalizedBMI < 18.5) {
      // 痩せ型 - お腹周りは標準より小さく
      bellyScale = 0.85 + (normalizedBMI - 15) / 3.5 * 0.15; // 0.85-1.0
      chestScale = 1.0;
      waistScale = 1.0;
      overallScale = 1.0;
      muscleDefinition = 0.8;
    } else if (normalizedBMI <= 25) {
      // 標準体型 - お腹周りの変化を重視
      const t = (normalizedBMI - 18.5) / 6.5; // 0-1の範囲
      bellyScale = 1.0 + t * 0.5; // 1.0-1.5（より大きな変化）
      chestScale = 1.0;
      waistScale = 1.0;
      overallScale = 1.0;
      muscleDefinition = 0.7;
    } else if (normalizedBMI <= 30) {
      // 肥満1度 - お腹周りを集中的に
      const t = (normalizedBMI - 25) / 5; // 0-1の範囲
      bellyScale = 1.5 + t * 0.8; // 1.5-2.3（大幅な変化）
      chestScale = 1.0;
      waistScale = 1.0;
      overallScale = 1.0;
      muscleDefinition = 0.5;
    } else {
      // 肥満2度以上 - お腹周りを最大限に
      const t = Math.min(1, (normalizedBMI - 30) / 10); // 0-1の範囲
      bellyScale = 2.3 + t * 0.7; // 2.3-3.0（最大変化）
      chestScale = 1.0;
      waistScale = 1.0;
      overallScale = 1.0;
      muscleDefinition = 0.2;
    }

    return {
      bellyScale,
      chestScale,
      waistScale,
      overallScale,
      muscleDefinition
    };
  }

  /**
   * メッシュを動的に変形
   */
  deformMesh(mesh: THREE.SkinnedMesh, options: DeformationOptions): void {
    const originalVertices = this.originalVertices.get(mesh.uuid);
    const boundingBox = this.boundingBoxCache.get(mesh.uuid);
    
    if (!originalVertices || !boundingBox) {
      console.warn(`❌ ${mesh.name}: 元データが見つかりません`);
      return;
    }

    const geometry = mesh.geometry;
    const positions = geometry.attributes.position;
    
    // 元の頂点データから開始
    positions.array.set(originalVertices);
    
    // バウンディングボックスの情報を取得
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());

    // 各頂点を変形
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // 正規化座標 (-1 to 1)
      const normalizedX = (x - center.x) / (size.x * 0.5);
      const normalizedY = (y - center.y) / (size.y * 0.5);
      const normalizedZ = (z - center.z) / (size.z * 0.5);
      
      let newX = x;
      let newY = y;
      let newZ = z;
      
      // Y座標による体の部位判定
      const yRatio = (y - boundingBox.min.y) / size.y; // 0(足) to 1(頭)
      
      // お腹周りのみに集中した変形 (Y: 0.45-0.65)
      if (yRatio >= 0.45 && yRatio <= 0.65) {
        const bellyInfluence = this.smoothStep(0.45, 0.55, yRatio) * 
                              this.smoothStep(0.65, 0.55, yRatio);
        const distanceFromCenter = Math.sqrt(normalizedX * normalizedX + normalizedZ * normalizedZ);
        
        if (distanceFromCenter < 0.7) { // 中心部のみ
          // お腹の膨らみ（X-Z平面でのスケール）
          const bellyScaleAmount = (options.bellyScale - 1) * bellyInfluence;
          newX = center.x + (x - center.x) * (1 + bellyScaleAmount);
          newZ = center.z + (z - center.z) * (1 + bellyScaleAmount);
          
          // 前方への突出を強化
          if (normalizedZ > 0.1) { // 前面
            newZ += bellyScaleAmount * 0.15 * Math.max(0, 1 - distanceFromCenter);
          }
          
          // 横方向の膨らみも追加
          if (Math.abs(normalizedX) > 0.1) { // 側面
            newX += Math.sign(normalizedX) * bellyScaleAmount * 0.1 * Math.max(0, 1 - distanceFromCenter);
          }
        }
      }
      
      positions.setXYZ(i, newX, newY, newZ);
    }
    
    // ジオメトリを更新
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }

  /**
   * スムーズステップ関数 (0-1の滑らかな補間)
   */
  private smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * 変形をリセット
   */
  resetMesh(mesh: THREE.SkinnedMesh): void {
    const originalVertices = this.originalVertices.get(mesh.uuid);
    if (!originalVertices) return;
    
    const positions = mesh.geometry.attributes.position;
    positions.array.set(originalVertices);
    positions.needsUpdate = true;
    
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
  }

  /**
   * メモリクリーンアップ
   */
  cleanup(): void {
    this.originalVertices.clear();
    this.boundingBoxCache.clear();
  }

  /**
   * デバッグ情報出力
   */
  debugInfo(mesh: THREE.SkinnedMesh): void {
    const originalVertices = this.originalVertices.get(mesh.uuid);
    const boundingBox = this.boundingBoxCache.get(mesh.uuid);
    
    console.log(`🔍 ${mesh.name} デバッグ情報:`, {
      hasOriginalData: !!originalVertices,
      vertexCount: mesh.geometry.attributes.position.count,
      boundingBox: boundingBox?.min.toArray(),
      boundingBoxMax: boundingBox?.max.toArray()
    });
  }
}