/**
 * 專業手帳內頁生成器 - 主程式核心引擎
 * 版本: beta11
 */

const basePaperSizes = {
    'A3': [297, 420], 'A4': [210, 297], 'A5': [148, 210], 'A6': [105, 148],
    'B4': [250, 353], 'B5': [176, 250], 'B6': [125, 176], 'A5_Slim': [130, 210]
};

const palettes = {
    french: { m: ['#8aa2b8', '#a3b899', '#cba8a8', '#99aab5', '#b0b0b0'], s: ['#c3d2df', '#d4e0ce', '#e8d8d8', '#d9d9d9', '#f0f0f0'] },
    grid: { m: ['#b0b0b0', '#e0e0e0', '#8aa2b8', '#d4e0ce', '#f0c8c8'], s: [] },
    dot: { m: ['#b0b0b0', '#cccccc', '#a3b899', '#8aa2b8', '#d9d9d9'], s: [] },
    lined: { m: ['#b0b0b0', '#8aa2b8', '#a3b899', '#cba8a8', '#e2d8d8'], s: [] },
    vertical: { m: ['#b0b0b0', '#8aa2b8', '#a3b899', '#cba8a8', '#e2d8d8'], s: [] },
    chinese: { m: ['#8b0000', '#2e8b57', '#000080', '#8aa2b8', '#b0b0b0'], s: ['#ffb3b3', '#b3ffcc', '#b3b3ff', '#d9d9d9', '#f0f0f0'] }
};

let lastPattern = '';
let isApplyingPreset = false;
let lastLayout = 'single';

// 导出矢量 PDF（直接嵌入 SVG DOM）
function exportVecPDF() {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        alert('Error: jsPDF library not loaded.');
        return;
    }

    // 提取预览容器中由 VectorEngine.render() 生成的 SVG DOM
    const svgEl = document.querySelector('#previewContainer svg');
    if (!svgEl) {
        alert('Error: Vector SVG element not found. Please ensure preview is generated.');
        return;
    }

    const svgW = parseFloat(svgEl.viewBox.baseVal.width);
    const svgH = parseFloat(svgEl.viewBox.baseVal.height);

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: svgW > svgH ? 'l' : 'p',
            unit: 'mm',
            format: [svgW, svgH]
        });
        
        // 使用 jsPDF.svg() API 将 SVG DOM 直接作为矢量图嵌入
        pdf.svg(svgEl, {
            x: 0,
            y: 0,
            width: svgW,
            height: svgH
        }).then(() => {
            pdf.save('notebook_vector.pdf');
        });
    } catch (err) {
        console.error('jsPDF.svg() failed:', err);
        alert('Export failed. Your jsPDF version might not support vector.svg() API.');
    }
}

// 导出 SVG 图片（序列化 SVG DOM 并保存）
function exportSVG() {
    const svgEl = document.querySelector('#previewContainer svg');
    if (!svgEl) {
        alert('Error: Vector SVG element not found. Please ensure preview is generated.');
        return;
    }

    // 克隆节点以避免修改影响原始预览
    const clone = svgEl.cloneNode(true);
    
    // 确保导出的 SVG 具有正确的 XML 命名空间
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    
    // 序列化 SVG DOM 为字符串
    const serializer = new XMLSerializer();
    let svgStr = serializer.serializeToString(clone);
    
    // 确保字符串以 XML 声明开头，有助于提升跨平台兼容性
    if (!svgStr.startsWith('<?xml')) {
        svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgStr;
    }
    
    // 创建 Blob 对象并触发下载
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notebook_vector.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function applyLang() {
    if (typeof i18n === 'undefined') return;
    const currentLang = document.getElementById('lang_selector').value || 'zh';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[currentLang] && i18n[currentLang][key]) {
            if (['INPUT', 'BUTTON', 'OPTION'].includes(el.tagName)) {
                el.innerText = i18n[currentLang][key];
            } else {
                el.innerHTML = i18n[currentLang][key];
            }
        }
    });
    updateUI();
}

function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    }
    return [r, g, b];
}

function updatePalette(pattern) {
    if (pattern === lastPattern) return;
    lastPattern = pattern;
    const key = ['tian', 'mi', 'xie'].includes(pattern) ? 'chinese' : (palettes[pattern] ? pattern : 'grid');
    document.getElementById('pal_m').innerHTML = palettes[key].m.map(c => `<div class="swatch" style="background:${c}" data-color="${c}"></div>`).join('');
    document.getElementById('pal_s').innerHTML = (palettes[key].s || []).map(c => `<div class="swatch" style="background:${c}" data-color="${c}"></div>`).join('');
}

function getDims(val, wInputId, hInputId) {
    if (val === 'Custom') {
        return [
            Math.max(10, parseFloat(document.getElementById(wInputId).value) || 210),
            Math.max(10, parseFloat(document.getElementById(hInputId).value) || 297)
        ];
    } else if (val && val.startsWith('C_')) {
        let customSizes = JSON.parse(localStorage.getItem('customPaperSizes') || '{}');
        let name = val.substring(2);
        return customSizes[name] || [210, 297];
    } else {
        return basePaperSizes[val] || [210, 297];
    }
}

function populateSizeDropdowns() {
    const pt = document.getElementById('paper_type');
    const ct = document.getElementById('crop_type');
    
    const ptVal = pt.value || 'A4';
    const ctVal = ct.value || 'A5';
    
    let customSizes = JSON.parse(localStorage.getItem('customPaperSizes') || '{}');
    
    let html = '';
    for (let key in basePaperSizes) {
        html += `<option value="${key}">${key} (${basePaperSizes[key][0]}x${basePaperSizes[key][1]})</option>`;
    }
    
    if (Object.keys(customSizes).length > 0) {
        html += `<optgroup label="Saved">`;
        for (let key in customSizes) {
            html += `<option value="C_${key}">${key} (${customSizes[key][0]}x${customSizes[key][1]})</option>`;
        }
        html += `</optgroup>`;
    }
    
    html += `<option value="Custom" data-i18n="custom_size">自訂尺寸</option>`;
    
    pt.innerHTML = html;
    ct.innerHTML = html;
    
    if (Array.from(pt.options).some(o => o.value === ptVal)) pt.value = ptVal; else pt.value = 'A4';
    if (Array.from(ct.options).some(o => o.value === ctVal)) ct.value = ctVal; else ct.value = 'A5';
}

function populateGlobalPresets() {
    const select = document.getElementById('print_preset');
    const currentVal = select.value;
    let presets = JSON.parse(localStorage.getItem('globalPresets') || '{}');
    
    let html = `<option value="" data-i18n="preset_default">-- 不使用自訂集 --</option>`;
    for (let name in presets) {
        html += `<option value="${name}">${name}</option>`;
    }
    select.innerHTML = html;
    
    if (presets[currentVal]) {
        select.value = currentVal;
        document.getElementById('btn_del_preset').classList.remove('hidden');
    } else {
        select.value = '';
        document.getElementById('btn_del_preset').classList.add('hidden');
    }
    applyLang();
}

let currentPresetTarget = 'paper';
window.openPresetModal = function(target) {
    currentPresetTarget = target;
    let w = target === 'paper' ? document.getElementById('custom_w').value : document.getElementById('crop_custom_w').value;
    let h = target === 'paper' ? document.getElementById('custom_h').value : document.getElementById('crop_custom_h').value;
    document.getElementById('preset_w').value = w;
    document.getElementById('preset_h').value = h;
    document.getElementById('preset_name').value = '';
    document.getElementById('presetModal').classList.remove('hidden');
};

function updateUI() {
    const pt = document.getElementById('paper_type').value;
    const pa = document.getElementById('pattern').value;
    const bs = document.getElementById('b_style').value;
    const lay = document.getElementById('layout').value;
    const dx = document.getElementById('duplex').checked;
    const crop_en = document.getElementById('crop_en').checked;
    const ct = document.getElementById('crop_type').value;
    
    const isCrop = lay === 'crop';
    const hasSub = ['french', 'tian', 'mi', 'xie'].includes(pa);
    const isChinese = ['tian', 'mi', 'xie'].includes(pa);
    updatePalette(pa);

    // 控制自訂尺寸與裁切輸入框
    document.getElementById('custom_size_group').classList.toggle('hidden', pt !== 'Custom');
    document.getElementById('crop_size_group').classList.toggle('hidden', !(crop_en || isCrop));
    document.getElementById('crop_custom_group').classList.toggle('hidden', !(crop_en || isCrop) || ct !== 'Custom');
    document.getElementById('crop_marks_opts').classList.toggle('hidden', !(crop_en || isCrop));
    
    // 動態標題切換
    const lbl = document.getElementById('lbl_paper_size');
    const lbl_t = document.getElementById('lbl_t');
    const lbl_b = document.getElementById('lbl_b');
    const lbl_l = document.getElementById('lbl_l');
    const lbl_r = document.getElementById('lbl_r');
    const currentLang = document.getElementById('lang_selector').value || 'zh';
    
    if (crop_en || isCrop) {
        lbl.innerText = (i18n[currentLang] && i18n[currentLang]['base_paper_size']) ? i18n[currentLang]['base_paper_size'] : '列印紙張(底紙)';
    } else {
        lbl.innerText = (i18n[currentLang] && i18n[currentLang]['paper_size']) ? i18n[currentLang]['paper_size'] : '紙張尺寸';
    }

    if (isCrop) {
        lbl_t.innerText = (i18n[currentLang] && i18n[currentLang]['inner_margin_t']) ? i18n[currentLang]['inner_margin_t'] : '內頁上邊界';
        lbl_b.innerText = (i18n[currentLang] && i18n[currentLang]['inner_margin_b']) ? i18n[currentLang]['inner_margin_b'] : '內頁下邊界';
        lbl_l.innerText = (i18n[currentLang] && i18n[currentLang]['inner_margin_l']) ? i18n[currentLang]['inner_margin_l'] : '內頁左邊界';
        lbl_r.innerText = (i18n[currentLang] && i18n[currentLang]['inner_margin_r']) ? i18n[currentLang]['inner_margin_r'] : '內頁右邊界';
        document.getElementById('print_margin_group').classList.remove('hidden');
        document.getElementById('pat_rot90_grp').classList.remove('hidden');
    } else {
        lbl_t.innerText = (i18n[currentLang] && i18n[currentLang]['margin_t']) ? i18n[currentLang]['margin_t'] : '上邊界';
        lbl_b.innerText = (i18n[currentLang] && i18n[currentLang]['margin_b']) ? i18n[currentLang]['margin_b'] : '下邊界';
        lbl_l.innerText = (i18n[currentLang] && i18n[currentLang]['margin_l']) ? i18n[currentLang]['margin_l'] : '左邊界';
        lbl_r.innerText = (i18n[currentLang] && i18n[currentLang]['margin_r']) ? i18n[currentLang]['margin_r'] : '右邊界';
        document.getElementById('print_margin_group').classList.add('hidden');
        document.getElementById('pat_rot90_grp').classList.add('hidden');
    }

    document.getElementById('asym_opts').classList.toggle('hidden', !['asym', 'multifold'].includes(lay));
    document.getElementById('multifold_opts').classList.toggle('hidden', lay !== 'multifold');
    
    // 空白紙隱藏排版參數，但保留 Header
    const isBlank = pa === 'blank';
    document.getElementById('cell_size_opts').style.display = isBlank ? 'none' : 'flex';
    document.getElementById('grp_cell_w').style.display = (pa === 'lined' || isBlank) ? 'none' : 'block';
    document.getElementById('grp_cell_h').style.display = (pa === 'vertical' || isBlank) ? 'none' : 'block';
    document.getElementById('line_width_opts').style.display = isBlank ? 'none' : 'flex';

    document.getElementById('sub_options').classList.toggle('hidden', !hasSub || isBlank);
    document.getElementById('lw_s_grp').classList.toggle('hidden', !hasSub || isBlank);
    document.getElementById('sub_cnt_grp').classList.toggle('hidden', pa !== 'french' || isBlank);
    document.getElementById('dot_options').classList.toggle('hidden', pa !== 'dot' || isBlank);
    document.getElementById('lined_opts').classList.toggle('hidden', pa !== 'lined' || isBlank);
    document.getElementById('chinese_opts').classList.toggle('hidden', !isChinese || isBlank);
    document.getElementById('c_dot_grp').classList.toggle('hidden', !['mi', 'xie'].includes(pa) || isBlank);
    document.getElementById('c_dash_len_grp').classList.toggle('hidden', !document.getElementById('c_dash').checked || isBlank);
    document.getElementById('b_style_opts').style.display = isBlank ? 'none' : 'block';
    document.getElementById('b_hr').style.display = isBlank ? 'none' : 'block';
    document.getElementById('mc_grp').style.display = isBlank ? 'none' : 'block';
    
    // 確保 Header 在空白紙模式下不被隱藏
    document.getElementById('header_container').classList.toggle('hidden', isChinese); 
    document.getElementById('header_opts').classList.toggle('hidden', !document.getElementById('h_en').checked);
    
    const hct = document.getElementById('h_color_type').value;
    document.getElementById('h_custom_col_grp').classList.toggle('hidden', hct !== 'custom');
    
    document.getElementById('brand_opts').classList.toggle('hidden', !document.getElementById('br_en').checked);
    
    // 控制品牌面板的顯示隱藏
    const bb = document.getElementById('br_side_b_grp');
    const bc = document.getElementById('br_side_c_grp');
    const bd = document.getElementById('br_side_d_grp');
    if (lay === 'single' && !dx) {
        bb.classList.add('hidden'); bc.classList.add('hidden'); bd.classList.add('hidden');
    } else if (lay === 'single' && dx) {
        bb.classList.remove('hidden'); bc.classList.add('hidden'); bd.classList.add('hidden');
    } else if (['asym', 'multifold', 'crop'].includes(lay) && !dx) {
        bb.classList.add('hidden'); bc.classList.add('hidden'); bd.classList.add('hidden');
    } else if (['asym', 'multifold', 'crop'].includes(lay) && dx) {
        bb.classList.remove('hidden'); bc.classList.add('hidden'); bd.classList.add('hidden');
    } else if (lay === 'booklet' && !dx) {
        bb.classList.remove('hidden'); bc.classList.add('hidden'); bd.classList.add('hidden');
    } else if (lay === 'booklet' && dx) {
        bb.classList.remove('hidden'); bc.classList.remove('hidden'); bd.classList.remove('hidden');
    }

    // 鏡像資訊框選項：只有在非單面單頁時才顯示
    document.getElementById('h_mirror_grp').style.display = (lay === 'single' && !dx) ? 'none' : 'block';

    document.getElementById('border_options').classList.toggle('hidden', bs === 'none' || isBlank);
    document.getElementById('b_inner_grp').classList.toggle('hidden', bs === 'none' || bs === 'single' || isBlank);
    document.getElementById('b_touch_grp').classList.toggle('hidden', !['lined', 'vertical'].includes(pa) || isBlank);
    
    document.getElementById('l_tick_spc_grp').classList.toggle('hidden', !(document.getElementById('l_t_t').checked || document.getElementById('l_t_b').checked));
    document.getElementById('booklet_opts').style.display = ['booklet', 'asym', 'multifold'].includes(lay) ? 'block' : 'none';
    document.getElementById('cl_opts_grp').style.display = document.getElementById('center_line').checked ? 'flex' : 'none';

    document.querySelectorAll('.sub-opt').forEach(e => e.style.display = hasSub ? 'block' : 'none');
    if (!hasSub && document.getElementById('b_color_type').value === 'sub') document.getElementById('b_color_type').value = 'custom';
    if (!hasSub && document.getElementById('b_inner_color_type').value === 'sub') document.getElementById('b_inner_color_type').value = 'custom';
    document.getElementById('b_custom_col').classList.toggle('hidden', document.getElementById('b_color_type').value !== 'custom');
    document.getElementById('b_inner_custom_col').classList.toggle('hidden', document.getElementById('b_inner_color_type').value !== 'custom');

    const ea = document.getElementById('eq_all'), eo = document.getElementById('eq_opp');
    const cb = document.getElementById('col_b'), cl = document.getElementById('col_l'), cr = document.getElementById('col_r');
    
    if (ea.checked) {
        cb.style.display = cl.style.display = cr.style.display = 'none';
    } else if (eo.checked) {
        cb.style.display = cr.style.display = 'none';
        cl.style.display = 'block';
    } else {
        cb.style.display = cl.style.display = cr.style.display = 'block';
    }
    
    updatePreview();
}

function updatePreview() {
    const pt = document.getElementById('paper_type').value;
    const pa = document.getElementById('pattern').value;
    const ea = document.getElementById('eq_all').checked;
    const eo = document.getElementById('eq_opp').checked;
    const lay = document.getElementById('layout').value;
    const dx = document.getElementById('duplex').checked;
    const pat_rot90 = document.getElementById('pat_rot90').checked;
    
    let [pW, pH] = getDims(pt, 'custom_w', 'custom_h');

    let bgW = ['booklet', 'asym', 'multifold'].includes(lay) ? pH : pW;
    let bgH = ['booklet', 'asym', 'multifold'].includes(lay) ? pW : pH;

    const isCrop = lay === 'crop';
    const crop_en = document.getElementById('crop_en').checked || isCrop;
    let crop_w = 148, crop_h = 210;
    if (crop_en) {
        const ct = document.getElementById('crop_type').value;
        let cropDims = getDims(ct, 'crop_custom_w', 'crop_custom_h');
        crop_w = cropDims[0];
        crop_h = cropDims[1];
    }
    
    let crop_w_orig = crop_w;
    let crop_h_orig = crop_h;

    if (['booklet', 'asym', 'multifold'].includes(lay) && crop_en) {
        crop_w = crop_h_orig;
        crop_h = crop_w_orig;
    }

    const machine_cut = document.getElementById('machine_cut').checked;
    const hand_cut = document.getElementById('hand_cut').checked;
    const panels_count = Math.max(2, Math.min(10, parseInt(document.getElementById('panels_count').value) || 3));

    let fullPaperW = crop_en ? Math.min(bgW, crop_w) : bgW;
    let fullPaperH = crop_en ? Math.min(bgH, crop_h) : bgH;

    const offX = crop_en ? (bgW - fullPaperW) / 2 : 0;
    const offY = crop_en ? (bgH - fullPaperH) / 2 : 0;

    let p_mt = Math.max(0, parseFloat(document.getElementById('p_margin_t').value) || 0);
    let p_mb = Math.max(0, parseFloat(document.getElementById('p_margin_b').value) || 0);
    let p_ml = Math.max(0, parseFloat(document.getElementById('p_margin_l').value) || 0);
    let p_mr = Math.max(0, parseFloat(document.getElementById('p_margin_r').value) || 0);

    let fit_cols = 1, fit_rows = 1, crop_rotated = false;
    if (isCrop) {
        let availW = bgW - p_ml - p_mr;
        let availH = bgH - p_mt - p_mb;
        let c1 = Math.floor(availW / crop_w_orig);
        let r1 = Math.floor(availH / crop_h_orig);
        let t1 = c1 * r1;
        
        let c2 = Math.floor(availW / crop_h_orig);
        let r2 = Math.floor(availH / crop_w_orig);
        let t2 = c2 * r2;

        if (t2 > t1 && t2 > 0) {
            crop_rotated = true;
            fit_cols = c2;
            fit_rows = r2;
        } else {
            fit_cols = Math.max(1, c1);
            fit_rows = Math.max(1, r1);
        }
    }

    const maxOffset = (fullPaperW / 2) - 10;
    let asym_offset = ['asym', 'multifold'].includes(lay) ? (parseFloat(document.getElementById('asym_offset').value) || 0) : 0;
    if (asym_offset > maxOffset) asym_offset = maxOffset;
    if (asym_offset < -maxOffset) asym_offset = -maxOffset;
    
    const asym_shift = document.getElementById('asym_shift').checked;

    let mt = Math.max(0, parseFloat(document.getElementById('margin_t').value) || 0);
    let mb = Math.max(0, parseFloat(document.getElementById('margin_b').value) || 0);
    let ml = Math.max(0, parseFloat(document.getElementById('margin_l').value) || 0);
    let mr = Math.max(0, parseFloat(document.getElementById('margin_r').value) || 0);
    if (ea) mb = ml = mr = mt; else if (eo) { mb = mt; mr = ml; }
    
    const sm = document.getElementById('show_margin').checked;
    const show_crosshair = document.getElementById('show_crosshair').checked;
    
    const cw = Math.max(0.5, parseFloat(document.getElementById('cell_w').value) || 8);
    const ch = Math.max(0.5, parseFloat(document.getElementById('cell_h').value) || 8);
    const mc = document.getElementById('main_color').value;
    const sc = document.getElementById('sub_color').value;
    const lwm = Math.max(0.01, parseFloat(document.getElementById('lw_m').value) || 0.2);
    const lws = Math.max(0.01, parseFloat(document.getElementById('lw_s').value) || 0.1);
    const sct = Math.max(1, parseInt(document.getElementById('sub_count').value) || 3);
    const ds = Math.max(0.1, parseFloat(document.getElementById('dot_size').value) || 0.5);
    const cdsh = document.getElementById('c_dash').checked;
    const cdl = Math.max(0.5, parseFloat(document.getElementById('c_dash_len').value) || 2.0);
    const cdot = document.getElementById('c_dot').checked;
    const cds = Math.max(0.1, parseFloat(document.getElementById('c_ds').value) || 0.5);
    
    const ltop = document.getElementById('l_top').checked;
    const lbot = document.getElementById('l_bot').checked;
    const lbt = document.getElementById('l_b_t').checked;
    const lbb = document.getElementById('l_b_b').checked;
    const lbtw = Math.max(0.05, parseFloat(document.getElementById('l_b_t_w').value) || 0.5);
    const lbbw = Math.max(0.05, parseFloat(document.getElementById('l_b_b_w').value) || 0.5);
    const ltt = document.getElementById('l_t_t').checked;
    const ltb = document.getElementById('l_t_b').checked;
    const lttd = document.getElementById('l_t_t_dir').value;
    const ltbd = document.getElementById('l_t_b_dir').value;
    const lts = Math.max(0.5, parseFloat(document.getElementById('l_tick_spc').value) || 5);

    const he = document.getElementById('h_en').checked && !['tian','mi','xie'].includes(pa);
    const hs = document.getElementById('h_style').value;
    const hd = document.getElementById('h_hd').checked;
    const hn = document.getElementById('h_hn').checked;
    const hfs = Math.max(4, parseFloat(document.getElementById('h_fs').value) || 10);
    const hbw = Math.max(5, parseFloat(document.getElementById('h_bw').value) || 35);
    const hpos = document.getElementById('h_pos').value;
    const hct = document.getElementById('h_color_type').value;
    const hc = document.getElementById('h_color').value;
    const hmirror = document.getElementById('h_mirror').checked;
    const hox = parseFloat(document.getElementById('h_off_x').value) || 0;
    const hfont = document.getElementById('h_font').value;
    let hoy = parseFloat(document.getElementById('h_off_y').value) || 0;

    const br_en = document.getElementById('br_en').checked;
    const br_font = document.getElementById('br_font').value;
    const br_align = document.getElementById('br_align').value;

    const getBr = (pfx) => ({
        t1: document.getElementById(`br_${pfx}_t1`).value,
        s1: Math.max(1, parseFloat(document.getElementById(`br_${pfx}_s1`).value) || 14),
        c1: document.getElementById(`br_${pfx}_c1`).value,
        x1: parseFloat(document.getElementById(`br_${pfx}_x1`).value) || 0,
        y1: parseFloat(document.getElementById(`br_${pfx}_y1`).value) || 0,
        t2: document.getElementById(`br_${pfx}_t2`).value,
        s2: Math.max(1, parseFloat(document.getElementById(`br_${pfx}_s2`).value) || 8),
        c2: document.getElementById(`br_${pfx}_c2`).value,
        x2: parseFloat(document.getElementById(`br_${pfx}_x2`).value) || 0,
        y2: parseFloat(document.getElementById(`br_${pfx}_y2`).value) || 0,
        rot: parseFloat(document.getElementById(`br_${pfx}_rot`).value) || 0
    });

    const br_a = getBr('a');
    const br_b = getBr('b');
    const br_c = getBr('c');
    const br_d = getBr('d');

    const bs = document.getElementById('b_style').value;
    const bct = document.getElementById('b_color_type').value;
    const bc = (bct === 'main') ? mc : (bct === 'sub' ? sc : document.getElementById('b_color').value);
    const bict = document.getElementById('b_inner_color_type').value;
    const bic = (bict === 'main') ? mc : (bict === 'sub' ? sc : document.getElementById('b_inner_color').value);
    const bi = Math.max(0, parseFloat(document.getElementById('b_inset').value) || 1.0);
    const tb = document.getElementById('b_touch').checked;
    
    const cln = document.getElementById('center_line').checked;
    const clc = document.getElementById('cl_color').value;

    const ins = (bs === 'double' || bs === 'emboss') ? bi : 0;

    if (he) {
        let testH = isCrop ? (crop_rotated ? crop_w_orig : crop_h_orig) : fullPaperH;
        let uH = testH - mt - mb - (ins * 2);
        let r_est = Math.max(0, Math.floor(Math.round((uH / ch) * 10000) / 10000));
        let ry_est = (testH - (r_est * ch) - mt - mb - (ins * 2)) / 2;
        let gY = mt + ry_est + ins;
        let hOffYInput = document.getElementById('h_off_y');
        let defaultY = (hpos === 'top') ? (gY - (10 + hfs * 0.3)) : (gY + r_est * ch + 3);
        let boxHeight = hfs * 0.35 + 3; 
        let minY = -Math.floor(defaultY); 
        let maxY = Math.floor(testH - defaultY - boxHeight);
        hOffYInput.min = minY; hOffYInput.max = maxY;
        if (hoy < minY) { hoy = minY; hOffYInput.value = minY; }
        if (hoy > maxY) { hoy = maxY; hOffYInput.value = maxY; }
    }

    if (br_en) {
        let safeW = fullPaperW;
        let safeH = fullPaperH;
        if (['asym', 'multifold', 'booklet'].includes(lay)) safeW = fullPaperW / 2.0; 
        if (isCrop) { safeW = crop_rotated ? crop_h_orig : crop_w_orig; safeH = crop_rotated ? crop_w_orig : crop_h_orig; }
        
        const applyCapping = (obj, prefix) => {
            const limitX = Math.max(0, safeW / 2.0 - 5);
            const limitY = Math.max(0, safeH / 2.0 - 5);
            obj.x1 = Math.max(-limitX, Math.min(limitX, obj.x1));
            obj.y1 = Math.max(-limitY, Math.min(limitY, obj.y1));
            obj.x2 = Math.max(-limitX, Math.min(limitX, obj.x2));
            obj.y2 = Math.max(-limitY, Math.min(limitY, obj.y2));
            document.getElementById(`br_${prefix}_x1`).value = obj.x1.toFixed(0);
            document.getElementById(`br_${prefix}_y1`).value = obj.y1.toFixed(0);
            document.getElementById(`br_${prefix}_x2`).value = obj.x2.toFixed(0);
            document.getElementById(`br_${prefix}_y2`).value = obj.y2.toFixed(0);
        };
        applyCapping(br_a, 'a');
        if (dx || ['booklet', 'asym', 'multifold', 'crop'].includes(lay)) applyCapping(br_b, 'b');
        if (dx && ['booklet', 'asym', 'multifold', 'crop'].includes(lay)) { applyCapping(br_c, 'c'); applyCapping(br_d, 'd'); }
    }

    const pagesToDraw = [0];
    if (dx) pagesToDraw.push(1);

    const p = {
        lay: lay, asym_offset: asym_offset, asym_shift: asym_shift, dx: dx, bgW: bgW, bgH: bgH, fullPaperW: fullPaperW, fullPaperH: fullPaperH, offX: offX, offY: offY, pageSpacing: 10,
        crop_en: crop_en, crop_w: crop_w_orig, crop_h: crop_h_orig, crop_rotated: crop_rotated, fit_cols: fit_cols, fit_rows: fit_rows, machine_cut: machine_cut, hand_cut: hand_cut, panels_count: panels_count,
        p_mt: p_mt, p_mb: p_mb, p_ml: p_ml, p_mr: p_mr,
        ml: ml, mr: mr, mt: mt, mb: mb, ins: ins, cw: cw, ch: ch, sct: sct, ds: ds, mc: mc, sc: sc, lwm: lwm, lws: lws,
        cdsh: cdsh, cdl: cdl, cdot: cdot, cds: cds, ltop: ltop, lbot: lbot, lbt: lbt, lbb: lbb, lbtw: lbtw, lbbw: lbbw, ltt: ltt, ltb: ltb, lttd: lttd, ltbd: ltbd, lts: lts,
        he: he, hs: hs, hd: hd, hn: hn, hfs: hfs, hbw: hbw, hpos: hpos, hox: hox, hoy: hoy, hfont: hfont, hct: hct, hc: hc, hmirror: hmirror,
        br_en: br_en, br_font: br_font, br_align: br_align,
        br_a: br_a, br_b: br_b, br_c: br_c, br_d: br_d,
        sm: sm, show_crosshair: show_crosshair, bs: bs, bc: bc, bic: bic, bi: bi, tb: tb, cln: cln, clc: clc, pa: pa, pagesToDraw: pagesToDraw,
        pat_rot90: pat_rot90
    };

    if (typeof VectorEngine !== 'undefined') {
        const res = VectorEngine.render(p);

        const cfg = {
            paper: { w: pW, h: pH, lay: lay, asym_offset: asym_offset, asym_shift: asym_shift, cl: cln, clc: clc, dx: dx, crop_en: crop_en, crop_w: crop_w_orig, crop_h: crop_h_orig, crop_rotated: crop_rotated, fit_cols: fit_cols, fit_rows: fit_rows, machine_cut: machine_cut, hand_cut: hand_cut, panels_count: panels_count, p_mt: p_mt, p_mb: p_mb, p_ml: p_ml, p_mr: p_mr },
            margin: { t: mt, b: mb, l: ml, r: mr },
            pattern: { 
                type: pa, cw: cw, ch: ch, mc: hexToRgb(mc), lwm: lwm, sc: hexToRgb(sc), lws: lws, 
                sct: sct, ds: ds, cdsh: cdsh, cdl: cdl, cdot: cdot, cds: cds, 
                ltop: ltop, lbot: lbot, lbt: lbt, lbb: lbb, lbtw: lbtw, lbbw: lbbw, 
                ltt: ltt, ltb: ltb, lttd: lttd, ltbd: ltbd, lts: lts, pat_rot90: pat_rot90 
            },
            border: { style: bs, bc: hexToRgb(bc), bic: hexToRgb(bic), bi: bi, tb: tb },
            header: { en: he, style: hs, hd: hd, hn: hn, hfs: hfs, hbw: hbw, hpos: hpos, hox: hox, hoy: hoy, font: hfont, ct: hct, c: hexToRgb(hc), mirror: hmirror },
            brand: {
                en: br_en, font: br_font, align: br_align,
                a_t1: br_a.t1, a_s1: br_a.s1, a_c1: hexToRgb(br_a.c1), a_x1: br_a.x1, a_y1: br_a.y1,
                a_t2: br_a.t2, a_s2: br_a.s2, a_c2: hexToRgb(br_a.c2), a_x2: br_a.x2, a_y2: br_a.y2, a_rot: br_a.rot,
                b_t1: br_b.t1, b_s1: br_b.s1, b_c1: hexToRgb(br_b.c1), b_x1: br_b.x1, b_y1: br_b.y1,
                b_t2: br_b.t2, b_s2: br_b.s2, b_c2: hexToRgb(br_b.c2), b_x2: br_b.x2, b_y2: br_b.y2, b_rot: br_b.rot,
                c_t1: br_c.t1, c_s1: br_c.s1, c_c1: hexToRgb(br_c.c1), c_x1: br_c.x1, c_y1: br_c.y1,
                c_t2: br_c.t2, c_s2: br_c.s2, c_c2: hexToRgb(br_c.c2), c_x2: br_c.x2, c_y2: br_c.y2, c_rot: br_c.rot,
                d_t1: br_d.t1, d_s1: br_d.s1, d_c1: hexToRgb(br_d.c1), d_x1: br_d.x1, d_y1: br_d.y1,
                d_t2: br_d.t2, d_s2: br_d.s2, d_c2: hexToRgb(br_d.c2), d_x2: br_d.x2, d_y2: br_d.y2, d_rot: br_d.rot
            }
        };
        document.getElementById('config_payload').value = JSON.stringify(cfg);

        const sp = document.getElementById('statsPanel');
        if (sp) {
            let h = ``;
            if (isCrop) {
                h += `<b>總裁切張數:</b> 單面可切 ${res.total_pages} 張目標紙張<br>`;
            }
            if (pa !== 'blank') {
                const ss = ch / (sct + 1);
                h += `<b>格式 (面板):</b> ${res.c} 列 × ${res.r} 行<br>`;
                h += `<b>實際邊界:</b> 上:${res.amt.toFixed(1)} 下:${res.amb.toFixed(1)} 左:${res.aml.toFixed(1)} 右:${res.amr.toFixed(1)}`;
                if (pa === 'french') h += `<br><b>副線間距:</b> ${ss.toFixed(2)} mm`;
            } else {
                h += `<b>空白紙模式:</b> 僅生成純邊界與輔助標記`;
            }
            sp.innerHTML = h;
        }
    }
}

function initApp() {
    populateSizeDropdowns();
    populateGlobalPresets();
    
    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    let defLang = 'en';
    if (browserLang.includes('zh-tw') || browserLang.includes('zh-hk') || browserLang === 'zh-hant') { defLang = 'zh'; } 
    else if (browserLang.includes('zh-cn') || browserLang.includes('zh-hans') || browserLang === 'zh') { defLang = 'zh-cn'; }
    const ls = document.getElementById('lang_selector');
    if (ls) ls.value = defLang;

    document.getElementById('lang_selector').addEventListener('change', applyLang);
    applyLang();

    const ea = document.getElementById('eq_all'), eo = document.getElementById('eq_opp');
    ea.addEventListener('change', () => { if (ea.checked) eo.checked = false; updateUI(); });
    eo.addEventListener('change', () => { if (eo.checked) ea.checked = false; updateUI(); });
    
    document.querySelectorAll('select, input').forEach(i => {
        if (!['config_payload', 'preset_name', 'preset_w', 'preset_h', 'global_preset_name', 'print_preset'].includes(i.id)) { 
            const handleInput = (e) => {
                if (e && e.target) {
                    const tid = e.target.id;
                    if (tid === 'layout') {
                        let newLay = e.target.value;
                        if (newLay === 'crop' && lastLayout !== 'crop') {
                            document.getElementById('pattern').value = 'blank';
                            document.getElementById('crop_en').checked = true;
                        }
                        if (newLay !== lastLayout) {
                            if (['single', 'crop'].includes(newLay)) {
                                document.getElementById('br_a_rot').value = 270;
                                document.getElementById('br_b_rot').value = 90;
                                document.getElementById('br_c_rot').value = 270;
                                document.getElementById('br_d_rot').value = 90;
                            } else {
                                document.getElementById('br_a_rot').value = 90;
                                document.getElementById('br_b_rot').value = 270;
                                document.getElementById('br_c_rot').value = 90;
                                document.getElementById('br_d_rot').value = 270;
                            }
                        }
                        lastLayout = newLay;
                    } else if (['paper_type', 'pattern', 'crop_type'].includes(tid)) {
                        let currentLay = document.getElementById('layout').value;
                        if (['single', 'crop'].includes(currentLay)) {
                            document.getElementById('br_a_rot').value = 270;
                            document.getElementById('br_b_rot').value = 90;
                            document.getElementById('br_c_rot').value = 270;
                            document.getElementById('br_d_rot').value = 90;
                        } else {
                            document.getElementById('br_a_rot').value = 90;
                            document.getElementById('br_b_rot').value = 270;
                            document.getElementById('br_c_rot').value = 90;
                            document.getElementById('br_d_rot').value = 270;
                        }
                    }
                }

                if (!isApplyingPreset) {
                    const pp = document.getElementById('print_preset');
                    if (pp && pp.value !== '') {
                        pp.value = '';
                        document.getElementById('btn_del_preset').classList.add('hidden');
                    }
                }
                updateUI();
            };
            i.addEventListener('input', handleInput); 
            i.addEventListener('change', handleInput); 
        }
    });

    document.getElementById('print_preset').addEventListener('change', (e) => {
        const name = e.target.value;
        if (name) {
            let presets = JSON.parse(localStorage.getItem('globalPresets') || '{}');
            if (presets[name] && presets[name].inputs) {
                isApplyingPreset = true; 
                let state = presets[name].inputs;
                for (let id in state) {
                    let el = document.getElementById(id);
                    if (el && el.id !== 'print_preset') {
                        if (el.type === 'checkbox') el.checked = state[id];
                        else el.value = state[id];
                    }
                }
                lastLayout = document.getElementById('layout').value;
                updateUI(); 
                isApplyingPreset = false;
            }
        }
        document.getElementById('btn_del_preset').classList.toggle('hidden', name === '');
    });

    document.getElementById('btn_del_preset').addEventListener('click', () => {
        const name = document.getElementById('print_preset').value;
        if (name && confirm(`確定要刪除預設集 "${name}" 嗎？`)) {
            let presets = JSON.parse(localStorage.getItem('globalPresets') || '{}');
            delete presets[name];
            localStorage.setItem('globalPresets', JSON.stringify(presets));
            document.getElementById('print_preset').value = '';
            populateGlobalPresets();
        }
    });

    document.getElementById('btn_save_preset').addEventListener('click', () => {
        const patSelect = document.getElementById('pattern');
        const patText = patSelect.options[patSelect.selectedIndex].text;
        const ptSelect = document.getElementById('paper_type');
        const ptText = ptSelect.options[ptSelect.selectedIndex].text.split(' ')[0];
        const pt = document.getElementById('paper_type').value;
        const [w, h] = getDims(pt, 'custom_w', 'custom_h');
        
        const defName = `${patText}-${ptText}-${w}mm x ${h}mm`;
        document.getElementById('global_preset_name').value = defName;
        document.getElementById('globalPresetModal').classList.remove('hidden');
    });

    document.getElementById('btn_gpreset_cancel').addEventListener('click', () => {
        document.getElementById('globalPresetModal').classList.add('hidden');
    });

    document.getElementById('btn_gpreset_save').addEventListener('click', () => {
        let name = document.getElementById('global_preset_name').value.trim();
        if (!name) { alert('請輸入名稱'); return; }
        
        let state = {};
        document.querySelectorAll('#pdfForm input, #pdfForm select').forEach(el => {
            if (el.id && !['config_payload', 'print_preset', 'preset_name', 'preset_w', 'preset_h', 'global_preset_name'].includes(el.id)) {
                state[el.id] = el.type === 'checkbox' ? el.checked : el.value;
            }
        });
        
        let presets = JSON.parse(localStorage.getItem('globalPresets') || '{}');
        presets[name] = {
            version: 1, 
            timestamp: Date.now(),
            inputs: state
        };
        localStorage.setItem('globalPresets', JSON.stringify(presets));
        
        populateGlobalPresets();
        document.getElementById('print_preset').value = name;
        document.getElementById('btn_del_preset').classList.remove('hidden');
        document.getElementById('globalPresetModal').classList.add('hidden');
    });

    document.getElementById('btn_preset_cancel').addEventListener('click', () => {
        document.getElementById('presetModal').classList.add('hidden');
    });

    document.getElementById('btn_preset_save').addEventListener('click', () => {
        let name = document.getElementById('preset_name').value.trim();
        if(!name) { alert('請輸入名稱'); return; }
        let w = parseFloat(document.getElementById('preset_w').value);
        let h = parseFloat(document.getElementById('preset_h').value);
        let customSizes = JSON.parse(localStorage.getItem('customPaperSizes') || '{}');
        customSizes[name] = [w, h];
        localStorage.setItem('customPaperSizes', JSON.stringify(customSizes));
        
        populateSizeDropdowns();
        
        if (currentPresetTarget === 'paper') {
            document.getElementById('paper_type').value = 'C_' + name;
        } else {
            document.getElementById('crop_type').value = 'C_' + name;
        }
        
        document.getElementById('presetModal').classList.add('hidden');
        updateUI();
    });

    document.addEventListener('click', e => {
        if (e.target.classList.contains('brand-swatch')) {
            const color = e.target.getAttribute('data-color');
            ['a', 'b', 'c', 'd'].forEach(pfx => {
                const el = document.getElementById(`br_${pfx}_c1`);
                if(el) { el.value = color; el.dispatchEvent(new Event('input')); }
            });
        }
        else if (e.target.classList.contains('swatch')) {
            const c = e.target.getAttribute('data-color'), tc = e.target.closest('.color-presets');
            if (tc) { 
                const ti = document.getElementById(tc.getAttribute('data-target')); 
                if (ti) { ti.value = c; ti.dispatchEvent(new Event('input')); updateUI(); }
            }
        }
    });

    if (typeof PanZoomPlugin !== 'undefined' && typeof PanZoomPlugin.init === 'function') {
        PanZoomPlugin.init('previewContainer', 'zoom_tip', '.preview-panel');
    }

    // 绑定矢量导出按钮事件
    const btnVecPdf = document.getElementById('btn_export_vec_pdf');
    if (btnVecPdf) btnVecPdf.addEventListener('click', exportVecPDF);

    const btnSvg = document.getElementById('btn_export_svg');
    if (btnSvg) btnSvg.addEventListener('click', exportSVG);
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initApp); } else { initApp(); }