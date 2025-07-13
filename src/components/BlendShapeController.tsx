'use client';

import { useState, useEffect } from 'react';
import { VRM } from '@pixiv/three-vrm';

interface BlendShapeControllerProps {
  vrm: VRM | null;
  onBlendShapeChange?: (blendShapeName: string, value: number) => void;
}

interface BlendShapeData {
  name: string;
  displayName: string;
  value: number;
  category: 'expression' | 'viseme' | 'body' | 'custom';
}

export default function BlendShapeController({ vrm, onBlendShapeChange }: BlendShapeControllerProps) {
  const [blendShapes, setBlendShapes] = useState<BlendShapeData[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'expression' | 'viseme' | 'body' | 'custom'>('all');

  // VRMのブレンドシェイプを取得・分類
  useEffect(() => {
    if (!vrm?.expressionManager) {
      setBlendShapes([]);
      return;
    }

    const shapes: BlendShapeData[] = [];
    const expressionManager = vrm.expressionManager;

    // 全てのブレンドシェイプを取得
    Object.entries(expressionManager.expressionMap).forEach(([name, expression]) => {
      const category = categorizeBlendShape(name);
      const displayName = getDisplayName(name);
      
      shapes.push({
        name,
        displayName,
        value: expression.weight,
        category
      });
    });

    // カテゴリ順でソート
    shapes.sort((a, b) => {
      const categoryOrder = ['expression', 'viseme', 'body', 'custom'];
      const categoryDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      if (categoryDiff !== 0) return categoryDiff;
      return a.displayName.localeCompare(b.displayName);
    });

    setBlendShapes(shapes);
  }, [vrm]);

  // ブレンドシェイプをカテゴリ分け
  const categorizeBlendShape = (name: string): BlendShapeData['category'] => {
    const lowerName = name.toLowerCase();
    
    // 表情系
    if (['angry', 'fun', 'joy', 'sorrow', 'surprised', 'neutral'].some(expr => lowerName.includes(expr))) {
      return 'expression';
    }
    
    // 口形系（ビセーム）
    if (['a', 'i', 'u', 'e', 'o', 'blink'].some(viseme => lowerName === viseme || lowerName.includes('blink'))) {
      return 'viseme';
    }
    
    // 体型系（おなか周りなど）
    if (['belly', 'waist', 'chest', 'body', 'fat', 'slim', 'thick'].some(body => lowerName.includes(body))) {
      return 'body';
    }
    
    return 'custom';
  };

  // 表示名を日本語化
  const getDisplayName = (name: string): string => {
    const nameMap: Record<string, string> = {
      'neutral': 'ニュートラル',
      'angry': '怒り',
      'fun': '楽しい',
      'joy': '喜び',
      'sorrow': '悲しみ',
      'surprised': '驚き',
      'a': 'あ',
      'i': 'い', 
      'u': 'う',
      'e': 'え',
      'o': 'お',
      'blink': 'まばたき',
      'blink_l': '左まばたき',
      'blink_r': '右まばたき'
    };
    
    return nameMap[name.toLowerCase()] || name;
  };

  // ブレンドシェイプ値を変更
  const handleBlendShapeChange = (name: string, value: number) => {
    if (!vrm?.expressionManager) return;

    const expression = vrm.expressionManager.expressionMap[name];
    if (expression) {
      expression.weight = value;
      console.log(`🎭 ブレンドシェイプ適用: ${name} = ${value}`);
    }

    // 状態を更新
    setBlendShapes(prev => 
      prev.map(shape => 
        shape.name === name ? { ...shape, value } : shape
      )
    );

    // 親コンポーネントに通知
    if (onBlendShapeChange) {
      onBlendShapeChange(name, value);
    }
  };

  // 全てリセット
  const handleResetAll = () => {
    blendShapes.forEach(shape => {
      handleBlendShapeChange(shape.name, 0);
    });
  };

  // カテゴリでフィルタ
  const filteredBlendShapes = blendShapes.filter(shape => 
    activeCategory === 'all' || shape.category === activeCategory
  );

  // カテゴリ別の色
  const getCategoryColor = (category: BlendShapeData['category']) => {
    switch (category) {
      case 'expression': return 'bg-blue-100 text-blue-800';
      case 'viseme': return 'bg-green-100 text-green-800';
      case 'body': return 'bg-orange-100 text-orange-800';
      case 'custom': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!vrm) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <p className="text-gray-500 text-center">VRMモデルを読み込んでください</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800">コントロール</h3>
          <button
            onClick={handleResetAll}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
          >
            全リセット
          </button>
        </div>
        
        {/* 統計情報を上部に移動 */}
        <div className="mt-3 text-xs text-gray-500 grid grid-cols-2 gap-2">
          <div>総数: {blendShapes.length}</div>
          <div>表示中: {filteredBlendShapes.length}</div>
          <div>表情: {blendShapes.filter(s => s.category === 'expression').length}</div>
          <div>口形: {blendShapes.filter(s => s.category === 'viseme').length}</div>
          <div>体型: {blendShapes.filter(s => s.category === 'body').length}</div>
          <div>その他: {blendShapes.filter(s => s.category === 'custom').length}</div>
        </div>
        
        {/* カテゴリフィルタ */}
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {(['all', 'expression', 'viseme', 'body', 'custom'] as const).map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                activeCategory === category 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category === 'all' ? '全て' : 
               category === 'expression' ? '表情' :
               category === 'viseme' ? '口形' :
               category === 'body' ? '体型' : 'その他'}
            </button>
          ))}
        </div>
      </div>

      {/* ブレンドシェイプリスト */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
        {filteredBlendShapes.length === 0 ? (
          <p className="text-gray-500 text-center py-4">該当するブレンドシェイプがありません</p>
        ) : (
          filteredBlendShapes.map((shape) => (
            <div key={shape.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{shape.displayName}</span>
                  <span className={`px-2 py-1 text-xs rounded ${getCategoryColor(shape.category)}`}>
                    {shape.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded min-w-[40px] text-center">
                    {(shape.value * 100).toFixed(0)}%
                  </span>
                  <button
                    onClick={() => handleBlendShapeChange(shape.name, 0)}
                    className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                    title="リセット"
                  >
                    0
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={shape.value}
                onChange={(e) => handleBlendShapeChange(shape.name, parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span className="text-gray-600 font-medium">{shape.name}</span>
                <span>100%</span>
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
}