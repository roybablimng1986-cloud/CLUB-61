
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, update, push, child } from 'firebase/database';
import { UserProfile, WinGoHistory, WinGoGameState, Transaction, GameHistoryItem, ReferralData, SubordinateItem, CommissionItem, AviatorState, DragonTigerState } from '../types';

// FIREBASE CONFIGURATION
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
  mine_reveal: new Audio('https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3'),
  mine_bomb: new Audio('https://assets.mixkit.co/active_storage/sfx/1101/1101-preview.mp3'),
  dt_card: new Audio('https://assets.mixkit.co/active_storage/sfx/1557/1557-preview.mp3'),
  wheel_spin: new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'),
  dt_draw: new Audio('https://assets.mixkit.co/active_storage/sfx/2650/2650-preview.mp3'),
  slot_reel: new Audio('https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3'),
  slot_jackpot: new Audio('https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3'),
  race_rev: new Audio('https://assets.mixkit.co/active_storage/sfx/1572/1572-preview.mp3'),
  race_finish: new Audio('https://assets.mixkit.co/active_storage/sfx/2026/2026-preview.mp3'),
  sports_kick: new Audio('https://assets.mixkit.co/active_storage/sfx/2654/2654-preview.mp3'),
  sports_hit: new Audio('https://assets.mixkit.co/active_storage/sfx/2143/2143-preview.mp3'),
  tower_step: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
  vault_beep: new Audio('https://assets.mixkit.co/active_storage/sfx/2583/2583-preview.mp3'),
};

export const toggleMute = () => { isMuted = !isMuted; if (isMuted) stopAllSounds(); return isMuted; };
export const getMuteStatus = () => isMuted;
export const playSound = (type: keyof typeof sounds) => {
  if (isMuted) return;
  try { const audio = sounds[type]; if (audio) { audio.currentTime = 0; audio.volume = 0.5; audio.play().catch(() => {}); } } catch (e) {}
};
export const stopAllSounds = () => { Object.values(sounds).forEach(audio => { audio.pause(); audio.currentTime = 0; }); };

// WIN PROBABILITY CONTROL (30-35% Winning Chance)
export const shouldForceLoss = (bet: number, balance: number) => {
    return Math.random() > 0.33; 
};

// SESSION ENGINE
let currentUser: UserProfile | null = null;
const SESSION_KEY = 'MAFIA_CURRENT_UID';

const sanitizeUser = (user: any): UserProfile => ({
    uid: user.uid || 'unknown',
    balance: typeof user.balance === 'number' ? user.balance : 0,
    vipLevel: user.vipLevel || 0,
    name: user.name || 'User',
    username: user.username || 'User',
    phone: user.phone || '',
    avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid || 'default'}`,
    totalDeposit: user.totalDeposit || 0,
    totalBet: user.totalBet || 0,
    inviteCode: user.inviteCode || '',
    password: user.password || '',
    withdrawalPassword: user.withdrawalPassword || '',
    usedGiftCodes: Array.isArray(user.usedGiftCodes) ? user.usedGiftCodes : [],
    invitedBy: user.invitedBy || '',
    totalCommission: user.totalCommission || 0,
    wagerRequired: user.wagerRequired || 0,
    isBankBound: user.isBankBound || false,
    isUpiBound: user.isUpiBound || false,
    isTelegramJoined: user.isTelegramJoined || false,
    bankDetails: user.bankDetails || undefined,
    upiDetails: user.upiDetails || undefined
});

export const checkAuth = () => !!localStorage.getItem(SESSION_KEY);

const balanceSubscribers: Function[] = [];
export let transactions: Transaction[] = [];
export let gameHistory: GameHistoryItem[] = [];
export let referralStats: ReferralData = { code: '', link: '', totalCommission: 0, yesterdayCommission: 0, directSubordinates: 0, teamSubordinates: 0, totalDepositAmount: 0, totalBetAmount: 0 };

const initSession = async () => {
    const uid = localStorage.getItem(SESSION_KEY);
    if (uid) {
        const snapshot = await get(ref(db, `users/${uid}`));
        if (snapshot.exists()) {
            currentUser = sanitizeUser(snapshot.val());
            syncUserStats(uid);
            notifySubscribers();
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
    }
};

const syncUserStats = (uid: string) => {
    onValue(ref(db, `users/${uid}`), (snapshot) => {
        if (snapshot.exists()) {
            currentUser = sanitizeUser(snapshot.val());
            notifySubscribers();
        }
    });
    onValue(ref(db, `transactions/${uid}`), (snapshot) => {
        if (snapshot.exists()) {
            transactions = Object.values(snapshot.val()).reverse() as Transaction[];
            notifySubscribers();
        }
    });
    onValue(ref(db, `gameHistory/${uid}`), (snapshot) => {
        if (snapshot.exists()) {
            gameHistory = Object.values(snapshot.val()).reverse() as GameHistoryItem[];
            notifySubscribers();
        }
    });
};

export const login = async (phone: string, pass: string) => {
    const snapshot = await get(ref(db, 'users'));
    if (snapshot.exists()) {
        const users = snapshot.val();
        const user = Object.values(users).find((u: any) => u.phone === phone && u.password === pass) as any;
        if (user) {
            currentUser = sanitizeUser(user);
            localStorage.setItem(SESSION_KEY, user.uid);
            syncUserStats(user.uid);
            return { success: true };
        }
    }
    return { success: false, message: 'Invalid phone or password' };
};

export const register = async (phone: string, pass: string, inviteCode: string, username: string) => {
    const snapshot = await get(ref(db, 'users'));
    if (snapshot.exists()) {
        const users = snapshot.val();
        if (Object.values(users).some((u: any) => u.phone === phone)) return { success: false, message: 'Phone already registered' };
    }
    const uid = 'USER_' + Date.now();
    const newUser: UserProfile = sanitizeUser({
        uid, password: pass, name: username, username, phone, 
        inviteCode: Math.floor(10000000 + Math.random() * 90000000).toString(), 
        invitedBy: inviteCode, balance: 0
    });
    await set(ref(db, `users/${uid}`), newUser);
    currentUser = newUser;
    localStorage.setItem(SESSION_KEY, uid);
    syncUserStats(uid);
    return { success: true };
};

export const logout = async () => {
    currentUser = null; transactions = []; gameHistory = [];
    localStorage.removeItem(SESSION_KEY);
    notifySubscribers();
};

export const subscribeToBalance = (cb: (user: UserProfile | null) => void) => {
    balanceSubscribers.push(cb);
    cb(currentUser ? { ...currentUser } : null);
    return () => { const idx = balanceSubscribers.indexOf(cb); if (idx > -1) balanceSubscribers.splice(idx, 1); };
};

const notifySubscribers = () => {
    balanceSubscribers.forEach(cb => cb(currentUser ? { ...currentUser } : null));
    if (currentUser) calculateReferralStats(currentUser.inviteCode);
};

const calculateReferralStats = async (myCode: string) => {
    if (!myCode) return;
    const snapshot = await get(ref(db, 'users'));
    if (!snapshot.exists()) return;
    const users = Object.values(snapshot.val()) as UserProfile[];
    const subs = users.filter(u => u.invitedBy === myCode);
    
    referralStats.code = myCode;
    referralStats.link = `${window.location.origin}/#/register?code=${myCode}`;
    referralStats.directSubordinates = subs.length;
    referralStats.teamSubordinates = subs.length;
    referralStats.totalDepositAmount = subs.reduce((acc, c) => acc + (c.totalDeposit || 0), 0);
    referralStats.totalBetAmount = subs.reduce((acc, c) => acc + (c.totalBet || 0), 0);
    if (currentUser) {
        referralStats.totalCommission = currentUser.totalCommission || 0;
        referralStats.yesterdayCommission = (currentUser.totalCommission || 0) * 0.15;
    }
};

export const updateBalance = async (amount: number, type: Transaction['type'] = 'BET', desc: string = 'Game Action') => {
    if (!currentUser) return;
    const userRef = ref(db, `users/${currentUser.uid}`);
    const newBalance = Math.max(0, currentUser.balance + amount);
    const updates: any = { balance: newBalance };
    
    if (amount < 0) {
        updates.totalBet = (currentUser.totalBet || 0) + Math.abs(amount);
        updates.wagerRequired = Math.max(0, (currentUser.wagerRequired || 0) - Math.abs(amount));
    }

    // IF BALANCE REACHES ZERO, WIPE WAGER PROGRESS
    if (newBalance <= 0) {
        updates.wagerRequired = 0;
    }

    await update(userRef, updates);
    const txRef = ref(db, `transactions/${currentUser.uid}`);
    await push(txRef, { id: 'TX_' + Date.now(), type, amount: Math.abs(amount), status: 'SUCCESS', date: new Date().toLocaleString(), desc, timestamp: Date.now() });
};

export const addGameHistory = async (game: string, bet: number, win: number, details: string) => {
    if (!currentUser) return;
    const historyRef = ref(db, `gameHistory/${currentUser.uid}`);
    await push(historyRef, { id: Date.now().toString(), game, amount: bet, win, date: new Date().toLocaleString(), details });
};

export const getGameHistory = (gameName: string, cb: (data: GameHistoryItem[]) => void) => {
    if (!currentUser) return () => {};
    const historyRef = ref(db, `gameHistory/${currentUser.uid}`);
    return onValue(historyRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = Object.values(snapshot.val()).reverse() as GameHistoryItem[];
            cb(gameName === 'ALL' ? data : data.filter(item => item.game === gameName));
        } else cb([]);
    });
};

export const getTransactionHistory = (cb: (data: Transaction[]) => void) => {
    if (!currentUser) return () => {};
    const txRef = ref(db, `transactions/${currentUser.uid}`);
    return onValue(txRef, (snapshot) => {
        if (snapshot.exists()) cb(Object.values(snapshot.val()).reverse() as Transaction[]);
        else cb([]);
    });
};

export const bindBank = async (details: { accountName: string, accountNo: string, ifsc: string }) => {
    if (!currentUser) return { success: false, message: 'Auth Required' };
    const snapshot = await get(ref(db, 'users'));
    const users = Object.values(snapshot.val()) as UserProfile[];
    if (users.some(u => u.isBankBound && u.bankDetails?.accountNo === details.accountNo)) {
        return { success: false, message: 'This bank account is already bound to another ID' };
    }
    await update(ref(db, `users/${currentUser.uid}`), { isBankBound: true, bankDetails: details, balance: currentUser.balance + 10 });
    await updateBalance(10, 'GIFT', 'Bank Binding Bonus');
    return { success: true };
};

export const bindUpi = async (details: { upiId: string }) => {
    if (!currentUser) return { success: false, message: 'Auth Required' };
    const snapshot = await get(ref(db, 'users'));
    const users = Object.values(snapshot.val()) as UserProfile[];
    if (users.some(u => u.isUpiBound && u.upiDetails?.upiId === details.upiId)) {
        return { success: false, message: 'This UPI ID is already bound to another ID' };
    }
    await update(ref(db, `users/${currentUser.uid}`), { isUpiBound: true, upiDetails: details, balance: currentUser.balance + 5 });
    await updateBalance(5, 'GIFT', 'UPI Binding Bonus');
    return { success: true };
};

export const joinTelegramReward = async () => {
    if (!currentUser || currentUser.isTelegramJoined) return { success: false };
    await update(ref(db, `users/${currentUser.uid}`), { isTelegramJoined: true, balance: currentUser.balance + 5 });
    await updateBalance(5, 'GIFT', 'Telegram Reward');
    return { success: true };
};

export const redeemGiftCode = async (code: string): Promise<number> => {
    if (!currentUser || currentUser.usedGiftCodes?.includes(code)) return 0;
    let amount = 0;
    if (code === 'MAFIA100') amount = 100;
    if (code === 'ff') amount = 1000;
    if (amount > 0) {
        const used = [...(currentUser.usedGiftCodes || []), code];
        await update(ref(db, `users/${currentUser.uid}`), { usedGiftCodes: used, balance: currentUser.balance + amount, wagerRequired: (currentUser.wagerRequired || 0) + (amount * 6.8) });
        await updateBalance(amount, 'GIFT', `Gift Code: ${code}`);
        return amount;
    }
    return 0;
};

export const handleWithdraw = async (amount: number, method: string, password: string, details: any) => {
    if (!currentUser) return { success: false, message: 'Auth Required' };
    if (currentUser.withdrawalPassword !== password) return { success: false, message: 'Invalid PIN' };
    if (currentUser.balance < amount) return { success: false, message: 'Low Balance' };
    if (currentUser.wagerRequired > 0) return { success: false, message: `Wager left: ₹${currentUser.wagerRequired.toFixed(0)}` };
    await updateBalance(-amount, 'WITHDRAW', `Withdraw via ${method}`);
    return { success: true };
};

export const setWithdrawalPassword = async (password: string) => {
    if (!currentUser) return false;
    await update(ref(db, `users/${currentUser.uid}`), { withdrawalPassword: password });
    return true;
};

export const submitDepositRequest = async (amount: number, method: string, utr: string) => {
    if (!currentUser) return;
    const txRef = ref(db, `transactions/${currentUser.uid}`);
    await push(txRef, { id: 'TX_' + Date.now(), type: 'DEPOSIT', amount, status: 'PROCESSING', date: new Date().toLocaleString(), desc: `Deposit via ${method}`, utr, method, timestamp: Date.now() });
};

export const approveTransaction = async (txId: string) => {
    if (!currentUser) return;
    const snapshot = await get(ref(db, `transactions/${currentUser.uid}`));
    if (!snapshot.exists()) return;
    const txs = snapshot.val();
    const key = Object.keys(txs).find(k => txs[k].id === txId);
    if (!key || txs[key].status !== 'PROCESSING') return;
    
    await update(ref(db, `transactions/${currentUser.uid}/${key}`), { status: 'SUCCESS' });
    if (txs[key].type === 'DEPOSIT') {
        const bonus = currentUser.totalDeposit === 0 ? txs[key].amount * 0.25 : 0;
        const totalAdd = txs[key].amount + bonus;
        await update(ref(db, `users/${currentUser.uid}`), { 
            balance: currentUser.balance + totalAdd, 
            totalDeposit: (currentUser.totalDeposit || 0) + txs[key].amount,
            wagerRequired: (currentUser.wagerRequired || 0) + (totalAdd * 1)
        });
        if (bonus > 0) await updateBalance(bonus, 'BONUS', '25% First Deposit Reward');
        if (currentUser.invitedBy) {
            const usersSnap = await get(ref(db, 'users'));
            const referrer = Object.values(usersSnap.val()).find((u: any) => u.inviteCode === currentUser?.invitedBy) as any;
            if (referrer) {
                await update(ref(db, `users/${referrer.uid}`), { totalCommission: (referrer.totalCommission || 0) + (txs[key].amount * 0.5) });
            }
        }
        playSound('win');
    }
};

export const claimCommission = async () => {
    if (!currentUser || (currentUser.totalCommission || 0) <= 0) return { success: false, message: 'No assets' };
    const amount = currentUser.totalCommission || 0;
    await update(ref(db, `users/${currentUser.uid}`), { balance: currentUser.balance + amount, totalCommission: 0 });
    await updateBalance(amount, 'COMMISSION', 'Commission Claimed');
    return { success: true };
};

export const getSubordinates = (): SubordinateItem[] => {
    return []; 
};

export const getCommissions = (cb: (data: CommissionItem[]) => void) => {
    if (!currentUser) return () => {};
    return getTransactionHistory(txs => cb(txs.filter(t => t.type === 'COMMISSION').map(t => ({ id: t.id, fromUid: 'Network', amount: t.amount, date: t.date, type: 'Bonus' }))));
};

export const getGameStats = () => {
    const stats: Record<string, { bet: number, win: number }> = {};
    gameHistory.forEach(g => {
        if (!stats[g.game]) stats[g.game] = { bet: 0, win: 0 };
        stats[g.game].bet += g.amount;
        stats[g.game].win += g.win;
    });
    return Object.entries(stats).map(([name, data]) => ({ name, bet: data.bet, win: data.win, profit: data.win - data.bet }));
};

// GLOBAL GAME ENGINES
let winGoState: WinGoGameState = { timeLeft: 30, period: 202511261000, history: [], status: 'BETTING', lastResult: null };
const winGoSubscribers: Function[] = [];
let aviatorState: AviatorState = { phase: 'WAITING', multiplier: 1.0, timeLeft: 10, history: [], crashPoint: 0 };
const aviatorSubscribers: Function[] = [];
let dragonTigerState: DragonTigerState = { status: 'BETTING', timeLeft: 15, period: '20251128001', dragonCard: null, tigerCard: null, history: [] };
const dragonTigerSubscribers: Function[] = [];

const generateWinGoResult = (period: string): WinGoHistory => {
  const num = Math.floor(Math.random() * 10);
  let color: 'Red'|'Green'|'Violet' = 'Red';
  if (num === 0 || num === 5) color = 'Violet';
  else if ([1,3,7,9].includes(num)) color = 'Green';
  return { period, number: num, bigSmall: num >= 5 ? 'Big' : 'Small', color };
};

const seedWinGoHistory = () => {
    const history = [];
    for(let i=0; i<50; i++) {
        history.push(generateWinGoResult((winGoState.period - 50 + i).toString()));
    }
    winGoState.history = history.reverse();
};

export const startGlobalEngines = () => {
  seedWinGoHistory();
  setInterval(() => {
    winGoState.timeLeft -= 1;
    if (winGoState.timeLeft <= 0) {
        winGoState.status = 'REVEALING';
        const res = generateWinGoResult(winGoState.period.toString());
        winGoState.lastResult = res; winGoState.history = [res, ...winGoState.history].slice(0, 50);
        winGoState.period += 1; winGoState.timeLeft = 30;
        setTimeout(() => { winGoState.status = 'BETTING'; winGoSubscribers.forEach(cb => cb({ ...winGoState })); }, 3000);
    }
    winGoSubscribers.forEach(cb => cb({ ...winGoState }));
  }, 1000);

  setInterval(() => {
      if (aviatorState.phase === 'WAITING') {
          aviatorState.timeLeft -= 1;
          if (aviatorState.timeLeft <= 0) {
              aviatorState.phase = 'FLYING'; aviatorState.multiplier = 1.0; aviatorState.startTime = Date.now();
              const r = Math.random();
              if (r < 0.35) aviatorState.crashPoint = 1.01 + Math.random() * 0.27;
              else if (r < 0.70) aviatorState.crashPoint = 1.28 + Math.random() * 0.72;
              else aviatorState.crashPoint = 2.00 + Math.random() * 10.00;
          }
      } else if (aviatorState.phase === 'FLYING') {
          const elapsed = (Date.now() - (aviatorState.startTime || Date.now())) / 1000;
          aviatorState.multiplier = 1 + (elapsed * 0.08) + (Math.pow(elapsed, 2) * 0.015);
          if (aviatorState.multiplier >= aviatorState.crashPoint) {
              aviatorState.phase = 'CRASHED'; aviatorState.multiplier = aviatorState.crashPoint;
              aviatorState.history = [aviatorState.crashPoint, ...aviatorState.history].slice(0, 15);
              setTimeout(() => { aviatorState.phase = 'WAITING'; aviatorState.timeLeft = 10; aviatorState.multiplier = 1.0; }, 3000);
          }
      }
      aviatorSubscribers.forEach(cb => cb({ ...aviatorState }));
  }, 100);

  setInterval(() => {
      dragonTigerState.timeLeft -= 1;
      if (dragonTigerState.timeLeft <= 0) {
          if (dragonTigerState.status === 'BETTING') { dragonTigerState.status = 'LOCKED'; dragonTigerState.timeLeft = 3; }
          else if (dragonTigerState.status === 'LOCKED') {
              dragonTigerState.status = 'RESULT';
              dragonTigerState.dragonCard = Math.floor(Math.random() * 13) + 1;
              dragonTigerState.tigerCard = Math.floor(Math.random() * 13) + 1;
              const res: "D" | "T" | "Tie" = dragonTigerState.dragonCard > dragonTigerState.tigerCard ? 'D' : dragonTigerState.tigerCard > dragonTigerState.dragonCard ? 'T' : 'Tie';
              dragonTigerState.history = [res, ...dragonTigerState.history].slice(0, 20);
              dragonTigerState.timeLeft = 5;
          } else {
              dragonTigerState.status = 'BETTING'; dragonTigerState.timeLeft = 15;
              dragonTigerState.period = (parseInt(dragonTigerState.period) + 1).toString();
              dragonTigerState.dragonCard = null; dragonTigerState.tigerCard = null;
          }
      }
      dragonTigerSubscribers.forEach(cb => cb({ ...dragonTigerState }));
  }, 1000);
};

export const subscribeToWinGo = (cb: (state: WinGoGameState) => void) => { winGoSubscribers.push(cb); cb(winGoState); return () => winGoSubscribers.splice(winGoSubscribers.indexOf(cb), 1); };
export const subscribeToAviator = (cb: (state: AviatorState) => void) => { aviatorSubscribers.push(cb); cb(aviatorState); return () => aviatorSubscribers.splice(aviatorSubscribers.indexOf(cb), 1); };
export const subscribeToDragonTiger = (cb: (state: DragonTigerState) => void) => { dragonTigerSubscribers.push(cb); cb(dragonTigerState); return () => dragonTigerSubscribers.splice(dragonTigerSubscribers.indexOf(cb), 1); };

initSession();
