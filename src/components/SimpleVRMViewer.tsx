'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import { AvatarData } from '../utils/avatarConfig';
import { calculateBMI } from '../utils/calculations';

interface SimpleVRMViewerProps {
  avatarData: AvatarData;
  currentBMI: number;
  dailySurplusCalories?: number;
  age?: number;
  height?: number;
  onSimulationStateChange?: (isRunning: boolean) => void;
  onSimulationCompletedChange?: (completed: boolean) => void;
  startSimulation?: boolean;
  stopSimulation?: boolean;
}

export default function SimpleVRMViewer({ 
  avatarData, 
  currentBMI, 
  dailySurplusCalories = 0, 
  age = 25, 
  height = 170,
  onSimulationStateChange,
  onSimulationCompletedChange,
  startSimulation = false,
  stopSimulation = false
}: SimpleVRMViewerProps) {
  // 🚨 コンポーネント再初期化検出（重要なデバッグポイント）
  const [componentInitCount, setComponentInitCount] = useState(0);
  
  useEffect(() => {
    setComponentInitCount(prev => {
      const newCount = prev + 1;
      if (newCount > 1) {
        // console.log(`🚨 異常な再初期化検出 #${newCount}: ${avatarData.name} (シミュレーション中: ${autoSimulation})`);
      } else {
        // console.log(`🎯 初回初期化: ${avatarData.name}, BMI: ${currentBMI.toFixed(1)}`);
      }
      return newCount;
    });
  }, [avatarData.vrmPath]); // vrmPathが変わった時のみ正常

  const containerRef = useRef<HTMLDivElement>(null);
  const vrmRef = useRef<any>(null);
  const [animationStatus, setAnimationStatus] = useState<string>('ロード中...');
  const [currentFatnessValue, setCurrentFatnessValue] = useState<number>(0.4); // レベル4（0.4）で初期化
  const [autoSimulation, setAutoSimulation] = useState<boolean>(false); // 外部制御に変更
  const [simulationMonth, setSimulationMonth] = useState<number>(0);
  const [simulationCompleted, setSimulationCompleted] = useState<boolean>(false); // シミュレーション完了状態
  const animationFrameRef = useRef<number | null>(null);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isExplicitReset = useRef<boolean>(false); // 明示的リセット中フラグ
  const animateToTargetFatnessRef = useRef<((targetValue: number, source: string) => void) | null>(null);

  // シミュレーション状態変更ログ
  useEffect(() => {
    // if (autoSimulation) console.log('🚀 シミュレーション開始');
    // else console.log('⏹️ シミュレーション停止');
  }, [autoSimulation]);

  // VRM読み込み状態を管理
  const [vrmLoaded, setVrmLoaded] = useState<boolean>(false);

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
        (progress) => {},
        // エラー時に呼ばれる
        (error) => {/* エラーログ無効化 */}
      );
    }

    // VRMの読み込み
    function tryInitVRM(gltf: any) {
      const vrm = gltf.userData.vrm;
      if (vrm == null) {
        // VRMでない場合も通常のGLTFとして読み込んでみる
        if (gltf.scene) {
          // console.log('✅ GLTF読み込み完了');
          currentVrm = { scene: gltf.scene, userData: gltf };
          vrmRef.current = currentVrm;
          setVrmLoaded(true);
          scene.add(gltf.scene);
          
          // シミュレーション中は現在の値を保持、そうでなければ初期値を適用
          const targetFatness = autoSimulation ? currentFatnessValue : 0.4;
          updateFatnessBlendShape(targetFatness, `VRM読み込み完了: ${autoSimulation ? 'シミュレーション値保持' : '初期値レベル4'}`);
          if (!autoSimulation) {
            setCurrentFatnessValue(0.4);
          }
          
          tryInitGLTFAnimations(gltf);
          setAnimationStatus('GLTFファイル読み込み完了');
        }
        return;
      }
      currentVrm = vrm;
      vrmRef.current = vrm;
      // console.log('✅ VRM読み込み完了');
      setVrmLoaded(true);
      scene.add(vrm.scene);
      
      VRMUtils.rotateVRM0(vrm);
      
      // シミュレーション中は現在の値を保持、そうでなければ初期値を適用
      const targetFatness = autoSimulation ? currentFatnessValue : 0.4;
      updateFatnessBlendShape(targetFatness, `VRM読み込み完了: ${autoSimulation ? 'シミュレーション値保持' : '初期値レベル4'}`);
      if (!autoSimulation) {
        setCurrentFatnessValue(0.4);
      }
      
      initAnimationClip();
      setAnimationStatus('VRM読み込み完了');
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
            
            // console.log(`✅ アニメーション開始`);
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
      // console.log('✅ VRMA読み込み完了');
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
          
          // console.log(`✅ VRMアニメーション開始`);
          setAnimationStatus(`アニメーション再生中`);
        } catch (error) {
          // console.error('❌ アニメーション初期化エラー:', error);
          setAnimationStatus('アニメーション初期化失敗');
        }
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
      if (currentVrm && !autoSimulation) {
        updateFatnessForBMI(currentVrm, currentBMI);
      }
    };

    // BMI変更を監視
    // handleBMIChange(); // シミュレーション中の干渉を防ぐため無効化

    // クリーンアップ
    return () => {
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };

  }, [avatarData.vrmPath]);

  // fatness値更新用の共通関数（デバッグ強化版）
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
                    // レベル4(0.4)への戻りを特に監視
                    const isLevel4Reset = Math.abs(fatnessValue - 0.4) < 0.001;
                    if (isResetPhenomenon || isLevel4Reset) {
                      console.log(`🚨 リセット現象検出: ${oldValue.toFixed(3)} → ${fatnessValue.toFixed(3)} (source: ${source})`);
                    }
                  }
                  break;
                }
              }
            }
          }
        });
      }
    }
  };

  // スムーズなアニメーション用の補間関数（重複防止機能付き）
  const animateToTargetFatness = useCallback((targetValue: number, source: string) => {
    // レベル4(0.4)への変更を特に監視
    if (Math.abs(targetValue - 0.4) < 0.001 && autoSimulation) {
      console.log(`🔍 シミュレーション中にレベル4要求: ${currentFatnessValue.toFixed(3)} → ${targetValue.toFixed(3)} (source: ${source})`);
      console.trace('呼び出し元のスタックトレース:');
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
      console.log(`🔄 Three.js実値を開始値に使用: React(${currentFatnessValue.toFixed(3)}) → Three.js(${actualThreeJSValue.toFixed(3)})`);
    }
    const startValue = actualStartValue;
    
    const startTime = performance.now();
    const duration = 800;

    // React StateとThree.js値の乖離を検出（重要）
    if (Math.abs(currentFatnessValue - actualThreeJSValue) > 0.01) {
      console.log(`🚨 STATE MISMATCH: React(${currentFatnessValue.toFixed(3)}) ≠ Three.js(${actualThreeJSValue.toFixed(3)})`);
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (targetValue - startValue) * easeProgress;
      
      // 中間値がレベル4(0.4)付近になる場合を検出
      if (Math.abs(currentValue - 0.4) < 0.05 && autoSimulation) {
        console.log(`⚠️ アニメーション中間値がレベル4付近: ${currentValue.toFixed(3)} (進捗:${(progress*100).toFixed(1)}%) start:${startValue.toFixed(3)} → target:${targetValue.toFixed(3)}`);
      }
      
      // リセット現象検出
      if (progress < 0.05 && currentValue > startValue && source.includes('痩せる')) {
        console.log(`🚨 開始直後値増加: ${startValue.toFixed(3)} → ${currentValue.toFixed(3)}`);
      }
      
      setCurrentFatnessValue(currentValue);
      updateFatnessBlendShape(currentValue, source);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
        // アニメーション完了時に確実に最終値を設定
        setCurrentFatnessValue(targetValue);
        updateFatnessBlendShape(targetValue, source + " (完了)");
        console.log(`✅ アニメーション完了: ${targetValue.toFixed(3)} (source: ${source})`);
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

  // 体組成データを計算（シミュレーション対応）
  const getBodyComposition = (bmi: number, ageYears: number) => {
    const weight = getWeight(bmi, height);
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
  
  // タイムライン生成ログ
  useEffect(() => {
    // console.log(`📈 タイムライン: ${dailySurplusCalories}kcal/日`);
  }, [dailySurplusCalories]);


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


  // BMI変更時の処理（初期値レベル4を保持・重複防止機能付き）
  useEffect(() => {
    if (!autoSimulation && 
        vrmRef.current && 
        simulationMonth === 0 && 
        vrmLoaded &&
        !isExplicitReset.current) {  // 明示的なリセット中は実行しない
      // 初期状態では常にレベル4（fatness 0.4）を保持
      animateToTargetFatness(0.4, `初期値レベル4を保持`);
    }
  }, [autoSimulation, simulationMonth, vrmLoaded]);

  // 中央集権的なリセット処理（重複防止機能付き）
  const executeReset = useCallback((reason: string, delay: number = 0) => {
    isExplicitReset.current = true;
    
    setTimeout(() => {
      setSimulationMonth(0);
      setCurrentStageIndex(0);
      setSimulationCompleted(false); // ★完了状態もリセット★
      if (animateToTargetFatnessRef.current) {
        animateToTargetFatnessRef.current(0.4, reason);
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

  // 外部からのシミュレーション開始制御
  useEffect(() => {
    if (startSimulation && !autoSimulation) {
      setCurrentStageIndex(0);
      setSimulationMonth(0);
      setSimulationCompleted(false); // ★開始時に完了状態をリセット★
      setAutoSimulation(true);
    }
  }, [startSimulation, autoSimulation]);

  // 外部からのシミュレーション停止制御
  useEffect(() => {
    if (stopSimulation && autoSimulation) {
      setManualStop(true);
      setAutoSimulation(false);
    }
  }, [stopSimulation, autoSimulation]);

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

  // autoSimulationがfalseになったときにリセット
  useEffect(() => {
    if (!autoSimulation) {
      setCurrentStageIndex(0);
      
      if (manualStop) {
        // 統一的なリセット処理を使用
        if (vrmRef.current) {
          executeReset(`手動停止: 初期値復帰`, 200);
        }
        setManualStop(false);
      }
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
            // console.log('🏁 シミュレーション完了');
            setAutoSimulation(false);
            setSimulationCompleted(true); // ★完了状態に設定★
            // ★自動リセットは行わず、ユーザーの明示的な操作を待つ★
            return timeStages.length - 1;
          }
          
          const targetMonth = timeStages[nextIndex];
          
          setSimulationMonth(targetMonth);
          
          // 新しいステージのBMIを計算してfatnessを更新
          const simulatedBMI = getSimulatedBMI(targetMonth);
          const fatnessLevel = calculateBMIBasedFatness(simulatedBMI);
          const fatnessValue = fatnessLevel / 10;
          
          const stageDescription = targetMonth === 1 ? '1ヶ月後' : 
                                  targetMonth === 12 ? '1年後' : 
                                  targetMonth === 36 ? '3年後' : 
                                  targetMonth === 60 ? '5年後' : '10年後';
          
          console.log(`📊 ${stageDescription}: BMI ${simulatedBMI.toFixed(1)} → Lvl${fatnessLevel} → fatness ${fatnessValue.toFixed(3)}`);
          
          // デバッグ: アニメーション開始前の状態確認
          console.log(`🎯 ${stageDescription} アニメーション準備: 現在値=${currentFatnessValue.toFixed(3)} → 目標値=${fatnessValue.toFixed(3)}`);
          
          setTimeout(() => {
            console.log(`🚀 ${stageDescription} アニメーション開始: ${fatnessValue.toFixed(3)}`);
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
      <div ref={containerRef} className="w-full h-full" />
      
      {/* シンプルなステータス表示 */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-sm">
        <p>🎂 年齢: {getDisplayAge()}歳 {autoSimulation && `(${simulationMonth === 1 ? '1ヶ月後' : simulationMonth === 12 ? '1年後' : simulationMonth === 36 ? '3年後' : simulationMonth === 60 ? '5年後' : simulationMonth === 120 ? '10年後' : '現在'})`}</p>
        <p>📊 BMI: {getDisplayBMI().toFixed(1)} ({getBMICategory(getDisplayBMI())})</p>
        <p>💪 推定筋量: {getCurrentBodyComposition().muscleMass.toFixed(1)}kg</p>
        <p>🫀 推定脂肪量: {getCurrentBodyComposition().fatMass.toFixed(1)}kg</p>
        <p>🎚️ Fatness: {currentFatnessValue.toFixed(3)} (Level: {calculateBMIBasedFatness(autoSimulation ? getSimulatedBMI(simulationMonth) : currentBMI)})</p>
        {autoSimulation && (
          <p style={{fontSize: '10px', color: '#ffff99'}}>
            🔍 Debug: 現在BMI({currentBMI.toFixed(1)}) → シミュBMI({getSimulatedBMI(simulationMonth).toFixed(1)}) → Level({calculateBMIBasedFatness(getSimulatedBMI(simulationMonth))})
          </p>
        )}
      </div>



    </div>
  );
}