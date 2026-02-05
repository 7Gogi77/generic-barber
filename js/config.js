/**
 * BLADE & BOURBON - WEBSITE CONFIGURATION
 * ---------------------------------------
 * Use this file to customize your website content. 
 * You can use both external URLs or local paths for images.
 * For local images, place them in the /images folder and use: "images/your-image.jpg"
 */

const SITE_CONFIG = {
    // General Brand Settings
    shopName: "Blade & Bourbon", // Your shop title (appears in Logo and Footer)
    
    // Logo Settings
    logo: {
        large: "", // URL or base64 for logo
        mini: "",  // Mini version of logo
        showLogo: true  // true = show logo, false = show shop name
    },
    
    // Currency
    currency: "€",
    
    // CENTRALIZED THEME SYSTEM
    // This object controls all visual styling across the site
    // Colors inspired by classic barber shop aesthetic (Red, White, Blue)
    theme: {
        // Primary Colors (Classic Barber Pole Colors)
        primary: "#DC143C",           // Classic barber red
        dark: "#0A0A0A",              // Dark background
        card: "#141414",              // Card background
        
        // Gradients (Red & Navy barber aesthetic)
        gradientStart: "#DC143C",     // Crimson red start
        gradientEnd: "#FF6B6B",       // Light red end
        gradientDark: "#0A0A0A",      // Dark gradient
        gradientAccent: "#003DA5",    // Navy blue accent
        
        // Text Colors
        textPrimary: "#FFFFFF",       // Main text (white)
        textSecondary: "#A0A0A0",     // Secondary text
        textGold: "#DC143C",          // Red accent text
        
        // Accent Colors (Barber Pole)
        accentRed: "#DC143C",         // Primary red
        accentBlue: "#003DA5",        // Navy blue
        accentWhite: "#FFFFFF",       // White
        
        // Border Colors
        borderLight: "rgba(255,255,255,0.1)",
        borderGold: "rgba(220,20,60,0.3)",
        
        // Functional Colors
        success: "#4ADE80",           // Success messages
        error: "#F87171",             // Error messages
        warning: "#FBBF24",           // Warning messages
        
        // Fonts
        fontSerif: "Cormorant Garamond, serif",
        fontSans: "Montserrat, sans-serif"
    },
    
    // PRIMARY GOLD (kept for backward compatibility - now uses barber red)
    primaryGold: "#DC143C",      // Barber red accent color
    
	// Navigation Menu
    navLinks: [
        { name: "Home", link: "#home" },
        { name: "Story", link: "#about" },
        { name: "Services", link: "#services" },
        { name: "Barbers", link: "#barbers" },
        { name: "Gallery", link: "#gallery" }
    ],
	
	navButtonText: "Book Now", // The main CTA button in the navigation bar
	
    // Hero / Welcome Section
    hero: {
        subtitle: "ESTABLISHED 1924",             // Small text above the main title
        title: "Where Tradition Meets Style",    // Main headline
        buttonText: "View Services",              // CTA button text
        backgroundImage: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2000"
    },
    
    // About Us / Our Story Section
    ourStory: {
        sectionTitle: "Our Story",                // Label above the headline
        title: "A Century of Excellence",        // Main section title
        text: "Founded on the principle that a haircut is a ritual, not a chore. We blend time-honored techniques with contemporary styles.",
        image: "https://images.unsplash.com/photo-1532710093739-9470acff878f?q=80&w=1000"
    },

    // Services & Pricing Section
    servicesSection: {
        title: "Premium Pricing",                 // Title for the services grid
        items: [
            { name: "Classic Haircut", price: "€35", desc: "45 min • Precision cut", duration: 45 },
            { name: "Signature Fade", price: "€45", desc: "60 min • Razor finish", duration: 60 },
            { name: "Hot Towel Shave", price: "€40", desc: "30 min • Traditional", duration: 30 },
            { name: "The Royal Treatment", price: "€75", desc: "90 min • Cut + Shave", duration: 90 }
        ]
    },

    // Our Barbers Section
    barbersSection: {
        title: "The Craftsmen",                   // Section title (editable in admin)
        list: [
            { 
                name: "Alexander Vance", 
                role: "Master Barber", 
                img: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=800" 
            },
            { 
                name: "Julian Rossi", 
                role: "Beard Expert", 
                img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=800" 
            },
            { 
                name: "Marcus Thorne", 
                role: "Senior Stylist", 
                img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800" 
            }
        ]
    },

    // Gallery Section
    // Add as many image paths as you want (supports local and external links)
    gallery: [
        "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800",
        "https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=800",
        "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800"
    ],

    // Client Testimonial Section
    testimonial: {
        quote: "The best hot towel shave in London. The precision is unmatched.",
        author: "James Harrington"
    },

    // Appointment / Booking Section
    booking: {
        title: "Naročilo Termina",              // Headline for the booking form (editable in admin)
        heading: "Request Appointment",         // Alternative heading (editable in admin)
        buttonText: "Potrdi Termin",             // Submit button text
        placeholderName: "Ime",                  // Text inside the input field
        placeholderEmail: "E-pošta",             // Email field
        placeholderPhone: "Telefonska Številka", // Phone field
        businessHours: {
            start: 9,    // 9 AM
            end: 19      // 7 PM
        },
        daysClosed: [0], // 0 = Sunday
        slotDuration: 15 // 15 minute slots
    },
    
    // Booking Page Content (rezervacija.html)
    bookingPage: {
        pageTitle: "Rezervacija Termina",
        pageSubtitle: "Izberite storitve in termin",
        step1Title: "Izberite Storitve",
        step1Desc: "Izberite eno ali več storitev",
        step2Title: "Izberite Datum",
        step2Desc: "Izberite želeni datum",
        step3Title: "Vaši Podatki",
        step3Desc: "Vnesite kontaktne podatke",
        step4Title: "Potrditev",
        step4Desc: "Preglejte in potrdite",
        successTitle: "Rezervacija Uspešna!",
        successMessage: "Vaša rezervacija je bila uspešno oddana. Potrditev boste prejeli na e-pošto.",
        nextButton: "Naprej",
        confirmButton: "Potrdi Rezervacijo"
    },
    
    // ADMIN & SECURITY SETTINGS
    admin: {
        // Admin login credentials (change these immediately in production!)
        username: "admin",
        password: "admin123",
        
        // Security: Maximum failed login attempts before lockout
        maxAttempts: 3,
        
        // Security: Lockout duration in milliseconds (60000 = 1 minute)
        lockoutDuration: 60000,
        
        // Feature: Enable/disable admin panel
        enabled: true
    },
    
    // Appointments storage (managed by admin)
    appointments: [],
    ownerContact: {
        email: "spidergogi9@gmail.com",
        phone: "+386 1 000 0000"
    }
};