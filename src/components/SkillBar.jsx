import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';
import { soundManager } from '../utils/SoundManager';
import { SPELLS, ELF_SPELLS, WIZARD_SPELLS } from '../data/spells';
import { getLearnedSkillsData } from '../utils/skillUtils';
/**
 * 스킬 바 컴포넌트
 * - 1~4번 슬롯: 수동 발동 (클릭 또는 단축키)
 * - 5~8번 슬롯: 자동 재시전 — 쿨타임이 끝나면 자동으로 다시 발동됨
 *   (금색 빙글빙글 테두리로 시각적으로 구분)
 * - mobileGrid prop: 4×2 그리드 레이아웃으로 렌더링 (모바일 HUD용)
 */

const getAvailableSkills = (equipment) => {
    const skills = [];
    Object.entries(equipment || {}).forEach(([slot, item]) => {
        if (!item || !item.useData) return;
        skills.push({
            id: `equip_${item.id}`,
            name: item.useData.skillName || item.name,
            icon: item.useData.icon || item.image,
            description: item.description || '스킬 사용',
            mpCost: item.useData.mpCost || 0,
            cooldown: item.useData.durationMs || 60000,
            type: item.useData.type,
            sourceItem: item.id,
            sourceSlot: slot,
        });
    });
    return skills;
};

// 마법사 기본 마법 공격 타입 — wizardDefaultSpell로 설정 시 전투 루프가 매 틱 처리
// → SkillBar 자동 슬롯에 있어도 자동 발동 스킵 (이중 발동 방지)
const WIZARD_ATTACK_SPELL_TYPES = new Set([
    'wizard_energy_bolt', 'wizard_fireball', 'wizard_call_lightning',
    'wizard_eruption', 'wizard_ice_lance',
]);

// 버프 스킬 type → combatState endTime 키 매핑
// 자동 슬롯에 배치 시 cast cooldown이 아닌 버프 지속시간 기준으로 재시전 여부 판단
const BUFF_ENDTIME_MAP = {
    resist_magic:            'resistMagicEndTime',
    summon_lesser_elemental: 'summonElementalEndTime',
    wind_shot:               'windShotEndTime',
    earth_skin:              'earthSkinEndTime',
    fire_weapon:             'fireWeaponEndTime',
    natures_touch:           'naturesTouchEndTime',
    wizard_shield:           'wizardShieldEndTime',
    enchant_weapon:          'enchantWeaponEndTime',
    blessed_armor_wizard:    'blessedArmorEndTime',
    enchant_dexterity:       'enchantDexEndTime',
    enchant_mighty:          'enchantMightyEndTime',
};

// 사각형 테두리 둘레: viewBox 40×40, rect x=1 y=1 w=38 h=38 → 2*(38+38)=152
const AUTO_SLOT_CSS = `
@keyframes auto-slot-dash {
    from { stroke-dashoffset: 152; }
    to   { stroke-dashoffset: 0; }
}
@keyframes auto-slot-dash-rev {
    from { stroke-dashoffset: 0; }
    to   { stroke-dashoffset: 152; }
}
`;

const SkillBar = ({ mobileGrid = false }) => {
    const { state, dispatch } = useGame();

    const [slotOrder, setSlotOrder] = useState(() => state.skillSlots || [null, null, null, null, null, null, null, null]);
    const [dragIndex, setDragIndex] = useState(null);
    const [isDraggingFromBar, setIsDraggingFromBar] = useState(false);
    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const droppedOnSlotRef = useRef(false);

    // autoSlotMask: 슬롯별 자동 재시전 여부 (기본값: 슬롯 5~8이 auto)
    const getAutoMask = () => state.autoSlotMask || [false, false, false, false, true, true, true, true];
    // 자동 재시전 추적용 ref (auto 슬롯에 스킬이 있으면 true로 초기화 → 첫 틱에 즉시 발동)
    const wasOnCooldownRef = useRef(Array(8).fill(false).map((_, i) => getAutoMask()[i] && !!(state.skillSlots?.[i])));
    // 이중 발동 방지: 같은 스킬 재발동만 차단 (다른 스킬은 즉시 허용)
    const lastCastRef = useRef({ skillId: null, time: 0 });
    const callSkillRef = useRef(null);
    const stateRef = useRef(state);
    stateRef.current = state;
    const prevPartnerMapsRef = useRef({});

    // 500ms마다 쿨타임 UI 갱신
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 500);
        return () => clearInterval(timer);
    }, []);

    const equipmentSkills = [...getAvailableSkills(state.equipment), ...getLearnedSkillsData(state.learnedSpells)];
    const spellSkills = SPELLS.map(s => ({ id: s.id, name: s.name, icon: s.icon, description: s.description, mpCost: s.mpCost, type: s.type, power: s.power }));
    const learnedSpellIds = state.learnedSpells || [];
    const elfSpellSkills = ELF_SPELLS
        .filter(s => learnedSpellIds.includes(s.id))
        .map(s => ({ id: s.id, name: s.name, icon: s.icon, description: s.description, mpCost: s.mpCost, type: s.type }));
    // 마법사 마법: 자동 해금 (레벨 충족) + 마법서로 습득 완료
    const wizardSpellSkills = state.characterClass === 'wizard'
        ? WIZARD_SPELLS
            .filter(s => !s.requiredBook
                ? state.level >= s.requiredLevel
                : learnedSpellIds.includes(s.id))
            .map(s => ({ id: s.id, name: s.name, icon: s.icon, description: s.description, mpCost: s.mpCost, type: s.type, power: s.power }))
        : [];
    const availableSkills = [...equipmentSkills, ...spellSkills, ...elfSpellSkills, ...wizardSpellSkills];

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (state.skillSlots) setSlotOrder(state.skillSlots);
    }, [state.id]);

    useEffect(() => {
        dispatch({ type: GAME_ACTIONS.SET_SKILL_SLOTS, payload: slotOrder });
    }, [JSON.stringify(slotOrder)]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSlotOrder(prev => {
            const newSlots = [...prev];
            for (let i = 0; i < 8; i++) {
                const slotId = newSlots[i];
                if (!slotId) continue;
                const isSpell = spellSkills.find(s => s.id === slotId);
                const isElfSpell = elfSpellSkills.find(s => s.id === slotId);
                const isEquipSkill = equipmentSkills.find(s => s.id === slotId);
                const isWizardSpell = wizardSpellSkills.find(s => s.id === slotId);
                if (!isSpell && !isElfSpell && !isEquipSkill && !isWizardSpell) newSlots[i] = null;
            }
            equipmentSkills.forEach(skill => {
                if (!newSlots.includes(skill.id)) {
                    const emptyIdx = newSlots.findIndex(s => s === null);
                    if (emptyIdx !== -1) newSlots[emptyIdx] = skill.id;
                }
            });
            return newSlots;
        });
    }, [JSON.stringify(equipmentSkills.map(s => s.id))]);

    const getCooldownRemaining = useCallback((skill) => {
        if (!skill) return 0;
        if (skill.type === 'magic_helm_str') return Math.max(0, (state.combatState?.magicHelmStrEndTime || 0) - currentTime);
        if (skill.type === 'bounce_attack')  return Math.max(0, (state.combatState?.bounceAttackEndTime || 0) - currentTime);
        if (skill.type === 'shock_stun')     return Math.max(0, (state.combatState?.shockStunEndTime || 0) - currentTime);
        return Math.max(0, (state.combatState?.spellCooldowns?.[skill.id] || 0) - currentTime);
    }, [state.combatState, currentTime]);

    const callSkill = useCallback((slotIndex) => {
        const skillId = slotOrder[slotIndex];
        if (!skillId) return;
        const skill = availableSkills.find(s => s.id === skillId);
        if (!skill) return;

        // 쿨타임 체크: 아직 쿨다운 중이면 발동 차단
        if (getCooldownRemaining(skill) > 0) return;

        // 같은 스킬 이중 발동 방지 (다른 스킬은 즉시 허용)
        const nowMs = Date.now();
        if (skill.id === lastCastRef.current.skillId && nowMs - lastCastRef.current.time < 1000) return;
        lastCastRef.current = { skillId: skill.id, time: nowMs };

        // MP 체크: mpCost가 0인 스킬(에너지볼트 등)은 MP 부족해도 허용
        if (skill.mpCost > 0 && state.mp < skill.mpCost) {
            dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[스킬] MP가 부족합니다. (필요: ${skill.mpCost})` });
            return;
        }
        if (skill.type === 'magic_helm_str') {
            const end = state.combatState?.magicHelmStrEndTime || 0;
            if (end > Date.now()) {
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[스킬] ${skill.name} 효과가 아직 ${Math.ceil((end - Date.now()) / 1000)}초 남아있습니다.` });
                return;
            }
        }
        if (skill.type === 'bounce_attack') {
            const end = state.combatState?.bounceAttackEndTime || 0;
            if (end > Date.now()) {
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[스킬] ${skill.name} 효과가 아직 ${Math.ceil((end - Date.now()) / 1000)}초 남아있습니다.` });
                return;
            }
        }
        if (skill.type === 'shock_stun') {
            const end = state.combatState?.shockStunEndTime || 0;
            if (end > Date.now()) {
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[스킬] ${skill.name} 효과가 아직 ${Math.ceil((end - Date.now()) / 1000)}초 남아있습니다.` });
                return;
            }
        }
        dispatch({ type: GAME_ACTIONS.USE_SKILL, payload: { skillType: skill.type, mpCost: skill.mpCost, skillName: skill.name, skillId: skill.id, power: skill.power } });
    }, [slotOrder, availableSkills, state.mp, state.combatState, dispatch, getCooldownRemaining]);

    // callSkillRef를 항상 최신 callSkill로 유지
    useEffect(() => {
        callSkillRef.current = callSkill;
    }, [callSkill]);

    // auto 슬롯 변경 시 → wasOnCooldownRef 재동기화 (첫 발동 보장)
    useEffect(() => {
        const mask = getAutoMask();
        for (let i = 0; i < 8; i++) {
            if (mask[i] && slotOrder[i]) {
                wasOnCooldownRef.current[i] = true;
            } else if (!mask[i]) {
                wasOnCooldownRef.current[i] = false;
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(getAutoMask()), JSON.stringify(slotOrder)]);

    // ── AUTO 슬롯 자동 재시전 ───────────────────────────────────────────────
    useEffect(() => {
        // 마을에서는 자동 시전 전면 중단
        const curMap = stateRef.current.currentMapId;
        const inVillage = curMap === 'village' || curMap === 'elf_village';
        if (inVillage) return;

        const mask = getAutoMask();
        let justCastThisTick = false;
        for (let i = 0; i < 8; i++) {
            if (!mask[i]) continue; // manual 슬롯은 자동 발동 안 함
            const skillId = slotOrder[i];
            if (!skillId) {
                wasOnCooldownRef.current[i] = false;
                continue;
            }
            const skill = availableSkills.find(s => s.id === skillId);
            if (!skill) continue;

            const cooldownMs = getCooldownRemaining(skill);

            if (cooldownMs === 0 && wasOnCooldownRef.current[i]) {
                // 버프 스킬: 버프 지속 중이면 스킵 (버프 만료 시 자동 재시전)
                const buffEndKey = BUFF_ENDTIME_MAP[skill.type];
                if (buffEndKey) {
                    const buffRemaining = Math.max(0, (stateRef.current.combatState?.[buffEndKey] || 0) - Date.now());
                    if (buffRemaining > 0) continue; // wasOnCooldown 유지 → 만료 시 자동 발동
                }
                // MP 부족 시 스킵 (wasOnCooldown 유지 → 다음 틱에 재시도)
                if (skill.mpCost > 0 && stateRef.current.mp < skill.mpCost) continue;
                // 전투 중이 아닐 때 트리플 애로우 스킵
                if (skill.type === 'triple_arrow' && !stateRef.current.combatState?.isAttacking) continue;
                // 기본 마법으로 설정된 마법사 공격 마법 → 전투 루프가 매 틱 처리하므로 스킬바 자동 발동 스킵
                if (WIZARD_ATTACK_SPELL_TYPES.has(skill.type) && stateRef.current.wizardDefaultSpell === skillId) continue;
                // GCD 활성 시 스킵 (wasOnCooldown 유지 → 다음 틱에 재시도)
                if (Date.now() - (stateRef.current.combatState?.lastSpellCastTime || 0) < 1000) continue;
                // 이미 이 틱에서 시전한 경우 → wasOnCooldown 유지하고 다음 틱에 재시도
                if (justCastThisTick) continue;
                // 쿨타임이 방금 끝남 → 자동 재시전
                wasOnCooldownRef.current[i] = false;
                callSkillRef.current?.(i);
                justCastThisTick = true;
            } else if (cooldownMs > 0) {
                wasOnCooldownRef.current[i] = true;
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTime]);

    // ── 파티원이 같은 사냥터에 합류 시 버프 스킬 즉시 시전 ──────────────────
    useEffect(() => {
        const members = state.party?.members || [];
        const myMap = state.currentMapId;
        const inVillage = myMap === 'village' || myMap === 'elf_village';

        let shouldCast = false;
        members.forEach(m => {
            if (m.characterName === state.characterName) return;
            const prev = prevPartnerMapsRef.current[m.characterName];
            // 처음 보는 파티원이 이미 같은 맵에 있거나, 다른 맵에서 이동해 온 경우
            if (m.currentMapId === myMap && !inVillage && (prev === undefined || prev !== myMap)) {
                shouldCast = true;
            }
            prevPartnerMapsRef.current[m.characterName] = m.currentMapId;
        });

        if (!shouldCast) return;

        // 자동 슬롯(5~8)의 버프 스킬 강제 시전
        for (let i = 4; i < 8; i++) {
            const skillId = slotOrder[i];
            if (!skillId) continue;
            const skill = availableSkills.find(s => s.id === skillId);
            if (!skill || !BUFF_ENDTIME_MAP[skill.type]) continue;
            if (skill.mpCost > 0 && stateRef.current.mp < skill.mpCost) continue;
            dispatch({ type: GAME_ACTIONS.USE_SKILL, payload: { skillType: skill.type, mpCost: skill.mpCost, skillName: skill.name, skillId: skill.id, power: skill.power } });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify((state.party?.members || []).map(m => `${m.characterName}:${m.currentMapId}`)), state.currentMapId]);

    // 키보드 단축키 1~8 — callSkillRef 사용으로 안정적인 단일 핸들러 유지
    // callSkill이 전투 틱마다 재생성되면 리스너도 제거/재등록되어 키입력이 누락될 수 있음
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const keyNum = parseInt(e.key);
            if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 8) {
                e.preventDefault();
                callSkillRef.current?.(keyNum - 1);
                return;
            }
            const numpadMatch = e.code?.match(/^Numpad([1-8])$/);
            if (numpadMatch) {
                e.preventDefault();
                callSkillRef.current?.(parseInt(numpadMatch[1]) - 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 드래그 앤 드롭
    const handleDragStart = (e, index) => {
        setDragIndex(index);
        setIsDraggingFromBar(true);
        droppedOnSlotRef.current = false;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('source', 'skillbar');
    };
    const handleDragOver = (e) => { e.preventDefault(); };
    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        droppedOnSlotRef.current = true;
        const source = e.dataTransfer.getData('source');
        if (source === 'spellbook') {
            const spellId = e.dataTransfer.getData('spellId');
            if (spellId) {
                soundManager.playSound('skill_equip');
                setSlotOrder(prev => { const n = [...prev]; n[targetIndex] = spellId; return n; });
            }
        } else {
            if (dragIndex === null || dragIndex === targetIndex) return;
            setSlotOrder(prev => {
                const n = [...prev];
                const temp = n[dragIndex];
                n[dragIndex] = n[targetIndex];
                n[targetIndex] = temp;
                return n;
            });
        }
        setDragIndex(null);
        setIsDraggingFromBar(false);
    };
    const handleDragEnd = (index) => {
        // 슬롯 바깥에 드롭된 경우 해당 슬롯을 비움
        if (!droppedOnSlotRef.current && dragIndex === index) {
            setSlotOrder(prev => { const n = [...prev]; n[index] = null; return n; });
        }
        setDragIndex(null);
        setIsDraggingFromBar(false);
        droppedOnSlotRef.current = false;
    };

    // ── 슬롯 렌더링 헬퍼 ────────────────────────────────────────────────────
    const renderSlot = (skillId, i, fillParent = false) => {
        const skill = skillId ? availableSkills.find(s => s.id === skillId) : null;
        const cooldownMs = skill ? getCooldownRemaining(skill) : 0;
        const isOnCooldown = cooldownMs > 0;
        const cooldownSec = Math.ceil(cooldownMs / 1000);
        const hasEnoughMp = skill ? state.mp >= skill.mpCost : true;
        const isAutoSlot = getAutoMask()[i];

        return (
            <div
                className={`
                    relative border rounded cursor-pointer select-none
                    transition-all group overflow-hidden
                    ${fillParent ? 'flex-1 min-w-0 min-h-0' : 'w-9 h-9 lg:w-10 lg:h-10'}
                    ${skill
                        ? isOnCooldown
                            ? 'border-yellow-700/50 bg-gray-900/80'
                            : hasEnoughMp
                                ? isAutoSlot
                                    ? 'border-[#d4af37]/40 bg-[#1a1400] hover:border-[#d4af37] hover:shadow-[0_0_8px_rgba(212,175,55,0.5)] active:scale-95'
                                    : 'border-[#555] bg-[#1a1a1a] hover:border-[#d4af37] hover:shadow-[0_0_8px_rgba(212,175,55,0.4)] active:scale-95'
                                : 'border-red-900/50 bg-gray-900/50'
                        : isAutoSlot
                            ? 'border-[#d4af37]/20 bg-[#100e00]/50'
                            : 'border-[#333] bg-[#0a0a0a]/50'
                    }
                `}
                draggable={!!skill}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={() => handleDragEnd(i)}
                onClick={() => callSkill(i)}
                title={skill
                    ? `${skill.name} (MP: ${skill.mpCost}) [단축키: ${i + 1}]${isAutoSlot && skill.type !== 'triple_arrow' ? '\n⚙ 쿨타임 종료 시 자동 재시전' : isAutoSlot ? '\n수동 전용 (자동 재시전 없음)' : ''}`
                    : `빈 슬롯 [단축키: ${i + 1}]${isAutoSlot ? '\n⚙ 자동 재시전 슬롯' : ''}`
                }
            >
                {/* 드래그 중: 바깥 드롭 삭제 힌트 오버레이 */}
                {isDraggingFromBar && dragIndex === i && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-900/60 border border-red-500 rounded pointer-events-none">
                        <span className="text-red-300 text-[8px] font-bold leading-tight text-center px-0.5">바깥<br/>제거</span>
                    </div>
                )}

                {/* 스킬 아이콘 */}
                {skill ? (
                    <>
                        <img
                            src={skill.icon}
                            alt={skill.name}
                            className={`w-full h-full object-contain p-0.5 ${isOnCooldown ? 'opacity-40 grayscale' : !hasEnoughMp ? 'opacity-30' : ''}`}
                            draggable="false"
                        />
                        {isOnCooldown && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <span className="text-yellow-400 text-[10px] font-bold font-mono">
                                    {cooldownSec}s
                                </span>
                            </div>
                        )}
                        {!isOnCooldown && !hasEnoughMp && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-red-500 text-[8px] font-bold">MP!</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        {isAutoSlot
                            ? <span className="text-[#d4af37]/30 text-[14px]">⟳</span>
                            : <span className="text-[#333] text-[10px]">—</span>
                        }
                    </div>
                )}

                {/* 단축키 표시 */}
                <span className={`absolute bottom-0 right-0.5 text-[8px] font-mono leading-none ${isAutoSlot ? 'text-[#d4af37]/50' : 'text-[#555]'}`}>
                    {i + 1}
                </span>

                {/* 5~8번 슬롯: 금색 빙글빙글 테두리 */}
                {isAutoSlot && (
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox="0 0 40 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ zIndex: 10 }}
                    >
                        {/* 메인 골드 대시 — 시계 방향 */}
                        <rect
                            x="1" y="1" width="38" height="38" rx="3"
                            stroke="#d4af37"
                            strokeWidth="2"
                            strokeDasharray="22 130"
                            strokeLinecap="round"
                            style={{ animation: 'auto-slot-dash 2.4s linear infinite', opacity: 0.9 }}
                        />
                        {/* 보조 밝은 하이라이트 — 반시계 방향 */}
                        <rect
                            x="1" y="1" width="38" height="38" rx="3"
                            stroke="#f5e088"
                            strokeWidth="1"
                            strokeDasharray="10 142"
                            strokeLinecap="round"
                            style={{ animation: 'auto-slot-dash-rev 3.2s linear infinite', opacity: 0.5 }}
                        />
                    </svg>
                )}
            </div>
        );
    };

    // ── 모바일 4×2 그리드 레이아웃 ─────────────────────────────────────────
    if (mobileGrid) {
        return (
            <>
                <style>{AUTO_SLOT_CSS}</style>
                <div className="flex flex-col h-full bg-black/80 p-0.5 gap-0.5">
                    {/* Row 1: 슬롯 1~4 (수동) */}
                    <div className="flex flex-1 gap-0.5">
                        {slotOrder.slice(0, 4).map((skillId, i) => (
                            <React.Fragment key={i}>{renderSlot(skillId, i, true)}</React.Fragment>
                        ))}
                    </div>
                    {/* Row 2: 슬롯 5~8 (AUTO) */}
                    <div className="flex flex-1 gap-0.5 border-t border-[#d4af37]/20 pt-0.5">
                        {slotOrder.slice(4, 8).map((skillId, i) => (
                            <React.Fragment key={i + 4}>{renderSlot(skillId, i + 4, true)}</React.Fragment>
                        ))}
                    </div>
                </div>
            </>
        );
    }

    // ── 기본 가로 레이아웃 (데스크탑 / 기존) ───────────────────────────────
    return (
        <>
            <style>{AUTO_SLOT_CSS}</style>
            <div className="flex items-center gap-0.5 lg:gap-1 px-1 lg:px-2 py-1 bg-black/80 border-b border-[#333]">
                {slotOrder.map((skillId, i) => (
                    <React.Fragment key={i}>
                        {/* 1~4 / 5~8 구분선 */}
                        {i === 4 && (
                            <div className="flex flex-col items-center mx-0.5 self-stretch justify-center gap-0.5">
                                <div className="w-[1px] flex-1 bg-gradient-to-b from-transparent via-[#d4af37]/60 to-transparent" />
                                <span className="text-[7px] text-[#d4af37]/70 font-bold leading-none" style={{ writingMode: 'vertical-rl' }}>AUTO</span>
                                <div className="w-[1px] flex-1 bg-gradient-to-b from-transparent via-[#d4af37]/60 to-transparent" />
                            </div>
                        )}
                        {renderSlot(skillId, i, false)}
                    </React.Fragment>
                ))}

                <span className="hidden lg:inline text-[10px] text-[#333] ml-1 italic">SPELL창에서 드래그</span>
            </div>
        </>
    );
};

export default SkillBar;
