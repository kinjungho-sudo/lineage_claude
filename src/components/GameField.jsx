import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { calculateStats, getMaxHp } from '../mechanics/combat';

const GameField = () => {
    const { state, user, resurrect, rejoinCombat, MONSTERS, MAPS } = useGame();
    const canvasRef = useRef(null);
    const [loadedImages, setLoadedImages] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);

    // Preload all map images and Hero
    useEffect(() => {
        const loadAllAssets = async () => {
            const images = {};

            // Load Maps
            const mapPromises = MAPS.map(m => new Promise((resolve) => {
                const img = new Image();
                img.src = m.img;
                img.onload = () => { images[m.img] = img; resolve(); };
                img.onerror = () => { console.error('Failed to load map:', m.img); resolve(); };
            }));

            // Load Hero (Knight & Elf)
            const heroPromise = new Promise((resolve) => {
                const img = new Image();
                img.src = '/character/new_knight.png';
                img.onload = () => { images['hero'] = img; resolve(); };
                img.onerror = () => { console.error('Failed to load hero sprite'); resolve(); };
            });

            const elfIdlePromise = new Promise((resolve) => {
                const img = new Image();
                img.src = '/assets/elf_idle.png';
                img.onload = () => { images['elf_idle'] = img; resolve(); };
                img.onerror = () => { console.warn('Missing elf_idle.png'); resolve(); };
            });

            const elfAttackPromise = new Promise((resolve) => {
                const img = new Image();
                img.src = '/assets/elf_attack.png';
                img.onload = () => { images['elf_attack'] = img; resolve(); };
                img.onerror = () => { console.warn('Missing elf_attack.png'); resolve(); };
            });

            const knightAttack1Promise = new Promise((resolve) => {
                const img = new Image();
                img.src = '/assets/knight_attack1.png';
                img.onload = () => { images['knight_attack1'] = img; resolve(); };
                img.onerror = () => { console.warn('Missing knight_attack1.png'); resolve(); };
            });

            const knightAttack2Promise = new Promise((resolve) => {
                const img = new Image();
                img.src = '/assets/knight_attack2.png';
                img.onload = () => { images['knight_attack2'] = img; resolve(); };
                img.onerror = () => { console.warn('Missing knight_attack2.png'); resolve(); };
            });

            const wizardTownPromise = new Promise((resolve) => {
                const img = new Image();
                img.src = '/assets/wizard_town.png';
                img.onload = () => { images['wizard_town'] = img; resolve(); };
                img.onerror = () => { console.warn('Missing wizard_town.png'); resolve(); };
            });
            const wizardIdlePromise = new Promise((resolve) => {
                const img = new Image();
                img.src = '/assets/wizard_idle.png';
                img.onload = () => { images['wizard_idle'] = img; resolve(); };
                img.onerror = () => { console.warn('Missing wizard_idle.png'); resolve(); };
            });
            const wizardAttack1Promise = new Promise((resolve) => {
                const img = new Image();
                img.src = '/assets/wizard_attack1.png';
                img.onload = () => { images['wizard_attack1'] = img; resolve(); };
                img.onerror = () => { console.warn('Missing wizard_attack1.png'); resolve(); };
            });
            const wizardAttack2Promise = new Promise((resolve) => {
                const img = new Image();
                img.src = '/assets/wizard_attack2.png';
                img.onload = () => { images['wizard_attack2'] = img; resolve(); };
                img.onerror = () => { console.warn('Missing wizard_attack2.png'); resolve(); };
            });

            // Load All Monsters
            const monsterPromises = MONSTERS.map(m => new Promise((resolve) => {
                const img = new Image();
                img.src = m.img;
                img.onload = () => { images[m.img] = img; resolve(); };
                img.onerror = () => { console.warn('Failed to load monster:', m.img); resolve(); }; // Warn but resolve
            }));

            const arrowPromise = new Promise((resolve) => {
                const img = new Image();
                img.src = '/assets/arrow.png';
                img.onload = () => { images['arrow'] = img; resolve(); };
                img.onerror = () => { console.warn('Missing arrow.png'); resolve(); };
            });

            await Promise.all([...mapPromises, heroPromise, elfIdlePromise, elfAttackPromise, knightAttack1Promise, knightAttack2Promise, wizardTownPromise, wizardIdlePromise, wizardAttack1Promise, wizardAttack2Promise, arrowPromise, ...monsterPromises]);
            setLoadedImages(images);
            setIsLoaded(true);
        };

        loadAllAssets();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const getHudHeight = () => window.innerWidth < 1024 ? 88 : 180;
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight - getHudHeight();
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isLoaded) return;
        const ctx = canvas.getContext('2d');

        const hudHeight = window.innerWidth < 1024 ? 88 : 180;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - hudHeight;

        let animationFrameId;

        const currentMapId = state.currentMapId || 'village';
        const currentMapData = MAPS.find(m => m.id === currentMapId) || MAPS[0];
        const bgImage = loadedImages[currentMapData.img];
        const heroImg = loadedImages['hero'];

        const SCENE_ZOOM = canvas.width < 1024 ? 0.52 : 0.70; // 모바일: 더 멀리서 보는 시점

        const render = () => {
            // Draw Background (full canvas — zoom 미적용)
            if (bgImage) {
                try {
                    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
                } catch {
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            } else {
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // 게임 요소 전체를 canvas 중심 기준으로 축소 (멀리서 보는 효과)
            ctx.save();
            ctx.translate(
                canvas.width  / 2 * (1 - SCENE_ZOOM),
                canvas.height / 2 * (1 - SCENE_ZOOM)
            );
            ctx.scale(SCENE_ZOOM, SCENE_ZOOM);

            // Draw Hero (Center)
            const heroX = canvas.width / 2 - 100;
            const heroY = canvas.height / 2 - 60;
            let drawX = heroX; // Define drawX here for wider scope if needed, but updated below

            // [파티 포지션] 기사=앞, 엘프=뒤 / 같은 직업이면 레벨 높은 순이 앞
            const partyPartners = (state.party?.members || []).filter(
                m => m.characterName !== state.characterName && m.currentMapId === currentMapId && currentMapId !== 'village' && currentMapId !== 'elf_village'
            );
            const partnerOnSameMap = partyPartners.length > 0;
            const battleMembers = [
                { isLocal: true, cls: state.characterClass || 'knight', lvl: state.level || 1 },
                ...partyPartners.map((p, i) => ({ isLocal: false, pIdx: i, cls: p.characterClass || 'knight', lvl: p.level || 1 }))
            ];
            battleMembers.sort((a, b) => {
                const aK = a.cls === 'knight' ? 1 : 0;
                const bK = b.cls === 'knight' ? 1 : 0;
                if (aK !== bK) return bK - aK; // 기사 앞
                return b.lvl - a.lvl; // 레벨 높은 순이 앞
            });
            const SLOT_X = [heroX, heroX - 95, heroX - 185]; // 앞→뒤 슬롯
            const localSlot = battleMembers.findIndex(m => m.isLocal);
            const localXOffset = (SLOT_X[localSlot] ?? heroX) - heroX;

            // 로컬 플레이어 포지션 오프셋 적용
            ctx.save();
            ctx.translate(localXOffset, 0);

            // 클래스별 기준 drawH: 기사(120) 기준으로 마법사·요정 시각적 크기 보정
            const charClassForSize = state.characterClass || 'knight';
            const drawH = charClassForSize === 'wizard' ? 132 : charClassForSize === 'elf' ? 140 : 120;
            let drawW = drawH; // fallback (1:1 aspect), overridden below when heroImg is loaded

            if (heroImg) {
                const aspect = heroImg.width / heroImg.height;
                drawW = drawH * aspect;

                const charClass = state.characterClass || 'knight';
                const isVillage = currentMapId === 'elf_village' || currentMapId === 'village';
                const breathe = ((charClass === 'elf' || charClass === 'wizard') && isVillage) ? 0 : Math.sin(Date.now() / 500) * 2;

                const isAttacking = state.combatState?.isAttacking;
                let heroImgToDraw = heroImg;
                let lunge = 0;
                let wizardIsAttack2 = false;

                // 실제 틱 기반 공격 페이즈 (0 = 방금 공격, 1 = 다음 공격 직전)
                const lastAttackTs = state.combatState?.lastAttackTimestamp || 0;
                const attackInterval = state.combatState?.attackIntervalMs || 1500;
                const attackPhase = lastAttackTs > 0
                    ? Math.min(1, (Date.now() - lastAttackTs) / attackInterval)
                    : 1;

                if (charClass === 'elf') {
                    // 페이즈 0~0.35: 활 당기고 발사, 이후: 대기
                    if (isAttacking && attackPhase < 0.35) {
                        const p = attackPhase / 0.35;
                        heroImgToDraw = p < 0.45
                            ? (loadedImages['elf_idle'] || heroImg)
                            : (loadedImages['elf_attack'] || heroImg);
                    } else {
                        heroImgToDraw = loadedImages['elf_idle'] || heroImg;
                    }
                } else if (charClass === 'wizard') {
                    // 마법사: 마을 → wizard_town, 전투 idle → wizard_idle, 공격 → attack1 → attack2
                    if (isVillage) {
                        heroImgToDraw = loadedImages['wizard_town'] || heroImg;
                    } else if (isAttacking && attackPhase < 0.40) {
                        const p = attackPhase / 0.40;
                        if (p < 0.5) {
                            heroImgToDraw = loadedImages['wizard_attack1'] || loadedImages['wizard_idle'] || heroImg;
                        } else {
                            heroImgToDraw = loadedImages['wizard_attack2'] || loadedImages['wizard_idle'] || heroImg;
                            wizardIsAttack2 = true;
                        }
                    } else {
                        heroImgToDraw = loadedImages['wizard_idle'] || heroImg;
                    }
                } else {
                    // 기사: 페이즈 0~0.40: 휘두르기, 이후: 대기
                    if (isAttacking && attackPhase < 0.40) {
                        const p = attackPhase / 0.40;
                        heroImgToDraw = p < 0.5
                            ? (loadedImages['knight_attack1'] || heroImg)
                            : (loadedImages['knight_attack2'] || heroImg);
                        // 전진 모션: 올라갔다가 돌아옴
                        if (p < 0.35) lunge = (p / 0.35) * 20;
                        else lunge = ((0.40 - p) / 0.05) * 20;
                        lunge = Math.max(0, Math.min(20, lunge));
                    } else {
                        heroImgToDraw = heroImg;
                    }
                }

                if (!heroImgToDraw) heroImgToDraw = heroImg;

                drawX = heroX + lunge + (charClass === 'wizard' && wizardIsAttack2 ? 8 : 0);

                // [마법사 attack2] 팔을 높이 드는 포즈 보정: 비율 유지를 위해 약간 크게 표시
                const heroDrawH = (charClass === 'wizard' && wizardIsAttack2) ? Math.floor(drawH * 1.12) : drawH;
                const heroDrawW = heroDrawH * (heroImgToDraw ? (heroImgToDraw.width / heroImgToDraw.height) : (drawW / drawH));

                // [FIX] targetMonsterData 정의 (ReferenceError 해결)
                const targetMonsterData = state.combatState?.targetMonsterId 
                    ? MONSTERS.find(m => m.id === state.combatState.targetMonsterId) 
                    : null;

                // 트리플 애로우 활성 여부 — 일반 화살 애니메이션 억제용
                const tripleArrowEffect = state.combatState?.tripleArrowEffect;
                const TRIPLE_TOTAL_MS = 600;
                const isTripleActive = tripleArrowEffect && (Date.now() - tripleArrowEffect.timestamp) < TRIPLE_TOTAL_MS;

                // 요정 화살 애니메이션 — 직선 궤도, 페이즈 0.60~0.97 (빠르게, 데미지 직전 도달)
                const hasBow = state.equipment?.weapon?.stats?.range === true;
                if (isAttacking && charClass === 'elf' && hasBow && targetMonsterData && !isTripleActive) {
                    const arrowStart = 0.60;
                    const arrowEnd   = 0.97;

                    if (attackPhase >= arrowStart && attackPhase < arrowEnd) {
                        const t = (attackPhase - arrowStart) / (arrowEnd - arrowStart); // 0→1

                        const startX = heroX + 65;
                        const startY = heroY + 15;
                        const endX = (canvas.width / 2) + (targetMonsterData.isExtraLarge ? 55 : 108) - localXOffset;
                        const endY = (canvas.height / 2) - (targetMonsterData.isExtraLarge ? 60 : 40);

                        // 직선 보간
                        const ax = startX + (endX - startX) * t;
                        const ay = startY + (endY - startY) * t;
                        const angle = Math.atan2(endY - startY, endX - startX);

                        const arrowImg = loadedImages['arrow'];
                        if (arrowImg) {
                            const arrowW = 76;
                            const arrowH = arrowW * (arrowImg.height / arrowImg.width);

                            // 잔상 2개
                            for (let g = 2; g >= 1; g--) {
                                const gs = Math.max(0, t - g * 0.07);
                                const gx = startX + (endX - startX) * gs;
                                const gy = startY + (endY - startY) * gs;
                                ctx.save();
                                ctx.globalAlpha = 0.15 / g;
                                ctx.translate(gx, gy);
                                ctx.rotate(angle);
                                ctx.drawImage(arrowImg, -arrowW / 2, -arrowH / 2, arrowW, arrowH);
                                ctx.restore();
                            }

                            // 본체
                            ctx.save();
                            ctx.globalAlpha = 1.0;
                            ctx.translate(ax, ay);
                            ctx.rotate(angle);
                            ctx.drawImage(arrowImg, -arrowW / 2, -arrowH / 2, arrowW, arrowH);
                            ctx.restore();
                        }
                    }
                }

                // ─── 트리플 애로우 스킬 애니메이션 ────────────────────────────────────
                // 황금빛 차지 + 3발 연속 발사 + 강력한 임팩트
                if (isTripleActive && charClass === 'elf' && targetMonsterData) {
                    const taElapsed = Date.now() - tripleArrowEffect.timestamp;
                    const arrowImg = loadedImages['arrow'];
                    const taEndX = (canvas.width / 2) + (targetMonsterData.isExtraLarge ? 55 : 108) - localXOffset;
                    const taEndY = (canvas.height / 2) - (targetMonsterData.isExtraLarge ? 60 : 40);
                    const taStartX = heroX + 65;
                    const taStartY = heroY + 15;
                    const taBaseAngle = Math.atan2(taEndY - taStartY, taEndX - taStartX);

                    // ① 시전 차지 (0~150ms) — 황금빛 에너지 버스트 + 조준선
                    if (taElapsed < 150) {
                        const bp = taElapsed / 150;
                        const sparkX = heroX + 55;
                        const sparkY = heroY - 10;
                        const radius = 6 + bp * 32;
                        const alpha = bp < 0.2 ? bp / 0.2 : Math.max(0, 1 - (bp - 0.2) / 0.8);

                        // 황금빛 코어 글로우
                        const grd = ctx.createRadialGradient(sparkX, sparkY, 0, sparkX, sparkY, radius);
                        grd.addColorStop(0, `rgba(255,255,200,${Math.min(1, alpha * 1.5)})`);
                        grd.addColorStop(0.3, `rgba(255,220,60,${alpha * 0.9})`);
                        grd.addColorStop(0.7, `rgba(255,140,0,${alpha * 0.5})`);
                        grd.addColorStop(1, 'rgba(255,80,0,0)');
                        ctx.save();
                        ctx.fillStyle = grd;
                        ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 22;
                        ctx.beginPath();
                        ctx.arc(sparkX, sparkY, radius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        ctx.restore();

                        // 8방향 날카로운 빛줄기
                        for (let r = 0; r < 8; r++) {
                            const rayAngle = (r / 8) * Math.PI * 2;
                            const rayLen = (8 + bp * 30) * (r % 2 === 0 ? 1.0 : 0.6);
                            ctx.save();
                            ctx.globalAlpha = alpha * 0.9;
                            ctx.strokeStyle = r % 2 === 0 ? '#ffffff' : '#ffdd44';
                            ctx.lineWidth = r % 2 === 0 ? 2.5 : 1.5;
                            ctx.lineCap = 'round';
                            ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8;
                            ctx.beginPath();
                            ctx.moveTo(sparkX, sparkY);
                            ctx.lineTo(sparkX + Math.cos(rayAngle) * rayLen, sparkY + Math.sin(rayAngle) * rayLen);
                            ctx.stroke();
                            ctx.restore();
                        }

                        // 몬스터 방향 조준선
                        ctx.save();
                        ctx.globalAlpha = alpha * 0.35;
                        ctx.strokeStyle = '#ffee66';
                        ctx.lineWidth = 1.5;
                        ctx.setLineDash([5, 7]);
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(sparkX, sparkY);
                        ctx.lineTo(sparkX + (taEndX - sparkX) * 0.35, sparkY + (taEndY - sparkY) * 0.35);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.restore();
                    }

                    // ② 화살 3발 — 80ms 간격, 각 120ms 비행 (빠르고 강렬하게)
                    const TA_FLIGHT_MS = 120;
                    const TA_DELAYS = [110, 190, 270];
                    const TA_Y_SPREADS = [-11, 0, 11];

                    TA_DELAYS.forEach((delay, i) => {
                        const ae = taElapsed - delay;
                        if (ae < 0) return;
                        const aEndY = taEndY + TA_Y_SPREADS[i];

                        // 발사 순간 활 플래시 (0~55ms)
                        if (ae < 55) {
                            const fp = ae / 55;
                            const fAlpha = Math.pow(1 - fp, 0.8);
                            const fRad = 5 + fp * 20;
                            ctx.save();
                            ctx.globalAlpha = fAlpha * 0.9;
                            const fGrd = ctx.createRadialGradient(taStartX, taStartY, 0, taStartX, taStartY, fRad);
                            fGrd.addColorStop(0, '#ffffff');
                            fGrd.addColorStop(0.35, '#ffee88');
                            fGrd.addColorStop(1, 'rgba(255,180,0,0)');
                            ctx.fillStyle = fGrd;
                            ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 14;
                            ctx.beginPath();
                            ctx.arc(taStartX, taStartY, fRad, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }

                        if (ae < TA_FLIGHT_MS) {
                            const t = ae / TA_FLIGHT_MS;
                            const et = 1 - Math.pow(1 - t, 1.5);
                            const ax = taStartX + (taEndX - taStartX) * et;
                            const ay = taStartY + (aEndY - taStartY) * et;
                            const angle = Math.atan2(aEndY - taStartY, taEndX - taStartX);

                            if (arrowImg) {
                                const arrowW = 76;
                                const arrowH = arrowW * (arrowImg.height / arrowImg.width);

                                // 황금빛 그라디언트 트레일 (5단계)
                                ctx.save();
                                for (let ts = 5; ts >= 1; ts--) {
                                    const tET = Math.max(0, et - ts * 0.05);
                                    const trailX = taStartX + (taEndX - taStartX) * tET;
                                    const trailY = taStartY + (aEndY - taStartY) * tET;
                                    const trailAlpha = (1 - ts / 6) * 0.55;
                                    const trailRad = 2.5 + (5 - ts) * 0.8;
                                    ctx.globalAlpha = trailAlpha;
                                    const tColor = ts <= 2 ? '#ffee44' : ts <= 4 ? '#ff9900' : 'rgba(255,60,0,0.6)';
                                    ctx.fillStyle = tColor;
                                    ctx.shadowColor = '#ffbb00'; ctx.shadowBlur = 7;
                                    ctx.beginPath();
                                    ctx.arc(trailX, trailY, trailRad, 0, Math.PI * 2);
                                    ctx.fill();
                                }
                                ctx.shadowBlur = 0;
                                // 흰빛 속도선
                                ctx.globalAlpha = 0.65;
                                ctx.strokeStyle = 'rgba(255,255,255,0.9)';
                                ctx.lineWidth = 2.5;
                                ctx.lineCap = 'round';
                                ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 7;
                                ctx.beginPath();
                                const lineET = Math.max(0, et - 0.13);
                                ctx.moveTo(taStartX + (taEndX - taStartX) * lineET, taStartY + (aEndY - taStartY) * lineET);
                                ctx.lineTo(ax, ay);
                                ctx.stroke();
                                ctx.shadowBlur = 0;
                                ctx.restore();

                                // 화살 황금빛 아우라
                                ctx.save();
                                ctx.globalAlpha = 0.5;
                                ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 14;
                                ctx.translate(ax, ay);
                                ctx.rotate(angle);
                                ctx.drawImage(arrowImg, -arrowW / 2 - 4, -arrowH / 2 - 4, arrowW + 8, arrowH + 8);
                                ctx.shadowBlur = 0;
                                ctx.restore();

                                // 화살 본체
                                ctx.save();
                                ctx.translate(ax, ay);
                                ctx.rotate(angle);
                                ctx.drawImage(arrowImg, -arrowW / 2, -arrowH / 2, arrowW, arrowH);
                                ctx.restore();
                            }
                        } else if (ae < TA_FLIGHT_MS + 170) {
                            // 도착 임팩트 — 강력한 관통 충격
                            const ip = (ae - TA_FLIGHT_MS) / 170;
                            const ipAlpha = Math.max(0, 1 - ip);
                            ctx.save();
                            ctx.globalAlpha = ipAlpha;

                            // 임팩트 코어
                            const impRad = 12 + ip * 40;
                            const igrd = ctx.createRadialGradient(taEndX, aEndY, 0, taEndX, aEndY, impRad);
                            igrd.addColorStop(0, 'rgba(255,255,255,0.98)');
                            igrd.addColorStop(0.2, 'rgba(255,245,100,0.85)');
                            igrd.addColorStop(0.55, 'rgba(255,160,0,0.45)');
                            igrd.addColorStop(1, 'rgba(255,80,0,0)');
                            ctx.fillStyle = igrd;
                            ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 20;
                            ctx.beginPath();
                            ctx.arc(taEndX, aEndY, impRad, 0, Math.PI * 2);
                            ctx.fill();

                            // 팽창 충격파 링
                            if (ip < 0.65) {
                                const ringRad = ip * 48;
                                ctx.globalAlpha = ipAlpha * (1 - ip / 0.65) * 0.8;
                                ctx.strokeStyle = '#ffee44';
                                ctx.lineWidth = 2.5;
                                ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 10;
                                ctx.beginPath();
                                ctx.arc(taEndX, aEndY, ringRad, 0, Math.PI * 2);
                                ctx.stroke();
                            }

                            // 방사형 스파크 12개
                            ctx.globalAlpha = ipAlpha * 0.9;
                            for (let s = 0; s < 12; s++) {
                                const sa = taBaseAngle + (s / 12) * Math.PI * 2;
                                const sl = 5 + ip * 26;
                                ctx.strokeStyle = s % 3 === 0 ? '#ffffff' : s % 3 === 1 ? '#ffee44' : '#ffaa00';
                                ctx.lineWidth = s % 3 === 0 ? 2.2 : 1.6;
                                ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 6;
                                ctx.lineCap = 'round';
                                ctx.beginPath();
                                ctx.moveTo(taEndX, aEndY);
                                ctx.lineTo(taEndX + Math.cos(sa) * sl, aEndY + Math.sin(sa) * sl);
                                ctx.stroke();
                            }
                            ctx.shadowBlur = 0;
                            ctx.restore();
                        }
                    });
                }

                // 마법사 전기 볼트 애니메이션 — 페이즈 0.05~0.45 (시전 직후 날아가는 궤적)
                // 콜 라이트닝(lightning)은 하늘에서 내리꽂는 방식 → 투사체 없음
                // 이럽션(eruption)은 지면 이펙트만 → 투사체 없음
                const wizardSpellEffect = state.combatState?.wizardSpellEffect;
                const recentWizardSpell = wizardSpellEffect && (Date.now() - wizardSpellEffect.timestamp < (state.combatState?.attackIntervalMs || 1500));
                const _spellTypeForProjectile = recentWizardSpell ? wizardSpellEffect.type : 'bolt';
                if (isAttacking && charClass === 'wizard' && targetMonsterData && _spellTypeForProjectile !== 'lightning' && _spellTypeForProjectile !== 'eruption') {
                    const boltStart = 0.05;
                    const boltEnd   = 0.45;
                    if (attackPhase >= boltStart && attackPhase < boltEnd) {
                        const t = (attackPhase - boltStart) / (boltEnd - boltStart); // 0→1

                        const bStartX = heroX + 85;
                        const bStartY = heroY - 10;
                        const bEndX = (canvas.width / 2) + (targetMonsterData.isExtraLarge ? 55 : 108) - localXOffset;
                        const bEndY = (canvas.height / 2) - (targetMonsterData.isExtraLarge ? 60 : 40);

                        const bx = bStartX + (bEndX - bStartX) * t;
                        const by = bStartY + (bEndY - bStartY) * t;
                        const angle = Math.atan2(bEndY - bStartY, bEndX - bStartX);
                        const bLen = Math.hypot(bEndX - bStartX, bEndY - bStartY);

                        // 스펠 타입별 색상
                        const spellType = recentWizardSpell ? wizardSpellEffect.type : 'bolt';
                        let boltColor, boltGlow, boltCore;
                        if (spellType === 'fire') {
                            boltColor = '#ff8800'; boltGlow = 'rgba(255,100,0,0.5)'; boltCore = '#ffdd44';
                        } else if (spellType === 'lightning') {
                            boltColor = '#eeeeff'; boltGlow = 'rgba(200,200,255,0.5)'; boltCore = '#ffffff';
                        } else if (spellType === 'eruption') {
                            boltColor = '#ff4400'; boltGlow = 'rgba(255,50,0,0.5)'; boltCore = '#ffaa00';
                        } else {
                            boltColor = '#44ccff'; boltGlow = 'rgba(0,180,255,0.5)'; boltCore = '#aaeeff';
                        }

                        ctx.save();
                        ctx.translate(bx, by);
                        ctx.rotate(angle);

                        // 글로우 후광
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.35 * (1 - t * 0.3);
                        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
                        glowGrad.addColorStop(0, boltCore);
                        glowGrad.addColorStop(0.4, boltColor);
                        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = glowGrad;
                        ctx.beginPath();
                        ctx.arc(0, 0, 18, 0, Math.PI * 2);
                        ctx.fill();

                        // 전기 지그재그 (에너지 볼트 / 번개 계열)
                        if (spellType === 'bolt' || spellType === 'lightning') {
                            ctx.globalAlpha = 0.7 * (1 - t * 0.2);
                            ctx.strokeStyle = boltColor;
                            ctx.lineWidth = spellType === 'lightning' ? 2.5 : 1.5;
                            ctx.shadowColor = boltCore;
                            ctx.shadowBlur = 8;
                            const zigLen = Math.min(bLen * (1 - t) * 0.5, 40);
                            ctx.beginPath();
                            ctx.moveTo(0, 0);
                            for (let z = 0; z < 6; z++) {
                                const zx = -zigLen + z * (zigLen / 3);
                                const zy = (z % 2 === 0 ? -1 : 1) * (4 + Math.random() * 3);
                                ctx.lineTo(zx, zy);
                            }
                            ctx.stroke();
                        }

                        // 코어 원
                        ctx.globalAlpha = 0.9;
                        ctx.shadowBlur = 0;
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.fillStyle = boltCore;
                        ctx.beginPath();
                        ctx.arc(0, 0, spellType === 'eruption' ? 7 : 5, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.restore();

                        // 잔상 2개
                        for (let g = 1; g <= 2; g++) {
                            const gs = Math.max(0, t - g * 0.12);
                            const gx = bStartX + (bEndX - bStartX) * gs;
                            const gy = bStartY + (bEndY - bStartY) * gs;
                            ctx.save();
                            ctx.globalCompositeOperation = 'lighter';
                            ctx.globalAlpha = 0.12 / g;
                            ctx.fillStyle = boltColor;
                            ctx.beginPath();
                            ctx.arc(gx, gy, 8, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                    }
                }

                // Draw Shadow
                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(drawX + heroDrawW / 2, heroY + heroDrawH - 10, 30, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                try {
                    // [개선] 플레이어 사망 모션 (isPlayerDead 상태일 때)
                    const isPlayerDead = state.combatState?.isPlayerDead;
                    if (isPlayerDead) {
                        const deathElapsed = state.combatState?.playerDeathTimestamp
                            ? Date.now() - state.combatState.playerDeathTimestamp : 0;

                        ctx.save();
                        if (deathElapsed < 100) {
                            // 사망 시작: 흰색 플래시
                            ctx.globalCompositeOperation = 'lighter';
                            ctx.globalAlpha = 1.0;
                            ctx.filter = 'brightness(200%)';
                        } else {
                            // 가라앉으며 페이드아웃
                            const sinkProgress = Math.min(1, deathElapsed / 800);
                            const sinkY = sinkProgress * 40;
                            const fadeAlpha = Math.max(0.15, 1 - sinkProgress);
                            ctx.globalAlpha = fadeAlpha;
                            ctx.translate(0, sinkY);
                            // 깜빡임 효과
                            if (Math.floor(Date.now() / 80) % 2 === 0) {
                                ctx.globalAlpha = fadeAlpha * 0.4;
                            }
                        }
                        // 회전 (90도까지)
                        const rotProgress = Math.min(1, deathElapsed / 800);
                        ctx.translate(drawX + heroDrawW / 2, heroY + heroDrawH - 40);
                        ctx.rotate(rotProgress * 90 * Math.PI / 180);
                        ctx.translate(-(drawX + heroDrawW / 2), -(heroY + heroDrawH - 40));

                        ctx.drawImage(heroImgToDraw, drawX, heroY - 40 + breathe, heroDrawW, heroDrawH);
                        ctx.restore();
                    } else {
                        ctx.drawImage(heroImgToDraw, drawX, heroY - 40 + breathe, heroDrawW, heroDrawH);
                    }

                    // [개선] 물약 이펙트: 타입별로 다른 시각 효과
                    const potionEffect = state.combatState?.potionEffect;
                    if (potionEffect && Date.now() - potionEffect.timestamp < 500) {
                        const elapsed = Date.now() - potionEffect.timestamp;
                        const alpha = 1 - (elapsed / 500);
                        const effectType = potionEffect.type || 'red';

                        if (effectType === 'blue') {
                            // 파란 물약: 파란 마법 스파클이 캐릭터 주위에서 상승하는 효과
                            ctx.save();
                            ctx.globalCompositeOperation = 'lighter';
                            // 중심 파란 글로우
                            const bGlow = ctx.createRadialGradient(
                                drawX + drawW / 2, heroY + drawH / 2, 5,
                                drawX + drawW / 2, heroY + drawH / 2, 65
                            );
                            bGlow.addColorStop(0, `rgba(100,180,255,${alpha * 0.9})`);
                            bGlow.addColorStop(0.4, `rgba(60,100,255,${alpha * 0.4})`);
                            bGlow.addColorStop(1, 'rgba(0,0,200,0)');
                            ctx.fillStyle = bGlow;
                            ctx.beginPath();
                            ctx.ellipse(drawX + drawW / 2, heroY + drawH / 2, 65, 85, 0, 0, Math.PI * 2);
                            ctx.fill();
                            // 위로 올라가는 파란 마법 파티클
                            const seed = Math.floor(elapsed / 16);
                            for (let i = 0; i < 16; i++) {
                                const ang = (i / 16) * Math.PI * 2;
                                const rad = 20 + ((seed * 7 + i * 13) % 30);
                                const px = drawX + drawW / 2 + Math.cos(ang) * rad;
                                const rise = ((elapsed / 500) * 70) + ((i * 17) % 40);
                                const py = heroY + drawH * 0.7 - rise;
                                const sz = 2 + (i % 3);
                                ctx.globalAlpha = alpha * (1 - rise / 110) * 0.9;
                                ctx.shadowColor = '#66aaff';
                                ctx.shadowBlur = 8;
                                ctx.fillStyle = `hsl(${210 + (i * 11) % 40}, 100%, ${70 + (i % 3) * 10}%)`;
                                ctx.beginPath();
                                ctx.arc(px, py, sz, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            ctx.shadowBlur = 0;
                            ctx.restore();
                        } else if (effectType === 'brave') {
                            // 용기의 물약: 노란색 파티클이 머리 위에서 떨어지는 효과
                            ctx.save();
                            ctx.globalAlpha = alpha;
                            const particleCount = 12;
                            for (let i = 0; i < particleCount; i++) {
                                const px = drawX + drawW * 0.2 + Math.random() * drawW * 0.6;
                                const baseY = heroY - 60 + breathe;
                                const fallDistance = (elapsed / 500) * 80;
                                const py = baseY + fallDistance + (i * 8) % 40;
                                const size = 2 + Math.random() * 3;
                                const particleAlpha = alpha * (0.5 + Math.random() * 0.5);
                                
                                ctx.globalAlpha = particleAlpha;
                                ctx.fillStyle = `hsl(${45 + Math.random() * 15}, 100%, ${60 + Math.random() * 30}%)`;
                                ctx.beginPath();
                                ctx.arc(px, py, size, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            // 머리 위 노란색 글로우
                            ctx.globalAlpha = alpha * 0.4;
                            ctx.globalCompositeOperation = 'lighter';
                            const glowGrad = ctx.createRadialGradient(
                                drawX + drawW / 2, heroY - 30 + breathe, 5,
                                drawX + drawW / 2, heroY - 30 + breathe, 40
                            );
                            glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
                            glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
                            ctx.fillStyle = glowGrad;
                            ctx.beginPath();
                            ctx.ellipse(drawX + drawW / 2, heroY - 20 + breathe, 40, 30, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        } else {
                            // 일반 물약: 몸에서 빛나는 글로우 (빨간/주황/흰색)
                            let colorInner, colorMid, colorOuter;
                            if (effectType === 'clear') {
                                // 주홍 물약: 주황색 글로우
                                colorInner = 'rgba(255, 180, 80, 1.0)';
                                colorMid = 'rgba(255, 140, 0, 0.5)';
                                colorOuter = 'rgba(255, 140, 0, 0)';
                            } else if (effectType === 'clearHigh') {
                                // 맑은 물약: 흰색 글로우
                                colorInner = 'rgba(255, 255, 255, 1.0)';
                                colorMid = 'rgba(220, 220, 255, 0.5)';
                                colorOuter = 'rgba(200, 200, 255, 0)';
                            } else if (effectType === 'haste') {
                                // 초록 물약: 연녹색 글로우
                                colorInner = 'rgba(150, 255, 150, 1.0)';
                                colorMid = 'rgba(0, 255, 0, 0.5)';
                                colorOuter = 'rgba(0, 255, 0, 0)';
                            } else if (effectType === 'brave') {
                                // 용기의 물약: 파란색 글로우
                                colorInner = 'rgba(150, 150, 255, 1.0)';
                                colorMid = 'rgba(0, 100, 255, 0.5)';
                                colorOuter = 'rgba(0, 50, 255, 0)';
                            } else {
                                // 빨간 물약: 빨간색 글로우 (기본)
                                colorInner = 'rgba(255, 100, 100, 1.0)';
                                colorMid = 'rgba(255, 0, 0, 0.5)';
                                colorOuter = 'rgba(255, 0, 0, 0)';
                            }

                            ctx.save();
                            ctx.globalCompositeOperation = 'lighter';
                            ctx.globalAlpha = alpha * 0.8;

                            const grad = ctx.createRadialGradient(
                                drawX + drawW / 2, heroY + drawH / 2, 10,
                                drawX + drawW / 2, heroY + drawH / 2, 60
                            );
                            grad.addColorStop(0, colorInner);
                            grad.addColorStop(0.5, colorMid);
                            grad.addColorStop(1, colorOuter);

                            ctx.fillStyle = grad;
                            ctx.beginPath();
                            ctx.ellipse(drawX + drawW / 2, heroY + drawH / 2, 60, 80, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                    }

                    // [버프 마법 이펙트] 버프 시전 시 캐릭터에서 타입별 임팩트
                    const buffEffect = state.combatState?.buffEffect;
                    const BUFF_DURATION = 1400;
                    if (buffEffect && Date.now() - buffEffect.timestamp < BUFF_DURATION) {
                        const bElapsed = Date.now() - buffEffect.timestamp;
                        const bP = bElapsed / BUFF_DURATION;
                        const bAlpha = bP < 0.12 ? bP / 0.12 : 1 - (bP - 0.12) / 0.88;
                        const bCx = drawX + drawW / 2;
                        const bMidY = heroY + drawH / 2;
                        const bBotY = heroY + drawH;

                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';

                        if (buffEffect.type === 'str') {
                            // 힘 버프: 황금 폭발 + 링 + 파편
                            const burstR = 20 + bP * 90;
                            ctx.globalAlpha = bAlpha * 0.5;
                            const sg = ctx.createRadialGradient(bCx, bMidY, 0, bCx, bMidY, burstR);
                            sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.3, '#ffdd00'); sg.addColorStop(1, 'rgba(200,80,0,0)');
                            ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(bCx, bMidY, burstR, 0, Math.PI * 2); ctx.fill();
                            for (let ring = 0; ring < 3; ring++) {
                                const rD = ring * 0.15; const rP2 = Math.max(0, bP - rD);
                                if (rP2 <= 0) continue;
                                ctx.globalAlpha = bAlpha * (1 - rP2) * 0.9;
                                ctx.strokeStyle = ring === 0 ? '#ffffff' : ring === 1 ? '#ffee44' : '#ff9900';
                                ctx.lineWidth = 4 - ring; ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 18;
                                ctx.beginPath(); ctx.arc(bCx, bMidY, rP2 * (ring + 1) * 55, 0, Math.PI * 2); ctx.stroke();
                            }
                            ctx.shadowBlur = 0;
                            for (let i = 0; i < 10; i++) {
                                const a = (i / 10) * Math.PI * 2;
                                const px = bCx + Math.cos(a) * (40 + bP * 90);
                                const py = bMidY + Math.sin(a) * (40 + bP * 90) * 0.55 - bP * 45;
                                const pR2 = Math.max(0, 7 - bP * 5);
                                ctx.globalAlpha = bAlpha * (1 - bP) * 0.95;
                                ctx.fillStyle = i % 2 === 0 ? '#ffee44' : '#ff8800';
                                ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 8;
                                ctx.beginPath(); ctx.arc(px, py, pR2, 0, Math.PI * 2); ctx.fill();
                            }
                            ctx.shadowBlur = 0;

                        } else if (buffEffect.type === 'def') {
                            // 방어 버프: 파란 크리스탈 방패 링
                            for (let ring = 0; ring < 5; ring++) {
                                const rD = ring * 0.1; const rP2 = Math.max(0, (bP - rD) / (1 - rD));
                                if (rP2 <= 0 || rP2 > 1) continue;
                                ctx.globalAlpha = bAlpha * (1 - rP2) * 0.8;
                                ctx.strokeStyle = ring % 2 === 0 ? '#aaccff' : '#4488ff';
                                ctx.lineWidth = ring % 2 === 0 ? 3 : 1.5;
                                ctx.shadowColor = '#2266ff'; ctx.shadowBlur = 15;
                                ctx.beginPath(); ctx.arc(bCx, bMidY, rP2 * 100, 0, Math.PI * 2); ctx.stroke();
                            }
                            ctx.shadowBlur = 0;
                            for (let i = 0; i < 12; i++) {
                                const a = (i / 12) * Math.PI * 2;
                                const px = bCx + Math.cos(a) * (25 + bP * 75);
                                const py = bMidY + Math.sin(a) * (25 + bP * 75) * 0.65;
                                ctx.globalAlpha = bAlpha * (1 - bP) * 0.85;
                                ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#88aaff' : '#4466dd';
                                ctx.shadowColor = '#4488ff'; ctx.shadowBlur = 7;
                                ctx.save(); ctx.translate(px, py); ctx.rotate(bP * Math.PI * 2);
                                ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(3,0); ctx.lineTo(0,5); ctx.lineTo(-3,0); ctx.closePath(); ctx.fill();
                                ctx.restore();
                            }
                            ctx.shadowBlur = 0;

                        } else if (buffEffect.type === 'wind') {
                            // 바람 버프: 소용돌이 나선
                            for (let s = 0; s < 3; s++) {
                                for (let i = 0; i < 18; i++) {
                                    const angle = bP * Math.PI * 8 + (i / 18) * Math.PI * 2 + s * (Math.PI * 2 / 3);
                                    const pR2 = (35 + s * 12) * (0.5 + bP * 0.5) * (1 - i / 18 * 0.4);
                                    const px = bCx + Math.cos(angle) * pR2;
                                    const py = bMidY + Math.sin(angle) * pR2 * 0.45 - bP * 35;
                                    ctx.globalAlpha = bAlpha * (1 - i / 18) * 0.85;
                                    ctx.fillStyle = i % 2 === 0 ? '#88ffcc' : '#44ddff';
                                    ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = 7;
                                    ctx.beginPath(); ctx.arc(px, py, 3 + (i % 3), 0, Math.PI * 2); ctx.fill();
                                }
                            }
                            ctx.shadowBlur = 0;
                            ctx.strokeStyle = '#aaffee'; ctx.lineWidth = 1.5; ctx.globalAlpha = bAlpha * 0.45;
                            for (let i = 0; i < 6; i++) {
                                const a2 = (i / 6) * Math.PI * 2 + bP * 4;
                                ctx.beginPath(); ctx.arc(bCx, bMidY, 25 + bP * 65, a2, a2 + 0.7); ctx.stroke();
                            }

                        } else if (buffEffect.type === 'fire') {
                            // 불 버프: 위로 솟구치는 화염
                            const fSeed = Math.floor(bElapsed / 16);
                            for (let i = 0; i < 22; i++) {
                                const px = bCx + ((fSeed * 11 + i * 43) % 70) - 35;
                                const py = bBotY - bP * 130 - (i * 18) % 90;
                                const fR = Math.max(0, 10 + (i % 3) * 4 - bP * 6);
                                if (fR <= 0 || py < heroY - 30) continue;
                                ctx.globalAlpha = bAlpha * (1 - Math.max(0, py - (heroY + 20)) / (bBotY - heroY)) * 0.9;
                                const fg = ctx.createRadialGradient(px, py, 0, px, py, fR);
                                fg.addColorStop(0, '#ffffff'); fg.addColorStop(0.25, '#ffee44'); fg.addColorStop(0.7, '#ff4400'); fg.addColorStop(1, 'rgba(150,0,0,0)');
                                ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(px, py, fR, 0, Math.PI * 2); ctx.fill();
                            }
                            ctx.globalAlpha = bAlpha * (1 - bP) * 0.55;
                            ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 3; ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 15;
                            ctx.beginPath(); ctx.arc(bCx, bMidY, 20 + bP * 70, 0, Math.PI * 2); ctx.stroke();
                            ctx.shadowBlur = 0;

                        } else if (buffEffect.type === 'nature') {
                            // 자연 버프: 초록 나선 상승
                            for (let i = 0; i < 18; i++) {
                                const angle = (i / 18) * Math.PI * 5 + bP * 3;
                                const dist = 25 + (i / 18) * 40;
                                const px = bCx + Math.cos(angle) * dist * 0.55;
                                const py = bMidY + Math.sin(angle) * dist * 0.45 - bP * 95 * (i / 18);
                                const sR = Math.max(0, 6 + (i % 3) * 2 - bP * 3);
                                ctx.globalAlpha = Math.max(0, bAlpha * (1 - bP * 0.6) * ((i % 3) * 0.3 + 0.5));
                                ctx.fillStyle = i % 2 === 0 ? '#44ff88' : '#aaff44';
                                ctx.shadowColor = '#00dd44'; ctx.shadowBlur = 10;
                                ctx.beginPath(); ctx.arc(px, py, sR, 0, Math.PI * 2); ctx.fill();
                            }
                            ctx.shadowBlur = 0;
                            ctx.globalAlpha = bAlpha * 0.4;
                            const ng = ctx.createRadialGradient(bCx, bMidY, 0, bCx, bMidY, 75);
                            ng.addColorStop(0, 'rgba(60,220,80,0.7)'); ng.addColorStop(1, 'rgba(0,150,0,0)');
                            ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(bCx, bMidY, 75, 0, Math.PI * 2); ctx.fill();

                        } else if (buffEffect.type === 'summon') {
                            // 소환 버프: 보라색 마법진 + 유령 오브
                            const cR = 25 + bP * 65;
                            ctx.globalAlpha = bAlpha * (1 - bP * 0.5) * 0.8;
                            ctx.strokeStyle = '#cc55ff'; ctx.lineWidth = 2.5; ctx.shadowColor = '#9900cc'; ctx.shadowBlur = 20;
                            ctx.beginPath(); ctx.arc(bCx, bMidY, cR, 0, Math.PI * 2); ctx.stroke();
                            ctx.beginPath();
                            for (let i = 0; i < 5; i++) {
                                const a = (i / 5) * Math.PI * 2 - Math.PI / 2 + bP * Math.PI;
                                const px = bCx + Math.cos(a) * cR * 0.78;
                                const py = bMidY + Math.sin(a) * cR * 0.78;
                                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                            }
                            ctx.closePath(); ctx.stroke(); ctx.shadowBlur = 0;
                            for (let i = 0; i < 8; i++) {
                                const a = (i / 8) * Math.PI * 2 + bP * 2.5;
                                const dist = 20 + bP * 65;
                                const px = bCx + Math.cos(a) * dist;
                                const py = bMidY + Math.sin(a) * dist * 0.6 - bP * 25;
                                ctx.globalAlpha = bAlpha * (1 - bP) * 0.9;
                                ctx.fillStyle = i % 2 === 0 ? '#dd88ff' : '#aa44ee';
                                ctx.shadowColor = '#9900ff'; ctx.shadowBlur = 12;
                                ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
                            }
                            ctx.shadowBlur = 0;

                        } else if (buffEffect.type === 'heal') {
                            // 회복 버프: 십자 + 초록 글로우
                            const crossS = 18 + bP * 45;
                            ctx.globalAlpha = bAlpha * (1 - bP * 0.4) * 0.9;
                            ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 22;
                            ctx.fillStyle = '#aaffcc';
                            ctx.fillRect(bCx - 5, bMidY - crossS, 10, crossS * 2);
                            ctx.fillRect(bCx - crossS, bMidY - 5, crossS * 2, 10);
                            ctx.shadowBlur = 0;
                            ctx.globalAlpha = bAlpha * 0.38;
                            const hg = ctx.createRadialGradient(bCx, bMidY, 0, bCx, bMidY, 78);
                            hg.addColorStop(0, 'rgba(100,255,150,0.7)'); hg.addColorStop(1, 'rgba(0,200,80,0)');
                            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(bCx, bMidY, 78, 0, Math.PI * 2); ctx.fill();
                            for (let i = 0; i < 12; i++) {
                                const px = bCx + ((i * 37 + 5) % 56) - 28;
                                const py = bBotY - bP * 80 - (i * 22) % 55;
                                if (py < heroY - 25) continue;
                                ctx.globalAlpha = bAlpha * (1 - bP) * 0.8;
                                ctx.fillStyle = i % 2 === 0 ? '#88ffaa' : '#ffffff';
                                ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 7;
                                ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
                            }
                            ctx.shadowBlur = 0;

                        } else {
                            // 기본 버프 fallback
                            const fc = { r: 200, g: 200, b: 255 };
                            ctx.globalAlpha = bAlpha * 0.6;
                            const fg2 = ctx.createRadialGradient(bCx, bMidY, 5, bCx, bMidY, 55);
                            fg2.addColorStop(0, `rgba(${fc.r},${fc.g},${fc.b},0.7)`); fg2.addColorStop(1, `rgba(${fc.r},${fc.g},${fc.b},0)`);
                            ctx.fillStyle = fg2; ctx.beginPath(); ctx.ellipse(bCx, bMidY, 55, 70, 0, 0, Math.PI * 2); ctx.fill();
                            const seed2 = Math.floor(bElapsed / 30);
                            for (let i = 0; i < 12; i++) {
                                const px = drawX + drawW * 0.15 + ((seed2 * 7 + i * 37) % 100) / 100 * drawW * 0.7;
                                const py = heroY + drawH * 0.8 - bP * 90 - (i * 11) % 40;
                                ctx.globalAlpha = Math.max(0, bAlpha * (0.5 + (i % 3) * 0.2) * (1 - bP));
                                ctx.fillStyle = `rgb(${fc.r},${fc.g},${fc.b})`;
                                ctx.beginPath(); ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
                            }
                        }
                        ctx.restore();
                    }

                    // [추가] 바운스 어택 공격 이펙트 (오렌지색 검기)
                    const isBounceActive = state.combatState?.bounceAttackEndTime && state.combatState.bounceAttackEndTime > Date.now();
                    if (isBounceActive && state.combatState?.isAttacking) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.strokeStyle = 'rgba(255, 140, 0, 0.7)';
                        ctx.lineWidth = 4;
                        ctx.shadowColor = '#ff4500';
                        ctx.shadowBlur = 20;
                        
                        ctx.beginPath();
                        const arcTime = (Date.now() / 150) % 1;
                        const startAngle = -Math.PI / 3;
                        const endAngle = Math.PI / 3;
                        ctx.arc(drawX + drawW / 2 + 30, heroY + drawH / 2, 50, startAngle, startAngle + (endAngle - startAngle) * arcTime);
                        ctx.stroke();
                        
                        // 잔상 효과
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(drawX + drawW / 2 + 35, heroY + drawH / 2, 45, startAngle, startAngle + (endAngle - startAngle) * arcTime);
                        ctx.stroke();
                        ctx.restore();
                    }

                    // [추가] 몬스터 마법 공격 피격 임팩트 (속성별 시각 효과)
                    const playerImpact = state.combatState?.playerImpact;
                    const impactDuration = playerImpact?.element === 'eruption' ? 600 : 300;
                    if (playerImpact && Date.now() - playerImpact.timestamp < impactDuration) {
                        const elapsed = Date.now() - playerImpact.timestamp;
                        const impactAlpha = 1 - (elapsed / impactDuration);
                        const element = playerImpact.element || 'neutral';
                        
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        
                        // 중심부 섬광 (속성에 따라 색상 변경)
                        let glowColor = 'rgba(180, 50, 255, '; // 기본 보라색
                        let strokeColor = 'rgba(220, 150, 255, ';
                        let particleShape = 'arc';
                        
                        if (element === 'fire') {
                            glowColor = 'rgba(255, 60, 0, ';
                            strokeColor = 'rgba(255, 120, 0, ';
                        } else if (element === 'water') {
                            glowColor = 'rgba(0, 150, 255, ';
                            strokeColor = 'rgba(100, 200, 255, ';
                            particleShape = 'diamond';
                        } else if (element === 'wind') {
                            glowColor = 'rgba(150, 255, 150, ';
                            strokeColor = 'rgba(200, 255, 200, ';
                            particleShape = 'tornado';
                        } else if (element === 'earth') {
                            glowColor = 'rgba(139, 69, 19, ';
                            strokeColor = 'rgba(205, 133, 63, ';
                            particleShape = 'box';
                        } else if (element === 'poison') {
                            glowColor = 'rgba(50, 200, 50, ';
                            strokeColor = 'rgba(100, 255, 100, ';
                            particleShape = 'bubble';
                        } else if (element === 'electric') {
                            glowColor = 'rgba(100, 100, 255, ';
                            strokeColor = 'rgba(200, 200, 255, ';
                            particleShape = 'lightning';
                        }

                        ctx.fillStyle = glowColor + `${impactAlpha})`;
                        ctx.beginPath();
                        ctx.arc(drawX + drawW / 2, heroY + drawH / 2 - 20, 60 * impactAlpha, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // 속성별 이펙트
                        if (particleShape === 'lightning' || element === 'neutral') {
                            for(let i=0; i<3; i++) {
                                ctx.strokeStyle = strokeColor + `${impactAlpha})`;
                                ctx.lineWidth = 2 + Math.random() * 2;
                                ctx.beginPath();
                                let startX = drawX + drawW / 2 + (Math.random()*80-40);
                                let startY = heroY - 50;
                                ctx.moveTo(startX, startY);
                                ctx.lineTo(startX + (Math.random()*40-20), startY + 40);
                                ctx.lineTo(startX + (Math.random()*40-20), startY + 80);
                                ctx.lineTo(drawX + drawW / 2, heroY + drawH / 2);
                                ctx.stroke();
                            }
                        } else if (particleShape === 'wind' || particleShape === 'line' || particleShape === 'tornado') {
                            ctx.strokeStyle = strokeColor + `${impactAlpha})`;
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            for(let i=0; i<15; i++) {
                                // Draw tornado using narrowing ellipses from top to bottom
                                let py = heroY - 20 + i * 5;
                                let radiusX = Math.max(2, 30 - i * 1.5);
                                let radiusY = Math.max(1, 8 - i * 0.3);
                                let offsetX = Math.sin(elapsed / 50 + i) * (15 - i * 0.5);
                                ctx.moveTo(drawX + drawW/2 + offsetX + radiusX, py);
                                ctx.ellipse(drawX + drawW/2 + offsetX, py, radiusX, radiusY, 0, 0, Math.PI * 2);
                            }
                            ctx.stroke();
                        } else if (particleShape === 'bubble') {
                            for(let i=0; i<8; i++) {
                                ctx.fillStyle = strokeColor + `${impactAlpha})`;
                                ctx.beginPath();
                                ctx.arc(drawX + Math.random()*drawW, heroY + drawH/2 + Math.random()*40 - (elapsed/300*60), 4 + Math.random()*6, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        } else if (particleShape === 'diamond') {
                            for(let i=0; i<5; i++) {
                                ctx.fillStyle = strokeColor + `${impactAlpha})`;
                                let px = drawX + Math.random()*drawW;
                                let py = heroY + Math.random()*drawH;
                                ctx.beginPath();
                                ctx.moveTo(px, py - 10);
                                ctx.lineTo(px + 10, py);
                                ctx.lineTo(px, py + 10);
                                ctx.lineTo(px - 10, py);
                                ctx.fill();
                            }
                        } else if (element === 'fire') {
                            for(let i=0; i<8; i++) {
                                ctx.fillStyle = strokeColor + `${impactAlpha})`;
                                ctx.beginPath();
                                ctx.arc(drawX + drawW/2 + (Math.random()*60-30), heroY + drawH - (elapsed/300*100) - Math.random()*20, 10 + Math.random()*15, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        } else if (element === 'earth') {
                            for(let i=0; i<6; i++) {
                                ctx.fillStyle = strokeColor + `${impactAlpha})`;
                                ctx.fillRect(drawX + (Math.random()*drawW), heroY + drawH/2 + (Math.random()*40), 15, 15);
                            }
                        } else if (element === 'eruption') {
                            // 이럽션: 바위 덩어리가 바닥에서 솟아나는 이펙트
                            const riseProgress = elapsed / 600;
                            const groundY = heroY + drawH;
                            // 먼지/충격파 원형 (바닥에서)
                            ctx.fillStyle = `rgba(180, 130, 60, ${impactAlpha * 0.35})`;
                            ctx.beginPath();
                            ctx.ellipse(drawX + drawW / 2, groundY, 55 * riseProgress, 12 * riseProgress, 0, 0, Math.PI * 2);
                            ctx.fill();
                            // 바위 덩어리 8개
                            for (let i = 0; i < 8; i++) {
                                const seed1 = Math.sin(i * 137.508) * 0.5 + 0.5;
                                const seed2 = Math.cos(i * 73.14) * 0.5 + 0.5;
                                const offsetX = (seed1 - 0.5) * (drawW + 60);
                                const riseH = 35 + seed2 * 55;
                                const rockY = groundY - riseProgress * riseH;
                                const rw = 9 + seed1 * 13;
                                const rh = 7 + seed2 * 10;
                                const alpha = riseProgress < 0.6
                                    ? impactAlpha
                                    : impactAlpha * (1 - (riseProgress - 0.6) / 0.4);
                                // 바위 본체 (갈색-회색)
                                ctx.fillStyle = `rgba(${100 + seed1 * 50}, ${75 + seed2 * 35}, 30, ${alpha})`;
                                ctx.beginPath();
                                ctx.roundRect(drawX + drawW / 2 + offsetX - rw / 2, rockY - rh, rw, rh, 2);
                                ctx.fill();
                                // 하이라이트
                                ctx.fillStyle = `rgba(200, 170, 90, ${alpha * 0.5})`;
                                ctx.fillRect(drawX + drawW / 2 + offsetX - rw / 2 + 1, rockY - rh + 1, rw * 0.4, rh * 0.3);
                            }
                        }

                        ctx.restore();
                    }

                } catch {
                    ctx.fillStyle = '#4a90e2';
                    ctx.fillRect(drawX, heroY - 60, 40, 60);
                }

                // Player HP Bar
                const playerStats = calculateStats(state);
                const playerMaxHp = getMaxHp(state, playerStats);
                const playerHpPercent = (state.hp / playerMaxHp) * 100;

                // Player HP Bar UI Constants
                const pBarW = 60;
                const pBarH = 6;
                const pBarX = drawX + (drawW - pBarW) / 2;
                const pBarY = heroY - 50 + breathe;

                // Player HP Bar Rendering
                ctx.fillStyle = '#000';
                ctx.fillRect(pBarX, pBarY, pBarW, pBarH);

                let hpColor = '#2ecc71';
                if (playerHpPercent <= 30) hpColor = '#e74c3c';
                else if (playerHpPercent <= 70) hpColor = '#f1c40f';

                ctx.fillStyle = hpColor;
                const cappedHpPercent = Math.min(100, Math.max(0, playerHpPercent));
                ctx.fillRect(pBarX, pBarY, pBarW * (cappedHpPercent / 100), pBarH);

                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(pBarX, pBarY, pBarW, pBarH);

                // Player Name (Nickname)
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 4;
                ctx.fillText(state.characterName || user?.nickname || user?.id || 'Player', drawX + drawW / 2, pBarY - 10); // Positioned above Bar
                ctx.shadowBlur = 0;

            } else {
                ctx.fillStyle = '#4a90e2';
                ctx.fillRect(heroX, heroY - 60, 40, 60);
            }
            ctx.restore(); // 로컬 플레이어 포지션 오프셋 해제

            // 파티원 투사체용 몬스터 좌표 미리 계산
            const partnerTargetMonster = state.combatState?.targetMonsterId
                ? MONSTERS.find(m => m.id === state.combatState.targetMonsterId && m.map === currentMapId)
                : null;
            const ptEndX = (canvas.width / 2) + (partnerTargetMonster?.isExtraLarge ? 55 : 108);
            const ptEndY = (canvas.height / 2) - (partnerTargetMonster?.isExtraLarge ? 60 : 40);

            // [파티 사냥] 파티원 캐릭터 렌더링 (같은 맵 파티원 최대 2명)
            partyPartners.forEach((partner, pIdx) => {
                const partnerClass = partner.characterClass || 'knight';
                // 공격 모션 동기화
                const pLastAttackTs = state.combatState?.partnerLastAttackTimestamp || 0;
                const pAttackInterval = state.combatState?.partnerAttackIntervalMs || 1500;
                const pAttackPhase = pLastAttackTs > 0 ? Math.min(1, (Date.now() - pLastAttackTs) / pAttackInterval) : 1;
                const pIsAttacking = pLastAttackTs > 0 && pAttackPhase < 1;

                let partnerImgToDraw;
                let pLunge = 0;
                if (partnerClass === 'elf') {
                    partnerImgToDraw = (pIsAttacking && pAttackPhase < 0.35)
                        ? (pAttackPhase / 0.35 < 0.45 ? (loadedImages['elf_idle'] || loadedImages['hero']) : (loadedImages['elf_attack'] || loadedImages['hero']))
                        : (loadedImages['elf_idle'] || loadedImages['hero']);
                } else if (partnerClass === 'wizard') {
                    if (pIsAttacking && pAttackPhase < 0.40) {
                        const pp = pAttackPhase / 0.40;
                        partnerImgToDraw = pp < 0.5 ? (loadedImages['wizard_attack1'] || loadedImages['wizard_idle'] || loadedImages['hero']) : (loadedImages['wizard_attack2'] || loadedImages['wizard_idle'] || loadedImages['hero']);
                    } else {
                        partnerImgToDraw = loadedImages['wizard_idle'] || loadedImages['hero'];
                    }
                } else {
                    if (pIsAttacking && pAttackPhase < 0.40) {
                        const pp = pAttackPhase / 0.40;
                        partnerImgToDraw = pp < 0.5 ? (loadedImages['knight_attack1'] || loadedImages['hero']) : (loadedImages['knight_attack2'] || loadedImages['hero']);
                        pLunge = pp < 0.35 ? (pp / 0.35) * 18 : ((0.40 - pp) / 0.05) * 18;
                        pLunge = Math.max(0, Math.min(18, pLunge));
                    } else {
                        partnerImgToDraw = loadedImages['hero'];
                    }
                }
                if (!partnerImgToDraw) partnerImgToDraw = loadedImages['hero'];

                const pAspect = partnerImgToDraw ? partnerImgToDraw.width / partnerImgToDraw.height : 1;
                const pDrawH = 100;
                const pDrawW = pDrawH * pAspect;
                // 정렬된 슬롯에서 이 파티원의 포지션 결정
                const partnerSlotIdx = battleMembers.findIndex(m => !m.isLocal && m.pIdx === pIdx);
                const pBaseX = SLOT_X[partnerSlotIdx] ?? (heroX - 95 - pIdx * 90);
                const pX = pBaseX + pLunge;
                const pY = heroY - 10;
                const pBreathe = Math.sin(Date.now() / 540 + 1.5 + pIdx) * 2;

                // Shadow
                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.beginPath();
                ctx.ellipse(pX + pDrawW / 2, pY + pDrawH - 8, 22, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // 피격 이펙트 (몬스터에게 맞았을 때 빨간 플래시)
                const pMonsterAttackTs = state.combatState?.partnerMonsterAttackTs;
                if (pMonsterAttackTs && Date.now() - pMonsterAttackTs < 220 && pIdx === 0) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = (1 - (Date.now() - pMonsterAttackTs) / 220) * 0.5;
                    ctx.fillStyle = '#ff3300';
                    ctx.beginPath();
                    ctx.ellipse(pX + pDrawW / 2, pY + pDrawH / 2, 35, 50, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // 스킬 시전 이펙트 (파티원이 공격 스킬 사용 시 마법 글로우)
                const pSkillTs = state.combatState?.partnerLastSkillTimestamp;
                if (pSkillTs && pIdx === 0) {
                    const pSkillElapsed = Date.now() - pSkillTs;
                    if (pSkillElapsed < 1200) {
                        const pSkillAlpha = pSkillElapsed < 200
                            ? pSkillElapsed / 200
                            : 1 - (pSkillElapsed - 200) / 1000;
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        // 마법 글로우 (파란-보라 그라디언트)
                        const pSkillGrad = ctx.createRadialGradient(
                            pX + pDrawW / 2, pY + pDrawH / 2, 5,
                            pX + pDrawW / 2, pY + pDrawH / 2, 55
                        );
                        pSkillGrad.addColorStop(0, `rgba(120, 80, 255, ${pSkillAlpha * 0.7})`);
                        pSkillGrad.addColorStop(0.5, `rgba(60, 120, 255, ${pSkillAlpha * 0.4})`);
                        pSkillGrad.addColorStop(1, `rgba(0, 180, 255, 0)`);
                        ctx.fillStyle = pSkillGrad;
                        ctx.beginPath();
                        ctx.ellipse(pX + pDrawW / 2, pY + pDrawH / 2, 55, 70, 0, 0, Math.PI * 2);
                        ctx.fill();
                        // 마법 파티클 (작은 원들)
                        for (let i = 0; i < 6; i++) {
                            const ang = (i / 6) * Math.PI * 2 + pSkillElapsed / 300;
                            const dist = 25 + Math.sin(pSkillElapsed / 100 + i) * 10;
                            const px2 = pX + pDrawW / 2 + Math.cos(ang) * dist;
                            const py2 = pY + pDrawH / 2 + Math.sin(ang) * dist * 0.6;
                            ctx.fillStyle = `rgba(180, 140, 255, ${pSkillAlpha * 0.9})`;
                            ctx.beginPath();
                            ctx.arc(px2, py2, 3 + (i % 2), 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.restore();
                    }
                }

                // ─── 파티원 화살 투사체 (요정) ───────────────────────────────────────
                if (partnerClass === 'elf' && pIsAttacking && partnerTargetMonster) {
                    const arrowStart = 0.60, arrowEnd = 0.97;
                    if (pAttackPhase >= arrowStart && pAttackPhase < arrowEnd) {
                        const t = (pAttackPhase - arrowStart) / (arrowEnd - arrowStart);
                        const aStartX = pX + 55, aStartY = pY + 10;
                        const ax = aStartX + (ptEndX - aStartX) * t;
                        const ay = aStartY + (ptEndY - aStartY) * t;
                        const angle = Math.atan2(ptEndY - aStartY, ptEndX - aStartX);
                        const arrowImg = loadedImages['arrow'];
                        if (arrowImg) {
                            const arrowW = 62, arrowH = arrowW * (arrowImg.height / arrowImg.width);
                            ctx.save();
                            ctx.globalAlpha = 0.88;
                            ctx.translate(ax, ay);
                            ctx.rotate(angle);
                            ctx.drawImage(arrowImg, -arrowW / 2, -arrowH / 2, arrowW, arrowH);
                            ctx.restore();
                        }
                    }
                }

                // ─── 파티원 마법 볼트 투사체 (마법사) ───────────────────────────────
                if (partnerClass === 'wizard' && pIsAttacking && partnerTargetMonster) {
                    const boltStart = 0.05, boltEnd = 0.45;
                    if (pAttackPhase >= boltStart && pAttackPhase < boltEnd) {
                        const t = (pAttackPhase - boltStart) / (boltEnd - boltStart);
                        const bStartX = pX + 75, bStartY = pY - 5;
                        const bx = bStartX + (ptEndX - bStartX) * t;
                        const by = bStartY + (ptEndY - bStartY) * t;
                        const angle = Math.atan2(ptEndY - bStartY, ptEndX - bStartX);
                        ctx.save();
                        ctx.translate(bx, by);
                        ctx.rotate(angle);
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.8 * (1 - t * 0.25);
                        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
                        glowGrad.addColorStop(0, '#aaeeff');
                        glowGrad.addColorStop(0.5, '#44ccff');
                        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = glowGrad;
                        ctx.beginPath();
                        ctx.arc(0, 0, 14, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 0.9;
                        ctx.fillStyle = '#ccf0ff';
                        ctx.beginPath();
                        ctx.arc(0, 0, 4, 0, Math.PI * 2);
                        ctx.fill();
                        // 잔상
                        const trailT = Math.max(0, t - 0.1);
                        const trailX = bStartX + (ptEndX - bStartX) * trailT;
                        const trailY = bStartY + (ptEndY - bStartY) * trailT;
                        ctx.restore();
                        ctx.save();
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 0.2;
                        ctx.fillStyle = '#44ccff';
                        ctx.beginPath();
                        ctx.arc(trailX, trailY, 8, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }

                // Sprite
                ctx.save();
                ctx.globalAlpha = 0.92;
                if (partnerImgToDraw) ctx.drawImage(partnerImgToDraw, pX, pY - 20 + pBreathe, pDrawW, pDrawH);
                ctx.restore();

                // HP Bar
                const pBarW = 50;
                const pBarH = 5;
                const pBarX = pX + (pDrawW - pBarW) / 2;
                const pBarY = pY - 35 + pBreathe;
                const pHpPct = partner.maxHp > 0 ? Math.min(100, Math.max(0, (partner.hp / partner.maxHp) * 100)) : 100;
                ctx.fillStyle = '#000';
                ctx.fillRect(pBarX, pBarY, pBarW, pBarH);
                ctx.fillStyle = pHpPct <= 30 ? '#e74c3c' : pHpPct <= 70 ? '#f1c40f' : '#2ecc71';
                ctx.fillRect(pBarX, pBarY, pBarW * pHpPct / 100, pBarH);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(pBarX, pBarY, pBarW, pBarH);

                // Name (light blue)
                ctx.fillStyle = '#88ccff';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.shadowColor = '#000';
                ctx.shadowBlur = 4;
                ctx.fillText(partner.characterName, pX + pDrawW / 2, pBarY - 6);
                ctx.shadowBlur = 0;
            });

            // Draw Monster
            let monster = state.combatState?.targetMonsterId ? MONSTERS.find(m => m.id === state.combatState.targetMonsterId) : null;
            
            // [Fix] 몬스터가 현재 맵속성이 아니면 (e.g. 마을인데 저장된 타겟이 상어일 경우) 렌더링 무효화
            if (monster && monster.map !== currentMapId) {
                monster = null;
            }
            
            // [Fix] 비전투(idle) 상태이거나 텔레포트 직후라서 targetMonsterId가 없다면
            // 해당 맵에서 현재 시간에 매칭되는 몬스터를 폴백(Ambient)으로 렌더링
            if (!monster && currentMapId !== 'village') {
                const mapMonsters = MONSTERS.filter(m => m.map === currentMapId);
                if (mapMonsters.length > 0) {
                    monster = mapMonsters[Math.floor(Date.now() / 15000) % mapMonsters.length];
                }
            }

            // [개선] 엑스트라 라지(바포메트 등)는 더 가운데로, 일반은 약간 오른쪽
            let monsterX = monster && monster.isExtraLarge ? (canvas.width / 2 + 30) : (canvas.width / 2 + 100);
            let monsterY = monster && monster.isExtraLarge
                ? (canvas.height / 2 - 200)
                : (monster && monster.isLarge
                    ? (canvas.height / 2 - 165)
                    : (canvas.height / 2 - 120));

            if (monster) {
                // Shake Logic & Impact Visuals
                const impact = state.combatState?.impact;
                let shakeX = 0;
                let shakeY = 0;
                let showSpark = false;
                let sparkColor = '#ffffff';
                let sparkSize = 30;

                const _impactDur = impact?.type === 'fire' ? 700 : impact?.type === 'lightning' ? 600 : 400;
                if (impact && Date.now() - impact.timestamp < _impactDur) {
                    const elapsed = Date.now() - impact.timestamp;

                    // Shake Intensity based on impact type
                    let intensity = 5;
                    if (impact.type === 'crit') intensity = 12;
                    if (impact.type === 'stun') intensity = 20;
                    if (impact.type === 'kill') intensity = 8;
                    if (impact.type === 'bolt') intensity = 10;
                    if (impact.type === 'fire') intensity = 8;
                    if (impact.type === 'lightning') intensity = 22;
                    if (impact.type === 'eruption') intensity = 16;

                    // Decaying Shake (only first 300ms)
                    if (elapsed < 300) {
                        const shakeDecay = 1 - (elapsed / 300);
                        shakeX = (Math.random() - 0.5) * intensity * 2 * shakeDecay;
                        shakeY = (Math.random() - 0.5) * intensity * 2 * shakeDecay;
                    }

                    showSpark = true;
                    if (impact.type === 'crit') {
                        sparkColor = '#ffff00'; sparkSize = 50;
                    } else if (impact.type === 'stun') {
                        sparkColor = '#00ffff'; sparkSize = 100;
                    } else if (impact.type === 'kill') {
                        sparkColor = '#ff3333'; sparkSize = 60;
                    } else if (impact.type === 'bolt') {
                        sparkColor = '#44ddff'; sparkSize = 65;
                    } else if (impact.type === 'fire') {
                        sparkColor = '#ff6600'; sparkSize = 70; // 파이어볼: 지면 화염
                    } else if (impact.type === 'lightning') {
                        sparkColor = '#ffffff'; sparkSize = 170; // 콜 라이트닝: 강력한 번개
                    } else if (impact.type === 'eruption') {
                        sparkColor = '#ff4400'; sparkSize = 90;
                    }
                }

                monsterX += shakeX;
                monsterY += shakeY;

                const monsterImg = loadedImages[monster.img];
                const aspect = monsterImg ? monsterImg.width / monsterImg.height : 1;
                const drawH = monster.isExtraLarge ? 350 : (monster.isLarge ? 250 : 200);
                const drawW = drawH * aspect;

                const mHpPercent = state.combatState?.monsterHpPercent !== undefined ? state.combatState.monsterHpPercent : 100;
                const isDying = state.combatState?.isDying || mHpPercent <= 0;

                ctx.save();

                // DEATH ANIMATION
                if (isDying) {
                    const deathElapsed = state.combatState?.deathTimestamp ? Date.now() - state.combatState.deathTimestamp : 0;

                    // Flash White on Death Start
                    if (deathElapsed < 100) {
                        ctx.globalCompositeOperation = 'lighter';
                        ctx.globalAlpha = 1.0;
                        ctx.filter = 'brightness(200%)';
                    } else {
                        // Sink and Fade
                        const sinkY = (deathElapsed / 500) * 30; // Sink 30px
                        const fadeAlpha = Math.max(0, 1 - (deathElapsed / 500));

                        ctx.globalAlpha = fadeAlpha;
                        ctx.translate(0, sinkY); // Move down

                        // Blink
                        if (Math.floor(Date.now() / 50) % 2 === 0) {
                            ctx.globalAlpha = fadeAlpha * 0.5;
                        }
                    }

                    // Rotate slightly
                    ctx.translate(monsterX + drawW / 2, monsterY + drawH);
                    ctx.rotate((deathElapsed / 500) * 90 * Math.PI / 180); // Rotate up to 90deg
                    ctx.translate(-(monsterX + drawW / 2), -(monsterY + drawH));
                }

                if (!isDying) {
                    ctx.save();
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = 'rgba(0,0,0,0.6)';
                    ctx.fillStyle = 'rgba(0,0,0,0.4)';
                    ctx.beginPath();
                    ctx.ellipse(monsterX + drawW / 2, monsterY + drawH - 10, 60, 20, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                if (monsterImg) {
                    // Fix: Only draw if not dying, OR if dying with valid timestamp
                    const isValidDeath = isDying && state.combatState.deathTimestamp;

                    if (!isDying || isValidDeath) {
                        // 좌우 반전 (캐릭터 방향으로 바라보도록)
                        ctx.save();
                        ctx.scale(-1, 1);
                        ctx.drawImage(monsterImg, -(monsterX + drawW), monsterY, drawW, drawH);
                        ctx.restore();
                    }
                } else {
                    // Fallback: Red Box with Name
                    ctx.fillStyle = '#ff5555';
                    ctx.fillRect(monsterX, monsterY, drawW, drawH);

                    ctx.fillStyle = '#fff';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('NO IMG', monsterX + drawW / 2, monsterY + drawH / 2);
                    ctx.fillText(monster.name, monsterX + drawW / 2, monsterY + drawH / 2 + 15);
                }

                ctx.restore();

                // ... (spark logic same)

                // HIT SPARK (가벼운 타격감)
                if (showSpark) {
                    const hitElapsed = Date.now() - impact.timestamp;
                    const isMagicSpell = ['bolt', 'fire', 'lightning', 'eruption'].includes(impact.type);
                    const hitDur = impact.type === 'fire' ? 700 : impact.type === 'lightning' ? 600 : isMagicSpell ? 400 : 180;
                    const hitAlpha = Math.max(0, 1 - hitElapsed / hitDur);
                    const cx = monsterX + drawW / 2;
                    const cy = monsterY + drawH / 2;
                    const r = sparkSize * 0.7;

                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';

                    // 중심 플래시
                    ctx.globalAlpha = hitAlpha * (isMagicSpell ? 0.55 : 0.45);
                    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                    grad.addColorStop(0, '#ffffff');
                    grad.addColorStop(0.4, sparkColor);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fill();

                    // 마법 스펠 추가 이펙트
                    if (impact.type === 'bolt') {
                        // 전기 볼트: 지그재그 번개선 6개
                        ctx.globalAlpha = hitAlpha * 0.75;
                        ctx.strokeStyle = '#aaeeff';
                        ctx.lineWidth = 1.5;
                        ctx.shadowColor = '#44ddff';
                        ctx.shadowBlur = 6;
                        for (let i = 0; i < 6; i++) {
                            const baseAngle = (i / 6) * Math.PI * 2;
                            ctx.beginPath();
                            ctx.moveTo(cx, cy);
                            let lx = cx, ly = cy;
                            for (let s = 0; s < 3; s++) {
                                const sa = baseAngle + (Math.random() - 0.5) * 0.6;
                                lx += Math.cos(sa) * (r / 3);
                                ly += Math.sin(sa) * (r / 3);
                                ctx.lineTo(lx, ly);
                            }
                            ctx.stroke();
                        }
                        ctx.shadowBlur = 0;
                    } else if (impact.type === 'fire') {
                        // 파이어볼 착지: 바닥에서 화염이 피어올라 몸을 덮치는 효과
                        const fP = hitElapsed / hitDur;
                        const groundY = monsterY + drawH * 0.9; // 발 위치
                        const bodyHeight = drawH * 0.85;

                        // 1) 착지 순간 지면 발화 (작은 타격 플래시 0~0.2)
                        if (fP < 0.22) {
                            const gFlash = (1 - fP / 0.22);
                            ctx.globalAlpha = hitAlpha * gFlash * 0.85;
                            const gGrd = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, r * 1.1);
                            gGrd.addColorStop(0, '#ffee88');
                            gGrd.addColorStop(0.35, '#ff6600');
                            gGrd.addColorStop(1, 'rgba(180,30,0,0)');
                            ctx.fillStyle = gGrd;
                            ctx.beginPath();
                            ctx.ellipse(cx, groundY, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
                            ctx.fill();
                        }

                        // 2) 지면 잔광 (타원형 불꽃 바닥)
                        const groundGlow = Math.sin(fP * Math.PI) * 0.6;
                        if (groundGlow > 0) {
                            ctx.globalAlpha = hitAlpha * groundGlow;
                            const gBaseGrd = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, r * 0.9);
                            gBaseGrd.addColorStop(0, 'rgba(255,180,0,0.9)');
                            gBaseGrd.addColorStop(0.5, 'rgba(255,80,0,0.5)');
                            gBaseGrd.addColorStop(1, 'rgba(180,20,0,0)');
                            ctx.fillStyle = gBaseGrd;
                            ctx.beginPath();
                            ctx.ellipse(cx, groundY, r * 0.9, r * 0.28, 0, 0, Math.PI * 2);
                            ctx.fill();
                        }

                        // 3) 위로 솟구치는 화염 기둥 10개
                        for (let i = 0; i < 10; i++) {
                            const flameDelay = (i % 5) * 0.06;
                            const flameP = Math.max(0, Math.min(1, (fP - flameDelay) / 0.88));
                            if (flameP <= 0) continue;

                            const angle = (i / 10) * Math.PI * 2;
                            const xOff = Math.cos(angle) * r * 0.3 + Math.sin(fP * 6 + i * 1.3) * r * 0.12;
                            const riseRatio = Math.min(1, flameP * 1.3); // 빠르게 올라오고 천천히 사라짐
                            const flameTop = groundY - bodyHeight * riseRatio;
                            const segments = 7;

                            for (let s = 0; s < segments; s++) {
                                const sR = s / segments; // 0=바닥, 1=꼭대기
                                if (sR > riseRatio) continue;
                                const sY = groundY - sR * bodyHeight;
                                const wobble = Math.sin(fP * 9 + i * 0.9 + s * 0.7) * r * 0.08;
                                const sX = cx + xOff + wobble;
                                const fade = 1 - sR; // 위로 갈수록 투명
                                const shrink = 1 - sR * 0.6;
                                const sRad = r * 0.28 * shrink * (1 - Math.max(0, flameP - 0.7) * 2.5);
                                if (sRad <= 0) continue;

                                ctx.globalAlpha = hitAlpha * fade * (1 - Math.max(0, flameP - 0.65) * 2) * 0.8;
                                const seg_grd = ctx.createRadialGradient(sX, sY, 0, sX, sY, sRad);
                                if (sR < 0.3) {
                                    seg_grd.addColorStop(0, '#fff8aa');
                                    seg_grd.addColorStop(0.4, '#ffaa00');
                                    seg_grd.addColorStop(1, 'rgba(230,60,0,0)');
                                } else if (sR < 0.65) {
                                    seg_grd.addColorStop(0, '#ffcc22');
                                    seg_grd.addColorStop(0.45, '#ff5500');
                                    seg_grd.addColorStop(1, 'rgba(180,20,0,0)');
                                } else {
                                    seg_grd.addColorStop(0, '#ff6600');
                                    seg_grd.addColorStop(0.5, '#cc2200');
                                    seg_grd.addColorStop(1, 'rgba(80,0,0,0)');
                                }
                                ctx.fillStyle = seg_grd;
                                ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 10;
                                ctx.beginPath(); ctx.arc(sX, sY, sRad, 0, Math.PI * 2); ctx.fill();
                            }
                        }
                        ctx.shadowBlur = 0;

                        // 4) 위로 흩날리는 불씨 파티클 14개
                        for (let i = 0; i < 14; i++) {
                            const pDelay = (i / 14) * 0.25;
                            const pP = Math.max(0, Math.min(1, (fP - pDelay) / 0.75));
                            if (pP <= 0 || pP >= 1) continue;

                            const pAngle = (i / 14) * Math.PI * 2 + pP * 0.4;
                            const spread = r * 0.45 + (i % 3) * r * 0.1;
                            const px = cx + Math.cos(pAngle) * spread * pP;
                            const py = groundY - pP * bodyHeight * 1.15 - (i % 4) * 8;
                            const pRad = Math.max(0, 4 + (i % 4) * 2 - pP * 9);
                            if (pRad <= 0) continue;

                            ctx.globalAlpha = hitAlpha * (1 - pP * 0.9) * 0.85;
                            ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 8;
                            ctx.fillStyle = pP < 0.45 ? '#ffdd44' : '#ff7700';
                            ctx.beginPath(); ctx.arc(px, py, pRad, 0, Math.PI * 2); ctx.fill();
                        }
                        ctx.shadowBlur = 0;

                    } else if (impact.type === 'lightning') {
                        // 콜 라이트닝: 하늘에서 내리꽂는 번개
                        const lP = hitElapsed / hitDur;
                        const topY = -20; // 화면 위쪽

                        // 1) 수직 번개 볼트 (0~0.55)
                        if (lP < 0.55) {
                            const bA = hitAlpha * (lP < 0.15 ? lP / 0.15 : 1 - (lP - 0.15) / 0.4);
                            // 외곽 글로우 볼트
                            ctx.globalAlpha = bA * 0.35;
                            ctx.strokeStyle = '#6688ff'; ctx.lineWidth = 14;
                            ctx.shadowColor = '#4466ff'; ctx.shadowBlur = 30;
                            ctx.beginPath(); ctx.moveTo(cx, topY);
                            let bx1 = cx, by1 = topY;
                            for (let s = 0; s < 14; s++) {
                                bx1 += (Math.random() - 0.5) * 22;
                                by1 += (cy - topY) / 14;
                                ctx.lineTo(bx1, by1);
                            }
                            ctx.lineTo(cx, cy); ctx.stroke();

                            // 메인 번개 + 가지
                            ctx.globalAlpha = bA * 0.95;
                            ctx.strokeStyle = '#eeeeff'; ctx.lineWidth = 3;
                            ctx.shadowColor = '#aaccff'; ctx.shadowBlur = 20;
                            ctx.beginPath(); ctx.moveTo(cx, topY);
                            let bx2 = cx, by2 = topY;
                            for (let s = 0; s < 14; s++) {
                                bx2 += (Math.random() - 0.5) * 18;
                                by2 += (cy - topY) / 14;
                                ctx.lineTo(bx2, by2);
                                // 가지 번개
                                if (s > 2 && s < 12 && Math.random() < 0.35) {
                                    const brDir = Math.random() > 0.5 ? 1 : -1;
                                    const brLen = 25 + Math.random() * 45;
                                    ctx.save();
                                    ctx.beginPath();
                                    ctx.moveTo(bx2, by2);
                                    ctx.lineTo(bx2 + brDir * brLen, by2 + brLen * 0.8);
                                    ctx.strokeStyle = '#aaccff'; ctx.lineWidth = 1.5;
                                    ctx.globalAlpha = bA * 0.5; ctx.stroke();
                                    ctx.restore();
                                }
                            }
                            ctx.lineTo(cx, cy); ctx.stroke();

                            // 코어 (밝은 중심선)
                            ctx.globalAlpha = bA;
                            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
                            ctx.shadowBlur = 5;
                            ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx, cy); ctx.stroke();
                            ctx.shadowBlur = 0;
                        }

                        // 2) 충격 지점 방전 플래시
                        if (lP < 0.35) {
                            const flashA = hitAlpha * (1 - lP / 0.35) * 1.0;
                            ctx.globalAlpha = flashA;
                            const flashGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.8);
                            flashGrd.addColorStop(0, '#ffffff');
                            flashGrd.addColorStop(0.2, '#aaddff');
                            flashGrd.addColorStop(1, 'rgba(80,100,255,0)');
                            ctx.fillStyle = flashGrd;
                            ctx.beginPath(); ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2); ctx.fill();
                        }

                        // 3) 팽창 충격파 링 2개
                        for (let ring = 0; ring < 2; ring++) {
                            const rP = Math.max(0, lP - ring * 0.12);
                            const rr = r * 0.15 + rP * r * 2.2;
                            ctx.globalAlpha = hitAlpha * (1 - rP) * 0.75;
                            ctx.strokeStyle = ring === 0 ? '#ffffff' : '#88aaff';
                            ctx.lineWidth = ring === 0 ? 4 : 2;
                            ctx.shadowColor = '#aaccff'; ctx.shadowBlur = 18;
                            ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
                        }
                        ctx.shadowBlur = 0;

                        // 4) 지면 전기 방전 12가닥
                        ctx.globalAlpha = hitAlpha * 0.85;
                        ctx.strokeStyle = '#ccddff'; ctx.lineWidth = 1.5;
                        ctx.shadowColor = '#8899ff'; ctx.shadowBlur = 10;
                        for (let i = 0; i < 12; i++) {
                            const baseA = (i / 12) * Math.PI * 2;
                            ctx.beginPath(); ctx.moveTo(cx, cy);
                            let lx = cx, ly = cy;
                            for (let s = 0; s < 4; s++) {
                                const sa = baseA + (Math.random() - 0.5) * 0.8;
                                lx += Math.cos(sa) * (r * 0.3 + Math.random() * r * 0.2);
                                ly += Math.sin(sa) * (r * 0.25);
                                ctx.lineTo(lx, ly);
                            }
                            ctx.stroke();
                        }
                        ctx.shadowBlur = 0;
                    } else if (impact.type === 'eruption') {
                        // 이럽션: 강력한 지면 폭발 애니메이션 (리니지 스타일)
                        const eProgress = hitElapsed / hitDur;

                        // === 1. 강력한 지면 크랙 애니메이션 ===
                        if (eProgress < 0.2) {
                            const crackPhase = eProgress / 0.2; // 0 ~ 1
                            ctx.globalAlpha = hitAlpha * (1 - crackPhase) * 0.8;

                            // 여러 방향의 갈라짐
                            for (let dir = 0; dir < 4; dir++) {
                                const angle = (dir / 4) * Math.PI * 2;
                                ctx.strokeStyle = '#6B5344';
                                ctx.lineWidth = 3 + crackPhase * 2;
                                ctx.lineCap = 'round';

                                // 중심에서 밖으로 뻗어나가는 크랙
                                ctx.beginPath();
                                ctx.moveTo(cx, monsterY + drawH - 5);
                                for (let seg = 0; seg < 3; seg++) {
                                    const dist = (seg / 2) * 100 * crackPhase;
                                    const offsetAngle = angle + (Math.random() - 0.5) * 0.3;
                                    const x = cx + Math.cos(offsetAngle) * dist;
                                    const y = monsterY + drawH - 5 - dist * 0.3;
                                    ctx.lineTo(x, y);
                                }
                                ctx.stroke();
                            }

                            // 지면 흔들림 효과 (물결무늬)
                            ctx.globalAlpha = hitAlpha * (1 - crackPhase) * 0.4;
                            ctx.strokeStyle = '#8B7355';
                            ctx.lineWidth = 1;
                            for (let wave = 0; wave < 3; wave++) {
                                ctx.beginPath();
                                for (let x = -80; x <= 80; x += 10) {
                                    const y = (monsterY + drawH - 5) + Math.sin((x + eProgress * 200) / 30) * (5 - wave * 2);
                                    if (x === -80) ctx.moveTo(cx + x, y);
                                    else ctx.lineTo(cx + x, y);
                                }
                                ctx.stroke();
                            }
                        }

                        // === 2. 거대한 바위들 폭발적으로 솟구침 ===
                        ctx.globalAlpha = hitAlpha;
                        const rockCount = 8; // 더 많은 바위

                        for (let i = 0; i < rockCount; i++) {
                            const baseAngle = (i / rockCount) * Math.PI * 2;
                            const angleVariation = (Math.random() - 0.5) * 0.6;
                            const a = baseAngle + angleVariation;

                            // 더 멀리, 더 빠르게 퍼짐
                            const maxDist = 160; // 120 -> 160
                            const expandForce = eProgress < 0.4
                                ? eProgress / 0.4
                                : 1; // 초기 0.4초 동안 빠르게 확장
                            const dist = r * 0.15 + expandForce * maxDist;

                            // 위로 솟구치는 힘 (더 높이, 더 극적)
                            const peakHeight = drawH * 1.2; // 상승 높이 증가
                            const gravityEffect = Math.max(0, 1 - (eProgress - 0.15) * 0.9);
                            const upwardForce = eProgress < 0.25
                                ? eProgress / 0.25
                                : Math.max(0, 1 - (eProgress - 0.25) * 0.85);
                            const upwardMotion = upwardForce * peakHeight * (1 + (Math.random() - 0.5) * 0.4);
                            const fallDistance = Math.max(0, (eProgress - 0.25) * 200 * gravityEffect);

                            const px = cx + Math.cos(a) * dist;
                            const py = (monsterY + drawH - 10) - upwardMotion + fallDistance;

                            // 거대한 바위 크기 (12~30 -> 18~50)
                            const baseSize = 18 + (Math.random() - 0.5) * 10;
                            const rockSize = baseSize + eProgress * 32;
                            const rockAlpha = eProgress < 0.3
                                ? eProgress / 0.3
                                : Math.max(0, 1 - (eProgress - 0.3) / 0.7);

                            // 큰 바위는 회색, 작은 바위는 용암색 섞음
                            const isLavaRock = Math.random() > 0.6;
                            const pg = ctx.createRadialGradient(px - 6, py - 6, 0, px + 6, py + 6, rockSize);

                            if (isLavaRock) {
                                // 용암 바위: 밝은 주황색
                                pg.addColorStop(0, '#ffaa44');
                                pg.addColorStop(0.6, '#ff6600');
                                pg.addColorStop(1, '#990000');
                            } else {
                                // 일반 바위: 회색
                                pg.addColorStop(0, '#bbbbbb');
                                pg.addColorStop(0.5, '#666666');
                                pg.addColorStop(1, '#222222');
                            }

                            ctx.globalAlpha = hitAlpha * rockAlpha * 0.95;
                            ctx.fillStyle = pg;
                            ctx.beginPath();
                            ctx.arc(px, py, rockSize, 0, Math.PI * 2);
                            ctx.fill();

                            // 바위 그림자/테두리 (강력한 느낌)
                            ctx.globalAlpha = hitAlpha * rockAlpha * 0.6;
                            ctx.shadowColor = 'rgba(0,0,0,0.8)';
                            ctx.shadowBlur = 8;
                            ctx.strokeStyle = isLavaRock ? '#660000' : '#000000';
                            ctx.lineWidth = 3;
                            ctx.stroke();
                            ctx.shadowBlur = 0;
                        }

                        // === 3. 강렬한 먼지/흙 폭발 구름 ===
                        if (eProgress > 0.1 && eProgress < 0.85) {
                            // 메인 먼지 구름 (갈색)
                            ctx.globalAlpha = hitAlpha * Math.max(0, 1 - eProgress * 1.2) * 0.5;
                            ctx.fillStyle = '#8B7355';
                            const dustPhase = Math.min(1, eProgress / 0.3); // 처음 0.3초 동안 최대

                            for (let i = 0; i < 6; i++) {
                                const angle = (i / 6) * Math.PI * 2;
                                const dustDist = 50 + dustPhase * 120;
                                const dustSpread = 40 + eProgress * 80;

                                const dustX = cx + Math.cos(angle) * dustDist;
                                const dustY = (monsterY + drawH - 20) - dustPhase * 100 - eProgress * 60;
                                const dustSize = 20 + Math.random() * 35;

                                ctx.beginPath();
                                ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
                                ctx.fill();
                            }

                            // 밝은 황색 흙입자들 (더 극적)
                            ctx.globalAlpha = hitAlpha * Math.max(0, 1 - eProgress * 1.3) * 0.4;
                            ctx.fillStyle = '#FFD700';
                            for (let i = 0; i < 10; i++) {
                                const angle = Math.random() * Math.PI * 2;
                                const distance = Math.random() * 150;
                                const px = cx + Math.cos(angle) * distance;
                                const py = (monsterY + drawH - 15) - Math.random() * 100 - eProgress * 50;
                                const size = 3 + Math.random() * 8;

                                ctx.beginPath();
                                ctx.arc(px, py, size, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        }

                        // === 4. 중앙 충격파 빛 효과 ===
                        if (eProgress < 0.3) {
                            ctx.globalAlpha = hitAlpha * (1 - eProgress / 0.3) * 0.6;
                            ctx.globalCompositeOperation = 'lighter';

                            const shockWaveRadius = eProgress / 0.3 * 150;
                            const shockGrad = ctx.createRadialGradient(cx, monsterY + drawH - 10, 0, cx, monsterY + drawH - 10, shockWaveRadius);
                            shockGrad.addColorStop(0, '#ffaa00');
                            shockGrad.addColorStop(0.5, '#ff6600');
                            shockGrad.addColorStop(1, 'rgba(255,100,0,0)');

                            ctx.fillStyle = shockGrad;
                            ctx.beginPath();
                            ctx.arc(cx, monsterY + drawH - 10, shockWaveRadius, 0, Math.PI * 2);
                            ctx.fill();

                            ctx.globalCompositeOperation = 'source-over';
                        }
                    } else {
                        // 기본 스파크 4줄
                        ctx.globalAlpha = hitAlpha * 0.35;
                        ctx.strokeStyle = sparkColor;
                        ctx.lineWidth = 1.5;
                        for (let i = 0; i < 4; i++) {
                            const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
                            ctx.beginPath();
                            ctx.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
                            ctx.lineTo(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85);
                            ctx.stroke();
                        }
                    }

                    ctx.restore();
                }

                // HP Bar & Name — 캐릭터 체력바와 동일 크기, 머리 바로 위
                const mBarW = 60;
                const mBarH = 6;
                const mBarX = monsterX + (drawW - mBarW) / 2;
                const mBarY = monsterY - 8;

                // Fix: Completely hide HP Bar if dying to prevent "Ghost Border"
                if (!isDying) {
                    // Empty Bar Background
                    ctx.fillStyle = '#000';
                    ctx.fillRect(mBarX, mBarY, mBarW, mBarH);

                    // Health Fill
                    let hpColor = '#2ecc71'; // Green
                    if (mHpPercent <= 30) hpColor = '#e74c3c'; // Red
                    else if (mHpPercent <= 70) hpColor = '#f1c40f'; // Yellow

                    ctx.fillStyle = hpColor;
                    const cappedMHpPercent = Math.min(100, Math.max(0, mHpPercent));
                    ctx.fillRect(mBarX, mBarY, mBarW * (cappedMHpPercent / 100), mBarH);

                    // Border
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(mBarX, mBarY, mBarW, mBarH);

                    // Name
                    ctx.fillStyle = '#ff5555';
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.shadowColor = '#000';
                    ctx.shadowBlur = 4;
                    ctx.fillText(state.combatState?.targetMonsterId ? (MONSTERS.find(m => m.id === state.combatState.targetMonsterId)?.name || 'Enemy') : '', monsterX + drawW / 2, mBarY - 5);
                    ctx.shadowBlur = 0;
                }

                // [파티] 파티원 공격 이펙트 (시안색 플래시)
                const partnerHitTs = state.combatState?.partnerHitTimestamp;
                if (partnerHitTs && Date.now() - partnerHitTs < 250) {
                    const phAlpha = 1 - (Date.now() - partnerHitTs) / 250;
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = phAlpha * 0.35;
                    ctx.fillStyle = '#00e5ff';
                    ctx.beginPath();
                    ctx.arc(monsterX + drawW / 2, monsterY + drawH / 2, 45, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // STUN EFFECT VISUAL (Inside monster block for access to drawW)
                const isMonsterStunned = state.combatState?.isMonsterStunned && state.combatState.isMonsterStunned > Date.now();
                if (isMonsterStunned && !state.combatState?.isDying) {
                    ctx.save();
                    const stunElapsed = Date.now();
                    const starCount = 3;
                    const radius = 30;
                    const headX = monsterX + drawW / 2;
                    const headY = monsterY - 20;

                    for (let i = 0; i < starCount; i++) {
                        const angle = (stunElapsed / 200) + (i * (Math.PI * 2) / starCount);
                        const sx = headX + Math.cos(angle) * radius;
                        const sy = headY + Math.sin(angle) * (radius / 3); // Oval rotation

                        ctx.fillStyle = '#ffff00';
                        ctx.shadowColor = '#ffff00';
                        ctx.shadowBlur = 10;
                        ctx.beginPath();
                        drawStar(ctx, sx, sy, 5, 8, 4);
                        ctx.fill();
                    }
                    ctx.restore();
                }
            }



            // LEVEL UP VISUAL
            const levelUpEffect = state.combatState?.levelUpEffect;
            if (levelUpEffect && Date.now() - levelUpEffect.timestamp < 3000) {
                const elapsed = Date.now() - levelUpEffect.timestamp;
                const floatY = (elapsed / 3000) * 50;
                const alpha = elapsed < 2500 ? 1 : (1 - (elapsed - 2500) / 500);

                ctx.save();
                ctx.globalAlpha = Math.max(0, alpha);
                ctx.font = 'bold 40px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffd700'; // Gold
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;

                // Glow
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 20;

                ctx.strokeText("LEVEL UP!!", heroX + 20, heroY - 100 - floatY);
                ctx.fillText("LEVEL UP!!", heroX + 20, heroY - 100 - floatY);
                ctx.restore();
            }

            // Damage Numbers (Dynamic Impact Text)
            if (state.combatState?.damageNumbers) {
                state.combatState.damageNumbers.forEach(dn => {
                    const age = Date.now() - dn.timestamp;
                    if (age < 1000) {
                        const floatY = (age / 1000) * 45; // [Fix] 위로 솟구치는 반경 확대
                        const alpha = 1 - (age / 1000);

                        ctx.save();
                        ctx.globalAlpha = alpha;
                        // [Fix] 폰트 크기 대폭 확대 (20px -> 36px) 및 두께 강조
                        ctx.font = '900 36px Arial Black, sans-serif';
                        ctx.lineWidth = 3;

                        let dX, dY;

                        if (dn.isPlayerDamage) {
                            dX = heroX + 40;
                            // 플레이어쪽 데미지는 약간 다르게 움직임
                            dY = heroY - 80 - floatY * 0.8;
                            ctx.fillStyle = '#ff2222';
                            ctx.strokeStyle = '#220000';
                            ctx.shadowColor = '#ff2222';
                            ctx.shadowBlur = 10;
                        } else if (dn.isMagic) {
                            // 마법 데미지 (자동 공격 마법): 파란색
                            dX = monsterX + 50 + (Math.random() * 10 - 5);
                            dY = monsterY - 80 - floatY;
                            ctx.fillStyle = '#4488ff';
                            ctx.strokeStyle = '#001144';
                            ctx.shadowColor = '#4488ff';
                            ctx.shadowBlur = 14;
                        } else if (dn.isSkill) {
                            // 스킬 데미지 (트리플 애로우): 하늘색, 화살별 xOff 적용
                            dX = monsterX + 50 + (dn.xOff || 0);
                            dY = monsterY - 80 - floatY;
                            ctx.font = '900 30px Arial Black, sans-serif';
                            ctx.fillStyle = '#00e5ff';
                            ctx.strokeStyle = '#004466';
                            ctx.shadowColor = '#00e5ff';
                            ctx.shadowBlur = 16;
                        } else if (dn.isPartnerDamage) {
                            // 파티원 데미지: 시안(마법) / 연녹(물리) — 오른쪽에 표시
                            dX = monsterX + 80 + (dn.xOff || 0);
                            dY = monsterY - 60 - floatY;
                            ctx.font = '900 28px Arial Black, sans-serif';
                            ctx.fillStyle = dn.isMagic ? '#44ccff' : '#88ff44';
                            ctx.strokeStyle = dn.isMagic ? '#002244' : '#113300';
                            ctx.shadowColor = dn.isMagic ? '#44ccff' : '#88ff44';
                            ctx.shadowBlur = 12;
                        } else if (dn.isElemental) {
                            // 정령 동반 데미지: 청록색, 왼쪽에 작게 표시
                            dX = monsterX + 20 + (Math.random() * 10 - 5);
                            dY = monsterY - 55 - floatY;
                            ctx.font = '900 20px Arial Black, sans-serif';
                            ctx.fillStyle = '#00e5cc';
                            ctx.strokeStyle = '#003322';
                            ctx.shadowColor = '#00e5cc';
                            ctx.shadowBlur = 10;
                        } else {
                            dX = monsterX + 50 + (Math.random() * 10 - 5); // 살짝 흩어지는 텍스트
                            dY = monsterY - 80 - floatY;
                            ctx.fillStyle = '#ffea00';
                            ctx.strokeStyle = '#553300';
                            ctx.shadowColor = '#ffea00';
                            ctx.shadowBlur = 12;
                        }

                        // 외곽선 후 텍스트 채우기로 깔끔하고 강렬하게
                        ctx.strokeText(dn.value, dX, dY);
                        ctx.fillText(dn.value, dX, dY);
                        ctx.restore();
                    }
                });
            }

            // [파티] 몬스터 → 파티원 공격 라인 (같은 맵 파티원이 있을 때)
            if (partnerOnSameMap && monster && !state.combatState?.isDying) {
                const pMonsterAttackTs = state.combatState?.partnerMonsterAttackTs;
                if (pMonsterAttackTs && Date.now() - pMonsterAttackTs < 300) {
                    const lineAlpha = 1 - (Date.now() - pMonsterAttackTs) / 300;
                    // 몬스터 크기 재계산 (if(monster) 블록 밖이므로 const drawW/drawH 미접근)
                    const mImg = loadedImages[monster.img];
                    const mAspect = mImg ? mImg.width / mImg.height : 1;
                    const mDH = monster.isExtraLarge ? 350 : (monster.isLarge ? 250 : 200);
                    const mDW = mDH * mAspect;
                    partyPartners.forEach((_, pIdx) => {
                        const pAspect = (loadedImages['hero']?.width || 50) / (loadedImages['hero']?.height || 100);
                        const pDrawH = 100;
                        const pDrawW = pDrawH * pAspect;
                        const pX = heroX - 130 - pIdx * 120;
                        const pCenterX = pX + pDrawW / 2;
                        const pCenterY = heroY + 30;
                        const mCenterX = monsterX + mDW / 2;
                        const mCenterY = monsterY + mDH / 2;
                        ctx.save();
                        ctx.globalAlpha = lineAlpha * 0.6;
                        ctx.strokeStyle = '#ff4444';
                        ctx.lineWidth = 2;
                        ctx.setLineDash([6, 4]);
                        ctx.beginPath();
                        ctx.moveTo(mCenterX, mCenterY);
                        ctx.lineTo(pCenterX, pCenterY);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        ctx.restore();
                    });
                }
            }

            ctx.restore(); // SCENE_ZOOM 해제

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [state.level, user, isLoaded, loadedImages, state.currentMapId, state.combatState]);

    return (
        <div className="fixed inset-0 bg-black z-0 overflow-hidden">
            <canvas
                ref={canvasRef}
                className="w-full h-full block object-cover"
            />
            {!isLoaded && <div className="absolute inset-0 flex items-center justify-center text-white">Loading Assets...</div>}

            {/* [개선] 사망 시 부활 팝업 오버레이 */}
            {state.combatState?.isPlayerDead && (
                <div className="absolute inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
                    <div className="bg-gradient-to-b from-gray-900 to-gray-800 border-2 border-red-700 rounded-lg p-8 text-center shadow-2xl" style={{ minWidth: '300px' }}>
                        <div className="text-red-500 text-xl font-bold mb-2">☠️ 사망</div>
                        <div className="text-gray-300 text-sm mb-4">
                            사냥 중 사망했습니다.
                        </div>
                        <div className="text-red-400 text-sm mb-6">
                            경험치 -{state.combatState?.deathPenaltyExp || 0} 감소
                        </div>
                        {state.combatState?.pendingRejoin ? (
                            <>
                                <div className="text-yellow-300 text-sm mb-4 font-bold">다시 참여 하시겠습니까?</div>
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={rejoinCombat}
                                        className="px-5 py-2.5 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                                    >
                                        ⚔ 재참여
                                    </button>
                                    <button
                                        onClick={resurrect}
                                        className="px-5 py-2.5 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white font-bold rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                                    >
                                        ✨ 마을 부활
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={resurrect}
                                    className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-bold rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                                >
                                    ✨ 부활하기
                                </button>
                                <div className="text-gray-500 text-xs mt-3">{state.characterClass === 'elf' ? '요정의 숲에서 부활합니다' : '글루디오 마을에서 부활합니다'}</div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper: Draw Star
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}

export default GameField;
