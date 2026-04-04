// 멀티 에이전트 rootReducer
// 각 sub-reducer는 담당 액션만 처리하고 나머지는 state 그대로 반환
import { sessionReducer }   from './sessionReducer';
import { combatReducer }    from './combatReducer';
import { inventoryReducer } from './inventoryReducer';
import { statReducer }      from './statReducer';
import { skillReducer }     from './skillReducer';
import { uiReducer }        from './uiReducer';
import { partyReducer }     from './partyReducer';

export const gameReducer = (state, action) => {
    let next = sessionReducer(state, action);
    next = combatReducer(next, action);
    next = inventoryReducer(next, action);
    next = statReducer(next, action);
    next = skillReducer(next, action);
    next = uiReducer(next, action);
    next = partyReducer(next, action);
    return next;
};
