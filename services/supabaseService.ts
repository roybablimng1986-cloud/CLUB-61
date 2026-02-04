
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, set, get, update, onValue, push, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';
import { UserProfile, WinGoHistory, WinGoGameState, Transaction, GameHistoryItem, ReferralData, SubordinateItem, CommissionItem, AviatorState, DragonTigerState, ChatMessage, GiftCode, AppSettings } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyC2__mUFeMJPeAZNORn81_wcHVNxXBvGFo",
  authDomain: "mafiaclubnew.firebaseapp.com",
  databaseURL: "https://mafiaclubnew-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mafiaclubnew",
  storageBucket: "mafiaclubnew.firebasestorage.app",
  messagingSenderId: "844756298400",
  appId: "1:844756298400:web:037c6e2629a5aa19b837c5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Helper for handling Firebase Permission/Connectivity errors
const handleFirebaseError = (error: any, context: string) => {
    console.error(`Firebase Error [${context}]:`, error.message);
    if (error.message.includes('PERMISSION_DENIED')) {
        console.warn(`Permission Denied for ${context}. Ensure Firebase Rules allow access to this path.`);
    }
};

// AUDIO SYSTEM
let isMuted = false;
const sounds = {
  click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
  win: new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'),
  loss: new Audio('https://assets.mixkit.co/active_storage/sfx/203/203-preview.mp3'),
  wingo_tick: new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'),
  wingo_draw: new Audio('https://assets.mixkit.co/active_storage/sfx/1004/1004-preview.mp3'),
  plane_engine: new Audio('https://assets.mixkit.co/active_storage/sfx/1547/1547-preview.mp3'),
  plane_crash: new Audio('https://assets.mixkit.co/active_storage/sfx/2536/2536-preview.mp3'),
  dt_card: new Audio('https://assets.mixkit.co/active_storage/sfx/1557/1557-preview.mp3'),
  wheel_spin: new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'),
  race_rev: new Audio('https://assets.mixkit.co/active_storage/sfx/1572/1572-preview.mp3'),
  slot_reel: new Audio('https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3'),
  mine_bomb: new Audio('https://assets.mixkit.co/active_storage/sfx/2536/2536-preview.mp3'),
  mine_reveal: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
  dt_draw: new Audio('https://assets.mixkit.co/active_storage/sfx/1004/1004-preview.mp3'),
  tower_step: new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'),
  sports_kick: new Audio('https://assets.mixkit.co/active_storage/sfx/1572/1572-preview.mp3'),
};

export const toggleMute = () => { isMuted = !isMuted; if (isMuted) stopAllSounds(); return isMuted; };
export const getMuteStatus = () => isMuted;
export const playSound = (type: keyof typeof sounds) => {
  if (isMuted) return;
  try { const audio = sounds[type]; if (audio) { audio.currentTime = 0; audio.volume = 0.5; audio.play().catch(() => {}); } } catch (e) {}
};
export const stopAllSounds = () => { Object.values(sounds).forEach(audio => { audio.pause(); audio.currentTime = 0; }); };

let localGameHistory: GameHistoryItem[] = [];
let currentUser: UserProfile | null = null;
const balanceSubscribers: ((user: UserProfile | null) => void)[] = [];
export let referralStats: ReferralData = { code: '', link: '', totalCommission: 0, yesterdayCommission: 0, directSubordinates: 0, teamSubordinates: 0, totalDepositAmount: 0, totalBetAmount: 0 };

const notifySubscribers = () => {
    balanceSubscribers.forEach(cb => cb(currentUser ? { ...currentUser } : null));
};

const initSession = () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userRef = ref(db, `users/${user.uid}`);
            onValue(userRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    currentUser = {
                        ...data,
                        uid: user.uid,
                        balance: Number(data.balance) || 0,
                        email: user.email || data.email,
                    };
                    calculateReferralStats(currentUser!.inviteCode);
                    notifySubscribers();
                }
            }, (err) => handleFirebaseError(err, 'User Profile Listener'));

            const historyRef = ref(db, `game_history/${user.uid}`);
            onValue(historyRef, (snapshot) => {
                const val = snapshot.val();
                localGameHistory = val ? Object.entries(val).map(([id, h]: any) => ({ id, ...h })).reverse() : [];
            }, (err) => handleFirebaseError(err, 'Game History Listener'));
        } else {
            currentUser = null;
            localGameHistory = [];
            notifySubscribers();
        }
    });
};

export const logout = async () => { try { await signOut(auth); } catch (e) { handleFirebaseError(e, 'Logout'); } };

export const subscribeToBalance = (cb: (user: UserProfile | null) => void) => {
    balanceSubscribers.push(cb);
    cb(currentUser);
    return () => {
        const idx = balanceSubscribers.indexOf(cb);
        if (idx > -1) balanceSubscribers.splice(idx, 1);
    };
};

export const updateBalance = async (amount: number, type: Transaction['type'] = 'BET', desc: string = 'Game Action') => {
    if (!currentUser) return;
    try {
        const userRef = ref(db, `users/${currentUser.uid}`);
        const newBalance = (currentUser.balance || 0) + amount;
        const updates: any = { balance: newBalance };
        
        if (amount < 0) {
            updates.totalBet = (currentUser.totalBet || 0) + Math.abs(amount);
            updates.wagerRequired = Math.max(0, (currentUser.wagerRequired || 0) - Math.abs(amount));
        } else if (type === 'BONUS' || type === 'GIFT' || type === 'DEPOSIT') {
            const multiplier = (type === 'GIFT' || type === 'BONUS') ? 5.4 : 1.0;
            const addedWager = amount * multiplier;
            updates.wagerRequired = (currentUser.wagerRequired || 0) + addedWager;
            updates.wagerTotal = (currentUser.wagerTotal || (currentUser.wagerRequired || 0)) + addedWager;
        }
        
        await update(userRef, updates);
        const txRef = ref(db, `transactions/${currentUser.uid}`);
        await push(txRef, { type, amount: Math.abs(amount), status: 'SUCCESS', desc, date: new Date().toLocaleString(), timestamp: serverTimestamp() });
    } catch (e) {
        handleFirebaseError(e, 'Update Balance');
    }
};

export const addGameHistory = async (game: string, bet: number, win: number, details: string) => {
    if (!currentUser) return;
    try {
        const historyRef = ref(db, `game_history/${currentUser.uid}`);
        await push(historyRef, {
            game, amount: bet, win, details, date: new Date().toLocaleString(), timestamp: serverTimestamp()
        });
    } catch (e) {
        handleFirebaseError(e, 'Add Game History');
    }
};

export const login = async (phone: string, email: string, pass: string) => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const register = async (phone: string, email: string, pass: string, inviteCode: string, username: string) => {
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        const uid = res.user.uid;
        const newUser: UserProfile = {
            uid, phone, email, username, name: username, balance: 0, vipLevel: 0, totalDeposit: 0, totalBet: 0,
            inviteCode: Math.floor(100000 + Math.random() * 900000).toString(),
            invitedBy: inviteCode || '', wagerRequired: 0, wagerTotal: 0, rebateLastClaimedBet: 0,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        };
        await set(ref(db, `users/${uid}`), newUser);
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const submitDepositRequest = async (amount: number, method: string, utr: string) => {
    if (!currentUser) return;
    try {
        const txRef = ref(db, `transactions/${currentUser.uid}`);
        await push(txRef, {
            type: 'DEPOSIT', amount, status: 'PROCESSING', method, utr,
            desc: `Refill via ${method}`, date: new Date().toLocaleString(), timestamp: serverTimestamp()
        });
    } catch (e) {
        handleFirebaseError(e, 'Submit Deposit');
    }
};

export const handleWithdraw = async (amount: number, method: string, password: string, details: any) => {
    if (!currentUser) return { success: false, message: 'Not logged in' };
    if (currentUser.withdrawalPassword !== password) return { success: false, message: 'Invalid PIN' };
    if (currentUser.balance < amount) return { success: false, message: 'Insufficient balance' };
    if ((currentUser.wagerRequired || 0) > 0) return { success: false, message: 'Turnover incomplete' };

    try {
        const remainingBalance = currentUser.balance - amount;
        const userRef = ref(db, `users/${currentUser.uid}`);
        const newWagerRequired = remainingBalance >= 1 ? remainingBalance : 0;
        
        await update(userRef, { 
            balance: remainingBalance,
            wagerRequired: newWagerRequired,
            wagerTotal: newWagerRequired
        });

        const txRef = ref(db, `transactions/${currentUser.uid}`);
        await push(txRef, {
            type: 'WITHDRAW', amount, status: 'PROCESSING', method, accountDetails: details,
            desc: `Withdraw via ${method}`, date: new Date().toLocaleString(), timestamp: serverTimestamp()
        });
        return { success: true, message: 'Request submitted' };
    } catch (e) {
        handleFirebaseError(e, 'Handle Withdraw');
        return { success: false, message: 'Database error' };
    }
};

export const shouldForceLoss = (betAmount: number, currentBalance: number) => {
    if (!currentUser) return Math.random() < 0.7;
    const wagerRemaining = currentUser.wagerRequired || 0;
    const wagerTotal = currentUser.wagerTotal || 1;
    const isNearCompletion = wagerRemaining > 0 && (wagerRemaining / wagerTotal) < 0.2;
    const lossThreshold = isNearCompletion ? 0.8 : 0.7; 
    return Math.random() < lossThreshold;
};

export const redeemGiftCode = async (code: string): Promise<number> => {
    if (!currentUser) return 0;
    try {
        const snap = await get(ref(db, `gift_codes/${code}`));
        const gift = snap.val() as GiftCode;
        if (!gift) return 0;
        if (currentUser.usedGiftCodes?.includes(code)) return -1;
        if (gift.usedCount >= gift.limit) return -2;
        await update(ref(db, `users/${currentUser.uid}`), { balance: (currentUser.balance || 0) + gift.amount, usedGiftCodes: [...(currentUser.usedGiftCodes || []), code] });
        await update(ref(db, `gift_codes/${code}`), { usedCount: gift.usedCount + 1 });
        await updateBalance(gift.amount, 'GIFT', `Gift: ${code}`);
        return gift.amount;
    } catch (e) {
        handleFirebaseError(e, 'Redeem Gift');
        return 0;
    }
};

export const claimRebate = async () => {
    if (!currentUser) return { success: false };
    try {
        const turnover = Math.max(0, (currentUser.totalBet || 0) - (currentUser.rebateLastClaimedBet || 0));
        const amount = turnover * 0.001; 
        if (amount <= 0) return { success: false, message: 'No rebate available' };
        await update(ref(db, `users/${currentUser.uid}`), { rebateLastClaimedBet: currentUser.totalBet });
        await updateBalance(amount, 'BONUS', 'Daily Rebate');
        return { success: true, amount };
    } catch (e) {
        handleFirebaseError(e, 'Claim Rebate');
        return { success: false };
    }
};

export const getGameStats = () => {
    const stats: Record<string, { bet: number, win: number }> = {};
    localGameHistory.forEach(g => {
        if (!stats[g.game]) stats[g.game] = { bet: 0, win: 0 };
        stats[g.game].bet += (Number(g.amount) || 0);
        stats[g.game].win += (Number(g.win) || 0);
    });
    return Object.entries(stats).map(([name, data]) => ({ 
        name, 
        bet: data.bet, 
        win: data.win, 
        profit: data.win - data.bet 
    }));
};

export const getGameHistory = (gameName: string, cb: (data: GameHistoryItem[]) => void) => {
    if (!currentUser) return () => {};
    const historyRef = ref(db, `game_history/${currentUser.uid}`);
    return onValue(historyRef, (s) => {
        const val = s.val(); if (!val) return cb([]);
        const list = Object.entries(val).map(([id, h]: any) => ({ id, ...h })).reverse();
        cb(gameName === 'ALL' ? list : list.filter((h: any) => h.game === gameName));
    }, (err) => handleFirebaseError(err, 'Get Game History'));
};

export const getTransactionHistory = (cb: (data: Transaction[]) => void) => {
    if (!currentUser) return () => {};
    const txRef = ref(db, `transactions/${currentUser.uid}`);
    return onValue(txRef, (s) => {
        const val = s.val(); if (!val) return cb([]);
        cb(Object.entries(val).map(([id, t]: any) => ({ id, ...t })).reverse());
    }, (err) => handleFirebaseError(err, 'Get Tx History'));
};

export const setWithdrawalPassword = async (password: string) => {
    if (!currentUser) return false;
    try {
        await update(ref(db, `users/${currentUser.uid}`), { withdrawalPassword: password });
        return true;
    } catch (e) {
        handleFirebaseError(e, 'Set Withdraw PIN');
        return false;
    }
};

// ENGINES
let winGoState: WinGoGameState = { timeLeft: 30, period: 202511261000, history: [], status: 'BETTING', lastResult: null };
const winGoSubscribers: Function[] = [];
const generateWinGoResult = (period: string): WinGoHistory => {
  const num = Math.floor(Math.random() * 10);
  let color: 'Red'|'Green'|'Violet' = num === 0 || num === 5 ? 'Violet' : [1,3,7,9].includes(num) ? 'Green' : 'Red';
  return { period, number: num, bigSmall: num >= 5 ? 'Big' : 'Small', color };
};
export const startGlobalEngines = () => {
  setInterval(() => {
    winGoState.timeLeft -= 1;
    if (winGoState.timeLeft <= 0) {
        winGoState.status = 'REVEALING';
        const res = generateWinGoResult(winGoState.period.toString());
        winGoState.lastResult = res; winGoState.history = [res, ...winGoState.history].slice(0, 50);
        winGoState.period += 1; winGoState.timeLeft = 30;
        setTimeout(() => { winGoState.status = 'BETTING'; }, 3000);
    }
    winGoSubscribers.forEach(cb => cb({ ...winGoState }));
  }, 1000);
};
export const subscribeToWinGo = (cb: (state: WinGoGameState) => void) => { winGoSubscribers.push(cb); return () => winGoSubscribers.splice(winGoSubscribers.indexOf(cb), 1); };

const calculateReferralStats = async (myCode: string) => {
    if (!myCode) return;
    try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef).catch(() => null); // Gracefully handle permission denied for reading all users
        if (!snapshot) return;
        // Cast snapshot.val() to any to fix potential unknown type inference issues
        const users = snapshot.val() as any;
        if (!users) return;
        const subs = Object.values(users).filter((u: any) => u.invitedBy === myCode);
        // Explicitly type totalDep as number to fix arithmetic operation errors on unknown type
        const totalDep: number = subs.reduce((acc: number, c: any): number => acc + (Number(c.totalDeposit) || 0), 0);
        referralStats = { 
            code: myCode, 
            link: `${window.location.origin}/#/register?code=${myCode}`, 
            totalCommission: totalDep * 0.1, 
            yesterdayCommission: totalDep * 0.05, 
            directSubordinates: subs.length, 
            teamSubordinates: subs.length, 
            totalDepositAmount: totalDep, 
            // Explicitly cast the reduce result to number to fix assignment to totalBetAmount
            totalBetAmount: subs.reduce((acc: number, c: any): number => acc + (Number(c.totalBet) || 0), 0) 
        };
    } catch (e) {
        handleFirebaseError(e, 'Calc Referral Stats');
    }
};

// COMPONENT EXPORTS
export const subscribeToAviator = (cb: (state: AviatorState) => void) => {
    const aviRef = ref(db, 'game_states/aviator');
    return onValue(aviRef, (s) => cb(s.val() || { phase: 'WAITING', multiplier: 1.0, timeLeft: 10, history: [], crashPoint: 0 }), (err) => handleFirebaseError(err, 'Aviator Sync'));
};

export const subscribeToDragonTiger = (cb: (state: DragonTigerState) => void) => {
    const dtRef = ref(db, 'game_states/dragon_tiger');
    return onValue(dtRef, (s) => cb(s.val() || { status: 'BETTING', timeLeft: 15, period: '2024001', dragonCard: null, tigerCard: null, history: [] }), (err) => handleFirebaseError(err, 'DragonTiger Sync'));
};

export const getSubordinates = (cb: (data: SubordinateItem[]) => void) => {
    const usersRef = ref(db, 'users');
    return onValue(usersRef, snapshot => {
        const users = snapshot.val(); if (!users) return cb([]);
        const subs = Object.values(users).filter((u: any) => u.invitedBy === currentUser?.inviteCode).map((u: any) => ({ id: u.uid, uid: u.uid, level: 1, depositAmount: u.totalDeposit || 0, betAmount: u.totalBet || 0, commission: (u.totalDeposit || 0) * 0.1, date: '2024-01-01' }));
        cb(subs);
    }, (err) => handleFirebaseError(err, 'Get Subordinates'));
};

export const getCommissions = (cb: (data: CommissionItem[]) => void) => {
    if (!currentUser) return;
    const txRef = ref(db, `transactions/${currentUser.uid}`);
    return onValue(txRef, snapshot => {
        const val = snapshot.val(); if (!val) return cb([]);
        cb(Object.entries(val).map(([id, t]: any) => ({ id, ...t })).filter((t: any) => t.type === 'COMMISSION').map((t: any) => ({ id: t.id, fromUid: 'System', amount: t.amount, date: t.date, type: t.desc || 'Referral' })));
    }, (err) => handleFirebaseError(err, 'Get Commissions'));
};

export const claimCommission = async () => {
    if (!currentUser || referralStats.totalCommission <= 0) return { success: false, message: 'No assets' };
    const amount = referralStats.totalCommission; await updateBalance(amount, 'BONUS', 'Commission Claim');
    return { success: true, message: amount.toFixed(2) };
};

export const bindBank = async (details: any) => { 
    if (!currentUser) return { success: false }; 
    try {
        await update(ref(db, `users/${currentUser.uid}`), { bankDetails: details, isBankBound: true }); 
        await updateBalance(10, 'BONUS', 'Bank Binding'); 
        return { success: true }; 
    } catch (e) { handleFirebaseError(e, 'Bind Bank'); return { success: false }; }
};

export const bindUpi = async (details: any) => { 
    if (!currentUser) return { success: false }; 
    try {
        await update(ref(db, `users/${currentUser.uid}`), { upiDetails: details, isUpiBound: true }); 
        await updateBalance(5, 'BONUS', 'UPI Binding'); 
        return { success: true }; 
    } catch (e) { handleFirebaseError(e, 'Bind UPI'); return { success: false }; }
};

export const joinTelegramReward = async () => { 
    if (!currentUser || currentUser.isTelegramJoined) return { success: false }; 
    try {
        await update(ref(db, `users/${currentUser.uid}`), { isTelegramJoined: true }); 
        await updateBalance(5, 'BONUS', 'Telegram Reward'); 
        return { success: true }; 
    } catch (e) { handleFirebaseError(e, 'Join Telegram'); return { success: false }; }
};

export const getLeaderboard = (cb: (data: UserProfile[]) => void) => {
    const usersRef = ref(db, 'users');
    return onValue(usersRef, s => {
        const val = s.val(); if (!val) return cb([]);
        const players = Object.entries(val).map(([uid, u]: any) => ({ ...u, uid }));
        players.sort((a, b) => (b.balance + (b.totalDeposit || 0)) - (a.balance + (a.totalDeposit || 0)));
        cb(players.slice(0, 20));
    }, (err) => handleFirebaseError(err, 'Get Leaderboard'));
};

export const subscribeToChat = (cb: (msgs: ChatMessage[]) => void) => {
    const chatRef = query(ref(db, 'chat'), limitToLast(50));
    return onValue(chatRef, s => cb(s.val() ? Object.entries(s.val()).map(([id, m]: any) => ({ id, ...m })) : []), (err) => handleFirebaseError(err, 'Chat Sync'));
};

export const sendChatMessage = async (text: string) => { 
    if (!currentUser) return; 
    try {
        await push(ref(db, 'chat'), { uid: currentUser.uid, username: currentUser.username, text, timestamp: serverTimestamp(), avatar: currentUser.avatar, vip: currentUser.vipLevel }); 
    } catch (e) { handleFirebaseError(e, 'Send Chat Message'); }
};

// ADMIN & MANAGEMENT FUNCTIONS
export const getAllUsers = (cb: (users: UserProfile[]) => void) => {
    const usersRef = ref(db, 'users');
    return onValue(usersRef, (snapshot) => {
        const val = snapshot.val();
        if (!val) return cb([]);
        cb(Object.values(val));
    }, (err) => handleFirebaseError(err, 'Admin Get All Users'));
};

export const adminUpdateUserBalance = async (uid: string, amount: number, isGift: boolean) => {
    try {
        const userRef = ref(db, `users/${uid}`);
        const snap = await get(userRef);
        const userData = snap.val();
        if (!userData) return;
        const newBalance = (Number(userData.balance) || 0) + amount;
        await update(userRef, { balance: newBalance });
        const txRef = ref(db, `transactions/${uid}`);
        await push(txRef, { type: isGift ? 'GIFT' : 'BET', amount: Math.abs(amount), status: 'SUCCESS', desc: isGift ? 'Admin Gift' : 'Admin Deduction', date: new Date().toLocaleString(), timestamp: serverTimestamp() });
    } catch (e) { handleFirebaseError(e, 'Admin Update Balance'); }
};

export const adminBlockUser = async (uid: string, isBlocked: boolean) => {
    try { await update(ref(db, `users/${uid}`), { isBlocked }); } catch (e) { handleFirebaseError(e, 'Admin Block User'); }
};

export const adminDeleteUser = async (uid: string) => {
    try {
        await set(ref(db, `users/${uid}`), null);
        await set(ref(db, `transactions/${uid}`), null);
        await set(ref(db, `game_history/${uid}`), null);
    } catch (e) { handleFirebaseError(e, 'Admin Delete User'); }
};

export const adminGetSettings = (cb: (s: AppSettings | null) => void) => {
    return onValue(ref(db, 'app_settings'), (s) => cb(s.val()), (err) => handleFirebaseError(err, 'Admin Get Settings'));
};

export const adminUpdateSettings = async (updates: Partial<AppSettings>) => {
    try { await update(ref(db, 'app_settings'), updates); } catch (e) { handleFirebaseError(e, 'Admin Update Settings'); }
};

export const adminCreateGiftCode = async (gift: GiftCode) => {
    try { await set(ref(db, `gift_codes/${gift.code}`), gift); } catch (e) { handleFirebaseError(e, 'Admin Create Gift'); }
};

export const adminGetAllGiftCodes = (cb: (codes: GiftCode[]) => void) => {
    return onValue(ref(db, 'gift_codes'), (s) => cb(s.val() ? Object.values(s.val()) : []), (err) => handleFirebaseError(err, 'Admin Get Gifts'));
};

export const getAllPendingTransactions = (cb: (requests: any[]) => void) => {
    return onValue(ref(db, 'transactions'), (snapshot) => {
        const allTxs = snapshot.val();
        if (!allTxs) return cb([]);
        const pending: any[] = [];
        Object.entries(allTxs).forEach(([uid, txs]: [string, any]) => {
            Object.entries(txs).forEach(([txId, tx]: [string, any]) => { if (tx && tx.status === 'PROCESSING') pending.push({ uid, txId, tx }); });
        });
        cb(pending);
    }, (err) => handleFirebaseError(err, 'Admin Get Pending Txs'));
};

export const approveTransaction = async (uid: string, txId: string) => {
    try {
        const txRef = ref(db, `transactions/${uid}/${txId}`);
        const snap = await get(txRef);
        const tx = snap.val();
        if (!tx || tx.status !== 'PROCESSING') return;
        await update(txRef, { status: 'SUCCESS' });
        if (tx.type === 'DEPOSIT') {
            const userRef = ref(db, `users/${uid}`);
            const userSnap = await get(userRef);
            const user = userSnap.val() as UserProfile;
            if (!user) return;
            const amount = Number(tx.amount);
            const newTotalDeposit = (Number(user.totalDeposit) || 0) + amount;
            const newBalance = (Number(user.balance) || 0) + amount;
            let newVip = Number(user.vipLevel) || 0;
            const thresholds = [500, 2000, 50000, 100000, 400000];
            thresholds.forEach((t, i) => { if (newTotalDeposit >= t) newVip = Math.max(newVip, i + 1); });
            const updates: any = { balance: newBalance, totalDeposit: newTotalDeposit, vipLevel: newVip };
            if ((Number(user.totalDeposit) || 0) === 0) {
                 const bonus = amount * 0.20;
                 await push(ref(db, `transactions/${uid}`), { type: 'BONUS', amount: bonus, status: 'SUCCESS', desc: 'First Deposit Bonus', date: new Date().toLocaleString(), timestamp: serverTimestamp() });
                 updates.balance += bonus;
            }
            await update(userRef, updates);
        }
    } catch (e) { handleFirebaseError(e, 'Approve Transaction'); }
};

export const rejectTransaction = async (uid: string, txId: string) => {
    try {
        const txRef = ref(db, `transactions/${uid}/${txId}`);
        const snap = await get(txRef);
        const tx = snap.val();
        if (!tx || tx.status !== 'PROCESSING') return;
        await update(txRef, { status: 'FAILED' });
        if (tx.type === 'WITHDRAW') {
            const userRef = ref(db, `users/${uid}`);
            const userSnap = await get(userRef);
            const user = userSnap.val();
            if (user) await update(userRef, { balance: (Number(user.balance) || 0) + Number(tx.amount) });
        }
    } catch (e) { handleFirebaseError(e, 'Reject Transaction'); }
};

initSession();
