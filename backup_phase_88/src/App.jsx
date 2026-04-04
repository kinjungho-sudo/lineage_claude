import React from 'react';
import Game from './components/Game';
import Login from './components/Login';
import { GameProvider, useGame } from './context/GameContext';

const AppContent = () => {
  const { user } = useGame();

  // If no user is logged in, show Login screen
  if (!user) {
    return <Login />;
  }

  return <Game />;
};

import ErrorBoundary from './components/ErrorBoundary';

const App = () => {
  return (
    <ErrorBoundary>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </ErrorBoundary>
  );
};

export default App;
