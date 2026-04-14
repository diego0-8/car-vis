(function () {
    const indexUrl = window.__VISUAL_INDEX__ || '';
    let state = { users: [], roles: [], campaigns: [], editingUserId: null };

    const el = function (id) {
        return document.getElementById(id);
    };

    function show(elm, text, isError) {
        if (!text) {
            elm.hidden = true;
            elm.textContent = '';
            return;
        }
        elm.hidden = false;
        elm.textContent = text;
        elm.classList.toggle('error', !!isError);
        elm.classList.toggle('ok', !isError);
    }

    function fillRoleSelect(selectEl, roles, selectedName) {
        selectEl.innerHTML = '';
        roles.forEach(function (r) {
            const opt = document.createElement('option');
            opt.value = r.name;
            opt.textContent = r.name;
            if (selectedName && r.name === selectedName) {
                opt.selected = true;
            }
            selectEl.appendChild(opt);
        });
    }

    function renderCampaignCheckboxes(container, campaigns, selectedSet) {
        container.innerHTML = '';
        campaigns.forEach(function (c) {
            const lab = document.createElement('label');
            const inp = document.createElement('input');
            inp.type = 'checkbox';
            inp.value = c.key;
            inp.checked = selectedSet.has(c.key);
            lab.appendChild(inp);
            lab.appendChild(document.createTextNode(' ' + c.label));
            container.appendChild(lab);
        });
    }

    function toggleNewUserCampaigns() {
        const role = el('new-role').value;
        const fs = el('new-campaigns-field');
        fs.hidden = role !== 'visualizador';
    }

    async function api(method, route, body) {
        const opts = { method: method, credentials: 'same-origin' };
        if (body !== undefined) {
            opts.headers = { 'Content-Type': 'application/json' };
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(indexUrl + '?r=' + route, opts);
        if (res.status === 401) {
            window.location.href = indexUrl + '?r=login';
            return null;
        }
        return res.json().catch(function () {
            return { ok: false, error: 'parse' };
        });
    }

    async function loadUsers() {
        const data = await api('GET', 'api/admin/users');
        if (!data || !data.ok) {
            el('users-loading').hidden = true;
            show(el('users-error'), 'No se pudieron cargar los usuarios.', true);
            return;
        }
        state.users = data.users || [];
        state.roles = data.roles || [];
        state.campaigns = data.campaigns || [];
        el('users-loading').hidden = true;
        el('users-table-wrap').hidden = false;
        el('users-error').hidden = true;
        fillRoleSelect(el('new-role'), state.roles, null);
        renderUserTable();
        toggleNewUserCampaigns();
        const selSet = new Set();
        renderCampaignCheckboxes(el('new-campaign-checkboxes'), state.campaigns, selSet);
    }

    function renderUserTable() {
        const tbody = el('users-tbody');
        tbody.innerHTML = '';
        state.users.forEach(function (u) {
            const tr = document.createElement('tr');
            const camps = (u.campaign_keys || []).join(', ') || '—';
            tr.innerHTML =
                '<td>' +
                u.id +
                '</td>' +
                '<td>' +
                escapeHtml(u.username) +
                '</td>' +
                '<td>' +
                escapeHtml(u.role_name) +
                '</td>' +
                '<td>' +
                (u.is_active ? 'Sí' : 'No') +
                '</td>' +
                '<td class="td-camps">' +
                escapeHtml(camps) +
                '</td>' +
                '<td class="td-actions"></td>';
            const tdAct = tr.querySelector('.td-actions');
            const b1 = document.createElement('button');
            b1.type = 'button';
            b1.className = 'btn-small';
            b1.textContent = u.is_active ? 'Desactivar' : 'Activar';
            b1.addEventListener('click', function () {
                patchUser(u.id, { is_active: u.is_active ? 0 : 1 });
            });
            tdAct.appendChild(b1);
            if (u.role_name === 'visualizador') {
                const b2 = document.createElement('button');
                b2.type = 'button';
                b2.className = 'btn-small';
                b2.textContent = 'Campañas';
                b2.addEventListener('click', function () {
                    openCampaignModal(u);
                });
                tdAct.appendChild(b2);
            }
            tbody.appendChild(tr);
        });
    }

    function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    async function patchUser(id, body) {
        const qs = new URLSearchParams({ id: String(id) });
        const res = await fetch(indexUrl + '?r=api/admin/user&' + qs.toString(), {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(function () {
            return {};
        });
        if (!res.ok || !data.ok) {
            alert('No se pudo actualizar.');
            return;
        }
        await loadUsers();
    }

    function openCampaignModal(user) {
        state.editingUserId = user.id;
        el('modal-campaigns-title').textContent = 'Campañas: ' + user.username;
        const set = new Set(user.campaign_keys || []);
        renderCampaignCheckboxes(el('modal-campaign-checkboxes'), state.campaigns, set);
        show(el('modal-msg'), '', false);
        el('modal-campaigns').hidden = false;
    }

    function closeModal() {
        el('modal-campaigns').hidden = true;
        state.editingUserId = null;
    }

    function readCheckedKeys(container) {
        const keys = [];
        container.querySelectorAll('input[type="checkbox"]').forEach(function (inp) {
            if (inp.checked) {
                keys.push(inp.value);
            }
        });
        return keys;
    }

    el('new-role').addEventListener('change', function () {
        toggleNewUserCampaigns();
    });

    el('form-create-user').addEventListener('submit', async function (e) {
        e.preventDefault();
        const username = el('new-username').value.trim();
        const password = el('new-password').value;
        const role = el('new-role').value;
        const body = { username: username, password: password, role: role };
        if (role === 'visualizador') {
            body.campaign_keys = readCheckedKeys(el('new-campaign-checkboxes'));
        }
        const data = await api('POST', 'api/admin/users', body);
        if (!data || !data.ok) {
            show(el('form-create-msg'), data && data.error ? String(data.error) : 'Error al crear.', true);
            return;
        }
        el('form-create-user').reset();
        fillRoleSelect(el('new-role'), state.roles, null);
        renderCampaignCheckboxes(el('new-campaign-checkboxes'), state.campaigns, new Set());
        toggleNewUserCampaigns();
        show(el('form-create-msg'), 'Usuario creado.', false);
        await loadUsers();
    });

    el('modal-save-campaigns').addEventListener('click', async function () {
        if (state.editingUserId === null) {
            return;
        }
        const keys = readCheckedKeys(el('modal-campaign-checkboxes'));
        const data = await api('PUT', 'api/admin/user-campaigns', {
            user_id: state.editingUserId,
            campaign_keys: keys,
        });
        if (!data || !data.ok) {
            show(el('modal-msg'), data && data.error ? String(data.error) : 'Error al guardar.', true);
            return;
        }
        closeModal();
        await loadUsers();
    });

    document.querySelectorAll('#modal-campaigns [data-close]').forEach(function (n) {
        n.addEventListener('click', closeModal);
    });

    el('btn-logout').addEventListener('click', async function () {
        await fetch(indexUrl + '?r=api/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
        });
        window.location.href = indexUrl + '?r=login';
    });

    loadUsers();
})();
