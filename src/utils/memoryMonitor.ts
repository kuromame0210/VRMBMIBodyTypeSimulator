export interface MemoryUsage {
  used: number;
  total: number;
  limit: number;
  percentage: number;
  status: 'safe' | 'warning' | 'critical';
}

export class MemoryMonitor {
  private static readonly WARNING_THRESHOLD = 0.75; // 75%（緩和）
  private static readonly CRITICAL_THRESHOLD = 0.9; // 90%（緩和）
  private static checkInterval: NodeJS.Timeout | null = null;
  private static callbacks: Array<(usage: MemoryUsage) => void> = [];

  /**
   * 現在のメモリ使用量を取得
   */
  static getCurrentMemoryUsage(): MemoryUsage | null {
    if (!performance.memory) return null;

    const used = performance.memory.usedJSHeapSize;
    const total = performance.memory.totalJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;
    const percentage = used / limit;

    let status: 'safe' | 'warning' | 'critical' = 'safe';
    if (percentage >= this.CRITICAL_THRESHOLD) {
      status = 'critical';
    } else if (percentage >= this.WARNING_THRESHOLD) {
      status = 'warning';
    }

    return {
      used,
      total,
      limit,
      percentage,
      status
    };
  }

  /**
   * メモリ監視を開始
   */
  static startMonitoring(callback: (usage: MemoryUsage) => void): void {
    // 重複コールバックの防止
    if (!this.callbacks.includes(callback)) {
      this.callbacks.push(callback);
    }
    
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      const usage = this.getCurrentMemoryUsage();
      if (usage) {
        this.callbacks.forEach(cb => cb(usage));
      }
    }, 1000); // 1秒間隔
  }

  /**
   * メモリ監視を停止
   */
  static stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.callbacks = [];
  }

  /**
   * 特定のコールバックを削除
   */
  static removeCallback(callback: (usage: MemoryUsage) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
    
    // コールバックが0になったら監視を停止
    if (this.callbacks.length === 0 && this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 緊急メモリ解放
   */
  static emergencyMemoryCleanup(): void {
    console.warn('🚨 緊急メモリ解放を実行中...');
    
    // 強制ガベージコレクション
    if (window.gc) {
      window.gc();
    }
    
    // メモリプレッシャーをかけてガベージコレクションを促進
    try {
      const tempArrays = [];
      for (let i = 0; i < 10; i++) {
        tempArrays.push(new Array(100000).fill(0));
      }
      tempArrays.forEach(arr => arr.length = 0);
    } catch {
      // メモリ不足時は無視
    }
    
    // ブラウザのキャッシュをクリア
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // 複数回のガベージコレクション実行
    setTimeout(() => {
      if (window.gc) {
        window.gc();
      }
    }, 100);
    
    setTimeout(() => {
      if (window.gc) {
        window.gc();
      }
    }, 500);
  }

  /**
   * メモリ使用量をフォーマット
   */
  static formatMemorySize(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  }

  /**
   * メモリ使用率が危険レベルかチェック
   */
  static isMemoryDangerous(): boolean {
    const usage = this.getCurrentMemoryUsage();
    return usage ? usage.status === 'critical' : false;
  }

  /**
   * デバイスメモリ容量を取得
   */
  static getDeviceMemoryGB(): number {
    return (navigator as any).deviceMemory || 4;
  }

  /**
   * メモリ最適化レベルを決定
   */
  static getOptimizationLevel(): 'ultra' | 'high' | 'medium' | 'low' {
    const deviceMemory = this.getDeviceMemoryGB();
    const currentUsage = this.getCurrentMemoryUsage();
    
    if (!currentUsage) {
      return deviceMemory <= 4 ? 'ultra' : deviceMemory <= 8 ? 'high' : 'medium';
    }
    
    if (currentUsage.status === 'critical') {
      return 'ultra';
    } else if (currentUsage.status === 'warning') {
      return deviceMemory <= 4 ? 'ultra' : 'high';
    } else {
      return deviceMemory <= 4 ? 'high' : deviceMemory <= 8 ? 'medium' : 'low';
    }
  }

  /**
   * VRM読み込み前のメモリチェック
   */
  static canLoadVRM(): boolean {
    const usage = this.getCurrentMemoryUsage();
    if (!usage) return true;
    
    const deviceMemory = this.getDeviceMemoryGB();
    const threshold = deviceMemory <= 4 ? 0.75 : deviceMemory <= 8 ? 0.85 : 0.9;
    
    return usage.percentage < threshold;
  }

  /**
   * メモリ情報のログ出力
   */
  static logMemoryInfo(context: string): void {
    const usage = this.getCurrentMemoryUsage();
    if (!usage) return;

    console.log(`📊 ${context} - メモリ使用量:`, {
      used: this.formatMemorySize(usage.used),
      total: this.formatMemorySize(usage.total),
      limit: this.formatMemorySize(usage.limit),
      percentage: `${(usage.percentage * 100).toFixed(1)}%`,
      status: usage.status,
      deviceMemory: `${this.getDeviceMemoryGB()}GB`,
      optimizationLevel: this.getOptimizationLevel()
    });
  }
}