export const SPELLS = [
    {
        id: 'heal',
        name: '힐',
        mpCost: 20,
        icon: '/assets/ui/icon_heal.png',
        description: '체력을 회복합니다. (HP +50)',
        type: 'recovery',
        power: 50
    },
    {
        id: 'energy_bolt',
        name: '에너지 볼트',
        mpCost: 5,
        icon: '/assets/ui/icon_eb.png',
        description: '대상에게 마법 피해를 입힙니다. (Dmg 15)',
        type: 'damage',
        power: 15
    },
    {
        id: 'teleport',
        name: '텔레포트',
        mpCost: 10,
        icon: '/assets/ui/icon_teleport.png',
        description: '무작위 위치로 순간이동합니다.',
        type: 'utility'
    }
];
