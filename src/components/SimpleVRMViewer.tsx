'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { createVRMAnimationClip, VRMAnimationLoaderPlugin } from '@pixiv/three-vrm-animation';
import { AvatarData } from '../utils/avatarConfig';

interface SimpleVRMViewerProps {
  avatarData: AvatarData;
  currentBMI: number;
}

export default function SimpleVRMViewer({ avatarData, currentBMI }: SimpleVRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vrmRef = useRef<any>(null);

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
    }

    // VRMAの読み込み
    function tryInitVRMA(gltf: any) {
      const vrmAnimations = gltf.userData.vrmAnimations;
      if (vrmAnimations == null) {
        return;
      }
      currentVrmAnimation = vrmAnimations[0] ?? null;
      initAnimationClip();
    }

    // アニメーションクリップの初期化
    function initAnimationClip() {
      if (currentVrm && currentVrmAnimation) {
        currentMixer = new THREE.AnimationMixer(currentVrm.scene);
        const clip = createVRMAnimationClip(currentVrmAnimation, currentVrm);
        const action = currentMixer.clipAction(clip);
        action.play();
        console.log('🎬 VRMアニメーション開始');
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

      // fatnessブレンドシェイプを探して適用
      vrm.scene.traverse((object: any) => {
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
    
    // ローダーの準備
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

    // VRMとVRMAの読み込み
    load(avatarData.vrmPath);
    load('/vrm-models/mixamoAnimation.vrma');

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
      if (currentVrm) {
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

  // BMI変更時の処理
  useEffect(() => {
    if (vrmRef.current) {
      console.log(`🔄 BMI変更検出: ${currentBMI}`);
      
      // BMI値を0-1の範囲に変換
      let fatnessValue = 0;
      if (currentBMI < 18.5) {
        fatnessValue = Math.max(0, (currentBMI - 15) / 10); // 痩せ型
      } else if (currentBMI >= 25) {
        fatnessValue = Math.min(1.0, (currentBMI - 22) / 8); // 肥満型
      }

      // fatnessブレンドシェイプを動的更新
      vrmRef.current.scene.traverse((object: any) => {
        if (object.isSkinnedMesh && object.morphTargetDictionary) {
          const fatnessNames = ['fatness', 'fat', 'belly', 'weight'];
          
          for (const name of fatnessNames) {
            if (object.morphTargetDictionary[name] !== undefined) {
              const index = object.morphTargetDictionary[name];
              if (object.morphTargetInfluences) {
                object.morphTargetInfluences[index] = fatnessValue;
                console.log(`✅ BMI ${currentBMI} → ${name}: ${fatnessValue.toFixed(2)}`);
                break;
              }
            }
          }
        }
      });
    }
  }, [currentBMI]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* シンプルなステータス表示 */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-sm">
        <p>🎭 {avatarData.name}</p>
        <p>📊 BMI: {currentBMI.toFixed(1)}</p>
      </div>
    </div>
  );
}