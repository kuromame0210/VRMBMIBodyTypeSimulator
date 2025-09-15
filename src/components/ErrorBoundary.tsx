'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // エラーが発生した時に状態を更新
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-red-50 border border-red-200 rounded-lg p-6 flex flex-col items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-6xl">😵</div>
            <h2 className="text-xl font-bold text-red-800">VRMViewer エラー</h2>
            <p className="text-red-600 text-sm max-w-md">
              3Dアバターの表示でエラーが発生しました。ページをリロードしてお試しください。
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="bg-red-100 border border-red-300 rounded p-3 text-left text-xs">
                <summary className="cursor-pointer font-semibold text-red-700">
                  詳細エラー情報（開発環境のみ）
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <strong>エラー:</strong>
                    <pre className="text-red-800 whitespace-pre-wrap">
                      {this.state.error.message}
                    </pre>
                  </div>
                  <div>
                    <strong>スタックトレース:</strong>
                    <pre className="text-red-800 whitespace-pre-wrap text-xs overflow-auto max-h-32">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>React コンポーネントスタック:</strong>
                      <pre className="text-red-800 whitespace-pre-wrap text-xs overflow-auto max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                ページをリロード
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                再試行
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}