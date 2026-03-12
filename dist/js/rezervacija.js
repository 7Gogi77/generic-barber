        // ===== BOOKING STATE =====
        const BookingState = {
            selectedServices: [],
            selectedDate: null,
            selectedTime: null,
            customerInfo: {
                name: '',
                email: '',
                phone: '',
                notes: ''
            },
            currentMonth: new Date(),
            events: [], // Loaded from storage
            totalDuration: 0,
            totalPrice: 0,
            selectedWorker: null
        };

        // ===== SLOVENIAN MONTHS =====
        const MONTHS_SL = [
            'Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij',
            'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December'
        ];

        // ===== FIREBASE CONFIG =====
        const FIREBASE_DB_URL = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app';
        
        // Global services array (loaded from Firebase)
        let servicesData = [];
        
        // ===== HELPER: Get local date string (YYYY-MM-DD) =====
        // This avoids timezone issues with toISOString()
        function getLocalDateStr(date) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }

        // ===== APPLY BOOKING PAGE CONTENT FROM CONFIG =====
        function applyBookingPageContent() {
            const bp = window.SITE_CONFIG?.bookingPage || {};
            
            // Header
            const headerTitle = document.querySelector('.header h1');
            const headerSubtitle = document.querySelector('.header .subtitle');
            if (headerTitle && bp.pageTitle) headerTitle.textContent = bp.pageTitle;
            if (headerSubtitle && bp.pageSubtitle) headerSubtitle.textContent = bp.pageSubtitle;
            
            // Step 1 (services) — unchanged
            const step1Title = document.querySelector('#step1 .card-header h2');
            const step1Desc = document.querySelector('#step1 .card-header p');
            if (step1Title && bp.step1Title) step1Title.textContent = bp.step1Title;
            if (step1Desc && bp.step1Desc) step1Desc.textContent = bp.step1Desc;
            
            // Step 2 (worker) — no Firebase label, skip
            
            // Step 3 (date) — was old step 2 in Firebase config
            const step3Title = document.querySelector('#step3 .card-header h2');
            const step3Desc = document.querySelector('#step3 .card-header p');
            if (step3Title && bp.step2Title) step3Title.textContent = bp.step2Title;
            if (step3Desc && bp.step2Desc) step3Desc.textContent = bp.step2Desc;
            
            // Step 4 (contact) — was old step 3 in Firebase config
            const step4Title = document.querySelector('#step4 .card-header h2');
            const step4Desc = document.querySelector('#step4 .card-header p');
            if (step4Title && bp.step3Title) step4Title.textContent = bp.step3Title;
            if (step4Desc && bp.step3Desc) step4Desc.textContent = bp.step3Desc;
            
            // Step 5 (confirmation) — was old step 4 in Firebase config
            const step5Title = document.querySelector('#step5 .card-header h2');
            const step5Desc = document.querySelector('#step5 .card-header p');
            if (step5Title && bp.step4Title) step5Title.textContent = bp.step4Title;
            if (step5Desc && bp.step4Desc) step5Desc.textContent = bp.step4Desc;
            
            // Success step is now #step6
            const successTitle = document.querySelector('#step6 .success-title');
            const successMessage = document.querySelector('#step6 .success-message');
            if (successTitle && bp.successTitle) successTitle.textContent = bp.successTitle;
            if (successMessage && bp.successMessage) {
                successMessage.innerHTML = bp.successMessage + '<br>Potrditev bo poslana na vaš e-poštni naslov.';
            }
            
            // Buttons - Next
            const nextBtns = document.querySelectorAll('#toStep2Btn, #toStep3FromWorker, #toStep4Btn, #toStep5Btn');
            nextBtns.forEach(btn => {
                if (bp.nextButton) btn.textContent = bp.nextButton;
            });
            
            // Buttons - Back
            const backBtns = document.querySelectorAll('#backToStep1FromWorker, #backToStep2, #backToStep3, #backToStep4');
            backBtns.forEach(btn => {
                if (bp.backButton) btn.textContent = bp.backButton;
            });
            
            // Confirm button
            const confirmBtn = document.getElementById('confirmBookingBtn');
            if (confirmBtn && bp.confirmButton) confirmBtn.textContent = bp.confirmButton;
            
            // New booking button
            const newBtn = document.querySelector('#step6 .btn-primary');
            if (newBtn && bp.newButton) newBtn.textContent = bp.newButton;
        }

        // ===== INIT =====
        document.addEventListener('DOMContentLoaded', async () => {
            showLoading(true);
            
            // Load config from Firebase first
            await loadConfigFromFirebase();
            renderWorkerPicker();
            
            // Set shop name
            if (window.SITE_CONFIG && window.SITE_CONFIG.shopName) {
                document.getElementById('shopName').textContent = window.SITE_CONFIG.shopName;
            }
            
            // Apply booking page content from config
            applyBookingPageContent();

            // Load events from storage
            await loadEvents();
            
            // Load services (now uses servicesData from Firebase)
            loadServices();
            
            // Init calendar
            renderCalendar();
            
            // Setup event listeners
            setupEventListeners();
            
            showLoading(false);
        });
        
        // ===== LOAD CONFIG FROM FIREBASE =====
        async function loadConfigFromFirebase() {
            try {
                const response = await fetch(`${FIREBASE_DB_URL}/site_config.json`);
                if (response.ok) {
                    const config = await response.json();
                    
                    // Store globally
                    window.SITE_CONFIG = config;
                    
                    // Extract services
                    if (config && config.servicesSection && config.servicesSection.items) {
                        // Firebase stores arrays as objects with numeric keys
                        const items = config.servicesSection.items;
                        if (Array.isArray(items)) {
                            servicesData = items;
                        } else if (typeof items === 'object') {
                            // Convert object with numeric keys to array
                            servicesData = Object.values(items).filter(item => item !== null);
                        }
                    }
                    
                    // Update business hours display
                    updateBusinessHoursDisplay();
                    
                    // Apply theme colors from admin panel
                    applyThemeColors();
                    
                } else {
                }
            } catch (err) {
                // Fallback to local config.js if available
                if (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.servicesSection) {
                    servicesData = SITE_CONFIG.servicesSection.items || [];
                }
            }
        }
        
        // ===== APPLY THEME COLORS FROM CONFIG =====
        function applyThemeColors() {
            const theme = window.SITE_CONFIG?.theme || {};
            const root = document.documentElement;

            // Primary accent color — stored as theme.primary by admin panel
            const accent = theme.primary || theme.primaryColor || theme.buttonColor;
            if (accent) {
                root.style.setProperty('--ios-blue', accent);
                root.style.setProperty('--ios-blue-light', accent + 'CC');
            }

            // Button text color
            if (theme.buttonTextColor) {
                root.style.setProperty('--booking-btn-text', theme.buttonTextColor);
            }
        }
        
        // ===== GET BOOKING SETTINGS (from poslovni-panel localStorage) =====
        // ===== ACTIVE PROMO HELPER =====
        function getActivePromo(date) {
            try {
                const bs = JSON.parse(localStorage.getItem('bookingSettings') || '{}');
                const promos = Array.isArray(bs.promoIntervals) ? bs.promoIntervals : [];
                if (!promos.length) return null;
                const d = (date instanceof Date) ? date : (date ? new Date(date) : new Date());
                if (isNaN(d)) return null;
                const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                return promos.find(p => p.from <= ds && ds <= p.to) || null;
            } catch (_) { return null; }
        }

        function getBookingSettings() {
            try {
                const raw = localStorage.getItem('bookingSettings');
                if (raw) {
                    const s = JSON.parse(raw);
                    if (s && s.workingHoursByDay) return s;
                }
            } catch(e) {}
            return null;
        }

        // ===== FORMAT DATE AS dd/mm/yyyy =====
        function formatDateSlash(dateOrStr) {
            // Accepts a Date object or a 'yyyy-mm-dd' string
            if (dateOrStr instanceof Date) {
                const d = dateOrStr;
                return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            }
            const parts = String(dateOrStr).split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return dateOrStr;
        }

        // ===== UPDATE BUSINESS HOURS DISPLAY =====
        function updateBusinessHoursDisplay() {
            const bs = getBookingSettings();
            const dayNames = ['Ned', 'Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob'];

            const hoursText = document.getElementById('businessHoursText');
            const workingDaysInfo = document.getElementById('workingDaysInfo');

            if (bs && bs.workingHoursByDay) {
                // Find representative hours (use Monday or first open day)
                let repHours = null;
                for (let i = 1; i <= 6; i++) {
                    const d = bs.workingHoursByDay[i];
                    if (d && d.enabled) { repHours = d; break; }
                }
                if (!repHours && bs.workingHoursByDay[0] && bs.workingHoursByDay[0].enabled) {
                    repHours = bs.workingHoursByDay[0];
                }
                if (hoursText && repHours) {
                    hoursText.textContent = `${repHours.start} - ${repHours.end}`;
                }
                if (workingDaysInfo) {
                    const openDays = [];
                    for (let i = 0; i < 7; i++) {
                        const d = bs.workingHoursByDay[i];
                        if (d && d.enabled) openDays.push(dayNames[i]);
                    }
                    workingDaysInfo.textContent = openDays.join(', ') || 'Ni nastavljeno';
                }
                return;
            }

            // Fallback to SITE_CONFIG
            const businessHours = window.SITE_CONFIG?.booking?.businessHours || { start: 9, end: 19 };
            const workingDays = window.SITE_CONFIG?.booking?.workingDays || {};
            const daysClosed = window.SITE_CONFIG?.booking?.daysClosed || [0];

            if (hoursText) {
                hoursText.textContent = `${businessHours.start}:00 - ${businessHours.end}:00`;
            }
            if (workingDaysInfo) {
                const openDays = [];
                for (let i = 0; i < 7; i++) {
                    if (workingDays[i] || !daysClosed.includes(i)) openDays.push(dayNames[i]);
                }
                workingDaysInfo.textContent = openDays.join(', ') || 'Pon - Pet';
            }
        }
        
        // ===== GET BUSINESS HOURS FOR SPECIFIC DAY =====
        // date param is optional - enables dateOverride and seasonal schedule support
        function getBusinessHoursForDay(dayOfWeek, date) {
            const bs = getBookingSettings();
            if (bs) {
                // 1. Date override has highest priority
                if (date && bs.dateOverrides && bs.dateOverrides.length > 0) {
                    const dateStr = getLocalDateStr(date);
                    const ov = bs.dateOverrides.find(o => o.date === dateStr);
                    if (ov && ov.start && ov.end) {
                        const [sh, sm] = ov.start.split(':').map(Number);
                        const [eh, em] = ov.end.split(':').map(Number);
                        return { start: sh + sm/60, end: eh + em/60, startStr: ov.start, endStr: ov.end };
                    }
                }
                // 2. Seasonal schedule
                if (date && bs.seasonalSchedule && bs.seasonalSchedule.enabled) {
                    const ss = bs.seasonalSchedule;
                    const m = date.getMonth() + 1;
                    const d2 = date.getDate();
                    if (ss.summerStart && ss.summerEnd) {
                        const [ssM, ssD] = ss.summerStart.split('-').map(Number);
                        const [seM, seD] = ss.summerEnd.split('-').map(Number);
                        const inSeason = (m > ssM || (m === ssM && d2 >= ssD)) &&
                                         (m < seM || (m === seM && d2 <= seD));
                        if (inSeason && ss.summerHoursStart && ss.summerHoursEnd) {
                            const [sh, sm2] = ss.summerHoursStart.split(':').map(Number);
                            const [eh, em] = ss.summerHoursEnd.split(':').map(Number);
                            return { start: sh + sm2/60, end: eh + em/60, startStr: ss.summerHoursStart, endStr: ss.summerHoursEnd };
                        }
                    }
                }
                // 3. Per-day working hours
                const dayData = bs.workingHoursByDay[dayOfWeek];
                if (dayData !== undefined) {
                    if (!dayData.enabled) return null; // day is closed
                    const [sh, sm] = dayData.start.split(':').map(Number);
                    const [eh, em] = dayData.end.split(':').map(Number);
                    return { start: sh + sm/60, end: eh + em/60, startStr: dayData.start, endStr: dayData.end };
                }
            }
            // Fallback to SITE_CONFIG
            const defaultHours = window.SITE_CONFIG?.booking?.businessHours || { start: 9, end: 19 };
            const hoursPerDay = window.SITE_CONFIG?.booking?.hours || {};
            if (hoursPerDay[dayOfWeek]) {
                return {
                    start: hoursPerDay[dayOfWeek].start ?? defaultHours.start,
                    end: hoursPerDay[dayOfWeek].end ?? defaultHours.end
                };
            }
            return defaultHours;
        }

        // ===== LOADING =====
        function showLoading(show) {
            document.getElementById('loadingOverlay').classList.toggle('visible', show);
        }

        // ===== LOAD EVENTS =====
        async function loadEvents() {
            try {
                // Load schedule events from StorageManager
                const scheduleData = await StorageManager.load('schedule');
                
                if (scheduleData && Array.isArray(scheduleData.events)) {
                    BookingState.events = scheduleData.events;
                } else {
                    BookingState.events = [];
                }
                
                // Debug: log event details
                if (BookingState.events.length > 0) {
                }
                
            } catch (err) {
                BookingState.events = [];
            }
        }

        // ===== LOAD SERVICES =====
        function loadServices() {
            const grid = document.getElementById('servicesGrid');
            grid.innerHTML = '';
            
            // Use servicesData loaded from Firebase
            const services = servicesData;
            
            
            if (services.length === 0) {
                grid.innerHTML = '<p style="text-align: center; color: var(--ios-text-tertiary);">Ni razpoložljivih storitev</p>';
                return;
            }
            
            services.forEach((service, index) => {
                const item = document.createElement('div');
                item.className = 'service-item';
                item.dataset.index = index;
                
                // Format price - add € if not present
                let priceDisplay = service.price || '';
                if (priceDisplay && !priceDisplay.includes('€')) {
                    priceDisplay = priceDisplay + ' €';
                }
                
                item.innerHTML = `
                    <div class="service-checkbox"></div>
                    <div class="service-info">
                        <div class="service-name">${service.name}</div>
                        <div class="service-desc">${service.desc || ''}</div>
                    </div>
                    <div class="service-price">${priceDisplay}</div>
                `;
                item.addEventListener('click', () => toggleService(index));
                grid.appendChild(item);
            });
        }

        // ===== TOGGLE SERVICE =====
        function toggleService(index) {
            const services = servicesData;
            const service = services[index];
            if (!service) return;
            
            const idx = BookingState.selectedServices.findIndex(s => s.index === index);
            
            if (idx >= 0) {
                BookingState.selectedServices.splice(idx, 1);
            } else {
                BookingState.selectedServices.push({
                    index,
                    name: service.name,
                    price: parseFloat((service.price || '0').toString().replace(/[^0-9.,]/g, '').replace(',', '.')) || 0,
                    duration: parseInt(service.duration, 10) || 30
                });
            }
            
            // Update UI
            document.querySelectorAll('.service-item').forEach((el, i) => {
                el.classList.toggle('selected', BookingState.selectedServices.some(s => s.index === i));
            });
            
            // Calculate totals
            BookingState.totalDuration = BookingState.selectedServices.reduce((sum, s) => sum + s.duration, 0);
            const _basePrice = BookingState.selectedServices.reduce((sum, s) => sum + s.price, 0);
            // Apply active promo discount
            const _promoDate = BookingState.selectedDate || new Date();
            const _activePromo = getActivePromo(_promoDate);
            BookingState.activePromo = _activePromo;
            BookingState.promoOriginalPrice = (_activePromo && _basePrice > 0) ? _basePrice : null;
            BookingState.totalPrice = (_activePromo && _basePrice > 0)
                ? Math.round(_basePrice * (1 - _activePromo.discount / 100) * 100) / 100
                : _basePrice;
            
            // Update summary display
            updateSelectionSummary();
            
            // Enable/disable next button
            document.getElementById('toStep2Btn').disabled = BookingState.selectedServices.length === 0;
            
        }
        
        // ===== UPDATE SELECTION SUMMARY =====
        function updateSelectionSummary() {
            const summary = document.getElementById('selectionSummary');
            const durationText = document.getElementById('totalDurationText');
            const priceText = document.getElementById('totalPriceText');
            
            if (BookingState.selectedServices.length > 0) {
                summary.style.display = 'block';
                
                // Format duration (convert minutes to hours and minutes)
                const totalMins = BookingState.totalDuration;
                const hours = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                let durationStr = '';
                if (hours > 0) {
                    durationStr += `${hours} h `;
                }
                if (mins > 0 || hours === 0) {
                    durationStr += `${mins} min`;
                }
                durationText.textContent = durationStr.trim();
                
                // Format price with optional promo discount
                if (BookingState.activePromo && BookingState.promoOriginalPrice != null) {
                    priceText.innerHTML = `<s style="opacity:0.5;font-size:0.85em;">${BookingState.promoOriginalPrice.toFixed(2)} €</s>&nbsp;<strong>${BookingState.totalPrice.toFixed(2)} €</strong>`;
                    const _pi = document.getElementById('promoDiscountInfo');
                    if (_pi) {
                        const _pl = document.getElementById('promoDiscountLabel');
                        if (_pl) _pl.textContent = `🏷 ${BookingState.activePromo.label || 'Akcija'} −${BookingState.activePromo.discount}%`;
                        _pi.style.display = '';
                    }
                } else {
                    priceText.textContent = `${BookingState.totalPrice.toFixed(2)} €`;
                    const _pi = document.getElementById('promoDiscountInfo');
                    if (_pi) _pi.style.display = 'none';
                }
            } else {
                summary.style.display = 'none';
            }
        }

        // ===== RENDER CALENDAR =====
        function renderCalendar() {
            const container = document.getElementById('calendarDays');
            container.innerHTML = '';
            
            const year = BookingState.currentMonth.getFullYear();
            const month = BookingState.currentMonth.getMonth();
            
            // Update header
            document.getElementById('calendarMonthYear').textContent = `${MONTHS_SL[month]} ${year}`;
            
            // First day of month (0 = Sunday, adjust to Monday start)
            const firstDay = new Date(year, month, 1).getDay();
            const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Monday = 0
            
            // Days in month
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            // Days in previous month
            const prevMonthDays = new Date(year, month, 0).getDate();
            
            // Today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Render previous month days
            for (let i = startOffset - 1; i >= 0; i--) {
                const day = prevMonthDays - i;
                const btn = createDayButton(day, true, false, null);
                container.appendChild(btn);
            }
            
            // Calculate max date from maxAdvanceDays setting (default 60 days)
            const maxDate = new Date();
            maxDate.setHours(0, 0, 0, 0);
            const _bsMaxDate = getBookingSettings();
            const _maxAdvDays = (_bsMaxDate && parseInt(_bsMaxDate.maxAdvanceDays, 10) > 0)
                ? parseInt(_bsMaxDate.maxAdvanceDays, 10) : 60;
            maxDate.setDate(maxDate.getDate() + _maxAdvDays);
            
            // Render current month days
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                date.setHours(0, 0, 0, 0);
                
                const isPast = date < today;
                const isTooFar = date > maxDate; // Disable dates beyond maxAdvanceDays
                const isToday = date.getTime() === today.getTime();
                const isSelected = BookingState.selectedDate && 
                    BookingState.selectedDate.getTime() === date.getTime();
                const isClosed = isDateClosed(date);
                const isDisabled = isPast || isTooFar || isClosed;
                const hasSlots = !isDisabled && hasAvailableSlots(date);
                
                const btn = createDayButton(day, false, isDisabled, date);
                if (isToday) btn.classList.add('today');
                if (isSelected) btn.classList.add('selected');
                if (!isDisabled) {
                    btn.classList.add(hasSlots ? 'has-slots' : 'no-slots');
                }
                container.appendChild(btn);
            }
            
            // Render next month days to fill grid
            const totalCells = startOffset + daysInMonth;
            const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
            for (let day = 1; day <= remainingCells; day++) {
                const btn = createDayButton(day, true, false, null);
                container.appendChild(btn);
            }
        }

        function createDayButton(day, isOtherMonth, isDisabled, date) {
            const btn = document.createElement('button');
            btn.className = 'calendar-day';
            btn.textContent = day;
            
            if (isOtherMonth) btn.classList.add('other-month', 'disabled');
            if (isDisabled) btn.classList.add('disabled');
            
            if (date && !isDisabled && !isOtherMonth) {
                btn.addEventListener('click', () => selectDate(date, btn));
            }
            
            return btn;
        }

        // ===== CHECK IF DATE IS CLOSED =====
        function isDateClosed(date) {
            const dayOfWeek = date.getDay(); // 0 = Sunday
            const bs = getBookingSettings();

            if (bs) {
                const dateStr = getLocalDateStr(date);

                // Check dateExceptions (public holidays / forced closed days)
                if (bs.dateExceptions && bs.dateExceptions.length > 0) {
                    if (bs.dateExceptions.some(ex => ex.date === dateStr)) return true;
                }

                // Check dateOverrides (a specific date with custom hours → open)
                if (bs.dateOverrides && bs.dateOverrides.length > 0) {
                    if (bs.dateOverrides.some(ov => ov.date === dateStr)) return false;
                }

                // Check workingHoursByDay per-day enabled flag
                const dayData = bs.workingHoursByDay[dayOfWeek];
                if (dayData !== undefined) return !dayData.enabled;

                return false; // no data → assume open
            }

            // Fallback to SITE_CONFIG
            const workingDays = window.SITE_CONFIG?.booking?.workingDays || {};
            const daysClosed = window.SITE_CONFIG?.booking?.daysClosed || [0];
            if (Object.keys(workingDays).length > 0) return !workingDays[dayOfWeek];
            return daysClosed.includes(dayOfWeek);
        }

        // ===== CHECK IF DATE HAS AVAILABLE SLOTS =====
        function hasAvailableSlots(date) {
            const slots = getAvailableSlotsForDate(date);
            return slots.length > 0;
        }

        function getBookingRules() {
            const bs = getBookingSettings();
            const bookingCfg = window.SITE_CONFIG?.booking || {};
            if (bs) {
                return {
                    allowMultiDayAppointments: !!bs.allowMultiDayAppointments,
                    maxAppointmentDays: Math.max(1, parseInt(bs.maxAppointmentDays, 10) || 4),
                    bufferBefore: parseInt(bs.bufferBefore, 10) || 0,
                    bufferAfter: parseInt(bs.bufferAfter, 10) || 0
                };
            }
            return {
                allowMultiDayAppointments: !!bookingCfg.allowMultiDayAppointments,
                maxAppointmentDays: Math.max(1, parseInt(bookingCfg.maxAppointmentDays, 10) || 4),
                bufferBefore: 0,
                bufferAfter: 0
            };
        }

        function toLocalDateKey(dateObj) {
            return getLocalDateStr(dateObj);
        }

        function calculateAppointmentEnd(startDate, durationMinutes) {
            const rules = getBookingRules();
            const workDuration = Math.max(1, parseInt(durationMinutes, 10) || 30);

            let remaining = workDuration;
            let cursor = new Date(startDate);
            const visitedDays = new Set([toLocalDateKey(cursor)]);

            while (remaining > 0) {
                const dayStart = new Date(cursor);
                dayStart.setHours(0, 0, 0, 0);
                const dayOfWeek = dayStart.getDay();
                const dayHours = getBusinessHoursForDay(dayOfWeek, dayStart);

                // Day is closed (null hours or isDateClosed)
                if (!dayHours || isDateClosed(dayStart)) {
                    const nextDay = new Date(dayStart);
                    nextDay.setDate(nextDay.getDate() + 1);
                    nextDay.setHours(0, 0, 0, 0);
                    visitedDays.add(toLocalDateKey(nextDay));
                    if (visitedDays.size > rules.maxAppointmentDays + 1) return null;
                    cursor = nextDay;
                    continue;
                }

                const openAt = new Date(dayStart);
                const openHour = Math.floor(dayHours.start);
                const openMin = Math.round((dayHours.start - openHour) * 60);
                openAt.setHours(openHour, openMin, 0, 0);

                const closeAt = new Date(dayStart);
                const closeHour = Math.floor(dayHours.end);
                const closeMin = Math.round((dayHours.end - closeHour) * 60);
                closeAt.setHours(closeHour, closeMin, 0, 0);

                // effectiveStart is set from cursor (slot start) but at least openAt
                let effectiveStart = new Date(cursor);
                if (effectiveStart < openAt) effectiveStart = new Date(openAt);

                const hasNoWorkingWindow = closeAt <= openAt;

                if (hasNoWorkingWindow || effectiveStart >= closeAt) {
                    const nextDay = new Date(dayStart);
                    nextDay.setDate(nextDay.getDate() + 1);
                    nextDay.setHours(0, 0, 0, 0);
                    visitedDays.add(toLocalDateKey(nextDay));
                    if (visitedDays.size > rules.maxAppointmentDays + 1) return null;
                    cursor = nextDay;
                    continue;
                }

                const availableToday = Math.floor((closeAt - effectiveStart) / 60000);
                if (remaining <= availableToday) {
                    const finalEnd = new Date(effectiveStart);
                    finalEnd.setMinutes(finalEnd.getMinutes() + remaining);

                    if (!rules.allowMultiDayAppointments && toLocalDateKey(finalEnd) !== toLocalDateKey(startDate)) {
                        return null;
                    }
                    return finalEnd;
                }

                remaining -= availableToday;

                const nextDay = new Date(dayStart);
                nextDay.setDate(nextDay.getDate() + 1);
                nextDay.setHours(0, 0, 0, 0);
                visitedDays.add(toLocalDateKey(nextDay));
                if (visitedDays.size > rules.maxAppointmentDays + 1) return null;

                if (!rules.allowMultiDayAppointments) return null;
                // Next day: cursor starts from midnight (will be clamped to openAt)
                cursor = nextDay;
            }

            return null;
        }

        // ===== GET AVAILABLE SLOTS FOR DATE =====
        function getAvailableSlotsForDate(date) {
            // Use local date string (not UTC) to avoid timezone issues
            const dateStr = getLocalDateStr(date);
            const dayOfWeek = date.getDay();
            const rules = getBookingRules();
            
            // Get business hours for this specific day (with date overrides + seasonal)
            const businessHours = getBusinessHoursForDay(dayOfWeek, date);

            // Day is closed
            if (!businessHours || isDateClosed(date)) {
                return [];
            }

            const slotDuration = window.SITE_CONFIG?.booking?.slotDuration || 15;
            const serviceDuration = BookingState.totalDuration || 30;
            
            
            const totalWorkMinutes = Math.max(0, (businessHours.end - businessHours.start) * 60);

            // If service is too long to fit in a day and multi-day is disabled, show no slots
            if (!rules.allowMultiDayAppointments && serviceDuration > totalWorkMinutes) {
                return [];
            }
            
            // Generate all possible slots
            const allSlots = [];
            // Build openAt/closeAt from business hours (supports fractional hours like 9.5 = 09:30)
            const openAtBase = new Date(date);
            const openHour = Math.floor(businessHours.start);
            const openMin = Math.round((businessHours.start - openHour) * 60);
            openAtBase.setHours(openHour, openMin, 0, 0);

            const closeAtBase = new Date(date);
            const closeHour = Math.floor(businessHours.end);
            const closeMin = Math.round((businessHours.end - closeHour) * 60);
            closeAtBase.setHours(closeHour, closeMin, 0, 0);

            for (let t = new Date(openAtBase); t < closeAtBase; t.setMinutes(t.getMinutes() + slotDuration)) {
                const slotStart = new Date(t);
                if (slotStart < openAtBase || slotStart >= closeAtBase) continue;
                
                const slotEnd = calculateAppointmentEnd(slotStart, serviceDuration);
                if (!slotEnd) continue;

                // In single-day mode, keep strict same-day behavior
                if (!rules.allowMultiDayAppointments && getLocalDateStr(slotEnd) !== dateStr) continue;
                
                allSlots.push({
                    start: slotStart,
                    end: slotEnd,
                    timeStr: `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`
                });
            }
            
            
            // Filter out slots that conflict with existing events (with bufferBefore/After padding)
            const _bsSlot = getBookingSettings();
            const _bufBefore = parseInt(_bsSlot?.bufferBefore, 10) || 0;
            const _bufAfter  = parseInt(_bsSlot?.bufferAfter,  10) || 0;
            let availableSlots = allSlots.filter(slot => {
                const checkStart = _bufBefore > 0 ? new Date(slot.start.getTime() - _bufBefore * 60000) : slot.start;
                const checkEnd   = _bufAfter  > 0 ? new Date(slot.end.getTime()   + _bufAfter  * 60000) : slot.end;
                return !hasConflict(checkStart, checkEnd);
            });

            // Filter out slots within minLeadTime minutes from now
            const _minLead = parseInt(_bsSlot?.minLeadTime, 10) || 0;
            if (_minLead > 0) {
                const _earliest = new Date(Date.now() + _minLead * 60000);
                availableSlots = availableSlots.filter(slot => slot.start >= _earliest);
            }
            

            // Filter out slots that overlap with auto-break
            const bs = getBookingSettings();
            if (bs && bs.autoBreak && bs.autoBreak.enabled && bs.autoBreak.start && bs.autoBreak.end) {
                const [bsh, bsm] = bs.autoBreak.start.split(':').map(Number);
                const [beh, bem] = bs.autoBreak.end.split(':').map(Number);
                availableSlots = availableSlots.filter(slot => {
                    const slotDate = new Date(slot.start);
                    slotDate.setHours(0, 0, 0, 0);
                    const breakStart = new Date(slotDate);
                    breakStart.setHours(bsh, bsm, 0, 0);
                    const breakEnd = new Date(slotDate);
                    breakEnd.setHours(beh, bem, 0, 0);
                    // Slot overlaps break if slot.start < breakEnd AND slot.end > breakStart
                    return !(slot.start < breakEnd && slot.end > breakStart);
                });
            }
            
            return availableSlots;
        }

        // ===== CHECK FOR CONFLICTS =====
        function hasConflict(slotStart, slotEnd) {
            // Get the date string for this slot to filter relevant events
            const slotDateStr = getLocalDateStr(slotStart);
            
            for (const event of BookingState.events) {
                try {
                    let eventStart, eventEnd;
                    
                    // Parse event start - handle multiple formats
                    if (event.start instanceof Date) {
                        eventStart = event.start;
                    } else if (typeof event.start === 'string') {
                        eventStart = new Date(event.start);
                    } else if (event.startDate && event.startTime) {
                        const startTimeStr = typeof event.startTime === 'string' ? event.startTime : `${event.startTime}:00`;
                        eventStart = new Date(`${event.startDate}T${startTimeStr}`);
                    } else if (event.startDate) {
                        eventStart = new Date(event.startDate);
                    } else {
                        continue;
                    }
                    
                    // Parse event end - handle multiple formats
                    if (event.end instanceof Date) {
                        eventEnd = event.end;
                    } else if (typeof event.end === 'string') {
                        eventEnd = new Date(event.end);
                    } else if (event.endDate && event.endTime) {
                        const endTimeStr = typeof event.endTime === 'string' ? event.endTime : `${event.endTime}:00`;
                        eventEnd = new Date(`${event.endDate}T${endTimeStr}`);
                    } else if (event.endDate) {
                        eventEnd = new Date(event.endDate);
                        eventEnd.setHours(23, 59, 59, 999);
                    } else {
                        eventEnd = new Date(eventStart);
                        eventEnd.setHours(eventEnd.getHours() + 1);
                    }
                    
                    // Check if times are valid
                    if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
                        continue;
                    }
                    
                    // Check for overlap: (slotStart < eventEnd) && (slotEnd > eventStart)
                    if (slotStart < eventEnd && slotEnd > eventStart) {
                        return true; // Conflict found
                    }
                } catch (err) {
                }
            }
            return false;
        }

        // ===== SELECT DATE =====
        function selectDate(date, button) {
            BookingState.selectedDate = date;
            BookingState.selectedTime = null;
            // Re-evaluate promo discount with the newly selected date
            if (BookingState.selectedServices.length > 0) {
                const _base = BookingState.promoOriginalPrice ?? BookingState.totalPrice;
                const _p = getActivePromo(date);
                BookingState.activePromo = _p;
                BookingState.promoOriginalPrice = (_p && _base > 0) ? _base : null;
                BookingState.totalPrice = (_p && _base > 0)
                    ? Math.round(_base * (1 - _p.discount / 100) * 100) / 100
                    : _base;
                updateSelectionSummary();
            }
            
            // Update calendar UI
            document.querySelectorAll('.calendar-day').forEach(btn => {
                btn.classList.remove('selected');
            });
            if (button) {
                button.classList.add('selected');
            }
            
            // Show time slots
            renderTimeSlots(date);
            
            // Disable next button until time is selected
            document.getElementById('toStep4Btn').disabled = true;
        }

        // ===== RENDER TIME SLOTS =====
        function renderTimeSlots(date) {
            const container = document.getElementById('timeSlotsContainer');
            const grid = document.getElementById('timeSlotsGrid');
            const dateText = document.getElementById('selectedDateText');
            
            container.style.display = 'block';
            grid.innerHTML = '';
            
            // Format date for display
            const day = date.getDate();
            const month = MONTHS_SL[date.getMonth()];
            dateText.textContent = `${day}. ${month}`;
            
            // Get available slots
            const slots = getAvailableSlotsForDate(date);
            const dayOfWeek = date.getDay();
            const businessHours = getBusinessHoursForDay(dayOfWeek, date);
            const totalWorkMinutes = businessHours ? (businessHours.end - businessHours.start) * 60 : 0;
            const serviceDuration = BookingState.totalDuration || 30;
            const bookingRules = getBookingRules();
            
            if (slots.length === 0) {
                // Check if service is too long for business hours
                if (businessHours && !bookingRules.allowMultiDayAppointments && serviceDuration > totalWorkMinutes) {
                    const hours = Math.floor(serviceDuration / 60);
                    const mins = serviceDuration % 60;
                    const hoursLabel = businessHours.startStr
                        ? `${businessHours.startStr} - ${businessHours.endStr}`
                        : `${businessHours.start}:00 - ${businessHours.end}:00`;
                    grid.innerHTML = `
                        <div class="no-slots-message" style="grid-column: 1 / -1;">
                            <div class="icon">⏰</div>
                            <p>Izbrane storitve trajajo <strong>${hours}h ${mins}min</strong>, 
                            kar presega delovni čas (${hoursLabel}).</p>
                            <p style="margin-top: 10px; font-size: 13px;">Prosimo, izberite manj storitev ali nas kontaktirajte za posebno rezervacijo.</p>
                        </div>
                    `;
                } else {
                    grid.innerHTML = `
                        <div class="no-slots-message" style="grid-column: 1 / -1;">
                            <div class="icon">😔</div>
                            <p>Na ta dan ni prostih terminov.<br>Prosimo, izberite drug datum.</p>
                        </div>
                    `;
                }
                return;
            }
            
            // Show info about service duration
            const svcHours = Math.floor(serviceDuration / 60);
            const svcMins = serviceDuration % 60;
            const durationStr = svcHours > 0 ? `${svcHours}h ${svcMins}min` : `${svcMins} min`;
            
            // Add duration info header (no "Večdnevno" text)
            const infoDiv = document.createElement('div');
            infoDiv.className = 'slots-info';
            infoDiv.style.cssText = 'grid-column: 1 / -1; margin-bottom: 12px; padding: 10px; background: rgba(0, 122, 255, 0.1); border-radius: 8px; font-size: 13px; color: var(--ios-blue);';
            infoDiv.innerHTML = `<strong>Trajanje:</strong> ${durationStr}`;
            grid.appendChild(infoDiv);
            
            // Render slots with end time tooltip
            slots.forEach(slot => {
                const btn = document.createElement('button');
                btn.className = 'time-slot';
                
                // Format end time
                const endHour = slot.end.getHours();
                const endMin = slot.end.getMinutes();
                const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
                const endDateStr = getLocalDateStr(slot.end);
                // Use dd/mm/yyyy for end date if it spans to a different day
                const endLabel = (endDateStr === getLocalDateStr(slot.start))
                    ? `→ ${endTimeStr}`
                    : `→ ${formatDateSlash(endDateStr)} ${endTimeStr}`;
                
                btn.innerHTML = `
                    <div class="slot-time">${slot.timeStr}</div>
                    <div class="slot-end" style="font-size: 10px; color: var(--ios-text-tertiary); margin-top: 2px;">${endLabel}</div>
                `;
                btn.addEventListener('click', () => selectTimeSlot(slot, btn));
                grid.appendChild(btn);
            });
        }

        // ===== SELECT TIME SLOT =====
        function selectTimeSlot(slot, button) {
            BookingState.selectedTime = slot;
            
            // Update UI
            document.querySelectorAll('.time-slot').forEach(btn => {
                btn.classList.remove('selected');
            });
            if (button) {
                button.classList.add('selected');
            }
            
            // Enable next button
            document.getElementById('toStep4Btn').disabled = false;
        }

        // ===== NAVIGATION =====
        function goToStep(stepNum) {
            // Hide all steps
            document.querySelectorAll('.booking-step').forEach(step => {
                step.classList.remove('active');
            });
            
            // Show target step
            document.getElementById(`step${stepNum}`).classList.add('active');
            
            // Update step indicators
            document.querySelectorAll('.step-dot').forEach((dot, index) => {
                dot.classList.remove('active', 'completed');
                if (index + 1 < stepNum) {
                    dot.classList.add('completed');
                } else if (index + 1 === stepNum) {
                    dot.classList.add('active');
                }
            });
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // ===== VALIDATE STEP 3 =====
        function validateCustomerInfo() {
            const name = document.getElementById('customerName').value.trim();
            const email = document.getElementById('customerEmail').value.trim();
            const phone = document.getElementById('customerPhone').value.trim();
            
            if (!name) {
                alert('Prosimo, vnesite ime in priimek.');
                return false;
            }
            
            if (!email || !email.includes('@')) {
                alert('Prosimo, vnesite veljavni e-poštni naslov.');
                return false;
            }
            
            if (!phone) {
                alert('Prosimo, vnesite telefonsko številko.');
                return false;
            }
            
            BookingState.customerInfo = {
                name,
                email,
                phone,
                notes: document.getElementById('customerNotes').value.trim(),
                coupon: (document.getElementById('customerCoupon')?.value || '').trim().toUpperCase() || null
            };
            
            return true;
        }

        // ===== UPDATE SUMMARY =====
        function renderWorkerPicker() {
            const bs   = window.SITE_CONFIG?._bookingSettings || {};
            if (bs.autoAssignEmployee !== false) return;
            const teamList = window.SITE_CONFIG?.barbersSection?.list || [];
            if (teamList.length === 0) return;
            const section = document.getElementById('workerPickerSection');
            const grid    = document.getElementById('workerPickerGrid');
            if (!section || !grid) return;
            const hasRealImg = (m) => m.img && m.img !== 'https://via.placeholder.com/300' && m.img.trim() !== '';
            function avatar(w) {
                if (w.id === 'any') {
                    return '<div class="worker-card-initials" style="background:linear-gradient(135deg,#e5e5ea,#d1d1d6);color:#8e8e93;font-size:22px;">&#128101;</div>';
                }
                if (hasRealImg(w)) {
                    const initId = '_wi_' + (w.id || w.name).replace(/[^a-zA-Z0-9]/g,'_');
                    return `<img class="worker-card-avatar" src="${w.img}" alt="${w.name}" onerror="this.style.display='none';document.getElementById('${initId}').style.display='flex'"><div id="${initId}" class="worker-card-initials" style="display:none">${(w.name||'?').charAt(0).toUpperCase()}</div>`;
                }
                return `<div class="worker-card-initials">${(w.name||'?').charAt(0).toUpperCase()}</div>`;
            }
            const workers = [{ id: 'any', name: 'Brez preference', img: '' },
                             ...teamList.map(m => ({ id: m.id || m.name, name: m.name, img: m.img || '' }))];
            grid.innerHTML = workers.map(w =>
                `<div class="worker-card" data-worker-id="${w.id}" data-worker-name="${w.name}" onclick="window.selectWorker(this)">
                    ${avatar(w)}
                    <div class="worker-card-name">${w.name}</div>
                </div>`).join('');
            section.style.display = 'block';
            window.selectWorker(grid.querySelector('[data-worker-id="any"]'));
        }
        window.selectWorker = function selectWorker(el) {
            document.querySelectorAll('.worker-card').forEach(c => c.classList.remove('selected-worker'));
            el.classList.add('selected-worker');
            BookingState.selectedWorker = { id: el.dataset.workerId, name: el.dataset.workerName };
        };
        function updateSummary() {
            // Services
            const servicesNames = BookingState.selectedServices.map(s => s.name).join(', ');
            document.getElementById('summaryServices').textContent = servicesNames || '-';
            
            // Date
            if (BookingState.selectedDate) {
                const d = BookingState.selectedDate;
                document.getElementById('summaryDate').textContent = formatDateSlash(d);
            }
            
            // Time
            if (BookingState.selectedTime) {
                const slotEnd = BookingState.selectedTime.end
                    ? new Date(BookingState.selectedTime.end)
                    : (() => {
                        const fallback = new Date(BookingState.selectedTime.start);
                        fallback.setMinutes(fallback.getMinutes() + BookingState.totalDuration);
                        return fallback;
                    })();
                const endStr = `${String(slotEnd.getHours()).padStart(2, '0')}:${String(slotEnd.getMinutes()).padStart(2, '0')}`;
                const endDateStr = getLocalDateStr(slotEnd);
                const startDateStr = BookingState.selectedDate ? getLocalDateStr(BookingState.selectedDate) : endDateStr;
                document.getElementById('summaryTime').textContent = 
                    (endDateStr !== startDateStr)
                        ? `${BookingState.selectedTime.timeStr} - ${formatDateSlash(endDateStr)} ${endStr}`
                        : `${BookingState.selectedTime.timeStr} - ${endStr}`;
            }
            
            // Duration
            document.getElementById('summaryDuration').textContent = `${BookingState.totalDuration} min`;
            
            // Customer
            document.getElementById('summaryCustomer').textContent = BookingState.customerInfo.name || '-';
            document.getElementById('summaryContact').textContent = 
                `${BookingState.customerInfo.email}\n${BookingState.customerInfo.phone}`;
            // Coupon code row
            const _couponRow = document.getElementById('summaryCouponRow');
            const _couponEl  = document.getElementById('summaryCoupon');
            if (_couponRow && _couponEl) {
                if (BookingState.customerInfo.coupon) {
                    _couponEl.textContent = BookingState.customerInfo.coupon;
                    _couponRow.style.display = '';
                } else {
                    _couponRow.style.display = 'none';
                }
            }
            
            // Total
            const currency = window.SITE_CONFIG?.currency || '€';
            // Show promo row if discount is active
            const _sumPromoRow = document.getElementById('summaryPromoRow');
            if (BookingState.activePromo && BookingState.promoOriginalPrice != null && _sumPromoRow) {
                const _sumPrLabel = document.getElementById('summaryPromoLabel');
                const _sumPrVal   = document.getElementById('summaryPromo');
                const _sumOrigEl  = document.getElementById('summaryOriginalPrice');
                if (_sumPrLabel) _sumPrLabel.textContent = 'Popust';
                if (_sumPrVal)   _sumPrVal.textContent   = `${BookingState.activePromo.label || 'Akcija'} −${BookingState.activePromo.discount}%`;
                if (_sumOrigEl)  _sumOrigEl.textContent  = `${currency}${BookingState.promoOriginalPrice.toFixed(2)}`;
                _sumPromoRow.style.display = '';
            } else if (_sumPromoRow) {
                _sumPromoRow.style.display = 'none';
            }
            // Worker
            const _workerRow = document.getElementById('summaryWorkerRow');
            const _workerEl  = document.getElementById('summaryWorker');
            if (_workerRow && _workerEl) {
                if (BookingState.selectedWorker && BookingState.selectedWorker.id !== 'any') {
                    _workerEl.textContent = BookingState.selectedWorker.name;
                    _workerRow.style.display = '';
                } else {
                    _workerRow.style.display = 'none';
                }
            }
            document.getElementById('summaryTotal').textContent = `${currency}${BookingState.totalPrice.toFixed(2)}`;
        }

        // ===== CONFIRM BOOKING =====
        async function confirmBooking() {
            showLoading(true);
            
            try {
                // Create appointment object - MINIMAL data for lighter database
                const appointmentId = 'apt_' + Date.now();
                
                const startDate = new Date(BookingState.selectedDate);
                startDate.setHours(
                    parseInt(BookingState.selectedTime.timeStr.split(':')[0]),
                    parseInt(BookingState.selectedTime.timeStr.split(':')[1]),
                    0, 0
                );
                
                const endDate = BookingState.selectedTime?.end
                    ? new Date(BookingState.selectedTime.end)
                    : (() => {
                        const fallbackEnd = new Date(startDate);
                        fallbackEnd.setMinutes(fallbackEnd.getMinutes() + BookingState.totalDuration);
                        return fallbackEnd;
                    })();
                
                // Build minimal appointment object
                const appointment = {
                    id: appointmentId,
                    type: 'booking',
                    title: BookingState.customerInfo.name,
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    extendedProps: {
                        customer: BookingState.customerInfo.name,
                        email: BookingState.customerInfo.email,
                        phone: BookingState.customerInfo.phone,
                        services: BookingState.selectedServices.map(s => s.name),
                        price: BookingState.totalPrice
                    }
                };
                
                // Only add notes if not empty
                if (BookingState.customerInfo.notes && BookingState.customerInfo.notes.trim()) {
                    appointment.extendedProps.notes = BookingState.customerInfo.notes.trim();
                }
                // Only add coupon if provided
                if (BookingState.customerInfo.coupon) {
                    appointment.extendedProps.coupon = BookingState.customerInfo.coupon;
                }
                
                // Add worker assignment if not "any preference"
                if (BookingState.selectedWorker && BookingState.selectedWorker.id !== 'any') {
                    appointment.extendedProps.worker     = BookingState.selectedWorker.id;
                    appointment.extendedProps.workerName = BookingState.selectedWorker.name;
                }
                
                // Load current schedule and add appointment
                let scheduleData = await StorageManager.load('schedule') || { events: [] };
                if (!Array.isArray(scheduleData.events)) {
                    scheduleData.events = [];
                }
                scheduleData.events.push(appointment);
                
                // Save
                await StorageManager.save('schedule', scheduleData);
                
                const manageBaseUrl = (window.SMSHandler && window.SMSHandler.config && window.SMSHandler.config.productionUrl)
                    ? window.SMSHandler.config.productionUrl
                    : window.location.origin;
                const manageLink = `${manageBaseUrl}/manage-appointment.html?id=${appointment.id}`;
                
                // Send SMS confirmation if phone number provided
                if (BookingState.customerInfo.phone) {
                    try {
                        const appointmentForSMS = {
                            id: appointment.id,
                            phoneNumber: BookingState.customerInfo.phone,
                            start: appointment.start,
                            customer: BookingState.customerInfo.name,
                            services: BookingState.selectedServices.map(s => s.name)
                        };
                        
                        if (window.SMSHandler && typeof window.SMSHandler.sendAppointmentConfirmation === 'function') {
                            window.SMSHandler.sendAppointmentConfirmation(appointmentForSMS);
                        }
                    } catch (smsError) {
                    }
                }
                
                // Go to success step
                goToStep(6);
                
                // Fire confetti celebration! 🎉
                if (typeof fireConfetti === 'function') {
                    fireConfetti();
                }
                
            } catch (err) {
                alert('Prišlo je do napake. Prosimo, poskusite znova.');
            }
            
            showLoading(false);
        }

// ===== STEP NAVIGATION HELPERS =====
        function workerStepActive() {
            const bs = window.SITE_CONFIG?._bookingSettings || {};
            const teamList = window.SITE_CONFIG?.barbersSection?.list || [];
            return bs.autoAssignEmployee === false && teamList.length > 0;
        }

        // ===== EVENT LISTENERS =====
        function setupEventListeners() {
            // Step navigation
            document.getElementById('toStep2Btn').addEventListener('click', () => {
                if (BookingState.selectedServices.length > 0) {
                    if (workerStepActive()) {
                        goToStep(2);
                    } else {
                        goToStep(3);
                        renderCalendar();
                    }
                }
            });

            document.getElementById('backToStep1FromWorker').addEventListener('click', () => goToStep(1));

            document.getElementById('toStep3FromWorker').addEventListener('click', () => {
                goToStep(3);
                renderCalendar();
            });

            document.getElementById('backToStep2').addEventListener('click', () => {
                if (workerStepActive()) {
                    goToStep(2);
                } else {
                    goToStep(1);
                }
            });

            document.getElementById('toStep4Btn').addEventListener('click', () => {
                if (BookingState.selectedDate && BookingState.selectedTime) {
                    goToStep(4);
                }
            });

            document.getElementById('backToStep3').addEventListener('click', () => goToStep(3));

            document.getElementById('toStep5Btn').addEventListener('click', () => {
                if (validateCustomerInfo()) {
                    updateSummary();
                    goToStep(5);
                }
            });

            document.getElementById('backToStep4').addEventListener('click', () => goToStep(4));
            
            document.getElementById('confirmBookingBtn').addEventListener('click', confirmBooking);
            
            // Calendar navigation
            document.getElementById('prevMonth').addEventListener('click', () => {
                // Don't go before current month
                const now = new Date();
                const currentViewMonth = new Date(BookingState.currentMonth.getFullYear(), BookingState.currentMonth.getMonth(), 1);
                const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                if (currentViewMonth > thisMonth) {
                    BookingState.currentMonth.setMonth(BookingState.currentMonth.getMonth() - 1);
                    renderCalendar();
                    updateNavigationButtons();
                }
            });
            
            document.getElementById('nextMonth').addEventListener('click', () => {
                // Don't go more than 2 months ahead
                const now = new Date();
                const maxMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);
                const nextViewMonth = new Date(BookingState.currentMonth.getFullYear(), BookingState.currentMonth.getMonth() + 1, 1);
                if (nextViewMonth <= maxMonth) {
                    BookingState.currentMonth.setMonth(BookingState.currentMonth.getMonth() + 1);
                    renderCalendar();
                    updateNavigationButtons();
                }
            });
            
            // Update navigation button states
            function updateNavigationButtons() {
                const now = new Date();
                const currentViewMonth = new Date(BookingState.currentMonth.getFullYear(), BookingState.currentMonth.getMonth(), 1);
                const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const maxMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);
                
                const prevBtn = document.getElementById('prevMonth');
                const nextBtn = document.getElementById('nextMonth');
                
                // Disable prev if at current month
                prevBtn.disabled = currentViewMonth <= thisMonth;
                prevBtn.style.opacity = prevBtn.disabled ? '0.3' : '1';
                prevBtn.style.cursor = prevBtn.disabled ? 'not-allowed' : 'pointer';
                
                // Disable next if at max month (2 months ahead)
                nextBtn.disabled = currentViewMonth >= maxMonth;
                nextBtn.style.opacity = nextBtn.disabled ? '0.3' : '1';
                nextBtn.style.cursor = nextBtn.disabled ? 'not-allowed' : 'pointer';
            }
            
            // Initial button state update
            updateNavigationButtons();
        }
