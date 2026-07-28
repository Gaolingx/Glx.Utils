/**
 * 專業手帳內頁生成器 - 獨立向量繪圖引擎 (SVG Core Plugin)
 */
const VectorEngine = (function() {

    function render(p) {
        const svgW = p.bgW;
        let svgH = p.dx ? (p.bgH * 2 + p.pageSpacing) : p.bgH;
        let mockupOffsetY = 0;

        if (['asym', 'multifold'].includes(p.lay)) {
            mockupOffsetY = svgH + 20;
            svgH += p.fullPaperH + 40;
        }
        
        let html = `<svg viewBox="0 0 ${svgW} ${svgH}" style="width: auto; height: 100%; max-width: 100%; object-fit: contain; background: #eaedf1; box-shadow: inner 0 4px 12px rgba(0,0,0,0.15);" xmlns="http://www.w3.org/2000/svg">`;

        html += `<defs><filter id="mockup-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="3" dy="0" stdDeviation="4" flood-opacity="0.25"/></filter></defs>`;

        function addLine(x1, y1, x2, y2, color, lw, dash = '') {
            const dAttr = dash ? ` stroke-dasharray="${dash}"` : '';
            html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${lw}"${dAttr} />`;
        }
        function addRect(x, y, w, h, color, lw, dash = '') {
            const dAttr = dash ? ` stroke-dasharray="${dash}"` : '';
            html += `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${color}" stroke-width="${lw}" fill="none"${dAttr} />`;
        }
        function addCircle(cx, cy, r, color) {
            html += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" />`;
        }

        let globalStats = { c: 0, r: 0, amt: 0, amb: 0, aml: 0, amr: 0, total_pages: 0 };
        p.pagesToDraw.forEach((pageIdx) => {
            const isBackPage = (pageIdx === 1);
            const pageOffsetY = pageIdx * (p.bgH + p.pageSpacing);

            html += `<rect x="0" y="${pageOffsetY}" width="${p.bgW}" height="${p.bgH}" fill="#ffffff" filter="drop-shadow(0px 2px 5px rgba(0,0,0,0.15))" />`;

            let cropStartX = p.offX;
            let cropStartY = p.offY;
        
            if (p.lay === 'crop') {
                const tW = p.crop_rotated ? p.crop_h : p.crop_w;
                const tH = p.crop_rotated ? p.crop_w : p.crop_h;
                const gridW = p.fit_cols * tW;
                const gridH = p.fit_rows * tH;
    
                const availW = p.bgW - p.p_ml - p.p_mr;
                const availH = p.bgH - p.p_mt - p.p_mb;
                cropStartX = p.p_ml + (availW - gridW) / 2;
                cropStartY = p.p_mt + (availH - gridH) / 2;

                if (p.crop_en) {
                    if (p.machine_cut) {
                        const b = 3;
                        const l = 5;
                        for(let c=0; c<=p.fit_cols; c++) {
                            let x = cropStartX + c * tW;
                            addLine(x, pageOffsetY + cropStartY - b - l, x, pageOffsetY + cropStartY - b, '#000', 0.5);
                            addLine(x, pageOffsetY + cropStartY + gridH + b, x, pageOffsetY + cropStartY + gridH + b + l, '#000', 0.5);
                        }
                        for(let r=0; r<=p.fit_rows; r++) {
                            let y = cropStartY + r * tH;
                            addLine(cropStartX - b - l, pageOffsetY + y, cropStartX - b, pageOffsetY + y, '#000', 0.5);
                            addLine(cropStartX + gridW + b, pageOffsetY + y, cropStartX + gridW + b + l, pageOffsetY + y, '#000', 0.5);
                        }
                    }
                    if (p.hand_cut) {
                        for(let r=0; r<=p.fit_rows; r++) {
                            let y = cropStartY + r * tH;
                            addLine(cropStartX, pageOffsetY + y, cropStartX + gridW, pageOffsetY + y, '#999', 0.5, '4 4');
                        }
                        for(let c=0; c<=p.fit_cols; c++) {
                            let x = cropStartX + c * tW;
                            addLine(x, pageOffsetY + cropStartY, x, pageOffsetY + cropStartY + gridH, '#999', 0.5, '4 4');
                        }
                    }
                }
            } else {
                if (p.crop_en) {
                    if (p.machine_cut) {
                        const b = 3;
                        const l = 5;
                        addLine(p.offX - b - l, pageOffsetY + p.offY, p.offX - b, pageOffsetY + p.offY, '#000', 0.5);
                        addLine(p.offX, pageOffsetY + p.offY - b - l, p.offX, pageOffsetY + p.offY - b, '#000', 0.5);
                        addLine(p.offX + p.fullPaperW + b, pageOffsetY + p.offY, p.offX + p.fullPaperW + b + l, pageOffsetY + p.offY, '#000', 0.5);
                        addLine(p.offX + p.fullPaperW, pageOffsetY + p.offY - b - l, p.offX + p.fullPaperW, pageOffsetY + p.offY - b, '#000', 0.5);
                        addLine(p.offX - b - l, pageOffsetY + p.offY + p.fullPaperH, p.offX - b, pageOffsetY + p.offY + p.fullPaperH, '#000', 0.5);
                        addLine(p.offX, pageOffsetY + p.offY + p.fullPaperH + b, p.offX, pageOffsetY + p.offY + p.fullPaperH + b + l, '#000', 0.5);
                        addLine(p.offX + p.fullPaperW + b, pageOffsetY + p.offY + p.fullPaperH, p.offX + p.fullPaperW + b + l, pageOffsetY + p.offY + p.fullPaperH, '#000', 0.5);
                        addLine(p.offX + p.fullPaperW, pageOffsetY + p.offY + p.fullPaperH + b, p.offX + p.fullPaperW, pageOffsetY + p.offY + p.fullPaperH + b + l, '#000', 0.5);
                    }
                    if (p.hand_cut) {
                        addRect(p.offX, pageOffsetY + p.offY, p.fullPaperW, p.fullPaperH, '#999', 0.5, '4 4');
                    }
                }
            }

            html += `<g transform="translate(0, ${pageOffsetY})">`;
            let panels = [];
            if (p.lay === 'single') {
                const m_l = isBackPage ? p.mr : p.ml;
                const m_r = isBackPage ? p.ml : p.mr;
                panels.push({ ox: p.offX, oy: p.offY, sW: p.fullPaperW, sH: p.fullPaperH, m_l: m_l, m_r: m_r, isLeftPanel: true });
            } else if (p.lay === 'crop') {
                const tW = p.crop_rotated ? p.crop_h : p.crop_w;
                const tH = p.crop_rotated ? p.crop_w : p.crop_h;
                for (let r = 0; r < p.fit_rows; r++) {
                    for (let c = 0; c < p.fit_cols; c++) {
                        let c_idx = isBackPage ? (p.fit_cols - 1 - c) : c;
                        panels.push({
                            ox: cropStartX + c_idx * tW, 
                            oy: cropStartY + r * tH,
                            sW: tW, sH: tH,
                            m_l: isBackPage ? p.mr : p.ml,
                            m_r: isBackPage ? p.ml : p.mr,
                            isLeftPanel: true 
                        });
                    }
                }
                globalStats.total_pages = p.fit_cols * p.fit_rows;
            } else if (p.lay === 'booklet') {
                let foldX = p.fullPaperW / 2;
                panels.push({ ox: p.offX, oy: p.offY, sW: foldX, sH: p.fullPaperH, m_l: p.ml, m_r: p.mr, isLeftPanel: true });
                panels.push({ ox: p.offX + foldX, oy: p.offY, sW: p.fullPaperW - foldX, sH: p.fullPaperH, m_l: p.mr, m_r: p.ml, isLeftPanel: false });
            } else if (p.lay === 'asym') {
                let foldX = p.fullPaperW / 2;
                foldX += isBackPage ? -p.asym_offset : p.asym_offset;
                panels.push({ ox: p.offX, oy: p.offY, sW: foldX, sH: p.fullPaperH, m_l: p.ml, m_r: p.mr, isLeftPanel: true });
                panels.push({ ox: p.offX + foldX, oy: p.offY, sW: p.fullPaperW - foldX, sH: p.fullPaperH, m_l: p.mr, m_r: p.ml, isLeftPanel: false });
            } else if (p.lay === 'multifold') {
                let punch_margin = Math.abs(p.asym_offset);
                let base_w = (p.fullPaperW - punch_margin) / p.panels_count;
                let currentX = p.offX;
                for (let i = 0; i < p.panels_count; i++) {
                    let isLeft = (i < p.panels_count / 2);
                    let m_l = isBackPage ? p.mr : p.ml;
                    let m_r = isBackPage ? p.ml : p.mr;
                    let logicalIndex = isBackPage ? (p.panels_count - 1 - i) : i;
                    let sW = base_w;
                    if (p.asym_offset >= 0 && logicalIndex === 0) sW += punch_margin;
                    else if (p.asym_offset < 0 && logicalIndex === p.panels_count - 1) sW += punch_margin;
                    panels.push({ ox: currentX, oy: p.offY, sW: sW, sH: p.fullPaperH, m_l: m_l, m_r: m_r, isLeftPanel: isLeft });
                    currentX += sW;
                }
            }

            panels.forEach((panel, idx) => {
                const ox = panel.ox;
                const oy = panel.oy;
                const sW = panel.sW;
                const sH = panel.sH;
                let m_l = panel.m_l;
                let m_r = panel.m_r;

                if (['asym', 'multifold'].includes(p.lay) && p.asym_shift) {
                    const min_w = panels.reduce((m, pan) => Math.min(m, pan.sW), Infinity);
                    if (sW > min_w + 0.1) {
                        const diff = sW - min_w;
                        if (ox < p.offX + 1) { 
                            m_l += diff; 
                        } else { 
                            m_r += diff; 
                        }
                    }
                }

                let is_rotated = p.lay === 'crop' && p.pat_rot90;

                let l_sW = is_rotated ? sH : sW;
                let l_sH = is_rotated ? sW : sH;
                let l_ox = is_rotated ? (ox + sW/2 - l_sW/2) : ox;
                let l_oy = is_rotated ? (oy + sH/2 - l_sH/2) : oy;
                const uW = l_sW - m_l - m_r - (p.ins * 2);
                const uH = l_sH - p.mt - p.mb - (p.ins * 2);
                const c = Math.max(0, Math.min(1000, Math.floor(Math.round((uW / p.cw) * 10000) / 10000)));
                const r = Math.max(0, Math.min(1000, Math.floor(Math.round((uH / p.ch) * 10000) / 10000)));
                const rx = (l_sW - (c * p.cw) - m_l - m_r - (p.ins * 2)) / 2;
                const ry = (l_sH - (r * p.ch) - p.mt - p.mb - (p.ins * 2)) / 2;
                const act_ml = m_l + rx;
                const act_mr = m_r + rx;
                const amt = p.mt + ry;
                const amb = p.mb + ry;

                if (pageIdx === 0 && (panel.isLeftPanel || p.lay === 'crop')) {
                    globalStats.c = c;
                    globalStats.r = r; globalStats.amt = amt; globalStats.amb = amb; globalStats.aml = act_ml; globalStats.amr = act_mr;
                }

                const gX = l_ox + act_ml + p.ins;
                const gY = l_oy + amt + p.ins;
                const dW = c * p.cw;
                const dH = r * p.ch;
                const s_oX = l_ox + act_ml;
                const s_oY = l_oy + amt;
                const s_oW = (c * p.cw) + (p.ins * 2);
                const s_oH = (r * p.ch) + (p.ins * 2);
                if (is_rotated) {
                    html += `<g transform="translate(${ox + sW/2}, ${oy + sH/2}) rotate(90) translate(${-(ox + sW/2)}, ${-(oy + sH/2)})">`;
                }

                const isMirroredEdge = (['single', 'crop'].includes(p.lay)) ? isBackPage : !panel.isLeftPanel;

                // --- 資訊填寫框 (Header) ---
                if (p.he) {
                    const fontSizeMm = p.hfs * (25.4 / 72);
                    const hColHex = p.hct === 'custom' ? p.hc : p.mc;
                    let baseY = (p.hpos === 'top') ? gY : (gY + dH);
                    let hy = (p.hpos === 'top') ? (baseY - (10 + p.hfs * 0.3) + p.hoy) : (baseY + 3 + p.hoy);
                    if (p.hmirror && isMirroredEdge) {
                        let cx = gX + dW - p.hox;
                        if (p.hn) {
                            cx -= p.hbw;
                            if (p.hs === 'box') addRect(cx, hy, p.hbw, p.hfs * 0.35 + 3, hColHex, p.lwm);
                            else if (p.hs === 'line') addLine(cx, hy + p.hfs * 0.35 + 3, cx + p.hbw, hy + p.hfs * 0.35 + 3, hColHex, p.lwm);
                            cx -= 2;
                            html += `<text x="${cx}" y="${hy + (p.hfs * 0.25) + 2}" font-family="'${p.hfont}', Arial, sans-serif" font-size="${fontSizeMm}px" fill="${hColHex}" text-anchor="end">No:</text>`;
                            let estNoW = fontSizeMm * 1.5;
                            cx -= estNoW;
                        }
                        if (p.hd) {
                            if (p.hn) cx -= 5;
                            cx -= p.hbw;
                            if (p.hs === 'box') addRect(cx, hy, p.hbw, p.hfs * 0.35 + 3, hColHex, p.lwm);
                            else if (p.hs === 'line') addLine(cx, hy + p.hfs * 0.35 + 3, cx + p.hbw, hy + p.hfs * 0.35 + 3, hColHex, p.lwm);
                            cx -= 2;
                            html += `<text x="${cx}" y="${hy + (p.hfs * 0.25) + 2}" font-family="'${p.hfont}', Arial, sans-serif" font-size="${fontSizeMm}px" fill="${hColHex}" text-anchor="end">Date:</text>`;
                        }
                    } else {
                        let cx = gX + p.hox;
                        if (p.hd) {
                            html += `<text x="${cx + 2}" y="${hy + (p.hfs * 0.25) + 2}" font-family="'${p.hfont}', Arial, sans-serif" font-size="${fontSizeMm}px" fill="${hColHex}" text-anchor="start">Date:</text>`;
                            let estDateW = fontSizeMm * 2.2;
                            cx += estDateW + 2;
                            if (p.hs === 'box') addRect(cx, hy, p.hbw, p.hfs * 0.35 + 3, hColHex, p.lwm);
                            else if (p.hs === 'line') addLine(cx, hy + p.hfs * 0.35 + 3, cx + p.hbw, hy + p.hfs * 0.35 + 3, hColHex, p.lwm);
                            cx += p.hbw + 5;
                        }
                        if (p.hn) {
                            html += `<text x="${cx + 2}" y="${hy + (p.hfs * 0.25) + 2}" font-family="'${p.hfont}', Arial, sans-serif" font-size="${fontSizeMm}px" fill="${hColHex}" text-anchor="start">No:</text>`;
                            let estNoW = fontSizeMm * 1.5;
                            cx += estNoW + 2;
                            if (p.hs === 'box') addRect(cx, hy, p.hbw, p.hfs * 0.35 + 3, hColHex, p.lwm);
                            else if (p.hs === 'line') addLine(cx, hy + p.hfs * 0.35 + 3, cx + p.hbw, hy + p.hfs * 0.35 + 3, hColHex, p.lwm);
                        }
                    }
                }

                if (p.pa !== 'blank') {
                    if (p.sm) { addRect(s_oX, s_oY, s_oW, s_oH, '#ff9999', 0.5); }
                    if (p.show_crosshair) {
                        const cx = gX + dW / 2, cy = gY + dH / 2;
                        addLine(cx - 10, cy, cx + 10, cy, 'red', 0.4);
                        addLine(cx, cy - 10, cx, cy + 10, 'red', 0.4);
                        addCircle(cx, cy, 1, 'red');
                        
                        let print_cx = l_ox + m_l + (l_sW - m_l - m_r)/2;
                        let print_cy = l_oy + p.mt + (l_sH - p.mt - p.mb)/2;
                        addLine(print_cx, l_oy, print_cx, l_oy + l_sH, 'red', 0.2, '4 4');
                        addLine(l_ox, print_cy, l_ox + l_sW, print_cy, 'red', 0.2, '4 4');
                    }

                    if (p.bs === 'single') { addRect(gX, gY, dW, dH, p.bc, 0.2); }
                    else if (p.bs === 'double') { addRect(s_oX, s_oY, s_oW, s_oH, p.bc, 0.2);
                        addRect(gX, gY, dW, dH, p.bic, 0.15); }
                    else if (p.bs === 'emboss') {
                        addLine(s_oX, s_oY + s_oH, s_oX, s_oY, p.bc, 0.2);
                        addLine(s_oX, s_oY, s_oX + s_oW, s_oY, p.bc, 0.2);
                        addLine(s_oX, s_oY + s_oH, s_oX + s_oW, s_oY + s_oH, p.bic, 0.2);
                        addLine(s_oX + s_oW, s_oY + s_oH, s_oX + s_oW, s_oY, p.bic, 0.2);
                        addLine(gX, gY + dH, gX, gY, p.bic, 0.2);
                        addLine(gX, gY, gX + dW, gY, p.bic, 0.2);
                        addLine(gX, gY + dH, gX + dW, gY + dH, p.bc, 0.2);
                        addLine(gX + dW, gY + dH, gX + dW, gY, p.bc, 0.2);
                    }

                    if (p.pa === 'lined') {
                        let gap = (p.bs !== 'none' && !p.tb) ? 1.5 : 0;
                        for (let j = 0; j <= r; j++) {
                            let drawLine = true;
                            if (j === 0 && !p.ltop) drawLine = false; if (j === r && !p.lbot) drawLine = false;
                            let y = gY + j * p.ch;
                            if (drawLine) {
                                let lw = p.lwm;
                                if (j === 0 && p.lbt) lw = p.lbtw; if (j === r && p.lbb) lw = p.lbbw;
                                addLine(gX + gap, y, gX + dW - gap, y, p.mc, lw);
                            }
                            if (j === 0 && p.ltt) {
                                for (let tx = gX; tx <= gX + dW + 0.01; tx += p.lts) {
                                    let y1 = (p.lttd === 'down' || p.lttd === 'both') ? y + 1.5 : y; let y2 = (p.lttd === 'up' || p.lttd === 'both') ? y - 1.5 : y;
                                    addLine(tx, y1, tx, y2, p.mc, p.lwm);
                                }
                            }
                            if (j === r && p.ltb) {
                                for (let tx = gX; tx <= gX + dW + 0.01; tx += p.lts) {
                                    let y1 = (p.ltbd === 'down' || p.ltbd === 'both') ? y + 1.5 : y; let y2 = (p.ltbd === 'up' || p.ltbd === 'both') ? y - 1.5 : y;
                                    addLine(tx, y1, tx, y2, p.mc, p.lwm);
                                }
                            }
                        }
                    }
                    else if (p.pa === 'vertical') {
                        let gap = (p.bs !== 'none' && !p.tb) ? 1.5 : 0;
                        for (let i = 0; i <= c; i++) {
                            let x = gX + i * p.cw;
                            addLine(x, gY + gap, x, gY + dH - gap, p.mc, p.lwm);
                        }
                    }
                    else if (p.pa === 'grid') {
                        for (let i = 0; i <= c; i++) { let x = gX + i * p.cw; addLine(x, gY, x, gY + dH, p.mc, p.lwm); }
                        for (let j = 0; j <= r; j++) { let y = gY + j * p.ch; addLine(gX, y, gX + dW, y, p.mc, p.lwm); }
                    }
                    else if (p.pa === 'dot') {
                        const dr = p.ds / 2;
                        for (let i = 0; i <= c; i++) { for (let j = 0; j <= r; j++) { addCircle(gX + i * p.cw, gY + j * p.ch, dr, p.mc); } }
                    }
                    else if (['french', 'tian', 'mi', 'xie'].includes(p.pa)) {
                        if (p.pa === 'french') {
                            const ss = p.ch / (p.sct + 1);
                            for (let j = 0; j <= r; j++) {
                                let y = gY + j * p.ch;
                                addLine(gX, y, gX + dW, y, p.mc, p.lwm);
                                if (j < r) { for (let k = 1; k <= p.sct; k++) { addLine(gX, y + k * ss, gX + dW, y + k * ss, p.sc, p.lws); } }
                            }
                            for (let i = 0; i <= c; i++) { let x = gX + i * p.cw; addLine(x, gY, x, gY + dH, p.mc, p.lwm); }
                        } else {
                            for (let i = 0; i <= c; i++) { let x = gX + i * p.cw; addLine(x, gY, x, gY + dH, p.mc, p.lwm); }
                            for (let j = 0; j <= r; j++) { let y = gY + j * p.ch; addLine(gX, y, gX + dW, y, p.mc, p.lwm); }
                            
                            const dashPattern = p.cdsh ? `${p.cdl} ${p.cdl}` : '';
                            for (let i = 0; i < c; i++) {
                                for (let j = 0; j < r; j++) {
                                    let x = gX + i * p.cw, y = gY + j * p.ch;
                                    if (p.pa !== 'xie') { addLine(x, y + p.ch / 2, x + p.cw, y + p.ch / 2, p.sc, p.lws, dashPattern);
                                        addLine(x + p.cw / 2, y, x + p.cw / 2, y + p.ch, p.sc, p.lws, dashPattern);
                                    }
                                    if (p.pa !== 'tian') { addLine(x, y, x + p.cw, y + p.ch, p.sc, p.lws, dashPattern);
                                        addLine(x + p.cw, y, x, y + p.ch, p.sc, p.lws, dashPattern);
                                    }
                                    if (['mi', 'xie'].includes(p.pa) && p.cdot) { addCircle(x + p.cw / 2, gY + j * p.ch + p.ch / 2, p.cds / 2, p.sc); }
                                }
                            }
                        }
                    }
                } // End if not blank

                if (is_rotated) {
                    html += `</g>`; // close rotation group
                }

                // --- 品牌標識 (Brand) 獨立絕對映射計算 ---
                if (p.br_en) {
                    let shouldDrawBrand = true;
                    if (['asym', 'multifold'].includes(p.lay)) {
                        let isBoundLeft = p.asym_offset >= 0;
                        if (isBackPage) isBoundLeft = !isBoundLeft;
                        const isFirstPanel = idx === 0;
                        const isLastPanel = idx === panels.length - 1;
                        if (isBoundLeft && !isFirstPanel) shouldDrawBrand = false;
                        if (!isBoundLeft && !isLastPanel) shouldDrawBrand = false;
                    }

                    if (shouldDrawBrand) {
                        let conf;
                        if (['single', 'asym', 'multifold', 'crop'].includes(p.lay)) {
                            conf = isBackPage ? p.br_b : p.br_a;
                        } else {
                            if (isBackPage) {
                                conf = panel.isLeftPanel ? p.br_c : p.br_d;
                            } else {
                                conf = panel.isLeftPanel ? p.br_a : p.br_b;
                            }
                        }

                        let anchorX, anchorY;
                        let finalRot = conf.rot;

                        if (['asym', 'multifold'].includes(p.lay)) {
                            let isBoundLeft = p.asym_offset >= 0;
                            if (isBackPage) isBoundLeft = !isBoundLeft;
                            if (isBoundLeft) {
                                anchorX = 6;
                            } else {
                                anchorX = l_sW - 6;
                                finalRot = (finalRot + 180) % 360;
                            }
                            anchorY = l_sH / 2.0;
                        } else if (p.lay === 'booklet') {
                            anchorX = panel.isLeftPanel ? (l_sW - 6) : 6;
                            anchorY = l_sH / 2.0;
                        } else {
                            anchorX = isMirroredEdge ? (l_sW - 6) : 6;
                            anchorY = l_sH / 2.0;
                        }

                        let alignAttr = 'start';
                        if (p.br_align === 'middle') alignAttr = 'middle';
                        else if (p.br_align === 'end') alignAttr = 'end';
                        const s1Mm = conf.s1 * (25.4 / 72);
                        const s2Mm = conf.s2 * (25.4 / 72);
                        // 強制安全邊界範圍，避免印到別張紙
                        const safe_limit_x = Math.max(0, (l_sW / 2.0) - 5);
                        const safe_limit_y = Math.max(0, (l_sH / 2.0) - 5);
                        const clamped_ox1 = Math.max(-safe_limit_x, Math.min(safe_limit_x, conf.x1));
                        const clamped_oy1 = Math.max(-safe_limit_y, Math.min(safe_limit_y, conf.y1));
                        const clamped_ox2 = Math.max(-safe_limit_x, Math.min(safe_limit_x, conf.x2));
                        const clamped_oy2 = Math.max(-safe_limit_y, Math.min(safe_limit_y, conf.y2));
                        // 邏輯坐標
                        let log_anchor_x = anchorX + clamped_ox1;
                        let log_anchor_y = anchorY + clamped_oy1;

                        const getPhysicalPos = (lx, ly) => {
                            let px, py;
                            if (is_rotated) {
                                const cx_log = l_sW / 2.0;
                                const cy_log = l_sH / 2.0;
                                const dx_log = lx - cx_log;
                                const dy_log = ly - cy_log;
                                px = (sW / 2.0) - dy_log;
                                py = (sH / 2.0) + dx_log;
                            } else {
                                px = lx;
                                py = ly;
                            }
                            px += ox;
                            py += oy;
                            return [px, py];
                        };

                        const rot_rad = finalRot * Math.PI / 180.0;
                        const cos_r = Math.cos(rot_rad);
                        const sin_r = Math.sin(rot_rad);
                        const abs_rot = finalRot + (is_rotated ? 90 : 0);
                        if (conf.t1 !== '') {
                            const dx1 = 0;
                            const dy1 = 0;
                            const l_x1 = log_anchor_x + dx1 * cos_r - dy1 * sin_r;
                            const l_y1 = log_anchor_y + dx1 * sin_r + dy1 * cos_r;
                            const [p_x1, p_y1] = getPhysicalPos(l_x1, l_y1);
                            html += `<text x="${p_x1}" y="${p_y1}" transform="rotate(${abs_rot}, ${p_x1}, ${p_y1})" text-anchor="${alignAttr}" font-family="'${p.br_font}', Arial, sans-serif" font-size="${s1Mm}px" fill="${conf.c1}">${conf.t1}</text>`;
                        }

                        if (conf.t2 !== '') {
                            const dx2 = clamped_ox2;
                            const dy2 = s1Mm + 1.5 + clamped_oy2;
                            const l_x2 = log_anchor_x + dx2 * cos_r - dy2 * sin_r;
                            const l_y2 = log_anchor_y + dx2 * sin_r + dy2 * cos_r;
                            const [p_x2, p_y2] = getPhysicalPos(l_x2, l_y2);
                            html += `<text x="${p_x2}" y="${p_y2}" transform="rotate(${abs_rot}, ${p_x2}, ${p_y2})" text-anchor="${alignAttr}" font-family="'${p.br_font}', Arial, sans-serif" font-size="${s2Mm}px" fill="${conf.c2}">${conf.t2}</text>`;
                        }
                    }
                }

            });
            // 修正輔助線渲染
            if (['asym', 'booklet', 'multifold'].includes(p.lay) && p.cln) {
                let foldXs = [];
                for(let i=1; i<panels.length; i++) {
                    foldXs.push(panels[i].ox);
                }
                foldXs.forEach(fx => {
                    if (p.lay !== 'crop') fx += p.offX;
                    let y = p.offY;
                    while (y < p.offY + p.fullPaperH) {
                        html += `<line x1="${fx}" y1="${y}" x2="${fx}" y2="${Math.min(y + 3, p.offY + p.fullPaperH)}" stroke="${p.clc}" stroke-width="0.8" />`;
                        y += 6;
                    }
                });
            }

        });

        // ====== 視覺特化：動態生成非對稱與多摺頁的「折疊與打孔實體模擬器」 ======
        if (['asym', 'multifold'].includes(p.lay)) {
            let punch_margin = Math.abs(p.asym_offset);
            let minW, maxW;
            if (p.lay === 'asym') {
                maxW = p.fullPaperW / 2 + punch_margin;
                minW = p.fullPaperW - maxW;
            } else {
                minW = (p.fullPaperW - punch_margin) / p.panels_count;
                maxW = minW + punch_margin;
            }

            const boundOnLeft = p.asym_offset >= 0;
            const mockupX = (p.bgW - maxW) / 2;

            html += `<g transform="translate(${mockupX}, ${mockupOffsetY})">`;
            html += `<text x="${maxW/2}" y="-8" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="#4a5568" font-weight="bold">實際折疊與打孔留白模擬 (Folded State Simulation)</text>`;
            html += `<rect x="0" y="0" width="${maxW}" height="${p.fullPaperH}" fill="#e2e8f0" stroke="#a0aec0" stroke-width="0.5" />`;
            
            let frontX = boundOnLeft ? 0 : (maxW - minW);
            html += `<rect x="${frontX}" y="0" width="${minW}" height="${p.fullPaperH}" fill="#ffffff" filter="url(#mockup-shadow)" stroke="#718096" stroke-width="0.5" />`;
            let bindX = boundOnLeft ? 0 : maxW;
            html += `<line x1="${bindX}" y1="0" x2="${bindX}" y2="${p.fullPaperH}" stroke="#2d3748" stroke-width="1.2" />`;
            html += `<text x="${frontX + minW/2}" y="${p.fullPaperH / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#4a5568">Front</text>`;
            html += `<text x="${frontX + minW/2}" y="${p.fullPaperH / 2 + 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="#718096">${minW.toFixed(1)} mm</text>`;
            if (maxW > minW + 0.1) {
                let outW = maxW - minW;
                let outX = boundOnLeft ? minW : 0;
                html += `<text x="${outX + outW/2}" y="${p.fullPaperH / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="#e53e3e" font-weight="bold">Punch</text>`;
                html += `<text x="${outX + outW/2}" y="${p.fullPaperH / 2 + 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="5" fill="#e53e3e">${outW.toFixed(1)} mm</text>`;
                let sepX = boundOnLeft ? minW : outW;
                html += `<line x1="${sepX}" y1="0" x2="${sepX}" y2="${p.fullPaperH}" stroke="#a0aec0" stroke-width="0.5" stroke-dasharray="2 2" />`;
            }
            html += `</g>`;
        }

        html += `</svg>`;
        document.getElementById('previewContainer').innerHTML = html;
        return globalStats;
    }

    return { render: render };
})();