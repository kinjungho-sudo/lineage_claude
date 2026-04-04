import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { calculateStats, getMaxHp } from '../mechanics/combat';

const GameField = () => {
    const { state, user, teleport, resurrect, MONSTERS, MAPS } = useGame();
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

            // Load Hero (Knight)
            const heroPromise = new Promise((resolve) => {
                const img = new Image();
                img.src = '/character/new_knight.png';
                img.onload = () => { images['hero'] = img; resolve(); };
                img.onerror = () => { console.error('Failed to load hero sprite'); resolve(); };
            });

            // Load All Monsters
            const monsterPromises = MONSTERS.map(m => new Promise((resolve) => {
                const img = new Image();
                img.src = m.img;
                img.onload = () => { images[m.img] = img; resolve(); };
                img.onerror = () => { console.warn('Failed to load monster:', m.img); resolve(); }; // Warn but resolve
            }));

            await Promise.all([...mapPromises, heroPromise, ...monsterPromises]);
            setLoadedImages(images);
            setIsLoaded(true);
        };

        loadAllAssets();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
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

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let animationFrameId;

        const currentMapId = state.currentMapId || 'village';
        const currentMapData = MAPS.find(m => m.id === currentMapId) || MAPS[0];
        const bgImage = loadedImages[currentMapData.img];
        const heroImg = loadedImages['hero'];

        const render = () => {
            // Draw Background
            if (bgImage) {
                try {
                    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
                } catch (e) {
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            } else {
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Draw Hero (Center)
            const heroX = canvas.width / 2 - 100;
            const heroY = canvas.height / 2 - 60;
            let drawX = heroX; // Define drawX here for wider scope if needed, but updated below

            if (heroImg) {
                const aspect = heroImg.width / heroImg.height;
                const drawH = 120;
                const drawW = drawH * aspect;

                const breathe = Math.sin(Date.now() / 500) * 2;

                const isAttacking = state.combatState?.isAttacking;
                let lunge = 0;
                if (isAttacking) {
                    const time = Date.now();
                    const cycle = (time % 800) / 800;
                    if (cycle < 0.2) lunge = cycle * 150;
                    else if (cycle < 0.4) lunge = 30;
                    else lunge = 30 - ((cycle - 0.4) * 50);
                }

                drawX = heroX + lunge;

                // Draw Shadow
                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(drawX + drawW / 2, heroY + drawH - 10, 30, 10, 0, 0, Math.PI * 2);
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
                        ctx.translate(drawX + drawW / 2, heroY + drawH - 40);
                        ctx.rotate(rotProgress * 90 * Math.PI / 180);
                        ctx.translate(-(drawX + drawW / 2), -(heroY + drawH - 40));
                        
                        ctx.drawImage(heroImg, drawX, heroY - 40 + breathe, drawW, drawH);
                        ctx.restore();
                    } else {
                        ctx.drawImage(heroImg, drawX, heroY - 40 + breathe, drawW, drawH);
                    }

                    // [개선] 물약 이펙트: 타입별로 다른 시각 효과
                    const potionEffect = state.combatState?.potionEffect;
                    if (potionEffect && Date.now() - potionEffect.timestamp < 500) {
                        const elapsed = Date.now() - potionEffect.timestamp;
                        const alpha = 1 - (elapsed / 500);
                        const effectType = potionEffect.type || 'red';

                        if (effectType === 'brave') {
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

                } catch (e) {
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
                ctx.fillText(user?.nickname || user?.id || 'Player', drawX + drawW / 2, pBarY - 10); // Positioned above Bar
                ctx.shadowBlur = 0;

            } else {
                ctx.fillStyle = '#4a90e2';
                ctx.fillRect(heroX, heroY - 60, 40, 60);
            }

            // Draw Monster
            let monster = state.combatState?.targetMonsterId ? MONSTERS.find(m => m.id === state.combatState.targetMonsterId) : null;
            
            // [Fix] 비전투(idle) 상태이거나 텔레포트 직후라서 targetMonsterId가 없다면
            // 해당 맵에서 현재 시간에 매칭되는 몬스터를 폴백(Ambient)으로 렌더링
            if (!monster && currentMapId !== 'village') {
                const mapMonsters = MONSTERS.filter(m => m.map === currentMapId);
                if (mapMonsters.length > 0) {
                    monster = mapMonsters[Math.floor(Date.now() / 15000) % mapMonsters.length];
                }
            }

            let monsterX = canvas.width / 2 + 50;
            let monsterY = canvas.height / 2 - 100;

            if (monster) {
                // Shake Logic & Impact Visuals
                const impact = state.combatState?.impact;
                let shakeX = 0;
                let shakeY = 0;
                let showSpark = false;
                let sparkColor = '#ffffff';
                let sparkSize = 30;

                if (impact && Date.now() - impact.timestamp < 300) {
                    const elapsed = Date.now() - impact.timestamp;

                    // Shake Intensity based on impact type
                    let intensity = 5;
                    if (impact.type === 'crit') intensity = 12;
                    if (impact.type === 'kill') intensity = 8;

                    // Decaying Shake
                    const shakeDecay = 1 - (elapsed / 300);
                    shakeX = (Math.random() - 0.5) * intensity * 2 * shakeDecay;
                    shakeY = (Math.random() - 0.5) * intensity * 2 * shakeDecay;

                    showSpark = true;
                    if (impact.type === 'crit') {
                        sparkColor = '#ffff00'; // Yellow for Crit
                        sparkSize = 50;
                    } else if (impact.type === 'kill') {
                        sparkColor = '#ff3333'; // Red for Kill
                        sparkSize = 60;
                    }
                }

                monsterX += shakeX;
                monsterY += shakeY;

                const monsterImg = loadedImages[monster.img];
                const aspect = monsterImg ? monsterImg.width / monsterImg.height : 1;
                const drawH = 200;
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
                        ctx.drawImage(monsterImg, monsterX, monsterY, drawW, drawH);
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

                // HIT SPARK (Star Shape)
                if (showSpark) { // Fix: Allow spark even if dying (for Last Hit effect)
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.fillStyle = sparkColor;

                    // Spark Position (Center of Monster)
                    ctx.translate(monsterX + drawW / 2, monsterY + drawH / 2);

                    // Flash Effect for Impact
                    if (impact.type !== 'kill') {
                        const flashAlpha = 1 - (Date.now() - impact.timestamp) / 150;
                        if (flashAlpha > 0) {
                            ctx.globalAlpha = flashAlpha;
                            ctx.beginPath();
                            ctx.arc(0, 0, sparkSize * 1.5, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }

                    // Rotating Star
                    ctx.rotate(Date.now() / 50);
                    ctx.globalAlpha = 1.0;
                    ctx.beginPath();
                    drawStar(ctx, 0, 0, 4, sparkSize, sparkSize * 0.3);
                    ctx.fill();

                    ctx.rotate(Math.PI / 4);
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    drawStar(ctx, 0, 0, 4, sparkSize * 0.7, sparkSize * 0.2);
                    ctx.fill();

                    ctx.restore();
                }

                // HP Bar & Name
                const mBarW = 100;
                const mBarH = 10;
                const mBarX = monsterX + (drawW - mBarW) / 2;
                const mBarY = monsterY - 20; // Moved closer (was -80)

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
                    ctx.fillText(state.combatState?.targetMonsterId ? (MONSTERS.find(m => m.id === state.combatState.targetMonsterId)?.name || 'Enemy') : '', monsterX + drawW / 2, mBarY - 8); 
                    ctx.shadowBlur = 0;
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

                        if (dn.target === 'player') {
                            dX = heroX + 40;
                            // 플레이어쪽 데미지는 약간 다르게 움직임
                            dY = heroY - 80 - floatY * 0.8;
                            ctx.fillStyle = '#ff2222';
                            ctx.strokeStyle = '#220000';
                            ctx.shadowColor = '#ff2222';
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
            {/* Map Selector */}
            <div className="absolute top-2 right-2 bg-black/60 p-2 rounded border border-[#555] z-10">
                <div className="text-[#a59c77] text-xs mb-1 font-bold">TELEPORT</div>
                <div className="flex flex-col gap-1">
                    {MAPS.map((map) => (
                        <button
                            key={map.id}
                            onClick={() => teleport(map.id)}
                            className={`text-xs px-2 py-1 text-left rounded ${state.currentMapId === map.id ? 'bg-[#a59c77] text-black font-bold' : 'text-gray-300 hover:bg-[#333]'}`}
                        >
                            {map.name} {map.id !== 'village' && `(Lv.${map.minLevel}+)`}
                        </button>
                    ))}
                </div>
            </div>

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
                        <button
                            onClick={resurrect}
                            className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white font-bold rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                            ✨ 부활하기
                        </button>
                        <div className="text-gray-500 text-xs mt-3">글루디오 마을에서 부활합니다</div>
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
