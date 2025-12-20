import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { UserProfile, View } from '../types';
import { setWithdrawalPassword } from '../services/mockFirebase';

const SafetyCenter: React.FC<{ setView: (v: View) => void; user: UserProfile }> = ({ setView, user }) => {
    const [pin, setPin] = useState('');
    const save = () => { if(pin.length===6) setWithdrawalPassword(pin); };
    return (
        <div className="bg-[#0f172a] min-h-screen text-white p-4">
            <div className="flex gap-4 mb-6"><button onClick={()=>setView('ACCOUNT')}><ArrowLeft/></button><h1 className="font-bold">Safety</h1></div>
            <div className="bg-[#1e293b] p-4 rounded-xl">
                <h3 className="mb-4 font-bold">Withdrawal Password</h3>
                {user.withdrawalPassword ? <div className="text-green-500">Already Set</div> : (
                    <><input type="password" maxLength={6} placeholder="6 Digit PIN" value={pin} onChange={e=>setPin(e.target.value)} className="w-full bg-slate-900 p-3 rounded mb-4 text-center tracking-widest"/><button onClick={save} className="w-full bg-blue-600 py-3 rounded">Save</button></>
                )}
            </div>
        </div>
    );
};
export default SafetyCenter;