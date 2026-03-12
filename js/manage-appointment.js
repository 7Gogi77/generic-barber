/**
 * manage-appointment.js
 * Handles appointment search, reschedule and cancellation.
 * Depends on: config.js, storage-manager.js, sms-handler.js
 */

'use strict';

/* ─── State ─────────────────────────────────────────── */
let currentAppointment = null;
let currentCalendarDate = new Date();
let selectedDate = null;
let selectedTime = null;
let allAppointments = [];

/* ─── Config bootstrap ──────────────────────────────── */
async function loadConfig() {
    if (!window.SITE_CONFIG) window.SITE_CONFIG = {};
    const saved = localStorage.getItem('site_config_backup');
    if (saved) {
        try { Object.assign(window.SITE_CONFIG, JSON.parse(saved)); } catch {}
    }
    window.SITE_CONFIG.booking = Object.assign({
        businessHours: { start: 9, end: 19 },
        workingDays:   { 1:true, 2:true, 3:true, 4:true, 5:true, 6:true, 0:false },
        daysClosed:    [0],
        slotDuration:  30
    }, window.SITE_CONFIG.booking);
}

/* ─── UI helpers ────────────────────────────────────── */
function showAlert(msg, type = 'info') {
    const el = document.getElementById('alertMessage');
    el.textContent = msg;
    el.className = `alert show alert-${type}`;
    if (type !== 'error') setTimeout(() => el.classList.remove('show'), 5000);
}
function hideAlert() { document.getElementById('alertMessage').classList.remove('show'); }

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

/* ─── Phone normalisation ───────────────────────────── */
function normalisePhone(p) {
    if (!p) return '';
    let s = p.replace(/[\s\-()]/g, '');
    if (s.startsWith('0'))   s = '+386' + s.slice(1);
    if (s.startsWith('386')) s = '+' + s;
    return s;
}

/* ─── Search ────────────────────────────────────────── */
async function searchAppointment() {
    const email = document.getElementById('searchEmail').value.trim().toLowerCase();
    const phone = document.getElementById('searchPhone').value.trim();
    const apptId = document.getElementById('appointmentId').value.trim();

    if (!email && !phone && !apptId) {
        showAlert('Vnesite email, telefonsko številko ali ID termina.', 'error');
        return;
    }

    showAlert('Iskanje…', 'info');

    try {
        const data = await StorageManager.load('schedule') || { events: [] };
        const events = Array.isArray(data.events) ? data.events : [];
        const found = findAppointment(events, { email, phone: normalisePhone(phone), apptId })
                   || findAppointmentInLS({ email, phone: normalisePhone(phone), apptId });

        if (!found) {
            showAlert(apptId ? 'Termin s to ID številko ni bil najden.' : 'Termin ni najden. Preverite podatke.', 'error');
            return;
        }
        currentAppointment = found;
        await displayAppointmentDetails(found);
        showSection('detailsSection');
        hideAlert();
    } catch (err) {
        showAlert('Napaka: ' + err.message, 'error');
    }
}

function findAppointment(events, { email, phone, apptId }) {
    if (apptId && !email && !phone) return events.find(e => e.id === apptId) || null;
    const matches = events.filter(e =>
        (apptId && e.id === apptId) ||
        (email && e.extendedProps?.email?.toLowerCase() === email) ||
        (phone && normalisePhone(e.extendedProps?.phone) === phone)
    );
    return matches.sort((a, b) => new Date(b.start) - new Date(a.start))[0] || null;
}

function findAppointmentInLS(query) {
    try {
        const raw = localStorage.getItem('schedule');
        if (!raw) return null;
        const events = JSON.parse(raw)?.events || [];
        return findAppointment(events, query);
    } catch { return null; }
}

async function autoOpenAppointment(id) {
    try {
        const data = await StorageManager.load('schedule') || { events: [] };
        const events = Array.isArray(data.events) ? data.events : [];
        const found = events.find(e => e.id === id) || findAppointmentInLS({ apptId: id });
        if (found) {
            currentAppointment = found;
            await displayAppointmentDetails(found);
            showSection('detailsSection');
            hideAlert();
        } else {
            showAlert('Termin s to ID številko ni bil najden.', 'error');
            showSection('searchSection');
        }
    } catch (err) {
        showAlert('Napaka pri nalaganju termina: ' + err.message, 'error');
        showSection('searchSection');
    }
}

/* ─── Appointment display ───────────────────────────── */
async function displayAppointmentDetails(event) {
    const start = new Date(event.start);
    const end   = new Date(event.end);

    const dateStr = start.toLocaleDateString('sl-SI', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    const pad = n => String(n).padStart(2,'0');
    const timeStr = `${pad(start.getHours())}:${pad(start.getMinutes())} – ${pad(end.getHours())}:${pad(end.getMinutes())}`;
    const services = (event.extendedProps.services || []).join(', ');
    const price    = event.extendedProps.price ? `€${event.extendedProps.price.toFixed(2)}` : 'N/A';

    document.getElementById('appointmentDetails').innerHTML = `
        <div class="detail-row"><span class="detail-label"><i class="bi bi-person-fill"></i> Stranka:</span><span class="detail-value">${event.extendedProps.customer || '-'}</span></div>
        <div class="detail-row"><span class="detail-label"><i class="bi bi-calendar"></i> Datum:</span><span class="detail-value">${dateStr}</span></div>
        <div class="detail-row"><span class="detail-label"><i class="bi bi-clock"></i> Ura:</span><span class="detail-value">${timeStr}</span></div>
        <div class="detail-row"><span class="detail-label"><i class="bi bi-briefcase"></i> Storitve:</span><span class="detail-value">${services || '-'}</span></div>
        <div class="detail-row"><span class="detail-label"><i class="bi bi-cash-coin"></i> Cena:</span><span class="detail-value">${price}</span></div>
        <div class="detail-row"><span class="detail-label"><i class="bi bi-envelope"></i> Email:</span><span class="detail-value" style="font-size:12px">${event.extendedProps.email || '-'}</span></div>
        <div class="detail-row"><span class="detail-label"><i class="bi bi-telephone"></i> Telefon:</span><span class="detail-value">${event.extendedProps.phone || '-'}</span></div>
        <div class="detail-row"><span class="detail-label"><i class="bi bi-key"></i> ID:</span><span class="detail-value" style="font-size:12px;font-family:monospace">${event.id}</span></div>
    `;

    await initializeCalendar(start);
    initializeTimeSlots(start);
}

/* ─── Reschedule toggle ─────────────────────────────── */
async function toggleReschedule() {
    const box = document.getElementById('rescheduleBox');
    box.classList.toggle('active');
    if (box.classList.contains('active')) {
        await initializeCalendar(new Date(currentAppointment.start));
        initializeTimeSlots(new Date(currentAppointment.start));
    }
}

/* ─── Calendar ──────────────────────────────────────── */
async function initializeCalendar(date) {
    currentCalendarDate = new Date(date);
    try {
        const data = await StorageManager.load('schedule') || { events: [] };
        allAppointments = Array.isArray(data.events) ? data.events : [];
    } catch { allAppointments = []; }
    renderCalendar();
}

function localDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function isDateClosed(date) {
    const dow = date.getDay();
    const wd  = window.SITE_CONFIG?.booking?.workingDays || {};
    if (Object.keys(wd).length) return !wd[dow];
    return (window.SITE_CONFIG?.booking?.daysClosed || [0]).includes(dow);
}

function getBusinessHours(dow) {
    const def   = window.SITE_CONFIG?.booking?.businessHours || { start:9, end:19 };
    const perDay = window.SITE_CONFIG?.booking?.hours?.[dow];
    return perDay ? { start: perDay.start ?? def.start, end: perDay.end ?? def.end } : def;
}

function hasConflict(slotStart, slotEnd, excludeId) {
    for (const ev of allAppointments) {
        if (excludeId && ev.id === excludeId) continue;
        try {
            const s = new Date(ev.start), e = ev.end ? new Date(ev.end) : new Date(+new Date(ev.start) + 3600000);
            if (isNaN(s) || isNaN(e)) continue;
            if (slotStart < e && slotEnd > s) return true;
        } catch {}
    }
    return false;
}

function serviceDuration() {
    if (!currentAppointment) return 60;
    return (new Date(currentAppointment.end) - new Date(currentAppointment.start)) / 60000;
}

function availableSlotsForDate(date) {
    const dur  = serviceDuration();
    const bh   = getBusinessHours(date.getDay());
    const closeMin  = bh.end * 60;
    const latestMin = closeMin - dur;
    if (latestMin < bh.start * 60) return [];

    const slots = [];
    const step  = window.SITE_CONFIG?.booking?.slotDuration || 30;
    const dStr  = localDateStr(date);
    const excl  = currentAppointment?.id;

    for (let m = bh.start * 60; m <= latestMin; m += step) {
        const start = new Date(date);
        start.setHours(Math.floor(m/60), m%60, 0, 0);
        const end = new Date(+start + dur * 60000);
        if (localDateStr(end) !== dStr) continue;
        if (end.getHours() * 60 + end.getMinutes() > bh.end * 60) continue;
        if (!hasConflict(start, end, excl)) {
            slots.push({ start, end, timeStr: `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}` });
        }
    }
    return slots;
}

function renderCalendar() {
    const y = currentCalendarDate.getFullYear();
    const mo = currentCalendarDate.getMonth();
    const MONTHS = ['Januar','Februar','Marec','April','Maj','Junij','Julij','Avgust','September','Oktober','November','December'];
    document.getElementById('currentMonth').textContent = `${MONTHS[mo]} ${y}`;

    const wdEl = document.getElementById('weekdays');
    if (!wdEl.children.length) {
        ['P','T','S','Č','P','S','N'].forEach(d => {
            const div = document.createElement('div');
            div.className = 'calendar-weekday';
            div.textContent = d;
            wdEl.appendChild(div);
        });
    }

    const today   = new Date(); today.setHours(0,0,0,0);
    const maxDate = new Date(today); maxDate.setMonth(maxDate.getMonth()+2);
    const firstDow   = new Date(y, mo, 1).getDay() || 7;
    const daysInMonth = new Date(y, mo+1, 0).getDate();
    const daysInPrev  = new Date(y, mo, 0).getDate();

    const daysEl = document.getElementById('calendarDays');
    daysEl.innerHTML = '';

    // prev-month fillers
    for (let i = firstDow-1; i > 0; i--) addDayBtn(daysEl, daysInPrev-i+1, 'other-month disabled', true);

    // current month
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(y, mo, i); d.setHours(0,0,0,0);
        const disabled = d < today || d > maxDate || isDateClosed(d);
        const isSel    = selectedDate && localDateStr(d) === localDateStr(selectedDate);
        let cls = 'calendar-day';
        if (disabled)     cls += ' disabled';
        else if (isSel)   cls += ' selected';
        else cls += availableSlotsForDate(d).length ? ' has-slots' : ' no-slots';
        const btn = addDayBtn(daysEl, i, cls, disabled);
        if (!disabled) btn.onclick = () => selectDate(d);
    }

    // next-month fillers
    const remaining = 42 - daysEl.children.length;
    for (let i = 1; i <= remaining; i++) addDayBtn(daysEl, i, 'other-month disabled', true);
}

function addDayBtn(parent, text, cls, disabled) {
    const btn = document.createElement('button');
    btn.className = cls;
    btn.textContent = text;
    btn.disabled = !!disabled;
    parent.appendChild(btn);
    return btn;
}

function prevMonth() { currentCalendarDate.setMonth(currentCalendarDate.getMonth()-1); renderCalendar(); }
function nextMonth() { currentCalendarDate.setMonth(currentCalendarDate.getMonth()+1); renderCalendar(); }

function selectDate(date) {
    selectedDate = new Date(date);
    selectedTime = null;
    renderCalendar();
    initializeTimeSlots(date);
}

function initializeTimeSlots(date) {
    const el = document.getElementById('timeSlots');
    el.innerHTML = '';
    if (!date) { el.innerHTML = '<div class="no-slots-message">Izberite datum</div>'; return; }

    const slots = availableSlotsForDate(date);
    if (!slots.length) { el.innerHTML = '<div class="no-slots-message">Ni prostih terminov za ta dan</div>'; return; }

    slots.forEach(slot => {
        const btn = document.createElement('button');
        btn.className = 'time-slot' + (selectedTime === slot.timeStr ? ' selected' : '');
        btn.textContent = slot.timeStr;
        btn.onclick = () => { selectedTime = slot.timeStr; initializeTimeSlots(date); };
        el.appendChild(btn);
    });
}

/* ─── Confirm reschedule ────────────────────────────── */
async function confirmReschedule() {
    if (!currentAppointment)   { showAlert('Termin ni bil naložen.', 'error'); return; }
    if (!selectedDate || !selectedTime) { showAlert('Izberite datum in čas.', 'error'); return; }

    showAlert('Spreminjan termin…', 'info');
    try {
        const [h, m] = selectedTime.split(':').map(Number);
        const newStart = new Date(selectedDate); newStart.setHours(h, m, 0, 0);
        const dur = serviceDuration();
        const newEnd = new Date(+newStart + dur * 60000);

        currentAppointment.start = newStart.toISOString();
        currentAppointment.end   = newEnd.toISOString();

        const data = await StorageManager.load('schedule') || { events: [] };
        const idx  = data.events.findIndex(e => e.id === currentAppointment.id);
        if (idx !== -1) { data.events[idx] = currentAppointment; await StorageManager.save('schedule', data); }

        const dateLabel = selectedDate.toLocaleDateString('sl-SI');
        const biz = window.SITE_CONFIG?.businessName || 'naši storitvi';
        // Use custom reschedule SMS template if set in admin settings
        const _smsT = (() => { try { return JSON.parse(localStorage.getItem('bookingSettings') || '{}').smsTemplates || {}; } catch(_) { return {}; } })();
        const _reschedTpl = _smsT.rescheduleMessage || 'Termin pri {posel} je bil spremenjen na: {datum} ob {cas}. Hvala!';
        const _reschedMsg = _reschedTpl
            .replace(/\{ime\}/g, currentAppointment.extendedProps.customer || '')
            .replace(/\{posel\}/g, biz)
            .replace(/\{datum\}/g, dateLabel)
            .replace(/\{cas\}/g, selectedTime);
        await trySend(currentAppointment.extendedProps.phone, _reschedMsg);
        await trySend(window.SITE_CONFIG?.ownerPhone,
            `Termin je bil spremenjen. Stranka: ${currentAppointment.extendedProps.customer}, Nov termin: ${dateLabel} ob ${selectedTime}`);

        showAlert('✓ Termin je bil uspešno spremenjen!', 'success');
        selectedDate = selectedTime = null;
        document.getElementById('rescheduleBox').classList.remove('active');
        setTimeout(() => displayAppointmentDetails(currentAppointment), 3000);
    } catch (err) {
        showAlert('Napaka pri spreminjanju: ' + err.message, 'error');
    }
}

/* ─── Cancel appointment ────────────────────────────── */
async function cancelAppointment() {
    if (!currentAppointment) return;
    if (!confirm('Ste prepričani, da želite odpovedati termin?')) return;

    showAlert('Odpoved termina…', 'info');
    try {
        const { id, extendedProps: ep } = currentAppointment;
        const data = await StorageManager.load('schedule') || { events: [] };
        data.events = data.events.filter(e => e.id !== id);
        await StorageManager.save('schedule', data);
        try { localStorage.setItem('schedule', JSON.stringify(data)); } catch {}

        const biz = window.SITE_CONFIG?.businessName || 'naši storitvi';
        // Use custom cancel SMS template if set in admin settings
        const _smsTc = (() => { try { return JSON.parse(localStorage.getItem('bookingSettings') || '{}').smsTemplates || {}; } catch(_) { return {}; } })();
        const _cancelTpl = _smsTc.cancelMessage || 'Vaš termin pri {posel} je bil odpovedan. Kontaktirajte nas za novo rezervacijo.';
        const _cancelMsg = _cancelTpl
            .replace(/\{ime\}/g, ep.customer || '')
            .replace(/\{posel\}/g, biz)
            .replace(/\{datum\}/g, '')
            .replace(/\{cas\}/g, '');
        await trySend(ep.phone, _cancelMsg);
        await trySend(window.SITE_CONFIG?.ownerPhone,
            `Termin je bil odpovedan. Stranka: ${ep.customer}, Email: ${ep.email}, Tel: ${ep.phone}`);

        showAlert('✓ Termin je bil odpovedan.', 'success');
        setTimeout(clearSearch, 3000);
    } catch (err) {
        showAlert('Napaka pri odpovedi: ' + err.message, 'error');
    }
}

/* ─── SMS helper ────────────────────────────────────── */
async function trySend(phone, msg) {
    if (!phone || !window.SMSHandler) return;
    try { await window.SMSHandler.sendSMS(phone, msg); } catch {}
}

/* ─── Navigation helpers ────────────────────────────── */
function clearSearch() {
    currentAppointment = null;
    ['searchEmail','searchPhone','appointmentId'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    hideAlert();
    showSection('searchSection');
}
function goBack() { clearSearch(); }

function getQueryParam(name) { return new URLSearchParams(window.location.search).get(name); }

/* ─── Boot ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();

    const urlId = getQueryParam('id');
    if (urlId) { await autoOpenAppointment(urlId); }

    ['searchEmail','searchPhone'].forEach(id => {
        document.getElementById(id)?.addEventListener('keypress', e => { if (e.key === 'Enter') searchAppointment(); });
    });
});
