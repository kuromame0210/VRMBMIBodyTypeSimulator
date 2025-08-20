'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import VRMPreview from '@/components/VRMPreview';
import BlendShapeControls from '@/components/BlendShapeControls';
import { useBlendShapeStore } from '@/hooks/useBlendShapeStore';
import { BlendShapeConfig } from '@/types/blendshape';
import { FaceFeatures } from '@/types/face';
import { saveFaceFeatures, createFaceFeatureData, getFaceFeatures, hasFaceFeatures } from '@/utils/localStorage';
import { BlendShapeConverter } from '@/utils/blendshape-converter';
import { DEFAULT_BLENDSHAPE_CONFIG } from '@/config/blendshape-config';
import PageWrapper from '@/components/PageWrapper';
import LoadingSpinner from '@/components/LoadingSpinner';

function FaceAnalysisContent() {
  // Core State
  const [faceLandmarkerImage, setFaceLandmarkerImage] = useState<FaceLandmarker | null>(null);
  const [status, setStatus] = useState('🚀 AIモデルを初期化中...');
  const [initProgress, setInitProgress] = useState(0);
  
  // BlendShape設定とストア
  const blendShapeStore = useBlendShapeStore(DEFAULT_BLENDSHAPE_CONFIG);
  const [availableBlendShapes, setAvailableBlendShapes] = useState<string[]>([]);
  
  // Photo State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [photoFeatures, setPhotoFeatures] = useState<FaceFeatures | null>(null);
  const [isNewImageUploaded, setIsNewImageUploaded] = useState(false); // 新しい画像がアップロードされたかを追跡
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState('');
  const [isWarmedUp, setIsWarmedUp] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);

  // ローカルストレージから保存済みデータを読み込み
  useEffect(() => {
    const loadSavedData = () => {
      try {
        if (hasFaceFeatures()) {
          const savedData = getFaceFeatures();
          if (savedData) {
            console.log('💾 保存済み顔特徴データを発見:', savedData);
            setPhotoFeatures(savedData.features);
            if (savedData.photoDataUrl) {
              setUploadedImage(savedData.photoDataUrl);
            }
            if (blendShapeStore.setCurrentValues) {
              blendShapeStore.setCurrentValues(savedData.blendShapeValues);
            }
            setStatus(`✅ 保存済みデータを復元しました (${new Date(savedData.timestamp).toLocaleString()})`);
          }
        }
      } catch (error) {
        console.warn('保存データの復元に失敗:', error);
      }
    };
    
    loadSavedData();
  }, []); // blendShapeStoreの依存関係を削除（無限ループを防ぐ）

  // MediaPipe初期化
  useEffect(() => {
    const initializeMediaPipe = async () => {
      try {
        setStatus('📦 MediaPipe Vision Tasks を読み込み中...');
        setInitProgress(20);
        
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        setStatus('🧠 Face Landmarker AIモデルをダウンロード中...');
        setInitProgress(60);
        
        // IMAGE用のFaceLandmarker作成
        const landmarkerImage = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "IMAGE",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        setFaceLandmarkerImage(landmarkerImage);
        setInitProgress(90);
        setStatus('🔧 MediaPipe最適化中...');
        
        // MediaPipeログ抑制
        const originalConsoleLog = console.log;
        const originalConsoleInfo = console.info;
        const originalConsoleWarn = console.warn;
        
        const filterMediaPipeLog = (args: unknown[]) => {
          if (args[0] && typeof args[0] === 'string') {
            const msg = args[0];
            return msg.includes('Created TensorFlow Lite XNNPACK delegate') ||
                   msg.includes('INFO:') ||
                   msg.includes('Graph successfully started');
          }
          return false;
        };
        
        console.log = (...args) => {
          if (filterMediaPipeLog(args)) return;
          originalConsoleLog.apply(console, args);
        };
        console.info = (...args) => {
          if (filterMediaPipeLog(args)) return;
          originalConsoleInfo.apply(console, args);
        };
        console.warn = (...args) => {
          if (filterMediaPipeLog(args)) return;
          originalConsoleWarn.apply(console, args);
        };
        
        setIsWarmedUp(true);
        setInitProgress(100);
        setStatus('✅ 準備完了！写真をアップロードして顔解析を開始できます');
        
      } catch (error) {
        console.error('MediaPipe初期化エラー:', error);
        setStatus('❌ 初期化に失敗しました。ページを再読み込みしてください。');
      }
    };

    initializeMediaPipe();
  }, []);

  // 写真アップロード処理
  const handlePhotoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !faceLandmarkerImage) return;

    console.log('🔍 画像アップロード開始:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    // ファイル形式チェック
    if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      alert('申し訳ございませんが、HEIC/HEIF形式はサポートされていません。JPG、PNG形式をご利用ください。');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('画像ファイル（JPG, PNG等）を選択してください');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズが大きすぎます（10MB以下にしてください）');
      return;
    }

    // 新しい写真アップロード時は既存データをクリア
    setPhotoFeatures(null);
    setIsNewImageUploaded(true); // 新しい画像がアップロードされたことを記録
    setStatus('📷 写真をアップロード中...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageSrc = e.target?.result as string;
      setUploadedImage(imageSrc);
      setStatus('✅ 写真をアップロードしました。解析を開始するには下のボタンを押してください。');
    };
    reader.onerror = (error) => {
      console.error('❌ ファイル読み込み失敗:', error);
      setStatus('❌ ファイルの読み込みに失敗しました');
    };
    reader.readAsDataURL(file);
  }, [faceLandmarkerImage]);

  // 解析開始処理
  const startAnalysis = useCallback(async () => {
    if (!uploadedImage || !faceLandmarkerImage || !photoCanvasRef.current) {
      return;
    }
    
    console.log('🚀 AI解析開始');
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStep('画像準備中...');
    setStatus('🔍 AI解析実行中...');
    
    const img = new Image();
    img.onload = async () => {
      await analyzePhoto(img);
    };
    img.onerror = (error) => {
      console.error('❌ 解析用画像読み込み失敗:', error);
      setStatus('❌ 画像の読み込みに失敗しました');
      setIsAnalyzing(false);
    };
    img.src = uploadedImage;
  }, [uploadedImage, faceLandmarkerImage]);

  // 写真解析処理
  const analyzePhoto = useCallback(async (imageElement: HTMLImageElement) => {
    if (!faceLandmarkerImage || !photoCanvasRef.current) {
      setStatus('❌ 解析環境が整っていません');
      setIsAnalyzing(false);
      return;
    }

    const canvas = photoCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      setAnalysisProgress(30);
      setAnalysisStep('画像サイズ調整中...');

      const maxWidth = 1024;
      const maxHeight = 1024;
      let { width, height } = imageElement;
      
      if (width > maxWidth || height > maxHeight) {
        const scale = Math.min(maxWidth / width, maxHeight / height);
        width *= scale;
        height *= scale;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(imageElement, 0, 0, width, height);

      setAnalysisProgress(50);
      setAnalysisStep('MediaPipe AI解析実行中...');
      
      const startTime = performance.now();
      
      // MediaPipe検出実行
      let results;
      let processingTime = 0;
      
      try {
        await new Promise(resolve => setTimeout(resolve, 10));
        results = faceLandmarkerImage.detect(imageElement);
        processingTime = performance.now() - startTime;
      } catch (detectError) {
        console.error('❌ MediaPipe検出エラー:', detectError);
        setStatus('❌ 顔検出に失敗しました');
        setIsAnalyzing(false);
        return;
      }

      setAnalysisProgress(80);
      setAnalysisStep('特徴量計算中...');

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        
        // ランドマーク描画
        drawLandmarks(ctx, landmarks, width, height);
        
        // 特徴量計算
        console.log('📏 特徴量計算開始...');
        const calculatedFeatures = calculateDetailedFeatures(landmarks, processingTime);
        console.log('✅ 特徴量計算完了:', calculatedFeatures);
        setPhotoFeatures(calculatedFeatures);
        setIsNewImageUploaded(false); // 解析完了後はフラグをリセット
        console.log('🖼️ photoFeaturesセット完了、VRMプレビュー表示中...');
        
        // BlendShape値計算と保存
        const converter = new BlendShapeConverter(DEFAULT_BLENDSHAPE_CONFIG);
        const blendShapeValues = converter.convertFaceFeaturesToBlendShapes(calculatedFeatures);
        
        // ローカルストレージに保存
        const faceData = createFaceFeatureData(calculatedFeatures, blendShapeValues, uploadedImage);
        saveFaceFeatures(faceData);
        
        // BlendShapeストアを更新
        blendShapeStore.updateFromFaceFeatures(calculatedFeatures);
        
        setAnalysisProgress(100);
        setAnalysisStep('解析完了');
        setStatus(`✅ 顔検出成功！${landmarks.length}個のランドマーク点を検出`);
      } else {
        setAnalysisProgress(100);
        setAnalysisStep('顔検出失敗');
        setStatus('❌ 顔が検出されませんでした。明るく正面を向いた写真をお試しください。');
      }
      
    } catch (error) {
      console.error('❌ 写真解析エラー:', error);
      setStatus('❌ 写真の解析に失敗しました');
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => {
        setAnalysisProgress(0);
        setAnalysisStep('');
      }, 2000);
    }
  }, [faceLandmarkerImage, blendShapeStore, uploadedImage]);


  // 詳細特徴量計算（WSL準拠・完全移植版）
  const calculateDetailedFeatures = (landmarks: Array<{x: number, y: number, z?: number}>, processingTime: number): FaceFeatures => {
    console.log('🔍 特徴量計算実行中...', `ランドマーク数: ${landmarks.length}`);
    
    // デバッグ用：主要ランドマーク座標を確認
    console.log('📍 主要ランドマーク座標確認:');
    console.log('  顔上端(10):', landmarks[10]);
    console.log('  顔下端(152):', landmarks[152]);  
    console.log('  顔左端(234):', landmarks[234]);
    console.log('  顔右端(454):', landmarks[454]);
    console.log('  左目外側(33):', landmarks[33]);
    console.log('  左目内側(133):', landmarks[133]);
    console.log('  右目内側(362):', landmarks[362]);
    
    try {
      // 仕様書準拠: 顔のベース寸法を最初に計算
      const faceTop = landmarks[10];       // 顔上端
      const faceBottom = landmarks[152];   // 顔下端（顎先）
      const faceLeft = landmarks[234];     // 顔左端
      const faceRight = landmarks[454];    // 顔右端
      
      const faceWidth = Math.abs(faceRight.x - faceLeft.x);
      const faceHeight = Math.abs(faceBottom.y - faceTop.y);
      const faceAspectRatio = faceHeight / faceWidth; // 仕様書のfaceRatio相当
      
      console.log('📐 基本寸法計算結果:');
      console.log(`  顔幅: ${faceWidth.toFixed(4)} (${faceRight.x.toFixed(4)} - ${faceLeft.x.toFixed(4)})`);
      console.log(`  顔高: ${faceHeight.toFixed(4)} (${faceBottom.y.toFixed(4)} - ${faceTop.y.toFixed(4)})`);
      console.log(`  顔比率: ${faceAspectRatio.toFixed(4)}`);

      // 目の特徴（左目基準）
      const leftEyeOuter = landmarks[33];
      const leftEyeInner = landmarks[133];
      const leftEyeTop = landmarks[159];
      const leftEyeBottom = landmarks[145];

      // 仕様書準拠: 目の特徴を正規化して計算
      const eyeWidth = Math.hypot(
        leftEyeOuter.x - leftEyeInner.x,
        leftEyeOuter.y - leftEyeInner.y
      ) / faceWidth; // 正規化

      const eyeHeight = Math.hypot(
        leftEyeTop.x - leftEyeBottom.x,
        leftEyeTop.y - leftEyeBottom.y
      ) / faceHeight; // 正規化

      const eyeAspectRatio = eyeHeight / eyeWidth;
      
      console.log('👁️ 目の特徴計算結果:');
      console.log(`  生の目幅: ${Math.hypot(leftEyeOuter.x - leftEyeInner.x, leftEyeOuter.y - leftEyeInner.y).toFixed(4)}`);
      console.log(`  正規化後目幅: ${eyeWidth.toFixed(4)}`);
      console.log(`  生の目高: ${Math.hypot(leftEyeTop.x - leftEyeBottom.x, leftEyeTop.y - leftEyeBottom.y).toFixed(4)}`);
      console.log(`  正規化後目高: ${eyeHeight.toFixed(4)}`);
      console.log(`  目のアスペクト比: ${eyeAspectRatio.toFixed(4)}`);

      // 仕様書準拠: 目の傾斜角度計算（eyeTilt）
      // 推定レンジ: -15°～+15°
      const rightEyeInner = landmarks[362];
      const eyeSlantAngle = Math.atan2(
        rightEyeInner.y - leftEyeInner.y,
        rightEyeInner.x - leftEyeInner.x
      ) * (180 / Math.PI);

      // 両目の間隔（正規化）
      const interocularDistance = Math.hypot(
        leftEyeInner.x - rightEyeInner.x,
        leftEyeInner.y - rightEyeInner.y
      ) / faceWidth; // eyeGap相当

      // 仕様書準拠: 眉の特徴計算
      const leftBrowInner = landmarks[70];  // 左眉内側
      const leftBrowMiddle = landmarks[107]; // 左眉中央
      const leftBrowOuter = landmarks[55];  // 左眉外側

      // 仕様書準拠: 眉の高さ（browY）- 正規化済み
      const browHeight = Math.abs(leftBrowMiddle.y - leftEyeTop.y) / faceHeight;

      // 仕様書準拠: 眉の角度計算（browTilt）
      // 推定レンジ: -20°～+20°
      const browAngle = Math.atan2(
        leftBrowOuter.y - leftBrowInner.y,
        leftBrowOuter.x - leftBrowInner.x
      ) * (180 / Math.PI);

      // 仕様書準拠: 鼻の特徴計算
      const noseLeft = landmarks[97];  // 仕様書推奨の鼻左点
      const noseRight = landmarks[326]; // 仕様書推奨の鼻右点
      const noseTip = landmarks[1];
      const noseBridge = landmarks[168]; // 仕様書推奨の鼻根点

      // 正規化済み鼻の特徴
      const noseWidth = Math.hypot(
        noseLeft.x - noseRight.x,
        noseLeft.y - noseRight.y
      ) / faceWidth; // 推定レンジ: 0.12-0.25

      const noseHeight = Math.hypot(
        noseBridge.x - noseTip.x,
        noseBridge.y - noseTip.y
      ) / faceHeight; // noseLength相当

      // 仕様書準拠: z座標を活用した3D突出度
      const noseProjection = noseTip.z ? Math.abs(noseTip.z) : 0;

      // 仕様書準拠: 頬骨の突出度計算（正規化）
      const leftCheek = landmarks[234];   // 左頬の最外側
      const rightCheek = landmarks[454];  // 右頬の最外側  
      const faceLeftEdge = landmarks[172]; // 顔の左端（顎角付近）
      const faceRightEdge = landmarks[397]; // 顔の右端（顎角付近）
      
      // 正規化済み頬骨の突出度
      const leftCheekFullness = Math.hypot(
        leftCheek.x - faceLeftEdge.x,
        leftCheek.y - faceLeftEdge.y
      ) / faceWidth;
      const rightCheekFullness = Math.hypot(
        rightCheek.x - faceRightEdge.x,
        rightCheek.y - faceRightEdge.y
      ) / faceWidth;
      const cheekFullness = (leftCheekFullness + rightCheekFullness) / 2;

      // 仕様書準拠: 口の特徴計算
      const mouthLeft = landmarks[61];
      const mouthRight = landmarks[291];
      const mouthTop = landmarks[13];
      const mouthBottom = landmarks[14];

      // 正規化済み口の特徴
      const mouthWidth = Math.hypot(
        mouthLeft.x - mouthRight.x,
        mouthLeft.y - mouthRight.y
      ) / faceWidth; // 推定レンジ: 0.25-0.50

      const mouthHeight = Math.hypot(
        mouthTop.x - mouthBottom.x,
        mouthTop.y - mouthBottom.y
      ) / faceHeight;

      // 仕様書準拠: 唇の厚み計算（正規化）
      const upperLipTop = landmarks[13];    // 上唇の上端
      const upperLipBottom = landmarks[12]; // 上唇の下端（唇の境界線）
      const lowerLipTop = landmarks[15];    // 下唇の上端（唇の境界線）
      const lowerLipBottom = landmarks[17]; // 下唇の下端
      
      // 正規化済み唇の厚み
      const upperLipThickness = Math.hypot(
        upperLipTop.x - upperLipBottom.x,
        upperLipTop.y - upperLipBottom.y
      ) / faceHeight;
      
      const lowerLipThickness = Math.hypot(
        lowerLipTop.x - lowerLipBottom.x,
        lowerLipTop.y - lowerLipBottom.y
      ) / faceHeight;
      
      // 推定レンジ: 0.01-0.04
      const lipThickness = (upperLipThickness + lowerLipThickness) / 2;

      // 仕様書準拠: 顎の角度計算（jawAngle）
      // 推定レンジ: 60-120°
      const chinTip = landmarks[152]; // 顎先（仕様書準拠）
      const leftJaw = landmarks[234];  // 左顎角
      const rightJaw = landmarks[454]; // 右顎角
      
      // 顎の角度を計算（∠(LM234-LM152-LM454)）
      const leftJawVector = {
        x: leftJaw.x - chinTip.x,
        y: leftJaw.y - chinTip.y
      };
      const rightJawVector = {
        x: rightJaw.x - chinTip.x,
        y: rightJaw.y - chinTip.y
      };
      
      // 両ベクトルの内積から角度を計算
      const dotProduct = leftJawVector.x * rightJawVector.x + leftJawVector.y * rightJawVector.y;
      const leftMagnitude = Math.hypot(leftJawVector.x, leftJawVector.y);
      const rightMagnitude = Math.hypot(rightJawVector.x, rightJawVector.y);
      const jawAngle = Math.acos(dotProduct / (leftMagnitude * rightMagnitude)) * (180 / Math.PI);
      
      // 仕様書準拠: 角度をSharp/Round判定に変換
      const jawSharpness = jawAngle < 90 ? (90 - jawAngle) / 30 : 0; // 0-1値

      const result = {
        eyeWidth: Number(eyeWidth.toFixed(4)),
        eyeHeight: Number(eyeHeight.toFixed(4)),
        leftEyeWidth: Number(eyeWidth.toFixed(4)),
        leftEyeHeight: Number(eyeHeight.toFixed(4)),
        rightEyeWidth: Number(eyeWidth.toFixed(4)),
        rightEyeHeight: Number(eyeHeight.toFixed(4)),
        eyeDistance: Number(interocularDistance.toFixed(4)),
        eyeAngle: Number(eyeSlantAngle.toFixed(2)),
        noseWidth: Number(noseWidth.toFixed(4)),
        noseHeight: Number(noseHeight.toFixed(4)),
        mouthWidth: Number(mouthWidth.toFixed(4)),
        lipThickness: Number(lipThickness.toFixed(4)),
        faceWidth: Number(faceAspectRatio.toFixed(4)),
        jawWidth: Number(jawSharpness.toFixed(3)),
        processingTime: Number(processingTime.toFixed(2))
      };
      
      console.log('✅ 特徴量計算結果:');
      console.log('📊 数値検証:');
      console.log(`  目幅 (正規化): ${result.eyeWidth} (範囲: 0.1-0.3)`);
      console.log(`  目高 (正規化): ${result.eyeHeight} (範囲: 0.02-0.08)`);
      console.log(`  目間隔 (正規化): ${result.eyeDistance} (範囲: 0.05-0.15)`);
      console.log(`  目角度: ${result.eyeAngle}° (範囲: -15°～+15°)`);
      console.log(`  鼻幅 (正規化): ${result.noseWidth} (範囲: 0.12-0.25)`);
      console.log(`  口幅 (正規化): ${result.mouthWidth} (範囲: 0.25-0.50)`);
      console.log(`  顔幅比率: ${result.faceWidth} (範囲: 1.2-1.8)`);
      
      // 異常値チェック
      const issues = [];
      if (result.eyeWidth < 0.05 || result.eyeWidth > 0.5) issues.push(`目幅異常: ${result.eyeWidth}`);
      if (result.eyeHeight < 0.01 || result.eyeHeight > 0.15) issues.push(`目高異常: ${result.eyeHeight}`);
      if (result.noseWidth < 0.05 || result.noseWidth > 0.4) issues.push(`鼻幅異常: ${result.noseWidth}`);
      if (result.mouthWidth < 0.1 || result.mouthWidth > 0.8) issues.push(`口幅異常: ${result.mouthWidth}`);
      
      if (issues.length > 0) {
        console.warn('⚠️ 異常値検出:', issues);
      } else {
        console.log('✅ すべての値が正常範囲内');
      }
      
      return result;
    } catch (error) {
      console.error('❌ 特徴量計算エラー:', error);
      const fallbackResult = {
        eyeWidth: 0, eyeHeight: 0, leftEyeWidth: 0, leftEyeHeight: 0,
        rightEyeWidth: 0, rightEyeHeight: 0, eyeDistance: 0, eyeAngle: 0,
        noseWidth: 0, noseHeight: 0, mouthWidth: 0, lipThickness: 0,
        faceWidth: 0, jawWidth: 0,
        processingTime: Number(processingTime.toFixed(2))
      };
      console.log('⚠️ フォールバック結果:', fallbackResult);
      return fallbackResult;
    }
  };

  // ランドマーク描画関数
  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: Array<{x: number, y: number, z?: number}>, width: number, height: number) => {
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;

    const faceOval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
    const leftEye = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
    const rightEye = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
    const lips = [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
    const nose = [1, 2, 5, 4, 6, 168, 8, 9, 10, 151, 195, 197, 196, 3, 51, 48, 115, 131, 134, 102, 49, 220, 305, 290, 328, 326];

    [
      { points: faceOval, color: '#00FF00' },
      { points: leftEye, color: '#FF3333' },
      { points: rightEye, color: '#FF3333' },
      { points: lips, color: '#3333FF' },
      { points: nose, color: '#FFFF33' }
    ].forEach(({ points, color }) => {
      ctx.fillStyle = color;
      points.forEach((index) => {
        if (landmarks[index]) {
          const x = landmarks[index].x * width;
          const y = landmarks[index].y * height;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    });

    ctx.globalAlpha = 1.0;
  };

  // 初期化確認
  if (!faceLandmarkerImage) {
    return (
      <LoadingSpinner message={status}>
        <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
          <div 
            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${initProgress}%` }}
          />
        </div>
        <div className="text-center mt-2 text-sm text-gray-600">
          {initProgress}%
        </div>
      </LoadingSpinner>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          MediaPipe Face Analysis
        </h1>
        <h2 className="text-2xl font-semibold text-gray-700">
          写真から顔特徴を解析してVRMアバターを調整
        </h2>
      </div>

      {/* 状態表示 */}
      <div className="text-center mb-8">
        <div className={`inline-block px-6 py-3 rounded-full text-lg font-semibold ${
          status.includes('❌') ? 'bg-red-100 text-red-700' : 
          status.includes('✅') ? 'bg-green-100 text-green-700' : 
          'bg-blue-100 text-blue-700'
        }`}>
          {status}
        </div>
        
      </div>

      {/* 写真アップロードセクション */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">写真アップロード</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handlePhotoUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!faceLandmarkerImage || isAnalyzing}
          className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-xl font-bold text-lg disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
        >
          {isAnalyzing ? '🔄 解析中...' : '📁 写真を選択'}
        </button>
        <p className="text-sm text-gray-600 mt-2 text-center">
          JPG, PNG, GIF, WebP対応 / 最大10MB
        </p>
      </div>

      {/* アップロード画像プレビュー */}
      {uploadedImage && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">アップロード画像</h3>
          <div className="relative">
            {!photoFeatures && (
              <img
                src={uploadedImage}
                alt="アップロードされた画像"
                className="w-full rounded-lg shadow-md"
                style={{ maxHeight: '400px', objectFit: 'contain' }}
              />
            )}
            <canvas
              ref={photoCanvasRef}
              className="w-full rounded-lg shadow-md"
              style={{ 
                display: photoFeatures ? 'block' : 'none',
                maxHeight: '400px',
                objectFit: 'contain'
              }}
            />
            {uploadedImage && !isAnalyzing && (isNewImageUploaded || !photoFeatures) && (
              <div className="mt-4 text-center">
                <button
                  onClick={startAnalysis}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-lg"
                >
                  🔍 顔解析を開始
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 解析プログレス */}
      {isAnalyzing && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">解析進捗</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{analysisStep}</span>
              <span>{analysisProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}


      {/* VRM解析結果とBlendShape調整 */}
      {photoFeatures && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側: VRMプレビュー */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">VRMプレビュー（結果）</h2>
            <div style={{ height: '500px' }}>
              <VRMPreview 
                faceFeatures={photoFeatures}
                manualBlendShapeValues={blendShapeStore.currentValues}
                onAvailableShapesChange={setAvailableBlendShapes}
              />
            </div>
            
            {/* 検出された特徴量表示 */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">📊 検出された顔特徴値</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                <div className="space-y-2">
                  {/* 目の特徴 */}
                  <div className="border-b border-gray-200 pb-2">
                    <h4 className="font-medium text-blue-600 mb-2">👁️ 目の特徴</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>目の幅:</span>
                        <span className="font-mono">{photoFeatures.eyeWidth.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>目の高さ:</span>
                        <span className="font-mono">{photoFeatures.eyeHeight.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>左目幅:</span>
                        <span className="font-mono">{photoFeatures.leftEyeWidth.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>左目高さ:</span>
                        <span className="font-mono">{photoFeatures.leftEyeHeight.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>右目幅:</span>
                        <span className="font-mono">{photoFeatures.rightEyeWidth.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>右目高さ:</span>
                        <span className="font-mono">{photoFeatures.rightEyeHeight.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>目の間隔:</span>
                        <span className="font-mono">{photoFeatures.eyeDistance.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>目の角度:</span>
                        <span className="font-mono">{photoFeatures.eyeAngle.toFixed(2)}°</span>
                      </div>
                    </div>
                  </div>

                  {/* 鼻の特徴 */}
                  <div className="border-b border-gray-200 pb-2">
                    <h4 className="font-medium text-green-600 mb-2">👃 鼻の特徴</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>鼻の幅:</span>
                        <span className="font-mono">{photoFeatures.noseWidth.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>鼻の高さ:</span>
                        <span className="font-mono">{photoFeatures.noseHeight.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 口の特徴 */}
                  <div className="border-b border-gray-200 pb-2">
                    <h4 className="font-medium text-purple-600 mb-2">👄 口の特徴</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>口の幅:</span>
                        <span className="font-mono">{photoFeatures.mouthWidth.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>唇の厚み:</span>
                        <span className="font-mono">{photoFeatures.lipThickness.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 顔全体の特徴 */}
                  <div className="border-b border-gray-200 pb-2">
                    <h4 className="font-medium text-orange-600 mb-2">😊 顔全体</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>顔の幅:</span>
                        <span className="font-mono">{photoFeatures.faceWidth.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>顎の形状:</span>
                        <span className="font-mono">{photoFeatures.jawWidth.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 解析情報 */}
                  <div>
                    <h4 className="font-medium text-gray-600 mb-2">ℹ️ 解析情報</h4>
                    <div className="flex justify-between text-sm">
                      <span>処理時間:</span>
                      <span className="font-mono">{photoFeatures.processingTime}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 右側: BlendShape手動調整 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">BlendShape調整</h2>
            <div className="max-h-[600px] overflow-y-auto">
              <BlendShapeControls
                store={blendShapeStore}
                availableBlendShapes={availableBlendShapes}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FaceAnalysisPage() {
  return (
    <PageWrapper loadingMessage="顔解析システムを読み込み中...">
      <FaceAnalysisContent />
    </PageWrapper>
  );
}