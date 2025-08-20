import React, { useState, useMemo } from 'react';
import { BlendShapeStore } from '../hooks/useBlendShapeStore';

interface BlendShapeControlsProps {
  store: BlendShapeStore;
  availableBlendShapes: string[];
}

export default function BlendShapeControls({
  store,
  availableBlendShapes
}: BlendShapeControlsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('eyes');
  const [newPresetName, setNewPresetName] = useState('');
  const [showImportExport, setShowImportExport] = useState(false);
  const [importData, setImportData] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Create dynamic categories based on available blend shapes
  const categories = useMemo(() => {
    // Filter out Fcl_ prefixed blend shapes (VRM original expressions)
    const filteredBlendShapes = availableBlendShapes.filter(shape => !shape.startsWith('Fcl_'));
    
    // First, create categories without 'other'
    const coreCategories = {
      eyes: { 
        label: '👁️ 目の調整', 
        shapes: filteredBlendShapes.filter(shape => 
          shape.toLowerCase().includes('eye') || 
          shape.includes('EYE') ||
          ['Eye_L', 'Eye_S', 'Eye_Up', 'Eye_Down', 'Eye_Close', 'Eye_Far'].includes(shape)
        )
      },
      eyebrows: {
        label: '🤨 眉毛',
        shapes: filteredBlendShapes.filter(shape => 
          shape.includes('BRW') || shape.toLowerCase().includes('brow')
        )
      },
      mouth: { 
        label: '👄 口の調整', 
        shapes: filteredBlendShapes.filter(shape => 
          shape.includes('MTH') || 
          shape.toLowerCase().includes('mouth') ||
          shape.toLowerCase().includes('lips') ||
          ['Mouth_Wide', 'Mouth_Narrow', 'Lips_Thick', 'Lips_Thin'].includes(shape)
        )
      },
      nose: { 
        label: '👃 鼻の調整', 
        shapes: filteredBlendShapes.filter(shape => 
          shape.toLowerCase().includes('nose') ||
          ['Nose_Thick', 'Nose_Thin', 'Nose_High', 'Nose_Low'].includes(shape)
        )
      },
      face: { 
        label: '🎭 顔の輪郭', 
        shapes: filteredBlendShapes.filter(shape => 
          shape.toLowerCase().includes('face') ||
          shape.toLowerCase().includes('chin') ||
          ['Face_Round', 'Face_Long', 'Chin_Sharp', 'Chin_Round'].includes(shape)
        )
      },
      expressions: {
        label: '😊 表情',
        shapes: filteredBlendShapes.filter(shape => 
          shape.includes('ALL_') || 
          ['Angry', 'Fun', 'Joy', 'Sorrow', 'Surprised', 'Neutral'].some(emotion => 
            shape.includes(emotion)
          )
        )
      },
      vowels: {
        label: '🗣️ 母音',
        shapes: filteredBlendShapes.filter(shape => 
          ['MTH_A', 'MTH_I', 'MTH_U', 'MTH_E', 'MTH_O'].some(vowel => shape.includes(vowel))
        )
      },
      hair: {
        label: '💇 髪型',
        shapes: filteredBlendShapes.filter(shape => 
          shape.includes('HA_') || shape.toLowerCase().includes('hair')
        )
      },
      body: {
        label: '🫂 体型',
        shapes: filteredBlendShapes.filter(shape => 
          shape.toLowerCase().includes('fatness') || shape.toLowerCase().includes('body')
        )
      }
    };

    // Collect all used shapes from core categories
    const usedShapes = new Set<string>();
    Object.values(coreCategories).forEach(category => {
      category.shapes.forEach(shape => usedShapes.add(shape));
    });

    // Create 'other' category for remaining shapes (excluding Fcl_ shapes)
    const otherShapes = filteredBlendShapes.filter(shape => !usedShapes.has(shape));
    
    const dynamicCategories = {
      ...coreCategories,
      ...(otherShapes.length > 0 ? {
        other: {
          label: '🔧 その他',
          shapes: otherShapes
        }
      } : {})
    };

    // Remove empty categories
    Object.keys(dynamicCategories).forEach(key => {
      if (dynamicCategories[key as keyof typeof dynamicCategories]?.shapes.length === 0) {
        delete dynamicCategories[key as keyof typeof dynamicCategories];
      }
    });

    return dynamicCategories;
  }, [availableBlendShapes]);

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      store.savePreset(newPresetName.trim());
      setNewPresetName('');
    }
  };

  const handleImport = () => {
    const success = store.importValues(importData);
    if (success) {
      setImportData('');
      setShowImportExport(false);
      alert('データのインポートが完了しました');
    } else {
      alert('インポートに失敗しました。データ形式を確認してください。');
    }
  };

  const handleExport = () => {
    const data = store.exportValues();
    navigator.clipboard.writeText(data).then(() => {
      alert('クリップボードにコピーしました');
    });
  };

  const getFilteredShapes = (categoryShapes: string[]) => {
    let filtered = categoryShapes.filter(shapeName =>
      availableBlendShapes.includes(shapeName)
    );
    
    if (searchTerm.trim()) {
      filtered = filtered.filter(shapeName =>
        shapeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Get all shapes for search across all categories (excluding Fcl_ shapes)
  const getAllFilteredShapes = () => {
    if (!searchTerm.trim()) return [];
    
    return availableBlendShapes
      .filter(shapeName => !shapeName.startsWith('Fcl_'))
      .filter(shapeName =>
        shapeName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  };

  return (
    <div className="w-full space-y-4">
      {/* ヘッダー */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          BlendShape調整
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({availableBlendShapes.filter(shape => !shape.startsWith('Fcl_')).length} 個利用可能)
          </span>
        </h2>
        
        {/* 検索バー */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="ブレンドシェイプを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {searchTerm && (
            <div className="text-xs text-gray-500 mt-1">
              {getAllFilteredShapes().length} 件見つかりました
            </div>
          )}
        </div>
        
        {/* アクションボタン */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={store.resetToDefault}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            🔄 リセット
          </button>
          <button
            onClick={() => setShowImportExport(!showImportExport)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            📁 インポート/エクスポート
          </button>
        </div>

        {/* インポート/エクスポートパネル */}
        {showImportExport && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 text-sm">エクスポート</h4>
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                >
                  📋 クリップボードにコピー
                </button>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-sm">インポート</h4>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="JSONデータを貼り付けてください"
                  className="w-full p-2 border rounded mb-2 text-xs"
                  rows={3}
                />
                <button
                  onClick={handleImport}
                  disabled={!importData.trim()}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 text-sm"
                >
                  📥 インポート
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* カテゴリタブまたは検索結果 */}
      <div className="border rounded-lg overflow-hidden">
        {!searchTerm && (
          <div className="border-b">
            <div className="flex flex-wrap">
              {Object.entries(categories).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-2 py-1 text-xs font-medium border-r ${
                    selectedCategory === key
                      ? 'bg-blue-500 text-white border-b-2 border-blue-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.label} ({category.shapes.length})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ブレンドシェイプスライダー */}
        <div className="p-4">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              {searchTerm ? (
                <>🔍 検索結果: "{searchTerm}" <span className="text-xs text-gray-400">({getAllFilteredShapes().length} 個)</span></>
              ) : (
                <>
                  {categories[selectedCategory as keyof typeof categories]?.label} 
                  <span className="text-xs text-gray-400">
                    ({getFilteredShapes(categories[selectedCategory as keyof typeof categories]?.shapes || []).length} 個)
                  </span>
                </>
              )}
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {(searchTerm ? getAllFilteredShapes() : getFilteredShapes(categories[selectedCategory as keyof typeof categories]?.shapes || [])).map(shapeName => {
              // Determine if this blend shape might have limited effect
              const isLikelyLimitedEffect = shapeName.includes('Chin_Round') || 
                                          shapeName.includes('Face_6') || 
                                          shapeName.includes('Face_7') ||
                                          shapeName.includes('HA_Hide');
              
              return (
                <div key={shapeName} className={`space-y-1 p-3 border rounded-lg hover:bg-gray-50 ${isLikelyLimitedEffect ? 'border-yellow-300 bg-yellow-50' : ''}`}>
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-gray-700 pr-2 flex items-center">
                      {shapeName}
                      {isLikelyLimitedEffect && (
                        <span className="ml-1 text-yellow-600" title="このブレンドシェイプは効果が限定的な場合があります">
                          ⚠️
                        </span>
                      )}
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 min-w-[3rem] text-right">
                        {((store.currentValues[shapeName] || 0) * 100).toFixed(0)}%
                      </span>
                      <button
                        onClick={() => store.updateSingleValue(shapeName, 0)}
                        className="text-xs px-1 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                        title="0にリセット"
                      >
                        ⟲
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={store.currentValues[shapeName] || 0}
                    onChange={(e) => store.updateSingleValue(shapeName, parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* プリセット管理 */}
      <div className="border rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-800 mb-4">プリセット管理</h3>
        
        {/* 新規プリセット保存 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="プリセット名を入力"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={handleSavePreset}
            disabled={!newPresetName.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm"
          >
            💾 保存
          </button>
        </div>

        {/* 保存済みプリセット一覧 */}
        <div className="space-y-2">
          {store.savedPresets.length === 0 ? (
            <p className="text-gray-500 text-sm">保存されたプリセットはありません</p>
          ) : (
            store.savedPresets.map(preset => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-800 text-sm">{preset.name}</div>
                  <div className="text-xs text-gray-500">
                    {preset.createdAt.toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => store.loadPreset(preset.id)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    🔄 読み込み
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('このプリセットを削除しますか？')) {
                        store.deletePreset(preset.id);
                      }
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}