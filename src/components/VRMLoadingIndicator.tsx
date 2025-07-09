'use client';

import { useEffect, useState } from 'react';
import { MemoryMonitor } from '../utils/memoryMonitor';

interface VRMLoadingIndicatorProps {
  isLoading: boolean;
  progress?: number;
  currentStep?: string;
  error?: string | null;
}

export default function VRMLoadingIndicator({ 
  isLoading, 
  progress = 0, 
  currentStep = '', 
  error 
}: VRMLoadingIndicatorProps) {
  const [memoryUsage, setMemoryUsage] = useState<any>(null);

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      const usage = MemoryMonitor.getCurrentMemoryUsage();
      setMemoryUsage(usage);
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading && !error) return null;

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
      <div className="text-white text-center max-w-md">
        {error ? (
          // エラー表示
          <div className="space-y-4">
            <div className="text-red-400 text-2xl">❌</div>
            <div className="text-red-400 font-bold">読み込みエラー</div>
            <div className="text-sm text-gray-300 bg-gray-800 rounded p-3">
              {error}
            </div>
            {memoryUsage && (
              <div className="text-xs text-gray-400">
                メモリ使用量: {MemoryMonitor.formatMemorySize(memoryUsage.used)} / {MemoryMonitor.formatMemorySize(memoryUsage.limit)}
                ({(memoryUsage.percentage * 100).toFixed(1)}%)
              </div>
            )}
          </div>
        ) : (
          // 読み込み表示
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            
            <div>
              <div className="text-lg font-bold mb-2">3Dアバターを読み込み中...</div>
              {currentStep && (
                <div className="text-sm text-gray-300 mb-2">{currentStep}</div>
              )}
            </div>

            {/* プログレスバー */}
            {progress > 0 && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* メモリ使用量 */}
            {memoryUsage && (
              <div className="text-xs text-gray-400 space-y-1">
                <div>
                  メモリ使用量: {MemoryMonitor.formatMemorySize(memoryUsage.used)} / {MemoryMonitor.formatMemorySize(memoryUsage.limit)}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-300 ${
                      memoryUsage.status === 'safe' ? 'bg-green-500' :
                      memoryUsage.status === 'warning' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${memoryUsage.percentage * 100}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  <span>使用率: {(memoryUsage.percentage * 100).toFixed(1)}%</span>
                  <span className={
                    memoryUsage.status === 'safe' ? 'text-green-400' :
                    memoryUsage.status === 'warning' ? 'text-yellow-400' :
                    'text-red-400'
                  }>
                    {memoryUsage.status.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* 最適化レベル */}
            <div className="text-xs text-gray-400">
              最適化レベル: {MemoryMonitor.getOptimizationLevel().toUpperCase()}
              （デバイスメモリ: {MemoryMonitor.getDeviceMemoryGB()}GB）
            </div>

            {/* 警告メッセージ */}
            {memoryUsage?.status === 'warning' && (
              <div className="bg-yellow-900 border border-yellow-500 rounded px-3 py-2 text-sm">
                <div className="text-yellow-300">⚠️ メモリ使用量が高くなっています</div>
                <div className="text-xs text-yellow-200">品質を自動調整中...</div>
              </div>
            )}

            {memoryUsage?.status === 'critical' && (
              <div className="bg-red-900 border border-red-500 rounded px-3 py-2 text-sm animate-pulse">
                <div className="text-red-300">🚨 メモリ使用量が危険レベルです</div>
                <div className="text-xs text-red-200">緊急最適化を実行中...</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}