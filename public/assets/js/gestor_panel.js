(function () {
    const indexUrl = window.__VISUAL_INDEX__ || '';
    const msg = document.getElementById('dash-message');
    const grid = document.getElementById('campaign-grid');
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

    function agentLog(hypothesisId, location, message, data) {
        fetch('http://127.0.0.1:7502/ingest/46673b12-bd1a-4b1e-810a-1c4ee59c68c2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '8909be' },
            body: JSON.stringify({
                sessionId: '8909be',
                hypothesisId: hypothesisId,
                location: location,
                message: message,
                data: data || {},
                timestamp: Date.now(),
            }),
        }).catch(function () {});
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
            // #region agent log
            fetch('http://127.0.0.1:7502/ingest/46673b12-bd1a-4b1e-810a-1c4ee59c68c2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '8909be' },
                body: JSON.stringify({
                    sessionId: '8909be',
                    hypothesisId: 'H2',
                    location: 'gestor_panel.js:loadTotals',
                    message: 'api range vs browser local date',
                    data: {
                        preset: data.preset,
                        apiFrom: data.from,
                        apiTo: data.to,
                        clientToday: todayISO(),
                        tzOffsetMin: new Date().getTimezoneOffset(),
                        clientNowIso: new Date().toISOString(),
                    },
                    timestamp: Date.now(),
                }),
            }).catch(function () {});
            // #endregion agent log
            const inPlace = silencioso && actualizarTotalesEnSitio(data.totals);
            if (!inPlace) {
                renderCards(data.totals);
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
})();
