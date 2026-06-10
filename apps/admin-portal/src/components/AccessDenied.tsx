import React from 'react';

interface AccessDeniedProps {
  title: string;
  message: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}

// A reusable, premium‑styled access‑denied card.
export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title,
  message,
  buttonLabel = 'Go Back',
  onButtonClick,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl w-full max-w-md p-8 text-center text-white">
        <div className="w-16 h-16 bg-rose-200/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🚫</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-gray-300 text-sm mb-8">{message}</p>
        {onButtonClick && (
          <button
            onClick={onButtonClick}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-md transition-colors"
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
};
