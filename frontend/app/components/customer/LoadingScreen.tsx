interface LoadingScreenProps {
  title: string;
  subtitle?: string;
  hideBottomNav?: boolean;
}

export default function LoadingScreen({ title, subtitle, hideBottomNav = false }: LoadingScreenProps) {
  return (
    <>
      {hideBottomNav && (
        <style jsx global>{`
          nav[class*="fixed bottom-0"] {
            display: none !important;
          }
        `}</style>
      )}
      <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center overflow-hidden z-50">
        <div className="text-center">
          {/* Loading Animation */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>

          {/* Loading Text */}
          <p className="text-white text-lg font-medium">{title}</p>
          {subtitle && <p className="text-gray-400 text-sm mt-2">{subtitle}</p>}
        </div>
      </div>
    </>
  );
}
