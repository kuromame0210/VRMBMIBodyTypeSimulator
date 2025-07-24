const fs = require('fs');
const path = require('path');

console.log('🔍 VRMモデル ブレンドシェイプ徹底調査');
console.log('=====================================');

// 分析対象のファイルリスト（代表的なBMI値）
const targetFiles = [
  { file: 'f_0_17.vrm', bmi: 17, description: 'スリム' },
  { file: 'f_0_20.vrm', bmi: 20, description: '標準' },
  { file: 'f_0_25.vrm', bmi: 25, description: 'ふっくら' }
];

const vrmDir = path.join(__dirname, 'public', 'vrm-models');

// 各ファイルのGLTFデータを徹底的に解析
function deepAnalyzeBlendShapes(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  // GLTFヘッダー解析
  let offset = 12;
  let gltfData = null;
  
  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
    
    if (chunkType === 'JSON') {
      const jsonString = buffer.toString('utf8', offset + 8, offset + 8 + chunkLength);
      gltfData = JSON.parse(jsonString);
      break;
    }
    
    offset += 8 + chunkLength;
    if (offset % 4 !== 0) {
      offset += 8 - (offset % 4);
    }
  }
  
  return gltfData;
}

// メッシュ別のモーフターゲット詳細分析
function analyzeAllMorphTargets(gltfData) {
  const analysis = {
    totalMeshes: 0,
    totalPrimitives: 0,
    totalMorphTargets: 0,
    meshDetails: [],
    bodyMeshMorphTargets: [], // 身体メッシュのモーフターゲット
    faceMeshMorphTargets: [], // 顔メッシュのモーフターゲット
    potentialBodyShapes: []   // 体型変化の可能性があるもの
  };

  if (!gltfData.meshes) {
    return analysis;
  }

  analysis.totalMeshes = gltfData.meshes.length;

  gltfData.meshes.forEach((mesh, meshIndex) => {
    const meshInfo = {
      meshIndex,
      name: mesh.name || `Mesh_${meshIndex}`,
      primitives: []
    };

    if (mesh.primitives) {
      mesh.primitives.forEach((primitive, primitiveIndex) => {
        analysis.totalPrimitives++;
        
        const primitiveInfo = {
          primitiveIndex,
          vertexCount: 0,
          morphTargets: []
        };

        // 頂点数を取得
        if (primitive.attributes && primitive.attributes.POSITION !== undefined) {
          const positionAccessorIndex = primitive.attributes.POSITION;
          const positionAccessor = gltfData.accessors[positionAccessorIndex];
          primitiveInfo.vertexCount = positionAccessor.count;
        }

        // モーフターゲットの詳細分析
        if (primitive.targets) {
          primitive.targets.forEach((target, targetIndex) => {
            analysis.totalMorphTargets++;
            
            const targetInfo = {
              targetIndex,
              attributes: Object.keys(target),
              hasPosition: !!target.POSITION,
              hasNormal: !!target.NORMAL,
              hasTangent: !!target.TANGENT
            };

            primitiveInfo.morphTargets.push(targetInfo);

            // 身体メッシュかどうかの判定（メッシュ7-11は体部分と仮定）
            if (meshIndex >= 7 && meshIndex <= 11) {
              analysis.bodyMeshMorphTargets.push({
                meshIndex,
                meshName: meshInfo.name,
                primitiveIndex,
                targetIndex,
                vertexCount: primitiveInfo.vertexCount,
                attributes: targetInfo.attributes
              });
              
              // 体型変化の可能性があるかチェック
              if (targetInfo.hasPosition && primitiveInfo.vertexCount > 1000) {
                analysis.potentialBodyShapes.push({
                  meshIndex,
                  meshName: meshInfo.name,
                  primitiveIndex,
                  targetIndex,
                  vertexCount: primitiveInfo.vertexCount,
                  reason: '大きなメッシュで位置属性を持つモーフターゲット'
                });
              }
            } else {
              analysis.faceMeshMorphTargets.push({
                meshIndex,
                meshName: meshInfo.name,
                primitiveIndex,
                targetIndex,
                vertexCount: primitiveInfo.vertexCount,
                attributes: targetInfo.attributes
              });
            }
          });
        }

        meshInfo.primitives.push(primitiveInfo);
      });
    }

    analysis.meshDetails.push(meshInfo);
  });

  return analysis;
}

// VRMブレンドシェイプマスターの詳細分析
function analyzeVRMBlendShapeMaster(gltfData) {
  const vrmAnalysis = {
    hasBlendShapeMaster: false,
    totalBlendShapeGroups: 0,
    blendShapeGroups: [],
    bodyRelatedBlendShapes: [], // 体型関連の可能性があるもの
    customBlendShapes: [] // カスタムブレンドシェイプ
  };

  if (!gltfData.extensions || !gltfData.extensions.VRM || !gltfData.extensions.VRM.blendShapeMaster) {
    return vrmAnalysis;
  }

  vrmAnalysis.hasBlendShapeMaster = true;
  const blendShapeMaster = gltfData.extensions.VRM.blendShapeMaster;

  if (blendShapeMaster.blendShapeGroups) {
    vrmAnalysis.totalBlendShapeGroups = blendShapeMaster.blendShapeGroups.length;

    blendShapeMaster.blendShapeGroups.forEach((group, groupIndex) => {
      const groupInfo = {
        groupIndex,
        name: group.name,
        presetName: group.presetName || 'unknown',
        isBinary: group.isBinary || false,
        binds: []
      };

      if (group.binds) {
        group.binds.forEach(bind => {
          groupInfo.binds.push({
            mesh: bind.mesh,
            index: bind.index,
            weight: bind.weight
          });

          // 体型関連の可能性をチェック
          if (bind.mesh >= 7 && bind.mesh <= 11) { // 体部分のメッシュ
            vrmAnalysis.bodyRelatedBlendShapes.push({
              groupName: group.name,
              presetName: group.presetName,
              meshIndex: bind.mesh,
              morphTargetIndex: bind.index,
              weight: bind.weight,
              reason: '体部分メッシュへのバインド'
            });
          }
        });
      }

      // カスタムブレンドシェイプ（既知のプリセット以外）
      const knownPresets = ['neutral', 'a', 'i', 'u', 'e', 'o', 'blink', 'blink_l', 'blink_r', 'angry', 'fun', 'joy', 'sorrow'];
      if (!knownPresets.includes(group.presetName?.toLowerCase())) {
        vrmAnalysis.customBlendShapes.push(groupInfo);
      }

      vrmAnalysis.blendShapeGroups.push(groupInfo);
    });
  }

  return vrmAnalysis;
}

// 全ファイルの詳細分析を実行
console.log('🔬 徹底的なブレンドシェイプ分析開始...\n');

const allAnalysis = [];

targetFiles.forEach(({ file, bmi, description }) => {
  const filePath = path.join(vrmDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ファイルが見つかりません: ${file}`);
    return;
  }
  
  try {
    console.log(`🔍 ${file} (BMI${bmi} - ${description}) 詳細分析中...`);
    
    const gltfData = deepAnalyzeBlendShapes(filePath);
    const morphAnalysis = analyzeAllMorphTargets(gltfData);
    const vrmAnalysis = analyzeVRMBlendShapeMaster(gltfData);
    
    const fileAnalysis = {
      file,
      bmi,
      description,
      morphAnalysis,
      vrmAnalysis
    };
    
    allAnalysis.push(fileAnalysis);
    
    console.log(`📊 基本統計:`);
    console.log(`   総メッシュ数: ${morphAnalysis.totalMeshes}`);
    console.log(`   総プリミティブ数: ${morphAnalysis.totalPrimitives}`);
    console.log(`   総モーフターゲット数: ${morphAnalysis.totalMorphTargets}`);
    console.log(`   身体メッシュのモーフターゲット: ${morphAnalysis.bodyMeshMorphTargets.length}`);
    console.log(`   顔メッシュのモーフターゲット: ${morphAnalysis.faceMeshMorphTargets.length}`);
    console.log(`   VRMブレンドシェイプグループ: ${vrmAnalysis.totalBlendShapeGroups}`);
    console.log(`   体型関連の可能性: ${vrmAnalysis.bodyRelatedBlendShapes.length}`);
    console.log(`   カスタムブレンドシェイプ: ${vrmAnalysis.customBlendShapes.length}`);
    
    // 身体メッシュの詳細表示
    if (morphAnalysis.bodyMeshMorphTargets.length > 0) {
      console.log(`\n🏋️ 身体メッシュのモーフターゲット詳細:`);
      morphAnalysis.bodyMeshMorphTargets.forEach((target, index) => {
        console.log(`   [${index}] メッシュ${target.meshIndex} プリミティブ${target.primitiveIndex} ターゲット${target.targetIndex}`);
        console.log(`       頂点数: ${target.vertexCount}, 属性: [${target.attributes.join(', ')}]`);
      });
    } else {
      console.log(`\n❌ 身体メッシュにモーフターゲットは見つかりませんでした`);
    }
    
    // 体型関連ブレンドシェイプの詳細表示
    if (vrmAnalysis.bodyRelatedBlendShapes.length > 0) {
      console.log(`\n🎯 体型関連の可能性があるVRMブレンドシェイプ:`);
      vrmAnalysis.bodyRelatedBlendShapes.forEach((shape, index) => {
        console.log(`   [${index}] ${shape.groupName} (${shape.presetName})`);
        console.log(`       メッシュ${shape.meshIndex} → モーフターゲット${shape.morphTargetIndex} (重み: ${shape.weight})`);
      });
    } else {
      console.log(`\n❌ 体型関連のVRMブレンドシェイプは見つかりませんでした`);
    }
    
    // メッシュ別の詳細構造
    console.log(`\n📋 メッシュ構造詳細:`);
    morphAnalysis.meshDetails.forEach((mesh, index) => {
      if (mesh.primitives.some(p => p.morphTargets.length > 0)) {
        console.log(`   メッシュ${mesh.meshIndex} (${mesh.name}):`);
        mesh.primitives.forEach((primitive, pIndex) => {
          if (primitive.morphTargets.length > 0) {
            console.log(`     プリミティブ${pIndex}: ${primitive.vertexCount}頂点, ${primitive.morphTargets.length}モーフターゲット`);
            primitive.morphTargets.forEach((target, tIndex) => {
              console.log(`       ターゲット${target.targetIndex}: [${target.attributes.join(', ')}]`);
            });
          }
        });
      }
    });
    
  } catch (error) {
    console.log(`❌ ${file} の解析でエラー: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
});

// 全ファイル間の比較分析
console.log('📈 ファイル間比較分析');
console.log('==================');

if (allAnalysis.length >= 2) {
  const baseFile = allAnalysis[0];
  
  for (let i = 1; i < allAnalysis.length; i++) {
    const compareFile = allAnalysis[i];
    
    console.log(`\n🔍 ${baseFile.file} vs ${compareFile.file}:`);
    
    // モーフターゲット数の比較
    const baseMorphCount = baseFile.morphAnalysis.totalMorphTargets;
    const compareMorphCount = compareFile.morphAnalysis.totalMorphTargets;
    console.log(`   総モーフターゲット数: ${baseMorphCount} vs ${compareMorphCount} ${baseMorphCount === compareMorphCount ? '✅' : '❌'}`);
    
    // 身体メッシュモーフターゲットの比較
    const baseBodyMorphCount = baseFile.morphAnalysis.bodyMeshMorphTargets.length;
    const compareBodyMorphCount = compareFile.morphAnalysis.bodyMeshMorphTargets.length;
    console.log(`   身体メッシュモーフターゲット: ${baseBodyMorphCount} vs ${compareBodyMorphCount} ${baseBodyMorphCount === compareBodyMorphCount ? '✅' : '❌'}`);
    
    // VRMブレンドシェイプの比較
    const baseVRMCount = baseFile.vrmAnalysis.totalBlendShapeGroups;
    const compareVRMCount = compareFile.vrmAnalysis.totalBlendShapeGroups;
    console.log(`   VRMブレンドシェイプ: ${baseVRMCount} vs ${compareVRMCount} ${baseVRMCount === compareVRMCount ? '✅' : '❌'}`);
  }
}

console.log('\n🏁 最終結論');
console.log('===========');

const hasbodyMorphTargets = allAnalysis.some(analysis => analysis.morphAnalysis.bodyMeshMorphTargets.length > 0);
const hasBodyRelatedVRMBlendShapes = allAnalysis.some(analysis => analysis.vrmAnalysis.bodyRelatedBlendShapes.length > 0);

if (hasbodyMorphTargets) {
  console.log('✅ 身体メッシュにモーフターゲットが見つかりました！');
} else {
  console.log('❌ 身体メッシュにモーフターゲットは見つかりませんでした');
}

if (hasBodyRelatedVRMBlendShapes) {
  console.log('✅ 体型関連のVRMブレンドシェイプが見つかりました！');
} else {
  console.log('❌ 体型関連のVRMブレンドシェイプは見つかりませんでした');
}

if (!hasbodyMorphTargets && !hasBodyRelatedVRMBlendShapes) {
  console.log('\n📍 結論: 体型変化はブレンドシェイプではなく、頂点座標の直接変更で実現されています');
  console.log('💡 推奨: 動的変形システムの継続使用・改良が最適解です');
} else {
  console.log('\n📍 結論: 体型変化用のブレンドシェイプが存在する可能性があります');
  console.log('💡 推奨: 発見されたブレンドシェイプの活用を検討してください');
}

console.log('\n✅ 徹底的なブレンドシェイプ分析完了');