'use client';

import { useState, useEffect } from 'react';
import { AVATAR_LIST } from '../utils/avatarConfig';
import { ThumbnailGenerator } from '../utils/thumbnailGenerator';

export default function ThumbnailManager() {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [currentGenerating, setCurrentGenerating] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [publicThumbnails, setPublicThumbnails] = useState<Record<string, boolean>>({});

  // ローカルストレージからサムネイルを読み込み
  useEffect(() => {
    const stored = ThumbnailGenerator.loadThumbnailsFromStorage();
    setThumbnails(stored);
    
    // public/vrm-models/thumbnails/ にあるサムネイルをチェック
    const checkPublicThumbnails = async () => {
      const publicStatus: Record<string, boolean> = {};
      
      for (const avatar of AVATAR_LIST) {
        const thumbnailPath = avatar.thumbnailPath;
        try {
          const response = await fetch(thumbnailPath, { method: 'HEAD' });
          publicStatus[avatar.vrmPath] = response.ok;
        } catch {
          publicStatus[avatar.vrmPath] = false;
        }
      }
      
      setPublicThumbnails(publicStatus);
    };
    
    checkPublicThumbnails();
  }, []);

  // 全てのサムネイルを生成
  const generateAllThumbnails = async () => {
    setGenerating(true);
    setProgress(0);
    
    const vrmPaths = AVATAR_LIST.map(avatar => avatar.vrmPath);
    const newThumbnails: Record<string, string> = {};
    
    for (let i = 0; i < vrmPaths.length; i++) {
      const path = vrmPaths[i];
      const avatar = AVATAR_LIST.find(a => a.vrmPath === path);
      
      setCurrentGenerating(avatar?.name || path);
      setProgress((i / vrmPaths.length) * 100);
      
      try {
        const thumbnail = await ThumbnailGenerator.generateThumbnail(path);
        newThumbnails[path] = thumbnail;
        
        // ダウンロード用のファイル名を生成
        const fileName = ThumbnailGenerator.generateThumbnailFileName(path);
        
        // 自動ダウンロード（publicフォルダーに手動で配置する用）
        ThumbnailGenerator.downloadThumbnail(thumbnail, fileName);
        
        // 生成完了したものをリアルタイムで更新
        setThumbnails(prev => ({
          ...prev,
          [path]: thumbnail
        }));
      } catch (error) {
        newThumbnails[path] = '/placeholder-avatar.png';
      }
    }
    
    setProgress(100);
    setCurrentGenerating('');
    setGenerating(false);
    
    // ローカルストレージに保存
    ThumbnailGenerator.saveThumbnailsToStorage(newThumbnails);
  };

  // 特定のサムネイルを再生成
  const regenerateThumbnail = async (vrmPath: string) => {
    try {
      const thumbnail = await ThumbnailGenerator.generateThumbnail(vrmPath);
      
      // ダウンロード用のファイル名を生成
      const fileName = ThumbnailGenerator.generateThumbnailFileName(vrmPath);
      
      // 自動ダウンロード（publicフォルダーに手動で配置する用）
      ThumbnailGenerator.downloadThumbnail(thumbnail, fileName);
      
      const newThumbnails = { ...thumbnails, [vrmPath]: thumbnail };
      setThumbnails(newThumbnails);
      ThumbnailGenerator.saveThumbnailsToStorage(newThumbnails);
    } catch (error) {
    }
  };

  // サムネイルをクリア
  const clearThumbnails = () => {
    setThumbnails({});
    localStorage.removeItem('vrm-thumbnails');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">サムネイル管理</h2>
      
      {/* 使用方法の説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">📁 ダウンロードしたサムネイルの配置方法</h3>
        <p className="text-blue-700 text-sm mb-2">
          サムネイル生成後、自動的にダウンロードされるPNGファイルを以下のフォルダーに配置してください：
        </p>
        <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
          /public/vrm-models/thumbnails/
        </code>
        <p className="text-blue-600 text-xs mt-2">
          例: avatar-female-01.png → public/vrm-models/thumbnails/avatar-female-01.png
        </p>
      </div>
      
      {/* 操作ボタン */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={generateAllThumbnails}
          disabled={generating}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {generating ? '生成中...' : '全サムネイル生成'}
        </button>
        
        <button
          onClick={clearThumbnails}
          className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          サムネイルクリア
        </button>
      </div>

      {/* 進捗表示 */}
      {generating && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">生成中: {currentGenerating}</span>
            <span className="text-sm text-black">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* サムネイル一覧 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {AVATAR_LIST.map((avatar) => (
          <div key={avatar.id} className="border rounded-lg p-4">
            <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
              {thumbnails[avatar.vrmPath] ? (
                <img
                  src={thumbnails[avatar.vrmPath]}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-black">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            <h3 className="font-medium text-sm mb-2">{avatar.name}</h3>
            <p className="text-xs text-black mb-2">{avatar.id}</p>
            
            {/* public フォルダーの状態表示 */}
            <div className="flex items-center mb-2">
              <span className={`text-xs px-2 py-1 rounded ${
                publicThumbnails[avatar.vrmPath] 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {publicThumbnails[avatar.vrmPath] ? '✓ Public配置済み' : '📁 Public未配置'}
              </span>
            </div>
            
            <button
              onClick={() => regenerateThumbnail(avatar.vrmPath)}
              className="w-full px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              再生成
            </button>
          </div>
        ))}
      </div>

      {/* 統計情報 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">統計</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-black">総アバター数:</span>
            <span className="ml-2 font-medium">{AVATAR_LIST.length}</span>
          </div>
          <div>
            <span className="text-black">生成済み:</span>
            <span className="ml-2 font-medium">{Object.keys(thumbnails).length}</span>
          </div>
          <div>
            <span className="text-black">Public配置済み:</span>
            <span className="ml-2 font-medium text-green-600">
              {Object.values(publicThumbnails).filter(Boolean).length}
            </span>
          </div>
          <div>
            <span className="text-black">未配置:</span>
            <span className="ml-2 font-medium text-yellow-600">
              {Object.values(publicThumbnails).filter(v => !v).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}