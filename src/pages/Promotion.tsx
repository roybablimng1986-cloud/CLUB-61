import React, { useState } from 'react';
import { redeemGiftCode } from '../services/mockFirebase';
const Promotion: React.FC = () => {
    const [code, setCode] = useState('');
    const redeem = async () => { const amt = await redeemGiftCode(code); if(amt>0) alert(`Received ₹${amt}`); else alert('Invalid'); };
    return (
        <div className="bg-[#0f172a] min-h-screen text-white p-4 pb-20">
            <h1 className="text-center font-bold mb-6">Gift Code</h1>
            <div className="bg-[#1e293b] p-6 rounded-xl">
                <input type="text" value={code} onChange={e=>setCode(e.target.value)} placeholder="Enter Code" className="w-full bg-slate-900 p-4 rounded-xl mb-4 border border-slate-700"/>
                <button onClick={redeem} className="w-full bg-blue-600 py-4 rounded-xl font-bold">Redeem</button>
            </div>
        </div>
    );
};
export default Promotion;