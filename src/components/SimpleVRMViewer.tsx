'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { AvatarData } from '../utils/avatarConfig';
import { VRMAnalyzer } from '../utils/vrmAnalyzer';
import { VRMDebugAnalyzer } from '../utils/vrmDebugAnalyzer';

interface SimpleVRMViewerProps {
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

export default function SimpleVRMViewer({ currentBMI, futureBMI, avatarData }: SimpleVRMViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<any>(null);
  const animationIdRef = useRef<number | null>(null);
  const testCubeRef = useRef<THREE.Mesh | null>(null);
  const isCleanedUpRef = useRef(false);
  const [currentPredictionIndex, setCurrentPredictionIndex] = useState(0);
  const [manualBellyValue, setManualBellyValue] = useState(0);
  const [useManualAdjustment, setUseManualAdjustment] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [availableBlendShapes, setAvailableBlendShapes] = useState<string[]>([]);
  const [currentBlendShape, setCurrentBlendShape] = useState<string>('');
  const [detailedAnalysis, setDetailedAnalysis] = useState<any>(null);

  // VRMを読み込む関数
  const loadVRM = (vrmPath: string) => {
    if (!sceneRef.current || !cameraRef.current) {
      console.log('❌ VRM読み込み中止: Three.jsが初期化されていません');
      return;
    }

    console.log('📦 VRM読み込み開始:', vrmPath);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      vrmPath,
      (gltf) => {
        console.log('✅ VRM読み込み成功:', gltf);
        console.log('🔍 GLTF詳細:', {
          scene: gltf.scene,
          scenes: gltf.scenes,
          userData: gltf.userData,
          animations: gltf.animations
        });
        const vrm = gltf.userData.vrm;
        console.log('🔍 VRMオブジェクト:', vrm);
        
        // VRMがない場合でもGLTFシーンを表示してみる
        let sceneToAdd = null;
        if (vrm && sceneRef.current) {
          console.log('🎯 VRMオブジェクトを使用してシーンを追加');
          sceneToAdd = vrm.scene;
        } else if (gltf.scene && sceneRef.current) {
          console.log('🎯 VRMがないため、GLTFシーンを直接使用');
          sceneToAdd = gltf.scene;
        } else {
          console.error('❌ VRMもGLTFシーンも利用できません');
          return;
        }
        
        if (sceneToAdd && sceneRef.current) {
          // 既存のVRMを削除
          if (vrmRef.current && sceneRef.current) {
            sceneRef.current.remove(vrmRef.current.scene);
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
            console.log('🔄 VRMUtils.rotateVRM0を適用しました');
          }
          
          console.log('✅ シーンにオブジェクトを追加しました:', sceneToAdd);
          
          // ブレンドシェイプの詳細情報を出力
          console.log('🔍 VRMブレンドシェイプ分析開始');
          console.log('📝 アバター情報:', avatarData.name, '(', avatarData.id, ')');
          console.log('📋 設定されているブレンドシェイプ名:', avatarData.blendShapeNames);
          
          const allBlendShapes = new Map<string, number>();
          let meshCount = 0;
          
          sceneToAdd.traverse((object: any) => {
            if (object.isSkinnedMesh && object.morphTargetDictionary) {
              meshCount++;
              console.log(`\n🎯 SkinnedMesh #${meshCount}: ${object.name || 'unnamed'}`);
              console.log('📖 morphTargetDictionary:', object.morphTargetDictionary);
              
              const blendShapeNames = Object.keys(object.morphTargetDictionary);
              console.log('🗂️ このメッシュのブレンドシェイプ数:', blendShapeNames.length);
              console.log('🗂️ ブレンドシェイプ一覧:', blendShapeNames);
              
              // 各ブレンドシェイプの詳細情報
              blendShapeNames.forEach(name => {
                const index = object.morphTargetDictionary[name];
                const currentValue = object.morphTargetInfluences ? object.morphTargetInfluences[index] : 0;
                allBlendShapes.set(name, currentValue);
                
                // 体型関連のブレンドシェイプを強調表示
                const lowerName = name.toLowerCase();
                const isBodyRelated = lowerName.includes('belly') || lowerName.includes('fat') || 
                                    lowerName.includes('weight') || lowerName.includes('body') ||
                                    lowerName.includes('chest') || lowerName.includes('waist') ||
                                    lowerName.includes('hip') || lowerName.includes('muscle');
                
                if (isBodyRelated) {
                  console.log(`  🎯 体型関連: ${name} (インデックス: ${index}, 現在値: ${currentValue})`);
                } else {
                  console.log(`  📝 その他: ${name} (インデックス: ${index}, 現在値: ${currentValue})`);
                }
              });
              
              // 現在の設定との照合
              console.log('\n🔍 設定との照合:');
              if (avatarData.blendShapeNames.belly) {
                const exists = object.morphTargetDictionary[avatarData.blendShapeNames.belly] !== undefined;
                console.log(`  belly: "${avatarData.blendShapeNames.belly}" - ${exists ? '✅ 存在' : '❌ 不存在'}`);
              }
              if (avatarData.blendShapeNames.weight) {
                const exists = object.morphTargetDictionary[avatarData.blendShapeNames.weight] !== undefined;
                console.log(`  weight: "${avatarData.blendShapeNames.weight}" - ${exists ? '✅ 存在' : '❌ 不存在'}`);
              }
              if (avatarData.blendShapeNames.fat) {
                const exists = object.morphTargetDictionary[avatarData.blendShapeNames.fat] !== undefined;
                console.log(`  fat: "${avatarData.blendShapeNames.fat}" - ${exists ? '✅ 存在' : '❌ 不存在'}`);
              }
            }
          });
          
          console.log('\n📊 VRMブレンドシェイプ分析完了');
          console.log('🎯 検出されたSkinnedMesh数:', meshCount);
          console.log('🗂️ 全ブレンドシェイプ数:', allBlendShapes.size);
          console.log('🗂️ 全ブレンドシェイプ一覧:', Array.from(allBlendShapes.keys()));
          
          // VRMAnalyzerを使用した詳細分析
          console.log('\n🔬 VRMAnalyzerによる詳細分析:');
          try {
            const analysisResult = VRMAnalyzer.analyzeVRMBlendShapes(vrm);
            console.log('📈 分析結果:', analysisResult);
            console.log('🎯 総ブレンドシェイプ数:', analysisResult.totalBlendShapes);
            console.log('💾 総メモリ使用量:', analysisResult.totalMemoryUsage, 'bytes');
            console.log('📋 カテゴリ別ブレンドシェイプ:');
            
            Object.entries(analysisResult.blendShapesByCategory).forEach(([category, blendShapes]) => {
              console.log(`  ${category}: ${blendShapes.length}個`);
              blendShapes.forEach(bs => {
                console.log(`    - ${bs.name} (値: ${bs.currentValue}, メモリ: ${bs.estimatedMemory}bytes)`);
              });
            });
            
            if (analysisResult.recommendations.length > 0) {
              console.log('💡 最適化推奨事項:');
              analysisResult.recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
              });
            }
            
            // BMIシミュレーション必要なブレンドシェイプを特定
            const requiredBlendShapes = VRMAnalyzer.identifyRequiredBlendShapes(vrm);
            console.log('🎯 BMIシミュレーション必要なブレンドシェイプ:', requiredBlendShapes);
            
            // UIに表示するためのブレンドシェイプ情報を保存
            setAvailableBlendShapes(Array.from(allBlendShapes.keys()));
            
          } catch (error) {
            console.error('❌ VRMAnalyzer分析エラー:', error);
          }
          
          // 詳細分析も実行
          console.log('\n🔬 VRMDebugAnalyzerによる詳細分析:');
          try {
            // 簡略化された分析結果を作成
            const bodyBlendShapes = Array.from(allBlendShapes.keys()).filter(name => {
              const lowerName = name.toLowerCase();
              return lowerName.includes('belly') || lowerName.includes('weight') || 
                     lowerName.includes('fat') || lowerName.includes('body') ||
                     lowerName.includes('chest') || lowerName.includes('waist') ||
                     lowerName.includes('hip') || lowerName.includes('muscle');
            });
            
            const detailedAnalysisResult = {
              totalBlendShapes: allBlendShapes.size,
              bodyBlendShapes: bodyBlendShapes.map(name => ({ name, meshName: 'mesh' })),
              faceBlendShapes: [],
              emotionBlendShapes: [],
              unknownBlendShapes: [],
              meshes: [{ name: 'VRM Mesh', blendShapeCount: allBlendShapes.size }],
              totalMemoryUsage: allBlendShapes.size * 1024 // 推定値
            };
            
            console.log('📈 体型関連ブレンドシェイプ:', bodyBlendShapes);
            
            // 現在の設定との比較
            console.log('\n⚖️ 現在の設定との比較:');
            console.log(`  設定されたbelly: "${avatarData.blendShapeNames.belly || 'なし'}"`);
            console.log(`  設定されたweight: "${avatarData.blendShapeNames.weight || 'なし'}"`);
            console.log(`  設定されたfat: "${avatarData.blendShapeNames.fat || 'なし'}"`);
            
            // 設定の妥当性チェック
            const availableNames = detailedAnalysisResult.bodyBlendShapes.map(bs => bs.name);
            console.log('\n✅ 設定の妥当性チェック:');
            
            if (avatarData.blendShapeNames.belly) {
              const exists = availableNames.includes(avatarData.blendShapeNames.belly);
              console.log(`  belly "${avatarData.blendShapeNames.belly}": ${exists ? '✅ 存在' : '❌ 不存在'}`);
            }
            
            if (avatarData.blendShapeNames.weight) {
              const exists = availableNames.includes(avatarData.blendShapeNames.weight);
              console.log(`  weight "${avatarData.blendShapeNames.weight}": ${exists ? '✅ 存在' : '❌ 不存在'}`);
            }
            
            if (avatarData.blendShapeNames.fat) {
              const exists = availableNames.includes(avatarData.blendShapeNames.fat);
              console.log(`  fat "${avatarData.blendShapeNames.fat}": ${exists ? '✅ 存在' : '❌ 不存在'}`);
            }
            
            // UIに表示するために詳細分析結果を保存
            setDetailedAnalysis(detailedAnalysisResult);
            
          } catch (error) {
            console.error('❌ VRMDebugAnalyzer分析エラー:', error);
          }
          
          // カメラ位置調整
          const box = new THREE.Box3().setFromObject(sceneToAdd);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          
          console.log('📐 VRMバウンディングボックス - center:', center, 'size:', size, 'maxDim:', maxDim);
          
          // サイズが小さい場合（顔だけモデル等）は固定のカメラ位置を使用
          let cameraX, cameraY, cameraZ;
          if (maxDim < 0.5) {
            // 非常に小さいモデル（おそらく顔だけ）
            cameraX = 0;
            cameraY = center.y;
            cameraZ = 1.5;
            console.log('📐 小さいモデル用カメラ位置を使用');
          } else if (maxDim < 2.0) {
            // 顔〜上半身モデル
            cameraX = center.x;
            cameraY = center.y;
            cameraZ = maxDim * 1.5;
            console.log('📐 中サイズモデル用カメラ位置を使用');
          } else {
            // 全身モデル
            const fov = cameraRef.current.fov * (Math.PI / 180);
            cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.2; // 少し余裕を持たせる
            cameraX = center.x;
            cameraY = center.y + size.y / 4;
            console.log('📐 大サイズモデル用カメラ位置を使用');
          }
          
          console.log('📐 最終カメラ位置設定:', `(${cameraX}, ${cameraY}, ${cameraZ})`);
          
          cameraRef.current.position.set(cameraX, cameraY, cameraZ);
          cameraRef.current.lookAt(center);
          
          // カメラが正しく設定されたかログ出力
          console.log('📐 設定後のカメラ位置:', cameraRef.current.position);
          console.log('📐 カメラ注視点:', center);
          
          // VRMの位置と回転を確認・調整
          console.log('🎯 シーンの位置:', sceneToAdd.position);
          console.log('🎯 シーンの回転:', sceneToAdd.rotation);
          console.log('🎯 シーンのスケール:', sceneToAdd.scale);
          
          // VRMが正面を向くように回転を確認
          sceneToAdd.rotation.y = 0; // Y軸回転をリセット
          console.log('🎯 シーンの回転をリセットしました');
          
          // フラスタムカリング（視界外オブジェクトの除外）を無効にしてテスト
          sceneToAdd.traverse((child: any) => {
            if (child.isMesh) {
              child.frustumCulled = false;
              console.log('🎯 メッシュのフラスタムカリングを無効化:', child.name);
            }
          });
          
          // 利用可能なブレンドシェイプを設定
          setAvailableBlendShapes(Array.from(allBlendShapes.keys()));
          
          // 実際に使用するブレンドシェイプを決定
          let usedBlendShape = '';
          const configuredShapes = [
            avatarData.blendShapeNames.belly,
            avatarData.blendShapeNames.weight,
            avatarData.blendShapeNames.fat
          ].filter(Boolean);
          
          // 設定されたブレンドシェイプから存在するものを探す
          for (const shapeName of configuredShapes) {
            if (allBlendShapes.has(shapeName!)) {
              usedBlendShape = shapeName!;
              console.log('✅ 設定されたブレンドシェイプが見つかりました:', usedBlendShape);
              break;
            }
          }
          
          // 設定されたものが見つからない場合、体型関連のものを自動検出
          if (!usedBlendShape) {
            console.log('🔍 設定されたブレンドシェイプが見つからないため、自動検出を開始...');
            const allShapeNames = Array.from(allBlendShapes.keys());
            console.log('🔍 利用可能な全ブレンドシェイプ:', allShapeNames);
            
            // より広範囲の体型関連キーワードで検索
            const bodyShapes = allShapeNames.filter(name => {
              const lowerName = name.toLowerCase();
              return lowerName.includes('belly') || lowerName.includes('weight') || 
                     lowerName.includes('fat') || lowerName.includes('body') ||
                     lowerName.includes('chest') || lowerName.includes('waist') ||
                     lowerName.includes('hip') || lowerName.includes('muscle') ||
                     lowerName.includes('bulk') || lowerName.includes('slim') ||
                     lowerName.includes('thick') || lowerName.includes('shape');
            });
            
            console.log('🎯 体型関連候補:', bodyShapes);
            
            if (bodyShapes.length > 0) {
              usedBlendShape = bodyShapes[0];
              console.log('🔄 自動検出されたブレンドシェイプ:', usedBlendShape);
            } else {
              // 体型関連が見つからない場合、VRChatの標準的なブレンドシェイプを探す
              const vrchatStandard = allShapeNames.find(name => 
                name === 'A' || name === 'I' || name === 'U' || name === 'E' || name === 'O' ||
                name.startsWith('vrc.') || name.includes('ARKit')
              );
              
              if (vrchatStandard) {
                usedBlendShape = vrchatStandard;
                console.log('🎭 VRChat標準ブレンドシェイプを使用:', usedBlendShape);
              } else if (allShapeNames.length > 0) {
                // 最後の手段として最初のブレンドシェイプを使用
                usedBlendShape = allShapeNames[0];
                console.log('⚠️ 代替として最初のブレンドシェイプを使用:', usedBlendShape);
              }
            }
          }
          
          setCurrentBlendShape(usedBlendShape);
          console.log('🎯 最終的に使用するブレンドシェイプ:', usedBlendShape || 'なし');
          console.log('🎉 VRM表示完了!');
          console.log('🎯 シーンオブジェクト確認:', sceneToAdd);
          console.log('🎯 シーンがメインシーンに追加されています:', sceneRef.current.children.includes(sceneToAdd));
          
          // シーン内のオブジェクト詳細を確認
          console.log('🔍 シーン内のオブジェクト数:', sceneToAdd.children.length);
          sceneToAdd.traverse((child: any) => {
            if (child.isMesh) {
              console.log('🎯 メッシュ発見:', child.name, '- 可視性:', child.visible, '- マテリアル:', child.material?.name || 'unnamed');
              if (child.geometry) {
                console.log('  ジオメトリ情報:', '頂点数:', child.geometry.attributes.position?.count || 0);
              }
              // マテリアルの詳細情報
              if (child.material) {
                console.log('  マテリアル詳細:', {
                  type: child.material.type,
                  transparent: child.material.transparent,
                  opacity: child.material.opacity,
                  visible: child.material.visible,
                  side: child.material.side,
                  depthTest: child.material.depthTest,
                  depthWrite: child.material.depthWrite
                });
                
                // 透明度やマテリアルの問題があれば修正
                if (child.material.transparent && child.material.opacity < 0.1) {
                  console.log('  ⚠️ マテリアルが透明すぎます。不透明度を調整します。');
                  child.material.opacity = 1.0;
                  child.material.transparent = false;
                  child.material.needsUpdate = true;
                }
                
                if (!child.material.visible) {
                  console.log('  ⚠️ マテリアルが非表示です。表示に変更します。');
                  child.material.visible = true;
                  child.material.needsUpdate = true;
                }
              }
            } else if (child.isGroup) {
              console.log('🗂️ グループ:', child.name, '- 子オブジェクト数:', child.children.length);
            } else {
              console.log('📦 その他オブジェクト:', child.type, child.name);
            }
          });
          
          // ブレンドシェイプが見つからなくても、とりあえず初期のBMI値で体型更新を試行
          if (currentBMI > 0 && usedBlendShape) {
            console.log('🎯 初期BMI値で体型更新を実行:', currentBMI);
            setTimeout(() => {
              updateBodyShape(currentBMI);
            }, 100);
          } else {
            console.log('🎯 体型変更用ブレンドシェイプがないため、初期体型更新をスキップ');
          }
        }
      },
      (progress) => {
        console.log('📊 読み込み進捗:', Math.round((progress.loaded / progress.total) * 100) + '%');
      },
      (error) => {
        console.error('❌ VRM読み込み失敗:', error);
      }
    );
  };

  // BMIに基づいて体型を更新する関数
  const updateBodyShape = (bmiValue: number) => {
    if (!vrmRef.current) return;
    
    console.log('🔍 updateBodyShape実行開始 - BMI:', bmiValue);
    console.log('📋 設定されているブレンドシェイプ名:', avatarData.blendShapeNames);
    
    vrmRef.current.scene.traverse((object: any) => {
      if (object.isSkinnedMesh && object.morphTargetDictionary) {
        console.log('🎯 SkinnedMeshを発見:', object.name);
        console.log('📖 morphTargetDictionary:', object.morphTargetDictionary);
        
        // 利用可能なブレンドシェイプ名をすべて出力
        const availableBlendShapes = Object.keys(object.morphTargetDictionary);
        console.log('🗂️ 利用可能なブレンドシェイプ:', availableBlendShapes);
        
        // 現在のinfluences値を出力
        if (object.morphTargetInfluences) {
          console.log('📊 現在のmorphTargetInfluences:', object.morphTargetInfluences);
        }
        
        const blendShapeNames = avatarData.blendShapeNames;
        let bellyIndex = undefined;
        let usedBlendShapeName = '';

        if (blendShapeNames.belly && object.morphTargetDictionary[blendShapeNames.belly] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.belly];
          usedBlendShapeName = blendShapeNames.belly;
          console.log('✅ bellyブレンドシェイプが見つかりました:', usedBlendShapeName, 'インデックス:', bellyIndex);
        } else if (blendShapeNames.weight && object.morphTargetDictionary[blendShapeNames.weight] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.weight];
          usedBlendShapeName = blendShapeNames.weight;
          console.log('✅ weightブレンドシェイプが見つかりました:', usedBlendShapeName, 'インデックス:', bellyIndex);
        } else if (blendShapeNames.fat && object.morphTargetDictionary[blendShapeNames.fat] !== undefined) {
          bellyIndex = object.morphTargetDictionary[blendShapeNames.fat];
          usedBlendShapeName = blendShapeNames.fat;
          console.log('✅ fatブレンドシェイプが見つかりました:', usedBlendShapeName, 'インデックス:', bellyIndex);
        } else {
          console.log('❌ 指定されたブレンドシェイプが見つかりませんでした');
          console.log('🔍 設定されているブレンドシェイプ名:', blendShapeNames);
          console.log('🗂️ 利用可能なブレンドシェイプ:', availableBlendShapes);
          
          // 体型関連のブレンドシェイプを推測して探す
          const potentialBodyBlendShapes = availableBlendShapes.filter(name => {
            const lowerName = name.toLowerCase();
            return lowerName.includes('belly') || lowerName.includes('fat') || 
                   lowerName.includes('weight') || lowerName.includes('body') ||
                   lowerName.includes('chest') || lowerName.includes('waist') ||
                   lowerName.includes('hip') || lowerName.includes('muscle');
          });
          
          console.log('🔍 体型関連と思われるブレンドシェイプ:', potentialBodyBlendShapes);
          
          if (potentialBodyBlendShapes.length > 0) {
            bellyIndex = object.morphTargetDictionary[potentialBodyBlendShapes[0]];
            usedBlendShapeName = potentialBodyBlendShapes[0];
            console.log('🎯 代替ブレンドシェイプを使用:', usedBlendShapeName, 'インデックス:', bellyIndex);
          }
        }
        
        if (bellyIndex !== undefined) {
          let blendValue = 0;
          
          if (useManualAdjustment) {
            // 手動調整モードの場合
            blendValue = manualBellyValue;
            console.log('🔧 手動調整モード - 値:', blendValue);
          } else {
            // BMI自動計算モードの場合
            if (bmiValue <= 25) {
              blendValue = 0;
            } else if (bmiValue > 25 && bmiValue <= 30) {
              blendValue = ((bmiValue - 25) / 5) * 0.5;
            } else if (bmiValue > 30) {
              blendValue = Math.min(0.5 + ((bmiValue - 30) / 10) * 0.5, 1.0);
            }
            console.log('🧮 BMI自動計算モード - BMI:', bmiValue, '計算値:', blendValue);
          }
          
          const previousValue = object.morphTargetInfluences[bellyIndex];
          object.morphTargetInfluences[bellyIndex] = blendValue;
          
          console.log('📈 ブレンドシェイプ値を更新:', usedBlendShapeName, '前の値:', previousValue, '新しい値:', blendValue);
          
          // 現在使用中のブレンドシェイプを保存
          setCurrentBlendShape(usedBlendShapeName);
        } else {
          console.log('❌ 適用可能なブレンドシェイプが見つかりませんでした - アバターは表示されますが体型変更はできません');
        }
      }
    });
    
    console.log('🔍 updateBodyShape実行完了');
  };

  // 手動でお腹周りを調整する関数
  const handleManualBellyChange = (value: number) => {
    setManualBellyValue(value);
    if (useManualAdjustment) {
      updateBodyShape(currentBMI); // 現在のBMI値を使用（実際のblendValueは手動値が使用される）
    }
  };

  // 初期化
  useEffect(() => {
    if (!containerRef.current || initRef.current) return;
    initRef.current = true;
    isCleanedUpRef.current = false;

    console.log('🚀 SimpleVRMViewer初期化開始');

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
    // より遠くから見るように初期位置を調整
    camera.position.set(0, 1, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x212121); // 背景色を明示的に設定
    renderer.shadowMap.enabled = true; // 影を有効にする
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ライト
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // 少し強めのアンビエントライト
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // より明るく
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // 追加のライト（正面から）
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
    frontLight.position.set(0, 0, 1);
    scene.add(frontLight);
    
    console.log('💡 ライト設定完了: アンビエント(0.8) + ディレクショナル(1.0) + フロント(0.5)');

    // テスト用キューブ
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const testCube = new THREE.Mesh(geometry, material);
    scene.add(testCube);
    testCubeRef.current = testCube;
    console.log('🟢 テスト用キューブを追加');

    // アニメーションループ
    let frameCount = 0;
    function animate() {
      // クリーンアップ済みの場合はアニメーションを停止
      if (isCleanedUpRef.current) {
        return;
      }
      
      animationIdRef.current = requestAnimationFrame(animate);
      
      if (testCubeRef.current) {
        testCubeRef.current.rotation.x += 0.01;
        testCubeRef.current.rotation.y += 0.01;
      }
      
      if (vrmRef.current) {
        vrmRef.current.update(0.016); // 60FPS
      }
      
      renderer.render(scene, camera);
      
      // 最初の数フレームでレンダリング状況をログ出力
      frameCount++;
      if (frameCount <= 5) {
        console.log(`🎬 フレーム ${frameCount}: シーン内オブジェクト数=${scene.children.length}, VRM=${!!vrmRef.current}, キューブ=${!!testCubeRef.current}`);
        if (frameCount === 5) {
          console.log('🎬 レンダリング情報ログ終了');
        }
      }
    }
    animate();

    // リサイズ処理
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    console.log('🎯 Three.js初期化完了');

    // クリーンアップ
    return () => {
      console.log('🧹 SimpleVRMViewer クリーンアップ');
      
      // クリーンアップフラグを設定
      isCleanedUpRef.current = true;
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      
      // VRMのクリーンアップ
      if (vrmRef.current) {
        if (sceneRef.current) {
          sceneRef.current.remove(vrmRef.current.scene);
        }
        vrmRef.current = null;
      }
      
      // テストキューブのクリーンアップ
      if (testCubeRef.current) {
        if (sceneRef.current) {
          sceneRef.current.remove(testCubeRef.current);
        }
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
      
      // カメラの参照をクリア
      cameraRef.current = null;
      
      // 初期化フラグをリセット
      initRef.current = false;
      
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // avatarDataが変更されたらVRMを読み込む
  useEffect(() => {
    if (avatarData && sceneRef.current && cameraRef.current && !isCleanedUpRef.current) {
      console.log('🔄 アバターデータ変更によるVRM読み込み:', avatarData.name);
      loadVRM(avatarData.vrmPath);
    }
  }, [avatarData]);

  // BMIが変更されたら体型を更新（手動調整モードでない場合のみ）
  useEffect(() => {
    if (currentBMI > 0 && !useManualAdjustment) {
      updateBodyShape(currentBMI);
    }
  }, [currentBMI, useManualAdjustment]);

  // 未来のBMI予測のアニメーション（手動調整モードでない場合のみ）
  useEffect(() => {
    if (futureBMI.length === 0 || useManualAdjustment) return;

    const interval = setInterval(() => {
      setCurrentPredictionIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % futureBMI.length;
        const nextBMI = futureBMI[nextIndex].bmi;
        updateBodyShape(nextBMI);
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [futureBMI, useManualAdjustment]);

  return (
    <div className="w-full space-y-4">
      {/* アバター情報ヘッダー */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
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
            <h3 className="font-semibold text-gray-800">{avatarData.name}</h3>
            <p className="text-sm text-gray-600">{avatarData.description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">現在のBMI</p>
          <p className="text-lg font-bold text-blue-600">{currentBMI.toFixed(1)}</p>
        </div>
      </div>
      
      {/* お腹周りの手動調整コントロール */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-700">お腹周りの調整</h4>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showDebugInfo}
                onChange={(e) => setShowDebugInfo(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-600">デバッグ情報</span>
            </label>
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
        
        {useManualAdjustment && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">お腹の膨らみ</span>
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
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>標準</span>
              <span>最大</span>
            </div>
          </div>
        )}
        
        {/* デバッグ情報 */}
        {showDebugInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <h5 className="font-medium text-blue-800">ブレンドシェイプデバッグ情報</h5>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>設定されたブレンドシェイプ:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                {avatarData.blendShapeNames.belly && (
                  <li>belly: "{avatarData.blendShapeNames.belly}"</li>
                )}
                {avatarData.blendShapeNames.weight && (
                  <li>weight: "{avatarData.blendShapeNames.weight}"</li>
                )}
                {avatarData.blendShapeNames.fat && (
                  <li>fat: "{avatarData.blendShapeNames.fat}"</li>
                )}
              </ul>
              
              {currentBlendShape && (
                <p><strong>現在使用中:</strong> {currentBlendShape}</p>
              )}
              
              <p><strong>利用可能なブレンドシェイプ数:</strong> {availableBlendShapes.length}</p>
              
              {availableBlendShapes.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                    すべてのブレンドシェイプを表示
                  </summary>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    <ul className="list-disc pl-5 space-y-1">
                      {availableBlendShapes.map((name, index) => (
                        <li key={index} className={name === currentBlendShape ? 'font-bold text-green-600' : ''}>
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}
              
              <p className="text-xs text-blue-600 mt-2">
                詳細なログはブラウザのコンソールで確認できます（F12キーを押してConsoleタブを開く）
              </p>
              
              {detailedAnalysis && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <h6 className="font-semibold text-gray-800 mb-2">詳細分析結果</h6>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>総メッシュ数:</strong> {detailedAnalysis.meshes.length}</p>
                    <p><strong>総ブレンドシェイプ数:</strong> {detailedAnalysis.totalBlendShapes}</p>
                    <p><strong>メモリ使用量:</strong> {VRMDebugAnalyzer.formatBytes(detailedAnalysis.totalMemoryUsage)}</p>
                    
                    <div className="mt-2">
                      <p><strong>カテゴリ別統計:</strong></p>
                      <ul className="list-disc pl-4 mt-1">
                        <li>体型関連: {detailedAnalysis.bodyBlendShapes.length}個</li>
                        <li>顔パーツ: {detailedAnalysis.faceBlendShapes.length}個</li>
                        <li>感情表現: {detailedAnalysis.emotionBlendShapes.length}個</li>
                        <li>その他: {detailedAnalysis.unknownBlendShapes.length}個</li>
                      </ul>
                    </div>
                    
                    {detailedAnalysis.bodyBlendShapes.length > 0 && (
                      <div className="mt-2">
                        <p><strong>体型関連ブレンドシェイプ:</strong></p>
                        <ul className="list-disc pl-4 mt-1 max-h-24 overflow-y-auto">
                          {detailedAnalysis.bodyBlendShapes.map((bs: any, index: number) => (
                            <li key={index} className={bs.name === currentBlendShape ? 'font-bold text-green-600' : ''}>
                              {bs.name} ({bs.meshName})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {detailedAnalysis.bodyBlendShapes.length > 0 && (
                      <div className="mt-2">
                        <p><strong>BMI調整推奨ブレンドシェイプ:</strong></p>
                        <ul className="list-disc pl-4 mt-1">
                          {VRMDebugAnalyzer.recommendBMIBlendShapes(detailedAnalysis).slice(0, 3).map((name: string, index: number) => (
                            <li key={index} className={name === currentBlendShape ? 'font-bold text-green-600' : ''}>
                              {name}
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
      </div>
      
      {/* 3Dビューアー */}
      <div className="relative">
        <div 
          ref={containerRef}
          className="w-full rounded-lg overflow-hidden border-2 border-gray-200"
          style={{ height: '800px', backgroundColor: '#f0f0f0' }}
        />
        
        {futureBMI.length > 0 && (
          <div className="absolute top-3 left-3 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm">
            {futureBMI[currentPredictionIndex] && (
              <div>
                <p className="font-semibold">
                  {futureBMI[currentPredictionIndex].period === 30 ? '1ヶ月後' : 
                   futureBMI[currentPredictionIndex].period === 365 ? '1年後' :
                   futureBMI[currentPredictionIndex].period === 1095 ? '3年後' :
                   futureBMI[currentPredictionIndex].period === 1825 ? '5年後' :
                   futureBMI[currentPredictionIndex].period === 3650 ? '10年後' : 
                   `${futureBMI[currentPredictionIndex].period}日後`}
                </p>
                <p className="text-yellow-300">BMI: {futureBMI[currentPredictionIndex].bmi.toFixed(1)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}