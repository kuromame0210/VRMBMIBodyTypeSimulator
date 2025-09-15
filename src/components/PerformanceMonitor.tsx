'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

interface PerformanceStats {
  memoryUsed: number;
  memoryTotal: number;
  memoryPercent: number;
  fps: number;
  renderTime: number;
  drawCalls: number;
  triangles: number;
  frameCount: number;
}

interface PerformanceMonitorProps {
  renderer?: THREE.WebGLRenderer | null;
  isVisible: boolean;
  onToggle: () => void;
}

export default function PerformanceMonitor({ renderer, isVisible, onToggle }: PerformanceMonitorProps) {
  const [stats, setStats] = useState<PerformanceStats>({
    memoryUsed: 0,
    memoryTotal: 0,
    memoryPercent: 0,
    fps: 0,
    renderTime: 0,
    drawCalls: 0,
    triangles: 0,
    frameCount: 0
  });
  
  const [history, setHistory] = useState<{fps: number[], memory: number[], timestamp: number[]}>({
    fps: [],
    memory: [],
    timestamp: []
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsRef = useRef(0);

  // パフォーマンス監視
  useEffect(() => {
    let animationId: number;
    
    const updateStats = () => {
      const now = performance.now();
      frameCountRef.current++;
      
      // FPS計算（1秒ごと）
      if (now - lastTimeRef.current >= 1000) {
        fpsRef.current = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      // メモリ使用量取得
      let memoryUsed = 0;
      let memoryTotal = 0;
      let memoryPercent = 0;

      if ('memory' in performance) {
        const memory = (performance as any).memory;
        memoryUsed = memory.usedJSHeapSize;
        memoryTotal = memory.totalJSHeapSize;
        memoryPercent = (memoryUsed / memoryTotal) * 100;
      }

      // WebGL統計
      let drawCalls = 0;
      let triangles = 0;
      if (renderer) {
        const info = renderer.info;
        drawCalls = info.render.calls;
        triangles = info.render.triangles;
      }

      const newStats: PerformanceStats = {
        memoryUsed: Math.round(memoryUsed / 1024 / 1024), // MB
        memoryTotal: Math.round(memoryTotal / 1024 / 1024), // MB
        memoryPercent: Math.round(memoryPercent),
        fps: fpsRef.current,
        renderTime: Math.round(now % 1000), // 簡易的な計測
        drawCalls,
        triangles,
        frameCount: frameCountRef.current
      };

      setStats(newStats);

      // 履歴を更新（最新50件）
      setHistory(prev => {
        const newFps = [...prev.fps, newStats.fps].slice(-50);
        const newMemory = [...prev.memory, newStats.memoryPercent].slice(-50);
        const newTimestamp = [...prev.timestamp, now].slice(-50);
        
        return {
          fps: newFps,
          memory: newMemory,
          timestamp: newTimestamp
        };
      });

      animationId = requestAnimationFrame(updateStats);
    };

    updateStats();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [renderer]);

  // パフォーマンススコア計算
  const getPerformanceScore = () => {
    if (stats.fps >= 50) return { score: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (stats.fps >= 30) return { score: 'good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (stats.fps >= 20) return { score: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { score: 'poor', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const getMemoryStatus = () => {
    if (stats.memoryPercent >= 80) return { status: 'critical', color: 'text-red-600', bg: 'bg-red-50' };
    if (stats.memoryPercent >= 60) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'normal', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const performanceScore = getPerformanceScore();
  const memoryStatus = getMemoryStatus();

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-30"
        title="パフォーマンス監視"
      >
        📊
      </button>
    );
  }

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50"
        title="パフォーマンス監視を閉じる"
      >
        📊
      </button>

      {/* パフォーマンスモニターモーダル */}
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
            <h2 className="text-lg font-bold text-black">📊 パフォーマンス監視</h2>
            <button
              onClick={onToggle}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
            >
              ✕ 閉じる
            </button>
          </div>

          {/* メイン統計エリア */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* FPS */}
            <div className={`p-4 rounded-lg border-2 ${performanceScore.bg} ${performanceScore.color} border-current`}>
              <div className="text-xs font-medium opacity-75">フレームレート</div>
              <div className="text-2xl font-bold">{stats.fps}</div>
              <div className="text-xs">FPS</div>
              <div className="text-xs mt-1 capitalize">{performanceScore.score}</div>
            </div>

            {/* メモリ使用量 */}
            <div className={`p-4 rounded-lg border-2 ${memoryStatus.bg} ${memoryStatus.color} border-current`}>
              <div className="text-xs font-medium opacity-75">メモリ使用量</div>
              <div className="text-2xl font-bold">{stats.memoryUsed}MB</div>
              <div className="text-xs">/ {stats.memoryTotal}MB</div>
              <div className="text-xs mt-1">{stats.memoryPercent}% 使用中</div>
            </div>

            {/* WebGL統計 */}
            <div className="p-4 rounded-lg border-2 bg-purple-50 text-purple-600 border-current">
              <div className="text-xs font-medium opacity-75">描画コール</div>
              <div className="text-2xl font-bold">{stats.drawCalls}</div>
              <div className="text-xs">Draw Calls</div>
              <div className="text-xs mt-1">{(stats.triangles / 1000).toFixed(1)}K 三角形</div>
            </div>

            {/* フレーム情報 */}
            <div className="p-4 rounded-lg border-2 bg-indigo-50 text-indigo-600 border-current">
              <div className="text-xs font-medium opacity-75">フレーム情報</div>
              <div className="text-2xl font-bold">{stats.frameCount}</div>
              <div className="text-xs">Current Frame</div>
              <div className="text-xs mt-1">{stats.renderTime.toFixed(1)}ms</div>
            </div>
          </div>

          {/* パフォーマンスチャート */}
          <div className="flex-1 p-4 overflow-hidden">
            <div className="h-full bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-black mb-3">リアルタイムチャート</h3>
              
              {/* 簡易チャート */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                {/* FPSチャート */}
                <div className="bg-white rounded border p-3">
                  <div className="text-xs font-medium text-black mb-2">FPS履歴</div>
                  <div className="h-24 flex items-end gap-1">
                    {history.fps.map((fps, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-blue-500 rounded-sm min-w-[2px]"
                        style={{ 
                          height: `${Math.max(2, (fps / 60) * 100)}%`,
                          opacity: 0.3 + (index / history.fps.length) * 0.7
                        }}
                        title={`${fps} FPS`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-black mt-1">
                    <span>0</span>
                    <span>30</span>
                    <span>60 FPS</span>
                  </div>
                </div>

                {/* メモリチャート */}
                <div className="bg-white rounded border p-3">
                  <div className="text-xs font-medium text-black mb-2">メモリ使用率履歴</div>
                  <div className="h-24 flex items-end gap-1">
                    {history.memory.map((memory, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-green-500 rounded-sm min-w-[2px]"
                        style={{ 
                          height: `${Math.max(2, memory)}%`,
                          opacity: 0.3 + (index / history.memory.length) * 0.7
                        }}
                        title={`${memory}% Memory`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-black mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 推奨事項 */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <h4 className="text-sm font-medium text-black mb-2">パフォーマンス最適化のヒント</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {stats.fps < 30 && (
                <div className="text-red-600">
                  ⚠️ FPSが低下しています。ブレンドシェイプの同時操作を控えてください
                </div>
              )}
              {stats.memoryPercent > 70 && (
                <div className="text-yellow-600">
                  ⚠️ メモリ使用量が高くなっています。ページの再読み込みをお勧めします
                </div>
              )}
              {stats.drawCalls > 50 && (
                <div className="text-blue-600">
                  💡 描画コールが多くなっています。複雑なブレンドシェイプ操作中の可能性があります
                </div>
              )}
              {stats.fps >= 50 && stats.memoryPercent < 60 && (
                <div className="text-green-600">
                  ✅ パフォーマンスは良好です！快適にご利用いただけます
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}