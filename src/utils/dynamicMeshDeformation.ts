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
   * VRM実測データに基づく体型変化テーブル（analyze-bmi-differences.jsの分析結果より）
   */
  private static readonly VRM_BODY_CHANGE_TABLE = {
    waist: [
      { bmi: 17, scale: 1.000 },
      { bmi: 18, scale: 1.048 },
      { bmi: 19, scale: 1.080 },
      { bmi: 20, scale: 1.098 },
      { bmi: 22, scale: 1.130 },
      { bmi: 25, scale: 1.180 }
    ],
    chest: [
      { bmi: 17, scale: 1.000 },
      { bmi: 18, scale: 1.045 },
      { bmi: 19, scale: 1.075 },
      { bmi: 20, scale: 1.091 },
      { bmi: 22, scale: 1.120 },
      { bmi: 25, scale: 1.160 }
    ]
  };

  /**
   * BMI値から変形パラメータを自動計算（VRM実測データベース）
   */
  calculateDeformationFromBMI(bmi: number): DeformationOptions {
    const normalizedBMI = Math.max(15, Math.min(40, bmi));
    
    // VRM実測データに基づく補間計算
    const waistScale = this.interpolateFromTable(normalizedBMI, DynamicMeshDeformer.VRM_BODY_CHANGE_TABLE.waist);
    const chestScale = this.interpolateFromTable(normalizedBMI, DynamicMeshDeformer.VRM_BODY_CHANGE_TABLE.chest);
    
    // VRM実測データの比率を保ちつつ視覚的に確認できるレベルに拡大（50-100倍）
    const bellyScale = 1.0 + (waistScale - 1.0) * 2.5; // 実測データの50倍で視覚的確認
    const actualChestScale = 1.0 + (chestScale - 1.0) * 1.5; // 胸部も明確に
    
    // 筋肉定義はBMIに反比例
    const muscleDefinition = Math.max(0.2, 1.0 - (normalizedBMI - 17) * 0.05);

    return {
      bellyScale,
      chestScale: actualChestScale,
      waistScale: 1.0,
      overallScale: 1.0,
      muscleDefinition
    };
  }

  /**
   * テーブルデータからBMI値を線形補間
   */
  private interpolateFromTable(bmi: number, table: Array<{bmi: number, scale: number}>): number {
    // BMIが範囲外の場合は端の値を返す
    if (bmi <= table[0].bmi) return table[0].scale;
    if (bmi >= table[table.length - 1].bmi) return table[table.length - 1].scale;
    
    // 線形補間
    for (let i = 0; i < table.length - 1; i++) {
      if (bmi >= table[i].bmi && bmi <= table[i + 1].bmi) {
        const t = (bmi - table[i].bmi) / (table[i + 1].bmi - table[i].bmi);
        return table[i].scale + t * (table[i + 1].scale - table[i].scale);
      }
    }
    
    return 1.0;
  }

  /**
   * メッシュを動的に変形（VRM実測データベースのマイクロ変形システム）
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

    // マイクロ変形システム: 0.01mm以下の精密な変形を実現
    // VRM実測データでは最大変化が0.0650mm、平均変化が0.0180mmのレベル
    const MICRO_DEFORMATION_PRECISION = 1000000; // マイクロメーター単位での精密度
    
    // 各頂点を変形
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // 正規化座標 (-1 to 1)
      const normalizedX = (x - center.x) / (size.x * 0.5);
      // const normalizedY = (y - center.y) / (size.y * 0.5); // 使用しないためコメントアウト
      const normalizedZ = (z - center.z) / (size.z * 0.5);
      
      let newX = x;
      const newY = y;
      let newZ = z;
      
      // Y座標による体の部位判定
      const yRatio = (y - boundingBox.min.y) / size.y; // 0(足) to 1(頭)
      
      // VRM実測データに基づく部位別変形マスキングシステム
      const bodyRegions = this.getBodyRegionInfluence(yRatio, normalizedX, normalizedZ);
      
      // ウエスト部分の変形 (Y: 0.50-0.70) - 分析で最も変化が大きい部位
      if (bodyRegions.waist > 0) {
        const waistScaleAmount = (options.bellyScale - 1) * bodyRegions.waist;
        
        // 横腹（X軸）の変形を重視 - VRM分析で幅方向が支配的
        if (Math.abs(normalizedX) > 0.1) {
          // 横腹への精密な変形（実測データの0.01mmレベル対応）
          const lateralInfluence = Math.min(1.0, Math.abs(normalizedX) * 1.2);
          newX += Math.sign(normalizedX) * waistScaleAmount * lateralInfluence * bodyRegions.waist;
        }
        
        // 前後方向（Z軸）は控えめに - 実測データでは前後変化が少ない
        if (Math.abs(normalizedZ) < 0.5) {
          const anteriorPosteriorInfluence = 0.3; // X軸の30%程度
          newZ += normalizedZ * waistScaleAmount * anteriorPosteriorInfluence * bodyRegions.waist;
        }
      }
      
      // 胸部とヒップの変形は一旦無効化（足への影響を避けるため）
      // 胸部の変形 (Y: 0.70-0.85) - 無効化
      // if (bodyRegions.chest > 0) {
      //   const chestScaleAmount = (options.chestScale - 1) * bodyRegions.chest;
      //   
      //   // 胸部は前後方向（Z軸）を重視
      //   if (normalizedZ > 0) {
      //     newZ += chestScaleAmount * normalizedZ * 0.6 * bodyRegions.chest;
      //   }
      //   
      //   // 胸部の幅方向は控えめに
      //   if (Math.abs(normalizedX) > 0.1) {
      //     newX += Math.sign(normalizedX) * chestScaleAmount * 0.4 * bodyRegions.chest;
      //   }
      // }
      
      // ヒップ部分の変形 (Y: 0.30-0.50) - 無効化
      // if (bodyRegions.hips > 0) {
      //   const hipsScaleAmount = (options.bellyScale - 1) * 0.6; // ウエストの60%程度
      //   
      //   // ヒップは幅と前後両方向に変形
      //   if (Math.abs(normalizedX) > 0.1) {
      //     newX += Math.sign(normalizedX) * hipsScaleAmount * 0.6 * bodyRegions.hips;
      //   }
      //   if (Math.abs(normalizedZ) > 0.1) {
      //     newZ += Math.sign(normalizedZ) * hipsScaleAmount * 0.4 * bodyRegions.hips;
      //   }
      // }
      
      // マイクロ変形の精密度を保つための丸め処理
      const preciseX = Math.round(newX * MICRO_DEFORMATION_PRECISION) / MICRO_DEFORMATION_PRECISION;
      const preciseY = Math.round(newY * MICRO_DEFORMATION_PRECISION) / MICRO_DEFORMATION_PRECISION;
      const preciseZ = Math.round(newZ * MICRO_DEFORMATION_PRECISION) / MICRO_DEFORMATION_PRECISION;
      
      positions.setXYZ(i, preciseX, preciseY, preciseZ);
    }
    
    // ジオメトリを更新
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }

  /**
   * VRM実測データに基づく部位別影響度計算（ウエスト中心に制限）
   */
  private getBodyRegionInfluence(yRatio: number, normalizedX: number, normalizedZ: number): {
    waist: number;
    chest: number;
    hips: number;
  } {
    const influence = {
      waist: 0,
      chest: 0,
      hips: 0
    };
    
    // ウエスト部分のみ（Y: 0.55-0.65）- より狭い範囲に制限
    if (yRatio >= 0.55 && yRatio <= 0.65) {
      const waistCenter = 0.60;
      const waistWidth = 0.05; // より狭く
      influence.waist = Math.max(0, 1 - Math.abs(yRatio - waistCenter) / waistWidth);
      
      // 中心からの距離をより厳しく制限
      const distanceFromCenter = Math.sqrt(normalizedX * normalizedX + normalizedZ * normalizedZ);
      if (distanceFromCenter > 0.4) { // より厳しく制限
        influence.waist *= Math.max(0, 1 - (distanceFromCenter - 0.4) / 0.3);
      }
    }
    
    // 胸部とヒップ部分は一旦無効化（問題を避けるため）
    // 胸部 (Y: 0.70-0.85) - 無効化
    // if (yRatio >= 0.70 && yRatio <= 0.85) {
    //   const chestCenter = 0.775;
    //   const chestWidth = 0.075;
    //   influence.chest = Math.max(0, 1 - Math.abs(yRatio - chestCenter) / chestWidth);
    // }
    
    // ヒップ部分 (Y: 0.30-0.50) - 無効化
    // if (yRatio >= 0.30 && yRatio <= 0.50) {
    //   const hipsCenter = 0.40;
    //   const hipsWidth = 0.10;
    //   influence.hips = Math.max(0, 1 - Math.abs(yRatio - hipsCenter) / hipsWidth);
    // }
    
    return influence;
  }

  /**
   * スムーズステップ関数 (0-1の滑らかな補間) - 将来的な拡張用
   */
  private smoothStep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * VRM実測データとの比較用ユーティリティ
   */
  getVRMDataComparison(bmi: number): {
    waistExpected: number;
    chestExpected: number;
    deformationAccuracy: string;
  } {
    const waistScale = this.interpolateFromTable(bmi, DynamicMeshDeformer.VRM_BODY_CHANGE_TABLE.waist);
    const chestScale = this.interpolateFromTable(bmi, DynamicMeshDeformer.VRM_BODY_CHANGE_TABLE.chest);
    
    return {
      waistExpected: (waistScale - 1) * 0.0004 * 1000, // mm単位
      chestExpected: (chestScale - 1) * 0.0004 * 1000, // mm単位
      deformationAccuracy: 'マイクロ変形（0.01mm以下）'
    };
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
   * VRM実測データとの比較用デバッグ情報出力
   */
  debugInfo(mesh: THREE.SkinnedMesh, bmi?: number): void {
    const originalVertices = this.originalVertices.get(mesh.uuid);
    const boundingBox = this.boundingBoxCache.get(mesh.uuid);
    
    console.log(`🔍 ${mesh.name} デバッグ情報 (VRM実測データベース):`, {
      hasOriginalData: !!originalVertices,
      vertexCount: mesh.geometry.attributes.position.count,
      boundingBox: boundingBox?.min.toArray(),
      boundingBoxMax: boundingBox?.max.toArray(),
      currentBMI: bmi || 'Unknown',
      deformationScale: bmi ? this.calculateDeformationFromBMI(bmi) : 'N/A',
      vrmDataSource: 'analyze-bmi-differences.js 分析結果より'
    });
    
    if (bmi) {
      const waistScale = this.interpolateFromTable(bmi, DynamicMeshDeformer.VRM_BODY_CHANGE_TABLE.waist);
      const chestScale = this.interpolateFromTable(bmi, DynamicMeshDeformer.VRM_BODY_CHANGE_TABLE.chest);
      console.log(`📊 VRM実測データ BMI${bmi}:`, {
        waistChangeCoeff: waistScale.toFixed(6),
        chestChangeCoeff: chestScale.toFixed(6),
        expectedWaistChange: `${((waistScale - 1) * 0.0004 * 1000).toFixed(6)}mm`,
        expectedChestChange: `${((chestScale - 1) * 0.0004 * 1000).toFixed(6)}mm`
      });
    }
  }
}