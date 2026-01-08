
import React from 'react';

const AssistantPulse: React.FC<{ isScanning: boolean }> = ({ isScanning }) => {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Outer Glow */}
      <div className={`absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl transition-all duration-1000 ${isScanning ? 'scale-125 opacity-40' : 'scale-100 opacity-20'}`}></div>
      
      {/* Rotating Ring */}
      <div className={`absolute inset-0 border-2 border-dashed border-indigo-500/30 rounded-full ${isScanning ? 'animate-[spin_4s_linear_infinite]' : ''}`}></div>
      
      {/* Inner Circles */}
      <div className={`relative w-24 h-24 rounded-full glass flex items-center justify-center shadow-inner overflow-hidden border-indigo-500/40`}>
        <div className={`absolute w-full h-full bg-gradient-to-tr from-indigo-600/20 to-violet-600/20 ${isScanning ? 'animate-pulse' : ''}`}></div>
        <div className="z-10 text-indigo-400">
          <svg className={`w-12 h-12 ${isScanning ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AssistantPulse;
