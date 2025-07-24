'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { AvatarData } from '../utils/avatarConfig';
import { VRMAnalyzer } from '../utils/vrmAnalyzer';
import { useMemoryLeakPrevention } from '../utils/memoryLeakPrevention';
import { DynamicMeshDeformer } from '../utils/dynamicMeshDeformation';
import BlendShapeController from './BlendShapeController';
import PerformanceMonitor from './PerformanceMonitor';
import PerformanceMiniWidget from './PerformanceMiniWidget';

interface VRMViewerProps {
  currentBMI: number;
  futureBMI: Array<{ period: number; weight: number; bmi: number }>;
  avatarData: AvatarData;
  userData: {
    height: number;
    weight: number;
    age: number;
    gender: 'male' | 'female';
    excessCalories: string;
  };
  onBMIChange?: (bmi: number) => void;
  isAnimating?: boolean;
}

export default function VRMViewer({ currentBMI, futureBMI, avatarData, userData, onBMIChange, isAnimating }: VRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<unknown>(null);
  const testCubeRef = useRef<THREE.Mesh | null>(null);
  const isCleanedUpRef = useRef(false);
  const meshDeformerRef = useRef<DynamicMeshDeformer | null>(null);
  
  // メモリリーク防止フック
  const memoryPrevention = useMemoryLeakPrevention();
  
  // 状態管理
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const [manualBellyValue, setManualBellyValue] = useState(0);
  const [useManualAdjustment, setUseManualAdjustment] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [availableBlendShapes, setAvailableBlendShapes] = useState<string[]>([]);
  const [currentBlendShape, setCurrentBlendShape] = useState<string>('');
  const [detailedAnalysis, setDetailedAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string>('');
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  // VRMを読み込む関数（シンプル版）
  const loadVRM = async (vrmPath: string) => {
    // 基本チェック
    if (!sceneRef.current || !cameraRef.current || isCleanedUpRef.current || !initRef.current) {
      console.log('❌ VRM読み込み中止: 条件不満足');
      return;
    }

    setIsLoading(true);
    setLoadingError('');
    console.log('📦 VRM読み込み開始:', vrmPath);
    console.log('📦 アバターデータ:', avatarData);

    try {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      const gltf = await loader.loadAsync(vrmPath);
      
      // 読み込み後のクリーンアップチェック
      if (isCleanedUpRef.current || !initRef.current) {
        console.log('❌ VRM読み込み中断: コンポーネント状態変更');
        setIsLoading(false);
        return;
      }

      console.log('✅ VRM読み込み成功:', gltf);
      const vrm = gltf.userData.vrm;
      console.log('✅ VRMオブジェクト:', vrm);
      console.log('✅ VRMに期待されるfatnessブレンドシェイプ:', avatarData.blendShapeNames.fatness);
      
      let sceneToAdd = null;
      if (vrm && sceneRef.current) {
        sceneToAdd = vrm.scene;
      } else if (gltf.scene && sceneRef.current) {
        sceneToAdd = gltf.scene;
      } else {
        throw new Error('VRMもGLTFシーンも利用できません');
      }
      
      if (sceneToAdd && sceneRef.current) {
        // 既存のVRMを完全に削除（メモリリーク対策）
        if (vrmRef.current && sceneRef.current) {
          console.log('🧹 既存VRMのクリーンアップ開始');
          
          // VRMの完全なdispose
          if (vrmRef.current.scene) {
            vrmRef.current.scene.traverse((object: any) => {
              if (object.geometry) {
                object.geometry.dispose();
              }
              if (object.material) {
                if (Array.isArray(object.material)) {
                  object.material.forEach((material: any) => {
                    if (material.map) material.map.dispose();
                    if (material.normalMap) material.normalMap.dispose();
                    if (material.emissiveMap) material.emissiveMap.dispose();
                    material.dispose();
                  });
                } else {
                  if (object.material.map) object.material.map.dispose();
                  if (object.material.normalMap) object.material.normalMap.dispose();
                  if (object.material.emissiveMap) object.material.emissiveMap.dispose();
                  object.material.dispose();
                }
              }
            });
            sceneRef.current.remove(vrmRef.current.scene);
          }
          
          // VRM expressionManagerのクリーンアップ
          if (vrmRef.current.expressionManager) {
            vrmRef.current.expressionManager.destroy();
          }
          
          vrmRef.current = null;
          console.log('✅ VRMクリーンアップ完了');
        }
        
        // テストキューブを削除
        if (testCubeRef.current && sceneRef.current) {
          sceneRef.current.remove(testCubeRef.current);
          testCubeRef.current = null;
        }
        
        vrmRef.current = vrm;
        sceneRef.current.add(sceneToAdd);
        
        // VRMの場合のみVRMUtilsを適用
        if (vrm) {
          VRMUtils.rotateVRM0(vrm);
        }
        
        
        // 動的メッシュ変形の初期化
        if (!meshDeformerRef.current) {
          meshDeformerRef.current = new DynamicMeshDeformer();
        }
        
        // 体メッシュの元データを保存
        let bodyMeshCount = 0;
        sceneToAdd.traverse((object: any) => {
          if (object.isSkinnedMesh && object.name) {
            const objName = object.name.toLowerCase();
            const isBodyMesh = objName.includes('body') || 
                              objName.includes('merged') ||
                              (!objName.includes('face') && !objName.includes('head') && !objName.includes('hair'));
            
            if (isBodyMesh) {
              meshDeformerRef.current!.saveOriginalVertices(object);
              bodyMeshCount++;
            }
          }
        });
        console.log(`🎯 体メッシュ保存完了: ${bodyMeshCount}個`);
        
        // ブレンドシェイプ分析を実行
        await analyzeBlendShapes(sceneToAdd, vrm);
        
        // カメラ位置調整
        adjustCameraPosition(sceneToAdd);
        
        // 初期BMI値で体型更新（動的変形無効化のため一時的に無効）
        // if (currentBMI > 0 && !isCleanedUpRef.current) {
        //   setTimeout(() => {
        //     if (!isCleanedUpRef.current) {
        //       updateBodyShape(currentBMI);
        //     }
        //   }, 100);
        // }
      }
    } catch (error) {
      console.error('❌ VRM読み込み失敗:', error);
      if (!isCleanedUpRef.current) {
        setLoadingError(`VRM読み込みエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      if (!isCleanedUpRef.current) {
        setIsLoading(false);
      }
    }
  };

  // ブレンドシェイプ分析関数
  const analyzeBlendShapes = async (sceneToAdd: THREE.Object3D, vrm: any) => {
    const allBlendShapes = new Map<string, number>();
    let totalBlendShapes = 0;
    let bodyBlendShapes = 0;
    
    sceneToAdd.traverse((object: any) => {
      if (object.isSkinnedMesh && object.morphTargetDictionary) {
        const blendShapeNames = Object.keys(object.morphTargetDictionary);
        totalBlendShapes += blendShapeNames.length;
        
        blendShapeNames.forEach(name => {
          const index = object.morphTargetDictionary[name];
          const currentValue = object.morphTargetInfluences ? object.morphTargetInfluences[index] : 0;
          allBlendShapes.set(name, currentValue);
          
          const lowerName = name.toLowerCase();
          const isBodyRelated = lowerName.includes('belly') || lowerName.includes('fat') || 
                              lowerName.includes('weight') || lowerName.includes('body') ||
                              lowerName.includes('chest') || lowerName.includes('waist') ||
                              lowerName.includes('hip') || lowerName.includes('muscle') ||
                              lowerName.includes('fatness');
          
          if (isBodyRelated) {
            bodyBlendShapes++;
          }
        });
      }
    });
    
    console.log(`📊 ブレンドシェイプ: 全${totalBlendShapes}個 (体型関連: ${bodyBlendShapes}個)`);
    
    // VRMAnalyzerを使用した詳細分析
    try {
      const analysisResult = VRMAnalyzer.analyzeVRMBlendShapes(vrm);
      console.log('📈 VRMAnalyzer分析結果:', analysisResult);
      
      // UIに表示するための情報を保存
      setAvailableBlendShapes(Array.from(allBlendShapes.keys()));
      
      // 簡略化された詳細分析結果を作成
      const bodyBlendShapes = Array.from(allBlendShapes.keys()).filter(name => {
        const lowerName = name.toLowerCase();
        return lowerName.includes('belly') || lowerName.includes('weight') || 
               lowerName.includes('fat') || lowerName.includes('body') ||
               lowerName.includes('chest') || lowerName.includes('waist') ||
               lowerName.includes('hip') || lowerName.includes('muscle') ||
               lowerName.includes('fatness');
      });
      
      const detailedAnalysisResult = {
        totalBlendShapes: allBlendShapes.size,
        bodyBlendShapes: bodyBlendShapes.map(name => ({ name, meshName: 'mesh' })),
        faceBlendShapes: [],
        emotionBlendShapes: [],
        unknownBlendShapes: [],
        meshes: [{ name: 'VRM Mesh', blendShapeCount: allBlendShapes.size }],
        totalMemoryUsage: allBlendShapes.size * 1024
      };
      
      setDetailedAnalysis(detailedAnalysisResult);
      
      // 使用するブレンドシェイプを決定
      let usedBlendShape = '';
      const configuredShapes = [
        avatarData.blendShapeNames.belly,
        avatarData.blendShapeNames.weight,
        avatarData.blendShapeNames.fat,
        avatarData.blendShapeNames.fatness
      ].filter(Boolean);
      
      for (const shapeName of configuredShapes) {
        if (allBlendShapes.has(shapeName!)) {
          usedBlendShape = shapeName!;
          break;
        }
      }
      
      // 設定されたものが見つからない場合の自動検出
      if (!usedBlendShape && bodyBlendShapes.length > 0) {
        usedBlendShape = bodyBlendShapes[0];
        console.log('🔄 自動検出されたブレンドシェイプ:', usedBlendShape);
      }
      
      setCurrentBlendShape(usedBlendShape);
      console.log('🎯 最終的に使用するブレンドシェイプ:', usedBlendShape || 'なし');
      
    } catch (error) {
      console.error('❌ VRMAnalyzer分析エラー:', error);
    }
  };

  // カメラ位置調整
  const adjustCameraPosition = (sceneToAdd: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(sceneToAdd);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    console.log('📐 VRMバウンディングボックス - center:', center, 'size:', size, 'maxDim:', maxDim);
    
    let cameraX, cameraY, cameraZ;
    if (maxDim < 0.5) {
      cameraX = 0;
      cameraY = center.y;
      cameraZ = 1.5;
    } else if (maxDim < 2.0) {
      cameraX = center.x;
      cameraY = center.y;
      cameraZ = maxDim * 1.5;
    } else {
      const fov = cameraRef.current!.fov * (Math.PI / 180);
      cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.2;
      cameraX = center.x;
      cameraY = center.y + size.y / 4;
    }
    
    cameraRef.current!.position.set(cameraX, cameraY, cameraZ);
    cameraRef.current!.lookAt(center);
    
    // フラスタムカリングを無効化
    sceneToAdd.traverse((child: any) => {
      if (child.isMesh) {
        child.frustumCulled = false;
      }
    });
  };

  // BMIに基づいて体型を更新する関数（BlendShapeController専用モードのため無効化）
  const updateBodyShape = (bmiValue: number) => {
    console.log('⚠️ BMI自動制御は一時的に無効化されています（BlendShapeController専用モード）- BMI:', bmiValue);
    return;
    
    if (!vrmRef.current || isCleanedUpRef.current) return;
    
    console.log('🔍 updateBodyShape実行開始 - BMI:', bmiValue, '（動的メッシュ変形は無効化）');
    
    // 動的メッシュ変形を無効化してブレンドシェイプのみに集中
    // if (meshDeformerRef.current) {
    //   applyDynamicMeshDeformation(bmiValue);
    //   return;
    // }
    
    vrmRef.current.scene.traverse((object: any) => {
      if (object.isSkinnedMesh && object.morphTargetDictionary) {
        const blendShapeNames = avatarData.blendShapeNames;
        let bellyIndex = undefined;
        let usedBlendShapeName = '';

        // 設定されたブレンドシェイプを探す
        if (blendShapeNames.belly && object.morphTargetDictionary[blendShapeNames.belly] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.belly];
          usedBlendShapeName = blendShapeNames.belly;
        } else if (blendShapeNames.weight && object.morphTargetDictionary[blendShapeNames.weight] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.weight];
          usedBlendShapeName = blendShapeNames.weight;
        } else if (blendShapeNames.fat && object.morphTargetDictionary[blendShapeNames.fat] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.fat];
          usedBlendShapeName = blendShapeNames.fat;
        } else {
          // 自動検出
          const availableBlendShapes = Object.keys(object.morphTargetDictionary);
          const potentialBodyBlendShapes = availableBlendShapes.filter(name => {
            const lowerName = name.toLowerCase();
            return lowerName.includes('belly') || lowerName.includes('fat') || 
                   lowerName.includes('weight') || lowerName.includes('body') ||
                   lowerName.includes('chest') || lowerName.includes('waist') ||
                   lowerName.includes('hip') || lowerName.includes('muscle') ||
                   lowerName.includes('fatness');
          });
          
          if (potentialBodyBlendShapes.length > 0) {
            bellyIndex = object.morphTargetDictionary[potentialBodyBlendShapes[0]];
            usedBlendShapeName = potentialBodyBlendShapes[0];
          }
        }
        
        if (bellyIndex !== undefined) {
          let blendValue = 0;
          
          // 手動調整値がある場合は常に優先
          if (manualBellyValue > 0) {
            blendValue = manualBellyValue;
            console.log('🎛️ 手動調整値を使用:', blendValue);
          } else if (useManualAdjustment) {
            blendValue = manualBellyValue;
            console.log('🔧 手動調整モード:', blendValue);
          } else {
            // BMI自動計算
            if (bmiValue <= 25) {
              blendValue = 0;
            } else if (bmiValue > 25 && bmiValue <= 30) {
              blendValue = ((bmiValue - 25) / 5) * 0.5;
            } else if (bmiValue > 30) {
              blendValue = Math.min(0.5 + ((bmiValue - 30) / 10) * 0.5, 1.0);
            }
            console.log('🧮 BMI自動計算:', bmiValue, '->', blendValue);
          }
          
          const previousValue = object.morphTargetInfluences[bellyIndex];
          object.morphTargetInfluences[bellyIndex] = blendValue;
          
          console.log('📈 ブレンドシェイプ値を更新:', usedBlendShapeName, '前の値:', previousValue, '新しい値:', blendValue);
          setCurrentBlendShape(usedBlendShapeName);
        }
      }
    });
  };

  // 手動でお腹周りを調整する関数
  const handleManualBellyChange = (value: number) => {
    setManualBellyValue(value);
    
    if (vrmRef.current) {
      forceUpdateBlendShape(value);
    }
  };
  
  // 強制的にブレンドシェイプを更新する関数（デバッグ用）
  const forceUpdateBlendShape = (value: number) => {
    if (!vrmRef.current) return;
    
    let updated = false;
    
    vrmRef.current.scene.traverse((object: any) => {
      if (object.isSkinnedMesh && object.morphTargetDictionary) {
        const dictionary = object.morphTargetDictionary;
        const influences = object.morphTargetInfluences;
        
        // 設定されたブレンドシェイプを試行
        const configuredShapes = [
          avatarData.blendShapeNames.belly,
          avatarData.blendShapeNames.weight,
          avatarData.blendShapeNames.fat,
          avatarData.blendShapeNames.fatness
        ].filter(Boolean);
        
        for (const shapeName of configuredShapes) {
          if (dictionary[shapeName!] !== undefined) {
            const index = dictionary[shapeName!];
            influences[index] = value;
            updated = true;
            setCurrentBlendShape(shapeName!);
            return;
          }
        }
        
        // 体型関連を自動検出
        if (!updated) {
          const bodyShapes = Object.keys(dictionary).filter(name => {
            const lowerName = name.toLowerCase();
            return lowerName.includes('belly') || lowerName.includes('weight') || 
                   lowerName.includes('fat') || lowerName.includes('body') ||
                   lowerName.includes('chest') || lowerName.includes('waist') ||
                   lowerName.includes('hip') || lowerName.includes('muscle') ||
                   lowerName.includes('fatness');
          });
          
          if (bodyShapes.length > 0) {
            const shapeName = bodyShapes[0];
            const index = dictionary[shapeName];
            influences[index] = value;
            updated = true;
            setCurrentBlendShape(shapeName);
          }
        }
      }
    });
    
    if (!updated) {
      // 動的メッシュ変形を実行
      const bmiValue = 18.5 + (value * 16.5);
      console.log(`🔧 動的変形実行: スライダー${(value*100).toFixed(0)}% -> BMI${bmiValue.toFixed(1)}`);
      
      if (!meshDeformerRef.current) {
        meshDeformerRef.current = new DynamicMeshDeformer();
      }
      applyDynamicMeshDeformation(bmiValue);
    }
  };

  // 動的メッシュ変形による体型変更（新機能）
  const applyDynamicMeshDeformation = (bmiValue: number) => {
    if (!vrmRef.current || !meshDeformerRef.current) return;
    
    const deformationOptions = meshDeformerRef.current.calculateDeformationFromBMI(bmiValue);
    let deformedMeshCount = 0;
    
    vrmRef.current.scene.traverse((object: any) => {
      if (object.isSkinnedMesh && object.name) {
        const objName = object.name.toLowerCase();
        const isBodyMesh = !objName.includes('face') && !objName.includes('head') && !objName.includes('hair');
        
        if (isBodyMesh) {
          meshDeformerRef.current!.deformMesh(object, deformationOptions);
          deformedMeshCount++;
        }
      }
    });
    
    if (deformedMeshCount > 0) {
      setCurrentBlendShape(`動的変形 BMI:${bmiValue.toFixed(1)}`);
      console.log(`✅ 動的変形完了: ${deformedMeshCount}個のメッシュ`);
    } else {
      // 強制的に全SkinnedMeshに適用
      vrmRef.current.scene.traverse((object: any) => {
        if (object.isSkinnedMesh && object.geometry?.attributes?.position) {
          try {
            meshDeformerRef.current!.saveOriginalVertices(object);
            meshDeformerRef.current!.deformMesh(object, deformationOptions);
            deformedMeshCount++;
          } catch (error) {
            console.error(`変形エラー: ${object.name}`, error);
          }
        }
      });
      
      if (deformedMeshCount > 0) {
        setCurrentBlendShape(`強制動的変形 BMI:${bmiValue.toFixed(1)}`);
        console.log(`✅ 強制変形完了: ${deformedMeshCount}個のメッシュ`);
      } else {
        console.log('🔧 スケール変形にフォールバック');
        applyScaleTransformation(Math.min(1.0, (bmiValue - 18.5) / 15));
      }
    }
  };

  // スケール変形による代替機能（フォールバック）
  const applyScaleTransformation = (value: number) => {
    if (!vrmRef.current) return;
    
    console.log('🔧 スケール変形開始 - value:', value);
    
    // お腹周りを模倣するスケール変形
    const scaleValue = 1.0 + (value * 0.3); // 最大30%まで拡大
    
    vrmRef.current.scene.traverse((object: any) => {
      if (object.isSkinnedMesh) {
        // 胴体部分のボーンを探してスケール調整
        const boneName = object.name?.toLowerCase();
        if (boneName && (boneName.includes('body') || boneName.includes('spine') || boneName.includes('chest'))) {
          console.log('🎯 胴体メッシュ発見:', object.name);
          
          // X軸（幅）とZ軸（奥行き）を拡大してお腹の膨らみを模倣
          object.scale.setX(scaleValue);
          object.scale.setZ(scaleValue);
          
          console.log(`📏 スケール変形適用: ${object.name} -> X:${scaleValue}, Z:${scaleValue}`);
          setCurrentBlendShape(`スケール変形 (${(value * 100).toFixed(0)}%)`);
        }
      }
    });
    
    console.log('✅ スケール変形完了');
  };

  // 個別ブレンドシェイプテスト関数
  const testBlendShape = (name: string, value: number) => {
    if (!vrmRef.current) {
      console.log('❌ VRMが読み込まれていません');
      return;
    }
    
    console.log(`🧪 ブレンドシェイプテスト開始: ${name} = ${value}`);
    let updated = false;
    
    vrmRef.current.scene.traverse((object: any) => {
      if (object.isSkinnedMesh && object.morphTargetDictionary) {
        const dictionary = object.morphTargetDictionary;
        const influences = object.morphTargetInfluences;
        
        if (dictionary[name] !== undefined) {
          const index = dictionary[name];
          const previousValue = influences[index];
          influences[index] = value;
          
          console.log(`✅ ブレンドシェイプ更新: ${name} [${index}] ${previousValue} -> ${value}`);
          updated = true;
          
          // 現在のブレンドシェイプを更新
          if (value > 0) {
            setCurrentBlendShape(name);
          }
        }
      }
    });
    
    if (updated) {
      console.log(`✅ ブレンドシェイプテスト完了: ${name}`);
      
      // 手動調整値も更新（UI同期のため）
      if (value > 0) {
        setManualBellyValue(value);
        setUseManualAdjustment(true);
      }
    } else {
      console.log(`❌ ブレンドシェイプが見つかりません: ${name}`);
    }
  };

  // 初期化（安定版）
  useEffect(() => {
    // 既に初期化済みまたはクリーンアップ済みの場合はスキップ
    if (initRef.current || isCleanedUpRef.current || !containerRef.current) {
      return;
    }
    
    initRef.current = true;
    console.log('🚀 VRMViewer初期化開始（安定版）');

    // Three.js基本設定
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x212121);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x212121);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ライト
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
    frontLight.position.set(0, 0, 1);
    scene.add(frontLight);

    // テスト用キューブ
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const testCube = new THREE.Mesh(geometry, material);
    scene.add(testCube);
    testCubeRef.current = testCube;

    // アニメーションループ（30fps固定、メモリリーク対策済み）
    let frameCount = 0;
    let lastTime = performance.now();
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    
    const animate = (currentTime: number) => {
      if (isCleanedUpRef.current) return;
      
      memoryPrevention.safeRequestAnimationFrame(animate);
      
      // FPS制限: 30fps固定
      if (currentTime - lastTime < frameInterval) {
        return;
      }
      lastTime = currentTime;
      
      if (testCubeRef.current) {
        testCubeRef.current.rotation.x += 0.01;
        testCubeRef.current.rotation.y += 0.01;
      }
      
      if (vrmRef.current) {
        vrmRef.current.update(frameInterval / 1000); // 正確なデルタタイム
      }
      
      renderer.render(scene, camera);
      
      frameCount++;
      if (frameCount <= 5) {
        console.log(`🎬 フレーム ${frameCount}: 30fps固定, シーン内オブジェクト数=${scene.children.length}`);
      }
    };
    animate(performance.now());

    // リサイズ処理（メモリリーク対策済み）
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera || isCleanedUpRef.current) return;
      
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    
    memoryPrevention.safeAddEventListener(window, 'resize', handleResize);

    console.log('🎯 Three.js初期化完了');

    // シンプルなクリーンアップ
    return () => {
      console.log('🧹 VRMViewer クリーンアップ');
      isCleanedUpRef.current = true;
      
      // 全てのメモリリーク対策付きタイマーとイベントをクリア
      memoryPrevention.cleanupAll();
      
      // メッシュ変形のクリーンアップ
      if (meshDeformerRef.current) {
        meshDeformerRef.current.cleanup();
        meshDeformerRef.current = null;
      }
      
      // VRMの完全なクリーンアップ（メモリリーク対策）
      if (vrmRef.current && sceneRef.current) {
        console.log('🧹 コンポーネントアンマウント時のVRMクリーンアップ開始');
        
        // VRMの完全なdispose
        if (vrmRef.current.scene) {
          vrmRef.current.scene.traverse((object: any) => {
            if (object.geometry) {
              object.geometry.dispose();
              console.log('🗑️ Geometry disposed:', object.name || 'unnamed');
            }
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((mat: any) => {
                  if (mat.map) mat.map.dispose();
                  if (mat.normalMap) mat.normalMap.dispose();
                  if (mat.emissiveMap) mat.emissiveMap.dispose();
                  if (mat.roughnessMap) mat.roughnessMap.dispose();
                  if (mat.metalnessMap) mat.metalnessMap.dispose();
                  mat.dispose();
                });
              } else {
                if (object.material.map) object.material.map.dispose();
                if (object.material.normalMap) object.material.normalMap.dispose();
                if (object.material.emissiveMap) object.material.emissiveMap.dispose();
                if (object.material.roughnessMap) object.material.roughnessMap.dispose();
                if (object.material.metalnessMap) object.material.metalnessMap.dispose();
                object.material.dispose();
              }
              console.log('🗑️ Material disposed:', object.name || 'unnamed');
            }
          });
        }
        
        sceneRef.current.remove(vrmRef.current.scene);
        vrmRef.current = null;
        console.log('✅ VRMクリーンアップ完了');
      }
      
      // テストキューブのクリーンアップ
      if (testCubeRef.current && sceneRef.current) {
        sceneRef.current.remove(testCubeRef.current);
        testCubeRef.current = null;
      }
      
      // シーンのクリーンアップ
      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
      
      // レンダラーのクリーンアップ
      if (rendererRef.current) {
        if (containerRef.current && rendererRef.current.domElement && containerRef.current.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      
      cameraRef.current = null;
      initRef.current = false;
    };
  }, []); // マウント時のみ実行

  // avatarDataが変更されたらVRMを読み込む（シンプル版）
  useEffect(() => {
    if (avatarData && initRef.current && !isCleanedUpRef.current) {
      console.log('🔄 VRM読み込み:', avatarData.name);
      loadVRM(avatarData.vrmPath);
    }
  }, [avatarData]);

  // 未来予測アニメーション状態
  const [animationFrame, setAnimationFrame] = useState<{
    period: string;
    bmi: number;
    weight: number;
    accumulatedKcal: number;
  } | null>(null);
  const [isAnimationActive, setIsAnimationActive] = useState(false);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fatnessAnimationRef = useRef<number>(0);

  // 未来予測アニメーション開始
  useEffect(() => {
    if (isAnimating && futureBMI.length > 0 && !isAnimationActive) {
      console.log('🎬 未来予測アニメーション開始');
      setIsAnimationActive(true);
      
      const periods = [
        { days: 30, label: '1ヶ月後' },
        { days: 365, label: '1年後' },
        { days: 1095, label: '3年後' },
        { days: 1825, label: '5年後' },
        { days: 3650, label: '10年後' }
      ];
      
      let frameIndex = 0;
      
      const runAnimation = () => {
        if (frameIndex < periods.length && frameIndex < futureBMI.length) {
          const prediction = futureBMI[frameIndex];
          const period = periods[frameIndex];
          
          const frameData = {
            period: period.label,
            bmi: prediction.bmi,
            weight: prediction.weight,
            accumulatedKcal: (getExcessCaloriesValue(userData.excessCalories) || 0) * period.days
          };
          
          setAnimationFrame(frameData);
          
          // 期間に応じたお腹の膨らみ度合いを段階的に設定
          let targetFatnessValue = 0;
          if (period.days === 30) {
            // 1ヶ月後: 20%
            targetFatnessValue = 0.2;
          } else if (period.days === 365) {
            // 1年後: 40%
            targetFatnessValue = 0.4;
          } else if (period.days === 1095) {
            // 3年後: 60%
            targetFatnessValue = 0.6;
          } else if (period.days === 1825) {
            // 5年後: 80%
            targetFatnessValue = 0.8;
          } else if (period.days === 3650) {
            // 10年後: 100%
            targetFatnessValue = 1.0;
          }
          
          // スムーズなfatnessアニメーション
          animateFatnessSmooth(targetFatnessValue);
          
          frameIndex++;
        } else {
          // アニメーション完了
          console.log('🎬 未来予測アニメーション完了');
          setIsAnimationActive(false);
          if (animationIntervalRef.current) {
            clearInterval(animationIntervalRef.current);
            animationIntervalRef.current = null;
          }
        }
      };
      
      // 初回実行
      runAnimation();
      
      // 3秒間隔で実行
      animationIntervalRef.current = setInterval(runAnimation, 3000);
    }
  }, [isAnimating, futureBMI, isAnimationActive]);

  // スムーズなfatnessアニメーション関数
  const animateFatnessSmooth = (targetValue: number) => {
    const startValue = fatnessAnimationRef.current;
    const startTime = Date.now();
    // リセット時（0に戻る時）は高速に、膨らませる時は通常速度
    const duration = targetValue === 0 ? 500 : 2500; // リセット時は0.5秒、通常時は2.5秒
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // イージング関数（滑らかな変化）
      const easeInOut = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const currentValue = startValue + (targetValue - startValue) * easeInOut;
      fatnessAnimationRef.current = currentValue;
      
      // VRMのfatnessブレンドシェイプを更新
      if (vrmRef.current && vrmRef.current.scene) {
        vrmRef.current.scene.traverse((object: any) => {
          if (object.isSkinnedMesh && object.morphTargetDictionary) {
            if (object.morphTargetDictionary['fatness'] !== undefined) {
              const morphIndex = object.morphTargetDictionary['fatness'];
              if (object.morphTargetInfluences && morphIndex < object.morphTargetInfluences.length) {
                object.morphTargetInfluences[morphIndex] = currentValue;
              }
            }
          }
        });
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        console.log(`🎭 fatness滑らか更新完了: ${targetValue}`);
      }
    };
    
    animate();
  };

  // アニメーション停止時のクリーンアップ（自動リセットを無効化）
  useEffect(() => {
    if (!isAnimating && isAnimationActive) {
      console.log('🎬 アニメーション停止');
      setIsAnimationActive(false);
      
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      
      // 自動リセットを削除 - ユーザーが「元に戻る」ボタンを押すまでリセットしない
    }
  }, [isAnimating]);

  function getExcessCaloriesValue(option: string): number {
    switch (option) {
      case '少ない': return -100;
      case '普通': return 0;
      case '多い': return 100;
      default: return 0;
    }
  }

  // BMIが変更されたら体型を更新（動的変形無効化のため一時的に無効）
  // useEffect(() => {
  //   if (currentBMI > 0 && !useManualAdjustment && !isCleanedUpRef.current) {
  //     updateBodyShape(currentBMI);
  //   }
  // }, [currentBMI, useManualAdjustment]);

  // 未来のBMI予測のアニメーション（動的変形無効化のため一時的に無効）
  // useEffect(() => {
  //   if (futureBMI.length === 0 || useManualAdjustment || isCleanedUpRef.current) return;

  //   const clearIntervalCallback = memoryPrevention.safeSetInterval(() => {
  //     setCurrentPredictionIndex((prevIndex) => {
  //       const nextIndex = (prevIndex + 1) % futureBMI.length;
  //       const nextBMI = futureBMI[nextIndex].bmi;
  //       updateBodyShape(nextBMI);
  //       return nextIndex;
  //     });
  //   }, 3000);

  //   return clearIntervalCallback;
  // }, [futureBMI, useManualAdjustment, memoryPrevention]);


  return (
    <div className="w-full space-y-4">
      {/* アバター情報ヘッダー */}
      <div className={`flex justify-between items-center p-3 rounded-lg transition-all duration-500 ${
        animationFrame 
          ? 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200' 
          : 'bg-transparent'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 bg-gray-100 rounded-lg overflow-hidden transition-all duration-500 ${
            animationFrame ? 'ring-2 ring-purple-300 shadow-lg' : ''
          }`}>
            <img
              src={avatarData.thumbnailPath}
              alt={avatarData.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-avatar.png';
              }}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              {animationFrame ? `${avatarData.name} (${animationFrame.period})` : avatarData.name}
              {animationFrame && (
                <span className="flex items-center gap-1">
                  <div className="animate-pulse w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-xs text-purple-600 font-medium">予測中</span>
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600">
              {animationFrame 
                ? `予測体重: ${animationFrame.weight.toFixed(1)}kg (現在: ${userData.weight}kg)`
                : avatarData.description
              }
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {animationFrame ? `${animationFrame.period}のBMI` : '現在のBMI'}
          </p>
          <p className={`text-lg font-bold transition-all duration-500 ${
            animationFrame ? 'text-purple-600 scale-110' : 'text-blue-600 scale-100'
          }`}>
            {animationFrame ? animationFrame.bmi.toFixed(1) : currentBMI.toFixed(1)}
            {animationFrame && (
              <span className="ml-1 text-xs text-purple-400 animate-bounce">↗️</span>
            )}
          </p>
          {animationFrame && (
            <p className="text-xs text-gray-400 mt-1">
              元のBMI: {currentBMI.toFixed(1)}
            </p>
          )}
        </div>
      </div>

      

      {/* お腹周りの手動調整コントロール（機能していないため非表示） */}
      {/* <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-700">お腹周りの調整（メモリリーク対策済み）</h4>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useManualAdjustment}
                onChange={(e) => setUseManualAdjustment(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-600">手動調整</span>
            </label>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              🎛️ お腹の膨らみ{useManualAdjustment ? '（手動調整モード）' : '（デバッグ用）'}
            </span>
            <span className="text-sm font-medium text-blue-600">
              {(manualBellyValue * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={manualBellyValue}
            onChange={(e) => handleManualBellyChange(parseFloat(e.target.value))}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${manualBellyValue * 100}%, #e5e7eb ${manualBellyValue * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0% (標準)</span>
            <span>50%</span>
            <span>100% (最大)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={useManualAdjustment ? 'text-green-600' : 'text-gray-500'}>
              {useManualAdjustment ? '✅ 手動調整有効' : '⏸️ BMI自動計算中'}
            </span>
            <button
              onClick={() => setManualBellyValue(0)}
              className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
            >
              リセット
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-blue-50 p-2 rounded text-center">
              <div className="font-semibold text-blue-600">BMI</div>
              <div>{currentBMI.toFixed(1)}</div>
            </div>
            <div className="bg-green-50 p-2 rounded text-center">
              <div className="font-semibold text-green-600">スライダー</div>
              <div>{(manualBellyValue * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-purple-50 p-2 rounded text-center">
              <div className="font-semibold text-purple-600">適用値</div>
              <div>{manualBellyValue > 0 ? (manualBellyValue * 100).toFixed(0) + '%' : 'BMI連動'}</div>
            </div>
          </div>
        </div>
      </div> */}
          
          {/* プリセットボタン（動的変形無効化のため非表示） */}
          {/* <div className="space-y-1">
            <div className="text-xs text-gray-600 font-medium">クイック設定:</div>
            <div className="grid grid-cols-5 gap-1">
              {[
                { label: '標準', value: 0 },
                { label: '軽微', value: 0.2 },
                { label: '普通', value: 0.4 },
                { label: '顕著', value: 0.7 },
                { label: '最大', value: 1.0 }
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setManualBellyValue(preset.value);
                    handleManualBellyChange(preset.value);
                  }}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    Math.abs(manualBellyValue - preset.value) < 0.05
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div> */}
        
        {/* ローディング状態 */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-700">🔄 VRM読み込み中...</p>
          </div>
        )}
        
        {/* コンポーネント状態デバッグ（開発環境のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs">
            <div className="grid grid-cols-2 gap-1">
              <span className={initRef.current ? 'text-green-600' : 'text-red-600'}>
                初期化: {initRef.current ? '✅' : '❌'}
              </span>
              <span className={!isCleanedUpRef.current ? 'text-green-600' : 'text-red-600'}>
                アクティブ: {!isCleanedUpRef.current ? '✅' : '❌'}
              </span>
              <span className={!!sceneRef.current ? 'text-green-600' : 'text-red-600'}>
                シーン: {!!sceneRef.current ? '✅' : '❌'}
              </span>
              <span className={!!vrmRef.current ? 'text-green-600' : 'text-red-600'}>
                VRM: {!!vrmRef.current ? '✅' : '❌'}
              </span>
            </div>
          </div>
        )}
        
        {/* エラー表示 */}
        {loadingError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700">❌ {loadingError}</p>
          </div>
        )}
        
        {/* デバッグ情報 */}
        {showDebugInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <h5 className="font-medium text-blue-800">ブレンドシェイプデバッグ情報（改良版）</h5>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>設定されたブレンドシェイプ:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                {avatarData.blendShapeNames.belly && (
                  <li>belly: &quot;{avatarData.blendShapeNames.belly}&quot;</li>
                )}
                {avatarData.blendShapeNames.weight && (
                  <li>weight: &quot;{avatarData.blendShapeNames.weight}&quot;</li>
                )}
                {avatarData.blendShapeNames.fat && (
                  <li>fat: &quot;{avatarData.blendShapeNames.fat}&quot;</li>
                )}
              </ul>
              
              {currentBlendShape && (
                <p><strong>現在使用中:</strong> {currentBlendShape}</p>
              )}
              
              <p><strong>利用可能なブレンドシェイプ数:</strong> {availableBlendShapes.length}</p>
              
              {availableBlendShapes.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
                  <p className="text-yellow-800 font-semibold">⚠️ ブレンドシェイプが見つかりません</p>
                  <p className="text-yellow-700 text-xs">スケール変形による代替機能を使用します</p>
                </div>
              )}
              
              {availableBlendShapes.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    すべてのブレンドシェイプをテスト ({availableBlendShapes.length}個)
                  </summary>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {availableBlendShapes.map((name, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                        <span className={name === currentBlendShape ? 'font-bold text-green-600' : 'text-gray-700'}>
                          {name}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => testBlendShape(name, 0.5)}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            テスト
                          </button>
                          <button
                            onClick={() => testBlendShape(name, 0)}
                            className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                          >
                            リセット
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-700">
                  <strong>メモリリーク対策:</strong> タイマーとイベントリスナーは自動的にクリーンアップされます
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  デバッグ: window.debugMemoryLeak.getReport() でメモリ状況を確認
                </p>
              </div>
              
              {detailedAnalysis && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <h6 className="font-semibold text-gray-800 mb-2">詳細分析結果</h6>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>総ブレンドシェイプ数:</strong> {detailedAnalysis.totalBlendShapes}</p>
                    <p><strong>体型関連ブレンドシェイプ:</strong> {detailedAnalysis.bodyBlendShapes.length}個</p>
                    <p><strong>推定メモリ使用量:</strong> {(detailedAnalysis.totalMemoryUsage / 1024).toFixed(1)}KB</p>
                    
                    {detailedAnalysis.bodyBlendShapes.length > 0 && (
                      <div className="mt-2">
                        <p><strong>体型関連ブレンドシェイプ一覧:</strong></p>
                        <ul className="list-disc pl-4 mt-1 max-h-24 overflow-y-auto">
                          {detailedAnalysis.bodyBlendShapes.map((bs: any, index: number) => (
                            <li key={index} className={bs.name === currentBlendShape ? 'font-bold text-green-600' : ''}>
                              {bs.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      
      {/* 3Dビューアー */}
      <div className="relative">
        <div 
          ref={containerRef}
          className="w-full rounded-lg overflow-hidden border-2 border-gray-200"
          style={{ height: '800px', backgroundColor: '#f0f0f0' }}
        />
        
        {animationFrame && (
          <div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm">
            <div>
              <p className="font-semibold">{animationFrame.period}</p>
              <p className="text-yellow-300">BMI: {animationFrame.bmi.toFixed(1)}</p>
            </div>
          </div>
        )}
        
      {/* ブレンドシェイプコントロールパネル */}
      {showDebugInfo && vrmRef.current && (
        <>
          {/* 左側のコントロールパネル */}
          <div className="fixed left-0 top-0 h-full w-96 bg-white shadow-2xl flex flex-col z-40">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-lg font-bold text-gray-800">🎭 ブレンドシェイプ制御</h2>
              <button
                onClick={() => setShowDebugInfo(false)}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
              >
                ✕ 閉じる
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <BlendShapeController 
                vrm={vrmRef.current}
                onBlendShapeChange={(name, value) => {
                  console.log(`🎭 ブレンドシェイプ変更: ${name} = ${value}`);
                  setCurrentBlendShape(`${name}: ${(value * 100).toFixed(0)}%`);
                  
                  // ダミーfatnessの場合、動的変形システムで処理
                  if (name === 'fatness-dynamic') {
                    const bmiValue = 18.5 + (value * 16.5); // 0-1 を BMI 18.5-35 に変換
                    console.log(`🧪 ダミーfatness -> 動的変形: ${value} -> BMI${bmiValue.toFixed(1)}`);
                    applyDynamicMeshDeformation(bmiValue);
                  }
                }}
              />
            </div>
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>右側のVRMビューアーでリアルタイム確認</span>
              </div>
              {currentBlendShape && (
                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                  <div className="text-xs font-medium text-blue-700">現在の設定:</div>
                  <div className="text-sm font-bold text-blue-800">{currentBlendShape}</div>
                </div>
              )}
            </div>
          </div>
          
          {/* 右上のメッセージエリア */}
          <div className="fixed right-4 top-4 bg-black bg-opacity-70 text-white px-4 py-3 rounded-lg shadow-lg z-30">
            <div className="text-lg font-bold mb-1">🎭 ブレンドシェイプ制御モード</div>
            <div className="text-sm text-gray-300">
              左側のパネルでスライダーを調整してください
            </div>
          </div>

        </>
      )}

      {/* パフォーマンス監視 */}
      {showPerformanceMonitor ? (
        <PerformanceMonitor
          renderer={rendererRef.current}
          isVisible={showPerformanceMonitor}
          onToggle={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
        />
      ) : (
        <PerformanceMiniWidget
          onOpenFull={() => setShowPerformanceMonitor(true)}
        />
      )}
      </div>
    </div>
  );
}