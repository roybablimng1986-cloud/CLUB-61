
export type View = 'HOME' | 'REFERRAL' | 'PROMOTION' | 'WALLET' | 'ACCOUNT' | 'GAME_WINGO' | 'GAME_AVIATOR' | 'GAME_MINES' | 'GAME_DOG' | 'GAME_LUCKY_WHEEL' | 'GAME_DRAGON_TIGER' | 'GAME_PLINKO' | 'GAME_HEAD_TAILS' | 'GAME_MOTO_RACING' | 'GAME_SLOTS' | 'GAME_ANDAR_BAHAR' | 'GAME_HILO' | 'GAME_LIMBO' | 'GAME_DRAGON_TOWER' | 'GAME_KENO' | 'GAME_FRUIT_SLOT' | 'GAME_EGYPT_SLOT' | 'GAME_DICE' | 'GAME_ROULETTE' | 'GAME_SICBO' | 'GAME_BACCARAT' | 'GAME_STREET_RACE' | 'GAME_VAULT' | 'REWARDS_HUB' | 'DEPOSIT' | 'WITHDRAW' | 'LOGIN' | 'REGISTER' | 'SAFETY' | 'STATISTICS';

export interface UserProfile {
  uid: string;
  balance: number;
  vipLevel: number;
  name: string;
  username: string;
  phone: string;
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
  // Binding Status
  isBankBound?: boolean;
  isUpiBound?: boolean;
  isTelegramJoined?: boolean;
  bankDetails?: { accountName: string; accountNo: string; ifsc: string };
  upiDetails?: { upiId: string };
}

export interface RouletteBet {
    type: 'NUMBER' | 'COLOR' | 'ODD_EVEN' | 'RANGE';
    value: string | number;
    amount: number;
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

export interface WinGoHistory {
  period: string;
  number: number;
  bigSmall: 'Big' | 'Small';
  color: 'Red' | 'Green' | 'Violet';
}

export interface WinGoGameState {
  timeLeft: number;
  period: number;
  history: WinGoHistory[];
  status: 'BETTING' | 'REVEALING';
  lastResult: WinGoHistory | null;
}

export interface DragonTigerState {
  period: string;
  timeLeft: number;
  status: 'BETTING' | 'LOCKED' | 'RESULT';
  dragonCard: number | null;
  tigerCard: number | null;
  history: ('D' | 'T' | 'Tie')[];
  liveBets: { username: string; target: 'D' | 'T' | 'Tie'; amount: number }[];
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
}
