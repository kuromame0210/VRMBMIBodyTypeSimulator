const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔬 BMI女性タイプA VRM頂点座標詳細分析');
console.log('======================================');

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

// 各VRMファイルの頂点データを抽出
function extractVertexData(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  // GLTFヘッダー解析
  let offset = 12;
  let gltfData = null;
  let binData = null;
  
  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
    
    if (chunkType === 'JSON') {
      const jsonString = buffer.toString('utf8', offset + 8, offset + 8 + chunkLength);
      gltfData = JSON.parse(jsonString);
    } else if (chunkType === 'BIN\0') {
      binData = buffer.slice(offset + 8, offset + 8 + chunkLength);
    }
    
    offset += 8 + chunkLength;
    if (offset % 4 !== 0) {
      offset += 4 - (offset % 4);
    }
  }
  
  return { gltfData, binData };
}

// 頂点位置データを読み取る
function getVertexPositions(gltfData, binData) {
  const positions = [];
  
  if (gltfData.meshes) {
    gltfData.meshes.forEach((mesh, meshIndex) => {
      if (mesh.primitives) {
        mesh.primitives.forEach((primitive, primitiveIndex) => {
          if (primitive.attributes && primitive.attributes.POSITION !== undefined) {
            const positionAccessorIndex = primitive.attributes.POSITION;
            const positionAccessor = gltfData.accessors[positionAccessorIndex];
            const bufferView = gltfData.bufferViews[positionAccessor.bufferView];
            
            const byteOffset = (bufferView.byteOffset || 0) + (positionAccessor.byteOffset || 0);
            const vertexCount = positionAccessor.count;
            
            const meshPositions = [];
            for (let i = 0; i < vertexCount; i++) {
              const vertexOffset = byteOffset + i * 12; // 3 floats * 4 bytes
              const x = binData.readFloatLE(vertexOffset);
              const y = binData.readFloatLE(vertexOffset + 4);
              const z = binData.readFloatLE(vertexOffset + 8);
              meshPositions.push({ x, y, z });
            }
            
            positions.push({
              meshIndex,
              primitiveIndex,
              vertexCount,
              positions: meshPositions,
              boundingBox: {
                min: positionAccessor.min || [0, 0, 0],
                max: positionAccessor.max || [0, 0, 0]
              }
            });
          }
        });
      }
    });
  }
  
  return positions;
}

// 全ファイルのデータを読み込み
console.log('📊 VRMファイルの頂点データ抽出中...\n');

const fileVertexData = [];

targetFiles.forEach(({ file, bmi, description }) => {
  const filePath = path.join(vrmDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ファイルが見つかりません: ${file}`);
    return;
  }
  
  try {
    console.log(`📄 ${file} (BMI${bmi} - ${description}) 処理中...`);
    
    const { gltfData, binData } = extractVertexData(filePath);
    const vertexPositions = getVertexPositions(gltfData, binData);
    
    // 統計情報
    const totalVertices = vertexPositions.reduce((sum, mesh) => sum + mesh.vertexCount, 0);
    
    fileVertexData.push({
      file,
      bmi,
      description,
      vertexPositions,
      totalVertices
    });
    
    console.log(`   ✅ 総頂点数: ${totalVertices}`);
    console.log(`   📦 メッシュ数: ${vertexPositions.length}`);
    
    // バウンディングボックス情報
    vertexPositions.forEach((mesh, index) => {
      const bbox = mesh.boundingBox;
      const size = bbox.max.map((max, i) => max - bbox.min[i]);
      console.log(`   📏 メッシュ[${index}] サイズ: [${size.map(v => v.toFixed(3)).join(', ')}]`);
    });
    
  } catch (error) {
    console.log(`❌ ${file} の解析でエラー: ${error.message}`);
  }
  
  console.log('');
});

// BMI値間の詳細比較
console.log('🔍 BMI値間の頂点座標比較分析');
console.log('=============================');

if (fileVertexData.length >= 2) {
  // BMI17を基準として、他のBMI値との差異を分析
  const baseData = fileVertexData[0]; // BMI17
  
  for (let i = 1; i < fileVertexData.length; i++) {
    const compareData = fileVertexData[i];
    
    console.log(`\n📈 BMI${baseData.bmi} vs BMI${compareData.bmi} 比較:`);
    
    // 同じメッシュ構造を持つか確認
    if (baseData.vertexPositions.length === compareData.vertexPositions.length) {
      
      for (let meshIndex = 0; meshIndex < baseData.vertexPositions.length; meshIndex++) {
        const baseMesh = baseData.vertexPositions[meshIndex];
        const compareMesh = compareData.vertexPositions[meshIndex];
        
        console.log(`\n   🎯 メッシュ[${meshIndex}] 比較:`);
        console.log(`     頂点数: ${baseMesh.vertexCount} vs ${compareMesh.vertexCount}`);
        
        if (baseMesh.vertexCount === compareMesh.vertexCount) {
          // 頂点ごとの差分を計算
          const vertexDifferences = [];
          let significantChanges = 0;
          
          for (let vertexIndex = 0; vertexIndex < baseMesh.vertexCount; vertexIndex++) {
            const basePos = baseMesh.positions[vertexIndex];
            const comparePos = compareMesh.positions[vertexIndex];
            
            const dx = comparePos.x - basePos.x;
            const dy = comparePos.y - basePos.y;
            const dz = comparePos.z - basePos.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (distance > 0.001) { // 1mm以上の変化
              significantChanges++;
              vertexDifferences.push({
                index: vertexIndex,
                base: basePos,
                compare: comparePos,
                delta: { dx, dy, dz },
                distance: distance
              });
            }
          }
          
          console.log(`     📊 有意な変化: ${significantChanges}頂点 (${(significantChanges/baseMesh.vertexCount*100).toFixed(1)}%)`);
          
          if (vertexDifferences.length > 0) {
            // 距離でソートして最大変化を表示
            vertexDifferences.sort((a, b) => b.distance - a.distance);
            
            console.log(`     🏆 最大変化トップ5:`);
            vertexDifferences.slice(0, 5).forEach((diff, index) => {
              console.log(`       [${index + 1}] 頂点${diff.index}: ${diff.distance.toFixed(6)}mm移動`);
              console.log(`         位置: [${diff.base.x.toFixed(6)}, ${diff.base.y.toFixed(6)}, ${diff.base.z.toFixed(6)}]`);
              console.log(`         →    [${diff.compare.x.toFixed(6)}, ${diff.compare.y.toFixed(6)}, ${diff.compare.z.toFixed(6)}]`);
              console.log(`         差分: [${diff.delta.dx.toFixed(6)}, ${diff.delta.dy.toFixed(6)}, ${diff.delta.dz.toFixed(6)}]`);
            });
            
            // 体型変化の傾向分析
            analyzeBodyShapeChanges(vertexDifferences, baseMesh);
          }
          
        } else {
          console.log(`     ❌ 頂点数が異なります`);
        }
      }
      
    } else {
      console.log(`   ❌ メッシュ構造が異なります`);
    }
  }
}

// 体型変化の傾向を分析する関数
function analyzeBodyShapeChanges(differences, baseMesh) {
  console.log(`\n     🎯 体型変化パターン分析:`);
  
  // Y軸（高さ）による分類
  const bbox = baseMesh.boundingBox;
  const yMin = bbox.min[1];
  const yMax = bbox.max[1];
  const yRange = yMax - yMin;
  
  const regions = {
    head: { min: yMax - yRange * 0.2, max: yMax, changes: [] },      // 上位20%
    chest: { min: yMax - yRange * 0.5, max: yMax - yRange * 0.2, changes: [] },  // 20-50%
    waist: { min: yMax - yRange * 0.7, max: yMax - yRange * 0.5, changes: [] },  // 50-70%
    hips: { min: yMax - yRange * 0.85, max: yMax - yRange * 0.7, changes: [] },  // 70-85%
    legs: { min: yMin, max: yMax - yRange * 0.85, changes: [] }     // 下位15%
  };
  
  // 差分を体の部位別に分類
  differences.forEach(diff => {
    const y = diff.base.y;
    
    Object.keys(regions).forEach(regionName => {
      const region = regions[regionName];
      if (y >= region.min && y <= region.max) {
        region.changes.push(diff);
      }
    });
  });
  
  // 各部位の変化を分析
  Object.keys(regions).forEach(regionName => {
    const region = regions[regionName];
    if (region.changes.length > 0) {
      const avgDistance = region.changes.reduce((sum, diff) => sum + diff.distance, 0) / region.changes.length;
      const maxDistance = Math.max(...region.changes.map(diff => diff.distance));
      
      // X軸（幅）の変化傾向
      const xChanges = region.changes.map(diff => diff.delta.dx);
      const avgXChange = xChanges.reduce((sum, x) => sum + Math.abs(x), 0) / xChanges.length;
      
      // Z軸（前後）の変化傾向
      const zChanges = region.changes.map(diff => diff.delta.dz);
      const avgZChange = zChanges.reduce((sum, z) => sum + Math.abs(z), 0) / zChanges.length;
      
      console.log(`       🏃 ${regionName.toUpperCase()} (${region.changes.length}頂点):`);
      console.log(`         平均変化: ${avgDistance.toFixed(4)}mm, 最大: ${maxDistance.toFixed(4)}mm`);
      console.log(`         幅変化: ${avgXChange.toFixed(4)}mm, 前後変化: ${avgZChange.toFixed(4)}mm`);
    }
  });
}

console.log('\n✅ BMI頂点座標分析完了');