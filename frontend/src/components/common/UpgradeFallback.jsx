import React from 'react';
import { FiLock, FiStar } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function UpgradeFallback({ title, message, requiredPlan = 'PREMIUM' }) {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-[60vh] min-h-[400px] flex items-center justify-center rounded-2xl overflow-hidden bg-secondary-900 border border-secondary-800">
      {/* Blurred background mockup representation */}
      <div className="absolute inset-0 opacity-10 pointer-events-none filter blur-sm bg-gradient-to-br from-primary-900 to-secondary-900">
        {/* Decorative elements representing locked content */}
        <div className="h-full w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-800/30 via-transparent to-transparent"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-md bg-secondary-800/80 backdrop-blur-md rounded-2xl border border-secondary-700 shadow-2xl animate-fade-in-up">
        <div className="w-16 h-16 bg-primary-500/20 text-primary-400 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
          <FiLock size={28} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3">
          {title || "Module Locked"}
        </h2>
        
        <p className="text-secondary-300 text-sm mb-8 leading-relaxed">
          {message || `This module requires the ${requiredPlan} tier. Upgrade your school's subscription plan to unlock advanced features and powerful analytics.`}
        </p>

        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-medium rounded-xl hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/25"
        >
          <FiStar />
          <span>Upgrade to {requiredPlan}</span>
        </button>
      </div>
    </div>
  );
}
