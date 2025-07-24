'use client';

import { useState, useEffect } from 'react';

interface PerformanceMiniWidgetProps {
  onOpenFull: () => void;
}

export default function PerformanceMiniWidget({ onOpenFull }: PerformanceMiniWidgetProps) {
  const [fps, setFps] = useState(0);
  const [memoryPercent, setMemoryPercent] = useState(0);
  
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const updateStats = () => {
      const now = performance.now();
      frameCount++;

      // FPS計算
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      // メモリ使用量
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const percent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
        setMemoryPercent(Math.round(percent));
      }

      animationId = requestAnimationFrame(updateStats);
    };

    updateStats();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  const getFpsColor = () => {
    if (fps >= 50) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMemoryColor = () => {
    if (memoryPercent >= 80) return 'text-red-500';
    if (memoryPercent >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <button
      onClick={onOpenFull}
      className="fixed bottom-16 right-4 bg-white shadow-lg rounded-lg p-3 border-2 border-gray-200 hover:shadow-xl transition-all z-30 min-w-[120px]"
      title="詳細なパフォーマンス監視を開く"
    >
      <div className="text-xs font-medium text-gray-600 mb-1">パフォーマンス</div>
      <div className="flex justify-between items-center">
        <div className="text-center">
          <div className={`text-sm font-bold ${getFpsColor()}`}>{fps}</div>
          <div className="text-xs text-gray-500">FPS</div>
        </div>
        <div className="text-center">
          <div className={`text-sm font-bold ${getMemoryColor()}`}>{memoryPercent}%</div>
          <div className="text-xs text-gray-500">MEM</div>
        </div>
      </div>
    </button>
  );
}