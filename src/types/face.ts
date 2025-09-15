// 顔の特徴を表すインターフェース
export interface FaceFeatures {
  eyeWidth: number;
  eyeHeight: number;
  eyeDistance: number;
  noseWidth: number;
  noseHeight: number;
  mouthWidth: number;
  lipThickness: number;
  faceWidth: number;
  chinShape: number;
  
  // コンバーターで使用される追加のプロパティ
  leftEyeWidth: number;
  leftEyeHeight: number;
  rightEyeWidth: number;
  rightEyeHeight: number;
  eyeAngle: number;
  jawWidth: number;
  
  // MediaPipeテストプロジェクト準拠の追加プロパティ
  eyeAspectRatio: number;
  eyeSlantAngle: number;
  browHeight: number;
  browAngle: number;
  noseProjection: number;
  mouthHeight: number;
  faceAspectRatio: number;
  jawSharpness: number;
  cheekFullness: number;
  interocularDistance: number;
  processingTime: number;
}