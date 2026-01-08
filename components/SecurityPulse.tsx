
import React from 'react';
import { ICONS } from '../constants';

interface PulsePoint {
    date: string;
    score: number;
    threats: number;
}

interface SecurityPulseProps {
    history: PulsePoint[];
}

const SecurityPulse: React.FC<SecurityPulseProps> = ({ history }) => {
    // Simple SVG Line Chart Logic
    const maxScore = 100;
    const chartHeight = 100;
    const chartWidth = 400;

    const points = history.map((p, i) => {
        const x = (i / (history.length - 1)) * chartWidth;
        const y = chartHeight - (p.score / maxScore) * chartHeight;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="glass rounded-3xl border border-slate-700/50 p-6 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Security Pulse</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-black">Heuristic Performance</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-black leading-none mb-1">Total Blocked</p>
                        <p className="text-sm font-mono text-indigo-400 font-bold">{history.reduce((acc, p) => acc + p.threats, 0)}</p>
                    </div>
                    <div className="text-right border-l border-slate-800 pl-4">
                        <p className="text-[10px] text-slate-500 uppercase font-black leading-none mb-1">Avg Score</p>
                        <p className="text-sm font-mono text-emerald-400 font-bold">{(history.reduce((acc, p) => acc + p.score, 0) / history.length).toFixed(0)}%</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative mt-4">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    {/* Grid Lines */}
                    <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#1e293b" strokeWidth="1" strokeDasharray="4" />
                    <line x1="0" y1="50" x2={chartWidth} y2="50" stroke="#1e293b" strokeWidth="1" strokeDasharray="4" />
                    <line x1="0" y1="100" x2={chartWidth} y2="100" stroke="#1e293b" strokeWidth="1" strokeDasharray="4" />

                    {/* Area under line */}
                    <path
                        d={`M0,${chartHeight} L${points} L${chartWidth},${chartHeight} Z`}
                        fill="url(#pulseGradient)"
                        className="opacity-20 translate-y-2 animate-in fade-in duration-1000"
                    />

                    {/* The Pulse Line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                    />

                    {/* Markers */}
                    {history.map((p, i) => {
                        const x = (i / (history.length - 1)) * chartWidth;
                        const y = chartHeight - (p.score / maxScore) * chartHeight;
                        return (
                            <circle
                                key={i}
                                cx={x} cy={y} r="4"
                                className={`${p.threats > 0 ? 'fill-rose-500 stroke-white' : 'fill-indigo-500 stroke-slate-950'} stroke-2 hover:r-6 transition-all cursor-pointer`}
                            />
                        );
                    })}

                    <defs>
                        <linearGradient id="pulseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Labels */}
                <div className="flex justify-between mt-4">
                    {history.map((p, i) => (
                        <span key={i} className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">
                            {new Date(p.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                    ))}
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Real-time Sentinel Active</span>
                </div>
                <button className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors">
                    View Detail Log
                </button>
            </div>
        </div>
    );
};

export default SecurityPulse;
