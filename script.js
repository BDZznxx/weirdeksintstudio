'use strict';

const elements = {
    preloader: document.getElementById('preloader'),
    navbar: document.getElementById('navbar'),
    navMenu: document.getElementById('navMenu'),
    hamburger: document.getElementById('hamburger'),
    contactForm: document.getElementById('contactForm'),
    submitBtn: document.getElementById('submitBtn'),
    formMessage: document.getElementById('formMessage'),
    year: document.getElementById('year')
};

const state = {
    isMenuOpen: false,
    isScrolled: false
};


async function fetchGlobalStats() {
    try {
        const response = await fetch('/simpanstats.php');
        const stats = await response.json();
        
        
        const visitorEl = document.querySelector('[data-visitor="true"]');
        const ratingEl = document.querySelector('[data-rating="true"]');
        const daysEl = document.querySelector('[data-days="true"]');
        
        if (visitorEl) visitorEl.setAttribute('data-target', (stats.visitors / 1000).toFixed(1));
        if (ratingEl) ratingEl.setAttribute('data-target', stats.rating);
        if (daysEl) daysEl.setAttribute('data-target', stats.days);
        
        console.log('✅ SERVER stats loaded:', stats);
    } catch(e) {
        console.log('🔄 Fallback to localStorage');
    }
}

const init = async () => {
    elements.year.textContent = new Date().getFullYear();
    setupEventListeners();
    initAnimations();
    setTimeout(hidePreloader, 2500);
    initStatsCounter();

    await fetchGlobalStats();
    setInterval(fetchGlobalStats, 30000);  // Update setiap 30 detik
};

const setupEventListeners = () => {
    
    window.addEventListener('scroll', throttle(handleScroll, 16));
    
    
    if (elements.hamburger && elements.navMenu) {
        elements.hamburger.addEventListener('click', toggleMobileMenu);
    }
    
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (state.isMenuOpen) toggleMobileMenu();
        });
    });
    
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', smoothScroll);
    });
    
    
    if (elements.contactForm) {
        elements.contactForm.addEventListener('submit', handleContactFormNative);
    }
    
    
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', copyContactInfo);
    });
    
    
    ['input', 'blur'].forEach(event => {
        ['name', 'phone', 'message'].forEach(field => {
            const el = document.getElementById(field);
            if (el) el.addEventListener(event, validateField);
        });
    });
};

const hidePreloader = () => {
    if (elements.preloader) {
        elements.preloader.classList.add('hidden');
    }
    document.body.style.overflow = 'auto';
};

const handleScroll = () => {
    state.isScrolled = window.scrollY > 50;
    if (elements.navbar) {
        elements.navbar.classList.toggle('scrolled', state.isScrolled);
    }
};

const toggleMobileMenu = () => {
    state.isMenuOpen = !state.isMenuOpen;
    if (elements.navMenu) {
        elements.navMenu.classList.toggle('active', state.isMenuOpen);
    }
    if (elements.hamburger) {
        elements.hamburger.classList.toggle('active', state.isMenuOpen);
    }
    document.body.style.overflow = state.isMenuOpen ? 'hidden' : 'auto';
};

const smoothScroll = (e) => {
    e.preventDefault();
    const href = e.target.getAttribute('href');
    const target = document.querySelector(href);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};


const handleContactFormNative = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const formData = new FormData(elements.contactForm);
    showLoadingState();
    
    try {
        
        elements.contactForm.submit();
        
        
        setTimeout(() => {
            showSuccessMessage();
        }, 1000);
        
    } catch (error) {
        console.error('Form error:', error);
        showErrorMessage('Terjadi kesalahan. Silakan coba lagi atau hubungi via Telegram.');
        hideLoadingState();
    }
};

const validateForm = () => {
    let isValid = true;
    
    ['name', 'phone', 'message'].forEach(field => {
        const el = document.getElementById(field);
        const errorEl = document.querySelector(`[data-error="${field}"]`);
        if (!el?.value?.trim()) {
            showFieldError(el, errorEl, `${el.placeholder} wajib diisi`);
            isValid = false;
        } else {
            hideFieldError(el, errorEl);
        }
    });
    
    
    const phone = document.getElementById('phone')?.value;
    if (phone && !/^\+?[\d\s-()]{10,15}$/.test(phone.replace(/\s+/g, ''))) {
        showFieldError(
            document.getElementById('phone'), 
            document.querySelector('[data-error="phone"]'), 
            'Format nomor tidak valid (min 10 digit)'
        );
        isValid = false;
    }
    
    
    const email = document.getElementById('email')?.value;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showFieldError(
            document.getElementById('email'), 
            document.querySelector('[data-error="email"]'), 
            'Format email tidak valid'
        );
        isValid = false;
    }
    
    return isValid;
};

const showLoadingState = () => {
    if (elements.submitBtn) {
        elements.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        elements.submitBtn.disabled = true;
    }
};

const hideLoadingState = () => {
    if (elements.submitBtn) {
        elements.submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Kirim Brief Proyek';
        elements.submitBtn.disabled = false;
    }
};

const showSuccessMessage = (name = '') => {
    if (elements.formMessage) {
        elements.formMessage.innerHTML = `✅ <strong>Berhasil dikirim!</strong><br>Terima kasih${name ? ` ${escapeHtml(name)}` : ''} pesan Anda sudah terkirim ke <strong>Tim Weird Eksint Studio</strong>. Tim kami akan balas dalam 24 jam.`;
        elements.formMessage.className = 'form-message success show';
    }
};

const showErrorMessage = (message) => {
    if (elements.formMessage) {
        elements.formMessage.innerHTML = `❌ ${message}`;
        elements.formMessage.className = 'form-message error show';
    }
};

const validateField = (e) => {
    const field = e.target;
    const errorEl = document.querySelector(`[data-error="${field.id}"]`);
    if (field.value.trim()) {
        hideFieldError(field, errorEl);
    }
};

const showFieldError = (field, errorEl, message) => {
    field.style.borderColor = '#ef4444';
    field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
};

const hideFieldError = (field, errorEl) => {
    field.style.borderColor = '';
    field.style.boxShadow = '';
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
    }
};

const copyContactInfo = async (e) => {
    const text = e.currentTarget.getAttribute('data-copy');
    try {
        await navigator.clipboard.writeText(text);
        const icon = e.currentTarget.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'fas fa-check-circle';
        icon.style.color = '#10b981';
        setTimeout(() => {
            icon.className = originalClass;
            icon.style.color = '';
        }, 2000);
    } catch (err) {
        console.error('Copy failed:', err);
    }
};

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const throttle = (func, limit) => {
    let inThrottle;
    return function() {
        if (!inThrottle) {
            func.apply(this, arguments);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};


const initAnimations = () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));
};


class AdvancedStatsCounter {
    constructor() {
        this.companyStartDate = new Date('2023-01-01');
        this.init();
    }

    init() {
        this.loadStats();
        this.setupAutoIncrement();
        this.animateStats();
        this.periodicUpdate();
        this.trackClicks();
    }

    
    loadStats() {
        this.stats = {
            totalVisitors: parseInt(localStorage.getItem('stats_totalVisitors') || '1247'),
            dailyVisitors: parseInt(localStorage.getItem('stats_dailyVisitors') || '0'),
            totalRating: parseFloat(localStorage.getItem('stats_totalRating') || '248.5'),
            ratingCount: parseInt(localStorage.getItem('stats_ratingCount') || '52'),
            lastVisitDate: localStorage.getItem('stats_lastVisitDate') || '',
            clickCount: parseInt(localStorage.getItem('stats_clickCount') || '0')
        };
    }

    saveStats() {
        Object.keys(this.stats).forEach(key => {
            localStorage.setItem(`stats_${key}`, this.stats[key]);
        });
    }

    
    getActiveDays() {
        const now = new Date();
        const diffTime = Math.abs(now - this.companyStartDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    
    incrementVisitors() {
        const today = new Date().toDateString();
        
        
        if (this.stats.lastVisitDate !== today) {
            this.stats.dailyVisitors = 1;
            this.stats.lastVisitDate = today;
        } else {
            this.stats.dailyVisitors++;
        }
        
        
        this.stats.totalVisitors++;
        this.saveStats();
    }

    
    autoRating() {
        // Rating naik berdasarkan aktivitas
        const activityScore = Math.min(5, 4.7 + (this.stats.clickCount * 0.005) + (this.stats.dailyVisitors * 0.01));
        this.stats.totalRating += activityScore;
        this.stats.ratingCount++;
        this.saveStats();
    }

    
    trackClicks() {
        document.addEventListener('click', (e) => {
            const isLink = e.target.closest('a');
            const isButton = e.target.closest('button, .btn');
            
            if (isLink || isButton || e.target.closest('.stats-grid')) {
                this.stats.clickCount++;
                this.incrementVisitors(); // +1 visitor per click
                this.autoRating(); // Update rating
                this.updateDisplay();
                this.saveStats();
            }
        });

        
        let scrollCount = 0;
        window.addEventListener('scroll', () => {
            scrollCount++;
            if (scrollCount % 50 === 0) { // Setiap 50px scroll
                this.stats.clickCount += 0.1;
                this.autoRating();
            }
        });
    }

    
    setupAutoIncrement() {
        
        this.incrementVisitors();
        this.autoRating();
        
        
        setInterval(() => {
            if (Math.random() > 0.7) {
                this.stats.clickCount += 0.05;
                this.autoRating();
                this.updateDisplay();
            }
        }, 30000); // Setiap 30 detik
    }

    
    animateStats() {
        const statsGrid = document.querySelector('.stats-grid');
        if (!statsGrid) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    statsGrid.classList.add('animate-swap');
                    this.updateDisplay(true); // Force animate
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        observer.observe(statsGrid);
    }

    
    updateDisplay(animate = false) {
        const daysEl = document.querySelector('[data-days="true"]');
        const visitorEl = document.querySelector('[data-visitor="true"]');
        const ratingEl = document.querySelector('[data-rating="true"]');

        // Calculate values
        const activeDays = this.getActiveDays();
        const formattedVisitors = (this.stats.totalVisitors / 1000).toFixed(1);
        const avgRating = (this.stats.totalRating / this.stats.ratingCount).toFixed(1);

        if (daysEl) daysEl.setAttribute('data-target', activeDays);
        if (visitorEl) visitorEl.setAttribute('data-target', formattedVisitors);
        if (ratingEl) ratingEl.setAttribute('data-target', avgRating);

        // Smooth animation
        if (animate) {
            this.animateNumbers();
        }
    }

    animateNumbers() {
        const numbers = document.querySelectorAll('.stat-number');
        numbers.forEach(el => {
            const target = parseFloat(el.getAttribute('data-target') || 0);
            let current = 0;
            const increment = target / 50;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                el.textContent = current.toFixed(target % 1 === 0 ? 0 : 1);
            }, 30);
        });
    }

    
    periodicUpdate() {
        setInterval(() => {
            const today = new Date().toDateString();
            if (this.stats.lastVisitDate !== today) {
                this.incrementVisitors();
            }
            this.updateDisplay();
        }, 60000); // 1 menit
    }
}



document.addEventListener('DOMContentLoaded', () => {
    window.statsCounter = new AdvancedStatsCounter();
    init();  // Panggil init yang sudah ada fetchGlobalStats

    setTimeout(() => {
        if (window.statsCounter) {
            window.statsCounter.incrementVisitors();
            window.statsCounter.updateDisplay(true);
        }
    }, 1000);
});
