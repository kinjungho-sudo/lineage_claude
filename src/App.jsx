import React, { useState } from 'react';
import Game from './components/Game';
import Login from './components/Login';
import CharacterSelect from './components/CharacterSelect'; // [NEW] 캐릭터 선택 화면
import { GameProvider, useGame } from './context/GameContext';
import { useBgm, useSfx, loadSoundSettings } from './hooks/useSoundManager';

const AppContent = () => {
  const { user, state } = useGame();

  // 최상위에서 관리 — Login/CharacterSelect 단계에서 이미 click 핸들러 등록
  const [soundSettings, setSoundSettings] = useState(() => loadSoundSettings());
  useBgm({ ...soundSettings, bgmEnabled: soundSettings.bgmEnabled && !!user });
  useSfx(soundSettings);

  // 1. 로그인 안됨 -> 로그인 창
  if (!user) {
    return <Login />;
  }

  // 2. 로그인 됨 + 캐릭터 미선택 -> 캐릭터 선택창
  if (!state.isCharacterSelected) {
    return <CharacterSelect />;
  }

  // 3. 캐릭터 선택 완료 -> 게임 화면
  return <Game soundSettings={soundSettings} setSoundSettings={setSoundSettings} />;
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
