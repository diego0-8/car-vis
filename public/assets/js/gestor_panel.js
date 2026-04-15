(function () {
    const indexUrl = window.__VISUAL_INDEX__ || '';
    const msg = document.getElementById('dash-message');
    const grid = document.getElementById('campaign-grid');
    const elMonthDaily = document.getElementById('chart-month-daily');
    const elMonthRange = document.getElementById('chart-month-range');
    const elMonthScroll = document.getElementById('chart-month-scroll');
    const elPie = document.getElementById('chart-pie');
    const elPieLegend = document.getElementById('chart-pie-legend');
    const elPieRange = document.getElementById('chart-pie-range');
    const tabs = document.querySelectorAll('.period-tab');
    const customWrap = document.getElementById('custom-range');
    const inpFrom = document.getElementById('filter-from');
    const inpTo = document.getElementById('filter-to');
    const btnCustom = document.getElementById('btn-apply-custom');
    const rangeSummary = document.getElementById('range-summary');
    const btnLogout = document.getElementById('btn-logout');

    let currentPreset = 'today';
    let cargando = false;
    let primeraCargaCompleta = false;
    /** @type {Record<string, number>|null} */
    let totalesAnteriores = null;
    let ultimaFirmaPeriodo = '';

    let notificationAudioEl = null;
    let notificationAudioSrc = '';
    let audioUnlockedForNotification = false;

    /** @type {{monthKey:string, series:Array<{bucket:string,total:number}>, fetchedAt:number}|null} */
    let monthCache = null;
    /** @type {Array<{bucket:string,total:number}>|null} */
    let lastMonthSeries = null;
    /** @type {Array<{key?:string,label?:string,total?:number}>|null} */
    let lastPieRows = null;
    /** @type {{slices:Array<{a0:number,a1:number,label:string,total:number,color:string}>, cx:number, cy:number, rOuter:number, rInner:number, dpr:number}|null} */
    let lastPieGeom = null;
    /** @type {{padL:number,padR:number,padT:number,padB:number,plotW:number,plotH:number,w:number,h:number,dpr:number}|null} */
    let lastMonthGeom = null;

    let tooltipEl = null;

    // #region agent log
    fetch('http://127.0.0.1:7530/ingest/db0844c5-301c-4cc2-9637-08cd6208544e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6ae59a'},body:JSON.stringify({sessionId:'6ae59a',runId:'pre-fix',hypothesisId:'H_CACHE',location:'gestor_panel.js:init',message:'script loaded',data:{indexUrl:!!indexUrl,href:String(window.location&&window.location.href||''),userAgent:String(navigator&&navigator.userAgent||''),ts:Date.now()},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

    const DEBUG_AGENT = false;
    function agentLog(hypothesisId, location, message, data) {
        if (!DEBUG_AGENT) {
            return;
        }
        try {
            // eslint-disable-next-line no-console
            console.debug('[agentLog]', {
                hypothesisId: hypothesisId,
                location: location,
                message: message,
                data: data || {},
                timestamp: Date.now(),
            });
        } catch (e) {}
    }

    function getToastStack() {
        let el = document.getElementById('toast-stack');
        if (!el) {
            el = document.createElement('div');
            el.id = 'toast-stack';
            el.className = 'toast-stack';
            document.body.appendChild(el);
        }
        return el;
    }

    function showToastGreen(text) {
        if (!text) {
            return;
        }
        const stack = getToastStack();
        const t = document.createElement('div');
        t.className = 'toast';
        t.setAttribute('role', 'status');
        t.setAttribute('aria-live', 'polite');
        t.textContent = text;
        stack.appendChild(t);

        window.setTimeout(function () {
            t.classList.add('is-hiding');
            window.setTimeout(function () {
                try {
                    t.remove();
                } catch (e) {}
            }, 220);
        }, 30000);
    }

    function getOrCreateNotificationAudio() {
        const url = window.__VISUAL_NOTIFICATION_MP3__ || '';
        if (!url) {
            return null;
        }
        if (!notificationAudioEl || notificationAudioSrc !== url) {
            notificationAudioEl = new Audio(url);
            notificationAudioEl.preload = 'auto';
            notificationAudioSrc = url;
            audioUnlockedForNotification = false;
        }
        return notificationAudioEl;
    }

    function tryUnlockNotificationAudio() {
        if (audioUnlockedForNotification) {
            return;
        }
        const a = getOrCreateNotificationAudio();
        if (!a) {
            return;
        }
        const vol = a.volume;
        a.volume = 0;
        a.play()
            .then(function () {
                a.pause();
                a.currentTime = 0;
                a.volume = vol > 0 ? vol : 0.35;
                audioUnlockedForNotification = true;
                agentLog('C', 'gestor_panel.js:tryUnlockNotificationAudio', 'unlocked', { runId: 'sound-fix' });
            })
            .catch(function () {
                a.volume = vol > 0 ? vol : 0.35;
            });
    }

    document.documentElement.addEventListener(
        'pointerdown',
        tryUnlockNotificationAudio,
        { capture: true, passive: true }
    );
    document.documentElement.addEventListener(
        'keydown',
        tryUnlockNotificationAudio,
        { capture: true, passive: true }
    );

    function showMessage(text, isError) {
        if (!text) {
            msg.hidden = true;
            msg.textContent = '';
            return;
        }
        msg.hidden = false;
        msg.textContent = text;
        msg.style.color = isError ? '#fecaca' : '#bbf7d0';
    }

    function todayISO() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    function monthKeyLocal() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return y + '-' + m;
    }

    function palette(i) {
        const colors = [
            '#22c55e',
            '#38bdf8',
            '#a78bfa',
            '#f97316',
            '#f43f5e',
            '#eab308',
            '#34d399',
            '#60a5fa',
            '#fb7185',
            '#c084fc',
        ];
        return colors[i % colors.length];
    }

    function getOrCreateTooltip() {
        if (tooltipEl) return tooltipEl;
        const el = document.createElement('div');
        el.className = 'chart-tooltip';
        el.hidden = true;
        document.body.appendChild(el);
        tooltipEl = el;
        return el;
    }

    function showTooltip(x, y, html) {
        const el = getOrCreateTooltip();
        if (!html) {
            hideTooltip();
            return;
        }
        el.innerHTML = html;
        el.hidden = false;
        const pad = 14;
        const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        // posicionar sin salirse
        el.style.left = Math.min(vw - pad, Math.max(pad, x + 12)) + 'px';
        el.style.top = Math.min(vh - pad, Math.max(pad, y + 12)) + 'px';
        el.classList.add('is-show');
    }

    function hideTooltip() {
        const el = getOrCreateTooltip();
        el.classList.remove('is-show');
        el.hidden = true;
    }

    function clearCanvas(c) {
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
    }

    function setCanvasSize(canvas, cssW, cssH) {
        const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        canvas.width = Math.max(1, Math.floor(cssW * dpr));
        canvas.height = Math.max(1, Math.floor(cssH * dpr));
        return dpr;
    }

    function drawPieChart(canvas, rows) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const total = (rows || []).reduce(function (acc, r) {
            return acc + (r && r.total ? Number(r.total) : 0);
        }, 0);
        if (!rows || rows.length === 0 || total <= 0) {
            ctx.fillStyle = 'rgba(148,163,184,0.9)';
            ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
            ctx.fillText('Sin datos', 16, 28);
            return;
        }

        const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
        const cx = Math.round(w * 0.5);
        const cy = Math.round(h * 0.48);
        const r = Math.round(Math.min(w * 0.42, h * 0.42));
        const rInner = Math.round(r * 0.58);

        /** @type {Array<{a0:number,a1:number,label:string,total:number,color:string}>} */
        const slices = [];

        let a0 = -Math.PI / 2;
        for (let i = 0; i < rows.length; i++) {
            const v = Number(rows[i].total || 0);
            if (v <= 0) continue;
            const frac = v / total;
            const a1 = a0 + frac * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, a0, a1);
            ctx.closePath();
            const col = palette(i);
            ctx.fillStyle = col;
            ctx.fill();
            slices.push({
                a0: a0,
                a1: a1,
                label: String(rows[i].label || rows[i].key || '—'),
                total: v,
                color: col,
            });
            a0 = a1;
        }

        // hueco central para look moderno
        ctx.beginPath();
        ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(11,18,32,0.9)';
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '800 18px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(total), cx, cy + 6);
        ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('total', cx, cy + 24);
        ctx.textAlign = 'start';

        lastPieGeom = { slices: slices, cx: cx, cy: cy, rOuter: r, rInner: rInner, dpr: dpr };
    }

    function renderPieLegend(rows) {
        if (!elPieLegend) return;
        elPieLegend.innerHTML = '';
        (rows || []).forEach(function (r, i) {
            const item = document.createElement('div');
            item.className = 'pie-legend-item';
            const dot = document.createElement('span');
            dot.className = 'pie-dot';
            dot.style.background = palette(i);
            const lab = document.createElement('div');
            lab.className = 'pie-label';
            const name = document.createElement('span');
            name.className = 'pie-label-name';
            name.textContent = r.label || r.key || '—';
            const val = document.createElement('span');
            val.className = 'pie-label-val';
            val.textContent = String(r.total != null ? r.total : 0);
            lab.appendChild(name);
            lab.appendChild(val);
            item.appendChild(dot);
            item.appendChild(lab);
            elPieLegend.appendChild(item);
        });
        if (!rows || rows.length === 0) {
            elPieLegend.innerHTML = '<p class="chart-sub">Sin campañas.</p>';
        }
    }

    function drawLineChartMonth(canvas, series) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        if (!series || series.length === 0) {
            ctx.fillStyle = 'rgba(148,163,184,0.9)';
            ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
            ctx.fillText('Sin datos', 16, 28);
            return;
        }

        const padL = 46;
        const padR = 16;
        const padT = 16;
        const padB = 34;
        const plotW = w - padL - padR;
        const plotH = h - padT - padB;

        const values = series.map(function (p) {
            return Number(p.total || 0);
        });
        const maxV = Math.max(1, Math.max.apply(null, values));
        const ticks = 5;
        const step = Math.ceil(maxV / ticks);
        const yMax = step * ticks;

        // grid
        ctx.strokeStyle = 'rgba(148,163,184,0.18)';
        ctx.lineWidth = 1;
        for (let t = 0; t <= ticks; t++) {
            const y = padT + (plotH * t) / ticks;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(padL + plotW, y);
            ctx.stroke();
        }

        // y labels
        ctx.fillStyle = 'rgba(148,163,184,0.85)';
        ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let t = 0; t <= ticks; t++) {
            const v = yMax - step * t;
            const y = padT + (plotH * t) / ticks;
            ctx.fillText(String(v), padL - 8, y);
        }
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';

        function xFor(i) {
            if (series.length === 1) return padL + plotW / 2;
            return padL + (plotW * i) / (series.length - 1);
        }
        function yFor(v) {
            return padT + plotH - (plotH * v) / yMax;
        }

        // line
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < series.length; i++) {
            const x = xFor(i);
            const y = yFor(Number(series[i].total || 0));
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // points (cada 3 días para no saturar)
        ctx.fillStyle = '#0ea5e9';
        for (let i = 0; i < series.length; i++) {
            if (i % 3 !== 0 && i !== series.length - 1) continue;
            const x = xFor(i);
            const y = yFor(Number(series[i].total || 0));
            ctx.beginPath();
            ctx.arc(x, y, 3.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // x labels (cada ~7 días)
        ctx.fillStyle = 'rgba(148,163,184,0.85)';
        ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.textAlign = 'center';
        const every = Math.max(1, Math.round(series.length / 5));
        for (let i = 0; i < series.length; i++) {
            if (i % every !== 0 && i !== series.length - 1) continue;
            const x = xFor(i);
            const d = String(series[i].bucket || '').slice(5); // MM-DD
            ctx.fillText(d, x, padT + plotH + 22);
        }
        ctx.textAlign = 'start';

        lastMonthGeom = {
            padL: padL,
            padR: padR,
            padT: padT,
            padB: padB,
            plotW: plotW,
            plotH: plotH,
            w: w,
            h: h,
            dpr: Math.max(1, Math.round(window.devicePixelRatio || 1)),
        };
    }

    function resizeAndDrawMonth(series) {
        if (!elMonthDaily) return;
        const cssH = 320;
        const days = series && series.length ? series.length : 31;
        const cssW = Math.max(920, 46 + 16 + days * 32);
        setCanvasSize(elMonthDaily, cssW, cssH);
        drawLineChartMonth(elMonthDaily, series || []);

        // #region agent log
        try {
            const vpW = window.innerWidth || 0;
            const sect = document.querySelector('.charts-section--full');
            const shell = document.querySelector('.charts-shell');
            const gridEl = document.querySelector('.charts-grid');
            const card = elMonthDaily.closest('.chart-card');
            const scr = document.getElementById('chart-month-scroll');
            fetch('http://127.0.0.1:7530/ingest/db0844c5-301c-4cc2-9637-08cd6208544e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6ae59a'},body:JSON.stringify({sessionId:'6ae59a',runId:'layout',hypothesisId:'H_OVERFLOW',location:'gestor_panel.js:resizeAndDrawMonth',message:'month sizes',data:{vpW:vpW,sectionW:sect&&sect.getBoundingClientRect?Math.round(sect.getBoundingClientRect().width):null,shellW:shell&&shell.getBoundingClientRect?Math.round(shell.getBoundingClientRect().width):null,gridW:gridEl&&gridEl.getBoundingClientRect?Math.round(gridEl.getBoundingClientRect().width):null,cardW:card&&card.getBoundingClientRect?Math.round(card.getBoundingClientRect().width):null,scrollClientW:scr?Math.round(scr.clientWidth):null,scrollScrollW:scr?Math.round(scr.scrollWidth):null,canvasCssW:elMonthDaily.style.width||'',canvasPxW:elMonthDaily.width},timestamp:Date.now()})}).catch(()=>{});
        } catch (e) {}
        // #endregion agent log
    }

    function resizeAndDrawPie(rows) {
        if (!elPie) return;
        const parent = elPie.parentElement;
        const wrapW = parent ? parent.clientWidth : 520;
        const cssW = Math.max(260, Math.min(700, wrapW || 520));
        const cssH = 320;
        setCanvasSize(elPie, cssW, cssH);
        drawPieChart(elPie, rows || []);

        // #region agent log
        try {
            const vpW = window.innerWidth || 0;
            const gridEl = document.querySelector('.charts-grid');
            const card = elPie.closest('.chart-card');
            fetch('http://127.0.0.1:7530/ingest/db0844c5-301c-4cc2-9637-08cd6208544e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6ae59a'},body:JSON.stringify({sessionId:'6ae59a',runId:'layout',hypothesisId:'H_OVERFLOW',location:'gestor_panel.js:resizeAndDrawPie',message:'pie sizes',data:{vpW:vpW,gridW:gridEl&&gridEl.getBoundingClientRect?Math.round(gridEl.getBoundingClientRect().width):null,cardW:card&&card.getBoundingClientRect?Math.round(card.getBoundingClientRect().width):null,parentW:parent?Math.round(parent.clientWidth):null,canvasCssW:elPie.style.width||'',canvasPxW:elPie.width},timestamp:Date.now()})}).catch(()=>{});
        } catch (e) {}
        // #endregion agent log
    }

    function attachTooltipHandlersOnce() {
        if (elMonthDaily && !elMonthDaily.__tipBound) {
            elMonthDaily.__tipBound = true;
            elMonthDaily.addEventListener('mouseleave', hideTooltip);
            elMonthDaily.addEventListener('mousemove', function (ev) {
                if (!lastMonthSeries || !lastMonthGeom) return;
                const r = elMonthDaily.getBoundingClientRect();
                const xCss = ev.clientX - r.left;
                const yCss = ev.clientY - r.top;
                // convertir a coords canvas (px internos)
                const x = (xCss * elMonthDaily.width) / Math.max(1, r.width);
                const y = (yCss * elMonthDaily.height) / Math.max(1, r.height);

                const g = lastMonthGeom;
                if (x < g.padL || x > g.w - g.padR || y < g.padT || y > g.h - g.padB) {
                    hideTooltip();
                    return;
                }
                const rel = (x - g.padL) / Math.max(1, g.plotW);
                const idx = Math.max(0, Math.min(lastMonthSeries.length - 1, Math.round(rel * (lastMonthSeries.length - 1))));
                const p = lastMonthSeries[idx];
                if (!p) {
                    hideTooltip();
                    return;
                }
                showTooltip(
                    ev.clientX,
                    ev.clientY,
                    '<div class="muted">' +
                        String(p.bucket || '') +
                        '</div><div><b>' +
                        String(p.total != null ? p.total : 0) +
                        '</b> acuerdos</div>'
                );
            });
        }

        if (elPie && !elPie.__tipBound) {
            elPie.__tipBound = true;
            elPie.addEventListener('mouseleave', hideTooltip);
            elPie.addEventListener('mousemove', function (ev) {
                if (!lastPieGeom) return;
                const r = elPie.getBoundingClientRect();
                const xCss = ev.clientX - r.left;
                const yCss = ev.clientY - r.top;
                const x = (xCss * elPie.width) / Math.max(1, r.width);
                const y = (yCss * elPie.height) / Math.max(1, r.height);

                const g = lastPieGeom;
                const dx = x - g.cx;
                const dy = y - g.cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < g.rInner || dist > g.rOuter) {
                    hideTooltip();
                    return;
                }
                let ang = Math.atan2(dy, dx); // -PI..PI
                // normalizar a [0, 2PI) con base -PI/2 usada en el dibujo
                if (ang < -Math.PI / 2) {
                    ang += Math.PI * 2;
                }
                // buscar slice
                for (let i = 0; i < g.slices.length; i++) {
                    const s = g.slices[i];
                    if (ang >= s.a0 && ang < s.a1) {
                        showTooltip(
                            ev.clientX,
                            ev.clientY,
                            '<div class="muted">Distribución</div><div><b>' +
                                s.label +
                                '</b></div><div>' +
                                String(s.total) +
                                ' acuerdos</div>'
                        );
                        return;
                    }
                }
                hideTooltip();
            });
        }
    }

    async function loadMonthDaily() {
        if (!elMonthDaily) return;
        const mk = monthKeyLocal();
        // Siempre debe ir actualizándose aunque el filtro superior cambie:
        // refrescamos el mes actual con un TTL corto para no “pegarle” al backend en exceso.
        const now = Date.now();
        const fresh =
            monthCache &&
            monthCache.monthKey === mk &&
            typeof monthCache.fetchedAt === 'number' &&
            now - monthCache.fetchedAt < 15000;
        if (fresh) {
            drawLineChartMonth(elMonthDaily, monthCache.series);
            return;
        }
        const res = await fetch(indexUrl + '?r=api/stats/acuerdos-month-daily&month=' + encodeURIComponent(mk), {
            credentials: 'same-origin',
        });
        if (res.status === 401) {
            window.location.href = indexUrl + '?r=login';
            return;
        }
        const data = await res.json().catch(function () {
            return {};
        });
        if (!data.ok) {
            clearCanvas(elMonthDaily);
            if (elMonthRange) elMonthRange.textContent = 'No se pudo cargar la serie del mes.';
            return;
        }
        monthCache = { monthKey: mk, series: data.series || [], fetchedAt: now };
        lastMonthSeries = monthCache.series;
        if (elMonthRange) {
            elMonthRange.textContent = 'Mes: ' + (data.from || '') + ' — ' + (data.to || '');
        }
        resizeAndDrawMonth(monthCache.series);
        attachTooltipHandlersOnce();
    }

    function setActiveTab(preset) {
        tabs.forEach(function (t) {
            const on = t.getAttribute('data-preset') === preset;
            t.classList.toggle('is-active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        customWrap.hidden = preset !== 'custom';
        currentPreset = preset;
    }

    function buildQuery() {
        const qs = new URLSearchParams({ preset: currentPreset });
        if (currentPreset === 'custom') {
            qs.set('from', inpFrom.value);
            qs.set('to', inpTo.value);
        }
        return qs.toString();
    }

    function renderLoadingPlaceholders() {
        grid.innerHTML = '';
        const ph = document.createElement('div');
        ph.className = 'campaign-card campaign-card--loading';
        ph.innerHTML =
            '<span class="campaign-card__name">Cargando…</span>' +
            '<span class="campaign-card__total">…</span>' +
            '<span class="campaign-card__hint">Acuerdos de pago</span>';
        grid.appendChild(ph);
    }

    function renderCards(totals) {
        grid.innerHTML = '';
        (totals || []).forEach(function (row) {
            const card = document.createElement('article');
            card.className = 'campaign-card';
            card.setAttribute('data-campaign-key', row.key || '');
            if (row.error) {
                card.classList.add('campaign-card--error');
            }
            const name = document.createElement('span');
            name.className = 'campaign-card__name';
            name.textContent = row.label || row.key || '—';
            const total = document.createElement('span');
            total.className = 'campaign-card__total';
            total.textContent = row.error ? 'Error' : String(row.total != null ? row.total : 0);
            const hint = document.createElement('span');
            hint.className = 'campaign-card__hint';
            hint.textContent = 'Acuerdos de pago';
            card.appendChild(name);
            card.appendChild(total);
            card.appendChild(hint);
            grid.appendChild(card);
        });
        if (!totals || totals.length === 0) {
            grid.innerHTML = '<p class="range-summary">No hay campañas asignadas.</p>';
        }
    }

    function gridTieneTarjetasCampana() {
        return grid.querySelector('article.campaign-card[data-campaign-key]') != null;
    }

    /**
     * @param {Array<{key?: string, label?: string, total?: number, error?: string|null}>} totals
     * @returns {boolean}
     */
    function actualizarTotalesEnSitio(totals) {
        if (!totals || totals.length === 0) {
            return false;
        }
        const cards = grid.querySelectorAll('article.campaign-card[data-campaign-key]');
        if (cards.length !== totals.length) {
            return false;
        }
        const byKey = {};
        for (let i = 0; i < cards.length; i++) {
            const el = cards[i];
            const k = el.getAttribute('data-campaign-key') || '';
            if (!k || byKey[k]) {
                return false;
            }
            byKey[k] = el;
        }
        for (let j = 0; j < totals.length; j++) {
            if (!byKey[totals[j].key || '']) {
                return false;
            }
        }
        for (let j = 0; j < totals.length; j++) {
            const row = totals[j];
            const card = byKey[row.key || ''];
            const nameEl = card.querySelector('.campaign-card__name');
            const totalEl = card.querySelector('.campaign-card__total');
            if (!nameEl || !totalEl) {
                return false;
            }
            card.classList.toggle('campaign-card--error', !!row.error);
            nameEl.textContent = row.label || row.key || '—';
            totalEl.textContent = row.error ? 'Error' : String(row.total != null ? row.total : 0);
        }
        return true;
    }

    /**
     * @param {Array<{key?: string, total?: number, error?: string|null}>} totals
     * @returns {Record<string, number>}
     */
    function snapshotTotals(totals) {
        const m = {};
        (totals || []).forEach(function (row) {
            const k = row.key || '';
            if (!k) {
                return;
            }
            m[k] = row.error ? 0 : row.total != null ? Number(row.total) : 0;
        });
        return m;
    }

    /**
     * @param {Array<{key?: string, total?: number, error?: string|null}>} totals
     * @param {Record<string, number>|null} anterior
     */
    function hayIncremento(totals, anterior) {
        if (!anterior || !totals) {
            return false;
        }
        for (let i = 0; i < totals.length; i++) {
            const row = totals[i];
            if (row.error) {
                continue;
            }
            const k = row.key || '';
            const n = row.total != null ? Number(row.total) : 0;
            if (Object.prototype.hasOwnProperty.call(anterior, k) && n > anterior[k]) {
                return true;
            }
        }
        return false;
    }

    function detectarCampanaQueIncremento(totals, anterior) {
        if (!anterior || !totals) {
            return null;
        }
        /** @type {{key:string,label:string,delta:number}|null} */
        let best = null;
        for (let i = 0; i < totals.length; i++) {
            const row = totals[i] || {};
            if (row.error) {
                continue;
            }
            const k = row.key || '';
            if (!k || !Object.prototype.hasOwnProperty.call(anterior, k)) {
                continue;
            }
            const prev = Number(anterior[k] || 0);
            const now = row.total != null ? Number(row.total) : 0;
            const delta = now - prev;
            if (delta > 0 && (!best || delta > best.delta)) {
                best = { key: k, label: row.label || k, delta: delta };
            }
        }
        return best;
    }

    function playNotificationSound() {
        const audio = getOrCreateNotificationAudio();
        agentLog('A', 'gestor_panel.js:playNotificationSound', 'entry', {
            hasAudio: !!audio,
            unlocked: audioUnlockedForNotification,
            runId: 'sound-fix',
        });
        if (!audio) {
            return;
        }
        audio.volume = 0.35;
        audio.currentTime = 0;
        audio
            .play()
            .then(function () {
                agentLog('A', 'gestor_panel.js:playNotificationSound', 'play_ok', { runId: 'sound-fix' });
            })
            .catch(function (err) {
                agentLog('A', 'gestor_panel.js:playNotificationSound', 'play_fail', {
                    name: err && err.name,
                    detail: String((err && err.message) || err),
                    unlocked: audioUnlockedForNotification,
                    runId: 'sound-fix',
                });
            });
    }

    async function loadTotals() {
        if (currentPreset === 'custom' && (!inpFrom.value || !inpTo.value)) {
            showMessage('Elige fechas en personalizado y pulsa Aplicar.', true);
            return;
        }
        const silencioso = primeraCargaCompleta;
        showMessage('', false);
        if (!silencioso) {
            renderLoadingPlaceholders();
        } else {
            grid.setAttribute('aria-busy', 'true');
        }
        try {
            const res = await fetch(indexUrl + '?r=api/stats/acuerdos-totals&' + buildQuery(), {
                credentials: 'same-origin',
            });
            if (res.status === 401) {
                window.location.href = indexUrl + '?r=login';
                return;
            }
            const data = await res.json().catch(function () {
                return {};
            });
            if (!data.ok) {
                showMessage(data.error || 'No se pudieron cargar los totales.', true);
                if (!silencioso || !gridTieneTarjetasCampana()) {
                    grid.innerHTML = '';
                }
                return;
            }
            rangeSummary.textContent =
                'Periodo: ' + (data.from || '') + ' — ' + (data.to || '') + ' · ' + labelPreset(data.preset);
            if (elPieRange) {
                elPieRange.textContent = 'Periodo: ' + (data.from || '') + ' — ' + (data.to || '');
            }
            agentLog('H2', 'gestor_panel.js:loadTotals', 'api range vs browser local date', {
                preset: data.preset,
                apiFrom: data.from,
                apiTo: data.to,
                clientToday: todayISO(),
                tzOffsetMin: new Date().getTimezoneOffset(),
                clientNowIso: new Date().toISOString(),
            });
            const inPlace = silencioso && actualizarTotalesEnSitio(data.totals);
            if (!inPlace) {
                renderCards(data.totals);
            }

            // Torta por campaña ligada al filtro superior
            if (elPie) {
                const okRows = (data.totals || []).filter(function (r) {
                    return r && !r.error;
                });
                lastPieRows = okRows;
                resizeAndDrawPie(okRows);
                renderPieLegend(okRows);
                attachTooltipHandlersOnce();
            }

            const firmaPeriodo =
                (data.preset || '') + '|' + (data.from || '') + '|' + (data.to || '');
            const mismoPeriodoQueAntes = firmaPeriodo === ultimaFirmaPeriodo;
            const incrementoDetectado = !!(
                totalesAnteriores && hayIncremento(data.totals, totalesAnteriores)
            );
            const intentarSonido = !!(
                totalesAnteriores && mismoPeriodoQueAntes && incrementoDetectado
            );
            agentLog('B', 'gestor_panel.js:loadTotals', 'sound_decision', {
                runId: 'sound-fix',
                mismoPeriodoQueAntes,
                firmaPeriodo,
                ultimaFirmaPeriodo,
                incrementoDetectado,
                intentarSonido,
                anterior: totalesAnteriores,
                nuevo: snapshotTotals(data.totals),
            });
            if (intentarSonido) {
                const inc = detectarCampanaQueIncremento(data.totals, totalesAnteriores);
                if (inc) {
                    showToastGreen(
                        (inc.label || inc.key) +
                            ' sumó ' +
                            String(inc.delta) +
                            (inc.delta === 1 ? ' acuerdo de pago' : ' acuerdos de pago')
                    );
                }
                playNotificationSound();
            }
            totalesAnteriores = snapshotTotals(data.totals);
            ultimaFirmaPeriodo = firmaPeriodo;
            primeraCargaCompleta = true;
        } finally {
            if (silencioso) {
                grid.removeAttribute('aria-busy');
            }
        }
    }

    async function actualizarDashboard() {
        if (cargando) {
            return;
        }
        cargando = true;
        try {
            await loadTotals();
            await loadMonthDaily();
        } finally {
            cargando = false;
        }
    }

    function labelPreset(p) {
        const m = { today: 'Hoy', week: 'Semana', month: 'Mes', custom: 'Personalizado' };
        return m[p] || p;
    }

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            const p = tab.getAttribute('data-preset') || 'today';
            setActiveTab(p);
            if (p !== 'custom') {
                actualizarDashboard();
            }
        });
    });

    btnCustom.addEventListener('click', function () {
        actualizarDashboard();
    });

    btnLogout.addEventListener('click', async function () {
        await fetch(indexUrl + '?r=api/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
        });
        window.location.href = indexUrl + '?r=login';
    });

    inpFrom.value = todayISO();
    inpTo.value = todayISO();
    setActiveTab('today');
    actualizarDashboard();
    setInterval(actualizarDashboard, 30000);

    if (typeof window.addEventListener === 'function') {
        window.addEventListener('resize', function () {
            if (lastMonthSeries) {
                resizeAndDrawMonth(lastMonthSeries);
            }
            if (lastPieRows) {
                resizeAndDrawPie(lastPieRows);
            }
        });
    }
})();
