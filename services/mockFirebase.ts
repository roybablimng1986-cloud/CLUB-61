
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getDatabase, 
  ref, 
  set, 
  update, 
  onValue, 
  push, 
  get, 
  runTransaction as runRtdbTransaction,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { UserProfile, WinGoGameState, Transaction, GameHistoryItem, DragonTigerState, ReferralData, WinGoHistory, AviatorState } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyAidYS6IRyH9aeqbkTAtg7qieFhKVCdhHY",
  authDomain: "sikka92-ab1dc.firebaseapp.com",
  databaseURL: "https://sikka92-ab1dc-default-rtdb.firebaseio.com",
  projectId: "sikka92-ab1dc",
  storageBucket: "sikka92-ab1dc.firebasestorage.app",
  messagingSenderId: "303638770942",
  appId: "1:303638770942:web:e0546128d4e5fbe553e1af",
  measurementId: "G-CBTR9928F2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// AUDIO
let isMuted = false;
const sounds: Record<string, HTMLAudioElement> = {
  click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
  win: new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'),
  loss: new Audio('https://assets.mixkit.co/active_storage/sfx/203/203-preview.mp3'),
  tick: new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'),
  spin: new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'),
  plane: new Audio('https://assets.mixkit.co/active_storage/sfx/1547/1547-preview.mp3')
};

export const toggleMute = () => { isMuted = !isMuted; return isMuted; };
export const getMuteStatus = () => isMuted;
export const playSound = (type: keyof typeof sounds) => {
  if (isMuted) return;
  try { sounds[type].currentTime = 0; sounds[type].volume = 0.5; sounds[type].play().catch(() => {}); } catch (e) {}
};
export const stopAllSounds = () => { Object.values(sounds).forEach(audio => { audio.pause(); audio.currentTime = 0; }); };

// RISK MANAGEMENT
export const shouldForceLoss = (bet: number, balance: number): boolean => {
    if (bet >= balance * 0.6) return Math.random() < 0.95; 
    return Math.random() < 0.15;
};

// AUTH
export const login = async (phone: string, pass: string) => {
    try {
        const email = `${phone}@mafiaclub.com`;
        await signInWithEmailAndPassword(auth, email, pass);
        return { success: true };
    } catch (e: any) { return { success: false, message: 'Invalid credentials' }; }
};

export const register = async (phone: string, pass: string, inviteCode: string, username: string) => {
    try {
        const email = `${phone}@mafiaclub.com`;
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const uid = userCredential.user.uid;
        const myInviteCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        const userData: UserProfile = {
            uid, name: username, username, phone,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
            balance: 0, vipLevel: 0, totalDeposit: 0, totalBet: 0,
            inviteCode: myInviteCode, invitedBy: inviteCode, wagerRequired: 0,
            isBankBound: false, isUpiBound: false, password: pass
        };
        await set(ref(db, `users/${uid}`), userData);
        return { success: true };
    } catch (e: any) { return { success: false, message: e.message }; }
};

export const logout = async () => { await signOut(auth); };
export const checkAuth = () => !!auth.currentUser;

// DATA SYNC
export const subscribeToBalance = (cb: (user: UserProfile | null) => void) => {
    return onAuthStateChanged(auth, (authUser) => {
        if (authUser) {
            onValue(ref(db, `users/${authUser.uid}`), (snapshot) => {
                const data = snapshot.val();
                if (data) cb(data as UserProfile);
                else cb(null);
            });
        } else cb(null);
    });
};

export const updateBalance = async (amount: number, type: Transaction['type'] = 'BET', desc: string = 'Game Action', wagerMult: number = 0) => {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = ref(db, `users/${user.uid}`);
    await runRtdbTransaction(userRef, (currentData) => {
        if (currentData) {
            currentData.balance = (currentData.balance || 0) + amount;
            if (type === 'BET') {
                currentData.totalBet = (currentData.totalBet || 0) + Math.abs(amount);
                currentData.wagerRequired = Math.max(0, (currentData.wagerRequired || 0) - Math.abs(amount));
            }
            if (amount > 0 && (type === 'GIFT' || type === 'BONUS')) {
                const mult = wagerMult > 0 ? wagerMult : 5;
                currentData.wagerRequired = (currentData.wagerRequired || 0) + (amount * mult);
            }
        }
        return currentData;
    });
    const txRef = ref(db, `users/${user.uid}/transactions`);
    await push(txRef, {
        type, amount: Math.abs(amount), status: 'SUCCESS',
        date: new Date().toLocaleString(), desc, timestamp: Date.now()
    });
};

// SECURITY
const checkIsAccountUnique = async (key: 'bank' | 'upi', value: string) => {
    const snapshot = await get(ref(db, 'users'));
    const users = snapshot.val() || {};
    return !Object.values(users).some((u: any) => {
        if (key === 'bank' && u.bankDetails?.accountNo === value) return true;
        if (key === 'upi' && u.upiDetails?.upiId === value) return true;
        return false;
    });
};

export const bindBank = async (d: any): Promise<{ success: boolean; message?: string }> => {
    const u = auth.currentUser;
    if (!u) return { success: false, message: 'Auth Required' };
    const isUnique = await checkIsAccountUnique('bank', d.accountNo);
    if (!isUnique) return { success: false, message: 'This Bank account is already linked to another ID.' };
    await update(ref(db, `users/${u.uid}`), { isBankBound: true, bankDetails: d });
    await updateBalance(10, 'BONUS', 'Bank Bound Reward (5x Wager)');
    return { success: true };
};

export const bindUpi = async (d: any): Promise<{ success: boolean; message?: string }> => {
    const u = auth.currentUser;
    if (!u) return { success: false, message: 'Auth Required' };
    const isUnique = await checkIsAccountUnique('upi', d.upiId);
    if (!isUnique) return { success: false, message: 'This UPI ID is already linked to another ID.' };
    await update(ref(db, `users/${u.uid}`), { isUpiBound: true, upiDetails: d });
    await updateBalance(5, 'BONUS', 'UPI Bound Reward (5x Wager)');
    return { success: true };
};

export const redeemGiftCode = async (code: string): Promise<number> => {
    const u = auth.currentUser;
    if (!u) return 0;
    const usedSnap = await get(ref(db, `users/${u.uid}/usedGiftCodes`));
    const used = usedSnap.val() || [];
    if (used.includes(code)) return 0;
    let amount = 0;
    if (code === 'MAFIA100') amount = 100;
    if (code === 'gg') amount = 500;
    if (amount > 0) {
        await update(ref(db, `users/${u.uid}`), { usedGiftCodes: [...used, code] });
        await updateBalance(amount, 'GIFT', `Gift Code ${code} (5x Wager)`);
        return amount;
    }
    return 0;
};

// SHARED GAME ENGINES
export const subscribeToWinGo = (cb: (state: WinGoGameState) => void) => {
    return onValue(ref(db, 'games/wingo'), (snap) => {
        if (snap.exists()) {
            const val = snap.val();
            cb({ ...val, history: val.history || [] });
        }
        else set(ref(db, 'games/wingo'), { timeLeft: 30, period: 202511261000, history: [], status: 'BETTING' });
    });
};

export const subscribeToAviator = (cb: (state: AviatorState) => void) => {
    return onValue(ref(db, 'games/aviator'), (snap) => {
        if (snap.exists()) {
            const val = snap.val();
            cb({ ...val, history: val.history || [] });
        }
        else set(ref(db, 'games/aviator'), { phase: 'WAITING', multiplier: 1.0, timeLeft: 10, history: [], crashPoint: 2.5 });
    });
};

export const subscribeToDragonTiger = (cb: (state: DragonTigerState) => void) => {
    return onValue(ref(db, 'games/dragontiger'), (snap) => {
        if (snap.exists()) {
            const val = snap.val();
            cb({ ...val, history: val.history || [], liveBets: val.liveBets || [] });
        }
        else set(ref(db, 'games/dragontiger'), { period: Date.now().toString().slice(-8), timeLeft: 15, status: 'BETTING', dragonCard: 1, tigerCard: 1, history: [], liveBets: [] });
    });
};

export const startGlobalEngines = () => {
    setInterval(async () => {
        // WINGO ENGINE
        const wingoRef = ref(db, 'games/wingo');
        const wingoSnap = await get(wingoRef);
        if (wingoSnap.exists()) {
            const data = wingoSnap.val();
            if (data.timeLeft <= 1) {
                const num = Math.floor(Math.random() * 10);
                const res = { period: data.period.toString(), number: num, bigSmall: num >= 5 ? 'Big' : 'Small', color: (num === 0 || num === 5) ? 'Violet' : [1,3,7,9].includes(num) ? 'Green' : 'Red' };
                await update(wingoRef, { timeLeft: 30, period: data.period + 1, lastResult: res, history: [res, ...(data.history || [])].slice(0, 50), status: 'BETTING' });
            } else await update(wingoRef, { timeLeft: data.timeLeft - 1 });
        }

        // AVIATOR ENGINE
        const aviatorRef = ref(db, 'games/aviator');
        const avSnap = await get(aviatorRef);
        if (avSnap.exists()) {
            const data = avSnap.val() as AviatorState;
            if (data.phase === 'WAITING') {
                if (data.timeLeft <= 1) {
                    const cp = parseFloat((1.0 + Math.random() * 6).toFixed(2));
                    await update(aviatorRef, { phase: 'FLYING', multiplier: 1.0, crashPoint: cp, startTime: Date.now() });
                } else await update(aviatorRef, { timeLeft: data.timeLeft - 1 });
            } else if (data.phase === 'FLYING') {
                const elapsed = (Date.now() - data.startTime!) / 1000;
                const cur = 1 + (elapsed * 0.1) + (Math.pow(elapsed, 2) * 0.05);
                if (cur >= data.crashPoint) {
                    await update(aviatorRef, { phase: 'CRASHED', multiplier: data.crashPoint, history: [data.crashPoint, ...(data.history || [])].slice(0, 15) });
                    setTimeout(() => update(aviatorRef, { phase: 'WAITING', timeLeft: 10, multiplier: 1.0 }), 3000);
                } else await update(aviatorRef, { multiplier: cur });
            }
        }

        // DRAGON TIGER ENGINE
        const dtRef = ref(db, 'games/dragontiger');
        const dtSnap = await get(dtRef);
        if (dtSnap.exists()) {
            const data = dtSnap.val() as DragonTigerState;
            if (data.status === 'BETTING') {
                if (data.timeLeft <= 1) {
                    const d = Math.floor(Math.random() * 13) + 1;
                    const t = Math.floor(Math.random() * 13) + 1;
                    const win = d > t ? 'D' : t > d ? 'T' : 'Tie';
                    await update(dtRef, { status: 'RESULT', dragonCard: d, tigerCard: t, history: [win, ...(data.history || [])].slice(0, 20), timeLeft: 5 });
                } else await update(dtRef, { timeLeft: data.timeLeft - 1 });
            } else {
                if (data.timeLeft <= 1) {
                    await update(dtRef, { status: 'BETTING', timeLeft: 15, period: Date.now().toString().slice(-8), dragonCard: null, tigerCard: null });
                } else await update(dtRef, { timeLeft: data.timeLeft - 1 });
            }
        }
    }, 1000);
};

export const joinTelegramReward = async () => {
    const u = auth.currentUser;
    if (!u) return { success: false };
    await update(ref(db, `users/${u.uid}`), { isTelegramJoined: true });
    await updateBalance(5, 'BONUS', 'Telegram Reward (5x Wager)');
    return { success: true };
};

export const handleWithdraw = async (amount: number, method: string, pin: string, details: any) => {
    const user = auth.currentUser;
    if (!user) return { success: false, message: 'Auth Required' };
    const snapshot = await get(ref(db, `users/${user.uid}`));
    const userData = snapshot.val();
    if (userData?.withdrawalPassword !== pin) return { success: false, message: 'Invalid PIN' };
    if (userData?.balance < amount) return { success: false, message: 'Insufficient Balance' };
    if (userData?.wagerRequired > 0) return { success: false, message: `Turnover left: ₹${userData.wagerRequired.toFixed(2)}` };
    await updateBalance(-amount, 'WITHDRAW', `Withdrawal via ${method}`);
    return { success: true };
};

export const approveTransaction = async (txId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    const txsRef = ref(db, `users/${user.uid}/transactions`);
    const snapshot = await get(txsRef);
    const txData = snapshot.val();
    if (txData) {
        const key = Object.keys(txData).find(k => txData[k].id === txId);
        if (key && txData[key].status === 'PROCESSING') {
            const tx = txData[key];
            await update(ref(db, `users/${user.uid}/transactions/${key}`), { status: 'SUCCESS' });
            if (tx.type === 'DEPOSIT') {
                await updateBalance(tx.amount, 'DEPOSIT', 'Refill Verified');
            }
        }
    }
};

export const addGameHistory = async (game: string, bet: number, win: number, details: string) => {
    const user = auth.currentUser;
    if (!user) return;
    await push(ref(db, `users/${user.uid}/game_history`), { game, amount: bet, win, date: new Date().toLocaleString(), details, timestamp: Date.now() });
};

export const getGameHistory = (gameName: string, cb: (history: GameHistoryItem[]) => void) => {
    const user = auth.currentUser;
    if (!user) return () => {};
    return onValue(ref(db, `users/${user.uid}/game_history`), (snapshot) => {
        const data = snapshot.val();
        if (data) cb(Object.entries(data).map(([key, val]: any) => ({ ...val, id: key })).filter((h: any) => h.game === gameName).reverse());
        else cb([]);
    });
};

export const setWithdrawalPassword = async (pin: string) => {
    const u = auth.currentUser;
    if (!u) return false;
    await update(ref(db, `users/${u.uid}`), { withdrawalPassword: pin });
    return true;
};

export const startWinGoGame = () => {}; 
export const startDragonTigerGame = () => {};
export const getSubordinates = () => [];
export const getCommissions = () => [];
export const getGameStats = () => [];
export const submitDepositRequest = async (a: number, m: string, u: string) => {
    const user = auth.currentUser;
    if (!user) return;
    await push(ref(db, `users/${user.uid}/transactions`), { type: 'DEPOSIT', amount: a, status: 'PROCESSING', date: new Date().toLocaleString(), desc: `Deposit via ${m}`, utr: u, method: m, timestamp: Date.now() });
};
export let transactions: Transaction[] = [];
export let referralStats: ReferralData = { code: '', link: '', totalCommission: 0, yesterdayCommission: 0, directSubordinates: 0, teamSubordinates: 0, totalDepositAmount: 0, totalBetAmount: 0 };
