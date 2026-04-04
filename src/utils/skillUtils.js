// 배운 스킬 리스트에서 스킬 정보 가져오기
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
