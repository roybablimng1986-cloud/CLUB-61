import { createClient } from '@supabase/supabase-js';
import { UserProfile, Transaction, AppSettings, GiftCode, ChatMessage, GameHistoryItem, ActivationCode } from '../types';

// ==========================================
// SUPABASE CLIENT INITIALIZATION
// ==========================================
const SUPABASE_URL = "https://svyknnrwiqehvnvjwvpb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2eWtubnJ3aXFlaHZudmp3dnBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzg1NDAsImV4cCI6MjA5NjgxNDU0MH0.Nm7Ut7CRUDnigxaGen7e3pxhv4Ltim-RMBxbKNghufE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mock Firestore exports to prevent page import errors
export const db = {};
export const auth = {
    get currentUser() {
        return currentUser ? { uid: currentUser.uid, email: currentUser.email, emailVerified: true } : null;
    }
};

// ==========================================
// APPLICATION MEMORY & LOCAL FALLBACK STATE
// ==========================================
export let currentUser: UserProfile | null = null;
let balanceSubscribers: { cb: (user: UserProfile | null) => void; err?: (msg: string) => void }[] = [];

// Local cache database to guarantee 100% crash-proof offline functionality
const LOCAL_USERS_KEY = 'MAFIA_USERS_DB';
const LOCAL_TXS_KEY = 'MAFIA_TXS_DB';
const LOCAL_GIFTS_KEY = 'MAFIA_GIFTS_DB';
const LOCAL_PENDING_TXS_KEY = 'MAFIA_PENDING_TXS_DB';
const LOCAL_HISTORY_KEY = 'MAFIA_HISTORY_DB';
const LOCAL_SETTINGS_KEY = 'MAFIA_SETTINGS_DB';

const getLocalStorageItem = <T>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
};

const setLocalStorageItem = <T>(key: string, val: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(val));
    } catch {}
};

// Initialize fallbacks
let localUsers = getLocalStorageItem<Record<string, UserProfile>>(LOCAL_USERS_KEY, {});
let localTransactions = getLocalStorageItem<Record<string, Transaction[]>>(LOCAL_TXS_KEY, {});
let localGiftCodes = getLocalStorageItem<GiftCode[]>(LOCAL_GIFTS_KEY, []);
let localPendingTransactions = getLocalStorageItem<any[]>(LOCAL_PENDING_TXS_KEY, []);
let localGameHistory = getLocalStorageItem<GameHistoryItem[]>(LOCAL_HISTORY_KEY, []);
let localSettings = getLocalStorageItem<AppSettings>(LOCAL_SETTINGS_KEY, {
    upiId: '9339409219@fam',
    disabledGames: {},
    globalWinProbability: 40,
    gameProbabilities: {},
    minWithdrawal: 100,
    maxWithdrawal: 100000,
    minDeposit: 20,
    depositQrImage: ''
});

// Admin credentials
const ADMIN_EMAIL = "infinityfilms466@gmail.com";
const ADMIN_PASSWORD = "Op098765";
const ADMIN_PHONE = "9339409219";

// ==========================================
// SOUND SYSTEM ENGINE
// ==========================================
let isMuted = getLocalStorageItem<boolean>('MAFIA_SOUND_MUTED', false);
const audioCache: Record<string, HTMLAudioElement> = {};

const SOUND_URLS: Record<string, string> = {
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav', // General clean UI button click
    win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav', // Winning melody / bell
    loss: 'https://assets.mixkit.co/active_storage/sfx/2517/2517-84.wav', // Fail / buzzer melody
    spin: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav', // Wheel spin / swoosh
    tick: 'https://assets.mixkit.co/active_storage/sfx/2545/2545-84.wav', // Generic countdown tick
    wingo_tick: 'https://assets.mixkit.co/active_storage/sfx/2545/2545-84.wav', // WinGo clock ticking
    mine_reveal: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav', // Reveal card or gem
    mine_bomb: 'https://assets.mixkit.co/active_storage/sfx/1659/1659-84.wav', // Massive bomb explosion
    sports_kick: 'https://assets.mixkit.co/active_storage/sfx/2654/2654-84.wav', // Ludo kick sound
    bet_place: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav', // Placing chips whoosh
    card_flip: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav', // Realistic card dealing flip
    plane_crash: 'https://assets.mixkit.co/active_storage/sfx/1659/1659-84.wav', // Jet crash boom
    cash_out: 'https://assets.mixkit.co/active_storage/sfx/1685/1685-84.wav', // Casino coin cash register payout
    wheel_spin: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav', // Spinning roulette wheel
    dt_card: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav', // Dragon tiger card deal
    tower_step: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav', // Tower climb pop step
    bomb: 'https://assets.mixkit.co/active_storage/sfx/1659/1659-84.wav', // Bomb blast
    wingo_draw: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav', // WinGo win chime
    ludo_roll: 'https://assets.mixkit.co/active_storage/sfx/1115/1115-84.wav', // Rattle roll cup dice
    ludo_move: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav', // Piece move step click
    ludo_kill: 'https://assets.mixkit.co/active_storage/sfx/1659/1659-84.wav', // Piece home kill blast
    
    // Additional and mapped game specific keys to ensure fully matching realistic soundscapes
    win_popup: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav',
    loss_popup: 'https://assets.mixkit.co/active_storage/sfx/2517/2517-84.wav',
    lose: 'https://assets.mixkit.co/active_storage/sfx/2517/2517-84.wav',
    reward: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav',
    plane: 'https://assets.mixkit.co/active_storage/sfx/2756/2756-84.wav', // Aviator jet hum engine whoosh
    crash: 'https://assets.mixkit.co/active_storage/sfx/1659/1659-84.wav',
    car_crash: 'https://assets.mixkit.co/active_storage/sfx/1012/1012-84.wav', // Heavy metal car collision impact
    car_next: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav', // Gas pedal engine rev
    
    // Scratch card friction scraping sound
    scratch: 'https://assets.mixkit.co/active_storage/sfx/2405/2405-84.wav',
    
    // Whack hammer cartoon pop block
    hammer: 'https://assets.mixkit.co/active_storage/sfx/1995/1995-84.wav',
    
    // Pump balloon inflate air release
    balloon_inflate: 'https://assets.mixkit.co/active_storage/sfx/1485/1485-84.wav',
    
    // Dice cup shake rattle
    dice_rattle: 'https://assets.mixkit.co/active_storage/sfx/1115/1115-84.wav',
    dice_roll: 'https://assets.mixkit.co/active_storage/sfx/2539/2539-84.wav'
};

export const toggleMute = () => {
    isMuted = !isMuted;
    setLocalStorageItem('MAFIA_SOUND_MUTED', isMuted);
    return isMuted;
};

export const getMuteStatus = () => isMuted;

export const playSound = (soundName: string) => {
    if (isMuted) return;
    try {
        const url = SOUND_URLS[soundName];
        if (!url) return;
        if (!audioCache[soundName]) {
            audioCache[soundName] = new Audio(url);
        }
        const audio = audioCache[soundName];
        audio.currentTime = 0;
        audio.play().catch(() => {});
    } catch {}
};

export const stopAllSounds = () => {
    Object.values(audioCache).forEach(audio => {
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch {}
    });
};

// ==========================================
// UTILITY HELPERS
// ==========================================
export const getClockOffset = () => 0;

const notifySubscribers = () => {
    balanceSubscribers.forEach(sub => {
        sub.cb(currentUser ? { ...currentUser } : null);
    });
};

const saveAndSyncUser = async (user: UserProfile) => {
    localUsers[user.uid] = user;
    setLocalStorageItem(LOCAL_USERS_KEY, localUsers);
    
    if (currentUser && user.uid === currentUser.uid) {
        currentUser = { ...user };
        notifySubscribers();
    }
    
    // Attempt remote save to Supabase
    try {
        const { error } = await supabase.from('users').upsert({
            uid: user.uid,
            phone: user.phone,
            email: user.email,
            username: user.username,
            name: user.name,
            balance: user.balance,
            vip_level: user.vipLevel,
            total_deposit: user.totalDeposit,
            total_bet: user.totalBet,
            invite_code: user.inviteCode,
            invited_by: user.invitedBy,
            wager_required: user.wagerRequired,
            wager_total: user.wagerTotal,
            password: user.password,
            is_blocked: user.isBlocked,
            withdrawal_password: user.withdrawalPassword
        }, { onConflict: 'uid' });
        if (error) {
            console.warn("Supabase user upsert info (local-first fallback is active):", error.message);
        }
    } catch (e) {
        console.warn("Supabase user upsert offline fallback:", e);
    }
};

// ==========================================
// REAL-TIME SUPABASE SYNCHRONIZATION
// ==========================================
let activeRealtimeChannel: any = null;

export const setupRealtimeSubscription = (userId: string) => {
    if (activeRealtimeChannel) {
        activeRealtimeChannel.unsubscribe();
        activeRealtimeChannel = null;
    }

    if (!userId) return;

    try {
        activeRealtimeChannel = supabase
            .channel(`public:users:uid=eq.${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `uid=eq.${userId}`
                },
                (payload) => {
                    const updatedData = payload.new;
                    if (updatedData && currentUser && updatedData.uid === currentUser.uid) {
                        let changed = false;
                        
                        const newBalance = Number(updatedData.balance);
                        if (currentUser.balance !== newBalance) {
                            currentUser.balance = newBalance;
                            localUsers[currentUser.uid].balance = newBalance;
                            changed = true;
                        }
                        
                        const newVip = Number(updatedData.vip_level);
                        if (currentUser.vipLevel !== newVip) {
                            currentUser.vipLevel = newVip;
                            localUsers[currentUser.uid].vipLevel = newVip;
                            changed = true;
                        }

                        const newTotalDeposit = Number(updatedData.total_deposit);
                        if (currentUser.totalDeposit !== newTotalDeposit) {
                            currentUser.totalDeposit = newTotalDeposit;
                            localUsers[currentUser.uid].totalDeposit = newTotalDeposit;
                            changed = true;
                        }

                        const newTotalBet = Number(updatedData.total_bet);
                        if (currentUser.totalBet !== newTotalBet) {
                            currentUser.totalBet = newTotalBet;
                            localUsers[currentUser.uid].totalBet = newTotalBet;
                            changed = true;
                        }

                        const newWagerRequired = Number(updatedData.wager_required);
                        if (currentUser.wagerRequired !== newWagerRequired) {
                            currentUser.wagerRequired = newWagerRequired;
                            localUsers[currentUser.uid].wagerRequired = newWagerRequired;
                            changed = true;
                        }

                        const newWagerTotal = Number(updatedData.wager_total);
                        if (currentUser.wagerTotal !== newWagerTotal) {
                            currentUser.wagerTotal = newWagerTotal;
                            localUsers[currentUser.uid].wagerTotal = newWagerTotal;
                            changed = true;
                        }

                        if (changed) {
                            setLocalStorageItem(LOCAL_USERS_KEY, localUsers);
                            notifySubscribers();
                        }
                    }
                }
            )
            .subscribe();
    } catch (err) {
        console.warn('Error setting up Supabase realtime subscription (offline mode active):', err);
    }
};

export const clearRealtimeSubscription = () => {
    if (activeRealtimeChannel) {
        activeRealtimeChannel.unsubscribe();
        activeRealtimeChannel = null;
    }
};

// ==========================================
// AUTHENTICATION OPERATIONS
// ==========================================
export const checkAuth = () => {
    return !!currentUser;
};

export const subscribeToBalance = (cb: (user: UserProfile | null) => void, err?: (msg: string) => void) => {
    balanceSubscribers.push({ cb, err });
    cb(currentUser);
    return () => {
        balanceSubscribers = balanceSubscribers.filter(s => s.cb !== cb);
    };
};

export const login = async (phoneInput: string, emailInput: string, passwordInput: string) => {
    const email = emailInput.trim().toLowerCase();
    const phone = phoneInput.trim();
    const password = passwordInput;

    // Hardcoded Admin Credentials override
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD && phone === ADMIN_PHONE) {
        const adminUid = 'ADMIN_9339409219';
        let adminUser = localUsers[adminUid];
        if (!adminUser) {
            adminUser = {
                uid: adminUid,
                phone: ADMIN_PHONE,
                email: ADMIN_EMAIL,
                username: 'root_admin',
                name: 'System Admin',
                balance: 1000000,
                vipLevel: 5,
                totalDeposit: 1000000,
                totalBet: 0,
                inviteCode: 'ADMINUPI',
                invitedBy: '',
                wagerRequired: 0,
                wagerTotal: 0,
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150',
                password: ADMIN_PASSWORD,
                isAdmin: true,
                isBlocked: false
            };
            await saveAndSyncUser(adminUser);
        }
        currentUser = adminUser;
        localStorage.setItem('FALLBACK_USER_UID', adminUid);
        notifySubscribers();
        setupRealtimeSubscription(adminUid);
        return { success: true };
    }

    // Standard user auth from Supabase or Local Users
    try {
        const foundUser = Object.values(localUsers).find(u => 
            (u.email?.toLowerCase() === email || u.phone === phone) && u.password === password
        );
        if (foundUser) {
            if (foundUser.isBlocked) {
                return { success: false, message: 'Your account is blocked by the system' };
            }
            currentUser = foundUser;
            localStorage.setItem('FALLBACK_USER_UID', foundUser.uid);
            notifySubscribers();
            setupRealtimeSubscription(foundUser.uid);
            return { success: true };
        }
        
        // Check Supabase users table
        const { data, error } = await supabase.from('users').select('*')
            .or(`email.eq.${email},phone.eq.${phone}`)
            .eq('password', password).maybeSingle();
        if (data && !error) {
            if (data.is_blocked) {
                return { success: false, message: 'Your account is blocked by the system' };
            }
            const mappedUser: UserProfile = {
                uid: data.uid,
                phone: data.phone,
                email: data.email,
                username: data.username,
                name: data.name || data.username,
                balance: Number(data.balance) || 0,
                vipLevel: Number(data.vip_level) || 0,
                totalDeposit: Number(data.total_deposit) || 0,
                totalBet: Number(data.total_bet) || 0,
                inviteCode: data.invite_code,
                invitedBy: data.invited_by || '',
                wagerRequired: Number(data.wager_required) || 0,
                wagerTotal: Number(data.wager_total) || 0,
                avatar: data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${data.username}`,
                password: data.password,
                isAdmin: email === ADMIN_EMAIL && phone === ADMIN_PHONE,
                isBlocked: !!data.is_blocked,
                withdrawalPassword: data.withdrawal_password
            };
            localUsers[mappedUser.uid] = mappedUser;
            setLocalStorageItem(LOCAL_USERS_KEY, localUsers);
            currentUser = mappedUser;
            localStorage.setItem('FALLBACK_USER_UID', mappedUser.uid);
            notifySubscribers();
            setupRealtimeSubscription(mappedUser.uid);
            return { success: true };
        }
        return { success: false, message: 'Invalid credentials or user not found' };
    } catch {
        return { success: false, message: 'Authentication error' };
    }
};

export const register = async (phoneInput: string, emailInput: string, passwordInput: string, inviteCodeInput?: string, usernameInput?: string) => {
    const email = emailInput.trim().toLowerCase();
    const username = (usernameInput || '').trim() || ('user_' + Math.floor(Math.random() * 10000));
    const phone = phoneInput.trim();
    const password = passwordInput;
    const inviteCode = inviteCodeInput || '';

    // Check if user already exists
    const userExists = Object.values(localUsers).some(u => u.email?.toLowerCase() === email || u.phone === phone);
    if (userExists) {
        return { success: false, message: 'Email or Phone already registered' };
    }

    const uid = 'USER_' + Math.floor(Math.random() * 10000000);
    const newUser: UserProfile = {
        uid,
        phone,
        email,
        username,
        name: username,
        balance: 20, // Free welcome bonus
        vipLevel: 0,
        totalDeposit: 0,
        totalBet: 0,
        inviteCode: 'MAFIA_' + Math.floor(Math.random() * 9000 + 1000),
        invitedBy: inviteCode,
        wagerRequired: 100,
        wagerTotal: 100,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        password,
        isAdmin: email === ADMIN_EMAIL && phone === ADMIN_PHONE,
        isBlocked: false
    };

    await saveAndSyncUser(newUser);
    currentUser = newUser;
    localStorage.setItem('FALLBACK_USER_UID', uid);
    notifySubscribers();
    setupRealtimeSubscription(uid);
    return { success: true };
};

export const logout = async () => {
    currentUser = null;
    localStorage.removeItem('FALLBACK_USER_UID');
    notifySubscribers();
    clearRealtimeSubscription();
    return { success: true };
};

// ==========================================
// BALANCE & WALLET OPERATIONS
// ==========================================
export const updateBalance = async (amount: number, type: Transaction['type'] = 'BET', desc = 'Game Action') => {
    if (!currentUser) return;

    const newBalance = (currentUser.balance || 0) + amount;
    currentUser.balance = newBalance;

    const updates: any = { balance: newBalance };
    if (amount < 0) {
        updates.totalBet = (currentUser.totalBet || 0) + Math.abs(amount);
        updates.wagerRequired = Math.max(0, (currentUser.wagerRequired || 0) - Math.abs(amount));
        currentUser.totalBet = updates.totalBet;
        currentUser.wagerRequired = updates.wagerRequired;
    } else if (type === 'BONUS' || type === 'GIFT' || type === 'DEPOSIT') {
        const multiplier = 5.0;
        const addedWager = amount * multiplier;
        updates.wagerRequired = (currentUser.wagerRequired || 0) + addedWager;
        updates.wagerTotal = (currentUser.wagerTotal || (currentUser.wagerRequired || 0)) + addedWager;
        currentUser.wagerRequired = updates.wagerRequired;
        currentUser.wagerTotal = updates.wagerTotal;

        if (type === 'DEPOSIT') {
            updates.totalDeposit = (currentUser.totalDeposit || 0) + amount;
            currentUser.totalDeposit = updates.totalDeposit;
        }
    }

    notifySubscribers();
    await saveAndSyncUser(currentUser);

    // Save transaction
    const tx: Transaction = {
        id: 'TX_' + Math.floor(Math.random() * 10000000),
        type,
        amount: Math.abs(amount),
        status: 'SUCCESS',
        desc,
        date: new Date().toLocaleString(),
        timestamp: Date.now()
    };
    if (!localTransactions[currentUser.uid]) {
        localTransactions[currentUser.uid] = [];
    }
    localTransactions[currentUser.uid].unshift(tx);
    setLocalStorageItem(LOCAL_TXS_KEY, localTransactions);
};

// ==========================================
// DEPOSIT & WITHDRAWAL GATEWAY
// ==========================================
export const submitDepositRequest = async (amount: number, method: string, utr: string) => {
    if (!currentUser) return;
    const txId = 'TX_' + Math.floor(Math.random() * 10000000);
    const tx = {
        id: txId,
        type: 'DEPOSIT' as const,
        amount,
        status: 'PROCESSING' as const,
        method,
        utr,
        desc: `Refill via ${method}`,
        date: new Date().toLocaleString(),
        timestamp: Date.now()
    };

    if (!localTransactions[currentUser.uid]) {
        localTransactions[currentUser.uid] = [];
    }
    localTransactions[currentUser.uid].unshift(tx);
    setLocalStorageItem(LOCAL_TXS_KEY, localTransactions);

    // Add to global pending
    const req = {
        uid: currentUser.uid,
        txId,
        amount,
        status: 'PROCESSING',
        method,
        utr,
        type: 'DEPOSIT',
        desc: `Refill via ${method}`,
        date: new Date().toLocaleString(),
        timestamp: Date.now()
    };
    localPendingTransactions.unshift(req);
    setLocalStorageItem(LOCAL_PENDING_TXS_KEY, localPendingTransactions);
};

export const handleWithdraw = async (amount: number, method: string, passwordInput: string, details: any) => {
    if (!currentUser) return { success: false, message: 'Not logged in' };
    if (currentUser.withdrawalPassword !== passwordInput) return { success: false, message: 'Invalid PIN' };
    if (currentUser.balance < amount) return { success: false, message: 'Insufficient balance' };
    if ((currentUser.wagerRequired || 0) > 0) return { success: false, message: 'Turnover incomplete' };

    const remainingBalance = currentUser.balance - amount;
    currentUser.balance = remainingBalance;
    const newWagerRequired = remainingBalance >= 1 ? remainingBalance : 0;
    currentUser.wagerRequired = newWagerRequired;
    currentUser.wagerTotal = (currentUser.wagerTotal || 0) + newWagerRequired;

    await saveAndSyncUser(currentUser);

    const txId = 'TX_' + Math.floor(Math.random() * 10000000);
    const tx = {
        id: txId,
        type: 'WITHDRAW' as const,
        amount,
        status: 'PROCESSING' as const,
        method,
        accountDetails: details,
        desc: `Withdraw via ${method}`,
        date: new Date().toLocaleString(),
        timestamp: Date.now()
    };

    if (!localTransactions[currentUser.uid]) {
        localTransactions[currentUser.uid] = [];
    }
    localTransactions[currentUser.uid].unshift(tx);
    setLocalStorageItem(LOCAL_TXS_KEY, localTransactions);

    const req = {
        uid: currentUser.uid,
        txId,
        amount,
        status: 'PROCESSING',
        method,
        accountDetails: details,
        type: 'WITHDRAW',
        desc: `Withdraw via ${method}`,
        date: new Date().toLocaleString(),
        timestamp: Date.now()
    };
    localPendingTransactions.unshift(req);
    setLocalStorageItem(LOCAL_PENDING_TXS_KEY, localPendingTransactions);

    return { success: true, message: 'Request submitted' };
};

// ==========================================
// GAME HISTORY & STATS
// ==========================================
export const addGameHistory = async (gameName: string, bet: number, win: number, details = '') => {
    const item: GameHistoryItem = {
        id: 'GH_' + Math.floor(Math.random() * 10000000),
        game: gameName,
        amount: bet,
        win: win,
        details,
        date: new Date().toLocaleString()
    };
    localGameHistory.unshift(item);
    setLocalStorageItem(LOCAL_HISTORY_KEY, localGameHistory);
};

export const addGameBet = async (gameId: string, betData: any) => {
    try {
        await fetch('/api/bets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                gameId, 
                uid: currentUser?.uid,
                username: currentUser?.username || currentUser?.name || 'Player',
                ...betData 
            })
        });
    } catch {}
};

const gameIdMapping: Record<string, string> = {
    'ludo': 'GAME_LUDO',
    'vortex': 'GAME_VORTEX',
    'mines': 'GAME_MINES',
    'dog road': 'GAME_CHICKEN_ROAD',
    'chicken road': 'GAME_CHICKEN_ROAD',
    'seven up down': 'GAME_7UP_DOWN',
    '7 up down': 'GAME_7UP_DOWN',
    'dragon tiger': 'GAME_DRAGON_TIGER',
    'roulette': 'GAME_ROULETTE',
    'lucky wheel': 'GAME_LUCKY_WHEEL',
    'cricket': 'GAME_CRICKET',
    'cricket hero': 'GAME_CRICKET',
    'tower': 'GAME_TOWER',
    'tower climb': 'GAME_TOWER',
    'andar bahar': 'GAME_ANDAR_BAHAR',
    'aviator': 'GAME_AVIATOR',
    'wingo': 'GAME_WINGO',
    'plinko': 'GAME_PLINKO',
    'limbo': 'GAME_LIMBO',
    'fruit slot': 'GAME_FRUIT_SLOT',
    'egypt slot': 'GAME_EGYPT_SLOT',
    'head & tails': 'GAME_HEAD_TAILS',
    'head tails': 'GAME_HEAD_TAILS',
    'keno': 'GAME_KENO',
    'dice duel': 'GAME_DICE',
    'dice': 'GAME_DICE',
    'hilo': 'GAME_HILO',
    'pump': 'GAME_PUMP',
    'pump up': 'GAME_PUMP',
    'moles': 'GAME_MOLES',
    'rat hunter': 'GAME_MOLES',
    'scratch card': 'GAME_SCRATCH_CARD',
};

export const shouldForceLoss = (betAmount: number, currentBalance: number, gameId?: string) => {
    if (!currentUser) return Math.random() < 0.6;
    if (currentUser.forcedOutcome === 'WIN') return false;
    if (currentUser.forcedOutcome === 'LOSS') return true;

    let winProb = localSettings.globalWinProbability;
    const searchId = gameId ? gameId.toLowerCase().trim() : '';
    const key = gameIdMapping[searchId] || gameId;
    const cleanId = key ? key.replace('GAME_', '').toLowerCase() : '';

    if (cleanId && localSettings.gameProbabilities?.[cleanId] !== undefined) {
        winProb = localSettings.gameProbabilities[cleanId];
    } else if (key && localSettings.gameProbabilities?.[key] !== undefined) {
        winProb = localSettings.gameProbabilities[key];
    } else if (searchId && localSettings.gameProbabilities?.[searchId] !== undefined) {
        winProb = localSettings.gameProbabilities[searchId];
    }
    return Math.random() < (1 - winProb / 100);
};

// ==========================================
// USER SPECIFIC FEATURES
// ==========================================
export const claimRebate = async () => {
    return { success: true, amount: 0 };
};

export const getGameStats = () => {
    const gameStatsMap: Record<string, { name: string, bet: number, win: number, profit: number }> = {};
    localGameHistory.forEach(h => {
        const gameName = h.game || 'Unknown';
        if (!gameStatsMap[gameName]) {
            gameStatsMap[gameName] = { name: gameName, bet: 0, win: 0, profit: 0 };
        }
        const betAmt = Number(h.amount) || 0;
        const winAmt = Number(h.win) || 0;
        gameStatsMap[gameName].bet += betAmt;
        gameStatsMap[gameName].win += winAmt;
        gameStatsMap[gameName].profit += (winAmt - betAmt);
    });
    return Object.values(gameStatsMap);
};

export const getGameHistory = (gameOrCb: string | ((hist: GameHistoryItem[]) => void), maybeCb?: (hist: GameHistoryItem[]) => void) => {
    let game = 'ALL';
    let cb: (hist: GameHistoryItem[]) => void;
    if (typeof gameOrCb === 'string') {
        game = gameOrCb;
        cb = maybeCb!;
    } else {
        cb = gameOrCb;
    }
    
    let list = localGameHistory;
    if (game !== 'ALL') {
        list = localGameHistory.filter(h => h.game?.toLowerCase() === game.toLowerCase());
    }
    cb(list);
    return () => {};
};

export const getTransactionHistory = (cb: (txs: Transaction[]) => void) => {
    if (currentUser) {
        cb(localTransactions[currentUser.uid] || []);
    } else {
        cb([]);
    }
    return () => {};
};

export const setWithdrawalPassword = async (pin: string) => {
    if (!currentUser) return false;
    currentUser.withdrawalPassword = pin;
    await saveAndSyncUser(currentUser);
    return true;
};

export const getLeaderboard = (cb: (l: any[]) => void) => {
    const defaultLeaderboard = [
        { username: 'AlphaGamer', amount: 94800, rank: 1, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alpha' },
        { username: 'GoldHunter', amount: 72100, rank: 2, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Gold' },
        { username: 'LootBoss', amount: 53900, rank: 3, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Loot' }
    ];
    cb(defaultLeaderboard);
    return () => {};
};

// ==========================================
// REFERRAL & TEAM SYSTEMS
// ==========================================
export let referralStats = {
    code: 'MAFIA_REF',
    link: window.location.origin,
    totalCommission: 0,
    yesterdayCommission: 0,
    directSubordinates: 0,
    teamSubordinates: 0,
    totalDepositAmount: 0,
    totalBetAmount: 0
};

export const getSubordinates = (cb: (s: any[]) => void) => {
    cb([]);
    return () => {};
};

export const getCommissions = (cb: (c: any[]) => void) => {
    cb([]);
    return () => {};
};

export const claimCommission = async () => {
    return { success: true, message: 'No commission available' };
};

export const bindBank = async (details: any) => {
    if (!currentUser) return { success: false };
    currentUser.bankDetails = details;
    await updateBalance(10, 'BONUS', 'Bank Binding Reward');
    await saveAndSyncUser(currentUser);
    return { success: true };
};

export const bindUpi = async (upiInput: string | { upiId: string }) => {
    if (!currentUser) return { success: false };
    const upi = typeof upiInput === 'string' ? upiInput : upiInput.upiId;
    currentUser.upiDetails = { upiId: upi };
    await updateBalance(5, 'BONUS', 'UPI Binding Reward');
    await saveAndSyncUser(currentUser);
    return { success: true };
};

export const joinTelegramReward = async () => {
    if (!currentUser) return { success: false };
    await updateBalance(5, 'BONUS', 'Telegram reward');
    return { success: true };
};

// ==========================================
// REAL-TIME CHAT
// ==========================================
export const subscribeToChat = (cb: (msgs: ChatMessage[]) => void) => {
    cb([
        { id: '1', uid: 'sys', username: 'System', text: 'Welcome to Elite Club Chatroom! Keep it elegant.', timestamp: Date.now() - 300000, avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150', vip: 5 }
    ]);
    return () => {};
};

export const sendChatMessage = async (text: string) => {
    console.log("Chat sent:", text);
};

// ==========================================
// REAL-TIME SYNCHRONIZED MULTIPLAYER LOOP SYSTEM
// ==========================================
const gameSubscribers: Record<string, ((state: any) => void)[]> = {
    wingo: [],
    andar_bahar: [],
    dragon_tiger: [],
    seven_up_down: [],
    jhandi_munda: [],
    cricket: [],
    baccarat: [],
    roulette: [],
    dice_duel: [],
    sic_bo: []
};

// Polling interval state
let isPollingActive = false;
const startMultiplayerGlobalSync = () => {
    if (isPollingActive) return;
    isPollingActive = true;
    setInterval(async () => {
        try {
            const res = await fetch('/api/games/states');
            if (res.ok) {
                const data = await res.json();
                Object.keys(gameSubscribers).forEach(gameId => {
                    const state = data[gameId];
                    if (state) {
                        gameSubscribers[gameId].forEach(cb => cb(state));
                    }
                });
            }
        } catch {}
    }, 1000);
};

// Core multiplayer subscriptions
export const subscribeToWinGo = (cb: (state: any) => void) => {
    gameSubscribers.wingo.push(cb);
    startMultiplayerGlobalSync();
    return () => { gameSubscribers.wingo = gameSubscribers.wingo.filter(x => x !== cb); };
};
export const subscribeToAndarBahar = (cb: (state: any) => void) => {
    gameSubscribers.andar_bahar.push(cb);
    startMultiplayerGlobalSync();
    return () => { gameSubscribers.andar_bahar = gameSubscribers.andar_bahar.filter(x => x !== cb); };
};
export const subscribeToAndarBaharBets = (cb: (state: any) => void) => {
    cb([]);
    return () => {};
};
export const subscribeToDragonTiger = (cb: (state: any) => void) => {
    gameSubscribers.dragon_tiger.push(cb);
    startMultiplayerGlobalSync();
    return () => { gameSubscribers.dragon_tiger = gameSubscribers.dragon_tiger.filter(x => x !== cb); };
};
export const subscribeToDragonTigerBets = (cb: (state: any) => void) => {
    cb([]);
    return () => {};
};
export const subscribeToSevenUpDown = (cb: (state: any) => void) => {
    gameSubscribers.seven_up_down.push(cb);
    startMultiplayerGlobalSync();
    return () => { gameSubscribers.seven_up_down = gameSubscribers.seven_up_down.filter(x => x !== cb); };
};
export const subscribeToSevenUpDownBets = (cb: (state: any) => void) => {
    cb([]);
    return () => {};
};
export const subscribeToCricket = (cb: (state: any) => void) => {
    gameSubscribers.cricket.push(cb);
    startMultiplayerGlobalSync();
    return () => { gameSubscribers.cricket = gameSubscribers.cricket.filter(x => x !== cb); };
};
export const subscribeToCricketBets = (cb: (state: any) => void) => {
    cb([]);
    return () => {};
};
export const subscribeToRoulette = (cb: (state: any) => void) => {
    gameSubscribers.roulette.push(cb);
    startMultiplayerGlobalSync();
    return () => { gameSubscribers.roulette = gameSubscribers.roulette.filter(x => x !== cb); };
};
export const subscribeToRouletteBets = (cb: (state: any) => void) => {
    cb([]);
    return () => {};
};

export const subscribeToDiceDuel = (cb: (state: any) => void) => {
    gameSubscribers.dice_duel.push(cb);
    startMultiplayerGlobalSync();
    return () => { gameSubscribers.dice_duel = gameSubscribers.dice_duel.filter(x => x !== cb); };
};
export const subscribeToDiceDuelBets = (cb: (state: any) => void) => {
    cb([]);
    return () => {};
};

// ==========================================
// ADMINISTRATIVE PLATFORM OPERATIONS
// ==========================================
let pendingTransactionsListeners: ((txs: any[]) => void)[] = [];
let usersListeners: ((users: UserProfile[]) => void)[] = [];

export const getAllUsers = (cb: (users: UserProfile[]) => void) => {
    usersListeners.push(cb);
    cb(Object.values(localUsers));
    return () => {
        usersListeners = usersListeners.filter(l => l !== cb);
    };
};

export const adminUpdateUserBalance = async (uid: string, amount: number, isGift: boolean) => {
    const user = localUsers[uid];
    if (!user) return false;

    user.balance = (user.balance || 0) + amount;
    if (amount > 0) {
        user.totalDeposit = (user.totalDeposit || 0) + amount;
    }
    await saveAndSyncUser(user);

    const tx: Transaction = {
        id: 'TX_' + Math.floor(Math.random() * 10000000),
        type: amount > 0 ? 'GIFT' : 'BET',
        amount: Math.abs(amount),
        status: 'SUCCESS',
        desc: isGift ? 'Admin Adjustment' : 'Manual Deduction',
        date: new Date().toLocaleString(),
        timestamp: Date.now()
    };
    if (!localTransactions[uid]) {
        localTransactions[uid] = [];
    }
    localTransactions[uid].unshift(tx);
    setLocalStorageItem(LOCAL_TXS_KEY, localTransactions);

    usersListeners.forEach(l => l(Object.values(localUsers)));
    notifySubscribers();
    return true;
};

export const adminBlockUser = async (uid: string, isBlocked: boolean) => {
    const user = localUsers[uid];
    if (!user) return false;
    if ((user.isAdmin || user.email === ADMIN_EMAIL || uid === 'ADMIN_9339409219') && isBlocked) {
        return false;
    }
    user.isBlocked = isBlocked;
    await saveAndSyncUser(user);
    usersListeners.forEach(l => l(Object.values(localUsers)));
    return true;
};

export const adminDeleteUser = async (uid: string) => {
    delete localUsers[uid];
    setLocalStorageItem(LOCAL_USERS_KEY, localUsers);
    try {
        await supabase.from('users').delete().eq('uid', uid);
    } catch (e) {
        console.warn("Error purging user from Supabase (offline fallback active):", e);
    }
    usersListeners.forEach(l => l(Object.values(localUsers)));
    return true;
};

// settings management
export const adminGetSettings = (cb: (s: AppSettings | null) => void) => {
    cb(localSettings);
    // Fetch fresh settings from the server to sync across all clients
    fetch('/api/settings')
        .then(res => {
            if (res.ok) return res.json();
        })
        .then(data => {
            if (data) {
                localSettings = { ...localSettings, ...data };
                setLocalStorageItem(LOCAL_SETTINGS_KEY, localSettings);
                cb(localSettings);
            }
        })
        .catch(() => {});
    return () => {};
};

export const adminUpdateSettings = async (updates: Partial<AppSettings>) => {
    localSettings = { ...localSettings, ...updates };
    setLocalStorageItem(LOCAL_SETTINGS_KEY, localSettings);
    
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localSettings)
        });
    } catch {}
    return true;
};

// Auto-sync settings in the background every 4 seconds for real-time control
if (typeof window !== 'undefined') {
    setInterval(() => {
        fetch('/api/settings')
            .then(res => {
                if (res.ok) return res.json();
            })
            .then(data => {
                if (data) {
                    localSettings = { ...localSettings, ...data };
                    setLocalStorageItem(LOCAL_SETTINGS_KEY, localSettings);
                }
            })
            .catch(() => {});
    }, 4000);
}

// gift codes management with advanced options
export const adminCreateGiftCode = async (gift: GiftCode) => {
    localGiftCodes.unshift(gift);
    setLocalStorageItem(LOCAL_GIFTS_KEY, localGiftCodes);

    try {
        await fetch('/api/admin/gift-codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gift)
        });
    } catch {}
    return true;
};

export const adminDeleteGiftCode = async (code: string) => {
    localGiftCodes = localGiftCodes.filter(g => g.code !== code);
    setLocalStorageItem(LOCAL_GIFTS_KEY, localGiftCodes);

    try {
        await fetch(`/api/admin/gift-codes/${code}`, {
            method: 'DELETE'
        });
    } catch {}
    return true;
};

export const adminGetAllGiftCodes = (cb: (gifts: GiftCode[]) => void) => {
    cb(localGiftCodes);
    return () => {};
};

export const redeemGiftCode = async (code: string) => {
    if (!currentUser) return { success: false, message: 'Please login first' };
    
    // Find code
    const cleanedCode = code.trim().toUpperCase();
    let gift = localGiftCodes.find(g => g.code === cleanedCode);

    // Try remote fetch
    try {
        const res = await fetch(`/api/gift-codes/${cleanedCode}`);
        if (res.ok) {
            gift = await res.json();
        }
    } catch {}

    if (!gift) return { success: false, message: 'Invalid gift code' };

    // Advanced Checks: VIP level check
    if (currentUser.vipLevel < (gift.minVip || 0)) {
        return { success: false, message: `This code requires VIP Level ${gift.minVip} or higher` };
    }

    // Personal User Check
    if (gift.personalUser && gift.personalUser.trim() !== '') {
        const target = gift.personalUser.trim().toLowerCase();
        const userUid = currentUser.uid.toLowerCase();
        const username = (currentUser.username || '').toLowerCase();
        if (userUid !== target && username !== target) {
            return { success: false, message: 'This gift code is exclusive to another account' };
        }
    }

    // Expiry Check
    if ((gift as any).expiryDate) {
        const expiry = new Date((gift as any).expiryDate).getTime();
        if (Date.now() > expiry) {
            return { success: false, message: 'This gift code has expired' };
        }
    }

    // Limit Check
    if (gift.usedCount >= gift.limit) {
        return { success: false, message: 'This gift code has already reached its maximum usage limit' };
    }

    // User duplication check
    if (!currentUser.usedGiftCodes) {
        currentUser.usedGiftCodes = [];
    }
    if (currentUser.usedGiftCodes.includes(cleanedCode)) {
        return { success: false, message: 'You have already redeemed this code' };
    }

    // Redeem code
    try {
        const claimRes = await fetch(`/api/gift-codes/${cleanedCode}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: currentUser.uid })
        });
        if (!claimRes.ok) {
            const errData = await claimRes.json();
            return { success: false, message: errData.error || 'Failed to claim gift code' };
        }
    } catch (e) {
        gift.usedCount++;
    }

    currentUser.usedGiftCodes.push(cleanedCode);
    setLocalStorageItem(LOCAL_GIFTS_KEY, localGiftCodes);
    await saveAndSyncUser(currentUser);
    await updateBalance(gift.amount, 'GIFT', `Redeemed: ${cleanedCode}`);

    return { success: true, message: `₹${gift.amount.toFixed(2)} added to your wallet!` };
};

// activation codes
export const adminCreateActivationCode = async (days: number, balance: number) => { return ''; };
export const adminGetAllActivationCodes = (cb: (codes: ActivationCode[]) => void) => { cb([]); return () => {}; };
export const adminDeleteActivationCode = async (id: string) => { return true; };
export const redeemActivationCode = async (id: string) => { return { success: false, message: '' }; };

// Transaction management (Approve / Reject)
export const getAllPendingTransactions = (cb: (requests: any[]) => void) => {
    pendingTransactionsListeners.push(cb);
    cb(localPendingTransactions);
    return () => {
        pendingTransactionsListeners = pendingTransactionsListeners.filter(l => l !== cb);
    };
};

export const approveTransaction = async (uid: string, txId: string) => {
    const reqIndex = localPendingTransactions.findIndex(r => r.txId === txId);
    if (reqIndex === -1) return;

    const req = localPendingTransactions[reqIndex];
    localPendingTransactions.splice(reqIndex, 1);
    setLocalStorageItem(LOCAL_PENDING_TXS_KEY, localPendingTransactions);

    const user = localUsers[uid];
    if (user) {
        if (req.type === 'DEPOSIT') {
            const amount = Number(req.amount);
            const newTotalDeposit = (Number(user.totalDeposit) || 0) + amount;
            const newBalance = (Number(user.balance) || 0) + amount;
            
            // Calculate VIP Tier updates
            let newVip = Number(user.vipLevel) || 0;
            const thresholds = [500, 2000, 50000, 100000, 400000];
            thresholds.forEach((t, i) => { if (newTotalDeposit >= t) newVip = Math.max(newVip, i + 1); });

            user.balance = newBalance;
            user.totalDeposit = newTotalDeposit;
            user.vipLevel = newVip;
            user.wagerRequired = (user.wagerRequired || 0) + (amount * 5);
            user.wagerTotal = (user.wagerTotal || 0) + (amount * 5);

            // First deposit bonus logic
            if ((Number(user.totalDeposit) || 0) === amount) {
                const bonus = amount * 0.25; // 25% Instant Cash Bonus
                user.balance += bonus;
                user.wagerRequired = (user.wagerRequired || 0) + (bonus * 5);
                user.wagerTotal = (user.wagerTotal || 0) + (bonus * 5);
                const bonusTx: Transaction = {
                    id: 'TX_' + Math.floor(Math.random() * 10000000),
                    type: 'BONUS',
                    amount: bonus,
                    status: 'SUCCESS',
                    desc: 'First Deposit Bonus',
                    date: new Date().toLocaleString(),
                    timestamp: Date.now()
                };
                if (!localTransactions[uid]) {
                    localTransactions[uid] = [];
                }
                localTransactions[uid].unshift(bonusTx);
            }
            await saveAndSyncUser(user);
        }
    }

    // Update transaction in transaction list to SUCCESS
    if (localTransactions[uid]) {
        const tx = localTransactions[uid].find(t => t.id === txId);
        if (tx) tx.status = 'SUCCESS';
        setLocalStorageItem(LOCAL_TXS_KEY, localTransactions);
    }

    pendingTransactionsListeners.forEach(l => l(localPendingTransactions));
    usersListeners.forEach(l => l(Object.values(localUsers)));
    notifySubscribers();
};

export const rejectTransaction = async (uid: string, txId: string) => {
    const reqIndex = localPendingTransactions.findIndex(r => r.txId === txId);
    if (reqIndex === -1) return;

    const req = localPendingTransactions[reqIndex];
    localPendingTransactions.splice(reqIndex, 1);
    setLocalStorageItem(LOCAL_PENDING_TXS_KEY, localPendingTransactions);

    const user = localUsers[uid];
    if (user && req.type === 'WITHDRAW') {
        // Refund withdrawal balance
        user.balance = (Number(user.balance) || 0) + Number(req.amount);
        await saveAndSyncUser(user);
    }

    // Update transaction in transaction list to FAILED
    if (localTransactions[uid]) {
        const tx = localTransactions[uid].find(t => t.id === txId);
        if (tx) tx.status = 'FAILED';
        setLocalStorageItem(LOCAL_TXS_KEY, localTransactions);
    }

    pendingTransactionsListeners.forEach(l => l(localPendingTransactions));
    usersListeners.forEach(l => l(Object.values(localUsers)));
    notifySubscribers();
};

let localLiveOverrides = getLocalStorageItem<Record<string, any>>('MAFIA_LIVE_RESULTS_OVERRIDE', {});
let liveOverrideListeners: ((data: Record<string, any>) => void)[] = [];

export const adminSetLiveOverride = async (gameId: string, result: any) => {
    localLiveOverrides[gameId] = result;
    setLocalStorageItem('MAFIA_LIVE_RESULTS_OVERRIDE', localLiveOverrides);
    liveOverrideListeners.forEach(l => l({ ...localLiveOverrides }));

    try {
        await fetch('/api/admin/override', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, result })
        });
    } catch {}
    return true;
};

export const adminClearLiveOverride = async (gameId: string) => {
    delete localLiveOverrides[gameId];
    setLocalStorageItem('MAFIA_LIVE_RESULTS_OVERRIDE', localLiveOverrides);
    liveOverrideListeners.forEach(l => l({ ...localLiveOverrides }));

    try {
        await fetch('/api/admin/override', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, result: null })
        });
    } catch {}
    return true;
};

// Local game overrides cache and publisher
let localResultOverrides = getLocalStorageItem<Record<string, any>>('MAFIA_GAME_RESULTS_OVERRIDE', {});
let resultControlListeners: ((data: Record<string, any>) => void)[] = [];

export const adminGetResultControl = (cb: (data: any) => void) => {
    resultControlListeners.push(cb);
    cb(localResultOverrides);
    return () => {
        resultControlListeners = resultControlListeners.filter(l => l !== cb);
    };
};

export const adminSetNextResult = async (gameId: string, result: any) => {
    if (result === null) {
        delete localResultOverrides[gameId];
    } else {
        localResultOverrides[gameId] = result;
    }
    setLocalStorageItem('MAFIA_GAME_RESULTS_OVERRIDE', localResultOverrides);
    resultControlListeners.forEach(l => l({ ...localResultOverrides }));
    
    try {
        await fetch('/api/admin/override', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, result })
        });
    } catch {}
    return true;
};

// Stub implementations of unused functions to keep compilation pristine
export const subscribeToLiveOverrides = (cb: (o: any) => void) => {
    liveOverrideListeners.push(cb);
    cb(localLiveOverrides);
    return () => {
        liveOverrideListeners = liveOverrideListeners.filter(l => l !== cb);
    };
};
export const adminSetForcedOutcome = async (uid: string, outcome: 'WIN' | 'LOSS' | 'NONE' | null) => {
    const user = localUsers[uid];
    if (!user) return false;
    user.forcedOutcome = (outcome === 'NONE' || !outcome) ? null : outcome;
    await saveAndSyncUser(user);
    usersListeners.forEach(l => l(Object.values(localUsers)));
    return true;
};

export const adminGetUserTransactions = (uid: string, cb: (txs: Transaction[]) => void) => {
    cb(localTransactions[uid] || []);
    return () => {};
};

// Load session profile on load
const initSession = () => {
    // Unblock any blocked admin users
    Object.keys(localUsers).forEach(uid => {
        const u = localUsers[uid];
        if (u.isAdmin || u.email === ADMIN_EMAIL || uid === 'ADMIN_9339409219') {
            if (u.isBlocked) {
                u.isBlocked = false;
                saveAndSyncUser(u);
            }
        }
    });

    const savedUid = localStorage.getItem('FALLBACK_USER_UID');
    if (savedUid && localUsers[savedUid]) {
        currentUser = localUsers[savedUid];
        if (currentUser && (currentUser.isAdmin || currentUser.email === ADMIN_EMAIL || currentUser.uid === 'ADMIN_9339409219')) {
            currentUser.isBlocked = false;
            localUsers[currentUser.uid].isBlocked = false;
            setLocalStorageItem(LOCAL_USERS_KEY, localUsers);
        }
        notifySubscribers();
        if (currentUser) {
            setupRealtimeSubscription(currentUser.uid);
        }
    }
};

initSession();
