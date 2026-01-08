
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';

interface VaultPINOverlayProps {
    correctPin: string;
    onUnlock: () => void;
    onCancel: () => void;
    isSettingUp?: boolean;
    onSetPin?: (pin: string) => void;
}

const VaultPINOverlay: React.FC<VaultPINOverlayProps> = ({ correctPin, onUnlock, onCancel, isSettingUp = false, onSetPin }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const handleKeyPress = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
            setError(false);
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };

    useEffect(() => {
        if (pin.length === 4) {
            if (isSettingUp) {
                if (onSetPin) onSetPin(pin);
            } else {
                if (pin === correctPin) {
                    onUnlock();
                } else {
                    setError(true);
                    setAttempts(prev => prev + 1);
                    setTimeout(() => setPin(''), 500);
                }
            }
        }
    }, [pin, correctPin, onUnlock, isSettingUp, onSetPin]);

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-500">
            <div className="w-80 glass border border-indigo-500/30 p-8 rounded-[40px] shadow-2xl shadow-indigo-500/10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 animate-pulse">
                    {ICONS.Vault}
                </div>

                <h2 className="text-xl font-bold text-white mb-1 uppercase tracking-tight text-center">
                    {isSettingUp ? 'Set Vault PIN' : 'Vault Locked'}
                </h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8 text-center">
                    {isSettingUp ? 'Secure your data chamber' : 'Bio-Signature Required'}
                </p>

                <div className="flex gap-4 mb-10">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin.length > i
                                    ? 'bg-indigo-500 border-indigo-400 scale-110 shadow-lg shadow-indigo-500/40'
                                    : error && pin.length === 0 ? 'bg-rose-500 border-rose-400 animate-shake' : 'border-slate-700 bg-slate-900/50'
                                }`}
                        ></div>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleKeyPress(num)}
                            className="w-14 h-14 rounded-2xl bg-slate-900/50 border border-slate-700/50 text-white font-bold text-lg hover:bg-indigo-500/20 hover:border-indigo-500/40 active:scale-90 transition-all"
                        >
                            {num}
                        </button>
                    ))}
                    <div className="w-14 h-14"></div>
                    <button
                        onClick={() => handleKeyPress('0')}
                        className="w-14 h-14 rounded-2xl bg-slate-900/50 border border-slate-700/50 text-white font-bold text-lg hover:bg-indigo-500/20 hover:border-indigo-500/40 active:scale-90 transition-all"
                    >
                        0
                    </button>
                    <button
                        onClick={handleBackspace}
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-slate-500 hover:text-white active:scale-90 transition-all"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" /></svg>
                    </button>
                </div>

                <button
                    onClick={onCancel}
                    className="text-[10px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
                >
                    Cancel Protocol
                </button>

                {error && (
                    <p className="mt-4 text-[10px] font-bold text-rose-500 uppercase animate-pulse">
                        Unauthorized Access Attempt
                    </p>
                )}
            </div>
        </div>
    );
};

export default VaultPINOverlay;
