const fs = require('fs');
const path = require('path');

console.log('🎭 VRMブレンドシェイプ詳細分析ツール');
console.log('===================================');

// 新しいVRMファイル（GLB形式）の一覧
const vrmDir = path.join(__dirname, '..', 'public', 'vrm-models');
const newVrmFiles = ['f_0.glb', 'f_1.glb', 'f_2.glb', 'm_0.glb', 'm_1.glb', 'm_2.glb'];

// 各ファイルのVRMブレンドシェイプを詳細分析
newVrmFiles.forEach(file => {
  console.log(`\n🔍 ${file} のブレンドシェイプ詳細分析:`);
  console.log('=' .repeat(60));
  
  const filePath = path.join(vrmDir, file);
  const buffer = fs.readFileSync(filePath);
  
  try {
    // JSONチャンクを探してVRMデータを解析
    let offset = 12;
    let jsonData = null;
    
    while (offset < buffer.length && !jsonData) {
      const chunkLength = buffer.readUInt32LE(offset);
      const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
      
      if (chunkType === 'JSON') {
        const jsonString = buffer.toString('utf8', offset + 8, offset + 8 + chunkLength);
        jsonData = JSON.parse(jsonString);
        break;
      }
      
      offset += 8 + chunkLength;
      if (offset % 4 !== 0) {
        offset += 4 - (offset % 4);
      }
    }
    
    if (jsonData) {
      // GLTF Extra情報の確認
      if (jsonData.extras) {
        console.log('📄 GLTF Extras情報:');
        console.log('  ', JSON.stringify(jsonData.extras, null, 2));
      }
      
      // VRM拡張の詳細分析
      if (jsonData.extensions && jsonData.extensions.VRM) {
        const vrmData = jsonData.extensions.VRM;
        console.log('🤖 VRM拡張情報が見つかりました:');
        console.log(`  VRMバージョン: ${vrmData.specVersion || 'unknown'}`);
        
        // VRMブレンドシェイプマスターの詳細分析
        if (vrmData.blendShapeMaster && vrmData.blendShapeMaster.blendShapeGroups) {
          const blendShapeGroups = vrmData.blendShapeMaster.blendShapeGroups;
          console.log(`\n🎭 VRMブレンドシェイプグループ: ${blendShapeGroups.length}個`);
          
          blendShapeGroups.forEach((group, index) => {
            console.log(`\n  [${index}] ${group.name || 'Unnamed'}`);
            console.log(`      Preset: ${group.presetName || 'custom'}`);
            console.log(`      isBinary: ${group.isBinary || false}`);
            
            if (group.binds && group.binds.length > 0) {
              console.log(`      Binds (${group.binds.length}個):`);
              group.binds.forEach((bind, bindIndex) => {
                console.log(`        [${bindIndex}] メッシュ:${bind.mesh}, インデックス:${bind.index}, ウェイト:${bind.weight}`);
              });
            }
            
            if (group.materialValues && group.materialValues.length > 0) {
              console.log(`      Material Values (${group.materialValues.length}個):`);
              group.materialValues.forEach((matVal, matIndex) => {
                console.log(`        [${matIndex}] Material:${matVal.materialName}, Property:${matVal.propertyName}`);
              });
            }
          });
          
          // 体型関連ブレンドシェイプの検索
          console.log(`\n🔍 体型関連ブレンドシェイプ検索:`);
          const bodyRelatedKeywords = ['fat', 'weight', 'belly', 'muscle', 'thin', 'thick', 'body', 'BMI', 'size'];
          const bodyRelatedShapes = [];
          
          blendShapeGroups.forEach((group, index) => {
            const name = (group.name || '').toLowerCase();
            const preset = (group.presetName || '').toLowerCase();
            
            for (const keyword of bodyRelatedKeywords) {
              if (name.includes(keyword) || preset.includes(keyword)) {
                bodyRelatedShapes.push({
                  index,
                  name: group.name || 'Unnamed',
                  preset: group.presetName || 'custom',
                  keyword: keyword,
                  binds: group.binds ? group.binds.length : 0
                });
                break;
              }
            }
          });
          
          if (bodyRelatedShapes.length > 0) {
            console.log('  🎯 体型関連ブレンドシェイプが見つかりました:');
            bodyRelatedShapes.forEach(shape => {
              console.log(`    - [${shape.index}] ${shape.name} (preset: ${shape.preset}, キーワード: ${shape.keyword}, binds: ${shape.binds})`);
            });
          } else {
            console.log('  ❌ 体型関連ブレンドシェイプは見つかりませんでした');
          }
          
          // 顔関連ブレンドシェイプの分析
          console.log(`\n😀 顔関連ブレンドシェイプ分析:`);
          const faceCategories = {
            expressions: ['neutral', 'angry', 'fun', 'joy', 'sorrow', 'surprised'],
            mouth: ['a', 'i', 'u', 'e', 'o'],
            eyes: ['blink', 'blink_l', 'blink_r'],
            custom: []
          };
          
          const faceShapes = { expressions: [], mouth: [], eyes: [], custom: [] };
          
          blendShapeGroups.forEach((group, index) => {
            const preset = (group.presetName || '').toLowerCase();
            let categorized = false;
            
            for (const [category, presets] of Object.entries(faceCategories)) {
              if (category !== 'custom' && presets.includes(preset)) {
                faceShapes[category].push({
                  index,
                  name: group.name || 'Unnamed',
                  preset: group.presetName || 'custom'
                });
                categorized = true;
                break;
              }
            }
            
            if (!categorized && preset !== 'unknown') {
              faceShapes.custom.push({
                index,
                name: group.name || 'Unnamed',
                preset: group.presetName || 'custom'
              });
            }
          });
          
          Object.entries(faceShapes).forEach(([category, shapes]) => {
            if (shapes.length > 0) {
              console.log(`  ${category.toUpperCase()}: ${shapes.length}個`);
              shapes.forEach(shape => {
                console.log(`    - [${shape.index}] ${shape.name} (${shape.preset})`);
              });
            }
          });
          
        } else {
          console.log('❌ VRMブレンドシェイプマスターが見つかりません');
        }
        
      } else {
        console.log('❌ VRM拡張情報が見つかりません（GLBファイルにVRMデータが含まれていない可能性があります）');
        
        // GLTFのmesh.extrasやmesh.primitives.extras等をチェック
        console.log('\n🔍 GLTF内の追加情報を検索中...');
        
        if (jsonData.meshes) {
          let foundMorphTargets = false;
          
          jsonData.meshes.forEach((mesh, meshIndex) => {
            if (mesh.extras) {
              console.log(`  メッシュ[${meshIndex}] extras:`, JSON.stringify(mesh.extras, null, 2));
            }
            
            if (mesh.primitives) {
              mesh.primitives.forEach((primitive, primIndex) => {
                if (primitive.extras) {
                  console.log(`  メッシュ[${meshIndex}] プリミティブ[${primIndex}] extras:`, JSON.stringify(primitive.extras, null, 2));
                }
                
                if (primitive.targets && primitive.targets.length > 0) {
                  if (!foundMorphTargets) {
                    console.log(`\n📊 モーフターゲット情報:`);
                    foundMorphTargets = true;
                  }
                  
                  console.log(`  メッシュ[${meshIndex}] プリミティブ[${primIndex}]: ${primitive.targets.length}個のモーフターゲット`);
                  
                  // モーフターゲット名を探すため、accessor.extras等をチェック
                  if (jsonData.accessors) {
                    primitive.targets.forEach((target, targetIndex) => {
                      Object.keys(target).forEach(attr => {
                        const accessorIndex = target[attr];
                        if (jsonData.accessors[accessorIndex] && jsonData.accessors[accessorIndex].extras) {
                          console.log(`    [${targetIndex}] ${attr} accessor extras:`, JSON.stringify(jsonData.accessors[accessorIndex].extras, null, 2));
                        }
                      });
                    });
                  }
                }
              });
            }
          });
          
          if (!foundMorphTargets) {
            console.log('  モーフターゲットが見つかりませんでした');
          }
        }
      }
      
    } else {
      console.log('❌ JSONデータの読み込みに失敗');
    }
    
  } catch (error) {
    console.log(`❌ 分析エラー: ${error.message}`);
    console.log(error.stack);
  }
});

console.log('\n✅ VRMブレンドシェイプ詳細分析完了');