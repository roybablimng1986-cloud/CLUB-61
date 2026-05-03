
export type View = 'HOME' | 'REFERRAL' | 'PROMOTION' | 'WALLET' | 'ACCOUNT' | 'GAME_WINGO' | 'GAME_AVIATOR' | 'GAME_MINES' | 'GAME_VORTEX' | 'GAME_LUCKY_WHEEL' | 'DEPOSIT' | 'WITHDRAW' | 'LOGIN' | 'REGISTER' | 'SAFETY' | 'STATISTICS' | 'REWARDS_HUB' | 'GAME_DRAGON_TIGER' | 'GAME_ROULETTE' | 'GAME_STREET_RACE' | 'GAME_VAULT' | 'GAME_HEAD_TAILS' | 'GAME_LIMBO' | 'GAME_PLINKO' | 'GAME_HILO' | 'GAME_KENO' | 'GAME_DICE' | 'GAME_FRUIT_SLOT' | 'GAME_EGYPT_SLOT' | 'GAME_MOTO_RACING' | 'LEADERBOARD' | 'CHAT' | 'GAME_CRICKET' | 'GAME_TOWER' | 'GAME_SLOT_MACHINE' | 'GAME_ANDAR_BAHAR' | 'GAME_CRAZY_WHEEL' | 'GAME_7UP_DOWN' | 'GIFT_CODE' | 'GAME_CHICKEN_ROAD' | 'GAME_PUMP' | 'GAME_MOLES' | 'GAME_JACKPOT_SPIN' | 'GAME_SCRATCH_CARD' | 'GAME_CYBER_VOYAGE';

export interface UserProfile {
  uid: string;
  balance: number;
  vipLevel: number;
  name: string;
  username: string;
  phone: string;
  email: string;
  avatar: string;
  totalDeposit: number;
  totalBet: number; 
  inviteCode: string;
  password?: string;
  withdrawalPassword?: string;
  usedGiftCodes?: string[];
  invitedBy?: string;
  totalCommission?: number;
  wagerRequired: number;
  wagerTotal?: number;
  rebateLastClaimedBet?: number;
  isBankBound?: boolean;
  isUpiBound?: boolean;
  isTelegramJoined?: boolean;
  isBlocked?: boolean;
  bankDetails?: { accountName: string; accountNo: string; ifsc: string };
  upiDetails?: { upiId: string };
}

export interface ChatMessage {
    id: string;
    uid: string;
    username: string;
    text: string;
    timestamp: number;
    avatar: string;
    vip: number;
}

export interface AviatorState {
  phase: 'WAITING' | 'FLYING' | 'CRASHED';
  multiplier: number;
  timeLeft: number;
  endTime?: number;
  startTime?: number;
  history: number[];
  crashPoint: number;
}

export interface WinGoHistory {
  period: string;
  number: number;
  bigSmall: 'Big' | 'Small';
  color: 'Red' | 'Green' | 'Violet';
}

export interface WinGoGameState {
  endTime: number;
  period: string;
  history: WinGoHistory[];
  status: 'BETTING' | 'REVEALING';
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'BET' | 'WIN' | 'COMMISSION' | 'GIFT' | 'BONUS';
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'PROCESSING';
  date: string;
  desc: string;
  utr?: string;
  method?: string;
  timestamp?: number;
  accountDetails?: any;
}

export interface GameHistoryItem {
  id: string;
  game: string;
  amount: number;
  win: number;
  date: string;
  details: string;
}

export interface ReferralData {
  code: string;
  link: string;
  totalCommission: number;
  yesterdayCommission: number;
  directSubordinates: number;
  teamSubordinates: number;
  totalDepositAmount: number;
  totalBetAmount: number; 
}

export interface SubordinateItem {
    id: string;
    uid: string;
    level: number;
    depositAmount: number;
    betAmount: number;
    commission: number;
    date: string;
}

export interface CommissionItem {
    id: string;
    fromUid: string;
    amount: number;
    date: string;
    type: string;
    desc?: string;
}

export interface GameResult {
    win: boolean;
    amount: number;
    game: string;
    period?: string;
    resultDetails?: {
        label: string;
        value: string;
        color?: string;
    }[];
}

export interface DragonTigerState {
    status: 'BETTING' | 'LOCKED' | 'RESULT';
    timeLeft: number;
    endTime?: number;
    period: string;
    dragonCards: { rank: number; suit: string }[];
    tigerCards: { rank: number; suit: string }[];
    history: ('D' | 'T' | 'Tie')[];
    totalBets: {
        D: number;
        T: number;
        Tie: number;
    };
}

export interface AndarBaharState {
    status: 'BETTING' | 'LOCKED' | 'RESULT';
    timeLeft: number;
    endTime?: number;
    period: string;
    joker: any | null;
    andarCards: any[];
    baharCards: any[];
    winner: 'ANDAR' | 'BAHAR' | 'TIE' | null;
    history: ('A' | 'B' | 'T')[];
}

export interface CricketState {
    status: 'BETTING' | 'LOCKED' | 'RESULT';
    timeLeft: number;
    endTime?: number;
    period: string;
    landed: number | null;
    history: number[];
}

export interface BaccaratState {
    status: 'BETTING' | 'LOCKED' | 'RESULT';
    timeLeft: number;
    endTime?: number;
    period: string;
    playerHand: any[];
    bankerHand: any[];
    winner: string | null;
    history: string[];
}

export interface RouletteState {
    status: 'BETTING' | 'LOCKED' | 'RESULT';
    timeLeft: number;
    endTime?: number;
    period: string;
    winningNumber: number | null;
    history: number[];
}

export interface JhandiMundaState {
    status: 'BETTING' | 'LOCKED' | 'RESULT';
    timeLeft: number;
    endTime?: number;
    period: string;
    dice: string[];
    history: number[];
}

export interface SicBoState {
    status: 'BETTING' | 'LOCKED' | 'RESULT';
    timeLeft: number;
    endTime?: number;
    period: string;
    dice: number[];
    history: number[][];
}

export interface RouletteBet {
    type: 'NUMBER' | 'COLOR' | 'ODD_EVEN' | 'RANGE';
    value: string | number;
    amount: number;
}

export interface GiftCode {
  code: string;
  amount: number;
  limit: number;
  usedCount: number;
  minVip: number;
  createdAt: number;
}

export interface AppSettings {
  upiId: string;
  disabledGames: Record<string, boolean>;
}
