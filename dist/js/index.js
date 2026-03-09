        // ============================================
        // SITE INITIALIZATION
        // ============================================
        
        async function loadSavedConfig() {
            const saved = localStorage.getItem('site_config_backup');
            if (saved) {
                try {
                    const config = JSON.parse(saved);
                    Object.assign(SITE_CONFIG, config);
                    applyThemeColors();
                } catch (e) {
                }
            }
        }
        
        function applyThemeColors() {
            const t = SITE_CONFIG.theme || {};
            const root = document.documentElement;
            
            // Map config theme to CSS variables
            const primary = t.primary || '#007AFF';
            root.style.setProperty('--accent', primary);
            
            // Extract RGB for box-shadow alpha
            const hex2rgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 122, 255';
            };
            const hexToRgbObj = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result
                    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
                    : { r: 0, g: 0, b: 0 };
            };
            const luminance = (hex) => {
                const { r, g, b } = hexToRgbObj(hex);
                const srgb = [r, g, b].map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
                return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
            };
            const isLight = (hex) => luminance(hex) > 0.6;
            root.style.setProperty('--accent-rgb', hex2rgb(primary));
            root.style.setProperty('--accent-light', `${primary}15`);
            
            // Background colors
            const mode = t.mode || '';
            const bgPrimary = mode === 'light'
                ? '#FFFFFF'
                : (mode === 'dark' ? '#0A0A0A' : (t.dark || '#0A0A0A'));
            const bgSecondary = mode === 'light'
                ? '#F2F2F7'
                : (mode === 'dark' ? '#141414' : (t.card || '#141414'));
            const lightTheme = isLight(bgPrimary);
            root.style.setProperty('--bg-primary', bgPrimary);
            root.style.setProperty('--bg-secondary', bgSecondary);
            root.style.setProperty('--bg-tertiary', lightTheme ? '#F2F2F7' : '#1C1C1E');
            
            // Text colors
            const textPrimary = t.textPrimary || (lightTheme ? '#1C1C1E' : '#FFFFFF');
            const textSecondary = t.textSecondary || (lightTheme ? '#6E6E73' : '#8E8E93');
            const textTertiary = t.textTertiary || (lightTheme ? '#8E8E93' : '#636366');
            root.style.setProperty('--text-primary', textPrimary);
            root.style.setProperty('--text-secondary', textSecondary);
            root.style.setProperty('--text-tertiary', textTertiary);
            root.style.setProperty('--text-on-hero', t.textOnHero || '#FFFFFF');
            root.style.setProperty('--text-on-light', t.textOnLight || (lightTheme ? '#1C1C1E' : '#0A0A0A'));
            root.style.setProperty('--border-color', lightTheme ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)');
            root.style.setProperty('--border-hover', lightTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)');
            root.style.setProperty('--glass-bg', lightTheme ? 'rgba(255, 255, 255, 0.85)' : 'rgba(28, 28, 30, 0.85)');
            
            // Gradient colors
            root.style.setProperty('--gradient-start', t.gradientStart || primary);
            root.style.setProperty('--gradient-end', t.gradientEnd || '#5AC8FA');
            
            // Button colors
            root.style.setProperty('--button-color', t.buttonColor || primary);
            root.style.setProperty('--button-text-color', t.buttonTextColor || '#FFFFFF');
            
            // Navigation colors
            const navTop = t.navTextColorTop || (lightTheme ? '#FFFFFF' : (t.textPrimary || '#FFFFFF'));
            const navScrolled = t.navTextColorScrolled || (lightTheme ? '#1C1C1E' : textSecondary);
            root.style.setProperty('--nav-text-color', t.navTextColor || '#8E8E93');
            root.style.setProperty('--nav-text-color-top', navTop);
            root.style.setProperty('--nav-text-color-scrolled', navScrolled);
            root.style.setProperty('--nav-hover-color', t.navHoverColor || primary);
            
            // Footer colors
            root.style.setProperty('--footer-bg-color', t.footerBgColor || '#0A0A0A');
            root.style.setProperty('--footer-text-color', t.footerTextColor || '#636366');
            
            // Subtitle (hero-sub) color - uses primary accent
            root.style.setProperty('--subtitle-color', t.primary || primary);
            root.style.setProperty('--color-primary', t.primary || primary);
            root.style.setProperty('--color-dark', bgPrimary);
            root.style.setProperty('--color-card', bgSecondary);
            root.style.setProperty('--text-gold', t.primary || primary);
            root.style.setProperty('--text-primary', textPrimary);
            root.style.setProperty('--text-secondary', textSecondary);
            
            // Scrollbar colors - uses config values or primary accent
            root.style.setProperty('--scrollbar-track', t.scrollbarTrack || (lightTheme ? '#F2F2F7' : (t.dark || '#1C1C1E')));
            root.style.setProperty('--scrollbar-thumb', t.scrollbarThumb || primary);
        }
        
        async function loadFromFirebase() {
            try {
                if (window.CloudSync && typeof window.CloudSync.loadFromCloud === 'function') {
                    const sdkLoaded = await window.CloudSync.loadFromCloud();
                    if (sdkLoaded) {
                        // Sync window.SITE_CONFIG (set by CloudSync) into the lexical SITE_CONFIG
                        if (window.SITE_CONFIG && typeof window.SITE_CONFIG === 'object') {
                            Object.assign(SITE_CONFIG, window.SITE_CONFIG);
                            applyThemeColors();
                        }
                        // Extract _bookingSettings embedded in site_config
                        if (SITE_CONFIG._bookingSettings && typeof SITE_CONFIG._bookingSettings === 'object') {
                            localStorage.setItem('bookingSettings', JSON.stringify(SITE_CONFIG._bookingSettings));
                        }
                        return true;
                    }
                }

                // Add timestamp to force fresh data and bypass cache
                const timestamp = new Date().getTime();
                const dbUrl = `https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/site_config.json?_t=${timestamp}`;
                const response = await fetch(dbUrl, { 
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });
                if (response.ok) {
                    const cloudConfig = await response.json();
                    if (cloudConfig) {
                        Object.assign(SITE_CONFIG, cloudConfig);
                        window.SITE_CONFIG = SITE_CONFIG;
                        localStorage.setItem('site_config_backup', JSON.stringify(SITE_CONFIG));
                        return true;
                    }
                } else {
                }
            } catch (error) {
                if (error && error.message) {
                }
            }
            return false;
        }
        
        function renderSiteContent() {
            // Page title & favicon
            document.title = SITE_CONFIG.shopName + ' | Professional Services';
            const favicon = document.getElementById('favicon');
            if (SITE_CONFIG.logo && SITE_CONFIG.logo.mini) {
                favicon.href = SITE_CONFIG.logo.mini;
            }
            
            // Apply theme colors
            applyThemeColors();
            
            // Logo
            const logoEl = document.getElementById('logo-text');
            const showLogo = SITE_CONFIG.logo && SITE_CONFIG.logo.showLogo !== false;
            if (showLogo && SITE_CONFIG.logo && SITE_CONFIG.logo.large) {
                logoEl.innerHTML = `<img src="${SITE_CONFIG.logo.large}" alt="${SITE_CONFIG.shopName}">`;
            } else {
                logoEl.innerText = SITE_CONFIG.shopName;
            }
            
            // Hero
            document.getElementById('hero-sub').innerText = SITE_CONFIG.hero.subtitle;
            document.getElementById('hero-main').innerText = SITE_CONFIG.hero.title;
            const heroBtnSpan = document.getElementById('hero-btn').querySelector('span');
            if (heroBtnSpan) heroBtnSpan.innerText = SITE_CONFIG.hero.buttonText || 'Rezerviraj Termin';
            document.getElementById('hero-img-src').src = SITE_CONFIG.hero.backgroundImage;
            
            // About
            document.getElementById('story-section-label').innerText = SITE_CONFIG.ourStory.sectionTitle;
            document.getElementById('story-title').innerText = SITE_CONFIG.ourStory.title;
            document.getElementById('story-text').innerText = SITE_CONFIG.ourStory.text;
            document.getElementById('story-img').src = SITE_CONFIG.ourStory.image;
            
            // Testimonial
            document.getElementById('test-quote').innerText = SITE_CONFIG.testimonial.quote;
            document.getElementById('test-author').innerText = `— ${SITE_CONFIG.testimonial.author}`;
            
            // Navigation links
            const navContainer = document.getElementById('nav-links-container');
            navContainer.innerHTML = '';
            (SITE_CONFIG.navLinks || []).forEach(item => {
                const link = document.createElement('a');
                link.href = item.link;
                link.innerText = item.name;
                navContainer.appendChild(link);
            });
            document.getElementById('nav-book-btn').innerText = SITE_CONFIG.navButtonText;
            
            // Services
            document.getElementById('services-title').innerText = SITE_CONFIG.servicesSection.title;
            const servicesList = document.getElementById('services-list');
            servicesList.innerHTML = '';
            // Resolve active promo for today
            const _todayPromo = (() => {
                try {
                    const _bs = JSON.parse(localStorage.getItem('bookingSettings') || '{}');
                    const _ps = Array.isArray(_bs.promoIntervals) ? _bs.promoIntervals : [];
                    if (!_ps.length) return null;
                    const _n = new Date();
                    const _ds = _n.getFullYear() + '-' + String(_n.getMonth()+1).padStart(2,'0') + '-' + String(_n.getDate()).padStart(2,'0');
                    return _ps.find(p => p.from <= _ds && _ds <= p.to) || null;
                } catch(_) { return null; }
            })();
            // Show/hide promo banner
            const _promoBannerEl = document.getElementById('promoBanner');
            if (_todayPromo && _promoBannerEl) {
                _promoBannerEl.innerHTML = `<span class="promo-banner-tag">🏷 ${_todayPromo.label || 'Akcija'}</span> <strong>${_todayPromo.discount}% popust</strong> na vse storitve &ndash; do ${_todayPromo.to}!`;
                _promoBannerEl.style.display = '';
            } else if (_promoBannerEl) {
                _promoBannerEl.style.display = 'none';
            }
            // Top announcement banner
            const _tbEl = document.getElementById('topPromoBanner');
            if (_tbEl) {
                if (_todayPromo) {
                    const _msg = (_todayPromo.bannerText || '').trim();
                    _tbEl.innerHTML = `<span class="tpb-tag">🏷 ${_todayPromo.label || 'Akcija'}</span>${_msg ? _msg : `<strong>−${_todayPromo.discount}%</strong> popust na vse storitve — do ${_todayPromo.to}`}<button class="tpb-close" onclick="this.parentElement.style.display='none';document.documentElement.style.setProperty('--banner-height','0px');" aria-label="Zapri">&times;</button>`;
                    _tbEl.style.display = 'block';
                    requestAnimationFrame(() => document.documentElement.style.setProperty('--banner-height', _tbEl.offsetHeight + 'px'));
                } else {
                    _tbEl.style.display = 'none';
                    document.documentElement.style.setProperty('--banner-height', '0px');
                }
            }
            (SITE_CONFIG.servicesSection?.items || []).forEach(s => {
                const item = document.createElement('div');
                item.className = 'service-item';
                const _rawPrice = parseFloat(String(s.price || '0').replace(/[^0-9.,]/g,'').replace(',','.')) || 0;
                let _priceHTML;
                if (_todayPromo && _rawPrice > 0) {
                    const _disc = Math.round(_rawPrice * (1 - _todayPromo.discount / 100) * 100) / 100;
                    _priceHTML = `<div class="service-price-wrap"><span class="service-price-original">${_rawPrice.toFixed(2)}€</span><span class="service-price">${_disc.toFixed(2)}€</span></div>`;
                } else {
                    _priceHTML = `<span class="service-price">${s.price}€</span>`;
                }
                item.innerHTML = `
                    <div class="service-info">
                        <h4>${s.name}</h4>
                        <p>${s.desc}</p>
                    </div>
                    ${_priceHTML}
                `;
                servicesList.appendChild(item);
            });
            
            // Team
            document.getElementById('barbers-title').innerText = SITE_CONFIG.barbersSection.title;
            const barbersList = document.getElementById('barbers-list');
            barbersList.innerHTML = '';
            (SITE_CONFIG.barbersSection?.list || []).forEach(b => {
                const member = document.createElement('div');
                member.className = 'team-member';
                member.innerHTML = `
                    <div class="team-member-image">
                        <img src="${b.img}" alt="${b.name}">
                    </div>
                    <h4>${b.name}</h4>
                    <p>${b.role}</p>
                `;
                barbersList.appendChild(member);
            });
            
            // Gallery
            const galleryTitle = document.getElementById('gallery-title');
            if (galleryTitle) {
                galleryTitle.innerText = SITE_CONFIG.galleryTitle || 'Galerija';
            }
            const galleryList = document.getElementById('gallery-list');
            galleryList.innerHTML = '';
            (SITE_CONFIG.gallery || []).forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.src = img;
                imgEl.alt = 'Gallery Image';
                galleryList.appendChild(imgEl);
            });
            
            // Footer
            document.getElementById('footer-brand').innerText = SITE_CONFIG.shopName;
            const footerLinks = document.getElementById('footer-links');
            footerLinks.innerHTML = '';
            (SITE_CONFIG.navLinks || []).forEach(item => {
                const link = document.createElement('a');
                link.href = item.link;
                link.innerText = item.name;
                footerLinks.appendChild(link);
            });
            const footerCopyText = SITE_CONFIG.footerCopy || 'Vse pravice pridržane.';
            document.getElementById('footer-copy').innerHTML = `© ${new Date().getFullYear()} ${SITE_CONFIG.shopName}. ${footerCopyText}`;
            
            // CTA Section
            if (SITE_CONFIG.ctaSection) {
                document.getElementById('cta-title').innerText = SITE_CONFIG.ctaSection.title || 'Pripravljeni na Spremembo?';
                document.getElementById('cta-text').innerText = SITE_CONFIG.ctaSection.text || 'Rezervirajte svoj termin danes in doživite našo profesionalno storitev.';
                document.getElementById('cta-button-text').innerText = SITE_CONFIG.ctaSection.buttonText || 'Rezerviraj Zdaj';
            }

            // Contact Section
            const contact = SITE_CONFIG.contactSection || {};
            const owner = SITE_CONFIG.ownerContact || {};
            const contactTitleEl = document.getElementById('contact-title');
            const contactSubtitleEl = document.getElementById('contact-subtitle');
            const contactAddressEl = document.getElementById('contact-address');
            const contactPhoneEl = document.getElementById('contact-phone');
            const contactEmailEl = document.getElementById('contact-email');
            if (contactTitleEl) contactTitleEl.innerText = contact.title || 'Kontakt';
            if (contactSubtitleEl) contactSubtitleEl.innerText = contact.subtitle || 'Pišite ali nas pokličite za termin.';
            if (contactAddressEl) contactAddressEl.innerText = contact.address || '—';
            if (contactPhoneEl) contactPhoneEl.innerText = contact.phone || owner.phone || '—';
            if (contactEmailEl) contactEmailEl.innerText = contact.email || owner.email || '—';

            // Google Reviews
            const reviews = SITE_CONFIG.googleReviews || {};
            const reviewsTitle = document.getElementById('reviews-title');
            const reviewsSubtitle = document.getElementById('reviews-subtitle');
            const reviewsRating = document.getElementById('reviews-rating');
            const reviewsCount = document.getElementById('reviews-count');
            const reviewsLink = document.getElementById('reviews-link');
            const reviewsGrid = document.getElementById('reviews-grid');
            if (reviewsTitle) reviewsTitle.innerText = reviews.title || 'Google ocene';
            if (reviewsSubtitle) reviewsSubtitle.innerText = reviews.subtitle || 'Preveri mnenja naših strank.';
            if (reviewsRating) reviewsRating.innerText = reviews.rating || '5.0';
            if (reviewsCount) reviewsCount.innerText = reviews.countText || '(120 ocen)';
            if (reviewsLink) {
                reviewsLink.href = reviews.link || '#';
                reviewsLink.style.display = reviews.link ? 'inline' : 'none';
            }
            if (reviewsGrid) {
                const list = Array.isArray(reviews.items) ? reviews.items : [];
                reviewsGrid.innerHTML = '';
                list.forEach(r => {
                    const card = document.createElement('div');
                    card.className = 'review-card glass-card';
                    const stars = '★★★★★'.slice(0, Math.max(1, Math.min(5, r.stars || 5)));
                    card.innerHTML = `
                        <div class="review-stars">${stars}</div>
                        <div class="review-text">${r.text || ''}</div>
                        <div class="review-author">${r.author || ''}</div>
                    `;
                    reviewsGrid.appendChild(card);
                });
            }

            // Business hours section
            const hoursSection = SITE_CONFIG.businessHoursSection || {};
            const hoursTitle = hoursSection.title || 'Urnik dela';
            const hoursSubtitle = hoursSection.subtitle || 'Nastavi svoje delovne dneve in ure';
            const hoursLabel = hoursSection.hoursLabel || 'Delovni čas';
            const daysLabel = hoursSection.daysLabel || 'Delovni dnevi';
            const dayNamesFull = ['Nedelja', 'Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota'];

            const hoursTitleEl = document.getElementById('businessHoursTitle');
            const hoursSubtitleEl = document.getElementById('businessHoursSubtitle');
            const hoursLabelEl = document.getElementById('businessHoursLabel');
            const daysLabelEl = document.getElementById('workingDaysLabel');
            const tableBody = document.getElementById('businessHoursTableBody');

            if (hoursTitleEl) hoursTitleEl.innerText = hoursTitle;
            if (hoursSubtitleEl) hoursSubtitleEl.innerText = hoursSubtitle;
            if (hoursLabelEl) hoursLabelEl.innerText = hoursLabel;
            if (daysLabelEl) daysLabelEl.innerText = daysLabel;

            if (tableBody) {
                tableBody.innerHTML = '';
                // Prefer saved poslovni-panel workingHoursByDay over static SITE_CONFIG
                let _wbd = null;
                try {
                    const _bs = JSON.parse(localStorage.getItem('bookingSettings') || 'null');
                    _wbd = (_bs && _bs.workingHoursByDay) ? _bs.workingHoursByDay : null;
                } catch(_){}
                const _displayOrder = [1,2,3,4,5,6,0];
                if (_wbd) {
                    _displayOrder.forEach(i => {
                        const d = _wbd[i] || { enabled: false, start: '09:00', end: '19:00' };
                        const timeText = d.enabled ? `${d.start} - ${d.end}` : 'Zaprto';
                        const row = document.createElement('div');
                        row.className = 'bh-row';
                        row.innerHTML = `<div class="bh-cell">${dayNamesFull[i]}</div><div class="bh-cell">${timeText}</div>`;
                        tableBody.appendChild(row);
                    });
                } else {
                    const businessHours = SITE_CONFIG.booking?.businessHours || { start: 9, end: 19 };
                    const workingDays = SITE_CONFIG.booking?.workingDays || {};
                    const daysClosed = SITE_CONFIG.booking?.daysClosed || [0];
                    const perDayHours = SITE_CONFIG.booking?.hours || {};
                    _displayOrder.forEach(i => {
                        const isWorking = workingDays[i] || !daysClosed.includes(i);
                        const dayHours = perDayHours[i] || {};
                        const start = (dayHours.start ?? businessHours.start) ?? 9;
                        const end = (dayHours.end ?? businessHours.end) ?? 19;
                        const timeText = isWorking ? `${start}:00 - ${end}:00` : 'Zaprto';
                        const row = document.createElement('div');
                        row.className = 'bh-row';
                        row.innerHTML = `<div class="bh-cell">${dayNamesFull[i]}</div><div class="bh-cell">${timeText}</div>`;
                        tableBody.appendChild(row);
                    });
                }
            }

            // Apply hidden sections from admin config
            const _hiddenSections = Array.isArray(SITE_CONFIG.hiddenSections) ? SITE_CONFIG.hiddenSections : [];
            _hiddenSections.forEach(sel => {
                try {
                    const el = document.querySelector(sel);
                    if (el) el.style.display = 'none';
                } catch(_) {}
            });
        }
        
        async function initSite() {
            // Try Firebase first, fall back to localStorage only if Firebase fails
            const firebaseLoaded = await loadFromFirebase();
            if (!firebaseLoaded) {
                await loadSavedConfig();
            }
            // Extract _bookingSettings from loaded site_config
            try {
                const _sc = JSON.parse(localStorage.getItem('site_config_backup') || '{}');
                if (_sc._bookingSettings && typeof _sc._bookingSettings === 'object') {
                    localStorage.setItem('bookingSettings', JSON.stringify(_sc._bookingSettings));
                }
            } catch(_) {}
            renderSiteContent();
        }
        
        // ============================================
        // CURSOR
        // ============================================
        const cursor = document.getElementById('cursor');
        
        if (cursor && window.matchMedia('(hover: hover)').matches && window.innerWidth > 768) {
            document.addEventListener('mousemove', e => {
                cursor.style.left = e.clientX + 'px';
                cursor.style.top = e.clientY + 'px';
            });
            
            function addCursorHover() {
                document.querySelectorAll('a, button, .service-item, .team-member, #gallery-list img').forEach(el => {
                    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
                    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
                });
            }
            
            // Add after content loads
            setTimeout(addCursorHover, 500);
        }
        
        // ============================================
        // REVEAL ANIMATION
        // ============================================
        function reveal() {
            document.querySelectorAll('.reveal').forEach(el => {
                const windowHeight = window.innerHeight;
                const elementTop = el.getBoundingClientRect().top;
                const revealPoint = 100;
                
                if (elementTop < windowHeight - revealPoint) {
                    el.classList.add('active');
                }
            });
        }
        
        // ============================================
        // SCROLL EFFECTS
        // ============================================
        let ticking = false;
        
        function onScroll() {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    // Nav background
                    const nav = document.getElementById('main-nav');
                    if (window.scrollY > 50) {
                        nav.classList.add('scrolled');
                    } else {
                        nav.classList.remove('scrolled');
                    }
                    
                    // Hero parallax
                    const heroImg = document.getElementById('hero-img-src');
                    if (heroImg && window.scrollY < window.innerHeight) {
                        heroImg.style.transform = `scale(1.05) translateY(${window.scrollY * 0.15}px)`;
                    }
                    
                    reveal();
                    ticking = false;
                });
                ticking = true;
            }
        }
        
        window.addEventListener('scroll', onScroll, { passive: true });
        
        // ============================================
        // INIT
        // ============================================
        initSite();
        reveal();
