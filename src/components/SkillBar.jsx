import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';
import { calculateStats, getMaxMp } from '../mechanics/combat';
import Tooltip from './Tooltip';

/**
 * 스킬 바 컴포넌트 (Phase 103)
 * - 채팅창 위쪽에 위치하는 4슬롯 스킬 아이콘 바
 * - 장착 아이템의 useData 필드에 따라 스킬이 자동 등록됨
 * - 마우스 클릭 또는 키보드 단축키(1~4)로 사용 가능
 * - 드래그 앤 드롭으로 슬롯 위치 교환 가능
 */

// 왜 이 구조인가: 스킬은 장비에서 파생되므로, 장비 변경 시 스킬 리스트가 동적으로 갱신됨
const getAvailableSkills = (equipment) => {
    const skills = [];

    // 장비 중 useData가 있는 아이템에서 스킬 추출
    Object.entries(equipment || {}).forEach(([slot, item]) => {
        if (!item || !item.useData) return;

        skills.push({
            id: `equip_${item.id}`,
            // 스킬명: useData.skillName 우선, 없으면 아이템명
            name: item.useData.skillName || item.name,
            // 스킬 아이콘: useData.icon 우선, 없으면 아이템 이미지
            icon: item.useData.icon || item.image,
            description: item.description || '스킬 사용',
            mpCost: item.useData.mpCost || 0,
            cooldown: item.useData.durationMs || 60000, // 지속시간 = 쿨타임
            type: item.useData.type,
            sourceItem: item.id,
            sourceSlot: slot,
        });
    });

    return skills;
};

// [NEW] 배운 스킬 리스트에서 스킬 정보 가져오기
export const getLearnedSkillsData = (learnedSpells) => {
    let skills = [];
    if (!learnedSpells) return skills;
    
    if (learnedSpells.includes('shock_stun')) {
        skills.push({
            id: 'skill_shock_stun',
            name: '쇼크 스턴',
            icon: '/assets/skill_shock_stun.png', 
            description: '적을 기절시켜 2초간 행동 불능으로 만듦 (기사 전용)',
            mpCost: 100,
            cooldown: 10000, 
            type: 'shock_stun',
        });
    }
    if (learnedSpells.includes('bounce_attack')) {
        skills.push({
            id: 'skill_bounce_attack',
            name: '바운스 어택',
            icon: '/assets/skill_bounce_attack.png', 
            description: '2분간 물리 공격력 증가 (+10) (기사 전용)',
            mpCost: 150,
            cooldown: 120000, 
            type: 'bounce_attack',
        });
    }
    return skills;
};

const SkillBar = () => {
    const { state, dispatch } = useGame();
    const stats = calculateStats(state);
    const maxMp = getMaxMp(state, stats);

    // 4개의 슬롯 (null = 빈 슬롯, skillId = 등록된 스킬)
    const [slotOrder, setSlotOrder] = useState([null, null, null, null]);
    const [dragIndex, setDragIndex] = useState(null);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // 1초마다 쿨타임 UI 갱신
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 500);
        return () => clearInterval(timer);
    }, []);

    // 장비에서 사용 가능한 스킬 목록 동적 계산 (배운 스킬 포함)
    const availableSkills = [...getAvailableSkills(state.equipment), ...getLearnedSkillsData(state.learnedSpells)];

    // 장비 변경 시 슬롯에 스킬 자동 등록 (빈 슬롯에 채움)
    useEffect(() => {
        setSlotOrder(prev => {
            const newSlots = [...prev];
            // 기존 슬롯에 있지만 더 이상 사용 불가한 스킬 제거
            for (let i = 0; i < 4; i++) {
                if (newSlots[i] && !availableSkills.find(s => s.id === newSlots[i])) {
                    newSlots[i] = null;
                }
            }
            // 새로운 스킬을 빈 슬롯에 자동 등록
            availableSkills.forEach(skill => {
                if (!newSlots.includes(skill.id)) {
                    const emptyIdx = newSlots.findIndex(s => s === null);
                    if (emptyIdx !== -1) {
                        newSlots[emptyIdx] = skill.id;
                    }
                }
            });
            return newSlots;
        });
    }, [JSON.stringify(availableSkills.map(s => s.id))]);

    // 스킬 사용 핸들러
    const useSkill = useCallback((slotIndex) => {
        const skillId = slotOrder[slotIndex];
        if (!skillId) return;

        const skill = availableSkills.find(s => s.id === skillId);
        if (!skill) return;

        // MP 체크
        if (state.mp < skill.mpCost) {
            dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[스킬] MP가 부족합니다. (필요: ${skill.mpCost})` });
            return;
        }

        // 쿨타임 체크 (마법 투구 힘의 경우 magicHelmStrEndTime 활용)
        if (skill.type === 'magic_helm_str') {
            const endTime = state.combatState?.magicHelmStrEndTime || 0;
            if (endTime > Date.now()) {
                const remaining = Math.ceil((endTime - Date.now()) / 1000);
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[스킬] ${skill.name} 효과가 아직 ${remaining}초 남아있습니다.` });
                return;
            }
        }
        
        if (skill.type === 'bounce_attack') {
            const endTime = state.combatState?.bounceAttackEndTime || 0;
            if (endTime > Date.now()) {
                const remaining = Math.ceil((endTime - Date.now()) / 1000);
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[스킬] ${skill.name} 효과가 아직 ${remaining}초 남아있습니다.` });
                return;
            }
        }
        
        if (skill.type === 'shock_stun') {
            const endTime = state.combatState?.shockStunEndTime || 0;
            if (endTime > Date.now()) {
                const remaining = Math.ceil((endTime - Date.now()) / 1000);
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[스킬] ${skill.name} 효과가 아직 ${remaining}초 남아있습니다.` });
                return;
            }
        }

        // 스킬 실행 (리듀서로 디스패치)
        dispatch({ type: GAME_ACTIONS.USE_SKILL, payload: { skillType: skill.type, mpCost: skill.mpCost, skillName: skill.name } });
    }, [slotOrder, availableSkills, state.mp, state.combatState, dispatch]);

    // 키보드 단축키 (1~4) 바인딩
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const keyNum = parseInt(e.key);
            if (keyNum >= 1 && keyNum <= 4) {
                e.preventDefault();
                useSkill(keyNum - 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [useSkill]);

    // 드래그 앤 드롭으로 슬롯 위치 교환
    const handleDragStart = (e, index) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === targetIndex) return;
        
        setSlotOrder(prev => {
            const newSlots = [...prev];
            // 두 슬롯의 내용물을 교환
            const temp = newSlots[dragIndex];
            newSlots[dragIndex] = newSlots[targetIndex];
            newSlots[targetIndex] = temp;
            return newSlots;
        });
        setDragIndex(null);
    };

    // 쿨타임 잔여시간 계산
    const getCooldownRemaining = (skill) => {
        if (!skill) return 0;
        if (skill.type === 'magic_helm_str') {
            const endTime = state.combatState?.magicHelmStrEndTime || 0;
            return Math.max(0, endTime - currentTime);
        }
        if (skill.type === 'bounce_attack') {
            const endTime = state.combatState?.bounceAttackEndTime || 0;
            return Math.max(0, endTime - currentTime);
        }
        if (skill.type === 'shock_stun') {
            const endTime = state.combatState?.shockStunEndTime || 0;
            return Math.max(0, endTime - currentTime);
        }
        return 0;
    };

    return (
        <div className="flex items-center gap-1 px-2 py-1 bg-black/80 border-b border-[#333]">
            {/* 스킬 슬롯 4칸 */}
            {slotOrder.map((skillId, i) => {
                const skill = skillId ? availableSkills.find(s => s.id === skillId) : null;
                const cooldownMs = skill ? getCooldownRemaining(skill) : 0;
                const isOnCooldown = cooldownMs > 0;
                const cooldownSec = Math.ceil(cooldownMs / 1000);
                const hasEnoughMp = skill ? state.mp >= skill.mpCost : true;

                return (
                    <div
                        key={i}
                        className={`
                            relative w-10 h-10 border rounded cursor-pointer select-none
                            transition-all group overflow-hidden
                            ${skill
                                ? isOnCooldown
                                    ? 'border-yellow-700/50 bg-gray-900/80'
                                    : hasEnoughMp
                                        ? 'border-[#555] bg-[#1a1a1a] hover:border-[#d4af37] hover:shadow-[0_0_8px_rgba(212,175,55,0.4)] active:scale-95'
                                        : 'border-red-900/50 bg-gray-900/50'
                                : 'border-[#333] bg-[#0a0a0a]/50'
                            }
                        `}
                        draggable={!!skill}
                        onDragStart={(e) => handleDragStart(e, i)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, i)}
                        onClick={() => useSkill(i)}
                        title={skill ? `${skill.name} (MP: ${skill.mpCost}) [단축키: ${i + 1}]` : `빈 슬롯 [단축키: ${i + 1}]`}
                    >
                        {/* 스킬 아이콘 */}
                        {skill ? (
                            <>
                                <img
                                    src={skill.icon}
                                    alt={skill.name}
                                    className={`w-full h-full object-contain p-0.5 ${isOnCooldown ? 'opacity-40 grayscale' : !hasEnoughMp ? 'opacity-30' : ''}`}
                                    draggable="false"
                                />
                                {/* 쿨타임 오버레이 */}
                                {isOnCooldown && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                        <span className="text-yellow-400 text-[10px] font-bold font-mono">
                                            {cooldownSec}s
                                        </span>
                                    </div>
                                )}
                                {/* MP 부족 표시 */}
                                {!isOnCooldown && !hasEnoughMp && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-red-500 text-[8px] font-bold">MP!</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* 빈 칸 */
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="text-[#333] text-[10px]">—</span>
                            </div>
                        )}
                        {/* 단축키 표시 */}
                        <span className="absolute bottom-0 right-0.5 text-[8px] text-[#555] font-mono leading-none">
                            {i + 1}
                        </span>
                    </div>
                );
            })}

            {/* 스킬 없을 때 안내 */}
            {availableSkills.length === 0 && (
                <span className="text-[10px] text-[#444] ml-2 italic">스킬 장비를 장착하세요</span>
            )}
        </div>
    );
};

export default SkillBar;
