# 健康相談エージェント・デジタルツイン 環境構築手順書

## 概要

Next.jsベースの健康相談エージェント・デジタルツインの環境構築手順です。

## 前提条件

- Windows 10/11
- コマンドライン操作の基本的な理解

## システム要件

- Node.js v18以上
- npm v8以上

---

## 1. 必要なソフトウェアのインストール

### 1.1 Node.js のインストール

1. [Node.js公式サイト](https://nodejs.org/) からLTS版をダウンロード
2. インストーラーを実行し、デフォルト設定でインストール
3. インストール確認:
    
    ```bash
    node --version
    npm --version
    ```
    

---

## 2. プロジェクトのセットアップ

### 2.1 ソースコードの展開

提供されたZIPファイルを任意のフォルダに展開し、プロジェクトディレクトリに移動:

```bash
cd VRMBMIBodyTypeSimulator
```

### 2.2 依存関係のインストール

```bash
npm install
```

### 2.3 VRMモデルファイルの確認

以下のファイルが存在することを確認:

```bash
dir public\\vrm-models
```

- f_0.glb, f_1.glb, f_2.glb (女性アバター)
- m_0.glb, m_1.glb, m_2.glb (男性アバター)
- thumbnails/ (サムネイル画像フォルダ)

---

## 3. 開発サーバーの起動

### 3.1 サーバー起動

```bash
npm run dev
```

成功時の表示例:

```
> bmi-vrm-simulator@0.1.0 dev
> next dev --turbopack

   ▲ Next.js 15.3.5
   - Local:        <http://localhost:3000>

 ✓ Ready in 2.1s

```

### 3.2 動作確認

ブラウザで [http://localhost:3000](http://localhost:3000/) にアクセスし、以下を確認:

- メイン画面の表示
- BMI計算機能の動作
- 3Dアバターの表示
- 体型シミュレーション機能
- アバター切り替え機能
- 顔分析機能

### 3.3 サーバー停止

```bash
Ctrl + C
```

---

## 4. プロジェクト構造

```
VRMBMIBodyTypeSimulator/
├── src/app/               # ページ定義
├── src/components/        # UIコンポーネント
├── public/vrm-models/     # VRMファイル
└── package.json           # 設定・依存関係

```

---

## 5. 肥満確率計算ロジックの場所

確率計算の実装箇所は以下のファイルにまとまっています。必要な式やパラメータを確認する際に参照してください。

- `src/utils/obesity-prediction.ts`  
  - 小児肥満予測のコア計算。BMI/BMIzの算出、7つのリスク因子、ロジスティック回帰による6歳・11歳・14歳の肥満確率を返します。
- `src/app/child-obesity-prediction/page.tsx`  
  - フォーム入力から `predictChildObesity` を呼び出し、取得した確率をUIとアバターに反映するページ。
- `src/components/ChildObesityForm.tsx`  
  - 入力フォーム。児と母親の身長/体重からBMIを自動計算し、予測関数へ渡すデータを整形します。
- `test-prediction.ts`  
  - TypeScript版の動作確認用スクリプト。ロジック単体で確率を計算できるため、式の検証に利用できます。

> 補足: 元となるPHP実装は `docs/予測式のプログラム_20251010 2/` に保管されています。TypeScript版と見比べることで係数テーブルやロジスティック回帰式の確認が可能です。

## 6. トラブルシューティング

### よくあるエラー

**npm: command not found**

- Node.jsを再インストールしてPATHを確認

**Module not found**

- `npm install`を再実行

**Port 3000 is already in use**

- `npm run dev -- -p 3001`で別ポートを使用

**3Dモデルが表示されない**

- public/vrm-models/内のファイル存在を確認
- Chrome/Edgeブラウザを使用
- ブラウザのコンソール(F12)でエラーを確認

**顔分析が動作しない**

- インターネット接続を確認
- ページを再読み込み
