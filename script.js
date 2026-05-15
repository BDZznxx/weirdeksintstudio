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

const init = async () => {
    elements.year.textContent = new Date().getFullYear();
    setupEventListeners();
    initAnimations();
    setTimeout(hidePreloader, 2500);
    initStatsCounter();  // ✅ Sudah ada
    
    // Panggil sekali untuk visitor
    initStatsCounter();
};

const setupEventListeners = () => {
    // Navbar scroll
    window.addEventListener('scroll', throttle(handleScroll, 16));
    
    // Mobile menu
    if (elements.hamburger && elements.navMenu) {
        elements.hamburger.addEventListener('click', toggleMobileMenu);
    }
    
    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (state.isMenuOpen) toggleMobileMenu();
        });
    });
    
    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', smoothScroll);
    });
    
    // Contact form - Formspree native handling
    if (elements.contactForm) {
        elements.contactForm.addEventListener('submit', handleContactFormNative);
    }
    
    // Contact copy
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', copyContactInfo);
    });
    
    // Form validation
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

// 🔥 FORMSPREE NATIVE + VALIDASI CLIENT-SIDE
const handleContactFormNative = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const formData = new FormData(elements.contactForm);
    showLoadingState();
    
    try {
        // Formspree akan handle submit secara native
        elements.contactForm.submit();
        
        // Tampilkan pesan sukses sementara (Formspree akan redirect)
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
    
    // Validasi nomor telepon
    const phone = document.getElementById('phone')?.value;
    if (phone && !/^\+?[\d\s-()]{10,15}$/.test(phone.replace(/\s+/g, ''))) {
        showFieldError(
            document.getElementById('phone'), 
            document.querySelector('[data-error="phone"]'), 
            'Format nomor tidak valid (min 10 digit)'
        );
        isValid = false;
    }
    
    // Validasi email jika diisi
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
        elements.formMessage.innerHTML = `✅ <strong>Berhasil dikirim!</strong><br>Terima kasih${name ? ` ${escapeHtml(name)}` : ''} pesan Anda sudah terkirim ke <strong>eksintweird@gmail.com</strong>. Tim kami akan balas dalam 24 jam.`;
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

// Animations
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

const initStatsCounter = () => {
    const statsGrid = document.querySelector('.stats-grid');
    if (!statsGrid) return;
    
    // Visitor Counter (LocalStorage + Session)
    let totalVisitors = parseInt(localStorage.getItem('totalVisitors') || '1250');
    let todayVisitors = parseInt(sessionStorage.getItem('todayVisitors') || '0');
    
    // Increment hari & pengunjung
    const lastVisit = localStorage.getItem('lastVisit');
    const today = new Date().toDateString();
    if (lastVisit !== today) {
        totalVisitors += Math.floor(Math.random() * 50) + 10;  // +10-60 pengunjung
        localStorage.setItem('totalVisitors', totalVisitors);
        localStorage.setItem('lastVisit', today);
        sessionStorage.setItem('todayVisitors', '1');
    } else {
        todayVisitors++;
        sessionStorage.setItem('todayVisitors', todayVisitors);
    }
    
    // Rating auto (4.8 - 5.0)
    const rating = (4.8 + Math.random() * 0.2).toFixed(1);
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                statsGrid.classList.add('animate-swap');
                
                const stats = document.querySelectorAll('.stat-number[data-target]');
                stats.forEach((stat, index) => {
                    const isVisitor = stat.getAttribute('data-visitor');
                    const isRating = stat.getAttribute('data-rating');
                    const romawi = stat.closest('.stat-item').getAttribute('data-romawi');
                    
                    let target;
                    if (isVisitor) {
                        target = totalVisitors / 1000;  // 1.25K → 1.3K
                    } else if (isRating) {
                        target = parseFloat(rating);
                    } else {
                        target = parseInt(stat.getAttribute('data-target'));
                    }
                    
                    let current = 0;
                    const increment = target / 60;
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= target) {
                            if (isVisitor) {
                                stat.textContent = `${target.toFixed(1)}${romawi}`;
                            } else if (isRating) {
                                stat.textContent = `${target}${romawi}`;
                            } else {
                                stat.textContent = `${Math.floor(target)} ${romawi}`;
                            }
                            clearInterval(timer);
                        } else {
                            if (isVisitor) {
                                stat.textContent = `${current.toFixed(1)}${romawi}`;
                            } else if (isRating) {
                                stat.textContent = `${current.toFixed(1)}${romawi}`;
                            } else {
                                stat.textContent = `${Math.floor(current)} ${romawi}`;
                            }
                        }
                    }, 30);
                });
                
                // Auto rating increment (simulasi klik)
                setTimeout(() => {
                    updateRating();
                }, 2000);
                
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    
    observer.observe(statsGrid);
};

// Rating Auto Increment
let ratingClicks = 0;
function updateRating() {
    ratingClicks++;
    const newRating = Math.min(5.0, 4.8 + (ratingClicks * 0.01));
    const ratingStat = document.querySelector('.stat-number[data-rating="true"]');
    if (ratingStat && ratingClicks < 20) {
        ratingStat.textContent = `${newRating.toFixed(1)} ★`;
        setTimeout(updateRating, 500 + Math.random() * 1000);
    }
}

// Track link clicks for rating
document.addEventListener('click', (e) => {
    if (e.target.closest('a[href^="#"]') || 
        e.target.closest('.btn-primary') || 
        e.target.closest('.btn-secondary')) {
        ratingClicks += 0.5;
    }
});

// Init
document.addEventListener('DOMContentLoaded', init);