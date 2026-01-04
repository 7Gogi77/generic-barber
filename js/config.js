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
    primaryGold: "#C5A059",      // Primary accent color for buttons and highlights
    
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
            { name: "Classic Haircut", price: "$35", desc: "45 min • Precision cut" },
            { name: "Signature Fade", price: "$45", desc: "60 min • Razor finish" },
            { name: "Hot Towel Shave", price: "$40", desc: "30 min • Traditional" },
            { name: "The Royal Treatment", price: "$75", desc: "90 min • Cut + Shave" }
        ]
    },

    // Our Barbers Section
    barbersSection: {
        title: "The Craftsmen",                   // Section title
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
        title: "Request Appointment",            // Headline for the booking form
        buttonText: "Secure My Spot",             // Submit button text
        placeholderName: "GENTLEMAN'S NAME"      // Text inside the input field
    }
};