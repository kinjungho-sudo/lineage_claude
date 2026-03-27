import React, { createContext, useContext, useReducer, useState } from 'react';
import { ITEMS } from '../data/items';
import { MONSTERS, MAPS } from '../data/monsters';
import { SPELLS } from '../data/spells';
import { ITEM_TYPES, SCROLL_TYPES, ENCHANT_RESULTS } from '../constants';
import { GAME_ACTIONS, calculateStats, gameReducer, INITIAL_STATE } from './GameReducer';

// Custom Hooks
import { useGameSession } from '../hooks/useGameSession';
import { useAutoSave } from '../hooks/useAutoSave';
import { useGameLoop } from '../hooks/useGameLoop';
import { useSessionCheck } from '../hooks/useSessionCheck';
import { supabase } from '../lib/supabase'; // [FIX] 누락된 임포트 추가

const GameContext = createContext();

export const GameProvider = ({ children }) => {
    // 1. Reducer State Management
    const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);

    // 2. Session Management Hook (User, Login, Signup, Logout, Save/Load)
    const {
        user, setUser, isLoading, isSaving,
        loginUser, signupUser, logout, saveData
    } = useGameSession(dispatch, state);

    // 3. Auto-Save Hook (Re-enabled due to user request - Character Creation Save)
    useAutoSave(user, state, saveData, isLoading);

    // 4. Game Loop Hook (Auto-Hunt, Regen)
    useGameLoop(dispatch, user, state);

    // [EVENT] Save on Level Up (Removed: Handled by useAutoSave)

    // 5. Session Check Hook (Duplicate Login Prevention)
    useSessionCheck(user, logout, isLoading);

    // 6. Action Handlers (Wrappers for Dispatch)
    // 인벤토리/전투 관련 액션은 여기서 간단히 래핑하거나, 컴포넌트에서 직접 dispatch 해도 됨.
    // 기존 호환성을 위해 유지.
    const buyItems = (items) => dispatch({ type: GAME_ACTIONS.BUY_ITEMS, payload: items });
    const useScroll = (scrollUid, targetUid) => dispatch({ type: GAME_ACTIONS.USE_SCROLL, payload: { scrollUid, targetUid } });
    const usePotion = (potionUid) => dispatch({ type: GAME_ACTIONS.USE_POTION, payload: potionUid });
    const equipItem = (item) => dispatch({ type: GAME_ACTIONS.EQUIP_ITEM, payload: item });
    const unequipItem = (item) => dispatch({ type: GAME_ACTIONS.UNEQUIP_ITEM, payload: item });
    const moveItem = (fromIndex, toIndex) => dispatch({ type: GAME_ACTIONS.MOVE_ITEM, payload: { fromIndex, toIndex } });
    const teleport = (mapId) => {
        dispatch({ type: GAME_ACTIONS.TELEPORT, payload: mapId });
        // [EVENT] Save on Teleport (Removed: Handled by useAutoSave)
    };
    const sellItem = (itemUid, quantity = 1) => {
        dispatch({ type: GAME_ACTIONS.SELL_ITEM, payload: { uid: itemUid, quantity } });
    };
    // [개선] 사망 후 부활 버튼 처리
    const resurrect = () => dispatch({ type: GAME_ACTIONS.RESURRECT });
    // [스탯 시스템] 50레벨 이후 STR/CON 배분
    const allocateStat = (statType) => dispatch({ type: GAME_ACTIONS.ALLOCATE_STAT, payload: statType });

    // [개선] 캐릭터 선택창으로 나가기 전 저장 강제 수행
    const logoutToSelect = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await saveData(user.id, state);
            dispatch({ type: GAME_ACTIONS.LOGOUT_CHARACTER });
        } finally {
            setIsSaving(false);
        }
    };

    // Helper
    const calculateAc = () => calculateStats(state).ac;

    return (
        <GameContext.Provider value={{
            state, dispatch, user, setUser, loginUser, signupUser, logout, logoutToSelect, isLoading, isSaving,
            buyItems, useScroll, usePotion, equipItem, unequipItem, moveItem, calculateAc, teleport, sellItem, resurrect, allocateStat,
            saveData, MONSTERS, MAPS, ITEMS, SPELLS, ITEM_TYPES, SCROLL_TYPES, ENCHANT_RESULTS
        }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => useContext(GameContext);
