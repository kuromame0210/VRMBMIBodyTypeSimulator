import * as THREE from 'three';

export class TextureOptimizer {
  private static canvas: HTMLCanvasElement | null = null;
  private static context: CanvasRenderingContext2D | null = null;
  private static processedTextures = new WeakSet<THREE.Texture>();

  /**
   * デバイスメモリに基づいてテクスチャを最適化
   */
  static optimizeTexture(texture: THREE.Texture, memoryGB: number): THREE.Texture {
    if (!texture || !texture.image) return texture;
    
    // 既に処理済みのテクスチャはスキップ
    if (this.processedTextures.has(texture)) {
      return texture;
    }

    // メモリ容量に基づく最適化レベル
    const optimizationLevel = memoryGB <= 4 ? 'ultra' : memoryGB <= 8 ? 'high' : 'medium';
    
    let optimizedTexture: THREE.Texture;
    switch (optimizationLevel) {
      case 'ultra':
        optimizedTexture = this.compressTexture(texture, 0.25, 512); // 25%品質、最大512px
        break;
      case 'high':
        optimizedTexture = this.compressTexture(texture, 0.5, 1024); // 50%品質、最大1024px
        break;
      case 'medium':
        optimizedTexture = this.compressTexture(texture, 0.75, 2048); // 75%品質、最大2048px
        break;
      default:
        optimizedTexture = texture;
    }
    
    // 処理済みとしてマーク
    this.processedTextures.add(optimizedTexture);
    return optimizedTexture;
  }

  /**
   * テクスチャを圧縮・リサイズ
   */
  private static compressTexture(texture: THREE.Texture, quality: number, maxSize: number): THREE.Texture {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
    }

    if (!this.context) return texture;

    const image = texture.image;
    const { width, height } = this.calculateOptimalSize(image.width, image.height, maxSize);

    this.canvas.width = width;
    this.canvas.height = height;

    // 画像をcanvasに描画（リサイズ）
    this.context.drawImage(image, 0, 0, width, height);

    // JPEGで圧縮
    const compressedDataUrl = this.canvas.toDataURL('image/jpeg', quality);
    
    // 新しいテクスチャを作成
    const compressedTexture = new THREE.Texture();
    const img = new Image();
    
    img.onload = () => {
      compressedTexture.image = img;
      compressedTexture.needsUpdate = true;
      
      // 元のテクスチャを明示的に解放
      if (texture.image && texture.image !== img) {
        texture.dispose();
      }
    };
    
    img.src = compressedDataUrl;

    // 元のテクスチャの設定をコピー
    compressedTexture.wrapS = texture.wrapS;
    compressedTexture.wrapT = texture.wrapT;
    compressedTexture.minFilter = THREE.LinearFilter;
    compressedTexture.magFilter = THREE.LinearFilter;
    compressedTexture.generateMipmaps = false;

    return compressedTexture;
  }

  /**
   * 最適なサイズを計算
   */
  private static calculateOptimalSize(width: number, height: number, maxSize: number): { width: number, height: number } {
    if (width <= maxSize && height <= maxSize) {
      return { width, height };
    }

    const aspectRatio = width / height;
    
    if (width > height) {
      return {
        width: maxSize,
        height: Math.round(maxSize / aspectRatio)
      };
    } else {
      return {
        width: Math.round(maxSize * aspectRatio),
        height: maxSize
      };
    }
  }

  /**
   * VRMのすべてのテクスチャを最適化
   */
  static optimizeVRMTextures(vrm: any, memoryGB: number): void {
    vrm.scene.traverse((object: any) => {
      if (object.isMesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        
        materials.forEach((material: any) => {
          // メインテクスチャ
          if (material.map) {
            material.map = this.optimizeTexture(material.map, memoryGB);
          }
          
          // ノーマルマップ
          if (material.normalMap) {
            material.normalMap = this.optimizeTexture(material.normalMap, memoryGB);
          }
          
          // エミッシブマップ
          if (material.emissiveMap) {
            material.emissiveMap = this.optimizeTexture(material.emissiveMap, memoryGB);
          }
          
          // その他のテクスチャ
          if (material.roughnessMap) {
            material.roughnessMap = this.optimizeTexture(material.roughnessMap, memoryGB);
          }
          
          if (material.metalnessMap) {
            material.metalnessMap = this.optimizeTexture(material.metalnessMap, memoryGB);
          }
          
          if (material.aoMap) {
            material.aoMap = this.optimizeTexture(material.aoMap, memoryGB);
          }
          
          material.needsUpdate = true;
        });
      }
    });
  }

  /**
   * メモリ使用量を推定
   */
  static estimateTextureMemory(texture: THREE.Texture): number {
    if (!texture || !texture.image) return 0;
    
    const width = texture.image.width;
    const height = texture.image.height;
    const bitsPerPixel = 32; // RGBA
    
    return (width * height * bitsPerPixel) / 8; // バイト単位
  }

  /**
   * キャンバスリソースのクリーンアップ
   */
  static cleanup(): void {
    if (this.canvas) {
      this.canvas.width = 1;
      this.canvas.height = 1;
      this.context = null;
      this.canvas = null;
    }
    // WeakSetは自動的にクリーンアップされる
  }
}