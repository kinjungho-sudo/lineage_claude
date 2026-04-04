// [shim] 하위 호환성 유지 — 기존 import 경로 'context/GameReducer' 모두 동작
// 실제 구현은 src/reducers/ 폴더로 이동됨
export { gameReducer }                from '../reducers';
export { GAME_ACTIONS, GAME_VERSION } from '../constants/gameActions';
export { INITIAL_STATE }              from '../constants/initialState';
export { calculateStats }             from '../mechanics/combat';
