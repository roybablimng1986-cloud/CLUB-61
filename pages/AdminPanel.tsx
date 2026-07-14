import React, { useState, useEffect } from "react";
import { UserProfile, GiftCode, AppSettings, Transaction } from "../types";
import {
  getAllUsers,
  adminUpdateUserBalance,
  adminBlockUser,
  adminDeleteUser,
  adminGetSettings,
  adminUpdateSettings,
  adminCreateGiftCode,
  adminGetAllGiftCodes,
  adminDeleteGiftCode,
  getAllPendingTransactions,
  approveTransaction,
  rejectTransaction,
  db,
  adminGetResultControl,
  adminSetNextResult,
} from "../services/supabaseService";
import {
  ArrowLeft,
  Users,
  Gamepad2,
  Gift,
  ShieldCheck,
  Wallet,
  Trash2,
  Ban,
  Search,
  CheckCircle2,
  X,
  Plus,
  Power,
  CreditCard,
  Clock,
  CheckCircle,
} from "lucide-react";

const compressAndResizeImage = (
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  callback: (base64: string) => void,
) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        callback(compressedBase64);
      } else {
        callback(event.target?.result as string);
      }
    };
    img.onerror = () => {
      callback(event.target?.result as string);
    };
    img.src = event.target?.result as string;
  };
  reader.onerror = () => {
    const fallbackReader = new FileReader();
    fallbackReader.onload = (fe) => {
      callback(fe.target?.result as string);
    };
    fallbackReader.readAsDataURL(file);
  };
  reader.readAsDataURL(file);
};

const AdminPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<
    "REQUESTS" | "USERS" | "GAMES" | "GIFTS" | "PAYMENTS"
  >("REQUESTS");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [gameSearch, setGameSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [newGift, setNewGift] = useState({
    code: "",
    amount: 100,
    limit: 10,
    minVip: 0,
    expiryDate: "",
  });

  const [adminResults, setAdminResults] = useState<any>({});

  const [customGameName, setCustomGameName] = useState("");
  const [customGameLink, setCustomGameLink] = useState("");
  const [customGameBanner, setCustomGameBanner] = useState("");
  const [uploadingCustomBanner, setUploadingCustomBanner] = useState(false);

  const handleCustomBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCustomBanner(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setCustomGameBanner(base64String);
      setUploadingCustomBanner(false);
    };
    reader.onerror = () => {
      alert("Failed to read file.");
      setUploadingCustomBanner(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCustomGame = async () => {
    if (!customGameName.trim()) {
      alert("Please enter custom game name.");
      return;
    }
    if (!customGameLink.trim()) {
      alert("Please enter game website link.");
      return;
    }
    if (!customGameBanner.trim()) {
      alert("Please upload a banner image or provide a banner image URL.");
      return;
    }

    const newGame = {
      id: `custom_${Date.now()}`,
      name: customGameName.trim(),
      banner: customGameBanner,
      link: customGameLink.trim(),
      disabled: false
    };

    const updatedCustomGames = [...(settings?.customGames || []), newGame];
    const newSettings = {
      ...(settings || {}),
      customGames: updatedCustomGames
    } as AppSettings;

    setSettings(newSettings);
    await adminUpdateSettings(newSettings);

    // Reset fields
    setCustomGameName("");
    setCustomGameLink("");
    setCustomGameBanner("");
    alert("Custom Game Added successfully!");
  };

  const handleDeleteCustomGame = async (gameId: string) => {
    if (!window.confirm("Are you sure you want to delete this custom game?")) {
      return;
    }
    const updatedCustomGames = (settings?.customGames || []).filter((g: any) => g.id !== gameId);
    const newSettings = {
      ...(settings || {}),
      customGames: updatedCustomGames
    } as AppSettings;

    setSettings(newSettings);
    await adminUpdateSettings(newSettings);
  };

  const handleToggleCustomGame = async (gameId: string) => {
    const updatedCustomGames = (settings?.customGames || []).map((g: any) => 
      g.id === gameId ? { ...g, disabled: !g.disabled } : g
    );
    const newSettings = {
      ...(settings || {}),
      customGames: updatedCustomGames
    } as AppSettings;

    setSettings(newSettings);
    await adminUpdateSettings(newSettings);
  };

  const [newMethodName, setNewMethodName] = useState("");
  const [newMethodId, setNewMethodId] = useState("");
  const [newMethodUpi, setNewMethodUpi] = useState("");
  const [newMethodQr, setNewMethodQr] = useState("");

  const handleAddPaymentMethod = () => {
    if (!newMethodName) {
      alert("Payment Method name is required.");
      return;
    }
    if (!newMethodQr) {
      alert("QR Scanner Image is required.");
      return;
    }
    const newMethod = {
      id: newMethodId || `pm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newMethodName,
      qrImage: newMethodQr,
      upiId: newMethodUpi || undefined,
    };
    
    setSettings(prev => {
      if (!prev) return null;
      const methods = prev.paymentMethods || [];
      return {
        ...prev,
        paymentMethods: [...methods, newMethod]
      };
    });
    
    // Clear fields
    setNewMethodName("");
    setNewMethodId("");
    setNewMethodUpi("");
    setNewMethodQr("");
  };

  const handleDeletePaymentMethod = (id: string) => {
    setSettings(prev => {
      if (!prev) return null;
      const methods = prev.paymentMethods || [];
      return {
        ...prev,
        paymentMethods: methods.filter(m => m.id !== id)
      };
    });
  };

  useEffect(() => {
    setLoading(true);
    const unsubUsers = getAllUsers(setUsers);
    const unsubGifts = adminGetAllGiftCodes(setGiftCodes);
    const unsubPending = getAllPendingTransactions(setPendingRequests);
    const unsubSettings = adminGetSettings(setSettings);
    const unsubResults = adminGetResultControl(setAdminResults);
    setLoading(false);
    return () => {
      unsubUsers();
      unsubGifts();
      unsubPending();
      unsubSettings();
      unsubResults();
    };
  }, []);

  // Self-healing: Compress pre-existing oversized banners to keep document size small
  useEffect(() => {
    if (settings && settings.gameBanners) {
      let needsCompression = false;
      const updatedBanners = { ...settings.gameBanners };
      const promises: Promise<void>[] = [];

      Object.entries(settings.gameBanners).forEach(([gameId, base64]) => {
        if (typeof base64 === "string" && base64.startsWith("data:image") && base64.length > 40000) {
          needsCompression = true;
          const promise = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              let width = img.width;
              let height = img.height;
              const maxWidth = 300;
              const maxHeight = 400;

              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }

              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                updatedBanners[gameId] = canvas.toDataURL("image/jpeg", 0.5);
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = base64;
          });
          promises.push(promise);
        }
      });

      if (needsCompression) {
        Promise.all(promises).then(() => {
          const newSettings = { ...settings, gameBanners: updatedBanners };
          setSettings(newSettings);
          adminUpdateSettings(newSettings);
        });
      }
    }
  }, [settings]);

  const handleMoneyAction = async (
    uid: string,
    amount: number,
    isGift: boolean,
  ) => {
    const promptMsg = isGift
      ? "Enter amount to GIFT to this user:"
      : "Enter amount to DEDUCT from this user:";
    const val = window.prompt(promptMsg, String(Math.abs(amount)));
    if (val === null) return;
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed <= 0) {
      alert("Please enter a valid positive number.");
      return;
    }
    await adminUpdateUserBalance(uid, isGift ? parsed : -parsed, isGift);
  };

  const toggleGame = async (gameId: string) => {
    if (!settings) return;
    const newDisabled = { ...(settings.disabledGames || {}) };
    newDisabled[gameId] = !newDisabled[gameId];
    await adminUpdateSettings({ disabledGames: newDisabled });
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search),
  );

  const GAMES_LIST = [
    { id: "GAME_LUDO", name: "Ludo Arena" },
    { id: "GAME_VORTEX", name: "VORTEX" },
    { id: "GAME_MINES", name: "Mines" },
    { id: "GAME_CHICKEN_ROAD", name: "Dog Road" },
    { id: "GAME_7UP_DOWN", name: "7 Up Down" },
    { id: "GAME_DRAGON_TIGER", name: "Dragon Tiger" },
    { id: "GAME_ROULETTE", name: "Roulette" },
    { id: "GAME_LUCKY_WHEEL", name: "Lucky Wheel" },
    { id: "GAME_ANDAR_BAHAR", name: "Andar Bahar" },
    { id: "GAME_AVIATOR", name: "Aviator" },
    { id: "GAME_WINGO", name: "WinGo" },
    { id: "GAME_PLINKO", name: "Plinko" },
    { id: "GAME_LIMBO", name: "Limbo" },
    { id: "GAME_FRUIT_SLOT", name: "Fruit Slot" },
    { id: "GAME_EGYPT_SLOT", name: "Egypt Slot" },
    { id: "GAME_HEAD_TAILS", name: "Head & Tails" },
    { id: "GAME_KENO", name: "Keno Elite" },
    { id: "GAME_DICE", name: "Dice Duel" },
    { id: "GAME_HILO", name: "Hi-Lo Elite" },
    { id: "GAME_PUMP", name: "Pump Up" },
    { id: "GAME_MOLES", name: "Rat Hunter" },
    { id: "GAME_SCRATCH_CARD", name: "Scratch card" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-white font-sans flex flex-col pb-20">
      <div className="bg-[#111827] p-4 flex items-center justify-between border-b border-yellow-500/20 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 rounded-xl active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-black gold-text uppercase italic">
            MASTER COMMAND
          </h1>
        </div>
        <div className="bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20 text-[10px] font-black uppercase text-yellow-500">
          Live Control
        </div>
      </div>

      <div className="flex bg-[#111827] border-b border-white/5 overflow-x-auto no-scrollbar">
        <NavBtn
          label="Requests"
          active={activeTab === "REQUESTS"}
          onClick={() => setActiveTab("REQUESTS")}
          badge={pendingRequests.length}
        />
        <NavBtn
          label="Users"
          active={activeTab === "USERS"}
          onClick={() => setActiveTab("USERS")}
        />
        <NavBtn
          label="Games"
          active={activeTab === "GAMES"}
          onClick={() => setActiveTab("GAMES")}
        />
        <NavBtn
          label="Gift"
          active={activeTab === "GIFTS"}
          onClick={() => setActiveTab("GIFTS")}
        />
        <NavBtn
          label="Config"
          active={activeTab === "PAYMENTS"}
          onClick={() => setActiveTab("PAYMENTS")}
        />
      </div>

      <div className="flex-1 p-6 overflow-y-auto no-scrollbar">
        {activeTab === "REQUESTS" && (
          <div className="space-y-4">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((tx) => (
                <div
                  key={tx.txId}
                  className="bg-[#111827] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden"
                >
                  <div
                    className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl font-black text-[9px] uppercase ${tx.type === "DEPOSIT" ? "bg-blue-600" : "bg-red-600"}`}
                  >
                    {tx.type}
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-2xl text-yellow-500">
                        ₹{(Number(tx.amount) || 0).toFixed(2)}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">
                        Operative: {tx.uid ? tx.uid.slice(-6) : "Unknown"}
                      </p>
                      <p className="text-[10px] text-blue-400 mt-2 font-mono break-all">
                        {tx.utr ? `UTR: ${tx.utr}` : `Method: ${tx.method}`}
                      </p>
                      {tx.accountDetails && (
                        <div className="mt-2 p-2 bg-black/40 rounded-lg text-[9px] text-slate-400 font-mono">
                          {JSON.stringify(tx.accountDetails)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => approveTransaction(tx.uid, tx.txId)}
                      className="py-3 bg-green-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-green-900/40"
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => rejectTransaction(tx.uid, tx.txId)}
                      className="py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-red-900/40"
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center opacity-20">
                <Clock size={48} className="mb-4" />
                <p className="font-black uppercase tracking-widest">
                  No Active Requests
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "USERS" && (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-3 flex items-center gap-3 border border-white/10 mb-6 shadow-inner">
              <Search size={18} className="text-slate-500" />
              <input
                type="text"
                placeholder="Search operative..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent flex-1 text-sm outline-none text-white font-bold"
              />
            </div>
            {filteredUsers.map((u) => (
              <div
                key={u.uid}
                className="bg-[#111827] p-6 rounded-3xl border border-white/5"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar}
                      className="w-12 h-12 rounded-full border border-white/10 shadow-lg"
                    />
                    <div>
                      <h3 className="font-black text-sm">@{u.username}</h3>
                      <p className="text-[9px] text-slate-500 font-mono">
                        {u.phone}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black gold-text italic">
                      ₹{u.balance.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleMoneyAction(u.uid, 500, true)}
                    className="py-3 bg-green-600/10 text-green-500 border border-green-500/20 rounded-xl text-[9px] font-black uppercase shadow-sm"
                  >
                    GIFT CUSTOM
                  </button>
                  <button
                    onClick={() => handleMoneyAction(u.uid, 500, false)}
                    className="py-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl text-[9px] font-black uppercase shadow-sm"
                  >
                    CUT CUSTOM
                  </button>
                  <button
                    onClick={() => adminBlockUser(u.uid, !u.isBlocked)}
                    className={`py-3 border rounded-xl text-[9px] font-black uppercase ${u.isBlocked ? "bg-red-600 text-white" : "border-slate-700 text-slate-400"}`}
                  >
                    {u.isBlocked ? "UNBLOCK" : "BLOCK"}
                  </button>
                  <button
                    onClick={() => adminDeleteUser(u.uid)}
                    className="py-3 bg-red-900/10 text-red-500 border border-red-900/20 rounded-xl text-[9px] font-black uppercase"
                  >
                    PURGE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "GAMES" && (
          <div className="space-y-6">
            {/* Search Games Bar */}
            <div className="bg-zinc-900 rounded-2xl p-3 flex items-center gap-3 border border-white/10 shadow-inner">
              <Search size={18} className="text-slate-500" />
              <input
                type="text"
                placeholder="Search games..."
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                className="bg-transparent flex-1 text-sm outline-none text-white font-bold"
              />
              {gameSearch && (
                <X
                  size={16}
                  onClick={() => setGameSearch("")}
                  className="text-slate-500 cursor-pointer"
                />
              )}
            </div>

            {/* Live Probability Diagnostics view */}
            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-[2rem] border border-yellow-500/30 shadow-2xl space-y-4">
              <h3 className="text-xs font-black uppercase text-yellow-500 flex items-center gap-2 italic tracking-widest">
                <ShieldCheck
                  size={18}
                  className="text-yellow-500 animate-pulse"
                />{" "}
                ENGINE PROBABILITY DIAGNOSTICS (LIVE VALUES)
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Displays real-time calculations currently applied to game
                calculations. Specific settings override global defaults.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {[
                  { name: "Vortex", key: "vortex" },
                  { name: "7 Up Down", key: "seven_up_down" },
                  { name: "Dragon Tiger", key: "dragon_tiger" },
                ].map((game) => {
                  const specific = settings?.gameProbabilities?.[game.key];
                  const globalVal = settings?.globalWinProbability ?? 40;
                  const activeProb =
                    specific !== undefined ? specific : globalVal;
                  return (
                    <div
                       key={game.key}
                      className="bg-black/40 p-4 rounded-2xl border border-white/5 flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-white mb-2">
                          {game.name}
                        </h4>
                        <div className="space-y-1 text-[9px] text-slate-400 font-bold">
                          <div className="flex justify-between">
                            <span>Specific Limit:</span>
                            <span
                              className={
                                specific !== undefined
                                  ? "text-green-400"
                                  : "text-slate-500"
                              }
                            >
                              {specific !== undefined
                                ? `${specific}%`
                                : "Not Set (Inherited)"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Global Default:</span>
                            <span>{globalVal}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-white/5 mt-3 pt-2 flex justify-between items-center">
                        <span className="text-[9px] font-black text-yellow-500 uppercase">
                          Active Engine Prob:
                        </span>
                        <span className="text-sm font-black text-yellow-500 font-mono px-2 py-0.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                          {activeProb}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {GAMES_LIST.filter((game) =>
              game.name.toLowerCase().includes(gameSearch.toLowerCase())
            ).map((game) => {
              const rawId = game.id.replace("GAME_", "").toLowerCase();
              const specificProb = settings?.gameProbabilities?.[rawId];
              const globalProb = settings?.globalWinProbability ?? 40;
              const activeProb =
                specificProb !== undefined ? specificProb : globalProb;
              return (
                <div
                  key={game.id}
                  className="bg-[#111827] p-6 rounded-[2rem] border border-white/5 shadow-xl flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <h4 className="font-black text-sm uppercase italic gold-text tracking-widest">
                        {game.name}
                      </h4>
                      {["vortex", "seven_up_down", "dragon_tiger"].includes(
                        rawId,
                      ) && (
                        <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">
                          Active Probability: {activeProb}%
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleGame(game.id)}
                      className={`px-6 py-2 rounded-xl font-black text-[9px] uppercase transition-all shadow-lg ${settings?.disabledGames?.[game.id] ? "bg-red-600 text-white" : "bg-green-600 text-black"}`}
                    >
                      {settings?.disabledGames?.[game.id] ? "OFFLINE" : "LIVE"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Force Next Result
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {game.id === "GAME_VORTEX" &&
                        [
                          "200X",
                          "85X",
                          "50X",
                          "28X",
                          "12X",
                          "7X",
                          "3X",
                          "0X",
                        ].map((r) => (
                          <button
                            key={r}
                            onClick={() => adminSetNextResult("vortex", r)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${adminResults.vortex === r ? "bg-yellow-500 text-black border-yellow-500" : "bg-white/5 border-white/10 text-white"}`}
                          >
                            {r}
                          </button>
                        ))}
                      {game.id === "GAME_7UP_DOWN" &&
                        ["Down", "Seven", "Up"].map((r) => (
                          <button
                            key={r}
                            onClick={() =>
                              adminSetNextResult("seven_up_down", r)
                            }
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${adminResults.seven_up_down === r ? "bg-yellow-500 text-black border-yellow-500" : "bg-white/5 border-white/10 text-white"}`}
                          >
                            {r}
                          </button>
                        ))}
                      {game.id === "GAME_DRAGON_TIGER" &&
                        ["Dragon", "Tiger", "Tie"].map((r) => (
                          <button
                            key={r}
                            onClick={() =>
                              adminSetNextResult("dragon_tiger", r)
                            }
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${adminResults.dragon_tiger === r ? "bg-yellow-500 text-black border-yellow-500" : "bg-white/5 border-white/10 text-white"}`}
                          >
                            {r}
                          </button>
                        ))}
                    </div>
                    <button
                      onClick={() =>
                        adminSetNextResult(
                          game.id.replace("GAME_", "").toLowerCase(),
                          null,
                        )
                      }
                      className="text-[10px] text-red-500 font-bold uppercase underline"
                    >
                      Clear Override
                    </button>
                  </div>

                  {/* Custom Cover Banner Uploader */}
                  <div className="space-y-2 border-t border-white/5 pt-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Game Cover Image (Banner)
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 rounded-lg bg-slate-950 border border-white/10 overflow-hidden flex-shrink-0">
                        <img
                          src={
                            settings?.gameBanners?.[game.id] ||
                            "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&h=400&auto=format&fit=crop"
                          }
                          className="w-full h-full object-contain"
                          alt="Cover Preview"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          id={`banner-upload-${game.id}`}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && settings) {
                              compressAndResizeImage(
                                file,
                                300,
                                400,
                                0.5,
                                (base64) => {
                                  const updatedBanners = {
                                    ...(settings.gameBanners || {}),
                                    [game.id]: base64,
                                  };
                                  const newSettings = {
                                    ...settings,
                                    gameBanners: updatedBanners,
                                  };
                                  setSettings(newSettings);
                                  adminUpdateSettings(newSettings);
                                },
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={`banner-upload-${game.id}`}
                          className="py-2 px-3 bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all rounded-lg text-center text-[9px] font-black uppercase cursor-pointer flex-1"
                        >
                          Upload File
                        </label>
                        {settings?.gameBanners?.[game.id] && (
                          <button
                            onClick={() => {
                              if (settings) {
                                const updatedBanners = {
                                  ...(settings.gameBanners || {}),
                                };
                                delete updatedBanners[game.id];
                                const newSettings = {
                                  ...settings,
                                  gameBanners: updatedBanners,
                                };
                                setSettings(newSettings);
                                adminUpdateSettings(newSettings);
                              }
                            }}
                            className="py-2 px-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-lg text-[9px] font-black uppercase"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Custom Games Section */}
            <div className="bg-gradient-to-br from-[#1e293b]/70 to-[#0f172a]/70 p-6 rounded-[2rem] border border-yellow-500/20 shadow-2xl space-y-6 mt-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎮</span>
                <h3 className="text-xs font-black uppercase text-yellow-500 italic tracking-widest">
                  ADD NEW CUSTOM EXTERNAL GAME
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Admins can add any external web game here. To add, supply its banner image, name, and redirect website link. Real-time balance win/loss synchronization is fully integrated.
              </p>

              <div className="space-y-4">
                {/* Game Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Game Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Aviator World, Diamond Slots"
                    value={customGameName}
                    onChange={(e) => setCustomGameName(e.target.value)}
                    className="w-full bg-[#111827] border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-yellow-500"
                  />
                </div>

                {/* Game Link */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Game Website Link (URL)</label>
                  <input
                    type="text"
                    placeholder="https://example.com/game"
                    value={customGameLink}
                    onChange={(e) => setCustomGameLink(e.target.value)}
                    className="w-full bg-[#111827] border border-white/5 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-yellow-500"
                  />
                </div>

                {/* Game Banner Option */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Game Banner Image</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File Upload Option */}
                    <div className="bg-[#111827] border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 relative">
                      <span className="text-xl">📁</span>
                      <span className="text-[10px] font-black uppercase text-slate-300">Upload Banner File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCustomBannerFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <span className="text-[8px] text-slate-500 font-bold uppercase">PNG, JPG, SVG</span>
                    </div>

                    {/* Image URL Option */}
                    <div className="space-y-2 bg-[#111827] border border-white/5 rounded-xl p-4 flex flex-col justify-center">
                      <span className="text-[10px] font-black uppercase text-slate-400">OR Banner Image URL</span>
                      <input
                        type="text"
                        placeholder="https://example.com/banner.png"
                        value={customGameBanner}
                        onChange={(e) => setCustomGameBanner(e.target.value)}
                        className="w-full bg-[#0d1321] border border-white/5 rounded-lg px-3 py-2 text-xs text-white font-bold outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>

                  {/* Banner Preview */}
                  {customGameBanner && (
                    <div className="bg-[#111827] rounded-xl p-3 border border-white/5 flex flex-col items-center gap-2">
                      <span className="text-[8px] font-black uppercase text-yellow-500 tracking-wider">Banner Preview</span>
                      <img 
                        src={customGameBanner} 
                        alt="Custom Game Banner Preview" 
                        className="max-h-24 rounded-lg object-contain bg-slate-950 border border-white/5" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                {/* Add Button */}
                <button
                  onClick={handleAddCustomGame}
                  disabled={uploadingCustomBanner}
                  className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:from-yellow-400 hover:to-orange-400 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                >
                  {uploadingCustomBanner ? "Uploading Banner..." : "ADD CUSTOM GAME"}
                </button>
              </div>
            </div>

            {/* Manage Custom Games List */}
            <div className="bg-[#111827] p-6 rounded-[2rem] border border-white/5 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                <h3 className="text-xs font-black uppercase text-white tracking-widest">
                  MANAGE CUSTOM EXTERNAL GAMES ({settings?.customGames?.length || 0})
                </h3>
              </div>

              <div className="space-y-4">
                {(!settings?.customGames || settings.customGames.length === 0) ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-bold uppercase tracking-wider bg-black/20 rounded-2xl border border-white/[0.02]">
                    No custom external games added yet.
                  </div>
                ) : (
                  settings.customGames.map((game: any) => (
                    <div 
                      key={game.id}
                      className="bg-[#0f172a] p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img 
                          src={game.banner} 
                          alt={game.name} 
                          className="w-12 h-16 rounded-lg object-cover bg-slate-950 flex-shrink-0 border border-white/5" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="font-black text-xs uppercase text-white truncate">{game.name}</h4>
                          <span className="text-[8px] text-yellow-500 font-bold uppercase tracking-wider block mt-0.5 truncate max-w-xs">{game.link}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* OFFLINE/LIVE TOGGLE */}
                        <button
                          onClick={() => handleToggleCustomGame(game.id)}
                          className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase transition-all shadow-lg ${game.disabled ? "bg-red-600 text-white" : "bg-green-600 text-black"}`}
                        >
                          {game.disabled ? "OFFLINE" : "LIVE"}
                        </button>

                        {/* DELETE BUTTON */}
                        <button
                          onClick={() => handleDeleteCustomGame(game.id)}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-lg active:scale-95 transition-all text-xs"
                          title="Delete Custom Game"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "GIFTS" && (
          <div className="space-y-4">
            <button
              onClick={() => setShowGiftModal(true)}
              className="w-full py-6 bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-black uppercase rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
            >
              <Plus size={24} /> GENERATE NEW BOUNTY
            </button>
            {giftCodes.map((g, index) => (
              <div
                key={`${g.code}-${index}`}
                className="bg-[#111827] p-5 rounded-2xl border border-white/5 flex justify-between items-center shadow-lg"
              >
                <div>
                  <h3 className="font-black text-yellow-500 italic text-xl uppercase tracking-widest">
                    {g.code}
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase font-black mt-1">
                    ₹{g.amount} • {g.usedCount}/{g.limit} Uses
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (window.confirm(`Are you sure you want to delete gift code: ${g.code}?`)) {
                      await adminDeleteGiftCode(g.code);
                    }
                  }}
                  className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500/10 active:scale-95 transition-all"
                  title="Delete Gift Code"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "PAYMENTS" && (
          <div className="space-y-6">
            {/* Gateway Core */}
            <div className="bg-[#111827] p-6 rounded-3xl border border-white/5 shadow-xl">
              <h3 className="text-xs font-black uppercase text-yellow-500 mb-6 flex items-center gap-2 italic tracking-widest">
                <CreditCard size={18} /> GATEWAY CORE
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] text-slate-500 font-black uppercase">
                    Universal Platform UPI ID
                  </label>
                  <input
                    type="text"
                    value={settings?.upiId || ""}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev ? { ...prev, upiId: e.target.value } : null,
                      )
                    }
                    className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl p-3 text-white font-mono font-bold mt-1 outline-none focus:border-yellow-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-slate-500 font-black uppercase">
                      Min Withdrawal (₹)
                    </label>
                    <input
                      type="number"
                      value={settings?.minWithdrawal || 0}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? { ...prev, minWithdrawal: Number(e.target.value) }
                            : null,
                        )
                      }
                      className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl p-3 text-white font-bold mt-1 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-black uppercase">
                      Max Withdrawal (₹)
                    </label>
                    <input
                      type="number"
                      value={settings?.maxWithdrawal || 0}
                      onChange={(e) =>
                        setSettings((prev) =>
                          prev
                            ? { ...prev, maxWithdrawal: Number(e.target.value) }
                            : null,
                        )
                      }
                      className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl p-3 text-white font-bold mt-1 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 font-black uppercase">
                    Min Deposit (₹)
                  </label>
                  <input
                    type="number"
                    value={settings?.minDeposit || 0}
                    onChange={(e) =>
                      setSettings((prev) =>
                        prev
                          ? { ...prev, minDeposit: Number(e.target.value) }
                          : null,
                      )
                    }
                    className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl p-3 text-white font-bold mt-1 outline-none focus:border-yellow-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-500 font-black uppercase">
                    Custom Deposit QR Code Scanner Image
                  </label>
                  <div className="flex flex-col gap-3">
                    {settings?.depositQrImage ? (
                      <div className="relative w-32 h-32 bg-white rounded-2xl p-2 border border-slate-700/50 group">
                        <img
                          src={settings.depositQrImage}
                          className="w-full h-full object-contain"
                          alt="Custom QR"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSettings((prev) =>
                              prev ? { ...prev, depositQrImage: "" } : null,
                            )
                          }
                          className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white p-1 rounded-full text-[10px]"
                          title="Remove QR Image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-bold italic bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-700 text-center">
                        No custom QR image. Generating dynamic UPI pay QR
                        instead.
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      id="qr-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          compressAndResizeImage(file, 250, 250, 0.5, (base64) => {
                            setSettings((prev) =>
                              prev ? { ...prev, depositQrImage: base64 } : null,
                            );
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor="qr-upload"
                      className="py-3 px-4 bg-blue-600/10 text-blue-500 border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all rounded-xl text-center text-xs font-black uppercase cursor-pointer block"
                    >
                      Upload Custom Scanner QR Image
                    </label>
                  </div>
                </div>

                {/* Custom Payment Methods Section */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-black text-yellow-500 uppercase tracking-widest italic flex items-center gap-2">
                    <CreditCard size={16} /> Custom Payment Methods
                  </h4>
                  <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                    Add multiple custom payment routes with specific names and scanner images. Users can choose between them during deposits.
                  </p>

                  {/* Add New Form */}
                  <div className="bg-[#0e1424] p-4 rounded-2xl border border-slate-800 space-y-3">
                    <span className="text-[9px] font-black uppercase text-yellow-500/80">Add Payment Method</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[8px] text-slate-500 font-bold uppercase">Method Name (e.g. UPI, GPay)*</label>
                        <input
                          type="text"
                          placeholder="GPay / PhonePe / UPI"
                          value={newMethodName}
                          onChange={(e) => setNewMethodName(e.target.value)}
                          className="w-full bg-[#050811] border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold mt-1 outline-none focus:border-yellow-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-500 font-bold uppercase">Optional ID (e.g. gpay_id)</label>
                        <input
                          type="text"
                          placeholder="gpay_id (optional)"
                          value={newMethodId}
                          onChange={(e) => setNewMethodId(e.target.value)}
                          className="w-full bg-[#050811] border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold mt-1 outline-none focus:border-yellow-500/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[8px] text-slate-500 font-bold uppercase">Optional UPI ID (for dynamic payment)</label>
                      <input
                        type="text"
                        placeholder="your-upi-address@bank"
                        value={newMethodUpi}
                        onChange={(e) => setNewMethodUpi(e.target.value)}
                        className="w-full bg-[#050811] border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold mt-1 outline-none focus:border-yellow-500/50"
                      />
                    </div>

                    <div>
                      <label className="text-[8px] text-slate-500 font-bold uppercase block mb-1">Scanner QR Image (Photo)*</label>
                      <div className="flex items-center gap-3">
                        {newMethodQr ? (
                          <div className="relative w-16 h-16 bg-white rounded-xl p-1 border border-slate-700/50">
                            <img src={newMethodQr} className="w-full h-full object-contain" alt="Preview" />
                            <button
                              type="button"
                              onClick={() => setNewMethodQr("")}
                              className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white p-0.5 rounded-full text-[8px]"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <div className="text-[8px] text-slate-500 border border-dashed border-slate-800 p-3 rounded-xl flex-1 text-center bg-black/20">
                            No Image Uploaded
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          id="method-qr-upload"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              compressAndResizeImage(file, 250, 250, 0.5, (base64) => {
                                setNewMethodQr(base64);
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor="method-qr-upload"
                          className="py-2.5 px-3 bg-blue-600/10 text-blue-400 border border-blue-500/10 hover:bg-blue-600 hover:text-white transition-all rounded-xl text-[10px] font-black uppercase cursor-pointer block"
                        >
                          Choose photo
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddPaymentMethod}
                      className="w-full py-2.5 bg-yellow-500 text-black hover:bg-yellow-400 transition-all rounded-xl text-[10px] font-black uppercase tracking-wider mt-2 font-mono"
                    >
                      Add Payment Method
                    </button>
                  </div>

                  {/* List Current Payment Methods */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-500">Active Methods</span>
                    {settings?.paymentMethods && settings.paymentMethods.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {settings.paymentMethods.map((pm, index) => (
                          <div key={pm.id || index} className="bg-[#0e1424] p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <img src={pm.qrImage} className="w-10 h-10 object-contain bg-white rounded-lg p-0.5" alt={pm.name} />
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-white">{pm.name}</span>
                                <span className="text-[8px] text-slate-500 font-bold">ID: {pm.id || "None"}</span>
                                {pm.upiId && <span className="text-[8px] text-yellow-500/80 font-bold truncate max-w-[120px]">{pm.upiId}</span>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeletePaymentMethod(pm.id || pm.name)}
                              className="text-red-500 hover:text-red-400 p-1 bg-red-500/10 rounded-lg active:scale-90 transition-all shrink-0"
                              title="Delete Payment Method"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">No custom payment methods configured. Default UPI settings will be active.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/5">
                  <h4 className="text-xs font-black text-yellow-500 uppercase tracking-widest italic flex items-center gap-2">
                    <Gamepad2 size={16} /> Image Carousel Banner Settings
                  </h4>
                  <p className="text-[9px] text-slate-500 font-medium leading-relaxed mb-3">
                    Configure multiple banner images that automatically scroll and change on the home page. You can configure unique click links for each.
                  </p>
                  <div className="space-y-4">
                    {/* List existing ones */}
                    {((settings?.bannerImages && settings.bannerImages.length > 0) ? settings.bannerImages : [settings?.bannerImage || ""]).map((img, idx) => {
                      if (!img && idx === 0 && (!settings?.bannerImages || settings.bannerImages.length === 0)) {
                        return (
                          <div key="empty" className="text-[10px] text-slate-400 font-bold italic bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-700 text-center">
                            No active banners. Upload an image below to start.
                          </div>
                        );
                      }
                      if (!img) return null;

                      const currentLink = (settings?.bannerLinks && settings.bannerLinks[idx]) || (idx === 0 ? settings?.bannerLink : "") || "";

                      return (
                        <div key={idx} className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-3 relative">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                              Banner #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSettings((prev) => {
                                  if (!prev) return null;
                                  const imgs = prev.bannerImages ? [...prev.bannerImages] : [prev.bannerImage || ""];
                                  const lnks = prev.bannerLinks ? [...prev.bannerLinks] : [prev.bannerLink || ""];
                                  
                                  imgs.splice(idx, 1);
                                  lnks.splice(idx, 1);

                                  return {
                                    ...prev,
                                    bannerImage: imgs[0] || "",
                                    bannerLink: lnks[0] || "",
                                    bannerImages: imgs,
                                    bannerLinks: lnks
                                  };
                                });
                              }}
                              className="text-red-500 hover:text-red-400 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>

                          <div className="relative w-full h-28 bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                            <img
                              src={img}
                              className="w-full h-full object-cover"
                              alt={`Banner ${idx + 1}`}
                            />
                          </div>

                          <div>
                            <label className="text-[8px] text-slate-500 font-black uppercase">
                              Click Redirect Link
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. https://telegram.me/yourchannel"
                              value={currentLink}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSettings((prev) => {
                                  if (!prev) return null;
                                  const imgs = prev.bannerImages ? [...prev.bannerImages] : [prev.bannerImage || ""];
                                  const lnks = prev.bannerLinks ? [...prev.bannerLinks] : [prev.bannerLink || ""];
                                  
                                  while (lnks.length < imgs.length) lnks.push("");
                                  lnks[idx] = val;

                                  return {
                                    ...prev,
                                    bannerLink: idx === 0 ? val : (prev.bannerLink || ""),
                                    bannerLinks: lnks
                                  };
                                });
                              }}
                              className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold mt-1 outline-none focus:border-yellow-500/50"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Upload new */}
                    <div className="pt-2">
                      <input
                        type="file"
                        accept="image/*"
                        id="new-banner-upload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            compressAndResizeImage(file, 600, 300, 0.6, (base64) => {
                              setSettings((prev) => {
                                if (!prev) return null;
                                const imgs = prev.bannerImages ? [...prev.bannerImages] : [];
                                if (prev.bannerImage && imgs.length === 0) {
                                  imgs.push(prev.bannerImage);
                                }
                                const lnks = prev.bannerLinks ? [...prev.bannerLinks] : [];
                                if (prev.bannerLink && lnks.length === 0) {
                                  lnks.push(prev.bannerLink);
                                }

                                imgs.push(base64);
                                lnks.push("");

                                return {
                                  ...prev,
                                  bannerImage: prev.bannerImage || base64,
                                  bannerImages: imgs,
                                  bannerLinks: lnks
                                };
                              });
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor="new-banner-upload"
                        className="py-3 px-4 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500 hover:text-black transition-all rounded-xl text-center text-xs font-black uppercase cursor-pointer block flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Add New Carousel Banner Image
                      </label>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Winning Chances & House Edge */}
            <div className="bg-[#111827] p-6 rounded-3xl border border-white/5 shadow-xl space-y-6">
              <h3 className="text-xs font-black uppercase text-yellow-500 flex items-center gap-2 italic tracking-widest">
                <ShieldCheck size={18} /> RISK ENGINE CONTROLLER
              </h3>

              {/* Global Win Chance */}
              <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] text-slate-300 font-black uppercase tracking-widest">
                    Global Win Probability
                  </label>
                  <span className="text-sm font-black text-yellow-500">
                    {settings?.globalWinProbability ?? 40}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings?.globalWinProbability ?? 40}
                  onChange={(e) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            globalWinProbability: Number(e.target.value),
                          }
                        : null,
                    )
                  }
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
                <div className="flex justify-between text-[8px] text-slate-500 font-black mt-1">
                  <span>0% (FORCED LOSS)</span>
                  <span>50% (FAIR)</span>
                  <span>100% (FORCED WIN)</span>
                </div>
              </div>

              {/* Game specific win chances */}
              <div>
                <h4 className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-4">
                  Game Specific Probabilities
                </h4>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                  {GAMES_LIST.map((game) => {
                    const rawId = game.id.replace("GAME_", "").toLowerCase();
                    const currentProb =
                      settings?.gameProbabilities?.[rawId] ??
                      settings?.globalWinProbability ??
                      40;
                    return (
                      <div
                        key={game.id}
                        className="flex flex-col gap-2 bg-black/10 p-3 rounded-xl border border-white/5"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400">
                            {game.name}
                          </span>
                          <span className="text-[10px] font-black text-yellow-500">
                            {currentProb}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={currentProb}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSettings((prev) => {
                              if (!prev) return null;
                              const probs = {
                                ...(prev.gameProbabilities || {}),
                              };
                              probs[rawId] = val;
                              return { ...prev, gameProbabilities: probs };
                            });
                          }}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Deploy Button */}
            <button
              onClick={async () => {
                if (settings) {
                  await adminUpdateSettings(settings);
                  alert("Settings saved successfully!");
                }
              }}
              className="w-full py-5 bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl active:scale-95 transition-all"
            >
              DEPLOY CONFIG CORE
            </button>
          </div>
        )}
      </div>

      {showGiftModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#111] w-full max-w-sm rounded-[3rem] p-10 border border-white/10 shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black italic gold-text uppercase text-xl">
                CODE FACTORY
              </h3>
              <button
                onClick={() => setShowGiftModal(false)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X />
              </button>
            </div>
            <div className="space-y-4 mb-8 text-left">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Code String
                </label>
                <input
                  type="text"
                  placeholder="CODE STRING"
                  value={newGift.code}
                  onChange={(e) =>
                    setNewGift({
                      ...newGift,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full bg-black p-4 rounded-xl border border-white/10 font-bold uppercase tracking-widest outline-none focus:border-yellow-500 transition-all text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="AMOUNT (₹)"
                  value={newGift.amount}
                  onChange={(e) =>
                    setNewGift({ ...newGift, amount: Number(e.target.value) })
                  }
                  className="w-full bg-black p-4 rounded-xl border border-white/10 font-bold outline-none focus:border-yellow-500 transition-all text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Limit (Uses)
                </label>
                <input
                  type="number"
                  placeholder="LIMIT (USES)"
                  value={newGift.limit}
                  onChange={(e) =>
                    setNewGift({ ...newGift, limit: Number(e.target.value) })
                  }
                  className="w-full bg-black p-4 rounded-xl border border-white/10 font-bold outline-none focus:border-yellow-500 transition-all text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Min VIP Level
                </label>
                <select
                  value={newGift.minVip}
                  onChange={(e) =>
                    setNewGift({ ...newGift, minVip: Number(e.target.value) })
                  }
                  className="w-full bg-black p-4 rounded-xl border border-white/10 font-bold text-white outline-none focus:border-yellow-500 text-sm"
                >
                  <option value={0}>No VIP Requirement (LV.0+)</option>
                  <option value={1}>LV.1 Elite</option>
                  <option value={2}>LV.2 Elite</option>
                  <option value={3}>LV.3 Elite</option>
                  <option value={4}>LV.4 Elite</option>
                  <option value={5}>LV.5 Elite</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={newGift.expiryDate}
                  onChange={(e) =>
                    setNewGift({ ...newGift, expiryDate: e.target.value })
                  }
                  className="w-full bg-black p-4 rounded-xl border border-white/10 font-bold text-white outline-none focus:border-yellow-500 text-sm"
                />
              </div>
            </div>
            <button
              onClick={async () => {
                await adminCreateGiftCode({
                  code: newGift.code,
                  amount: newGift.amount,
                  limit: newGift.limit,
                  minVip: newGift.minVip,
                  usedCount: 0,
                  createdAt: Date.now(),
                  expiryDate: newGift.expiryDate
                    ? new Date(newGift.expiryDate).getTime()
                    : undefined,
                });
                setShowGiftModal(false);
                setNewGift({
                  code: "",
                  amount: 100,
                  limit: 10,
                  minVip: 0,
                  expiryDate: "",
                });
              }}
              className="w-full py-4 bg-yellow-500 text-black font-black uppercase rounded-2xl border-t border-white/40 shadow-xl active:scale-95 transition-all text-sm"
            >
              GENERATE BOUNTY
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const NavBtn = ({ label, active, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={`px-6 py-5 min-w-[110px] font-black text-[10px] uppercase tracking-widest relative transition-all ${active ? "text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/5" : "text-slate-500"}`}
  >
    {label}
    {badge > 0 && (
      <span className="absolute top-3 right-2 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] animate-pulse font-black">
        {badge}
      </span>
    )}
  </button>
);
export default AdminPanel;
