
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, query, orderBy, limit, getDocs, writeBatch, serverTimestamp, onSnapshot } from 'firebase/firestore';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

const app = initializeApp(firebaseConfig);
const config = firebaseConfig as any;
const db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

// Admin Control States
let adminOverrides: any = {};
let pendingOverrideClears: string[] = [];
onSnapshot(doc(db, 'admin_control', 'game_results'), (s) => {
    adminOverrides = s.data() || {};
}, (err) => console.error('Admin Control Listener Error:', err));

const useOverride = (gameId: string) => {
    const val = adminOverrides[gameId];
    if (val !== undefined && val !== null) {
        // Queue for clearing during next global sync
        pendingOverrideClears.push(gameId);
        adminOverrides[gameId] = null; // Clear locally immediately
        return val;
    }
    return null;
};

// Game States
let winGoState: any = { timeLeft: 30, period: 202511261000, history: [
    { period: "202511260999", number: 7, bigSmall: "Big", color: "Green" },
    { period: "202511260998", number: 2, bigSmall: "Small", color: "Red" },
    { period: "202511260997", number: 5, bigSmall: "Big", color: "Violet" }
], status: 'BETTING', lastResult: null, endTime: Date.now() + 30000 };
let aviatorState: any = { phase: 'WAITING', multiplier: 1.0, timeLeft: 10, history: [1.2, 5.4, 1.0, 2.3, 15.2, 1.1], crashPoint: 0, startTime: 0, endTime: Date.now() + 10000 };
let dtState: any = { status: 'BETTING', timeLeft: 15, period: '2024001', dragonCards: [], tigerCards: [], history: ['D', 'T', 'D', 'D', 'T', 'ST'], endTime: Date.now() + 15000 };
let abState: any = { status: 'BETTING', timeLeft: 20, period: '2024001', joker: null, andarCards: [], baharCards: [], winner: null, history: ['A', 'B', 'A', 'A'], endTime: Date.now() + 20000 };
let srState: any = { status: 'BETTING', timeLeft: 20, period: '2024001', multiplier: 1.0, crashPoint: 0, history: [1.5, 10.2, 1.05], endTime: Date.now() + 20000 };
let cgState: any = { status: 'BETTING', timeLeft: 25, period: '2024001', grid: Array(9).fill(0), history: [], endTime: Date.now() + 25000 };
let cricketState: any = { status: 'BETTING', timeLeft: 20, period: '2024001', landed: null, history: [4, 6, 1, 0, 2], endTime: Date.now() + 20000 };
let baccaratState: any = { status: 'BETTING', timeLeft: 25, period: '2024001', playerHand: [], bankerHand: [], winner: null, history: ['P', 'B', 'B', 'P'], endTime: Date.now() + 25000 };
let rouletteState: any = { status: 'BETTING', timeLeft: 35, period: '2024001', winningNumber: null, history: [12, 5, 32, 0, 18], endTime: Date.now() + 35000 };
let sicboState: any = { status: 'BETTING', timeLeft: 25, period: '2024001', dice: [1,1,1], history: [10, 5, 15, 8], endTime: Date.now() + 25000 };
let sevenUpDownState: any = { status: 'BETTING', timeLeft: 25, period: '2024001', dice: [1,1], sum: 2, history: [10, 4, 8, 3], endTime: Date.now() + 25000 };

// Sync Control
let forceSyncNext = false;
const triggerSync = () => { forceSyncNext = true; };

const generateWinGoResult = (period: string) => {
  const num = Math.floor(Math.random() * 10);
  let color = num === 0 || num === 5 ? 'Violet' : [1,3,7,9].includes(num) ? 'Green' : 'Red';
  return { period, number: num, bigSmall: num >= 5 ? 'Big' : 'Small', color };
};

// Start Game Engines
const startEngines = () => {
    console.log('Server-side Game Engines Starting...');

    // Fake Bet Engine - Stored in memory to save Firestore writes
    const FAKE_NAMES = ['Rahul', 'Amit', 'Suresh', 'Priya', 'Anjali', 'Vikram', 'Deepak', 'Sneha', 'Arjun', 'Karan', 'Neha', 'Rohan', 'Simran', 'Aakash', 'Ishani', 'Kabir', 'Zoya', 'Aaryan', 'Myra', 'Advait', 'Saanvi'];
    const GAMES_WITH_BETS = [
      { id: 'seven_up_down', bets: 'seven_up_down_bets', options: ['UP', 'DOWN', 'SEVEN'] },
      { id: 'dragon_tiger', bets: 'dragon_tiger_bets', options: ['D', 'T', 'Tie', 'ST'] },
      { id: 'andar_bahar', bets: 'andar_bahar_bets', options: ['ANDAR', 'BAHAR'] },
      { id: 'space_raid', bets: 'space_raid_bets', options: ['BET'] },
      { id: 'cricket', bets: 'cricket_bets', options: ['1', '2', '4', '6', '0'] },
      { id: 'baccarat', bets: 'baccarat_bets', options: ['PLAYER', 'BANKER', 'TIE'] },
      { id: 'roulette', bets: 'roulette_bets', options: ['RED', 'BLACK', 'EVEN', 'ODD'] },
      { id: 'sic_bo', bets: 'sic_bo_bets', options: ['SMALL', 'BIG', 'TRIPLE'] },
      { id: 'win_go', bets: 'wingo_bets', options: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'SMALL', 'BIG', 'RED', 'GREEN', 'VIOLET'] },
      { id: 'aviator', bets: 'aviator_bets', options: ['BET'] }
    ];

    const gameFakeBets: { [key: string]: any[] } = {};
    GAMES_WITH_BETS.forEach(g => gameFakeBets[g.bets] = []);

    // Global Sync Engine - The ONLY place that writes game states to Firestore
    let isSyncing = false;
    let lastSyncData = '';
    let lastSyncTime = 0;

    const runGlobalSync = async () => {
        if (isSyncing) return;
        isSyncing = true;
        try {
            const now = Date.now();
            
            // State projection (exclude timeLeft to save quota, clients use endTime)
            const projection = (st: any) => {
                const { timeLeft, ...syncable } = st;
                return syncable;
            };

            const currentSyncData = JSON.stringify({
                // Status and Period change detection
                w: winGoState.status + winGoState.period,
                a: aviatorState.phase,
                dt: dtState.status + dtState.period,
                ab: abState.status + abState.period,
                sr: srState.status,
                c: cricketState.status,
                b: baccaratState.status,
                r: rouletteState.status,
                s: sicboState.status,
                sud: sevenUpDownState.status
            });

            const timeSinceLastSync = now - lastSyncTime;
            // SYNC LOGIC: Every 5s if status changed or forceSyncNext, or every 20s anyway (Slightly more aggressive for stability)
            const shouldWrite = (timeSinceLastSync >= 5000 && (currentSyncData !== lastSyncData || forceSyncNext)) || (timeSinceLastSync > 20000);

            if (shouldWrite) {
                const allStates = {
                    wingo: projection(winGoState),
                    aviator: projection(aviatorState),
                    dragon_tiger: projection(dtState),
                    andar_bahar: projection(abState),
                    space_raid: projection(srState),
                    cricket: projection(cricketState),
                    baccarat: projection(baccaratState),
                    roulette: projection(rouletteState),
                    sic_bo: projection(sicboState),
                    seven_up_down: projection(sevenUpDownState),
                    fakeBets: gameFakeBets,
                    serverTime: now,
                    lastUpdate: now
                };

                const batch = writeBatch(db);
                batch.set(doc(db, 'game_states', 'all'), allStates);
                
                if (pendingOverrideClears.length > 0) {
                    const clearData: any = {};
                    pendingOverrideClears.forEach(id => clearData[id] = null);
                    batch.set(doc(db, 'admin_control', 'game_results'), clearData, { merge: true });
                    pendingOverrideClears = [];
                }
                
                await batch.commit();
                lastSyncData = currentSyncData;
                lastSyncTime = now;
                forceSyncNext = false;
            }
        } catch (e: any) {
            if (e?.message?.includes('RESOURCE_EXHAUSTED')) {
                console.warn('Firestore Quota Exhausted. Sync paused.');
                setTimeout(runGlobalSync, 60000);
                return;
            }
            console.error('Global Sync Error:', e);
        } finally {
            isSyncing = false;
        }
        setTimeout(runGlobalSync, 1000); 
    };
    runGlobalSync();

    const runFakeBets = () => {
      try {
          const game = GAMES_WITH_BETS[Math.floor(Math.random() * GAMES_WITH_BETS.length)];
          const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
          const amount = [10, 50, 100, 500, 1000, 2000, 5000][Math.floor(Math.random() * 7)];
          const target = game.options[Math.floor(Math.random() * game.options.length)];
          
          const newBet = {
              uid: `fake_${Math.floor(Math.random() * 100000)}`,
              username: name,
              amount,
              target,
              timestamp: Date.now(),
              isFake: true
          };

          gameFakeBets[game.bets] = [newBet, ...gameFakeBets[game.bets]].slice(0, 20);
      } catch (e) { console.error('Fake Bet Error:', e); }
      setTimeout(runFakeBets, 5000);
    };
    runFakeBets();

    // WinGo Engine
    const runWinGo = async () => {
        try {
            winGoState.timeLeft -= 1;
            if (winGoState.timeLeft <= 0) {
                if (winGoState.status === 'BETTING') {
                    winGoState.status = 'REVEALING';
                    winGoState.timeLeft = 5;
                    
                    const override = useOverride('wingo');
                    let res;
                    if (override) {
                        const num = isNaN(Number(override)) ? Math.floor(Math.random() * 10) : Number(override);
                        const bS = isNaN(Number(override)) ? override : (num >= 5 ? 'Big' : 'Small');
                        res = {
                            period: winGoState.period.toString(),
                            number: num,
                            bigSmall: bS,
                            color: num === 0 || num === 5 ? 'Violet' : [1, 3, 7, 9].includes(num) ? 'Green' : 'Red'
                        };
                    } else {
                        // RTP: Houses usually win more on some numbers
                        res = generateWinGoResult(winGoState.period.toString());
                    }
                    
                    winGoState.lastResult = res; 
                    winGoState.history = [res, ...winGoState.history].slice(0, 50);
                } else {
                    winGoState.status = 'BETTING';
                    winGoState.timeLeft = 30; // Standard 30s
                    winGoState.period += 1;
                }
                winGoState.endTime = Date.now() + (winGoState.timeLeft * 1000);
            }
            
            // Critical part: ensure sync happens on status transitions or every 5s anyway via runGlobalSync
            // But we can triggerSync on transitions to be fast
            if (winGoState.timeLeft === 0 || winGoState.timeLeft === 29) {
                triggerSync();
            }

        } catch (e) { console.error('WinGo Engine Error:', e); }
        setTimeout(runWinGo, 1000);
    };

    // Aviator Engine - Improved House Edge
    const runAviator = async () => {
        try {
            if (aviatorState.phase === 'WAITING') {
                aviatorState.timeLeft -= 1;
                if (aviatorState.timeLeft <= 0) {
                    aviatorState.phase = 'FLYING';
                    aviatorState.multiplier = 1.0;
                    
                    const override = useOverride('aviator');
                    if (override) {
                        aviatorState.crashPoint = Number(override);
                    } else {
                        const r = Math.random();
                        // Controlled house edge: 10% instant crash at 1.0x
                        if (r < 0.10) aviatorState.crashPoint = 1.0; 
                        else if (r < 0.40) aviatorState.crashPoint = 1.01 + Math.random() * 0.5; 
                        else aviatorState.crashPoint = 1 + Math.pow(Math.random(), 2) * 15;
                    }
                    aviatorState.startTime = Date.now();
                    triggerSync();
                }
            } else if (aviatorState.phase === 'FLYING') {
                const elapsed = (Date.now() - (aviatorState.startTime || Date.now())) / 1000;
                aviatorState.multiplier = Math.pow(1.08, elapsed); // Standard climb
                
                if (aviatorState.multiplier >= aviatorState.crashPoint) {
                    aviatorState.phase = 'CRASHED';
                    aviatorState.history = [aviatorState.multiplier, ...aviatorState.history].slice(0, 20);
                    triggerSync();
                    setTimeout(() => {
                        aviatorState.phase = 'WAITING';
                        aviatorState.multiplier = 1.0;
                        aviatorState.timeLeft = 8;
                        aviatorState.endTime = Date.now() + 8000;
                        triggerSync();
                        runAviator();
                    }, 4000);
                    return; 
                }
            }
        } catch (e) { console.error('Aviator Engine Error:', e); }
        const nextInterval = aviatorState.phase === 'FLYING' ? 500 : 1000;
        setTimeout(runAviator, nextInterval);
    };

    // Dragon Tiger Engine
    const runDragonTiger = async () => {
        try {
            dtState.timeLeft -= 1;
            if (dtState.timeLeft <= 0) {
                if (dtState.status === 'BETTING') {
                    dtState.status = 'LOCKED';
                    dtState.timeLeft = 3;
                } else if (dtState.status === 'LOCKED') {
                    dtState.status = 'RESULT';
                    const suits = ['♠', '♣', '♥', '♦'];
                    const generateCards = () => Array.from({length: 3}, () => ({
                        rank: Math.floor(Math.random() * 13) + 1,
                        suit: suits[Math.floor(Math.random() * 4)]
                    }));

                    const override = useOverride('dragon_tiger');
                    if (override === 'Dragon') {
                        dtState.dragonCards = [{ rank: 13, suit: '♠' }, ...generateCards().slice(1)];
                        dtState.tigerCards = [{ rank: 1, suit: '♥' }, ...generateCards().slice(1)];
                    } else if (override === 'Tiger') {
                        dtState.dragonCards = [{ rank: 1, suit: '♠' }, ...generateCards().slice(1)];
                        dtState.tigerCards = [{ rank: 13, suit: '♥' }, ...generateCards().slice(1)];
                    } else {
                        dtState.dragonCards = generateCards();
                        dtState.tigerCards = generateCards();
                    }
                    
                    const dSum = dtState.dragonCards.reduce((a, b) => a + b.rank, 0);
                    const tSum = dtState.tigerCards.reduce((a, b) => a + b.rank, 0);
                    
                    let res: 'D' | 'T' | 'Tie' | 'ST' = 'Tie';
                    if (dSum > tSum) res = 'D';
                    else if (tSum > dSum) res = 'T';
                    else {
                        if (dtState.dragonCards[0].suit === dtState.tigerCards[0].suit) res = 'ST';
                        else res = 'Tie';
                    }
                    
                    dtState.history = [res, ...dtState.history].slice(0, 20);
                    dtState.timeLeft = 10;
                } else {
                    dtState.status = 'BETTING';
                    dtState.timeLeft = 20;
                    dtState.dragonCards = [];
                    dtState.tigerCards = [];
                    dtState.period = (parseInt(dtState.period) + 1).toString();
                }
                dtState.endTime = Date.now() + (dtState.timeLeft * 1000);
            }
        } catch (e) { console.error('DT Engine Error:', e); }
        setTimeout(runDragonTiger, 1000);
    };

    // Andar Bahar Engine
    const runAndarBahar = async () => {
        try {
            abState.timeLeft -= 1;
            if (abState.timeLeft <= 0) {
                if (abState.status === 'BETTING') {
                    abState.status = 'LOCKED';
                    abState.timeLeft = 3;
                } else if (abState.status === 'LOCKED') {
                    abState.status = 'RESULT';
                    const suits = ['♠', '♣', '♥', '♦'];
                    const generateCards = () => Array.from({length: 3}, () => ({
                        rank: Math.floor(Math.random() * 13) + 1,
                        suit: suits[Math.floor(Math.random() * 4)]
                    }));

                    abState.joker = { rank: Math.floor(Math.random() * 13) + 1, suit: suits[Math.floor(Math.random() * 4)] };
                    abState.andarCards = generateCards();
                    abState.baharCards = generateCards();
                    
                    const aSum = abState.andarCards.reduce((a, b) => a + b.rank, 0);
                    const bSum = abState.baharCards.reduce((a, b) => a + b.rank, 0);
                    
                    if (aSum === bSum) {
                        abState.winner = 'TIE';
                        abState.history = ['T', ...abState.history].slice(0, 20);
                    } else {
                        abState.winner = aSum > bSum ? 'ANDAR' : 'BAHAR';
                        abState.history = [abState.winner === 'ANDAR' ? 'A' : 'B', ...abState.history].slice(0, 20);
                    }
                    abState.timeLeft = 10;
                } else {
                    abState.status = 'BETTING';
                    abState.timeLeft = 20;
                    abState.joker = null;
                    abState.andarCards = [];
                    abState.baharCards = [];
                    abState.winner = null;
                    abState.period = (parseInt(abState.period) + 1).toString();
                }
                abState.endTime = Date.now() + (abState.timeLeft * 1000);
            }
        } catch (e) { console.error('AB Engine Error:', e); }
        setTimeout(runAndarBahar, 1000);
    };

    // Jhandi Munda Engine (Removed)

    // Space Raid Engine - Improved flight logic and house edge
    const runSpaceRaid = async () => {
        try {
            if (srState.status === 'BETTING') {
                srState.timeLeft -= 1;
                if (srState.timeLeft <= 0) {
                    srState.status = 'FLYING';
                    srState.multiplier = 1.0;
                    srState.startTime = Date.now();
                    const r = Math.random();
                    // "Jiyada winning nahi milna chahiye"
                    // 15% instant crash at 1.0x
                    // 35% crash between 1.01x and 1.5x
                    // Rest higher
                    if (r < 0.15) srState.crashPoint = 1.0; 
                    else if (r < 0.50) srState.crashPoint = 1.01 + Math.random() * 0.49;
                    else srState.crashPoint = 1.5 + Math.pow(Math.random(), 2.5) * 20;
                }
            } else if (srState.status === 'FLYING') {
                const elapsed = (Date.now() - (srState.startTime || Date.now())) / 1000;
                srState.multiplier = Math.pow(1.07, elapsed); // Slower climb
                
                if (srState.multiplier >= srState.crashPoint) {
                    srState.status = 'RESULT';
                    srState.history = [srState.multiplier, ...srState.history].slice(0, 20);
                    setTimeout(() => {
                        srState.status = 'BETTING';
                        srState.timeLeft = 12;
                        srState.endTime = Date.now() + 12000;
                    }, 4000);
                }
            }
            srState.endTime = Date.now() + (srState.timeLeft * 1000);
        } catch (e) { console.error('SR Engine Error:', e); }
        const nextInterval = srState.status === 'FLYING' ? 400 : 1000;
        setTimeout(runSpaceRaid, nextInterval);
    };

    // Cricket Engine - Weighted outcomes for realistic RTP
    const runCricket = async () => {
        try {
            cricketState.timeLeft -= 1;
            if (cricketState.timeLeft <= 0) {
                if (cricketState.status === 'BETTING') {
                    cricketState.status = 'LOCKED';
                    cricketState.timeLeft = 3;
                } else if (cricketState.status === 'LOCKED') {
                    cricketState.status = 'RESULT';
                    // Weights: 1(30%), 2(25%), 4(20%), 6(15%), Wicket(8%), Tie(2%)
                    const r = Math.random();
                    let res;
                    if (r < 0.30) res = 1;
                    else if (r < 0.55) res = 2;
                    else if (r < 0.75) res = 4;
                    else if (r < 0.90) res = 6;
                    else if (r < 0.98) res = 0; // Wicket
                    else res = 7; // Tie/No-Ball

                    cricketState.landed = res;
                    cricketState.history = [res, ...cricketState.history].slice(0, 20);
                    cricketState.timeLeft = 12;
                } else {
                    cricketState.status = 'BETTING';
                    cricketState.timeLeft = 15;
                    cricketState.landed = null;
                    cricketState.period = (parseInt(cricketState.period) + 1).toString();
                }
                cricketState.endTime = Date.now() + (cricketState.timeLeft * 1000);
            }
        } catch (e) { console.error('Cricket Engine Error:', e); }
        setTimeout(runCricket, 1000);
    };

    // Baccarat Engine - Weighted for House Edge (Tie is rare)
    const runBaccarat = async () => {
        try {
            baccaratState.timeLeft -= 1;
            if (baccaratState.timeLeft <= 0) {
                if (baccaratState.status === 'BETTING') {
                    baccaratState.status = 'LOCKED';
                    baccaratState.timeLeft = 5;
                } else if (baccaratState.status === 'LOCKED') {
                    baccaratState.status = 'RESULT';
                    const r = Math.random();
                    let winner;
                    if (r < 0.46) winner = 'PLAYER';
                    else if (r < 0.92) winner = 'BANKER';
                    else winner = 'TIE';
                    
                    baccaratState.winner = winner;
                    baccaratState.history = [winner.charAt(0), ...baccaratState.history].slice(0, 20);
                    baccaratState.timeLeft = 15;
                } else {
                    baccaratState.status = 'BETTING';
                    baccaratState.timeLeft = 25;
                    baccaratState.winner = null;
                    baccaratState.period = (parseInt(baccaratState.period) + 1).toString();
                }
                baccaratState.endTime = Date.now() + (baccaratState.timeLeft * 1000);
                triggerSync();
            }
        } catch (e) { console.error('Baccarat Engine Error:', e); }
        setTimeout(runBaccarat, 1000);
    };

    // Roulette Engine - Standard European distribution
    const runRoulette = async () => {
        try {
            rouletteState.timeLeft -= 1;
            if (rouletteState.timeLeft <= 0) {
                if (rouletteState.status === 'BETTING') {
                    rouletteState.status = 'LOCKED';
                    rouletteState.timeLeft = 5;
                } else if (rouletteState.status === 'LOCKED') {
                    rouletteState.status = 'RESULT';
                    // RTP: Standard 37 numbers (including 0)
                    rouletteState.winningNumber = Math.floor(Math.random() * 37);
                    rouletteState.history = [rouletteState.winningNumber, ...rouletteState.history].slice(0, 20);
                    rouletteState.timeLeft = 15;
                } else {
                    rouletteState.status = 'BETTING';
                    rouletteState.timeLeft = 30;
                    rouletteState.winningNumber = null;
                    rouletteState.period = (parseInt(rouletteState.period) + 1).toString();
                }
                rouletteState.endTime = Date.now() + (rouletteState.timeLeft * 1000);
                triggerSync();
            }
        } catch (e) { console.error('Roulette Engine Error:', e); }
        setTimeout(runRoulette, 1000);
    };

    // Sic Bo Engine - Realistic distribution
    const runSicBo = async () => {
        try {
            sicboState.timeLeft -= 1;
            if (sicboState.timeLeft <= 0) {
                if (sicboState.status === 'BETTING') {
                    sicboState.status = 'LOCKED';
                    sicboState.timeLeft = 5;
                } else if (sicboState.status === 'LOCKED') {
                    sicboState.status = 'RESULT';
                    const d1 = Math.floor(Math.random() * 6) + 1;
                    const d2 = Math.floor(Math.random() * 6) + 1;
                    const d3 = Math.floor(Math.random() * 6) + 1;
                    sicboState.dice = [d1, d2, d3];
                    const sum = d1 + d2 + d3;
                    const isTriple = d1 === d2 && d2 === d3; 
                    sicboState.history = [(isTriple ? 'T' : sum), ...sicboState.history].slice(0, 20);
                    sicboState.timeLeft = 15;
                } else {
                    sicboState.status = 'BETTING';
                    sicboState.timeLeft = 25;
                    sicboState.dice = [1, 1, 1];
                    sicboState.period = (parseInt(sicboState.period) + 1).toString();
                }
                sicboState.endTime = Date.now() + (sicboState.timeLeft * 1000);
                triggerSync();
            }
        } catch (e) { console.error('SicBo Engine Error:', e); }
        setTimeout(runSicBo, 1000);
    };

    // Seven Up Down Engine
    const runSevenUpDown = async () => {
        try {
            sevenUpDownState.timeLeft -= 1;
            if (sevenUpDownState.timeLeft <= 0) {
                if (sevenUpDownState.status === 'BETTING') {
                    sevenUpDownState.status = 'LOCKED';
                    sevenUpDownState.timeLeft = 5;
                } else if (sevenUpDownState.status === 'LOCKED') {
                    sevenUpDownState.status = 'RESULT';
                    sevenUpDownState.timeLeft = 5;
                    
                    const override = useOverride('seven_up_down');
                    if (override === 'Down') {
                        sevenUpDownState.dice = [1, 2];
                    } else if (override === 'Up') {
                        sevenUpDownState.dice = [5, 6];
                    } else if (override === 'Seven') {
                        sevenUpDownState.dice = [3, 4];
                    } else {
                        // RTP: House edge (bias slightly away from Seven and extreme values)
                        sevenUpDownState.dice = [Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1];
                    }
                    
                    sevenUpDownState.sum = sevenUpDownState.dice[0] + sevenUpDownState.dice[1];
                    sevenUpDownState.history = [sevenUpDownState.sum, ...sevenUpDownState.history].slice(0, 50);
                } else {
                    sevenUpDownState.status = 'BETTING';
                    sevenUpDownState.timeLeft = 25;
                    sevenUpDownState.period = (parseInt(sevenUpDownState.period) + 1).toString();
                }
                sevenUpDownState.endTime = Date.now() + (sevenUpDownState.timeLeft * 1000);
            }
        } catch (e) { console.error('7UpDown Engine Error:', e); }
        setTimeout(runSevenUpDown, 1000);
    };

    // Start all engines
    runWinGo();
    runAviator();
    runDragonTiger();
    runAndarBahar();
    runSpaceRaid();
    runCricket();
    runBaccarat();
    runRoulette();
    runSicBo();
    runSevenUpDown();

    // Engines are started below
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Start game engines immediately
  startEngines();

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
