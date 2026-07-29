/**
 * 專業手帳內頁生成器 - 獨立平移縮放外掛 (Pan & Zoom Core)
 * 專注於攔截指標與滾輪事件，透過 CSS 幾何矩陣對向量容器進行硬體加速縮放
 */
const PanZoomPlugin = (function() {
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let evCache = [];
    let prevDiff = -1;

    let cvs = null;
    let panel = null;
    let tip = null;
    let controls = null;
    let zoomDisplay = null;

    function applyTransform() {
        if (scale <= 1.05) {
            cvs.style.transform = 'none';
            cvs.style.cursor = 'zoom-in';
            if (tip) tip.style.display = 'block';
            if (zoomDisplay) zoomDisplay.textContent = '100%';
        } else {
            cvs.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
            cvs.style.cursor = isDragging ? 'grabbing' : 'grab';
            if (tip) tip.style.display = 'none';
            if (zoomDisplay) zoomDisplay.textContent = `${Math.round(scale * 100)}%`;
        }
    }

    function setZoom(newScale) {
        if (!cvs || newScale > 1.05 && newScale <= 1.05) return;
        cvs.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
        scale = Math.max(1, Math.min(6, newScale));
        if (scale <= 1.05) { scale = 1; panX = 0; panY = 0; }
        applyTransform();
    }

    function removeEvent(e) {
        for (let i = 0; i < evCache.length; i++) {
            if (evCache[i].pointerId === e.pointerId) {
                evCache.splice(i, 1);
                break;
            }
        }
    }

    function init(canvasId, tipId, panelSelector) {
        cvs = document.getElementById(canvasId);
        tip = document.getElementById(tipId);
        panel = document.querySelector(panelSelector);

        if (!cvs || !panel) return;

        cvs.style.touchAction = 'none';
        cvs.style.transformOrigin = 'center center';
        cvs.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';

        // 創建縮放控制 UI（含 emoji style 按鈕與倍率顯示）
        controls = document.createElement('div');
        controls.style.cssText = 'position:absolute;top:15px;right:15px;display:flex;gap:4px;align-items:center;background:rgba(255,255,255,0.85);padding:4px;border-radius:24px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:10;border:1px solid rgba(255,255,255,0.9);';
        
        const btnStyle = 'width:34px;height:34px;font-size:20px;border:none;background:transparent;cursor:pointer;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background 0.2s;padding:0;line-height:1;';
        const btnHover = 'background:rgba(43,108,176,0.15);';
        
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.title = '縮小';
        zoomOutBtn.innerHTML = '➖';
        zoomOutBtn.style.cssText = btnStyle;
        
        zoomDisplay = document.createElement('div');
        zoomDisplay.style.cssText = 'width:48px;text-align:center;font-size:12px;font-weight:bold;color:#2b6cb0;background:rgba(226,232,240,0.6);padding:2px 0;border-radius:10px;line-height:1.4;';
        
        const zoomInBtn = document.createElement('button');
        zoomInBtn.title = '放大';
        zoomInBtn.innerHTML = '➕';
        zoomInBtn.style.cssText = btnStyle;
        
        const resetBtn = document.createElement('button');
        resetBtn.title = '重置';
        resetBtn.innerHTML = '🔄';
        resetBtn.style.cssText = btnStyle;
        
        zoomInBtn.onmouseenter = () => zoomInBtn.style.background = btnHover;
        zoomInBtn.onmouseleave = () => zoomInBtn.style.background = 'transparent';
        zoomOutBtn.onmouseenter = () => zoomOutBtn.style.background = btnHover;
        zoomOutBtn.onmouseleave = () => zoomOutBtn.style.background = 'transparent';
        resetBtn.onmouseenter = () => resetBtn.style.background = btnHover;
        resetBtn.onmouseleave = () => resetBtn.style.background = 'transparent';
        
        zoomOutBtn.onclick = () => setZoom(scale - 0.5);
        zoomInBtn.onclick = () => setZoom(scale + 0.5);
        resetBtn.onclick = () => setZoom(1);
        
        controls.appendChild(zoomOutBtn);
        controls.appendChild(zoomDisplay);
        controls.appendChild(zoomInBtn);
        controls.appendChild(resetBtn);
        
        panel.style.position = 'relative';
        panel.appendChild(controls);
        
        applyTransform();

        cvs.addEventListener('dblclick', () => {
            scale = 1; panX = 0; panY = 0; applyTransform();
        });

        cvs.addEventListener('pointerdown', (e) => {
            evCache.push(e);
            if (scale > 1.05) {
                isDragging = true;
                cvs.style.transition = 'none';
                if (evCache.length === 1) {
                    startX = e.clientX - panX;
                    startY = e.clientY - panY;
                }
            }
            cvs.setPointerCapture(e.pointerId);
        });

        cvs.addEventListener('pointermove', (e) => {
            for (let i = 0; i < evCache.length; i++) {
                if (e.pointerId === evCache[i].pointerId) {
                    evCache[i] = e;
                    break;
                }
            }

            if (evCache.length === 2) {
                isDragging = false;
                cvs.style.transition = 'none';
                const curDiff = Math.hypot(
                    evCache[0].clientX - evCache[1].clientX,
                    evCache[0].clientY - evCache[1].clientY
                );
                if (prevDiff > 0) {
                    const delta = (curDiff - prevDiff) * 0.015;
                    scale = Math.max(1, Math.min(6, scale + delta));
                }
                prevDiff = curDiff;
                applyTransform();
            } 
            else if (evCache.length === 1 && isDragging) {
                panX = e.clientX - startX;
                panY = e.clientY - startY;
                applyTransform();
            }
        });

        function handlePointerUp(e) {
            removeEvent(e);
            if (evCache.length < 2) prevDiff = -1;
            if (evCache.length === 0) {
                isDragging = false;
                cvs.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
                if (scale <= 1.05) { scale = 1; panX = 0; panY = 0; }
            }
            try { cvs.releasePointerCapture(e.pointerId); } catch(err) {}
            applyTransform();
        }

        cvs.addEventListener('pointerup', handlePointerUp);
        cvs.addEventListener('pointercancel', handlePointerUp);

        panel.addEventListener('wheel', (e) => {
            e.preventDefault();
            cvs.style.transition = 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)';
            const delta = e.deltaY > 0 ? -0.25 : 0.25;
            scale = Math.max(1, Math.min(6, scale + delta));
            if (scale <= 1.05) { scale = 1; panX = 0; panY = 0; }
            applyTransform();
        }, { passive: false });
    }

    return {
        init: init,
        getScale: () => scale,
        setZoom: setZoom
    };
})();