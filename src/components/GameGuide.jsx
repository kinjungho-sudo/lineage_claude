import React, { useState } from 'react';

const TABS = [
    { id: 'intro',    label: '🏰 소개' },
    { id: 'class',    label: '⚔️ 직업' },
    { id: 'stats',    label: '📊 스탯' },
    { id: 'combat',   label: '⚡ 전투' },
    { id: 'maps',     label: '🗺️ 지도' },
    { id: 'item',     label: '🎒 아이템' },
    { id: 'enchant',  label: '✨ 인챈트' },
    { id: 'magic',    label: '🔮 마법' },
    { id: 'party',    label: '👥 파티' },
    { id: 'tip',      label: '💡 팁' },
];

const Section = ({ title, children }) => (
    <div className="mb-5">
        <div className="text-[#d4af37] font-bold text-sm border-b border-[#d4af37]/30 pb-1 mb-3 tracking-wide uppercase">
            {title}
        </div>
        <div className="text-[#bbb] text-xs leading-relaxed space-y-1.5">
            {children}
        </div>
    </div>
);

const Row = ({ label, value, highlight }) => (
    <div className="flex gap-2 py-1 border-b border-[#222]">
        <span className="text-[#a59c77] w-24 shrink-0 font-bold">{label}</span>
        <span className={highlight ? 'text-green-400 font-bold' : 'text-[#ccc]'}>{value}</span>
    </div>
);

const Tag = ({ children, color = 'yellow' }) => {
    const colors = {
        yellow: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
        blue:   'bg-blue-900/50 text-blue-300 border-blue-700/50',
        green:  'bg-green-900/50 text-green-300 border-green-700/50',
        red:    'bg-red-900/50 text-red-300 border-red-700/50',
        purple: 'bg-purple-900/50 text-purple-300 border-purple-700/50',
    };
    return (
        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${colors[color]}`}>
            {children}
        </span>
    );
};

const Alert = ({ children, color = 'yellow' }) => {
    const colors = {
        yellow: 'bg-yellow-900/20 border-yellow-600/40 text-yellow-200',
        blue:   'bg-blue-900/20 border-blue-600/40 text-blue-200',
        green:  'bg-green-900/20 border-green-600/40 text-green-200',
        red:    'bg-red-900/20 border-red-600/40 text-red-200',
    };
    return (
        <div className={`border rounded p-2.5 text-xs leading-relaxed ${colors[color]}`}>
            {children}
        </div>
    );
};

// ────────────────────────────────────────────
// 탭별 콘텐츠
// ────────────────────────────────────────────

const TabIntro = () => (
    <div>
        <Section title="게임 소개">
            <Alert color="blue">
                <strong>리니지 클래식</strong>은 1998년 원작 리니지를 재현한 브라우저 기반 MMORPG입니다.<br />
                자동 사냥, 장비 강화, 마법 습득을 통해 캐릭터를 성장시키고,<br />
                최강의 던전에 도전하세요!
            </Alert>
        </Section>

        <Section title="기본 플로우">
            <div className="space-y-2">
                {[
                    { step: '1', title: '로그인 & 캐릭터 선택', desc: '기사 또는 요정 직업을 선택합니다.' },
                    { step: '2', title: '마을에서 준비', desc: '상점에서 무기/방어구를 구매하고, 물약을 준비합니다.' },
                    { step: '3', title: '사냥터 이동', desc: '레벨에 맞는 사냥터로 이동합니다.' },
                    { step: '4', title: '자동 사냥', desc: '몬스터를 클릭하거나 화면을 탭하면 자동으로 전투가 시작됩니다.' },
                    { step: '5', title: '아이템 강화', desc: '드랍된 주문서로 장비를 강화해 더 강해집니다.' },
                    { step: '6', title: '더 깊은 던전', desc: '레벨이 높아질수록 더 강한 몬스터가 있는 던전에 도전합니다.' },
                ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 flex items-center justify-center text-[#d4af37] text-[10px] font-bold shrink-0 mt-0.5">
                            {step}
                        </div>
                        <div>
                            <span className="text-white font-bold text-xs">{title}</span>
                            <p className="text-[#888] text-xs mt-0.5">{desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Section>

        <Section title="화면 구성">
            <Row label="왼쪽 상단" value="게임 필드 — 캐릭터와 몬스터가 표시됩니다" />
            <Row label="하단 왼쪽" value="HP / MP / EXP 바 — 현재 상태를 확인합니다" />
            <Row label="하단 중앙" value="전투 로그 — 데미지, 드랍 내역이 기록됩니다" />
            <Row label="하단 오른쪽" value="메뉴 버튼 — 창고·상점·마법·설정 등을 엽니다" />
            <Row label="스킬 바" value="등록한 마법/스킬을 빠르게 사용합니다" />
        </Section>

        <Section title="저장">
            <Alert color="green">
                게임은 <strong>30초마다 자동 저장</strong>됩니다. 우상단의 저장 표시를 확인하세요.<br />
                마을 복귀·사망 시에도 자동 저장됩니다.
            </Alert>
        </Section>
    </div>
);

const TabClass = () => (
    <div>
        <Section title="직업 선택">
            <Alert color="yellow">직업은 캐릭터 생성 시 선택하며, 이후 변경할 수 없습니다.</Alert>
        </Section>

        <Section title="⚔️ 기사 (Knight)">
            <div className="bg-[#1a1a1a] rounded p-3 space-y-1.5 border border-[#333]">
                <div className="text-white font-bold mb-2">든든한 탱커형 전사</div>
                <Row label="주 스탯" value="STR (공격력) / CON (HP)" />
                <Row label="무기" value="한손검, 양손검, 드워프 검" />
                <Row label="특징" value="높은 HP · 강력한 물리 공격" />
                <Row label="명중 기본값" value="레벨 + DEX + 무기강화×2" />
                <Row label="추천 플레이" value="STR에 집중 투자 → 강력한 단타 공격" />
                <div className="mt-2 pt-2 border-t border-[#333]">
                    <div className="text-[#a59c77] text-[10px] font-bold mb-1">고유 스킬</div>
                    <div className="text-[#ccc] text-xs">
                        <span className="text-yellow-400">▪ 바이탈리티 포션</span> — 최대 HP 대폭 회복<br />
                        <span className="text-orange-400">▪ 강화 주문서</span> — 무기/방어구 인챈트 강화
                    </div>
                </div>
            </div>
        </Section>

        <Section title="🌿 요정 (Elf)">
            <div className="bg-[#1a1a1a] rounded p-3 space-y-1.5 border border-[#333]">
                <div className="text-white font-bold mb-2">빠른 마법사형 원거리 딜러</div>
                <Row label="주 스탯" value="DEX (명중/회피) / INT·WIS (마법)" />
                <Row label="무기" value="활, 장궁, 사하의 활 등" />
                <Row label="특징" value="높은 명중률 · 다양한 마법 · 원거리 공격" />
                <Row label="명중 기본값" value="레벨 + DEX + 무기강화×2 + 20" />
                <Row label="추천 플레이" value="정령 속성 선택 후 전용 마법 활용" />
                <div className="mt-2 pt-2 border-t border-[#333]">
                    <div className="text-[#a59c77] text-[10px] font-bold mb-1">전용 마법 (정령의 수정으로 습득)</div>
                    <div className="text-[#ccc] text-xs space-y-0.5">
                        <div><span className="text-blue-300">▪ 레지스트 매직</span> — MR +10 버프</div>
                        <div><span className="text-sky-300">▪ 트리플 애로우</span> — 3연속 화살 공격</div>
                        <div><span className="text-cyan-300">▪ 서먼 레서 엘리멘탈</span> — 정령 소환 (공격력 +5)</div>
                        <div><span className="text-green-300">▪ 윈드 샷</span> — 명중/회피 +5 버프 (바람)</div>
                        <div><span className="text-lime-300">▪ 어스 스킨</span> — AC -4 버프 (땅)</div>
                        <div><span className="text-orange-300">▪ 파이어 웨폰</span> — 공격력 +3 버프 (불)</div>
                        <div><span className="text-emerald-300">▪ 네이쳐스 터치</span> — HP +50 / 회복 +10 버프 (물)</div>
                    </div>
                </div>
            </div>
        </Section>

        <Section title="직업별 장비 제한">
            <Alert color="yellow">
                일부 무기와 방어구는 특정 직업만 착용할 수 있습니다.<br />
                아이템 툴팁에서 착용 가능 직업을 확인하세요.
            </Alert>
        </Section>
    </div>
);

const TabStats = () => (
    <div>
        <Section title="기본 능력치">
            {[
                { stat: 'STR', color: 'text-red-400',    desc: '힘 — 물리 공격력 증가. STR 5당 공격력 +1 (기사에게 중요)' },
                { stat: 'DEX', color: 'text-green-400',  desc: '민첩 — 명중률·회피율 증가. 요정의 공격력에도 영향' },
                { stat: 'CON', color: 'text-yellow-400', desc: '체력 — 최대 HP 증가. CON이 높을수록 레벨업 시 HP 많이 증가' },
                { stat: 'INT', color: 'text-blue-400',   desc: '지능 — 마법 저항(MR) 증가. 마법 피해 감소에 기여' },
                { stat: 'WIS', color: 'text-purple-400', desc: '지혜 — MP 회복 속도 증가. 마법을 자주 쓰는 요정에게 중요' },
            ].map(({ stat, color, desc }) => (
                <div key={stat} className="flex gap-2 py-1.5 border-b border-[#222]">
                    <span className={`${color} font-bold w-10 shrink-0`}>{stat}</span>
                    <span className="text-[#ccc]">{desc}</span>
                </div>
            ))}
        </Section>

        <Section title="전투 능력치">
            {[
                { stat: 'AC',   color: 'text-green-400',  desc: '방어력 — 숫자가 낮을수록(음수에 가까울수록) 방어가 강합니다. 장비와 버프로 낮출 수 있습니다.' },
                { stat: 'MR',   color: 'text-blue-400',   desc: '마법 저항 — 마법 피해를 일정 비율 감소시킵니다. WIS·INT와 방어구로 올릴 수 있습니다.' },
                { stat: '명중', color: 'text-orange-400', desc: '명중률 — 적에게 공격이 적중할 확률 지표. 100 이상이면 항상 명중 + 초과분은 공속 보너스로 변환됩니다.' },
                { stat: '회피', color: 'text-sky-400',    desc: '회피율 — 적의 공격을 회피할 확률 지표. 레벨 + DEX + (10 - AC)로 결정됩니다.' },
            ].map(({ stat, color, desc }) => (
                <div key={stat} className="flex gap-2 py-1.5 border-b border-[#222]">
                    <span className={`${color} font-bold w-10 shrink-0`}>{stat}</span>
                    <span className="text-[#ccc]">{desc}</span>
                </div>
            ))}
        </Section>

        <Section title="명중률 시스템 (중요!)">
            <Alert color="yellow">
                <strong>명중 100 미만</strong> — 상태창에 <span className="text-orange-400">74/100</span> 형식으로 표시.<br />
                장비·강화·DEX를 높여 100을 목표로 성장하세요!<br /><br />
                <strong>명중 100 이상</strong> — <span className="text-green-400">녹색</span>으로 바뀌며 100% 명중 보장.<br />
                초과 명중 5마다 공격 속도가 25ms 빨라집니다 (최대 700ms 인터벌까지).
            </Alert>
        </Section>

        <Section title="레벨 50 이후 스탯 포인트">
            <Alert color="blue">
                레벨 50을 초과하면 레벨당 <strong>스탯 포인트 1점</strong>을 획득합니다.<br />
                상태창 하단에서 STR / DEX / CON / INT / WIS에 자유롭게 투자할 수 있습니다.
            </Alert>
        </Section>
    </div>
);

const TabCombat = () => (
    <div>
        <Section title="자동 사냥">
            <Alert color="blue">
                몬스터를 <strong>클릭(탭)</strong>하면 자동 전투가 시작됩니다.<br />
                몬스터를 처치하면 경험치·아데나·아이템을 획득하고 다음 몬스터로 자동 이동합니다.
            </Alert>
        </Section>

        <Section title="전투 흐름">
            <div className="space-y-1">
                {[
                    '1. 몬스터 클릭 → 이동 후 공격 시작',
                    '2. 매 1.5초(기본)마다 자동으로 공격',
                    '3. 명중 판정 → 명중 시 데미지 계산',
                    '4. 몬스터 사망 → 경험치·아데나·아이템 획득',
                    '5. 다음 몬스터 자동 탐색 후 반복',
                ].map(t => <div key={t} className="text-[#ccc]">▪ {t}</div>)}
            </div>
        </Section>

        <Section title="공격 속도">
            <Row label="기본 인터벌" value="1,500ms (1.5초마다 공격)" />
            <Row label="하스트 물약" value="÷1.6 속도 증가" />
            <Row label="바이탈리티" value="÷1.5 속도 증가 (기사)" />
            <Row label="명중 100 초과" value="초과 5마다 -25ms (최소 700ms)" highlight />
        </Section>

        <Section title="데미지 계산">
            <Row label="기사 보너스" value="STR ÷ 3 + 무기강화 + 레벨 ÷ 10" />
            <Row label="요정 보너스" value="DEX × 0.2 + 무기강화 + 레벨 ÷ 12" />
            <Row label="무기강화 ≥ 7" value="30% 확률로 추가 랜덤 대미지 발생" />
        </Section>

        <Section title="사망 & 부활">
            <Alert color="red">
                HP가 0이 되면 <strong>사망</strong>합니다.<br />
                <strong>일반 사냥</strong>: 5초 후 마을에서 자동 부활합니다.<br />
                <strong>파티 사냥 중 사망</strong>: [마을 부활] 또는 [재참여] 버튼으로 복귀 방법을 선택합니다.<br />
                사망 시 경험치가 소폭 감소합니다.
            </Alert>
        </Section>

        <Section title="버프 아이콘 표시">
            <Alert color="blue">
                활성 버프는 게임 화면 상단에 아이콘으로 표시됩니다.<br />
                <strong>마우스 오버(터치)</strong>하면 남은 시간을 MM:SS 형식으로 확인할 수 있습니다.<br />
                <strong>30초 미만</strong> 시 아이콘이 깜빡이며 만료 임박을 알립니다.
            </Alert>
            <div className="mt-2 space-y-1">
                <Row label="기본 상태" value="아이콘만 표시 (시간 숨김)" />
                <Row label="마우스 오버" value="남은 시간 MM:SS 표시" />
                <Row label="30초 미만" value="아이콘 깜빡임 — 만료 임박 경고" highlight />
            </div>
        </Section>

        <Section title="몬스터 마법 공격">
            <div className="space-y-1">
                <div>일부 몬스터는 <Tag color="purple">마법 공격</Tag>을 사용합니다.</div>
                <div>마법 공격은 AC로 방어되지 않으며, MR(마법 저항)로 피해를 줄입니다.</div>
                <div>바포메트 등 보스는 강력한 마법을 사용하므로 MR을 충분히 확보하세요.</div>
            </div>
        </Section>
    </div>
);

const TabMaps = () => (
    <div>
        <Section title="사냥터 목록 (권장 레벨 순)">
            {[
                { name: '🏝️ 말하는 섬 (Talking Island)', level: '1~15', monsters: '좀비, 도마뱀, 오크', drop: '빨간 물약, 기본 무기', tip: '초보자 전용 사냥터. 레벨 15까지 여기서 기초를 닦으세요.' },
                { name: '🏰 글루디오 던전', level: '15~30', monsters: '스켈레톤, 셀로브, 버그베어', drop: '주문서, 체인 갑옷', tip: '중급 장비가 드랍됩니다. 첫 던전 경험을 쌓기 좋습니다.' },
                { name: '🌲 오크 숲 (Orc Forest)', level: '30~45', monsters: '오크 전사, 오크 주술사', drop: '실버 검, 마법 방어 장비, 수호의 망토', tip: '아데나 수입이 늘어납니다. 마법 방어 아이템을 노려보세요.' },
                { name: '🏜️ 사막 (Desert)', level: '40~55', monsters: '거대 병정 개미, 스콜피온, 흑기사', drop: '고급 무기, 요정 전용 아이템', tip: '강력한 몬스터가 많습니다. 충분한 물약을 준비하세요.' },
                { name: '🐉 용의 계곡 (Dragon Valley)', level: '50~65', monsters: '드래곤, 드래곤 나이트', drop: '장궁, 사하의 활, 정령의 수정', tip: '요정에게 필수! 정령의 수정을 획득해 마법을 습득하세요.' },
                { name: '🌊 수중 던전 (Water Dungeon)', level: '50~70', monsters: '라미아, 머맨, 상어, 비홀더', drop: '수호의 목걸이, 수호의 반지 (매우 희귀)', tip: '마법 공격 몬스터가 많으므로 MR을 50% 이상 확보하세요.' },
                { name: '🔥 지옥 (Hell)', level: '60~75', monsters: '고레벨 악마 계열', drop: '고급 장신구, 정령의 수정', tip: '최고 난이도 일반 사냥터. 완전한 장비를 갖춘 뒤 도전하세요.' },
                { name: '👹 바포메트의 방', level: '70+', monsters: '바포메트 (보스)', drop: '최고급 아이템 (확정 드랍)', tip: '10분마다 리젠. 강화 주문서로 무기를 +8 이상 강화한 뒤 도전 권장.' },
            ].map(({ name, level, monsters, drop, tip }) => (
                <div key={name} className="bg-[#1a1a1a] rounded p-3 mb-2 border border-[#2a2a2a]">
                    <div className="text-white font-bold text-xs mb-1">{name} <Tag>{level}레벨</Tag></div>
                    <div className="text-[#888] text-[10px] space-y-0.5">
                        <div><span className="text-[#a59c77]">몬스터</span>: {monsters}</div>
                        <div><span className="text-green-400">주요 드랍</span>: {drop}</div>
                        <div><span className="text-yellow-400">팁</span>: {tip}</div>
                    </div>
                </div>
            ))}
        </Section>

        <Section title="마을 (Village)">
            <Alert color="green">
                마을에서는 <strong>상점</strong>과 <strong>창고</strong>를 이용할 수 있습니다.<br />
                사망 시 마을에서 부활합니다. 기사와 요정은 각각 전용 마을이 있습니다.
            </Alert>
        </Section>
    </div>
);

const TabItem = () => (
    <div>
        <Section title="장비 슬롯">
            <div className="grid grid-cols-2 gap-1">
                {[
                    ['투구', '방어력 + 특수 효과'],
                    ['갑옷', '방어력 핵심 슬롯'],
                    ['티셔츠', '경량 방어구'],
                    ['무기', '공격력 결정'],
                    ['방패', '방어력 보조'],
                    ['장갑', '방어력 보조'],
                    ['부츠', '방어력 보조'],
                    ['망토', '방어력 + MR'],
                    ['벨트', '스탯 보조'],
                    ['목걸이', '스탯/MR 보조'],
                    ['반지(좌)', '스탯/MR 보조'],
                    ['반지(우)', '추가 반지 슬롯'],
                ].map(([slot, desc]) => (
                    <div key={slot} className="flex gap-1.5 py-1 border-b border-[#1e1e1e]">
                        <span className="text-[#a59c77] text-[10px] w-16 shrink-0">{slot}</span>
                        <span className="text-[#888] text-[10px]">{desc}</span>
                    </div>
                ))}
            </div>
        </Section>

        <Section title="아이템 종류">
            {[
                { tag: '무기', color: 'red',    desc: '공격력을 결정하는 핵심 아이템. 강화 효과가 매우 큽니다.' },
                { tag: '방어구', color: 'blue', desc: 'AC를 낮춰 받는 피해를 감소시킵니다.' },
                { tag: '장신구', color: 'purple', desc: '목걸이·반지·벨트. 특수 스탯 보너스를 제공합니다.' },
                { tag: '물약', color: 'green',  desc: '빨간 물약(HP 회복), 주황 물약(HP 대회복), 파란 물약(MP +20 즉시 회복 · 파란 빛 이펙트), 마나 회복 물약(초당 MP +5 / 5분 지속 버프).' },
                { tag: '주문서', color: 'yellow', desc: '장비 강화에 사용. 제로스(안전) / 다이(모험) 두 종류가 있습니다.' },
                { tag: '정령의 수정', color: 'blue', desc: '요정 전용. 사용 시 특정 마법을 영구 습득합니다.' },
            ].map(({ tag, color, desc }) => (
                <div key={tag} className="flex gap-2 py-1.5 border-b border-[#222] items-start">
                    <Tag color={color}>{tag}</Tag>
                    <span className="text-[#ccc] text-xs">{desc}</span>
                </div>
            ))}
        </Section>

        <Section title="상점 이용">
            <Alert color="blue">
                <strong>마을에서만</strong> 상점을 이용할 수 있습니다.<br />
                기본 장비·물약·일부 주문서를 구매할 수 있으며,<br />
                고급 장비는 몬스터 드랍으로만 획득 가능합니다.
            </Alert>
        </Section>

        <Section title="창고 이용">
            <Alert color="green">
                창고는 <strong>마을에서만</strong> 이용할 수 있습니다.<br />
                인벤토리가 가득 찰 경우 창고에 아이템을 보관하세요.<br />
                창고 아이템은 같은 계정의 모든 캐릭터가 공유합니다.
            </Alert>
        </Section>
    </div>
);

const TabEnchant = () => (
    <div>
        <Section title="인챈트란?">
            <Alert color="blue">
                주문서(두루마리)를 사용해 장비를 강화하는 시스템입니다.<br />
                강화 수치(+1, +2 … )가 높을수록 장비 성능이 크게 향상됩니다.
            </Alert>
        </Section>

        <Section title="주문서 종류">
            <Row label="제로스의 주문서" value="안전 강화 한계까지 실패해도 파괴되지 않음" highlight />
            <Row label="다이의 주문서" value="안전 강화 한계 초과 가능, 실패 시 아이템 파괴 위험" />
        </Section>

        <Section title="안전 강화 한계">
            <div className="space-y-1.5">
                <div className="text-[#ccc]">제로스 주문서로는 안전 한계까지만 강화되며, 초과 시 다이 주문서 필요합니다.</div>
                <Row label="일반 무기" value="+3까지 안전" />
                <Row label="일반 방어구" value="+4까지 안전" />
                <Row label="요정족 방어구" value="+6까지 안전 (특별 제작)" highlight />
                <Row label="안전 초과 강화" value="다이 주문서 필요 — 실패 시 아이템 파괴!" />
            </div>
        </Section>

        <Section title="강화 효과">
            <Row label="+1 ~ +5" value="무기: 공격력 증가 / 방어구: 방어력 증가" />
            <Row label="+6" value="방어구: [속보] 전체 공지 — 일반 방어구 기준" />
            <Row label="+7 이상" value="요정족 방어구 [속보] 공지 기준" />
            <Row label="+7 이상" value="30% 확률로 추가 랜덤 대미지 발생 (무기)" highlight />
            <Row label="+8 이상" value="무기: [속보] 전체 공지" />
        </Section>

        <Section title="속보 공지 기준">
            <Alert color="yellow">
                특정 수치 이상 강화에 성공하면 <strong>[속보]</strong> 메시지가<br />
                모든 접속자에게 채팅창을 통해 공지됩니다!
            </Alert>
        </Section>
    </div>
);

const TabMagic = () => (
    <div>
        <Section title="기사 스킬">
            <div className="space-y-2">
                {[
                    { name: '바이탈리티 포션', mp: 'MP 소모 없음 (물약 사용)', effect: '5분간 공격 속도 ÷1.5 증가, 대량 HP 회복', how: '초록색 물약 자동 사용' },
                    { name: '마법 투구 (힘)', mp: '자동 발동', effect: '일정 시간 STR 보너스', how: '마법 방어 투구 착용 시 발동' },
                ].map(({ name, mp, effect, how }) => (
                    <div key={name} className="bg-[#1a1a1a] p-3 rounded border border-[#333]">
                        <div className="text-yellow-300 font-bold text-xs mb-1">{name}</div>
                        <div className="text-[#888] text-[10px] space-y-0.5">
                            <div><span className="text-[#a59c77]">소모</span>: {mp}</div>
                            <div><span className="text-[#a59c77]">효과</span>: {effect}</div>
                            <div><span className="text-[#a59c77]">발동</span>: {how}</div>
                        </div>
                    </div>
                ))}
            </div>
        </Section>

        <Section title="요정 마법 시스템">
            <Alert color="blue">
                요정은 <strong>정령의 수정</strong>을 사용해 마법을 영구 습득합니다.<br />
                습득한 마법은 마법서(W키)와 스킬 바에 등록해 사용할 수 있습니다.
            </Alert>
        </Section>

        <Section title="요정 전용 마법">
            <div className="space-y-2">
                {[
                    { name: '레지스트 매직', level: 'Lv.20', element: '공통', effect: 'MR +10, 지속 5분', mp: 'MP 30' },
                    { name: '트리플 애로우', level: 'Lv.40', element: '공통', effect: '화살 3발 동시 발사 (강력한 즉발 공격)', mp: 'MP 15' },
                    { name: '서먼 레서 엘리멘탈', level: 'Lv.45', element: '공통', effect: '공격력 +5 버프 (정령 소환), 지속 5분', mp: 'MP 40' },
                    { name: '윈드 샷', level: 'Lv.50', element: '🌿 바람', effect: '명중 +5 / 회피 +5 버프, 지속 5분', mp: 'MP 20' },
                    { name: '어스 스킨', level: 'Lv.50', element: '🪨 땅', effect: 'AC -4 버프, 지속 5분', mp: 'MP 20' },
                    { name: '파이어 웨폰', level: 'Lv.50', element: '🔥 불', effect: '공격력 +3 버프, 지속 5분', mp: 'MP 20' },
                    { name: '네이쳐스 터치', level: 'Lv.50', element: '💧 물', effect: 'HP +50 / 회복량 +10 버프, 지속 5분', mp: 'MP 20' },
                ].map(({ name, level, element, effect, mp }) => (
                    <div key={name} className="bg-[#1a1a1a] p-2.5 rounded border border-[#333] flex gap-3">
                        <div className="flex-1">
                            <div className="text-blue-300 font-bold text-xs">{name}</div>
                            <div className="text-[#888] text-[10px] mt-0.5">{effect}</div>
                        </div>
                        <div className="text-right text-[10px] space-y-0.5 shrink-0">
                            <div className="text-[#a59c77]">{level}</div>
                            <div className="text-purple-400">{mp}</div>
                            <div className="text-green-400">{element}</div>
                        </div>
                    </div>
                ))}
            </div>
        </Section>

        <Section title="정령 속성 선택">
            <Alert color="yellow">
                요정은 레벨 50에 달성 시 <strong>정령 속성</strong>(바람/땅/불/물) 중 하나를 선택합니다.<br />
                선택한 속성의 전용 마법을 습득하고, 속성에 따른 추가 패시브 효과를 받습니다.<br />
                속성 선택은 변경할 수 없으니 신중하게 선택하세요!
            </Alert>
        </Section>

        <Section title="스킬 바 — 자동 재시전 슬롯 (5~8번)">
            <Alert color="yellow">
                스킬 바의 <strong>5~8번 슬롯</strong>은 <Tag color="yellow">AUTO</Tag> 슬롯입니다.<br />
                마법을 등록해두면 쿨타임이 끝나는 즉시 <strong>자동으로 재시전</strong>됩니다.
            </Alert>
            <div className="mt-2 space-y-1.5">
                <Row label="1~4번 슬롯" value="수동 발동 — 클릭 또는 단축키(1~4)로 사용" />
                <Row label="5~8번 슬롯" value="자동 재시전 — 쿨타임 종료 시 자동 발동" highlight />
                <Row label="테두리 효과" value="금색 빙글빙글 테두리 → AUTO 슬롯 시각적 구분" />
                <Row label="등록 방법" value="마법서(W)에서 스킬 아이콘을 드래그해 슬롯에 놓기" />
            </div>
            <div className="mt-2">
                <Alert color="blue">
                    버프형 마법(파이어 웨폰, 어스 스킨 등)을 5~8번에 등록하면<br />
                    버프가 끝날 때마다 자동으로 재시전되어 항상 버프를 유지할 수 있습니다.
                </Alert>
            </div>
        </Section>
    </div>
);

const TabParty = () => (
    <div>
        <Section title="파티 시스템 개요">
            <Alert color="blue">
                <strong>파티</strong>는 2인으로 구성됩니다. 기사+요정 조합이 가장 시너지가 높습니다.<br />
                파티를 맺으면 보스 전투, 버프 공유, 파티원 HP 실시간 확인이 가능합니다.
            </Alert>
        </Section>

        <Section title="파티 결성 방법">
            <div className="space-y-2">
                {[
                    { step: '1', title: '친구 목록 열기', desc: '하단 메뉴의 [친구] 버튼 또는 F 키를 누릅니다.' },
                    { step: '2', title: '초대 전송', desc: '친구 목록에서 원하는 플레이어의 [파티 초대] 버튼을 누릅니다.' },
                    { step: '3', title: '상대방 수락', desc: '상대방 화면에 초대 모달이 뜨며, [수락]을 누르면 파티가 결성됩니다.' },
                    { step: '4', title: '파티 확인', desc: '화면 좌측 상단에 파티원의 이름·레벨·HP 바가 실시간으로 표시됩니다.' },
                ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-[#88ddaa]/20 border border-[#88ddaa]/50 flex items-center justify-center text-[#88ddaa] text-[10px] font-bold shrink-0 mt-0.5">{step}</div>
                        <div>
                            <span className="text-white font-bold text-xs">{title}</span>
                            <p className="text-[#888] text-xs mt-0.5">{desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Section>

        <Section title="파티원 HP 패널">
            <div className="bg-[#1a1a1a] rounded p-3 border border-[#333] space-y-1.5">
                <div className="text-white font-bold text-xs mb-1">화면 좌측에 표시되는 파티원 패널</div>
                <Row label="이름/직업/레벨" value="파티원의 캐릭터 정보 실시간 표시" />
                <Row label="HP 바" value="파티원의 현재 HP 비율을 붉은 바로 표시" />
                <Row label="HP 수치" value="현재HP / 최대HP 숫자 표시" />
                <Row label="버프 시전" value="요정 캐릭터는 카드를 탭하면 버프 패널 열림" highlight />
                <Row label="파티 탈퇴" value="패널 하단의 [파티 탈퇴] 버튼으로 즉시 탈퇴 가능" />
            </div>
        </Section>

        <Section title="보스 전투 참여 확인">
            <Alert color="red">
                파티원이 <strong>보스 맵(커츠의 방 / 바포메트의 방)</strong>으로 이동하면<br />
                나머지 파티원에게 <strong>30초 카운트다운</strong>과 함께 참여 확인 모달이 표시됩니다.<br />
                시간 내에 응답하지 않으면 <strong>자동 거절</strong>로 처리됩니다.
            </Alert>
            <div className="mt-2 space-y-1.5">
                <div className="flex gap-2 items-start">
                    <Tag color="green">참여</Tag>
                    <span className="text-[#ccc] text-xs">보스 맵으로 즉시 이동. 파티 보스 스케일(능력치 +40%) 적용.</span>
                </div>
                <div className="flex gap-2 items-start">
                    <Tag color="red">거절</Tag>
                    <span className="text-[#ccc] text-xs">보스를 요청한 플레이어에게 [혼자 입장하기] 버튼이 활성화됩니다.</span>
                </div>
            </div>
        </Section>

        <Section title="혼자 입장하기 (솔로 모드)">
            <Alert color="yellow">
                파티원이 보스 참여를 <strong>거절</strong>하면, 보스를 요청한 플레이어의 화면에<br />
                <strong>[혼자 입장하기]</strong> 버튼이 활성화됩니다.
            </Alert>
            <div className="mt-2 space-y-1.5">
                <Row label="혼자 입장" value="보스 맵으로 이동 — 1인 모드로 진입" />
                <Row label="보스 능력치" value="파티 버프 없이 기본 능력치로 조정됨" highlight />
                <Row label="파티 스케일" value="파티 시 보스 HP/ATK +40% → 솔로 시 기본값 유지" />
                <Row label="보스 처치 후" value="솔로 모드 자동 해제" />
            </div>
            <div className="mt-2">
                <Alert color="blue">
                    파티원이 없어도 보스에 도전할 수 있습니다.<br />
                    단, 보스를 혼자 상대하므로 충분한 장비와 물약을 준비하세요.
                </Alert>
            </div>
        </Section>

        <Section title="파티 보스 스케일링">
            <div className="bg-[#1a1a1a] rounded p-3 border border-[#333] space-y-1.5">
                <div className="text-white font-bold text-xs mb-1">보스 전투 난이도 조정</div>
                <Row label="1인 전투" value="보스 기본 능력치 (HP / ATK × 1.0)" />
                <Row label="2인 파티" value="보스 HP / ATK × 1.4 (+40%)" highlight />
                <div className="text-[#888] text-[10px] mt-2 pt-2 border-t border-[#333]">
                    파티 플레이 시 합산 화력으로 더 빠른 처치가 가능하며,<br />
                    요정의 버프로 기사의 전투력을 대폭 끌어올릴 수 있습니다.
                </div>
            </div>
        </Section>

        <Section title="파티 버프 공유 (요정 전용)">
            <Alert color="green">
                요정 캐릭터는 파티원(기사)에게 <strong>마법 버프를 직접 시전</strong>할 수 있습니다.<br />
                좌측 파티원 카드를 탭하면 버프 아이콘 패널이 열립니다.
            </Alert>
            <div className="mt-2 space-y-1">
                {[
                    { name: '레지스트 매직', effect: 'MR +10%, 5분 지속', note: '' },
                    { name: '서먼 레서 엘리멘탈', effect: 'ATK +5, 10초 지속', note: '' },
                    { name: '윈드 샷', effect: '명중/회피 +5, 30분 지속', note: '' },
                    { name: '어스 스킨', effect: 'AC -4, 30분 지속', note: '' },
                    { name: '파이어 웨폰', effect: 'ATK +3, 30분 지속', note: '' },
                    { name: '네이쳐스 터치', effect: 'HP +50 / 회복+10, 30분 지속', note: '' },
                ].map(({ name, effect }) => (
                    <div key={name} className="flex gap-2 py-1 border-b border-[#222]">
                        <span className="text-blue-300 text-[10px] w-28 shrink-0 font-bold">{name}</span>
                        <span className="text-[#888] text-[10px]">{effect}</span>
                    </div>
                ))}
            </div>
            <div className="mt-2">
                <Alert color="red">
                    <strong>리덕션 아머</strong>는 아군 시전 불가 — 자신에게만 적용됩니다.
                </Alert>
            </div>
        </Section>

        <Section title="파티 플레이 추천 조합">
            <div className="bg-[#1a1a1a] rounded p-3 border border-[#333] space-y-2">
                <div className="text-white font-bold text-xs">기사 + 요정 (최고 시너지)</div>
                <div className="text-[#888] text-xs space-y-1">
                    <div>▪ 요정의 <span className="text-blue-300">파이어 웨폰</span> + <span className="text-lime-300">어스 스킨</span>으로 기사의 공격·방어 강화</div>
                    <div>▪ 기사가 탱킹, 요정이 트리플 애로우로 원거리 딜</div>
                    <div>▪ 보스 전투 시 요정의 <span className="text-emerald-300">네이쳐스 터치</span>로 기사 HP 보충</div>
                    <div>▪ 기사가 사망해도 요정이 계속 사냥 가능</div>
                </div>
            </div>
        </Section>

        <Section title="파티 사냥 중 사망 &amp; 재참여">
            <Alert color="red">
                파티 사냥 중에도 HP가 0이 되면 <strong>사망</strong>합니다.<br />
                사망한 파티원은 전투에서 자동 제외되며, 남은 파티원이 <strong>솔로로 전투</strong>를 이어갑니다.
            </Alert>
            <div className="mt-2 space-y-1.5">
                <Row label="사망 시" value="경험치 소폭 감소, 전투 자동 중단" />
                <Row label="아군 사망 시" value="파티 보정 없이 솔로 전투로 자동 전환" highlight />
                <Row label="마을 부활" value="[마을 부활] 버튼 → 마을에서 HP 만회복 부활" />
                <Row label="사냥터 재참여" value="[재참여] 버튼 → 사망한 사냥터로 즉시 복귀 (HP 30%)" highlight />
            </div>
            <div className="mt-2">
                <Alert color="blue">
                    재참여 시 HP 30%로 복귀합니다. 물약을 충분히 준비하세요.<br />
                    보스 전투 재참여 시 보스의 현재 HP 상태가 유지됩니다.
                </Alert>
            </div>
        </Section>

        <Section title="파티 주의사항">
            {[
                '파티는 최대 2인으로 구성됩니다.',
                '보스 참여 확인은 30초 이내에 응답해야 합니다. 시간 초과 시 자동 거절.',
                '파티를 탈퇴해도 각자의 캐릭터 진행에는 영향이 없습니다.',
                '같은 맵에 없어도 파티는 유지되며 HP 공유, 버프 공유는 계속 작동합니다.',
                '파티 사냥 중 사망해도 [재참여] 버튼으로 즉시 사냥터에 복귀할 수 있습니다.',
            ].map((t, i) => <div key={i} className="text-[#ccc]">▪ {t}</div>)}
        </Section>
    </div>
);

const TabTip = () => (
    <div>
        <Section title="초보자 필수 팁">
            {[
                { icon: '💰', title: '아데나 아끼기', desc: '초반에는 상점 장비보다 드랍 아이템을 활용하세요. 아데나는 인챈트 주문서 구매에 아껴두는 것이 좋습니다.' },
                { icon: '🧪', title: '물약 자동 사용', desc: '설정에서 자동 물약 사용을 켜두면 HP가 낮아질 때 자동으로 회복합니다. 초록 물약(하스트)도 자동 사용됩니다.' },
                { icon: '⚔️', title: '무기 강화 우선', desc: '방어구보다 무기를 먼저 강화하세요. 무기 공격력이 사냥 속도를 크게 좌우합니다.' },
                { icon: '🎯', title: '명중률 100 목표', desc: '상태창에서 명중률을 확인하세요. 100을 달성하면 공격 속도 보너스를 받습니다.' },
                { icon: '📦', title: '창고 활용', desc: '인벤토리가 가득 차면 마을 창고에 보관하세요. 드랍 아이템을 놓치지 않으려면 주기적으로 비워주세요.' },
                { icon: '💬', title: '채팅으로 파티', desc: '채팅창에서 다른 플레이어와 소통하고 친구를 추가하세요. 강한 플레이어에게 팁을 얻을 수 있습니다.' },
            ].map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-3 py-2 border-b border-[#1e1e1e]">
                    <span className="text-xl shrink-0">{icon}</span>
                    <div>
                        <div className="text-white font-bold text-xs">{title}</div>
                        <div className="text-[#888] text-xs mt-0.5">{desc}</div>
                    </div>
                </div>
            ))}
        </Section>

        <Section title="강화 팁">
            <Alert color="yellow">
                <strong>제로스 주문서</strong>로 안전 한계까지 먼저 올리세요.<br />
                그 이후 <strong>다이 주문서</strong>로 도전하세요 (실패 시 파괴 위험!).<br />
                아이템이 파괴되면 복구할 수 없으니, 여분 장비를 확보 후 도전하세요.
            </Alert>
        </Section>

        <Section title="레벨업 팁">
            {[
                '현재 레벨보다 5~10 높은 몬스터를 사냥하면 경험치 효율이 좋습니다.',
                '요정은 정령의 수정을 빨리 모아 마법을 습득할수록 사냥 효율이 높아집니다.',
                '기사는 스틸 갑옷 세트(5종) 또는 커츠 세트(4종)를 맞추면 세트 보너스를 받습니다.',
            ].map((t, i) => <div key={i} className="text-[#ccc]">▪ {t}</div>)}
        </Section>

        <Section title="단축키 (PC)">
            <Row label="I" value="장비창 열기/닫기" />
            <Row label="C" value="캐릭터 창 열기/닫기" />
            <Row label="S" value="상점 열기 (마을에서만)" />
            <Row label="W" value="마법서 열기/닫기" />
            <Row label="F" value="친구 목록" />
            <Row label="B" value="창고 열기 (마을에서만)" />
            <Row label="O" value="설정" />
            <Row label="ESC" value="게임 종료" />
            <Row label="1~8" value="스킬 바 마법 사용 (5~8: 자동 재시전 슬롯)" highlight />
        </Section>

        <Section title="모바일 HUD 사용법">
            <div className="space-y-2">
                <div className="bg-[#1a1a1a] rounded p-3 border border-[#333]">
                    <div className="text-white font-bold text-xs mb-2">하단 HUD 레이아웃 (모바일)</div>
                    <div className="text-[#888] text-[10px] space-y-1.5">
                        <div><span className="text-[#a59c77] font-bold">왼쪽 절반</span> — HP/MP/EXP 바</div>
                        <div><span className="text-[#a59c77] font-bold">오른쪽 상단 절반</span> — 스킬 4×2 그리드</div>
                        <div className="pl-3 text-[#666]">1행: 슬롯 1~4 (수동 발동)</div>
                        <div className="pl-3 text-[#666]">2행: 슬롯 5~8 (자동 재시전, 금색 테두리)</div>
                        <div><span className="text-[#a59c77] font-bold">오른쪽 하단 절반</span> — 메뉴 4×2 그리드</div>
                        <div className="pl-3 text-[#666]">장비 / 캐릭터 / 상점 / 마법</div>
                        <div className="pl-3 text-[#666]">친구 / 창고 / 설정 / 종료</div>
                    </div>
                </div>
                <div className="bg-[#1a1a1a] rounded p-3 border border-[#333]">
                    <div className="text-white font-bold text-xs mb-2">좌측 오버레이 버튼</div>
                    <div className="text-[#888] text-[10px] space-y-1">
                        <div><span className="text-red-400">⚔ 버튼</span> — 전투 로그 오버레이 표시/숨김</div>
                        <div><span className="text-[#d4af37]">💬 버튼</span> — 채팅 오버레이 표시/숨김</div>
                        <div>두 버튼은 동시에 켜지지 않으며, 테두리 없이 글자만 반투명하게 표시됩니다.</div>
                    </div>
                </div>
            </div>
        </Section>

        <Section title="모바일 인벤토리 사용법">
            <Row label="아이템 탭" value="단순 클릭 → 스크롤 선택 등 상호작용" />
            <Row label="아이템 더블탭" value="장착 / 포션 사용 / 마법서 사용" />
            <Row label="길게 누르기" value="0.3초 누르면 드래그 모드 진입 (진동 피드백)" highlight />
            <Row label="드래그 이동" value="다른 슬롯으로 손가락 이동 후 떼면 위치 교환" />
            <Row label="컨텍스트 메뉴" value="우클릭/길게 눌러도 브라우저 메뉴 나오지 않음" />
        </Section>
    </div>
);

const CONTENT = {
    intro:   <TabIntro />,
    class:   <TabClass />,
    stats:   <TabStats />,
    combat:  <TabCombat />,
    maps:    <TabMaps />,
    item:    <TabItem />,
    enchant: <TabEnchant />,
    magic:   <TabMagic />,
    party:   <TabParty />,
    tip:     <TabTip />,
};

const GameGuide = () => {
    const [activeTab, setActiveTab] = useState('intro');

    return (
        <div className="flex h-full bg-[#111] text-white select-none">
            {/* 사이드 탭 */}
            <div className="w-[90px] shrink-0 bg-[#0a0a0a] border-r border-[#222] flex flex-col py-1 overflow-y-auto custom-scrollbar">
                {TABS.map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`
                            px-1 py-2.5 text-[10px] font-bold text-center leading-snug transition-all
                            border-l-2 hover:bg-[#1a1a1a]
                            ${activeTab === id
                                ? 'border-[#d4af37] text-[#d4af37] bg-[#1a1a1a]'
                                : 'border-transparent text-[#666] hover:text-[#aaa]'}
                        `}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {CONTENT[activeTab]}
            </div>
        </div>
    );
};

export default GameGuide;
