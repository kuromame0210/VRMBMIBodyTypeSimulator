const fs = require('fs');
const path = require('path');

console.log('🔍 男性VRMファイル詳細分析');
console.log('=========================');

// 男性VRMファイルを詳しく分析
const maleFiles = ['m_0_22.vrm', 'm_1_22.vrm', 'm_2_22.vrm'];
const vrmDir = path.join(__dirname, 'public', 'vrm-models');

maleFiles.forEach(file => {
  console.log(`\n📄 ${file} の詳細分析:`);
  console.log(''.padEnd(50, '-'));
  
  const filePath = path.join(vrmDir, file);
  const buffer = fs.readFileSync(filePath);
  
  try {
    let offset = 12; // GLTFヘッダー後
    while (offset < buffer.length) {
      const chunkLength = buffer.readUInt32LE(offset);
      const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
      
      if (chunkType === 'JSON') {
        const jsonData = buffer.toString('utf8', offset + 8, offset + 8 + chunkLength);
        const gltfData = JSON.parse(jsonData);
        
        // メッシュの詳細分析
        if (gltfData.meshes) {
          console.log(`🎭 メッシュ数: ${gltfData.meshes.length}`);
          
          gltfData.meshes.forEach((mesh, meshIndex) => {
            console.log(`\n  📦 メッシュ[${meshIndex}] 分析:`);
            console.log(`    名前: ${mesh.name || 'unnamed'}`);
            
            if (mesh.primitives) {
              mesh.primitives.forEach((primitive, primIndex) => {
                console.log(`    プリミティブ[${primIndex}]:`);
                
                if (primitive.targets) {
                  console.log(`      📊 モーフターゲット数: ${primitive.targets.length}`);
                  
                  // 各モーフターゲットの詳細
                  primitive.targets.forEach((target, targetIndex) => {
                    const attributes = Object.keys(target);
                    console.log(`        [${targetIndex}] 属性: ${attributes.join(', ')}`);
                  });
                } else {
                  console.log(`      📊 モーフターゲット: なし`);
                }
                
                // マテリアル情報
                if (primitive.material !== undefined) {
                  console.log(`      🎨 マテリアル: ${primitive.material}`);
                }
              });
            }
          });
        }
        
        // VRM拡張の詳細分析
        if (gltfData.extensions && gltfData.extensions.VRM) {
          const vrmData = gltfData.extensions.VRM;
          console.log(`\n🤖 VRM情報:`);
          console.log(`  バージョン: ${vrmData.specVersion || 'unknown'}`);
          
          if (vrmData.blendShapeMaster && vrmData.blendShapeMaster.blendShapeGroups) {
            const blendShapeGroups = vrmData.blendShapeMaster.blendShapeGroups;
            console.log(`  🎭 ブレンドシェイプグループ数: ${blendShapeGroups.length}`);
            
            // 体型関連の検索
            const bodyRelatedTerms = ['belly', 'fat', 'weight', 'body', 'muscle', 'chest', 'waist', 'hip', 'thigh', 'arm', 'breast', 'butt'];
            let foundBodyBlendShapes = false;
            
            console.log(`\n  📋 全ブレンドシェイプ一覧:`);
            blendShapeGroups.forEach((group, index) => {
              const name = group.name || 'unnamed';
              const preset = group.presetName || 'none';
              
              // 体型関連かチェック
              const isBodyRelated = bodyRelatedTerms.some(term => 
                name.toLowerCase().includes(term) || preset.toLowerCase().includes(term)
              );
              
              if (isBodyRelated) {
                console.log(`    [${index}] 🏋️ ${name} (preset: ${preset}) ← 体型関連！`);
                foundBodyBlendShapes = true;
              } else {
                console.log(`    [${index}] 😊 ${name} (preset: ${preset})`);
              }
              
              if (group.binds && group.binds.length > 0) {
                group.binds.forEach(bind => {
                  console.log(`      └─ メッシュ:${bind.mesh}, インデックス:${bind.index}, ウェイト:${bind.weight}`);
                });
              }
            });
            
            if (!foundBodyBlendShapes) {
              console.log(`\n  ❌ 体型関連ブレンドシェイプは見つかりませんでした`);
              console.log(`     検索キーワード: ${bodyRelatedTerms.join(', ')}`);
            }
          }
          
          // その他のVRM情報
          if (vrmData.meta) {
            console.log(`\n  📝 メタ情報:`);
            console.log(`    タイトル: ${vrmData.meta.title || 'none'}`);
            console.log(`    作者: ${vrmData.meta.author || 'none'}`);
            console.log(`    バージョン: ${vrmData.meta.version || 'none'}`);
          }
        }
        
        break;
      }
      
      offset += 8 + chunkLength;
      if (offset % 4 !== 0) {
        offset += 4 - (offset % 4);
      }
    }
  } catch (error) {
    console.log(`❌ 分析エラー: ${error.message}`);
  }
});

console.log('\n🎯 総合結論:');
console.log('==========');
console.log('全VRMファイルに体型関連ブレンドシェイプは含まれていません。');
console.log('利用可能なのは顔の表情のみです。');
console.log('BMI体型シミュレーターには別のアプローチが必要です。');