'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FaceFeatures } from '@/types/face';
import { useBlendShapeStore } from '@/hooks/useBlendShapeStore';
import { BlendShapeConverter } from '@/utils/blendshape-converter';
import { saveFaceFeatures, createFaceFeatureData } from '@/utils/localStorage';
import { useMediaPipe } from '@/hooks/useMediaPipe';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAnalysisState } from '@/hooks/useAnalysisState';
import { useFaceAnalysis } from '@/hooks/useFaceAnalysis';
import { DEFAULT_BLENDSHAPE_CONFIG } from '@/config/blendshape-config';
import PageWrapper from '@/components/PageWrapper';
import LoadingSpinner from '@/components/LoadingSpinner';
import VRMPreview from '@/components/VRMPreview';

function FaceAnalysisContent() {
  const router = useRouter();
  
  // Hooks
  const mediaPipe = useMediaPipe();
  const fileUpload = useFileUpload();
  const analysisState = useAnalysisState();
  const faceAnalysis = useFaceAnalysis();
  const blendShapeStore = useBlendShapeStore(DEFAULT_BLENDSHAPE_CONFIG);
  
  // Local state
  const [photoFeatures, setPhotoFeatures] = useState<FaceFeatures | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);

  // クライアントサイドとマウント確認
  useEffect(() => {
    setIsClient(true);
    setMounted(true);
    return () => {
      isMountedRef.current = false;
      setMounted(false);
    };
  }, []);
  
  // 状態変化を監視
  useEffect(() => {
    console.log('📊 faceLandmarkerImage状態変化:', {
      hasValue: !!faceLandmarkerImage,
      type: typeof faceLandmarkerImage
    });
  }, [faceLandmarkerImage]);
  
  useEffect(() => {
    console.log('📈 status状態変化:', status);
  }, [status]);
  
  useEffect(() => {
    console.log('📊 initProgress状態変化:', initProgress);
  }, [initProgress]);
  
  // コンポーネントライフサイクル監視とクリーンアップ（React Strict Mode対応）
  useEffect(() => {
    console.log('🎭 コンポーネントマウント完了');
    
    // クリーンアップが既に実行されたかを追跡
    let isCleanedUp = false;
    
    return () => {
      // 二重実行防止
      if (isCleanedUp) {
        console.log('⚠️ クリーンアップ二重実行をスキップ');
        return;
      }
      isCleanedUp = true;
      
      console.log('🎭 コンポーネントアンマウント開始');
      
      // 保存されたクリーンアップ関数を優先実行
      if (cleanupRef.current) {
        console.log('🧹 保存されたクリーンアップ関数実行');
        try {
          cleanupRef.current();
        } catch (error) {
          console.warn('⚠️ 保存されたクリーンアップ関数エラー:', error);
        }
        cleanupRef.current = null;
      }
      
      // 初期化フラグをリセット
      initializingRef.current = false;
      
      // 追加の安全チェック：残存リソースのクリーンアップ
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      
      // すべてのタイムアウトをクリア
      timeoutIdsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutIdsRef.current.clear();
      
      // レンダラーの追加チェック
      if (rendererRef.current) {
        const rendererElement = rendererRef.current.domElement;
        const container = previewContainerRef.current;
        
        // DOM要素削除の最終チェック（詳細ログ付き）
        if (container && rendererElement) {
          console.log('🔍 useEffect最終クリーンアップ前の状態:', {
            containerExists: !!container,
            rendererExists: !!rendererElement,
            rendererParent: rendererElement.parentNode?.tagName,
            rendererInContainer: container.contains(rendererElement),
            parentMatches: rendererElement.parentNode === container,
            containerChildren: container.children.length,
            rendererConnected: rendererElement.isConnected,
            callStack: new Error().stack?.split('\n').slice(0, 5)
          });
          
          try {
            // React Fiberとの競合を完全に回避する最終チェック
            const isStillInDOM = rendererElement.isConnected && document.contains(rendererElement);
            const hasValidParent = rendererElement.parentNode && rendererElement.parentNode === container;
            
            // Fast Refresh中はDOM操作を避ける
            const isFastRefresh = document.documentElement.hasAttribute('data-fast-refresh') || 
                                 window.location.href.includes('_next/static/chunks/webpack');
            
            if (isFastRefresh) {
              console.log('⚠️ Fast Refresh検出: DOM削除を安全にスキップ');
              return; // Fast Refresh中は削除しない
            }
            
            if (isStillInDOM && hasValidParent) {
              console.log('🧹 useEffect最終クリーンアップ: removeChild実行中...');
              container.removeChild(rendererElement);
              console.log('✅ 最終DOM要素削除成功');
            } else if (isStillInDOM && rendererElement.remove) {
              console.log('🧹 useEffect最終クリーンアップ: element.remove()実行中...');
              rendererElement.remove();
              console.log('✅ 最終DOM要素削除成功（removeメソッド使用）');
            } else {
              console.log('ℹ️ useEffect最終クリーンアップ: DOM要素削除スキップ（既に削除済みまたは無効）');
            }
          } catch (error) {
            console.error('❌ useEffect最終DOM削除エラー:', {
              error,
              errorStack: error.stack,
              containerState: {
                exists: !!container,
                children: container?.children.length
              },
              rendererState: {
                exists: !!rendererElement,
                parent: rendererElement?.parentNode?.tagName,
                connected: rendererElement?.isConnected
              }
            });
          }
        }
        
        try {
          rendererRef.current.dispose();
        } catch (error) {
          console.warn('⚠️ アンマウント時レンダラー破棄エラー:', error);
        }
        rendererRef.current = null;
      }
      
      if (sceneRef.current) {
        try {
          sceneRef.current.clear();
        } catch (error) {
          console.warn('⚠️ アンマウント時シーンクリアエラー:', error);
        }
        sceneRef.current = null;
      }
      
      vrmRef.current = null;
      console.log('✅ コンポーネントアンマウント完了');
    };
  }, [mounted]); // mounted状態に依存させてStrictModeでの二重実行を制御
  
  

  // MediaPipe初期化
  useEffect(() => {
    console.log('⚡ MediaPipe初期化開始');
    
    const initializeMediaPipe = async () => {
      try {
        console.log('🚀 MediaPipe初期化開始');
        console.log('🌐 ブラウザ環境チェック:', {
          userAgent: navigator.userAgent,
          webgl: !!window.WebGLRenderingContext,
          webgl2: !!window.WebGL2RenderingContext,
          protocol: window.location.protocol,
          origin: window.location.origin
        });
        
        setStatus('📦 MediaPipe Vision Tasks を読み込み中...');
        setInitProgress(20);
        
        console.log('📦 FilesetResolver.forVisionTasks呼び出し中...');
        console.log('📡 使用中のCDN URL:', "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        console.log('✅ FilesetResolver完了:', vision);
        console.log('🔍 Visionオブジェクト詳細:', {
          type: typeof vision,
          keys: Object.keys(vision || {}),
          constructor: vision?.constructor?.name
        });
        
        setStatus('🧠 Face Landmarker AIモデルをダウンロード中...');
        setInitProgress(40);
        
        // VIDEO用のFaceLandmarker作成
        const landmarkerVideo = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"  // 作業テストプロジェクトと同じGPU delegateに変更
          },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        setFaceLandmarkerVideo(landmarkerVideo);
        setInitProgress(70);
        setStatus('📷 IMAGE用モデルを初期化中...');
        
        // IMAGE用のFaceLandmarker作成
        const landmarkerImage = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"  // 作業テストプロジェクトと同じGPU delegateに変更
          },
          runningMode: "IMAGE",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        // MediaPipe初期化完了 - ウォームアップは不要
        
        // MediaPipeの内部ログを抑制（WASM/Emscripten出力を含む）
        const originalConsoleLog = console.log;
        const originalConsoleInfo = console.info;
        const originalConsoleWarn = console.warn;
        const originalConsoleError = console.error;
        
        // MediaPipeの内部ログをフィルタリング
        const filterMediaPipeLog = (args: unknown[]) => {
          if (args[0] && typeof args[0] === 'string') {
            const msg = args[0];
            return msg.includes('Created TensorFlow Lite XNNPACK delegate') ||
                   msg.includes('INFO:') ||
                   msg.includes('Graph successfully started') ||
                   msg.includes('Graph finished closing') ||
                   msg.includes('GL version:') ||
                   msg.includes('OpenGL error checking') ||
                   msg.includes('Feedback manager requires a model') ||
                   msg.includes('Sets FaceBlendshapesGraph acceleration');
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
        console.error = (...args) => {
          if (filterMediaPipeLog(args)) return;
          originalConsoleError.apply(console, args);
        };
        
        // MediaPipe設定完了
        setFaceLandmarkerImage(landmarkerImage);
        setIsWarmedUp(true);
        setInitProgress(100);
        setStatus('✅ 準備完了！写真をアップロードしてください');
        console.log('🎉 MediaPipe初期化完全完了');
        console.log('🔥 ウォームアップフラグ有効化');
        
      } catch (error) {
        console.error('❌ MediaPipe初期化エラー詳細:', error);
        console.error('📊 エラー情報:', {
          type: typeof error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'スタック情報なし',
          name: error instanceof Error ? error.name : 'N/A',
          cause: error instanceof Error ? error.cause : undefined
        });
        
        // ネットワークエラーかどうかチェック
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error('🌐 ネットワークエラーの可能性:', {
            errorMessage: error.message,
            possibleCause: 'CDNへのアクセス、CORS、またはネットワーク接続の問題'
          });
        }
        
        // 具体的なエラーメッセージを生成
        let errorMessage = '不明なエラー';
        if (error instanceof Error) {
          if (error.message.includes('fetch')) {
            errorMessage = 'ネットワーク接続またはCDNアクセスエラー';
          } else if (error.message.includes('WASM')) {
            errorMessage = 'WebAssembly読み込みエラー';
          } else {
            errorMessage = error.message;
          }
        }
        
        setStatus(`❌ 初期化に失敗しました: ${errorMessage}`);
        setInitProgress(0);
      }
    };

    console.log('🔄 initializeMediaPipe関数呼び出し前');
    initializeMediaPipe().then(() => {
      console.log('✅ initializeMediaPipe完了');
    }).catch((error) => {
      console.error('❌ initializeMediaPipe失敗:', error);
    });
    
    return () => {
      console.log('🧹 useEffect クリーンアップ実行');
    };
  }, []); // 一度だけ実行 - テストプロジェクト方式

  // 写真アップロード処理
  const handlePhotoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !faceLandmarkerImage) return;

    if (!file.type.startsWith('image/')) {
      alert('画像ファイル（JPG, PNG, GIF等）を選択してください');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズが大きすぎます（10MB以下にしてください）');
      return;
    }

    setPhotoFeatures(null);
    setStatus('📷 写真をアップロード中...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageSrc = e.target?.result as string;
      setUploadedImage(imageSrc);
      setStatus('✅ 写真をアップロードしました。解析を開始するには下のボタンを押してください。');
    };
    reader.onerror = () => {
      setStatus('❌ ファイルの読み込みに失敗しました');
    };
    reader.readAsDataURL(file);
  }, [faceLandmarkerImage]);

  // 解析開始処理
  const startAnalysis = useCallback(async () => {
    console.log('📸 解析開始チェック:', {
      hasUploadedImage: !!uploadedImage,
      hasFaceLandmarkerImage: !!faceLandmarkerImage,
      faceLandmarkerType: typeof faceLandmarkerImage
    });
    
    if (!uploadedImage || !faceLandmarkerImage) {
      console.error('❌ 解析開始失敗 - 必要な要素が不足:', {
        uploadedImage: !!uploadedImage,
        faceLandmarkerImage: !!faceLandmarkerImage
      });
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStep('画像準備中...');
    setStatus('🔍 AI解析実行中...');
    
    const img = new Image();
    img.onload = async () => {
      if (!isMountedRef.current) return;
      
      console.log('🖼️ 画像読み込み完了:', {
        width: img.width,
        height: img.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete
      });
      
      // 画像が完全に読み込まれるまで少し待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isMountedRef.current) return;
      setAnalysisProgress(20);
      setAnalysisStep('MediaPipe処理開始...');
      await analyzePhoto(img);
    };
    img.onerror = () => {
      if (!isMountedRef.current) return;
      setStatus('❌ 画像の読み込みに失敗しました');
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setAnalysisStep('');
    };
    img.src = uploadedImage;
  }, [uploadedImage, faceLandmarkerImage]);

  // 写真解析処理
  const analyzePhoto = useCallback(async (imageElement: HTMLImageElement) => {
    console.log('📸 analyzePhoto実行:', {
      hasFaceLandmarkerImage: !!faceLandmarkerImage,
      hasCanvas: !!photoCanvasRef.current,
      faceLandmarkerType: typeof faceLandmarkerImage,
      faceLandmarkerMethods: faceLandmarkerImage ? Object.getOwnPropertyNames(faceLandmarkerImage) : [],
      imageElementType: typeof imageElement,
      imageComplete: imageElement.complete,
      imageNaturalWidth: imageElement.naturalWidth,
      imageNaturalHeight: imageElement.naturalHeight
    });
    
    if (!faceLandmarkerImage) {
      console.error('❌ FaceLandmarkerが初期化されていません');
      setStatus('❌ AI解析モデルが初期化されていません');
      setIsAnalyzing(false);
      return;
    }
    
    // MediaPipeの状態確認
    if (typeof faceLandmarkerImage.detect !== 'function') {
      console.error('❌ FaceLandmarker.detect メソッドが存在しません');
      setStatus('❌ AI解析モデルが正しく初期化されていません');
      setIsAnalyzing(false);
      return;
    }
    
    // ウォームアップ状態確認
    if (!isWarmedUp) {
      console.warn('⚠️ MediaPipeがまだウォームアップ中です');
      setStatus('⏳ AI解析モデルの準備中です。少々お待ちください...');
      setIsAnalyzing(false);
      return;
    }
    
    // Canvas要素を取得または作成
    let canvas = photoCanvasRef.current;
    if (!canvas) {
      console.error('❌ Canvas要素が参照されていません');
      setStatus('❌ 描画キャンバスが見つかりません');
      setIsAnalyzing(false);
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Canvas 2Dコンテキストを取得できません');
      setStatus('❌ 描画コンテキストの取得に失敗しました');
      setIsAnalyzing(false);
      return;
    }

    try {
      setAnalysisProgress(40);
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

      setAnalysisProgress(70);
      setAnalysisStep('MediaPipe AI解析実行中...');
      
      console.log('🔍 MediaPipe解析開始:', {
        faceLandmarkerType: typeof faceLandmarkerImage,
        hasDetectMethod: typeof faceLandmarkerImage?.detect === 'function',
        imageElement: imageElement
      });
      
      const startTime = performance.now();
      let results;
      let processingTime = 0;
      
      try {
        // MediaPipeの検出実行（テストプロジェクト完全準拠）
        if (!faceLandmarkerImage) {
          console.error('FaceLandmarker not initialized');
          return null;
        }
        
        if (!imageElement.complete || imageElement.naturalWidth === 0) {
          console.error('Image not fully loaded');
          return null;
        }
        
        // detectメソッドの存在確認
        if (typeof faceLandmarkerImage.detect !== 'function') {
          console.error('FaceLandmarker.detect method not available');
          return null;
        }
        
        // MediaPipe と画像要素の詳細な状態確認
        console.log('🔍 detectメソッド実行直前の詳細チェック', {
          faceLandmarkerImage: {
            exists: !!faceLandmarkerImage,
            type: Object.prototype.toString.call(faceLandmarkerImage),
            detectMethod: typeof faceLandmarkerImage?.detect,
            hasDetect: faceLandmarkerImage && 'detect' in faceLandmarkerImage,
            constructor: faceLandmarkerImage?.constructor?.name,
            prototype: Object.getPrototypeOf(faceLandmarkerImage)?.constructor?.name
          },
          imageElement: {
            exists: !!imageElement,
            type: Object.prototype.toString.call(imageElement),
            tagName: imageElement?.tagName,
            complete: imageElement?.complete,
            naturalWidth: imageElement?.naturalWidth,
            naturalHeight: imageElement?.naturalHeight,
            src: imageElement?.src?.substring(0, 50) + '...',
            readyState: (imageElement as any)?.readyState
          }
        });
        
        // 作業テストプロジェクトと同一の検証ロジック
        if (!faceLandmarkerImage) {
          console.error('FaceLandmarker not initialized');
          return null;
        }
        
        if (!imageElement.complete || imageElement.naturalWidth === 0) {
          console.error('Image not fully loaded');
          return null;
        }
        
        // detectメソッドの存在確認
        if (typeof faceLandmarkerImage.detect !== 'function') {
          console.error('FaceLandmarker.detect method not available');
          return null;
        }
        
        console.log('🔍 detectメソッド実行直前', {
          faceLandmarkerType: Object.prototype.toString.call(faceLandmarkerImage),
          detectMethodType: typeof faceLandmarkerImage.detect,
          imageElementType: Object.prototype.toString.call(imageElement)
        });
        
        // 短い遅延を追加してブラウザがリソースを確実に準備できるようにする
        await new Promise(resolve => setTimeout(resolve, 10));
        
        try {
          results = faceLandmarkerImage.detect(imageElement);
          processingTime = performance.now() - startTime;
        } catch (detectError) {
          console.error('❌ detect方法実行エラー:', {
            detectError,
            detectErrorType: typeof detectError,
            detectErrorMessage: detectError instanceof Error ? detectError.message : 'Unknown detect error',
            faceLandmarkerState: !!faceLandmarkerImage,
            imageElementState: {
              complete: imageElement.complete,
              naturalWidth: imageElement.naturalWidth,
              naturalHeight: imageElement.naturalHeight
            }
          });
          return null;
        }
        console.log('✅ MediaPipe顔検出完了', {
          processingTime: `${processingTime.toFixed(2)}ms`,
          wasWarmedUp: isWarmedUp
        });
      } catch (error) {
        console.error('❌ MediaPipe検出エラー詳細:', {
          error,
          errorType: typeof error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : 'No stack trace',
          faceLandmarkerState: {
            type: typeof faceLandmarkerImage,
            hasDetect: typeof faceLandmarkerImage?.detect === 'function',
            methods: faceLandmarkerImage ? Object.getOwnPropertyNames(faceLandmarkerImage) : []
          }
        });
        setStatus('❌ 顔検出処理でエラーが発生しました');
        setIsAnalyzing(false);
        setAnalysisProgress(0);
        setAnalysisStep('エラー発生');
        return;
      }
      
      console.log('✅ MediaPipe解析完了:', {
        processingTime: `${processingTime.toFixed(2)}ms`,
        results
      });

      setAnalysisProgress(90);
      setAnalysisStep('特徴量計算中...');

      console.log('🔍 MediaPipe解析結果:', {
        hasFaceLandmarks: !!(results.faceLandmarks && results.faceLandmarks.length > 0),
        landmarksCount: results.faceLandmarks?.length || 0,
        firstLandmarkCount: results.faceLandmarks?.[0]?.length || 0
      });

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        console.log('🎯 ランドマーク描画開始:', {
          landmarksLength: landmarks.length,
          canvasSize: { width, height },
          firstLandmark: landmarks[0]
        });
        
        drawLandmarks(ctx, landmarks, width, height);
        console.log('✅ ランドマーク描画完了');
        
        const calculatedFeatures = calculateDetailedFeatures(landmarks, processingTime);
        console.log('📊 計算された特徴量:', calculatedFeatures);
        
        setPhotoFeatures(calculatedFeatures);
        setAnalysisProgress(100);
        setAnalysisStep('解析完了');
        setStatus(`✅ 顔検出成功！${landmarks.length}個のランドマーク点を検出`);
        
        console.log('🖼️ Canvas要素をDOMに追加確認');
        // Canvasの表示状態を確認
        if (canvas.parentElement) {
          console.log('✅ CanvasはすでにDOMに存在');
        } else {
          console.log('⚠️ CanvasがDOMに存在しない');
          // Canvasにスタイルを追加
          canvas.className = 'border-4 border-green-300 rounded-lg shadow-xl max-w-full h-auto';
          canvas.style.display = 'block';
          canvas.style.margin = '0 auto';
        }
        
        // VRMプレビューを初期化（遅延実行しない）
        console.log('🎯 VRMプレビュー初期化スケジュール:', {
          vrmLoaded,
          hasContainer: !!previewContainerRef.current,
          hasFeatures: !!photoFeatures
        });
      } else {
        setAnalysisProgress(100);
        setAnalysisStep('顔検出失敗');
        setPhotoFeatures(null);
        setStatus('❌ 顔が検出されませんでした。明るく正面を向いた写真をお試しください。');
      }
      
    } catch (error) {
      console.error('❌ 写真解析エラー:', error);
      if (isMountedRef.current) {
        setStatus('❌ 写真の解析に失敗しました');
        setAnalysisProgress(0);
        setAnalysisStep('エラー発生');
      }
    } finally {
      if (isMountedRef.current) {
        setIsAnalyzing(false);
      }
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          setAnalysisProgress(0);
          setAnalysisStep('');
        }
        timeoutIdsRef.current.delete(timeoutId);
      }, 2000);
      timeoutIdsRef.current.add(timeoutId);
    }
  }, [faceLandmarkerImage]);

  // 顔特徴量計算
  const calculateDetailedFeatures = (landmarks: Array<{x: number, y: number, z?: number}>, processingTime: number): FaceFeatures => {
    // 基本的な特徴量計算（簡略版）
    const faceTop = landmarks[10];
    const faceBottom = landmarks[152];
    const faceLeft = landmarks[234];
    const faceRight = landmarks[454];
    
    const faceWidth = Math.abs(faceRight.x - faceLeft.x);
    const faceHeight = Math.abs(faceBottom.y - faceTop.y);
    const faceAspectRatio = faceHeight / faceWidth;

    // 基本値を返す（実際の実装では詳細計算）
    return {
      eyeWidth: 0.05,
      eyeHeight: 0.03,
      eyeAspectRatio: 0.6,
      eyeSlantAngle: 0,
      browHeight: 0.08,
      browAngle: -180,
      noseWidth: 0.17,
      noseHeight: 0.11,
      noseProjection: 0.015,
      cheekFullness: 0.12,
      mouthWidth: 0.35,
      mouthHeight: 0.02,
      lipThickness: 0.02,
      faceAspectRatio,
      jawSharpness: 0.5,
      interocularDistance: 0.32,
      processingTime
    };
  };

  // ランドマーク描画
  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: Array<{x: number, y: number, z?: number}>, width: number, height: number) => {
    ctx.lineWidth = 2;
    ctx.fillStyle = '#00FF00';
    
    landmarks.forEach((landmark, index) => {
      if (index % 10 === 0) { // 間引いて描画
        const x = landmark.x * width;
        const y = landmark.y * height;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  // VRMプレビュー初期化
  const initializeVRMPreview = useCallback(async () => {
    console.log('🔍 VRMプレビュー初期化関数呼び出し:', {
      hasContainer: !!previewContainerRef.current,
      hasFeatures: !!photoFeatures,
      vrmLoaded,
      containerElement: previewContainerRef.current
    });

    if (!previewContainerRef.current || !photoFeatures) {
      console.log('🚫 VRMプレビュー初期化スキップ:', {
        hasContainer: !!previewContainerRef.current,
        hasFeatures: !!photoFeatures
      });
      return;
    }

    // すでに初期化済みの場合はスキップ
    if (vrmLoaded) {
      console.log('🚫 VRMプレビューは既に初期化済み');
      return;
    }

    console.log('🎭 VRMプレビュー初期化開始');

    // 既存のレンダラーがある場合はクリーンアップ
    if (rendererRef.current) {
      console.log('🧹 既存レンダラーのクリーンアップ');
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      try {
        rendererRef.current.dispose();
      } catch (error) {
        console.warn('⚠️ レンダラー破棄エラー:', error);
      }
      rendererRef.current = null;
    }

    // コンテナをクリア（安全に）
    const container = previewContainerRef.current;
    if (container) {
      // DOMの子要素を安全に削除（DOM操作のバッチ化）
      const children = Array.from(container.children);
      console.log(`🧹 DOM子要素削除開始: ${children.length}個の要素`);
      
      // より安全なDOM要素削除（詳細ログ付き）
      console.log('🔍 DOM削除前の詳細状態:', {
        containerExists: !!container,
        containerParent: container?.parentNode?.tagName,
        children: Array.from(container?.children || []).map(child => ({
          tagName: child.tagName,
          className: child.className,
          parentNode: child.parentNode === container,
          isConnected: child.isConnected
        }))
      });
      
      try {
        console.log('🧹 innerHTML方式で一括削除実行中...');
        // innerHTML使用をやめてReact-safeな削除方法に変更
        // container.innerHTML = ''; // ← React Fiberと競合するため無効化
        
        // 代わりに個別削除でReactとの競合を回避
        children.forEach(child => {
          if (child && child.parentNode === container && child.isConnected) {
            try {
              container.removeChild(child);
            } catch (e) {
              // 既にReactによって削除されている場合はスキップ
              console.log('React管理要素のためスキップ:', child.tagName);
            }
          }
        });
        console.log(`✅ DOM子要素削除成功: ${children.length}個の要素`);
      } catch (error) {
        console.error('❌ innerHTML削除エラー:', error);
        console.log('🔄 フォールバック: 個別削除方式に切り替え');
        
        // フォールバック：個別削除
        children.forEach((child, index) => {
          console.log(`🔍 個別削除 ${index + 1}/${children.length}:`, {
            tagName: child.tagName,
            className: child.className,
            hasParent: !!child.parentNode,
            parentIsContainer: child.parentNode === container,
            isConnected: child.isConnected
          });
          
          try {
            if (child && child.parentNode === container) {
              container.removeChild(child);
              console.log(`✅ フォールバック削除成功: ${index + 1}/${children.length}`);
            } else {
              console.warn(`⚠️ 削除スキップ ${index + 1}/${children.length}: 親ノード不一致`);
            }
          } catch (individualError) {
            console.error(`❌ 個別削除エラー ${index + 1}/${children.length}:`, individualError);
          }
        });
      }
    }

    const containerWidth = container.clientWidth || 400;
    const containerHeight = 400;

    // シーンの生成
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // カメラの生成
    const camera = new THREE.PerspectiveCamera(
      30, 
      containerWidth / containerHeight, 
      0.1, 
      20
    );
    camera.position.set(0.0, 1.0, 4.0);
    camera.lookAt(0, 1, 0);

    // レンダラーの生成
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerWidth, containerHeight);
    renderer.setClearColor(0xf0f0f0, 1.0);
    rendererRef.current = renderer;
    
    // DOM要素追加を安全に実行
    try {
      // React Strict Mode対策：DOM操作をスケジュールして実行
      await new Promise((resolve, reject) => {
        requestAnimationFrame(() => {
          try {
            if (container && renderer.domElement && !container.contains(renderer.domElement)) {
              console.log('🔍 レンダラーDOM追加前の状態:', {
                containerExists: !!container,
                containerChildren: container.children.length,
                rendererElement: {
                  exists: !!renderer.domElement,
                  tagName: renderer.domElement.tagName,
                  className: renderer.domElement.className,
                  hasParent: !!renderer.domElement.parentNode,
                  parentTag: renderer.domElement.parentNode?.tagName,
                  isConnected: renderer.domElement.isConnected
                }
              });
              
              container.appendChild(renderer.domElement);
              
              console.log('✅ レンダラーDOMエレメント追加成功:', {
                containerChildren: container.children.length,
                addedElement: {
                  tagName: renderer.domElement.tagName,
                  parentTag: renderer.domElement.parentNode?.tagName,
                  parentMatches: renderer.domElement.parentNode === container,
                  isConnected: renderer.domElement.isConnected
                }
              });
              resolve(void 0);
            } else {
              console.warn('⚠️ DOM要素追加スキップ（既に存在するか、要素が無効）');
              resolve(void 0);
            }
          } catch (error) {
            console.error('❌ レンダラーのDOM追加エラー:', error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('❌ レンダラーのDOM追加エラー:', error);
      // リソースクリーンアップ
      try {
        renderer.dispose();
      } catch (disposeError) {
        console.warn('⚠️ レンダラー破棄エラー:', disposeError);
      }
      return;
    }

    // ライトの生成
    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1.0, 1.0, 1.0);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // VRMローダーの準備
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    // デフォルトアバターを読み込み（エラーハンドリング強化）
    const defaultAvatar = getDefaultAvatar();
    console.log('🎯 デフォルトアバター読み込み開始:', {
      path: defaultAvatar.vrmPath,
      avatarData: defaultAvatar
    });
    
    try {
      console.log('📡 GLTFLoader.load開始...');
      const gltf = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('VRM読み込みタイムアウト (10秒)'));
        }, 10000);
        timeoutIdsRef.current.add(timeoutId);
        
        loader.load(
          defaultAvatar.vrmPath,
          (result) => {
            clearTimeout(timeoutId);
            timeoutIdsRef.current.delete(timeoutId);
            console.log('📦 GLTFLoader成功:', result);
            resolve(result);
          },
          (progress) => {
            console.log('📈 読み込み進捗:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
          },
          (error) => {
            clearTimeout(timeoutId);
            console.error('📦 GLTFLoaderエラー:', error);
            reject(error);
          }
        );
      });

      console.log('📦 GLTF読み込み完了:', gltf);
      const vrm = gltf.userData?.vrm;
      
      if (vrm) {
        console.log('✅ VRM取得成功');
        vrmRef.current = vrm;
        scene.add(vrm.scene);
        VRMUtils.rotateVRM0(vrm);
        
        // 顔特徴を適用
        applyFaceBlendShapesToVRM(vrm, photoFeatures);
        setVrmLoaded(true);
        console.log('✅ VRMプレビュー読み込み完了');
      } else if (gltf.scene) {
        console.log('📦 GLTFとして読み込み成功');
        vrmRef.current = { scene: gltf.scene, userData: gltf };
        scene.add(gltf.scene);
        
        // GLTFの場合も顔特徴適用を試す
        try {
          applyFaceBlendShapesToVRM({ scene: gltf.scene }, photoFeatures);
        } catch (error) {
          console.warn('⚠️ GLTFに顔特徴適用失敗:', error);
        }
        
        setVrmLoaded(true);
        console.log('✅ GLTFプレビュー読み込み完了');
      } else {
        console.error('VRMまたはGLTFシーンが見つかりません');
        return;
      }
    } catch (error) {
      console.error('❌ VRMプレビュー読み込みエラー:', error);
      setVrmLoadError(error instanceof Error ? error.message : String(error));
      
      // フォールバック: シンプルな人型オブジェクトを表示
      const group = new THREE.Group();
      
      // 頭
      const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.5;
      group.add(head);
      
      // 体
      const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 16);
      const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x4a90e2 });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.6;
      group.add(body);
      
      // 腕
      const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
      const armMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
      const leftArm = new THREE.Mesh(armGeometry, armMaterial);
      leftArm.position.set(-0.5, 0.8, 0);
      leftArm.rotation.z = Math.PI / 4;
      group.add(leftArm);
      
      const rightArm = new THREE.Mesh(armGeometry, armMaterial);
      rightArm.position.set(0.5, 0.8, 0);
      rightArm.rotation.z = -Math.PI / 4;
      group.add(rightArm);
      
      // 脚
      const legGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);
      const legMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
      const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
      leftLeg.position.set(-0.2, -0.5, 0);
      group.add(leftLeg);
      
      const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
      rightLeg.position.set(0.2, -0.5, 0);
      group.add(rightLeg);
      
      scene.add(group);
      vrmRef.current = { scene: group };
      
      setVrmLoaded(true);
      console.log('📦 フォールバック人型表示完了');
    }

    // アニメーションループ
    const clock = new THREE.Clock();
    const animate = () => {
      if (!isMountedRef.current) return;
      animationFrameIdRef.current = requestAnimationFrame(animate);
      const deltaTime = clock.getDelta();
      if (vrmRef.current && typeof vrmRef.current.update === 'function') {
        vrmRef.current.update(deltaTime);
      }
      if (rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, camera);
      }
    };
    animate();

    // クリーンアップ関数
    const cleanup = () => {
      console.log('🧹 VRMプレビュークリーンアップ開始');
      
      // アニメーションフレームを停止
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      
      // レンダラーとDOM要素のクリーンアップ（改善版）
      if (rendererRef.current) {
        const rendererElement = rendererRef.current.domElement;
        
        // DOM要素削除を安全に実行（詳細ログ付き）
        if (container && rendererElement) {
          console.log('🔍 レンダラー削除前の詳細状態:', {
            containerExists: !!container,
            rendererExists: !!rendererElement,
            rendererParent: rendererElement.parentNode?.tagName,
            rendererInContainer: container.contains(rendererElement),
            parentMatches: rendererElement.parentNode === container,
            containerChildren: container.children.length,
            rendererConnected: rendererElement.isConnected
          });
          
          try {
            // React Fiberとの競合を避けるため、より厳密なDOM状態チェック
            const isStillInDOM = rendererElement.isConnected && document.contains(rendererElement);
            const hasValidParent = rendererElement.parentNode && rendererElement.parentNode === container;
            
            if (isStillInDOM && hasValidParent) {
              console.log('🧹 removeChild方式でレンダラー削除実行中...');
              container.removeChild(rendererElement);
              console.log('✅ レンダラーDOM要素削除成功');
            } else if (isStillInDOM && rendererElement.remove) {
              // 親ノード関係が不正確だが要素が存在する場合
              console.log('🧹 element.remove()方式でレンダラー削除実行中...');
              rendererElement.remove();
              console.log('✅ レンダラーDOM要素削除成功（removeメソッド使用）');
            } else {
              console.log('ℹ️ レンダラーDOM要素削除スキップ（既に削除済みまたは別の親）');
            }
          } catch (error) {
            console.error('❌ レンダラーDOM削除エラー:', {
              error,
              containerState: {
                exists: !!container,
                children: container?.children.length
              },
              rendererState: {
                exists: !!rendererElement,
                parent: rendererElement?.parentNode?.tagName,
                connected: rendererElement?.isConnected
              }
            });
          }
        }
        
        // レンダラーリソースの破棄
        try {
          rendererRef.current.dispose();
          console.log('✅ レンダラー破棄成功');
        } catch (error) {
          console.warn('⚠️ レンダラー破棄エラー:', error);
        }
        
        rendererRef.current = null;
      }
      
      // シーンのクリーンアップ
      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
      
      // VRM参照のクリアup
      vrmRef.current = null;
    };
    
    return cleanup;
  }, [photoFeatures]);

  // VRMに顔特徴を適用
  const applyFaceBlendShapesToVRM = useCallback((vrm: any, faceFeatures: FaceFeatures) => {
    if (!vrm || !faceFeatures) return;

    // BlendShape値を計算
    const converter = new BlendShapeConverter(blendShapeConfig);
    const blendShapeValues = converter.convertFaceFeaturesToBlendShapes(faceFeatures);

    const scene = vrm.scene || vrm;
    if (scene && scene.traverse && blendShapeValues) {
      scene.traverse((object: any) => {
        if (object.isSkinnedMesh && object.morphTargetDictionary) {
          Object.entries(blendShapeValues).forEach(([shapeName, value]) => {
            const shapeIndex = object.morphTargetDictionary[shapeName];
            if (shapeIndex !== undefined && object.morphTargetInfluences) {
              const clampedValue = Math.max(0, Math.min(1, (value + 1) / 2));
              object.morphTargetInfluences[shapeIndex] = clampedValue;
              console.log(`🎭 プレビュー顔特徴適用: ${shapeName} = ${clampedValue.toFixed(3)}`);
            }
          });
        }
      });
    }
  }, [blendShapeConfig]);

  // photoFeatures変更監視とVRMプレビュー初期化（クリーンアップ対応）
  useEffect(() => {
    console.log('📊 photoFeatures状態変化:', {
      hasFeatures: !!photoFeatures,
      features: photoFeatures,
      vrmLoaded,
      hasContainer: !!previewContainerRef.current,
      isInitializing: initializingRef.current
    });
    
    // 重複初期化を防止
    if (initializingRef.current) {
      console.log('🚫 VRMプレビュー初期化スキップ（既に初期化中）');
      return;
    }
    
    // photoFeaturesが設定されてVRMがまだロードされていない場合にプレビューを初期化
    if (photoFeatures && !vrmLoaded && previewContainerRef.current) {
      console.log('🚀 VRMプレビュー初期化トリガー');
      initializingRef.current = true;
      
      const initializeAndCleanup = async () => {
        try {
          // 既存のクリーンアップ関数があれば実行
          if (cleanupRef.current) {
            console.log('🧹 既存VRMプレビューをクリーンアップ');
            cleanupRef.current();
            cleanupRef.current = null;
          }
          
          // 新しいVRMプレビューを初期化
          const cleanup = await initializeVRMPreview();
          cleanupRef.current = cleanup;
          
        } catch (error) {
          console.error('❌ VRMプレビュー初期化エラー:', error);
        } finally {
          initializingRef.current = false;
        }
      };
      
      initializeAndCleanup();
    }
    
    // エフェクトのクリーンアップ
    return () => {
      if (cleanupRef.current) {
        console.log('🧹 useEffect クリーンアップ実行');
        cleanupRef.current();
        cleanupRef.current = null;
      }
      initializingRef.current = false;
    };
  }, [photoFeatures, vrmLoaded, initializeVRMPreview]);

  // アバター作成完了
  const handleCompleteAnalysis = useCallback(() => {
    if (!photoFeatures) return;

    // BlendShape値を計算
    const converter = new BlendShapeConverter(blendShapeConfig);
    const blendShapeValues = converter.convertFaceFeaturesToBlendShapes(photoFeatures);

    // ローカルストレージに保存
    const faceData = createFaceFeatureData(photoFeatures, blendShapeValues, uploadedImage || undefined);
    saveFaceFeatures(faceData);

    // メイン画面に戻る
    router.push('/');
  }, [photoFeatures, uploadedImage, router, blendShapeConfig]);

  // コンポーネント初期化ログ（初回のみ）
  useEffect(() => {
    console.log('🎬 FaceAnalysisContent コンポーネント初期化');
  }, []);
  
  // SSR時またはマウント前は何も表示しない
  if (!isClient || !mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p>初期化中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            写真からアバターを作成
          </h1>
          <p className="text-gray-600">
            写真をアップロードして顔特徴を解析し、あなた専用のVRMアバターを作成します
          </p>
        </div>

        {/* 初期化プログレス */}
        {initProgress < 100 && (
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-center mb-4">
                <div className="text-lg font-semibold text-gray-700">{status}</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${initProgress}%` }}
                ></div>
              </div>
              <div className="text-center mt-2 text-sm text-gray-600">
                {initProgress}%
              </div>
            </div>
          </div>
        )}

        {faceLandmarkerImage && (
          <>
            <div className="text-center mb-8">
              <div className={`inline-block px-6 py-3 rounded-full text-lg font-semibold ${
                status.includes('❌') ? 'bg-red-100 text-red-700' : 
                status.includes('✅') ? 'bg-green-100 text-green-700' : 
                'bg-blue-100 text-blue-700'
              }`}>
                {status}
              </div>
            </div>

            {/* 写真アップロード */}
            <div className="mb-8">
              <div className="text-center mb-6">
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
                  className="px-10 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-xl font-bold text-lg disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  {isAnalyzing ? '🔄 解析中...' : '📁 写真を選択してアップロード'}
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  JPG, PNG, GIF, WebP対応 / 最大10MB
                </p>
              </div>

              {uploadedImage && (
                <div className="flex justify-center mb-6">
                  <div className="relative max-w-2xl">
                    {!photoFeatures && (
                      <div className="relative">
                        <img
                          src={uploadedImage}
                          alt="アップロードされた画像"
                          className="border-4 border-gray-300 rounded-lg shadow-xl max-w-full h-auto"
                          style={{ maxHeight: '500px' }}
                        />
                        {!isAnalyzing && (
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                            <button
                              onClick={startAnalysis}
                              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                            >
                              🔍 顔解析を開始
                            </button>
                          </div>
                        )}
                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center">
                            <div className="bg-white bg-opacity-95 px-6 py-4 rounded-lg text-gray-700 font-semibold max-w-sm w-full mx-4">
                              <div className="text-center mb-3">
                                <div className="text-lg mb-1">🔄 解析中...</div>
                                <div className="text-sm text-gray-600">{analysisStep}</div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                                  style={{ width: `${analysisProgress}%` }}
                                ></div>
                              </div>
                              <div className="text-center mt-2 text-sm text-gray-600">
                                {analysisProgress}%
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 解析結果 */}
            {photoFeatures && (
              <div className="bg-white rounded-2xl p-8 mb-8 shadow-xl">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">🎯 顔特徴解析完了</h2>
                <div className="text-center mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-green-800 font-semibold">
                      ✅ 顔特徴の解析が完了しました！
                    </p>
                    <p className="text-green-700 text-sm mt-1">
                      この情報を使ってあなた専用のVRMアバターを作成します
                    </p>
                  </div>
                  
                  {/* アバタープレビューエリア */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-700">👤 アバタープレビュー</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* 左側: VRMプレビュー */}
                      <div>
                        <div className="bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                          <div ref={previewContainerRef} className="w-full" style={{ height: '400px' }}>
                            {!vrmLoaded && (
                              <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
                                  <p>アバターを読み込み中...</p>
                                  {vrmLoadError && (
                                    <p className="text-red-600 text-xs mt-2">エラー: {vrmLoadError}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          解析した顔特徴がアバターに適用されたプレビューです
                        </p>
                      </div>
                      
                      {/* 右側: 特徴量詳細 */}
                      <div>
                        <h4 className="text-md font-semibold mb-3 text-gray-700">📊 解析された顔特徴</h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                          {/* 目の特徴 */}
                          <div className="border-b pb-2">
                            <h5 className="font-medium text-sm text-blue-700 mb-1">👁️ 目の特徴</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>幅:</span>
                                <span className="font-mono">{(photoFeatures.eyeWidth * 100).toFixed(1)}mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span>高さ:</span>
                                <span className="font-mono">{(photoFeatures.eyeHeight * 100).toFixed(1)}mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span>縦横比:</span>
                                <span className="font-mono">{photoFeatures.eyeAspectRatio.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>傾斜角:</span>
                                <span className="font-mono">{photoFeatures.eyeSlantAngle.toFixed(1)}°</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 眉の特徴 */}
                          <div className="border-b pb-2">
                            <h5 className="font-medium text-sm text-green-700 mb-1">👁️‍🗨️ 眉の特徴</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>高さ:</span>
                                <span className="font-mono">{(photoFeatures.browHeight * 100).toFixed(1)}mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span>角度:</span>
                                <span className="font-mono">{photoFeatures.browAngle.toFixed(1)}°</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 鼻の特徴 */}
                          <div className="border-b pb-2">
                            <h5 className="font-medium text-sm text-orange-700 mb-1">👃 鼻の特徴</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>幅:</span>
                                <span className="font-mono">{(photoFeatures.noseWidth * 100).toFixed(1)}mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span>高さ:</span>
                                <span className="font-mono">{(photoFeatures.noseHeight * 100).toFixed(1)}mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span>突出度:</span>
                                <span className="font-mono">{(photoFeatures.noseProjection * 100).toFixed(1)}mm</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 口の特徴 */}
                          <div className="border-b pb-2">
                            <h5 className="font-medium text-sm text-red-700 mb-1">👄 口・唇の特徴</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>口幅:</span>
                                <span className="font-mono">{(photoFeatures.mouthWidth * 100).toFixed(1)}mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span>口高:</span>
                                <span className="font-mono">{(photoFeatures.mouthHeight * 100).toFixed(1)}mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span>唇厚:</span>
                                <span className="font-mono">{(photoFeatures.lipThickness * 100).toFixed(1)}mm</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 顔全体の特徴 */}
                          <div className="border-b pb-2">
                            <h5 className="font-medium text-sm text-purple-700 mb-1">🎭 顔全体の特徴</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>縦横比:</span>
                                <span className="font-mono">{photoFeatures.faceAspectRatio.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>顎の鋭さ:</span>
                                <span className="font-mono">{photoFeatures.jawSharpness.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>頬の丸み:</span>
                                <span className="font-mono">{photoFeatures.cheekFullness.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>目間距離:</span>
                                <span className="font-mono">{(photoFeatures.interocularDistance * 100).toFixed(1)}mm</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 処理時間 */}
                          <div className="pt-2">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>⏱️ 解析時間:</span>
                              <span className="font-mono">{photoFeatures.processingTime.toFixed(0)}ms</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => router.push('/')}
                      className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleCompleteAnalysis}
                      className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
                    >
                      このデータでアバターを作成
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// クライアントサイドのみでレンダリングするコンポーネント
const ClientOnlyFaceAnalysis = dynamic(() => Promise.resolve(FaceAnalysisContent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
        <p>読み込み中...</p>
      </div>
    </div>
  )
});

export default function FaceAnalysisPage() {
  return <ClientOnlyFaceAnalysis />;
}