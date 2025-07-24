#!/usr/bin/env node

/**
 * VRMファイルのブレンドシェイプ分析ツール
 * 
 * 使用方法:
 * node analyze-vrm-blendshapes.js
 * 
 * このスクリプトは、public/vrm-models内のすべてのVRMファイルを分析し、
 * お腹周りの体型調整に使用可能なブレンドシェイプを特定します。
 */

const fs = require('fs');
const path = require('path');

// VRMモデルディレクトリのパス
const VRM_DIR = path.join(__dirname, 'public', 'vrm-models');

// 体型関連のキーワード
const BODY_KEYWORDS = [
  'belly', 'fat', 'weight', 'muscle', 'body', 'chest',
  'waist', 'hip', 'breast', 'butt', 'thigh', 'arm',
  'bulk', 'slim', 'thick', 'shape', 'size'
];

// お腹周り特化のキーワード
const BELLY_KEYWORDS = [
  'belly', 'stomach', 'abdomen', 'waist', 'gut', 'tummy'
];

/**
 * VRMファイルの基本情報を取得
 */
function getVRMFileInfo() {
  if (!fs.existsSync(VRM_DIR)) {
    console.log('❌ VRMモデルディレクトリが見つかりません:', VRM_DIR);
    return [];
  }

  const files = fs.readdirSync(VRM_DIR).filter(file => file.endsWith('.vrm'));
  
  console.log('📁 VRMモデルディレクトリ:', VRM_DIR);
  console.log('📦 検出されたVRMファイル数:', files.length);
  console.log('');

  return files.map(file => ({
    filename: file,
    path: path.join(VRM_DIR, file),
    size: fs.statSync(path.join(VRM_DIR, file)).size
  }));
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * ブレンドシェイプ名をカテゴリ分類
 */
function categorizeBlendShapeName(name) {
  const lowerName = name.toLowerCase();
  
  // お腹周り特化
  if (BELLY_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'belly_specific';
  }
  
  // 体型関連
  if (BODY_KEYWORDS.some(keyword => lowerName.includes(keyword))) {
    return 'body_related';
  }
  
  // 感情表現
  if (['smile', 'angry', 'sad', 'happy', 'surprised', 'fear', 'disgust', 'neutral', 'joy', 'sorrow'].some(keyword => lowerName.includes(keyword))) {
    return 'emotion';
  }
  
  // 顔パーツ
  if (['eye', 'mouth', 'brow', 'cheek', 'nose', 'jaw', 'face', 'head', 'ear', 'lip', 'tongue', 'eyelid'].some(keyword => lowerName.includes(keyword))) {
    return 'face';
  }
  
  return 'unknown';
}

/**
 * VRMファイルからブレンドシェイプ候補を推測
 * (実際のVRMファイル読み込みはブラウザでのみ可能なため、ファイル名ベースで推測)
 */
function analyzeVRMFiles() {
  const vrmFiles = getVRMFileInfo();
  
  if (vrmFiles.length === 0) {
    console.log('❌ 分析するVRMファイルが見つかりませんでした。');
    return;
  }

  console.log('🔍 VRMファイル分析結果');
  console.log('='.repeat(50));
  
  vrmFiles.forEach((file, index) => {
    console.log(`\n📦 ファイル ${index + 1}: ${file.filename}`);
    console.log(`📊 サイズ: ${formatFileSize(file.size)}`);
    console.log(`📍 パス: ${file.path}`);
    
    // ファイル名から性別を推測
    const filename = file.filename.toLowerCase();
    let gender = 'unknown';
    if (filename.includes('f_') || filename.includes('female')) {
      gender = 'female';
    } else if (filename.includes('m_') || filename.includes('male')) {
      gender = 'male';
    }
    
    // ファイル名からBMI情報を推測
    const bmiMatch = filename.match(/(\d+)(?:\.vrm)?$/);
    const possibleBMI = bmiMatch ? parseInt(bmiMatch[1]) : null;
    
    console.log(`🚻 推測される性別: ${gender}`);
    if (possibleBMI) {
      console.log(`📈 ファイル名から推測されるBMI値: ${possibleBMI}`);
    }
    
    // 推奨される体型ブレンドシェイプ名（一般的なVRMファイルで使われるもの）
    const recommendedBlendShapes = [
      'belly', 'fat', 'weight', 'body_fat', 'stomach',
      'waist', 'hip', 'chest', 'muscle', 'bulk'
    ];
    
    console.log('💡 推奨される体型ブレンドシェイプ名:');
    recommendedBlendShapes.forEach(name => {
      console.log(`  - "${name}"`);
    });
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 分析サマリー');
  console.log('='.repeat(50));
  
  console.log(`📦 総VRMファイル数: ${vrmFiles.length}`);
  console.log(`📊 総ファイルサイズ: ${formatFileSize(vrmFiles.reduce((sum, file) => sum + file.size, 0))}`);
  
  const femaleFiles = vrmFiles.filter(f => f.filename.toLowerCase().includes('f_')).length;
  const maleFiles = vrmFiles.filter(f => f.filename.toLowerCase().includes('m_')).length;
  
  console.log(`🚺 女性モデル: ${femaleFiles}個`);
  console.log(`🚹 男性モデル: ${maleFiles}個`);
  console.log(`❓ 不明: ${vrmFiles.length - femaleFiles - maleFiles}個`);
  
  console.log('\n🎯 BMI体型シミュレーションのための推奨事項:');
  console.log('1. 各VRMファイルで実際に利用可能なブレンドシェイプを確認する');
  console.log('2. 以下の優先順位でブレンドシェイプを探す:');
  console.log('   - "belly" > "fat" > "weight" > "body" > "waist"');
  console.log('3. 複数のブレンドシェイプが利用可能な場合は組み合わせて使用する');
  console.log('4. ブレンドシェイプが見つからない場合はスケール変形で代用する');
  
  console.log('\n🔧 次のステップ:');
  console.log('1. ブラウザでSimpleVRMViewerを開く');
  console.log('2. デバッグ情報を有効にする');
  console.log('3. 各VRMファイルの実際のブレンドシェイプ情報を確認する');
  console.log('4. avatarConfig.tsファイルで各アバターの正しいブレンドシェイプ名を設定する');
}

/**
 * avatarConfig.tsファイルの現在の設定を確認
 */
function checkCurrentAvatarConfig() {
  const configPath = path.join(__dirname, 'src', 'utils', 'avatarConfig.ts');
  
  if (!fs.existsSync(configPath)) {
    console.log('❌ avatarConfig.tsファイルが見つかりません:', configPath);
    return;
  }
  
  console.log('\n📋 現在のavatarConfig.ts設定確認');
  console.log('='.repeat(50));
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // blendShapeNamesの設定を抽出
    const blendShapeMatches = configContent.match(/blendShapeNames:\s*{([^}]+)}/g);
    
    if (blendShapeMatches) {
      console.log('🔍 設定されているブレンドシェイプ:');
      blendShapeMatches.forEach((match, index) => {
        console.log(`\nアバター ${index + 1}:`);
        console.log(match);
      });
    } else {
      console.log('❌ blendShapeNames設定が見つかりませんでした');
    }
    
    // アバター名を抽出
    const nameMatches = configContent.match(/name:\s*['"`]([^'"`]+)['"`]/g);
    if (nameMatches) {
      console.log('\n📝 設定されているアバター名:');
      nameMatches.forEach((match, index) => {
        const name = match.match(/name:\s*['"`]([^'"`]+)['"`]/)[1];
        console.log(`${index + 1}. ${name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ avatarConfig.ts読み込みエラー:', error.message);
  }
}

/**
 * デバッグテスト用のHTMLファイルを生成
 */
function generateDebugHTML() {
  const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VRM ブレンドシェイプ デバッグツール</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .file-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .file-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
        .analysis-result { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; }
        pre { background: #000; color: #0f0; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; }
        button { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .error { color: red; }
        .success { color: green; }
        .warning { color: orange; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 VRM ブレンドシェイプ デバッグツール</h1>
        <p>このツールは、VRMファイルのブレンドシェイプを分析し、BMI体型シミュレーションに使用可能なブレンドシェイプを特定します。</p>
        
        <div class="file-list" id="fileList">
            <!-- VRMファイルのリストがここに表示されます -->
        </div>
        
        <div id="analysisResults" style="margin-top: 30px;">
            <h2>分析結果</h2>
            <div id="results"></div>
        </div>
    </div>

    <script type="module">
        import * as THREE from 'https://unpkg.com/three@latest/build/three.module.js';
        import { GLTFLoader } from 'https://unpkg.com/three@latest/examples/jsm/loaders/GLTFLoader.js';
        
        // VRMローダーは実際のプロジェクトの環境では@pixiv/three-vrmを使用
        console.log('Three.js読み込み完了');
        
        // VRMファイルのリスト（実際のファイル名に合わせて更新）
        const vrmFiles = [
            'f_0_17.vrm', 'f_0_18.vrm', 'f_0_19.vrm', 'f_0_20.vrm', 'f_0_22.vrm', 'f_0_25.vrm',
            'f_1_22.vrm', 'f_1_25.vrm', 'f_2_22.vrm',
            'm_0_22.vrm', 'm_1_22.vrm', 'm_2_22.vrm'
        ];
        
        function createFileCard(filename) {
            const card = document.createElement('div');
            card.className = 'file-card';
            card.innerHTML = \`
                <h3>\${filename}</h3>
                <p><strong>推測される情報:</strong></p>
                <ul>
                    <li>性別: \${filename.includes('f_') ? '女性' : filename.includes('m_') ? '男性' : '不明'}</li>
                    <li>BMI値: \${filename.match(/\\d+(?:\\.vrm)?$/) ? filename.match(/\\d+(?:\\.vrm)?$/)[0].replace('.vrm', '') : '不明'}</li>
                </ul>
                <button onclick="analyzeVRM('\${filename}')">ブレンドシェイプを分析</button>
                <div class="analysis-result" id="result-\${filename.replace('.', '_')}" style="display: none;">
                    <!-- 分析結果がここに表示されます -->
                </div>
            \`;
            return card;
        }
        
        // ファイルカードを生成
        const fileList = document.getElementById('fileList');
        vrmFiles.forEach(filename => {
            fileList.appendChild(createFileCard(filename));
        });
        
        window.analyzeVRM = async function(filename) {
            const resultDiv = document.getElementById(\`result-\${filename.replace('.', '_')}\`);
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<p>分析中...</p>';
            
            try {
                // この部分は実際のVRMローダー実装に置き換える必要があります
                resultDiv.innerHTML = \`
                    <h4>🔍 分析結果: \${filename}</h4>
                    <div class="warning">
                        <p><strong>注意:</strong> この静的HTMLでは実際のVRMファイル分析はできません。</p>
                        <p>実際の分析を行うには：</p>
                        <ol>
                            <li>Next.jsアプリケーションを起動</li>
                            <li>SimpleVRMViewerコンポーネントを使用</li>
                            <li>デバッグ情報を有効にする</li>
                            <li>ブラウザのコンソールで詳細ログを確認</li>
                        </ol>
                    </div>
                    <div class="analysis-result">
                        <h5>推奨されるブレンドシェイプ名:</h5>
                        <ul>
                            <li><code>belly</code> - お腹の膨らみ</li>
                            <li><code>fat</code> - 全体的な脂肪</li>
                            <li><code>weight</code> - 体重変化</li>
                            <li><code>body</code> - 体型全体</li>
                            <li><code>waist</code> - ウエスト</li>
                        </ul>
                        <h5>確認方法:</h5>
                        <pre>
// ブラウザのコンソールで実行
const vrmPath = '/vrm-models/\${filename}';
VRMDebugAnalyzer.analyzeVRMFile(vrmPath)
  .then(analysis => {
    console.log('分析結果:', analysis);
    VRMDebugAnalyzer.printAnalysisResults(analysis);
  });
                        </pre>
                    </div>
                \`;
            } catch (error) {
                resultDiv.innerHTML = \`<p class="error">エラー: \${error.message}</p>\`;
            }
        }
        
        // 全体的な推奨事項を表示
        document.getElementById('results').innerHTML = \`
            <div class="analysis-result">
                <h3>💡 全体的な推奨事項</h3>
                <h4>1. ブレンドシェイプの優先順位:</h4>
                <ol>
                    <li><strong>belly</strong> - 最も具体的で効果的</li>
                    <li><strong>fat</strong> - 脂肪分布の変化</li>
                    <li><strong>weight</strong> - 体重変化全般</li>
                    <li><strong>body</strong> - 体型全体の変化</li>
                    <li><strong>waist</strong> - ウエスト部分</li>
                </ol>
                
                <h4>2. 実装のステップ:</h4>
                <ol>
                    <li>SimpleVRMViewerで各VRMファイルを読み込み</li>
                    <li>デバッグ情報を有効にして実際のブレンドシェイプを確認</li>
                    <li>avatarConfig.tsの設定を更新</li>
                    <li>BMI値との対応関係をテスト</li>
                </ol>
                
                <h4>3. デバッグコマンド:</h4>
                <pre>
// Next.jsアプリのブラウザコンソールで実行
// 1. VRMファイルの詳細分析
await VRMDebugAnalyzer.analyzeVRMFile('/vrm-models/f_0_22.vrm');

// 2. BMI推奨ブレンドシェイプの取得
const analysis = await VRMDebugAnalyzer.analyzeVRMFile('/vrm-models/f_0_22.vrm');
const recommended = VRMDebugAnalyzer.recommendBMIBlendShapes(analysis);
console.log('推奨ブレンドシェイプ:', recommended);

// 3. 現在のVRMのブレンドシェイプ一覧
if (window.vrmRef && window.vrmRef.current) {
  window.vrmRef.current.scene.traverse(object => {
    if (object.morphTargetDictionary) {
      console.log('ブレンドシェイプ:', Object.keys(object.morphTargetDictionary));
    }
  });
}
                </pre>
            </div>
        \`;
    </script>
</body>
</html>
  `;
  
  const htmlPath = path.join(__dirname, 'vrm-blendshape-debug.html');
  fs.writeFileSync(htmlPath, htmlContent.trim());
  console.log('\n✅ デバッグHTML生成完了:', htmlPath);
  console.log('🌐 ブラウザで開いて使用してください');
}

// メイン実行
function main() {
  console.log('🚀 VRMブレンドシェイプ分析ツール');
  console.log('='.repeat(50));
  
  // VRMファイル分析
  analyzeVRMFiles();
  
  // 現在の設定確認
  checkCurrentAvatarConfig();
  
  // デバッグHTMLの生成
  generateDebugHTML();
  
  console.log('\n🎉 分析完了!');
  console.log('\n次のステップ:');
  console.log('1. Next.jsアプリケーションを起動: npm run dev');
  console.log('2. SimpleVRMViewerページを開く');
  console.log('3. 各VRMファイルのデバッグ情報を確認');
  console.log('4. ブラウザのコンソールで実際のブレンドシェイプ名を確認');
  console.log('5. avatarConfig.tsの設定を更新');
}

if (require.main === module) {
  main();
}