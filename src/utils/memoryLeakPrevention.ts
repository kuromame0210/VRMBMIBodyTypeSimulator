/**
 * メモリリーク防止ユーティリティ
 * 
 * React StrictModeとVRMコンポーネントでのメモリリークを防ぐための
 * 包括的なメモリ管理システム
 */

export class MemoryLeakPrevention {
  private static intervalIds = new Set<NodeJS.Timeout>();
  private static timeoutIds = new Set<NodeJS.Timeout>();
  private static animationIds = new Set<number>();
  private static eventListeners = new Map<EventTarget, Array<{type: string, listener: EventListener}>>();
  
  /**
   * setIntervalの安全なラッパー
   */
  static safeSetInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const id = setInterval(callback, delay);
    this.intervalIds.add(id);
    return id;
  }
  
  /**
   * setTimeoutの安全なラッパー
   */
  static safeSetTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const id = setTimeout(() => {
      this.timeoutIds.delete(id);
      callback();
    }, delay);
    this.timeoutIds.add(id);
    return id;
  }
  
  /**
   * requestAnimationFrameの安全なラッパー
   */
  static safeRequestAnimationFrame(callback: FrameRequestCallback): number {
    const id = requestAnimationFrame((time) => {
      this.animationIds.delete(id);
      callback(time);
    });
    this.animationIds.add(id);
    return id;
  }
  
  /**
   * addEventListenerの安全なラッパー
   */
  static safeAddEventListener(
    target: EventTarget, 
    type: string, 
    listener: EventListener, 
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, []);
    }
    this.eventListeners.get(target)!.push({ type, listener });
  }
  
  /**
   * 特定のintervalをクリア
   */
  static clearSafeInterval(id: NodeJS.Timeout): void {
    if (this.intervalIds.has(id)) {
      clearInterval(id);
      this.intervalIds.delete(id);
    }
  }
  
  /**
   * 特定のtimeoutをクリア
   */
  static clearSafeTimeout(id: NodeJS.Timeout): void {
    if (this.timeoutIds.has(id)) {
      clearTimeout(id);
      this.timeoutIds.delete(id);
    }
  }
  
  /**
   * 特定のanimationFrameをクリア
   */
  static cancelSafeAnimationFrame(id: number): void {
    if (this.animationIds.has(id)) {
      cancelAnimationFrame(id);
      this.animationIds.delete(id);
    }
  }
  
  /**
   * 特定のeventListenerを削除
   */
  static removeSafeEventListener(target: EventTarget, type: string, listener: EventListener): void {
    target.removeEventListener(type, listener);
    
    if (this.eventListeners.has(target)) {
      const listeners = this.eventListeners.get(target)!;
      const index = listeners.findIndex(l => l.type === type && l.listener === listener);
      if (index !== -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          this.eventListeners.delete(target);
        }
      }
    }
  }
  
  /**
   * 全てのタイマーとイベントリスナーをクリア
   */
  static clearAll(): void {
    // 全てのintervalをクリア
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds.clear();
    
    // 全てのtimeoutをクリア
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds.clear();
    
    // 全てのanimationFrameをクリア
    this.animationIds.forEach(id => cancelAnimationFrame(id));
    this.animationIds.clear();
    
    // 全てのeventListenerを削除
    this.eventListeners.forEach((listeners, target) => {
      listeners.forEach(({ type, listener }) => {
        target.removeEventListener(type, listener);
      });
    });
    this.eventListeners.clear();
    
    console.log('🧹 MemoryLeakPrevention: 全てのタイマーとイベントリスナーをクリアしました');
  }
  
  /**
   * 現在のメモリリークリスクを取得
   */
  static getLeakRisk(): {
    intervals: number;
    timeouts: number;
    animations: number;
    eventListeners: number;
    totalRisk: 'low' | 'medium' | 'high';
  } {
    const intervals = this.intervalIds.size;
    const timeouts = this.timeoutIds.size;
    const animations = this.animationIds.size;
    const eventListeners = Array.from(this.eventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0);
    
    const total = intervals + timeouts + animations + eventListeners;
    let totalRisk: 'low' | 'medium' | 'high' = 'low';
    
    if (total > 20) {
      totalRisk = 'high';
    } else if (total > 10) {
      totalRisk = 'medium';
    }
    
    return {
      intervals,
      timeouts,
      animations,
      eventListeners,
      totalRisk
    };
  }
  
  /**
   * メモリリークレポートを出力
   */
  static printLeakReport(): void {
    const risk = this.getLeakRisk();
    
    console.log('\n🔍 メモリリーク状況レポート');
    console.log('================================');
    console.log(`⏰ アクティブなInterval: ${risk.intervals}個`);
    console.log(`⏱️ アクティブなTimeout: ${risk.timeouts}個`);
    console.log(`🎬 アクティブなAnimationFrame: ${risk.animations}個`);
    console.log(`👂 アクティブなEventListener: ${risk.eventListeners}個`);
    console.log(`🚨 総合リスクレベル: ${risk.totalRisk.toUpperCase()}`);
    
    if (risk.totalRisk === 'high') {
      console.warn('⚠️ メモリリークの危険性が高いです。clearAll()を実行することを推奨します。');
    } else if (risk.totalRisk === 'medium') {
      console.warn('⚠️ メモリリークの危険性があります。定期的な監視を推奨します。');
    } else {
      console.log('✅ メモリリークのリスクは低いです。');
    }
    console.log('================================\n');
  }
}

/**
 * React useEffectでのメモリリーク防止フック
 */
export const useMemoryLeakPrevention = () => {
  const activeCleanups = new Set<() => void>();
  
  const registerCleanup = (cleanup: () => void) => {
    activeCleanups.add(cleanup);
    return cleanup;
  };
  
  const safeSetInterval = (callback: () => void, delay: number) => {
    const id = MemoryLeakPrevention.safeSetInterval(callback, delay);
    const cleanup = () => MemoryLeakPrevention.clearSafeInterval(id);
    registerCleanup(cleanup);
    return cleanup;
  };
  
  const safeSetTimeout = (callback: () => void, delay: number) => {
    const id = MemoryLeakPrevention.safeSetTimeout(callback, delay);
    const cleanup = () => MemoryLeakPrevention.clearSafeTimeout(id);
    registerCleanup(cleanup);
    return cleanup;
  };
  
  const safeRequestAnimationFrame = (callback: FrameRequestCallback) => {
    const id = MemoryLeakPrevention.safeRequestAnimationFrame(callback);
    const cleanup = () => MemoryLeakPrevention.cancelSafeAnimationFrame(id);
    registerCleanup(cleanup);
    return cleanup;
  };
  
  const safeAddEventListener = (
    target: EventTarget, 
    type: string, 
    listener: EventListener, 
    options?: boolean | AddEventListenerOptions
  ) => {
    MemoryLeakPrevention.safeAddEventListener(target, type, listener, options);
    const cleanup = () => MemoryLeakPrevention.removeSafeEventListener(target, type, listener);
    registerCleanup(cleanup);
    return cleanup;
  };
  
  const cleanupAll = () => {
    activeCleanups.forEach(cleanup => cleanup());
    activeCleanups.clear();
  };
  
  return {
    safeSetInterval,
    safeSetTimeout,
    safeRequestAnimationFrame,
    safeAddEventListener,
    cleanupAll,
    registerCleanup
  };
};

// グローバル監視関数
if (typeof window !== 'undefined') {
  // 開発モードでのみメモリリーク監視を有効化
  if (process.env.NODE_ENV === 'development') {
    // 5秒ごとにメモリリーク状況をチェック
    MemoryLeakPrevention.safeSetInterval(() => {
      const risk = MemoryLeakPrevention.getLeakRisk();
      if (risk.totalRisk === 'high') {
        MemoryLeakPrevention.printLeakReport();
      }
    }, 5000);
    
    // ページアンロード時に全てクリア
    MemoryLeakPrevention.safeAddEventListener(window, 'beforeunload', () => {
      MemoryLeakPrevention.clearAll();
    });
  }
  
  // デバッグ用グローバル関数を追加
  (window as any).debugMemoryLeak = {
    getReport: () => MemoryLeakPrevention.printLeakReport(),
    clearAll: () => MemoryLeakPrevention.clearAll(),
    getRisk: () => MemoryLeakPrevention.getLeakRisk()
  };
}