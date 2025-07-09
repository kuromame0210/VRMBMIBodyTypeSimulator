import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

export class ThumbnailGenerator {
  private static scene: THREE.Scene;
  private static camera: THREE.PerspectiveCamera;
  private static renderer: THREE.WebGLRenderer;
  private static initialized = false;

  /**
   * Three.jsシーンを初期化
   */
  private static init() {
    if (this.initialized) return;

    // オフスクリーンでレンダリング用のシーンを作成
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // カメラの設定
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    this.camera.position.set(0, 1.5, 2.5);
    this.camera.lookAt(0, 1, 0);

    // オフスクリーンレンダラーの設定
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true // スクリーンショット用
    });
    this.renderer.setSize(512, 512); // 512x512のサムネイル
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ライトの設定
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 2, 2);
    this.scene.add(directionalLight);

    // 補助光（顔を明るくする）
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.4);
    frontLight.position.set(0, 1, 1);
    this.scene.add(frontLight);

    this.initialized = true;
    console.log('🎨 ThumbnailGenerator初期化完了');
  }

  /**
   * VRMファイルからサムネイル画像を生成
   */
  static async generateThumbnail(vrmPath: string): Promise<string> {
    this.init();

    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));

      console.log('📸 サムネイル生成開始:', vrmPath);

      loader.load(
        vrmPath,
        (gltf) => {
          const vrm = gltf.userData.vrm;
          if (!vrm) {
            reject(new Error('VRMデータが見つかりません'));
            return;
          }

          // VRMをシーンに追加
          this.scene.add(vrm.scene);
          VRMUtils.rotateVRM0(vrm);

          // カメラ位置をVRMのサイズに合わせて調整
          const box = new THREE.Box3().setFromObject(vrm.scene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          // 全体が見えるようにカメラを調整
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = this.camera.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
          cameraZ *= 1.6; // 全体を収めつつより近い距離で撮影
          
          this.camera.position.set(center.x, center.y, center.z + cameraZ);
          this.camera.lookAt(center.x, center.y, center.z);

          // レンダリング
          this.renderer.render(this.scene, this.camera);

          // Canvas から画像データを取得
          const canvas = this.renderer.domElement;
          const dataURL = canvas.toDataURL('image/png');

          // シーンからVRMを削除
          this.scene.remove(vrm.scene);

          // VRMのメモリ解放
          vrm.scene.traverse((object: any) => {
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

          console.log('✅ サムネイル生成完了:', vrmPath);
          resolve(dataURL);
        },
        (progress) => {
          console.log('📊 サムネイル生成進捗:', Math.round((progress.loaded / progress.total) * 100) + '%');
        },
        (error) => {
          console.error('❌ サムネイル生成失敗:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * DataURLからBlobを作成
   */
  static dataURLtoBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  /**
   * サムネイルをダウンロード
   */
  static downloadThumbnail(dataURL: string, filename: string) {
    const blob = this.dataURLtoBlob(dataURL);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * VRMパスからサムネイル用のファイル名を生成
   */
  static generateThumbnailFileName(vrmPath: string): string {
    const pathParts = vrmPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const nameWithoutExt = fileName.replace('.vrm', '');
    return `${nameWithoutExt}.png`;
  }

  /**
   * サムネイルの保存用パスを生成
   */
  static generateThumbnailPath(vrmPath: string): string {
    const fileName = this.generateThumbnailFileName(vrmPath);
    return `/vrm-models/thumbnails/${fileName}`;
  }

  /**
   * 複数のVRMファイルからサムネイルを一括生成
   */
  static async generateThumbnails(vrmPaths: string[]): Promise<Record<string, string>> {
    const thumbnails: Record<string, string> = {};
    
    for (const path of vrmPaths) {
      try {
        const thumbnail = await this.generateThumbnail(path);
        thumbnails[path] = thumbnail;
      } catch (error) {
        console.error(`サムネイル生成失敗 ${path}:`, error);
        // デフォルトのプレースホルダー画像を設定
        thumbnails[path] = '/placeholder-avatar.png';
      }
    }
    
    return thumbnails;
  }

  /**
   * 生成したサムネイルをローカルストレージに保存
   */
  static saveThumbnailsToStorage(thumbnails: Record<string, string>) {
    try {
      localStorage.setItem('vrm-thumbnails', JSON.stringify(thumbnails));
      console.log('💾 サムネイルをローカルストレージに保存しました');
    } catch (error) {
      console.error('ローカルストレージへの保存に失敗:', error);
    }
  }

  /**
   * ローカルストレージからサムネイルを読み込み
   */
  static loadThumbnailsFromStorage(): Record<string, string> {
    try {
      const stored = localStorage.getItem('vrm-thumbnails');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('ローカルストレージからの読み込みに失敗:', error);
    }
    return {};
  }

  /**
   * リソースのクリーンアップ
   */
  static cleanup() {
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.scene) {
      this.scene.clear();
    }
    this.initialized = false;
    console.log('🧹 ThumbnailGenerator クリーンアップ完了');
  }
}