import React, { useRef, useEffect, useState } from 'react';
import { FaceFeatures } from '@/types/face';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { getDefaultAvatar } from '@/utils/avatarConfig';

// WSL準拠: BlendShapeターゲット管理型定義
interface BlendShapeTarget {
  mesh: THREE.Mesh;
  morphTargetInfluences: number[];
  morphTargetDictionary: Record<string, number>;
}

interface VRMPreviewProps {
  faceFeatures: FaceFeatures | null;
  className?: string;
  manualBlendShapeValues?: Record<string, number>;
  onAvailableShapesChange?: (shapes: string[]) => void;
  avatarId?: string;
}

export default function VRMPreview({ 
  faceFeatures, 
  className = "w-full h-full",
  manualBlendShapeValues,
  onAvailableShapesChange,
  avatarId
}: VRMPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const timeoutIdsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableShapes, setAvailableShapes] = useState<string[]>([]);
  
  // WSL準拠: BlendShapeターゲット管理
  const [blendShapeTargets, setBlendShapeTargets] = useState<BlendShapeTarget[]>([]);

  // リサイズハンドラー
  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current && containerRef.current && cameraRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const width = containerRect.width || 400;
        const height = containerRect.height || 400;
        
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // ページ離脱時の緊急クリーンアップ
    const handleBeforeUnload = () => {
      if (rendererRef.current) {
        try {
          const gl = rendererRef.current.getContext();
          if (gl) {
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
          }
          rendererRef.current.dispose();
        } catch (e) {
          // console.warn('緊急クリーンアップエラー:', e);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      isMountedRef.current = false;
      
      // クリーンアップ
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      
      timeoutIdsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutIdsRef.current.clear();
      
      if (rendererRef.current) {
        const container = containerRef.current;
        const rendererElement = rendererRef.current.domElement;
        
        if (container && rendererElement && container.contains(rendererElement)) {
          try {
            container.removeChild(rendererElement);
          } catch (error) {
            // console.warn('DOM削除エラー:', error);
          }
        }
        
        try {
          // WebGLコンテキストを完全に破棄
          const gl = rendererRef.current.getContext();
          if (gl) {
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) {
              ext.loseContext();
            }
          }
          rendererRef.current.dispose();
        } catch (error) {
          // console.warn('レンダラー破棄エラー:', error);
        }
        rendererRef.current = null;
      }
      
      if (sceneRef.current) {
        try {
          sceneRef.current.clear();
        } catch (error) {
          // console.warn('シーンクリアエラー:', error);
        }
        sceneRef.current = null;
      }
      
      cameraRef.current = null;
      vrmRef.current = null;
    };
  }, []);

  useEffect(() => {
    //   containerExists: !!containerRef.current,
    //   isMounted: isMountedRef.current,
    //   currentIsLoading: isLoading,
    //   hasRenderer: !!rendererRef.current
    // });
    
    if (!containerRef.current || !isMountedRef.current) {
      // console.warn('⚠️ VRM初期化スキップ: containerまたはisMountedが無い');
      return;
    }

    if (rendererRef.current) {
      // console.warn('⚠️ VRM初期化スキップ: 既にレンダラーが存在');
      return;
    }

    const initializeVRM = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        // Three.js基本設定
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000); // FOVを60度に調整
        // 顔メインで首元まで表示
        camera.position.set(0, 1.65, 0.5); // 顔をもっとアップに（カメラを近づける）
        camera.lookAt(0, 1.67, 0); // 顔の中心をもう少し上に
        cameraRef.current = camera;

        // WebGLコンテキスト作成前の検証
        const canvas = document.createElement('canvas');
        const testContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!testContext) {
          throw new Error('WebGLがサポートされていません');
        }
        
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          preserveDrawingBuffer: false, // メモリ使用量を削減
          powerPreference: "default" // 省電力設定
        });
        
        // WSL準拠: 顔専用表示サイズ
        // コンテナのサイズに合わせる
        const container = containerRef.current;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const width = containerRect.width || 400;
          const height = containerRect.height || 400;
          renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        } else {
          renderer.setSize(400, 400);
        }
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;

        if (containerRef.current && isMountedRef.current) {
          containerRef.current.appendChild(renderer.domElement);
        }

        // WSL準拠: 顔専用ライティング設定
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // さらに明るく
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // さらに明るく
        directionalLight.position.set(1, 1, 1); // 顔に近い位置
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        

        // WSL準拠: GLBファイル読み込み初期化
        const loader = new GLTFLoader();
        
        // WSL準拠: 動的なVRMファイル選択
        const selectedVRM = avatarId 
          ? `/vrm-models/${avatarId}.glb`
          : '/vrm-models/f_0.glb';
        
        // WSL準拠: GLBファイルかVRMファイルかで分岐
        const isGLBFile = selectedVRM.endsWith('.glb');
        
        if (!isGLBFile) {
          // VRMファイルの場合のみプラグイン登録
          loader.register((parser) => new VRMLoaderPlugin(parser));
        }
        
        const gltf = await new Promise<any>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('VRM読み込みタイムアウト (10秒)'));
          }, 10000);
          timeoutIdsRef.current.add(timeoutId);
          
          loader.load(
            selectedVRM,
            (result) => {
              clearTimeout(timeoutId);
              timeoutIdsRef.current.delete(timeoutId);
              resolve(result);
            },
            undefined,
            (error) => {
              // console.error('❌ GLTF読み込みエラー:', error);
              clearTimeout(timeoutId);
              timeoutIdsRef.current.delete(timeoutId);
              reject(error);
            }
          );
        });

        if (!isMountedRef.current) return;

        //   hasUserData: !!gltf.userData,
        //   hasVRM: !!(gltf.userData?.vrm),
        //   sceneChildren: gltf.scene.children.length,
        //   animations: gltf.animations.length,
        //   isGLBFile: isGLBFile
        // });
        
        let vrm: any = null;
        
        if (isGLBFile) {
          // WSL準拠: GLBファイルの場合は手動でVRM風のオブジェクトを作成
          
          // GLTFシーンを直接使用し、VRM風のオブジェクトを作成
          vrm = {
            scene: gltf.scene,
            userData: gltf.userData,
            animations: gltf.animations,
            update: (deltaTime: number) => {
              // VRMのupdate相当の処理（必要に応じて拡張）
            }
          };
          
          vrmRef.current = vrm;
          // アバター全体の位置調整
          vrm.scene.position.y = 0.1;
          scene.add(vrm.scene);
          
          // WSL準拠: 利用可能なBlendShapeを検出
          const detectedShapes = detectAvailableBlendShapes(vrm);
          setAvailableShapes(detectedShapes);
          
          // WSL準拠: BlendShapeターゲットを収集し管理
          const targets = collectBlendShapeTargets(vrm.scene);
          setBlendShapeTargets(targets);
          
          // 親コンポーネントに通知
          if (onAvailableShapesChange) {
            onAvailableShapesChange(detectedShapes);
          }
          
          // 顔特徴を適用
          if (faceFeatures) {
            applyFaceFeatures(vrm, faceFeatures);
          }
          
        } else {
          // VRMファイルの場合は従来の方法
          const vrmData = gltf.userData?.vrm;
          if (vrmData) {
            vrmRef.current = vrmData;
            // アバター全体の位置調整
            vrmData.scene.position.y = 0.1;
            scene.add(vrmData.scene);
            VRMUtils.rotateVRM0(vrmData);
            
            // WSL準拠: 利用可能なBlendShapeを検出とターゲット管理を同時実行
            const detectedShapes = detectAvailableBlendShapes(vrmData);
            setAvailableShapes(detectedShapes);
            
            // WSL準拠: BlendShapeターゲットを収集し管理
            const targets = collectBlendShapeTargets(vrmData.scene);
            setBlendShapeTargets(targets);
            
            // 親コンポーネントに通知
            if (onAvailableShapesChange) {
              onAvailableShapesChange(detectedShapes);
            }
            
            // 顔特徴を適用
            if (faceFeatures) {
              applyFaceFeatures(vrmData, faceFeatures);
            }
          } else {
            // console.error('❌ VRMデータが見つかりません');
            throw new Error('VRMデータが見つかりません');
          }
        }
        
        // ログ出力は非同期処理なので、直接検出結果を使用
        const logData = {
          vrmLoaded: !!vrm,
          sceneObjects: vrm?.scene?.children?.length || 0
        };
        
        // WSL準拠: 少し遅延してからloading状態を解除（ユーザーがloading表示を確認できるように）
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        }, 500);

        // アニメーションループ
        const clock = new THREE.Clock();
        const animate = () => {
          if (!isMountedRef.current) return;
          
          animationFrameIdRef.current = requestAnimationFrame(animate);
          const deltaTime = clock.getDelta();
          
          if (vrmRef.current && typeof vrmRef.current.update === 'function') {
            vrmRef.current.update(deltaTime);
          }
          
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        };
        animate();

      } catch (error) {
        if (!isMountedRef.current) return;
        
        // console.error('VRM初期化エラー:', error);
        setLoadError(error instanceof Error ? error.message : 'VRM読み込みに失敗しました');
        setIsLoading(false);
      }
    };

    // WSL準拠: 遅延読み込みで安定性を確保
    setTimeout(() => {
      if (isMountedRef.current) {
        initializeVRM();
      } else {
      }
    }, 100);
  }, [avatarId]);

  // 顔特徴の適用
  useEffect(() => {
    if (vrmRef.current && faceFeatures && !isLoading) {
      applyFaceFeatures(vrmRef.current, faceFeatures);
    }
  }, [faceFeatures, isLoading]);

  // WSL準拠: 手動BlendShape値の適用（ターゲットベース）
  useEffect(() => {
    if (blendShapeTargets.length > 0 && manualBlendShapeValues && !isLoading) {
      applyBlendShapeValuesOptimized(manualBlendShapeValues);
    }
  }, [manualBlendShapeValues, isLoading, blendShapeTargets]);

  // 利用可能なBlendShapeを検出
  const detectAvailableBlendShapes = (vrm: any): string[] => {
    const shapes: string[] = [];
    
    try {
      if (vrm.scene) {
        vrm.scene.traverse((object: any) => {
          if (object.isSkinnedMesh && object.morphTargetDictionary) {
            Object.keys(object.morphTargetDictionary).forEach(shapeName => {
              if (!shapes.includes(shapeName)) {
                shapes.push(shapeName);
              }
            });
          }
        });
      }
    } catch (error) {
      // console.warn('BlendShape検出エラー:', error);
    }
    
    return shapes.sort();
  };

  // WSL準拠: BlendShapeターゲットを収集（最適化版）
  const collectBlendShapeTargets = (scene: THREE.Object3D): BlendShapeTarget[] => {
    const targets: BlendShapeTarget[] = [];
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetDictionary) {
        targets.push({
          mesh: child,
          morphTargetInfluences: child.morphTargetInfluences || [],
          morphTargetDictionary: child.morphTargetDictionary
        });
      }
    });
    
    return targets;
  };

  // WSL準拠: 最適化されたBlendShape適用（ターゲットベース + 詳細検証）
  const applyBlendShapeValuesOptimized = (blendShapeValues: Record<string, number>) => {
    try {
      let appliedCount = 0;
      let totalCount = 0;
      const detailedResults: Array<{shapeName: string, inputValue: number, finalValue: number, targetIndex: number, meshName: string, changed: boolean}> = [];
      const significantManualChanges: Array<{name: string, value: number}> = [];
      
      //   .filter(([name]) => ['Mouth_Wide', 'Eye_Close', 'Nose_Wide'].includes(name))
      //   .map(([name, value]) => `${name}: ${value.toFixed(3)}`)
      //   .join(', ')
      // );
      
      blendShapeTargets.forEach((target, targetIdx) => {
        
        Object.entries(blendShapeValues).forEach(([shapeName, value]) => {
          totalCount++;
          const targetIndex = target.morphTargetDictionary[shapeName];
          if (targetIndex !== undefined && target.morphTargetInfluences[targetIndex] !== undefined) {
            // WSL仕様: 値の範囲チェックと適用
            const clampedValue = Math.max(0, Math.min(1, value));
            const previousValue = target.morphTargetInfluences[targetIndex];
            const changed = Math.abs(clampedValue - previousValue) > 0.001; // 0.1%以上の変化
            target.morphTargetInfluences[targetIndex] = clampedValue;
            
            detailedResults.push({
              shapeName,
              inputValue: value,
              finalValue: clampedValue,
              targetIndex,
              meshName: target.mesh.name || '名前なし',
              changed
            });
            
            // Track significant manual changes for logging
            if (clampedValue > 0.01 && changed) {
              significantManualChanges.push({name: shapeName.replace('_', ''), value: clampedValue});
            }
            
            appliedCount++;
          } else {
            // BlendShapeが見つからない場合の詳細ログ
            // console.warn(`⚠️ BlendShape未発見: ${shapeName} @${target.mesh.name || '名前なし'}`);
          }
        });
      });
      
      // 🎯 手動BlendShape適用完了ログ - 重要な変化のみ簡潔に出力
      if (significantManualChanges.length > 0 && totalCount > 0) {
        const changesStr = significantManualChanges
          .map(change => `${change.name}:${change.value.toFixed(2)}`)
          .join(' ');
      }
    } catch (error) {
      // console.warn('❌ 最適化BlendShape適用エラー:', error);
    }
  };

  // WSL準拠: 旧方式の手動BlendShape適用（互換性維持）
  const applyManualBlendShapes = (vrm: any, blendShapeValues: Record<string, number>) => {
    try {
      if (vrm.scene) {
        let appliedCount = 0;
        let totalCount = 0;
        
        vrm.scene.traverse((object: any) => {
          if (object.isSkinnedMesh && object.morphTargetDictionary) {
            Object.entries(blendShapeValues).forEach(([shapeName, value]) => {
              totalCount++;
              const shapeIndex = object.morphTargetDictionary[shapeName];
              if (shapeIndex !== undefined && object.morphTargetInfluences) {
                // WSL仕様: 値の範囲チェックと適用
                const clampedValue = Math.max(0, Math.min(1, value));
                const previousValue = object.morphTargetInfluences[shapeIndex];
                object.morphTargetInfluences[shapeIndex] = clampedValue;
                
                appliedCount++;
              }
            });
          }
        });
        
      }
    } catch (error) {
      // console.warn('❌ 手動BlendShape適用エラー:', error);
    }
  };

  // WSL準拠: 詳細な顔特徴適用ロジック（改良版・複数パスアプローチ + BlendShape反映検証）
  const applyFaceFeatures = (vrm: any, features: FaceFeatures) => {
    try {
      // WSL仕様: expressionManager方式とmorphTarget方式の両方をサポート
      let appliedCount = 0;
      const appliedBlendShapes: Array<{name: string, inputValue: number, calculatedValue: number, finalValue: number, method: string}> = [];
      const significantChanges: Array<{name: string, value: number}> = [];
      
      //   eyeWidth: features.eyeWidth?.toFixed(4),
      //   eyeHeight: features.eyeHeight?.toFixed(4), 
      //   mouthWidth: features.mouthWidth?.toFixed(4),
      //   noseWidth: features.noseWidth?.toFixed(4)
      // });
      
      // Pass 1: VRM expressionManager方式（標準VRM）
      if (vrm.expressionManager) {
        const expressions = vrm.expressionManager.expressions;
        
        // WSL準拠: 詳細な目の調整（複数パラメータ）
        if (expressions.eye_wide) {
          const inputValue = features.eyeWidth;
          const calculatedValue = inputValue * 15 - 0.3;
          const finalValue = Math.min(Math.max(calculatedValue, 0), 1.0);
          const previousValue = expressions.eye_wide.weight;
          expressions.eye_wide.weight = finalValue;
          appliedBlendShapes.push({
            name: 'eye_wide', 
            inputValue, 
            calculatedValue, 
            finalValue, 
            method: 'expressionManager'
          });
          if (finalValue > 0.01) {
            appliedCount++;
            significantChanges.push({name: 'EyeWide', value: finalValue});
          }
        }
        
        // WSL準拠: 詳細な口の調整（閾値調整済み）
        if (expressions.mouth_wide) {
          const inputValue = features.mouthWidth;
          const calculatedValue = (inputValue - 0.3) * 3;
          const finalValue = Math.min(Math.max(calculatedValue, 0), 1.0);
          const previousValue = expressions.mouth_wide.weight;
          expressions.mouth_wide.weight = finalValue;
          appliedBlendShapes.push({
            name: 'mouth_wide', 
            inputValue, 
            calculatedValue, 
            finalValue, 
            method: 'expressionManager'
          });
          if (finalValue > 0.01) {
            appliedCount++;
            significantChanges.push({name: 'MouthWide', value: finalValue});
          }
        }
        
        // WSL準拠: 鼻の調整（新規追加）
        if (expressions.nose_wide) {
          const inputValue = features.noseWidth;
          const calculatedValue = (inputValue - 0.15) * 8;
          const finalValue = Math.min(Math.max(calculatedValue, 0), 1.0);
          const previousValue = expressions.nose_wide.weight;
          expressions.nose_wide.weight = finalValue;
          appliedBlendShapes.push({
            name: 'nose_wide', 
            inputValue, 
            calculatedValue, 
            finalValue, 
            method: 'expressionManager'
          });
          if (finalValue > 0.01) {
            appliedCount++;
            significantChanges.push({name: 'NoseWide', value: finalValue});
          }
        }
        
        vrm.expressionManager.update();
      }
      
      // Pass 2: 直接morphTarget方式（GLBモデル対応）
      if (vrm.scene) {
        
        vrm.scene.traverse((object: any) => {
          if (object.isSkinnedMesh && object.morphTargetDictionary && object.morphTargetInfluences) {
            
            // WSL準拠: Mouth_Wide特別処理
            const mouthWideIndex = object.morphTargetDictionary['Mouth_Wide'];
            if (mouthWideIndex !== undefined) {
              const inputValue = features.mouthWidth;
              const calculatedValue = (inputValue - 0.3) * 2.5;
              const finalValue = Math.min(Math.max(calculatedValue, 0), 1.0);
              const previousValue = object.morphTargetInfluences[mouthWideIndex];
              object.morphTargetInfluences[mouthWideIndex] = finalValue;
              appliedBlendShapes.push({
                name: 'Mouth_Wide', 
                inputValue, 
                calculatedValue, 
                finalValue, 
                method: 'morphTarget'
              });
              if (finalValue > 0.01) {
                appliedCount++;
                significantChanges.push({name: 'MouthWide', value: finalValue});
              }
            }
            
            // WSL準拠: Eye_Close系の調整
            ['Eye_Close', 'Eye_Close_L', 'Eye_Close_R'].forEach(eyeShape => {
              const index = object.morphTargetDictionary[eyeShape];
              if (index !== undefined) {
                const inputValue = features.eyeHeight;
                const calculatedValue = inputValue * 8 - 0.2;
                const finalValue = Math.min(Math.max(calculatedValue, 0), 0.3); // 軽微な調整
                const previousValue = object.morphTargetInfluences[index];
                object.morphTargetInfluences[index] = finalValue;
                appliedBlendShapes.push({
                  name: eyeShape, 
                  inputValue, 
                  calculatedValue, 
                  finalValue, 
                  method: 'morphTarget'
                });
                if (finalValue > 0.01) {
                  appliedCount++;
                  significantChanges.push({name: eyeShape.replace('_', ''), value: finalValue});
                }
              }
            });
            
            // WSL準拠: Nose系の詳細調整
            ['Nose_Wide', 'Nose_Narrow'].forEach(noseShape => {
              const index = object.morphTargetDictionary[noseShape];
              if (index !== undefined) {
                const inputValue = features.noseWidth;
                const calculatedValue = noseShape === 'Nose_Wide' 
                  ? (inputValue - 0.16) * 6
                  : (0.14 - inputValue) * 6;
                const finalValue = Math.min(Math.max(calculatedValue, 0), 0.8);
                const previousValue = object.morphTargetInfluences[index];
                object.morphTargetInfluences[index] = finalValue;
                appliedBlendShapes.push({
                  name: noseShape, 
                  inputValue, 
                  calculatedValue, 
                  finalValue, 
                  method: 'morphTarget'
                });
                if (finalValue > 0.01) {
                  appliedCount++;
                  significantChanges.push({name: noseShape.replace('_', ''), value: finalValue});
                }
              }
            });
          }
        });
      }
      
      // 🎯 VRM適用完了ログ - 重要な変化のみ簡潔に出力
      if (significantChanges.length > 0) {
        const changesStr = significantChanges
          .map(change => `${change.name}:${change.value.toFixed(2)}`)
          .join(' ');
        const totalAvailableShapes = availableShapes.length;
      }
      
    } catch (error) {
      // console.warn('❌ 顔特徴適用エラー:', error);
    }
  };

  if (loadError) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center text-red-600">
          <p>❌ VRM読み込みエラー</p>
          <p className="text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2 mx-auto"></div>
          <p>VRM読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative bg-gray-100 rounded-lg overflow-hidden`} style={{ minHeight: '400px' }}>
      <div 
        ref={containerRef} 
        className="w-full h-full"
      />
      {/* デバッグ情報表示 */}
      <div className="absolute top-2 left-2 bg-white/90 p-2 rounded text-xs z-10 shadow">
        <div>Loading: {isLoading ? 'true' : 'false'}</div>
        <div>Error: {loadError || 'none'}</div>
        <div>Shapes: {availableShapes.length}</div>
        <div>Targets: {blendShapeTargets.length}</div>
        <div>VRM: {vrmRef.current ? 'loaded' : 'null'}</div>
      </div>
    </div>
  );
}