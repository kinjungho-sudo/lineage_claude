
// 간단한 경험치 테이블 시뮬레이션
function simulateExp(startExp, multiplier, levels) {
    let currentMaxExp = startExp;
    console.log(`[시뮬레이션] 시작 경험치: ${startExp}, 증가율: ${multiplier}x`);
    console.log('--------------------------------------------------');
    for (let lv = 1; lv <= levels; lv++) {
        console.log(`Lv.${lv} -> Lv.${lv + 1} 필요 경험치: ${currentMaxExp.toLocaleString()}`);
        currentMaxExp = Math.floor(currentMaxExp * multiplier);
    }
}

console.log('=== 기존 방식 (2.0배) ===');
simulateExp(100, 2.0, 10); // 10레벨까지만 봐도 수치가 급증함

console.log('\n=== 변경 방식 (1.2배) ===');
simulateExp(100, 1.2, 50); // 50레벨까지도 현실적인 수치 유지
