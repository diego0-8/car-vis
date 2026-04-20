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
            lastMonthSeries = monthCache.series;
            resizeAndDrawMonth(monthCache.series);
            attachTooltipHandlersOnce();
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
