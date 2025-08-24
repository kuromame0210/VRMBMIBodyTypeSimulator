const fs = require('fs');
const path = require('path');

console.log('🔍 新しいVRMモデル詳細分析ツール');
console.log('=================================');

// 新しいVRMファイル（GLB形式）の一覧
const vrmDir = path.join(__dirname, '..', 'public', 'vrm-models');
const newVrmFiles = ['f_0.glb', 'f_1.glb', 'f_2.glb', 'm_0.glb', 'm_1.glb', 'm_2.glb'];

console.log('📁 分析対象ファイル:');
newVrmFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});

// 各ファイルの詳細分析
newVrmFiles.forEach(file => {
  console.log(`\n🔍 ${file} の詳細分析:`);
  console.log('=' .repeat(50));
  
  const filePath = path.join(vrmDir, file);
  const stats = fs.statSync(filePath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`📊 基本情報:`);
  console.log(`  ファイルサイズ: ${sizeInMB}MB (${stats.size} bytes)`);
  console.log(`  更新日時: ${stats.mtime.toLocaleString()}`);
  
  // GLTFバイナリ構造の分析
  const buffer = fs.readFileSync(filePath);
  
  // GLTFヘッダー情報
  const magic = buffer.toString('ascii', 0, 4);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  
  console.log(`  フォーマット: ${magic} v${version}`);
  console.log(`  データ長: ${length} bytes`);
  
  try {
    // JSONチャンクを探してデータを解析
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
      console.log(`\n🎭 メッシュとモーフターゲット分析:`);
      console.log(`  メッシュ数: ${jsonData.meshes ? jsonData.meshes.length : 0}`);
      console.log(`  ノード数: ${jsonData.nodes ? jsonData.nodes.length : 0}`);
      console.log(`  マテリアル数: ${jsonData.materials ? jsonData.materials.length : 0}`);
      console.log(`  テクスチャ数: ${jsonData.textures ? jsonData.textures.length : 0}`);
      
      // モーフターゲットの詳細分析
      if (jsonData.meshes) {
        let allMorphTargets = [];
        
        jsonData.meshes.forEach((mesh, meshIndex) => {
          if (mesh.primitives) {
            mesh.primitives.forEach((primitive, primitiveIndex) => {
              if (primitive.targets) {
                console.log(`\n  📊 メッシュ[${meshIndex}] プリミティブ[${primitiveIndex}]: ${primitive.targets.length}個のモーフターゲット`);
                
                // モーフターゲットの属性を分析
                primitive.targets.forEach((target, targetIndex) => {
                  const attributes = Object.keys(target);
                  allMorphTargets.push({
                    meshIndex,
                    primitiveIndex,
                    targetIndex,
                    attributes
                  });
                  
                  if (targetIndex < 10) { // 最初の10個だけ表示
                    console.log(`    [${targetIndex}] 属性: ${attributes.join(', ')}`);
                  }
                });
                
                if (primitive.targets.length > 10) {
                  console.log(`    ... 他 ${primitive.targets.length - 10}個のターゲット`);
                }
              }
            });
          }
        });
        
        console.log(`\n  🎯 総モーフターゲット数: ${allMorphTargets.length}`);
        
        // 属性の分析
        const attributeCount = {};
        allMorphTargets.forEach(target => {
          target.attributes.forEach(attr => {
            attributeCount[attr] = (attributeCount[attr] || 0) + 1;
          });
        });
        
        console.log(`  📈 属性別モーフターゲット数:`);
        Object.entries(attributeCount).forEach(([attr, count]) => {
          console.log(`    ${attr}: ${count}個`);
        });
      }
      
      // VRM拡張の分析
      if (jsonData.extensions && jsonData.extensions.VRM) {
        const vrmData = jsonData.extensions.VRM;
        console.log(`\n🤖 VRM拡張情報:`);
        console.log(`  VRMバージョン: ${vrmData.specVersion || 'unknown'}`);
        
        if (vrmData.blendShapeMaster && vrmData.blendShapeMaster.blendShapeGroups) {
          const blendShapeGroups = vrmData.blendShapeMaster.blendShapeGroups;
          console.log(`  ブレンドシェイプグループ数: ${blendShapeGroups.length}`);
          
          // プリセットタイプ別に分類
          const presetTypes = {
            face: ['neutral', 'a', 'i', 'u', 'e', 'o', 'blink', 'blink_l', 'blink_r', 'angry', 'fun', 'joy', 'sorrow', 'surprised'],
            body: ['fatness', 'muscular', 'thin', 'fat'],
            animation: ['walk', 'run', 'jump']
          };
          
          const categorized = {
            face: [],
            body: [],
            animation: [],
            custom: []
          };
          
          blendShapeGroups.forEach(group => {
            const presetName = group.presetName || 'none';
            let category = 'custom';
            
            for (const [cat, presets] of Object.entries(presetTypes)) {
              if (presets.includes(presetName.toLowerCase())) {
                category = cat;
                break;
              }
            }
            
            categorized[category].push({
              name: group.name || 'unnamed',
              preset: presetName,
              binds: group.binds ? group.binds.length : 0
            });
          });
          
          console.log(`\n  📊 ブレンドシェイプカテゴリ分析:`);
          Object.entries(categorized).forEach(([category, groups]) => {
            if (groups.length > 0) {
              console.log(`    ${category.toUpperCase()}: ${groups.length}個`);
              groups.forEach(group => {
                console.log(`      - ${group.name} (preset: ${group.preset}, binds: ${group.binds})`);
              });
            }
          });
        }
        
        // VRM人間型情報
        if (vrmData.humanoid && vrmData.humanoid.humanBones) {
          console.log(`\n  🦴 ヒューマノイドボーン数: ${vrmData.humanoid.humanBones.length}`);
          
          const boneTypes = {};
          vrmData.humanoid.humanBones.forEach(bone => {
            const boneType = bone.bone || 'unknown';
            boneTypes[boneType] = (boneTypes[boneType] || 0) + 1;
          });
          
          console.log(`    主要ボーン:`);
          ['hips', 'spine', 'chest', 'neck', 'head', 'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'].forEach(boneType => {
            if (boneTypes[boneType]) {
              console.log(`      - ${boneType}: ${boneTypes[boneType]}個`);
            }
          });
        }
        
        // メタ情報
        if (vrmData.meta) {
          console.log(`\n  📝 メタ情報:`);
          console.log(`    タイトル: ${vrmData.meta.title || 'N/A'}`);
          console.log(`    作者: ${vrmData.meta.author || 'N/A'}`);
          console.log(`    バージョン: ${vrmData.meta.version || 'N/A'}`);
          console.log(`    ライセンス: ${vrmData.meta.licenseName || 'N/A'}`);
        }
      }
      
      // アニメーション情報
      if (jsonData.animations && jsonData.animations.length > 0) {
        console.log(`\n🎬 アニメーション情報:`);
        console.log(`  アニメーション数: ${jsonData.animations.length}`);
        
        jsonData.animations.forEach((animation, index) => {
          console.log(`    [${index}] ${animation.name || 'Unnamed'}`);
          console.log(`      チャンネル数: ${animation.channels ? animation.channels.length : 0}`);
          console.log(`      サンプラー数: ${animation.samplers ? animation.samplers.length : 0}`);
          
          if (animation.channels && animation.channels.length > 0) {
            const targetPaths = {};
            animation.channels.forEach(channel => {
              const path = channel.target ? channel.target.path : 'unknown';
              targetPaths[path] = (targetPaths[path] || 0) + 1;
            });
            
            console.log(`      アニメーション対象:`);
            Object.entries(targetPaths).forEach(([path, count]) => {
              console.log(`        - ${path}: ${count}個`);
            });
          }
        });
      } else {
        console.log(`\n🎬 アニメーション情報: なし`);
      }
      
    } else {
      console.log(`❌ JSONデータの読み込みに失敗`);
    }
    
  } catch (error) {
    console.log(`❌ 分析エラー: ${error.message}`);
  }
});

console.log('\n🔍 現在のavatarConfig.ts との比較分析');
console.log('=====================================');

// 既存の設定ファイルを読み込んで比較
const configPath = path.join(__dirname, '..', 'src', 'utils', 'avatarConfig.ts');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf8');
  console.log('📄 現在のavatarConfig.ts の内容を分析中...');
  
  // ファイル名の抽出
  const fileMatches = configContent.match(/['"`]([fm]_\d+\.(?:glb|vrm))['"`]/g);
  if (fileMatches) {
    const currentFiles = fileMatches.map(match => match.replace(/['"`]/g, ''));
    console.log(`現在設定されているファイル: ${currentFiles.join(', ')}`);
    
    console.log('\n📊 更新が必要な項目:');
    console.log('  1. ファイルパス の更新');
    console.log('  2. ブレンドシェイプ設定の確認と更新');
    console.log('  3. サムネイル設定の追加');
    console.log('  4. 新しいモデルの体型パラメータ設定');
  }
} else {
  console.log('❌ avatarConfig.ts が見つかりません');
}

console.log('\n✅ 新しいVRMモデル分析完了');