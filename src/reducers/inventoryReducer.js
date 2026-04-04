// inventoryReducer.js — 인벤토리/창고/아이템 관련 액션 분리 reducer
// GameReducer.js에서 인벤토리 관련 case를 추출한 파일입니다.
// GameReducer.js 자체는 수정하지 않습니다.

import { GAME_ACTIONS } from '../constants/gameActions';
import { ITEMS } from '../data/items';
import { ITEM_TYPES } from '../constants/itemTypes';
import { ELF_ELEMENT_NAMES } from '../data/spells';
import { soundManager } from '../utils/SoundManager';
import {
    handleBuyItems,
    handleUsePotion,
    handleUseScroll,
    handleEquipItem,
    handleUnequipItem,
    handleSellItem,
    handleMoveItem,
    handleDepositWarehouse,
    handleWithdrawWarehouse,
    handleDepositSharedWarehouse,
    handleWithdrawSharedWarehouse
} from '../mechanics/inventory';

export const inventoryReducer = (state, action) => {
    switch (action.type) {

        case GAME_ACTIONS.BUY_ITEMS:
            return handleBuyItems(state, action.payload);

        case GAME_ACTIONS.USE_POTION:
            return handleUsePotion(state, action.payload);

        case GAME_ACTIONS.USE_SCROLL: {
            const { scrollUid, targetUid } = action.payload;
            return handleUseScroll(state, scrollUid, targetUid);
        }

        case GAME_ACTIONS.EQUIP_ITEM:
            return handleEquipItem(state, action.payload);

        case GAME_ACTIONS.UNEQUIP_ITEM:
            return handleUnequipItem(state, action.payload);

        case GAME_ACTIONS.SELL_ITEM: {
            const { uid, quantity } = action.payload;
            return handleSellItem(state, uid, quantity);
        }

        case GAME_ACTIONS.MOVE_ITEM: {
            const { fromIndex, toIndex } = action.payload;
            return handleMoveItem(state, fromIndex, toIndex);
        }

        case GAME_ACTIONS.DEPOSIT_WAREHOUSE: {
            return handleDepositWarehouse(state, action.payload.uid, action.payload.quantity);
        }

        case GAME_ACTIONS.WITHDRAW_WAREHOUSE: {
            return handleWithdrawWarehouse(state, action.payload.uid, action.payload.quantity);
        }

        case GAME_ACTIONS.DEPOSIT_SHARED_WAREHOUSE: {
            return handleDepositSharedWarehouse(state, action.payload.uid, action.payload.quantity);
        }

        case GAME_ACTIONS.WITHDRAW_SHARED_WAREHOUSE: {
            return handleWithdrawSharedWarehouse(state, action.payload.uid, action.payload.quantity);
        }

        case GAME_ACTIONS.APPLY_TRADE: {
            const { giveItems, giveAdena, receiveItems, receiveAdena } = action.payload;
            const giveUids = new Set(giveItems.map(i => i.uid));
            let newInventory = state.inventory.filter(i => !giveUids.has(i.uid));
            receiveItems.forEach((item, idx) => {
                const isStackable = item.type === 'scroll' || item.type === 'potion';
                if (isStackable) {
                    const existingIdx = newInventory.findIndex(i => i.id === item.id);
                    if (existingIdx >= 0) {
                        newInventory[existingIdx] = {
                            ...newInventory[existingIdx],
                            count: (newInventory[existingIdx].count || 1) + (item.count || 1),
                        };
                    } else {
                        newInventory.push({ ...item, uid: Date.now() + idx * 7 + Math.random(), isEquipped: false });
                    }
                } else {
                    newInventory.push({ ...item, uid: Date.now() + idx * 7 + Math.random(), isEquipped: false });
                }
            });
            return {
                ...state,
                inventory: newInventory,
                adena: Math.max(0, state.adena - giveAdena + receiveAdena),
                logs: [`[거래] 거래가 완료되었습니다.`, ...state.logs].slice(0, 50),
            };
        }

        // [요정/마법사] 정령의 수정 / 마법서 사용 → 마법 습득
        case GAME_ACTIONS.USE_CRYSTAL: {
            const { itemUid } = action.payload;
            const itemIdx = state.inventory.findIndex(i => i.uid === itemUid);
            if (itemIdx === -1) return state;
            const crystal = state.inventory[itemIdx];

            const requiredClass = crystal.requiredClass || 'elf';
            if (state.characterClass !== requiredClass) {
                const className = requiredClass === 'wizard' ? '마법사' : '요정';
                return { ...state, logs: [`[시스템] ${className}만 사용할 수 있는 아이템입니다.`, ...state.logs].slice(0, 50) };
            }
            if (crystal.requiredLevel && state.level < crystal.requiredLevel) {
                return { ...state, logs: [`[시스템] 레벨 ${crystal.requiredLevel} 이상에서 사용 가능합니다.`, ...state.logs].slice(0, 50) };
            }
            if (crystal.requiredElement && requiredClass === 'elf') {
                if (!state.elfElement) {
                    return { ...state, logs: [`[시스템] 먼저 레벨 50 속성을 선택해야 합니다.`, ...state.logs].slice(0, 50) };
                }
                if (state.elfElement !== crystal.requiredElement) {
                    const reqName = ELF_ELEMENT_NAMES[crystal.requiredElement] || crystal.requiredElement;
                    return { ...state, logs: [`[시스템] ${reqName} 계열 요정만 사용 가능합니다.`, ...state.logs].slice(0, 50) };
                }
            }
            const currentLearned = state.learnedSpells || [];
            if (currentLearned.includes(crystal.spellId)) {
                return { ...state, logs: ['[시스템] 이미 습득한 마법입니다.', ...state.logs].slice(0, 50) };
            }

            const newInv = [...state.inventory];
            if (newInv[itemIdx].count > 1) {
                newInv[itemIdx] = { ...newInv[itemIdx], count: newInv[itemIdx].count - 1 };
            } else {
                newInv.splice(itemIdx, 1);
            }

            soundManager.playSound('learn_skill');
            return {
                ...state,
                inventory: newInv,
                learnedSpells: [...currentLearned, crystal.spellId],
                logs: [`[마법] '${crystal.spellName}' 마법을 습득했습니다!`, ...state.logs].slice(0, 50),
                screenMessage: `✨ ${crystal.spellName} 습득!`,
            };
        }

        default:
            return state;
    }
};
