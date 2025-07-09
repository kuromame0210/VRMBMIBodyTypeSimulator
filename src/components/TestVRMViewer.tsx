'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

// グローバル変数で重複を防ぐ
let globalVRMInstance: any = null;
let globalInstanceCount = 0;

interface TestVRMViewerProps {
  avatarData?: {
    id: string;
    name: string;
    vrmPath: string;
  };
}

export default function TestVRMViewer({ avatarData }: TestVRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  const vrmRef = useRef<any>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const instanceIdRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;
    
    isInitializedRef.current = true;
    globalInstanceCount++;
    instanceIdRef.current = globalInstanceCount;
    
    console.log(`🚀 TestVRMViewer 開始 (インスタンス #${instanceIdRef.current})`);
    
    // 最新のインスタンス以外は初期化をスキップ
    if (instanceIdRef.current !== globalInstanceCount) {
      console.log(`⚠️ インスタンス #${instanceIdRef.current} は古いため初期化をスキップ`);
      return;
    }

    // 基本的なThree.js設定
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x212121);
    sceneRef.current = scene;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 1, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // ライト
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // テスト用キューブ
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const testCube = new THREE.Mesh(geometry, material);
    scene.add(testCube);
    console.log('🟢 テスト用キューブ追加');

    // アニメーションループ
    function animate() {
      requestAnimationFrame(animate);
      testCube.rotation.x += 0.01;
      testCube.rotation.y += 0.01;
      renderer.render(scene, camera);
    }
    animate();

    // リサイズハンドラー
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // VRM読み込みテスト
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    // アバターデータからVRMパスを決定（デフォルトは男性アバター）
    const vrmPath = avatarData?.vrmPath || '/vrm-models/m_0_22.vrm';
    console.log('📦 VRM読み込み開始:', vrmPath, avatarData?.name || 'デフォルト');
    
    loader.load(
      vrmPath,
      (gltf) => {
        console.log('✅ GLTF読み込み成功:', gltf);
        
        const vrm = gltf.userData.vrm;
        console.log('🎯 VRMオブジェクト:', vrm);
        
        if (vrm && !globalVRMInstance) {
          // グローバルインスタンスに保存
          globalVRMInstance = vrm;
          vrmRef.current = vrm;
          
          // テストキューブを削除
          scene.remove(testCube);
          
          // VRMを追加
          scene.add(vrm.scene);
          VRMUtils.rotateVRM0(vrm);
          
          // カメラ位置調整
          const box = new THREE.Box3().setFromObject(vrm.scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          console.log('📐 VRMサイズ情報:', { center, size });
          
          camera.position.set(0, center.y, 2);
          camera.lookAt(center);
          
          console.log('🎉 VRM表示完了');
        } else if (globalVRMInstance) {
          console.log('⚠️ VRMは既に読み込み済みです。既存のVRMを使用します。');
          vrmRef.current = globalVRMInstance;
          scene.remove(testCube);
          scene.add(globalVRMInstance.scene);
          
          // カメラ位置調整
          const box = new THREE.Box3().setFromObject(globalVRMInstance.scene);
          const center = box.getCenter(new THREE.Vector3());
          camera.position.set(0, center.y, 2);
          camera.lookAt(center);
        } else {
          console.error('❌ VRMオブジェクトが見つかりません');
        }
      },
      (progress) => {
        console.log('📊 読み込み進捗:', Math.round((progress.loaded / progress.total) * 100) + '%');
      },
      (error) => {
        console.error('❌ VRM読み込みエラー:', error);
      }
    );

    // クリーンアップ
    return () => {
      isInitializedRef.current = false;
      window.removeEventListener('resize', handleResize);
      
      // VRMのクリーンアップ
      if (vrmRef.current && sceneRef.current) {
        sceneRef.current.remove(vrmRef.current.scene);
        vrmRef.current = null;
      }
      
      if (containerRef.current && renderer.domElement && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // アバターデータが変更されたときに新しいVRMを読み込む
  useEffect(() => {
    if (!sceneRef.current || !avatarData) return;

    const loadNewVRM = async () => {
      console.log('🔄 アバター変更:', avatarData.name);
      
      // 既存のVRMを削除
      if (vrmRef.current && sceneRef.current) {
        sceneRef.current.remove(vrmRef.current.scene);
        vrmRef.current = null;
      }
      
      // グローバルインスタンスもクリア
      globalVRMInstance = null;
      
      // 新しいVRMを読み込み
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      
      try {
        const gltf = await loader.loadAsync(avatarData.vrmPath);
        const vrm = gltf.userData.vrm;
        
        if (vrm && sceneRef.current) {
          globalVRMInstance = vrm;
          vrmRef.current = vrm;
          sceneRef.current.add(vrm.scene);
          VRMUtils.rotateVRM0(vrm);
          
          // カメラ位置調整
          const box = new THREE.Box3().setFromObject(vrm.scene);
          const center = box.getCenter(new THREE.Vector3());
          
          // カメラの参照は初期化時に作成されたものを使用
          if (cameraRef.current) {
            cameraRef.current.position.set(0, center.y, 2);
            cameraRef.current.lookAt(center);
          }
          
          console.log('🎉 新しいVRM表示完了:', avatarData.name);
        }
      } catch (error) {
        console.error('❌ VRM読み込みエラー:', error);
      }
    };
    
    loadNewVRM();
  }, [avatarData]);

  return (
    <div className="w-full h-full">
      <div 
        ref={containerRef}
        className="w-full h-full rounded"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}