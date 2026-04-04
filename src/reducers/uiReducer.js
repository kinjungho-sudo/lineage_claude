import { GAME_ACTIONS } from '../constants/gameActions';

export const uiReducer = (state, action) => {
    switch (action.type) {
        case GAME_ACTIONS.SET_STATE:
            return { ...state, ...action.payload };

        case GAME_ACTIONS.ADD_FRIEND: {
            const friendName = action.payload;
            if (!friendName || state.friends.includes(friendName)) return state;
            return {
                ...state,
                friends: [...state.friends, friendName],
                screenMessage: `[알림] ${friendName}님을 친구로 등록했습니다.`
            };
        }

        case GAME_ACTIONS.REMOVE_FRIEND: {
            const friendName = action.payload;
            const newFriends = state.friends.filter(f => f !== friendName);
            return {
                ...state,
                friends: newFriends,
                screenMessage: `[알림] ${friendName}님을 친구 목록에서 삭제했습니다.`
            };
        }

        case GAME_ACTIONS.ADD_LOG:
            return { ...state, logs: [action.payload, ...state.logs] };

        case GAME_ACTIONS.CLEAR_SCREEN_MESSAGE:
            return { ...state, screenMessage: null };

        case GAME_ACTIONS.SET_SCREEN_MESSAGE:
            return { ...state, screenMessage: action.payload };

        case GAME_ACTIONS.CLEAR_ANNOUNCEMENTS:
            return { ...state, pendingAnnouncements: [] };

        case GAME_ACTIONS.SET_SKILL_SLOTS:
            return { ...state, skillSlots: action.payload };

        case GAME_ACTIONS.SET_AUTO_SLOT_MASK:
            return { ...state, autoSlotMask: action.payload };

        default:
            return state;
    }
};
