'use client';

import { useRouter } from 'next/navigation';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/avatar-select');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              VRM BMI体型シミュレーター
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              12体のアバターから選んで、BMI変化をリアルタイムで体験しよう
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👤</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">アバター選択</h3>
              <p className="text-sm text-gray-600">12体の個性豊かなアバターから選択</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">BMI計算</h3>
              <p className="text-sm text-gray-600">身長・体重からBMIを自動計算</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎭</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">体型変化</h3>
              <p className="text-sm text-gray-600">3D表示でリアルな体型変化を確認</p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleStart}
              className="w-full bg-blue-600 text-white py-4 px-8 rounded-xl hover:bg-blue-700 transition-colors font-bold text-lg shadow-lg hover:shadow-xl"
            >
              アバターを選んで始める
            </button>
            
            <div className="text-sm text-gray-500">
              ※ 12体のアバターには男性3体、女性9体（BMI段階別）が含まれています
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}