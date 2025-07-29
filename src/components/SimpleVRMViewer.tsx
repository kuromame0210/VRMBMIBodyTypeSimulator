'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import { AvatarData } from '../utils/avatarConfig';

interface SimpleVRMViewerProps {
  avatarData: AvatarData;
  currentBMI: number;
  dailySurplusCalories?: number;
}

export default function SimpleVRMViewer({ avatarData, currentBMI, dailySurplusCalories = 0 }: SimpleVRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vrmRef = useRef<any>(null);
  const [animationStatus, setAnimationStatus] = useState<string>('ロード中...');
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [manualFatness, setManualFatness] = useState<number>(5);
  const [currentFatnessValue, setCurrentFatnessValue] = useState<number>(0.5);
  const [predictionMode, setPredictionMode] = useState<boolean>(false);
  const [autoSimulation, setAutoSimulation] = useState<boolean>(false);
  const [simulationMonth, setSimulationMonth] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // シーンの生成
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x212121);

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
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x212121, 1.0);
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
        (progress) => console.log(
          "Loading model...", 
          100.0 * (progress.loaded / progress.total), "%" 
        ),
        // エラー時に呼ばれる
        (error) => console.error(error)
      );
    }

    // VRMの読み込み
    function tryInitVRM(gltf: any) {
      const vrm = gltf.userData.vrm;
      if (vrm == null) {
        // VRMでない場合も通常のGLTFとして読み込んでみる
        if (gltf.scene) {
          console.log('🔍 VRM拡張なし、通常GLTFとして処理');
          currentVrm = { scene: gltf.scene, userData: gltf };
          vrmRef.current = currentVrm;
          scene.add(gltf.scene);
          
          // BMI連携: fatnessブレンドシェイプを更新
          updateFatnessForBMI(currentVrm, currentBMI);
          
          // 標準glTFアニメーションを確認
          tryInitGLTFAnimations(gltf);
          
          setAnimationStatus('GLTFファイル読み込み完了');
        }
        return;
      }
      currentVrm = vrm;
      vrmRef.current = vrm; // Refに保存
      scene.add(vrm.scene);
      
      // VRM向き補正（重要！）
      VRMUtils.rotateVRM0(vrm);
      
      // BMI連携: fatnessブレンドシェイプを更新
      updateFatnessForBMI(vrm, currentBMI);
      
      initAnimationClip();
      setAnimationStatus('VRM読み込み完了');
    }

    // 標準glTFアニメーションの読み込み
    function tryInitGLTFAnimations(gltf: any) {
      if (gltf.animations && gltf.animations.length > 0) {
        console.log('🎬 標準glTFアニメーション発見:', gltf.animations.length + '個');
        gltf.animations.forEach((anim: any, index: number) => {
          console.log(`  Animation ${index}: "${anim.name}" (${anim.tracks?.length || 0} tracks)`);
        });
        
        // 最初のアニメーションを使用
        const firstAnimation = gltf.animations[0];
        if (firstAnimation) {
          try {
            currentMixer = new THREE.AnimationMixer(gltf.scene);
            const action = currentMixer.clipAction(firstAnimation);
            
            // アニメーション設定
            action.reset();
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.clampWhenFinished = false;
            action.enabled = true;
            action.play();
            
            console.log('✅ 標準glTFアニメーション開始成功');
            console.log(`  - アニメーション名: "${firstAnimation.name}"`);
            console.log(`  - 長さ: ${firstAnimation.duration.toFixed(1)}秒`);
            setAnimationStatus(`GLTFアニメーション再生中: ${firstAnimation.name} (${firstAnimation.duration.toFixed(1)}秒)`);
          } catch (error) {
            console.error('❌ 標準glTFアニメーション初期化エラー:', error);
            setAnimationStatus('GLTFアニメーション初期化失敗');
          }
        }
      } else {
        console.log('⚠️ 標準glTFアニメーションが見つかりません');
        setAnimationStatus('アニメーションなし');
      }
    }

    // VRMAの読み込み
    function tryInitVRMA(gltf: any) {
      const vrmAnimations = gltf.userData.vrmAnimations;
      if (vrmAnimations == null) {
        console.log('⚠️ VRMAアニメーションが見つかりません');
        setAnimationStatus('アニメーションなし');
        return;
      }
      currentVrmAnimation = vrmAnimations[0] ?? null;
      console.log('✅ VRMAアニメーション読み込み完了:', vrmAnimations.length + '個');
      setAnimationStatus('アニメーション読み込み完了');
      initAnimationClip();
    }

    // アニメーションクリップの初期化
    function initAnimationClip() {
      if (currentVrm && currentVrmAnimation) {
        console.log('🎬 アニメーション初期化開始');
        console.log('  - VRM:', !!currentVrm);
        console.log('  - VRMAnimation:', !!currentVrmAnimation);
        console.log('  - VRMメタ存在:', !!(currentVrm.meta || currentVrm.userData?.vrm?.meta));
        
        // VRMメタデータが存在するかチェック
        const hasVRMMeta = !!(currentVrm.meta || currentVrm.userData?.vrm?.meta);
        
        if (!hasVRMMeta) {
          console.log('⚠️ VRMメタデータなし、VRMアニメーションはスキップ');
          setAnimationStatus('VRMアニメーション未対応（GLBファイル）');
          return;
        }
        
        try {
          const scene = currentVrm.scene || currentVrm;
          currentMixer = new THREE.AnimationMixer(scene);
          const clip = createVRMAnimationClip(currentVrmAnimation, currentVrm);
          const action = currentMixer.clipAction(clip);
          
          // アニメーション設定を調整
          action.reset();
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.clampWhenFinished = false;
          action.enabled = true;
          action.play();
          
          console.log('✅ VRMアニメーション開始成功');
          console.log('  - クリップ長:', clip.duration + '秒');
          console.log('  - アクション状態:', action.enabled);
          setAnimationStatus(`アニメーション再生中 (${clip.duration.toFixed(1)}秒)`);
        } catch (error) {
          console.error('❌ アニメーション初期化エラー:', error);
          setAnimationStatus('アニメーション初期化失敗');
        }
      } else {
        console.log('⚠️ アニメーション初期化待機中:', {
          hasVrm: !!currentVrm,
          hasAnimation: !!currentVrmAnimation
        });
      }
    }

    // BMI連携: fatnessブレンドシェイプ更新
    function updateFatnessForBMI(vrm: any, bmi: number) {
      if (!vrm) return;

      // BMI値を0-1の範囲に変換
      let fatnessValue = 0;
      if (bmi < 18.5) {
        fatnessValue = Math.max(0, (bmi - 15) / 10); // 痩せ型
      } else if (bmi >= 25) {
        fatnessValue = Math.min(1.0, (bmi - 22) / 8); // 肥満型
      }

      console.log(`🎯 BMI ${bmi} → Fatness ${fatnessValue.toFixed(2)}`);

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
                  object.morphTargetInfluences[index] = fatnessValue;
                  console.log(`✅ ${name}ブレンドシェイプ更新: ${fatnessValue}`);
                  break;
                }
              }
            }
          }
        });
      }
    }
    
    // ローダーの準備
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

    // VRMファイルの読み込み
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

    // BMI変更時の更新
    const handleBMIChange = () => {
      if (currentVrm) {
        updateFatnessForBMI(currentVrm, currentBMI);
      }
    };

    // BMI変更を監視
    handleBMIChange();

    // クリーンアップ
    return () => {
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };

  }, [avatarData.vrmPath]);

  // fatness値更新用の共通関数
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
                  object.morphTargetInfluences[index] = fatnessValue;
                  console.log(`✅ ${source} → ${name}: ${fatnessValue.toFixed(2)}`);
                  break;
                }
              }
            }
          }
        });
      }
    }
  };

  // スムーズなアニメーション用の補間関数
  const animateToTargetFatness = (targetValue: number, source: string) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startValue = currentFatnessValue;
    const startTime = performance.now();
    const duration = 800; // アニメーション時間（ミリ秒）

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutCubic関数でスムーズなアニメーション
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetValue - startValue) * easeProgress;
      
      setCurrentFatnessValue(currentValue);
      updateFatnessBlendShape(currentValue, source);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // BMI分類を判定する関数
  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return '痩せ';
    if (bmi < 25) return '普通';
    if (bmi < 30) return '軽度肥満';
    return '肥満';
  };

  // BMIベースのfatnessレベルを計算（改良版：より細かい調整）
  const calculateBMIBasedFatness = (bmi: number): number => {
    if (bmi < 16) {
      return 0; // 極痩せ
    } else if (bmi < 18.5) {
      return 1; // 痩せ
    } else if (bmi < 22) {
      return 2; // 標準下位
    } else if (bmi < 25) {
      return Math.round(2 + (bmi - 22) * 0.33); // 標準上位
    } else if (bmi < 27.5) {
      return Math.round(3 + (bmi - 25) * 0.8); // 軽度肥満
    } else if (bmi < 30) {
      return Math.round(5 + (bmi - 27.5) * 0.8); // 中度肥満
    } else if (bmi < 35) {
      return Math.round(7 + (bmi - 30) * 0.4); // 重度肥満
    } else {
      return Math.min(10, Math.round(9 + (bmi - 35) * 0.2)); // 極重度肥満
    }
  };

  // 余剰カロリーベースの未来予測fatnessレベルを計算
  const calculatePredictedFatness = (currentBmi: number, surplusCalories: number, months: number): number => {
    // 7700kcal = 約1kg の脂肪
    const weightChangeKg = (surplusCalories * 30 * months) / 7700;
    // 仮定: 身長170cm（BMI計算用）
    const estimatedHeight = 1.7;
    const currentWeight = currentBmi * (estimatedHeight * estimatedHeight);
    const predictedWeight = currentWeight + weightChangeKg;
    const predictedBmi = predictedWeight / (estimatedHeight * estimatedHeight);
    
    return calculateBMIBasedFatness(predictedBmi);
  };

  // シミュレーション用のタイムライン定義（指定された値に基づく）
  const simulationTimeline = [
    { months: 0, bmi: currentBMI, totalCalories: 0, description: '現在' },
    { months: 12, bmi: 22.5, totalCalories: 36500, description: '1年後' },
    { months: 36, bmi: 26.0, totalCalories: 109500, description: '3年後' },
    { months: 60, bmi: 29.5, totalCalories: 182500, description: '5年後' },
    { months: 120, bmi: 38.3, totalCalories: 365000, description: '10年後' }
  ];

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
    return beforePoint.bmi + (afterPoint.bmi - beforePoint.bmi) * progress;
  };

  // 11段階のfatnessレベル定義
  const fatnessLevels = [
    { level: 0, label: '極痩せ', months: 0, description: '現在' },
    { level: 1, label: '痩せ', months: 0, description: '現在' },
    { level: 2, label: '標準', months: 0, description: '現在' },
    { level: 3, label: '軽度+', months: 1, description: '1ヶ月後' },
    { level: 4, label: '軽度++', months: 3, description: '3ヶ月後' },
    { level: 5, label: '中度', months: 6, description: '6ヶ月後' },
    { level: 6, label: '中度+', months: 12, description: '1年後' },
    { level: 7, label: '重度', months: 18, description: '1.5年後' },
    { level: 8, label: '重度+', months: 24, description: '2年後' },
    { level: 9, label: '極重度', months: 36, description: '3年後' },
    { level: 10, label: '最大', months: 60, description: '5年後' }
  ];

  // BMI変更時の処理（デバッグ関係なく自動調整）
  useEffect(() => {
    if (!autoSimulation && vrmRef.current) {
      console.log(`🔄 BMI変更検出: ${currentBMI} (${getBMICategory(currentBMI)})`);
      
      const fatnessLevel = calculateBMIBasedFatness(currentBMI);
      const fatnessValue = fatnessLevel / 10; // 0-10を0-1に変換
      
      animateToTargetFatness(fatnessValue, `BMI ${currentBMI} → Level ${fatnessLevel}`);
    }
  }, [currentBMI, autoSimulation]);

  // 予測モード時の処理
  useEffect(() => {
    if (predictionMode && vrmRef.current && dailySurplusCalories !== 0) {
      const targetLevel = calculatePredictedFatness(currentBMI, dailySurplusCalories, fatnessLevels[manualFatness].months);
      const fatnessValue = Math.min(targetLevel / 10, 1.0); // 0-10を0-1に変換
      
      animateToTargetFatness(fatnessValue, `予測 ${fatnessLevels[manualFatness].description} → Level ${targetLevel}`);
    }
  }, [predictionMode, manualFatness, currentBMI, dailySurplusCalories]);

  // デバッグモード時の手動fatness制御
  useEffect(() => {
    if (debugMode && !predictionMode && vrmRef.current) {
      const fatnessValue = manualFatness / 10; // 0-10を0-1に変換
      animateToTargetFatness(fatnessValue, `手動制御 Level ${manualFatness}`);
    }
  }, [manualFatness, debugMode, predictionMode]);

  // 自動シミュレーション処理
  useEffect(() => {
    if (autoSimulation && vrmRef.current) {
      const interval = setInterval(() => {
        setSimulationMonth(prev => {
          const nextMonth = prev + 1;
          
          // 10年（120ヶ月）で終了
          if (nextMonth > 120) {
            setAutoSimulation(false);
            return 120;
          }
          
          // 新しい月のBMIを計算してfatnessを更新
          const simulatedBMI = getSimulatedBMI(nextMonth);
          const fatnessLevel = calculateBMIBasedFatness(simulatedBMI);
          const fatnessValue = fatnessLevel / 10;
          
          setTimeout(() => {
            animateToTargetFatness(fatnessValue, `月 ${nextMonth}: BMI ${simulatedBMI.toFixed(1)} → Level ${fatnessLevel}`);
          }, 100);
          
          return nextMonth;
        });
      }, 3000); // 3秒ごと
      
      simulationTimerRef.current = interval;
      
      return () => {
        if (simulationTimerRef.current) {
          clearInterval(simulationTimerRef.current);
        }
      };
    }
  }, [autoSimulation]);

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
      <div ref={containerRef} className="w-full h-full" />
      
      {/* シンプルなステータス表示 */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-sm">
        <p>🎭 {avatarData.name}</p>
        <p>📊 BMI: {currentBMI.toFixed(1)} ({getBMICategory(currentBMI)})</p>
        <p>🎬 {animationStatus}</p>
        {debugMode && (
          <p>🔧 手動Fatness: Level {manualFatness} ({currentFatnessValue.toFixed(2)})</p>
        )}
        {predictionMode && (
          <p>🔮 予測モード: {fatnessLevels[manualFatness].description}</p>
        )}
        {predictionMode && dailySurplusCalories !== 0 && (
          <p>🍕 余剰カロリー: {dailySurplusCalories}kcal/日</p>
        )}
        {autoSimulation && (
          <>
            <p>⏰ シミュレーション: {simulationMonth}ヶ月経過</p>
            <p>📈 予測BMI: {getSimulatedBMI(simulationMonth).toFixed(1)}</p>
            <p>🔥 累計カロリー: {Math.round((simulationMonth / 12) * (simulationMonth <= 12 ? 36500 : simulationMonth <= 36 ? 109500 : simulationMonth <= 60 ? 182500 : 365000) / (simulationMonth <= 12 ? 1 : simulationMonth <= 36 ? 3 : simulationMonth <= 60 ? 5 : 10)).toLocaleString()}kcal</p>
          </>
        )}
      </div>

      {/* デバッグコントロールパネル */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-sm space-y-2">
        <button
          onClick={() => setDebugMode(!debugMode)}
          className={`px-3 py-1 rounded text-xs font-bold w-full ${
            debugMode 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {debugMode ? '🔧 デバッグOFF' : '🔧 デバッグON'}
        </button>
        
        {debugMode && (
          <button
            onClick={() => setPredictionMode(!predictionMode)}
            className={`px-3 py-1 rounded text-xs font-bold w-full ${
              predictionMode 
                ? 'bg-purple-600 hover:bg-purple-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {predictionMode ? '🔮 予測OFF' : '🔮 予測ON'}
          </button>
        )}
        
        <button
          onClick={() => {
            if (autoSimulation) {
              setAutoSimulation(false);
              setSimulationMonth(0);
            } else {
              setAutoSimulation(true);
              setSimulationMonth(0);
            }
          }}
          className={`px-3 py-1 rounded text-xs font-bold w-full ${
            autoSimulation 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-orange-600 hover:bg-orange-700'
          }`}
        >
          {autoSimulation ? '⏹️ 停止' : '▶️ 自動シミュレーション'}
        </button>
      </div>

      {/* 11段階Fatness調整UI */}
      {debugMode && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-90 text-white p-4 rounded-lg max-h-96 overflow-y-auto">
          <h3 className="text-sm font-bold mb-3">
            {predictionMode ? '🔮 未来予測シミュレーション' : '🎚️ Fatness手動制御'}
          </h3>
          <div className="flex flex-col space-y-1">
            {fatnessLevels.map((levelData) => {
              const isCurrentBMILevel = !debugMode && !predictionMode && 
                calculateBMIBasedFatness(currentBMI) === levelData.level;
              
              return (
                <button
                  key={levelData.level}
                  onClick={() => setManualFatness(levelData.level)}
                  className={`px-3 py-2 rounded text-xs font-medium transition-all text-left ${
                    manualFatness === levelData.level
                      ? predictionMode 
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-green-600 text-white shadow-lg'
                      : isCurrentBMILevel
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>Lv{levelData.level}: {levelData.label}</span>
                    <span className="text-xs opacity-75">
                      {predictionMode ? levelData.description : `${(levelData.level / 10).toFixed(1)}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-600">
            <p className="text-xs text-gray-300">
              現在値: {currentFatnessValue.toFixed(2)} / 1.00
            </p>
            <p className="text-xs text-gray-400">
              目標値: {(manualFatness / 10).toFixed(2)}
            </p>
            {predictionMode && (
              <p className="text-xs text-purple-300">
                時間軸: {fatnessLevels[manualFatness].description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}