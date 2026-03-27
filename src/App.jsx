import React from 'react';
import Game from './components/Game';
import Login from './components/Login';
import CharacterSelect from './components/CharacterSelect'; // [NEW] 캐릭터 선택 화면
import { GameProvider, useGame } from './context/GameContext';

const AppContent = () => {
  const { user, state } = useGame();

  // 1. 로그인 안됨 -> 로그인 창
  if (!user) {
    return <Login />;
  }

  // 2. 로그인 됨 + 캐릭터 미선택 -> 캐릭터 선택창
  if (!state.isCharacterSelected) {
    return <CharacterSelect />;
  }

  // 3. 캐릭터 선택 완료 -> 게임 화면
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
