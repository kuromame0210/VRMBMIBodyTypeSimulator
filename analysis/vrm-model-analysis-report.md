# VRMBMIBodyTypeSimulator 新モデル詳細分析レポート

## 1. 各モデルファイルの基本情報

| ファイル名 | サイズ | ジェンダー | メッシュ数 | ノード数 | マテリアル数 | テクスチャ数 |
|-----------|--------|-----------|-----------|-----------|-------------|-------------|
| f_0.glb   | 8.08MB | 女性      | 3         | 145       | 13          | 26          |
| f_1.glb   | 8.41MB | 女性      | 3         | 145       | 13          | 26          |
| f_2.glb   | 8.52MB | 女性      | 3         | 153       | 13          | 26          |
| m_0.glb   | 6.17MB | 男性      | 2         | 131       | 12          | 24          |
| m_1.glb   | 7.27MB | 男性      | 3         | 153       | 13          | 26          |
| m_2.glb   | 6.94MB | 男性      | 3         | 133       | 13          | 26          |

### ファイルサイズ特徴
- **女性モデル**: 8.08MB〜8.52MB（平均8.34MB）
- **男性モデル**: 6.17MB〜7.27MB（平均6.79MB）
- 女性モデルの方が約22%大きい

## 2. ブレンドシェイプ（シェイプキー）詳細分析

### 全モデル共通のブレンドシェイプ構成
- **総モーフターゲット数**: 525個（全モデル共通）
- **属性**: POSITION, NORMAL（各525個ずつ）
- **メッシュ[1]に75個のモーフターゲット**が7つのプリミティブに存在

### ブレンドシェイプ名一覧（全モデル共通）

#### 顔全体表情 (Fcl_ALL_*)
- Fcl_ALL_Neutral（ニュートラル）
- Fcl_ALL_Angry（怒り）
- Fcl_ALL_Fun（楽しい）
- Fcl_ALL_Joy（喜び）
- Fcl_ALL_Sorrow（悲しみ）
- Fcl_ALL_Surprised（驚き）

#### 眉毛表情 (Fcl_BRW_*)
- Fcl_BRW_Angry, Fcl_BRW_Fun, Fcl_BRW_Joy, Fcl_BRW_Sorrow, Fcl_BRW_Surprised

#### 目の表情・動作 (Fcl_EYE_*)
- Fcl_EYE_Natural（自然）
- Fcl_EYE_Angry（怒り）
- Fcl_EYE_Close（閉じる）
- Fcl_EYE_Close_R/L（右/左目を閉じる）
- Fcl_EYE_Fun（楽しい）
- Fcl_EYE_Joy（喜び）
- Fcl_EYE_Joy_R/L（右/左目の喜び）
- Fcl_EYE_Sorrow（悲しみ）
- Fcl_EYE_Surprised（驚き）
- Fcl_EYE_Spread（見開く）
- Fcl_EYE_Iris_Hide（虹彩を隠す）
- Fcl_EYE_Highlight_Hide（ハイライトを隠す）

#### 口の表情・動作 (Fcl_MTH_*)
- Fcl_MTH_Close（閉じる）
- Fcl_MTH_Up/Down（上/下）
- Fcl_MTH_Angry（怒り）
- Fcl_MTH_Small/Large（小さく/大きく）
- Fcl_MTH_Neutral（ニュートラル）
- Fcl_MTH_Fun（楽しい）
- Fcl_MTH_Joy（喜び）
- Fcl_MTH_Sorrow（悲しみ）
- Fcl_MTH_Surprised（驚き）
- Fcl_MTH_SkinFung（口角）
- Fcl_MTH_SkinFung_R/L（右/左口角）
- Fcl_MTH_A, I, U, E, O（母音）

#### 髪の毛 (Fcl_HA_*)
- Fcl_HA_Hide（隠す）
- Fcl_HA_Fung1〜3（複数の髪型バリエーション）
- Fcl_HA_Fung1〜3_Low/Up（上下バリエーション）
- Fcl_HA_Short（ショート）
- Fcl_HA_Short_Up/Low（ショートの上下バリエーション）

#### 顔の形状調整
- Eye_L/S（目の大きさ）
- Eye_Down/Up（目の位置）
- Eye_Close（目を閉じる）
- Eye_Far（目の間隔）
- Nose_Thick/Thin（鼻の太さ）
- Nose_High/Low（鼻の高さ）
- Mouth_Wide/Narrow（口の幅）
- Lips_Thick/Thin（唇の厚さ）
- Face_Round/Long（顔の形）
- Chin_Sharp/Round（顎の形）

## 3. 体型変化関連ブレンドシェイプの有無

### 重要な発見
❌ **体型変化関連のブレンドシェイプは見つかりませんでした**

分析結果：
- `fatness`, `weight`, `belly`, `muscle`, `thin`, `fat`, `BMI` 等のキーワードを含むブレンドシェイプは存在しない
- 顔の形状変化は豊富だが、体型（胴体、手足等）のブレンドシェイプは含まれていない
- 現在のBMIシミュレータの`fatness`ブレンドシェイプとは互換性がない

## 4. 歩行アニメーション関連データ

### アニメーション情報
全モデルに**歩行アニメーション**が含まれています：

| モデル | アニメーション名 | チャンネル数 | サンプラー数 | 対象 |
|-------|-----------------|--------------|--------------|------|
| f_0.glb | Walk_Lfoot | 426 | 426 | translation(142), rotation(142), scale(142) |
| f_1.glb | Walk_Lfoot | 426 | 426 | translation(142), rotation(142), scale(142) |
| f_2.glb | Walk_Lfoot | 450 | 450 | translation(150), rotation(150), scale(150) |
| m_0.glb | Walk_Lfoot | 387 | 387 | translation(129), rotation(129), scale(129) |
| m_1.glb | Walk_Lfoot.001 | 450 | 450 | translation(150), rotation(150), scale(150) |
| m_2.glb | Walk_Lfoot.001 | 390 | 390 | translation(130), rotation(130), scale(130) |

## 5. 男女3体ずつの特徴の違い

### 女性モデル比較
- **f_0.glb**: 基本モデル（145ノード）
- **f_1.glb**: f_0よりわずかに大きい（145ノード、+0.33MB）
- **f_2.glb**: 最大サイズ（153ノード、+0.44MB）

### 男性モデル比較
- **m_0.glb**: 最小サイズ（131ノード、メッシュ2個）
- **m_1.glb**: 最大サイズ（153ノード、+1.1MB）
- **m_2.glb**: 中間サイズ（133ノード）

### 構造の違い
- **m_0.glb**のみ2つのメッシュ、他は3つのメッシュ
- ノード数とファイルサイズに相関関係あり
- アニメーションのチャンネル数も異なる

## 6. VRM仕様の状況

### 重要な発見
❌ **VRM拡張情報が含まれていません**

- GLBファイルにVRM拡張データが含まれていない
- 標準のGLTF 2.0ファイルとして保存されている
- VRMビューワーでの表示には追加の設定が必要

## 7. 現在のavatarConfig.tsとの比較

### 現在の設定
```typescript
// 旧モデル（archivesに移動済み）
vrmPath: '/vrm-models/female_01_ver2.glb'
vrmPath: '/vrm-models/female_02.glb'
vrmPath: '/vrm-models/male_01.glb'
vrmPath: '/vrm-models/male_02.glb'
vrmPath: '/vrm-models/male_03.glb'

// 全モデルでfatnessブレンドシェイプが設定されている
blendShapeNames: { fatness: 'fatness' }
```

### 新モデルの問題点
1. **ファイルパスの変更**: 新しいファイル名に対応が必要
2. **fatnessブレンドシェイプが存在しない**: BMI機能が動作しない
3. **サムネイルが存在しない**: UI表示で問題が発生
4. **VRM拡張なし**: VRMローダーでの読み込みに問題の可能性

## 8. 推奨対応策

### ❌ 現在のBMIシミュレータとは互換性なし

**理由:**
1. 体型変化用のブレンドシェイプが存在しない
2. VRM拡張データが含まれていない
3. fatnessパラメータでの体型変更ができない

### 代替案:
1. **顔特徴分析システムとの統合**: 豊富な顔ブレンドシェイプを活用
2. **新しい体型シミュレーション機能の開発**: 異なるアプローチでの実装
3. **アニメーションプレビュー機能**: 歩行アニメーションの活用

### サムネイル作成が必要
新モデル用のサムネイル画像を生成する必要があります：
- f_0.png, f_1.png, f_2.png
- m_0.png, m_1.png, m_2.png

## 結論

新しい6体のVRMモデルは豊富な顔表情ブレンドシェイプと歩行アニメーションを持つ高品質なモデルですが、**現在のBMI体型シミュレータの機能には対応していません**。顔特徴分析システムでの活用や、新しい機能開発での利用を検討することを推奨します。