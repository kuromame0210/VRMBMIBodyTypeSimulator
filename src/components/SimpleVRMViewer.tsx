'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import { AvatarData } from '../utils/avatarConfig';
import { calculateBMI } from '../utils/calculations';
import { SavedFaceFeatures, getFaceFeatures } from '../utils/localStorage';
import { BlendShapeConverter } from '../utils/blendshape-converter';
import { BlendShapeConfig } from '../types/blendshape';

// ===== 学術的根拠に基づく体組成推定モジュール =====
// 【保守性】このインポートを削除すれば元の計算ロジックに戻せます
import { 
  estimateBodyComposition, 
  isBodyCompositionFeatureEnabled, 
  isBodyCompositionEstimationValid,
  type BodyCompositionEstimate 
} from '../utils/bodyComposition';

interface SimpleVRMViewerProps {
  avatarData: AvatarData;
  currentBMI: number;
  muscleMass: number; // 入力された筋肉量
  dailySurplusCalories?: number;
  age?: number;
  height?: number;
  faceFeatures?: SavedFaceFeatures;
  onSimulationStateChange?: (isRunning: boolean) => void;
  onSimulationCompletedChange?: (completed: boolean) => void;
  startSimulation?: boolean;
  stopSimulation?: boolean;
  resetSimulation?: boolean;
  showRiskPopup?: boolean;
  riskPercentage?: number;
}

export default function SimpleVRMViewer({ 
  avatarData, 
  currentBMI, 
  muscleMass,
  dailySurplusCalories = 0, 
  age = 25, 
  height = 170,
  faceFeatures,
  onSimulationStateChange,
  onSimulationCompletedChange,
  startSimulation = false,
  stopSimulation = false,
  resetSimulation = false,
  showRiskPopup = false,
  riskPercentage = 0
}: SimpleVRMViewerProps) {
  // 🚨 コンポーネント再初期化検出（重要なデバッグポイント）
  const [componentInitCount, setComponentInitCount] = useState(0);
  
  // VRMPreview方式: BlendShapeターゲット収集
  const collectBlendShapeTargets = useCallback((scene: any) => {
    const targets: Array<{mesh: any, morphTargetInfluences: number[], morphTargetDictionary: Record<string, number>}> = [];
    
    scene.traverse((child: any) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        targets.push({
          mesh: child,
          morphTargetInfluences: child.morphTargetInfluences,
          morphTargetDictionary: child.morphTargetDictionary
        });
      }
    });
    
    return targets;
  }, []);

  useEffect(() => {
    // VRMが変更された時にターゲットをリセット
    setBlendShapeTargets([]);
    setVrmLoaded(false);           // アバター変更時にVRM読み込み状態をリセット
    setInitialFaceApplied(false);  // 顔特徴適用状態もリセット
    isFirstRunRef.current = true;
    
    setComponentInitCount(prev => {
      const newCount = prev + 1;
      if (newCount > 1) {
      } else {
      }
      return newCount;
    });
  }, [avatarData.vrmPath]); // vrmPathが変わった時のみ正常

  const containerRef = useRef<HTMLDivElement>(null);
  const vrmRef = useRef<any>(null);
  const [animationStatus, setAnimationStatus] = useState<string>('ロード中...');
  // ===== Fatness基準値設定 =====
  // 【テスト用】この値を変更することで初期Fatnessレベルを調整可能
  const BASELINE_FATNESS_LEVEL = 2; // 基準レベル（0-10）
  const BASELINE_FATNESS_VALUE = BASELINE_FATNESS_LEVEL / 10; // 0.2 (レベル2)
  
  const [currentFatnessValue, setCurrentFatnessValue] = useState<number>(BASELINE_FATNESS_VALUE);
  const fatnessValueRef = useRef<number>(BASELINE_FATNESS_VALUE);
  
  // fatnessValueの変更をrefにも同期
  useEffect(() => {
    fatnessValueRef.current = currentFatnessValue;
  }, [currentFatnessValue]);
  
  // 3秒ごとのfatness値監視は削除
  
  // dailySurplusCaloriesをカロリー設定タイプに変換
  const getCaloriesType = (dailySurplus: number): '少ない' | '普通' | '多い' => {
    if (dailySurplus < 0) return '少ない';
    if (dailySurplus > 0) return '多い';
    return '普通';
  };

  // ===== カロリー設定ベースのFatness計算関数 =====
  // 【テスト用】この関数でカロリー設定による体型変化を制御
  /**
   * カロリー設定に基づくFatness調整値を計算
   * @param caloriesType カロリー設定（'少ない' | '普通' | '多い'）
   * @param baseFatness 基準Fatnessレベル（通常は BASELINE_FATNESS_VALUE）
   * @returns 調整後のFatness値
   */
  const calculateFatnessForCalories = (
    caloriesType: '少ない' | '普通' | '多い'
  ): number => {
    const FATNESS_ADJUSTMENT = 0.03; // ±0.3レベル相当の変化量
    
    const result = (() => {
      switch (caloriesType) {
        case '少ない': // -100 kcal/日
          return Math.max(0.0, BASELINE_FATNESS_VALUE - FATNESS_ADJUSTMENT); // レベル2 - 0.3 = レベル1.7
        case '普通': // 0 kcal/日
          return BASELINE_FATNESS_VALUE; // 常にレベル2 (0.2)
        case '多い': // +100 kcal/日
          return Math.min(1.0, BASELINE_FATNESS_VALUE + FATNESS_ADJUSTMENT); // レベル2 + 0.3 = レベル2.3
      }
    })();
    
    return result;
  };

  // シミュレーション時間経過による段階的fatness変化計算
  const calculateProgressiveFatnessForSimulation = (
    caloriesType: '少ない' | '普通' | '多い',
    stageIndex: number,
    totalStages: number
  ): number => {
    const baselineFatness = BASELINE_FATNESS_VALUE; // 0.2 (レベル2)
    const progress = stageIndex / (totalStages - 1); // 0から1の進行度

    switch (caloriesType) {
      case '少ない': // レベル2 → レベル0に段階的減少
        const targetMin = 0.0; // レベル0
        return Math.max(targetMin, baselineFatness - (baselineFatness - targetMin) * progress);
        
      case '普通': // レベル2で維持
        return baselineFatness;
        
      case '多い': // レベル2 → レベル10に段階的増加
        const targetMax = 1.0; // レベル10
        return Math.min(targetMax, baselineFatness + (targetMax - baselineFatness) * progress);
    }
  };
  
  const [autoSimulation, setAutoSimulation] = useState<boolean>(false); // 外部制御に変更
  const [simulationMonth, setSimulationMonth] = useState<number>(0);
  const [simulationCompleted, setSimulationCompleted] = useState<boolean>(false); // シミュレーション完了状態
  const animationFrameRef = useRef<number | null>(null);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isExplicitReset = useRef<boolean>(false); // 明示的リセット中フラグ
  const animateToTargetFatnessRef = useRef<((targetValue: number, source: string) => void) | null>(null);
  
  // ===== 3秒間隔ログ機能 (削除予定) =====

  // シミュレーション状態変更ログ
  useEffect(() => {
  }, [autoSimulation]);

  // VRM読み込み状態を管理
  const [vrmLoaded, setVrmLoaded] = useState<boolean>(false);
  const [initialFaceApplied, setInitialFaceApplied] = useState<boolean>(false);
  
  // 顔特徴データを管理
  const [activeFaceFeatures, setActiveFaceFeatures] = useState<SavedFaceFeatures | null>(null);
  
  
  // ログ制御: 初回のみ詳細ログを表示
  const isFirstRunRef = useRef<boolean>(true);
  
  // VRMPreview方式: BlendShapeターゲット管理
  const [blendShapeTargets, setBlendShapeTargets] = useState<Array<{
    mesh: any,
    morphTargetInfluences: number[],
    morphTargetDictionary: Record<string, number>
  }>>([]);

  // VRMPreview方式: BlendShapeターゲットベース顔特徴適用（最適化版）
  const applyFaceBlendShapesOptimized = useCallback((blendShapeValues: Record<string, number>) => {
    if (blendShapeTargets.length === 0) {
      return;
    }
    
    const isFirstRun = isFirstRunRef.current;
    if (isFirstRun) {
      isFirstRunRef.current = false;
    }

    try {
      let appliedCount = 0;
      let totalCount = 0;
      
      // if (isFirstRun) {
      // }
      
      // VRMPreview方式: ターゲットベース適用（重複処理なし）
      blendShapeTargets.forEach((target, targetIdx) => {
        // if (isFirstRun) {
        // }
        
        Object.entries(blendShapeValues).forEach(([shapeName, value]) => {
          totalCount++;
          const targetIndex = target.morphTargetDictionary[shapeName];
          if (targetIndex !== undefined && target.morphTargetInfluences[targetIndex] !== undefined) {
            const previousValue = target.morphTargetInfluences[targetIndex];
            const clampedValue = Math.max(0, Math.min(1, value));
            const changed = Math.abs(clampedValue - previousValue) > 0.001;
            
            if (changed) {
              target.morphTargetInfluences[targetIndex] = clampedValue;
              appliedCount++;
              // if (isFirstRun) {
              // }
            }
          }
        });
      });
      
      // if (isFirstRun) {
      // }
      
    } catch (error) {
      // console.warn('❌ VRMPreview方式顔特徴適用エラー:', error);
    }
  }, [blendShapeTargets]);


  // 顔特徴データをBlendShape値に変換（VRMPreview方式）
  const convertFaceFeaturesToBlendShapes = useCallback((faceData: SavedFaceFeatures) => {
    if (!faceData) return {};
    
    // 🔥 重要！手動調整済みのBlendShape値が保存されている場合は、それを優先使用
    if (faceData.blendShapeValues && Object.keys(faceData.blendShapeValues).length > 0) {
      // BlendShapeログは削除済み
      return { ...faceData.blendShapeValues };
    }
    
    // 手動調整値がない場合のみ、顔特徴から計算
    if (!faceData.features) {
      // 顔特徴データもBlendShape値もない場合
      return {};
    }
    
    // 顔特徴から自動計算中
    const features = faceData.features;
    const blendShapeValues: Record<string, number> = {};
    
    // 口の幅調整
    if (features.mouthWidth !== undefined) {
      const calculatedValue = (features.mouthWidth - 0.3) * 2.5;
      blendShapeValues['Mouth_Wide'] = Math.min(Math.max(calculatedValue, 0), 1.0);
    }
    
    // 目の高さ調整（閉じ具合）
    if (features.eyeHeight !== undefined) {
      const calculatedValue = features.eyeHeight * 8 - 0.2;
      const finalValue = Math.min(Math.max(calculatedValue, 0), 0.3);
      blendShapeValues['Eye_Close'] = finalValue;
      blendShapeValues['Eye_Close_L'] = finalValue;
      blendShapeValues['Eye_Close_R'] = finalValue;
    }
    
    // 鼻の幅調整
    if (features.noseWidth !== undefined) {
      const wideValue = (features.noseWidth - 0.16) * 6;
      const narrowValue = (0.14 - features.noseWidth) * 6;
      blendShapeValues['Nose_Wide'] = Math.min(Math.max(wideValue, 0), 0.8);
      blendShapeValues['Nose_Narrow'] = Math.min(Math.max(narrowValue, 0), 0.8);
    }
    
    // 顎の形状調整
    if (features.jawWidth !== undefined) {
      const sharpValue = (features.jawWidth - 0.3) * 2.5;
      const roundValue = (0.5 - features.jawWidth) * 2.5;
      blendShapeValues['Chin_Sharp'] = Math.min(Math.max(sharpValue, 0), 1.0);
      blendShapeValues['Chin_Round'] = Math.min(Math.max(roundValue, 0), 1.0);
    }
    
    // 自動計算結果を返す
    return blendShapeValues;
  }, []);

  // 旧式applyFaceBlendShapes関数（互換性維持）
  const applyFaceBlendShapes = useCallback((vrm: any, faceData: SavedFaceFeatures) => {
    if (!vrm || !faceData) return;
    
    // VRMPreview方式に変換
    const blendShapeValues = convertFaceFeaturesToBlendShapes(faceData);
    applyFaceBlendShapesOptimized(blendShapeValues);
  }, [convertFaceFeaturesToBlendShapes, applyFaceBlendShapesOptimized]);

  // 開発用デバッグ: 顔特徴BlendShapeクリア関数 - 本番環境では削除すること
  const clearFaceBlendShapes = useCallback((vrm: any) => {
    if (!vrm) return;

    const scene = vrm.scene || vrm.userData?.scene || vrm;
    
    if (scene && scene.traverse) {
      scene.traverse((object: any) => {
        if (object.isSkinnedMesh && object.morphTargetDictionary && object.morphTargetInfluences) {
          // 顔系のBlendShapeをゼロにリセット（体型系は除外）
          Object.keys(object.morphTargetDictionary).forEach(shapeName => {
            // 体型系のBlendShapeは除外
            if (!['fatness', 'fat', 'belly', 'weight'].includes(shapeName)) {
              const shapeIndex = object.morphTargetDictionary[shapeName];
              if (shapeIndex !== undefined) {
                object.morphTargetInfluences[shapeIndex] = 0;
              }
            }
          });
        }
      });
    }
  }, []);

  // 顔特徴データの初期化・更新
  useEffect(() => {
    // プロプスで渡された場合はそれを優先
    if (faceFeatures) {
      setActiveFaceFeatures(faceFeatures);
    } else {
      // ローカルストレージから読み込み
      const savedFeatures = getFaceFeatures();
      setActiveFaceFeatures(savedFeatures);
    }
  }, [faceFeatures]);

  // 顔特徴データ変更時にBlendShapeを再適用
  useEffect(() => {
    if (vrmRef.current && activeFaceFeatures) {
      applyFaceBlendShapes(vrmRef.current, activeFaceFeatures);
    }
  }, [activeFaceFeatures, autoSimulation, applyFaceBlendShapes]);

  // 初期読み込み完了後に顔特徴を確実に適用（最適化済み - 最小遅延）
  useEffect(() => {
    if (vrmLoaded && activeFaceFeatures && !initialFaceApplied && !autoSimulation) {
      
      // 最小遅延で確実に適用（レンダリング完了を待つ最小限の遅延）
      setTimeout(() => {
        if (vrmRef.current) {
          // 一度クリアしてから適用（ON/OFF切り替えと同じ効果）
          clearFaceBlendShapes(vrmRef.current);
          // レンダリング1フレーム待機後に適用
          requestAnimationFrame(() => {
            if (vrmRef.current && activeFaceFeatures) {
              applyFaceBlendShapes(vrmRef.current, activeFaceFeatures);
              setInitialFaceApplied(true);
              // 初期読み込み完了ログは削除（繰り返されるため）
            }
          });
        }
      }, 200); // 1000ms → 200ms に短縮
    }
  }, [vrmLoaded, activeFaceFeatures, initialFaceApplied, autoSimulation, applyFaceBlendShapes]);

  useEffect(() => {
    if (!containerRef.current) return;

    // シーンの生成
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x22C55E);

    // カメラの生成
    const camera = new THREE.PerspectiveCamera(
      30, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      20
    );
    // VRMの正面を見るためのカメラ位置（前方から見る）
    camera.position.set(0.0, 1.0, 4.0);  // Z=4 (前方)
    camera.lookAt(0, 1, 0);               // VRMの中心を見る

    // レンダラーの生成
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // コンテナサイズを取得（最小サイズを保証）
    const width = Math.max(containerRef.current.clientWidth, 300);
    const height = Math.max(containerRef.current.clientHeight, 300);
    
    renderer.setSize(width, height);
    renderer.setClearColor(0x22C55E, 1.0);
    containerRef.current.appendChild(renderer.domElement);

    // ライトの生成
    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1.0, 1.0, 1.0);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // VRM要素の準備
    let currentVrm: any = undefined;
    let currentVrmAnimation: any = undefined;
    let currentMixer: any = undefined;

    // ファイルの読み込み
    function load(url: string) {
      loader.load(
        url,
        // ロード時に呼ばれる
        (gltf) => {
          tryInitVRM(gltf);
          tryInitVRMA(gltf);
        },
        // プログレス時に呼ばれる
        (progress) => {
        },
        // エラー時に呼ばれる
        (error) => {
          console.error('❌ [DEBUG] ファイル読み込みエラー:', error); // デバッグログ追加
        }
      );
    }

    // VRMの読み込み
    function tryInitVRM(gltf: any) {
      const vrm = gltf.userData.vrm;
      if (vrm == null) {
        // VRMでない場合も通常のGLTFとして読み込んでみる
        if (gltf.scene) {
          currentVrm = { scene: gltf.scene, userData: gltf };
          vrmRef.current = currentVrm;
          scene.add(gltf.scene);
          
          // 現在の値を保持（自動リセットしない）
          const targetFatness = currentFatnessValue;
          updateFatnessBlendShape(targetFatness, `VRM読み込み完了: 現在値保持 (Lv.${Math.round(targetFatness * 10)})`);
          
          // BlendShapeターゲット収集
          const targets = collectBlendShapeTargets(gltf.scene);
          setBlendShapeTargets(targets);
          
          // VRMPreview方式: 顔特徴BlendShapeを即座適用（最適化済み）
          if (activeFaceFeatures) {
            // ターゲット収集後に遅延適用
            setTimeout(() => {
              applyFaceBlendShapes(currentVrm, activeFaceFeatures);
            }, 100);
          }
          
          tryInitGLTFAnimations(gltf);
          setAnimationStatus('GLTFファイル読み込み完了');
          
          // 読み込み完了状態を最後に設定（顔特徴適用完了後）
          setVrmLoaded(true);
        }
        return;
      }
      currentVrm = vrm;
      vrmRef.current = vrm;
      scene.add(vrm.scene);
      
      VRMUtils.rotateVRM0(vrm);
      
      // 現在の値を保持（自動リセットしない）
      const targetFatness = currentFatnessValue;
      updateFatnessBlendShape(targetFatness, `VRM読み込み完了: 現在値保持 (Lv.${Math.round(targetFatness * 10)})`);
      
      // BlendShapeターゲット収集
      const targets = collectBlendShapeTargets(vrm.scene);
      setBlendShapeTargets(targets);
      
      // VRMPreview方式: 顔特徴BlendShapeを即座適用（最適化済み）
      if (activeFaceFeatures) {
        // ターゲット収集後に遅延適用
        setTimeout(() => {
          applyFaceBlendShapes(currentVrm, activeFaceFeatures);
        }, 100);
      }
      
      initAnimationClip();
      setAnimationStatus('VRM読み込み完了');
      
      // 読み込み完了状態を最後に設定（顔特徴適用完了後）
      setVrmLoaded(true);
    }

    // 標準glTFアニメーションの読み込み
    function tryInitGLTFAnimations(gltf: any) {
      if (gltf.animations && gltf.animations.length > 0) {
        const firstAnimation = gltf.animations[0];
        if (firstAnimation) {
          try {
            currentMixer = new THREE.AnimationMixer(gltf.scene);
            const action = currentMixer.clipAction(firstAnimation);
            
            action.reset();
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.clampWhenFinished = false;
            action.enabled = true;
            action.play();
            
            setAnimationStatus(`アニメーション再生中`);
          } catch (error) {
            // console.error('❌ GLTFアニメーション初期化エラー:', error);
            setAnimationStatus('アニメーション初期化失敗');
          }
        }
      }
    }

    // VRMAの読み込み
    function tryInitVRMA(gltf: any) {
      const vrmAnimations = gltf.userData.vrmAnimations;
      if (vrmAnimations == null) {
        return;
      }
      currentVrmAnimation = vrmAnimations[0] ?? null;
      setAnimationStatus('アニメーション読み込み完了');
      initAnimationClip();
    }

    // アニメーションクリップの初期化
    function initAnimationClip() {
      if (currentVrm && currentVrmAnimation) {
        const hasVRMMeta = !!(currentVrm.meta || currentVrm.userData?.vrm?.meta);
        
        if (!hasVRMMeta) {
          setAnimationStatus('VRMアニメーション未対応（GLBファイル）');
          return;
        }
        
        try {
          const scene = currentVrm.scene || currentVrm;
          currentMixer = new THREE.AnimationMixer(scene);
          const clip = createVRMAnimationClip(currentVrmAnimation, currentVrm);
          const action = currentMixer.clipAction(clip);
          
          action.reset();
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.clampWhenFinished = false;
          action.enabled = true;
          action.play();
          
          setAnimationStatus(`アニメーション再生中`);
        } catch (error) {
          // console.error('❌ アニメーション初期化エラー:', error);
          setAnimationStatus('アニメーション初期化失敗');
        }
      }
    }

    // ===== カロリー設定ベースの相対的Fatness更新システム =====
    
    // カロリー設定ベース: fatnessブレンドシェイプ更新（新設計）
    function updateFatnessForCalories(vrm: any, caloriesType: '少ない' | '普通' | '多い') {
      if (!vrm) return;
      
      const targetFatness = calculateFatnessForCalories(caloriesType);
      
      // Fatness更新処理

      // VRMオブジェクトの場合とGLTFオブジェクトの場合で処理を分岐
      const scene = vrm.scene || vrm.userData?.scene || vrm;
      
      // fatnessブレンドシェイプを探して適用
      if (scene && scene.traverse) {
        scene.traverse((object: any) => {
          if (object.isSkinnedMesh && object.morphTargetDictionary) {
            const fatnessNames = ['fatness', 'fat', 'belly', 'weight'];
            
            for (const name of fatnessNames) {
              if (object.morphTargetDictionary[name] !== undefined) {
                const index = object.morphTargetDictionary[name];
                if (object.morphTargetInfluences) {
                  object.morphTargetInfluences[index] = targetFatness;
                  break;
                }
              }
            }
          }
        });
      }
    }

    // 【レガシー対応】古いBMIベース関数（互換性維持用）
    function updateFatnessForBMI(vrm: any, bmi: number) {
      // 新システムでは'普通'設定として処理
      updateFatnessForCalories(vrm, '普通');
    }



    // BMI + 顔特徴の統合BlendShape適用関数
    function applyAllBlendShapes(vrm: any, bmi: number, faceData?: SavedFaceFeatures) {
      if (!vrm) return;
      
      // 1. BMI → fatness適用 (既存)
      updateFatnessForBMI(vrm, bmi);
      
      // 2. 顔特徴 → 顔パーツBlendShape適用
      if (faceData) {
        applyFaceBlendShapes(vrm, faceData);
      }
    }
    
    // ローダーの準備
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

    // 通常: 選択されたアバターのVRMファイルを使用
    load(avatarData.vrmPath);
    
    // GLBファイルの場合は外部VRMAファイルは不要（内蔵アニメーション使用）
    // VRMファイルの場合のみ外部VRMAファイルをロード
    if (!avatarData.vrmPath.endsWith('.glb')) {
      load('/vrm-models/mixamoAnimation.vrma');
    }

    // clockの準備
    const clock = new THREE.Clock();
    clock.start();

    // フレーム毎に呼ばれる
    const update = () => {
      requestAnimationFrame(update);

      const deltaTime = clock.getDelta();
      if (currentMixer) {
        currentMixer.update(deltaTime);
      }
      if (currentVrm && typeof currentVrm.update === 'function') {
        currentVrm.update(deltaTime);
      }

      renderer.render(scene, camera);
    };
    update();

    // BMI変更時の更新（統合BlendShape制御）
    const handleBMIChange = () => {
      if (currentVrm && !autoSimulation) {
        applyAllBlendShapes(currentVrm, currentBMI, activeFaceFeatures || undefined);
      }
    };

    // BMI変更を監視
    // handleBMIChange(); // シミュレーション中の干渉を防ぐため無効化

    // リサイズハンドラー追加
    const handleResize = () => {
      if (containerRef.current && renderer && camera) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        // サイズが0の場合は処理しない
        if (width > 0 && height > 0) {
          renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
      }
    };

    // ResizeObserverでコンテナサイズ変更を監視
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(containerRef.current);
    }

    // 初期リサイズ実行（少し遅延）
    setTimeout(handleResize, 100);

    // クリーンアップ
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };

  }, [avatarData.vrmPath]);

  // fatness値更新用の共通関数（デバッグ強化版 + お腹周りスケール調整）
  const updateFatnessBlendShape = (fatnessValue: number, source: string) => {
    if (vrmRef.current) {
      const scene = vrmRef.current.scene || vrmRef.current.userData?.scene || vrmRef.current;
      
      if (scene && scene.traverse) {
        scene.traverse((object: any) => {
          if (object.isSkinnedMesh && object.morphTargetDictionary) {
            const fatnessNames = ['fatness', 'fat', 'belly', 'weight'];
            
            for (const name of fatnessNames) {
              if (object.morphTargetDictionary[name] !== undefined) {
                const index = object.morphTargetDictionary[name];
                if (object.morphTargetInfluences) {
                  const oldValue = object.morphTargetInfluences[index];
                  object.morphTargetInfluences[index] = fatnessValue;
                  
                  // リセット現象検出（重要なもののみ）
                  if (Math.abs(oldValue - fatnessValue) > 0.001) {
                    const isResetPhenomenon = (oldValue > fatnessValue) && autoSimulation;
                    // レベル2(0.2)への戻りを特に監視
                    const isLevel2Reset = Math.abs(fatnessValue - 0.2) < 0.001;
                    if (isResetPhenomenon || isLevel2Reset) {
                    }
                  }
                  break;
                }
              }
            }
          }
        });
      }
      
      // ===== お腹周りスケール調整機能 (削除予定) =====
      // fatness値が低い時（痩せる時）にお腹周りを追加で細くする
      const vrm = vrmRef.current.userData?.vrm || vrmRef.current;
      if (vrm && vrm.humanoid) {
        try {
          // VRMのhumanoidボーンを取得
          const spine = vrm.humanoid.getBoneNode('spine');
          const chest = vrm.humanoid.getBoneNode('chest'); 
          const hips = vrm.humanoid.getBoneNode('hips');
          
          // fatness値に基づいてお腹周りのスケールを計算
          // fatness 0.0 → より細く、fatness 1.0 → 通常
          const bellyScaleX = Math.max(0.7, 1.0 - (0.2 - fatnessValue) * 1.5); // 最小0.7倍
          const bellyScaleZ = Math.max(0.8, 1.0 - (0.2 - fatnessValue) * 1.0); // 最小0.8倍
          
          
          // 各ボーンにスケール適用
          if (spine) {
            spine.scale.setX(bellyScaleX);
            spine.scale.setZ(bellyScaleZ);
          }
          if (hips) {
            hips.scale.setX(bellyScaleX);
            hips.scale.setZ(bellyScaleZ);
          }
          
        } catch (error) {
          console.warn('❌ [DEBUG] お腹スケール調整エラー:', error);
        }
      }
      // ===== お腹周りスケール調整機能終了 =====
    }
  };

  // スムーズなアニメーション用の補間関数（重複防止機能付き）
  const animateToTargetFatness = useCallback((targetValue: number, source: string) => {
    // レベル2(0.2)への変更を特に監視
    if (Math.abs(targetValue - 0.2) < 0.001 && autoSimulation) {
      // console.trace('呼び出し元のスタックトレース:');
    }

    // 同値への無意味なアニメーションを防止
    if (Math.abs(currentFatnessValue - targetValue) < 0.001) {
      return;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Three.jsの実際の値も確認
    let actualThreeJSValue = 0;
    if (vrmRef.current) {
      const scene = vrmRef.current.scene || vrmRef.current.userData?.scene || vrmRef.current;
      if (scene && scene.traverse) {
        scene.traverse((object: any) => {
          if (object.isSkinnedMesh && object.morphTargetDictionary) {
            const fatnessNames = ['fatness', 'fat', 'belly', 'weight'];
            for (const name of fatnessNames) {
              if (object.morphTargetDictionary[name] !== undefined) {
                const index = object.morphTargetDictionary[name];
                if (object.morphTargetInfluences) {
                  actualThreeJSValue = object.morphTargetInfluences[index];
                  break;
                }
              }
            }
          }
        });
      }
    }
    
    // React Stateではなく、Three.jsの実際の値を開始値にする
    let actualStartValue = currentFatnessValue;
    if (actualThreeJSValue > 0) {
      actualStartValue = actualThreeJSValue;
    }
    const startValue = actualStartValue;
    
    const startTime = performance.now();
    const duration = 800;

    // React StateとThree.js値の乖離を検出（重要）
    // if (Math.abs(currentFatnessValue - actualThreeJSValue) > 0.01) {
    // }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetValue - startValue) * easeProgress;
      
      // 中間値がレベル2(0.2)付近になる場合を検出
      if (Math.abs(currentValue - 0.2) < 0.05 && autoSimulation) {
      }
      
      // リセット現象検出
      if (progress < 0.05 && currentValue > startValue && source.includes('痩せる')) {
      }
      
      setCurrentFatnessValue(currentValue);
      updateFatnessBlendShape(currentValue, source);
      
      // アニメーション中も顔特徴を再適用
      if (activeFaceFeatures && vrmRef.current) {
        applyFaceBlendShapes(vrmRef.current, activeFaceFeatures);
      }
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
        // アニメーション完了時に確実に最終値を設定
        setCurrentFatnessValue(targetValue);
        updateFatnessBlendShape(targetValue, source + " (完了)");
        // アニメーション完了時も顔特徴を再適用
        if (activeFaceFeatures && vrmRef.current) {
          applyFaceBlendShapes(vrmRef.current, activeFaceFeatures);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [currentFatnessValue]);

  // animateToTargetFatnessのrefを更新
  useEffect(() => {
    animateToTargetFatnessRef.current = animateToTargetFatness;
  }, [animateToTargetFatness]);

  // BMI分類を判定する関数
  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return '痩せ';
    if (bmi < 25) return '普通';
    if (bmi < 30) return '軽度肥満';
    return '肥満';
  };

  // 体重を計算（BMIと身長から）
  const getWeight = (bmi: number, heightCm: number): number => {
    const heightM = heightCm / 100;
    return bmi * (heightM * heightM);
  };

  // 体脂肪率を推定（Deurenberg式）
  const getBodyFatPercentage = (bmi: number, ageYears: number, gender: 'male' | 'female'): number => {
    if (gender === 'male') {
      return Math.max(0, (1.20 * bmi) + (0.23 * ageYears) - 16.2);
    } else {
      return Math.max(0, (1.20 * bmi) + (0.23 * ageYears) - 5.4);
    }
  };

  // 筋肉量を推定（Janssen式）
  const getMuscleMass = (weight: number, ageYears: number, gender: 'male' | 'female'): number => {
    if (gender === 'male') {
      return weight * Math.max(0.1, 0.407 - (0.003 * ageYears));
    } else {
      return weight * Math.max(0.1, 0.334 - (0.002 * ageYears));
    }
  };

  // 脂肪量を計算
  const getFatMass = (weight: number, bodyFatPercentage: number): number => {
    return (weight * bodyFatPercentage) / 100;
  };

  // ===== 学術的根拠に基づく体組成計算 =====
  // 【保守性】元の計算ロジックに戻すには、この部分を元のコードに置き換えてください
  
  /**
   * 学術的根拠に基づく体組成データを計算（シミュレーション対応）
   * 
   * 【使用する学術文献】
   * - Deurenberg et al. (1991): 体脂肪率推定
   * - Janssen et al. (2000): 筋量推定
   * 
   * 【元の実装との違い】
   * - 体脂肪率: 同じDeurenberg式（変更なし）
   * - 筋量: 独自式 → Janssen式（学術的根拠あり）
   * - 透明性: 計算根拠・制限事項を明記
   */
  const getBodyComposition = (bmi: number, ageYears: number) => {
    const weight = getWeight(bmi, height);
    
    // 学術的根拠に基づく体組成推定モジュールを使用
    if (isBodyCompositionFeatureEnabled()) {
      const bodyCompositionInput = {
        bmi,
        age: ageYears,
        height: height,
        isMale: avatarData.gender === 'male'
      };
      
      if (isBodyCompositionEstimationValid(bodyCompositionInput)) {
        const estimation = estimateBodyComposition(bodyCompositionInput);
        
        // 学術的体組成計算ログは削除済み
        
        return {
          weight: weight,
          bodyFatPercentage: estimation.estimatedBodyFatPercentage,
          muscleMass: estimation.estimatedMuscleMass,
          fatMass: estimation.estimatedFatMass
        };
      }
    }
    
    // フォールバック: 元の計算ロジック
    // （体組成推定モジュールが無効または失敗した場合）
    // フォールバック: 元の計算ロジックを使用
    
    const bodyFatPercentage = getBodyFatPercentage(bmi, ageYears, avatarData.gender);
    const muscleMass = getMuscleMass(weight, ageYears, avatarData.gender);
    const fatMass = getFatMass(weight, bodyFatPercentage);
    
    return {
      weight: weight,
      bodyFatPercentage: bodyFatPercentage,
      muscleMass: muscleMass,
      fatMass: fatMass
    };
  };

  // 現在の体組成データを計算
  const getCurrentBodyComposition = () => {
    if (autoSimulation) {
      const simulatedBMI = getSimulatedBMI(simulationMonth);
      const simulatedAge = age + Math.floor(simulationMonth / 12);
      return getBodyComposition(simulatedBMI, simulatedAge);
    } else {
      return getBodyComposition(currentBMI, age);
    }
  };

  // 表示用の年齢を取得
  const getDisplayAge = () => {
    return autoSimulation ? age + Math.floor(simulationMonth / 12) : age;
  };

  // 表示用のBMIを取得
  const getDisplayBMI = () => {
    return autoSimulation ? getSimulatedBMI(simulationMonth) : currentBMI;
  };

  // BMIベースのfatnessレベルを計算（BMI 20.8をLevel 5に設定）
  const calculateBMIBasedFatness = (bmi: number): number => {
    if (bmi < 15) {
      return 0; // 極痩せ
    } else if (bmi < 16.5) {
      return 1; // 痩せ
    } else if (bmi < 18) {
      return 2; // 痩せ寄り
    } else if (bmi < 19.5) {
      return 3; // 標準下位
    } else if (bmi < 20.2) {
      return 4; // 標準中位下
    } else if (bmi < 21.5) {
      return 5; // 標準中位（BMI 20.8はここ）
    } else if (bmi < 23) {
      return 6; // 標準上位
    } else if (bmi < 25) {
      return 7; // 軽度肥満
    } else if (bmi < 28) {
      return 8; // 中度肥満
    } else if (bmi < 32) {
      return 9; // 重度肥満
    } else {
      return 10; // 極重度肥満
    }
  };


  // シミュレーション用のタイムラインを指定された値に基づいて生成
  const generateSimulationTimeline = () => {
    // 提供された仕様に基づく固定値
    if (dailySurplusCalories === -100) {
      // 「少ない」の場合：Level 5からLevel 0まで減少
      const calculateBMIReduction = (months: number) => {
        // Level 5 (BMI 20.8) からLevel 0 (BMI 15未満) まで減少
        const targetMinBMI = 14.5; // Level 0に到達する最終BMI
        const maxReduction = currentBMI - targetMinBMI; // 約6.3BMI減少
        const normalizedTime = months / 120; // 0-1に正規化
        // 対数関数でスムーズな減少カーブ
        return maxReduction * Math.log(normalizedTime * 19 + 1) / Math.log(20);
      };
      
      return [
        { months: 0, bmi: currentBMI, totalCalories: 0, description: '現在' },
        { months: 1, bmi: currentBMI - calculateBMIReduction(1), totalCalories: -3000, description: '1ヶ月後' },
        { months: 12, bmi: currentBMI - calculateBMIReduction(12), totalCalories: -36500, description: '1年後' },
        { months: 36, bmi: currentBMI - calculateBMIReduction(36), totalCalories: -109500, description: '3年後' },
        { months: 60, bmi: currentBMI - calculateBMIReduction(60), totalCalories: -182500, description: '5年後' },
        { months: 120, bmi: currentBMI - calculateBMIReduction(120), totalCalories: -365000, description: '10年後' }
      ];
    } else if (dailySurplusCalories === 0) {
      // 「普通」の場合：BMI維持（わずかな変動のみ）
      return [
        { months: 0, bmi: currentBMI, totalCalories: 0, description: '現在' },
        { months: 1, bmi: currentBMI, totalCalories: 0, description: '1ヶ月後' },
        { months: 12, bmi: currentBMI + 0.1, totalCalories: 1800, description: '1年後' },
        { months: 36, bmi: currentBMI + 0.3, totalCalories: 5400, description: '3年後' },
        { months: 60, bmi: currentBMI + 0.5, totalCalories: 9000, description: '5年後' },
        { months: 120, bmi: currentBMI + 1.0, totalCalories: 18000, description: '10年後' }
      ];
    } else if (dailySurplusCalories === 100) {
      // 「多い」の場合：指数関数的増加（初期は緩やか、後期は急激）
      const calculateBMIIncrease = (months: number) => {
        // 指数関数による自然な増加曲線 y = a * (e^(bx) - 1)
        const maxIncrease = 15; // 最大15BMI増加
        const normalizedTime = months / 120; // 0-1に正規化
        const exponentialFactor = 1.5; // 指数の強さ
        return maxIncrease * (Math.exp(normalizedTime * exponentialFactor) - 1) / (Math.exp(exponentialFactor) - 1);
      };
      
      return [
        { months: 0, bmi: currentBMI, totalCalories: 0, description: '現在' },
        { months: 1, bmi: Math.min(50, currentBMI + calculateBMIIncrease(1)), totalCalories: 3000, description: '1ヶ月後' },
        { months: 12, bmi: Math.min(50, currentBMI + calculateBMIIncrease(12)), totalCalories: 36500, description: '1年後' },
        { months: 36, bmi: Math.min(50, currentBMI + calculateBMIIncrease(36)), totalCalories: 109500, description: '3年後' },
        { months: 60, bmi: Math.min(50, currentBMI + calculateBMIIncrease(60)), totalCalories: 182500, description: '5年後' },
        { months: 120, bmi: Math.min(50, currentBMI + calculateBMIIncrease(120)), totalCalories: 365000, description: '10年後' }
      ];
    }
    
    // フォールバック
    return [{ months: 0, bmi: currentBMI, totalCalories: 0, description: '現在' }];
  };
  
  const simulationTimeline = generateSimulationTimeline();
  
  // ===== カロリー設定変更時のFatness自動更新 =====
  // 【テスト用】この処理でカロリー設定に応じた体型変化を実現
  useEffect(() => {
    if (vrmRef.current && !autoSimulation && !simulationCompleted) {
      const caloriesType = getCaloriesType(dailySurplusCalories);
      const targetFatness = calculateFatnessForCalories(caloriesType);
      
      // アニメーションでfatnessを更新
      animateToTargetFatness(targetFatness, `カロリー設定変更: ${caloriesType} (${dailySurplusCalories} kcal/日)`);
    }
  }, [dailySurplusCalories, autoSimulation, vrmRef.current, simulationCompleted]);


  // 現在のシミュレーション月に基づいてBMIを補間計算
  const getSimulatedBMI = (month: number): number => {
    if (month === 0) return currentBMI;
    
    // タイムライン上の前後の点を見つけて補間
    let beforePoint = simulationTimeline[0];
    let afterPoint = simulationTimeline[simulationTimeline.length - 1];
    
    for (let i = 0; i < simulationTimeline.length - 1; i++) {
      if (month >= simulationTimeline[i].months && month <= simulationTimeline[i + 1].months) {
        beforePoint = simulationTimeline[i];
        afterPoint = simulationTimeline[i + 1];
        break;
      }
    }
    
    // 最後の点を超えた場合は最後の値を返す
    if (month >= simulationTimeline[simulationTimeline.length - 1].months) {
      return simulationTimeline[simulationTimeline.length - 1].bmi;
    }
    
    // 線形補間
    const progress = (month - beforePoint.months) / (afterPoint.months - beforePoint.months);
    const interpolatedBMI = beforePoint.bmi + (afterPoint.bmi - beforePoint.bmi) * progress;
    
    return interpolatedBMI;
  };


  // 自動リセット機能を無効化（手動リセットのみに限定）
  // useEffect(() => {
  //   if (!autoSimulation && 
  //       vrmRef.current && 
  //       simulationMonth === 0 && 
  //       vrmLoaded &&
  //       !isExplicitReset.current) {  // 明示的なリセット中は実行しない
  //     // 初期状態では常に基準レベル（fatness BASELINE_FATNESS_VALUE）を保持
  //     animateToTargetFatness(BASELINE_FATNESS_VALUE, `初期値レベル${BASELINE_FATNESS_LEVEL}を保持`);
  //   }
  // }, [autoSimulation, simulationMonth, vrmLoaded]);

  // 中央集権的なリセット処理（重複防止機能付き）
  const executeReset = useCallback((reason: string, delay: number = 0) => {
    isExplicitReset.current = true;
    
    setTimeout(() => {
      setSimulationMonth(0);
      setCurrentStageIndex(0);
      setSimulationCompleted(false); // ★完了状態もリセット★
      if (animateToTargetFatnessRef.current) {
        animateToTargetFatnessRef.current(BASELINE_FATNESS_VALUE, reason); // 基準値に戻す
      }
      
      // 少し遅れてフラグをクリア
      setTimeout(() => {
        isExplicitReset.current = false;
      }, 100);
    }, delay);
  }, []);

  // 段階的な時間軸定義
  const timeStages = [1, 12, 36, 60, 120]; // 1ヶ月後、1年後、3年後、5年後、10年後
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [manualStop, setManualStop] = useState<boolean>(false);

  // 外部からのシミュレーション開始制御（自動リセットなし）
  useEffect(() => {
    if (startSimulation && !autoSimulation) {
      setSimulationCompleted(false); // 完了状態のみリセット
      setAutoSimulation(true); // シミュレーション開始
    }
  }, [startSimulation, autoSimulation]);

  // 外部からのシミュレーション停止制御（自動リセットなし）
  useEffect(() => {
    if (stopSimulation && autoSimulation) {
      // シミュレーション実行中の中止のみ処理
      setManualStop(true);
      setAutoSimulation(false);
      // 完了後の自動リセットは削除（手動リセットのみ）
    }
  }, [stopSimulation, autoSimulation]);

  // 手動リセット専用制御（リセットボタン押下時のみ）
  useEffect(() => {
    if (resetSimulation) {
      executeReset(`手動リセットボタン: 初期値復帰`, 200);
    }
  }, [resetSimulation, executeReset]);

  // シミュレーション状態変更を親コンポーネントに通知
  useEffect(() => {
    if (onSimulationStateChange) {
      onSimulationStateChange(autoSimulation);
    }
  }, [autoSimulation, onSimulationStateChange]);

  // シミュレーション完了状態変更を親コンポーネントに通知
  useEffect(() => {
    if (onSimulationCompletedChange) {
      onSimulationCompletedChange(simulationCompleted);
    }
  }, [simulationCompleted, onSimulationCompletedChange]);

  // manualStop状態をクリア（自動リセットは無効化）
  useEffect(() => {
    if (!autoSimulation && manualStop) {
      setManualStop(false); // フラグのみクリア、リセットは手動のみ
    }
  }, [autoSimulation, manualStop]);

  // 自動シミュレーション処理
  useEffect(() => {
    if (autoSimulation && vrmLoaded && vrmRef.current) {
      
      const interval = setInterval(() => {
        setCurrentStageIndex(prevIndex => {
          const nextIndex = prevIndex + 1;
          
          // 最後のステージ（10年後）で終了
          if (nextIndex >= timeStages.length) {
            setAutoSimulation(false);
            setSimulationCompleted(true); // ★完了状態に設定★
            // ★自動リセットは行わず、ユーザーの明示的な操作を待つ★
            return timeStages.length - 1;
          }
          
          const targetMonth = timeStages[nextIndex];
          
          setSimulationMonth(targetMonth);
          
          // 新しいステージのBMIを計算してfatnessを更新（時間経過による段階的変化）
          const simulatedBMI = getSimulatedBMI(targetMonth);
          const caloriesType = getCaloriesType(dailySurplusCalories);
          const fatnessValue = calculateProgressiveFatnessForSimulation(caloriesType, nextIndex, timeStages.length);
          
          const stageDescription = targetMonth === 1 ? '1ヶ月後' : 
                                  targetMonth === 12 ? '1年後' : 
                                  targetMonth === 36 ? '3年後' : 
                                  targetMonth === 60 ? '5年後' : '10年後';
          
          
          // デバッグ: アニメーション開始前の状態確認
          
          setTimeout(() => {
            animateToTargetFatness(fatnessValue, `${stageDescription}: BMI ${simulatedBMI.toFixed(1)}`);
          }, 100);
          
          return nextIndex;
        });
      }, 3000);
      
      simulationTimerRef.current = interval;
      
      return () => {
        if (simulationTimerRef.current) {
          clearInterval(simulationTimerRef.current);
        }
      };
    }
  }, [autoSimulation, vrmLoaded]);


  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full min-h-[300px] sm:min-h-[400px]" />
      
      {/* 疾患リスク表示（アバター右横・吹き出し風） */}
      {showRiskPopup && (
        <div className="absolute top-1/2 right-8 transform -translate-y-1/2 z-10">
          {/* 吹き出しメイン */}
          <div className="relative bg-white text-black px-4 py-3 rounded-lg shadow-lg border border-gray-300 min-w-[120px]">
            <div className="text-center">
              <div className="text-sm font-bold mb-1">
                疾患リスク
              </div>
              <div className="text-xl font-bold">
                {riskPercentage}%
              </div>
            </div>
            {/* 吹き出しの三角形（左向き） */}
            <div className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2">
              <div className="w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-r-6 border-r-white"></div>
            </div>
          </div>
        </div>
      )}
      
      {/* シンプルなステータス表示 */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded text-xs max-w-xs">
        <p>年齢: {getDisplayAge()}歳 {autoSimulation && `(${simulationMonth === 1 ? '1ヶ月後' : simulationMonth === 12 ? '1年後' : simulationMonth === 36 ? '3年後' : simulationMonth === 60 ? '5年後' : simulationMonth === 120 ? '10年後' : '現在'})`}</p>
        <p>BMI: {getDisplayBMI().toFixed(1)} ({getBMICategory(getDisplayBMI())})</p>
        <p>筋量: {muscleMass.toFixed(1)}kg</p>
        {/* <p>脂肪量: {getCurrentBodyComposition().fatMass.toFixed(1)}kg</p> */}
        <p>Fatness: {currentFatnessValue.toFixed(3)} (Lv.{Math.round(currentFatnessValue * 10)})</p>
        {autoSimulation && (
          <p style={{fontSize: '10px', color: '#ffff99'}}>
            Debug: {currentBMI.toFixed(1)} → {getSimulatedBMI(simulationMonth).toFixed(1)} → Lv.{calculateBMIBasedFatness(getSimulatedBMI(simulationMonth))}
          </p>
        )}
      </div>



    </div>
  );
}