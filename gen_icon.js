const zlib = require('zlib');
const fs   = require('fs');

// ── PNG encoder (pure Node, no deps) ──────────────────────────────────────────
function encodePNG(w, h, getRGBA) {
    const rowBytes = w * 4;
    const raw = Buffer.alloc((1 + rowBytes) * h);
    for (let y = 0; y < h; y++) {
        raw[y * (rowBytes + 1)] = 0;
        for (let x = 0; x < w; x++) {
            const o = y * (rowBytes + 1) + 1 + x * 4;
            const [r, g, b, a = 255] = getRGBA(x, y);
            raw[o] = r; raw[o+1] = g; raw[o+2] = b; raw[o+3] = a;
        }
    }
    const T = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        T[i] = c;
    }
    const crc32 = buf => {
        let c = 0xffffffff;
        for (let i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
    };
    const chunk = (type, data) => {
        const t = Buffer.from(type, 'ascii');
        const cv = Buffer.alloc(4); cv.writeUInt32BE(crc32(Buffer.concat([t, data])));
        const lv = Buffer.alloc(4); lv.writeUInt32BE(data.length);
        return Buffer.concat([lv, t, data, cv]);
    };
    const IHDR = Buffer.alloc(13);
    IHDR.writeUInt32BE(w, 0); IHDR.writeUInt32BE(h, 4);
    IHDR[8] = 8; IHDR[9] = 6;
    return Buffer.concat([
        Buffer.from([137,80,78,71,13,10,26,10]),
        chunk('IHDR', IHDR),
        chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
        chunk('IEND', Buffer.alloc(0))
    ]);
}

function makeIcon(size, outPath) {
    const W = size, H = size;
    const px = new Float32Array(W * H * 4);

    const clamp  = (v, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, v));
    const lerp   = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
    const smooth = t => t * t * (3 - 2 * t);
    const S      = W / 512;

    // Alpha-composite onto px[]
    const bld = (x, y, r, g, b, a = 1) => {
        const xi = Math.round(x) | 0, yi = Math.round(y) | 0;
        if (xi < 0 || xi >= W || yi < 0 || yi >= H) return;
        const i = (yi * W + xi) * 4;
        const oa = a;
        px[i]   = px[i]   * (1 - oa) + r * oa;
        px[i+1] = px[i+1] * (1 - oa) + g * oa;
        px[i+2] = px[i+2] * (1 - oa) + b * oa;
        px[i+3] = 255;
    };

    // Soft circle paint (anti-aliased)
    const circle = (cx, cy, r, R, G, B, alpha = 1) => {
        const x0 = Math.floor(cx - r - 1), x1 = Math.ceil(cx + r + 1);
        const y0 = Math.floor(cy - r - 1), y1 = Math.ceil(cy + r + 1);
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                const a = Math.max(0, Math.min(1, r + 0.8 - d)) * alpha;
                if (a > 0.002) bld(x, y, R, G, B, a);
            }
        }
    };

    // Filled rectangle with optional gradient callback
    const rect = (x0, y0, x1, y1, colorFn) => {
        for (let y = Math.round(y0); y <= Math.round(y1); y++) {
            for (let x = Math.round(x0); x <= Math.round(x1); x++) {
                const tx = (x - x0) / (x1 - x0 || 1);
                const ty = (y - y0) / (y1 - y0 || 1);
                const [r, g, b, a = 1] = colorFn(tx, ty, x, y);
                bld(x, y, r, g, b, a);
            }
        }
    };

    // ── GOLD PALETTE ─────────────────────────────────────────────────────────
    const gold = t => {
        t = Math.max(0, Math.min(1, t));
        const stops = [
            [0.00, [55,  38,  5]],
            [0.10, [120, 85, 18]],
            [0.22, [200,158, 60]],
            [0.35, [248,220,120]],
            [0.50, [255,248,180]],   // highlight
            [0.65, [240,200, 80]],
            [0.78, [210,162, 42]],
            [0.90, [158,110, 18]],
            [1.00, [55,  38,  5]],
        ];
        for (let i = 0; i < stops.length - 1; i++) {
            const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
            if (t >= t0 && t <= t1) {
                const s = smooth((t - t0) / (t1 - t0));
                return c0.map((v, j) => lerp(v, c1[j], s));
            }
        }
        return [55, 38, 5];
    };

    // ── 1. BACKGROUND: deep navy gradient ────────────────────────────────────
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const nx = x / W - 0.5, ny = y / H - 0.5;
            const dist = Math.sqrt(nx * nx + ny * ny);

            // Base: deep navy → near-black at edges
            const t = 1 - Math.min(1, dist * 2.0);
            const br = lerp(4,  22, t);
            const bg = lerp(5,  18, t);
            const bb = lerp(18, 42, t);

            // Subtle diagonal shimmer
            const shimmer = Math.sin((x + y) / W * 14) * 2.5;

            const i = (y * W + x) * 4;
            px[i]   = clamp(br + shimmer);
            px[i+1] = clamp(bg + shimmer * 0.6);
            px[i+2] = clamp(bb + shimmer * 0.4);
            px[i+3] = 255;
        }
    }

    const CX = W * 0.5, CY = H * 0.5;

    // ── 2. CENTRAL RADIAL GLOW (magic atmosphere) ────────────────────────────
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const dx = (x - CX) / W, dy = (y - CY) / H;
            const d = Math.sqrt(dx * dx + dy * dy);
            // Two-layer glow: inner gold-white, outer amber
            const inner = Math.max(0, 1 - d / 0.22);
            const outer = Math.max(0, 1 - d / 0.50);
            const gi = smooth(inner) * 0.22;
            const go = smooth(outer) * 0.12;
            const i = (y * W + x) * 4;
            px[i]   = clamp(px[i]   + gi * 255 + go * 200);
            px[i+1] = clamp(px[i+1] + gi * 240 + go * 140);
            px[i+2] = clamp(px[i+2] + gi * 160 + go *  30);
        }
    }

    // ── 3. SHIELD SILHOUETTE (background element) ────────────────────────────
    // Shield: top flat, sides curve down, bottom pointed
    const shX0 = 136 * S, shX1 = 376 * S;
    const shY0 =  70 * S, shMidY = 310 * S, shTipY = 458 * S;
    const shThick = 5 * S;

    for (let y = Math.round(shY0); y <= Math.round(shTipY); y++) {
        let lx, rx;
        if (y <= Math.round(shMidY)) {
            lx = shX0; rx = shX1;
        } else {
            const t = (y - shMidY) / (shTipY - shMidY);
            const narrowed = smooth(t);
            lx = lerp(shX0, CX, narrowed);
            rx = lerp(shX1, CX, narrowed);
        }
        // Only paint the outline (inner+outer edge)
        for (let x = Math.round(lx); x <= Math.round(rx); x++) {
            const fromL = x - lx, fromR = rx - x;
            const edgeDist = Math.min(fromL, fromR);
            const fromTop  = y - shY0;
            const isEdge   = edgeDist < shThick || fromTop < shThick;
            if (isEdge) {
                const tGold = (x - shX0) / (shX1 - shX0);
                const [r, g, b] = gold(0.28 + tGold * 0.22);
                const aa = Math.min(edgeDist / 1.5, fromTop / 1.5, 1) * 0.80;
                bld(x, y, r, g, b, Math.min(1, aa));
            } else {
                // Interior: very dark fill
                const i = (Math.round(y) * W + Math.round(x)) * 4;
                if (i >= 0 && i < px.length - 3) {
                    px[i]   = Math.max(0, px[i]   - 4);
                    px[i+1] = Math.max(0, px[i+1] - 3);
                    px[i+2] = Math.max(0, px[i+2] - 2);
                }
            }
        }
    }

    // ── 4. SWORD GEOMETRY ────────────────────────────────────────────────────
    // Proportional sword — narrower guard so it doesn't look like a cross
    const bladeTipY  =  80 * S;
    const bladeBaseY = 295 * S;
    const bladeWTip  =   5 * S;
    const bladeWBase =  18 * S;

    // Blade glow
    for (let gr = 10; gr >= 1; gr--) {
        const e = gr * S * 2.2;
        const a = (11 - gr) * 0.013;
        const [r, g, b] = gold(0.44);
        for (let y = Math.round(bladeTipY - e); y <= Math.round(bladeBaseY + e); y++) {
            const prog = Math.max(0, Math.min(1, (y - bladeTipY) / (bladeBaseY - bladeTipY)));
            const hw = lerp(bladeWTip, bladeWBase, prog) * 0.5 + e;
            for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) bld(x, y, r, g, b, a);
        }
    }

    // Blade fill
    for (let y = Math.round(bladeTipY); y <= Math.round(bladeBaseY); y++) {
        const prog = (y - bladeTipY) / (bladeBaseY - bladeTipY);
        const hw = lerp(bladeWTip, bladeWBase, prog) * 0.5;
        const fade = 1 - prog * 0.12;
        for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
            const tx = hw > 0 ? (x - (CX - hw)) / (hw * 2) : 0.5;
            const [r, g, b] = gold(tx);
            const edgeA = Math.min((x - (CX - hw)) / 1.5, (CX + hw - x) / 1.5, 1);
            bld(x, y, r * fade, g * fade, b * fade, edgeA);
        }
    }
    // Ridge
    for (let y = Math.round(bladeTipY); y <= Math.round(bladeBaseY); y++) {
        const prog = (y - bladeTipY) / (bladeBaseY - bladeTipY);
        bld(CX, y, 255, 252, 215, lerp(0.95, 0.55, prog));
        bld(CX - S, y, 255, 235, 150, lerp(0.35, 0.12, prog));
        bld(CX + S, y, 255, 235, 150, lerp(0.35, 0.12, prog));
    }

    // ── 5. CROSSGUARD (narrow & elegant) ─────────────────────────────────────
    const guardY     = 302 * S;
    const guardH     =  17 * S;
    const guardHalfW =  54 * S;   // << narrow — not cross-like

    // Curved guard tips (rounded ends)
    for (let gr = 6; gr >= 1; gr--) {
        const e = gr * S * 1.8; const a = (7 - gr) * 0.022;
        const [r, g, b] = gold(0.38);
        for (let y = Math.round(guardY - e); y <= Math.round(guardY + guardH + e); y++) {
            for (let x = Math.round(CX - guardHalfW - e); x <= Math.round(CX + guardHalfW + e); x++) {
                bld(x, y, r, g, b, a);
            }
        }
    }
    rect(CX - guardHalfW, guardY, CX + guardHalfW, guardY + guardH, (tx) => {
        const [r, g, b] = gold(tx);
        const edge = Math.min(tx / 0.08, (1 - tx) / 0.08, 1);
        return [r, g, b, edge];
    });
    // Guard tips rounded
    circle(CX - guardHalfW, guardY + guardH * 0.5, guardH * 0.55, ...gold(0.30), 0.9);
    circle(CX + guardHalfW, guardY + guardH * 0.5, guardH * 0.55, ...gold(0.70), 0.9);
    // Center gem
    circle(CX, guardY + guardH * 0.5, guardH * 0.60, ...gold(0.52), 0.95);
    circle(CX - guardH * 0.15, guardY + guardH * 0.32, guardH * 0.18, 255, 250, 210, 0.75);

    // ── 6. GRIP ───────────────────────────────────────────────────────────────
    const gripY0 = guardY + guardH;
    const gripY1 = 400 * S;
    const gripW  =  11 * S;

    for (let y = Math.round(gripY0); y <= Math.round(gripY1); y++) {
        const wrap = 0.5 + Math.sin((y / S) * 0.6) * 0.20;
        const [r, g, b] = gold(wrap);
        const fade = 1 - ((y - gripY0) / (gripY1 - gripY0)) * 0.25;
        for (let x = Math.round(CX - gripW); x <= Math.round(CX + gripW); x++) {
            const ea = Math.min((x - (CX - gripW)) / 1.5, (CX + gripW - x) / 1.5, 1);
            bld(x, y, r * fade, g * fade, b * fade, ea);
        }
    }

    // ── 7. POMMEL ─────────────────────────────────────────────────────────────
    const pommelCY = 422 * S;
    const pommelR  =  26 * S;

    for (let gr = 7; gr >= 1; gr--) {
        const [r, g, b] = gold(0.36);
        const rr = pommelR + gr * S * 2.0;
        const a  = (8 - gr) * 0.017;
        for (let y = Math.round(pommelCY - rr); y <= Math.round(pommelCY + rr); y++)
            for (let x = Math.round(CX - rr); x <= Math.round(CX + rr); x++)
                if ((x - CX) ** 2 + (y - pommelCY) ** 2 <= rr * rr) bld(x, y, r, g, b, a);
    }
    for (let y = Math.round(pommelCY - pommelR); y <= Math.round(pommelCY + pommelR); y++) {
        for (let x = Math.round(CX - pommelR); x <= Math.round(CX + pommelR); x++) {
            const dx = x - CX, dy = y - pommelCY;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= pommelR) {
                const tx = (dx / pommelR) * 0.5 + 0.5;
                const aa = d > pommelR - 1.2 ? 1 - (d - (pommelR - 1.2)) / 1.5 : 1;
                bld(x, y, ...gold(tx), Math.max(0, aa));
            }
        }
    }
    circle(CX - pommelR * 0.28, pommelCY - pommelR * 0.28, pommelR * 0.20, 255, 252, 210, 0.7);

    // ── 7. SPARKLE PARTICLES ─────────────────────────────────────────────────
    const sparks = [
        [160, 140], [340, 110], [120, 280], [390, 260],
        [180, 420], [350, 380], [100, 180], [420, 330],
        [220, 80],  [300, 470], [145, 350], [375, 160],
    ];
    sparks.forEach(([sx, sy], idx) => {
        const r2 = (3.5 + (idx % 3)) * S;
        const alpha = 0.55 + (idx % 5) * 0.09;
        const [r, g, b] = gold(0.35 + (idx % 4) * 0.12);
        // Cross-shaped sparkle
        for (let k = -Math.ceil(r2 * 2); k <= Math.ceil(r2 * 2); k++) {
            const d = Math.abs(k);
            const a = Math.max(0, 1 - d / r2) * alpha;
            bld(sx * S + k, sy * S, r, g, b, a);
            bld(sx * S, sy * S + k, r, g, b, a);
        }
        circle(sx * S, sy * S, r2 * 0.45, r, g, b, alpha * 0.8);
    });

    // ── 8. OUTER RING (thin, elegant) ────────────────────────────────────────
    const ringR = W * 0.472, ringT = W * 0.012;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const dx = x - CX, dy = y - CY;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d >= ringR - ringT && d <= ringR + ringT * 0.3) {
                const t = 1 - Math.abs(d - ringR) / ringT;
                const angle = Math.atan2(dy, dx);
                const gp = (Math.sin(angle * 2 + 0.8) + 1) * 0.5;
                const [r, g, b] = gold(0.25 + gp * 0.45);
                bld(x, y, r, g, b, smooth(Math.max(0, t)) * 0.88);
            }
        }
    }

    // ── 9. WRITE PNG ─────────────────────────────────────────────────────────
    const png = encodePNG(W, H, (x, y) => {
        const i = (y * W + x) * 4;
        return [Math.round(clamp(px[i])), Math.round(clamp(px[i+1])), Math.round(clamp(px[i+2])), 255];
    });
    fs.writeFileSync(outPath, png);
    console.log(`✓ ${outPath}  (${W}×${H})`);
}

makeIcon(512, 'public/icon-512.png');
makeIcon(192, 'public/icon-192.png');
