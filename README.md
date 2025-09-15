# 健康相談エージェント・デジタルツイン

BMI値に基づく体型変化を3Dアバターでリアルタイム表示するウェブアプリケーションです。

## 主要機能

- **BMI計算・表示**: 身長・体重からBMI値を算出
- **体型予測シミュレーション**: カロリー摂取量に応じた将来の体型変化
- **3Dアバター表示**: VRMモデルによるリアルタイム体型変化
- **顔分析機能**: 写真からの顔特徴抽出・アバター調整
- **アバター選択**: 複数のキャラクターから選択可能

## 技術スタック

- **フレームワーク**: Next.js 15.3.5
- **3D表示**: Three.js + @pixiv/three-vrm
- **顔認識**: MediaPipe
- **言語**: TypeScript
- **スタイル**: Tailwind CSS

## 環境構築

詳細な環境構築手順は [docs/SETUP.md](docs/SETUP.md) をご参照ください。

### クイックスタート

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:3000 にアクセスして動作確認してください。

## プロジェクト構成

```
src/
├── app/           # Next.js App Router
├── components/    # UIコンポーネント  
├── utils/         # ユーティリティ関数
└── types/         # TypeScript型定義

public/
└── vrm-models/    # 3Dモデルファイル

docs/              # ドキュメント
├── SETUP.md       # 環境構築手順書
└── 体型ブレンドシェイプ作成手順.md
```

## システム要件

- Node.js 18以上
- Windows 10/11（推奨）
- Chrome/Edge（WebGL対応ブラウザ）