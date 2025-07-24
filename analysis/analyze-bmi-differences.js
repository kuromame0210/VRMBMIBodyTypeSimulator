const fs = require('fs');
const path = require('path');

console.log('🔍 BMI女性タイプA VRM詳細比較分析');
console.log('=====================================');

// 分析対象のファイルリスト（BMI順）
const targetFiles = [
  { file: 'f_0_17.vrm', bmi: 17, description: 'スリム' },
  { file: 'f_0_18.vrm', bmi: 18, description: '細め' },
  { file: 'f_0_19.vrm', bmi: 19, description: '標準-' },
  { file: 'f_0_20.vrm', bmi: 20, description: '標準' },
  { file: 'f_0_22.vrm', bmi: 22, description: '理想' },
  { file: 'f_0_25.vrm', bmi: 25, description: 'ふっくら' }
];

const vrmDir = path.join(__dirname, 'public', 'vrm-models');

// 各ファイルのGLTFデータを解析
const fileData = [];

console.log('📊 各VRMファイルの詳細データ抽出中...\n');

targetFiles.forEach(({ file, bmi, description }) => {
  const filePath = path.join(vrmDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ファイルが見つかりません: ${file}`);
    return;
  }
  
  try {
    const buffer = fs.readFileSync(filePath);
    
    // GLTFヘッダー解析
    const magic = buffer.toString('ascii', 0, 4);
    const version = buffer.readUInt32LE(4);
    const totalLength = buffer.readUInt32LE(8);
    
    console.log(`📄 ${file} (BMI${bmi} - ${description})`);
    console.log(`   サイズ: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`   Magic: ${magic}, Version: ${version}`);
    
    // JSONチャンクを探す
    let offset = 12;
    let gltfData = null;
    let binData = null;
    
    while (offset < buffer.length) {
      const chunkLength = buffer.readUInt32LE(offset);
      const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
      
      if (chunkType === 'JSON') {
        const jsonString = buffer.toString('utf8', offset + 8, offset + 8 + chunkLength);
        gltfData = JSON.parse(jsonString);
        console.log(`   📊 JSON チャンク: ${chunkLength}バイト`);
      } else if (chunkType === 'BIN\0') {
        binData = buffer.slice(offset + 8, offset + 8 + chunkLength);
        console.log(`   🗄️ BIN チャンク: ${chunkLength}バイト`);
      }
      
      offset += 8 + chunkLength;
      if (offset % 4 !== 0) {
        offset += 4 - (offset % 4);
      }
    }
    
    if (gltfData && binData) {
      // メッシュデータの詳細分析
      const meshInfo = analyzeMeshData(gltfData, binData);
      fileData.push({
        file,
        bmi,
        description,
        gltfData,
        binData,
        meshInfo
      });
      
      console.log(`   🎯 メッシュ解析完了: ${meshInfo.totalVertices}頂点`);
      console.log(`   🎭 モーフターゲット: ${meshInfo.morphTargets}個`);
    }
    
    console.log('');
  } catch (error) {
    console.log(`❌ ${file} の解析でエラー: ${error.message}\n`);
  }
});

// メッシュデータの解析関数
function analyzeMeshData(gltfData, binData) {
  let totalVertices = 0;
  let morphTargets = 0;
  const meshDetails = [];
  
  if (gltfData.meshes) {
    gltfData.meshes.forEach((mesh, meshIndex) => {
      if (mesh.primitives) {
        mesh.primitives.forEach((primitive, primitiveIndex) => {
          if (primitive.attributes && primitive.attributes.POSITION !== undefined) {
            const positionAccessorIndex = primitive.attributes.POSITION;
            const positionAccessor = gltfData.accessors[positionAccessorIndex];
            totalVertices += positionAccessor.count;
            
            // モーフターゲットの数を数える
            if (primitive.targets) {
              morphTargets += primitive.targets.length;
            }
            
            meshDetails.push({
              meshIndex,
              primitiveIndex,
              vertexCount: positionAccessor.count,
              morphTargetCount: primitive.targets ? primitive.targets.length : 0,
              positionAccessor
            });
          }
        });
      }
    });
  }
  
  return {
    totalVertices,
    morphTargets,
    meshDetails
  };
}

// BMI間の比較分析
console.log('🔬 BMI値間の差異分析');
console.log('===================');

if (fileData.length >= 2) {
  console.log(`📈 BMI${fileData[0].bmi}（基準） vs BMI${fileData[fileData.length-1].bmi}（比較）:`);
  
  // バイナリデータのハッシュ比較
  const crypto = require('crypto');
  const baseHash = crypto.createHash('md5').update(fileData[0].binData).digest('hex');
  const compareHash = crypto.createHash('md5').update(fileData[fileData.length-1].binData).digest('hex');
  
  console.log(`   🔐 BMI${fileData[0].bmi} バイナリハッシュ: ${baseHash.substring(0, 16)}...`);
  console.log(`   🔐 BMI${fileData[fileData.length-1].bmi} バイナリハッシュ: ${compareHash.substring(0, 16)}...`);
  console.log(`   🆚 バイナリデータは${baseHash === compareHash ? '同一' : '異なる'}です`);
  
  if (baseHash !== compareHash) {
    // バイナリデータが異なる場合、差分を分析
    const differences = [];
    const minLength = Math.min(fileData[0].binData.length, fileData[fileData.length-1].binData.length);
    
    for (let i = 0; i < minLength; i += 4) { // 4バイトずつ（float32）
      const base = fileData[0].binData.readFloatLE(i);
      const compare = fileData[fileData.length-1].binData.readFloatLE(i);
      
      if (Math.abs(base - compare) > 0.001) { // 0.001以上の差
        differences.push({
          offset: i,
          base: base,
          compare: compare,
          diff: compare - base
        });
      }
    }
    
    console.log(`   📊 有意な差分: ${differences.length}箇所 (閾値: 0.001)`);
    
    if (differences.length > 0) {
      console.log('   🎯 主要な差分（最初の20個）:');
      differences.slice(0, 20).forEach((diff, index) => {
        console.log(`     [${index + 1}] オフセット${diff.offset}: ${diff.base.toFixed(6)} → ${diff.compare.toFixed(6)} (差分: ${diff.diff.toFixed(6)})`);
      });
      
      // 差分の統計
      const diffValues = differences.map(d => Math.abs(d.diff));
      const avgDiff = diffValues.reduce((a, b) => a + b, 0) / diffValues.length;
      const maxDiff = Math.max(...diffValues);
      const minDiff = Math.min(...diffValues);
      
      console.log(`   📊 差分統計:`);
      console.log(`     平均差分: ${avgDiff.toFixed(6)}`);
      console.log(`     最大差分: ${maxDiff.toFixed(6)}`);
      console.log(`     最小差分: ${minDiff.toFixed(6)}`);
    }
  }
}

// アクセサー情報の比較
console.log('\n🗂️ アクセサー比較分析');
console.log('===================');

fileData.forEach((data, index) => {
  console.log(`📋 ${data.file} (BMI${data.bmi}) - アクセサー詳細:`);
  
  if (data.gltfData.accessors) {
    // 位置アクセサーのみを詳細分析
    const positionAccessors = data.gltfData.accessors.filter((accessor, i) => {
      return data.gltfData.meshes.some(mesh => 
        mesh.primitives.some(primitive => 
          primitive.attributes && primitive.attributes.POSITION === i
        )
      );
    });
    
    positionAccessors.forEach((accessor, accessorIndex) => {
      console.log(`   📍 位置アクセサー[${accessorIndex}]:`);
      console.log(`     頂点数: ${accessor.count}`);
      console.log(`     タイプ: ${accessor.type}`);
      console.log(`     コンポーネントタイプ: ${accessor.componentType}`);
      
      if (accessor.min && accessor.max) {
        console.log(`     バウンディングボックス:`);
        console.log(`       Min: [${accessor.min.map(v => v.toFixed(3)).join(', ')}]`);
        console.log(`       Max: [${accessor.max.map(v => v.toFixed(3)).join(', ')}]`);
        
        // サイズ計算
        const size = accessor.max.map((maxVal, i) => maxVal - accessor.min[i]);
        console.log(`       サイズ: [${size.map(v => v.toFixed(3)).join(', ')}]`);
      }
    });
  }
  console.log('');
});

console.log('✅ BMI差異分析完了');