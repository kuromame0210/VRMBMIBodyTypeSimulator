'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { AvatarData } from '../utils/avatarConfig';
import { TextureOptimizer } from '../utils/textureOptimizer';
import { VRMAnalyzer } from '../utils/vrmAnalyzer';
import { MemoryMonitor } from '../utils/memoryMonitor';
import { VRMCache } from '../utils/vrmCache';
import MemoryDebugPanel from './MemoryDebugPanel';
import VRMLoadingIndicator from './VRMLoadingIndicator';

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
}

export default function VRMViewer({ currentBMI, futureBMI, avatarData, userData }: VRMViewerProps) {
  console.log('VRMViewer初期化:', avatarData?.id, avatarData?.name);
  console.log('Three.js利用可能:', !!THREE, !!THREE.Scene);
  console.log('VRMViewer props:', { currentBMI, futureBMI: futureBMI.length, avatarData: avatarData?.id, userData: userData?.gender });
  
  // コンポーネントのマウント/アンマウントをトラッキング
  useEffect(() => {
    console.log('VRMViewer component mounted');
    return () => {
      console.log('VRMViewer component unmounted');
    };
  }, []);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const loadingControllerRef = useRef<AbortController | null>(null);
  const currentLoadingPathRef = useRef<string | null>(null);
  const testCubeRef = useRef<THREE.Mesh | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('');
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const [isThreeJSReady, setIsThreeJSReady] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const loadVRM = useCallback(async (avatarData: AvatarData) => {
    console.log('loadVRM関数開始:', {
      scene: !!sceneRef.current,
      renderer: !!rendererRef.current, 
      camera: !!cameraRef.current,
      avatarPath: avatarData.vrmPath
    });
    
    // 既に読み込み中なら中断
    if (isLoading) {
      console.log('既に読み込み中のため、スキップします');
      return;
    }
    
    // 同じVRMを読み込み中なら中断
    if (currentLoadingPathRef.current === avatarData.vrmPath) {
      console.log('同じVRMを読み込み中のため、スキップします:', avatarData.vrmPath);
      return;
    }
    
    // メモリ監視開始
    MemoryMonitor.logMemoryInfo('VRM読み込み開始');
    
    // VRM読み込み前のメモリチェック
    if (!MemoryMonitor.canLoadVRM()) {
      console.warn('⚠️ メモリ不足のためVRM読み込みを中止');
      MemoryMonitor.emergencyMemoryCleanup();
      VRMCache.emergencyCleanup();
      setError('メモリ不足のため読み込みできません。ブラウザを再起動してください。');
      return;
    }
    
    // キャッシュからチェック
    const cachedVRM = VRMCache.get(avatarData.vrmPath);
    if (cachedVRM) {
      console.log('📦 キャッシュからVRMを読み込み');
      vrmRef.current = cachedVRM;
      sceneRef.current.add(cachedVRM.scene);
      setIsLoading(false);
      return;
    }
    
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) {
      console.error('Three.jsオブジェクトが初期化されていません');
      return;
    }

    // 既存のロードプロセスをキャンセル
    if (loadingControllerRef.current) {
      loadingControllerRef.current.abort();
    }
    loadingControllerRef.current = new AbortController();

    // 既存VRMの完全なメモリ解放
    if (vrmRef.current) {
      console.log('既存VRMを削除中...');
      sceneRef.current.remove(vrmRef.current.scene);
      
      // テクスチャとジオメトリの明示的な解放
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
      
      // VRMのdisposeメソッドがある場合のみ呼び出し
      if (typeof vrmRef.current.dispose === 'function') {
        vrmRef.current.dispose();
      }
      
      // VRMに関連するすべての参照をクリア
      if (vrmRef.current.expressionManager) {
        vrmRef.current.expressionManager = null;
      }
      if (vrmRef.current.lookAt) {
        vrmRef.current.lookAt = null;
      }
      if (vrmRef.current.humanoid) {
        vrmRef.current.humanoid = null;
      }
      vrmRef.current = null;
      
      // 強制ガベージコレクションとメモリ解放
      if (window.gc) {
        window.gc();
      }
      
      // メモリプレッシャーを適用してガベージコレクションを促進
      try {
        // 大きな配列を作成してメモリプレッシャーをかける
        const tempArray = new Array(1000000);
        tempArray.fill(0);
        // すぐに解放
        tempArray.length = 0;
      } catch {
        // メモリ不足時は無視
      }
    }

    // 読み込み中のパスを設定
    currentLoadingPathRef.current = avatarData.vrmPath;
    
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);
    setLoadingStep('VRMファイルを読み込み中...');

    try {
      MemoryMonitor.logMemoryInfo('VRM読み込み開始');
      console.log('VRM読み込み開始:', avatarData.vrmPath);
      
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      // タイムアウト設定 (30秒)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('VRM読み込みタイムアウト (30秒)')), 30000);
      });

      setLoadingProgress(20);
      setLoadingStep('GLTFファイルを解析中...');
      
      const gltf = await Promise.race([
        loader.loadAsync(avatarData.vrmPath),
        timeoutPromise
      ]) as any;
      
      setLoadingProgress(40);
      setLoadingStep('VRMデータを処理中...');
      
      console.log('GLTF読み込み完了:', gltf);
      const vrm = gltf.userData.vrm;
      console.log('VRM取得:', vrm);
      
      // アボートされた場合は処理を中断
      if (loadingControllerRef.current?.signal.aborted) {
        console.log('VRM読み込みがキャンセルされました');
        return;
      }

      vrmRef.current = vrm;
      sceneRef.current.add(vrm.scene);
      VRMUtils.rotateVRM0(vrm);
      
      // テスト用キューブを削除
      if (testCubeRef.current) {
        sceneRef.current.remove(testCubeRef.current);
        testCubeRef.current = null;
        console.log('🟢 テスト用キューブを削除しました');
      }
      
      // VRMをキャッシュに保存（メモリ使用量を確認してから）
      const currentMemory = MemoryMonitor.getCurrentMemoryUsage();
      if (currentMemory && currentMemory.status !== 'critical') {
        // キャッシュ用にVRMのコピーを作成（簡易版）
        VRMCache.set(avatarData.vrmPath, vrm);
      }
      
      setLoadingProgress(60);
      setLoadingStep('テクスチャを最適化中...');
      
      // テクスチャ最適化
      const memoryGB = (navigator as any).deviceMemory || 4;
      TextureOptimizer.optimizeVRMTextures(vrm, memoryGB);
      
      console.log('テクスチャ最適化完了:', {
        deviceMemory: `${memoryGB}GB`,
        optimizationLevel: memoryGB <= 4 ? 'ultra' : memoryGB <= 8 ? 'high' : 'medium'
      });
      
      setLoadingProgress(80);
      setLoadingStep('ブレンドシェイプを分析中...');
      
      // ブレンドシェイプ分析
      const analysisResult = VRMAnalyzer.analyzeVRMBlendShapes(vrm);
      console.log('VRMブレンドシェイプ分析:', analysisResult);
      
      // BMIシミュレーションに必要なブレンドシェイプを特定
      const requiredBlendShapes = VRMAnalyzer.identifyRequiredBlendShapes(vrm);
      console.log('BMIシミュレーションに必要なブレンドシェイプ:', requiredBlendShapes);
      
      // 不要なブレンドシェイプを特定して無効化
      const allBlendShapes = Object.keys(analysisResult.blendShapesByCategory).flatMap(category => 
        analysisResult.blendShapesByCategory[category].map(bs => bs.name)
      );
      const unnecessaryBlendShapes = allBlendShapes.filter(name => !requiredBlendShapes.includes(name));
      
      if (unnecessaryBlendShapes.length > 0) {
        console.log(`不要なブレンドシェイプ${unnecessaryBlendShapes.length}個を無効化:`, unnecessaryBlendShapes);
        VRMAnalyzer.disableBlendShapes(vrm, unnecessaryBlendShapes);
      }

      // デバイスメモリに基づいたVRM最適化（既に上で定義済み）
      
      vrm.scene.traverse((child: any) => {
        if (child.isMesh) {
          // フラスタムカリングを有効にする
          child.frustumCulled = true;
          
          // マテリアルの最適化
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat: any) => {
              // メモリに基づいた最適化
              mat.precision = memoryGB <= 4 ? 'lowp' : memoryGB <= 8 ? 'mediump' : 'highp';
              
              // テクスチャの最適化
              if (mat.map && memoryGB <= 4) {
                mat.map.generateMipmaps = false;
                mat.map.minFilter = THREE.LinearFilter;
                mat.map.magFilter = THREE.LinearFilter;
              }
              
              // 低スペック用設定
              if (memoryGB <= 4) {
                mat.transparent = false;
                mat.alphaTest = 0;
                mat.side = THREE.FrontSide;
              }
              
              mat.needsUpdate = true;
            });
          }
          
          // ジオメトリの最適化
          if (child.geometry && memoryGB <= 4) {
            child.geometry.computeBoundingSphere();
            child.geometry.computeBoundingBox();
          }
        }
      });

      const box = new THREE.Box3().setFromObject(vrm.scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = cameraRef.current.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      
      
      cameraRef.current.position.set(center.x, center.y + size.y / 4, cameraZ);
      cameraRef.current.lookAt(center);

      setLoadingProgress(100);
      setLoadingStep('完了!');
      
      setTimeout(() => {
        setIsLoading(false);
        currentLoadingPathRef.current = null; // 読み込み完了時にクリア
      }, 500);
      
      // メモリ使用量をログ出力
      if (performance.memory) {
        MemoryMonitor.logMemoryInfo('VRM読み込み完了');
        
        console.log('最適化結果:', {
          blendShapeMemory: `${(analysisResult.totalMemoryUsage / 1024 / 1024).toFixed(1)}MB`,
          totalBlendShapes: analysisResult.totalBlendShapes,
          disabledBlendShapes: unnecessaryBlendShapes.length,
          cacheStatus: VRMCache.getStatus()
        });
      }
    } catch (error) {
      console.error('VRM読み込みエラー:', error);
      MemoryMonitor.logMemoryInfo('VRM読み込みエラー');
      
      // メモリ不足の場合は緊急クリーンアップ
      if (MemoryMonitor.isMemoryDangerous()) {
        MemoryMonitor.emergencyMemoryCleanup();
        VRMCache.clearAll();
      }
      
      if (error instanceof Error && (error.message.includes('メモリ') || error.message.includes('memory'))) {
        setError(`メモリ不足のため読み込みに失敗しました。ブラウザを再起動してお試しください。`);
      } else {
        setError(`VRMファイルの読み込みに失敗しました: ${avatarData.name}`);
      }
      setIsLoading(false);
      currentLoadingPathRef.current = null; // エラー時にもクリア
    }
  }, [isLoading]);

  const handleContainerRef = useCallback((element: HTMLDivElement | null) => {
    console.log('handleContainerRef called:', { element: !!element, isInitialized: isInitializedRef.current });
    
    if (!element) {
      return;
    }
    
    containerRef.current = element;
    
    // React開発モードでの重複初期化を防ぐ
    if (isInitializedRef.current) {
      console.log('既に初期化済み、Three.js準備完了を通知');
      // 既に初期化済みの場合は即座に準備完了を通知
      setTimeout(() => setIsThreeJSReady(true), 0);
      return;
    }
    
    isInitializedRef.current = true;
    
    console.log('Three.js初期化を開始します');
    
    // Three.js初期化
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x212121);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      element.clientWidth / element.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 2);
    cameraRef.current = camera;

    // デバイスメモリに基づいたレンダリング設定
    const memoryGB = (navigator as any).deviceMemory || 4;
    const pixelRatio = memoryGB <= 4 ? 1.0 : memoryGB <= 8 ? 1.0 : Math.min(window.devicePixelRatio, 1.5);
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, // アンチエイリアス完全無効
      alpha: true,
      powerPreference: memoryGB <= 4 ? 'default' : 'high-performance',
      stencil: false,
      depth: true,
      logarithmicDepthBuffer: false,
      preserveDrawingBuffer: false, // メモリ節約
      premultipliedAlpha: false // メモリ節約
    });
    renderer.setSize(element.clientWidth, element.clientHeight);
    renderer.setPixelRatio(pixelRatio); // メモリに基づいたピクセル比
    renderer.shadowMap.enabled = false; // シャドウ完全無効
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // 低スペック向け追加最適化
    if (memoryGB <= 4) {
      renderer.precision = 'lowp';
      renderer.physicallyCorrectLights = false;
    }
    rendererRef.current = renderer;

    element.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = false; // シャドウ無効でパフォーマンス向上
    scene.add(directionalLight);

    // テスト用キューブ（VRM読み込み前の確認）
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const testCube = new THREE.Mesh(geometry, material);
    testCube.position.set(0, 0, 0);
    scene.add(testCube);
    testCubeRef.current = testCube;
    console.log('🟢 テスト用キューブを追加しました');

    // フレームレート制限付きアニメーションループ
    const animate = (currentTime: number) => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // デバイスメモリに基づいたFPS制限（緩和）
      const memoryGB = (navigator as any).deviceMemory || 4;
      const targetFPS = memoryGB <= 4 ? 15 : memoryGB <= 8 ? 30 : 60;
      const frameInterval = 1000 / targetFPS;
      
      if (currentTime - lastUpdateTimeRef.current < frameInterval) {
        return;
      }
      lastUpdateTimeRef.current = currentTime;
      
      // ページが見えている時のみレンダリング
      if (!isVisible) {
        return;
      }
      
      // テスト用キューブの回転
      if (testCubeRef.current) {
        testCubeRef.current.rotation.x += 0.01;
        testCubeRef.current.rotation.y += 0.01;
      }
      
      if (vrmRef.current) {
        const memoryGB = (navigator as any).deviceMemory || 4;
        const targetFPS = memoryGB <= 4 ? 15 : memoryGB <= 8 ? 30 : 60;
        const deltaTime = 1 / targetFPS;
        vrmRef.current.update(deltaTime);
      }
      
      renderer.render(scene, camera);
    };
    animate(0);

    const handleResize = () => {
      if (!element || !renderer || !camera) return;
      
      camera.aspect = element.clientWidth / element.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(element.clientWidth, element.clientHeight);
    };

    window.addEventListener('resize', handleResize);
    
    // ページの可視性を監視してレンダリングを停止
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Three.js初期化完了を通知
    console.log('Three.js初期化完了');
    setIsThreeJSReady(true);
  }, []);

  useEffect(() => {
    // メモリ監視開始
    MemoryMonitor.startMonitoring((usage) => {
      if (usage.status === 'critical') {
        console.warn('🚨 メモリ使用量が最大値に達しました');
        MemoryMonitor.emergencyMemoryCleanup();
        VRMCache.emergencyCleanup();
      }
    });
    
    return () => {
      // メモリ監視停止
      MemoryMonitor.stopMonitoring();
      
      // 既存のロードプロセスをキャンセル
      if (loadingControllerRef.current) {
        loadingControllerRef.current.abort();
      }
      
      // 読み込み中のパスをクリア
      currentLoadingPathRef.current = null;
      
      // テストキューブをクリア
      testCubeRef.current = null;
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      // VRMの完全なクリーンアップ
      if (vrmRef.current) {
        if (sceneRef.current) {
          sceneRef.current.remove(vrmRef.current.scene);
        }
        // 安全にdisposeを呼び出し
        if (typeof vrmRef.current.dispose === 'function') {
          vrmRef.current.dispose();
        }
        
        // VRMに関連するすべての参照をクリア
        if (vrmRef.current.expressionManager) {
          vrmRef.current.expressionManager = null;
        }
        if (vrmRef.current.lookAt) {
          vrmRef.current.lookAt = null;
        }
        if (vrmRef.current.humanoid) {
          vrmRef.current.humanoid = null;
        }
        vrmRef.current = null;
      }
      
      if (containerRef.current && rendererRef.current?.domElement) {
        try {
          containerRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) {
          console.warn('Failed to remove renderer DOM element:', e);
        }
      }
      
      if (rendererRef.current) {
        // WebGLレンダリングコンテキストの完全なクリーンアップ
        const gl = rendererRef.current.getContext();
        if (gl) {
          // テクスチャとバッファの明示的な削除
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext) {
            loseContext.loseContext();
          }
        }
        
        // レンダラーの完全なクリーンアップ
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current = null;
      }
      
      if (sceneRef.current) {
        // シーンの完全なクリーンアップ
        sceneRef.current.traverse((object: any) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material: any) => {
                if (material.map) material.map.dispose();
                if (material.normalMap) material.normalMap.dispose();
                if (material.emissiveMap) material.emissiveMap.dispose();
                if (material.roughnessMap) material.roughnessMap.dispose();
                if (material.metalnessMap) material.metalnessMap.dispose();
                if (material.aoMap) material.aoMap.dispose();
                material.dispose();
              });
            } else {
              if (object.material.map) object.material.map.dispose();
              if (object.material.normalMap) object.material.normalMap.dispose();
              if (object.material.emissiveMap) object.material.emissiveMap.dispose();
              if (object.material.roughnessMap) object.material.roughnessMap.dispose();
              if (object.material.metalnessMap) object.material.metalnessMap.dispose();
              if (object.material.aoMap) object.material.aoMap.dispose();
              object.material.dispose();
            }
          }
        });
        sceneRef.current.clear();
        sceneRef.current = null;
      }
      
      // TextureOptimizerのクリーンアップ
      TextureOptimizer.cleanup();
      
      document.removeEventListener('visibilitychange', () => {});
      window.removeEventListener('resize', () => {});
      
      // キャッシュクリア
      VRMCache.clearAll();
      
      // 最終メモリクリーンアップ（1回のみ）
      MemoryMonitor.emergencyMemoryCleanup();
    };
  }, []);

  const updateBodyShape = useCallback((bmiValue: number) => {
    if (!vrmRef.current) return;
    
    vrmRef.current.scene.traverse((object: any) => {
      if (object.isSkinnedMesh && object.morphTargetDictionary) {
        const blendShapeNames = avatarData.blendShapeNames;
        let bellyIndex = undefined;

        if (blendShapeNames.belly && object.morphTargetDictionary[blendShapeNames.belly] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.belly];
        } else if (blendShapeNames.weight && object.morphTargetDictionary[blendShapeNames.weight] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.weight];
        } else if (blendShapeNames.fat && object.morphTargetDictionary[blendShapeNames.fat] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.fat];
        }
        
        if (bellyIndex !== undefined) {
          let blendValue = 0;
          
          if (bmiValue <= 25) {
            blendValue = 0;
          } else if (bmiValue > 25 && bmiValue <= 30) {
            blendValue = ((bmiValue - 25) / 5) * 0.5;
          } else if (bmiValue > 30) {
            blendValue = Math.min(0.5 + ((bmiValue - 30) / 10) * 0.5, 1.0);
          }
          
          object.morphTargetInfluences[bellyIndex] = blendValue;
        }
      }
    });
  }, [avatarData]);

  useEffect(() => {
    console.log('useEffect [avatarData, isThreeJSReady]:', {
      avatarId: avatarData?.id,
      vrmPath: avatarData?.vrmPath,
      threeJSReady: isThreeJSReady
    });
    
    if (avatarData && isThreeJSReady) {
      console.log('loadVRM呼び出し開始:', avatarData.name);
      loadVRM(avatarData);
    } else if (!avatarData) {
      console.log('avatarDataがnull/undefinedです');
    } else if (!isThreeJSReady) {
      console.log('Three.jsが初期化されるまで待機中...');
    }
  }, [avatarData, isThreeJSReady]); // loadVRMを依存関係から削除

  useEffect(() => {
    if (currentBMI > 0) {
      updateBodyShape(currentBMI);
    }
  }, [currentBMI, updateBodyShape]);

  useEffect(() => {
    if (futureBMI.length === 0) return;

    const interval = setInterval(() => {
      setCurrentPredictionIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % futureBMI.length;
        const nextBMI = futureBMI[nextIndex].bmi;
        updateBodyShape(nextBMI);
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [futureBMI, updateBodyShape]);

  if (isLoading || error) {
    return (
      <div className="w-full h-full relative">
        <MemoryDebugPanel />
        <VRMLoadingIndicator 
          isLoading={isLoading}
          progress={loadingProgress}
          currentStep={loadingStep}
          error={error}
        />
      </div>
    );
  }

  console.log('VRMViewer render時の状態:', {
    isLoading,
    error,
    isThreeJSReady,
    containerRefExists: !!containerRef.current
  });

  return (
    <div className="w-full h-full relative">
      <MemoryDebugPanel />
      <div 
        ref={handleContainerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ minHeight: '400px', backgroundColor: '#f0f0f0' }}
      />
      
      {futureBMI.length > 0 && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-md text-sm">
          {futureBMI[currentPredictionIndex] && (
            <div>
              <p>期間: {futureBMI[currentPredictionIndex].period === 30 ? '1ヶ月後' : 
                     futureBMI[currentPredictionIndex].period === 365 ? '1年後' :
                     futureBMI[currentPredictionIndex].period === 1095 ? '3年後' :
                     futureBMI[currentPredictionIndex].period === 1825 ? '5年後' :
                     futureBMI[currentPredictionIndex].period === 3650 ? '10年後' : 
                     `${futureBMI[currentPredictionIndex].period}日後`}</p>
              <p>BMI: {futureBMI[currentPredictionIndex].bmi.toFixed(1)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}