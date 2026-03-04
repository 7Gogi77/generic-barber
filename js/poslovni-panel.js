            // --- TAB LOGIC FOR ADD EVENT MODAL ---
            // Tab logic
            let currentEventTab = 'worker';
            // Types used for worker-mode events
            const workerTypes = [
                { value: 'working_hours', label: 'Delovni čas' },
                { value: 'break', label: 'Premor' },
                { value: 'lunch', label: 'Kosilo' },
                { value: 'vacation', label: 'Počitnice' },
                { value: 'sick_leave', label: 'Bolniška' },
                { value: 'day_off', label: 'Prosti dan' }
            ];
            // Pridobi storitve iz SITE_CONFIG, če obstaja, sicer fallback
            function getCustomerTypes() {
                let items = [];
                if (window.SITE_CONFIG && window.SITE_CONFIG.servicesSection && Array.isArray(window.SITE_CONFIG.servicesSection.items)) {
                    items = window.SITE_CONFIG.servicesSection.items.map(s => ({ value: s.name, label: s.name }));
                }
                // Če ni storitev, prikaži samo prazno izbiro
                return [ { value: '', label: '-- Izberi storitev --' }, ...items ];
            }
                        function renderEventTypeOptions(tab) {
                                const select = document.getElementById('eventType');
                                select.innerHTML = '';
                                const checkboxContainer = document.getElementById('eventTypeCheckboxes');

                                if (tab === 'worker') {
                                    // Populate select with worker types
                                    const options = workerTypes || [];
                                    if (options.length === 0) {
                                        select.disabled = true;
                                        select.innerHTML = '<option value="">-- Ni tipov --</option>';
                                    } else {
                                        select.disabled = false;
                                        options.forEach(opt => {
                                            const o = document.createElement('option');
                                            o.value = opt.value;
                                            o.textContent = opt.label;
                                            select.appendChild(o);
                                        });
                                    }

                                    // Show select, hide checkboxes
                                    select.style.display = '';
                                    select.disabled = false;
                                    select.required = true;
                                    select.multiple = false;
                                    if (checkboxContainer) checkboxContainer.style.display = 'none';

                                    // Show/hide fields suitable for worker
                                    const contactWrapper = document.getElementById('customerContactFields');
                                    const phoneWrapper = document.getElementById('customerPhoneField');
                                    const priceWrapper = document.getElementById('eventPriceWrapper');
                                    const nameWrapper = document.getElementById('customerNameFields');
                                    const surnameWrapper = document.getElementById('customerSurnameField');
                                    const workerTitleWrapper = document.getElementById('workerTitleField');
                                    if (contactWrapper) contactWrapper.style.display = 'none';
                                    if (phoneWrapper) phoneWrapper.style.display = 'none';
                                    if (priceWrapper) priceWrapper.style.display = 'none';
                                    if (nameWrapper) { nameWrapper.style.display = 'none'; const el = nameWrapper.querySelector('input'); if (el) el.required = false; }
                                    if (surnameWrapper) { surnameWrapper.style.display = 'none'; const el2 = surnameWrapper.querySelector('input'); if (el2) el2.required = false; }
                                    if (workerTitleWrapper) { workerTitleWrapper.style.display = ''; const el3 = workerTitleWrapper.querySelector('input'); if (el3) el3.required = true; }

                                    document.getElementById('eventTypeLabel').textContent = 'Tip';
                                    return;
                                }

                                // Default: customer (services as checkboxes)
                                const options = getCustomerTypes();

                                // If no services, show disabled select and a warning
                                if (options.length <= 1) {
                                    select.disabled = true;
                                    select.innerHTML = '<option value="">-- Ni storitev v sistemu --</option>';
                                    if (!document.getElementById('noServicesWarning')) {
                                        const warn = document.createElement('div');
                                        warn.id = 'noServicesWarning';
                                        warn.style.color = '#e74c3c';
                                        warn.style.fontSize = '13px';
                                        warn.style.marginTop = '6px';
                                        warn.textContent = 'Storitve niso nastavljene v admin panelu ali še niso naložene iz oblaka.';
                                        select.parentNode.appendChild(warn);
                                    }
                                } else {
                                    select.disabled = false;
                                    if (document.getElementById('noServicesWarning')) document.getElementById('noServicesWarning').remove();
                                }

                                options.forEach(opt => {
                                    const o = document.createElement('option');
                                    o.value = opt.value;
                                    o.textContent = opt.label;
                                    select.appendChild(o);
                                });

                                // Use checkboxes for customer service selection (hide select)
                                select.style.display = 'none';
                                select.disabled = true;
                                select.required = false;
                                if (checkboxContainer) {
                                    checkboxContainer.innerHTML = '';
                                    options.slice(1).forEach(opt => {
                                        const id = `evtype_chk_${opt.value.replace(/[^a-z0-9]/gi,'_')}_${Math.random().toString(36).slice(2,6)}`;
                                        const wrapper = document.createElement('div');
                                        wrapper.style.cssText = 'display:flex; align-items:center; gap:8px; margin-bottom:6px;';
                                        const chk = document.createElement('input');
                                        chk.type = 'checkbox';
                                        chk.id = id;
                                        chk.value = opt.value;
                                        chk.style.marginRight = '8px';
                                        const lbl = document.createElement('label');
                                        lbl.htmlFor = id;
                                        lbl.textContent = opt.label;
                                        lbl.style.margin = '0';
                                        wrapper.appendChild(chk);
                                        wrapper.appendChild(lbl);
                                        checkboxContainer.appendChild(wrapper);
                                        chk.addEventListener('change', recalcServicePrice);
                                    });
                                    checkboxContainer.style.display = options.length > 1 ? 'block' : 'none';
                                }

                                document.getElementById('eventTypeLabel').textContent = 'Storitev';
                                // show/hide contact fields and price for customer tab
                                const contactWrapper = document.getElementById('customerContactFields');
                                const phoneWrapper = document.getElementById('customerPhoneField');
                                const priceWrapper = document.getElementById('eventPriceWrapper');
                                const nameWrapper = document.getElementById('customerNameFields');
                                const surnameWrapper = document.getElementById('customerSurnameField');
                                const workerTitleWrapper = document.getElementById('workerTitleField');
                                if (contactWrapper) contactWrapper.style.display = '';
                                if (phoneWrapper) phoneWrapper.style.display = '';
                                if (priceWrapper) priceWrapper.style.display = '';
                                if (nameWrapper) { nameWrapper.style.display = ''; const el = nameWrapper.querySelector('input'); if (el) el.required = true; }
                                if (surnameWrapper) { surnameWrapper.style.display = ''; const el2 = surnameWrapper.querySelector('input'); if (el2) el2.required = true; }
                                if (workerTitleWrapper) { workerTitleWrapper.style.display = 'none'; const el3 = workerTitleWrapper.querySelector('input'); if (el3) el3.required = false; }
                        }
            function setEventTab(tab) {
                currentEventTab = tab;
                renderEventTypeOptions(tab);
                // Update button visual states
                try {
                    const tabWorker = document.getElementById('tabWorker');
                    const tabCust = document.getElementById('tabCustomer');
                    if (tabWorker) { tabWorker.classList.toggle('btn-primary', tab === 'worker'); tabWorker.classList.toggle('btn-secondary', tab !== 'worker'); }
                    if (tabCust) { tabCust.classList.toggle('btn-primary', tab === 'customer'); tabCust.classList.toggle('btn-secondary', tab !== 'customer'); }
                } catch (_) {}
                // focus convenient field
                setTimeout(() => {
                    if (tab === 'customer') { const e = document.getElementById('eventFirstName'); if (e) e.focus(); }
                    else { const e = document.getElementById('eventTitle'); if (e) e.focus(); }
                }, 60);
            }
            // Always reload services when opening modal
            function openAddEventModalWithTab(startDate = null, endDate = null, retry = 0, tab = null) {
                // Če storitve še niso naložene iz Firebase, počakaj in poskusi znova
                const ready = window.SITE_CONFIG && window.SITE_CONFIG.servicesSection && Array.isArray(window.SITE_CONFIG.servicesSection.items) && window.SITE_CONFIG.servicesSection.items.length > 0;
                if (!ready && retry < 10) {
                    setTimeout(() => openAddEventModalWithTab(startDate, endDate, retry + 1, tab), 200);
                    return;
                }
                setEventTab(tab || 'worker');
                // Reset form fields if needed
                const form = document.getElementById('addEventForm');
                if (form) form.reset();
                
                // Always set default times after reset (browsers may reset time inputs to '00:00')
                const startTimeEl = document.getElementById('eventStartTime');
                const endTimeEl = document.getElementById('eventEndTime');
                if (startTimeEl) startTimeEl.value = '09:00';
                if (endTimeEl) endTimeEl.value = '10:00';
                
                // Show modal
                const modal = document.getElementById('addEventModal');
                if (modal) modal.classList.add('show');
                if (startDate) {
                    const startDateEl = document.getElementById('eventStartDate');
                    const endDateEl = document.getElementById('eventEndDate');
                    if (startDateEl) {
                        startDateEl.value = startDate;
                    }
                    // If endDate provided, use it; otherwise default to startDate
                    const actualEndDate = endDate || startDate;
                    if (endDateEl) {
                        endDateEl.value = actualEndDate;
                    }
                } else {
                }
            }
            // IMPORTANT: Override will be applied at END of script file to avoid hoisting issues
        // Fallback: Create FullCalendar stub if CDN failed
        if (typeof FullCalendar === 'undefined') {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/fullcalendar@6.1.10/index.global.min.js';
          script.onload = () => {};
          script.onerror = () => {
          };
          document.head.appendChild(script);
        } else {
        }

        // Recalculate total price from selected services
        function recalcServicePrice() {
            const checkboxContainer = document.getElementById('eventTypeCheckboxes');
            const priceInput = document.getElementById('eventPrice');
            if (!checkboxContainer || !priceInput) return;
            const checked = Array.from(checkboxContainer.querySelectorAll('input[type=checkbox]:checked')).map(i => i.value);
            let total = 0;
            const parsePrice = (value) => {
                if (value == null) return 0;
                if (typeof value === 'number') return value;
                const cleaned = String(value).replace(/[^0-9.,-]/g, '').replace(',', '.');
                const parsed = Number(cleaned);
                return Number.isFinite(parsed) ? parsed : 0;
            };
            if (window.SITE_CONFIG && window.SITE_CONFIG.servicesSection && Array.isArray(window.SITE_CONFIG.servicesSection.items)) {
                checked.forEach(name => {
                    const svc = window.SITE_CONFIG.servicesSection.items.find(s => s.name === name);
                    if (svc) total += parsePrice(svc.price);
                });
            }
            const currency = (window.SITE_CONFIG && window.SITE_CONFIG.currency) ? window.SITE_CONFIG.currency : '€';
            priceInput.value = total + currency;
            return total;
        }
        // ===== GLOBAL DELETION TRACKING SYSTEM =====
        // Track deleted event IDs persistently across page reloads
        let deletedEventIds = new Set();

        /**
         * Load deleted event IDs from localStorage
         * This survives page refresh and ensures deleted items stay deleted
         */
        function loadDeletedEventIds() {
            try {
                const stored = localStorage.getItem('schedule_deleted_ids');
                if (stored) {
                    deletedEventIds = new Set(JSON.parse(stored));
                } else {
                    deletedEventIds = new Set();
                }
            } catch (e) {
                deletedEventIds = new Set();
            }
        }

        /**
         * Save deleted event IDs to localStorage
         * Must be called after every deletion to persist across sessions
         */
        function saveDeletedEventIds() {
            try {
                localStorage.setItem('schedule_deleted_ids', JSON.stringify(Array.from(deletedEventIds)));
            } catch (e) {}
        }

        /**
         * Filter events: remove any that are in the deleted set
         * Call this every time you load or access scheduleData.events
         */
        function filterDeletedEvents(events) {
            if (!Array.isArray(events)) return [];
            const before = events.length;
            const filtered = events.filter(e => !deletedEventIds.has(e.id));
            if (before !== filtered.length) {
            }
            return filtered;
        }

        /**
         * Mark an event as deleted (adds to deleted set and persists)
         */
        function markEventDeleted(eventId) {
            deletedEventIds.add(eventId);
            saveDeletedEventIds();
        }

        /**
         * Check if event is marked as deleted
         */
        function isEventDeleted(eventId) {
            return deletedEventIds.has(eventId);
        }

        // IMMEDIATELY load deleted event IDs from localStorage
        loadDeletedEventIds();
        
        // Expose to window globally so all scripts can use
        window.markEventDeleted = markEventDeleted;
        window.isEventDeleted = isEventDeleted;
        window.filterDeletedEvents = filterDeletedEvents;
        window.loadDeletedEventIds = loadDeletedEventIds;
        window.saveDeletedEventIds = saveDeletedEventIds;

        /**
         * Remove duplicate events from array based on ID
         * Keeps the first instance of each unique ID
         */
        function deduplicateEvents(events) {
            if (!Array.isArray(events)) return [];
            const before = events.length;
            const seen = new Set();
            const deduplicated = events.filter(e => {
                if (!e.id) return true; // Keep events without IDs
                if (seen.has(e.id)) {
                    return false;
                }
                seen.add(e.id);
                return true;
            });
            if (before !== deduplicated.length) {
            }
            return deduplicated;
        }



        // ===== CALENDAR INITIALIZATION =====
        let calendarInitialized = false;
        let currentEditingEvent = null;
        let scheduleData = {
            events: []
        };

        // Debug logging function
            // Define panel control functions in outer scope
            function closeCustomerPanel() {
                const panel = document.getElementById('customerListPanel'); if (!panel) return; panel.classList.remove('open');
                setTimeout(() => { try { panel.style.display = 'none'; const detail = document.getElementById('customerDetail'); if (detail) detail.style.display = 'none'; } catch (e) {} }, 320);
            }
            
            function closeAnalyticsPanel() {
                const panel = document.getElementById('analyticsPanel');
                if (!panel) return;
                panel.classList.remove('open');
                setTimeout(() => { 
                    try { 
                        panel.style.display = 'none';
                        if (analyticsCharts.earnings) analyticsCharts.earnings.destroy();
                        if (analyticsCharts.services) analyticsCharts.services.destroy();
                        analyticsCharts = { earnings: null, services: null };
                    } catch (e) {} 
                }, 320);
            }

            function closeBusinessSettingsPanel() {
                const panel = document.getElementById('businessSettingsPanel');
                if (!panel) return;
                panel.classList.remove('open');
                setTimeout(() => {
                    try { panel.style.display = 'none'; } catch (e) {}
                }, 320);
            }
            
            function hideAllPanels() {
                closeCustomerPanel();
                closeAnalyticsPanel();
                closeBusinessSettingsPanel();
            }

            (function(){
                const sidebar = document.getElementById('sidebar');
                const sidebarToggle = document.getElementById('sidebarToggle');
                if (!sidebar || !sidebarToggle) return;

                const applyState = () => {
                    if (localStorage.getItem('sidebarExpanded') === 'true') {
                        sidebar.classList.add('expanded');
                    } else {
                        sidebar.classList.remove('expanded');
                    }
                };

                sidebarToggle.addEventListener('click', () => {
                    sidebar.classList.toggle('expanded');
                    localStorage.setItem('sidebarExpanded', sidebar.classList.contains('expanded'));
                    // Keep all open side panels positioned to the right of the sidebar
                    const w = sidebar.classList.contains('expanded') ? 260 : 72;
                    ['businessSettingsPanel','customerListPanel','analyticsPanel'].forEach(id => {
                        const p = document.getElementById(id);
                        if (p && p.classList.contains('open')) {
                            p.style.left  = w + 'px';
                            p.style.width = `calc(100% - ${w}px)`;
                        }
                    });
                    // Re-render calendar after the sidebar CSS transition (350ms) finishes
                    setTimeout(() => {
                        if (window.calendar && typeof window.calendar.updateSize === 'function') {
                            window.calendar.updateSize();
                        }
                    }, 370);
                });

                // keyboard support
                sidebarToggle.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        sidebarToggle.click();
                    }
                });

                // navigation — listen on entire nav-item row so text label also triggers navigation
                const navIcons = sidebar.querySelectorAll('.nav-icon');
                const navItems = sidebar.querySelectorAll('.nav-item');
                navItems.forEach(item => {
                    item.style.cursor = 'pointer';
                    item.addEventListener('click', () => {
                        const icon = item.querySelector('.nav-icon');
                        if (!icon) return;
                        const page = icon.dataset.page;
                        navIcons.forEach(i => i.classList.remove('active'));
                        icon.classList.add('active');
                        
                        // Collapse sidebar on mobile after selection
                        if (window.innerWidth <= 768) {
                            sidebar.classList.remove('expanded');
                            localStorage.setItem('sidebarExpanded', 'false');
                        }
                        
                        // Hide calendar whenever leaving calendar page
                        const _cal = document.getElementById('scheduleCalendar');

                        if (page === 'home') { window.location.href = 'admin-panel.html'; }
                        else if (page === 'settings') {
                            window.location.href = 'admin-panel.html';
                        }
                        else if (page === 'booking-settings') {
                            // Close the other two panels only — not the one we're opening
                            if (_cal) _cal.style.display = 'none';
                            closeCustomerPanel();
                            closeAnalyticsPanel();
                            showBusinessSettingsPanel();
                        }
                        else if (page === 'calendar') {
                            closeCustomerPanel();
                            closeAnalyticsPanel();
                            closeBusinessSettingsPanel();
                            if (_cal) _cal.style.display = 'block';
                            // Re-measure after the panel transition so FC fills the correct width
                            setTimeout(() => {
                                if (window.calendar && typeof window.calendar.updateSize === 'function') {
                                    window.calendar.updateSize();
                                }
                            }, 370);
                        }
                        else if (page === 'customers') {
                            if (_cal) _cal.style.display = 'none';
                            closeAnalyticsPanel();
                            closeBusinessSettingsPanel();
                            showCustomerListPanel();
                        }
                        else if (page === 'analytics') {
                            if (_cal) _cal.style.display = 'none';
                            closeCustomerPanel();
                            closeBusinessSettingsPanel();
                            showAnalyticsPanel();
                        }
                        else { alert(`${page} page not yet implemented`); }
                    });
                });

                applyState();
            })();

            // ========== CUSTOMER LIST PANEL ========== //
            async function showCustomerListPanel() {
                const panel = document.getElementById('customerListPanel');
                const content = document.getElementById('customerListContent');

                // Ensure scheduleData is loaded from DB
                try {
                    if (!scheduleData || !Array.isArray(scheduleData.events)) {
                        scheduleData = await StorageManager.load('schedule');
                    }
                    // Filter out deleted events after loading
                    if (scheduleData && Array.isArray(scheduleData.events)) {
                        scheduleData.events = filterDeletedEvents(scheduleData.events);
                        scheduleData.events = deduplicateEvents(scheduleData.events);
                    }
                } catch (e) {}

                // Merge saved customer base and derive customers from bookings
                await loadCustomerBase();
                const bookings = (scheduleData && Array.isArray(scheduleData.events))
                    ? scheduleData.events.filter(e => (e.extendedProps && e.extendedProps.isBooking) || e.isBooking || e.extendedProps?.tab === 'customer')
                    : [];

                const customerMap = {};

                // Seed from saved base
                Object.entries(customerBase || {}).forEach(([k, rec]) => {
                    const key = k;
                    if (!customerMap[key]) {
                        customerMap[key] = {
                            firstName: rec.firstName || (rec.fullName || '').split(' ')[0] || '',
                            surname: rec.surname || (rec.fullName || '').split(' ').slice(1).join(' ') || '',
                            fullName: rec.fullName || '',
                            email: rec.email || '',
                            phone: rec.phone || '',
                            count: 0
                        };
                    }
                });

                // Count bookings and merge booking-derived customers
                bookings.forEach(ev => {
                    const name = (ev.extendedProps && ev.extendedProps.customer) || ev.title || '';
                    const email = ev.extendedProps && ev.extendedProps.email ? ev.extendedProps.email : '';
                    const phone = ev.extendedProps && ev.extendedProps.phone ? ev.extendedProps.phone : '';
                    const key = makeCustomerKey(name, email, phone);
                    if (!customerMap[key]) {
                        const parts = (name || '').trim().split(' ');
                        customerMap[key] = {
                            firstName: parts[0] || name,
                            surname: parts.slice(1).join(' ') || '',
                            fullName: name || '',
                            email: email || '',
                            phone: phone || '',
                            count: 0
                        };
                    }
                    customerMap[key].count++;
                });

                const customers = Object.values(customerMap).sort((a, b) => (a.surname || '').localeCompare(b.surname || ''));

                const renderTable = (filter) => {
                    const term = (filter || '').trim().toLowerCase();
                    if (!customers || customers.length === 0) {
                        content.innerHTML = '<div class="no-customers">Ni strank.</div>';
                        return;
                    }
                    const rows = customers.filter(c => {
                        if (!term) return true;
                        return ((c.fullName||'') + ' ' + (c.email||'') + ' ' + (c.phone||'')).toLowerCase().includes(term);
                    });

                    const isMobile = window.innerWidth <= 768;
                    let html = '';

                    if (isMobile) {
                        // Card layout — all data visible on small screens
                        html = '<div class="customer-cards">';
                        rows.forEach((c, idx) => {
                            html += `<div class="customer-card" data-idx="${idx}">
                                <div class="customer-card-name">${c.firstName||''} ${c.surname||''}</div>
                                ${c.email && c.email !== '-' ? `<div class="customer-card-row"><i class="bi bi-envelope"></i> ${c.email}</div>` : ''}
                                ${c.phone && c.phone !== '-' ? `<div class="customer-card-row"><i class="bi bi-telephone"></i> ${c.phone}</div>` : ''}
                                <div class="customer-card-footer">
                                    <span class="customer-card-count">${c.count||0} terminov</span>
                                    <button class="btn btn-danger btn-sm customerDeleteBtnRow" data-idx="${idx}">Izbriši</button>
                                </div>
                            </div>`;
                        });
                        html += '</div>';
                        html += '<div id="customerDetail" style="padding:12px; border-top:1px solid #eee; display:none;"></div>';
                        content.innerHTML = html;
                    } else {
                        // Table layout for desktop
                        let table = '<div style="overflow:auto; overflow-x:auto; max-height: calc(100% - 160px);"><table class="customer-table"><thead><tr><th>Ime</th><th>Priimek</th><th>Email</th><th>Telefon</th><th style="text-align:right">Terminov</th><th style="text-align:right">Akcije</th></tr></thead><tbody>';
                        rows.forEach((c, idx) => {
                            table += `<tr class="customer-row" data-idx="${idx}"><td>${c.firstName||'-'}</td><td>${c.surname||'-'}</td><td>${c.email||'-'}</td><td>${c.phone||'-'}</td><td style="text-align:right">${c.count||0}</td><td style="text-align:right"><button class="btn btn-danger btn-sm customerDeleteBtnRow" data-idx="${idx}">Izbriši</button></td></tr>`;
                        });
                        table += '</tbody></table></div>';
                        table += '<div id="customerDetail" style="padding:12px; border-top:1px solid #eee; display:none;"></div>';
                        content.innerHTML = table;
                    }
                    // animate in rows with a small stagger
                    try {
                        const rowsEls = Array.from(content.querySelectorAll('tr.customer-row'));
                        rowsEls.forEach((el, i) => {
                            el.classList.remove('entered');
                            setTimeout(() => el.classList.add('entered'), i * 45);
                        });
                    } catch (e) { /* ignore animation errors */ }

                    // Wire row clicks to show details
                    Array.from(content.querySelectorAll('tr.customer-row')).forEach(r => {
                        r.addEventListener('click', () => {
                            const idx = Number(r.getAttribute('data-idx'));
                            const rec = rows[idx];
                            const detail = document.getElementById('customerDetail');
                            if (!rec) return;
                            detail.style.display = 'block';
                            detail.innerHTML = `\n                                <div style="font-weight:600; margin-bottom:8px;">${rec.fullName || (rec.firstName + ' ' + rec.surname)}</div>\n                                <div style="color:#444;">Email: ${rec.email || '-'}</div>\n                                <div style="color:#444;">Telefon: ${rec.phone || '-'}</div>\n                                <div style="margin-top:8px; display:flex; gap:8px;">\n                                    <button id="customerEditBtnLocal" class="btn btn-primary">Uredi</button>\n                                    <button id="customerCloseBtnLocal" class="btn btn-secondary">Zapri</button>\n                                </div>`;
                        });
                    });
                };

                // Initial render and show panel
                renderTable('');
                // Wire search
                const searchEl = document.getElementById('customerSearch');
                if (searchEl) {
                    searchEl.oninput = (e) => renderTable(e.target.value);
                    setTimeout(() => searchEl.focus(), 50);
                }
                // Wire export
                const exportBtn = document.getElementById('customerExportBtn');
                if (exportBtn) {
                    exportBtn.onclick = () => {
                        const rows = Array.from(document.querySelectorAll('#customerListContent table.customer-table tbody tr'));
                        const csv = ['"Ime","Priimek","Email","Telefon","Št. terminov"'].concat(rows.map(r => {
                            const cols = Array.from(r.querySelectorAll('td')).map(td => '"' + (td.textContent || '').replace(/"/g,'""') + '"');
                            return cols.join(',');
                        })).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = 'customers.csv'; a.click(); URL.revokeObjectURL(url);
                    };
                }

                openCustomerPanel();

                // Attach a delegated handler to the content to support Edit/Close actions inside the customer detail
                (function(){
                    const contentEl = document.getElementById('customerListContent');
                    if (!contentEl) return;
                    contentEl.addEventListener('click', (e) => {
                        const t = e.target;
                        if (!t) return;
                        if (t.id === 'customerEditBtn' || (t.classList && t.classList.contains('btn') && t.classList.contains('btn-primary'))) {
                            try {
                                const detail = document.getElementById('customerDetail');
                                if (!detail) return;
                                const nameText = (detail.children[0] && detail.children[0].textContent) ? detail.children[0].textContent.trim() : '';
                                const emailText = detail.querySelector('div:nth-child(2)') ? detail.querySelector('div:nth-child(2)').textContent.replace('Email:','').trim() : '';
                                const phoneText = detail.querySelector('div:nth-child(3)') ? detail.querySelector('div:nth-child(3)').textContent.replace('Telefon:','').trim() : '';
                                let match = null;
                                Object.entries(customerBase || {}).forEach(([k, r]) => {
                                    if (match) return;
                                    if ((r.fullName && r.fullName === nameText) || (r.email && r.email === emailText) || (r.phone && r.phone === phoneText)) match = r;
                                });
                                if (match) {
                                    openAddEventModal();
                                    setEventTab('customer');
                                    setTimeout(() => {
                                        const fn = document.getElementById('eventFirstName'); if (fn) fn.value = match.firstName || '';
                                        const ln = document.getElementById('eventLastName'); if (ln) ln.value = match.surname || '';
                                        const em = document.getElementById('eventEmail'); if (em) em.value = match.email || '';
                                        const ph = document.getElementById('eventPhone'); if (ph) ph.value = match.phone || '';
                                    }, 60);
                                    closeCustomerPanel();
                                }
                            } catch (er) {}
                        }
                        if (t.id === 'customerCloseBtn' || (t.classList && t.classList.contains('btn') && t.classList.contains('btn-secondary'))) {
                            const d = document.getElementById('customerDetail'); if (d) d.style.display = 'none';
                        }

                        // Row delete button (customer list)
                        if (t.classList && t.classList.contains('customerDeleteBtnRow')) {
                            try {
                                const idx = Number(t.getAttribute('data-idx'));
                                const rows = Array.from(document.querySelectorAll('#customerListContent table.customer-table tbody tr'));
                                const rec = rows && rows[idx] ? rows[idx] : null;
                                // Reconstruct the customer record from row text
                                if (!rec) return;
                                const cols = rec.querySelectorAll('td');
                                const name = cols[0].textContent.trim() + ' ' + cols[1].textContent.trim();
                                const email = cols[2].textContent.trim();
                                const phone = cols[3].textContent.trim();
                                if (!confirm(`Izbrišem stranko "${name}" iz baze strank?`)) return;
                                // Find key in customerBase
                                loadCustomerBase().then(() => {
                                    let matchKey = null;
                                    Object.entries(customerBase || {}).forEach(([k, r]) => {
                                        if (matchKey) return;
                                        if ((r.fullName && r.fullName === name) || (r.email && r.email === email) || (r.phone && r.phone === phone)) matchKey = k;
                                    });
                                    if (!matchKey) {
                                        alert('Stranka ni bila najdena v bazi');
                                        return;
                                    }
                                    delete customerBase[matchKey];
                                    saveCustomerBase();
                                    // Attempt remote delete
                                    try {
                                        const base = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
                                        fetch(base + `site_config/customers/${encodeURIComponent(matchKey)}.json`, { method: 'DELETE' }).then(() => {}).catch(() => {});
                                    } catch (e) {}

                                    // Check bookings that reference this customer and optionally remove references
                                    (async function handleBookingsCleanup(){
                                        try {
                                            const sched = await StorageManager.load('schedule');
                                            const evs = sched && Array.isArray(sched.events) ? sched.events : [];
                                            const refs = evs.filter(ev => {
                                                const evName = (ev.extendedProps && ev.extendedProps.customer) ? ev.extendedProps.customer : (ev.title || '');
                                                const evEmail = ev.extendedProps && ev.extendedProps.email ? ev.extendedProps.email : '';
                                                const evPhone = ev.extendedProps && ev.extendedProps.phone ? ev.extendedProps.phone : '';
                                                return (evName && evName.trim() === (name || '').trim()) || (email && evEmail && evEmail.trim() === (email || '').trim()) || (phone && evPhone && evPhone.trim() === (phone || '').trim());
                                            });
                                            if (refs.length > 0) {
                                                if (confirm(`V ${refs.length} terminih je ta stranka. Ali želite odstraniti podatke stranke iz teh terminov? (OK = odstranite, Prekliči = pusti)`)) {
                                                    let changed = false;
                                                    evs.forEach(ev => {
                                                        const name = (ev.extendedProps && ev.extendedProps.customer) ? ev.extendedProps.customer : (ev.title || '');
                                                        const emailE = ev.extendedProps && ev.extendedProps.email ? ev.extendedProps.email : '';
                                                        const phoneE = ev.extendedProps && ev.extendedProps.phone ? ev.extendedProps.phone : '';
                                                        if ((name && name.trim() === name) || (email && emailE && emailE.trim() === email) || (phone && phoneE && phoneE.trim() === phone)) {
                                                            if (ev.extendedProps) {
                                                                delete ev.extendedProps.customer; delete ev.extendedProps.email; delete ev.extendedProps.phone; changed = true;
                                                            }
                                                            // also, if title equals name and extendedProps indicates booking, don't change title - leave as-is
                                                        }
                                                    });
                                                    if (changed) {
                                                        await StorageManager.save('schedule', sched);
                                                        // Reload calendar events
                                                        if (typeof loadAppointmentsToCalendarNow === 'function') loadAppointmentsToCalendarNow();
                                                    }
                                                }
                                            }
                                        } catch (e) {}
                                    })();

                                    // Refresh the panel
                                    showCustomerListPanel();
                                });
                            } catch (err) {}
                        }

                    });
                })();
            }

        // Open/close helpers for customer panel with animation
        function openCustomerPanel() {
            const panel = document.getElementById('customerListPanel'); if (!panel) return;
            const sidebarW = document.getElementById('sidebar')?.classList.contains('expanded') ? 260 : 72;
            panel.style.left  = sidebarW + 'px';
            panel.style.width = `calc(100% - ${sidebarW}px)`;
            panel.style.display = 'block';
            setTimeout(() => panel.classList.add('open'), 20);
        }

        // ===== ANALYTICS PANEL =====
        let analyticsCharts = { earnings: null, services: null };
        let manualEarningsData = [];

        async function showAnalyticsPanel() {
            const panel = document.getElementById('analyticsPanel');
            if (!panel) return;

            // Load schedule data
            try {
                if (!scheduleData || !Array.isArray(scheduleData.events)) {
                    scheduleData = await StorageManager.load('schedule');
                }
                if (scheduleData && Array.isArray(scheduleData.events)) {
                    scheduleData.events = filterDeletedEvents(scheduleData.events);
                    scheduleData.events = deduplicateEvents(scheduleData.events);
                }
            } catch (e) {}

            // Load manual earnings
            await loadManualEarnings();

            // Show panel with animation (sidebar-aware)
            const sidebarW = document.getElementById('sidebar')?.classList.contains('expanded') ? 260 : 72;
            panel.style.left  = sidebarW + 'px';
            panel.style.width = `calc(100% - ${sidebarW}px)`;
            panel.style.display = 'block';
            setTimeout(() => panel.classList.add('open'), 10);

            // Render analytics
            renderAnalytics();

            // Wire range selector
            const rangeSelector = document.getElementById('analyticsRange');
            if (rangeSelector) {
                rangeSelector.onchange = () => renderAnalytics();
            }

            // Wire export button
            const exportBtn = document.getElementById('analyticsExportBtn');
            if (exportBtn) {
                exportBtn.onclick = () => exportAnalyticsReport();
            }

            // Wire add manual earning button
            const addBtn = document.getElementById('addManualEarningBtn');
            if (addBtn) {
                addBtn.onclick = () => showAddManualEarningDialog();
            }
        }

        // ─── Booking Settings: in-memory state ───────────────────────────────────
        let _bspData = null; // loaded once per panel open

        function loadBookingSettings() {
            const DAY_DEFAULTS = {
                1: { enabled: true,  start: '09:00', end: '19:00' },
                2: { enabled: true,  start: '09:00', end: '19:00' },
                3: { enabled: true,  start: '09:00', end: '19:00' },
                4: { enabled: true,  start: '09:00', end: '19:00' },
                5: { enabled: true,  start: '09:00', end: '19:00' },
                6: { enabled: false, start: '09:00', end: '15:00' },
                0: { enabled: false, start: '09:00', end: '15:00' },
            };
            const def = {
                workingHoursByDay: {},
                autoBreak: { enabled: false, start: '13:00', end: '14:00', label: 'Malica' },
                seasonalSchedule: { enabled: false, summerStart: '2026-06-01', summerEnd: '2026-08-31', summerHoursStart: '08:00', summerHoursEnd: '20:00' },
                dateExceptions: [],
                dateOverrides: [],
                parallelClients: 1,
                maxBookingsPerDay: 0,
                employees: [],
                autoAssignEmployee: true,
                bufferBefore: 0,
                bufferAfter: 0,
                minLeadTime: 120,
                maxAdvanceDays: 60,
                blockLastMinutes: 0,
                minDuration: 15,
                maxActiveBookingsPerClient: 0,
                allowMultiDayAppointments: false,
                maxAppointmentDays: 4,
                peakHourPricing: { enabled: false, multiplier: 1.2, start: '12:00', end: '14:00' },
                weekendPricing: { enabled: false, multiplier: 1.1 },
                promoIntervals: [],
                waitlistEnabled: false,
                autoOfferOnCancel: false,
                autoFillEnabled: false,
                preventFragmentation: false,
                fragmentGapMinutes: 30,
                optimizeOccupancy: false,
                groupServices: false,
                locations: [],
                smsTemplates: {
                    confirmationEnabled: true,
                    confirmationMessage: 'Hvala za vaše naročilo na termin pri {posel}! Upravljanje: {link}',
                    reminderEnabled: false,
                    reminderMessage: '{ime}, jutri ob {cas} imate termin pri {posel}. Se vidimo!'
                }
            };
            let raw = {};
            try { raw = JSON.parse(localStorage.getItem('bookingSettings') || '{}'); } catch (_) {}
            const s = Object.assign({}, def, raw);
            // deep merge sub-objects
            s.autoBreak         = Object.assign({}, def.autoBreak,         raw.autoBreak         || {});
            s.seasonalSchedule  = Object.assign({}, def.seasonalSchedule,  raw.seasonalSchedule  || {});
            s.peakHourPricing   = Object.assign({}, def.peakHourPricing,   raw.peakHourPricing   || {});
            s.weekendPricing    = Object.assign({}, def.weekendPricing,     raw.weekendPricing    || {});
            s.smsTemplates      = Object.assign({}, def.smsTemplates,          raw.smsTemplates       || {});
            // per-day: merge with DAY_DEFAULTS then saved
            const savedDays = raw.workingHoursByDay || {};
            const legacyDays = (() => { try { return JSON.parse(localStorage.getItem('workingHoursByDay') || '{}'); } catch(_){return {};} })();
            s.workingHoursByDay = {};
            [1,2,3,4,5,6,0].forEach(k => {
                const fromSaved   = savedDays[k];
                const fromLegacy  = legacyDays[k];
                const fromDefault = DAY_DEFAULTS[k];
                s.workingHoursByDay[k] = fromSaved || fromLegacy || { ...fromDefault };
            });
            // ensure arrays
            if (!Array.isArray(s.dateExceptions))  s.dateExceptions  = [];
            if (!Array.isArray(s.dateOverrides))   s.dateOverrides   = [];
            if (!Array.isArray(s.promoIntervals))  s.promoIntervals  = [];
            if (!Array.isArray(s.employees))       s.employees       = [];
            if (!Array.isArray(s.locations))       s.locations       = [];
            return s;
        }

        function loadBusinessSettingsForm() {
            _bspData = loadBookingSettings();
            const s = _bspData;
            const DAYS = [
                { key: 1, name: 'Ponedeljek' },
                { key: 2, name: 'Torek'      },
                { key: 3, name: 'Sreda'      },
                { key: 4, name: 'Četrtek'    },
                { key: 5, name: 'Petek'      },
                { key: 6, name: 'Sobota'     },
                { key: 0, name: 'Nedelja'    },
            ];

            // ── Tab 1: Working days grid ──────────────────────────
            const grid = document.getElementById('workingDaysGrid');
            if (grid) {
                grid.innerHTML = '';
                DAYS.forEach(day => {
                    const d = s.workingHoursByDay[day.key] || { enabled: false, start: '09:00', end: '19:00' };
                    const row = document.createElement('div');
                    row.className = 'day-row' + (d.enabled ? '' : ' day-disabled');
                    row.innerHTML = `
                        <input type="checkbox" id="dayEnabled_${day.key}" ${d.enabled ? 'checked' : ''}>
                        <span class="day-name">${day.name}</span>
                        <div class="day-times">
                            <input type="time" id="dayStart_${day.key}" value="${d.start}">
                            <span style="color:#8e8e93;font-size:12px;flex-shrink:0;">–</span>
                            <input type="time" id="dayEnd_${day.key}" value="${d.end}">
                        </div>`;
                    row.querySelector(`#dayEnabled_${day.key}`).addEventListener('change', e => row.classList.toggle('day-disabled', !e.target.checked));
                    grid.appendChild(row);
                });
            }

            // ── Auto break ───────────────────────────────────────
            const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
            const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
            const showHide = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? 'block' : 'none'; };
            setChk('autoBreakEnabled',   s.autoBreak.enabled);
            setVal('autoBreakLabel',     s.autoBreak.label);
            setVal('autoBreakStart',     s.autoBreak.start);
            setVal('autoBreakEnd',       s.autoBreak.end);
            showHide('autoBreakDetails', s.autoBreak.enabled);

            // ── Multi-day ─────────────────────────────────────────
            setChk('allowMultiDayAppointments', s.allowMultiDayAppointments);
            setVal('maxAppointmentDays',         s.maxAppointmentDays);
            showHide('maxDaysRow', s.allowMultiDayAppointments);

            // ── Tab 2: Exceptions & Seasons ───────────────────────
            setChk('seasonalEnabled',       s.seasonalSchedule.enabled);
            setVal('seasonSummerStart',     s.seasonalSchedule.summerStart);
            setVal('seasonSummerEnd',       s.seasonalSchedule.summerEnd);
            setVal('seasonSummerStart_h',   s.seasonalSchedule.summerHoursStart);
            setVal('seasonSummerEnd_h',     s.seasonalSchedule.summerHoursEnd);
            showHide('seasonalDetails', s.seasonalSchedule.enabled);
            bspRenderExceptions();
            bspRenderOverrides();

            // ── Tab 3: Capacity ───────────────────────────────────
            setVal('parallelClients',    s.parallelClients);
            setVal('maxBookingsPerDay',  s.maxBookingsPerDay);
            setChk('autoAssignEmployee', s.autoAssignEmployee);

            // ── Tab 4: Rules ──────────────────────────────────────
            setVal('bufferBefore',           s.bufferBefore);
            setVal('bufferAfter',            s.bufferAfter);
            setVal('minLeadTime',            s.minLeadTime);
            setVal('maxAdvanceDays',         s.maxAdvanceDays);
            setVal('blockLastMinutes',       s.blockLastMinutes);
            setVal('minDuration',            s.minDuration);
            setVal('maxActivePerClient',     s.maxActiveBookingsPerClient);

            // ── Tab 5: Pricing ────────────────────────────────────
            setChk('peakPricingEnabled',     s.peakHourPricing.enabled);
            setVal('peakMultiplier',         s.peakHourPricing.multiplier);
            setVal('peakStart',              s.peakHourPricing.start);
            setVal('peakEnd',                s.peakHourPricing.end);
            showHide('peakPricingDetails',   s.peakHourPricing.enabled);
            setChk('weekendPricingEnabled',  s.weekendPricing.enabled);
            setVal('weekendMultiplier',      s.weekendPricing.multiplier);
            showHide('weekendPricingDetails',s.weekendPricing.enabled);
            bspRenderPromos();

            // ── Tab 6: Smart features ─────────────────────────────
            setChk('waitlistEnabled',        s.waitlistEnabled);
            setChk('autoOfferOnCancel',      s.autoOfferOnCancel);
            setChk('autoFillEnabled',        s.autoFillEnabled);
            setChk('preventFragmentation',   s.preventFragmentation);
            setChk('optimizeOccupancy',      s.optimizeOccupancy);
            setChk('groupServices',          s.groupServices);
            setVal('fragmentGapMinutes',     s.fragmentGapMinutes);
            showHide('fragmentGapRow', s.preventFragmentation);
            bspRenderLocations();
            bspRenderServices();
            bspRenderTeam();

            // ── Tab 9: SMS ────────────────────────────────────────
            const smsT = s.smsTemplates || {};
            setChk('smsConfirmEnabled', smsT.confirmationEnabled !== false);
            const smsConfEl = document.getElementById('smsConfirmTemplate');
            if (smsConfEl) {
                smsConfEl.value = smsT.confirmationMessage || 'Hvala za vaše naročilo na termin pri {posel}! Upravljanje: {link}';
                const smsConfCnt = document.getElementById('smsConfirmCharCount');
                if (smsConfCnt) smsConfCnt.textContent = smsConfEl.value.length;
                smsConfEl.oninput = () => { if (smsConfCnt) smsConfCnt.textContent = smsConfEl.value.length; };
            }
            setChk('smsReminderEnabled', !!smsT.reminderEnabled);
            const smsRemEl = document.getElementById('smsReminderTemplate');
            if (smsRemEl) {
                smsRemEl.value = smsT.reminderMessage || '{ime}, jutri ob {cas} imate termin pri {posel}. Se vidimo!';
                const smsRemCnt = document.getElementById('smsReminderCharCount');
                if (smsRemCnt) smsRemCnt.textContent = smsRemEl.value.length;
                smsRemEl.oninput = () => { if (smsRemCnt) smsRemCnt.textContent = smsRemEl.value.length; };
            }
        }

        // ── Dynamic list renderers ────────────────────────────────────────────────
        function bspRenderExceptions() {
            const el = document.getElementById('dateExceptionsList');
            if (!el || !_bspData) return;
            const typeLabel = { closed: 'Zaprt', holiday: 'Praznik', leave: 'Kolekt. dopust' };
            el.innerHTML = _bspData.dateExceptions.map((ex, i) => `
                <div class="bsp-list-item">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:14px;font-weight:500;">${ex.label || ex.date}</div>
                        <div style="font-size:12px;color:#8e8e93;">${ex.date} &nbsp;·&nbsp; <span class="bsp-badge" style="background:#ff3b301a;color:#ff3b30;">${typeLabel[ex.type]||ex.type}</span></div>
                    </div>
                    <button class="bsp-list-del" onclick="bspDelException(${i})"><i class="bi bi-trash3"></i></button>
                </div>`).join('') || '<p style="font-size:13px;color:#8e8e93;padding:8px 0 8px 12px;margin:0;width:100%;">Ni vnesenih izjem.</p>';
        }
        function bspDelException(i) { if (_bspData) { _bspData.dateExceptions.splice(i, 1); bspRenderExceptions(); } }
        function bspAddException() {
            if (!_bspData) return;
            const date = document.getElementById('newExceptionDate')?.value;
            const label = document.getElementById('newExceptionLabel')?.value?.trim() || date;
            const type  = document.getElementById('newExceptionType')?.value || 'closed';
            if (!date) { alert('Vnesi datum.'); return; }
            _bspData.dateExceptions.push({ date, label, type });
            _bspData.dateExceptions.sort((a,b) => a.date.localeCompare(b.date));
            bspRenderExceptions();
            document.getElementById('newExceptionDate').value = '';
            document.getElementById('newExceptionLabel').value = '';
        }

        function bspRenderOverrides() {
            const el = document.getElementById('dateOverridesList');
            if (!el || !_bspData) return;
            el.innerHTML = _bspData.dateOverrides.map((ov, i) => `
                <div class="bsp-list-item">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:14px;font-weight:500;">${ov.date} &nbsp; ${ov.start}–${ov.end}</div>
                        <div style="font-size:12px;color:#8e8e93;">${ov.note || '(brez opombe)'}</div>
                    </div>
                    <button class="bsp-list-del" onclick="bspDelOverride(${i})"><i class="bi bi-trash3"></i></button>
                </div>`).join('') || '<p style="font-size:13px;color:#8e8e93;padding:8px 0 8px 12px;margin:0;width:100%;">Ni vnesenih override-ov.</p>';
        }
        function bspDelOverride(i) { if (_bspData) { _bspData.dateOverrides.splice(i, 1); bspRenderOverrides(); } }
        function bspAddOverride() {
            if (!_bspData) return;
            const date  = document.getElementById('newOverrideDate')?.value;
            const start = document.getElementById('newOverrideStart')?.value;
            const end   = document.getElementById('newOverrideEnd')?.value;
            const note  = document.getElementById('newOverrideNote')?.value?.trim() || '';
            if (!date || !start || !end) { alert('Vnesi datum in ure.'); return; }
            _bspData.dateOverrides.push({ date, start, end, note });
            _bspData.dateOverrides.sort((a,b) => a.date.localeCompare(b.date));
            bspRenderOverrides();
            document.getElementById('newOverrideDate').value = '';
            document.getElementById('newOverrideNote').value = '';
        }

        function bspRenderPromos() {
            const el = document.getElementById('promoIntervalsList');
            if (!el || !_bspData) return;
            el.innerHTML = _bspData.promoIntervals.map((p, i) => `
                <div class="bsp-list-item">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:14px;font-weight:500;">${p.label || 'Akcija'} &nbsp;<span class="bsp-badge" style="background:#34c75920;color:#34c759;">-${p.discount}%</span></div>
                        <div style="font-size:12px;color:#8e8e93;">${p.from} – ${p.to}</div>
                    </div>
                    <button class="bsp-list-del" onclick="bspDelPromo(${i})"><i class="bi bi-trash3"></i></button>
                </div>`).join('') || '<p style="font-size:13px;color:#8e8e93;padding:8px 0 8px 12px;margin:0;width:100%;">Ni vnesenih akcij.</p>';
        }
        function bspDelPromo(i) { if (_bspData) { _bspData.promoIntervals.splice(i, 1); bspRenderPromos(); } }
        function bspAddPromo() {
            if (!_bspData) return;
            const from     = document.getElementById('newPromoFrom')?.value;
            const to       = document.getElementById('newPromoTo')?.value;
            const discount = parseInt(document.getElementById('newPromoDiscount')?.value, 10) || 10;
            const label    = document.getElementById('newPromoLabel')?.value?.trim() || 'Akcija';
            if (!from || !to) { alert('Vnesi datuma od/do.'); return; }
            _bspData.promoIntervals.push({ from, to, discount, label });
            _bspData.promoIntervals.sort((a,b) => a.from.localeCompare(b.from));
            bspRenderPromos();
            document.getElementById('newPromoFrom').value = '';
            document.getElementById('newPromoTo').value = '';
            document.getElementById('newPromoLabel').value = '';
        }

        // ── HTML escape helper ─────────────────────────────────────────────────
        function _escH(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

        // ── Services management (syncs with SITE_CONFIG.servicesSection.items) ──
        let _bspSvcTimer = null, _bspTeamTimer = null;
        function _bspSvcAutoSave()  { clearTimeout(_bspSvcTimer);  _bspSvcTimer  = setTimeout(bspSaveServicesToConfig, 900); }
        function _bspTeamAutoSave() { clearTimeout(_bspTeamTimer); _bspTeamTimer = setTimeout(bspSaveTeamToConfig, 900); }

        function bspRenderServices() {
            const el = document.getElementById('bspServicesList');
            if (!el) return;
            const items = window.SITE_CONFIG?.servicesSection?.items || [];
            if (items.length === 0) {
                el.innerHTML = '<p style="font-size:13px;color:#8e8e93;padding:8px 0;">Ni dodanih storitev. Klikni + Dodaj storitev.</p>';
                return;
            }
            el.innerHTML = items.map((svc, i) => {
                let durVal = svc.duration || 30, durUnit = 'min';
                if (durVal >= 1440 && durVal % 1440 === 0) { durVal = durVal / 1440; durUnit = 'dni'; }
                else if (durVal >= 60 && durVal % 60 === 0) { durVal = durVal / 60; durUnit = 'ure'; }
                return `
                <div class="bsp-list-item" style="flex-direction:column;align-items:stretch;gap:8px;padding:12px 14px;" data-svc-idx="${i}">
                    <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                        <span style="font-size:12px;font-weight:600;color:#8e8e93;">Storitev ${i+1}</span>
                        <button class="bsp-list-del" onclick="bspDelService(${i})"><i class="bi bi-trash3"></i></button>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <div><label style="font-size:11px;color:#8e8e93;display:block;margin-bottom:3px;">Ime storitve</label>
                        <input type="text" class="bsp-input svc-name" value="${_escH(svc.name||'')}" style="width:100%;box-sizing:border-box;" placeholder="Npr. Striženje"></div>
                        <div><label style="font-size:11px;color:#8e8e93;display:block;margin-bottom:3px;">Cena</label>
                        <input type="text" class="bsp-input svc-price" value="${_escH(svc.price||'')}" style="width:100%;box-sizing:border-box;" placeholder="€15"></div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end;">
                        <div><label style="font-size:11px;color:#8e8e93;display:block;margin-bottom:3px;">Opis</label>
                        <input type="text" class="bsp-input svc-desc" value="${_escH(svc.desc||'')}" style="width:100%;box-sizing:border-box;" placeholder="Kratek opis storitve"></div>
                        <div><label style="font-size:11px;color:#8e8e93;display:block;margin-bottom:3px;">Trajanje</label>
                        <div style="display:flex;gap:4px;">
                            <input type="number" class="bsp-input svc-dur-val" value="${durVal}" min="1" style="width:60px;text-align:center;">
                            <select class="bsp-input svc-dur-unit" style="width:62px;">
                                <option value="min" ${durUnit==='min'?'selected':''}>min</option>
                                <option value="ure" ${durUnit==='ure'?'selected':''}>ure</option>
                                <option value="dni" ${durUnit==='dni'?'selected':''}>dni</option>
                            </select>
                        </div></div>
                    </div>
                </div>`;
            }).join('');
            el.oninput  = _bspSvcAutoSave;
            el.onchange = _bspSvcAutoSave;
        }
        function bspCollectServices() {
            const items = [];
            document.querySelectorAll('#bspServicesList [data-svc-idx]').forEach(row => {
                const name  = row.querySelector('.svc-name')?.value?.trim() || '';
                const price = row.querySelector('.svc-price')?.value?.trim() || '';
                const desc  = row.querySelector('.svc-desc')?.value?.trim() || '';
                const durVal  = parseInt(row.querySelector('.svc-dur-val')?.value || '30') || 30;
                const durUnit = row.querySelector('.svc-dur-unit')?.value || 'min';
                const mult  = durUnit === 'dni' ? 1440 : durUnit === 'ure' ? 60 : 1;
                items.push({ name, price, desc, duration: durVal * mult });
            });
            return items;
        }
        function bspDelService(i) {
            if (!window.SITE_CONFIG?.servicesSection) return;
            const items = bspCollectServices();
            items.splice(i, 1);
            window.SITE_CONFIG.servicesSection.items = items;
            bspRenderServices();
        }
        function bspAddServiceItem() {
            if (!window.SITE_CONFIG) return;
            if (!window.SITE_CONFIG.servicesSection) window.SITE_CONFIG.servicesSection = { title: 'Storitve', items: [] };
            window.SITE_CONFIG.servicesSection.items = bspCollectServices();
            window.SITE_CONFIG.servicesSection.items.push({ name: 'Nova storitev', price: '€0', duration: 30, desc: '' });
            bspRenderServices();
        }
        async function bspSaveServicesToConfig() {
            if (!window.SITE_CONFIG) { alert('Konfiguracija ni naložena.'); return; }
            if (!window.SITE_CONFIG.servicesSection) window.SITE_CONFIG.servicesSection = { title: 'Storitve', items: [] };
            window.SITE_CONFIG.servicesSection.items = bspCollectServices();
            try {
                if (window.StorageManager) await StorageManager.save('site_config', window.SITE_CONFIG);
                if (window.CloudSync && typeof window.CloudSync.saveToCloud === 'function') await window.CloudSync.saveToCloud(window.SITE_CONFIG);
                if (typeof showToast === 'function') showToast('✅ Storitve shranjene!');
                else alert('Storitve shranjene.');
            } catch(e) { alert('Napaka pri shranjevanju: ' + e.message); }
        }

        // ── Team management (syncs with SITE_CONFIG.barbersSection.list) ─────────
        function bspRenderTeam() {
            const el = document.getElementById('bspTeamList');
            if (!el) return;
            const list = window.SITE_CONFIG?.barbersSection?.list || [];
            if (list.length === 0) {
                el.innerHTML = '<p style="font-size:13px;color:#8e8e93;padding:8px 0;">Ni dodanih članov ekipe. Klikni + Dodaj člana.</p>';
                return;
            }
            el.innerHTML = list.map((m, i) => `
                <div class="bsp-list-item" style="flex-direction:column;align-items:stretch;gap:8px;padding:12px 14px;" data-team-idx="${i}">
                    <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;">
                        <span style="font-size:12px;font-weight:600;color:#8e8e93;">Član ${i+1}</span>
                        <button class="bsp-list-del" onclick="bspDelTeamMember(${i})"><i class="bi bi-trash3"></i></button>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <div><label style="font-size:11px;color:#8e8e93;display:block;margin-bottom:3px;">Ime</label>
                        <input type="text" class="bsp-input team-name" value="${_escH(m.name||'')}" style="width:100%;box-sizing:border-box;" placeholder="Ime člana"></div>
                        <div><label style="font-size:11px;color:#8e8e93;display:block;margin-bottom:3px;">Vloga</label>
                        <input type="text" class="bsp-input team-role" value="${_escH(m.role||'')}" style="width:100%;box-sizing:border-box;" placeholder="npr. Frizer"></div>
                    </div>
                    <div><label style="font-size:11px;color:#8e8e93;display:block;margin-bottom:3px;">URL slike</label>
                    <input type="text" class="bsp-input team-img" value="${_escH(m.img&&m.img!=='https://via.placeholder.com/300'?m.img:'')}" style="width:100%;box-sizing:border-box;" placeholder="https://..."></div>
                </div>`).join('');
            el.oninput  = _bspTeamAutoSave;
            el.onchange = _bspTeamAutoSave;
        }
        function bspCollectTeam() {
            const items = [];
            document.querySelectorAll('#bspTeamList [data-team-idx]').forEach(row => {
                const name = row.querySelector('.team-name')?.value?.trim() || '';
                const role = row.querySelector('.team-role')?.value?.trim() || '';
                const img  = row.querySelector('.team-img')?.value?.trim() || '';
                items.push({ name, role, img: img || 'https://via.placeholder.com/300' });
            });
            return items;
        }
        function bspDelTeamMember(i) {
            if (!window.SITE_CONFIG?.barbersSection) return;
            const list = bspCollectTeam();
            list.splice(i, 1);
            window.SITE_CONFIG.barbersSection.list = list;
            bspRenderTeam();
        }
        function bspAddTeamMember() {
            if (!window.SITE_CONFIG) return;
            if (!window.SITE_CONFIG.barbersSection) window.SITE_CONFIG.barbersSection = { title: 'Ekipa', list: [] };
            window.SITE_CONFIG.barbersSection.list = bspCollectTeam();
            window.SITE_CONFIG.barbersSection.list.push({ name: 'Nov član', role: 'Frizer', img: '' });
            bspRenderTeam();
        }
        async function bspSaveTeamToConfig() {
            if (!window.SITE_CONFIG) { alert('Konfiguracija ni naložena.'); return; }
            if (!window.SITE_CONFIG.barbersSection) window.SITE_CONFIG.barbersSection = { title: 'Ekipa', list: [] };
            window.SITE_CONFIG.barbersSection.list = bspCollectTeam();
            try {
                if (window.StorageManager) await StorageManager.save('site_config', window.SITE_CONFIG);
                if (window.CloudSync && typeof window.CloudSync.saveToCloud === 'function') await window.CloudSync.saveToCloud(window.SITE_CONFIG);
                if (typeof showToast === 'function') showToast('✅ Ekipa shranjena!');
                else alert('Ekipa shranjena.');
            } catch(e) { alert('Napaka pri shranjevanju: ' + e.message); }
        }

        function bspRenderLocations() {
            const el = document.getElementById('locationsList');
            if (!el || !_bspData) return;
            el.innerHTML = _bspData.locations.map((loc, i) => `
                <div class="bsp-list-item">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:14px;font-weight:500;">${loc.name}</div>
                        <div style="font-size:12px;color:#8e8e93;">${loc.address || ''} ${loc.phone ? '· ' + loc.phone : ''}</div>
                    </div>
                    <button class="bsp-list-del" onclick="bspDelLocation(${i})"><i class="bi bi-trash3"></i></button>
                </div>`).join('') || '<p style="font-size:13px;color:#8e8e93;padding:8px 0 8px 12px;margin:0;">Ni dodanih poslovalnic. Privzeto je ena lokacija.</p>';
        }
        function bspDelLocation(i) { if (_bspData) { _bspData.locations.splice(i, 1); bspRenderLocations(); } }
        function bspAddLocation() {
            if (!_bspData) return;
            const name    = prompt('Naziv poslovalnice:');
            if (!name || !name.trim()) return;
            const address = prompt('Naslov (opcijsko):') || '';
            const phone   = prompt('Telefon (opcijsko):') || '';
            _bspData.locations.push({ id: Date.now().toString(36), name: name.trim(), address, phone });
            bspRenderLocations();
        }

        // ── Show panel ────────────────────────────────────────────────────────────
        function showBusinessSettingsPanel() {
            const panel = document.getElementById('businessSettingsPanel');
            if (!panel) return;
            closeCustomerPanel();
            closeAnalyticsPanel();
            const sidebarW = document.getElementById('sidebar')?.classList.contains('expanded') ? 260 : 72;
            panel.style.left  = sidebarW + 'px';
            panel.style.width = `calc(100% - ${sidebarW}px)`;
            panel.classList.remove('open');
            panel.style.display = 'block';
            loadBusinessSettingsForm();
            // Activate first tab
            document.querySelectorAll('.bsp-tab').forEach((t,i) => t.classList.toggle('active', i === 0));
            document.querySelectorAll('.bsp-tab-panel').forEach((p,i) => p.classList.toggle('active', i === 0));
            setTimeout(() => panel.classList.add('open'), 10);
        }

        // ── Save all settings ─────────────────────────────────────────────────────
        async function saveBusinessSettings() {
            if (!_bspData) { alert('Najprej odpri nastavitve.'); return; }
            const s = _bspData;
            const get  = id => { const el = document.getElementById(id); return el ? el.value : ''; };
            const getN = (id, def) => { const v = parseInt(get(id), 10); return isNaN(v) ? def : v; };
            const getF = (id, def) => { const v = parseFloat(get(id)); return isNaN(v) ? def : v; };
            const getC = id => { const el = document.getElementById(id); return el ? el.checked : false; };

            // ── Tab 1: Days ───────────────────────────────────────
            const DAYS_KEYS = [1, 2, 3, 4, 5, 6, 0];
            let allValid = true;
            const daysByKey = {};
            for (const k of DAYS_KEYS) {
                const enabledEl = document.getElementById(`dayEnabled_${k}`);
                if (!enabledEl) continue;
                const enabled = enabledEl.checked;
                const start = get(`dayStart_${k}`) || '09:00';
                const end   = get(`dayEnd_${k}`)   || '19:00';
                if (enabled) {
                    const [sh,sm] = start.split(':').map(Number);
                    const [eh,em] = end.split(':').map(Number);
                    if ((eh*60+em) <= (sh*60+sm)) {
                        const names = ['Nedelja','Ponedeljek','Torek','Sreda','Četrtek','Petek','Sobota'];
                        alert(`Konec mora biti po začetku (${names[k]}).`);
                        allValid = false; break;
                    }
                }
                daysByKey[k] = { enabled, start, end };
            }
            if (!allValid) return;

            s.workingHoursByDay   = daysByKey;
            s.autoBreak           = { enabled: getC('autoBreakEnabled'), start: get('autoBreakStart') || '13:00', end: get('autoBreakEnd') || '14:00', label: get('autoBreakLabel') || 'Malica' };
            s.allowMultiDayAppointments = getC('allowMultiDayAppointments');
            s.maxAppointmentDays  = Math.max(1, Math.min(14, getN('maxAppointmentDays', 4)));

            // ── Tab 2: Exceptions & Seasons ───────────────────────
            s.seasonalSchedule    = { enabled: getC('seasonalEnabled'), summerStart: get('seasonSummerStart'), summerEnd: get('seasonSummerEnd'), summerHoursStart: get('seasonSummerStart_h'), summerHoursEnd: get('seasonSummerEnd_h') };
            // dateExceptions & dateOverrides already in _bspData (managed in-memory)

            // ── Tab 3: Capacity ───────────────────────────────────
            s.parallelClients     = Math.max(1, getN('parallelClients', 1));
            s.maxBookingsPerDay   = Math.max(0, getN('maxBookingsPerDay', 0));
            s.autoAssignEmployee  = getC('autoAssignEmployee');
            // employees already in _bspData

            // ── Tab 4: Rules ──────────────────────────────────────
            s.bufferBefore              = Math.max(0, getN('bufferBefore', 0));
            s.bufferAfter               = Math.max(0, getN('bufferAfter', 0));
            s.minLeadTime               = Math.max(0, getN('minLeadTime', 120));
            s.maxAdvanceDays            = Math.max(1, getN('maxAdvanceDays', 60));
            s.blockLastMinutes          = Math.max(0, getN('blockLastMinutes', 0));
            s.minDuration               = Math.max(5, getN('minDuration', 15));
            s.maxActiveBookingsPerClient = Math.max(0, getN('maxActivePerClient', 0));

            // ── Tab 5: Pricing ────────────────────────────────────
            s.peakHourPricing    = { enabled: getC('peakPricingEnabled'), multiplier: getF('peakMultiplier', 1.2), start: get('peakStart') || '12:00', end: get('peakEnd') || '14:00' };
            s.weekendPricing     = { enabled: getC('weekendPricingEnabled'), multiplier: getF('weekendMultiplier', 1.1) };
            // promoIntervals already in _bspData

            // ── Tab 6: Smart features ─────────────────────────────
            s.waitlistEnabled       = getC('waitlistEnabled');
            s.autoOfferOnCancel     = getC('autoOfferOnCancel');
            s.autoFillEnabled       = getC('autoFillEnabled');
            s.preventFragmentation  = getC('preventFragmentation');
            s.fragmentGapMinutes    = Math.max(5, getN('fragmentGapMinutes', 30));
            s.optimizeOccupancy     = getC('optimizeOccupancy');
            s.groupServices         = getC('groupServices');
            // locations already in _bspData

            // ── Tab 9: SMS ────────────────────────────────────────
            s.smsTemplates = {
                confirmationEnabled: getC('smsConfirmEnabled'),
                confirmationMessage: (document.getElementById('smsConfirmTemplate')?.value || '').trim() || 'Hvala za vaše naročilo na termin pri {posel}! Upravljanje: {link}',
                reminderEnabled: getC('smsReminderEnabled'),
                reminderMessage: (document.getElementById('smsReminderTemplate')?.value || '').trim() || '{ime}, jutri ob {cas} imate termin pri {posel}. Se vidimo!'
            };

            // ── Persist ───────────────────────────────────────────
            try { localStorage.setItem('bookingSettings', JSON.stringify(s)); } catch (e) {}

            // Derive global hours for backward compat
            const enabledWD = DAYS_KEYS.filter(k => k >= 1 && k <= 5 && daysByKey[k]?.enabled);
            const startHour = enabledWD.length > 0 ? Math.min(...enabledWD.map(k => parseInt(daysByKey[k].start, 10))) : 9;
            const endHour   = enabledWD.length > 0 ? Math.max(...enabledWD.map(k => parseInt(daysByKey[k].end, 10)))   : 19;
            try {
                localStorage.setItem('workingHoursByDay', JSON.stringify(daysByKey));
                localStorage.setItem('workingHours', JSON.stringify({ start: `${String(startHour).padStart(2,'0')}:00`, end: `${String(endHour).padStart(2,'0')}:00` }));
            } catch (e) {}

            // Update runtime SITE_CONFIG
            if (!window.SITE_CONFIG || typeof window.SITE_CONFIG !== 'object') window.SITE_CONFIG = {};
            if (!window.SITE_CONFIG.booking) window.SITE_CONFIG.booking = {};
            window.SITE_CONFIG.booking.businessHours           = { start: startHour, end: endHour };
            window.SITE_CONFIG.booking.allowMultiDayAppointments = s.allowMultiDayAppointments;
            window.SITE_CONFIG.booking.maxAppointmentDays      = s.maxAppointmentDays;
            window.SITE_CONFIG.booking.parallelClients         = s.parallelClients;
            window.SITE_CONFIG.booking.bufferBefore            = s.bufferBefore;
            window.SITE_CONFIG.booking.bufferAfter             = s.bufferAfter;
            window.SITE_CONFIG.booking.minLeadTime             = s.minLeadTime;
            window.SITE_CONFIG.booking.maxAdvanceDays          = s.maxAdvanceDays;
            try { localStorage.setItem('site_config_backup', JSON.stringify(window.SITE_CONFIG)); } catch (e) {}

            // Cloud sync
            try {
                if (window.CloudSync && typeof window.CloudSync.saveToCloud === 'function') {
                    await window.CloudSync.saveToCloud(window.SITE_CONFIG);
                }
            } catch (e) {}

            // Update FullCalendar live
            try {
                if (window.calendar && typeof window.calendar.setOption === 'function') {
                    const bHoursArr = Object.entries(daysByKey)
                        .filter(([,d]) => d.enabled)
                        .map(([k,d]) => ({ daysOfWeek: [parseInt(k,10)], startTime: d.start, endTime: d.end }));
                    window.calendar.setOption('businessHours', bHoursArr);
                    window.calendar.setOption('slotMinTime', `${String(startHour).padStart(2,'0')}:00:00`);
                    window.calendar.setOption('slotMaxTime', `${String(endHour).padStart(2,'0')}:00:00`);
                    if (typeof window.calendar.updateSize === 'function') window.calendar.updateSize();
                }
            } catch (e) {}

            // Also collect and persist services + team from their tab forms
            try {
                if (window.SITE_CONFIG) {
                    if (window.SITE_CONFIG.servicesSection) window.SITE_CONFIG.servicesSection.items = bspCollectServices();
                    if (window.SITE_CONFIG.barbersSection)  window.SITE_CONFIG.barbersSection.list   = bspCollectTeam();
                    if (window.StorageManager) await StorageManager.save('site_config', window.SITE_CONFIG);
                    if (window.CloudSync?.saveToCloud) await window.CloudSync.saveToCloud(window.SITE_CONFIG);
                }
            } catch (e) {}
            // Show feedback toast if available, else alert
            if (typeof showToast === 'function') {
                showToast('✅ Nastavitve rezervacij shranjene!');
            } else {
                alert('Nastavitve rezervacij so shranjene.');
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            // Tab switching
            document.addEventListener('click', e => {
                const tab = e.target.closest('.bsp-tab');
                if (tab && tab.closest('#bspTabBar')) {
                    const key = tab.dataset.tab;
                    document.querySelectorAll('.bsp-tab').forEach(t => t.classList.toggle('active', t === tab));
                    document.querySelectorAll('.bsp-tab-panel').forEach(p => p.classList.toggle('active', p.id === 'bspPanel-' + key));
                }
            });
            // Toggle visibility of dependent sections via event delegation
            document.addEventListener('change', e => {
                const id = e.target.id;
                const v  = e.target.checked;
                if (id === 'allowMultiDayAppointments')  { const el = document.getElementById('maxDaysRow');            if (el) el.style.display = v ? 'block' : 'none'; }
                if (id === 'autoBreakEnabled')           { const el = document.getElementById('autoBreakDetails');       if (el) el.style.display = v ? 'block' : 'none'; }
                if (id === 'seasonalEnabled')            { const el = document.getElementById('seasonalDetails');        if (el) el.style.display = v ? 'block' : 'none'; }
                if (id === 'peakPricingEnabled')         { const el = document.getElementById('peakPricingDetails');     if (el) el.style.display = v ? 'block' : 'none'; }
                if (id === 'weekendPricingEnabled')      { const el = document.getElementById('weekendPricingDetails');  if (el) el.style.display = v ? 'block' : 'none'; }
                if (id === 'preventFragmentation')       { const el = document.getElementById('fragmentGapRow');         if (el) el.style.display = v ? 'block' : 'none'; }
            });
            // Save button
            document.addEventListener('click', e => {
                if (e.target.id === 'saveBusinessSettingsBtn' || e.target.closest('#saveBusinessSettingsBtn')) {
                    saveBusinessSettings();
                }
            });
        });

        // On page load: send any pending 24h SMS reminders that have come due
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                const _smsS = loadBookingSettings();
                if (!_smsS.smsTemplates?.reminderEnabled) return;
                let _rems = [];
                try { _rems = JSON.parse(localStorage.getItem('sms_reminders') || '[]'); } catch (_) {}
                const _now = new Date();
                let _changed = false;
                for (const _r of _rems) {
                    if (!_r.sent && new Date(_r.reminderTime) <= _now) {
                        if (window.SMSHandler?.sendAppointmentReminder) {
                            await window.SMSHandler.sendAppointmentReminder({
                                phoneNumber: _r.phoneNumber,
                                start:       _r.appointmentStart,
                                customer:    _r.customer
                            });
                        }
                        _r.sent = true;
                        _changed = true;
                    }
                }
                if (_changed) localStorage.setItem('sms_reminders', JSON.stringify(_rems));
            } catch (_) {}
        });

        async function loadManualEarnings() {
            try {
                const raw = localStorage.getItem('manual_earnings');
                manualEarningsData = raw ? JSON.parse(raw) : [];
            } catch (e) {
                manualEarningsData = [];
            }
        }

        async function saveManualEarnings() {
            try {
                localStorage.setItem('manual_earnings', JSON.stringify(manualEarningsData));
            } catch (e) {}
        }

        function renderAnalytics() {
            const rangeDays = parseInt(document.getElementById('analyticsRange')?.value || '30');
            const now = new Date();
            const rangeStart = rangeDays === 'all' ? new Date(0) : new Date(now.getTime() - (rangeDays * 24 * 60 * 60 * 1000));

            // Filter events
            const allEvents = (scheduleData && Array.isArray(scheduleData.events)) ? scheduleData.events : [];
            const completedEvents = allEvents.filter(e => {
                if (!e.end) return false;
                const endDate = new Date(e.end);
                return endDate < now && endDate >= rangeStart && (e.extendedProps?.isBooking || e.isBooking || e.extendedProps?.tab === 'customer');
            });

            const upcomingEvents = allEvents.filter(e => {
                if (!e.start) return false;
                const startDate = new Date(e.start);
                return startDate > now && (e.extendedProps?.isBooking || e.isBooking || e.extendedProps?.tab === 'customer');
            });

            // Calculate earnings from appointments
            const appointmentEarnings = completedEvents.reduce((sum, e) => {
                const price = parseFloat(e.extendedProps?.price || 0);
                return sum + price;
            }, 0);

            // Calculate manual earnings in range
            const manualEarningsInRange = manualEarningsData.filter(m => {
                const date = new Date(m.date);
                return date >= rangeStart && date <= now;
            });
            const manualEarningsSum = manualEarningsInRange.reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);

            const totalEarnings = appointmentEarnings + manualEarningsSum;

            // Calculate upcoming revenue
            const upcomingRevenue = upcomingEvents.reduce((sum, e) => {
                const price = parseFloat(e.extendedProps?.price || 0);
                return sum + price;
            }, 0);

            // Calculate active customers
            const customerMap = {};
            completedEvents.forEach(e => {
                const name = e.extendedProps?.customer || e.title || '';
                const email = e.extendedProps?.email || '';
                const phone = e.extendedProps?.phone || '';
                const key = `${name}_${email}_${phone}`.toLowerCase();
                if (!customerMap[key]) customerMap[key] = { name, count: 0 };
                customerMap[key].count++;
            });
            const activeCustomers = Object.keys(customerMap).length;

            // Calculate average per day
            const daysInRange = rangeDays === 'all' ? Math.ceil((now - new Date(completedEvents[0]?.end || now)) / (24 * 60 * 60 * 1000)) : rangeDays;
            const avgPerDay = daysInRange > 0 ? totalEarnings / daysInRange : 0;

            // Update stat cards
            document.getElementById('totalEarnings').textContent = `${totalEarnings.toFixed(2)}€`;
            document.getElementById('totalEarningsCount').textContent = `${completedEvents.length} opravljenih terminov`;
            document.getElementById('upcomingRevenue').textContent = `${upcomingRevenue.toFixed(2)}€`;
            document.getElementById('upcomingRevenueCount').textContent = `${upcomingEvents.length} rezerviranih terminov`;
            document.getElementById('avgPerDay').textContent = `${avgPerDay.toFixed(2)}€`;
            document.getElementById('avgPerDayData').textContent = `iz ${daysInRange} dni`;
            document.getElementById('activeCustomers').textContent = activeCustomers;
            document.getElementById('activeCustomersData').textContent = `${completedEvents.length} terminov skupaj`;

            // Render charts
            renderEarningsChart(completedEvents, manualEarningsInRange, rangeStart, now);
            renderServicesChart(completedEvents);

            // Render manual earnings list
            renderManualEarningsList();
        }

        function renderEarningsChart(completedEvents, manualEarningsInRange, rangeStart, rangeEnd) {
            const ctx = document.getElementById('earningsChart');
            if (!ctx) return;

            // Destroy existing chart
            if (analyticsCharts.earnings) {
                analyticsCharts.earnings.destroy();
            }

            // Group earnings by day
            const dailyEarnings = {};
            completedEvents.forEach(e => {
                const date = new Date(e.end).toISOString().split('T')[0];
                const price = parseFloat(e.extendedProps?.price || 0);
                dailyEarnings[date] = (dailyEarnings[date] || 0) + price;
            });

            manualEarningsInRange.forEach(m => {
                const date = new Date(m.date).toISOString().split('T')[0];
                dailyEarnings[date] = (dailyEarnings[date] || 0) + parseFloat(m.amount || 0);
            });

            // Sort dates and prepare data
            const dates = Object.keys(dailyEarnings).sort();
            const values = dates.map(d => dailyEarnings[d]);

            analyticsCharts.earnings = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates.map(d => new Date(d).toLocaleDateString('sl-SI', { day: 'numeric', month: 'short' })),
                    datasets: [{
                        label: 'Zaslužek (€)',
                        data: values,
                        borderColor: '#34C759',
                        backgroundColor: 'rgba(52, 199, 89, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.parsed.y.toFixed(2)}€`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => `${value}€`
                            }
                        }
                    }
                }
            });
        }

        function renderServicesChart(completedEvents) {
            const ctx = document.getElementById('servicesChart');
            if (!ctx) return;

            // Destroy existing chart
            if (analyticsCharts.services) {
                analyticsCharts.services.destroy();
            }

            // Group by service type
            const serviceEarnings = {};
            completedEvents.forEach(e => {
                const services = e.extendedProps?.services || [];
                const price = parseFloat(e.extendedProps?.price || 0);
                const perService = price / (services.length || 1);
                services.forEach(s => {
                    serviceEarnings[s] = (serviceEarnings[s] || 0) + perService;
                });
            });

            const labels = Object.keys(serviceEarnings);
            const values = Object.values(serviceEarnings);

            const colors = [
                '#FF3B30', '#FF9500', '#FFCC00', '#34C759', 
                '#5AC8FA', '#007AFF', '#AF52DE', '#FF2D55'
            ];

            analyticsCharts.services = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors.slice(0, labels.length),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 12,
                                padding: 10,
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.label}: ${context.parsed.toFixed(2)}€`
                            }
                        }
                    }
                }
            });
        }

        function renderManualEarningsList() {
            const container = document.getElementById('manualEarningsList');
            if (!container) return;

            if (manualEarningsData.length === 0) {
                container.innerHTML = '<div style="color:var(--ios-text-secondary); padding:20px; text-align:center;">Ni ročnih vnosov.</div>';
                return;
            }

            let html = '';
            manualEarningsData.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((m, idx) => {
                const date = new Date(m.date).toLocaleDateString('sl-SI', { day: 'numeric', month: 'long', year: 'numeric' });
                html += `
                    <div class="manual-earning-item">
                        <div class="manual-earning-info">
                            <div class="manual-earning-desc">${m.description}</div>
                            <div class="manual-earning-date">${date}</div>
                        </div>
                        <div class="manual-earning-amount">${parseFloat(m.amount).toFixed(2)}€</div>
                        <div class="manual-earning-actions">
                            <button class="btn btn-danger btn-sm" onclick="deleteManualEarning(${idx})" style="padding:6px 10px; font-size:12px;">Izbriši</button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        function showAddManualEarningDialog() {
            const description = prompt('Opis zaslužka:');
            if (!description) return;

            const amount = prompt('Znesek (€):');
            if (!amount || isNaN(parseFloat(amount))) {
                alert('Napačen znesek!');
                return;
            }

            const date = prompt('Datum (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
            if (!date) return;

            manualEarningsData.push({
                description,
                amount: parseFloat(amount),
                date,
                id: Date.now()
            });

            saveManualEarnings();
            renderAnalytics();
        }

        async function deleteManualEarning(index) {
            if (!confirm('Ali ste prepričani, da želite izbrisati ta vnos?')) return;
            manualEarningsData.splice(index, 1);
            await saveManualEarnings();
            renderAnalytics();
        }

        function exportAnalyticsReport() {
            const rangeDays = parseInt(document.getElementById('analyticsRange')?.value || '30');
            const shopName = (window.SITE_CONFIG && window.SITE_CONFIG.shopName) ? window.SITE_CONFIG.shopName : 'Podjetje';
            const currency = (window.SITE_CONFIG && window.SITE_CONFIG.currency) ? window.SITE_CONFIG.currency : '€';
            const now = new Date();
            const rangeStart = new Date(now.getTime() - (rangeDays * 24 * 60 * 60 * 1000));
            const exportDate = now.toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const rangeLabel = rangeStart.toLocaleDateString('sl-SI') + ' \u2013 ' + now.toLocaleDateString('sl-SI');

            const allEvents = (scheduleData && Array.isArray(scheduleData.events)) ? scheduleData.events : [];
            const completedEvents = allEvents.filter(e => {
                if (!e.end) return false;
                const endDate = new Date(e.end);
                return endDate < now && endDate >= rangeStart && (e.extendedProps?.isBooking || e.isBooking || e.extendedProps?.tab === 'customer');
            });
            const upcomingEvents = allEvents.filter(e => {
                if (!e.start) return false;
                return new Date(e.start) > now && (e.extendedProps?.isBooking || e.isBooking || e.extendedProps?.tab === 'customer');
            });

            const apptEarnings = completedEvents.reduce((s, e) => s + parseFloat(e.extendedProps?.price || 0), 0);
            const manualInRange = manualEarningsData.filter(m => { const d = new Date(m.date); return d >= rangeStart && d <= now; });
            const manualSum = manualInRange.reduce((s, m) => s + parseFloat(m.amount || 0), 0);
            const totalEarnings = apptEarnings + manualSum;
            const upcomingRevenue = upcomingEvents.reduce((s, e) => s + parseFloat(e.extendedProps?.price || 0), 0);
            const avgPerDay = rangeDays > 0 ? totalEarnings / rangeDays : 0;

            const custSet = new Set();
            completedEvents.forEach(e => {
                const k = (e.extendedProps?.customer||'')+'|'+(e.extendedProps?.email||'')+'|'+(e.extendedProps?.phone||'');
                if (k !== '||') custSet.add(k.toLowerCase());
            });

            const fmt  = n => parseFloat(n || 0).toFixed(2) + ' ' + currency;
            const fmtD = d => { try { return new Date(d).toLocaleDateString('sl-SI'); } catch(_){ return ''; } };
            const fmtT = d => { try { return new Date(d).toLocaleTimeString('sl-SI', {hour:'2-digit',minute:'2-digit'}); } catch(_){ return ''; } };
            const esc  = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

            let rowsCompleted = '';
            [...completedEvents].sort((a,b) => new Date(a.start)-new Date(b.start)).forEach((e,i) => {
                const svc = Array.isArray(e.extendedProps?.services) ? e.extendedProps.services.join(', ') : (e.extendedProps?.services || '\u2013');
                const dur = e.extendedProps?.duration ? e.extendedProps.duration + ' min' : '\u2013';
                rowsCompleted += `<tr>
                    <td style="text-align:center;color:#888">${i+1}</td>
                    <td>${fmtD(e.start)}</td>
                    <td>${fmtT(e.start)} \u2013 ${fmtT(e.end)}</td>
                    <td><b>${esc(e.extendedProps?.customer||e.title||'\u2013')}</b></td>
                    <td>${esc(e.extendedProps?.phone||'\u2013')}</td>
                    <td>${esc(e.extendedProps?.email||'\u2013')}</td>
                    <td>${esc(svc)}</td>
                    <td style="text-align:center">${dur}</td>
                    <td style="text-align:right;font-weight:bold">${fmt(e.extendedProps?.price)}</td>
                </tr>`;
            });
            if (rowsCompleted) rowsCompleted += `<tr style="background:#eef2ff;font-weight:bold;border-top:2px solid #4361ee">
                <td colspan="8" style="text-align:right">SKUPAJ</td>
                <td style="text-align:right">${fmt(apptEarnings)}</td></tr>`;

            let rowsUpcoming = '';
            [...upcomingEvents].sort((a,b) => new Date(a.start)-new Date(b.start)).forEach((e,i) => {
                const svc = Array.isArray(e.extendedProps?.services) ? e.extendedProps.services.join(', ') : (e.extendedProps?.services || '\u2013');
                rowsUpcoming += `<tr>
                    <td style="text-align:center;color:#888">${i+1}</td>
                    <td>${fmtD(e.start)}</td>
                    <td>${fmtT(e.start)} \u2013 ${fmtT(e.end)}</td>
                    <td><b>${esc(e.extendedProps?.customer||e.title||'\u2013')}</b></td>
                    <td>${esc(e.extendedProps?.phone||'\u2013')}</td>
                    <td>${esc(e.extendedProps?.email||'\u2013')}</td>
                    <td>${esc(svc)}</td>
                    <td style="text-align:right;font-weight:bold">${fmt(e.extendedProps?.price)}</td>
                </tr>`;
            });
            if (rowsUpcoming) rowsUpcoming += `<tr style="background:#eef2ff;font-weight:bold;border-top:2px solid #4361ee">
                <td colspan="7" style="text-align:right">SKUPAJ PRIČAKOVANO</td>
                <td style="text-align:right">${fmt(upcomingRevenue)}</td></tr>`;

            let rowsManual = '';
            [...manualEarningsData].sort((a,b) => new Date(a.date)-new Date(b.date)).forEach((m,i) => {
                rowsManual += `<tr>
                    <td style="text-align:center;color:#888">${i+1}</td>
                    <td>${fmtD(m.date)}</td>
                    <td>${esc(m.description||'\u2013')}</td>
                    <td style="text-align:right;font-weight:bold">${fmt(m.amount)}</td>
                </tr>`;
            });
            if (rowsManual) rowsManual += `<tr style="background:#eef2ff;font-weight:bold;border-top:2px solid #4361ee">
                <td colspan="3" style="text-align:right">SKUPAJ</td>
                <td style="text-align:right">${fmt(manualSum)}</td></tr>`;

            const sectionTitle = (title, count) =>
                `<h2 style="font-size:13pt;color:#16213e;background:#eef2ff;padding:7px 12px;margin:24px 0 6px 0;border-left:4px solid #4361ee;font-family:Calibri,Arial,sans-serif">${title} <span style="font-weight:normal;color:#666">(${count})</span></h2>`;

            const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<style>
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a1a2e;margin:24px}
table{border-collapse:collapse;width:100%;margin-bottom:8px}
th{background:#4361ee;color:#fff;font-weight:bold;padding:7px 10px;text-align:left;font-size:10pt;border:1px solid #3451d1}
td{padding:6px 10px;font-size:10pt;border:1px solid #dde2f0;vertical-align:top}
tr:nth-child(even) td{background:#f8f9ff}
</style></head>
<body>
<div style="display:flex;align-items:center;margin-bottom:6px">
  <div style="width:6px;height:48px;background:#4361ee;margin-right:14px;border-radius:3px"></div>
  <div>
    <div style="font-size:20pt;font-weight:bold;color:#1a1a2e">${esc(shopName)}</div>
    <div style="font-size:10pt;color:#666;margin-top:2px">Poslovno poroč\u010dilo &nbsp;&bull;&nbsp; Obdobje: ${rangeLabel} &nbsp;&bull;&nbsp; Izvoz: ${exportDate}</div>
  </div>
</div>
<hr style="border:none;border-top:2px solid #4361ee;margin:10px 0 18px 0">

${sectionTitle('Povzetek', '')}
<table>
  <tr><td style="font-weight:bold;width:260px">Skupaj zasluženo</td><td style="font-weight:bold;color:#22c55e;font-size:13pt">${fmt(totalEarnings)}</td></tr>
  <tr><td style="font-weight:bold">Zaslužek iz terminov</td><td>${fmt(apptEarnings)}</td></tr>
  <tr><td style="font-weight:bold">Ročni vnosi skupaj</td><td>${fmt(manualSum)}</td></tr>
  <tr><td style="font-weight:bold">Prihodnji prihodek (pričakovan)</td><td style="color:#f59e0b;font-weight:bold">${fmt(upcomingRevenue)}</td></tr>
  <tr><td style="font-weight:bold">Povprečje na dan</td><td>${fmt(avgPerDay)}</td></tr>
  <tr><td style="font-weight:bold">Opravljeni termini</td><td>${completedEvents.length}</td></tr>
  <tr><td style="font-weight:bold">Prihajajoči termini</td><td>${upcomingEvents.length}</td></tr>
  <tr><td style="font-weight:bold">Aktivne stranke</td><td>${custSet.size}</td></tr>
</table>

${sectionTitle('Opravljeni termini', completedEvents.length)}
${completedEvents.length > 0 ? `<table><thead><tr>
  <th>#</th><th>Datum</th><th>Čas</th><th>Stranka</th><th>Telefon</th><th>Email</th><th>Storitve</th><th>Trajanje</th><th>Znesek</th>
</tr></thead><tbody>${rowsCompleted}</tbody></table>` : '<p style="color:#888;font-style:italic">Ni opravljenih terminov v izbranem obdobju.</p>'}

${sectionTitle('Prihajajoči termini', upcomingEvents.length)}
${upcomingEvents.length > 0 ? `<table><thead><tr>
  <th>#</th><th>Datum</th><th>Čas</th><th>Stranka</th><th>Telefon</th><th>Email</th><th>Storitve</th><th>Pričakovan znesek</th>
</tr></thead><tbody>${rowsUpcoming}</tbody></table>` : '<p style="color:#888;font-style:italic">Ni prihodnjih terminov.</p>'}

${sectionTitle('Ročni vnosi', manualEarningsData.length)}
${manualEarningsData.length > 0 ? `<table><thead><tr>
  <th>#</th><th>Datum</th><th>Opis</th><th>Znesek</th>
</tr></thead><tbody>${rowsManual}</tbody></table>` : '<p style="color:#888;font-style:italic">Ni ročnih vnosov.</p>'}

<hr style="border:none;border-top:1px solid #ddd;margin:28px 0 8px 0">
<div style="font-size:9pt;color:#aaa">Generirano: ${now.toLocaleString('sl-SI')} &nbsp;&bull;&nbsp; ${esc(shopName)}</div>
</body></html>`;

            const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=UTF-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `porocilo_${shopName.replace(/\s+/g,'_')}_${now.toISOString().split('T')[0]}.xls`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
        }

        // ===== CUSTOMER BASE HELPERS =====
        // Persist customer contact details locally and to site_config/customers in Firebase
        let customerBase = {};
        async function loadCustomerBase() {
            try {
                const raw = localStorage.getItem('customers_base');
                customerBase = raw ? JSON.parse(raw) : {};
                // Normalize existing records (split fullName into first/surname if missing)
                let changed = false;
                Object.entries(customerBase).forEach(([k, rec]) => {
                    if (rec) {
                        const fn = rec.firstName || '';
                        const sn = rec.surname || '';
                        if ((!fn || !sn) && rec.fullName) {
                            const parts = String(rec.fullName).trim().split(/\s+/);
                            if (!fn && parts[0]) { rec.firstName = parts[0]; changed = true; }
                            if (!sn && parts.length > 1) { rec.surname = parts.slice(1).join(' '); changed = true; }
                        }
                    }
                });
                if (changed) saveCustomerBase();

                // Try to merge remote customer records from site_config/customers
                try {
                    const base = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
                    const res = await fetch(base + 'site_config/customers.json');
                    if (res.ok) {
                        const remote = await res.json().catch(() => null);
                        if (remote && typeof remote === 'object') {
                            let merged = false;
                            Object.entries(remote).forEach(([k, r]) => {
                                if (!r) return;
                                try {
                                    const local = customerBase[k] || {};
                                    const remoteUpdated = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
                                    const localUpdated = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
                                    if (!local || !localUpdated || remoteUpdated > localUpdated) {
                                        customerBase[k] = Object.assign({}, local, r);
                                        merged = true;
                                    }
                                } catch (_) {}
                            });
                            if (merged) saveCustomerBase();
                        }
                    }
                } catch (err) {}

            } catch (e) { customerBase = {}; }
        }
        function saveCustomerBase() {
            try { localStorage.setItem('customers_base', JSON.stringify(customerBase)); } catch (e) { /* ignore */ }
        }
        function makeCustomerKey(fullName, email, phone) {
            if (email && typeof email === 'string' && email.trim().length) return email.replace(/[\.\$\[\]#\/]/g, '_').toLowerCase();
            if (phone && typeof phone === 'string' && phone.trim().length) return ('phone_' + phone.replace(/\D/g,'')).toLowerCase();
            const name = (fullName || '').trim();
            if (name) {
                // Normalize to ASCII and produce a stable, safe key
                const ascii = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
                const safe = ascii.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
                if (safe.length) return 'name_' + safe;
            }
            return 'cust_' + Date.now();
        }
        async function persistCustomerToBase({ firstName, surname, email, phone, fullName }) {
            // Accept either firstName/surname or fullName
            const fn = (firstName || '').trim();
            const sn = (surname || '').trim();
            const ffull = fullName ? fullName.trim() : ((fn || sn) ? (fn + (sn ? ' ' + sn : '')) : '');
            if (!ffull && !email && !phone) return null;
            await loadCustomerBase();
            const key = makeCustomerKey(ffull, email, phone);
            const rec = Object.assign({
                fullName: ffull || '',
                firstName: fn || (ffull.split(/\s+/)[0] || ''),
                surname: sn || ffull.split(/\s+/).slice(1).join(' ') || '',
                email: email || null,
                phone: phone || null,
                updatedAt: new Date().toISOString()
            }, customerBase[key] || {});
            customerBase[key] = rec;
            saveCustomerBase();
            // Fire-and-forget write to site_config/customers/{key}
            try {
                const base = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
                await fetch(base + `site_config/customers/${encodeURIComponent(key)}.json`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec)
                });
            } catch (e) {}
            return key;
        }

        // Load initial base immediately
        loadCustomerBase();

        // Merge handler: preserve locally-created events when schedule is updated remotely
        window.onScheduleUpdated = async function(newScheduleData) {
            try {
                // collect local-origin events
                const localEvents = (scheduleData && Array.isArray(scheduleData.events)) ? scheduleData.events.filter(ev => ev.extendedProps && ev.extendedProps.origin === 'local') : [];
                const merged = Array.isArray(newScheduleData.events) ? newScheduleData.events.slice() : [];

                // helpers
                const TIME_TOLERANCE_MS = 10 * 60 * 1000; // 10 minutes
                const timesApproxEqual = (aStart, aEnd, bStart, bEnd) => {
                    try {
                        const as = new Date(aStart).getTime();
                        const bs = new Date(bStart).getTime();
                        const ae = new Date(aEnd).getTime();
                        const be = new Date(bEnd).getTime();
                        return Number.isFinite(as) && Number.isFinite(bs) && Number.isFinite(ae) && Number.isFinite(be) && Math.abs(as - bs) <= TIME_TOLERANCE_MS && Math.abs(ae - be) <= TIME_TOLERANCE_MS;
                    } catch (_) { return false; }
                };

                const genericTitle = t => {
                    if (!t) return true;
                    const s = String(t).trim();
                    return s === '' || s === 'Stranka' || s === 'Rezervacija' || s === 'Customer';
                };

                // For each local event, try to preserve it in merged set
                localEvents.forEach(localEv => {
                    try {
                        // prefer exact id match
                        const byId = merged.findIndex(m => m.id === localEv.id);
                        if (byId !== -1) {
                            const remote = merged[byId];
                            const remoteTitle = remote.extendedProps?.customer || remote.title || '';
                            const localTitle = localEv.extendedProps?.customer || localEv.title || '';
                            // Always prefer explicit local-origin events; otherwise prefer non-generic local over generic remote
                            const localPreferred = String(localEv.extendedProps?.origin || '') === 'local';
                            const replace = localPreferred || (genericTitle(remoteTitle) && !genericTitle(localTitle));
                            if (replace) {
                                merged[byId] = localEv;
                                debugLog && debugLog(`onScheduleUpdated: replaced remote ${remote?.id || byId} with local ${localEv?.id} (by id)`, { localPreferred, localId: localEv?.id, localTitle, remoteId: remote?.id, remoteTitle });
                            } else {
                                debugLog && debugLog(`onScheduleUpdated: kept remote ${remote?.id || byId} (local ${localEv?.id} not preferred)`, { localPreferred, localId: localEv?.id, localTitle, remoteId: remote?.id, remoteTitle });
                            }

                            // matched by id — no further matching needed for this local event
                            return;
                        }

                        // then try tolerant time-based match (same times +/- tolerance)
                        const conflictIdx = merged.findIndex(m => timesApproxEqual(localEv.start, localEv.end, m.start, m.end));
                        if (conflictIdx !== -1) {
                            const remote = merged[conflictIdx];
                            const remoteTitle = remote.extendedProps?.customer || remote.title || '';
                            const localTitle = localEv.extendedProps?.customer || localEv.title || '';
                            const localPreferred = String(localEv.extendedProps?.origin || '') === 'local';
                            const replace = localPreferred || (genericTitle(remoteTitle) && !genericTitle(localTitle));
                            if (replace) {
                                merged[conflictIdx] = localEv;
                                debugLog && debugLog(`onScheduleUpdated: replaced remote ${remote?.id || conflictIdx} with local ${localEv?.id} (time conflict)`, { localPreferred, localId: localEv?.id, localTitle, remoteId: remote?.id, remoteTitle });
                            } else {
                                debugLog && debugLog(`onScheduleUpdated: kept remote ${remote?.id || conflictIdx} (local ${localEv?.id} not preferred)`, { localPreferred, localId: localEv?.id, localTitle, remoteId: remote?.id, remoteTitle });
                            }
                            // if not replacing, keep remote and do not append local
                            return;
                        }

                        // otherwise append local event (not present remotely)
                        merged.push(localEv);
                    } catch (e) { /* ignore per-item errors */ }
                });

                newScheduleData.events = merged;

                // Assign canonical scheduleData and refresh calendar
                scheduleData = newScheduleData;
                if (typeof loadAppointmentsToCalendarNow === 'function') await loadAppointmentsToCalendarNow();
            } catch (err) {}
        };

        // Update existing event
        function updateScheduleEvent(eventId, event) {
            const idx = scheduleData.events.findIndex(e => e.id === eventId);
            if (idx !== -1) {
                scheduleData.events[idx] = {
                    id: eventId,
                    title: event.title,
                    type: event.type,
                    start: event.start,
                    end: event.end,
                    description: event.description || ''
                };
                saveScheduleData();
            }
        }

        // Delete event from schedule
        // --- Permanent Deletion Helpers (defined earlier) ---
        // (deduplicated helper functions live above)
        
        async function deleteScheduleEvent(eventId) {
            try {
                
                const existing = scheduleData.events.find(e => e.id === eventId);
                if (!existing) {
                    return false;
                }

                // STEP 1: Mark as deleted FIRST - this prevents all restores
                markEventDeleted(eventId);

                // STEP 2: Remove from scheduleData
                scheduleData.events = scheduleData.events.filter(e => e.id !== eventId);

                // STEP 3: Delete from Firebase by searching for matching entries
                const base = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
                const timestamp = new Date().toISOString();
                
                // Delete from site_config/adminSchedule/entries (array)
                try {
                    const siteConfigRes = await fetch(`${base}site_config/adminSchedule/entries.json`);
                    if (siteConfigRes.ok) {
                        const entries = await siteConfigRes.json();
                        if (Array.isArray(entries)) {
                            // Find matching entry by comparing key fields
                            for (let i = 0; i < entries.length; i++) {
                                const entry = entries[i];
                                if (!entry) continue;
                                
                                // Match by id or by worker+date+time
                                const matchId = entry.id === eventId || entry.id === existing.id;
                                const matchWorker = existing.extendedProps?.worker && entry.worker === existing.extendedProps.worker;
                                const matchDate = existing.start && entry.startDate === existing.start.split('T')[0];
                                const matchTime = existing.start && entry.startTime === existing.start.split('T')[1]?.substring(0, 5);
                                
                                if (matchId || (matchWorker && matchDate && matchTime)) {
                                    // Delete this array element
                                    await fetch(`${base}site_config/adminSchedule/entries/${i}.json`, { method: 'DELETE' });
                                    
                                    // Mark as deleted
                                    await fetch(`${base}site_config/adminSchedule/deleted/${i}.json`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ deletedAt: timestamp, eventId: eventId })
                                    });
                                }
                            }
                        }
                    }
                } catch (err) {}

                // Delete from adminSchedule/entries (object with Firebase push IDs)
                try {
                    const adminRes = await fetch(`${base}adminSchedule/entries.json`);
                    if (adminRes.ok) {
                        const entries = await adminRes.json();
                        if (entries && typeof entries === 'object') {
                            for (const [key, entry] of Object.entries(entries)) {
                                if (!entry) continue;
                                
                                // Match by id or by worker+date+time
                                const matchId = entry.id === eventId || entry.id === existing.id;
                                const matchWorker = existing.extendedProps?.worker && entry.worker === existing.extendedProps.worker;
                                const matchDate = existing.start && entry.startDate === existing.start.split('T')[0];
                                const matchTime = existing.start && entry.startTime === existing.start.split('T')[1]?.substring(0, 5);
                                
                                if (matchId || (matchWorker && matchDate && matchTime)) {
                                    // Delete this entry
                                    await fetch(`${base}adminSchedule/entries/${key}.json`, { method: 'DELETE' });
                                    
                                    // Mark as deleted
                                    await fetch(`${base}adminSchedule/deleted/${key}.json`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ deletedAt: timestamp, eventId: eventId })
                                    });
                                }
                            }
                        }
                    }
                } catch (err) {}

                // STEP 6: Save scheduleData directly to localStorage
                try {
                    // Directly save to localStorage without triggering callbacks
                    localStorage.setItem('schedule', JSON.stringify(scheduleData));
                    
                    // VERIFY it was saved
                    const saved = JSON.parse(localStorage.getItem('schedule'));
                } catch (saveErr) {}

                // STEP 7: Remove from calendar UI and REFETCH to apply deletion filter
                try {
                    const calEvent = window.calendar && window.calendar.getEventById(eventId);
                    if (calEvent) {
                        calEvent.remove();
                    }
                    
                    // CRITICAL: Refetch ALL events to apply deletion filter
                    if (window.calendar && typeof window.calendar.refetchEvents === 'function') {
                        await Promise.resolve(window.calendar.refetchEvents());
                    } else {
                    }
                } catch (uiErr) {}

                // STEP 8: Clear empty storage
                const activeEvents = filterDeletedEvents(scheduleData.events);
                if (activeEvents.length === 0) {
                    try {
                        localStorage.removeItem('schedule');
                        await fetch(`${base}site_config/adminSchedule/entries.json`, { method: 'PUT', body: '{}' });
                        await fetch(`${base}adminSchedule/entries.json`, { method: 'PUT', body: '{}' });
                    } catch (e) {}
                } else {
                }

                return true;

            } catch (err) {
                return false;
            }
        }

        window.deleteScheduleEvent = deleteScheduleEvent;

        // Mark an adminSchedule key as deleted to prevent re-merge
        async function markAdminEntryDeleted(key) {
            if (!key) return false;
            const base = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
            try {
                // write tombstone under site_config/adminSchedule/deleted/{key}
                await fetch(base + `site_config/adminSchedule/deleted/${key}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(true) });
                // also record under adminSchedule/deleted for completeness
                try { await fetch(base + `adminSchedule/deleted/${key}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(true) }); } catch (_) {}
                return true;
            } catch (e) {  return false; }
        }

        // Save scheduleData using StorageManager and notify other tabs
        window.saveScheduleData = function saveScheduleData() {
            try {
                // Ensure scheduleData has metadata
                scheduleData.metadata = scheduleData.metadata || {};
                scheduleData.metadata.lastModified = Date.now();

                // Use StorageManager to persist (will fallback to localStorage in dev)
                if (typeof StorageManager !== 'undefined' && StorageManager.save) {
                    const p = StorageManager.save('schedule', scheduleData);
                    p.then(result => {
                        try {
                            if (StorageManager.broadcastUpdate) StorageManager.broadcastUpdate(scheduleData);
                        } catch (e) {}
                        if (window.onScheduleUpdated) window.onScheduleUpdated(scheduleData);
                    }).catch(err => {
                    });
                    return p;
                } else {
                    try {
                        localStorage.setItem('schedule', JSON.stringify(scheduleData));
                        if (window.onScheduleUpdated) window.onScheduleUpdated(scheduleData);
                        return Promise.resolve({ ok: true, method: 'localStorage' });
                    } catch (e) {
                        return Promise.reject(e);
                    }
                }
            } catch (err) {
                return Promise.reject(err);
            }
        };

        // Save scheduleData without broadcasting to other tabs
        window.saveScheduleDataNoBroadcast = function saveScheduleDataNoBroadcast() {
            try {
                scheduleData.metadata = scheduleData.metadata || {};
                scheduleData.metadata.lastModified = Date.now();

                if (typeof StorageManager !== 'undefined' && StorageManager.save) {
                    const p = StorageManager.save('schedule', scheduleData);
                    p.then(result => {
                        if (window.onScheduleUpdated) window.onScheduleUpdated(scheduleData);
                    }).catch(err => {
                    });
                    return p;
                } else {
                    try {
                        localStorage.setItem('schedule', JSON.stringify(scheduleData));
                        if (window.onScheduleUpdated) window.onScheduleUpdated(scheduleData);
                        return Promise.resolve({ ok: true, method: 'localStorage' });
                    } catch (e) {
                        return Promise.reject(e);
                    }
                }
            } catch (err) {
                return Promise.reject(err);
            }
        };

        // Add a new event to scheduleData and persist; returns the new event id
        window.addScheduleEvent = function addScheduleEvent(event) {
            try {
                // Normalize event if ScheduleValidation available
                let normalized = event;
                if (typeof ScheduleValidation !== 'undefined' && ScheduleValidation.normalizeEvent) {
                    normalized = ScheduleValidation.normalizeEvent(event);
                } else {
                    normalized.id = normalized.id || `event_${Date.now()}`;
                }

                scheduleData.events = scheduleData.events || [];
                // Ensure we mark local-origin events so they are preserved when remote updates arrive
                normalized.extendedProps = normalized.extendedProps || {};
                if (!normalized.extendedProps.origin) normalized.extendedProps.origin = 'local';
                scheduleData.events.push(normalized);
                        // Persist immediately to localStorage as a reliable fallback so
                        // the event survives a page reload even if remote save fails.
                        try {
                            localStorage.setItem('schedule', JSON.stringify(scheduleData));
                        } catch (e) {}
                        if (window.saveScheduleData) {
                            // Fire-and-log save; do not block UI but record result for debugging
                            try {
                                window.saveScheduleData().then(res => {
                                }).catch(err => {
                                });
                            } catch (e) {}
                        }
                return normalized.id;
            } catch (err) {
                return null;
            }
        };

        // Modal functions
        function openAddEventModal(startDate = null, endDate = null) {
            const form = document.getElementById('addEventForm');
            if (form) form.reset();
            // Always restore default times after reset (form.reset() sets time inputs to '00:00')
            const _stEl = document.getElementById('eventStartTime');
            const _etEl = document.getElementById('eventEndTime');
            if (_stEl) _stEl.value = '09:00';
            if (_etEl) _etEl.value = '10:00';
            setEventTab('worker');

            const modal = document.getElementById('addEventModal');
            if (startDate) {
                const startEl = document.getElementById('eventStartDate');
                const endEl = document.getElementById('eventEndDate');
                if (startEl) {
                    startEl.value = startDate;
                }
                // If endDate provided (from drag selection), use it; otherwise default to startDate
                const actualEnDate = endDate || startDate;
                if (endEl) {
                    endEl.value = actualEnDate;
                }
            }
            modal.classList.add('show');
        }

        function closeAddEventModal() {
            const modal = document.getElementById('addEventModal');
            modal.classList.remove('show');
            document.getElementById('addEventForm').reset();
            if (window.clearCalendarHighlights) window.clearCalendarHighlights();
        }

        function openEditEventModal(event) {
            currentEditingEvent = event;
            const modal = document.getElementById('editEventModal');
            
            // Extract title without emoji
            let title = event.title || '';
            title = title.replace(/^[^\s]*\s/, '').trim(); // Remove emoji and first space
            
            const startDate = event.start ? new Date(event.start).toISOString().split('T')[0] : '';
            const endDate = event.end ? new Date(event.end).toISOString().split('T')[0] : '';
            const startTime = event.start ? new Date(event.start).toTimeString().slice(0, 5) : '';
            const endTime = event.end ? new Date(event.end).toTimeString().slice(0, 5) : '';

            document.getElementById('editEventTitle').value = title;
            document.getElementById('editEventType').value = event.extendedProps?.type || '';
            document.getElementById('editEventStartDate').value = startDate;
            document.getElementById('editEventStartTime').value = startTime;
            document.getElementById('editEventEndDate').value = endDate;
            document.getElementById('editEventEndTime').value = endTime;
            document.getElementById('editEventDescription').value = event.extendedProps?.description || '';

            // Show customer-specific fields when this is a booking
            const isBooking = event.extendedProps?.isBooking || event.extendedProps?.tab === 'customer' || event.isBooking;
            const custWrapper = document.getElementById('editCustomerFields');
            const phoneWrapper = document.getElementById('editCustomerPhoneField');
            const servicesWrapper = document.getElementById('editEventServicesField');
            const priceWrapper = document.getElementById('editEventPriceField');
            const durWrapper = document.getElementById('editEventDurationField');
            if (isBooking) {
                if (custWrapper) custWrapper.style.display = '';
                if (phoneWrapper) phoneWrapper.style.display = '';
                if (servicesWrapper) servicesWrapper.style.display = '';
                if (priceWrapper) priceWrapper.style.display = '';
                if (durWrapper) durWrapper.style.display = '';
                // Populate edited customer fields (first/surname)
                const first = event.extendedProps?.customerFirstName || (event.extendedProps?.customer ? String(event.extendedProps.customer).split(/\s+/)[0] : '');
                const sur = event.extendedProps?.customerSurname || (event.extendedProps?.customer ? String(event.extendedProps.customer).split(/\s+/).slice(1).join(' ') : '');
                const full = event.extendedProps?.customer || '';
                const fnameEl = document.getElementById('editEventFirstName'); if (fnameEl) fnameEl.value = first;
                const lnameEl = document.getElementById('editEventLastName'); if (lnameEl) lnameEl.value = sur;
                document.getElementById('editEventEmail').value = event.extendedProps?.email || '';
                document.getElementById('editEventPhone').value = event.extendedProps?.phone || '';
                document.getElementById('editEventServices').value = (event.extendedProps && Array.isArray(event.extendedProps.services)) ? event.extendedProps.services.join(', ') : (event.extendedProps?.services || '');
                document.getElementById('editEventPrice').value = (event.extendedProps && typeof event.extendedProps.price !== 'undefined') ? event.extendedProps.price : '';
                document.getElementById('editEventDuration').value = event.extendedProps?.duration || '';
            } else {
                if (custWrapper) custWrapper.style.display = 'none';
                if (phoneWrapper) phoneWrapper.style.display = 'none';
                if (servicesWrapper) servicesWrapper.style.display = 'none';
                if (priceWrapper) priceWrapper.style.display = 'none';
                if (durWrapper) durWrapper.style.display = 'none';
            }


            modal.classList.add('show');
        }

        function closeEditEventModal() {
            const modal = document.getElementById('editEventModal');
            modal.classList.remove('show');
            currentEditingEvent = null;
            if (window.clearCalendarHighlights) window.clearCalendarHighlights();
        }

        function openBookingDetailsModal(event) {
            const booking = event.extendedProps;
            
            const bookingName = (booking && (booking.customerFirstName || booking.customerSurname)) ? ((booking.customerFirstName || '') + (booking.customerSurname ? ' ' + booking.customerSurname : '')) : (booking.customer || 'N/A');
            document.getElementById('bookingName').textContent = bookingName || 'N/A';
            document.getElementById('bookingEmail').textContent = booking.email || 'N/A';
            document.getElementById('bookingPhone').textContent = booking.phone || 'N/A';
            
            // Format date and time
            const startDate = event.start ? new Date(event.start).toLocaleDateString('sl-SI') : '';
            const startTime = event.start ? new Date(event.start).toLocaleTimeString('sl-SI', {hour: '2-digit', minute: '2-digit'}) : '';
            const endTime = event.end ? new Date(event.end).toLocaleTimeString('sl-SI', {hour: '2-digit', minute: '2-digit'}) : '';
            document.getElementById('bookingDateTime').textContent = `${startDate} ${startTime} - ${endTime}`;
            
            document.getElementById('bookingDuration').textContent = `${booking.duration || 0} minut`;
            document.getElementById('bookingServices').textContent = booking.services ? booking.services.join(', ') : 'N/A';
            document.getElementById('bookingPrice').textContent = `${booking.price || 0}€`;
            const notesText = (booking.notes || booking.note || '').toString().trim();
            document.getElementById('bookingNotes').textContent = notesText ? notesText : '—';
            
            const modal = document.getElementById('bookingDetailsModal');
            // attach delete handler
            const deleteBtn = document.getElementById('bookingDeleteBtn');
            if (deleteBtn) {
                deleteBtn.onclick = function() {
                    if (confirm('Sigurno želiš izbrisati to rezervacijo?')) {
                        // Use centralized delete logic which also removes DB nodes and avoids broadcasting
                        try {
                            // remove from calendar UI immediately
                            try { window.calendar.getEventById(event.id).remove(); } catch (e) {}
                            // perform delete (await) and then close modal
                            deleteScheduleEvent(event.id).then(ok => {
                                closeBookingDetailsModal();
                            }).catch(err => {
                                closeBookingDetailsModal();
                            });
                        } catch (e) {
                            closeBookingDetailsModal();
                        }
                    }
                };
            }

            // attach edit handler
            const editBtn = document.getElementById('bookingEditBtn');
            if (editBtn) {
                editBtn.onclick = function() {
                    try {
                        closeBookingDetailsModal();
                        openEditEventModal(event);
                    } catch (e) {}
                };
            }
            modal.classList.add('show');
        }

        function closeBookingDetailsModal() {
            const modal = document.getElementById('bookingDetailsModal');
            modal.classList.remove('show');
            if (window.clearCalendarHighlights) window.clearCalendarHighlights();
        }

        function deleteCurrentEvent() {
            if (currentEditingEvent) {
                if (confirm('Sigurno želiš izbrisati ta dogodek?')) {
                    // Show loading overlay
                    const loadingOverlay = document.getElementById('loadingOverlay');
                    const startTime = Date.now();
                    if (loadingOverlay) {
                        loadingOverlay.style.display = 'flex';
                        loadingOverlay.style.opacity = '1';
                    }

                    const eventId = currentEditingEvent.id;
                    
                    // Use the existing Firebase deletion function
                    deleteScheduleEvent(eventId).then(() => {
                        
                        // Remove from calendar display
                        const calEvent = window.calendar.getEventById(eventId);
                        if (calEvent) calEvent.remove();
                        
                        // Ensure minimum display time of 400ms so animation is visible
                        const elapsed = Date.now() - startTime;
                        const remainingTime = Math.max(0, 400 - elapsed);
                        
                        setTimeout(() => {
                            // Hide loading overlay
                            if (loadingOverlay) {
                                loadingOverlay.style.display = 'none';
                                loadingOverlay.style.opacity = '0';
                            }
                            closeEditEventModal();
                        }, remainingTime);
                    }).catch(err => {
                        if (loadingOverlay) {
                            loadingOverlay.style.display = 'none';
                            loadingOverlay.style.opacity = '0';
                        }
                        alert('Napaka pri brisanju');
                    });
                }
            }
        }

        // Ensure loading overlay is hidden on page load
        window.addEventListener('load', () => {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
                loadingOverlay.style.opacity = '0';
            }
        });

        // Handle add event form
        document.getElementById('addEventForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            return window.handleAddEventSimplified(e);

            let title = '';
            let firstName = '';
            let lastName = '';
            if (currentEventTab === 'customer') {
                firstName = (document.getElementById('eventFirstName') && document.getElementById('eventFirstName').value) ? document.getElementById('eventFirstName').value.trim() : '';
                lastName = (document.getElementById('eventLastName') && document.getElementById('eventLastName').value) ? document.getElementById('eventLastName').value.trim() : '';
                title = (firstName + (lastName ? ' ' + lastName : '')).trim();
            } else {
                title = (document.getElementById('eventTitle') && document.getElementById('eventTitle').value) ? document.getElementById('eventTitle').value.trim() : '';
            }
            const typeSelect = document.getElementById('eventType');
            const checkboxContainer = document.getElementById('eventTypeCheckboxes');
            // Support multiple services via checkboxes when available
            let type = '';
            let services = [];
            let price = 0;
            if (currentEventTab === 'customer' && checkboxContainer) {
                services = Array.from(checkboxContainer.querySelectorAll('input[type=checkbox]:checked')).map(i => i.value).filter(v => v && v.length > 0);
                // Always use generic 'booking' type for customer-created appointments
                type = 'booking';
                // compute price from services
                const computed = typeof recalcServicePrice === 'function' ? recalcServicePrice() : 0;
                price = computed;
            } else if (currentEventTab === 'customer' && typeSelect && typeSelect.multiple) {
                services = Array.from(typeSelect.selectedOptions).map(o => o.value).filter(v => v && v.length > 0);
                type = 'booking';
                // compute price for select-based services
                if (window.SITE_CONFIG && window.SITE_CONFIG.servicesSection && Array.isArray(window.SITE_CONFIG.servicesSection.items)) {
                    price = services.reduce((sum, name) => {
                        const svc = window.SITE_CONFIG.servicesSection.items.find(s => s.name === name);
                        return sum + (svc && svc.price ? Number(svc.price) || 0 : 0);
                    }, 0);
                }
            } else {
                type = typeSelect ? typeSelect.value : '';
            }


            const startDate = document.getElementById('eventStartDate').value;
            const startTime = document.getElementById('eventStartTime').value;
            const endDate = document.getElementById('eventEndDate').value;
            const endTime = document.getElementById('eventEndTime').value;
            const description = document.getElementById('eventDescription').value;

            const start = startTime ? `${startDate}T${startTime}` : `${startDate}T00:00`;
            const end = endTime ? `${endDate}T${endTime}` : `${endDate}T23:59`;

            // MINIMAL event payload - only essential fields
            const eventPayload = {
                title,
                type,
                start,
                end
            };
            
            // Only add extendedProps with actual data
            const props = {};
            if (currentEventTab === 'customer') {
                props.customer = title || null;
                const email = document.getElementById('eventEmail')?.value;
                const phone = document.getElementById('eventPhone')?.value;
                if (email) props.email = email;
                if (phone) props.phone = phone;
                if (Array.isArray(services) && services.length > 0) props.services = services;
                if (price && price > 0) props.price = price;
            } else {
                props.worker = title;
            }
            if (description && description.trim()) props.notes = description.trim();
            
            if (Object.keys(props).length > 0) {
                eventPayload.extendedProps = props;
            }
            // Persist customer info into customer base when creating a booking
            if (currentEventTab === 'customer') {
                try {
                    await persistCustomerToBase({ firstName: firstName, surname: lastName, email: eventPayload.extendedProps?.email, phone: eventPayload.extendedProps?.phone });
                } catch (e) {}
            }

            const eventId = (typeof window.addScheduleEvent === 'function')
                ? window.addScheduleEvent(eventPayload)
                : (function fallbackAdd(ev) {
                    try {
                        let normalized = ev;
                        if (typeof ScheduleValidation !== 'undefined' && ScheduleValidation.normalizeEvent) {
                            normalized = ScheduleValidation.normalizeEvent(ev);
                        } else {
                            normalized.id = normalized.id || `event_${Date.now()}`;
                        }
                        scheduleData.events = scheduleData.events || [];
                        scheduleData.events.push(normalized);
                        if (typeof window.saveScheduleData === 'function') {
                            window.saveScheduleData();
                        } else {
                            try { localStorage.setItem('schedule', JSON.stringify(scheduleData)); } catch (e) {}
                        }
                        return normalized.id;
                    } catch (err) {
                        return null;
                    }
                })(eventPayload);

            // Get type config for UI display (colors derived at runtime, not stored)
            const typeCfg = (typeof ScheduleRules !== 'undefined' && ScheduleRules.TYPE_CONFIG && ScheduleRules.TYPE_CONFIG[type]) ? ScheduleRules.TYPE_CONFIG[type] : null;
            const icon = typeCfg?.icon || '';
            const displayTitle = (currentEventTab === 'customer') ? title : (icon ? (icon + ' ' + title) : title);

            // Persist schedule and refresh calendar from canonical scheduleData to avoid duplicates
            try {
                if (typeof window.saveScheduleData === 'function') {
                    await window.saveScheduleData();
                } else {
                    try { localStorage.setItem('schedule', JSON.stringify(scheduleData)); } catch(e) { /* ignore */ }
                }
            } catch (sdErr) {}

            // Refresh calendar from saved schedule (removes duplicates and ensures canonical rendering)
            if (typeof loadAppointmentsToCalendarNow === 'function') {
                await loadAppointmentsToCalendarNow();
            } else if (window.calendar && typeof window.calendar.addEvent === 'function') {
                const evt = scheduleData.events.find(e => e.id === eventId);
                if (evt && typeof CalendarEngine !== 'undefined' && CalendarEngine.formatCalendarEvent) {
                    const formatted = CalendarEngine.formatCalendarEvent(evt);
                    if (formatted) window.calendar.addEvent(formatted);
                }
            }

            // Mirror into adminSchedule for customer bookings only (worker removed)
            if (currentEventTab === 'customer') {
                try {
                    const sDate = startDate;
                    const eDate = endDate;
                    // Use full time (HH:MM) instead of rounding to hour — prevents near-duplicates
                    const sTime = startTime ? String(startTime).slice(0,5) : '09:00';
                    const eTime = endTime ? String(endTime).slice(0,5) : '17:00';
                    // Build admin entry with full booking/worker details
                    let durationMinutes = eventPayload.extendedProps && eventPayload.extendedProps.duration ? eventPayload.extendedProps.duration : null;
                    try {
                        if (!durationMinutes) {
                            const s = new Date(`${sDate}T${sTime}`);
                            const e = new Date(`${eDate}T${eTime}`);
                            const diff = (e - s) / 60000;
                            durationMinutes = Number.isFinite(diff) && diff > 0 ? Math.round(diff) : null;
                        }
                    } catch (dErr) {
                        durationMinutes = null;
                    }

                    const adminEntry = {
                        id: `event_${eventId}`,
                        type: currentEventTab === 'customer' ? 'rezervacija' : (type || 'worker_event'),
                        startDate: sDate,
                        startTime: sTime,
                        endDate: eDate,
                        endTime: eTime,
                        customer: currentEventTab === 'customer' ? (eventPayload.extendedProps?.customer || title || null) : null,
                        worker: currentEventTab === 'worker' ? (eventPayload.extendedProps?.worker || title || null) : null,
                        email: eventPayload.extendedProps?.email || null,
                        phone: eventPayload.extendedProps?.phone || null,
                        services: Array.isArray(eventPayload.extendedProps?.services) ? eventPayload.extendedProps.services : (services || []),
                        price: (eventPayload.extendedProps && (eventPayload.extendedProps.price || eventPayload.extendedProps.price === 0)) ? eventPayload.extendedProps.price : (price || 0),
                        duration: durationMinutes,
                        notes: (description || '') + (eventPayload.extendedProps && eventPayload.extendedProps.services ? ' | ' + (eventPayload.extendedProps.services.join(', ')) : ''),
                        createdAt: new Date().toISOString()
                    };

                    // fire-and-forget; function defined below
                    if (typeof sendAdminScheduleEntry === 'function') {
                        sendAdminScheduleEntry(adminEntry).then(async resKey => {
                            try {
                                if (resKey) {
                                    // store adminKey on the schedule event so future edits/deletes can mirror
                                    const idx = scheduleData.events.findIndex(e => e.id === eventId);
                                    if (idx !== -1) {
                                        scheduleData.events[idx].extendedProps = scheduleData.events[idx].extendedProps || {};
                                        // Normalize returned key: string key preferred, or extract .name; if fallback returned true, use a local marker
                                        const keyToSet = (typeof resKey === 'string') ? resKey : (resKey && resKey.name ? resKey.name : (resKey === true ? ('local_' + eventId) : null));
                                        if (keyToSet) {
                                            scheduleData.events[idx].extendedProps.adminKey = keyToSet;
                                            // Ensure event rules are persisted from TYPE_CONFIG so blocking types render correctly in month
                                            try {
                                                const cfg = (typeof ScheduleRules !== 'undefined' && ScheduleRules.TYPE_CONFIG && ScheduleRules.TYPE_CONFIG[type]) ? ScheduleRules.TYPE_CONFIG[type] : null;
                                                if (cfg) {
                                                    scheduleData.events[idx].rules = scheduleData.events[idx].rules || {};
                                                    scheduleData.events[idx].rules.isBlocking = cfg.isBlocking || false;
                                                    scheduleData.events[idx].rules.isSubtractive = cfg.isSubtractive || false;
                                                    scheduleData.events[idx].rules.conflictPriority = cfg.priority || 0;
                                                }
                                            } catch (_) {}
                                            try { await saveScheduleData(); } catch(e) { if (window.saveScheduleData) window.saveScheduleData(); }
                                            // Refresh calendar from canonical schedule so any merge/dedupe rules apply
                                            if (typeof loadAppointmentsToCalendarNow === 'function') {
                                                try { await loadAppointmentsToCalendarNow(); } catch(e) { /* ignore */ }
                                            }
                                        }
                                    }
                                }
                            } catch (ee) {}
                        }).catch(() => {});
                    }
                } catch (err) {}
            }

            closeAddEventModal();
        });

        // Simplified add handler implementation
        window.handleAddEventSimplified = async function(e) {
            try {
                e.preventDefault && e.preventDefault();
                const tab = (currentEventTab === 'worker') ? 'worker' : 'customer';

                // Collect input
                const firstName = (document.getElementById('eventFirstName')?.value || '').trim();
                const lastName = (document.getElementById('eventLastName')?.value || '').trim();
                const title = (tab === 'customer') ? ((firstName || lastName) ? (firstName + (lastName ? ' ' + lastName : '')).trim() : 'Rezervacija') : ((document.getElementById('eventTitle')?.value || '').trim() || 'Delavec dogodek');
                const email = (document.getElementById('eventEmail')?.value || '').trim() || null;
                const phone = (document.getElementById('eventPhone')?.value || '').trim() || null;
                const description = (document.getElementById('eventDescription')?.value || '').trim() || '';

                const services = Array.from(document.querySelectorAll('#eventTypeCheckboxes input[type=checkbox]:checked')).map(i => i.value).filter(Boolean);
                const priceInput = document.getElementById('eventPrice')?.value;
                const price = priceInput ? parseFloat(priceInput) : 0;

                // Dates/times
                const startDate = document.getElementById('eventStartDate')?.value;
                const startTimeRaw = document.getElementById('eventStartTime')?.value;
                const endDate = document.getElementById('eventEndDate')?.value || startDate;
                let endTimeRaw = document.getElementById('eventEndTime')?.value;

                const isMultiDay = !!startDate && !!endDate && startDate !== endDate;
                let start;
                let end;
                let allDay = false;

                if (isMultiDay) {
                    // Multi-day all-day event: store date-only and let FullCalendar span across days
                    start = startDate;
                    end = endDate;
                    allDay = true;
                } else {
                    const defaultStart = '09:00';
                    const defaultDurationMinutes = 30;
                    const sTime = startTimeRaw || defaultStart;
                    if (!endTimeRaw) {
                        try { 
                            const s = new Date(`${startDate}T${sTime}`); 
                            s.setMinutes(s.getMinutes() + defaultDurationMinutes); 
                            endTimeRaw = s.toTimeString().slice(0,5); 
                        } catch (_) { 
                            endTimeRaw = '09:30'; 
                        }
                    }

                    start = `${startDate}T${sTime}`;
                    end = `${endDate}T${endTimeRaw}`;
                }

                const typeSelect = document.getElementById('eventType');
                const selectedType = typeSelect ? typeSelect.value : (tab === 'worker' ? 'working_hours' : 'booking');
                const eventType = (tab === 'customer') ? 'booking' : (selectedType || 'working_hours');

                // Create simple event object
                const eventId = `event_${Date.now()}`;
                const eventPayload = {
                    id: eventId,
                    title,
                    type: eventType,
                    start,
                    end,
                    allDay,
                    description,
                    extendedProps: {
                        customer: tab === 'customer' ? title : null,
                        worker: tab === 'worker' ? title : null,
                        email,
                        phone,
                        services,
                        price,
                        isBooking: tab === 'customer',
                        tab,
                        origin: 'local'
                    }
                };

                // Persist via schedule system (Firebase + localStorage) and refresh calendar
                const savedId = (typeof window.addScheduleEvent === 'function')
                    ? window.addScheduleEvent(eventPayload)
                    : (function fallbackAdd(ev) {
                        try {
                            scheduleData.events = scheduleData.events || [];
                            scheduleData.events.push(ev);
                            localStorage.setItem('schedule', JSON.stringify(scheduleData));
                            return ev.id;
                        } catch (err) {
                            return null;
                        }
                    })(eventPayload);

                if (typeof loadAppointmentsToCalendarNow === 'function') {
                    await loadAppointmentsToCalendarNow();
                } else if (window.calendar && typeof window.calendar.addEvent === 'function') {
                    const formatted = (typeof CalendarEngine !== 'undefined' && CalendarEngine.formatCalendarEvent)
                        ? CalendarEngine.formatCalendarEvent(eventPayload)
                        : eventPayload;
                    if (formatted) window.calendar.addEvent(formatted);
                }

                // Send SMS confirmation if booking with phone number
                if (eventPayload.extendedProps.isBooking && eventPayload.extendedProps.phone) {
                    try {
                        // Pass appointment data to SMS handler
                        const appointmentForSMS = {
                            id: eventPayload.id,
                            phoneNumber: eventPayload.extendedProps.phone,
                            start: eventPayload.start,
                            customer: eventPayload.extendedProps.customer,
                            services: eventPayload.extendedProps.services,
                            worker: eventPayload.extendedProps.worker
                        };
                        
                        if (window.SMSHandler && typeof window.SMSHandler.sendAppointmentConfirmation === 'function') {
                            window.SMSHandler.sendAppointmentConfirmation(appointmentForSMS);
                        }
                        // Schedule 24h reminder in localStorage if enabled
                        try {
                            const _smsS = loadBookingSettings();
                            if (_smsS.smsTemplates?.reminderEnabled) {
                                const _apptStart  = new Date(eventPayload.start);
                                const _reminderAt = new Date(_apptStart.getTime() - 24 * 60 * 60 * 1000);
                                if (_reminderAt > new Date()) {
                                    let _rems = [];
                                    try { _rems = JSON.parse(localStorage.getItem('sms_reminders') || '[]'); } catch (_) {}
                                    if (!_rems.find(r => r.id === eventPayload.id)) {
                                        _rems.push({
                                            id:               eventPayload.id,
                                            phoneNumber:      eventPayload.extendedProps.phone,
                                            appointmentStart: eventPayload.start,
                                            customer:         eventPayload.extendedProps.customer,
                                            reminderTime:     _reminderAt.toISOString(),
                                            sent:             false
                                        });
                                        localStorage.setItem('sms_reminders', JSON.stringify(_rems));
                                    }
                                }
                            }
                        } catch (_smsErr) {}
                    } catch (smsError) {}
                }

                closeAddEventModal();
                return true;
            } catch (err) {
                alert('Napaka pri dodajanju termina');
                return false;
            }
        }

        // Handle edit event form
        document.getElementById('editEventForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentEditingEvent) return;

            const title = document.getElementById('editEventTitle').value;
            const type = document.getElementById('editEventType').value;
            const startDate = document.getElementById('editEventStartDate').value;
            const startTime = document.getElementById('editEventStartTime').value;
            const endDate = document.getElementById('editEventEndDate').value;
            const endTime = document.getElementById('editEventEndTime').value;
            const description = document.getElementById('editEventDescription').value;

            const start = startTime ? `${startDate}T${startTime}` : `${startDate}T00:00`;
            const end = endTime ? `${endDate}T${endTime}` : `${endDate}T23:59`;

            // Simple update: modify the data directly
            const idx = scheduleData.events.findIndex(e => e.id === currentEditingEvent.id);
            if (idx !== -1) {
                scheduleData.events[idx] = {
                    ...scheduleData.events[idx],
                    title,
                    type,
                    start,
                    end,
                    description
                };
                
                // Update extended props if they exist in the form
                try {
                    const email = document.getElementById('editEventEmail')?.value || null;
                    const phone = document.getElementById('editEventPhone')?.value || null;
                    const servicesRaw = document.getElementById('editEventServices')?.value || '';
                    const services = servicesRaw ? servicesRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
                    const priceRaw = document.getElementById('editEventPrice')?.value || null;
                    const price = priceRaw ? parseFloat(priceRaw) : null;
                    
                    scheduleData.events[idx].extendedProps = scheduleData.events[idx].extendedProps || {};
                    if (email) scheduleData.events[idx].extendedProps.email = email;
                    if (phone) scheduleData.events[idx].extendedProps.phone = phone;
                    if (services.length) scheduleData.events[idx].extendedProps.services = services;
                    if (price) scheduleData.events[idx].extendedProps.price = price;
                } catch (_) {}
                
                // Save to localStorage
                try {
                    localStorage.setItem('schedule', JSON.stringify(scheduleData));
                } catch (err) {}
            }

            // Update calendar display
            const event = window.calendar.getEventById(currentEditingEvent.id);
            if (event) {
                event.setProp('title', title);
                event.setStart(new Date(start).toISOString());
                event.setEnd(new Date(end).toISOString());
                event.setExtendedProp('type', type);
                event.setExtendedProp('description', description);
            }

            closeEditEventModal();
        });

        // Close modals when clicking outside
        document.getElementById('addEventModal').addEventListener('click', (e) => {
            if (e.target.id === 'addEventModal') closeAddEventModal();
        });

        document.getElementById('editEventModal').addEventListener('click', (e) => {
            if (e.target.id === 'editEventModal') closeEditEventModal();
        });

        document.getElementById('bookingDetailsModal').addEventListener('click', (e) => {
            if (e.target.id === 'bookingDetailsModal') closeBookingDetailsModal();
        });

        // Persist a single admin schedule entry into Firebase site_config.adminSchedule.entries
        // Strategy: try a direct POST to /adminSchedule/entries.json (push new child).
        // If that fails, fall back to GET site_config.json -> append -> PUT site_config.json.
        async function sendAdminScheduleEntry(entry) {
            const baseUrl = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
            // First attempt: POST to push a new child under adminSchedule/entries
            try {
                const postUrl = baseUrl + 'adminSchedule/entries.json';
                const postRes = await fetch(postUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entry)
                });
                const postTxt = await postRes.text().catch(() => '<no body>');
                    if (postRes.ok) {
                    // Mirror the pushed child into site_config so admin UI (which reads site_config.json)
                    // can see the new entry. The POST returns { name: generatedKey } in postTxt/json.
                    try {
                        let parsed = {};
                        try { parsed = JSON.parse(postTxt); } catch(e) { parsed = {}; }
                        const generatedKey = parsed && parsed.name ? parsed.name : null;
                        if (generatedKey) {
                            const mirrorUrl = baseUrl + `site_config/adminSchedule/entries/${generatedKey}.json`;
                            const mirrorRes = await fetch(mirrorUrl, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(entry)
                            });
                            const mirrorTxt = await mirrorRes.text().catch(() => '<no body>');
                        }
                    } catch (mirrorErr) {}
                    // return generated key so caller can store adminKey on schedule event
                    return generatedKey || true;
                }
            } catch (err) {}

            // Fallback: GET site_config.json, append entry, PUT back
            try {
                const dbUrl = baseUrl + 'site_config.json';
                const getRes = await fetch(dbUrl);
                let config = {};
                if (getRes.ok) {
                    try { config = await getRes.json(); } catch (e) { config = {}; }
                }

                config.adminSchedule = config.adminSchedule || { entries: [] };
                config.adminSchedule.entries = config.adminSchedule.entries || [];
                config.adminSchedule.entries.push(entry);

                const putRes = await fetch(dbUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });

                const txt = await putRes.text().catch(() => '<no body>');
                return putRes.ok;
            } catch (err) {
                return false;
            }
        }

        // Debug helper: create a test adminSchedule entry and push it to Firebase
        window.testSendAdminScheduleEntry = async function() {
            const entry = {
                id: 'test_' + Date.now(),
                type: 'rezervacija',
                startDate: new Date().toISOString().split('T')[0],
                startTime: 9,
                endDate: new Date().toISOString().split('T')[0],
                endTime: 10,
                notes: 'Test push from poslovni-panel',
                createdAt: new Date().toISOString()
            };
            try {
                const ok = await sendAdminScheduleEntry(entry);
                return ok;
            } catch (err) {
                return false;
            }
        };

        // Debug helper: purge mirrored adminSchedule entries for events currently in scheduleData
        // Usage: run `window.purgeMirroredAdminEntries()` in browser console.
        window.purgeMirroredAdminEntries = async function() {
            const base = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
            try {
                if (!scheduleData || !Array.isArray(scheduleData.events)) return;

                // Fetch site_config adminSchedule entries map
                const cfgRes = await fetch(base + 'site_config/adminSchedule/entries.json');
                const cfgMap = cfgRes.ok ? await cfgRes.json().catch(() => null) : null;
                const pushedRes = await fetch(base + 'adminSchedule/entries.json');
                const pushedMap = pushedRes.ok ? await pushedRes.json().catch(() => null) : null;

                for (const ev of scheduleData.events) {
                    try {
                        const adminKey = ev?.extendedProps?.adminKey;
                        if (adminKey) {
                            try { await fetch(base + `site_config/adminSchedule/entries/${adminKey}.json`, { method: 'DELETE' }); } catch (e) {}
                            try { await fetch(base + `adminSchedule/entries/${adminKey}.json`, { method: 'DELETE' }); } catch (e) {}
                            continue;
                        }

                        // Fallback: find matching nodes by date/customer
                        const evStart = ev.start ? ev.start.split('T')[0] : null;
                        const evEnd = ev.end ? ev.end.split('T')[0] : null;
                        const evCustomer = ev.extendedProps?.customer || '';

                        if (cfgMap && typeof cfgMap === 'object') {
                            for (const [k, it] of Object.entries(cfgMap)) {
                                try {
                                    const itStart = it.startDate || it.start || null;
                                    const itEnd = it.endDate || it.end || null;
                                    const itCustomer = (it.customer || it.notes || '').trim();
                                    if (itStart === evStart && itEnd === evEnd && itCustomer && evCustomer && itCustomer === evCustomer) {
                                        try { await fetch(base + `site_config/adminSchedule/entries/${k}.json`, { method: 'DELETE' }); } catch (e) {}
                                    }
                                } catch (_) {}
                            }
                        }

                        if (pushedMap && typeof pushedMap === 'object') {
                            for (const [k, it] of Object.entries(pushedMap)) {
                                try {
                                    const itStart = it.startDate || it.start || null;
                                    const itEnd = it.endDate || it.end || null;
                                    const itCustomer = (it.customer || it.notes || '').trim();
                                    if (itStart === evStart && itEnd === evEnd && itCustomer && evCustomer && itCustomer === evCustomer) {
                                        try { await fetch(base + `adminSchedule/entries/${k}.json`, { method: 'DELETE' }); } catch (e) {}
                                    }
                                } catch (_) {}
                            }
                        }

                    } catch (e) {}
                }

                return true;
            } catch (err) {
                return false;
            }
        };

        // Debug helper: list all adminSchedule and mirrored site_config entries
        window.listAdminEntries = async function() {
            const base = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
            try {
                const [cfgRes, pushedRes] = await Promise.all([
                    fetch(base + 'site_config/adminSchedule/entries.json'),
                    fetch(base + 'adminSchedule/entries.json')
                ]);
                const cfgMap = cfgRes.ok ? await cfgRes.json().catch(() => null) : null;
                const pushedMap = pushedRes.ok ? await pushedRes.json().catch(() => null) : null;
                return { cfgMap, pushedMap };
            } catch (err) {
                return null;
            }
        };

        // Debug helper: force-delete a specific admin entry by key (deletes both mirrored and pushed nodes)
        window.forceDeleteAdminEntry = async function(key) {
            const base = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
            if (!key) return;
            try {
                const res1 = await fetch(base + `site_config/adminSchedule/entries/${key}.json`, { method: 'DELETE' });
            } catch (e) {}
            try {
                const res2 = await fetch(base + `adminSchedule/entries/${key}.json`, { method: 'DELETE' });
            } catch (e) {}
        };

        // Debug helper: delete all adminSchedule entries (CONFIRM first)
        window.deleteAllAdminEntries = async function() {
            if (!confirm('Delete ALL adminSchedule entries from Firebase? This cannot be undone.')) return;
            const base = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
            try {
                const pushedRes = await fetch(base + 'adminSchedule/entries.json');
                const pushedMap = pushedRes.ok ? await pushedRes.json().catch(() => null) : null;
                if (!pushedMap) return;
                const keys = Object.keys(pushedMap);
                for (const k of keys) {
                    try { await fetch(base + `adminSchedule/entries/${k}.json`, { method: 'DELETE' }); } catch (e) {}
                    try { await fetch(base + `site_config/adminSchedule/entries/${k}.json`, { method: 'DELETE' }); } catch (e) {}
                }
            } catch (err) {}
        };

        // Strong wipe: delete adminSchedule/entries and mirrored site_config/adminSchedule/entries
        // Then write an empty object at site_config/adminSchedule/entries to avoid accidental re-merge.
        window.wipeAdminScheduleNodes = async function() {
            if (!confirm('Wipe adminSchedule nodes from Firebase? This will attempt to remove all adminSchedule entries and mirrored site_config entries.')) return;
            const base = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
            try {
                // Delete the whole adminSchedule/entries parent
                try {
                    const d1 = await fetch(base + 'adminSchedule/entries.json', { method: 'DELETE' });
                } catch (e) {}

                // Delete the mirrored site_config parent
                try {
                    const d2 = await fetch(base + 'site_config/adminSchedule/entries.json', { method: 'DELETE' });
                } catch (e) {}

                // Write an explicit empty map to mirrored location so admin UI sees no entries
                try {
                    const put = await fetch(base + 'site_config/adminSchedule/entries.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                } catch (e) {}

            } catch (err) {}
        };

        // Nuclear option: PUT empty object to both paths to overwrite and clear all entries
        // This bypasses any re-sync from admin-panel.html
        window.nukeAdminSchedule = async function() {
            if (!confirm('NUKE all adminSchedule entries from Firebase? This will completely clear both adminSchedule/entries and site_config/adminSchedule/entries.')) return;
            const base = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/';
            try {
                // PUT empty object to overwrite at both paths
                const empty = {};
                const [r1, r2] = await Promise.all([
                    fetch(base + 'adminSchedule/entries.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(empty) }),
                    fetch(base + 'site_config/adminSchedule/entries.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(empty) })
                ]);
            } catch (err) {}
        };

        if (typeof window.debugLog !== 'function') {
            window.debugLog = function(...args) {
                try {
                    if (window.DEBUG_SCHEDULE) {
                    }
                } catch (e) {
                    // Ignore logging failures
                }
            };
        }

        if (!window.StorageManager || typeof window.StorageManager.load !== 'function') {
            const fallbackFirebaseUrl = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app';
            const getDefaultSchedule = () => ({
                version: '1.0',
                timezone: 'UTC',
                settings: {
                    weekStart: 1,
                    defaultWorkStart: 9,
                    defaultWorkEnd: 17
                },
                events: [],
                metadata: {
                    createdAt: Date.now(),
                    lastModified: Date.now(),
                    lastSync: Date.now()
                }
            });

            window.StorageManager = window.StorageManager || {};
            window.StorageManager.firebaseUrl = window.StorageManager.firebaseUrl || fallbackFirebaseUrl;

            if (typeof window.StorageManager.load !== 'function') {
                window.StorageManager.load = async function(key) {
                    try {
                        const response = await fetch(`${this.firebaseUrl}/${key}.json`);
                        if (response.ok) {
                            const data = await response.json();
                            if (data && data.events) {
                                localStorage.setItem(key, JSON.stringify(data));
                                return data;
                            }
                        }
                    } catch (err) {}

                    try {
                        const item = localStorage.getItem(key);
                        if (item) return JSON.parse(item);
                    } catch (err) {}

                    return getDefaultSchedule();
                };
            }

            if (typeof window.StorageManager.save !== 'function') {
                window.StorageManager.save = async function(key, data) {
                    try {
                        localStorage.setItem(key, JSON.stringify(data));
                    } catch (err) {}

                    try {
                        const response = await fetch(`${this.firebaseUrl}/${key}.json`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                        return { ok: response.ok, method: response.ok ? 'firebase' : 'localStorage' };
                    } catch (err) {
                        return { ok: true, method: 'localStorage' };
                    }
                };
            }
        }

        async function initializeBusinessCalendar() {
            debugLog('🚀 Initialization started');
            // Flag to prevent FullCalendar's select handler during custom cell dragging
            window._isDraggingCustomCells = false;
            const container = document.getElementById('scheduleCalendar');
            container.innerHTML = '🔄 Inicializiram orodje...';

            if (!container) {
                debugLog('❌ Calendar container not found');
                return;
            }

            try {
                debugLog('✅ Container found');
                container.innerHTML = '<div class="calendar-loading"><div class="calendar-spinner"></div><span>Nalagam FullCalendar...</span></div>';

                // Wait for required modules to load
                await new Promise(resolve => {
                    let attempts = 0;
                    const checkModules = () => {
                        const fc = typeof FullCalendar !== 'undefined';
                        const sm = typeof StorageManager !== 'undefined';
                        const ce = typeof CalendarEngine !== 'undefined';

                        if (fc && sm && ce) {
                            debugLog(`✅ All modules loaded (attempt ${attempts})`);
                            resolve();
                        } else if (attempts < 300) {
                            attempts++;
                            setTimeout(checkModules, 50);
                        } else {
                            debugLog('⚠️ Timeout waiting for modules after 15 seconds');
                            resolve();
                        }
                    };
                    checkModules();
                });

                if (typeof FullCalendar === 'undefined') {
                    debugLog('❌ FullCalendar not defined');
                    container.innerHTML = '❌ FullCalendar se ni naložil';
                    return;
                }

                debugLog('🔧 Loading schedule data...');
                container.innerHTML = '<div class="calendar-loading"><div class="calendar-spinner"></div><span>Nalagam podatke...</span></div>';
                
                // Load schedule data using StorageManager (tries Firebase first, falls back to localStorage)
                scheduleData = await StorageManager.load('schedule');
                debugLog(`✅ Schedule data loaded (${scheduleData.events ? scheduleData.events.length : 0} events)`);
                
                // CRITICAL: Load deletion tracker FIRST before filtering
                if (typeof window.loadDeletedEventIds === 'function') {
                    await window.loadDeletedEventIds();
                }
                
                // CRITICAL: Filter out any deleted events right after loading
                if (scheduleData.events && Array.isArray(scheduleData.events)) {
                    const before = scheduleData.events.length;
                    scheduleData.events = filterDeletedEvents(scheduleData.events);
                    scheduleData.events = deduplicateEvents(scheduleData.events);
                    if (before !== scheduleData.events.length) {
                        debugLog(`🔍 Filtered ${before - scheduleData.events.length} deleted events on load`);
                    }
                }

                // Merge local fallback events from localStorage (preserve locally-created events that may not have been saved to remote)
                try {
                    const localRaw = localStorage.getItem('schedule');
                    if (localRaw) {
                        const localSched = JSON.parse(localRaw);
                        const localEvents = Array.isArray(localSched.events) ? localSched.events.filter(ev => ev.extendedProps && ev.extendedProps.origin === 'local') : [];
                        if (localEvents.length > 0) {
                            debugLog(`📥 Found ${localEvents.length} local-origin events in localStorage; attempting to merge`);
                            const TIME_TOLERANCE_MS = 10 * 60 * 1000;
                            const timesApproxEqual = (aStart, aEnd, bStart, bEnd) => {
                                try {
                                    const as = new Date(aStart).getTime();
                                    const bs = new Date(bStart).getTime();
                                    const ae = new Date(aEnd).getTime();
                                    const be = new Date(bEnd).getTime();
                                    return Number.isFinite(as) && Number.isFinite(bs) && Number.isFinite(ae) && Number.isFinite(be) && Math.abs(as - bs) <= TIME_TOLERANCE_MS && Math.abs(ae - be) <= TIME_TOLERANCE_MS;
                                } catch (_) { return false; }
                            };
                            const genericTitle = t => {
                                if (!t) return true;
                                const s = String(t).trim();
                                return s === '' || s === 'Stranka' || s === 'Rezervacija' || s === 'Customer';
                            };

                            localEvents.forEach(localEv => {
                                try {
                                    if (!scheduleData.events.some(e => e.id === localEv.id)) {
                                        // look for a time-conflict
                                        const conflictIdx = scheduleData.events.findIndex(m => timesApproxEqual(localEv.start, localEv.end, m.start, m.end));
                                        if (conflictIdx !== -1) {
                                            const remote = scheduleData.events[conflictIdx];
                                            const remoteTitle = remote.extendedProps?.customer || remote.title || '';
                                            const localTitle = localEv.extendedProps?.customer || localEv.title || '';
                                            if (genericTitle(remoteTitle) && !genericTitle(localTitle)) {
                                                debugLog(`🔁 Replacing remote generic event ${remote.id || 'unknown'} with local event ${localEv.id}`);
                                                scheduleData.events[conflictIdx] = localEv;
                                            } else {
                                                debugLog(`➕ Appending local event ${localEv.id} (no replace)`);
                                                scheduleData.events.push(localEv);
                                            }
                                        } else {
                                            debugLog(`➕ Appending local event ${localEv.id} (no conflict found)`);
                                            scheduleData.events.push(localEv);
                                        }
                                    }
                                } catch (e) { /* ignore per-event merge errors */ }
                            });

                            try { await StorageManager.save('schedule', scheduleData); debugLog('✅ Merged local fallback events saved to canonical schedule'); } catch (e) {}
                        }
                    }
                } catch (e) {}
                
                // Migrate legacy localStorage 'appointments' into schedule (DB-backed) if present
                try {
                    const legacyRaw = localStorage.getItem('appointments');
                    if (legacyRaw) {
                        const legacy = JSON.parse(legacyRaw || '[]');
                        if (Array.isArray(legacy) && legacy.length > 0) {
                            debugLog(`📥 Migrating ${legacy.length} legacy appointments from localStorage`);
                            scheduleData.events = scheduleData.events || [];
                            const migrated = legacy.map(appt => {
                                const title = appt.fullName || `${appt.firstName || ''} ${appt.surname || ''}`.trim() || 'Stranka';
                                return {
                                    id: `appt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
                                    title: title,
                                    start: appt.start || appt.datetime || null,
                                    end: appt.end || null,
                                    extendedProps: {
                                        isBooking: true,
                                        customer: title,
                                        email: appt.email || '',
                                        phone: appt.phone || '',
                                        services: appt.services || [],
                                        duration: appt.duration || appt.length || 0,
                                        price: appt.price || 0
                                    }
                                };
                            });
                            // Also attempt to merge any adminSchedule entries from site_config into scheduleData
                            try {
                                const cfgRes = await fetch('https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/site_config.json');
                                if (cfgRes.ok) {
                                    const cfg = await cfgRes.json().catch(() => ({}));
                                    const entries = cfg?.adminSchedule?.entries || cfg?.adminSchedule || null;
                                    if (entries) {
                                        const pairList = [];
                                        if (Array.isArray(entries)) {
                                            entries.forEach(it => pairList.push({ key: null, item: it }));
                                        } else if (entries && typeof entries === 'object') {
                                            Object.entries(entries).forEach(([k, it]) => pairList.push({ key: k, item: it }));
                                        }
                                        if (pairList.length > 0) {
                                            debugLog(`📥 Merging ${pairList.length} adminSchedule entries into scheduleData`);
                                            scheduleData.events = scheduleData.events || [];
                                            // build deleted map if present
                                            const deletedMapRoot = (config && config.adminSchedule && config.adminSchedule.deleted) ? config.adminSchedule.deleted : {};
                                            pairList.forEach(({ key, item }) => {
                                                // skip if marked deleted
                                                if (key && deletedMapRoot && deletedMapRoot[key]) return;
                                                try {
                                                    // Compute start/end up-front so we can check for duplicates correctly
                                                    const sDate = item.startDate || item.start || null;
                                                    const eDate = item.endDate || item.end || sDate;
                                                    const sTime = (typeof item.startTime !== 'undefined' && item.startTime !== null) ? (String(item.startTime).padStart(2,'0') + ':00') : null;
                                                    const eTime = (typeof item.endTime !== 'undefined' && item.endTime !== null) ? (String(item.endTime).padStart(2,'0') + ':00') : null;
                                                    const start = sDate ? (sTime ? `${sDate}T${sTime}` : `${sDate}T09:00`) : null;
                                                    const end = eDate ? (eTime ? `${eDate}T${eTime}` : `${eDate}T17:00`) : null;

                                                    const evId = item.id || (key ? `admin_${key}` : `admin_${Date.now()}_${Math.random().toString(36).slice(2,6)}`);

                                                    // If we've marked this event as deleted locally, skip it
                                                    if (isEventDeleted(evId)) {
                                                        return;
                                                    }

                                                    // Skip if identical adminKey already present
                                                    if (key && scheduleData.events.some(e => e.extendedProps && e.extendedProps.adminKey === key)) return;

                                                    // Skip if there's already an event with the same id (e.g. our own event_{id} admin echo)
                                                    if (scheduleData.events.some(e => e.id === evId)) return;

                                                    // Skip if same start+end+customer already present (use tolerant time compare to avoid minor minute rounding duplicates)
                                                    const matchName = item.customer || item.worker || item.notes || '';
                                                    const TIME_TOLERANCE_MS = 30 * 60 * 1000; // 30 minutes
                                                    const timesApproxEqual = (aStart, aEnd, bStart, bEnd) => {
                                                        try {
                                                            const as = new Date(aStart).getTime();
                                                            const bs = new Date(bStart).getTime();
                                                            const ae = new Date(aEnd).getTime();
                                                            const be = new Date(bEnd).getTime();
                                                            return Number.isFinite(as) && Number.isFinite(bs) && Number.isFinite(ae) && Number.isFinite(be) && Math.abs(as - bs) <= TIME_TOLERANCE_MS && Math.abs(ae - be) <= TIME_TOLERANCE_MS;
                                                        } catch (_) { return false; }
                                                    };
                                                    if (start && end && scheduleData.events.some(e => {
                                                        const eName = (e.extendedProps && ((e.extendedProps.customer) || e.extendedProps.worker)) || '';
                                                        return eName === matchName && timesApproxEqual(e.start, e.end, start, end);
                                                    })) return;

                                                    // Skip admin entries tagged with 'worker' (worker flow removed)
                                                    if (item.worker) {
                                                        return;
                                                    }
                                                    // Create booking event for customer admin entries
                                                    let newEvent = {
                                                        id: evId,
                                                        title: item.customer || item.notes || 'Stranka',
                                                        type: 'booking',
                                                        start: start,
                                                        end: end,
                                                        extendedProps: {
                                                            isBooking: true,
                                                            adminKey: key || null,
                                                            customer: item.customer || null,
                                                            email: item.email || null,
                                                            phone: item.phone || null,
                                                            services: Array.isArray(item.services) ? item.services : (item.services ? [item.services] : []),
                                                            price: (typeof item.price !== 'undefined' && item.price !== null) ? item.price : (item.cena || 0),
                                                            duration: item.duration || null,
                                                            notes: item.notes || ''
                                                        }
                                                    };
                                                    // Set rules from TYPE_CONFIG where possible so display behavior is consistent
                                                    try {
                                                        const cfg = (typeof ScheduleRules !== 'undefined' && ScheduleRules.TYPE_CONFIG && ScheduleRules.TYPE_CONFIG[newEvent.type]) ? ScheduleRules.TYPE_CONFIG[newEvent.type] : null;
                                                        if (cfg) {
                                                            newEvent.rules = newEvent.rules || {};
                                                            newEvent.rules.isBlocking = cfg.isBlocking || false;
                                                            newEvent.rules.isSubtractive = cfg.isSubtractive || false;
                                                            newEvent.rules.conflictPriority = cfg.priority || 0;
                                                        }
                                                    } catch (_) {}
                                                    scheduleData.events.push(newEvent);
                                                } catch (inner) {}
                                            });
                                            try { await saveScheduleData(); debugLog('✅ Merged adminSchedule into scheduleData and saved'); } catch (e) {}
                                        }
                                    }
                                }
                            } catch (mergeErr) {}
                            scheduleData.events.push(...migrated);
                            try { await StorageManager.save('schedule', scheduleData); localStorage.removeItem('appointments'); debugLog('✅ Migrated legacy appointments to DB'); } catch (e) {}
                        }
                    }
                } catch (e) {}

                // Ensure adminSchedule entries from site_config are merged only if not marked deleted
                try {
                    const cfgRes2 = await fetch('https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/site_config.json');
                    if (cfgRes2.ok) {
                        const cfg2 = await cfgRes2.json().catch(() => ({}));
                        const entries2 = cfg2?.adminSchedule?.entries || cfg2?.adminSchedule || null;
                        const deletedMap = (cfg2 && cfg2.adminSchedule && cfg2.adminSchedule.deleted) ? cfg2.adminSchedule.deleted : {};
                        if (entries2) {
                            const pairList2 = [];
                            if (Array.isArray(entries2)) entries2.forEach(it => pairList2.push({ key: null, item: it }));
                            else if (entries2 && typeof entries2 === 'object') Object.entries(entries2).forEach(([k,it]) => pairList2.push({ key: k, item: it }));
                            if (pairList2.length > 0) {
                                debugLog(`📥 Merging ${pairList2.length} adminSchedule entries into scheduleData (post-load)`);
                                scheduleData.events = scheduleData.events || [];
                                pairList2.forEach(({ key, item }) => {
                                    try {
                                        // skip if the key is marked deleted (tombstone)
                                        if (key && deletedMap && deletedMap[key]) {
                                            return;
                                        }
                                        // CRITICAL: Also skip if we've marked this event as deleted locally
                                        const eventId = `admin_${key}`;
                                        if (typeof isEventDeleted === 'function' && isEventDeleted(eventId)) {
                                            return;
                                        }
                                        // skip if identical adminKey present
                                        if (key && scheduleData.events.some(e => e.extendedProps && e.extendedProps.adminKey === key)) return;
                                        // skip if event with same start/end/customer already present (tolerant check)
                                        const sDate = item.startDate || item.start || null;
                                        const eDate = item.endDate || item.end || sDate;
                                        const sTime = (typeof item.startTime !== 'undefined' && item.startTime !== null) ? String(item.startTime).slice(0,5) : null;
                                        const eTime = (typeof item.endTime !== 'undefined' && item.endTime !== null) ? String(item.endTime).slice(0,5) : null;
                                        const start = sDate ? (sTime ? `${sDate}T${sTime}` : `${sDate}T09:00`) : null;
                                        const end = eDate ? (eTime ? `${eDate}T${eTime}` : `${eDate}T17:00`) : null;
                                        const matchName = item.customer || item.worker || item.notes || '';

                                        const TIME_TOLERANCE_MS = 30 * 60 * 1000; // 30 minutes
                                        const timesApproxEqual = (aStart, aEnd, bStart, bEnd) => {
                                            try {
                                                const as = new Date(aStart).getTime();
                                                const bs = new Date(bStart).getTime();
                                                const ae = new Date(aEnd).getTime();
                                                const be = new Date(bEnd).getTime();
                                                return Number.isFinite(as) && Number.isFinite(bs) && Number.isFinite(ae) && Number.isFinite(be) && Math.abs(as - bs) <= TIME_TOLERANCE_MS && Math.abs(ae - be) <= TIME_TOLERANCE_MS;
                                            } catch (_) { return false; }
                                        };
                                        
                                        // CRITICAL: Check if a matching event (by customer+time) is already marked as deleted
                                        const existingMatchingEvent = scheduleData.events.find(e => {
                                            const eName = (e.extendedProps && ((e.extendedProps.customer) || e.extendedProps.worker)) || '';
                                            return eName === matchName && start && end && timesApproxEqual(e.start, e.end, start, end);
                                        });
                                        if (existingMatchingEvent && window.isEventDeleted(existingMatchingEvent.id)) {
                                            return;
                                        }
                                        
                                        if (start && end && scheduleData.events.some(e => {
                                            const eName = (e.extendedProps && ((e.extendedProps.customer) || e.extendedProps.worker)) || '';
                                            return eName === matchName && timesApproxEqual(e.start, e.end, start, end);
                                        })) return;
                                        // Create a worker-style event when admin entry contains worker, otherwise treat as booking
                                        let newEvent = null;

                                        if (item.worker) {
                                            // Preserve worker/worker-event semantics when admin item includes a worker
                                            newEvent = {
                                                id: key ? `admin_${key}` : `admin_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                                                // Prefer worker name, fall back to customer/notes/type
                                                title: item.worker || item.customer || item.notes || item.type || 'Delavec dogodek',
                                                type: item.type || 'worker_event',
                                                start: start,
                                                end: end,
                                                extendedProps: {
                                                    isBooking: false,
                                                    adminKey: key || null,
                                                    worker: item.worker || null,
                                                    email: item.email || null,
                                                    phone: item.phone || null,
                                                    price: (typeof item.price !== 'undefined' && item.price !== null) ? item.price : (item.cena || 0),
                                                    duration: item.duration || null,
                                                    notes: item.notes || ''
                                                }
                                            };
                                        } else {
                                            // Customer/admin booking entry
                                            newEvent = {
                                                id: key ? `admin_${key}` : `admin_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
                                                title: item.customer || item.notes || 'Stranka',
                                                type: 'booking',
                                                start: start,
                                                end: end,
                                                extendedProps: {
                                                    isBooking: true,
                                                    adminKey: key || null,
                                                    customer: item.customer || null,
                                                    email: item.email || null,
                                                    phone: item.phone || null,
                                                    services: Array.isArray(item.services) ? item.services : (item.services ? [item.services] : []),
                                                    price: (typeof item.price !== 'undefined' && item.price !== null) ? item.price : (item.cena || 0),
                                                    duration: item.duration || null,
                                                    notes: item.notes || ''
                                                }
                                            };

                                            try {
                                                const cfg = (typeof ScheduleRules !== 'undefined' && ScheduleRules.TYPE_CONFIG && ScheduleRules.TYPE_CONFIG[newEvent.type]) ? ScheduleRules.TYPE_CONFIG[newEvent.type] : null;
                                                if (cfg) {
                                                    newEvent.rules = newEvent.rules || {};
                                                    newEvent.rules.isBlocking = cfg.isBlocking || false;
                                                    newEvent.rules.isSubtractive = cfg.isSubtractive || false;
                                                    newEvent.rules.conflictPriority = cfg.priority || 0;
                                                }
                                            } catch (_) {}
                                        }

                                        scheduleData.events.push(newEvent);
                                    } catch (inner2) {}
                                });
                                try { await saveScheduleData(); debugLog('✅ Merged adminSchedule into scheduleData (post-load) and saved'); } catch (e) {}
                            }
                        }
                    }
                } catch (mergeErr2) {}

                // FINAL CLEANUP: Apply deletion filter one last time after ALL merges
                // This catches any deleted events that were re-added by adminSchedule merge
                const beforeFinalFilter = scheduleData.events.length;
                scheduleData.events = filterDeletedEvents(scheduleData.events);
                const afterFinalFilter = scheduleData.events.length;
                if (beforeFinalFilter !== afterFinalFilter) {
                    // Save cleaned scheduleData back to localStorage
                    try {
                        localStorage.setItem('schedule', JSON.stringify(scheduleData));
                    } catch (e) {}
                } else {
                }

                // Check if CalendarEngine is available
                if (typeof CalendarEngine === 'undefined') {
                    debugLog('❌ CalendarEngine not available, trying to create stub');
                    window.CalendarEngine = {};
                }
                
                if (!CalendarEngine.initializeCalendar) {
                    debugLog('❌ CalendarEngine.initializeCalendar method missing');
                    throw new Error('initializeCalendar method not found');
                }
                
                container.innerHTML = '<div class="calendar-loading"><div class="calendar-spinner"></div><span>Inicializiram koledar...</span></div>';
                
                const calendar = CalendarEngine.initializeCalendar(container, scheduleData);
                debugLog(`📦 Calendar returned: ${calendar ? 'YES' : 'NO'}`);

                if (!calendar) {
                    debugLog('❌ Calendar initialization failed');
                    container.innerHTML = '❌ Napaka pri inicializaciji koledarja';
                    return;
                }

                // Store reference globally
                window.calendar = calendar;
                calendarInitialized = true;
                debugLog('✓ Business calendar initialized');
                
                // DEBUG: Check if dayMaxEvents is set

                // Calendar interactions
                debugLog('🎯 Attaching event handlers...');
                
                // Let FullCalendar's native handlers work - they handle more-link and dateClick properly
                calendar.setOption('navLinks', false);

                // ── SCROLL GUARD (all screen sizes) ─────────────────────────────────
                // Tracks touch movement on the document so we can suppress FC callbacks
                // that fire after a drag/scroll gesture on desktop-ish touch devices.
                {
                    let _scrollStartY = 0, _scrollStartX = 0;
                    document.addEventListener('touchstart', (e) => {
                        _scrollStartY = e.touches[0].clientY;
                        _scrollStartX = e.touches[0].clientX;
                        window._calTouchScrolled = false;
                    }, { passive: true });
                    document.addEventListener('touchmove', (e) => {
                        const dy = Math.abs(e.touches[0].clientY - _scrollStartY);
                        const dx = Math.abs(e.touches[0].clientX - _scrollStartX);
                        if (dy > 8 || dx > 8) {
                            window._calTouchScrolled = true;
                            try { calendar.unselect(); } catch(_) {}
                            document.querySelectorAll('[data-date]').forEach(c => { c.style.backgroundColor = ''; });
                        }
                    }, { passive: true });
                    document.addEventListener('touchend', () => {
                        if (window._calTouchScrolled) {
                            window._scrollEndedAt = Date.now();
                            try { calendar.unselect(); } catch(_) {}
                            document.querySelectorAll('[data-date]').forEach(c => { c.style.backgroundColor = ''; });
                        }
                    }, { passive: true });
                }

                // Handle single day cell clicks to open add modal (desktop only)
                calendar.on('dateClick', (info) => {
                    
                    // On mobile we use our own tap detector above — never open from FC's dateClick
                    if (window.innerWidth <= 768) return;

                    if (window._calTouchScrolled) { window._calTouchScrolled = false; return; }
                    if (window._scrollEndedAt && Date.now() - window._scrollEndedAt < 500) { return; }

                    // Skip if more-link was just clicked (flag set by moreLinkClick)
                    if (window._moreLinkJustClicked) {
                        return;
                    }

                    // Skip if a custom multi-day drag just completed (flag set by pointerup handler)
                    // Without this, dateClick fires after drag release and overwrites the end date
                    if (window._skipNextDateClick) {
                        window._skipNextDateClick = false;
                        return;
                    }
                    
                    // This is a native FullCalendar event that fires for empty cell clicks
                    openAddEventModal(info.dateStr.split('T')[0]);
                });

                // FullCalendar's native more-link click handling works now
                // (cell selection handler ignores clicks on .fc-more-link elements)

                calendar.on('eventClick', (info) => {
                    debugLog('Event clicked: ' + info.event.title);

                    const isBooking = info.event.extendedProps?.isBooking
                        || info.event.extendedProps?.tab === 'customer'
                        || info.event.extendedProps?.customer
                        || info.event.isBooking
                        || (info.event.id && String(info.event.id).startsWith('apt_'));
                    if (isBooking) {
                        debugLog('📋 Opening booking details modal');
                        openBookingDetailsModal(info.event);
                        return;
                    }

                    debugLog('Opening edit modal...');
                    openEditEventModal(info.event);
                });
                debugLog('✅ Event handlers attached');

            } catch (error) {
                debugLog('❌ Error: ' + error.message);
                container.innerHTML = '❌ Napaka: ' + error.message;
            }
        }

        // Initialize calendar immediately
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Wait 1500ms for all scripts to load
                setTimeout(() => {
                    try {
                        initializeBusinessCalendar();
                    } catch (e) {
                        debugLog('❌ Initialization error: ' + e.message);
                        document.getElementById('scheduleCalendar').innerHTML = '❌ Gravna napaka: ' + e.message;
                    }
                }, 1500);
            });
        } else {
            // Wait 1500ms for all scripts to load
            setTimeout(() => {
                try {
                    initializeBusinessCalendar();
                } catch (e) {
                    debugLog('❌ Initialization error: ' + e.message);
                    document.getElementById('scheduleCalendar').innerHTML = '❌ Gravna napaka: ' + e.message;
                }
            }, 1500);
        }

        // Silence console output for production/admin usage (no prints to console)
        // Set localStorage.enable_console = '1' to allow logs during debugging.
        (function silenceConsole(){
            try {
                const allowConsole = localStorage.getItem('enable_console') === '1';
                if (allowConsole) return;
                const noOp = function(){};
                if (typeof console !== 'undefined') {}
            } catch (e) { /* ignore */ }
        })();

        // Runtime self-check kept but will not print to console due to silenced console
        setTimeout(() => {
            debugLog(`🔎 Runtime modules: FullCalendar=${typeof FullCalendar !== 'undefined'}, StorageManager=${typeof StorageManager !== 'undefined'}, CalendarEngine=${typeof CalendarEngine !== 'undefined'}`);
        }, 2000);

        // Close sidebar when navigating on mobile
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && sidebar.classList.contains('expanded')) {
                // Sidebar stays open on desktop
            }
        });
        // ===== DEBUGGING TOOLS =====
        window.deletionDebug = {
            show: () => {
                console.table({
                    "Deleted IDs": Array.from(deletedEventIds).join(", ") || "None",
                    "Total Deleted": deletedEventIds.size,
                    "Total in Memory": scheduleData.events ? scheduleData.events.length : 0,
                    "Active Events": filterDeletedEvents(scheduleData.events || []).length
                });
            },
            getDeleted: () => Array.from(deletedEventIds),
            getActive: () => filterDeletedEvents(scheduleData.events || []),
            clear: () => {
                deletedEventIds.clear();
                saveDeletedEventIds();
            },
            markDeleted: (id) => {
                markEventDeleted(id);
                scheduleData.events = scheduleData.events.filter(e => e.id !== id);
            },
            stats: () => ({
                totalInScheduleData: scheduleData.events ? scheduleData.events.length : 0,
                deletedCount: deletedEventIds.size,
                activeCount: filterDeletedEvents(scheduleData.events || []).length
            }),
            // Debug utility: show events as used by CalendarEngine (post-format)
            listCalendarEvents: async () => {
                try {
                    const evs = await CalendarEngine.generateCalendarEvents(scheduleData);
                    evs.forEach((e, i) => {
                        const cust = (e.extendedProps && e.extendedProps.customer) ? e.extendedProps.customer : e.title;
                        const key = e.id || `${new Date(e.start).toISOString().slice(0,16)}|${new Date(e.end).toISOString().slice(0,16)}|${cust}`;
                    });
                } catch (err) {}
            },
            findDuplicates: () => {
                const map = {};
                (scheduleData.events || []).forEach(e => {
                    const cust = (e.extendedProps && e.extendedProps.customer) ? e.extendedProps.customer : (e.title || '');
                    const s = new Date(e.start).toISOString().slice(0,16);
                    const en = new Date(e.end).toISOString().slice(0,16);
                    const k = `${s}|${en}|${cust}`;
                    map[k] = map[k] || [];
                    map[k].push(e);
                });
                Object.entries(map).forEach(([k, arr]) => { if (arr.length > 1) {} });
            },
            // Developer utilities: force layout recalculation and dump diagnostics
            fixLayout: () => {
                // No-op: fixLayout (automatic DOM adjustments) disabled by request
                return null;
            },
            dumpDiagnostics: async () => {
                try {
                    const scrollBodies = document.querySelectorAll('.fc-scrollgrid-section-body');
                    const dayCells = document.querySelectorAll('.fc-daygrid-day-cell');
                    const timegrid = document.querySelector('.fc-timegrid');
                    const events = window.calendar ? window.calendar.getEvents().map(e => ({id:e.id, title:e.title, start:e.start, end:e.end, allDay:e.allDay})) : [];
                    try { const evs = await CalendarEngine.generateCalendarEvents(scheduleData); } catch (err) {}
                } catch (err) {}
            },
            remakeViews: async (view = 'timeGridWeek') => {
                // No-op: user requested removal of automatic remakes/fallbacks
                return null;
            },
            // Force timegrid visibility disabled
            forceTimegrid: () => {
                // No-op: developer-requested removal of forced visibility fallbacks
                return null;
            },
            // Health check: tries soft fixes (fixLayout / forceTimegrid) and falls back to full remake
            calendarHealthCheck: async (opts = { autoRemake: true }) => {
                try {
                    const viewType = window.calendar && window.calendar.view && window.calendar.view.type ? window.calendar.view.type : null;
                    if (viewType === 'dayGridMonth' || viewType === 'timeGridDay') {
                        return true;
                    }
                    const hasTimegrid = !!document.querySelector('.fc-timegrid');
                    const scrollBodies = document.querySelectorAll('.fc-scrollgrid-section-body');
                    const bodiesCount = scrollBodies ? scrollBodies.length : 0;
                    const bodyHeights = Array.from(scrollBodies || []).map(b => Math.round(b.getBoundingClientRect().height));
                    if (hasTimegrid && bodiesCount > 0 && bodyHeights.some(h => h > 120)) {
                        return true;
                    }
                    // No automatic remediation: do not attempt fixLayout/forceTimegrid or call remakeTimeGridViews.
                    // If soft-check failed, return false and allow manual intervention or higher-level logic to decide.
                    return false;
                    return false;
                } catch (err) {
                    return false;
                }
            },
            // Toggle temporary visual debug highlights disabled
            toggleTimegridVisuals: () => {
                try {
                    const el = document.getElementById('scheduleCalendar');
                    if (!el) return false;
                    el.classList.toggle('debug-timegrid-visuals');
                    return el.classList.contains('debug-timegrid-visuals');
                } catch (e) {  return false; }
            }
        };

        // Escape HTML to prevent XSS
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // ===== CRITICAL OVERRIDE - AFTER ALL FUNCTION DEFINITIONS =====
        // Must be here, AFTER openAddEventModal is defined, to override function hoisting
        window.openAddEventModal = openAddEventModalWithTab;
