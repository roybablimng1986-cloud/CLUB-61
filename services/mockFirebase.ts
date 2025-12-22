
import { UserProfile, WinGoHistory, WinGoGameState, Transaction, GameHistoryItem, ReferralData, SubordinateItem, CommissionItem, DragonTigerState } from '../types';

// AUDIO SYSTEM
let isMuted = false;
const sounds: Record<string, HTMLAudioElement> = {
  click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
  win: new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'),
  loss: new Audio('https://assets.mixkit.co/active_storage/sfx/203/203-preview.mp3'),
  tick: new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'),
  spin: new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'),
  plane: new Audio('https://assets.mixkit.co/active_storage/sfx/1547/1547-preview.mp3')
};

export const toggleMute = () => { isMuted = !isMuted; if (isMuted) stopAllSounds(); return isMuted; };
export const getMuteStatus = () => isMuted;
export const playSound = (type: keyof typeof sounds) => {
  if (isMuted) return;
  try { const audio = sounds[type]; if (audio) { audio.currentTime = 0; audio.volume = 0.5; audio.play().catch(() => {}); } } catch (e) {}
};
export const stopAllSounds = () => { Object.values(sounds).forEach(audio => { audio.pause(); audio.currentTime = 0; }); };

// RISK MANAGEMENT Logic
export const shouldForceLoss = (bet: number, balance: number): boolean => {
    if (bet >= (balance + bet) * 0.7) return Math.random() < 0.95; 
    return false;
};

// LOCAL STORAGE ENGINE
const DB_KEYS = { USERS: 'TIRANGA_USERS', CURRENT_USER: 'TIRANGA_CURRENT_USER_UID', TRANSACTIONS: 'TIRANGA_TX_', HISTORY: 'TIRANGA_HISTORY_' };

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
    wagerRequired: typeof user.wagerRequired === 'number' ? user.wagerRequired : 0,
    isBankBound: !!user.isBankBound,
    isUpiBound: !!user.isUpiBound,
    isTelegramJoined: !!user.isTelegramJoined,
    bankDetails: user.bankDetails || null,
    upiDetails: user.upiDetails || null
});

const getLocalUsers = (): Record<string, UserProfile> => {
    try {
        const data = localStorage.getItem(DB_KEYS.USERS);
        const users = data ? JSON.parse(data) : {};
        Object.keys(users).forEach(key => { users[key] = sanitizeUser(users[key]); });
        return users;
    } catch (e) { return {}; }
};
const saveLocalUsers = (users: Record<string, UserProfile>) => localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));

const getLocalTransactions = (uid: string): Transaction[] => {
    try { return JSON.parse(localStorage.getItem(DB_KEYS.TRANSACTIONS + uid) || '[]'); } catch (e) { return []; }
};
const saveLocalTransactions = (uid: string, txs: Transaction[]) => localStorage.setItem(DB_KEYS.TRANSACTIONS + uid, JSON.stringify(txs));

const getLocalHistory = (uid: string): GameHistoryItem[] => {
    try { return JSON.parse(localStorage.getItem(DB_KEYS.HISTORY + uid) || '[]'); } catch (e) { return []; }
};
const saveLocalHistory = (uid: string, history: GameHistoryItem[]) => localStorage.setItem(DB_KEYS.HISTORY + uid, JSON.stringify(history));

let currentUser: UserProfile | null = null;
const balanceSubscribers: Function[] = [];
export let transactions: Transaction[] = [];
export let gameHistory: GameHistoryItem[] = [];
export let referralStats: ReferralData = { code: '', link: '', totalCommission: 0, yesterdayCommission: 0, directSubordinates: 0, teamSubordinates: 0, totalDepositAmount: 0, totalBetAmount: 0 };

const initSession = () => {
    try {
        const uid = localStorage.getItem(DB_KEYS.CURRENT_USER);
        if (uid) {
            const users = getLocalUsers();
            if (users[uid]) {
                currentUser = users[uid];
                transactions = getLocalTransactions(uid);
                gameHistory = getLocalHistory(uid);
                calculateReferralStats(currentUser.inviteCode);
                notifySubscribers();
            } else {
                localStorage.removeItem(DB_KEYS.CURRENT_USER);
            }
        }
    } catch (e) { console.error("Init Error", e); }
};

export const login = async (phone: string, pass: string) => {
    const users = getLocalUsers();
    const user = Object.values(users).find(u => u.phone === phone && u.password === pass);
    if (user) {
        currentUser = user;
        localStorage.setItem(DB_KEYS.CURRENT_USER, user.uid);
        transactions = getLocalTransactions(user.uid);
        gameHistory = getLocalHistory(user.uid);
        calculateReferralStats(user.inviteCode);
        notifySubscribers();
        return { success: true };
    }
    return { success: false, message: 'Invalid phone or password' };
};

export const register = async (phone: string, pass: string, inviteCode: string, username: string) => {
    const users = getLocalUsers();
    if (Object.values(users).some(u => u.phone === phone)) return { success: false, message: 'Phone already registered' };
    const uid = 'USER_' + Date.now();
    const newUser: UserProfile = sanitizeUser({
        uid, password: pass, name: username, username, phone, inviteCode: Math.floor(10000000 + Math.random() * 90000000).toString(), invitedBy: inviteCode, wagerRequired: 0
    });
    users[uid] = newUser;
    saveLocalUsers(users);
    currentUser = newUser;
    localStorage.setItem(DB_KEYS.CURRENT_USER, uid);
    notifySubscribers();
    return { success: true };
};

export const logout = async () => {
    currentUser = null; transactions = []; gameHistory = [];
    localStorage.removeItem(DB_KEYS.CURRENT_USER);
    notifySubscribers();
};

export const bindBank = async (details: { accountName: string; accountNo: string; ifsc: string }) => {
    if (!currentUser || currentUser.isBankBound) return { success: false, message: 'Bound.' };
    const users = getLocalUsers();
    const amount = 10;
    users[currentUser.uid].bankDetails = details;
    users[currentUser.uid].isBankBound = true;
    users[currentUser.uid].balance += amount;
    users[currentUser.uid].wagerRequired = (users[currentUser.uid].wagerRequired || 0) + (amount * 5);
    currentUser = users[currentUser.uid];
    saveLocalUsers(users);
    transactions.unshift({ id: 'TX_BIND_B_' + Date.now(), type: 'BONUS', amount, status: 'SUCCESS', date: new Date().toLocaleString(), desc: 'Bank Reward (5x Wager)', timestamp: Date.now() });
    saveLocalTransactions(currentUser.uid, transactions);
    notifySubscribers();
    return { success: true };
};

export const bindUpi = async (details: { upiId: string }) => {
    if (!currentUser || currentUser.isUpiBound) return { success: false, message: 'Bound.' };
    const users = getLocalUsers();
    const amount = 5;
    users[currentUser.uid].upiDetails = details;
    users[currentUser.uid].isUpiBound = true;
    users[currentUser.uid].balance += amount;
    users[currentUser.uid].wagerRequired = (users[currentUser.uid].wagerRequired || 0) + (amount * 5);
    currentUser = users[currentUser.uid];
    saveLocalUsers(users);
    transactions.unshift({ id: 'TX_BIND_U_' + Date.now(), type: 'BONUS', amount, status: 'SUCCESS', date: new Date().toLocaleString(), desc: 'UPI Reward (5x Wager)', timestamp: Date.now() });
    saveLocalTransactions(currentUser.uid, transactions);
    notifySubscribers();
    return { success: true };
};

export const joinTelegramReward = async () => {
    if (!currentUser || currentUser.isTelegramJoined) return { success: false, message: 'Claimed.' };
    const users = getLocalUsers();
    const amount = 5;
    users[currentUser.uid].isTelegramJoined = true;
    users[currentUser.uid].balance += amount;
    users[currentUser.uid].wagerRequired = (users[currentUser.uid].wagerRequired || 0) + (amount * 5);
    currentUser = users[currentUser.uid];
    saveLocalUsers(users);
    transactions.unshift({ id: 'TX_TG_' + Date.now(), type: 'BONUS', amount, status: 'SUCCESS', date: new Date().toLocaleString(), desc: 'Telegram Reward (5x Wager)', timestamp: Date.now() });
    saveLocalTransactions(currentUser.uid, transactions);
    notifySubscribers();
    return { success: true };
};

export const updateBalance = async (amount: number, type: Transaction['type'] = 'BET', desc: string = 'Game Action') => {
    if (!currentUser) return;
    const users = getLocalUsers();
    if (users[currentUser.uid]) {
        users[currentUser.uid].balance += amount;
        if (type === 'BET') {
            const betSize = Math.abs(amount);
            users[currentUser.uid].totalBet = (users[currentUser.uid].totalBet || 0) + betSize;
            users[currentUser.uid].wagerRequired = Math.max(0, (users[currentUser.uid].wagerRequired || 0) - betSize);
        }
        currentUser = users[currentUser.uid];
        saveLocalUsers(users);
        transactions.unshift({ id: 'TX_' + Date.now(), type, amount: Math.abs(amount), status: 'SUCCESS', date: new Date().toLocaleString(), desc, timestamp: Date.now() });
        saveLocalTransactions(currentUser.uid, transactions);
        notifySubscribers();
    }
};

export const addGameHistory = async (game: string, bet: number, win: number, details: string) => {
    if (!currentUser) return;
    gameHistory.unshift({ id: Date.now().toString(), game, amount: bet, win, date: new Date().toLocaleString(), details });
    saveLocalHistory(currentUser.uid, gameHistory);
};

export const getGameHistory = (gameName: string) => gameHistory.filter(item => item.game === gameName);

export const approveTransaction = async (txId: string) => {
    if (!currentUser) return;
    const txIndex = transactions.findIndex(t => t.id === txId);
    if (txIndex === -1 || transactions[txIndex].status !== 'PROCESSING') return;
    const tx = transactions[txIndex];
    tx.status = 'SUCCESS';
    saveLocalTransactions(currentUser.uid, transactions);
    if (tx.type === 'DEPOSIT') {
        const users = getLocalUsers();
        const user = users[currentUser.uid];
        user.wagerRequired = (user.wagerRequired || 0) + (tx.amount * 5);
        if ((user.totalDeposit || 0) === 0) {
            const bonus = tx.amount * 0.25;
            user.balance += bonus; user.wagerRequired += (bonus * 5);
            transactions.unshift({ id: 'TX_FDB_' + Date.now(), type: 'BONUS', amount: bonus, status: 'SUCCESS', date: new Date().toLocaleString(), desc: 'First Deposit Bonus', timestamp: Date.now() });
        }
        user.balance += tx.amount;
        user.totalDeposit = (user.totalDeposit || 0) + tx.amount;
        currentUser = user;
        saveLocalUsers(users);
        notifySubscribers();
    }
};

export const submitDepositRequest = async (amount: number, method: string, utr: string) => {
    if (!currentUser) return;
    transactions.unshift({ id: 'TX_' + Date.now(), type: 'DEPOSIT', amount, status: 'PROCESSING', date: new Date().toLocaleString(), desc: `Deposit via ${method}`, utr, method, timestamp: Date.now() });
    saveLocalTransactions(currentUser.uid, transactions);
    notifySubscribers();
};

export const handleWithdraw = async (amount: number, method: string, password: string, details: any) => {
    if (!currentUser) return { success: false, message: 'Not logged in' };
    if (currentUser.withdrawalPassword !== password) return { success: false, message: 'Invalid PIN' };
    if (currentUser.balance < amount) return { success: false, message: 'Insufficient' };
    if ((currentUser.wagerRequired || 0) > 0) return { success: false, message: `Turnover ₹${currentUser.wagerRequired.toFixed(2)} left.` };
    const users = getLocalUsers();
    users[currentUser.uid].balance -= amount;
    currentUser = users[currentUser.uid];
    saveLocalUsers(users);
    notifySubscribers();
    transactions.unshift({ id: 'TX_' + Date.now(), type: 'WITHDRAW', amount, status: 'PROCESSING', date: new Date().toLocaleString(), desc: `Withdraw via ${method}`, method, accountDetails: details, timestamp: Date.now() });
    saveLocalTransactions(currentUser.uid, transactions);
    return { success: true };
};

export const setWithdrawalPassword = (password: string) => {
    if (!currentUser) return false;
    const users = getLocalUsers();
    users[currentUser.uid].withdrawalPassword = password;
    currentUser = users[currentUser.uid];
    saveLocalUsers(users);
    return true;
};

export const redeemGiftCode = async (code: string): Promise<number> => {
    if (!currentUser || currentUser.usedGiftCodes?.includes(code)) return 0;
    if (code === 'TIRANGA100') {
        const amount = 100;
        const users = getLocalUsers();
        users[currentUser.uid].usedGiftCodes = [...(users[currentUser.uid].usedGiftCodes || []), code];
        users[currentUser.uid].balance += amount;
        users[currentUser.uid].wagerRequired = (users[currentUser.uid].wagerRequired || 0) + (amount * 5);
        currentUser = users[currentUser.uid];
        saveLocalUsers(users);
        transactions.unshift({ id: 'TX_' + Date.now(), type: 'GIFT', amount, status: 'SUCCESS', date: new Date().toLocaleString(), desc: `Gift Code (5x Wager)`, timestamp: Date.now() });
        saveLocalTransactions(currentUser.uid, transactions);
        notifySubscribers();
        return amount;
    }
    return 0;
};

export const subscribeToBalance = (cb: (user: UserProfile | null) => void) => {
    balanceSubscribers.push(cb);
    cb(currentUser ? { ...currentUser } : null);
    return () => { const idx = balanceSubscribers.indexOf(cb); if (idx > -1) balanceSubscribers.splice(idx, 1); };
};
const notifySubscribers = () => balanceSubscribers.forEach(cb => cb(currentUser ? { ...currentUser } : null));

const calculateReferralStats = (myCode: string) => {
    if (!myCode) return;
    const users = getLocalUsers();
    const subs = Object.values(users).filter(u => u.invitedBy === myCode);
    const totalDep = subs.reduce((acc, c) => acc + (c.totalDeposit || 0), 0);
    referralStats.code = myCode;
    referralStats.link = `${window.location.origin}/#/register?code=${myCode}`;
    referralStats.directSubordinates = subs.length;
    referralStats.teamSubordinates = subs.length;
    referralStats.totalDepositAmount = totalDep;
    referralStats.totalBetAmount = subs.reduce((acc, c) => acc + (c.totalBet || 0), 0);
    referralStats.totalCommission = totalDep * 0.2; 
};

export const getSubordinates = (): SubordinateItem[] => {
    if (!currentUser) return [];
    return Object.values(getLocalUsers()).filter(u => u.invitedBy === currentUser?.inviteCode).map(u => ({
        id: u.uid, uid: u.uid, level: 1, depositAmount: u.totalDeposit || 0, betAmount: u.totalBet || 0, commission: (u.totalDeposit || 0) * 0.2, date: new Date().toLocaleDateString()
    }));
};

export const getCommissions = (): CommissionItem[] => transactions.filter(t => t.type === 'COMMISSION').map(t => ({ id: t.id, fromUid: 'System', amount: t.amount, date: t.date, type: 'Bonus' }));

export const getGameStats = () => {
    const stats: Record<string, { bet: number, win: number }> = {};
    gameHistory.forEach(g => {
        if (!stats[g.game]) stats[g.game] = { bet: 0, win: 0 };
        stats[g.game].bet += g.amount;
        stats[g.game].win += g.win;
    });
    return Object.entries(stats).map(([name, data]) => ({ name, bet: data.bet, win: data.win, profit: data.win - data.bet }));
};

// WINGO ENGINE
let winGoState: WinGoGameState = { timeLeft: 30, period: 202511261000, history: [], status: 'BETTING', lastResult: null };
const winGoSubscribers: Function[] = [];

const generateWinGoResult = (period: string): WinGoHistory => {
  const num = Math.floor(Math.random() * 10);
  let color: 'Red'|'Green'|'Violet' = 'Red';
  if (num === 0 || num === 5) color = 'Violet';
  else if ([1,3,7,9].includes(num)) color = 'Green';
  return { period, number: num, bigSmall: num >= 5 ? 'Big' : 'Small', color };
};

export const startWinGoGame = () => {
  // Fix: Force 100 rounds of history on launch for realism
  if (winGoState.history.length === 0) {
      for(let i=0; i<100; i++) {
          winGoState.history.push(generateWinGoResult((winGoState.period - 100 + i).toString()));
      }
      winGoState.history.reverse();
  }
  setInterval(() => {
    winGoState.timeLeft -= 1;
    if (winGoState.timeLeft <= 0) {
        winGoState.status = 'REVEALING';
        const res = generateWinGoResult(winGoState.period.toString());
        winGoState.lastResult = res;
        winGoState.history = [res, ...winGoState.history].slice(0, 100);
        winGoState.period += 1;
        winGoState.timeLeft = 30;
        setTimeout(() => { winGoState.status = 'BETTING'; winGoSubscribers.forEach(cb => cb({ ...winGoState })); }, 3000);
    }
    winGoSubscribers.forEach(cb => cb({ ...winGoState }));
  }, 1000);
};

export const subscribeToWinGo = (cb: (state: WinGoGameState) => void) => { 
    winGoSubscribers.push(cb); cb(winGoState); 
    return () => { const idx = winGoSubscribers.indexOf(cb); if (idx > -1) winGoSubscribers.splice(idx, 1); };
};

// DRAGON TIGER ENGINE
let dragonTigerState: DragonTigerState = { period: '20250520001', timeLeft: 15, status: 'BETTING', dragonCard: null, tigerCard: null, history: ['D', 'T', 'Tie', 'D', 'D'], liveBets: [] };
const dragonTigerSubscribers: Function[] = [];

export const startDragonTigerGame = () => {
    setInterval(() => {
        dragonTigerState.timeLeft -= 1;
        if (dragonTigerState.timeLeft <= 0) {
            if (dragonTigerState.status === 'BETTING') { dragonTigerState.status = 'LOCKED'; dragonTigerState.timeLeft = 3; }
            else if (dragonTigerState.status === 'LOCKED') {
                dragonTigerState.status = 'RESULT';
                dragonTigerState.dragonCard = Math.floor(Math.random() * 13) + 1;
                dragonTigerState.tigerCard = Math.floor(Math.random() * 13) + 1;
                const winner: 'D'|'T'|'Tie' = (dragonTigerState.dragonCard||0)>(dragonTigerState.tigerCard||0)?'D':(dragonTigerState.tigerCard||0)>(dragonTigerState.dragonCard||0)?'T':'Tie';
                dragonTigerState.history = [winner, ...dragonTigerState.history].slice(0, 20);
                dragonTigerState.timeLeft = 5;
            } else { dragonTigerState.status = 'BETTING'; dragonTigerState.timeLeft = 15; dragonTigerState.dragonCard = null; dragonTigerState.tigerCard = null; dragonTigerState.period = (parseInt(dragonTigerState.period)+1).toString(); }
        }
        dragonTigerSubscribers.forEach(cb => cb({ ...dragonTigerState }));
    }, 1000);
};

export const subscribeToDragonTiger = (cb: (state: DragonTigerState) => void) => {
    dragonTigerSubscribers.push(cb); cb(dragonTigerState);
    return () => { const idx = dragonTigerSubscribers.indexOf(cb); if (idx > -1) dragonTigerSubscribers.splice(idx, 1); };
};

initSession();
