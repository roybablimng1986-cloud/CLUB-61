
import React from 'react';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { View } from '../types';
import { getGameStats } from '../services/mockFirebase';

interface StatsProps {
    setView: (view: View) => void;
}

const GameStatistics: React.FC<StatsProps> = ({ setView }) => {
    const stats = getGameStats();

    return (
        <div className="bg-[#0f172a] min-h-screen font-sans">
            <div className="bg-[#1e293b] p-4 flex items-center gap-4 border-b border-slate-700">
                <button onClick={() => setView('ACCOUNT')}><ArrowLeft className="text-white" /></button>
                <h1 className="text-lg font-bold text-white">Game Statistics</h1>
            </div>

            <div className="p-4">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white mb-6 shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <BarChart2 className="text-purple-200" />
                        <h2 className="font-bold text-lg">Performance Summary</h2>
                    </div>
                    <p className="text-sm text-purple-100 opacity-80">Track your betting performance across all games.</p>
                </div>

                <div className="space-y-3">
                    {stats.length > 0 ? stats.map((item, idx) => (
                        <div key={idx} className="bg-[#1e293b] rounded-xl p-4 border border-slate-700/50">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                                <h3 className="font-bold text-white text-lg">{item.name}</h3>
                                <span className={`text-xs px-2 py-1 rounded font-bold ${item.profit >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {item.profit >= 0 ? 'PROFIT' : 'LOSS'}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 text-center gap-2">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase">Total Bet</p>
                                    <p className="text-white font-bold">₹{item.bet}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase">Total Win</p>
                                    <p className="text-green-500 font-bold">₹{item.win}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase">Net P/L</p>
                                    <p className={`font-bold ${item.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {item.profit >= 0 ? '+' : ''}₹{item.profit}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center text-slate-500 py-10">No game data available yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GameStatistics;
