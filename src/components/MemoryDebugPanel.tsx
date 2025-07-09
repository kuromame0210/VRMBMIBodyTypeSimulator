'use client';

import { useEffect, useState } from 'react';
import { MemoryMonitor, MemoryUsage } from '../utils/memoryMonitor';
import { VRMCache } from '../utils/vrmCache';

export default function MemoryDebugPanel() {
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage | null>(null);
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const usage = MemoryMonitor.getCurrentMemoryUsage();
      const cache = VRMCache.getStatus();
      setMemoryUsage(usage);
      setCacheStatus(cache);
    };

    // 初回更新
    updateStatus();

    // 定期更新
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!memoryUsage) return null;

  return (
    <>
      {/* トグルボタン */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed top-4 right-4 z-50 bg-gray-800 text-white px-3 py-1 rounded-md text-sm font-mono hover:bg-gray-700 transition-colors"
      >
        {isVisible ? '🔍 Hide Debug' : '🔍 Debug'}
      </button>

      {/* デバッグパネル */}
      {isVisible && (
        <div className="fixed top-16 right-4 z-40 bg-black bg-opacity-90 text-white p-4 rounded-lg font-mono text-xs max-w-sm">
          <div className="space-y-3">
            
            {/* メモリ使用量 */}
            <div>
              <h3 className="text-sm font-bold mb-2 text-blue-300">💾 Memory Usage</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span className={getStatusColor(memoryUsage.status)}>
                    {MemoryMonitor.formatMemorySize(memoryUsage.used)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span>{MemoryMonitor.formatMemorySize(memoryUsage.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Limit:</span>
                  <span>{MemoryMonitor.formatMemorySize(memoryUsage.limit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usage:</span>
                  <span className={getStatusColor(memoryUsage.status)}>
                    {(memoryUsage.percentage * 100).toFixed(1)}%
                  </span>
                </div>
                
                {/* プログレスバー */}
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(memoryUsage.status)}`}
                    style={{ width: `${memoryUsage.percentage * 100}%` }}
                  />
                </div>
                
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={getStatusColor(memoryUsage.status)}>
                    {memoryUsage.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* デバイス情報 */}
            <div>
              <h3 className="text-sm font-bold mb-2 text-green-300">🖥️ Device Info</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Memory:</span>
                  <span>{MemoryMonitor.getDeviceMemoryGB()}GB</span>
                </div>
                <div className="flex justify-between">
                  <span>Optimization:</span>
                  <span className="text-yellow-300">
                    {MemoryMonitor.getOptimizationLevel().toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* VRMキャッシュ */}
            {cacheStatus && (
              <div>
                <h3 className="text-sm font-bold mb-2 text-purple-300">📦 VRM Cache</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Count:</span>
                    <span>{cacheStatus.size}/3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory:</span>
                    <span>{MemoryMonitor.formatMemorySize(cacheStatus.totalMemory)}</span>
                  </div>
                  
                  {/* キャッシュエントリ */}
                  {cacheStatus.entries.length > 0 && (
                    <div className="mt-2 max-h-24 overflow-y-auto">
                      <div className="text-xs text-gray-400 mb-1">Entries:</div>
                      {cacheStatus.entries.map((entry: any, index: number) => (
                        <div key={index} className="text-xs bg-gray-800 rounded px-2 py-1 mb-1">
                          <div className="truncate">{entry.path.split('/').pop()}</div>
                          <div className="flex justify-between text-gray-400">
                            <span>{MemoryMonitor.formatMemorySize(entry.memoryUsage)}</span>
                            <span>×{entry.accessCount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 警告メッセージ */}
            {memoryUsage.status === 'warning' && (
              <div className="bg-yellow-900 border border-yellow-500 rounded px-2 py-1">
                <div className="text-yellow-300 text-xs">⚠️ Memory Warning</div>
                <div className="text-xs">Consider reducing quality</div>
              </div>
            )}

            {memoryUsage.status === 'critical' && (
              <div className="bg-red-900 border border-red-500 rounded px-2 py-1 animate-pulse">
                <div className="text-red-300 text-xs">🚨 Critical Memory</div>
                <div className="text-xs">Emergency cleanup active</div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  MemoryMonitor.emergencyMemoryCleanup();
                  VRMCache.clearAll();
                }}
                className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs transition-colors"
              >
                🧹 Clear All
              </button>
              <button
                onClick={() => {
                  if (window.gc) {
                    window.gc();
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs transition-colors"
              >
                🗑️ Force GC
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}