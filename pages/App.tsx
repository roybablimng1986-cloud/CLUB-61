
// ... existing imports
      case 'GAME_WINGO': return <WinGo onBack={() => setCurrentView('HOME')} userBalance={user.balance} onResult={setGameResult} setView={setCurrentView} />;
// ... remaining render cases
