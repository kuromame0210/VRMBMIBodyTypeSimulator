'use client';

import { useState, useEffect } from 'react';
import { VRM } from '@pixiv/three-vrm';

interface BlendShapeControllerProps {
  vrm: VRM | null;
  onBlendShapeChange?: (blendShapeName: string, value: number) => void;
}

interface BlendShapeData {
  id: string; // 一意のID
  name: string;
  displayName: string;
  value: number;
  category: 'expression' | 'viseme' | 'body' | 'custom';
  type: 'vrm' | 'morphTarget'; // VRMブレンドシェイプかモーフターゲットか
  meshName?: string; // モーフターゲットの場合のメッシュ名
  targetIndex?: number; // モーフターゲットの場合のインデックス
}

export default function BlendShapeController({ vrm, onBlendShapeChange }: BlendShapeControllerProps) {
  const [blendShapes, setBlendShapes] = useState<BlendShapeData[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'expression' | 'viseme' | 'body' | 'custom'>('all');
  const [activeBlendShapes, setActiveBlendShapes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>(''); // 検索機能
  const maxSimultaneousBlendShapes = 5; // 同時操作制限

  // VRMのブレンドシェイプとモーフターゲットを取得・分類
  useEffect(() => {
    if (!vrm) {
      setBlendShapes([]);
      return;
    }

    console.log('🔍 BlendShapeController: VRM分析開始', vrm);
    console.log('🔍 VRMの詳細:', {
      hasExpressionManager: !!vrm.expressionManager,
      hasScene: !!vrm.scene,
      expressionCount: vrm.expressionManager ? Object.keys(vrm.expressionManager.expressionMap).length : 0,
      userData: vrm.userData
    });

    // VRMブレンドシェイプマスターの詳細分析
    if (vrm.userData && vrm.userData.gltfExtensions && vrm.userData.gltfExtensions.VRM) {
      const vrmExtension = vrm.userData.gltfExtensions.VRM;
      console.log('🎭 VRM拡張データ:', vrmExtension);
      
      if (vrmExtension.blendShapeMaster) {
        const blendShapeMaster = vrmExtension.blendShapeMaster;
        console.log('🎯 VRMブレンドシェイプマスター:', blendShapeMaster);
        
        if (blendShapeMaster.blendShapeGroups) {
          console.log('📋 ブレンドシェイプグループ一覧:');
          blendShapeMaster.blendShapeGroups.forEach((group: any, index: number) => {
            console.log(`  [${index}] ${group.name}:`, {
              presetName: group.presetName,
              binds: group.binds ? group.binds.length : 0,
              materialValues: group.materialValues ? group.materialValues.length : 0
            });
            
            // fatnessを含むものを特別にマーク
            if (group.name && group.name.toLowerCase().includes('fatness')) {
              console.log(`    🎯 FATNESS発見! グループ詳細:`, group);
            }
          });
        }
      }
    }
    const shapes: BlendShapeData[] = [];
    let fatnessFound = false;

    // 1. VRM ExpressionManagerからブレンドシェイプを取得
    if (vrm.expressionManager) {
      console.log('🎭 VRM ExpressionManager分析:');
      console.log('  📋 利用可能なブレンドシェイプ:', Object.keys(vrm.expressionManager.expressionMap));
      
      Object.entries(vrm.expressionManager.expressionMap).forEach(([name, expression]) => {
        const category = categorizeBlendShape(name);
        const displayName = getDisplayName(name);
        
        console.log(`  [VRM] ${name}:`, {
          weight: expression.weight,
          category,
          expressionType: typeof expression
        });
        
        // fatnessを特別にマーク
        if (name.toLowerCase().includes('fatness')) {
          fatnessFound = true;
          console.log(`    🎯 VRM FATNESS発見! ${name}:`, expression);
        }
        
        shapes.push({
          id: `vrm-${name}`,
          name,
          displayName,
          value: 0, // リセット後は必ず0
          category,
          type: 'vrm'
        });
      });
    }

    // 2. シーン内の全メッシュからモーフターゲットを取得
    let meshCount = 0;
    if (vrm.scene) {
      // ログを出さずにカウントのみ
      vrm.scene.traverse((object: any) => {
        if (object.isSkinnedMesh) {
          meshCount++;
          
          // モーフターゲット処理は一時的に無効化
          if (false && object.morphTargetDictionary) {
            Object.entries(object.morphTargetDictionary).forEach(([morphName, index]: [string, number]) => {
              const category = categorizeBlendShape(morphName);
              const displayName = getDisplayName(morphName);
              const currentValue = object.morphTargetInfluences ? object.morphTargetInfluences[index] : 0;
              
              // fatnessの場合は特別にログ出力
              if (morphName.toLowerCase().includes('fatness')) {
                fatnessFound = true;
                console.log('🎯 FATNESS発見!', {
                  meshName,
                  morphName,
                  index,
                  currentValue,
                  category,
                  morphTargetInfluences: object.morphTargetInfluences ? object.morphTargetInfluences.length : 'undefined',
                  morphTargetDictionary: Object.keys(object.morphTargetDictionary).length
                });
                
                // fatnessを最優先で強制追加
                const uniqueId = `fatness-${meshName}-${index}`;
                const alreadyExists = shapes.some(s => s.id === uniqueId);
                if (!alreadyExists) {
                  shapes.unshift({ // unshiftで最初に追加
                    id: uniqueId,
                    name: morphName,
                    displayName: `🎯 ${morphName} (${meshName})`,
                    value: 0, // リセット後は必ず0
                    category: 'body',
                    type: 'morphTarget',
                    meshName: meshName,
                    targetIndex: index
                  });
                  console.log('✅ FATNESS強制追加完了:', morphName);
                }
              }
              
              // フィルタリング条件
              const isDuplicate = shapes.some(shape => shape.name === morphName && shape.type === 'vrm');
              const isNumericOnly = /^\d+$/.test(morphName); // 数字だけの名前をフィルタ
              const isBodyMesh = meshName.toLowerCase().includes('body'); // 体メッシュかどうか
              
              // 体型関連は数字でも表示、それ以外は数字のみを除外
              const shouldInclude = !isDuplicate && (!isNumericOnly || isBodyMesh || morphName.toLowerCase().includes('fatness'));
              
              if (shouldInclude) {
                const uniqueId = `morph-${meshName}-${morphName}-${index}`;
                shapes.push({
                  id: uniqueId,
                  name: morphName,
                  displayName: displayName + ` (${meshName})`,
                  value: 0, // リセット後は必ず0
                  category,
                  type: 'morphTarget',
                  meshName: meshName,
                  targetIndex: index
                });
              }
            });
          }
        }
      });
    }

    // カテゴリ順でソート（体型関連を優先、fatness系を最優先）
    shapes.sort((a, b) => {
      // fatnessを最優先
      const aIsFatness = a.name.toLowerCase().includes('fatness');
      const bIsFatness = b.name.toLowerCase().includes('fatness');
      if (aIsFatness && !bIsFatness) return -1;
      if (!aIsFatness && bIsFatness) return 1;
      
      // 次にカテゴリ順
      const categoryOrder = ['body', 'expression', 'viseme', 'custom'];
      const categoryDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      if (categoryDiff !== 0) return categoryDiff;
      
      return a.displayName.localeCompare(b.displayName);
    });

    // fatnessブレンドシェイプの存在確認とログ
    const fatnessShapes = shapes.filter(s => s.name.toLowerCase().includes('fatness'));
    const bodyShapes = shapes.filter(s => s.category === 'body');
    
    console.log('🎭 検出されたブレンドシェイプ:', shapes.map(s => `${s.name} (${s.type}, ${s.category})`));
    console.log('🏋️ 体型関連ブレンドシェイプ:', bodyShapes.map(s => `${s.name} (${s.type})`));
    console.log('🎯 fatnessブレンドシェイプ:', fatnessShapes.length > 0 ? fatnessShapes.map(s => `${s.name} (${s.meshName})`) : '❌ 見つかりませんでした');
    
    // fatnessが見つからない場合の処理（モーフターゲット無効化により簡略化）
    if (!fatnessFound) {
      console.log('⚠️ VRMブレンドシェイプからfatnessが見つかりませんでした');
      console.log('🔍 検出されたVRMブレンドシェイプ:', shapes.map(s => s.name));
      
      // ダミー追加は無効化（VRMブレンドシェイプ専用モード）
      console.log('⚠️ ダミー追加は無効化されています（VRMブレンドシェイプ専用モード）');
    } else {
      console.log('✅ fatnessが正常に検出されました');
    }

    // VRMブレンドシェイプマスターから直接ブレンドシェイプを追加してExpressionManagerに登録
    if (vrm.userData && vrm.userData.gltfExtensions && vrm.userData.gltfExtensions.VRM) {
      const vrmExtension = vrm.userData.gltfExtensions.VRM;
      if (vrmExtension.blendShapeMaster && vrmExtension.blendShapeMaster.blendShapeGroups) {
        console.log('🔄 VRMブレンドシェイプマスターから直接ブレンドシェイプを追加中...');
        
        vrmExtension.blendShapeMaster.blendShapeGroups.forEach((group: any, index: number) => {
          const groupName = group.name || `BlendShape${index}`;
          
          // 既にExpressionManagerに存在するかチェック
          const existsInExpressionManager = vrm.expressionManager && vrm.expressionManager.expressionMap[groupName];
          
          if (!existsInExpressionManager) {
            const category = categorizeBlendShape(groupName);
            const displayName = getDisplayName(groupName);
            
            console.log(`  📝 マスターから追加: ${groupName} (カテゴリ: ${category})`);
            console.log(`  📝 グループ詳細:`, group);
            
            // ExpressionManagerに手動で追加
            console.log(`🔍 ExpressionManager登録条件チェック:`, {
              hasExpressionManager: !!vrm.expressionManager,
              hasBinds: !!group.binds,
              bindsLength: group.binds ? group.binds.length : 0
            });
            
            if (vrm.expressionManager && group.binds) {
              console.log(`🎯 ${groupName} の登録を開始...`);
              console.log(`🎯 ExpressionManager現在のキー:`, Object.keys(vrm.expressionManager.expressionMap));
              
              // カスタムExpressionオブジェクトを作成
              const customExpression = {
                expressionName: groupName,
                weight: 0,
                binds: group.binds,
                
                // VRMExpressionの重要なメソッドを実装
                applyWeight: function(weight: number) {
                  this.weight = weight;
                  console.log(`🎭 カスタムExpression適用: ${groupName} = ${weight}`);
                  
                  // bindsを使って直接モーフターゲットを制御
                  if (vrm.scene && this.binds) {
                    this.binds.forEach((bind: any) => {
                      vrm.scene.traverse((object: any) => {
                        if (object.isSkinnedMesh && object.morphTargetInfluences) {
                          if (bind.index !== undefined && bind.index < object.morphTargetInfluences.length) {
                            const finalWeight = weight * (bind.weight || 100.0) / 100.0;
                            object.morphTargetInfluences[bind.index] = finalWeight;
                            console.log(`  🎭 モーフ適用: mesh="${object.name}" index=${bind.index} weight=${finalWeight}`);
                          }
                        }
                      });
                    });
                  }
                }
              };
              
              // ExpressionManagerに登録
              vrm.expressionManager.expressionMap[groupName] = customExpression;
              console.log(`✅ ExpressionManagerに登録: ${groupName}`);
              
              // 登録後の確認
              const registeredExpression = vrm.expressionManager.expressionMap[groupName];
              console.log(`🔍 登録後確認:`, {
                groupName,
                registered: !!registeredExpression,
                expressionType: typeof registeredExpression,
                hasApplyWeight: registeredExpression && typeof registeredExpression.applyWeight === 'function',
                currentWeight: registeredExpression ? registeredExpression.weight : 'N/A'
              });
            } else {
              console.log(`❌ ${groupName} の登録失敗理由:`, {
                hasExpressionManager: !!vrm.expressionManager,
                hasBinds: !!group.binds,
                bindsLength: group.binds ? group.binds.length : 0,
                groupDetail: group
              });
            }
            
            // fatnessを特別にマーク
            if (groupName.toLowerCase().includes('fatness')) {
              fatnessFound = true;
              console.log(`    🎯 マスターでFATNESS発見! ${groupName}:`, group);
              console.log(`    🎯 FATNESS ExpressionManager登録状況:`, {
                groupName,
                registeredInExpressionMap: vrm.expressionManager ? (groupName in vrm.expressionManager.expressionMap) : false,
                expressionMapKeys: vrm.expressionManager ? Object.keys(vrm.expressionManager.expressionMap) : []
              });
              
              // fatnessは通常のIDで追加（master-プレフィックスなし）
              shapes.unshift({
                id: `vrm-${groupName}`, // master-ではなくvrm-プレフィックス
                name: groupName,
                displayName: `🎯 ${displayName} (Master)`,
                value: 0,
                category: 'body',
                type: 'vrm'
              });
            } else {
              shapes.push({
                id: `master-${groupName}`,
                name: groupName,
                displayName: `${displayName} (Master)`,
                value: 0,
                category,
                type: 'vrm'
              });
            }
          } else {
            console.log(`  ⏭️ ${groupName}は既にExpressionManagerに存在します`);
            console.log(`🔍 既存チェック詳細:`, {
              groupName,
              existsInExpressionManager,
              expressionMapHasKey: vrm.expressionManager ? (groupName in vrm.expressionManager.expressionMap) : false
            });
          }
        });
      }
    }
    
    // fatnessモーフターゲットをVRMブレンドシェイプマスターに動的追加
    if (vrm.scene && vrm.expressionManager) {
      const fatnessBinds: Array<{mesh: number; index: number; weight: number}> = [];
      
      vrm.scene.traverse((object: any, meshIndex: number) => {
        if (object.isSkinnedMesh && object.morphTargetDictionary) {
          const meshName = object.name || 'Unknown Mesh';
          const morphNames = Object.keys(object.morphTargetDictionary);
          
          console.log(`🔍 メッシュ "${meshName}" モーフターゲット:`, morphNames);
          
          const fatnessTargets = morphNames.filter(name => name.toLowerCase().includes('fatness'));
          if (fatnessTargets.length > 0) {
            console.log('🎯 fatnessモーフターゲット発見:', {
              mesh: meshName,
              targets: fatnessTargets,
              meshIndex
            });
            
            // VRMブレンドシェイプマスターへの登録用データを収集
            fatnessTargets.forEach(fatnessName => {
              const index = object.morphTargetDictionary[fatnessName];
              
              // GLTFシーン内でのメッシュインデックスを取得
              let gltfMeshIndex = -1;
              if (vrm.scene.parent) {
                vrm.scene.parent.traverse((obj: any, idx: number) => {
                  if (obj === object && obj.isSkinnedMesh) {
                    gltfMeshIndex = idx;
                  }
                });
              }
              
              fatnessBinds.push({
                mesh: gltfMeshIndex >= 0 ? gltfMeshIndex : meshIndex,
                index: index,
                weight: 100.0 // 通常は100.0
              });
              
              console.log('📝 fatnessバインド情報:', {
                fatnessName,
                meshName,
                gltfMeshIndex,
                morphIndex: index
              });
            });
          }
        }
      });
      
      // fatnessブレンドシェイプをVRM expressionManagerに動的追加
      if (fatnessBinds.length > 0 && !vrm.expressionManager.expressionMap['fatness']) {
        try {
          // VRMExpressionクラスを動的に作成
          const fatnessExpression = {
            expressionName: 'fatness',
            weight: 0.0,
            binds: fatnessBinds,
            
            // 重要: VRMExpressionの必須メソッド
            applyWeight: function(weight: number) {
              this.weight = weight;
              vrm.scene?.traverse((object: any) => {
                if (object.isSkinnedMesh && object.morphTargetDictionary) {
                  if (object.morphTargetDictionary['fatness'] !== undefined) {
                    const index = object.morphTargetDictionary['fatness'];
                    if (object.morphTargetInfluences) {
                      object.morphTargetInfluences[index] = weight;
                    }
                  }
                }
              });
            }
          };
          
          // expressionMapに直接追加
          vrm.expressionManager.expressionMap['fatness'] = fatnessExpression;
          
          console.log('✅ fatnessブレンドシェイプをVRM expressionManagerに追加完了');
          
          // shapes配列にVRMブレンドシェイプとして追加
          shapes.push({
            id: 'vrm-fatness',
            name: 'fatness',
            displayName: 'fatness ⭐️ (VRM)',
            value: 0,
            category: 'body',
            type: 'vrm'
          });
          
        } catch (error) {
          console.error('❌ fatnessブレンドシェイプの追加に失敗:', error);
          
          // フォールバック: モーフターゲットとして追加
          fatnessBinds.forEach((bind, index) => {
            shapes.push({
              id: `morph-fatness-${index}`,
              name: 'fatness',
              displayName: 'fatness ⭐️ (Morph)',
              value: 0,
              category: 'body',
              type: 'morphTarget',
              meshName: `Mesh${bind.mesh}`,
              targetIndex: bind.index
            });
          });
        }
      }
    }
    
    // VRM読み込み時に全ブレンドシェイプを0にリセット
    console.log('🔄 VRM読み込み時リセット開始...');
    
    // ExpressionManagerのブレンドシェイプをリセット
    if (vrm.expressionManager) {
      console.log('🔍 ExpressionManager現在の状態:');
      Object.entries(vrm.expressionManager.expressionMap).forEach(([name, expression]) => {
        console.log(`  ${name}: ${expression.weight}`);
        if (expression.weight !== 0) {
          console.log(`  🔄 ${name}: ${expression.weight} -> 0`);
          expression.weight = 0;
          
          // リセット後も確認
          console.log(`  ✅ ${name}リセット後: ${expression.weight}`);
        }
      });
    }
    
    // シーン内のモーフターゲットをリセット（強制的に全て0にセット）
    if (vrm.scene) {
      vrm.scene.traverse((object: any) => {
        if (object.isSkinnedMesh && object.morphTargetInfluences) {
          // 強制的に全てのモーフターゲットを0にリセット（ログなし）
          for (let i = 0; i < object.morphTargetInfluences.length; i++) {
            object.morphTargetInfluences[i] = 0;
          }
        }
      });
    }
    
    console.log('✅ VRM読み込み時リセット完了');
    
    // リセット直後にもう一度チェック
    setTimeout(() => {
      console.log('🔍 リセット5秒後の状態チェック:');
      if (vrm.expressionManager) {
        Object.entries(vrm.expressionManager.expressionMap).forEach(([name, expression]) => {
          if (expression.weight !== 0) {
            console.log(`  ⚠️ ${name}が勝手に変更された: ${expression.weight}`);
          }
        });
      }
      
      // モーフターゲットのチェック（ログなし）
      if (vrm.scene) {
        // 必要に応じてチェック処理を追加
      }
    }, 5000);
    
    setBlendShapes(shapes);
  }, [vrm]);

  // ブレンドシェイプをカテゴリ分け
  const categorizeBlendShape = (name: string): BlendShapeData['category'] => {
    const lowerName = name.toLowerCase();
    
    // 表情系
    if (['angry', 'fun', 'joy', 'sorrow', 'surprised', 'neutral'].some(expr => lowerName.includes(expr))) {
      return 'expression';
    }
    
    // 口形系（ビセーム）
    if (['a', 'i', 'u', 'e', 'o', 'blink'].some(viseme => lowerName === viseme || lowerName.includes('blink'))) {
      return 'viseme';
    }
    
    // 体型系（おなか周りなど）
    if (['belly', 'waist', 'chest', 'body', 'fat', 'fatness', 'slim', 'thick'].some(body => lowerName.includes(body))) {
      return 'body';
    }
    
    return 'custom';
  };

  // 表示名を日本語化
  const getDisplayName = (name: string): string => {
    const nameMap: Record<string, string> = {
      'neutral': 'ニュートラル',
      'angry': '怒り',
      'fun': '楽しい',
      'joy': '喜び',
      'sorrow': '悲しみ',
      'surprised': '驚き',
      'a': 'あ',
      'i': 'い', 
      'u': 'う',
      'e': 'え',
      'o': 'お',
      'blink': 'まばたき',
      'blink_l': '左まばたき',
      'blink_r': '右まばたき'
    };
    
    return nameMap[name.toLowerCase()] || name;
  };

  // ブレンドシェイプ値を変更（VRM + モーフターゲット対応版）
  const handleBlendShapeChange = (name: string, value: number) => {
    console.log(`🔍 handleBlendShapeChange開始: name="${name}", value=${value}`);
    
    if (!vrm) {
      console.log(`❌ VRMが存在しません`);
      return;
    }
    console.log(`✅ VRM確認OK`);

    // 同時操作制限チェック
    const newActiveSet = new Set(activeBlendShapes);
    console.log(`🔍 現在のアクティブセット:`, Array.from(activeBlendShapes));
    
    if (value > 0) {
      // 新しいブレンドシェイプを追加
      if (!newActiveSet.has(name) && newActiveSet.size >= maxSimultaneousBlendShapes) {
        console.warn(`⚠️ 同時操作制限: 最大${maxSimultaneousBlendShapes}個まで（現在${newActiveSet.size}個）`);
        return;
      }
      newActiveSet.add(name);
      console.log(`✅ アクティブセットに追加: ${name}`);
    } else {
      // ブレンドシェイプを非アクティブ化
      newActiveSet.delete(name);
      console.log(`✅ アクティブセットから削除: ${name}`);
    }

    // 対象のブレンドシェイプ情報を取得
    console.log(`🔍 ブレンドシェイプ検索中: ${name}`);
    console.log(`🔍 利用可能なブレンドシェイプ一覧:`, blendShapes.map(s => s.name));
    const targetShape = blendShapes.find(shape => shape.name === name);
    if (!targetShape) {
      console.warn(`❌ ブレンドシェイプが見つかりません: ${name}`);
      console.log(`🔍 検索条件: name="${name}"`);
      console.log(`🔍 blendShapes:`, blendShapes);
      return;
    }
    console.log(`✅ ターゲットブレンドシェイプ見つかりました:`, targetShape);

    let updated = false;

    console.log(`🔍 ターゲットシェイプタイプ: ${targetShape.type}, ID: ${targetShape.id}`);
    
    if (targetShape.type === 'vrm' && vrm.expressionManager) {
      console.log(`🔍 VRMブレンドシェイプ処理開始`);
      console.log(`🔍 ExpressionManager存在チェック:`, !!vrm.expressionManager);
      console.log(`🔍 ExpressionMapの内容:`, Object.keys(vrm.expressionManager.expressionMap));
      
      // VRMブレンドシェイプの場合
      const expression = vrm.expressionManager.expressionMap[name];
      console.log(`🔍 Expression検索結果 (${name}):`, expression);
      
      if (expression) {
        console.log(`✅ Expression見つかりました: ${name}`);
        const oldValue = expression.weight;
        console.log(`🔍 現在の重み: ${oldValue} -> 新しい重み: ${value}`);
        
        // applyWeightメソッドが存在するかチェック
        if (typeof expression.applyWeight === 'function') {
          console.log(`✅ applyWeightメソッド存在、実行中...`);
          expression.applyWeight(value);
          updated = true;
          console.log(`🎭 applyWeight実行完了: ${name} = ${value}`);
        } else {
          console.log(`🔍 applyWeightメソッドなし、直接weight設定`);
          expression.weight = value;
          updated = true;
          console.log(`🎭 直接weight設定: ${name} = ${oldValue} -> ${value}`);
        }
        
        // 設定直後の確認
        setTimeout(() => {
          console.log(`🔍 ${name}設定後確認: ${expression.weight} (期待値: ${value})`);
        }, 100);
        
      } else {
        // ExpressionMapに見つからない場合、マスターから直接制御を試みる
        console.log(`🔍 ExpressionMapにないため、マスター制御を開始: ${name}`);
        
        // VRMオブジェクトの構造を詳細に調査
        console.log(`🔍 VRMオブジェクト詳細調査:`);
        console.log(`  - vrm.userData:`, !!vrm.userData);
        console.log(`  - vrm.userData キー:`, vrm.userData ? Object.keys(vrm.userData) : 'なし');
        if (vrm.userData) {
          console.log(`  - vrm.userData.gltfExtensions:`, !!vrm.userData.gltfExtensions);
          if (vrm.userData.gltfExtensions) {
            console.log(`  - gltfExtensions キー:`, Object.keys(vrm.userData.gltfExtensions));
            console.log(`  - vrm.userData.gltfExtensions.VRM:`, !!vrm.userData.gltfExtensions.VRM);
          }
        }
        
        // 他の可能な場所も確認
        console.log(`🔍 VRM その他の構造確認:`);
        console.log(`  - vrm.scene:`, !!vrm.scene);
        console.log(`  - vrm.meta:`, !!vrm.meta);
        console.log(`  - vrm.humanoid:`, !!vrm.humanoid);
        console.log(`  - vrm.lookAt:`, !!vrm.lookAt);
        console.log(`  - VRMの直接プロパティ:`, Object.keys(vrm).filter(key => !key.startsWith('_')));
        
        // 新しいVRM APIでブレンドシェイプマスターにアクセス
        // 方法1: VRMオブジェクトから直接GLTFデータにアクセス  
        console.log(`🔍 VRM GLTFアクセス試行...`);
        let blendShapeGroups = null;
        
        // VRMオブジェクトのsceneからGLTFを取得
        if (vrm.scene && vrm.scene.userData && vrm.scene.userData.gltfExtensions) {
          console.log(`🔍 方法1: vrm.scene.userData.gltfExtensions`);
          console.log(`  - gltfExtensions:`, Object.keys(vrm.scene.userData.gltfExtensions));
          if (vrm.scene.userData.gltfExtensions.VRM) {
            const vrmExt = vrm.scene.userData.gltfExtensions.VRM;
            console.log(`  - VRM拡張:`, Object.keys(vrmExt));
            if (vrmExt.blendShapeMaster) {
              blendShapeGroups = vrmExt.blendShapeMaster.blendShapeGroups;
              console.log(`✅ 方法1で発見: ${blendShapeGroups?.length || 0}個のブレンドシェイプグループ`);
            }
          }
        }
        
        // 方法2: ExpressionManagerから直接モーフターゲット情報を取得
        if (!blendShapeGroups && vrm.scene) {
          console.log(`🔍 方法2: ExpressionManagerから直接制御`);
          console.log(`🔍 fatnessを直接モーフターゲットとして検索...`);
          
          vrm.scene.traverse((object: any) => {
            if (object.isSkinnedMesh && object.morphTargetDictionary) {
              console.log(`🔍 メッシュ: ${object.name}`);
              console.log(`  - morphTargetDictionary:`, Object.keys(object.morphTargetDictionary));
              
              if (object.morphTargetDictionary[name] !== undefined) {
                const morphIndex = object.morphTargetDictionary[name];
                console.log(`🎯 ${name}モーフターゲット発見: メッシュ="${object.name}" インデックス=${morphIndex}`);
                
                if (object.morphTargetInfluences && morphIndex < object.morphTargetInfluences.length) {
                  const oldValue = object.morphTargetInfluences[morphIndex];
                  object.morphTargetInfluences[morphIndex] = value;
                  updated = true;
                  console.log(`🎭 直接モーフターゲット制御: ${name} ${oldValue} -> ${value}`);
                }
              }
            }
          });
        }
        
        // 方法3: 従来のuserData方式も念のため試行
        if (!updated && vrm.userData && vrm.userData.gltfExtensions && vrm.userData.gltfExtensions.VRM) {
          const vrmExtension = vrm.userData.gltfExtensions.VRM;
          if (vrmExtension.blendShapeMaster && vrmExtension.blendShapeMaster.blendShapeGroups) {
            console.log(`🔍 ブレンドシェイプマスター検索中...`);
            const group = vrmExtension.blendShapeMaster.blendShapeGroups.find((g: any) => g.name === name);
            console.log(`🔍 グループ検索結果:`, group);
            
            if (group && group.binds) {
              console.log(`🎯 ${name}のbinds情報:`, group.binds);
              
              // bindsを使って直接モーフターゲットを制御
              group.binds.forEach((bind: any, bindIndex: number) => {
                console.log(`🔍 Bind[${bindIndex}]処理中:`, bind);
                if (vrm.scene) {
                  vrm.scene.traverse((object: any) => {
                    if (object.isSkinnedMesh && object.morphTargetInfluences) {
                      if (bind.index !== undefined && bind.index < object.morphTargetInfluences.length) {
                        const finalValue = value * (bind.weight || 100.0) / 100.0;
                        const oldMorphValue = object.morphTargetInfluences[bind.index];
                        object.morphTargetInfluences[bind.index] = finalValue;
                        updated = true;
                        console.log(`🎭 マスター直接制御: mesh="${object.name}" index=${bind.index} ${oldMorphValue}->${finalValue} (bind.weight=${bind.weight})`);
                      } else {
                        console.log(`⚠️ バインドインデックス範囲外: ${bind.index} >= ${object.morphTargetInfluences.length}`);
                      }
                    }
                  });
                }
              });
            } else {
              console.log(`❌ グループまたはバインドが見つかりません`);
            }
          } else {
            console.log(`❌ ブレンドシェイプマスターが見つかりません`);
          }
        } else {
          console.log(`❌ VRM拡張データが見つかりません`);
        }
      }
    } else if (targetShape.type === 'morphTarget' && vrm.scene) {
      // モーフターゲット制御は一時的に無効化
      console.log(`⚠️ モーフターゲット制御は無効化されています: ${name} = ${value}`);
    } else {
      console.log(`🔍 VRMブレンドシェイプではない: type=${targetShape.type}, hasExpressionManager=${!!vrm.expressionManager}`);
    }

    console.log(`🔍 処理結果: updated=${updated}`);
    
    if (updated) {
      console.log(`✅ ブレンドシェイプ適用成功: ${name} = ${value}`);
      
      // アクティブセットを更新
      console.log(`🔍 アクティブセット更新前:`, Array.from(activeBlendShapes));
      setActiveBlendShapes(newActiveSet);
      console.log(`🔍 アクティブセット更新後:`, Array.from(newActiveSet));

      // 状態を更新
      console.log(`🔍 ブレンドシェイプ状態更新中...`);
      setBlendShapes(prev => {
        const updated = prev.map(shape => 
          shape.name === name && shape.type === targetShape.type && shape.meshName === targetShape.meshName 
            ? { ...shape, value } 
            : shape
        );
        console.log(`🔍 状態更新完了: ${name}の新しい値 = ${value}`);
        return updated;
      });

      // 親コンポーネントに通知
      if (onBlendShapeChange) {
        console.log(`🔍 親コンポーネントに通知: ${name} = ${value}`);
        onBlendShapeChange(name, value);
      } else {
        console.log(`🔍 親コンポーネントへの通知なし（onBlendShapeChangeがnull）`);
      }
    } else {
      console.warn(`❌ ブレンドシェイプの適用に失敗: ${name}`);
      console.log(`🔍 失敗の詳細:`);
      console.log(`  - targetShape.type: ${targetShape.type}`);
      console.log(`  - targetShape.id: ${targetShape.id}`);
      console.log(`  - vrm.expressionManager存在: ${!!vrm.expressionManager}`);
      if (vrm.expressionManager) {
        console.log(`  - ExpressionMapにキー存在: ${name in vrm.expressionManager.expressionMap}`);
      }
    }
    
    console.log(`🔍 handleBlendShapeChange完了: ${name}`);
  };

  // 全てリセット（VRM + モーフターゲット対応版）
  const handleResetAll = () => {
    blendShapes.forEach(shape => {
      if (shape.type === 'vrm' && vrm?.expressionManager) {
        // VRMブレンドシェイプのリセット
        const expression = vrm.expressionManager.expressionMap[shape.name];
        if (expression) {
          expression.weight = 0;
        }
      } else if (shape.type === 'morphTarget' && vrm?.scene) {
        // モーフターゲットのリセット
        vrm.scene.traverse((object: any) => {
          if (object.isSkinnedMesh && 
              object.name === shape.meshName && 
              object.morphTargetDictionary && 
              object.morphTargetInfluences) {
            const index = object.morphTargetDictionary[shape.name];
            if (index !== undefined) {
              object.morphTargetInfluences[index] = 0;
            }
          }
        });
      }
    });
    
    // 状態を一括更新
    setBlendShapes(prev => prev.map(shape => ({ ...shape, value: 0 })));
    setActiveBlendShapes(new Set());
    
    console.log('🔄 全ブレンドシェイプ（VRM + モーフターゲット）をリセット');
  };

  // カテゴリと検索でフィルタ
  const filteredBlendShapes = blendShapes.filter(shape => {
    const categoryMatch = activeCategory === 'all' || shape.category === activeCategory;
    const searchMatch = searchQuery === '' || 
                       shape.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       shape.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  // カテゴリ別の色
  const getCategoryColor = (category: BlendShapeData['category']) => {
    switch (category) {
      case 'expression': return 'bg-blue-100 text-blue-800';
      case 'viseme': return 'bg-green-100 text-green-800';
      case 'body': return 'bg-orange-100 text-orange-800';
      case 'custom': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!vrm) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <p className="text-gray-500 text-center">VRMモデルを読み込んでください</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800">コントロール</h3>
          <button
            onClick={handleResetAll}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
          >
            全リセット
          </button>
        </div>
        
        {/* 統計情報と最適化状態 */}
        <div className="mt-3 text-xs text-gray-500 grid grid-cols-2 gap-2">
          <div>総数: {blendShapes.length}</div>
          <div>表示中: {filteredBlendShapes.length}</div>
          <div>表情: {blendShapes.filter(s => s.category === 'expression').length}</div>
          <div>口形: {blendShapes.filter(s => s.category === 'viseme').length}</div>
          <div>体型: {blendShapes.filter(s => s.category === 'body').length}</div>
          <div>その他: {blendShapes.filter(s => s.category === 'custom').length}</div>
        </div>
        
        {/* 最適化情報 */}
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
          <div className="flex justify-between items-center">
            <span className="text-blue-700">
              🎛️ アクティブ: {activeBlendShapes.size}/{maxSimultaneousBlendShapes}
            </span>
            {activeBlendShapes.size >= maxSimultaneousBlendShapes && (
              <span className="text-orange-600 font-medium">
                ⚠️ 制限到達
              </span>
            )}
          </div>
        </div>
        
        {/* 検索機能 */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="🔍 ブレンドシェイプを検索 (例: fatness)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        
        {/* fatness簡単検索ボタン */}
        {searchQuery !== 'fatness' && (
          <div className="mt-2">
            <button
              onClick={() => setSearchQuery('fatness')}
              className="px-3 py-1 text-xs bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors"
            >
              🎯 fatnessを検索
            </button>
          </div>
        )}

        {/* カテゴリフィルタ */}
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {(['all', 'expression', 'viseme', 'body', 'custom'] as const).map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                activeCategory === category 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category === 'all' ? '全て' : 
               category === 'expression' ? '表情' :
               category === 'viseme' ? '口形' :
               category === 'body' ? '体型' : 'その他'}
            </button>
          ))}
        </div>
      </div>

      {/* ブレンドシェイプリスト */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
        {filteredBlendShapes.length === 0 ? (
          <p className="text-gray-500 text-center py-4">該当するブレンドシェイプがありません</p>
        ) : (
          filteredBlendShapes.map((shape, index) => (
            <div key={shape.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{shape.displayName}</span>
                  <span className={`px-2 py-1 text-xs rounded ${getCategoryColor(shape.category)}`}>
                    {shape.category}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    shape.type === 'morphTarget' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {shape.type === 'morphTarget' ? 'Morph' : 'VRM'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded min-w-[40px] text-center">
                    {(shape.value * 100).toFixed(0)}%
                  </span>
                  <button
                    onClick={() => handleBlendShapeChange(shape.name, 0)}
                    className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                    title="リセット"
                  >
                    0
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={shape.value}
                onChange={(e) => handleBlendShapeChange(shape.name, parseFloat(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer slider ${
                  activeBlendShapes.has(shape.name) 
                    ? 'bg-blue-200' 
                    : activeBlendShapes.size >= maxSimultaneousBlendShapes && shape.value === 0
                    ? 'bg-gray-300 opacity-50 cursor-not-allowed'
                    : 'bg-gray-200'
                }`}
                disabled={activeBlendShapes.size >= maxSimultaneousBlendShapes && shape.value === 0}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span className="text-gray-600 font-medium">{shape.name}</span>
                <span>100%</span>
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
}