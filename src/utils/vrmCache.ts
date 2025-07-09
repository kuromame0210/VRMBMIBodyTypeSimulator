import { MemoryMonitor } from './memoryMonitor';

interface CacheEntry {
  vrm: any;
  lastAccessed: number;
  memoryUsage: number;
  accessCount: number;
}

export class VRMCache {
  private static cache = new Map<string, CacheEntry>();
  private static readonly MAX_CACHE_SIZE = 2; // 最大2つまでキャッシュ（メモリ削減）
  private static readonly CACHE_EXPIRY_TIME = 2 * 60 * 1000; // 2分（短縮）
  private static readonly MAX_MEMORY_USAGE = 50 * 1024 * 1024; // 50MB（削減）

  /**
   * キャッシュからVRMを取得
   */
  static get(path: string): any | null {
    const entry = this.cache.get(path);
    if (!entry) return null;

    // 期限切れチェック
    if (Date.now() - entry.lastAccessed > this.CACHE_EXPIRY_TIME) {
      this.remove(path);
      return null;
    }

    // アクセス情報を更新
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    console.log(`📦 VRMキャッシュヒット: ${path}`);
    return entry.vrm;
  }

  /**
   * VRMをキャッシュに保存
   */
  static set(path: string, vrm: any): void {
    // メモリ使用量を推定
    const memoryUsage = this.estimateVRMMemoryUsage(vrm);
    
    // メモリ制限チェック
    if (memoryUsage > this.MAX_MEMORY_USAGE) {
      console.warn(`⚠️ VRMが大きすぎるためキャッシュしません: ${path} (${MemoryMonitor.formatMemorySize(memoryUsage)})`);
      return;
    }

    // 現在のメモリ状況をチェック
    if (MemoryMonitor.isMemoryDangerous()) {
      console.warn('🚨 メモリ不足のためキャッシュを無効化');
      this.clearAll();
      return;
    }

    // キャッシュサイズ制限チェック
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      vrm,
      lastAccessed: Date.now(),
      memoryUsage,
      accessCount: 1
    };

    this.cache.set(path, entry);
    console.log(`💾 VRMをキャッシュに保存: ${path} (${MemoryMonitor.formatMemorySize(memoryUsage)})`);
  }

  /**
   * 特定のVRMをキャッシュから削除
   */
  static remove(path: string): void {
    const entry = this.cache.get(path);
    if (entry) {
      // VRMのメモリ解放
      this.disposeVRM(entry.vrm);
      this.cache.delete(path);
      console.log(`🗑️ VRMキャッシュから削除: ${path}`);
    }
  }

  /**
   * 全キャッシュをクリア
   */
  static clearAll(): void {
    this.cache.forEach((entry, path) => {
      this.disposeVRM(entry.vrm);
    });
    this.cache.clear();
    console.log('🧹 VRMキャッシュを全削除');
    
    // TextureOptimizerのクリーンアップも実行
    const textureOptimizer = require('./textureOptimizer');
    textureOptimizer.TextureOptimizer.cleanup();
    
    // 強制ガベージコレクション
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * 最も最近使用されていないキャッシュを削除
   */
  private static evictLeastRecentlyUsed(): void {
    let oldestPath = '';
    let oldestTime = Date.now();

    this.cache.forEach((entry, path) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestPath = path;
      }
    });

    if (oldestPath) {
      this.remove(oldestPath);
    }
  }

  /**
   * VRMのメモリ使用量を推定
   */
  private static estimateVRMMemoryUsage(vrm: any): number {
    let totalMemory = 0;
    
    vrm.scene.traverse((object: any) => {
      // ジオメトリのメモリ使用量
      if (object.geometry) {
        const geometry = object.geometry;
        if (geometry.attributes.position) {
          totalMemory += geometry.attributes.position.count * 3 * 4; // position
        }
        if (geometry.attributes.normal) {
          totalMemory += geometry.attributes.normal.count * 3 * 4; // normal
        }
        if (geometry.attributes.uv) {
          totalMemory += geometry.attributes.uv.count * 2 * 4; // uv
        }
        if (geometry.index) {
          totalMemory += geometry.index.count * 4; // index
        }
      }
      
      // テクスチャのメモリ使用量
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material: any) => {
          if (material.map && material.map.image) {
            const img = material.map.image;
            totalMemory += img.width * img.height * 4; // RGBA
          }
        });
      }
    });
    
    return totalMemory;
  }

  /**
   * VRMのメモリを解放
   */
  private static disposeVRM(vrm: any): void {
    if (!vrm) return;
    
    vrm.scene.traverse((object: any) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material: any) => {
            if (material.map) material.map.dispose();
            if (material.normalMap) material.normalMap.dispose();
            if (material.emissiveMap) material.emissiveMap.dispose();
            material.dispose();
          });
        } else {
          if (object.material.map) object.material.map.dispose();
          if (object.material.normalMap) object.material.normalMap.dispose();
          if (object.material.emissiveMap) object.material.emissiveMap.dispose();
          object.material.dispose();
        }
      }
    });
    
    if (typeof vrm.dispose === 'function') {
      vrm.dispose();
    }
  }

  /**
   * キャッシュの状態を取得
   */
  static getStatus(): {
    size: number;
    totalMemory: number;
    entries: Array<{path: string; lastAccessed: number; memoryUsage: number; accessCount: number}>;
  } {
    const entries: Array<{path: string; lastAccessed: number; memoryUsage: number; accessCount: number}> = [];
    let totalMemory = 0;
    
    this.cache.forEach((entry, path) => {
      entries.push({
        path,
        lastAccessed: entry.lastAccessed,
        memoryUsage: entry.memoryUsage,
        accessCount: entry.accessCount
      });
      totalMemory += entry.memoryUsage;
    });
    
    return {
      size: this.cache.size,
      totalMemory,
      entries
    };
  }

  /**
   * メモリプレッシャー時の緊急クリーンアップ
   */
  static emergencyCleanup(): void {
    console.warn('🚨 VRMキャッシュの緊急クリーンアップを実行');
    
    // 使用頻度の低いキャッシュから削除
    const entries = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => a.accessCount - b.accessCount);
    
    // 半分のキャッシュを削除
    const toDelete = entries.slice(0, Math.ceil(entries.length / 2));
    toDelete.forEach(([path]) => this.remove(path));
  }
}