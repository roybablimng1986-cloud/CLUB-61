import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { View } from '../types';
import { getGameStats } from '../services/mockFirebase';

const GameStatistics: React.FC<{ setView: (v: View) => void }> = ({ setView }) => {
    const stats = getGameStats();
    return (
        <div className="bg-[#0f172a] min-h-screen text-white p-4">
            <div className="flex gap-4 mb-6"><button onClick={()=>setView('ACCOUNT')}><ArrowLeft/></button><h1 className="font-bold">Stats</h1></div>
            <div className="space-y-4">{stats.map((s,i) => <div key={i} className="bg-[#1e293b] p-4 rounded-xl flex justify-between"><span>{s.name}</span><span className={s.profit>=0?'text-green-500':'text-red-500'}>{s.profit}</span></div>)}</div>
        </div>
    );
};
export default GameStatistics;