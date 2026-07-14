import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wallet, HelpCircle, RotateCcw, Volume2, VolumeX, Users, Shield, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBalance, playSound, addGameHistory, stopAllSounds, auth, subscribeToDragonTiger, addGameBet, getMuteStatus } from '../services/supabaseService';
import { DragonTigerState, GameResult } from '../types';

import DragonTigerResultPopup from '../components/DragonTigerResultPopup';
import HowToPlay from '../components/HowToPlay';

import { useStabilizedTimer } from '../hooks/useTimer';

type BetTarget = 'D' | 'T' | 'Tie';

interface Props {
    onBack: () => void;
    userBalance: number;
    username: string;
    onResult: (r: GameResult) => void;
}

interface TableChip {
    id: string;
    target: BetTarget;
    value: number;
    x: number; // percentage left (20-80)
    y: number; // percentage top (20-80)
    color: string;
    isMyBet: boolean;
}

// Sound Synthesizer Class for responsive premium real-time casino audio
class SfxPlayer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(650, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1300, this.ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playChipBet() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    
    const playClink = (freq: number, delay: number, vol: number) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq / 2, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
      }, delay);
    };
    playClink(950, 0, 0.08);
    playClink(1800, 12, 0.04);
  }

  playCardDeal() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playTick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  playWin() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
      }, idx * 75);
    });
  }

  playLoss() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(170, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.45);
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.45);
  }
}

// Pool of high-stakes simulated active players
const VIRTUAL_PLAYERS_POOL = [
  { id: 'vp_araafat', name: 'Araafat', balance: '3.50L', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150', side: 'left', active: false },
  { id: 'vp_alex', name: 'Alex soyod', balance: '2.32L', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150', side: 'left', active: false },
  { id: 'vp_elyas', name: 'Elyas', balance: '3.15L', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150', side: 'right', active: false },
  { id: 'vp_rafi', name: 'Rafi sikdar', balance: '1.58L', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150', side: 'right', active: false },
  { id: 'vp_zayan', name: 'Zayan', balance: '4.20L', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150', side: 'left', active: false },
  { id: 'vp_kabir', name: 'Kabir', balance: '5.65L', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=150', side: 'right', active: false },
  { id: 'vp_samira', name: 'Samira', balance: '2.80L', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150', side: 'left', active: false },
  { id: 'vp_farhan', name: 'Farhan', balance: '1.95L', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=150', side: 'right', active: false }
];

const VIRTUAL_PLAYERS = VIRTUAL_PLAYERS_POOL.slice(0, 4);

const DragonTiger: React.FC<Props> = ({ onBack, userBalance, username, onResult }) => {
    const sfx = useRef(new SfxPlayer());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const [gameState, setGameState] = useState<DragonTigerState>({
        status: 'BETTING',
        period: new Date().getTime().toString().slice(-6),
        endTime: Date.now() + 15000,
        dragonCards: [],
        tigerCards: [],
        history: ['D', 'T', 'D', 'D'],
        totalBets: { D: 0, T: 0, Tie: 0 },
        timeLeft: 15
    });

    const [selectedChip, setSelectedChip] = useState(10);
    const [confirmTarget, setConfirmTarget] = useState<BetTarget | null>(null);
    const [myBets, setMyBets] = useState<any[]>([]);
    const [allBets, setAllBets] = useState<any[]>([]);
    const [tableChips, setTableChips] = useState<TableChip[]>([]);
    const [virtualPlayersState, setVirtualPlayersState] = useState(VIRTUAL_PLAYERS);
    const [previousBets, setPreviousBets] = useState<any[]>([]);
    
    const myBetsRef = useRef<any[]>([]);
    const allBetsRef = useRef<any[]>([]);
    
    const [showDragon, setShowDragon] = useState(false);
    const [showTiger, setShowTiger] = useState(false);
    const [activeTab, setActiveTab] = useState<'ALL' | 'MY'>('ALL');
    const [isBettingLocked, setIsBettingLocked] = useState(false);
    const [dtResult, setDtResult] = useState<any | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [roundWinner, setRoundWinner] = useState<'D' | 'T' | 'Tie' | null>(null);
    const [muted, setMuted] = useState(getMuteStatus());
    
    // High-precision smooth countdown timer
    const [timeLeft, setTimeLeft] = useState(15);
    useEffect(() => {
        if (gameState.endTime) {
            const getRemaining = () => {
                const now = Date.now();
                return Math.max(0, Math.ceil((gameState.endTime - now) / 1000));
            };
            setTimeLeft(getRemaining());
        }
    }, [gameState.endTime, gameState.period]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) return 0;
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(intervalId);
    }, []);

    // Sync audio class mute state
    useEffect(() => {
        sfx.current.setMuted(muted);
    }, [muted]);

    useEffect(() => {
        setIsBettingLocked(gameState.status !== 'BETTING' || timeLeft <= 5);

        // Tick sound for final 5 seconds
        if (gameState.status === 'BETTING' && timeLeft <= 5 && timeLeft > 0 && timeLeft !== lastTickRef.current) {
            sfx.current.playTick();
            playSound('tick');
            lastTickRef.current = timeLeft;
        }
    }, [timeLeft, gameState.status]);

    const isMounted = useRef(true);
    const lastEvaluatedPeriod = useRef<string>('');
    const lastTickRef = useRef<number>(-1);
    const resultHandledRef = useRef<string>('');

    // Listener for real-time multiplayer updates from Supabase/Firebase
    useEffect(() => {
        isMounted.current = true;
        
        const unsubscribe = subscribeToDragonTiger((state) => {
            if (!isMounted.current) return;

            setGameState(prev => ({
                ...prev,
                status: state.status === 'BETTING' ? 'BETTING' : 'RESULT',
                period: state.period,
                endTime: state.endTime,
                timeLeft: state.timeLeft,
                history: state.history.map((h: any) => h.outcome),
                totalBets: state.bets || {}
            }));

            if (state.betsList) {
                setAllBets(state.betsList);
                const mine = state.betsList.filter((b: any) => b.uid === auth.currentUser?.uid);
                setMyBets(mine);
                myBetsRef.current = mine;
            }

            setIsBettingLocked(state.status !== 'BETTING' || state.timeLeft <= 5);

            // Trigger deal/revelation sequence when state goes to REVEALING
            if (state.status === 'REVEALING' && state.lastResult && state.period !== lastEvaluatedPeriod.current) {
                lastEvaluatedPeriod.current = state.period;
                handleRevealingSequence(state.lastResult, state.period);
            }

            // Round reset
            if (state.status === 'BETTING' && resultHandledRef.current !== state.period) {
                resultHandledRef.current = state.period;
                if (myBetsRef.current && myBetsRef.current.length > 0) {
                    setPreviousBets(myBetsRef.current);
                }
                setMyBets([]);
                myBetsRef.current = [];
                setAllBets([]);
                setTableChips([]);
                setDtResult(null);
                setRoundWinner(null);
                setShowDragon(false);
                setShowTiger(false);
            }
        });

        return () => {
            isMounted.current = false;
            unsubscribe();
            stopAllSounds();
        };
    }, []);

    // Dynamically change/increase/decrease fake players and fluctuate their statuses during the match
    useEffect(() => {
        const interval = setInterval(() => {
            const count = Math.floor(Math.random() * 5) + 3; // Random count from 3 to 7 players
            const shuffled = [...VIRTUAL_PLAYERS_POOL].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, count);
            const updated = selected.map((player, idx) => {
                const side = idx % 2 === 0 ? 'left' : 'right';
                const active = Math.random() < 0.25;
                const rawBalance = parseFloat(player.balance);
                const fluctuation = (Math.random() * 0.3 - 0.15).toFixed(2);
                const nextBalance = Math.max(0.2, rawBalance + parseFloat(fluctuation)).toFixed(2) + 'L';
                return {
                    ...player,
                    side,
                    active,
                    balance: nextBalance
                };
            });
            setVirtualPlayersState(updated);
        }, 3500);

        return () => clearInterval(interval);
    }, []);

    // Simulate other players putting chips on the table
    useEffect(() => {
        if (gameState.status !== 'BETTING' || timeLeft <= 5) return;

        const interval = setInterval(() => {
            if (virtualPlayersState.length === 0) return;
            // Pick a random virtual player from the currently active ones
            const randPlayerIdx = Math.floor(Math.random() * virtualPlayersState.length);
            const player = virtualPlayersState[randPlayerIdx];

            // Highlight avatar briefly
            setVirtualPlayersState(prev => prev.map((p, idx) => idx === randPlayerIdx ? { ...p, active: true } : p));
            setTimeout(() => {
                setVirtualPlayersState(prev => prev.map((p, idx) => idx === randPlayerIdx ? { ...p, active: false } : p));
            }, 300);

            // Determine target
            const targets: BetTarget[] = ['D', 'T', 'Tie'];
            const probs = [0.45, 0.45, 0.10]; // 45% Dragon, 45% Tiger, 10% Tie
            const randVal = Math.random();
            let target: BetTarget = 'D';
            if (randVal < probs[0]) target = 'D';
            else if (randVal < probs[0] + probs[1]) target = 'T';
            else target = 'Tie';

            // Select a chip size
            const chipVals = [10, 50, 100, 500, 1000];
            const chipVal = chipVals[Math.floor(Math.random() * chipVals.length)];

            // Push chip onto the table felts
            const newChip: TableChip = {
                id: `vchip_${Date.now()}_${Math.random()}`,
                target,
                value: chipVal,
                x: 20 + Math.random() * 60, // 20% to 80% boundaries inside column
                y: 20 + Math.random() * 60,
                color: getChipColor(chipVal),
                isMyBet: false
            };

            setTableChips(prev => {
                const pruned = prev.filter(c => c.isMyBet || Math.random() > 0.25);
                if (pruned.length >= 25) {
                    return [...pruned.slice(-20), newChip];
                }
                return [...pruned, newChip];
            });
            
            // Adjust local total bets
            setGameState(prev => ({
                ...prev,
                totalBets: {
                    ...prev.totalBets,
                    [target]: (prev.totalBets[target] || 0) + chipVal
                }
            }));

            // Play chip drop sound
            sfx.current.playChipBet();

        }, Math.random() * 1500 + 800); // randomize pacing between bets

        return () => clearInterval(interval);
    }, [gameState.status, timeLeft]);

    const getChipColor = (val: number): string => {
        if (val === 10) return '#ec4899';
        if (val === 50) return '#3b82f6';
        if (val === 100) return '#ef4444';
        if (val === 500) return '#10b981';
        if (val === 1000) return '#fbbf24';
        return '#8b5cf6';
    };

    // Card Deal Sequence with 3D Flip
    async function handleRevealingSequence(result: any, roundPeriod: string) {
        if (!isMounted.current) return;
        
        const dragonCard = result.dragonCard;
        const tigerCard = result.tigerCard;
        
        setGameState(prev => ({
            ...prev,
            status: 'RESULT',
            dragonCards: [dragonCard],
            tigerCards: [tigerCard]
        }));

        await new Promise(r => setTimeout(r, 600));
        if (!isMounted.current) return;
        setShowDragon(true);
        sfx.current.playCardDeal();
        playSound('dt_card');
        
        await new Promise(r => setTimeout(r, 800));
        if (!isMounted.current) return;
        setShowTiger(true);
        sfx.current.playCardDeal();
        playSound('dt_card');

        const dSum = dragonCard.rank;
        const tSum = tigerCard.rank;
        let winner: 'D' | 'T' | 'Tie' = 'Tie';
        if (dSum > tSum) winner = 'D';
        else if (tSum > dSum) winner = 'T';
        else winner = 'Tie';

        await new Promise(r => setTimeout(r, 800));
        if (!isMounted.current) return;
        setRoundWinner(winner);
        
        // Play appropriate arpeggio based on whether user had money on the winning side
        const userWonThisRound = myBetsRef.current.some(b => b.target === winner);
        if (userWonThisRound) {
            sfx.current.playWin();
        } else if (myBetsRef.current.length > 0) {
            sfx.current.playLoss();
        }

        await new Promise(r => setTimeout(r, 800));
        if (isMounted.current) {
            processUserResult(roundPeriod, [dragonCard], [tigerCard], myBetsRef.current);
        }
    }

    function processUserResult(roundPeriod: string, dragonCards: any[], tigerCards: any[], currentBets: any[]) {
        const dragonCard = dragonCards[0];
        const tigerCard = tigerCards[0];
        
        const dSum = dragonCard.rank;
        const tSum = tigerCard.rank;
        
        let winner: 'D' | 'T' | 'Tie' = 'Tie';
        if (dSum > tSum) winner = 'D';
        else if (tSum > dSum) winner = 'T';
        else winner = 'Tie';
        
        let totalWin = 0;
        let totalBet = 0;
        
        currentBets.forEach(bet => {
            totalBet += bet.amount;
            if (bet.target === winner) {
                let multi = 2;
                if (winner === 'Tie') multi = 12; // 12X according to same UI design
                totalWin += bet.amount * multi;
            }
        });

        const hasWon = totalWin > 0;
        if (hasWon) updateBalance(totalWin, 'WIN', 'Dragon Tiger Win');
        
        if (totalBet > 0) {
            setDtResult({
                win: hasWon,
                amount: hasWon ? totalWin : 0,
                period: roundPeriod,
                winner,
                dragonCards,
                tigerCards,
                target: currentBets.map(b => b.target).join(', ')
            });
            addGameHistory('Dragon Tiger', totalBet, totalWin, `Period: ${roundPeriod}`);
        }
    }

    // Interactive 1-Tap Instant Felt Betting Action
    const handleFeltBet = async (target: BetTarget) => {
        if (isBettingLocked || gameState.status !== 'BETTING' || !auth.currentUser) return;
        
        if (selectedChip > userBalance) {
            alert("Insufficient Balance");
            return;
        }

        // Add client-side physical chip with smooth drop animation
        const newChip: TableChip = {
            id: `mychip_${Date.now()}_${Math.random()}`,
            target,
            value: selectedChip,
            x: 20 + Math.random() * 60,
            y: 20 + Math.random() * 60,
            color: getChipColor(selectedChip),
            isMyBet: true
        };

        setTableChips(prev => [...prev, newChip]);
        sfx.current.playChipBet();

        try {
            const betData = {
                id: `bet_${Date.now()}`,
                uid: auth.currentUser.uid,
                username: username || 'Guest',
                target,
                amount: selectedChip,
                period: gameState.period,
            };

            setMyBets(prev => {
                const updated = [betData, ...prev];
                myBetsRef.current = updated;
                return updated;
            });
            setAllBets(prev => [betData, ...prev]);

            await addGameBet('dragon_tiger_bets', {
                target,
                amount: selectedChip,
                period: gameState.period
            });

            setGameState(prev => ({
                ...prev,
                totalBets: {
                    ...prev.totalBets,
                    [target]: (prev.totalBets[target] || 0) + selectedChip
                }
            }));

            await updateBalance(-selectedChip, 'BET', `DT Bet on ${target}`);
            playSound('bet_place');
        } catch (e) {
            console.error("Bet placement failed:", e);
        }
    };

    const handleMuteToggle = () => {
        const nextMute = !muted;
        setMuted(nextMute);
        localStorage.setItem('MAFIA_SOUND_MUTED', nextMute ? 'true' : 'false');
        sfx.current.playClick();
    };

    const cancelLastBet = async () => {
        if (myBets.length === 0 || gameState.status !== 'BETTING' || isBettingLocked) return;
        const lastBet = myBets[0]; 
        setMyBets(prev => {
            const next = prev.slice(1);
            myBetsRef.current = next;
            return next;
        });
        setAllBets(prev => prev.filter(b => b.id !== lastBet.id));
        setTableChips(prev => {
            const index = prev.map(c => c.isMyBet).lastIndexOf(true);
            if (index !== -1) {
                return prev.filter((_, i) => i !== index);
            }
            return prev;
        });

        setGameState(prev => ({
            ...prev,
            totalBets: {
                ...prev.totalBets,
                [lastBet.target]: Math.max(0, (prev.totalBets[lastBet.target] || 0) - lastBet.amount)
            }
        }));
        await updateBalance(lastBet.amount, 'WIN', 'Bet Cancelled');
        sfx.current.playClick();
        playSound('click');
    };

    const clearAllBets = async () => {
        if (myBets.length === 0 || gameState.status !== 'BETTING' || isBettingLocked) return;
        
        let totalRefund = 0;
        myBets.forEach(bet => {
            totalRefund += bet.amount;
        });

        setMyBets([]);
        myBetsRef.current = [];
        setAllBets(prev => prev.filter(b => b.uid !== auth.currentUser?.uid));
        setTableChips(prev => prev.filter(c => !c.isMyBet));

        setGameState(prev => {
            const nextTotal = { ...prev.totalBets };
            myBets.forEach(bet => {
                nextTotal[bet.target as BetTarget] = Math.max(0, (nextTotal[bet.target as BetTarget] || 0) - bet.amount);
            });
            return {
                ...prev,
                totalBets: nextTotal
            };
        });

        await updateBalance(totalRefund, 'WIN', 'All Bets Cleared');
        sfx.current.playClick();
        playSound('click');
    };

    const repeatPreviousBets = async () => {
        if (previousBets.length === 0 || gameState.status !== 'BETTING' || isBettingLocked || !auth.currentUser) return;
        
        const totalCost = previousBets.reduce((sum, b) => sum + b.amount, 0);
        if (totalCost > userBalance) {
            alert("Insufficient Balance to Repeat Bets");
            return;
        }

        const newMyBetsList: any[] = [];
        const newChipsList: TableChip[] = [];
        const nextTotalBets = { ...gameState.totalBets };

        for (const bet of previousBets) {
            const target = bet.target as BetTarget;
            const amount = bet.amount;

            const newChip: TableChip = {
                id: `mychip_${Date.now()}_${Math.random()}`,
                target,
                value: amount,
                x: 20 + Math.random() * 60,
                y: 20 + Math.random() * 60,
                color: getChipColor(amount),
                isMyBet: true
            };
            newChipsList.push(newChip);

            const betData = {
                id: `bet_${Date.now()}_${Math.random()}`,
                uid: auth.currentUser.uid,
                username: username || 'Guest',
                target,
                amount,
                period: gameState.period,
            };
            newMyBetsList.push(betData);

            nextTotalBets[target] = (nextTotalBets[target] || 0) + amount;

            await addGameBet('dragon_tiger_bets', {
                target,
                amount,
                period: gameState.period
            });
        }

        setTableChips(prev => [...prev, ...newChipsList]);
        setMyBets(prev => {
            const next = [...newMyBetsList, ...prev];
            myBetsRef.current = next;
            return next;
        });
        setAllBets(prev => [...newMyBetsList, ...prev]);
        setGameState(prev => ({
            ...prev,
            totalBets: nextTotalBets
        }));

        await updateBalance(-totalCost, 'BET', `Repeated previous bets`);
        sfx.current.playChipBet();
        playSound('bet_place');
    };

    const doubleCurrentBets = async () => {
        if (myBets.length === 0 || gameState.status !== 'BETTING' || isBettingLocked || !auth.currentUser) return;

        const totalCost = myBets.reduce((sum, b) => sum + b.amount, 0);
        if (totalCost > userBalance) {
            alert("Insufficient Balance to Double Bets");
            return;
        }

        const newMyBetsList: any[] = [];
        const newChipsList: TableChip[] = [];
        const nextTotalBets = { ...gameState.totalBets };

        for (const bet of myBets) {
            const target = bet.target as BetTarget;
            const amount = bet.amount;

            const newChip: TableChip = {
                id: `mychip_${Date.now()}_${Math.random()}`,
                target,
                value: amount,
                x: 20 + Math.random() * 60,
                y: 20 + Math.random() * 60,
                color: getChipColor(amount),
                isMyBet: true
            };
            newChipsList.push(newChip);

            const betData = {
                id: `bet_${Date.now()}_${Math.random()}`,
                uid: auth.currentUser.uid,
                username: username || 'Guest',
                target,
                amount,
                period: gameState.period,
            };
            newMyBetsList.push(betData);

            nextTotalBets[target] = (nextTotalBets[target] || 0) + amount;

            await addGameBet('dragon_tiger_bets', {
                target,
                amount,
                period: gameState.period
            });
        }

        setTableChips(prev => [...prev, ...newChipsList]);
        setMyBets(prev => {
            const next = [...newMyBetsList, ...prev];
            myBetsRef.current = next;
            return next;
        });
        setAllBets(prev => [...newMyBetsList, ...prev]);
        setGameState(prev => ({
            ...prev,
            totalBets: nextTotalBets
        }));

        await updateBalance(-totalCost, 'BET', `Doubled current bets`);
        sfx.current.playChipBet();
        playSound('bet_place');
    };

    const getCardRank = (val: number | undefined) => {
        if (!val) return '?';
        if (val === 1) return 'A';
        if (val === 11) return 'J';
        if (val === 12) return 'Q';
        if (val === 13) return 'K';
        return val.toString();
    };

    const getSuitSymbol = (suit: string) => {
        switch (suit) {
            case '♠': return '♠';
            case '♥': return '♥';
            case '♦': return '♦';
            case '♣': return '♣';
            default: return suit;
        }
    };

    // Realistic Casino 3D Chip Renderer SVG Component
    const CasinoChip: React.FC<{ value: number; isSelected?: boolean; onClick?: () => void }> = ({ value, isSelected, onClick }) => {
        const label = value >= 1000 ? (value / 1000) + 'K' : value.toString();
        const mainColor = getChipColor(value);
        let secondaryColor = '#ffffff';
        let accentColor = '#000000';

        if (value === 10) { secondaryColor = '#fbcfe8'; }
        else if (value === 50) { secondaryColor = '#bfdbfe'; }
        else if (value === 100) { secondaryColor = '#fecaca'; }
        else if (value === 500) { secondaryColor = '#a7f3d0'; }
        else if (value === 1000) { secondaryColor = '#fef3c7'; accentColor = '#78350f'; }
        else if (value === 5000) { secondaryColor = '#ddd6fe'; }

        return (
            <div 
                onClick={onClick}
                className="relative select-none cursor-pointer animate-in zoom-in-50 duration-200"
                style={{ width: '48px', height: '48px' }}
            >
                {/* Golden Sparkle Glow outer background when active */}
                {isSelected && (
                    <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-yellow-500/20 via-yellow-400/30 to-amber-500/10 blur-md animate-pulse z-0" />
                )}
                
                <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-[0_5px_8px_rgba(0,0,0,0.7)]">
                    <defs>
                        <radialGradient id={`grad-${value}`} cx="35%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                            <stop offset="40%" stopColor={mainColor} />
                            <stop offset="100%" stopColor={mainColor} stopOpacity={0.9} />
                        </radialGradient>
                    </defs>
                    
                    {/* Shadow Outer Ring */}
                    <circle cx="50" cy="53" r="46" fill="rgba(0,0,0,0.5)" />

                    {/* Outer Bevel Circle */}
                    <circle cx="50" cy="50" r="46" fill={`url(#grad-${value})`} stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
                    
                    {/* Outer notches dash pattern */}
                    <g stroke={secondaryColor} strokeWidth="6.5" strokeDasharray="8 12" fill="none">
                        <circle cx="50" cy="50" r="41.5" />
                    </g>
                    
                    {/* Concentric glossy rings */}
                    <circle cx="50" cy="50" r="33.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                    <circle cx="50" cy="50" r="31.5" fill="rgba(0,0,0,0.3)" />
                    
                    {/* Core circle */}
                    <circle cx="50" cy="50" r="23" fill={mainColor} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    <circle cx="50" cy="50" r="20" fill="none" stroke={secondaryColor} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />

                    {/* Numerical Value Text */}
                    <text 
                        x="50" 
                        y="57" 
                        textAnchor="middle" 
                        fill={accentColor === '#000000' ? '#ffffff' : accentColor} 
                        fontSize="22" 
                        fontWeight="900" 
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                        className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] tracking-tighter"
                    >
                        {label}
                    </text>

                    {/* Golden neon turning outer boundary */}
                    {isSelected && (
                        <circle 
                            cx="50" 
                            cy="50" 
                            r="47" 
                            fill="none" 
                            stroke="#f59e0b" 
                            strokeWidth="3.5" 
                            strokeDasharray="10 5"
                            className="animate-[spin_8s_linear_infinite]"
                        />
                    )}
                </svg>
            </div>
        );
    };

    return (
        <div className="bg-[#0b0c16] fixed inset-0 flex flex-col font-sans text-white select-none overflow-hidden">
            <AnimatePresence>
                {isLoading && (
                    <div className="bg-[#0b0c16] fixed inset-0 flex flex-col items-center justify-center font-sans text-white select-none overflow-hidden z-[9999]">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }}></div>
                        <div className="absolute -left-24 top-1/4 w-72 h-72 rounded-full bg-blue-500/15 blur-[80px] pointer-events-none"></div>
                        <div className="absolute -right-24 bottom-1/4 w-72 h-72 rounded-full bg-orange-500/15 blur-[80px] pointer-events-none"></div>
                        <div className="relative flex flex-col items-center max-w-sm w-full px-8 text-center space-y-6">
                            <div className="relative w-28 h-28 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500 to-orange-500 animate-spin opacity-25 blur-md"></div>
                                <div className="absolute inset-2 rounded-full bg-slate-950 border-2 border-yellow-500/50 flex items-center justify-center shadow-[0_0_25px_rgba(234,179,8,0.4)]">
                                    <span className="text-4xl">🐉</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black italic tracking-tighter uppercase gold-text">DRAGON TIGER</h1>
                                <p className="text-[10px] font-black text-slate-400 tracking-[0.25em] uppercase">CLUB 99 PRESTIGE ARENA</p>
                            </div>
                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
                                <motion.div 
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 2.8, ease: "easeInOut" }}
                                    className="h-full bg-gradient-to-r from-blue-500 via-yellow-500 to-orange-500"
                                />
                            </div>
                            <span className="text-[9px] font-black text-yellow-500/80 uppercase tracking-widest animate-pulse">Initializing Multiplayer Gateway...</span>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <DragonTigerResultPopup result={dtResult} onClose={() => setDtResult(null)} />
            <HowToPlay 
                isOpen={showHelp} 
                onClose={() => setShowHelp(false)} 
                title="Dragon Tiger Rules"
                rules={[
                    "Two cards are dealt: one to the Dragon and one to the Tiger.",
                    "Bet on which card will be higher. King is highest, Ace is lowest.",
                    "Payout for Dragon or Tiger is 1:1.",
                    "A Tie pays 12:1."
                ]}
                payouts={[
                    { label: "Dragon / Tiger", value: "2x" },
                    { label: "Tie", value: "12x" }
                ]}
            />
            
            {/* Header with distinct separate sound off design */}
            <div className="p-4 flex justify-between items-center bg-[#0d0e1b] border-b border-yellow-500/20 z-50 shrink-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => { sfx.current.playClick(); playSound('click'); onBack(); }} 
                        className="p-2.5 bg-slate-900 border border-white/5 rounded-2xl active:scale-90"
                    >
                        <ArrowLeft size={18} className="text-zinc-400" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black gold-text uppercase tracking-widest italic leading-none">CLUB 99</h1>
                        <span className="text-[8px] text-green-400 mt-1 uppercase font-bold tracking-widest flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Live Arena Active
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Wallet Balance Display */}
                    <div className="bg-[#080911] px-3 py-1.5 rounded-2xl border border-yellow-500/20 text-yellow-500 font-mono shadow-inner flex items-center gap-2">
                        <Wallet size={13} className="text-yellow-500" />
                        <span className="font-black text-xs">₹{userBalance.toFixed(2)}</span>
                    </div>

                    {/* Help icon */}
                    <button 
                        onClick={() => { sfx.current.playClick(); playSound('click'); setShowHelp(true); }} 
                        className="p-2 bg-slate-900 border border-white/5 text-zinc-400 rounded-2xl active:scale-90"
                    >
                        <HelpCircle size={18} />
                    </button>
                </div>
            </div>

            {/* Main Stage Layout with Glowing Dragon & Tiger Illustrations */}
            <div className="flex-1 flex flex-col items-center py-3 gap-3 relative overflow-y-auto no-scrollbar pb-[180px]">
                
                {/* History Beads panel (swapped to the very top as requested) */}
                <div className="w-full px-3 shrink-0">
                    <div className="bg-[#0b0c16]/50 rounded-2xl border border-white/5 p-2 flex items-center justify-between">
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 pr-2">
                            {gameState.history.map((h, i) => (
                                <span 
                                    key={i} 
                                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-black text-[9px] shadow-[0_3px_6px_rgba(0,0,0,0.5)] border border-white/10 ${
                                        h === 'D' ? 'bg-gradient-to-tr from-blue-700 to-blue-500 text-white' : 
                                        h === 'T' ? 'bg-gradient-to-tr from-red-700 to-red-500 text-white' : 
                                        'bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white'
                                    }`}
                                >
                                    {h}
                                </span>
                            ))}
                        </div>
                        {/* Trend Button */}
                        <div className="px-2.5 py-1 bg-slate-900 border border-white/5 rounded-xl text-[8px] font-black text-yellow-500 flex items-center gap-1 uppercase">
                            <span>📈</span>
                            <span>TREND</span>
                        </div>
                    </div>
                </div>

                {/* Stadium Screen (Stage box containing glowing graphics and VS dealt cards) */}
                <div className="w-full max-w-sm px-3 shrink-0">
                    <div className="bg-[#060810] rounded-[2.5rem] p-4 border-2 border-slate-900/60 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(0,0,0,0.6)] relative overflow-hidden h-[225px] flex flex-col justify-between">
                        {/* Felt Texture background overlay */}
                        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }}></div>
                        
                        {/* Glow particles */}
                        <div className="absolute -left-20 top-0 w-44 h-44 rounded-full bg-blue-500/10 blur-[60px] pointer-events-none"></div>
                        <div className="absolute -right-20 top-0 w-44 h-44 rounded-full bg-orange-500/10 blur-[60px] pointer-events-none"></div>

                        {/* Top info */}
                        <div className="flex justify-between items-center relative z-10 px-2 mt-1">
                            <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase font-mono bg-slate-900/60 px-2.5 py-1 rounded-md border border-white/5">Period: {gameState.period}</span>
                            <div className="flex items-center gap-1.5">
                                <div className={`px-2 py-1 rounded-md border flex items-center gap-1 font-mono text-[9px] font-black ${
                                    gameState.status === 'BETTING' ? (isBettingLocked ? 'border-red-500 text-red-500 animate-pulse bg-red-950/20' : 'border-emerald-500 text-emerald-400 bg-emerald-950/10') : 'border-yellow-600 text-yellow-500 bg-yellow-950/10'
                                }`}>
                                    <span className="w-1 h-1 bg-current rounded-full animate-ping"></span>
                                    <span>{gameState.status === 'BETTING' ? (isBettingLocked ? 'LOCKED' : 'BETTING') : 'REVEALING...'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Graphics Core: Ice Dragon (left) vs Fire Tiger (right) */}
                        <div className="flex items-center justify-between relative z-10 flex-1 px-1 mt-4">
                            {/* Glowing Ice Dragon Illustration */}
                            <motion.div 
                                animate={roundWinner === 'D' ? { scale: [1, 1.25, 1.25, 1.25, 1], rotate: [0, -5, 5, -5, 0] } : { y: [0, -4, 0] }}
                                transition={roundWinner === 'D' ? { duration: 1.5, repeat: Infinity } : { repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                                className="w-16 h-16 relative flex-shrink-0 flex flex-col items-center justify-center"
                            >
                                <div className={`w-14 h-14 rounded-full border-2 overflow-hidden bg-blue-950/40 relative transition-all ${roundWinner === 'D' ? 'border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.9)]' : 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.8)]'}`}>
                                    <img 
                                        src="https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=300&auto=format&fit=crop" 
                                        alt="Dragon" 
                                        className="w-full h-full object-cover scale-110" 
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-blue-950/60 via-transparent to-transparent"></div>
                                </div>
                                <span className={`absolute bottom-[-14px] left-1/2 -translate-x-1/2 text-[8px] font-black tracking-widest uppercase font-sans ${roundWinner === 'D' ? 'text-yellow-400 scale-110' : 'text-blue-400'}`}>DRAGON</span>
                            </motion.div>

                            {/* Dealt Cards with VS */}
                            <div className="flex items-center gap-1.5 relative pt-12">
                                {/* Giant High-Visibility Floating Central Timer exactly above the Cards */}
                                <div className="absolute top-[-22px] left-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 flex flex-col items-center justify-center z-20">
                                    <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center border-2 border-yellow-500/80 shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all duration-300 ${
                                        gameState.status === 'BETTING' 
                                            ? (isBettingLocked ? 'bg-red-950/95 border-red-500 text-red-500 shadow-red-500/50' : 'bg-emerald-950/95 border-emerald-500 text-emerald-400 shadow-emerald-500/50')
                                            : 'bg-yellow-950/95 border-yellow-500 text-yellow-500 shadow-yellow-500/50 animate-pulse'
                                    }`}>
                                        <span className="text-lg font-black font-mono leading-none">{gameState.status === 'BETTING' ? timeLeft : '0'}</span>
                                        <span className="text-[6px] font-black tracking-widest mt-0.5 leading-none">{gameState.status === 'BETTING' ? (isBettingLocked ? 'LOCK' : 'TIME') : 'WAIT'}</span>
                                    </div>
                                </div>
                                {/* Dragon Card */}
                                <div className="perspective-500 relative">
                                    <motion.div 
                                        initial={{ rotateY: 0 }}
                                        animate={{ rotateY: showDragon ? 180 : 0 }}
                                        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                                        className="w-20 h-28 rounded-xl relative"
                                        style={{ transformStyle: 'preserve-3d' }}
                                    >
                                        {/* Card face down */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-blue-950 border-2 border-blue-500 rounded-xl overflow-hidden flex flex-col items-center justify-center shadow-md backface-hidden">
                                            <div className="absolute inset-0 opacity-40">
                                                <img 
                                                    src="https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=300&auto=format&fit=crop" 
                                                    alt="Dragon Cover" 
                                                    className="w-full h-full object-cover scale-110 filter brightness-75 contrast-125"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <div className="relative z-10 w-12 h-18 border border-blue-400/30 rounded-lg flex flex-col items-center justify-center bg-blue-950/70 backdrop-blur-[2px]">
                                                <Trophy size={16} className="text-blue-400" />
                                                <span className="text-[7px] font-black text-blue-400 mt-1 tracking-wider">DRAGON</span>
                                            </div>
                                        </div>
                                        {/* Card face up (permanently in DOM for smooth flip) */}
                                        <div className="absolute inset-0 bg-white text-zinc-900 border-2 border-blue-400 rounded-xl flex flex-col items-center justify-between p-2 shadow-lg rotate-y-180 backface-hidden">
                                            <span className={`text-[16px] font-black self-start leading-none ${['♥', '♦'].includes(gameState.dragonCards?.[0]?.suit || '♠') ? 'text-red-500' : 'text-zinc-900'}`}>
                                                {getCardRank(gameState.dragonCards?.[0]?.rank || 1)}
                                            </span>
                                            <span className={`text-4xl leading-none ${['♥', '♦'].includes(gameState.dragonCards?.[0]?.suit || '♠') ? 'text-red-500' : 'text-zinc-900'}`}>
                                                {getSuitSymbol(gameState.dragonCards?.[0]?.suit || '♠')}
                                            </span>
                                            <span className={`text-[16px] font-black self-end rotate-180 leading-none ${['♥', '♦'].includes(gameState.dragonCards?.[0]?.suit || '♠') ? 'text-red-500' : 'text-zinc-900'}`}>
                                                {getCardRank(gameState.dragonCards?.[0]?.rank || 1)}
                                            </span>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* VS GOLD TEXT */}
                                <span className="text-xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-500 to-yellow-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] px-1 font-serif">VS</span>

                                {/* Tiger Card */}
                                <div className="perspective-500 relative">
                                    <motion.div 
                                        initial={{ rotateY: 0 }}
                                        animate={{ rotateY: showTiger ? 180 : 0 }}
                                        transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                                        className="w-20 h-28 rounded-xl relative"
                                        style={{ transformStyle: 'preserve-3d' }}
                                    >
                                        {/* Card face down */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-900 to-orange-950 border-2 border-orange-500 rounded-xl overflow-hidden flex flex-col items-center justify-center shadow-md backface-hidden">
                                            <div className="absolute inset-0 opacity-40">
                                                <img 
                                                    src="https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?q=80&w=300&auto=format&fit=crop" 
                                                    alt="Tiger Cover" 
                                                    className="w-full h-full object-cover scale-110 filter brightness-75 contrast-125"
                                                    referrerPolicy="no-referrer"
                                                />
                                            </div>
                                            <div className="relative z-10 w-12 h-18 border border-orange-400/30 rounded-lg flex flex-col items-center justify-center bg-orange-950/70 backdrop-blur-[2px]">
                                                <Shield size={16} className="text-orange-400" />
                                                <span className="text-[7px] font-black text-orange-400 mt-1 tracking-wider">TIGER</span>
                                            </div>
                                        </div>
                                        {/* Card face up (permanently in DOM for smooth flip) */}
                                        <div className="absolute inset-0 bg-white text-zinc-900 border-2 border-orange-400 rounded-xl flex flex-col items-center justify-between p-2 shadow-lg rotate-y-180 backface-hidden">
                                            <span className={`text-[16px] font-black self-start leading-none ${['♥', '♦'].includes(gameState.tigerCards?.[0]?.suit || '♠') ? 'text-red-500' : 'text-zinc-900'}`}>
                                                {getCardRank(gameState.tigerCards?.[0]?.rank || 1)}
                                            </span>
                                            <span className={`text-4xl leading-none ${['♥', '♦'].includes(gameState.tigerCards?.[0]?.suit || '♠') ? 'text-red-500' : 'text-zinc-900'}`}>
                                                {getSuitSymbol(gameState.tigerCards?.[0]?.suit || '♠')}
                                            </span>
                                            <span className={`text-[16px] font-black self-end rotate-180 leading-none ${['♥', '♦'].includes(gameState.tigerCards?.[0]?.suit || '♠') ? 'text-red-500' : 'text-zinc-900'}`}>
                                                {getCardRank(gameState.tigerCards?.[0]?.rank || 1)}
                                            </span>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Glowing Fiery Tiger Illustration */}
                            <motion.div 
                                animate={roundWinner === 'T' ? { scale: [1, 1.25, 1.25, 1.25, 1], rotate: [0, 5, -5, 5, 0] } : { scale: [1, 1.04, 1] }}
                                transition={roundWinner === 'T' ? { duration: 1.5, repeat: Infinity } : { repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                                className="w-16 h-16 relative flex-shrink-0 flex flex-col items-center justify-center"
                            >
                                <div className={`w-14 h-14 rounded-full border-2 overflow-hidden bg-orange-950/40 relative transition-all ${roundWinner === 'T' ? 'border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.9)]' : 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)]'}`}>
                                    <img 
                                        src="https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?q=80&w=300&auto=format&fit=crop" 
                                        alt="Tiger" 
                                        className="w-full h-full object-cover scale-110" 
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-orange-950/60 via-transparent to-transparent"></div>
                                </div>
                                <span className={`absolute bottom-[-14px] left-1/2 -translate-x-1/2 text-[8px] font-black tracking-widest uppercase font-sans ${roundWinner === 'T' ? 'text-yellow-400 scale-110' : 'text-orange-400'}`}>TIGER</span>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Virtual High-stakes players floating layout left & right */}
                <div className="w-full relative shrink-0">
                    {/* Leftside Player Avatars */}
                    <div className="absolute left-3 top-[-125px] flex flex-col gap-3 z-30 pointer-events-none">
                        {virtualPlayersState.filter(p => p.side === 'left').map(p => (
                            <div key={p.id} className="flex items-center gap-1.5 transition-all duration-300">
                                <div className={`relative w-9 h-9 rounded-full border-2 ${p.active ? 'border-yellow-400 scale-110 shadow-[0_0_12px_#fbbf24]' : 'border-zinc-700'} overflow-hidden bg-zinc-900`}>
                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-white/5 text-[7px] font-bold text-slate-300 flex flex-col">
                                    <span className="truncate max-w-[50px]">{p.name}</span>
                                    <span className="text-yellow-500 font-black">₹{p.balance}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Rightside Player Avatars */}
                    <div className="absolute right-3 top-[-125px] flex flex-col items-end gap-3 z-30 pointer-events-none">
                        {virtualPlayersState.filter(p => p.side === 'right').map(p => (
                            <div key={p.id} className="flex items-center gap-1.5 transition-all duration-300">
                                <div className="bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-white/5 text-[7px] font-bold text-slate-300 flex flex-col items-end">
                                    <span className="truncate max-w-[50px]">{p.name}</span>
                                    <span className="text-yellow-500 font-black">₹{p.balance}</span>
                                </div>
                                <div className={`relative w-9 h-9 rounded-full border-2 ${p.active ? 'border-yellow-400 scale-110 shadow-[0_0_12px_#fbbf24]' : 'border-zinc-700'} overflow-hidden bg-zinc-900`}>
                                    <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Golden Bordered felt table (holding Blue, Green, Red columns with chip piles) */}
                <div className="w-full max-w-sm px-3 shrink-0 mt-2 z-20">
                    <div className="bg-gradient-to-b from-[#b45309] to-[#78350f] p-1.5 rounded-[1.8rem] shadow-[0_12px_35px_rgba(0,0,0,0.8)] border border-yellow-500/30">
                        <div className="bg-[#0c0d1b] rounded-[1.4rem] overflow-hidden grid grid-cols-3 gap-1 relative min-h-[190px]">
                            
                            {/* Felt columns backgrounds */}
                            
                            {/* Dragon Column (Left) */}
                            <button 
                                disabled={isBettingLocked || gameState.status !== 'BETTING'}
                                onClick={() => handleFeltBet('D')}
                                className={`relative h-full flex flex-col items-center justify-between p-3 py-4 transition-all ${
                                    isBettingLocked ? 'opacity-55' : 'hover:brightness-110 active:brightness-95'
                                } ${confirmTarget === 'D' ? 'bg-blue-900/40 border border-blue-500/30 shadow-inner' : 'bg-[#0f1b35]'}`}
                            >
                                {roundWinner === 'D' && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0.4, 0.9, 0.4] }}
                                        transition={{ repeat: Infinity, duration: 1 }}
                                        className="absolute inset-0 bg-blue-500/10 border-4 border-yellow-400 rounded-[1.2rem] z-30 pointer-events-none shadow-[0_0_20px_rgba(234,179,8,0.8)]"
                                    />
                                )}
                                <span className="text-zinc-500/20 text-4xl font-extrabold italic select-none absolute top-10 pointer-events-none">D</span>
                                <div className="text-center z-10 pointer-events-none">
                                    <h2 className="text-[11px] font-black tracking-widest text-blue-400 uppercase leading-none">DRAGON</h2>
                                    <span className="text-[8px] font-bold text-blue-300/60 block mt-1">PAY 2X</span>
                                </div>

                                {/* Stacked Chip Pile */}
                                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                                    <AnimatePresence>
                                        {tableChips.filter(c => c.target === 'D').map(chip => (
                                            <motion.div
                                                key={chip.id}
                                                initial={{ scale: 0.1, y: 150, opacity: 0 }}
                                                animate={{ scale: 0.55, x: `${chip.x}%`, y: `${chip.y}%`, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                transition={{ type: 'spring', damping: 14, stiffness: 120 }}
                                                className="absolute"
                                                style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
                                            >
                                                <CasinoChip value={chip.value} />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                                <div className="text-center z-10 pointer-events-none">
                                    <span className="text-[8px] text-zinc-500 block">Total Bets</span>
                                    <span className="text-[10px] font-black text-yellow-500">₹{(gameState?.totalBets?.D || 0).toLocaleString()}</span>
                                </div>
                            </button>

                            {/* Tie Column (Center) */}
                            <button 
                                disabled={isBettingLocked || gameState.status !== 'BETTING'}
                                onClick={() => handleFeltBet('Tie')}
                                className={`relative h-full flex flex-col items-center justify-between p-3 py-4 transition-all border-x border-white/5 ${
                                    isBettingLocked ? 'opacity-55' : 'hover:brightness-110 active:brightness-95'
                                } ${confirmTarget === 'Tie' ? 'bg-emerald-900/40 border border-emerald-500/30 shadow-inner' : 'bg-[#082119]'}`}
                            >
                                {roundWinner === 'Tie' && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0.4, 0.9, 0.4] }}
                                        transition={{ repeat: Infinity, duration: 1 }}
                                        className="absolute inset-0 bg-emerald-500/10 border-4 border-yellow-400 rounded-[1.2rem] z-30 pointer-events-none shadow-[0_0_20px_rgba(234,179,8,0.8)]"
                                    />
                                )}
                                <span className="text-zinc-500/20 text-4xl font-extrabold italic select-none absolute top-10 pointer-events-none">TIE</span>
                                <div className="text-center z-10 pointer-events-none">
                                    <h2 className="text-[11px] font-black tracking-widest text-emerald-400 uppercase leading-none">TIE</h2>
                                    <span className="text-[8px] font-bold text-emerald-300/60 block mt-1">PAY 12X</span>
                                </div>

                                {/* Stacked Chip Pile */}
                                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                                    <AnimatePresence>
                                        {tableChips.filter(c => c.target === 'Tie').map(chip => (
                                            <motion.div
                                                key={chip.id}
                                                initial={{ scale: 0.1, y: 150, opacity: 0 }}
                                                animate={{ scale: 0.55, x: `${chip.x}%`, y: `${chip.y}%`, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                transition={{ type: 'spring', damping: 14, stiffness: 120 }}
                                                className="absolute"
                                                style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
                                            >
                                                <CasinoChip value={chip.value} />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                                <div className="text-center z-10 pointer-events-none">
                                    <span className="text-[8px] text-zinc-500 block">Total Bets</span>
                                    <span className="text-[10px] font-black text-yellow-500">₹{(gameState?.totalBets?.Tie || 0).toLocaleString()}</span>
                                </div>
                            </button>

                            {/* Tiger Column (Right) */}
                            <button 
                                disabled={isBettingLocked || gameState.status !== 'BETTING'}
                                onClick={() => handleFeltBet('T')}
                                className={`relative h-full flex flex-col items-center justify-between p-3 py-4 transition-all ${
                                    isBettingLocked ? 'opacity-55' : 'hover:brightness-110 active:brightness-95'
                                } ${confirmTarget === 'T' ? 'bg-red-900/40 border border-red-500/30 shadow-inner' : 'bg-[#2a0e14]'}`}
                            >
                                {roundWinner === 'T' && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0.4, 0.9, 0.4] }}
                                        transition={{ repeat: Infinity, duration: 1 }}
                                        className="absolute inset-0 bg-red-500/10 border-4 border-yellow-400 rounded-[1.2rem] z-30 pointer-events-none shadow-[0_0_20px_rgba(234,179,8,0.8)]"
                                    />
                                )}
                                <span className="text-zinc-500/20 text-4xl font-extrabold italic select-none absolute top-10 pointer-events-none">T</span>
                                <div className="text-center z-10 pointer-events-none">
                                    <h2 className="text-[11px] font-black tracking-widest text-red-400 uppercase leading-none">TIGER</h2>
                                    <span className="text-[8px] font-bold text-red-300/60 block mt-1">PAY 2X</span>
                                </div>

                                {/* Stacked Chip Pile */}
                                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                                    <AnimatePresence>
                                        {tableChips.filter(c => c.target === 'T').map(chip => (
                                            <motion.div
                                                key={chip.id}
                                                initial={{ scale: 0.1, y: 150, opacity: 0 }}
                                                animate={{ scale: 0.55, x: `${chip.x}%`, y: `${chip.y}%`, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                transition={{ type: 'spring', damping: 14, stiffness: 120 }}
                                                className="absolute"
                                                style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
                                            >
                                                <CasinoChip value={chip.value} />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                                <div className="text-center z-10 pointer-events-none">
                                    <span className="text-[8px] text-zinc-500 block">Total Bets</span>
                                    <span className="text-[10px] font-black text-yellow-500">₹{(gameState?.totalBets?.T || 0).toLocaleString()}</span>
                                </div>
                            </button>

                        </div>
                    </div>
                </div>

                {/* Show Winning Banner Overlay */}
                {roundWinner && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-x-0 top-1/3 flex justify-center z-40 pointer-events-none px-6"
                    >
                        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 border-2 border-yellow-300 px-6 py-2.5 rounded-2xl shadow-2xl text-center text-black font-black uppercase tracking-[0.25em] text-xs animate-bounce">
                            🔥 {roundWinner === 'D' ? 'DRAGON' : roundWinner === 'T' ? 'TIGER' : 'TIE'} WINS! 🔥
                        </div>
                    </motion.div>
                )}

            </div>

            {/* Bottom Panel containing user status, gorgeous chip selector and active count */}
            <div className="bg-[#0b0c16] p-4 border-t border-white/10 z-[60] fixed bottom-0 left-0 w-full shadow-[0_-20px_50px_rgba(0,0,0,1)] pb-6">
                <div className="flex flex-col gap-3">
                    
                    {/* Chip Selector with Glowing sparkles */}
                    <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1 justify-center items-center">
                        {[10, 50, 100, 500, 1000, 5000].map(chip => (
                            <CasinoChip 
                                key={chip}
                                value={chip}
                                isSelected={selectedChip === chip}
                                onClick={() => {
                                    sfx.current.playClick();
                                    playSound('click');
                                    setSelectedChip(chip);
                                }}
                            />
                        ))}
                    </div>

                    {/* Re-bet, Double, Clear/Undo Control Row - Only shown when user has placed a bet */}
                    {myBets.length > 0 && (
                        <div className="flex gap-2 justify-center items-center px-1">
                            <button
                                disabled={gameState.status !== 'BETTING' || isBettingLocked || previousBets.length === 0}
                                onClick={() => {
                                    repeatPreviousBets();
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-b from-blue-950 to-blue-900 border border-blue-500/30 text-[10px] font-black uppercase text-blue-400 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-lg disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <span>🔁</span> RE-BET
                            </button>
                            <button
                                disabled={gameState.status !== 'BETTING' || isBettingLocked || myBets.length === 0}
                                onClick={() => {
                                    doubleCurrentBets();
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-b from-amber-950 to-amber-900 border border-amber-500/30 text-[10px] font-black uppercase text-amber-400 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-lg disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <span>✨</span> DOUBLE (2x)
                            </button>
                            <button
                                disabled={gameState.status !== 'BETTING' || isBettingLocked || myBets.length === 0}
                                onClick={() => {
                                    clearAllBets();
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-b from-red-950 to-red-900 border border-red-500/30 text-[10px] font-black uppercase text-red-400 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-lg disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <span>❌</span> CLEAR ALL
                            </button>
                        </div>
                    )}

                    {/* Bottom Status Row (Active profile | Undo buttons | Active players count) */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        {/* Profile left */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-yellow-500/50 overflow-hidden bg-zinc-900">
                                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150" alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[9px] font-bold text-slate-400">{username || 'Guest'}</span>
                                <span className="text-[10px] font-black text-yellow-500 leading-none">₹{userBalance.toFixed(0)}</span>
                            </div>
                        </div>

                        {/* Return Bet Undo Button */}
                        {myBets.length > 0 && gameState.status === 'BETTING' && !isBettingLocked && (
                            <button 
                                onClick={cancelLastBet} 
                                className="px-4 py-2 bg-red-600/10 border border-red-500/20 rounded-xl text-[9px] font-black uppercase text-red-500 active:scale-95 transition-all flex items-center gap-1.5 shadow-lg"
                            >
                                <RotateCcw size={11} /> 
                                <span>UNDO</span>
                            </button>
                        )}

                        {/* Multiplayer online counter */}
                        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5 text-zinc-400">
                            <Users size={12} className="text-yellow-500 animate-pulse" />
                            <span className="text-[10px] font-black font-mono leading-none">40</span>
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
                .gold-text { background: linear-gradient(to bottom, #fde68a, #d97706, #fde68a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .perspective-500 {
                    perspective: 500px;
                }
            `}</style>
        </div>
    );
};

export default DragonTiger;
