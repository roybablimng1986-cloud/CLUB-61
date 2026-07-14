import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, query, orderBy, limit, getDocs, writeBatch, serverTimestamp, onSnapshot, where, deleteDoc, increment } from 'firebase/firestore';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
} else {
    console.warn("firebase-applet-config.json not found. Firestore will not work.");
}

const firebaseApp = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

// Admin Control States
let adminOverrides: any = {};
let appSettings: any = {};

try {
    onSnapshot(doc(db, 'admin_control', 'game_results'), (s) => {
        adminOverrides = s.data() || {};
    }, (err) => console.error('Admin Control Listener Error:', err));
} catch (e) {
    console.error('Failed to setup admin override listener:', e);
}

try {
    onSnapshot(doc(db, 'settings', 'app_config'), (s) => {
        appSettings = s.data() || {};
    }, (err) => console.error('App Settings Listener Error:', err));
} catch (e) {
    console.error('Failed to setup app settings listener:', e);
}

// -------------------------------------------------------------
// CENTRAL REAL-TIME GAMES STATE & ENGINE (In-Memory & Sync'd)
// -------------------------------------------------------------
const serverGameStates: Record<string, any> = {
  wingo: {
    period: '',
    status: 'BETTING',
    timeLeft: 30,
    endTime: Date.now() + 30000,
    lastResult: null,
    history: [],
    bets: {},
    betsList: []
  },
  seven_up_down: {
    period: '',
    status: 'BETTING',
    timeLeft: 30,
    endTime: Date.now() + 30000,
    lastResult: null,
    history: [],
    bets: {},
    betsList: []
  },
  dice_duel: {
    period: '',
    status: 'BETTING',
    timeLeft: 30,
    endTime: Date.now() + 30000,
    lastResult: null,
    history: [],
    bets: {},
    betsList: []
  },
  dragon_tiger: {
    period: '',
    status: 'BETTING',
    timeLeft: 30,
    endTime: Date.now() + 30000,
    lastResult: null,
    history: [],
    bets: {},
    betsList: []
  },
  roulette: {
    period: '',
    status: 'BETTING',
    timeLeft: 30,
    endTime: Date.now() + 30000,
    lastResult: null,
    history: [],
    bets: {},
    betsList: []
  },
  andar_bahar: {
    period: '',
    status: 'BETTING',
    timeLeft: 30,
    endTime: Date.now() + 30000,
    lastResult: null,
    history: [],
    bets: {},
    betsList: []
  },
  cricket: {
    period: '',
    status: 'BETTING',
    timeLeft: 30,
    endTime: Date.now() + 30000,
    lastResult: null,
    history: [],
    bets: {},
    betsList: []
  }
};

const generatePeriod = () => {
  const now = new Date();
  return now.getFullYear().toString().slice(-2) + 
         (now.getMonth() + 1).toString().padStart(2, '0') + 
         now.getDate().toString().padStart(2, '0') + 
         Math.floor(now.getTime() / 1000).toString().slice(-4);
};

const generateResult = (gameId: string, bets: Record<string, number>) => {
  const overrideObj = adminOverrides[gameId];
  const overrideChoice = (overrideObj && overrideObj.period === serverGameStates[gameId].period && overrideObj.result)
    ? overrideObj.result
    : null;

  const totalBetsSum = Object.values(bets).reduce((a, b) => a + b, 0);

  const gameIdMapping: Record<string, string> = {
    'wingo': 'GAME_WINGO',
    'seven_up_down': 'GAME_7UP_DOWN',
    'dice_duel': 'GAME_DICE',
    'dragon_tiger': 'GAME_DRAGON_TIGER',
    'roulette': 'GAME_ROULETTE',
    'andar_bahar': 'GAME_ANDAR_BAHAR',
    'cricket': 'GAME_CRICKET'
  };

  const gameKey = gameIdMapping[gameId] || gameId;
  const rawId = gameId.toLowerCase().trim();
  const winProb = appSettings?.gameProbabilities?.[rawId] ?? appSettings?.gameProbabilities?.[gameKey] ?? appSettings?.globalWinProbability ?? 40;
  const isForceLoss = Math.random() < (1 - winProb / 100);

  switch (gameId) {
    case 'wingo': {
      const numberBets: Record<number, number> = {};
      for (let n = 0; n <= 9; n++) {
        numberBets[n] = 0;
        const color = [1, 3, 5, 7, 9].includes(n) ? 'Green' : 'Red';
        const isViolet = [0, 5].includes(n);
        const size = n >= 5 ? 'Big' : 'Small';
        
        numberBets[n] += (bets[color] || 0) * (isViolet ? 1.5 : 2);
        if (isViolet) numberBets[n] += (bets['Violet'] || 0) * 4.5;
        numberBets[n] += (bets[size] || 0) * 2;
        numberBets[n] += (bets[n.toString()] || 0) * 9;
      }
      let bestNumber = 0;
      let minPayout = Infinity;
      for (let n = 0; n <= 9; n++) {
        if (numberBets[n] < minPayout) {
          minPayout = numberBets[n];
          bestNumber = n;
        }
      }
      let finalNumber = (totalBetsSum > 0 && isForceLoss) ? bestNumber : Math.floor(Math.random() * 10);
      if (overrideChoice !== null) {
        const parsed = parseInt(overrideChoice);
        if (!isNaN(parsed)) {
          finalNumber = parsed;
        } else {
          const choiceStr = overrideChoice.toString().toUpperCase();
          if (choiceStr === 'RED') finalNumber = 2;
          else if (choiceStr === 'GREEN') finalNumber = 1;
          else if (choiceStr === 'VIOLET') finalNumber = 5;
          else if (choiceStr === 'BIG') finalNumber = 7;
          else if (choiceStr === 'SMALL') finalNumber = 3;
        }
      }
      return {
        period: serverGameStates[gameId].period,
        number: finalNumber,
        color: finalNumber === 0 ? 'Red/Violet' : finalNumber === 5 ? 'Green/Violet' : ([1, 3, 5, 7, 9].includes(finalNumber) ? 'Green' : 'Red'),
        size: finalNumber >= 5 ? 'Big' : 'Small'
      };
    }

    case 'seven_up_down': {
      const choices = ['DOWN', 'SEVEN', 'UP'];
      const payouts: Record<string, number> = { DOWN: (bets['DOWN'] || 0) * 1.95, SEVEN: (bets['SEVEN'] || 0) * 5, UP: (bets['UP'] || 0) * 1.95 };
      let bestChoice = 'DOWN';
      let minPayout = Infinity;
      choices.forEach(c => {
        if (payouts[c] < minPayout) {
          minPayout = payouts[c];
          bestChoice = c;
        }
      });
      let finalChoice = (totalBetsSum > 0 && isForceLoss) ? bestChoice : choices[Math.floor(Math.random() * choices.length)];
      if (overrideChoice !== null) {
        finalChoice = overrideChoice.toString().toUpperCase();
      }
      let d1 = 1, d2 = 1, sum = d1 + d2;
      let attempts = 0;
      while (attempts < 100) {
        d1 = Math.floor(Math.random() * 6) + 1;
        d2 = Math.floor(Math.random() * 6) + 1;
        sum = d1 + d2;
        const outcome = sum < 7 ? 'DOWN' : sum > 7 ? 'UP' : 'SEVEN';
        if (outcome === finalChoice) break;
        attempts++;
      }
      return {
        period: serverGameStates[gameId].period,
        dice: [d1, d2],
        sum,
        outcome: finalChoice
      };
    }

    case 'dice_duel': {
      const choices = ['SMALL', 'BIG', 'TIE'];
      const payouts: Record<string, number> = { SMALL: (bets['SMALL'] || 0) * 1.95, BIG: (bets['BIG'] || 0) * 1.95, TIE: (bets['TIE'] || 0) * 9 };
      let bestChoice = 'SMALL';
      let minPayout = Infinity;
      choices.forEach(c => {
        if (payouts[c] < minPayout) {
          minPayout = payouts[c];
          bestChoice = c;
        }
      });
      let finalChoice = (totalBetsSum > 0 && isForceLoss) ? bestChoice : choices[Math.floor(Math.random() * choices.length)];
      if (overrideChoice !== null) {
        finalChoice = overrideChoice.toString().toUpperCase();
      }
      let d1 = 1, d2 = 1, sum = 2;
      let attempts = 0;
      while (attempts < 100) {
        d1 = Math.floor(Math.random() * 6) + 1;
        d2 = Math.floor(Math.random() * 6) + 1;
        sum = d1 + d2;
        const outcome = sum === 7 ? 'TIE' : (sum >= 8 ? 'BIG' : 'SMALL');
        if (outcome === finalChoice) break;
        attempts++;
      }
      return {
        period: serverGameStates[gameId].period,
        dice: [d1, d2],
        sum,
        outcome: finalChoice
      };
    }

    case 'dragon_tiger': {
      const choices = ['D', 'T', 'Tie'];
      const payouts: Record<string, number> = { D: (bets['D'] || 0) * 2, T: (bets['T'] || 0) * 2, Tie: (bets['Tie'] || 0) * 9 };
      let bestChoice = 'D';
      let minPayout = Infinity;
      choices.forEach(c => {
        if (payouts[c] < minPayout) {
          minPayout = payouts[c];
          bestChoice = c;
        }
      });
      let finalChoice = (totalBetsSum > 0 && isForceLoss) ? bestChoice : choices[Math.floor(Math.random() * choices.length)];
      if (overrideChoice !== null) {
        finalChoice = overrideChoice.toString();
        if (finalChoice.toUpperCase() === 'DRAGON') finalChoice = 'D';
        if (finalChoice.toUpperCase() === 'TIGER') finalChoice = 'T';
        if (finalChoice.toUpperCase() === 'TIE') finalChoice = 'Tie';
      }
      let dRank = 0, tRank = 0;
      let attempts = 0;
      const suits = ['♠', '♣', '♥', '♦'];
      while (attempts < 100) {
        dRank = Math.floor(Math.random() * 13) + 1;
        tRank = Math.floor(Math.random() * 13) + 1;
        const outcome = dRank > tRank ? 'D' : tRank > dRank ? 'T' : 'Tie';
        if (outcome === finalChoice) break;
        attempts++;
      }
      return {
        period: serverGameStates[gameId].period,
        dragonCard: { rank: dRank, suit: suits[Math.floor(Math.random() * 4)] },
        tigerCard: { rank: tRank, suit: suits[Math.floor(Math.random() * 4)] },
        outcome: finalChoice
      };
    }

    case 'andar_bahar': {
      const choices = ['A', 'B', 'Tie'];
      const payouts: Record<string, number> = { 
        A: (bets['ANDAR'] || 0) * 1.95, 
        B: (bets['BAHAR'] || 0) * 1.95, 
        Tie: (bets['TIE'] || 0) * 9 
      };
      let bestChoice = 'A';
      let minPayout = Infinity;
      choices.forEach(c => {
        if (payouts[c] < minPayout) {
          minPayout = payouts[c];
          bestChoice = c;
        }
      });
      let finalChoice = (totalBetsSum > 0 && isForceLoss) ? bestChoice : choices[Math.floor(Math.random() * choices.length)];
      if (overrideChoice !== null) {
        const ov = overrideChoice.toString().toUpperCase();
        if (ov === 'ANDAR' || ov === 'A') finalChoice = 'A';
        else if (ov === 'BAHAR' || ov === 'B') finalChoice = 'B';
        else if (ov === 'TIE') finalChoice = 'Tie';
      }

      let andarRank = Math.floor(Math.random() * 13) + 2; // 2 to 14 (Ace high)
      let baharRank = Math.floor(Math.random() * 13) + 2;

      if (finalChoice === 'A') {
        while (andarRank <= baharRank) {
          andarRank = Math.floor(Math.random() * 13) + 2;
          baharRank = Math.floor(Math.random() * 13) + 2;
        }
      } else if (finalChoice === 'B') {
        while (baharRank <= andarRank) {
          andarRank = Math.floor(Math.random() * 13) + 2;
          baharRank = Math.floor(Math.random() * 13) + 2;
        }
      } else {
        baharRank = andarRank;
      }

      const suits = ['♠', '♥', '♣', '♦'];
      const formatCard = (rankVal: number) => {
        const rStr = rankVal === 14 ? 'A' : rankVal === 13 ? 'K' : rankVal === 12 ? 'Q' : rankVal === 11 ? 'J' : rankVal.toString();
        const sStr = suits[Math.floor(Math.random() * 4)];
        return { rank: rStr, suit: sStr, power: rankVal };
      };

      const andarCard = formatCard(andarRank);
      const baharCard = formatCard(baharRank);

      return {
        period: serverGameStates[gameId].period,
        andarCard,
        baharCard,
        outcome: finalChoice
      };
    }

    case 'roulette': {
      const choices = ['RED', 'BLACK', 'GREEN'];
      const payouts: Record<string, number> = { RED: (bets['RED'] || 0) * 2, BLACK: (bets['BLACK'] || 0) * 2, GREEN: (bets['GREEN'] || 0) * 35 };
      let bestChoice = 'RED';
      let minPayout = Infinity;
      choices.forEach(c => {
        if (payouts[c] < minPayout) {
          minPayout = payouts[c];
          bestChoice = c;
        }
      });
      let finalChoice = (totalBetsSum > 0 && isForceLoss) ? bestChoice : choices[Math.floor(Math.random() * choices.length)];
      if (overrideChoice !== null) {
        finalChoice = overrideChoice.toString().toUpperCase();
      }
      const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
      const blackNumbers = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
      let finalNumber = 0;
      if (finalChoice === 'GREEN') finalNumber = 0;
      else if (finalChoice === 'RED') finalNumber = redNumbers[Math.floor(Math.random() * redNumbers.length)];
      else finalNumber = blackNumbers[Math.floor(Math.random() * blackNumbers.length)];
      return {
        period: serverGameStates[gameId].period,
        number: finalNumber,
        outcome: finalChoice
      };
    }

    case 'cricket': {
      const choices = ['1', '2', '3', '4', '6', 'Wicket'];
      const payouts: Record<string, number> = { 
        '1': (bets['1'] || 0) * 1.95, 
        '2': (bets['2'] || 0) * 2.5, 
        '3': (bets['3'] || 0) * 4, 
        '4': (bets['4'] || 0) * 5, 
        '6': (bets['6'] || 0) * 10, 
        'Wicket': (bets['Wicket'] || 0) * 5 
      };
      let bestChoice = '1';
      let minPayout = Infinity;
      choices.forEach(c => {
        if (payouts[c] < minPayout) {
          minPayout = payouts[c];
          bestChoice = c;
        }
      });
      let finalChoice = (totalBetsSum > 0 && isForceLoss) ? bestChoice : choices[Math.floor(Math.random() * choices.length)];
      if (overrideChoice !== null) {
        finalChoice = overrideChoice.toString();
      }
      return {
        period: serverGameStates[gameId].period,
        outcome: finalChoice
      };
    }

    default:
      return { period: serverGameStates[gameId].period, outcome: 'UNKNOWN' };
  }
};

// Start Server Loop
const SIMULATED_USERNAMES = [
  'AlphaGamer', 'GoldHunter', 'LootBoss', 'RacerX', 'Phoenix', 'LuckyStar', 'CrownKing', 
  'TigerEye', 'DragonLord', 'SpinWizard', 'VortexPro', 'MineSweeper', 'ChickenRun', 
  'SevenUp', 'DiceMaster', 'RouletteKing', 'AndarGuru', 'BaharPlayer', 'WinGoStar', 'LudoLegend'
];

const MULTIPLAYER_TARGETS: Record<string, string[]> = {
  wingo: ['Red', 'Green', 'Violet', 'Big', 'Small', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  seven_up_down: ['DOWN', 'SEVEN', 'UP'],
  dice_duel: ['Player', 'Dealer', 'Tie'],
  dragon_tiger: ['D', 'T', 'Tie'],
  roulette: ['RED', 'BLACK', 'GREEN'],
  andar_bahar: ['ANDAR', 'BAHAR', 'TIE'],
  cricket: ['1', '2', '3', '4', '6', 'Wicket']
};

const startGamesEngine = () => {
  Object.keys(serverGameStates).forEach(gameId => {
    serverGameStates[gameId].period = generatePeriod();
  });

  setInterval(async () => {
    const now = Date.now();
    Object.keys(serverGameStates).forEach(gameId => {
      const state = serverGameStates[gameId];
      let diff = Math.max(0, Math.ceil((state.endTime - now) / 1000));
      state.timeLeft = diff;

      // Periodically simulate bot/live bets from other online players during betting state
      if (state.status === 'BETTING' && diff > 5) {
        if (Math.random() < 0.45) {
          const targets = MULTIPLAYER_TARGETS[gameId] || ['1'];
          const target = targets[Math.floor(Math.random() * targets.length)];
          const amount = [50, 100, 200, 500, 1000, 2000, 5000][Math.floor(Math.random() * 7)];
          const username = SIMULATED_USERNAMES[Math.floor(Math.random() * SIMULATED_USERNAMES.length)] + ' ' + Math.floor(100 + Math.random() * 900);
          
          if (!state.bets[target]) {
            state.bets[target] = 0;
          }
          state.bets[target] += amount;

          if (!state.betsList) {
            state.betsList = [];
          }
          state.betsList.unshift({
            id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            uid: `bot_${Math.floor(Math.random() * 1000000)}`,
            username,
            target,
            amount,
            period: state.period
          });

          // Cap at last 40 bets to keep payload small and performant
          state.betsList = state.betsList.slice(0, 40);
        }
      }

      if (diff <= 0) {
        if (state.status === 'BETTING') {
          state.status = 'REVEALING';
          let revealTime = 10000;
          if (['seven_up_down', 'dragon_tiger'].includes(gameId)) {
            revealTime = 6000; // 6 seconds - start next round much faster as requested!
          } else if (!['wingo', 'roulette', 'andar_bahar', 'dice_duel', 'cricket'].includes(gameId)) {
            revealTime = 5000;
          }
          state.endTime = now + revealTime;
          state.timeLeft = Math.ceil(revealTime / 1000);

          const result = generateResult(gameId, state.bets);
          state.lastResult = result;
          state.history = [result, ...state.history].slice(0, 15);
          
          setDoc(doc(db, 'live_results', gameId), {
            period: state.period,
            result: result,
            timestamp: serverTimestamp()
          }).catch((err) => {
            console.error(`[Firestore Error] Failed to write live_results for ${gameId}:`, err);
          });
        } else {
          state.status = 'BETTING';
          const bettingTime = 30000;
          state.endTime = now + bettingTime;
          state.timeLeft = 30;
          state.period = generatePeriod();
          state.bets = {};
          state.betsList = [];
        }
      }
    });
  }, 1000);
};

async function startServer() {
  const app = reportError ? express() : express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // central games state endpoint
  app.get('/api/games/states', (req, res) => {
    res.json(serverGameStates);
  });

  // admin side active bets endpoint
  app.get('/api/admin/bets', (req, res) => {
    const betsSummary: Record<string, any> = {};
    Object.keys(serverGameStates).forEach(gameId => {
      betsSummary[gameId] = {
        period: serverGameStates[gameId].period,
        bets: serverGameStates[gameId].bets,
        timeLeft: serverGameStates[gameId].timeLeft,
        status: serverGameStates[gameId].status
      };
    });
    res.json(betsSummary);
  });

  // admin manual results list endpoint
  app.get('/api/admin/overrides', (req, res) => {
    res.json(adminOverrides || {});
  });

  // admin manual result override endpoint
  app.post('/api/admin/override', async (req, res) => {
    const { gameId, result } = req.body;
    let period = req.body.period;
    if (!gameId || result === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    if (!period && serverGameStates[gameId]) {
      period = serverGameStates[gameId].period;
    }
    
    const safePeriod = period !== undefined ? period : "";
    const safeResult = result !== undefined ? result : null;
    
    const newOverrides = {
      ...adminOverrides,
      [gameId]: { period: safePeriod, result: safeResult }
    };
    
    const sanitizeForFirestore = (val: any): any => {
      if (val === undefined || val === null) return null;
      if (Array.isArray(val)) return val.map(sanitizeForFirestore);
      if (typeof val === 'object') {
        const obj: any = {};
        for (const k in val) {
          if (val[k] !== undefined) {
            obj[k] = sanitizeForFirestore(val[k]);
          }
        }
        return obj;
      }
      return val;
    };
    
    const firestorePayload = sanitizeForFirestore(newOverrides);
    
    try {
      await setDoc(doc(db, 'admin_control', 'game_results'), firestorePayload);
      adminOverrides[gameId] = { period: safePeriod, result: safeResult };
      res.json({ success: true });
    } catch (err) {
      console.error('Failed to set override in db, fall back to in-memory:', err);
      adminOverrides[gameId] = { period: safePeriod, result: safeResult };
      res.json({ success: true });
    }
  });

  // API for settings
  app.get('/api/settings', async (req, res) => {
    try {
      const docRef = doc(db, 'settings', 'app_config');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        res.json(docSnap.data());
      } else {
        res.json({
          minDeposit: 100,
          minWithdrawal: 110,
          maxWithdrawal: 100000,
          paymentUpi: 'mafia@paytm',
          paymentName: 'Mafia Admin',
          qrScannerUrl: 'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?q=80&w=300'
        });
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const docRef = doc(db, 'settings', 'app_config');
      let payload = req.body;
      
      // Safety size check: Firestore limit is 1MB. If JSON string is close to 1MB, prune largest base64 banners
      let payloadStr = JSON.stringify(payload);
      if (payloadStr.length > 900000 && payload.gameBanners) {
        console.warn(`Settings payload size (${payloadStr.length} bytes) is too large. Pruning oversized base64 banners.`);
        const prunedBanners = { ...payload.gameBanners };
        const bannerEntries = Object.entries(prunedBanners)
          .map(([k, v]) => ({ key: k, value: v as string, length: typeof v === 'string' ? v.length : 0 }))
          .sort((a, b) => b.length - a.length);
          
        for (const entry of bannerEntries) {
          if (JSON.stringify({ ...payload, gameBanners: prunedBanners }).length <= 900000) break;
          delete prunedBanners[entry.key];
        }
        payload = { ...payload, gameBanners: prunedBanners };
      }

      await setDoc(docRef, payload);
      res.json({ success: true });
    } catch (err) {
      console.error('Firestore app_config setDoc error:', err);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // API for gift codes
  app.get('/api/gift-codes/:code', async (req, res) => {
    try {
      const docRef = doc(db, 'gift_codes', req.params.code);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        res.json(docSnap.data());
      } else {
        res.status(404).json({ error: 'Gift code not found' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch gift code' });
    }
  });

  app.post('/api/admin/gift-codes', async (req, res) => {
    try {
      const { code } = req.body;
      const docRef = doc(db, 'gift_codes', code);
      await setDoc(docRef, req.body);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save gift code' });
    }
  });

  app.delete('/api/admin/gift-codes/:code', async (req, res) => {
    try {
      const docRef = doc(db, 'gift_codes', req.params.code);
      await deleteDoc(docRef);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete gift code' });
    }
  });

  app.post('/api/gift-codes/:code/claim', async (req, res) => {
    try {
      const { uid } = req.body;
      const codeRef = doc(db, 'gift_codes', req.params.code);
      const codeSnap = await getDoc(codeRef);
      if (!codeSnap.exists()) {
        return res.status(404).json({ error: 'Gift code not found' });
      }
      const data = codeSnap.data();
      const currentUsed = Number(data.usedCount) || 0;
      const limitVal = Number(data.limit) || 0;

      if (currentUsed >= limitVal) {
        return res.status(400).json({ error: 'This gift code has reached its maximum usage limit' });
      }

      await updateDoc(codeRef, {
        usedCount: increment(1)
      });
      res.json({ success: true, amount: data.amount });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to claim gift code' });
    }
  });

  // API for bets placing
  app.post('/api/bets', async (req, res) => {
    try {
      const { collection: colName, data, gameId, target, amount, period, uid, username } = req.body;
      
      const activeGameId = gameId ? gameId.replace('_bets', '') : (colName ? colName.replace('_bets', '') : null);
      if (activeGameId && target && amount) {
        if (serverGameStates[activeGameId]) {
          if (!serverGameStates[activeGameId].bets[target]) {
            serverGameStates[activeGameId].bets[target] = 0;
          }
          serverGameStates[activeGameId].bets[target] += Number(amount);
          
          if (!serverGameStates[activeGameId].betsList) {
            serverGameStates[activeGameId].betsList = [];
          }
          serverGameStates[activeGameId].betsList.push({
            id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            uid: uid || 'anonymous',
            username: username || 'Player',
            target,
            amount: Number(amount),
            period: period || serverGameStates[activeGameId].period
          });
        }
      }

      if (colName && data) {
        const colRef = collection(db, colName);
        await addDoc(colRef, {
          ...data,
          timestamp: serverTimestamp()
        });
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('Bet API Error:', err);
      res.status(500).json({ error: 'Failed to place bet' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom', 
    });

    app.use(vite.middlewares);

    app.get('/admin', async (req, res, next) => {
      try {
        const adminHtmlPath = path.resolve(__dirname, 'admin.html');
        if (!fs.existsSync(adminHtmlPath)) return res.status(404).send('admin.html not found');
        let template = fs.readFileSync(adminHtmlPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });

    app.use('*all', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.includes('.') && !url.endsWith('.html')) {
        return next();
      }
      try {
        const indexHtmlPath = path.resolve(__dirname, 'index.html');
        if (!fs.existsSync(indexHtmlPath)) return res.status(404).send('index.html not found');
        let template = fs.readFileSync(indexHtmlPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });

  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    app.get('/admin', (req, res) => {
      res.sendFile(path.join(distPath, 'admin.html'));
    });

    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  startGamesEngine();
}

let reportError = false;

startServer().catch(err => {
    console.error('Failed to start server:', err);
});
