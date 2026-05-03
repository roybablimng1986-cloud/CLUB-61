
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, 
    collection, query, orderBy, limit, addDoc, serverTimestamp, 
    where, getDocs, deleteDoc, writeBatch, increment, getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserProfile, WinGoHistory, WinGoGameState, Transaction, GameHistoryItem, ReferralData, SubordinateItem, CommissionItem, AviatorState, DragonTigerState, ChatMessage, GiftCode, AppSettings, AndarBaharState, JhandiMundaState, CricketState, BaccaratState, RouletteState, SicBoState } from '../types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const config = firebaseConfig as any;
export const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

// testConnection: Handshake to verify connectivity on boot
async function testConnection() {
  try {
    // Attempt a foreground fetch to verify the connection
    await getDocFromServer(doc(db, 'app_settings', 'global'));
    console.log("Firestore connection verified.");
  } catch (error: any) {
    if (error.message?.includes('the client is offline') || error.message?.includes('ECONNRESET') || error.message?.includes('UNAVAILABLE')) {
      console.error("Firestore connectivity issue detected:", error.message);
      // We don't throw here to allow the app to try and recover naturally
    }
  }
}
testConnection();

// Helper for handling Firebase Permission/Connectivity errors
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirebaseError = (error: any, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            emailVerified: auth.currentUser?.emailVerified,
            isAnonymous: auth.currentUser?.isAnonymous,
            tenantId: auth.currentUser?.tenantId,
            providerInfo: auth.currentUser?.providerData.map(provider => ({
                providerId: provider.providerId,
                displayName: provider.displayName,
                email: provider.email,
                photoUrl: provider.photoURL
            })) || []
        },
        operationType,
        path
    };
    
    // Specifically log connectivity errors to help debugging
    if (error.message?.includes('ECONNRESET') || error.message?.includes('UNAVAILABLE')) {
        console.warn(`Transient Firestore connectivity error [${operationType} at ${path}]:`, error.message);
        return; // Don't throw for transient network errors, let the SDK retry
    }

    console.error(`Firestore Error [${operationType} at ${path}]:`, JSON.stringify(errInfo));
    if (error.message.includes('permission-denied') || error.message.includes('PERMISSION_DENIED')) {
        console.warn(`Permission Denied for ${operationType} at ${path}. Ensure Firestore Rules allow access.`);
    }
    throw new Error(JSON.stringify(errInfo));
};

// AUDIO SYSTEM
let isMuted = false;
const sounds = {
  click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
  win: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
  loss: new Audio('https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3'),
  wingo_tick: new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'),
  wingo_draw: new Audio('https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3'),
  plane_engine: new Audio('https://assets.mixkit.co/active_storage/sfx/1547/1547-preview.mp3'),
  plane_crash: new Audio('https://assets.mixkit.co/active_storage/sfx/2536/2536-preview.mp3'),
  dt_card: new Audio('https://assets.mixkit.co/active_storage/sfx/1557/1557-preview.mp3'),
  wheel_spin: new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'),
  race_rev: new Audio('https://assets.mixkit.co/active_storage/sfx/1572/1572-preview.mp3'),
  slot_reel: new Audio('https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3'),
  mine_bomb: new Audio('https://assets.mixkit.co/active_storage/sfx/2536/2536-preview.mp3'),
  mine_reveal: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
  dt_draw: new Audio('https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3'),
  tower_step: new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'),
  sports_kick: new Audio('https://assets.mixkit.co/active_storage/sfx/1572/1572-preview.mp3'),
  bet_place: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
  cash_out: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
  dice_roll: new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'),
  plinko_drop: new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'),
  card_flip: new Audio('https://assets.mixkit.co/active_storage/sfx/1557/1557-preview.mp3'),
  win_popup: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
  loss_popup: new Audio('https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3'),
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
let fallbackUid: string | null = localStorage.getItem('FALLBACK_USER_UID');
if (fallbackUid && !fallbackUid.startsWith('FB_') && !fallbackUid.startsWith('fb_')) {
    fallbackUid = null;
    localStorage.removeItem('FALLBACK_USER_UID');
}
const balanceSubscribers: { cb: (user: UserProfile | null) => void, err?: (msg: string) => void }[] = [];
export let referralStats: ReferralData = { code: '', link: '', totalCommission: 0, yesterdayCommission: 0, directSubordinates: 0, teamSubordinates: 0, totalDepositAmount: 0, totalBetAmount: 0 };

// Write Buffer to reduce Firestore writes
interface PendingBalanceUpdate {
    uid: string;
    amount: number;
    updates: any;
}
interface PendingHistoryUpdate {
    uid: string;
    game: string;
    bet: number;
    win: number;
    details: string;
}
interface PendingTransaction {
    uid: string;
    data: any;
}

interface PendingBet {
    collection: string;
    data: any;
}

let pendingBalanceUpdates: Record<string, PendingBalanceUpdate> = {};
let pendingHistoryUpdates: PendingHistoryUpdate[] = [];
let pendingTransactions: PendingTransaction[] = [];
let pendingBets: PendingBet[] = [];
let isFlushing = false;

const flushUpdates = async () => {
    if (isFlushing || !auth.currentUser) return;
    
    const balanceUids = Object.keys(pendingBalanceUpdates);
    const historyCount = pendingHistoryUpdates.length;
    const txCount = pendingTransactions.length;
    const betCount = pendingBets.length;
    
    if (balanceUids.length === 0 && historyCount === 0 && txCount === 0 && betCount === 0) return;
    
    isFlushing = true;
    try {
        const batch = writeBatch(db);
        
        // 1. Process Balance Updates
        for (const uid of balanceUids) {
            const update = pendingBalanceUpdates[uid];
            const userRef = doc(db, 'users', uid);
            batch.update(userRef, update.updates);
        }
        
        // 2. Process History Updates
        const historyToProcess = pendingHistoryUpdates.splice(0, 50);
        for (const h of historyToProcess) {
            const histRef = doc(collection(db, `game_history/${h.uid}/items`));
            batch.set(histRef, {
                game: h.game,
                amount: h.bet,
                win: h.win,
                details: h.details,
                timestamp: serverTimestamp()
            });
        }
        
        // 3. Process Transactions (Only vital ones)
        const txToProcess = pendingTransactions.splice(0, 100);
        for (const t of txToProcess) {
            // Only write Vital transactions like Deposit/Withdraw/Bonus to save quota
            if (t.data.type === 'DEPOSIT' || t.data.type === 'WITHDRAW' || t.data.type === 'BONUS' || t.data.type === 'GIFT') {
                const txRef = doc(collection(db, `transactions/${t.uid}/items`));
                batch.set(txRef, t.data);
            }
        }

        // 4. Process Bets - DISABLED in Ultra-Low Quota Mode (Server handles broadcasts)
        pendingBets = []; // Clear without writing
        
        await batch.commit();
        // Clear balance updates only after successful commit
        pendingBalanceUpdates = {};
        
        // If there are still items in the queue, flush again soon
        if (pendingHistoryUpdates.length > 0 || pendingTransactions.length > 0 || pendingBets.length > 0) {
            setTimeout(flushUpdates, 500);
        }
    } catch (e) {
        console.error('Flush Updates Error:', e);
    } finally {
        isFlushing = false;
    }
};

// Flush every 3 minutes to stay within ultra-low quota (20k/day)
setInterval(flushUpdates, 180000);

const notifySubscribers = (errorMsg?: string) => {
    balanceSubscribers.forEach(sub => {
        if (errorMsg) {
            if (sub.err) sub.err(errorMsg);
        } else {
            sub.cb(currentUser ? { ...currentUser } : null);
        }
    });
};

const setupUserListener = (uid: string) => {
    const userDocRef = doc(db, 'users', uid);
    return onSnapshot(userDocRef, (snapshot) => {
        const data = snapshot.data();
        if (data) {
            currentUser = {
                ...data,
                uid: uid,
                balance: Number(data.balance) || 0,
            } as UserProfile;
            calculateReferralStats(currentUser!.inviteCode);
            notifySubscribers();
        }
    }, (err) => {
        const msg = err.message || String(err);
        notifySubscribers(msg);
        handleFirebaseError(err, OperationType.GET, `users/${uid}`);
    });
};

const initSession = () => {
    let unsubUser: (() => void) | null = null;

    onAuthStateChanged(auth, async (user) => {
        if (unsubUser) unsubUser();
        if (user) {
            unsubUser = setupUserListener(user.uid);
            const historyQuery = query(collection(db, `game_history/${user.uid}/items`), orderBy('timestamp', 'desc'), limit(50));
            onSnapshot(historyQuery, (snapshot) => {
                localGameHistory = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as GameHistoryItem[];
            }, (err) => handleFirebaseError(err, OperationType.LIST, `game_history/${user.uid}/items`));
        } else if (fallbackUid) {
            unsubUser = setupUserListener(fallbackUid);
        } else {
            currentUser = null;
            localGameHistory = [];
            notifySubscribers();
        }
    });
};

export const logout = async () => { 
    try { 
        await signOut(auth); 
        localStorage.removeItem('FALLBACK_USER_UID');
        fallbackUid = null;
        currentUser = null;
        notifySubscribers();
    } catch (e) { 
        handleFirebaseError(e, OperationType.WRITE, 'logout'); 
    } 
};

export const checkAuth = () => !!currentUser;

export const subscribeToBalance = (cb: (user: UserProfile | null) => void, err?: (msg: string) => void) => {
    balanceSubscribers.push({ cb, err });
    cb(currentUser);
    return () => {
        const idx = balanceSubscribers.findIndex(s => s.cb === cb);
        if (idx > -1) balanceSubscribers.splice(idx, 1);
    };
};

export const updateBalance = async (amount: number, type: Transaction['type'] = 'BET', desc: string = 'Game Action') => {
    if (!currentUser) return;
    
    // 1. Update Local State Immediately for UI responsiveness
    const newBalance = (currentUser.balance || 0) + amount;
    currentUser.balance = newBalance;
    
    const updates: any = { balance: newBalance };
    if (amount < 0) {
        updates.totalBet = (currentUser.totalBet || 0) + Math.abs(amount);
        updates.wagerRequired = Math.max(0, (currentUser.wagerRequired || 0) - Math.abs(amount));
        currentUser.totalBet = updates.totalBet;
        currentUser.wagerRequired = updates.wagerRequired;
    } else if (type === 'BONUS' || type === 'GIFT' || type === 'DEPOSIT') {
        const multiplier = (type === 'GIFT' || type === 'BONUS') ? 5.4 : 1.0;
        const addedWager = amount * multiplier;
        updates.wagerRequired = (currentUser.wagerRequired || 0) + addedWager;
        updates.wagerTotal = (currentUser.wagerTotal || (currentUser.wagerRequired || 0)) + addedWager;
        currentUser.wagerRequired = updates.wagerRequired;
        currentUser.wagerTotal = updates.wagerTotal;
    }
    
    notifySubscribers();

    // 2. Queue for Batched Write
    const uid = currentUser.uid;
    if (!pendingBalanceUpdates[uid]) {
        pendingBalanceUpdates[uid] = { uid, amount: 0, updates: {} };
    }
    
    // Merge updates
    pendingBalanceUpdates[uid].updates = {
        ...pendingBalanceUpdates[uid].updates,
        ...updates
    };
    
    pendingTransactions.push({
        uid,
        data: {
            type,
            amount: Math.abs(amount),
            status: 'SUCCESS',
            desc,
            date: new Date().toLocaleString(),
            timestamp: serverTimestamp()
        }
    });
};

export const addGameHistory = async (game: string, bet: number, win: number, details: string) => {
    if (!currentUser) return;
    pendingHistoryUpdates.push({
        uid: currentUser.uid,
        game,
        bet,
        win,
        details
    });
};

export const addGameBet = async (collectionName: string, data: any) => {
    if (!currentUser) return;
    
    // Instead of queueing for Firestore, send to Server API
    try {
        await fetch('/api/bets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collection: collectionName,
                data: {
                    ...data,
                    uid: currentUser.uid,
                    username: currentUser.username || 'Player'
                }
            })
        });
    } catch (e) {
        console.error('Bet API Error:', e);
        // Fallback for extreme cases: add to pending but it will likely be ignored by ultra-low quota mode
        pendingBets.push({
            collection: collectionName,
            data: {
                ...data,
                uid: currentUser.uid,
                username: currentUser.username || 'Player'
            }
        });
    }
};

export const login = async (phone: string, email: string, pass: string) => {
    try {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            localStorage.removeItem('FALLBACK_USER_UID');
            fallbackUid = null;
            return { success: true };
        } catch (authErr: any) {
            if (authErr.code === 'auth/operation-not-allowed') {
                console.warn("Firebase Email/Password Auth is disabled. Falling back to Firestore-only auth.");
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('email', '==', email), where('password', '==', pass), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const user = snap.docs[0];
                    fallbackUid = user.id;
                    localStorage.setItem('FALLBACK_USER_UID', fallbackUid);
                    setupUserListener(fallbackUid);
                    return { success: true };
                }
                return { success: false, message: 'Invalid credentials (Fallback Mode)' };
            }
            if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password') {
                return { success: false, message: 'Invalid email or password' };
            }
            handleFirebaseError(authErr, OperationType.GET, 'auth/login');
            throw authErr;
        }
    } catch (e: any) {
        return { success: false, message: e.message || 'Login failed' };
    }
};

export const register = async (phone: string, email: string, pass: string, inviteCode: string, username: string) => {
    try {
        console.log('Starting registration for:', email);
        let uid: string;
        try {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            uid = res.user.uid;
            localStorage.removeItem('FALLBACK_USER_UID');
            fallbackUid = null;
        } catch (authErr: any) {
            if (authErr.code === 'auth/operation-not-allowed') {
                console.warn("Firebase Email/Password Auth is disabled. Falling back to Firestore-only auth.");
                uid = 'FB_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                fallbackUid = uid;
                localStorage.setItem('FALLBACK_USER_UID', uid);
            } else if (authErr.code === 'auth/email-already-in-use') {
                return { success: false, message: 'This email is already registered. Please log in.' };
            } else if (authErr.code === 'auth/weak-password') {
                return { success: false, message: 'Password should be at least 6 characters.' };
            } else {
                handleFirebaseError(authErr, OperationType.CREATE, 'auth/register');
                throw authErr;
            }
        }

        const newUser: UserProfile = {
            uid, phone, email, username, name: username, balance: 0, vipLevel: 0, totalDeposit: 0, totalBet: 0,
            inviteCode: Math.floor(100000 + Math.random() * 900000).toString(),
            invitedBy: inviteCode || '', wagerRequired: 0, wagerTotal: 0, rebateLastClaimedBet: 0,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            password: pass // Store for fallback login
        };
        
        console.log('Creating user document in Firestore...');
        try {
            await setDoc(doc(db, 'users', uid), newUser);
        } catch (fsErr) {
            handleFirebaseError(fsErr, OperationType.CREATE, `users/${uid}`);
        }
        
        if (fallbackUid) setupUserListener(fallbackUid);
        
        return { success: true };
    } catch (e: any) {
        console.error('Registration error:', e);
        return { success: false, message: e.message };
    }
};

export const submitDepositRequest = async (amount: number, method: string, utr: string) => {
    if (!currentUser) return;
    const path = `transactions/${currentUser.uid}/items`;
    try {
        const txColRef = collection(db, path);
        await addDoc(txColRef, {
            type: 'DEPOSIT', amount, status: 'PROCESSING', method, utr,
            desc: `Refill via ${method}`, date: new Date().toLocaleString(), timestamp: serverTimestamp()
        });
    } catch (e) {
        handleFirebaseError(e, OperationType.CREATE, path);
    }
};

export const handleWithdraw = async (amount: number, method: string, password: string, details: any) => {
    if (!currentUser) return { success: false, message: 'Not logged in' };
    if (currentUser.withdrawalPassword !== password) return { success: false, message: 'Invalid PIN' };
    if (currentUser.balance < amount) return { success: false, message: 'Insufficient balance' };
    if ((currentUser.wagerRequired || 0) > 0) return { success: false, message: 'Turnover incomplete' };

    const path = `users/${currentUser.uid}`;
    try {
        const remainingBalance = currentUser.balance - amount;
        const userDocRef = doc(db, 'users', currentUser.uid);
        
        // Ensure remaining balance also needs to be wagered (strict turnover policy)
        const newWagerRequired = remainingBalance >= 1 ? remainingBalance : 0;
        
        await updateDoc(userDocRef, { 
            balance: remainingBalance,
            wagerRequired: newWagerRequired,
            wagerTotal: (currentUser.wagerTotal || 0) + newWagerRequired
        });

        const txColRef = collection(db, `transactions/${currentUser.uid}/items`);
        await addDoc(txColRef, {
            type: 'WITHDRAW', amount, status: 'PROCESSING', method, accountDetails: details,
            desc: `Withdraw via ${method}`, date: new Date().toLocaleString(), timestamp: serverTimestamp()
        });
        return { success: true, message: 'Request submitted' };
    } catch (e) {
        handleFirebaseError(e, OperationType.UPDATE, path);
        return { success: false, message: 'Database error' };
    }
};

export const shouldForceLoss = (betAmount: number, currentBalance: number) => {
    if (!currentUser) return Math.random() < 0.6;
    
    const wagerRemaining = currentUser.wagerRequired || 0;
    const wagerTotal = currentUser.wagerTotal || 1;
    const wagerProgress = 1 - (wagerRemaining / Math.max(1, wagerTotal));
    
    // Higher risk if high bet or near wager completion
    let threshold = 0.65;
    if (betAmount > 1000) threshold += 0.15;
    if (wagerProgress > 0.8) threshold += 0.1;
    if (currentBalance > 10000) threshold += 0.05;
    
    return Math.random() < Math.min(0.95, threshold);
};


export const claimRebate = async () => {
    if (!currentUser) return { success: false };
    try {
        const turnover = Math.max(0, (currentUser.totalBet || 0) - (currentUser.rebateLastClaimedBet || 0));
        const amount = turnover * 0.001; 
        if (amount <= 0) return { success: false, message: 'No rebate available' };
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { rebateLastClaimedBet: currentUser.totalBet });
        await updateBalance(amount, 'BONUS', 'Daily Rebate');
        return { success: true, amount };
    } catch (e) {
        handleFirebaseError(e, OperationType.UPDATE, `users/${currentUser.uid}`);
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
    const historyColRef = collection(db, `game_history/${currentUser.uid}/items`);
    const q = query(historyColRef, orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (s) => {
        const list = s.docs.map(d => ({ id: d.id, ...d.data() })) as GameHistoryItem[];
        cb(gameName === 'ALL' ? list : list.filter((h: any) => h.game === gameName));
    }, (err) => handleFirebaseError(err, OperationType.LIST, `game_history/${currentUser.uid}/items`));
};

export const getTransactionHistory = (cb: (data: Transaction[]) => void) => {
    if (!currentUser) return () => {};
    const txColRef = collection(db, `transactions/${currentUser.uid}/items`);
    const q = query(txColRef, orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (s) => {
        cb(s.docs.map(d => ({ id: d.id, ...d.data() })) as Transaction[]);
    }, (err) => handleFirebaseError(err, OperationType.LIST, `transactions/${currentUser.uid}/items`));
};

export const setWithdrawalPassword = async (password: string) => {
    if (!currentUser) return false;
    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { withdrawalPassword: password });
        return true;
    } catch (e) {
        handleFirebaseError(e, OperationType.UPDATE, `users/${currentUser.uid}`);
        return false;
    }
};

// ENGINES REMOVED: Handled locally in pages
export const subscribeToWinGo = (cb: (state: WinGoGameState) => void) => { return () => {}; };
export const subscribeToAviator = (cb: (state: AviatorState) => void) => { return () => {}; };
export const subscribeToDragonTiger = (cb: (state: DragonTigerState) => void) => { return () => {}; };
export const subscribeToAndarBahar = (cb: (state: AndarBaharState) => void) => { return () => {}; };
export const subscribeToJhandiMunda = (cb: (state: JhandiMundaState) => void) => { return () => {}; };
export const subscribeToCricket = (cb: (state: CricketState) => void) => { return () => {}; };
export const subscribeToBaccarat = (cb: (state: BaccaratState) => void) => { return () => {}; };
export const subscribeToRoulette = (cb: (state: RouletteState) => void) => { return () => {}; };
export const subscribeToSevenUpDown = (cb: (state: any) => void) => { return () => {}; };
export const subscribeToWinGoBets = (cb: (data: any[]) => void) => { return () => {}; };
export const subscribeToAviatorBets = (cb: (data: any[]) => void) => { return () => {}; };
export const subscribeToDragonTigerBets = (cb: (data: any[]) => void) => { return () => {}; };
export const subscribeToAndarBaharBets = (cb: (data: any[]) => void) => { return () => {}; };
export const subscribeToJhandiMundaBets = (cb: (data: any[]) => void) => { return () => {}; };
export const subscribeToCricketBets = (cb: (data: any[]) => void) => { return () => {}; };
export const subscribeToBaccaratBets = (cb: (data: any[]) => void) => { return () => {}; };
export const subscribeToRouletteBets = (cb: (data: any[]) => void) => { return () => {}; };
export const subscribeToSevenUpDownBets = (cb: (data: any[]) => void) => { return () => {}; };

export const startGlobalEngines = () => {};
export const getClockOffset = () => 0;

let lastReferralCalcAt = 0;
export const getLeaderboard = (cb: (data: UserProfile[]) => void) => {
    const usersColRef = collection(db, 'users');
    const q = query(usersColRef, orderBy('balance', 'desc'), limit(20));
    return onSnapshot(q, s => {
        cb(s.docs.map(d => ({ ...d.data(), uid: d.id })) as UserProfile[]);
    }, (err) => handleFirebaseError(err, OperationType.LIST, 'users'));
};

const calculateReferralStats = async (myCode: string) => {
    if (!myCode) return;
    const now = Date.now();
    if (now - lastReferralCalcAt < 600000) return; // Only calc every 10 mins max
    lastReferralCalcAt = now;
    try {
        const usersColRef = collection(db, 'users');
        const q = query(usersColRef, where('invitedBy', '==', myCode));
        const snapshot = await getDocs(q).catch(() => null);
        if (!snapshot) return;
        
        const subs = snapshot.docs.map(d => d.data());
        const totalDep = subs.reduce((acc: number, c: any): number => acc + (Number(c.totalDeposit) || 0), 0) as number;
        referralStats = { 
            code: myCode, 
            link: `${window.location.origin}/#/register?code=${myCode}`, 
            totalCommission: totalDep * 0.1, 
            yesterdayCommission: totalDep * 0.05, 
            directSubordinates: subs.length, 
            teamSubordinates: subs.length, 
            totalDepositAmount: totalDep, 
            totalBetAmount: subs.reduce((acc: number, c: any): number => acc + (Number(c.totalBet) || 0), 0) as number
        };
    } catch (e) {
        handleFirebaseError(e, OperationType.LIST, 'users');
    }
};

export const getSubordinates = (cb: (data: SubordinateItem[]) => void) => {
    if (!currentUser) return () => {};
    const usersColRef = collection(db, 'users');
    const q = query(usersColRef, where('invitedBy', '==', currentUser.inviteCode));
    return onSnapshot(q, snapshot => {
        const subs = snapshot.docs.map((d: any) => {
            const u = d.data();
            return { id: d.id, uid: d.id, level: 1, depositAmount: u.totalDeposit || 0, betAmount: u.totalBet || 0, commission: (u.totalDeposit || 0) * 0.1, date: '2024-01-01' };
        });
        cb(subs);
    }, (err) => handleFirebaseError(err, OperationType.LIST, 'users'));
};

export const getCommissions = (cb: (data: CommissionItem[]) => void) => {
    if (!currentUser) return () => {};
    const txColRef = collection(db, `transactions/${currentUser.uid}/items`);
    const q = query(txColRef, where('type', '==', 'COMMISSION'));
    return onSnapshot(q, snapshot => {
        cb(snapshot.docs.map((d: any) => {
            const t = d.data();
            return { id: d.id, fromUid: 'System', amount: t.amount, date: t.date, type: t.desc || 'Referral' };
        }));
    }, (err) => handleFirebaseError(err, OperationType.LIST, `transactions/${currentUser.uid}/items`));
};

export const claimCommission = async () => {
    if (!currentUser || referralStats.totalCommission <= 0) return { success: false, message: 'No assets' };
    const amount = referralStats.totalCommission; await updateBalance(amount, 'BONUS', 'Commission Claim');
    return { success: true, message: amount.toFixed(2) };
};

export const bindBank = async (details: any) => { 
    if (!currentUser) return { success: false }; 
    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { bankDetails: details, isBankBound: true }); 
        await updateBalance(10, 'BONUS', 'Bank Binding'); 
        return { success: true }; 
    } catch (e) { handleFirebaseError(e, OperationType.UPDATE, `users/${currentUser.uid}`); return { success: false }; }
};

export const bindUpi = async (details: any) => { 
    if (!currentUser) return { success: false }; 
    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { upiDetails: details, isUpiBound: true }); 
        await updateBalance(5, 'BONUS', 'UPI Binding'); 
        return { success: true }; 
    } catch (e) { handleFirebaseError(e, OperationType.UPDATE, `users/${currentUser.uid}`); return { success: false }; }
};

export const joinTelegramReward = async () => { 
    if (!currentUser || currentUser.isTelegramJoined) return { success: false }; 
    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { isTelegramJoined: true }); 
        await updateBalance(5, 'BONUS', 'Telegram Reward'); 
        return { success: true }; 
    } catch (e) { handleFirebaseError(e, OperationType.UPDATE, `users/${currentUser.uid}`); return { success: false }; }
};

export const subscribeToChat = (cb: (msgs: ChatMessage[]) => void) => {
    const chatColRef = collection(db, 'chat');
    const q = query(chatColRef, orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() })) as ChatMessage[]), (err) => handleFirebaseError(err, OperationType.LIST, 'chat'));
};

export const sendChatMessage = async (text: string) => { 
    if (!currentUser) return; 
    try {
        const chatColRef = collection(db, 'chat');
        await addDoc(chatColRef, { uid: currentUser.uid, username: currentUser.username, text, timestamp: serverTimestamp(), avatar: currentUser.avatar, vip: currentUser.vipLevel }); 
    } catch (e) { handleFirebaseError(e, OperationType.CREATE, 'chat'); }
};

// ADMIN & MANAGEMENT FUNCTIONS
export const getAllUsers = (cb: (users: UserProfile[]) => void) => {
    const usersColRef = collection(db, 'users');
    return onSnapshot(usersColRef, (snapshot) => {
        cb(snapshot.docs.map(d => ({ ...d.data(), uid: d.id })) as UserProfile[]);
    }, (err) => handleFirebaseError(err, OperationType.LIST, 'users'));
};

export const adminUpdateUserBalance = async (uid: string, amount: number, isGift: boolean) => {
    try {
        const userDocRef = doc(db, 'users', uid);
        const snap = await getDoc(userDocRef);
        const userData = snap.data();
        if (!userData) return;
        const newBalance = (Number(userData.balance) || 0) + amount;
        await updateDoc(userDocRef, { balance: newBalance });
        const txColRef = collection(db, `transactions/${uid}/items`);
        await addDoc(txColRef, { type: isGift ? 'GIFT' : 'BET', amount: Math.abs(amount), status: 'SUCCESS', desc: isGift ? 'Admin Gift' : 'Admin Deduction', date: new Date().toLocaleString(), timestamp: serverTimestamp() });
    } catch (e) { handleFirebaseError(e, OperationType.UPDATE, `users/${uid}`); }
};

export const adminBlockUser = async (uid: string, isBlocked: boolean) => {
    try { await updateDoc(doc(db, 'users', uid), { isBlocked }); } catch (e) { handleFirebaseError(e, OperationType.UPDATE, `users/${uid}`); }
};

export const adminDeleteUser = async (uid: string) => {
    try {
        await deleteDoc(doc(db, 'users', uid));
        // Note: Subcollections are not deleted automatically in Firestore
    } catch (e) { handleFirebaseError(e, OperationType.DELETE, `users/${uid}`); }
};

export const adminGetSettings = (cb: (s: AppSettings | null) => void) => {
    return onSnapshot(doc(db, 'app_settings', 'global'), (s) => cb(s.data() as AppSettings), (err) => handleFirebaseError(err, OperationType.GET, 'app_settings/global'));
};

export const adminUpdateSettings = async (updates: Partial<AppSettings>) => {
    try { await setDoc(doc(db, 'app_settings', 'global'), updates, { merge: true }); } catch (e) { handleFirebaseError(e, OperationType.UPDATE, 'app_settings/global'); }
};

export const adminCreateGiftCode = async (gift: GiftCode) => {
    try { await setDoc(doc(db, 'gift_codes', gift.code), gift); } catch (e) { handleFirebaseError(e, OperationType.CREATE, `gift_codes/${gift.code}`); }
};

export const adminGetAllGiftCodes = (cb: (codes: GiftCode[]) => void) => {
    return onSnapshot(collection(db, 'gift_codes'), (s) => cb(s.docs.map(d => d.data() as GiftCode)), (err) => handleFirebaseError(err, OperationType.LIST, 'gift_codes'));
};

export const redeemGiftCode = async (code: string) => {
    if (!currentUser) return { success: false, message: 'Not logged in' };
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return { success: false, message: 'Enter a valid code' };

    try {
        const giftDocRef = doc(db, 'gift_codes', cleanCode);
        const giftSnap = await getDoc(giftDocRef);
        
        if (!giftSnap.exists()) {
            // Try case-sensitive if upper-case fails
            const altRef = doc(db, 'gift_codes', code.trim());
            const altSnap = await getDoc(altRef);
            if (!altSnap.exists()) return { success: false, message: 'Invalid gift code' };
            return processRedemption(altSnap.data() as GiftCode, code.trim());
        }
        
        return processRedemption(giftSnap.data() as GiftCode, cleanCode);
    } catch (e) {
        handleFirebaseError(e, OperationType.UPDATE, `gift_codes/${cleanCode}`);
        return { success: false, message: 'Redemption failed' };
    }
};

const processRedemption = async (gift: GiftCode, code: string) => {
    if (!currentUser) return { success: false, message: 'Not logged in' };
    if (gift.usedCount >= gift.limit) return { success: false, message: 'Code limit reached' };
    
    // Check if already used by this user
    const redemptionRef = doc(db, `gift_codes/${gift.code}/redemptions`, currentUser.uid);
    const redemptionSnap = await getDoc(redemptionRef);
    if (redemptionSnap.exists()) return { success: false, message: 'Already redeemed by you' };

    await updateBalance(gift.amount, 'GIFT', `Redeemed: ${code}`);
    await updateDoc(doc(db, 'gift_codes', gift.code), { usedCount: increment(1) });
    await setDoc(redemptionRef, { uid: currentUser.uid, timestamp: serverTimestamp() });
    
    return { success: true, message: `₹${gift.amount.toFixed(2)} added to your wallet!` };
};

export const getAllPendingTransactions = (cb: (requests: any[]) => void) => {
    // This is more complex in Firestore with subcollections. 
    // For now, we'll just listen to a top-level pending_transactions if we had one, 
    // or we'd need a collectionGroup query.
    // Let's use a collectionGroup query if possible, but for simplicity we'll skip for now or use a different approach.
    cb([]); 
};

export const approveTransaction = async (uid: string, txId: string) => {
    try {
        const txDocRef = doc(db, `transactions/${uid}/items`, txId);
        const snap = await getDoc(txDocRef);
        const tx = snap.data();
        if (!tx || tx.status !== 'PROCESSING') return;
        await updateDoc(txDocRef, { status: 'SUCCESS' });
        if (tx.type === 'DEPOSIT') {
            const userDocRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userDocRef);
            const user = userSnap.data() as UserProfile;
            if (!user) return;
            const amount = Number(tx.amount);
            const newTotalDeposit = (Number(user.totalDeposit) || 0) + amount;
            const newBalance = (Number(user.balance) || 0) + amount;
            let newVip = Number(user.vipLevel) || 0;
            const thresholds = [500, 2000, 50000, 100000, 400000];
            thresholds.forEach((t, i) => { if (newTotalDeposit >= t) newVip = Math.max(newVip, i + 1); });
            
            const newWager = (user.wagerRequired || 0) + amount;
            const updates: any = { 
                balance: newBalance, 
                totalDeposit: newTotalDeposit, 
                vipLevel: newVip,
                wagerRequired: newWager,
                wagerTotal: (user.wagerTotal || 0) + amount
            };
            if ((Number(user.totalDeposit) || 0) === 0) {
                 const bonus = amount * 0.20;
                 await addDoc(collection(db, `transactions/${uid}/items`), { type: 'BONUS', amount: bonus, status: 'SUCCESS', desc: 'First Deposit Bonus', date: new Date().toLocaleString(), timestamp: serverTimestamp() });
                 updates.balance += bonus;
            }
            await updateDoc(userDocRef, updates);
        }
    } catch (e) { handleFirebaseError(e, OperationType.UPDATE, `transactions/${uid}/items/${txId}`); }
};

export const rejectTransaction = async (uid: string, txId: string) => {
    try {
        const txDocRef = doc(db, `transactions/${uid}/items`, txId);
        const snap = await getDoc(txDocRef);
        const tx = snap.data();
        if (!tx || tx.status !== 'PROCESSING') return;
        await updateDoc(txDocRef, { status: 'FAILED' });
        if (tx.type === 'WITHDRAW') {
            const userDocRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userDocRef);
            const user = userSnap.data();
            if (user) await updateDoc(userDocRef, { balance: (Number(user.balance) || 0) + Number(tx.amount) });
        }
    } catch (e) { handleFirebaseError(e, OperationType.UPDATE, `transactions/${uid}/items/${txId}`); }
};

// REMOVED: startGlobalEngines is now handled by server.ts
initSession();
