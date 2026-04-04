import React from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';
import { SPELLS, ELF_SPELLS, ELF_ELEMENT_NAMES, WIZARD_SPELLS } from '../data/spells';
import { getLearnedSkillsData } from '../utils/skillUtils';

const WIZARD_ATTACK_TYPES = ['wizard_energy_bolt', 'wizard_fireball', 'wizard_call_lightning', 'wizard_eruption', 'wizard_ice_lance'];

const ELEMENT_COLORS = {
    wind: 'text-[#88ddaa]',
    earth: 'text-[#bbaa55]',
    fire: 'text-[#ff6644]',
    water: 'text-[#44aaff]',
};
const ELEMENT_BG = {
    wind: 'bg-[#88ddaa]/10 border-[#88ddaa]/30',
    earth: 'bg-[#bbaa55]/10 border-[#bbaa55]/30',
    fire: 'bg-[#ff6644]/10 border-[#ff6644]/30',
    water: 'bg-[#44aaff]/10 border-[#44aaff]/30',
};

const SpellBook = () => {
    const { state, dispatch } = useGame();
    const isElf = state.characterClass === 'elf';
    const isWizard = state.characterClass === 'wizard';

    const handleUseSpell = (spell) => {
        // eslint-disable-next-line react-hooks/purity
        const now = Date.now();
        const cooldownEnd = state.combatState?.spellCooldowns?.[spell.id] || 0;
        if (cooldownEnd > now) {
            const remaining = Math.ceil((cooldownEnd - now) / 1000);
            dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[마법] ${spell.name} 쿨타임: ${remaining}초 남음` });
            return;
        }
        dispatch({ type: GAME_ACTIONS.USE_SKILL, payload: { skillType: spell.type, mpCost: spell.mpCost, skillName: spell.name, skillId: spell.id, power: spell.power } });
    };

    // 기본 마법 (SPELLS) + 배운 스킬 (기사 클래스 스킬)
    const baseSpells = SPELLS.map(s => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        description: s.description,
        mpCost: s.mpCost,
        type: s.type,
        power: s.power,
        category: 'spell',
    }));

    const learnedSkills = getLearnedSkillsData(state.learnedSpells).map(s => ({
        ...s,
        category: 'skill',
    }));

    const allBase = [...baseSpells, ...learnedSkills];

    // 요정 마법 분류
    const learnedSpells = state.learnedSpells || [];
    const elfElement = state.elfElement;

    const learnedElfSpells = isElf
        ? ELF_SPELLS.filter(s => learnedSpells.includes(s.id)).map(s => ({ ...s, category: 'elf_learned' }))
        : [];

    // 배울 수 있는 마법 (습득 안 됨 + 레벨 충족 + 속성 조건 충족)
    const availableElfSpells = isElf
        ? ELF_SPELLS.filter(s =>
            !learnedSpells.includes(s.id) &&
            state.level >= s.requiredLevel &&
            (!s.requiredElement || s.requiredElement === elfElement)
        ).map(s => ({ ...s, category: 'elf_available' }))
        : [];

    // 조건 미충족 마법 (레벨 미달 또는 속성 미선택/불일치)
    const lockedElfSpells = isElf
        ? ELF_SPELLS.filter(s =>
            !learnedSpells.includes(s.id) &&
            (state.level < s.requiredLevel ||
             (s.requiredElement && s.requiredElement !== elfElement))
        ).map(s => ({ ...s, category: 'elf_locked' }))
        : [];

    // 마법사 마법 분류
    // 자동 해금 (레벨 조건만 충족하면 사용 가능)
    const autoWizardSpells = isWizard
        ? WIZARD_SPELLS.filter(s => !s.requiredBook && state.level >= s.requiredLevel)
            .map(s => ({ ...s, category: 'wizard_auto' }))
        : [];
    // 마법서로 습득 완료
    const learnedWizardSpells = isWizard
        ? WIZARD_SPELLS.filter(s => s.requiredBook && learnedSpells.includes(s.id))
            .map(s => ({ ...s, category: 'wizard_learned' }))
        : [];
    // 마법서 습득 가능 (레벨 충족, 미습득)
    const availableWizardSpells = isWizard
        ? WIZARD_SPELLS.filter(s => s.requiredBook && !learnedSpells.includes(s.id) && state.level >= s.requiredLevel)
            .map(s => ({ ...s, category: 'wizard_available' }))
        : [];
    // 잠김 (레벨 미달)
    const lockedWizardSpells = isWizard
        ? WIZARD_SPELLS.filter(s => s.requiredBook && !learnedSpells.includes(s.id) && state.level < s.requiredLevel)
            .map(s => ({ ...s, category: 'wizard_locked' }))
        : [];

    const handleDragStart = (e, spell) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('source', 'spellbook');
        e.dataTransfer.setData('spellId', spell.id);
    };

    const handleDefaultSpellDrop = (e) => {
        e.preventDefault();
        const spellId = e.dataTransfer.getData('spellId');
        const spell = WIZARD_SPELLS.find(s => s.id === spellId);
        if (!spell || !WIZARD_ATTACK_TYPES.includes(spell.type)) return;
        dispatch({ type: GAME_ACTIONS.SET_WIZARD_DEFAULT_SPELL, payload: spellId });
    };

    const currentDefaultSpell = isWizard && state.wizardDefaultSpell
        ? WIZARD_SPELLS.find(s => s.id === state.wizardDefaultSpell)
        : null;

    const categoryLabel = { spell: '마법', skill: '스킬', elf_learned: '요정마법' };
    const categoryColor = { spell: 'text-[#4488ff]', skill: 'text-[#ff8844]', elf_learned: 'text-[#88ffcc]' };

    const getLockReason = (spell) => {
        if (state.level < spell.requiredLevel) return `Lv.${spell.requiredLevel} 필요`;
        if (spell.requiredElement && !elfElement) return '속성 미선택';
        if (spell.requiredElement && spell.requiredElement !== elfElement) {
            return `${ELF_ELEMENT_NAMES[spell.requiredElement]} 계열 전용`;
        }
        return '조건 미충족';
    };

    return (
        <div className="flex flex-col h-full bg-[#0e0e1a] text-xs">
            <div className="px-3 py-2 border-b border-[#2a2a44] text-[#7788cc] text-[10px]">
                아이콘을 스킬 바 슬롯에 드래그하여 등록하세요
                {isElf && elfElement && (
                    <span className={`ml-2 font-bold ${ELEMENT_COLORS[elfElement] || 'text-white'}`}>
                        [{ELF_ELEMENT_NAMES[elfElement]} 계열]
                    </span>
                )}
            </div>

            {isWizard && (
                <div className="px-3 py-2 border-b border-[#2a2a44]">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#bb88ff] mb-1">기본 마법 슬롯</div>
                    <div
                        className={`flex items-center gap-2 p-2 rounded border-2 border-dashed transition-colors ${currentDefaultSpell ? 'border-[#bb88ff]/60 bg-[#bb88ff]/5' : 'border-[#333] bg-black/20'}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDefaultSpellDrop}
                    >
                        {currentDefaultSpell ? (
                            <>
                                <img src={currentDefaultSpell.icon} alt={currentDefaultSpell.name} className="w-8 h-8 object-contain flex-shrink-0" onError={(e) => { e.target.style.display='none'; }} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-white text-xs font-bold truncate">{currentDefaultSpell.name}</div>
                                    <div className="text-[#888] text-[10px]">기본 공격 시 사용 · MP -{currentDefaultSpell.mpCost}</div>
                                </div>
                                <button
                                    className="text-[#555] hover:text-[#ff4444] text-xs px-1 flex-shrink-0"
                                    onClick={() => dispatch({ type: GAME_ACTIONS.SET_WIZARD_DEFAULT_SPELL, payload: null })}
                                >×</button>
                            </>
                        ) : (
                            <div className="text-[#555] text-[10px] w-full text-center py-1">공격 마법을 드래그하여 기본 마법 설정</div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">

                {/* 기본 마법 / 스킬 */}
                {allBase.map(spell => (
                    <SpellRow key={spell.id} spell={spell}
                        draggable
                        onDragStart={(e) => handleDragStart(e, spell)}
                        onClick={() => handleUseSpell(spell)}
                        label={categoryLabel[spell.category]}
                        labelColor={categoryColor[spell.category]}
                    />
                ))}

                {/* 요정 전용 — 습득 완료 */}
                {learnedElfSpells.length > 0 && (
                    <>
                        <SectionDivider label="요정 마법 (습득)" color="text-[#88ffcc]" />
                        {learnedElfSpells.map(spell => (
                            <SpellRow key={spell.id} spell={spell}
                                draggable
                                onDragStart={(e) => handleDragStart(e, spell)}
                                onClick={() => handleUseSpell(spell)}
                                label="요정마법"
                                labelColor="text-[#88ffcc]"
                                elementBorder={spell.requiredElement}
                            />
                        ))}
                    </>
                )}

                {/* 요정 전용 — 습득 가능 (정령의 수정 필요) */}
                {availableElfSpells.length > 0 && (
                    <>
                        <SectionDivider label="습득 가능 (정령의 수정 필요)" color="text-[#aaaaaa]" />
                        {availableElfSpells.map(spell => (
                            <SpellRow key={spell.id} spell={spell}
                                draggable={false}
                                label="미습득"
                                labelColor="text-[#888]"
                                dimmed
                                subText="정령의 수정으로 습득"
                                elementBorder={spell.requiredElement}
                            />
                        ))}
                    </>
                )}

                {/* 요정 전용 — 잠김 */}
                {lockedElfSpells.length > 0 && (
                    <>
                        <SectionDivider label="잠금 (조건 미충족)" color="text-[#555]" />
                        {lockedElfSpells.map(spell => (
                            <SpellRow key={spell.id} spell={spell}
                                draggable={false}
                                label="잠금"
                                labelColor="text-[#555]"
                                dimmed
                                subText={getLockReason(spell)}
                                elementBorder={spell.requiredElement}
                            />
                        ))}
                    </>
                )}

                {/* 마법사 전용 — 자동 해금 */}
                {autoWizardSpells.length > 0 && (
                    <>
                        <SectionDivider label="마법사 마법" color="text-[#bb88ff]" />
                        {autoWizardSpells.map(spell => (
                            <SpellRow key={spell.id} spell={spell}
                                draggable
                                onDragStart={(e) => handleDragStart(e, spell)}
                                onClick={() => handleUseSpell(spell)}
                                label="마법사"
                                labelColor="text-[#bb88ff]"
                            />
                        ))}
                    </>
                )}

                {/* 마법사 전용 — 마법서 습득 완료 */}
                {learnedWizardSpells.length > 0 && (
                    <>
                        <SectionDivider label="마법사 마법 (습득)" color="text-[#bb88ff]" />
                        {learnedWizardSpells.map(spell => (
                            <SpellRow key={spell.id} spell={spell}
                                draggable
                                onDragStart={(e) => handleDragStart(e, spell)}
                                onClick={() => handleUseSpell(spell)}
                                label="마법사"
                                labelColor="text-[#bb88ff]"
                            />
                        ))}
                    </>
                )}

                {/* 마법사 전용 — 마법서 습득 가능 */}
                {availableWizardSpells.length > 0 && (
                    <>
                        <SectionDivider label="습득 가능 (마법서 필요)" color="text-[#aaaaaa]" />
                        {availableWizardSpells.map(spell => (
                            <SpellRow key={spell.id} spell={spell}
                                draggable={false}
                                label="미습득"
                                labelColor="text-[#888]"
                                dimmed
                                subText="마법서 사용으로 습득"
                            />
                        ))}
                    </>
                )}

                {/* 마법사 전용 — 잠김 */}
                {lockedWizardSpells.length > 0 && (
                    <>
                        <SectionDivider label="잠금 (레벨 미달)" color="text-[#555]" />
                        {lockedWizardSpells.map(spell => (
                            <SpellRow key={spell.id} spell={spell}
                                draggable={false}
                                label="잠금"
                                labelColor="text-[#555]"
                                dimmed
                                subText={`Lv.${spell.requiredLevel} 필요`}
                            />
                        ))}
                    </>
                )}

                {allBase.length === 0 && learnedElfSpells.length === 0 && availableElfSpells.length === 0 && lockedElfSpells.length === 0 && autoWizardSpells.length === 0 && learnedWizardSpells.length === 0 && availableWizardSpells.length === 0 && lockedWizardSpells.length === 0 && (
                    <div className="text-[#444] text-center py-8">배운 마법/스킬이 없습니다.</div>
                )}
            </div>
        </div>
    );
};

const SectionDivider = ({ label, color }) => (
    <div className={`text-[9px] font-bold uppercase tracking-widest ${color} px-1 pt-2 pb-1 border-b border-[#2a2a44]`}>
        {label}
    </div>
);

const SpellRow = ({ spell, draggable, onDragStart, onClick, label, labelColor, dimmed, subText, elementBorder }) => {
    const borderClass = elementBorder ? ELEMENT_BG[elementBorder] || '' : '';
    return (
        <div
            draggable={draggable}
            onDragStart={onDragStart}
            onClick={onClick}
            className={`flex items-center gap-2 p-2 border rounded select-none transition-colors
                ${dimmed
                    ? 'bg-black/20 border-[#1e1e2e] opacity-50 cursor-default'
                    : `bg-black/50 border-[#2a2a3a] cursor-grab active:cursor-grabbing hover:border-[#4455aa] hover:bg-[#111130] group ${borderClass}`
                }`}
        >
            <div className={`w-9 h-9 flex-shrink-0 bg-[#0a0a1a] border border-[#333] rounded flex items-center justify-center overflow-hidden ${!dimmed ? 'group-hover:border-[#4488ff]' : ''} transition-colors`}>
                <img
                    src={spell.icon}
                    alt={spell.name}
                    className={`w-8 h-8 object-contain ${dimmed ? 'grayscale' : ''}`}
                    draggable="false"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                    <span className="text-white font-bold text-xs truncate">{spell.name}</span>
                    <span className={`text-[9px] font-bold ${labelColor}`}>[{label}]</span>
                </div>
                <div className="text-[#666] text-[10px] leading-tight truncate">
                    {subText || spell.description}
                </div>
            </div>
            <div className="flex-shrink-0 text-[#4488ff] font-mono text-[10px] font-bold">
                {spell.mpCost}MP
            </div>
        </div>
    );
};

export default SpellBook;
