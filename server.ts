
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, query, orderBy, limit, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
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

// Game States
let winGoState: any = { timeLeft: 30, period: 202511261000, history: [], status: 'BETTING', lastResult: null, endTime: Date.now() + 30000 };
let aviatorState: any = { phase: 'WAITING', multiplier: 1.0, timeLeft: 10, history: [], crashPoint: 0, startTime: 0, endTime: Date.now() + 10000 };
let dtState: any = { status: 'BETTING', timeLeft: 15, period: '2024001', dragonCards: [], tigerCards: [], history: [], endTime: Date.now() + 15000 };
let abState: any = { status: 'BETTING', timeLeft: 20, period: '2024001', joker: null, andarCards: [], baharCards: [], winner: null, history: [], endTime: Date.now() + 20000 };
let crState: any = { status: 'BETTING', timeLeft: 30, period: '2024001', resultIdx: null, history: [], endTime: Date.now() + 30000 };
let jmState: any = { status: 'BETTING', timeLeft: 25, period: '2024001', dice: [], history: [], endTime: Date.now() + 25000 };
let srState: any = { status: 'BETTING', timeLeft: 20, period: '2024001', multiplier: 1.0, crashPoint: 0, history: [], endTime: Date.now() + 20000 };
let cgState: any = { status: 'BETTING', timeLeft: 25, period: '2024001', grid: Array(9).fill(0), history: [], endTime: Date.now() + 25000 };
let cricketState: any = { status: 'BETTING', timeLeft: 20, period: '2024001', landed: null, history: [], endTime: Date.now() + 20000 };
let baccaratState: any = { status: 'BETTING', timeLeft: 25, period: '2024001', playerHand: [], bankerHand: [], winner: null, history: [], endTime: Date.now() + 25000 };
let rouletteState: any = { status: 'BETTING', timeLeft: 35, period: '2024001', winningNumber: null, history: [], endTime: Date.now() + 35000 };
let sicboState: any = { status: 'BETTING', timeLeft: 25, period: '2024001', dice: [1,1,1], history: [], endTime: Date.now() + 25000 };
let sevenUpDownState: any = { status: 'BETTING', timeLeft: 25, period: '2024001', dice: [1,1], sum: 2, history: [], endTime: Date.now() + 25000 };

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
      { id: 'car_roulette', bets: 'car_roulette_bets', options: ['FERRARI', 'LAMBO', 'BMW', 'BENZ', 'AUDI', 'TESLA'] },
      { id: 'jhandi_munda', bets: 'jhandi_munda_bets', options: ['♥️', '♠️', '♦️', '♣️', '🚩', '👤'] },
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

    const runGlobalSync = async () => {
        if (isSyncing) return;
        isSyncing = true;
        try {
            // Destructure to exclude timeLeft from sync to save quota (clients use endTime)
            const { timeLeft: wTL, ...wSync } = winGoState;
            const { timeLeft: aTL, ...aSync } = aviatorState;
            const { timeLeft: dtTL, ...dtSync } = dtState;
            const { timeLeft: abTL, ...abSync } = abState;
            const { timeLeft: crTL, ...crSync } = crState;
            const { timeLeft: jmTL, ...jmSync } = jmState;
            const { timeLeft: srTL, ...srSync } = srState;
            const { timeLeft: cTL, ...cSync } = cricketState;
            const { timeLeft: bTL, ...bSync } = baccaratState;
            const { timeLeft: rTL, ...rSync } = rouletteState;
            const { timeLeft: sTL, ...sSync } = sicboState;
            const { timeLeft: sudTL, ...sudSync } = sevenUpDownState;

            const allStates = {
                wingo: wSync,
                aviator: aSync,
                dragon_tiger: dtSync,
                andar_bahar: abSync,
                car_roulette: crSync,
                jhandi_munda: jmSync,
                space_raid: srSync,
                cricket: cSync,
                baccarat: bSync,
                roulette: rSync,
                sic_bo: sSync,
                seven_up_down: sudSync,
                fakeBets: gameFakeBets,
                serverTime: Date.now(),
                lastUpdate: Date.now()
            };

            const currentSyncData = JSON.stringify({
                w: winGoState.status + winGoState.period,
                a: aviatorState.phase,
                dt: dtState.status + dtState.period,
                ab: abState.status + abState.period,
                cr: crState.status + crState.period,
                jm: jmState.status + jmState.period,
                sr: srState.status + srState.period,
                c: cricketState.status + cricketState.period,
                b: baccaratState.status + baccaratState.period,
                r: rouletteState.status + rouletteState.period,
                s: sicboState.status + sicboState.period,
                sud: sevenUpDownState.status + sevenUpDownState.period
            });

            const now = Date.now();
            // Force write every 12s or when state changes, throttled by the 8s loop
            const shouldWrite = (currentSyncData !== lastSyncData) || (now - lastSyncTime > 12000);

            if (shouldWrite) {
                allStates.serverTime = now; // CRITICAL for timer stabilization
                await setDoc(doc(db, 'game_states', 'all'), allStates);
                lastSyncData = currentSyncData;
                lastSyncTime = now;
            }
        } catch (e) {
            console.error('Global Sync Error:', e);
        } finally {
            isSyncing = false;
        }
        setTimeout(runGlobalSync, 8000); // Increased interval to 8s
    };
    let lastSyncTime = 0;
    runGlobalSync();

    const runFakeBets = () => {
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
      
      setTimeout(runFakeBets, 5000); // Generate a fake bet every 5 seconds in memory (0 writes)
    };
    runFakeBets();

    // WinGo Engine
    const runWinGo = async () => {
        winGoState.timeLeft -= 1;
        if (winGoState.timeLeft <= 0) {
            if (winGoState.status === 'BETTING') {
                winGoState.status = 'REVEALING';
                winGoState.timeLeft = 5;
                const res = generateWinGoResult(winGoState.period.toString());
                winGoState.lastResult = res; 
                winGoState.history = [res, ...winGoState.history].slice(0, 50);
            } else {
                winGoState.status = 'BETTING';
                winGoState.timeLeft = 30;
                winGoState.period += 1;
            }
            winGoState.endTime = Date.now() + (winGoState.timeLeft * 1000);
        }
        setTimeout(runWinGo, 1000);
    };

    // Aviator Engine - Much more efficient
    const runAviator = async () => {
        let stateChanged = false;
        if (aviatorState.phase === 'WAITING') {
            aviatorState.timeLeft -= 1; // Change to 1s interval
            if (aviatorState.timeLeft <= 0) {
                aviatorState.phase = 'FLYING';
                aviatorState.multiplier = 1.0;
                aviatorState.crashPoint = 1 + Math.pow(Math.random(), 2) * 15;
                aviatorState.startTime = Date.now();
                stateChanged = true;
            }
        } else if (aviatorState.phase === 'FLYING') {
            // Calculate multiplier based on time elapsed
            const elapsed = (Date.now() - (aviatorState.startTime || Date.now())) / 1000;
            aviatorState.multiplier = Math.pow(1.1, elapsed); // Smooth curve
            
            if (aviatorState.multiplier >= aviatorState.crashPoint) {
                aviatorState.phase = 'CRASHED';
                aviatorState.history = [aviatorState.multiplier, ...aviatorState.history].slice(0, 20);
                stateChanged = true;
                setTimeout(() => {
                    aviatorState.phase = 'WAITING';
                    aviatorState.multiplier = 1.0;
                    aviatorState.timeLeft = 5;
                    aviatorState.endTime = Date.now() + 5000;
                    // Trigger next update immediately when phase changes back to WAITING
                    runAviator();
                }, 3000);
                return; // Stop current loop, wait for setTimeout
            }
        }

        // Only write to Firestore when phase changes or every 2 seconds during flight
        // We still need some updates during flight for sync, but not every 100ms.
        const shouldWrite = stateChanged || 
                          (aviatorState.phase === 'WAITING' && aviatorState.timeLeft % 2 === 0) ||
                          (aviatorState.phase === 'FLYING' && Math.floor(Date.now() / 2000) % 1 === 0);

        if (shouldWrite) {
            // No longer writing individually
        }
        
        const nextInterval = aviatorState.phase === 'FLYING' ? 500 : 1000;
        setTimeout(runAviator, nextInterval);
    };

    // Dragon Tiger Engine
    const runDragonTiger = async () => {
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

                dtState.dragonCards = generateCards();
                dtState.tigerCards = generateCards();
                
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
        setTimeout(runDragonTiger, 1000);
    };

    // Andar Bahar Engine
    const runAndarBahar = async () => {
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
        setTimeout(runAndarBahar, 1000);
    };

    // Car Roulette Engine
    const runCarRoulette = async () => {
        crState.timeLeft -= 1;
        let stateChanged = false;
        if (crState.timeLeft <= 0) {
            stateChanged = true;
            if (crState.status === 'BETTING') {
                crState.status = 'LOCKED';
                crState.timeLeft = 5;
            } else if (crState.status === 'LOCKED') {
                crState.status = 'RESULT';
                // 0-7 are normal cars, 8 is TIE (1/10 chance)
                const isTie = Math.random() < 0.1;
                crState.resultIdx = isTie ? 8 : Math.floor(Math.random() * 8);
                crState.history = [crState.resultIdx.toString(), ...crState.history].slice(0, 20);
                crState.timeLeft = 10;
            } else {
                crState.status = 'BETTING';
                crState.timeLeft = 30;
                crState.resultIdx = null;
                crState.period = (parseInt(crState.period) + 1).toString();
            }
            crState.endTime = Date.now() + (crState.timeLeft * 1000);
        }
        setTimeout(runCarRoulette, 1000);
    };

    // Jhandi Munda Engine
    const runJhandiMunda = async () => {
        jmState.timeLeft -= 1;
        let stateChanged = false;
        if (jmState.timeLeft <= 0) {
            stateChanged = true;
            if (jmState.status === 'BETTING') {
                jmState.status = 'LOCKED';
                jmState.timeLeft = 5;
            } else if (jmState.status === 'LOCKED') {
                jmState.status = 'RESULT';
                const icons = ['♥️', '♠️', '♦️', '♣️', '🚩', '👤'];
                // Check for Tie (all different?) - let's just make it a specific result
                const isTie = Math.random() < 0.1;
                jmState.dice = isTie ? ['TIE'] : Array.from({length: 6}, () => icons[Math.floor(Math.random() * 6)]);
                jmState.history = [isTie ? 'T' : Math.floor(Math.random() * 6), ...jmState.history].slice(0, 20);
                jmState.timeLeft = 10;
            } else {
                jmState.status = 'BETTING';
                jmState.timeLeft = 25;
                jmState.dice = [];
                jmState.period = (parseInt(jmState.period) + 1).toString();
            }
            jmState.endTime = Date.now() + (jmState.timeLeft * 1000);
        }
        setTimeout(runJhandiMunda, 1000);
    };

    // Space Raid Engine
    const runSpaceRaid = async () => {
        srState.timeLeft -= 1;
        let stateChanged = false;
        if (srState.timeLeft <= 0) {
            stateChanged = true;
            if (srState.status === 'BETTING') {
                srState.status = 'LOCKED';
                srState.timeLeft = 3;
            } else if (srState.status === 'LOCKED') {
                srState.status = 'RESULT';
                const isTie = Math.random() < 0.05;
                srState.crashPoint = isTie ? 1.00 : Math.max(1, 0.99 / (1 - Math.random()));
                srState.history = [srState.crashPoint, ...srState.history].slice(0, 20);
                srState.timeLeft = 10;
            } else {
                srState.status = 'BETTING';
                srState.timeLeft = 20;
                srState.multiplier = 1.0;
                srState.crashPoint = 0;
                srState.period = (parseInt(srState.period) + 1).toString();
            }
            srState.endTime = Date.now() + (srState.timeLeft * 1000);
        }
        setTimeout(runSpaceRaid, 1000);
    };

    // Cricket Engine
    const runCricket = async () => {
        cricketState.timeLeft -= 1;
        let stateChanged = false;
        if (cricketState.timeLeft <= 0) {
            stateChanged = true;
            if (cricketState.status === 'BETTING') {
                cricketState.status = 'LOCKED';
                cricketState.timeLeft = 3;
            } else if (cricketState.status === 'LOCKED') {
                cricketState.status = 'RESULT';
                const outcomes = [1, 2, 4, 6, 0, 7]; // 7 is TIE
                cricketState.landed = outcomes[Math.floor(Math.random() * outcomes.length)];
                cricketState.history = [cricketState.landed, ...cricketState.history].slice(0, 20);
                cricketState.timeLeft = 10;
            } else {
                cricketState.status = 'BETTING';
                cricketState.timeLeft = 20;
                cricketState.landed = null;
                cricketState.period = (parseInt(cricketState.period) + 1).toString();
            }
            cricketState.endTime = Date.now() + (cricketState.timeLeft * 1000);
        }
        setTimeout(runCricket, 1000);
    };

    // Baccarat Engine
    const runBaccarat = async () => {
        baccaratState.timeLeft -= 1;
        let stateChanged = false;
        if (baccaratState.timeLeft <= 0) {
            stateChanged = true;
            if (baccaratState.status === 'BETTING') {
                baccaratState.status = 'LOCKED';
                baccaratState.timeLeft = 5;
            } else if (baccaratState.status === 'LOCKED') {
                baccaratState.status = 'RESULT';
                const winners = ['PLAYER', 'BANKER', 'TIE'];
                baccaratState.winner = winners[Math.floor(Math.random() * winners.length)];
                baccaratState.history = [baccaratState.winner.charAt(0), ...baccaratState.history].slice(0, 20);
                baccaratState.timeLeft = 15;
            } else {
                baccaratState.status = 'BETTING';
                baccaratState.timeLeft = 25;
                baccaratState.winner = null;
                baccaratState.period = (parseInt(baccaratState.period) + 1).toString();
            }
            baccaratState.endTime = Date.now() + (baccaratState.timeLeft * 1000);
        }
        setTimeout(runBaccarat, 1000);
    };

    // Roulette Engine
    const runRoulette = async () => {
        rouletteState.timeLeft -= 1;
        let stateChanged = false;
        if (rouletteState.timeLeft <= 0) {
            stateChanged = true;
            if (rouletteState.status === 'BETTING') {
                rouletteState.status = 'LOCKED';
                rouletteState.timeLeft = 5;
            } else if (rouletteState.status === 'LOCKED') {
                rouletteState.status = 'RESULT';
                rouletteState.winningNumber = Math.floor(Math.random() * 37);
                rouletteState.history = [rouletteState.winningNumber, ...rouletteState.history].slice(0, 20);
                rouletteState.timeLeft = 20;
            } else {
                rouletteState.status = 'BETTING';
                rouletteState.timeLeft = 35;
                rouletteState.winningNumber = null;
                rouletteState.period = (parseInt(rouletteState.period) + 1).toString();
            }
            rouletteState.endTime = Date.now() + (rouletteState.timeLeft * 1000);
        }
        setTimeout(runRoulette, 1000);
    };

    // Sic Bo Engine
    const runSicBo = async () => {
        sicboState.timeLeft -= 1;
        let stateChanged = false;
        if (sicboState.timeLeft <= 0) {
            stateChanged = true;
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
                const isTie = d1 === d2 && d2 === d3; // Triple is Tie
                sicboState.history = [(isTie ? 'T' : sum), ...sicboState.history].slice(0, 20);
                sicboState.timeLeft = 15;
            } else {
                sicboState.status = 'BETTING';
                sicboState.timeLeft = 25;
                sicboState.dice = [1, 1, 1];
                sicboState.period = (parseInt(sicboState.period) + 1).toString();
            }
            sicboState.endTime = Date.now() + (sicboState.timeLeft * 1000);
        }
        setTimeout(runSicBo, 1000);
    };

    // Seven Up Down Engine
    const runSevenUpDown = async () => {
        sevenUpDownState.timeLeft -= 1;
        let stateChanged = false;
        if (sevenUpDownState.timeLeft <= 0) {
            stateChanged = true;
            if (sevenUpDownState.status === 'BETTING') {
                sevenUpDownState.status = 'LOCKED';
                sevenUpDownState.timeLeft = 5;
            } else if (sevenUpDownState.status === 'LOCKED') {
                sevenUpDownState.status = 'RESULT';
                const d1 = Math.floor(Math.random() * 6) + 1;
                const d2 = Math.floor(Math.random() * 6) + 1;
                sevenUpDownState.dice = [d1, d2];
                sevenUpDownState.sum = d1 + d2;
                sevenUpDownState.history = [sevenUpDownState.sum, ...sevenUpDownState.history].slice(0, 20);
                sevenUpDownState.timeLeft = 10;
            } else {
                sevenUpDownState.status = 'BETTING';
                sevenUpDownState.timeLeft = 25;
                sevenUpDownState.period = (parseInt(sevenUpDownState.period) + 1).toString();
            }
            sevenUpDownState.endTime = Date.now() + (sevenUpDownState.timeLeft * 1000);
        }
        setTimeout(runSevenUpDown, 1000);
    };

    // Start all engines
    runWinGo();
    runAviator();
    runDragonTiger();
    runAndarBahar();
    runCarRoulette();
    runJhandiMunda();
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
