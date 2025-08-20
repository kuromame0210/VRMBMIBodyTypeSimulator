import { useState, useCallback, useEffect } from 'react';
import { BlendShapeValues, BlendShapeConfig } from '../types/blendshape';
import { FaceFeatures } from '../types/face';
import { BlendShapeConverter } from '../utils/blendshape-converter';

export interface BlendShapeStore {
  // 現在のブレンドシェイプ値
  currentValues: BlendShapeValues;
  
  // 保存されたプリセット
  savedPresets: BlendShapePreset[];
  
  // 設定
  config: BlendShapeConfig;
  
  // 操作メソッド
  updateFromFaceFeatures: (faceFeatures: FaceFeatures) => void;
  updateSingleValue: (shapeName: string, value: number) => void;
  setCurrentValues: (values: BlendShapeValues) => void;
  resetToDefault: () => void;
  savePreset: (name: string) => void;
  loadPreset: (presetId: string) => void;
  deletePreset: (presetId: string) => void;
  exportValues: () => string;
  importValues: (data: string) => boolean;
}

export interface BlendShapePreset {
  id: string;
  name: string;
  values: BlendShapeValues;
  createdAt: Date;
  thumbnail?: string; // Base64画像データ（任意）
}

const STORAGE_KEY = 'mediapipe-blendshape-store';

export function useBlendShapeStore(initialConfig: BlendShapeConfig): BlendShapeStore {
  const [currentValues, setCurrentValues] = useState<BlendShapeValues>({});
  const [savedPresets, setSavedPresets] = useState<BlendShapePreset[]>([]);
  const [config, setConfig] = useState<BlendShapeConfig>(initialConfig);
  const [converter, setConverter] = useState<BlendShapeConverter>(
    new BlendShapeConverter(initialConfig)
  );

  // ローカルストレージからデータを読み込み
  useEffect(() => {
    loadFromStorage();
  }, []);

  // データが変更されたらローカルストレージに保存
  useEffect(() => {
    saveToStorage();
  }, [currentValues, savedPresets]);

  // 設定が変更されたらコンバーターを更新
  useEffect(() => {
    setConverter(new BlendShapeConverter(config));
  }, [config]);

  /**
   * 顔特徴データからブレンドシェイプ値を更新
   */
  const updateFromFaceFeatures = useCallback((faceFeatures: FaceFeatures) => {
    const newValues = converter.convertFaceFeaturesToBlendShapes(faceFeatures);
    setCurrentValues(newValues);
  }, [converter]);

  /**
   * 単一のブレンドシェイプ値を更新
   */
  const updateSingleValue = useCallback((shapeName: string, value: number) => {
    setCurrentValues(prev => ({
      ...prev,
      [shapeName]: value
    }));
  }, []);

  /**
   * デフォルト値にリセット
   */
  const resetToDefault = useCallback(() => {
    setCurrentValues({});
  }, []);

  /**
   * プリセットを保存
   */
  const savePreset = useCallback((name: string) => {
    const preset: BlendShapePreset = {
      id: generateId(),
      name,
      values: { ...currentValues },
      createdAt: new Date()
    };

    setSavedPresets(prev => [...prev, preset]);
  }, [currentValues]);

  /**
   * プリセットを読み込み
   */
  const loadPreset = useCallback((presetId: string) => {
    const preset = savedPresets.find(p => p.id === presetId);
    if (preset) {
      setCurrentValues({ ...preset.values });
    }
  }, [savedPresets]);

  /**
   * プリセットを削除
   */
  const deletePreset = useCallback((presetId: string) => {
    setSavedPresets(prev => prev.filter(p => p.id !== presetId));
  }, []);

  /**
   * 設定とデータをJSON形式でエクスポート
   */
  const exportValues = useCallback(() => {
    const exportData = {
      version: '1.0',
      currentValues,
      savedPresets,
      config,
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(exportData, null, 2);
  }, [currentValues, savedPresets, config]);

  /**
   * JSON形式のデータをインポート
   */
  const importValues = useCallback((data: string): boolean => {
    try {
      const importData = JSON.parse(data);
      
      // バージョンチェック
      if (importData.version !== '1.0') {
        console.warn('未対応のデータバージョンです:', importData.version);
        return false;
      }

      // データを適用
      if (importData.currentValues) {
        setCurrentValues(importData.currentValues);
      }
      
      if (importData.savedPresets) {
        setSavedPresets(importData.savedPresets.map((preset: Record<string, unknown>) => ({
          ...preset,
          createdAt: new Date(preset.createdAt as string | number | Date)
        })));
      }

      if (importData.config) {
        setConfig(importData.config);
      }

      return true;
    } catch (error) {
      console.error('インポートエラー:', error);
      return false;
    }
  }, []);

  /**
   * ローカルストレージから読み込み
   */
  const loadFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.currentValues) setCurrentValues(data.currentValues);
        if (data.savedPresets) {
          setSavedPresets(data.savedPresets.map((preset: Record<string, unknown>) => ({
            ...preset,
            createdAt: new Date(preset.createdAt as string | number | Date)
          })));
        }
        if (data.config) setConfig(data.config);
      }
    } catch (error) {
      console.error('ストレージ読み込みエラー:', error);
    }
  }, []);

  /**
   * ローカルストレージに保存
   */
  const saveToStorage = useCallback(() => {
    try {
      const data = {
        currentValues,
        savedPresets,
        config
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('ストレージ保存エラー:', error);
    }
  }, [currentValues, savedPresets, config]);

  return {
    currentValues,
    savedPresets,
    config,
    updateFromFaceFeatures,
    updateSingleValue,
    setCurrentValues,
    resetToDefault,
    savePreset,
    loadPreset,
    deletePreset,
    exportValues,
    importValues
  };
}

/**
 * ユニークIDを生成
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}