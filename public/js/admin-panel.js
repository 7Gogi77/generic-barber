        // ===== GLOBAL DELETION TRACKING SYSTEM (duplicated from poslovni-panel for admin context) =====
        let deletedEventIds = new Set();

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

        function saveDeletedEventIds() {
            try {
                localStorage.setItem('schedule_deleted_ids', JSON.stringify(Array.from(deletedEventIds)));
            } catch (e) {}
        }

        function markEventDeleted(eventId) {
            deletedEventIds.add(eventId);
            saveDeletedEventIds();
        }

        function isEventDeleted(eventId) {
            return deletedEventIds.has(eventId);
        }

        function filterDeletedEvents(events) {
            if (!Array.isArray(events)) return [];
            return events.filter(e => !deletedEventIds.has(e.id));
        }

        // Initialize on page load
        loadDeletedEventIds();
        
        // Expose to window for calendar-engine.js
        window.markEventDeleted = markEventDeleted;
        window.isEventDeleted = isEventDeleted;
        window.filterDeletedEvents = filterDeletedEvents;
        window.loadDeletedEventIds = loadDeletedEventIds;
        window.saveDeletedEventIds = saveDeletedEventIds;
        // Tab switching function (sidebar navigation)
        function switchTab(event, tabName) {
            event.preventDefault();

            // Hide all tabs
            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => tab.classList.remove('active'));

            // Remove active from all sidebar icons
            const buttons = document.querySelectorAll('.nav-icon');
            buttons.forEach(btn => btn.classList.remove('active'));

            // Show selected tab and activate button
            const selectedTab = document.getElementById(tabName);
            if (selectedTab) {
                selectedTab.classList.add('active');
            }
            if (event.currentTarget) {
                event.currentTarget.classList.add('active');
            }
        }

        // Sidebar toggle (match poslovni-panel UX)
        document.addEventListener('DOMContentLoaded', () => {
            const sidebar = document.getElementById('adminSidebar');
            const toggle = document.getElementById('adminSidebarToggle');
            if (toggle && sidebar) {
                toggle.addEventListener('click', () => sidebar.classList.toggle('expanded'));
            }
        });

        // Initialize admin credentials
        window.ADMIN_ENV = {
            passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
            username: "admin",
            maxAttempts: 3,
            lockoutDuration: 60000,
            enabled: true
        };
        window.ADMIN_ENV_PROMISE = Promise.resolve(window.ADMIN_ENV);

        async function hashPassword(password) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }

        async function getAdminCredentials() {
            if (window.ADMIN_ENV) {
                return window.ADMIN_ENV;
            }
            if (window.ADMIN_ENV_PROMISE) {
                try {
                    return await window.ADMIN_ENV_PROMISE;
                } catch (error) {}
            }
            return null;
        }

        // Build-time admin login (uses admin-env.json, no API call)
        async function handleLogin(e) {
            e.preventDefault();
            const password = document.getElementById('adminPassword') ? document.getElementById('adminPassword').value : '';
            const errorEl = document.getElementById('loginError');

            if (!password) {
                if (errorEl) {
                    errorEl.textContent = 'Prosimo vnesite geslo.';
                    errorEl.style.display = 'block';
                }
                return;
            }

            const credentials = await getAdminCredentials();
            if (!credentials || !credentials.passwordHash) {
                if (errorEl) {
                    errorEl.textContent = 'Admin okolje ni nastavljeno.';
                    errorEl.style.display = 'block';
                }
                return;
            }

            try {
                const passwordHash = await hashPassword(password);
                if (passwordHash !== credentials.passwordHash) {
                    if (errorEl) {
                        errorEl.textContent = 'Napačno geslo';
                        errorEl.style.display = 'block';
                    }
                    return;
                }

                sessionStorage.setItem('admin_token', `local-${Date.now()}`);
                sessionStorage.setItem('admin_authenticated', 'true');
                sessionStorage.setItem('admin_session_time', Date.now().toString());
                const loginScreen = document.getElementById('loginScreen');
                if (loginScreen) loginScreen.style.display = 'none';
                const panel = document.getElementById('adminPanel');
                if (panel) panel.classList.add('active');
                if (typeof loadAdminForms === 'function') loadAdminForms();
                if (errorEl) errorEl.style.display = 'none';
            } catch (err) {
                if (errorEl) {
                    errorEl.textContent = 'Napaka pri prijavi';
                    errorEl.style.display = 'block';
                }
            }
        }

        // Logout clears stored admin token and reloads
        function handleLogout() {
            sessionStorage.removeItem('admin_token');
            location.reload();
        }

        // Save all helper for non-technical users — calls known save functions if present
        function saveAll() {
            try {
                if (typeof saveBookingPageContent === 'function') saveBookingPageContent();
                if (typeof saveBooking === 'function') saveBooking();
                if (typeof saveSiteConfig === 'function') saveSiteConfig();
                if (typeof saveContactSection === 'function') saveContactSection();
                if (typeof saveReviewsSection === 'function') saveReviewsSection();
                // Provide immediate feedback
                const el = document.getElementById('adminQuickStart');
                if (el) {
                    el.textContent = 'Shranjeno — preverite konzolo za napake, če obstajajo.';
                    setTimeout(() => { el.textContent = 'Koraki: 1) Če prvič, ustvarite geslo spodaj → 2) Prijavite se → 3) Uredite vsebine → 4) Kliknite "Shrani vse"'; }, 3000);
                }
            } catch (err) {
                alert('Prišlo je do napake pri shranjevanju. Preverite konzolo.');
            }
        }

        // Template presets
        const TEMPLATE_PRESETS = {
            barber: {
                shopName: 'Gentlemen’s Barber',
                navLinks: [
                    { name: 'Domov', link: '#home' },
                    { name: 'O nas', link: '#about' },
                    { name: 'Storitve', link: '#services' },
                    { name: 'Ekipa', link: '#barbers' },
                    { name: 'Galerija', link: '#gallery' }
                ],
                galleryTitle: 'Galerija',
                contactSection: {
                    title: 'Kontakt',
                    subtitle: 'Pišite ali nas pokličite za termin.',
                    address: 'Stara ulica 10, Ljubljana',
                    phone: '+386 40 111 222',
                    email: 'info@barber.si'
                },
                googleReviews: {
                    title: 'Google ocene',
                    subtitle: 'Preveri mnenja naših strank.',
                    rating: '5.0',
                    countText: '(120 ocen)',
                    link: '',
                    items: [
                        { author: 'Ana K.', text: 'Odlična storitev in vzdušje.', stars: 5 },
                        { author: 'Marko P.', text: 'Vrhunska ekipa, priporočam!', stars: 5 },
                        { author: 'Sara M.', text: 'Super izkušnja, pridem spet.', stars: 5 }
                    ]
                },
                theme: {
                    primary: '#CDAA54',
                    gradientStart: '#CDAA54',
                    gradientEnd: '#8C6B2B',
                    textPrimary: '#FFFFFF',
                    textSecondary: '#C7C7CC',
                    buttonColor: '#CDAA54',
                    buttonTextColor: '#0A0A0A',
                    navTextColor: '#C7C7CC',
                    navTextColorTop: '#FFFFFF',
                    navTextColorScrolled: '#C7C7CC',
                    navHoverColor: '#CDAA54',
                    footerBgColor: '#0A0A0A',
                    footerTextColor: '#8E8E93',
                    textOnHero: '#FFFFFF',
                    scrollbarThumb: '#CDAA54',
                    scrollbarTrack: '#1C1C1E'
                },
                hero: {
                    subtitle: 'TRADICIJA & STIL',
                    title: 'Barber salon',
                    buttonText: 'Oglej si storitve',
                    backgroundImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2000'
                },
                ourStory: {
                    sectionTitle: 'Naša zgodba',
                    title: 'Natančnost in tradicija',
                    text: 'Sodobne tehnike v kombinaciji s klasičnim pristopom. Vsak obisk je izkušnja.',
                    image: 'https://images.unsplash.com/photo-1532710093739-9470acff878f?q=80&w=1200'
                },
                servicesSection: {
                    title: 'Storitve',
                    items: [
                        { name: 'Klasična frizura', price: '€25', desc: '30 min • Natančen rez', duration: 30 },
                        { name: 'Fade & Styling', price: '€30', desc: '45 min • Moderno', duration: 45 },
                        { name: 'Britje z brisačo', price: '€22', desc: '25 min • Tradicionalno', duration: 25 },
                        { name: 'Paket Gentleman', price: '€45', desc: '60 min • Frizura + britje', duration: 60 }
                    ]
                },
                barbersSection: {
                    title: 'Naša ekipa',
                    list: [
                        { name: 'Marko Novak', role: 'Master Barber', img: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=1000' },
                        { name: 'Luka Šter', role: 'Beard Expert', img: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=1000' },
                        { name: 'Tilen Kralj', role: 'Senior Stylist', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000' }
                    ]
                },
                gallery: [
                    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1000',
                    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=1000',
                    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000'
                ],
                testimonial: {
                    quote: 'Najboljša izkušnja v mestu. Vrnem se zagotovo!',
                    author: 'Tomaž P.'
                },
                ctaSection: {
                    title: 'Pripravljeni na spremembo?',
                    text: 'Rezervirajte termin danes in doživite vrhunsko storitev.',
                    buttonText: 'Rezerviraj zdaj'
                },
                booking: {
                    title: 'Naročilo termina',
                    heading: 'Rezervirajte termin',
                    buttonText: 'Potrdi termin',
                    placeholderName: 'Ime',
                    placeholderEmail: 'E-pošta',
                    placeholderPhone: 'Telefon'
                }
            },
            cardetailing: {
                shopName: 'Auto Detail Studio',
                navLinks: [
                    { name: 'Domov', link: '#home' },
                    { name: 'O nas', link: '#about' },
                    { name: 'Storitve', link: '#services' },
                    { name: 'Ekipa', link: '#barbers' },
                    { name: 'Galerija', link: '#gallery' }
                ],
                galleryTitle: 'Galerija',
                contactSection: {
                    title: 'Kontakt',
                    subtitle: 'Za rezervacijo nas kontaktirajte.',
                    address: 'Industrijska 5, Maribor',
                    phone: '+386 40 222 333',
                    email: 'info@detailing.si'
                },
                googleReviews: {
                    title: 'Google ocene',
                    subtitle: 'Preveri mnenja naših strank.',
                    rating: '4.9',
                    countText: '(87 ocen)',
                    link: '',
                    items: [
                        { author: 'Tilen V.', text: 'Avto izgleda kot nov.', stars: 5 },
                        { author: 'Nina Z.', text: 'Profesionalno in hitro.', stars: 5 },
                        { author: 'Rok S.', text: 'Odlična kakovost storitve.', stars: 5 }
                    ]
                },
                theme: {
                    primary: '#1E88E5',
                    gradientStart: '#1E88E5',
                    gradientEnd: '#0D47A1',
                    textPrimary: '#FFFFFF',
                    textSecondary: '#B0BEC5',
                    buttonColor: '#1E88E5',
                    buttonTextColor: '#FFFFFF',
                    navTextColor: '#B0BEC5',
                    navTextColorTop: '#FFFFFF',
                    navTextColorScrolled: '#B0BEC5',
                    navHoverColor: '#1E88E5',
                    footerBgColor: '#0A0A0A',
                    footerTextColor: '#8E8E93',
                    textOnHero: '#FFFFFF',
                    scrollbarThumb: '#1E88E5',
                    scrollbarTrack: '#1C1C1E'
                },
                hero: {
                    subtitle: 'PODROBNOSTI SO VSE',
                    title: 'Premium Car Detailing',
                    buttonText: 'Rezerviraj termin',
                    backgroundImage: 'https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=2000'
                },
                ourStory: {
                    sectionTitle: 'O nas',
                    title: 'Skrb za vsak detajl',
                    text: 'Profesionalno čiščenje, poliranje in zaščita. Vaše vozilo zasije kot novo.',
                    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200'
                },
                servicesSection: {
                    title: 'Paketne storitve',
                    items: [
                        { name: 'Notranje čiščenje', price: '€60', desc: '90 min • Globinsko', duration: 90 },
                        { name: 'Zunanje poliranje', price: '€120', desc: '150 min • Visok sijaj', duration: 150 },
                        { name: 'Keramična zaščita', price: '€280', desc: '4h • Dolgotrajno', duration: 240 },
                        { name: 'Komplet Detail', price: '€190', desc: '3h • Notranje + zunanje', duration: 180 }
                    ]
                },
                barbersSection: {
                    title: 'Naša ekipa',
                    list: [
                        { name: 'Andrej Kovač', role: 'Detailing specialist', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1000' },
                        { name: 'Nika Zupan', role: 'Paint correction', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000' }
                    ]
                },
                gallery: [
                    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000',
                    'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?q=80&w=1000',
                    'https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=1000'
                ],
                testimonial: {
                    quote: 'Avto je po obdelavi izgledal bolje kot ob nakupu.',
                    author: 'Miha K.'
                },
                ctaSection: {
                    title: 'Naj bo vaš avto kot nov',
                    text: 'Izberite paket in rezervirajte termin.',
                    buttonText: 'Rezerviraj zdaj'
                },
                booking: {
                    title: 'Rezervacija',
                    heading: 'Rezervirajte termin',
                    buttonText: 'Potrdi termin',
                    placeholderName: 'Ime',
                    placeholderEmail: 'E-pošta',
                    placeholderPhone: 'Telefon'
                }
            },
            beautysalon: {
                shopName: 'Beauty & Glow',
                navLinks: [
                    { name: 'Domov', link: '#home' },
                    { name: 'O nas', link: '#about' },
                    { name: 'Storitve', link: '#services' },
                    { name: 'Ekipa', link: '#barbers' },
                    { name: 'Galerija', link: '#gallery' }
                ],
                galleryTitle: 'Galerija',
                contactSection: {
                    title: 'Kontakt',
                    subtitle: 'Rezervacije in vprašanja – pišite ali pokličite.',
                    address: 'Trg lepote 3, Celje',
                    phone: '+386 40 333 444',
                    email: 'hello@beauty.si'
                },
                googleReviews: {
                    title: 'Google ocene',
                    subtitle: 'Preveri mnenja naših strank.',
                    rating: '5.0',
                    countText: '(64 ocen)',
                    link: '',
                    items: [
                        { author: 'Lana B.', text: 'Čudovit salon in storitev.', stars: 5 },
                        { author: 'Tina K.', text: 'Top nega, priporočam!', stars: 5 },
                        { author: 'Maja P.', text: 'Zelo prijazno osebje.', stars: 5 }
                    ]
                },
                theme: {
                    primary: '#E91E63',
                    dark: '#FFFFFF',
                    card: '#FFFFFF',
                    gradientStart: '#F06292',
                    gradientEnd: '#E91E63',
                    textPrimary: '#1C1C1E',
                    textSecondary: '#6E6E73',
                    buttonColor: '#E91E63',
                    buttonTextColor: '#FFFFFF',
                    navTextColor: '#6E6E73',
                    navTextColorTop: '#FFFFFF',
                    navTextColorScrolled: '#1C1C1E',
                    navHoverColor: '#E91E63',
                    footerBgColor: '#2B0A1A',
                    footerTextColor: '#F8BBD0',
                    textOnHero: '#FFFFFF',
                    scrollbarThumb: '#E91E63',
                    scrollbarTrack: '#F2F2F7'
                },
                hero: {
                    subtitle: 'NEGA • LEPOTA • SIJAJ',
                    title: 'Beauty Salon',
                    buttonText: 'Rezerviraj nego',
                    backgroundImage: 'https://images.pexels.com/photos/7755512/pexels-photo-7755512.jpeg'
                },
                ourStory: {
                    sectionTitle: 'O nas',
                    title: 'Vaš čas za razvajanje',
                    text: 'Nudimo vrhunske tretmaje, ki poudarijo vašo naravno lepoto.',
                    image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?q=80&w=1200'
                },
                servicesSection: {
                    title: 'Storitve',
                    items: [
                        { name: 'Nega obraza', price: '€55', desc: '60 min • Globinska', duration: 60 },
                        { name: 'Manikura', price: '€25', desc: '30 min • Klasična', duration: 30 },
                        { name: 'Pedikura', price: '€35', desc: '45 min • SPA', duration: 45 },
                        { name: 'Masaža', price: '€50', desc: '60 min • Sproščujoča', duration: 60 }
                    ]
                },
                barbersSection: {
                    title: 'Naša ekipa',
                    list: [
                        { name: 'Sara M.', role: 'Kozmetičarka', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1000' },
                        { name: 'Ana L.', role: 'Nega in masaže', img: 'https://images.pexels.com/photos/734478/pexels-photo-734478.jpeg' }
                    ]
                },
                gallery: [
                    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1000',
                    'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?q=80&w=1000',
                    'https://images.pexels.com/photos/939835/pexels-photo-939835.jpeg?q=80&w=1000'
                ],
                testimonial: {
                    quote: 'Čudovita izkušnja in popolna nega. Priporočam!',
                    author: 'Nina R.'
                },
                ctaSection: {
                    title: 'Rezervirajte svoj tretma',
                    text: 'Sprostite se in prepustite nego strokovnjakom.',
                    buttonText: 'Rezerviraj termin'
                },
                booking: {
                    title: 'Rezervacija',
                    heading: 'Rezervirajte termin',
                    buttonText: 'Potrdi termin',
                    placeholderName: 'Ime',
                    placeholderEmail: 'E-pošta',
                    placeholderPhone: 'Telefon'
                }
            }
        };

        function applyTemplateFromUI() {
            const select = document.getElementById('templateSelect');
            const key = select ? select.value : 'barber';
            const preset = TEMPLATE_PRESETS[key];
            if (!preset) return;
            const ok = confirm('To bo prepisalo trenutno vsebino in barve (naslovi, storitve, galerija, itd.). Nadaljujem?');
            if (!ok) return;

            SITE_CONFIG.shopName = preset.shopName;
            if (preset.navLinks) {
                SITE_CONFIG.navLinks = preset.navLinks.map(l => ({ ...l }));
            }
            if (preset.galleryTitle) {
                SITE_CONFIG.galleryTitle = preset.galleryTitle;
            }
            if (preset.contactSection) {
                SITE_CONFIG.contactSection = { ...preset.contactSection };
                if (!SITE_CONFIG.ownerContact) SITE_CONFIG.ownerContact = {};
                if (preset.contactSection.email) SITE_CONFIG.ownerContact.email = preset.contactSection.email;
                if (preset.contactSection.phone) SITE_CONFIG.ownerContact.phone = preset.contactSection.phone;
            }
            if (preset.googleReviews) {
                SITE_CONFIG.googleReviews = { ...preset.googleReviews, items: (preset.googleReviews.items || []).map(i => ({ ...i })) };
            }
            SITE_CONFIG.hero = { ...SITE_CONFIG.hero, ...preset.hero };
            SITE_CONFIG.ourStory = { ...SITE_CONFIG.ourStory, ...preset.ourStory };
            SITE_CONFIG.servicesSection = { ...SITE_CONFIG.servicesSection, ...preset.servicesSection };
            SITE_CONFIG.barbersSection = { ...SITE_CONFIG.barbersSection, ...preset.barbersSection };
            SITE_CONFIG.gallery = preset.gallery.slice();
            SITE_CONFIG.testimonial = { ...preset.testimonial };
            SITE_CONFIG.ctaSection = { ...SITE_CONFIG.ctaSection, ...preset.ctaSection };
            SITE_CONFIG.booking = { ...SITE_CONFIG.booking, ...preset.booking };
            if (preset.theme) {
                SITE_CONFIG.theme = { ...SITE_CONFIG.theme, ...preset.theme };
                // Always force dark mode when applying a template so backgrounds
                // and text colours stay consistent regardless of the previous mode.
                SITE_CONFIG.theme.mode = 'dark';
                SITE_CONFIG.theme.dark = '#0A0A0A';
                SITE_CONFIG.theme.card = '#141414';
                SITE_CONFIG.theme.scrollbarTrack = '#1C1C1E';
                const modeEl = document.getElementById('themeMode');
                if (modeEl) modeEl.value = 'dark';
                applyThemeToPage();
            }

            saveConfig();
            loadAdminForms();
            showNotification('Predloga uporabljena', 'success');
        }

        // Load forms with current data
        function loadAdminForms() {
            // Shop
            document.getElementById('shopName').value = SITE_CONFIG.shopName;

            // Hero
            document.getElementById('heroSubtitle').value = SITE_CONFIG.hero.subtitle;
            document.getElementById('heroTitle').value = SITE_CONFIG.hero.title;
            document.getElementById('heroButton').value = SITE_CONFIG.hero.buttonText;
            const heroUrlEl = document.getElementById('heroImageUrl');
            if (heroUrlEl) heroUrlEl.value = SITE_CONFIG.hero.backgroundImage || '';
            const heroPreview = document.getElementById('heroImagePreview');
            if (heroPreview && SITE_CONFIG.hero.backgroundImage) {
                heroPreview.src = SITE_CONFIG.hero.backgroundImage;
                heroPreview.style.display = 'block';
            }

            // Story/About
            document.getElementById('storyTitle').value = SITE_CONFIG.ourStory.title || '';
            document.getElementById('storySectionLabel').value = SITE_CONFIG.ourStory.sectionTitle || '';
            document.getElementById('storyText').value = SITE_CONFIG.ourStory.text || '';
            const storyImageEl = document.getElementById('storyImage');
            if (storyImageEl) storyImageEl.value = SITE_CONFIG.ourStory.image || '';
            const storyPreview = document.getElementById('storyImagePreview');
            if (storyPreview && SITE_CONFIG.ourStory.image) {
                storyPreview.src = SITE_CONFIG.ourStory.image;
                storyPreview.style.display = 'block';
            }

            // Testimonial
            document.getElementById('testimonialQuote').value = SITE_CONFIG.testimonial?.quote || '';
            document.getElementById('testimonialAuthor').value = SITE_CONFIG.testimonial?.author || '';

            // CTA Section
            if (SITE_CONFIG.ctaSection) {
                document.getElementById('ctaTitle').value = SITE_CONFIG.ctaSection.title || 'Pripravljeni na Spremembo?';
                document.getElementById('ctaText').value = SITE_CONFIG.ctaSection.text || '';
                document.getElementById('ctaButtonText').value = SITE_CONFIG.ctaSection.buttonText || 'Rezerviraj Zdaj';
            }

            // Contact Section
            const cs = SITE_CONFIG.contactSection || {};
            document.getElementById('contactTitle').value = cs.title || 'Kontakt';
            document.getElementById('contactSubtitle').value = cs.subtitle || 'Pišite ali nas pokličite za termin.';
            document.getElementById('contactAddress').value = cs.address || '';
            document.getElementById('contactPhone').value = cs.phone || SITE_CONFIG.ownerContact?.phone || '';
            document.getElementById('contactEmail').value = cs.email || SITE_CONFIG.ownerContact?.email || '';

            // Google Reviews
            const gr = SITE_CONFIG.googleReviews || {};
            document.getElementById('reviewsTitle').value = gr.title || 'Google ocene';
            document.getElementById('reviewsSubtitle').value = gr.subtitle || 'Preveri mnenja naših strank.';
            document.getElementById('reviewsRating').value = gr.rating || '5.0';
            document.getElementById('reviewsCount').value = gr.countText || '(120 ocen)';
            document.getElementById('reviewsLink').value = gr.link || '';
            const items = Array.isArray(gr.items) ? gr.items : [];
            const r1 = items[0] || {};
            const r2 = items[1] || {};
            const r3 = items[2] || {};
            document.getElementById('review1Author').value = r1.author || '';
            document.getElementById('review1Text').value = r1.text || '';
            document.getElementById('review1Stars').value = r1.stars || '';
            document.getElementById('review2Author').value = r2.author || '';
            document.getElementById('review2Text').value = r2.text || '';
            document.getElementById('review2Stars').value = r2.stars || '';
            document.getElementById('review3Author').value = r3.author || '';
            document.getElementById('review3Text').value = r3.text || '';
            document.getElementById('review3Stars').value = r3.stars || '';

            // Footer Copy
            document.getElementById('footerCopyText').value = SITE_CONFIG.footerCopy || 'Vse pravice pridržane.';

            // Navigation Links
            renderNavLinks();

            // Navigation
            document.getElementById('navButtonText').value = SITE_CONFIG.navButtonText || 'Book Now';

            // Logo display preference
            if (SITE_CONFIG.logo) {
                document.getElementById('showLogo').value = SITE_CONFIG.logo.showLogo !== false ? 'true' : 'false';
            }

            // Section titles
            document.getElementById('barbersSectionTitle').value = SITE_CONFIG.barbersSection.title || 'The Craftsmen';
            document.getElementById('bookingHeading').value = SITE_CONFIG.booking.heading || 'Request Appointment';

            // Colors
            if (SITE_CONFIG.theme) {
                const modeEl = document.getElementById('themeMode');
                if (modeEl) {
                    const mode = SITE_CONFIG.theme.mode
                        || (SITE_CONFIG.theme.dark === '#FFFFFF' ? 'light' : 'dark');
                    modeEl.value = mode;
                }
                document.getElementById('theme-primary').value = SITE_CONFIG.theme.primary || '#007AFF';
                document.getElementById('theme-primary-text').value = SITE_CONFIG.theme.primary || '#007AFF';
                document.getElementById('theme-dark').value = SITE_CONFIG.theme.dark || '#0A0A0A';
                document.getElementById('theme-dark-text').value = SITE_CONFIG.theme.dark || '#0A0A0A';
                document.getElementById('theme-card').value = SITE_CONFIG.theme.card || '#141414';
                document.getElementById('theme-card-text').value = SITE_CONFIG.theme.card || '#141414';
                document.getElementById('theme-gradient-start').value = SITE_CONFIG.theme.gradientStart || '#007AFF';
                document.getElementById('theme-gradient-start-text').value = SITE_CONFIG.theme.gradientStart || '#007AFF';
                document.getElementById('theme-gradient-end').value = SITE_CONFIG.theme.gradientEnd || '#5AC8FA';
                document.getElementById('theme-gradient-end-text').value = SITE_CONFIG.theme.gradientEnd || '#5AC8FA';
                
                // Text & UI Colors
                document.getElementById('text-primary').value = SITE_CONFIG.theme.textPrimary || '#FFFFFF';
                document.getElementById('text-primary-text').value = SITE_CONFIG.theme.textPrimary || '#FFFFFF';
                document.getElementById('text-secondary').value = SITE_CONFIG.theme.textSecondary || '#8E8E93';
                document.getElementById('text-secondary-text').value = SITE_CONFIG.theme.textSecondary || '#8E8E93';
                
                // Footer Colors
                document.getElementById('footer-bg-color').value = SITE_CONFIG.theme.footerBgColor || '#0A0A0A';
                document.getElementById('footer-bg-color-text').value = SITE_CONFIG.theme.footerBgColor || '#0A0A0A';
                document.getElementById('footer-text-color').value = SITE_CONFIG.theme.footerTextColor || '#636366';
                document.getElementById('footer-text-color-text').value = SITE_CONFIG.theme.footerTextColor || '#636366';

                // Scrollbar Colors
                document.getElementById('scrollbar-thumb').value = SITE_CONFIG.theme.scrollbarThumb || SITE_CONFIG.theme.primary || '#007AFF';
                document.getElementById('scrollbar-thumb-text').value = SITE_CONFIG.theme.scrollbarThumb || SITE_CONFIG.theme.primary || '#007AFF';
                document.getElementById('scrollbar-track').value = SITE_CONFIG.theme.scrollbarTrack || '#1C1C1E';
                document.getElementById('scrollbar-track-text').value = SITE_CONFIG.theme.scrollbarTrack || '#1C1C1E';

                // Sync color pickers with text inputs
                syncColorInputs();
            }


            // Appearance: logos, hero image
            if (SITE_CONFIG.logo) {
                document.getElementById('logoLargeUrl').value = SITE_CONFIG.logo.large || '';
                document.getElementById('logoMiniUrl').value = SITE_CONFIG.logo.mini || '';
                if (SITE_CONFIG.logo.large) document.getElementById('logoLargePreview').src = SITE_CONFIG.logo.large;
                if (SITE_CONFIG.logo.mini) document.getElementById('logoMiniPreview').src = SITE_CONFIG.logo.mini;
            }
            
            // Hero image preview
            if (SITE_CONFIG.hero && SITE_CONFIG.hero.backgroundImage) {
                const heroPreview = document.getElementById('heroImagePreview');
                if (heroPreview) {
                    heroPreview.src = SITE_CONFIG.hero.backgroundImage;
                    heroPreview.style.display = 'block';
                }
            }

            // Booking Page Content (rezervacija.html)
            const bp = SITE_CONFIG.bookingPage || {};
            document.getElementById('bookingPageTitle').value = bp.pageTitle || 'Rezervacija termina';
            document.getElementById('bookingPageSubtitle').value = bp.pageSubtitle || 'Izberite storitev in termin';
            document.getElementById('bookingStep1Title').value = bp.step1Title || '1. Izberite storitev';
            document.getElementById('bookingStep1Desc').value = bp.step1Desc || 'Izberite eno ali več storitev';
            document.getElementById('bookingStep2Title').value = bp.step2Title || '2. Izberite datum';
            document.getElementById('bookingStep2Desc').value = bp.step2Desc || 'Zeleni datumi imajo proste termine';
            document.getElementById('bookingStep3Title').value = bp.step3Title || '3. Vaši podatki';
            document.getElementById('bookingStep3Desc').value = bp.step3Desc || 'Vnesite kontaktne podatke';
            document.getElementById('bookingStep4Title').value = bp.step4Title || '4. Potrditev';
            document.getElementById('bookingStep4Desc').value = bp.step4Desc || 'Preverite podatke in potrdite';
            document.getElementById('bookingSuccessTitle').value = bp.successTitle || 'Rezervacija uspešna!';
            document.getElementById('bookingSuccessMessage').value = bp.successMessage || 'Vaš termin je bil uspešno rezerviran.';
            document.getElementById('bookingBtnNext').value = bp.nextButton || 'Naprej';
            document.getElementById('bookingBtnBack').value = bp.backButton || 'Nazaj';
            document.getElementById('bookingBtnConfirm').value = bp.confirmButton || 'Potrdi rezervacijo';
            document.getElementById('bookingBtnNew').value = bp.newButton || 'Nova rezervacija';

            // Gallery
            loadGallery();
            
            // Appointments
            loadAppointments();

            // Working Days
            loadWorkingDays();
        }

        // Load gallery
        function loadGallery() {
            const gallery = document.getElementById('imageGallery');
            gallery.innerHTML = '';
            SITE_CONFIG.gallery.forEach((img, idx) => {
                gallery.innerHTML += `
                    <div class="image-item">
                        <img src="${img}" alt="Galerija slika" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22150%22%3E%3Crect fill=%22%23eee%22 width=%22150%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 font-family=%22Poppins%22 font-size=%2214%22 fill=%22%23999%22%3ESlika%3C/text%3E%3C/svg%3E'">
                        <button class="image-remove" onclick="removeImage(${idx})">×</button>
                    </div>
                `;
            });
        }

        // Handle image upload
        document.getElementById('imageInput').addEventListener('change', function(e) {
            const files = e.target.files;
            for (let file of files) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    SITE_CONFIG.gallery.push(event.target.result);
                    loadGallery();
                    saveConfig();
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        });

        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            document.getElementById('imageInput').files = files;
            const event = new Event('change', { bubbles: true });
            document.getElementById('imageInput').dispatchEvent(event);
        });

        // Remove image
        function removeImage(idx) {
            SITE_CONFIG.gallery.splice(idx, 1);
            loadGallery();
            saveConfig();
        }

        // Save gallery
        function saveGallery() {
            saveConfig();
        }

        // Load and display appointments
        // Update dashboard with metrics and charts
        function updateDashboard(appointments) {
            // Calculate metrics
            const totalAppointments = appointments.length;
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            
            const monthlyAppts = appointments.filter(appt => {
                const [year, month] = appt.date.split('-');
                return parseInt(month) === currentMonth && parseInt(year) === currentYear;
            });
            
            const monthlyRevenue = monthlyAppts.reduce((sum, appt) => sum + (appt.totalPrice || 0), 0);
            const averagePrice = monthlyAppts.length > 0 ? Math.round(monthlyRevenue / monthlyAppts.length) : 0;
            
            // Update metric displays
            document.getElementById('totalAppointments').textContent = totalAppointments;
            document.getElementById('monthlyRevenue').textContent = '€' + monthlyRevenue;
            document.getElementById('monthlyAppointments').textContent = monthlyAppts.length;
            document.getElementById('averagePrice').textContent = '€' + averagePrice;
            
            // Services chart data
            const serviceCount = {};
            appointments.forEach(appt => {
                if (appt.services && Array.isArray(appt.services)) {
                    appt.services.forEach(service => {
                        serviceCount[service] = (serviceCount[service] || 0) + 1;
                    });
                } else if (appt.service) {
                    serviceCount[appt.service] = (serviceCount[appt.service] || 0) + 1;
                }
            });
            
            const serviceLabels = Object.keys(serviceCount);
            const serviceData = Object.values(serviceCount);
            
            // Create services chart
            if (serviceLabels.length > 0 && document.getElementById('servicesChart')) {
                try {
                    const servicesCtx = document.getElementById('servicesChart').getContext('2d');
                    if (window.servicesChartInstance) {
                        window.servicesChartInstance.destroy();
                    }
                    const isMobile = window.innerWidth < 768;
                    window.servicesChartInstance = new Chart(servicesCtx, {
                        type: 'doughnut',
                        data: {
                            labels: serviceLabels,
                            datasets: [{
                                data: serviceData,
                                backgroundColor: ['#007AFF', '#34C759', '#FF3B30', '#FF9500', '#AF52DE', '#5AC8FA'],
                                borderColor: '#fff',
                                borderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: { 
                                    position: 'bottom', 
                                    labels: { 
                                        font: { size: isMobile ? 10 : 12 },
                                        padding: isMobile ? 8 : 15
                                    } 
                                }
                            }
                        }
                    });
                } catch (e) {}
            }
            
            // Appointments by day chart
            const dayCount = {};
            appointments.forEach(appt => {
                const [year, month, day] = appt.date.split('-');
                dayCount[day] = (dayCount[day] || 0) + 1;
            });
            
            const dayLabels = Object.keys(dayCount).sort((a, b) => parseInt(a) - parseInt(b)).slice(0, 7);
            const dayData = dayLabels.map(day => dayCount[day] || 0);
            
            if (dayLabels.length > 0 && document.getElementById('appointmentsChart')) {
                try {
                    const appointmentsCtx = document.getElementById('appointmentsChart').getContext('2d');
                    if (window.appointmentsChartInstance) {
                        window.appointmentsChartInstance.destroy();
                    }
                    const isMobile = window.innerWidth < 768;
                    window.appointmentsChartInstance = new Chart(appointmentsCtx, {
                        type: 'bar',
                        data: {
                            labels: dayLabels.map(d => d + '.'),
                            datasets: [{
                                label: 'Naročila',
                                data: dayData,
                                backgroundColor: '#3498db',
                                borderColor: '#2980b9',
                                borderWidth: 1,
                                borderRadius: 4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: { display: false }
                            },
                            scales: {
                                y: { 
                                    beginAtZero: true, 
                                    ticks: { 
                                        stepSize: 1,
                                        font: { size: isMobile ? 9 : 11 }
                                    }
                                },
                                x: {
                                    ticks: {
                                        font: { size: isMobile ? 9 : 11 }
                                    }
                                }
                            }
                        }
                    });
                } catch (e) {}
            }
        }

        function loadAppointments() {
            const container = document.getElementById('appointmentsContainer');
            const count = document.getElementById('appointmentCount');
            const appointments = SITE_CONFIG.appointments || [];
            
            count.innerText = appointments.length;
            updateDashboard(appointments);
            renderCalendar();
            
            if (appointments.length === 0) {
                container.innerHTML = '<div style="padding: 40px 20px; text-align: center; color: var(--ios-text-secondary, #8E8E93);"><i class="bi bi-calendar-x" style="font-size: 48px; opacity: 0.5; display: block; margin-bottom: 12px;"></i>Ni nobenega naročila</div>';
                return;
            }
            
            container.innerHTML = '';
            appointments.forEach((appt, idx) => {
                // Parse date correctly without timezone issues
                const [year, month, day] = appt.date.split('-');
                const dateStr = `${day}. ${month}. ${year}`;
                container.innerHTML += `
                    <div style="margin: 8px; padding: 16px; border-left: 4px solid var(--ios-blue, #007AFF); border-radius: var(--ios-radius-md, 12px); background: var(--ios-bg-secondary, white); transition: all 0.2s; box-shadow: var(--ios-shadow-sm, 0 1px 3px rgba(0,0,0,0.08));">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <p style="margin: 0; font-weight: 600; color: var(--ios-text-primary, #000); font-size: 16px;">${appt.firstName || 'N/A'} ${appt.surname || appt.lastName || 'N/A'}</p>
                            <span style="background: rgba(0, 122, 255, 0.15); color: var(--ios-blue, #007AFF); padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">€${appt.totalPrice || appt.price || '0'}</span>
                        </div>
                        <p style="margin: 0 0 6px 0; font-size: 13px; color: var(--ios-text-secondary, #8E8E93);">${appt.email || '-'} | ${appt.phone || '-'}</p>
                        <p style="margin: 10px 0 6px 0; font-size: 14px; color: var(--ios-text-primary, #000);"><strong>📅</strong> ${dateStr} ob ${appt.time}</p>
                        <p style="margin: 6px 0; font-size: 14px; color: var(--ios-text-primary, #000);"><strong>✂️</strong> ${(appt.services || []).join(', ') || appt.service || 'N/A'}</p>
                        <p style="margin: 6px 0; font-size: 13px; color: var(--ios-text-secondary, #8E8E93);"><strong>⏱️</strong> ${appt.totalDuration || '-'} min</p>
                        <div style="margin-top: 12px; display: flex; gap: 10px;">
                            <button onclick="deleteAppointment(${idx})" style="flex: 1; padding: 10px 16px; background: var(--ios-red, #FF3B30); color: white; border: none; border-radius: var(--ios-radius-sm, 8px); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">🗑️ Izbriši</button>
                            <button onclick="generateInvoice(${idx})" style="flex: 1; padding: 10px 16px; background: var(--ios-blue, #007AFF); color: white; border: none; border-radius: var(--ios-radius-sm, 8px); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;">📄 Račun</button>
                        </div>
                    </div>
                `;
            });
        }
        
        // Delete appointment
        function deleteAppointment(idx) {
            if (confirm('Ali si prepričan?')) {
                const deletedAppt = SITE_CONFIG.appointments[idx];
                SITE_CONFIG.appointments.splice(idx, 1);
                // Clear localStorage backup and appointments
                localStorage.removeItem('site_config_backup');
                localStorage.removeItem('appointments');
                // Clear StorageManager schedule
                if (typeof StorageManager !== 'undefined' && StorageManager.save) {
                    StorageManager.save('schedule', { events: [] });
                }
                saveConfig();
                // Sync updated appointments into StorageManager schedule
                if (typeof syncAppointmentsToSchedule === 'function') {
                    syncAppointmentsToSchedule().then(() => {
                        if (window.calendar) loadAppointmentsToCalendarNow();
                    }).catch(() => {
                        if (window.calendar) loadAppointmentsToCalendarNow();
                    });
                } else {
                    if (window.calendar) loadAppointmentsToCalendarNow();
                }
                // Refresh admin UI list
                loadAppointments();
            }
        }

                // Generate printable invoice for an appointment
                function generateInvoice(idx) {
                        const appt = (SITE_CONFIG.appointments || [])[idx];
                        if (!appt) return alert('Ni najdenega naročila');

                        // Build service rows with prices
                        const serviceRows = appt.services.map(serviceName => {
                            const service = SITE_CONFIG.servicesSection.items.find(s => s.name === serviceName);
                            const price = service ? service.price : '€0';
                            return `<tr><td>${serviceName}</td><td class="right">${price}</td></tr>`;
                        }).join('');

                        const invoiceHtml = `
                                            <html>
                                            <head>
                                                <title>Račun - ${SITE_CONFIG.shopName}</title>
                                                <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px} .header{display:flex;align-items:center;gap:20px} .logo{max-height:80px} table{width:100%;border-collapse:collapse;margin-top:20px} td,th{border:1px solid #ddd;padding:8px;text-align:left} .right{text-align:right}</style>
                                            </head>
                                            <body>
                                                <div class="header">
                                                    ${SITE_CONFIG.logo && SITE_CONFIG.logo.large ? ('<img src="' + SITE_CONFIG.logo.large + '" class="logo">') : ('<h2>' + SITE_CONFIG.shopName + '</h2>')}
                                                    <div>
                                                        <div>${SITE_CONFIG.ownerContact?.email || ''}</div>
                                                        <div>${SITE_CONFIG.ownerContact?.phone || ''}</div>
                                                    </div>
                                                </div>
                                                <h3>Račun za: ${appt.name}</h3>
                                                <div>Email: ${appt.email} | Tel: ${appt.phone}</div>
                                                <div>Termin: ${appt.date} ob ${appt.time}</div>
                                                <table>
                                                    <thead><tr><th>Storitev</th><th class="right">Cena</th></tr></thead>
                                                    <tbody>
                                                        ${serviceRows}
                                                        <tr><td><strong>Skupaj</strong></td><td class="right"><strong>${SITE_CONFIG.currency}${appt.totalPrice}</strong></td></tr>
                                                    </tbody>
                                                </table>
                                                <div style="margin-top:20px">Hvala za obisk!</div>
                                                <script>window.print();<\/script>
                                            </body>
                                            </html>
                                    `;

                        const w = window.open('', '_blank');
                        w.document.write(invoiceHtml);
                        w.document.close();
                }
        
        // Save booking settings
        function saveBooking() {
            const bookingTitleInput = document.getElementById('bookingTitle');
            if (bookingTitleInput) {
                SITE_CONFIG.booking.title = bookingTitleInput.value;
            }
            // Ensure nested objects exist
            if (!SITE_CONFIG.ownerContact) SITE_CONFIG.ownerContact = {};
            // Owner contact synced from Vsebina tab (contactEmail/contactPhone)
            const cEmail = document.getElementById('contactEmail');
            const cPhone = document.getElementById('contactPhone');
            if (cEmail) SITE_CONFIG.ownerContact.email = cEmail.value;
            if (cPhone) SITE_CONFIG.ownerContact.phone = cPhone.value;
            saveConfig();
        }

        // Save booking page content (rezervacija.html)
        function saveBookingPageContent() {
            if (!SITE_CONFIG.bookingPage) SITE_CONFIG.bookingPage = {};
            
            // Page header
            SITE_CONFIG.bookingPage.pageTitle = document.getElementById('bookingPageTitle').value || 'Rezervacija termina';
            SITE_CONFIG.bookingPage.pageSubtitle = document.getElementById('bookingPageSubtitle').value || 'Izberite storitev in termin';
            
            // Step titles and descriptions
            SITE_CONFIG.bookingPage.step1Title = document.getElementById('bookingStep1Title').value || '1. Izberite storitev';
            SITE_CONFIG.bookingPage.step1Desc = document.getElementById('bookingStep1Desc').value || 'Izberite eno ali več storitev';
            SITE_CONFIG.bookingPage.step2Title = document.getElementById('bookingStep2Title').value || '2. Izberite datum';
            SITE_CONFIG.bookingPage.step2Desc = document.getElementById('bookingStep2Desc').value || 'Zeleni datumi imajo proste termine';
            SITE_CONFIG.bookingPage.step3Title = document.getElementById('bookingStep3Title').value || '3. Vaši podatki';
            SITE_CONFIG.bookingPage.step3Desc = document.getElementById('bookingStep3Desc').value || 'Vnesite kontaktne podatke';
            SITE_CONFIG.bookingPage.step4Title = document.getElementById('bookingStep4Title').value || '4. Potrditev';
            SITE_CONFIG.bookingPage.step4Desc = document.getElementById('bookingStep4Desc').value || 'Preverite podatke in potrdite';
            
            // Success messages
            SITE_CONFIG.bookingPage.successTitle = document.getElementById('bookingSuccessTitle').value || 'Rezervacija uspešna!';
            SITE_CONFIG.bookingPage.successMessage = document.getElementById('bookingSuccessMessage').value || 'Vaš termin je bil uspešno rezerviran.';
            
            // Button labels
            SITE_CONFIG.bookingPage.nextButton = document.getElementById('bookingBtnNext').value || 'Naprej';
            SITE_CONFIG.bookingPage.backButton = document.getElementById('bookingBtnBack').value || 'Nazaj';
            SITE_CONFIG.bookingPage.confirmButton = document.getElementById('bookingBtnConfirm').value || 'Potrdi rezervacijo';
            SITE_CONFIG.bookingPage.newButton = document.getElementById('bookingBtnNew').value || 'Nova rezervacija';
            
            saveConfig();
            showNotification('Vsebina rezervacijske strani shranjena!', 'success');
        }

        // Update working days
        function updateWorkingDays() {
            if (!SITE_CONFIG.booking) SITE_CONFIG.booking = {};
            if (!SITE_CONFIG.booking.workingDays) SITE_CONFIG.booking.workingDays = {};
            
            const dayMap = {
                'Monday': 1,
                'Tuesday': 2,
                'Wednesday': 3,
                'Thursday': 4,
                'Friday': 5,
                'Saturday': 6,
                'Sunday': 0
            };
            
            const dayIds = ['dayMonday', 'dayTuesday', 'dayWednesday', 'dayThursday', 'dayFriday', 'daySaturday', 'daySunday'];
            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            
            // Reset working days
            SITE_CONFIG.booking.workingDays = {};
            const daysClosed = [];
            
            // Check which days are working days
            dayIds.forEach((id, idx) => {
                const checkbox = document.getElementById(id);
                const dayNum = dayMap[dayNames[idx]];
                
                if (checkbox && checkbox.checked) {
                    SITE_CONFIG.booking.workingDays[dayNum] = true;
                } else {
                    daysClosed.push(dayNum);
                }
            });
            
            // Store days closed for calendar (inverse of working days)
            SITE_CONFIG.booking.daysClosed = daysClosed;
            
            // Render hours for each working day
            renderWorkingHoursInputs();
            saveConfig();
        }

        // Render working hours inputs for each day
        function renderWorkingHoursInputs() {
            const container = document.getElementById('workingHoursContainer');
            if (!container) return;
            
            container.innerHTML = '';
            
            if (!SITE_CONFIG.booking) SITE_CONFIG.booking = {};
            if (!SITE_CONFIG.booking.workingDays) SITE_CONFIG.booking.workingDays = {};
            
            const dayNames = ['Nedelja', 'Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota'];
            const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            for (let dayNum = 0; dayNum < 7; dayNum++) {
                if (SITE_CONFIG.booking.workingDays[dayNum]) {
                    const hoursStart = SITE_CONFIG.booking.hours?.[dayNum]?.start || SITE_CONFIG.booking.businessHours?.start || 9;
                    const hoursEnd = SITE_CONFIG.booking.hours?.[dayNum]?.end || SITE_CONFIG.booking.businessHours?.end || 19;
                    
                    const dayRow = document.createElement('div');
                    dayRow.style.cssText = 'display: grid; grid-template-columns: 150px 1fr 1fr; gap: 10px; align-items: center; padding: 10px; background: #f9f9f9; border-radius: 5px;';
                    dayRow.innerHTML = `
                        <label style="font-weight: 500; font-size: 14px;">${dayNames[dayNum]}:</label>
                        <input type="number" min="0" max="23" value="${hoursStart}" placeholder="Od ure" 
                            onchange="setDayHours(${dayNum}, this.value, null)" style="padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
                        <input type="number" min="0" max="23" value="${hoursEnd}" placeholder="Do ure"
                            onchange="setDayHours(${dayNum}, null, this.value)" style="padding: 8px; border: 1px solid #ddd; border-radius: 3px;">
                    `;
                    container.appendChild(dayRow);
                }
            }
        }

        // Set custom hours for a specific day
        function setDayHours(dayNum, startHour, endHour) {
            if (!SITE_CONFIG.booking) SITE_CONFIG.booking = {};
            if (!SITE_CONFIG.booking.hours) SITE_CONFIG.booking.hours = {};
            if (!SITE_CONFIG.booking.hours[dayNum]) SITE_CONFIG.booking.hours[dayNum] = {};
            
            if (startHour !== null) {
                SITE_CONFIG.booking.hours[dayNum].start = parseInt(startHour) || 9;
            }
            if (endHour !== null) {
                SITE_CONFIG.booking.hours[dayNum].end = parseInt(endHour) || 19;
            }
            
            saveConfig();
        }

        // Load and populate working days on admin panel load
        function loadWorkingDays() {
            if (!SITE_CONFIG.booking) SITE_CONFIG.booking = {};
            
            const dayIds = ['dayMonday', 'dayTuesday', 'dayWednesday', 'dayThursday', 'dayFriday', 'daySaturday', 'daySunday'];
            const dayNums = [1, 2, 3, 4, 5, 6, 0];
            
            // Check working days
            dayNums.forEach((dayNum, idx) => {
                const checkbox = document.getElementById(dayIds[idx]);
                if (checkbox) {
                    checkbox.checked = SITE_CONFIG.booking.workingDays?.[dayNum] || false;
                }
            });
            
            // Render hours
            renderWorkingHoursInputs();
        }

        // Save appearance settings (logos, hero image, footer)
        function saveAppearance() {
            if (!SITE_CONFIG.logo) SITE_CONFIG.logo = {};

            // If text URL provided, use it; otherwise keep existing
            const largeUrlEl = document.getElementById('logoLargeUrl');
            const miniUrlEl = document.getElementById('logoMiniUrl');
            const heroUrlEl = document.getElementById('heroImageUrl');
            const footerEl = document.getElementById('footerText');
            
            const largeUrl = largeUrlEl ? largeUrlEl.value.trim() : '';
            const miniUrl = miniUrlEl ? miniUrlEl.value.trim() : '';
            const heroUrl = heroUrlEl ? heroUrlEl.value.trim() : '';
            const footer = footerEl ? footerEl.value.trim() : '';

            if (largeUrl) SITE_CONFIG.logo.large = largeUrl;
            if (miniUrl) SITE_CONFIG.logo.mini = miniUrl;
            if (heroUrl) SITE_CONFIG.hero.backgroundImage = heroUrl;
            if (footer) SITE_CONFIG.footerText = footer;

            // If files uploaded, read them as data URLs
            const largeInputEl = document.getElementById('logoLargeInput');
            const miniInputEl = document.getElementById('logoMiniInput');
            
            const largeFile = largeInputEl ? largeInputEl.files[0] : null;
            const miniFile = miniInputEl ? miniInputEl.files[0] : null;

            if (largeFile) {
                const r = new FileReader();
                r.onload = function(e) { SITE_CONFIG.logo.large = e.target.result; document.getElementById('logoLargePreview').src = e.target.result; saveConfig(); };
                r.readAsDataURL(largeFile);
            }
            if (miniFile) {
                const r2 = new FileReader();
                r2.onload = function(e) { SITE_CONFIG.logo.mini = e.target.result; document.getElementById('logoMiniPreview').src = e.target.result; saveConfig(); };
                r2.readAsDataURL(miniFile);
            }

            // Update previews for URL inputs
            if (SITE_CONFIG.logo.large) document.getElementById('logoLargePreview').src = SITE_CONFIG.logo.large;
            if (SITE_CONFIG.logo.mini) document.getElementById('logoMiniPreview').src = SITE_CONFIG.logo.mini;

            applyThemeToPage();
            saveConfig();
            showNotification('Videz shranjen', 'success');
        }

        // Save logo display preference
        function saveLogo() {
            if (!SITE_CONFIG.logo) SITE_CONFIG.logo = {};
            SITE_CONFIG.logo.showLogo = document.getElementById('showLogo').value === 'true';
            saveConfig();
            showNotification('Logo izbira shranjena', 'success');
        }

        // Save section titles
        function saveSectionTitles() {
            if (document.getElementById('barbersSectionTitle').value) {
                SITE_CONFIG.barbersSection.title = document.getElementById('barbersSectionTitle').value;
            }
            if (document.getElementById('bookingHeading').value) {
                SITE_CONFIG.booking.heading = document.getElementById('bookingHeading').value;
            }
            saveConfig();
            showNotification('Naslovi shranjeni', 'success');
        }

        // Save CTA section
        function saveCtaSection() {
            if (!SITE_CONFIG.ctaSection) SITE_CONFIG.ctaSection = {};
            SITE_CONFIG.ctaSection.title = document.getElementById('ctaTitle').value || 'Pripravljeni na Spremembo?';
            SITE_CONFIG.ctaSection.text = document.getElementById('ctaText').value || 'Rezervirajte svoj termin danes in doživite našo profesionalno storitev.';
            SITE_CONFIG.ctaSection.buttonText = document.getElementById('ctaButtonText').value || 'Rezerviraj Zdaj';
            saveConfig();
            showNotification('CTA sekcija shranjena!', 'success');
        }

        // Save contact section
        function saveContactSection() {
            if (!SITE_CONFIG.contactSection) SITE_CONFIG.contactSection = {};
            if (!SITE_CONFIG.ownerContact) SITE_CONFIG.ownerContact = {};

            SITE_CONFIG.contactSection.title = document.getElementById('contactTitle').value || 'Kontakt';
            SITE_CONFIG.contactSection.subtitle = document.getElementById('contactSubtitle').value || 'Pišite ali nas pokličite za termin.';
            SITE_CONFIG.contactSection.address = document.getElementById('contactAddress').value || '';
            SITE_CONFIG.contactSection.phone = document.getElementById('contactPhone').value || '';
            SITE_CONFIG.contactSection.email = document.getElementById('contactEmail').value || '';

            // Sync owner contact
            SITE_CONFIG.ownerContact.phone = SITE_CONFIG.contactSection.phone;
            SITE_CONFIG.ownerContact.email = SITE_CONFIG.contactSection.email;

            saveConfig();
            showNotification('Kontakt shranjen!', 'success');
        }

        // Save Google reviews
        function saveReviewsSection() {
            if (!SITE_CONFIG.googleReviews) SITE_CONFIG.googleReviews = {};
            SITE_CONFIG.googleReviews.title = document.getElementById('reviewsTitle').value || 'Google ocene';
            SITE_CONFIG.googleReviews.subtitle = document.getElementById('reviewsSubtitle').value || 'Preveri mnenja naših strank.';
            SITE_CONFIG.googleReviews.rating = document.getElementById('reviewsRating').value || '5.0';
            SITE_CONFIG.googleReviews.countText = document.getElementById('reviewsCount').value || '(120 ocen)';
            SITE_CONFIG.googleReviews.link = document.getElementById('reviewsLink').value || '';

            const items = [];
            const r1 = {
                author: document.getElementById('review1Author').value || '',
                text: document.getElementById('review1Text').value || '',
                stars: parseInt(document.getElementById('review1Stars').value, 10) || 5
            };
            const r2 = {
                author: document.getElementById('review2Author').value || '',
                text: document.getElementById('review2Text').value || '',
                stars: parseInt(document.getElementById('review2Stars').value, 10) || 5
            };
            const r3 = {
                author: document.getElementById('review3Author').value || '',
                text: document.getElementById('review3Text').value || '',
                stars: parseInt(document.getElementById('review3Stars').value, 10) || 5
            };
            [r1, r2, r3].forEach(r => {
                if (r.author || r.text) items.push(r);
            });
            SITE_CONFIG.googleReviews.items = items;

            saveConfig();
            showNotification('Google ocene shranjene!', 'success');
        }

        // Save footer copy
        function saveFooterCopy() {
            SITE_CONFIG.footerCopy = document.getElementById('footerCopyText').value || 'Vse pravice pridržane.';
            saveConfig();
            showNotification('Noga strani shranjena!', 'success');
        }

        // Navigation links management
        function renderNavLinks() {
            const container = document.getElementById('navLinksContainer');
            if (!container) return;
            container.innerHTML = '';
            
            const links = SITE_CONFIG.navLinks || [];
            links.forEach((link, index) => {
                const row = document.createElement('div');
                row.className = 'form-row';
                row.style.marginBottom = '10px';
                row.innerHTML = `
                    <div class="form-group-admin" style="flex: 1;">
                        <label class="form-label-admin">Ime Povezave</label>
                        <input type="text" class="form-input-admin nav-link-name" data-index="${index}" value="${link.name || ''}" placeholder="Home">
                    </div>
                    <div class="form-group-admin" style="flex: 1;">
                        <label class="form-label-admin">URL / Anchor</label>
                        <input type="text" class="form-input-admin nav-link-url" data-index="${index}" value="${link.link || ''}" placeholder="#home">
                    </div>
                    <div class="form-group-admin" style="flex: 0 0 auto; display: flex; align-items: flex-end;">
                        <button class="save-btn" style="background: #dc3545; padding: 8px 12px;" onclick="removeNavLink(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `;
                container.appendChild(row);
            });
        }

        function addNavLink() {
            if (!SITE_CONFIG.navLinks) SITE_CONFIG.navLinks = [];
            SITE_CONFIG.navLinks.push({ name: '', link: '' });
            renderNavLinks();
        }

        function removeNavLink(index) {
            if (SITE_CONFIG.navLinks && SITE_CONFIG.navLinks[index] !== undefined) {
                SITE_CONFIG.navLinks.splice(index, 1);
                renderNavLinks();
            }
        }

        function saveNavLinks() {
            const nameInputs = document.querySelectorAll('.nav-link-name');
            const urlInputs = document.querySelectorAll('.nav-link-url');
            
            SITE_CONFIG.navLinks = [];
            nameInputs.forEach((input, i) => {
                const name = input.value.trim();
                const link = urlInputs[i] ? urlInputs[i].value.trim() : '';
                if (name || link) {
                    SITE_CONFIG.navLinks.push({ name, link });
                }
            });
            
            saveConfig();
            showNotification('Navigacijske povezave shranjene!', 'success');
        }

        // Save theme colors
        function saveTheme() {
            // Get values from color inputs or text inputs
            const primaryColor = document.getElementById('theme-primary-text').value || document.getElementById('theme-primary').value;
            const modeEl = document.getElementById('themeMode');
            const mode = modeEl ? modeEl.value : 'dark';
            const gradientStart = lightenColor(primaryColor, 60);
            const gradientEnd = primaryColor;

            // Ensure theme object exists
            if (!SITE_CONFIG.theme) SITE_CONFIG.theme = {};

            // Update config
            SITE_CONFIG.theme.primary = primaryColor;
            SITE_CONFIG.theme.mode = mode;
            SITE_CONFIG.theme.gradientStart = gradientStart;
            SITE_CONFIG.theme.gradientEnd = gradientEnd;
            SITE_CONFIG.theme.buttonColor = primaryColor;
            SITE_CONFIG.theme.navHoverColor = primaryColor;
            SITE_CONFIG.theme.scrollbarThumb = primaryColor;
            SITE_CONFIG.theme.textOnHero = '#FFFFFF';

            if (mode === 'light') {
                SITE_CONFIG.theme.dark = '#FFFFFF';
                SITE_CONFIG.theme.card = '#F2F2F7';
                SITE_CONFIG.theme.textPrimary = '#1C1C1E';
                SITE_CONFIG.theme.textSecondary = '#6E6E73';
                SITE_CONFIG.theme.navTextColor = '#6E6E73';
                SITE_CONFIG.theme.navTextColorTop = '#FFFFFF';
                SITE_CONFIG.theme.navTextColorScrolled = '#1C1C1E';
                SITE_CONFIG.theme.footerBgColor = '#1C1C1E';
                SITE_CONFIG.theme.footerTextColor = '#F2F2F7';
                SITE_CONFIG.theme.buttonTextColor = '#FFFFFF';
                SITE_CONFIG.theme.scrollbarTrack = '#F2F2F7';
            } else {
                SITE_CONFIG.theme.dark = '#0A0A0A';
                SITE_CONFIG.theme.card = '#141414';
                SITE_CONFIG.theme.textPrimary = '#FFFFFF';
                SITE_CONFIG.theme.textSecondary = '#8E8E93';
                SITE_CONFIG.theme.navTextColor = '#8E8E93';
                SITE_CONFIG.theme.navTextColorTop = '#FFFFFF';
                SITE_CONFIG.theme.navTextColorScrolled = '#8E8E93';
                SITE_CONFIG.theme.footerBgColor = '#0A0A0A';
                SITE_CONFIG.theme.footerTextColor = '#8E8E93';
                SITE_CONFIG.theme.buttonTextColor = '#FFFFFF';
                SITE_CONFIG.theme.scrollbarTrack = '#1C1C1E';
            }

            // Apply colors to page immediately
            applyThemeToPage();

            // Save config
            saveConfig();
            showNotification('Barve so bile shranjene!', 'success');
        }

        // Helper: set theme inputs and apply
        function setThemeInputs(theme) {
            const pairs = [
                ['theme-primary', 'theme-primary-text', theme.primary],
                ['theme-dark', 'theme-dark-text', theme.dark],
                ['theme-card', 'theme-card-text', theme.card],
                ['theme-gradient-start', 'theme-gradient-start-text', theme.gradientStart],
                ['theme-gradient-end', 'theme-gradient-end-text', theme.gradientEnd],
                ['text-primary', 'text-primary-text', theme.textPrimary],
                ['text-secondary', 'text-secondary-text', theme.textSecondary],
                ['button-color', 'button-color-text', theme.buttonColor],
                ['button-text-color', 'button-text-color-text', theme.buttonTextColor],
                ['nav-text-color', 'nav-text-color-text', theme.navTextColor],
                ['nav-hover-color', 'nav-hover-color-text', theme.navHoverColor],
                ['footer-bg-color', 'footer-bg-color-text', theme.footerBgColor],
                ['footer-text-color', 'footer-text-color-text', theme.footerTextColor],
                ['scrollbar-thumb', 'scrollbar-thumb-text', theme.scrollbarThumb],
                ['scrollbar-track', 'scrollbar-track-text', theme.scrollbarTrack]
            ];

            pairs.forEach(([pickerId, textId, value]) => {
                if (!value) return;
                const picker = document.getElementById(pickerId);
                const text = document.getElementById(textId);
                if (picker) picker.value = value;
                if (text) text.value = value;
            });

            if (!SITE_CONFIG.theme) SITE_CONFIG.theme = {};
            Object.assign(SITE_CONFIG.theme, theme);
            applyThemeToPage();
            saveConfig();
        }

        // Helper: lighten a hex color
        function lightenColor(hex, amount) {
            const h = hex.replace('#', '');
            if (h.length !== 6) return hex;
            const num = parseInt(h, 16);
            const r = Math.min(255, Math.max(0, (num >> 16) + amount));
            const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
            const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
            return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        }

        // Quick theme presets
        function applyThemePreset(key) {
            const presets = {
                'beauty-pink': {
                    primary: '#E91E63',
                    dark: '#FFFFFF',
                    card: '#FFFFFF',
                    gradientStart: '#F8BBD0',
                    gradientEnd: '#E91E63',
                    textPrimary: '#1C1C1E',
                    textSecondary: '#6E6E73',
                    buttonColor: '#E91E63',
                    buttonTextColor: '#FFFFFF',
                    navTextColor: '#6E6E73',
                    navTextColorTop: '#FFFFFF',
                    navTextColorScrolled: '#1C1C1E',
                    navHoverColor: '#E91E63',
                    footerBgColor: '#2B0A1A',
                    footerTextColor: '#F8BBD0',
                    scrollbarThumb: '#E91E63',
                    scrollbarTrack: '#F2F2F7',
                    textOnHero: '#FFFFFF'
                },
                'clean-white': {
                    primary: '#111111',
                    dark: '#111111',
                    card: '#FFFFFF',
                    gradientStart: '#FFFFFF',
                    gradientEnd: '#F2F2F7',
                    textPrimary: '#111111',
                    textSecondary: '#6E6E73',
                    buttonColor: '#111111',
                    buttonTextColor: '#FFFFFF',
                    navTextColor: '#6E6E73',
                    navHoverColor: '#111111',
                    footerBgColor: '#0A0A0A',
                    footerTextColor: '#D1D1D6',
                    scrollbarThumb: '#111111',
                    scrollbarTrack: '#F2F2F7'
                },
                'dark-elegant': {
                    primary: '#8E8E93',
                    dark: '#0A0A0A',
                    card: '#141414',
                    gradientStart: '#1C1C1E',
                    gradientEnd: '#0A0A0A',
                    textPrimary: '#FFFFFF',
                    textSecondary: '#8E8E93',
                    buttonColor: '#8E8E93',
                    buttonTextColor: '#0A0A0A',
                    navTextColor: '#8E8E93',
                    navHoverColor: '#FFFFFF',
                    footerBgColor: '#0A0A0A',
                    footerTextColor: '#8E8E93',
                    scrollbarThumb: '#8E8E93',
                    scrollbarTrack: '#1C1C1E'
                }
            };

            if (!presets[key]) return;
            setThemeInputs(presets[key]);
            showNotification('Barvna tema uporabljena', 'success');
        }

        // Apply current primary to other related colors
        function applyPrimaryToTheme() {
            const primary = (document.getElementById('theme-primary-text').value || document.getElementById('theme-primary').value || '#E91E63');
            const lighter = lightenColor(primary, 60);
            const theme = {
                primary: primary,
                gradientStart: lighter,
                gradientEnd: primary,
                buttonColor: primary,
                navHoverColor: primary,
                scrollbarThumb: primary
            };
            setThemeInputs(theme);
            showNotification('Usklajeno z glavno barvo', 'success');
        }

        // Save text and UI colors
        function saveTextColors() {
            const textPrimaryColor = document.getElementById('text-primary-text').value || document.getElementById('text-primary').value;
            const textSecondaryColor = document.getElementById('text-secondary-text').value || document.getElementById('text-secondary').value;
            const buttonColor = document.getElementById('button-color-text').value || document.getElementById('button-color').value;
            const buttonTextColor = document.getElementById('button-text-color-text').value || document.getElementById('button-text-color').value;

            // Ensure theme object exists
            if (!SITE_CONFIG.theme) SITE_CONFIG.theme = {};

            // Update config
            SITE_CONFIG.theme.textPrimary = textPrimaryColor;
            SITE_CONFIG.theme.textSecondary = textSecondaryColor;
            SITE_CONFIG.theme.buttonColor = buttonColor;
            SITE_CONFIG.theme.buttonTextColor = buttonTextColor;

            // Apply colors to page immediately
            applyThemeToPage();

            // Save config
            saveConfig();
            showNotification('Barve besedila in gumbov so bile shranjene!', 'success');
        }

        // Save footer colors
        function saveFooterColors() {
            const footerBgColor = document.getElementById('footer-bg-color-text').value || document.getElementById('footer-bg-color').value;
            const footerTextColor = document.getElementById('footer-text-color-text').value || document.getElementById('footer-text-color').value;

            // Ensure theme object exists
            if (!SITE_CONFIG.theme) SITE_CONFIG.theme = {};

            // Update config
            SITE_CONFIG.theme.footerBgColor = footerBgColor;
            SITE_CONFIG.theme.footerTextColor = footerTextColor;

            // Apply colors to page immediately
            applyThemeToPage();

            // Save config
            saveConfig();
            showNotification('Barve noge so bile shranjene!', 'success');
        }

        // Save scrollbar colors
        function saveScrollbarColors() {
            const scrollbarThumb = document.getElementById('scrollbar-thumb-text').value || document.getElementById('scrollbar-thumb').value;
            const scrollbarTrack = document.getElementById('scrollbar-track-text').value || document.getElementById('scrollbar-track').value;

            // Ensure theme object exists
            if (!SITE_CONFIG.theme) SITE_CONFIG.theme = {};

            // Update config
            SITE_CONFIG.theme.scrollbarThumb = scrollbarThumb;
            SITE_CONFIG.theme.scrollbarTrack = scrollbarTrack;

            // Apply colors to page immediately
            applyThemeToPage();

            // Save config
            saveConfig();
            showNotification('Barve drsnika so bile shranjene!', 'success');
        }

        // Apply theme colors to the page
        function applyThemeToPage() {
            const t = SITE_CONFIG.theme;
            const root = document.documentElement;
            root.style.setProperty('--color-primary', t.primary || '#007AFF');
            root.style.setProperty('--color-dark', t.dark || '#0A0A0A');
            root.style.setProperty('--color-card', t.card || '#141414');
            root.style.setProperty('--gradient-start', t.gradientStart || t.primary || '#007AFF');
            root.style.setProperty('--gradient-end', t.gradientEnd || '#5AC8FA');
            root.style.setProperty('--text-primary', t.textPrimary || '#FFFFFF');
            root.style.setProperty('--text-secondary', t.textSecondary || '#8E8E93');
            root.style.setProperty('--button-color', t.buttonColor || t.primary || '#007AFF');
            root.style.setProperty('--button-text-color', t.buttonTextColor || '#FFFFFF');
            root.style.setProperty('--nav-text-color', t.navTextColor || '#8E8E93');
            root.style.setProperty('--nav-hover-color', t.navHoverColor || t.primary || '#007AFF');
            root.style.setProperty('--footer-bg-color', t.footerBgColor || '#0A0A0A');
            root.style.setProperty('--footer-text-color', t.footerTextColor || '#636366');
            root.style.setProperty('--text-gold', t.primary || '#007AFF');
            root.style.setProperty('--scrollbar-thumb', t.scrollbarThumb || t.primary || '#007AFF');
            root.style.setProperty('--scrollbar-track', t.scrollbarTrack || t.dark || '#1C1C1E');
        }

        function showNotification(message, type) {
            const notif = document.createElement('div');
            notif.className = `notification ${type}`;
            notif.textContent = message;
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 3000);
        }

        // Check authentication
        window.addEventListener('load', () => {
            loadConfig();
            if (sessionStorage.getItem('admin_token')) {
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('adminPanel').classList.add('active');
                loadAdminForms();
            }
        });
        
        // Handle window resize for mobile charts
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Redraw charts on resize for better mobile responsiveness
                if (SITE_CONFIG.appointments && SITE_CONFIG.appointments.length > 0) {
                    updateDashboard(SITE_CONFIG.appointments);
                }
            }, 300);
        });

        // Auto-save on input change
        document.addEventListener('change', function(e) {
            if (e.target.id === 'shopName') SITE_CONFIG.shopName = e.target.value;
            if (e.target.id === 'heroSubtitle') SITE_CONFIG.hero.subtitle = e.target.value;
            if (e.target.id === 'heroTitle') SITE_CONFIG.hero.title = e.target.value;
            if (e.target.id === 'heroButton') SITE_CONFIG.hero.buttonText = e.target.value;
            if (e.target.id === 'heroImageUrl') SITE_CONFIG.hero.backgroundImage = e.target.value;
            if (e.target.id === 'storyTitle') SITE_CONFIG.ourStory.title = e.target.value;
            if (e.target.id === 'storyText') SITE_CONFIG.ourStory.text = e.target.value;
            if (e.target.id === 'storySectionLabel') SITE_CONFIG.ourStory.sectionTitle = e.target.value;
            if (e.target.id === 'storyImage') SITE_CONFIG.ourStory.image = e.target.value;
            if (e.target.id === 'testimonialQuote') {
                if (!SITE_CONFIG.testimonial) SITE_CONFIG.testimonial = {};
                SITE_CONFIG.testimonial.quote = e.target.value;
            }
            if (e.target.id === 'testimonialAuthor') {
                if (!SITE_CONFIG.testimonial) SITE_CONFIG.testimonial = {};
                SITE_CONFIG.testimonial.author = e.target.value;
            }
            if (e.target.id === 'contactTitle') {
                if (!SITE_CONFIG.contactSection) SITE_CONFIG.contactSection = {};
                SITE_CONFIG.contactSection.title = e.target.value;
            }
            if (e.target.id === 'contactSubtitle') {
                if (!SITE_CONFIG.contactSection) SITE_CONFIG.contactSection = {};
                SITE_CONFIG.contactSection.subtitle = e.target.value;
            }
            if (e.target.id === 'contactAddress') {
                if (!SITE_CONFIG.contactSection) SITE_CONFIG.contactSection = {};
                SITE_CONFIG.contactSection.address = e.target.value;
            }
            if (e.target.id === 'contactPhone') {
                if (!SITE_CONFIG.contactSection) SITE_CONFIG.contactSection = {};
                if (!SITE_CONFIG.ownerContact) SITE_CONFIG.ownerContact = {};
                SITE_CONFIG.contactSection.phone = e.target.value;
                SITE_CONFIG.ownerContact.phone = e.target.value;
            }
            if (e.target.id === 'contactEmail') {
                if (!SITE_CONFIG.contactSection) SITE_CONFIG.contactSection = {};
                if (!SITE_CONFIG.ownerContact) SITE_CONFIG.ownerContact = {};
                SITE_CONFIG.contactSection.email = e.target.value;
                SITE_CONFIG.ownerContact.email = e.target.value;
            }
            if (e.target.id === 'reviewsTitle') {
                if (!SITE_CONFIG.googleReviews) SITE_CONFIG.googleReviews = {};
                SITE_CONFIG.googleReviews.title = e.target.value;
            }
            if (e.target.id === 'reviewsSubtitle') {
                if (!SITE_CONFIG.googleReviews) SITE_CONFIG.googleReviews = {};
                SITE_CONFIG.googleReviews.subtitle = e.target.value;
            }
            if (e.target.id === 'reviewsRating') {
                if (!SITE_CONFIG.googleReviews) SITE_CONFIG.googleReviews = {};
                SITE_CONFIG.googleReviews.rating = e.target.value;
            }
            if (e.target.id === 'reviewsCount') {
                if (!SITE_CONFIG.googleReviews) SITE_CONFIG.googleReviews = {};
                SITE_CONFIG.googleReviews.countText = e.target.value;
            }
            if (e.target.id === 'reviewsLink') {
                if (!SITE_CONFIG.googleReviews) SITE_CONFIG.googleReviews = {};
                SITE_CONFIG.googleReviews.link = e.target.value;
            }
            if (e.target.id === 'navButtonText') SITE_CONFIG.navButtonText = e.target.value;
            if (e.target.id === 'businessStart') {
                if (!SITE_CONFIG.booking.businessHours) SITE_CONFIG.booking.businessHours = {};
                SITE_CONFIG.booking.businessHours.start = parseInt(e.target.value);
            }
            if (e.target.id === 'businessEnd') {
                if (!SITE_CONFIG.booking.businessHours) SITE_CONFIG.booking.businessHours = {};
                SITE_CONFIG.booking.businessHours.end = parseInt(e.target.value);
            }
            if (e.target.id === 'ownerEmail') {
                if (!SITE_CONFIG.ownerContact) SITE_CONFIG.ownerContact = {};
                SITE_CONFIG.ownerContact.email = e.target.value;
            }
            if (e.target.id === 'ownerPhone') {
                if (!SITE_CONFIG.ownerContact) SITE_CONFIG.ownerContact = {};
                SITE_CONFIG.ownerContact.phone = e.target.value;
            }
            // Handle color changes
            if (e.target.id === 'theme-primary' || e.target.id === 'theme-primary-text') {
                const val = document.getElementById('theme-primary-text').value || document.getElementById('theme-primary').value;
                SITE_CONFIG.theme.primary = val;
                document.getElementById('theme-primary').value = val;
                document.getElementById('theme-primary-text').value = val;
                // Keep scrollbar thumb synced to primary color
                SITE_CONFIG.theme.scrollbarThumb = val;
                const sbPicker = document.getElementById('scrollbar-thumb');
                const sbText = document.getElementById('scrollbar-thumb-text');
                if (sbPicker) sbPicker.value = val;
                if (sbText) sbText.value = val;
            }
            if (e.target.id === 'theme-dark' || e.target.id === 'theme-dark-text') {
                const val = document.getElementById('theme-dark-text').value || document.getElementById('theme-dark').value;
                SITE_CONFIG.theme.dark = val;
                document.getElementById('theme-dark').value = val;
                document.getElementById('theme-dark-text').value = val;
            }
            if (e.target.id === 'theme-card' || e.target.id === 'theme-card-text') {
                const val = document.getElementById('theme-card-text').value || document.getElementById('theme-card').value;
                SITE_CONFIG.theme.card = val;
                document.getElementById('theme-card').value = val;
                document.getElementById('theme-card-text').value = val;
            }
            if (e.target.id === 'theme-gradient-start' || e.target.id === 'theme-gradient-start-text') {
                const val = document.getElementById('theme-gradient-start-text').value || document.getElementById('theme-gradient-start').value;
                SITE_CONFIG.theme.gradientStart = val;
                document.getElementById('theme-gradient-start').value = val;
                document.getElementById('theme-gradient-start-text').value = val;
            }
            if (e.target.id === 'theme-gradient-end' || e.target.id === 'theme-gradient-end-text') {
                const val = document.getElementById('theme-gradient-end-text').value || document.getElementById('theme-gradient-end').value;
                SITE_CONFIG.theme.gradientEnd = val;
                document.getElementById('theme-gradient-end').value = val;
                document.getElementById('theme-gradient-end-text').value = val;
            }
            // Text & UI Colors
            if (e.target.id === 'text-primary' || e.target.id === 'text-primary-text') {
                const val = document.getElementById('text-primary-text').value || document.getElementById('text-primary').value;
                SITE_CONFIG.theme.textPrimary = val;
                document.getElementById('text-primary').value = val;
                document.getElementById('text-primary-text').value = val;
            }
            if (e.target.id === 'text-secondary' || e.target.id === 'text-secondary-text') {
                const val = document.getElementById('text-secondary-text').value || document.getElementById('text-secondary').value;
                SITE_CONFIG.theme.textSecondary = val;
                document.getElementById('text-secondary').value = val;
                document.getElementById('text-secondary-text').value = val;
            }
            // Footer Colors
            if (e.target.id === 'footer-bg-color' || e.target.id === 'footer-bg-color-text') {
                const val = document.getElementById('footer-bg-color-text').value || document.getElementById('footer-bg-color').value;
                SITE_CONFIG.theme.footerBgColor = val;
                document.getElementById('footer-bg-color').value = val;
                document.getElementById('footer-bg-color-text').value = val;
            }
            if (e.target.id === 'footer-text-color' || e.target.id === 'footer-text-color-text') {
                const val = document.getElementById('footer-text-color-text').value || document.getElementById('footer-text-color').value;
                SITE_CONFIG.theme.footerTextColor = val;
                document.getElementById('footer-text-color').value = val;
                document.getElementById('footer-text-color-text').value = val;
            }
            // Scrollbar colors
            if (e.target.id === 'scrollbar-thumb' || e.target.id === 'scrollbar-thumb-text') {
                const val = document.getElementById('scrollbar-thumb-text').value || document.getElementById('scrollbar-thumb').value;
                SITE_CONFIG.theme.scrollbarThumb = val;
                document.getElementById('scrollbar-thumb').value = val;
                document.getElementById('scrollbar-thumb-text').value = val;
            }
            if (e.target.id === 'scrollbar-track' || e.target.id === 'scrollbar-track-text') {
                const val = document.getElementById('scrollbar-track-text').value || document.getElementById('scrollbar-track').value;
                SITE_CONFIG.theme.scrollbarTrack = val;
                document.getElementById('scrollbar-track').value = val;
                document.getElementById('scrollbar-track-text').value = val;
            }
            // Apply theme and save config whenever any of these fields change
            applyThemeToPage();
            saveConfig();
        });
        
        // Load appointments on init
        async function loadConfig() {
            const saved = localStorage.getItem('site_config_backup');
            if (saved) {
                try {
                    const config = JSON.parse(saved);
                    Object.assign(SITE_CONFIG, config);
                } catch (e) {}
            }
            
            // Ensure default values exist
            if (!SITE_CONFIG.booking.businessHours) {
                SITE_CONFIG.booking.businessHours = { start: 9, end: 19 };
            }
            if (!SITE_CONFIG.ownerContact) {
                SITE_CONFIG.ownerContact = { email: 'owner@example.com', phone: '+386 1 000 0000' };
            }
            if (!SITE_CONFIG.appointments) {
                SITE_CONFIG.appointments = [];
            }
            
            // Try to load bookings from StorageManager schedule (DB-backed)
            try {
                if (typeof StorageManager !== 'undefined' && StorageManager.load) {
                    const schedule = await StorageManager.load('schedule');
                    const bookings = (schedule && Array.isArray(schedule.events))
                        ? schedule.events.filter(e => (e.extendedProps && e.extendedProps.isBooking) || e.isBooking || e.type === 'booking')
                        : [];
                    if (bookings.length > 0) {
                        SITE_CONFIG.appointments = bookings.map(b => ({
                            id: b.id || Date.now(),
                            date: (b.start || '').split('T')[0] || '',
                            time: (b.start || '').split('T')[1] || '',
                            firstName: (b.extendedProps && b.extendedProps.customer) ? (b.extendedProps.customer.split(' ')[0] || '') : (b.title || ''),
                            surname: (b.extendedProps && b.extendedProps.customer) ? (b.extendedProps.customer.split(' ').slice(1).join(' ') || '') : '',
                            fullName: (b.extendedProps && b.extendedProps.customer) || b.title || '',
                            email: b.extendedProps?.email || '',
                            phone: b.extendedProps?.phone || '',
                            services: b.extendedProps?.services || [],
                            totalDuration: b.extendedProps?.duration || 0,
                            totalPrice: b.extendedProps?.price || 0
                        }));
                    } else {
                        // Fallback to legacy localStorage if no bookings found
                        const savedAppts = localStorage.getItem('appointments');
                        if (savedAppts) {
                            try { SITE_CONFIG.appointments = JSON.parse(savedAppts); } catch (e) {}
                        }
                    }
                }
            } catch (e) {
                const savedAppts = localStorage.getItem('appointments');
                if (savedAppts) {
                    try { SITE_CONFIG.appointments = JSON.parse(savedAppts); } catch (err) {}
                }
            }
        }

        // Sync SITE_CONFIG.appointments into StorageManager schedule
        async function syncAppointmentsToSchedule() {
            try {
                if (typeof StorageManager === 'undefined' || !StorageManager.load) return;
                const schedule = await StorageManager.load('schedule');
                // Remove existing booking events
                schedule.events = (schedule.events || []).filter(e => !(e.extendedProps && e.extendedProps.isBooking) && !String(e.id).startsWith('apt_'));

                // Map SITE_CONFIG.appointments into schedule events
                const appts = SITE_CONFIG.appointments || [];
                const mapped = appts.map(a => {
                    const start = (a.date && a.time) ? `${a.date}T${a.time}` : (a.start || '');
                    const end = a.end || (a.date && a.time ? new Date(new Date(`${a.date}T${a.time}`).getTime() + ((a.totalDuration || a.duration || 60) * 60000)).toISOString() : (a.end || ''));
                    return {
                        id: a.id ? String(a.id).startsWith('apt_') ? a.id : `apt_${a.id}` : `apt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
                        title: a.fullName || `${a.firstName || ''} ${a.surname || ''}`.trim() || 'Rezervacija',
                        start: start,
                        end: end,
                        type: 'booking',
                        extendedProps: {
                            isBooking: true,
                            customer: a.fullName || `${a.firstName || ''} ${a.surname || ''}`.trim(),
                            email: a.email || '',
                            phone: a.phone || '',
                            services: a.services || [],
                            duration: a.totalDuration || a.duration || 0,
                            price: a.totalPrice || a.price || 0
                        }
                    };
                });

                schedule.events.push(...mapped);
                await StorageManager.save('schedule', schedule);
            } catch (e) {}
        }

        // Upload Hero Image
        function uploadHeroImage() {
            const fileInput = document.getElementById('heroImageInput');
            const file = fileInput.files[0];
            if (!file) {
                showNotification('Izberi sliko za nalaganje', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                SITE_CONFIG.hero.backgroundImage = e.target.result;
                const heroUrlEl = document.getElementById('heroImageUrl');
                if (heroUrlEl) heroUrlEl.value = e.target.result;
                const preview = document.getElementById('heroImagePreview');
                preview.src = e.target.result;
                preview.style.display = 'block';
                saveConfig();
                showNotification('Naslovnica slika naložena in shranjena', 'success');
            };
            reader.readAsDataURL(file);
        }

        // Upload Story Image
        function uploadStoryImage() {
            const fileInput = document.getElementById('storyImageInput');
            const file = fileInput ? fileInput.files[0] : null;
            if (!file) {
                showNotification('Izberi sliko za nalaganje', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                SITE_CONFIG.ourStory.image = e.target.result;
                const storyUrlEl = document.getElementById('storyImage');
                if (storyUrlEl) storyUrlEl.value = e.target.result;
                const preview = document.getElementById('storyImagePreview');
                if (preview) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                }
                saveConfig();
                showNotification('Story slika naložena in shranjena', 'success');
            };
            reader.readAsDataURL(file);
        }

        // Upload Barber Image
        function uploadBarberImage(idx) {
            const fileInput = document.querySelector('.barber-img-input-' + idx);
            const file = fileInput.files[0];
            if (!file) {
                showNotification('Izberi sliko za člana ekipe', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                SITE_CONFIG.barbersSection.list[idx].img = e.target.result;
                document.querySelector('.barber-img-' + idx).value = e.target.result;
                const preview = document.querySelector('.barber-img-preview-' + idx);
                preview.src = e.target.result;
                preview.style.display = 'block';
                saveConfig();
                showNotification(`Slika člana ekipe "${SITE_CONFIG.barbersSection.list[idx].name}" naložena in shranjena`, 'success');
            };
            reader.readAsDataURL(file);
        }

        // Save Hero Image from URL
        function saveHeroImageUrl() {
            const url = document.getElementById('heroImageUrl').value.trim();
            if (!url) {
                showNotification('Vnesi URL slike', 'error');
                return;
            }
            SITE_CONFIG.hero.backgroundImage = url;
            const preview = document.getElementById('heroImagePreview');
            preview.src = url;
            preview.style.display = 'block';
            saveConfig();
            showNotification('URL naslovnice slike shranjen', 'success');
        }

        // Save Barber Image from URL
        function saveBarberImageUrl(idx) {
            const url = document.querySelector('.barber-img-url-' + idx).value.trim();
            if (!url) {
                showNotification('Vnesi URL slike za člana ekipe', 'error');
                return;
            }
            SITE_CONFIG.barbersSection.list[idx].img = url;
            document.querySelector('.barber-img-' + idx).value = url;
            const preview = document.querySelector('.barber-img-preview-' + idx);
            preview.src = url;
            preview.style.display = 'block';
            saveConfig();
            showNotification(`URL slike člana ekipe "${SITE_CONFIG.barbersSection.list[idx].name}" shranjen`, 'success');
        }

        // Add gallery image from URL
        function addGalleryFromUrl() {
            const url = document.getElementById('galleryUrlInput').value.trim();
            if (!url) {
                showNotification('Vnesi URL slike', 'error');
                return;
            }
            SITE_CONFIG.gallery.push(url);
            loadGallery();
            saveConfig();
            document.getElementById('galleryUrlInput').value = '';
            showNotification('Slika dodana v galerijo', 'success');
        }
        
        function saveConfig() {
            // Save locally
            localStorage.setItem('site_config_backup', JSON.stringify(SITE_CONFIG));

            // Attach current StorageManager schedule into SITE_CONFIG so it is
            // also persisted to Firebase under site_config.schedule for visibility
            (async () => {
                try {
                    if (typeof StorageManager !== 'undefined' && StorageManager.load) {
                        const schedule = await StorageManager.load('schedule');
                        SITE_CONFIG.schedule = schedule || { events: [] };
                    } else {
                    }
                } catch (err) {} finally {
                    // Sync to Firebase REST API (simpler, no module issues)
                    syncToFirebase(SITE_CONFIG);
                    showNotification('✅ Spremembe so bile shranjene in sinhronizirane', 'success');

                    if (typeof syncAppointmentsToSchedule === 'function') syncAppointmentsToSchedule();
                }
            })();
        }
        
        // Simple Firebase REST API sync (no module dependencies)
        function syncToFirebase(config) {
            const dbUrl = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/site_config.json';

            try {
                const adminScheduleEntries = config && config.adminSchedule && Array.isArray(config.adminSchedule.entries)
                    ? config.adminSchedule.entries.length
                    : 0;
                const body = JSON.stringify(config);

                fetch(dbUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: body
                })
                .then(async response => {
                    let txt = null;
                    try { txt = await response.text(); } catch(e) { txt = '<no body>'; }
                    if (response.ok) {
                    } else {
                    }
                })
                .catch(error => {
                });
            } catch (err) {}
        }

        // Sync color picker and text inputs
        function syncColorInputs() {
            const colorPairs = [
                { picker: 'theme-primary', text: 'theme-primary-text' },
                { picker: 'theme-dark', text: 'theme-dark-text' },
                { picker: 'theme-card', text: 'theme-card-text' },
                { picker: 'theme-gradient-start', text: 'theme-gradient-start-text' },
                { picker: 'theme-gradient-end', text: 'theme-gradient-end-text' },
                { picker: 'text-primary', text: 'text-primary-text' },
                { picker: 'text-secondary', text: 'text-secondary-text' },
                { picker: 'footer-bg-color', text: 'footer-bg-color-text' },
                { picker: 'footer-text-color', text: 'footer-text-color-text' },
                { picker: 'scrollbar-thumb', text: 'scrollbar-thumb-text' },
                { picker: 'scrollbar-track', text: 'scrollbar-track-text' }
            ];

            colorPairs.forEach(pair => {
                const pickerInput = document.getElementById(pair.picker);
                const textInput = document.getElementById(pair.text);

                if (pickerInput && textInput) {
                    // When color picker changes, update text input
                    pickerInput.addEventListener('change', function() {
                        textInput.value = this.value;
                    });

                    // When text input changes, update color picker
                    textInput.addEventListener('change', function() {
                        if (/^#[0-9A-F]{6}$/i.test(this.value)) {
                            pickerInput.value = this.value;
                        }
                    });

                    // Live update as user types
                    textInput.addEventListener('input', function() {
                        if (/^#[0-9A-F]{6}$/i.test(this.value)) {
                            pickerInput.value = this.value;
                        }
                    });
                }
            });
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadConfig();
            syncColorInputs();
        });
        
        // Business panel helpers
        function refreshBusinessPanel() {
            // Earnings
            const appointments = SITE_CONFIG.appointments || [];
            let total = 0;
            const customers = {};
            appointments.forEach(a => {
                total += Number(a.totalPrice) || 0;
                if (a.email) customers[a.email] = a;
            });
            document.getElementById('earningsTotal') && (document.getElementById('earningsTotal').innerText = SITE_CONFIG.currency + total.toFixed(2));

            // Update dashboard charts
            updateDashboard(appointments);

            // Customers list
            const customersEl = document.getElementById('customersList');
            if (customersEl) {
                customersEl.innerHTML = '';
                Object.values(customers).forEach(c => {
                    const div = document.createElement('div');
                    div.style.borderBottom = '1px solid #eee';
                    div.style.padding = '6px 0';
                    div.innerHTML = `<strong>${c.name}</strong><br>${c.email} | ${c.phone}`;
                    customersEl.appendChild(div);
                });
            }
        }

        function saveDiscount() {
            const d = parseFloat(document.getElementById('discountDefault').value) || 0;
            SITE_CONFIG.defaultDiscount = d;
            saveConfig();
            showNotification('Popust shranjen', 'success');
        }

        // Calendar state
        let currentCalendarDate = new Date();

        // Render calendar
        function renderCalendar() {
            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();
            const isMobile = window.innerWidth < 600;
            const isSmallMobile = window.innerWidth < 480;
            
            // Update header
            const months = ['Januar', 'Februar', 'Marec', 'April', 'Maj', 'Junij', 'Julij', 'Avgust', 'September', 'Oktober', 'November', 'December'];
            document.getElementById('calendarMonthYear').textContent = months[month] + ' ' + year;
            
            // Get calendar days
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDayOfWeek = firstDay.getDay();
            
            const grid = document.getElementById('calendarGrid');
            grid.innerHTML = '';
            
            // Day headers - adjust for mobile - LARGER on mobile
            const dayHeaders = isSmallMobile ? ['P', 'T', 'S', 'Č', 'P', 'S', 'N'] : isMobile ? ['Po', 'To', 'Sr', 'Če', 'Pe', 'So', 'Ne'] : ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];
            const headerPadding = isSmallMobile ? '8px 5px' : isMobile ? '10px 5px' : '8px';
            const headerFontSize = isSmallMobile ? '13px' : isMobile ? '14px' : '12px';
            const headerHeight = isSmallMobile ? '40px' : isMobile ? '45px' : '30px';
            dayHeaders.forEach(day => {
                const header = document.createElement('div');
                header.textContent = day;
                header.style.cssText = `font-weight:700; color:var(--ios-text-primary, #000); text-align:center; padding:${headerPadding}; font-size:${headerFontSize}; background:var(--ios-bg-tertiary, #E5E5EA); border-radius:var(--ios-radius-sm, 8px); height:${headerHeight}; display:flex; align-items:center; justify-content:center;`;
                grid.appendChild(header);
            });
            
            // Empty cells before first day (adjust for Monday start)
            const adjustedStart = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
            for (let i = 0; i < adjustedStart; i++) {
                grid.appendChild(document.createElement('div'));
            }
            
            // Calendar days - MUCH LARGER on mobile for finger-friendly tapping
            const cellPadding = isSmallMobile ? '8px 5px' : isMobile ? '10px 5px' : '12px 4px';
            const cellFontSize = isSmallMobile ? '16px' : isMobile ? '18px' : '13px';
            const borderRadius = isSmallMobile ? '8px' : isMobile ? '8px' : 'var(--ios-radius-sm, 8px)';
            const borderWidth = isSmallMobile ? '1px' : isMobile ? '1px' : '1.5px';
            const minHeight = isSmallMobile ? '60px' : isMobile ? '70px' : '36px';  // MUCH LARGER
            
            for (let day = 1; day <= daysInMonth; day++) {
                const dayCell = document.createElement('div');
                const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
                const appointmentsOnDay = SITE_CONFIG.appointments.filter(appt => appt.date === dateStr);
                
                dayCell.textContent = day;
                dayCell.style.cssText = `padding:${cellPadding}; border:${borderWidth} solid var(--ios-bg-tertiary, #E5E5EA); border-radius:${borderRadius}; text-align:center; cursor:pointer; background:var(--ios-bg-secondary, #fff); font-size:${cellFontSize}; font-weight:600; color:var(--ios-text-primary, #000); transition:all 0.2s; min-height:${minHeight}; display:flex; align-items:center; justify-content:center; user-select:none; -webkit-user-select:none;`;
                
                if (appointmentsOnDay.length > 0) {
                    const dotSize = isSmallMobile ? '8px' : isMobile ? '10px' : '8px';
                    dayCell.style.cssText = `padding:${cellPadding}; border:${borderWidth} solid var(--ios-blue, #007AFF); border-radius:${borderRadius}; text-align:center; cursor:pointer; background:linear-gradient(135deg, var(--ios-blue, #007AFF), #0055cc); font-size:${cellFontSize}; font-weight:700; color:#fff; transition:all 0.2s; min-height:${minHeight}; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,122,255,0.4); user-select:none; -webkit-user-select:none;`;
                    dayCell.innerHTML = `<div style="text-align:center; width:100%;"><div style="line-height:1; font-size:${cellFontSize};">${day}</div><div style="font-size:${dotSize}; margin-top:2px; letter-spacing:-2px; line-height:0.8;">●●●</div></div>`;
                }
                
                dayCell.onmouseover = () => {
                    if (appointmentsOnDay.length === 0 && !isMobile) {
                        dayCell.style.backgroundColor = 'var(--ios-bg-tertiary, #E5E5EA)';
                        dayCell.style.borderColor = 'var(--ios-bg-tertiary, #E5E5EA)';
                    }
                };
                dayCell.onmouseout = () => {
                    if (appointmentsOnDay.length === 0) {
                        dayCell.style.backgroundColor = 'var(--ios-bg-secondary, #fff)';
                        dayCell.style.borderColor = 'var(--ios-bg-tertiary, #E5E5EA)';
                    }
                };
                
                dayCell.onclick = () => showDayAppointments(dateStr);
                grid.appendChild(dayCell);
            }
        }

        // Show appointments for a specific day
        function showDayAppointments(dateStr) {
            const appts = SITE_CONFIG.appointments.filter(a => a.date === dateStr);
            const container = document.getElementById('dayAppointments');
            
            if (appts.length === 0) {
                container.innerHTML = '<span style="color:var(--ios-text-secondary, #8E8E93);">Ni naročil za ta dan</span>';
            } else {
                container.innerHTML = appts.map(a => {
                    const firstName = a.firstName || a.name || 'Neznano';
                    const lastName = a.lastName || a.surname || '';
                    return `
                    <div style="padding:12px; margin-bottom:8px; background:var(--ios-bg-secondary, white); border-radius:var(--ios-radius-sm, 8px); border-left:3px solid var(--ios-blue, #007AFF); font-size:13px;">
                        <strong style="color:var(--ios-text-primary, #000);">${firstName} ${lastName}</strong> - ${a.service || ''}<br/>
                        <span style="color:var(--ios-text-secondary, #8E8E93);">Ura: ${a.time}</span><br/>
                        <span style="color:var(--ios-text-secondary, #8E8E93); font-size:12px;">${a.email || ''}</span>
                    </div>
                `;
                }).join('');
            }
        }

        function prevMonth() {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        }

        function nextMonth() {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar();
        }

        // Add manual customer/appointment
        function addManualCustomer() {
            const firstName = document.getElementById('newCustFirstName').value.trim();
            const lastName = document.getElementById('newCustLastName').value.trim();
            const email = document.getElementById('newCustEmail').value.trim();
            const phone = document.getElementById('newCustPhone').value.trim();
            const service = document.getElementById('newCustService').value;
            const barber = document.getElementById('newCustBarber').value;
            const date = document.getElementById('newCustDate').value;
            const time = document.getElementById('newCustTime').value;
            const notes = document.getElementById('newCustNotes').value.trim();

            if (!firstName || !lastName || !service || !date || !time) {
                showNotification('Izpolni vsa polja (Ime, Priimek, Storitev, Datum, Ura)', 'error');
                return;
            }

            // Calculate price
            const serviceObj = SITE_CONFIG.servicesSection.items.find(s => s.name === service);
            const price = serviceObj ? parseFloat(serviceObj.price.replace('$', '').replace('€', '')) : 0;

            // Create appointment
            const appointment = {
                id: 'manual-' + Date.now(),
                firstName,
                lastName,
                email,
                phone,
                service,
                barber: barber || 'Izbran član',
                date,
                time,
                price,
                totalPrice: price,
                notes,
                status: 'pending'
            };

            SITE_CONFIG.appointments.push(appointment);
            saveConfig();

            // Clear form
            document.getElementById('newCustFirstName').value = '';
            document.getElementById('newCustLastName').value = '';
            document.getElementById('newCustEmail').value = '';
            document.getElementById('newCustPhone').value = '';
            document.getElementById('newCustService').value = '';
            document.getElementById('newCustBarber').value = '';
            document.getElementById('newCustDate').value = '';
            document.getElementById('newCustTime').value = '';
            document.getElementById('newCustNotes').value = '';

            renderCalendar();
            showDayAppointments(date);
            refreshBusinessPanel();
            showNotification(`Stranka ${firstName} ${lastName} dodana za ${date} ob ${time}`, 'success');
        }

        // Initialize business panel on load
        document.addEventListener('DOMContentLoaded', function() {
            // wire file inputs to preview when user selects a file
            const logoLargeInput = document.getElementById('logoLargeInput');
            const logoMiniInput = document.getElementById('logoMiniInput');
            if (logoLargeInput) logoLargeInput.addEventListener('change', function(e) { const f = e.target.files[0]; if (f) { const r=new FileReader(); r.onload=function(ev){document.getElementById('logoLargePreview').src=ev.target.result; document.getElementById('logoLargeUrl').value = ev.target.result}; r.readAsDataURL(f);} });
            if (logoMiniInput) logoMiniInput.addEventListener('change', function(e) { const f = e.target.files[0]; if (f) { const r=new FileReader(); r.onload=function(ev){document.getElementById('logoMiniPreview').src=ev.target.result; document.getElementById('logoMiniUrl').value = ev.target.result}; r.readAsDataURL(f);} });

            // Populate service and barber dropdowns for manual entry
            const serviceSelect = document.getElementById('newCustService');
            const barberSelect = document.getElementById('newCustBarber');
            
            if (serviceSelect) {
                SITE_CONFIG.servicesSection.items.forEach(service => {
                    const option = document.createElement('option');
                    option.value = service.name;
                    option.textContent = service.name + ' (' + service.price + ')';
                    serviceSelect.appendChild(option);
                });
            }

            if (barberSelect) {
                SITE_CONFIG.barbersSection.list.forEach(barber => {
                    const option = document.createElement('option');
                    option.value = barber.name;
                    option.textContent = barber.name;
                    barberSelect.appendChild(option);
                });
            }

            // load defaults
            document.getElementById('discountDefault') && (document.getElementById('discountDefault').value = SITE_CONFIG.defaultDiscount || 0);

            // Only initialize business panel when enabled
            const panelTab = document.getElementById('panel');
            const panelEnabled = panelTab && panelTab.getAttribute('data-enabled') !== 'false';
            if (panelEnabled) {
                refreshBusinessPanel();
                renderCalendar();
                initAdminSchedule();
            }
        });

        // ========================================
        // ADMIN SCHEDULE MANAGEMENT
        // ========================================

        let currentScheduleMonth = new Date();
        let currentScheduleWeek = new Date();
        let currentScheduleDay = new Date();
        let currentScheduleView = 'monthly';

        // Initialize admin schedule
        function initAdminSchedule() {
            if (!SITE_CONFIG.adminSchedule) {
                SITE_CONFIG.adminSchedule = {
                    entries: []
                };
            }
            // Only update daily schedule view if element exists (FullCalendar system doesn't use this)
            const dayInput = document.getElementById('selectedScheduleDay');
            if (dayInput) {
                currentScheduleDay.setHours(0, 0, 0, 0);
                dayInput.valueAsDate = new Date(currentScheduleDay);
                renderScheduleView();
            }
        }

        // Add schedule entry
        function addScheduleEntry() {
            const type = document.getElementById('scheduleType').value;
            const startDate = document.getElementById('scheduleStartDate').value;
            const startTime = parseInt(document.getElementById('scheduleStartTime').value) || 0;
            const endDate = document.getElementById('scheduleEndDate').value;
            const endTime = parseInt(document.getElementById('scheduleEndTime').value) || 23;
            const notes = document.getElementById('scheduleNotes').value;

            if (!startDate || !endDate) {
                showNotification('Prosim vnesi datume začetka in konca', 'error');
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                showNotification('Datum začetka ne sme biti poznejši od datuma konca', 'error');
                return;
            }

            const entry = {
                id: Date.now(),
                type: type,
                startDate: startDate,
                startTime: startTime,
                endDate: endDate,
                endTime: endTime,
                notes: notes,
                createdAt: new Date().toISOString()
            };

            SITE_CONFIG.adminSchedule.entries.push(entry);
            saveConfig();
            
            // Clear form
            document.getElementById('scheduleType').value = 'prost_dan';
            document.getElementById('scheduleStartDate').value = '';
            document.getElementById('scheduleStartTime').value = '9';
            document.getElementById('scheduleEndDate').value = '';
            document.getElementById('scheduleEndTime').value = '17';
            document.getElementById('scheduleNotes').value = '';

            renderScheduleView();
            showNotification('Vnos dodan v urnik', 'success');
        }

        // Switch schedule view
        function switchScheduleView(view) {
            currentScheduleView = view;
            
            // Update button states
            document.getElementById('viewMonthlyBtn').style.backgroundColor = view === 'monthly' ? '#3498db' : '#95a5a6';
            document.getElementById('viewWeeklyBtn').style.backgroundColor = view === 'weekly' ? '#3498db' : '#95a5a6';
            document.getElementById('viewDailyBtn').style.backgroundColor = view === 'daily' ? '#3498db' : '#95a5a6';
            document.getElementById('viewListBtn').style.backgroundColor = view === 'list' ? '#3498db' : '#95a5a6';

            // Hide all views
            document.getElementById('monthlyScheduleView').style.display = 'none';
            document.getElementById('weeklyScheduleView').style.display = 'none';
            document.getElementById('dailyScheduleView').style.display = 'none';
            document.getElementById('scheduleListView').style.display = 'none';

            // Show selected view
            if (view === 'monthly') {
                document.getElementById('monthlyScheduleView').style.display = 'block';
                renderMonthlySchedule();
            } else if (view === 'weekly') {
                document.getElementById('weeklyScheduleView').style.display = 'block';
                renderWeeklySchedule();
            } else if (view === 'daily') {
                document.getElementById('dailyScheduleView').style.display = 'block';
                updateDailyScheduleView();
            } else if (view === 'list') {
                document.getElementById('scheduleListView').style.display = 'block';
                renderScheduleList();
            }
        }

        // Get color for schedule type
        function getScheduleTypeColor(type) {
            const colors = {
                'prost_dan': '#FF3B30',
                'pavza': '#FF9500',
                'malica': '#FF9500',
                'dopust': '#007AFF',
                'bolniska': '#AF52DE'
            };
            return colors[type] || '#8E8E93';
        }

        // Get label for schedule type
        function getScheduleTypeLabel(type) {
            const labels = {
                'prost_dan': 'Prost Dan',
                'pavza': 'Pavza',
                'malica': 'Malica',
                'dopust': 'Dopust',
                'bolniska': 'Bolniška'
            };
            return labels[type] || type;
        }

        // Check if date has schedule entries
        function getEntriesForDate(dateStr) {
            return SITE_CONFIG.adminSchedule.entries.filter(entry => {
                return dateStr >= entry.startDate && dateStr <= entry.endDate;
            });
        }

        // Render monthly schedule
        function renderMonthlySchedule() {
            const year = currentScheduleMonth.getFullYear();
            const month = currentScheduleMonth.getMonth();
            
            document.getElementById('scheduleMonthYear').textContent = 
                new Date(year, month).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });

            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);

            const calendar = document.getElementById('scheduleMonthCalendar');
            calendar.innerHTML = '';

            // Add day headers
            const dayHeaders = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];
            dayHeaders.forEach(day => {
                const header = document.createElement('div');
                header.style.cssText = 'background: #e74c3c; color: white; padding: 8px; text-align: center; font-weight: 600; border-radius: 4px;';
                header.textContent = day;
                calendar.appendChild(header);
            });

            // Add day cells
            for (let i = 0; i < 42; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const isCurrentMonth = date.getMonth() === month;
                
                const entries = getEntriesForDate(dateStr);
                
                const cell = document.createElement('div');
                const primaryColor = entries.length > 0 ? getScheduleTypeColor(entries[0].type) : (isCurrentMonth ? '#fff' : '#f0f0f0');
                const textColor = entries.length > 0 ? 'white' : (isCurrentMonth ? '#333' : '#999');
                
                cell.style.cssText = `
                    padding: 12px 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    background: ${primaryColor};
                    color: ${textColor};
                    font-weight: ${isCurrentMonth ? '600' : '400'};
                    cursor: pointer;
                    transition: all 0.2s;
                    min-height: 60px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    font-size: 12px;
                `;
                
                const dayNum = document.createElement('div');
                dayNum.style.cssText = 'font-size: 14px; font-weight: 700;';
                dayNum.textContent = date.getDate();
                cell.appendChild(dayNum);

                if (entries.length > 0) {
                    const typeLabel = document.createElement('div');
                    typeLabel.style.cssText = 'font-size: 10px; margin-top: 4px;';
                    typeLabel.textContent = getScheduleTypeLabel(entries[0].type);
                    cell.appendChild(typeLabel);
                }

                cell.onmouseover = () => cell.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                cell.onmouseout = () => cell.style.boxShadow = 'none';

                calendar.appendChild(cell);
            }
        }

        // Render weekly schedule
        function renderWeeklySchedule() {
            const year = currentScheduleWeek.getFullYear();
            const week = getWeekNumber(currentScheduleWeek);
            
            document.getElementById('scheduleWeekRange').textContent = `Teden ${week} (${year})`;

            const weekStart = getWeekStart(currentScheduleWeek);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);

            let html = '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
            html += '<tr style="background: #e74c3c; color: white;">';
            html += '<td style="padding: 10px; border: 1px solid #ddd; font-weight: 600; width: 60px;">Ura</td>';

            // Day headers
            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + i);
                const dayName = date.toLocaleDateString('sl-SI', { weekday: 'short', day: '2-digit' });
                html += `<td style="padding: 10px; border: 1px solid #ddd; font-weight: 600; text-align: center;">${dayName}</td>`;
            }
            html += '</tr>';

            // Hours
            for (let hour = 0; hour < 24; hour++) {
                html += `<tr>`;
                html += `<td style="padding: 8px; border: 1px solid #ddd; background: #f8fafb; font-weight: 600;">${hour}:00</td>`;

                for (let day = 0; day < 7; day++) {
                    const date = new Date(weekStart);
                    date.setDate(date.getDate() + day);
                    const dateStr = date.toISOString().split('T')[0];
                    const entries = getEntriesForDate(dateStr);
                    
                    let cellContent = '';
                    let bgColor = '#fff';
                    
                    if (entries.length > 0) {
                        for (const entry of entries) {
                            if ((hour >= entry.startTime && hour < entry.endTime) || 
                                (entry.startDate === dateStr && hour >= entry.startTime) ||
                                (entry.endDate === dateStr && hour < entry.endTime)) {
                                bgColor = getScheduleTypeColor(entry.type);
                                cellContent = getScheduleTypeLabel(entry.type);
                                break;
                            }
                        }
                    }
                    
                    html += `<td style="padding: 8px; border: 1px solid #ddd; background: ${bgColor}; color: ${bgColor !== '#fff' ? 'white' : '#333'}; text-align: center; font-weight: 600; font-size: 11px;">${cellContent}</td>`;
                }
                html += '</tr>';
            }
            html += '</table>';

            document.getElementById('scheduleWeekTable').innerHTML = html;
        }

        // Render daily schedule
        function updateDailyScheduleView() {
            const selectedDate = document.getElementById('selectedScheduleDay').value;
            const date = new Date(selectedDate);
            const dateStr = selectedDate;
            const entries = getEntriesForDate(dateStr);

            const dayName = date.toLocaleDateString('sl-SI', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            let html = `<div style="margin-bottom: 15px;"><strong style="color: var(--ios-text-primary, #000);">${dayName}</strong></div>`;

            if (entries.length === 0) {
                html += '<div style="padding: 16px; background: rgba(52, 199, 89, 0.1); border-left: 4px solid var(--ios-green, #34C759); border-radius: var(--ios-radius-sm, 8px); color: var(--ios-green, #34C759);">Nobenih vnosov za ta dan</div>';
            } else {
                html += '<table style="width: 100%; border-collapse: collapse;">';
                html += '<tr style="background: #ecf0f1;"><td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Ura</td><td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Tip</td><td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Opombe</td></tr>';

                for (let hour = 0; hour < 24; hour++) {
                    for (const entry of entries) {
                        if ((hour >= entry.startTime && hour < entry.endTime) || 
                            (entry.startDate === dateStr && hour >= entry.startTime) ||
                            (entry.endDate === dateStr && hour < entry.endTime)) {
                            html += `<tr>
                                <td style="padding: 10px; border: 1px solid #ddd; background: ${getScheduleTypeColor(entry.type)}; color: white; font-weight: 600;">${hour}:00 - ${hour + 1}:00</td>
                                <td style="padding: 10px; border: 1px solid #ddd; background: ${getScheduleTypeColor(entry.type)}; color: white;">${getScheduleTypeLabel(entry.type)}</td>
                                <td style="padding: 10px; border: 1px solid #ddd; background: ${getScheduleTypeColor(entry.type)}; color: white;">${entry.notes || '-'}</td>
                            </tr>`;
                            break;
                        }
                    }
                }
                html += '</table>';
            }

            document.getElementById('scheduleDayTable').innerHTML = html;
        }

        // Render schedule entries list
        function renderScheduleList() {
            const entries = SITE_CONFIG.adminSchedule.entries.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
            const container = document.getElementById('scheduleEntriesList');

            if (entries.length === 0) {
                container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Ni vnosov v urniku</div>';
                return;
            }

            let html = '';
            entries.forEach(entry => {
                const startDate = new Date(entry.startDate).toLocaleDateString('sl-SI');
                const endDate = new Date(entry.endDate).toLocaleDateString('sl-SI');
                const bgColor = getScheduleTypeColor(entry.type);
                
                html += `
                    <div style="padding: 14px 16px; margin-bottom: 8px; background: var(--ios-bg-secondary, white); border-radius: var(--ios-radius-sm, 8px); display: flex; justify-content: space-between; align-items: center; box-shadow: var(--ios-shadow-sm, 0 1px 3px rgba(0,0,0,0.08));">
                        <div style="flex: 1;">
                            <div style="display: inline-block; background: ${bgColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 8px;">
                                ${getScheduleTypeLabel(entry.type)}
                            </div>
                            <div style="font-size: 13px; color: var(--ios-text-primary, #000);">
                                <strong>${startDate}</strong> (${entry.startTime}:00) - <strong>${endDate}</strong> (${entry.endTime}:00)
                            </div>
                            ${entry.notes ? `<div style="font-size: 12px; color: var(--ios-text-secondary, #8E8E93); margin-top: 6px;">💬 ${entry.notes}</div>` : ''}
                        </div>
                        <button onclick="deleteScheduleEntry(${entry.id})" style="background: var(--ios-red, #FF3B30); color: white; border: none; padding: 8px 14px; border-radius: var(--ios-radius-sm, 8px); cursor: pointer; font-size: 13px; font-weight: 600;">Izbriši</button>
                    </div>
                `;
            });

            container.innerHTML = html;
        }

        // Delete schedule entry
        function deleteScheduleEntry(id) {
            if (confirm('Ali si prepričan, da želiš izbrisati ta vnos?')) {
                SITE_CONFIG.adminSchedule.entries = SITE_CONFIG.adminSchedule.entries.filter(e => e.id !== id);
                saveConfig();
                renderScheduleView();
                showNotification('Vnos izbrisan', 'success');
            }
        }

        // Navigation functions
        function prevScheduleMonth() {
            currentScheduleMonth.setMonth(currentScheduleMonth.getMonth() - 1);
            renderMonthlySchedule();
        }

        function nextScheduleMonth() {
            currentScheduleMonth.setMonth(currentScheduleMonth.getMonth() + 1);
            renderMonthlySchedule();
        }

        function prevScheduleWeek() {
            currentScheduleWeek.setDate(currentScheduleWeek.getDate() - 7);
            renderWeeklySchedule();
        }

        function nextScheduleWeek() {
            currentScheduleWeek.setDate(currentScheduleWeek.getDate() + 7);
            renderWeeklySchedule();
        }

        function prevScheduleDay() {
            currentScheduleDay.setDate(currentScheduleDay.getDate() - 1);
            document.getElementById('selectedScheduleDay').valueAsDate = new Date(currentScheduleDay);
            updateDailyScheduleView();
        }

        function nextScheduleDay() {
            currentScheduleDay.setDate(currentScheduleDay.getDate() + 1);
            document.getElementById('selectedScheduleDay').valueAsDate = new Date(currentScheduleDay);
            updateDailyScheduleView();
        }

        // Helper functions
        function getWeekNumber(date) {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        }

        function getWeekStart(date) {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day + 1;
            return new Date(d.setDate(diff));
        }

        function renderScheduleView() {
            if (currentScheduleView === 'monthly') {
                renderMonthlySchedule();
            } else if (currentScheduleView === 'weekly') {
                renderWeeklySchedule();
            } else if (currentScheduleView === 'daily') {
                updateDailyScheduleView();
            } else if (currentScheduleView === 'list') {
                renderScheduleList();
            }
        }
