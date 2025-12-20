

export type View = 'HOME' | 'REFERRAL' | 'PROMOTION' | 'WALLET' | 'ACCOUNT' | 'GAME_WINGO' | 'GAME_AVIATOR' | 'GAME_MINES' | 'GAME_DOG' | 'GAME_VORTEX' | 'DEPOSIT' | 'WITHDRAW' | 'LOGIN' | 'REGISTER' | 'SAFETY' | 'STATISTICS';

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
  password?: string; // Added to store/display password
  withdrawalPassword?: string;
  usedGiftCodes?: string[]; // Added to track used codes
  invitedBy?: string;
  totalCommission?: number;
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
  accountDetails?: any; // To store Bank/UPI details for withdrawals
}

export interface GameHistoryItem {
  id: string;
  game: string;
  amount: number;
  win: number; // 0 if loss
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