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

    function applyTransform() {
        if (scale <= 1.05) {
            cvs.style.transform = 'none';
            cvs.style.cursor = 'zoom-in';
            if (tip) tip.style.display = 'block';
        } else {
            cvs.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
            cvs.style.cursor = isDragging ? 'grabbing' : 'grab';
            if (tip) tip.style.display = 'none';
        }
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
        getScale: () => scale
    };
})();