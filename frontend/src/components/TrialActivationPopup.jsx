import React from 'react';

const TrialActivationPopup = ({ isOpen, onClose, daysRemaining }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.3s ease-in' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.3s ease-in' }}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 z-10"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          style={{ 
            fontSize: '20px', 
            lineHeight: '1', 
            border: 'none', 
            background: 'transparent', 
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ✕
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div style={{ fontSize: '48px' }}>
            🎉
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Your Free Trial Has Started!
        </h2>

        {/* Message */}
        <p className="text-gray-700 text-center text-lg mb-6">
          Your free trial expires in <strong className="text-emerald-600">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>
        </p>

        {/* Button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-lg font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default TrialActivationPopup;

