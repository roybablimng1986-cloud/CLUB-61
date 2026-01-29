
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, set, get, update, onValue, push, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';
// Added GiftCode and AppSettings to imports
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

let currentUser: UserProfile | null = null;
let gameHistory: GameHistoryItem[] = [];
let transactions: Transaction[] = [];
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
                        balance: data.balance || 0,
                        email: user.email || data.email,
                    };
                    calculateReferralStats(currentUser!.inviteCode);
                    notifySubscribers();
                }
            });
            onValue(ref(db, `game_history/${user.uid}`), (snapshot) => {
                const val = snapshot.val();
                if (val) gameHistory = Object.entries(val).map(([id, h]: [string, any]) => ({ id, ...h })).reverse();
                else gameHistory = [];
            });
            onValue(ref(db, `transactions/${user.uid}`), (snapshot) => {
                const val = snapshot.val();
                if (val) transactions = Object.entries(val).map(([id, t]: [string, any]) => ({ id, ...t })).reverse();
                else transactions = [];
            });
        } else {
            currentUser = null;
            gameHistory = [];
            transactions = [];
            notifySubscribers();
        }
    });
};

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
    const userRef = ref(db, `users/${currentUser.uid}`);
    const newBalance = (currentUser.balance || 0) + amount;
    const updates: any = { balance: newBalance };
    
    if (amount < 0) {
        updates.totalBet = (currentUser.totalBet || 0) + Math.abs(amount);
        updates.wagerRequired = Math.max(0, (currentUser.wagerRequired || 0) - Math.abs(amount));
    } else if (type === 'BONUS' || type === 'GIFT') {
        updates.wagerRequired = (currentUser.wagerRequired || 0) + (amount * 5.4);
    }
    
    await update(userRef, updates);
    const txRef = ref(db, `transactions/${currentUser.uid}`);
    await push(txRef, { type, amount: Math.abs(amount), status: 'SUCCESS', desc, date: new Date().toLocaleString(), timestamp: serverTimestamp() });
};

export const addGameHistory = async (game: string, bet: number, win: number, details: string) => {
    if (!currentUser) return;
    const historyRef = ref(db, `game_history/${currentUser.uid}`);
    await push(historyRef, {
        game,
        amount: bet,
        win,
        details,
        date: new Date().toLocaleString(),
        timestamp: serverTimestamp()
    });
};

export const getGameHistory = (game: string, cb: (data: GameHistoryItem[]) => void) => {
    if (!currentUser) {
        cb([]);
        return () => {};
    }
    const historyRef = ref(db, `game_history/${currentUser.uid}`);
    return onValue(historyRef, (snapshot) => {
        const val = snapshot.val();
        if (!val) return cb([]);
        const list = Object.entries(val).map(([id, h]: [string, any]) => ({ id, ...h })).reverse();
        if (game === 'ALL') cb(list);
        else cb(list.filter(h => h.game === game));
    });
};

export const getTransactionHistory = (cb: (data: Transaction[]) => void) => {
    if (!currentUser) {
        cb([]);
        return () => {};
    }
    const txRef = ref(db, `transactions/${currentUser.uid}`);
    return onValue(txRef, (snapshot) => {
        const val = snapshot.val();
        if (!val) return cb([]);
        cb(Object.entries(val).map(([id, t]: [string, any]) => ({ id, ...t })).reverse());
    });
};

export const claimRebate = async () => {
    if (!currentUser) return { success: false, message: 'Not logged in' };
    const rebateAmount = (currentUser.totalBet || 0) * 0.001;
    if (rebateAmount <= 0) return { success: false, message: 'No rebate available' };
    await updateBalance(rebateAmount, 'BONUS', 'Daily Rebate');
    return { success: true, amount: rebateAmount, message: 'Rebate claimed' };
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
            uid,
            phone,
            email,
            username,
            name: username,
            balance: 0,
            vipLevel: 0,
            totalDeposit: 0,
            totalBet: 0,
            inviteCode: Math.floor(100000 + Math.random() * 900000).toString(),
            invitedBy: inviteCode || '',
            wagerRequired: 0,
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
    const txRef = ref(db, `transactions/${currentUser.uid}`);
    await push(txRef, {
        type: 'DEPOSIT',
        amount,
        status: 'PROCESSING',
        method,
        utr,
        desc: `Deposit via ${method}`,
        date: new Date().toLocaleString(),
        timestamp: serverTimestamp()
    });
};

export const handleWithdraw = async (amount: number, method: string, password: string, details: any) => {
    if (!currentUser) return { success: false, message: 'Not logged in' };
    if (currentUser.withdrawalPassword !== password) return { success: false, message: 'Invalid Security PIN' };
    if (currentUser.balance < amount) return { success: false, message: 'Insufficient balance' };
    if ((currentUser.wagerRequired || 0) > 0) return { success: false, message: 'Wager requirement not met' };

    const userRef = ref(db, `users/${currentUser.uid}`);
    await update(userRef, { balance: currentUser.balance - amount });

    const txRef = ref(db, `transactions/${currentUser.uid}`);
    await push(txRef, {
        type: 'WITHDRAW',
        amount,
        status: 'PROCESSING',
        method,
        accountDetails: details,
        desc: `Withdraw via ${method}`,
        date: new Date().toLocaleString(),
        timestamp: serverTimestamp()
    });
    return { success: true, message: 'Withdrawal request submitted' };
};

export const approveTransaction = async (txId: string) => {
    if (!currentUser) return;
    const txRef = ref(db, `transactions/${currentUser.uid}/${txId}`);
    const snap = await get(txRef);
    const tx = snap.val();
    if (tx && tx.status === 'PROCESSING') {
        await update(txRef, { status: 'SUCCESS' });
        if (tx.type === 'DEPOSIT') {
            const userRef = ref(db, `users/${currentUser.uid}`);
            const newTotalDeposit = (currentUser.totalDeposit || 0) + tx.amount;
            let newVip = 0;
            if (newTotalDeposit >= 400000) newVip = 5;
            else if (newTotalDeposit >= 100000) newVip = 4;
            else if (newTotalDeposit >= 50000) newVip = 3;
            else if (newTotalDeposit >= 2000) newVip = 2;
            else if (newTotalDeposit >= 500) newVip = 1;

            await update(userRef, {
                balance: currentUser.balance + tx.amount,
                totalDeposit: newTotalDeposit,
                vipLevel: Math.max(currentUser.vipLevel, newVip),
                wagerRequired: (currentUser.wagerRequired || 0) + tx.amount 
            });
        }
    }
};

export const getGameStats = () => {
    const stats: Record<string, { bet: number, win: number }> = {};
    gameHistory.forEach(g => {
        if (!stats[g.game]) stats[g.game] = { bet: 0, win: 0 };
        stats[g.game].bet += g.amount;
        stats[g.game].win += g.win;
    });
    return Object.entries(stats).map(([name, data]) => ({ 
        name, 
        bet: data.bet, 
        win: data.win, 
        profit: data.win - data.bet 
    }));
};

export const bindBank = async (details: any) => {
    if (!currentUser) return { success: false };
    if (currentUser.isBankBound) return { success: false, message: 'Already bound' };
    await update(ref(db, `users/${currentUser.uid}`), { bankDetails: details, isBankBound: true });
    await updateBalance(10, 'BONUS', 'Bank Binding Reward');
    return { success: true };
};

export const bindUpi = async (details: any) => {
    if (!currentUser) return { success: false };
    if (currentUser.isUpiBound) return { success: false, message: 'Already bound' };
    await update(ref(db, `users/${currentUser.uid}`), { upiDetails: details, isUpiBound: true });
    await updateBalance(5, 'BONUS', 'UPI Binding Reward');
    return { success: true };
};

export const joinTelegramReward = async () => {
    if (!currentUser) return { success: false };
    if (currentUser.isTelegramJoined) return { success: false, message: 'Already claimed' };
    await update(ref(db, `users/${currentUser.uid}`), { isTelegramJoined: true });
    await updateBalance(5, 'BONUS', 'Telegram Reward');
    return { success: true };
};

export const getLeaderboard = (cb: (data: UserProfile[]) => void) => {
    const usersRef = ref(db, 'users');
    return onValue(usersRef, (snapshot) => {
        const val = snapshot.val();
        if (!val) return cb([]);
        const players = Object.entries(val).map(([uid, u]: any) => ({ ...u, uid }));
        players.sort((a, b) => (b.balance + (b.totalDeposit || 0)) - (a.balance + (a.totalDeposit || 0)));
        cb(players.slice(0, 20));
    });
};

export const redeemGiftCode = async (code: string): Promise<number> => {
    if (!currentUser) return 0;
    // For this simplified version, we only check one hardcoded code
    if (code === 'MAFIA100') {
        const usedCodes = currentUser.usedGiftCodes || [];
        if (usedCodes.includes(code)) return -1;
        
        await updateBalance(100, 'GIFT', 'Gift Redeemed: MAFIA100');
        await update(ref(db, `users/${currentUser.uid}`), { usedGiftCodes: [...usedCodes, code] });
        return 100;
    }
    return 0;
};

// Admin Functions

/**
 * Fetches all users from the database.
 * @param cb Callback function to handle the list of users.
 */
export const getAllUsers = (cb: (users: UserProfile[]) => void) => {
    const usersRef = ref(db, 'users');
    return onValue(usersRef, (snapshot) => {
        const val = snapshot.val();
        if (!val) return cb([]);
        cb(Object.values(val));
    });
};

/**
 * Updates a user's balance from the admin panel.
 * @param uid User ID.
 * @param amount Amount to add (positive) or subtract (negative).
 * @param isGift Whether this is a gift.
 */
export const adminUpdateUserBalance = async (uid: string, amount: number, isGift: boolean) => {
    const userRef = ref(db, `users/${uid}`);
    const snap = await get(userRef);
    const user = snap.val();
    if (user) {
        const newBalance = (user.balance || 0) + amount;
        await update(userRef, { balance: newBalance });
        
        const txRef = ref(db, `transactions/${uid}`);
        await push(txRef, { 
            type: isGift ? 'GIFT' : 'BET', 
            amount: Math.abs(amount), 
            status: 'SUCCESS', 
            desc: isGift ? 'Admin Gift' : 'Admin Adjustment', 
            date: new Date().toLocaleString(), 
            timestamp: serverTimestamp() 
        });
    }
};

/**
 * Blocks or unblocks a user.
 * @param uid User ID.
 * @param blocked Block status.
 */
export const adminBlockUser = async (uid: string, blocked: boolean) => {
    await update(ref(db, `users/${uid}`), { isBlocked: blocked });
};

/**
 * Deletes a user's data from the database.
 * @param uid User ID.
 */
export const adminDeleteUser = async (uid: string) => {
    await set(ref(db, `users/${uid}`), null);
    await set(ref(db, `transactions/${uid}`), null);
    await set(ref(db, `game_history/${uid}`), null);
};

/**
 * Fetches application settings.
 * @param cb Callback to handle settings.
 */
export const adminGetSettings = (cb: (s: AppSettings) => void) => {
    const settingsRef = ref(db, 'settings');
    return onValue(settingsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) cb(val);
        else {
            const defaultSettings: AppSettings = { upiId: '9339409219@fam', disabledGames: {} };
            cb(defaultSettings);
        }
    });
};

/**
 * Updates application settings.
 * @param updates Settings updates.
 */
export const adminUpdateSettings = async (updates: Partial<AppSettings>) => {
    await update(ref(db, 'settings'), updates);
};

/**
 * Creates a new gift code.
 * @param data Gift code data.
 */
export const adminCreateGiftCode = async (data: GiftCode) => {
    await set(ref(db, `gift_codes/${data.code}`), data);
};

/**
 * Fetches all gift codes.
 * @param cb Callback to handle the list of codes.
 */
export const adminGetAllGiftCodes = (cb: (codes: GiftCode[]) => void) => {
    const codesRef = ref(db, 'gift_codes');
    return onValue(codesRef, (snapshot) => {
        const val = snapshot.val();
        if (!val) return cb([]);
        cb(Object.values(val));
    });
};

// GAME ENGINES
let winGoState: WinGoGameState = { timeLeft: 30, period: 202511261000, history: [], status: 'BETTING', lastResult: null };
const winGoSubscribers: Function[] = [];
let aviatorState: AviatorState = { phase: 'WAITING', multiplier: 1.0, timeLeft: 3, history: [], crashPoint: 1.5 };
const aviatorSubscribers: Function[] = [];
let dragonTigerState: DragonTigerState = { status: 'BETTING', timeLeft: 15, period: '1', dragonCard: null, tigerCard: null, history: [] };
const dragonTigerSubscribers: Function[] = [];

const generateWinGoResult = (p: string): WinGoHistory => {
    const n = Math.floor(Math.random() * 10);
    const color: 'Red'|'Green'|'Violet' = n===0||n===5?'Violet':[1,3,7,9].includes(n)?'Green':'Red';
    return { period: p, number: n, bigSmall: n>=5?'Big':'Small', color };
};

export const startGlobalEngines = () => {
    setInterval(() => {
        winGoState.timeLeft--;
        if (winGoState.timeLeft <= 0) {
            winGoState.status = 'REVEALING';
            const res = generateWinGoResult(winGoState.period.toString());
            winGoState.lastResult = res;
            winGoState.history = [res, ...winGoState.history].slice(0, 50);
            winGoState.period++;
            winGoState.timeLeft = 30;
            setTimeout(() => { winGoState.status = 'BETTING'; }, 3000);
        }
        winGoSubscribers.forEach(cb => cb({...winGoState}));
    }, 1000);

    setInterval(() => {
        if (aviatorState.phase === 'WAITING') {
            aviatorState.timeLeft -= 0.1;
            if (aviatorState.timeLeft <= 0) {
                aviatorState.phase = 'FLYING';
                aviatorState.multiplier = 1.0;
                aviatorState.crashPoint = 1.1 + Math.random() * 8.9;
            }
        } else if (aviatorState.phase === 'FLYING') {
            aviatorState.multiplier *= 1.03;
            if (aviatorState.multiplier >= aviatorState.crashPoint) {
                aviatorState.phase = 'CRASHED';
                aviatorState.history = [aviatorState.multiplier, ...aviatorState.history].slice(0, 20);
                setTimeout(() => {
                    aviatorState.phase = 'WAITING';
                    aviatorState.timeLeft = 3; 
                    aviatorState.multiplier = 1.0;
                }, 3000);
            }
        }
        aviatorSubscribers.forEach(cb => cb({...aviatorState}));
    }, 100);

    setInterval(() => {
        dragonTigerState.timeLeft--;
        if (dragonTigerState.timeLeft <= 0) {
            dragonTigerState.status = 'RESULT';
            dragonTigerState.dragonCard = Math.floor(Math.random()*13)+1;
            dragonTigerState.tigerCard = Math.floor(Math.random()*13)+1;
            const win: 'D' | 'T' | 'Tie' = dragonTigerState.dragonCard > dragonTigerState.tigerCard ? 'D' : dragonTigerState.dragonCard < dragonTigerState.tigerCard ? 'T' : 'Tie';
            dragonTigerState.history = [win, ...dragonTigerState.history].slice(0, 30);
            setTimeout(() => {
                dragonTigerState.status = 'BETTING';
                dragonTigerState.timeLeft = 15;
                dragonTigerState.dragonCard = null;
                dragonTigerState.tigerCard = null;
            }, 6000);
        }
        dragonTigerSubscribers.forEach(cb => cb({...dragonTigerState}));
    }, 1000);
};

export const subscribeToWinGo = (cb: (s: WinGoGameState) => void) => { winGoSubscribers.push(cb); return () => winGoSubscribers.splice(winGoSubscribers.indexOf(cb), 1); };
export const subscribeToAviator = (cb: (s: AviatorState) => void) => { aviatorSubscribers.push(cb); return () => aviatorSubscribers.splice(aviatorSubscribers.indexOf(cb), 1); };
export const subscribeToDragonTiger = (cb: (s: DragonTigerState) => void) => { dragonTigerSubscribers.push(cb); return () => dragonTigerSubscribers.splice(dragonTigerSubscribers.indexOf(cb), 1); };

export const logout = async () => { await signOut(auth); };
export const checkAuth = () => !!auth.currentUser;

export const subscribeToChat = (cb: (m: ChatMessage[]) => void) => onValue(query(ref(db, 'chat'), limitToLast(50)), s => {
    const val = s.val(); cb(val ? Object.entries(val).map(([id, m]: any) => ({id, ...m})) : []);
});

export const sendChatMessage = async (text: string) => {
    if (!currentUser) return;
    await push(ref(db, 'chat'), { uid: currentUser.uid, username: currentUser.username, text, timestamp: Date.now(), avatar: currentUser.avatar, vip: currentUser.vipLevel });
};

const calculateReferralStats = (myCode: string) => {
    if (!myCode) return;
    // Only fetch referral count based on invitedBy field
    onValue(ref(db, 'users'), (snapshot) => {
        const users = snapshot.val() as any;
        if (users) {
            const subordinates = Object.values(users).filter((u: any) => u.invitedBy === myCode);
            referralStats.code = myCode;
            referralStats.link = `${window.location.origin}/#/register?inviteCode=${myCode}`;
            referralStats.directSubordinates = subordinates.length;
            referralStats.teamSubordinates = subordinates.length; 
            referralStats.totalDepositAmount = subordinates.reduce((acc: number, curr: any) => acc + (curr.totalDeposit || 0), 0) as number;
            referralStats.totalBetAmount = subordinates.reduce((acc: number, curr: any) => acc + (curr.totalBet || 0), 0) as number;
            referralStats.totalCommission = subordinates.reduce((acc: number, curr: any) => acc + ((curr.totalDeposit || 0) * 0.1), 0) as number;
        }
    });
};

export const getSubordinates = (cb: (data: SubordinateItem[]) => void) => onValue(ref(db, 'users'), s => {
    const val = s.val(); if (!val || !currentUser) return cb([]);
    cb(Object.values(val).filter((u:any) => u.invitedBy === currentUser?.inviteCode).map((u:any) => ({ id: u.uid||'1', uid: u.uid||'1', level: 1, depositAmount: u.totalDeposit||0, betAmount: u.totalBet||0, commission: (u.totalDeposit||0)*0.1, date: u.createdAt||'N/A' })));
});

export const getCommissions = (cb: (data: CommissionItem[]) => void) => onValue(ref(db, `transactions/${currentUser?.uid}`), s => {
    const val = s.val(); if (!val) return cb([]);
    cb(Object.values(val).filter((t:any) => t.type === 'COMMISSION').map((t:any) => ({ id: t.timestamp?.toString(), fromUid: 'System', amount: t.amount, date: t.date, type: t.desc || 'Bonus' })));
});

export const claimCommission = async () => {
    if (!currentUser || referralStats.totalCommission <= 0) return { success: false, message: 'No commission' };
    const amount = referralStats.totalCommission;
    await updateBalance(amount, 'COMMISSION', 'Agency Payout');
    return { success: true, message: amount.toFixed(2) };
};

export const setWithdrawalPassword = async (p: string) => {
    if (!currentUser) return false;
    await update(ref(db, `users/${currentUser.uid}`), { withdrawalPassword: p });
    return true;
};

export const shouldForceLoss = (b: number, bal: number) => b > (bal * 0.1) && Math.random() < 0.6;

initSession();
