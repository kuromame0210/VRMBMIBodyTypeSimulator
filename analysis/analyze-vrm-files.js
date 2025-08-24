const fs = require('fs');
const path = require('path');

console.log('🔍 VRMファイル分析ツール');
console.log('=======================');

// VRMファイルの一覧を取得
const vrmDir = path.join(__dirname, '..', 'public', 'vrm-models');
const vrmFiles = fs.readdirSync(vrmDir).filter(file => file.endsWith('.vrm') || file.endsWith('.glb'));

console.log(`📁 発見されたVRMファイル: ${vrmFiles.length}個`);
vrmFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});

// ファイルサイズの分析
console.log('\n📊 ファイルサイズ分析:');
const fileSizes = vrmFiles.map(file => {
  const filePath = path.join(vrmDir, file);
  const stats = fs.statSync(filePath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  return { file, size: stats.size, sizeInMB };
});

fileSizes.sort((a, b) => b.size - a.size);
fileSizes.forEach(({file, sizeInMB}) => {
  console.log(`  📦 ${file}: ${sizeInMB}MB`);
});

// ファイル命名パターンの分析
console.log('\n🏷️ ファイル命名パターン分析:');
const patterns = {
  female: vrmFiles.filter(f => f.startsWith('f_')),
  male: vrmFiles.filter(f => f.startsWith('m_')),
};

console.log(`  👩 女性モデル: ${patterns.female.length}個`);
patterns.female.forEach(file => console.log(`    - ${file}`));

console.log(`  👨 男性モデル: ${patterns.male.length}個`);
patterns.male.forEach(file => console.log(`    - ${file}`));

// バイナリ構造の簡易分析（GLTFヘッダーチェック）
console.log('\n🔧 ファイル構造分析:');
vrmFiles.slice(0, 3).forEach(file => {
  const filePath = path.join(vrmDir, file);
  const buffer = fs.readFileSync(filePath);
  
  // GLTFマジックナンバーチェック
  const magic = buffer.toString('ascii', 0, 4);
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  
  console.log(`  📄 ${file}:`);
  console.log(`    Magic: ${magic}`);
  console.log(`    Version: ${version}`);
  console.log(`    Length: ${length} bytes`);
  
  // JSONチャンクを探してブレンドシェイプ情報を取得
  try {
    let offset = 12; // GLTFヘッダー後
    while (offset < buffer.length) {
      const chunkLength = buffer.readUInt32LE(offset);
      const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
      
      if (chunkType === 'JSON') {
        const jsonData = buffer.toString('utf8', offset + 8, offset + 8 + chunkLength);
        const gltfData = JSON.parse(jsonData);
        
        console.log(`    🗂️ アクセサー数: ${gltfData.accessors ? gltfData.accessors.length : 0}`);
        console.log(`    🎭 メッシュ数: ${gltfData.meshes ? gltfData.meshes.length : 0}`);
        
        // モーフターゲットの分析
        if (gltfData.meshes) {
          let totalMorphTargets = 0;
          const morphTargetNames = new Set();
          
          gltfData.meshes.forEach((mesh, meshIndex) => {
            if (mesh.primitives) {
              mesh.primitives.forEach(primitive => {
                if (primitive.targets) {
                  totalMorphTargets += primitive.targets.length;
                  console.log(`      📊 メッシュ[${meshIndex}]: ${primitive.targets.length}個のモーフターゲット`);
                }
              });
            }
          });
          
          console.log(`    🎯 総モーフターゲット数: ${totalMorphTargets}`);
          
          // VRM拡張の分析
          if (gltfData.extensions && gltfData.extensions.VRM) {
            const vrmData = gltfData.extensions.VRM;
            console.log(`    🤖 VRMバージョン: ${vrmData.specVersion || 'unknown'}`);
            
            if (vrmData.blendShapeMaster && vrmData.blendShapeMaster.blendShapeGroups) {
              const blendShapeGroups = vrmData.blendShapeMaster.blendShapeGroups;
              console.log(`    🎭 ブレンドシェイプグループ数: ${blendShapeGroups.length}`);
              
              blendShapeGroups.forEach((group, index) => {
                console.log(`      [${index}] ${group.name || 'unnamed'} (preset: ${group.presetName || 'none'})`);
                if (group.binds) {
                  group.binds.forEach(bind => {
                    console.log(`        - メッシュ:${bind.mesh}, インデックス:${bind.index}, ウェイト:${bind.weight}`);
                  });
                }
              });
            }
          }
        }
        
        break;
      }
      
      offset += 8 + chunkLength;
      if (offset % 4 !== 0) {
        offset += 4 - (offset % 4); // 4バイトアライメント
      }
    }
  } catch (error) {
    console.log(`    ❌ 分析エラー: ${error.message}`);
  }
  
  console.log('');
});

console.log('分析完了 ✅');