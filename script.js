'use strict';

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
        console.log('🔄 PHP server tidak tersedia, pakai localStorage fallback');
    }
}

const init = async () => {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
 
    setupEventListeners();
    initAnimations();
    setTimeout(hidePreloader, 2500);
    initStatsCounter();
 
    await fetchGlobalStats();
    setInterval(fetchGlobalStats, 30000);
};

function getElements() {
    return {
        preloader:   document.getElementById('preloader'),
        navbar:      document.getElementById('navbar'),
        navMenu:     document.getElementById('navMenu'),
        hamburger:   document.getElementById('hamburger'),
        contactForm: document.getElementById('contactForm'),
        submitBtn:   document.getElementById('submitBtn'),
        formMessage: document.getElementById('formMessage'),
        year:        document.getElementById('year')
    };
}

const setupEventListeners = () => {
    const el = getElements();
 
    window.addEventListener('scroll', throttle(handleScroll, 16));
    
    if (el.hamburger && el.navMenu) {
        el.hamburger.addEventListener('click', toggleMobileMenu);
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (state.isMenuOpen) toggleMobileMenu();
        });
    });
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', smoothScroll);
    });
    
    if (el.contactForm) {
        el.contactForm.addEventListener('submit', handleContactFormNative);
    }
    
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', copyContactInfo);
    });
    
    ['input', 'blur'].forEach(event => {
        ['name', 'phone', 'message'].forEach(field => {
            const fieldEl = document.getElementById(field);
            if (fieldEl) fieldEl.addEventListener(event, validateField);
        });
    });
};


const hidePreloader = () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.classList.add('hidden');
    }
    document.body.style.overflow = 'auto';
};
 
const handleScroll = () => {
    state.isScrolled = window.scrollY > 50;
    const navbar = document.getElementById('navbar');
    if (navbar) {
        navbar.classList.toggle('scrolled', state.isScrolled);
    }
};


const toggleMobileMenu = () => {
    const navMenu   = document.getElementById('navMenu');
    const hamburger = document.getElementById('hamburger');
    state.isMenuOpen = !state.isMenuOpen;
    if (navMenu)   navMenu.classList.toggle('active', state.isMenuOpen);
    if (hamburger) hamburger.classList.toggle('active', state.isMenuOpen);
    document.body.style.overflow = state.isMenuOpen ? 'hidden' : 'auto';
};
 
const smoothScroll = (e) => {
    e.preventDefault();
    const href   = e.currentTarget.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};


const handleContactFormNative = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const contactForm = document.getElementById('contactForm');
    const submitBtn   = document.getElementById('submitBtn');
    showLoadingState(submitBtn);
    
    try {
        const formData = new FormData(contactForm);
        const response = await fetch(contactForm.action, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        });
 
        if (response.ok) {
            showSuccessMessage();
            contactForm.reset();
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        console.error('Form error:', error);
        showErrorMessage('Terjadi kesalahan. Silakan coba lagi atau hubungi via Telegram.');
        hideLoadingState(submitBtn);
    }
};

const validateForm = () => {
    let isValid = true;
    
    ['name', 'phone', 'message'].forEach(field => {
        const el      = document.getElementById(field);
        const errorEl = document.querySelector(`[data-error="${field}"]`);
        if (!el?.value?.trim()) {
            showFieldError(el, errorEl, `${el.placeholder.replace(' *','')} wajib diisi`);
            isValid = false;
        } else {
            hideFieldError(el, errorEl);
        }
    });
    
    const phone = document.getElementById('phone')?.value;
    if (phone && phone.trim() && !/^\+?[\d\s\-()\+]{10,15}$/.test(phone.replace(/\s+/g, ''))) {
        showFieldError(
            document.getElementById('phone'),
            document.querySelector('[data-error="phone"]'),
            'Format nomor tidak valid (min 10 digit)'
        );
        isValid = false;
    }
    
    const email = document.getElementById('email')?.value;
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showFieldError(
            document.getElementById('email'),
            document.querySelector('[data-error="email"]'),
            'Format email tidak valid'
        );
        isValid = false;
    }
    
    return isValid;
};


const showLoadingState = (btn) => {
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        btn.disabled = true;
    }
};
 
const hideLoadingState = (btn) => {
    if (btn) {
        btn.innerHTML = '<i class="fas fa-rocket"></i> Kirim Brief Proyek';
        btn.disabled = false;
    }
};
 
const showSuccessMessage = () => {
    const formMessage = document.getElementById('formMessage');
    if (formMessage) {
        formMessage.innerHTML = `✅ <strong>Berhasil dikirim!</strong><br>Terima kasih, pesan Anda sudah terkirim ke <strong>Tim Weird Eksint Studio</strong>. Tim kami akan balas dalam 24 jam.`;
        formMessage.className = 'form-message success show';
    }
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Terkirim!';
        submitBtn.disabled = true;
    }
};
 
const showErrorMessage = (message) => {
    const formMessage = document.getElementById('formMessage');
    if (formMessage) {
        formMessage.innerHTML = `❌ ${message}`;
        formMessage.className = 'form-message error show';
    }
};
 
const validateField = (e) => {
    const field   = e.target;
    const errorEl = document.querySelector(`[data-error="${field.id}"]`);
    if (field.value.trim()) {
        hideFieldError(field, errorEl);
    }
};
 
const showFieldError = (field, errorEl, message) => {
    if (!field) return;
    field.style.borderColor = '#ef4444';
    field.style.boxShadow   = '0 0 0 3px rgba(239, 68, 68, 0.2)';
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }
};

const hideFieldError = (field, errorEl) => {
    if (!field) return;
    field.style.borderColor = '';
    field.style.boxShadow   = '';
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
    }
};
 
const copyContactInfo = async (e) => {
    const text = e.currentTarget.getAttribute('data-copy');
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        const icon = e.currentTarget.querySelector('i');
        if (!icon) return;
        const originalClass = icon.className;
        icon.className = 'fas fa-check-circle';
        icon.style.color = '#10b981';
        setTimeout(() => {
            icon.className   = originalClass;
            icon.style.color = '';
        }, 2000);
    } catch (err) {
        console.error('Copy failed:', err);
    }
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
 
const initStatsCounter = () => {
    if (window.statsCounter) return;
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
            totalRating:   parseFloat(localStorage.getItem('stats_totalRating') || '248.5'),
            ratingCount:   parseInt(localStorage.getItem('stats_ratingCount') || '52'),
            lastVisitDate: localStorage.getItem('stats_lastVisitDate') || '',
            clickCount:    parseInt(localStorage.getItem('stats_clickCount') || '0')
        };
    }
 
    saveStats() {
        Object.keys(this.stats).forEach(key => {
            localStorage.setItem(`stats_${key}`, this.stats[key]);
        });
    }
 
    getActiveDays() {
        const now      = new Date();
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
        const activityScore = Math.min(5, 4.7 + (this.stats.clickCount * 0.005) + (this.stats.dailyVisitors * 0.01));
        this.stats.totalRating += activityScore;
        this.stats.ratingCount++;
        this.saveStats();
    }
 
    trackClicks() {
        document.addEventListener('click', (e) => {
            const isLink   = e.target.closest('a');
            const isButton = e.target.closest('button, .btn');
            
            if (isLink || isButton || e.target.closest('.stats-grid')) {
                this.stats.clickCount++;
                this.incrementVisitors();
                this.autoRating();
                this.updateDisplay();
                this.saveStats();
            }
        });
 
        let scrollCount = 0;
        window.addEventListener('scroll', () => {
            scrollCount++;
            if (scrollCount % 50 === 0) {
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
        }, 30000);
    }
 
    animateStats() {
        const statsGrid = document.querySelector('.stats-grid');
        if (!statsGrid) return;
 
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    statsGrid.classList.add('animate-swap');
                    this.updateDisplay(true);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
 
        observer.observe(statsGrid);
    }
 
    updateDisplay(animate = false) {
        const daysEl    = document.querySelector('[data-days="true"]');
        const visitorEl = document.querySelector('[data-visitor="true"]');
        const ratingEl  = document.querySelector('[data-rating="true"]');
 
        const activeDays       = this.getActiveDays();
        const formattedVisitors = (this.stats.totalVisitors / 1000).toFixed(1);
        const avgRating         = (this.stats.totalRating / this.stats.ratingCount).toFixed(1);
 
        if (daysEl)    daysEl.setAttribute('data-target', activeDays);
        if (visitorEl) visitorEl.setAttribute('data-target', formattedVisitors);
        if (ratingEl)  ratingEl.setAttribute('data-target', avgRating);
 
        if (animate) {
            this.animateNumbers();
        }
    }
 
    animateNumbers() {
        const numbers = document.querySelectorAll('.stat-number');
        numbers.forEach(el => {
            const target    = parseFloat(el.getAttribute('data-target') || '0');
            let current     = 0;
            const increment = target / 50;
            const timer     = setInterval(() => {
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
        }, 60000);
    }
}
 
 
// ==================== CHAT NOTIFICATION ====================
function initChatNotification() {
  const chatNotif = document.getElementById('chatNotification');
  const chatBody  = document.getElementById('chatBody');
  const closeBtn  = document.getElementById('closeChatBtn');
 
  if (!chatNotif || !chatBody || !closeBtn) return;
  if (localStorage.getItem('wes_chat_closed') === '1') return;
 
  const messages = [
    "Halo! 👋 Selamat datang di Weird Eksint Studio",
    "Ada yang bisa kami bantu hari ini? 😊",
    "Kami siap membantu desain rumah, RAB lengkap, atau konsultasi proyek Anda."
  ];
 
  function showTyping() {
    const el = document.createElement('div');
    el.className = 'typing-container';
    el.id = 'wes-typing';
    el.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>`;
    chatBody.appendChild(el);
    chatBody.scrollTop = chatBody.scrollHeight;
    return el;
  }
 
  function typeMessage(text, onDone) {
    const old = document.getElementById('wes-typing');
    if (old) old.remove();
 
    const bubble = document.createElement('div');
    bubble.className = 'message bot';
    chatBody.appendChild(bubble);
 
    let i = 0;
    const speed = 28;
 
    const tick = setInterval(() => {
      bubble.textContent += text.charAt(i);
      i++;
      chatBody.scrollTop = chatBody.scrollHeight;
 
      if (i >= text.length) {
        clearInterval(tick);
        bubble.classList.add('show');
        if (typeof onDone === 'function') setTimeout(onDone, 600);
      }
    }, speed);
  }
 
  function sendMessages(index) {
    if (index >= messages.length) return;
    const typingEl   = showTyping();
    const thinkTime  = 800 + messages[index].length * 18;
    setTimeout(() => {
      typingEl.remove();
      typeMessage(messages[index], () => sendMessages(index + 1));
    }, thinkTime);
  }
 
  const isMobile  = window.matchMedia('(max-width: 768px)').matches;
  const showDelay = isMobile ? 2800 : 4000;
 
  const openTimer = setTimeout(() => {
    chatNotif.classList.add('show');
    setTimeout(() => sendMessages(0), 400);
  }, showDelay);
 
  closeBtn.addEventListener('click', () => {
    chatNotif.classList.remove('show');
    clearTimeout(openTimer);
    localStorage.setItem('wes_chat_closed', '1');
  });
}

AOS.init({ duration: 700, once: true });

/* ============================================================
   DENAH SVG — AKURAT SESUAI BENTUK BANGUNAN DARI RENDER
   ============================================================ */

/* ── PROJECT 1: Rumah Modern 1 Lantai — Atap Segitiga Ganda, Kaca Lebar, Carport Samping
   Luas Bangunan ≈ 180 m² (18m × 10m)
   Zona: Ruang Tamu + Dining open-plan besar (kaca), 3 KT, 2 KM, Dapur, Carport kanan
   ── */
const denahP1 = `<svg viewBox="0 0 420 300" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif" font-size="9">
  <!-- Background -->
  <rect x="0" y="0" width="420" height="300" fill="#F0EDE8"/>

  <!-- LABEL LANTAI -->
  <text x="10" y="16" font-size="10" fill="#888" font-weight="600" letter-spacing="1">DENAH LANTAI 1 — SKALA 1:100</text>

  <!-- DINDING LUAR utama (18m × 10m → skala 300×166) -->
  <rect x="10" y="26" width="290" height="166" rx="2" fill="none" stroke="#333" stroke-width="2.5"/>

  <!-- CARPORT KANAN (4m × 6m) -->
  <rect x="300" y="26" width="80" height="100" rx="1" fill="#E8E4DC" stroke="#555" stroke-width="1.5" stroke-dasharray="6,3"/>
  <text x="340" y="72" text-anchor="middle" fill="#666" font-weight="500">CARPORT</text>
  <text x="340" y="84" text-anchor="middle" fill="#666">4×6 m</text>

  <!-- RUANG TAMU + AREA KACA (6m × 10m) — kiri depan -->
  <rect x="10" y="26" width="130" height="166" rx="0" fill="#B8DFD0" stroke="#0F6E56" stroke-width="1.2"/>
  <text x="75" y="100" text-anchor="middle" fill="#085041" font-weight="600">RUANG TAMU</text>
  <text x="75" y="113" text-anchor="middle" fill="#085041">+ AREA KACA</text>
  <text x="75" y="126" text-anchor="middle" fill="#085041">6.5×8.3 m</text>
  <!-- Kaca besar (fasad) -->
  <rect x="10" y="30" width="130" height="8" fill="#93C5FD" stroke="#2563EB" stroke-width="0.8" opacity="0.8"/>
  <text x="75" y="37" text-anchor="middle" fill="#1E3A8A" font-size="7">CURTAIN WALL</text>

  <!-- DINING / RUANG MAKAN (4m × 4m) -->
  <rect x="140" y="26" width="90" height="80" rx="0" fill="#FAD9A0" stroke="#B45309" stroke-width="1.2"/>
  <text x="185" y="63" text-anchor="middle" fill="#78350F" font-weight="600">DINING</text>
  <text x="185" y="75" text-anchor="middle" fill="#78350F">4.5×4 m</text>

  <!-- DAPUR (3m × 4m) -->
  <rect x="230" y="26" width="70" height="80" rx="0" fill="#FDE68A" stroke="#D97706" stroke-width="1.2"/>
  <text x="265" y="63" text-anchor="middle" fill="#92400E" font-weight="600">DAPUR</text>
  <text x="265" y="75" text-anchor="middle" fill="#92400E">3.5×4 m</text>

  <!-- KT MASTER (4m × 4.5m) -->
  <rect x="140" y="106" width="100" height="86" rx="0" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="190" y="145" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT. MASTER</text>
  <text x="190" y="157" text-anchor="middle" fill="#1E3A8A">5×4.3 m</text>

  <!-- KM MASTER (2m × 2m) -->
  <rect x="240" y="106" width="60" height="45" rx="0" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/>
  <text x="270" y="130" text-anchor="middle" fill="#3730A3" font-weight="500">KM</text>

  <!-- KT 2 (3m × 3.5m) -->
  <rect x="240" y="151" width="60" height="41" rx="0" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="270" y="174" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 2</text>

  <!-- KORIDOR / HALL -->
  <rect x="140" y="192" width="160" height="0" fill="none"/>
  <line x1="140" y1="106" x2="140" y2="192" stroke="#aaa" stroke-width="0.8" stroke-dasharray="3,2"/>

  <!-- TERAS DEPAN -->
  <rect x="10" y="192" width="290" height="34" rx="0" fill="#D6EFD8" stroke="#16A34A" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="155" y="212" text-anchor="middle" fill="#166534" font-weight="500">TERAS DEPAN (SEMI-OUTDOOR)</text>

  <!-- OUTDOOR / TAMAN DEPAN -->
  <rect x="10" y="226" width="290" height="50" rx="2" fill="#BBF7D0" stroke="#16A34A" stroke-width="1" stroke-dasharray="4,3" opacity="0.7"/>
  <text x="155" y="255" text-anchor="middle" fill="#15803D" font-weight="500">TAMAN DEPAN + STEPPING PATH</text>

  <!-- PINTU MASUK -->
  <line x1="130" y1="170" x2="140" y2="170" stroke="#FF6B35" stroke-width="2"/>
  <path d="M130,170 Q130,182 140,182" fill="none" stroke="#FF6B35" stroke-width="1.5"/>

  <!-- LEGENDA -->
  <text x="10" y="288" font-size="8" fill="#555">■ Biru = KT  ■ Hijau = Ruang Tamu  ■ Kuning = Dapur/Makan  ■ Abu = Carport</text>
</svg>`;

const denahP2 = `<svg viewBox="0 0 420 450" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif" font-size="9"> <rect x="0" y="0" width="420" height="450" fill="#F0EDE8"/> <text x="10" y="16" font-size="10" fill="#888" font-weight="600" letter-spacing="1">DENAH 3 LANTAI — NEO-FUTURISTIK</text>
<!-- LANTAI 1 (Lantai Dasar) -->

<text x="10" y="34" font-size="9" fill="#555" font-weight="700">LANTAI 1 (130 m²)</text> <rect x="10" y="40" width="290" height="120" rx="3" fill="none" stroke="#333" stroke-width="2"/>
<!-- Ruang Tamu --> <rect x="10" y="40" width="140" height="80" fill="#C7D2FE" stroke="#4338CA" stroke-width="1.2"/> <text x="80" y="78" text-anchor="middle" fill="#3730A3" font-weight="600">RUANG TAMU</text> <text x="80" y="90" text-anchor="middle" fill="#3730A3" font-size="8">OPEN PLAN</text> <!-- Ruang Keluarga --> <rect x="10" y="120" width="140" height="40" fill="#C7D2FE" stroke="#4338CA" stroke-width="1.2"/> <text x="80" y="144" text-anchor="middle" fill="#3730A3" font-size="8">R. KELUARGA</text> <!-- Dapur --> <rect x="150" y="40" width="70" height="80" fill="#FDE68A" stroke="#D97706" stroke-width="1.2"/> <text x="185" y="78" text-anchor="middle" fill="#78350F" font-weight="600">DAPUR</text> <!-- Dining --> <rect x="220" y="40" width="80" height="80" fill="#A7F3D0" stroke="#059669" stroke-width="1.2"/> <text x="260" y="78" text-anchor="middle" fill="#065F46" font-weight="600">DINING</text> <!-- Kamar Mandi Tamu --> <rect x="150" y="120" width="70" height="40" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/> <text x="185" y="144" text-anchor="middle" fill="#3730A3" font-size="8">KM TAMU</text> <!-- Tangga --> <rect x="220" y="120" width="80" height="40" fill="#FEF3C7" stroke="#D97706" stroke-width="1"/> <text x="260" y="144" text-anchor="middle" fill="#92400E" font-size="8">TANGGA</text> <!-- Carport / Teras --> <rect x="10" y="168" width="290" height="30" fill="#D1FAE5" stroke="#059669" stroke-width="1" stroke-dasharray="5,3"/> <text x="155" y="187" text-anchor="middle" fill="#065F46" font-size="8">CARPORT & TERAS</text> <!-- LANTAI 2 (Lantai 1) -->

<text x="10" y="212" font-size="9" fill="#555" font-weight="700">LANTAI 2 (130 m²)</text> <rect x="10" y="220" width="290" height="100" rx="3" fill="none" stroke="#333" stroke-width="2"/>
<!-- Kamar Tidur Master --> <rect x="10" y="220" width="130" height="100" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/> <text x="75" y="265" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT. MASTER</text> <text x="75" y="277" text-anchor="middle" fill="#1E3A8A" font-size="8">+ EN-SUITE</text> <!-- Kamar Mandi dalam --> <rect x="140" y="220" width="60" height="50" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/> <text x="170" y="248" text-anchor="middle" fill="#3730A3">KM MASTER</text> <!-- Kamar Tidur 2 --> <rect x="200" y="220" width="100" height="100" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/> <text x="250" y="265" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 2</text> <!-- Kamar Tidur 3 --> <rect x="140" y="270" width="60" height="50" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/> <text x="170" y="300" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 3</text> <!-- Kamar Mandi Bersama --> <rect x="200" y="270" width="100" height="50" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/> <text x="250" y="300" text-anchor="middle" fill="#3730A3" font-size="8">KM BERSAMA</text> <!-- Balkon --> <rect x="10" y="328" width="290" height="25" fill="#D1FAE5" stroke="#059669" stroke-width="1" stroke-dasharray="5,3"/> <text x="155" y="344" text-anchor="middle" fill="#065F46" font-size="8">BALKON</text> <!-- LANTAI 3 (Lantai 2 / Attic) -->

<text x="10" y="366" font-size="9" fill="#555" font-weight="700">LANTAI 3 (100 m²)</text> <rect x="10" y="374" width="290" height="70" rx="3" fill="none" stroke="#333" stroke-width="2"/>
<!-- Ruang Kerja / Home Office --> <rect x="10" y="374" width="95" height="70" fill="#DDD6FE" stroke="#7C3AED" stroke-width="1.2"/> <text x="57" y="412" text-anchor="middle" fill="#5B21B6" font-weight="600">HOME</text> <text x="57" y="424" text-anchor="middle" fill="#5B21B6" font-weight="600">OFFICE</text> <!-- Ruang Jemur / Laundry --> <rect x="105" y="374" width="80" height="70" fill="#FDE68A" stroke="#D97706" stroke-width="1.2"/> <text x="145" y="412" text-anchor="middle" fill="#78350F" font-weight="600">LAUNDRY</text> <!-- Ruang Utilities --> <rect x="185" y="374" width="55" height="70" fill="#E5E7EB" stroke="#6B7280" stroke-width="1"/> <text x="212" y="405" text-anchor="middle" fill="#374151" font-size="8">UTIL</text> <text x="212" y="417" text-anchor="middle" fill="#374151" font-size="8">ROOM</text> <!-- Roof Terrace --> <rect x="240" y="374" width="60" height="70" fill="#D1FAE5" stroke="#059669" stroke-width="1.2"/> <text x="270" y="412" text-anchor="middle" fill="#065F46" font-weight="600">ROOF</text> <text x="270" y="424" text-anchor="middle" fill="#065F46" font-weight="600">TERRACE</text> <!-- Legend -->

<text x="10" y="455" font-size="8" fill="#555">■ Biru = Kamar Tidur ■ Ungu = Ruang Tamu/Keluarga ■ Kuning = Dapur/Laundry ■ Hijau = Balkon/Teras</text> </svg>`;

/* ── PROJECT 3: Rumah 2 Lantai Modern Tropis — Atap Datar, Kayu, Carport Depan
   Luas ≈ 260 m² (13m × 10m per lantai)
   ── */
const denahP3 = `<svg viewBox="0 0 420 310" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif" font-size="9">
  <rect x="0" y="0" width="420" height="310" fill="#F0EDE8"/>
  <text x="10" y="16" font-size="10" fill="#888" font-weight="600" letter-spacing="1">DENAH 2 LANTAI — MODERN TROPIS + KAYU</text>

  <!-- LANTAI 1 -->
  <text x="10" y="32" font-size="9" fill="#555" font-weight="700">LANTAI 1 (130 m²)</text>
  <rect x="10" y="38" width="290" height="120" rx="3" fill="none" stroke="#333" stroke-width="2"/>

  <!-- CARPORT DEPAN (dari render: carport terintegrasi kiri) -->
  <rect x="10" y="38" width="80" height="60" fill="#E5E7EB" stroke="#6B7280" stroke-width="1.2"/>
  <text x="50" y="65" text-anchor="middle" fill="#374151" font-weight="600">CARPORT</text>
  <text x="50" y="77" text-anchor="middle" fill="#374151">4×3 m</text>

  <!-- Foyer / Entrance -->
  <rect x="90" y="38" width="50" height="60" fill="#D1FAE5" stroke="#059669" stroke-width="1"/>
  <text x="115" y="65" text-anchor="middle" fill="#065F46">FOYER</text>
  <text x="115" y="77" text-anchor="middle" fill="#065F46">2.5×3m</text>

  <!-- Ruang Tamu -->
  <rect x="140" y="38" width="100" height="60" fill="#BBF7D0" stroke="#16A34A" stroke-width="1.2"/>
  <text x="190" y="63" text-anchor="middle" fill="#166534" font-weight="600">RUANG TAMU</text>
  <text x="190" y="75" text-anchor="middle" fill="#166534">5×3 m</text>

  <!-- Dapur -->
  <rect x="240" y="38" width="60" height="60" fill="#FDE68A" stroke="#D97706" stroke-width="1.2"/>
  <text x="270" y="63" text-anchor="middle" fill="#78350F" font-weight="600">DAPUR</text>
  <text x="270" y="75" text-anchor="middle" fill="#78350F">3×3 m</text>

  <!-- Ruang Keluarga (lantai 1 tengah-belakang) -->
  <rect x="10" y="98" width="160" height="60" fill="#A7F3D0" stroke="#059669" stroke-width="1.2"/>
  <text x="90" y="125" text-anchor="middle" fill="#065F46" font-weight="600">RUANG KELUARGA</text>
  <text x="90" y="137" text-anchor="middle" fill="#065F46">8×3 m</text>

  <!-- KM Tamu -->
  <rect x="170" y="98" width="60" height="60" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/>
  <text x="200" y="125" text-anchor="middle" fill="#3730A3" font-weight="500">KM</text>
  <text x="200" y="137" text-anchor="middle" fill="#3730A3">Tamu</text>

  <!-- Taman Belakang -->
  <rect x="230" y="98" width="70" height="60" fill="#D1FAE5" stroke="#16A34A" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="265" y="125" text-anchor="middle" fill="#166534">TAMAN</text>
  <text x="265" y="137" text-anchor="middle" fill="#166534">BELAKANG</text>

  <!-- LANTAI 2 -->
  <text x="10" y="180" font-size="9" fill="#555" font-weight="700">LANTAI 2 (130 m²) — ATAP DATAR + OVERHANG KAYU</text>
  <rect x="10" y="188" width="290" height="100" rx="3" fill="none" stroke="#333" stroke-width="2"/>

  <!-- KT Master -->
  <rect x="10" y="188" width="110" height="100" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="65" y="233" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT. MASTER</text>
  <text x="65" y="245" text-anchor="middle" fill="#1E3A8A">+ WALK-IN</text>
  <text x="65" y="257" text-anchor="middle" fill="#1E3A8A">5.5×5 m</text>

  <!-- KM Master -->
  <rect x="120" y="188" width="50" height="45" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/>
  <text x="145" y="212" text-anchor="middle" fill="#3730A3">KM</text>
  <text x="145" y="224" text-anchor="middle" fill="#3730A3">Master</text>

  <!-- KT 2 -->
  <rect x="170" y="188" width="80" height="100" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="210" y="233" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 2</text>
  <text x="210" y="245" text-anchor="middle" fill="#1E3A8A">4×5 m</text>

  <!-- KT 3 -->
  <rect x="250" y="188" width="50" height="100" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="275" y="233" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 3</text>
  <text x="275" y="245" text-anchor="middle" fill="#1E3A8A">2.5×5m</text>

  <!-- KM Lantai 2 -->
  <rect x="120" y="233" width="50" height="55" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/>
  <text x="145" y="258" text-anchor="middle" fill="#3730A3">KM 2</text>

  <!-- Balkon depan (dari render: ada balkon/overhang) -->
  <rect x="10" y="288" width="290" height="20" fill="#BBF7D0" stroke="#16A34A" stroke-width="1" stroke-dasharray="4,3" opacity="0.8"/>
  <text x="155" y="302" text-anchor="middle" fill="#166534">BALKON DEPAN — OVERHANG KAYU</text>

  <text x="10" y="308" font-size="8" fill="#555">■ Hijau = Ruang Hidup  ■ Biru = KT  ■ Kuning = Dapur  ■ Abu = Carport</text>
</svg>`;

/* ── PROJECT 4: Rumah 3 Lantai — Garasi 2 Mobil Bawah, Balkon Kaca, Bentuk Angular
   Luas ≈ 350 m² (120m²/Lt1, 115m²/Lt2-3, 12m × 10m)
   ── */
const denahP4 = `<svg viewBox="0 0 420 340" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif" font-size="9">
  <rect x="0" y="0" width="420" height="340" fill="#F0EDE8"/>
  <text x="10" y="16" font-size="10" fill="#888" font-weight="600" letter-spacing="1">DENAH 3 LANTAI — GARASI DOUBLE + BALKON KACA</text>

  <!-- LANTAI 1 — Garasi & Area Servis -->
  <text x="10" y="32" font-size="9" fill="#555" font-weight="700">LANTAI 1 (120 m²) — SEMI BASEMENT GARASI</text>
  <rect x="10" y="38" width="290" height="80" rx="3" fill="none" stroke="#333" stroke-width="2"/>

  <!-- GARASI 2 MOBIL (khas dari render: dominan bawah) -->
  <rect x="10" y="38" width="200" height="80" fill="#D1D5DB" stroke="#6B7280" stroke-width="1.5"/>
  <text x="110" y="73" text-anchor="middle" fill="#374151" font-weight="700">GARASI 2 MOBIL</text>
  <text x="110" y="85" text-anchor="middle" fill="#374151">10×4 m — Plafon Tinggi</text>
  <!-- Mobil 1 -->
  <rect x="20" y="52" width="80" height="50" rx="4" fill="#9CA3AF" stroke="#6B7280" stroke-width="1" opacity="0.5"/>
  <!-- Mobil 2 -->
  <rect x="115" y="52" width="80" height="50" rx="4" fill="#9CA3AF" stroke="#6B7280" stroke-width="1" opacity="0.5"/>

  <!-- LOBBY / LIFT / TANGGA -->
  <rect x="210" y="38" width="90" height="80" fill="#FEF3C7" stroke="#D97706" stroke-width="1.2"/>
  <text x="255" y="70" text-anchor="middle" fill="#92400E" font-weight="600">LOBBY +</text>
  <text x="255" y="82" text-anchor="middle" fill="#92400E">TANGGA</text>
  <text x="255" y="94" text-anchor="middle" fill="#92400E">+ GUDANG</text>

  <!-- LANTAI 2 — Living Area -->
  <text x="10" y="138" font-size="9" fill="#555" font-weight="700">LANTAI 2 (115 m²) — RUANG UTAMA + BALKON KACA</text>
  <rect x="10" y="144" width="290" height="90" rx="3" fill="none" stroke="#333" stroke-width="2"/>

  <!-- Ruang Tamu -->
  <rect x="10" y="144" width="130" height="90" fill="#BBF7D0" stroke="#16A34A" stroke-width="1.2"/>
  <text x="75" y="184" text-anchor="middle" fill="#166534" font-weight="600">RUANG TAMU</text>
  <text x="75" y="196" text-anchor="middle" fill="#166534">+ DINING</text>
  <text x="75" y="208" text-anchor="middle" fill="#166534">6.5×4.5 m</text>

  <!-- Balkon Kaca (dari render: balkon kaca depan lebar) -->
  <rect x="10" y="234" width="130" height="24" fill="#BFDBFE" stroke="#2563EB" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="75" y="249" text-anchor="middle" fill="#1D4ED8" font-weight="600">BALKON KACA LEBAR — 6.5m</text>

  <!-- Dapur -->
  <rect x="140" y="144" width="80" height="90" fill="#FDE68A" stroke="#D97706" stroke-width="1.2"/>
  <text x="180" y="184" text-anchor="middle" fill="#78350F" font-weight="600">DAPUR</text>
  <text x="180" y="196" text-anchor="middle" fill="#78350F">4×4.5 m</text>

  <!-- KM Tamu -->
  <rect x="220" y="144" width="80" height="45" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/>
  <text x="260" y="170" text-anchor="middle" fill="#3730A3">KM Tamu</text>

  <!-- Tangga -->
  <rect x="220" y="189" width="80" height="45" fill="#F3F4F6" stroke="#9CA3AF" stroke-width="1"/>
  <text x="260" y="215" text-anchor="middle" fill="#6B7280">TANGGA</text>

  <!-- LANTAI 3 — Kamar Tidur -->
  <text x="10" y="272" font-size="9" fill="#555" font-weight="700">LANTAI 3 (115 m²) — ZONA PRIVAT KAMAR TIDUR</text>
  <rect x="10" y="278" width="290" height="52" rx="3" fill="none" stroke="#333" stroke-width="2"/>

  <!-- KT Master -->
  <rect x="10" y="278" width="110" height="52" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="65" y="301" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT. MASTER</text>
  <text x="65" y="313" text-anchor="middle" fill="#1E3A8A">+ EN-SUITE</text>

  <!-- KT 2 -->
  <rect x="120" y="278" width="90" height="52" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="165" y="301" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 2</text>
  <text x="165" y="313" text-anchor="middle" fill="#1E3A8A">4.5×2.6 m</text>

  <!-- KT 3 -->
  <rect x="210" y="278" width="90" height="52" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="255" y="301" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 3 + KM</text>
  <text x="255" y="313" text-anchor="middle" fill="#1E3A8A">4.5×2.6 m</text>

  <text x="10" y="336" font-size="8" fill="#555">■ Abu = Garasi  ■ Hijau = Living  ■ Biru = KT  ■ Kuning = Dapur  ■ Biru muda = Balkon Kaca</text>
</svg>`;

/* ── PROJECT 5: Rumah 2 Lantai Minimalis Tropis — Louver Kayu, Garasi, Balkon Kaca, Krem
   Luas ≈ 260 m² (130 m²/lantai, 13m × 10m)
   ── */
const denahP5 = `<svg viewBox="0 0 420 310" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif" font-size="9">
  <rect x="0" y="0" width="420" height="310" fill="#F0EDE8"/>
  <text x="10" y="16" font-size="10" fill="#888" font-weight="600" letter-spacing="1">DENAH 2 LANTAI — MINIMALIS TROPIS + LOUVER KAYU</text>

  <!-- LANTAI 1 -->
  <text x="10" y="32" font-size="9" fill="#555" font-weight="700">LANTAI 1 (130 m²)</text>
  <rect x="10" y="38" width="300" height="120" rx="3" fill="none" stroke="#333" stroke-width="2"/>

  <!-- Garasi (dari render: garasi kanan, 1 mobil) -->
  <rect x="180" y="38" width="130" height="80" fill="#E5E7EB" stroke="#6B7280" stroke-width="1.5"/>
  <text x="245" y="75" text-anchor="middle" fill="#374151" font-weight="600">GARASI</text>
  <text x="245" y="87" text-anchor="middle" fill="#374151">1 Mobil — 6.5×4 m</text>

  <!-- Foyer / Teras Masuk (tangga masuk dari render) -->
  <rect x="10" y="38" width="60" height="40" fill="#D1FAE5" stroke="#059669" stroke-width="1"/>
  <text x="40" y="55" text-anchor="middle" fill="#065F46">TERAS</text>
  <text x="40" y="67" text-anchor="middle" fill="#065F46">MASUK</text>

  <!-- Ruang Tamu -->
  <rect x="70" y="38" width="110" height="80" fill="#BBF7D0" stroke="#16A34A" stroke-width="1.2"/>
  <text x="125" y="74" text-anchor="middle" fill="#166534" font-weight="600">RUANG TAMU</text>
  <text x="125" y="86" text-anchor="middle" fill="#166534">5.5×4 m</text>

  <!-- Dapur + Dining -->
  <rect x="10" y="78" width="60" height="80" fill="#FDE68A" stroke="#D97706" stroke-width="1.2"/>
  <text x="40" y="110" text-anchor="middle" fill="#78350F" font-weight="600">DAPUR</text>
  <text x="40" y="122" text-anchor="middle" fill="#78350F">3×4 m</text>

  <!-- Ruang Keluarga -->
  <rect x="70" y="118" width="110" height="40" fill="#A7F3D0" stroke="#059669" stroke-width="1.2"/>
  <text x="125" y="142" text-anchor="middle" fill="#065F46" font-weight="600">R. KELUARGA — 5.5×2 m</text>

  <!-- KM Tamu -->
  <rect x="180" y="118" width="130" height="40" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/>
  <text x="245" y="142" text-anchor="middle" fill="#3730A3">KM TAMU + UTILITAS</text>

  <!-- TANGGA (dari render: ada akses tangga di tengah) -->
  <rect x="300" y="38" width="40" height="120" fill="#F9FAFB" stroke="#D1D5DB" stroke-width="1" stroke-dasharray="4,2"/>
  <text x="320" y="95" text-anchor="middle" fill="#9CA3AF" transform="rotate(-90,320,95)">TANGGA</text>
  
  <!-- Taman Samping / RTH -->
  <rect x="340" y="38" width="70" height="120" fill="#BBF7D0" stroke="#16A34A" stroke-width="1" stroke-dasharray="5,3" opacity="0.8"/>
  <text x="375" y="95" text-anchor="middle" fill="#166534">TAMAN</text>
  <text x="375" y="107" text-anchor="middle" fill="#166534">SAMPING</text>

  <!-- LANTAI 2 -->
  <text x="10" y="176" font-size="9" fill="#555" font-weight="700">LANTAI 2 (130 m²) — LOUVER KAYU + BALKON KACA</text>
  <rect x="10" y="182" width="300" height="110" rx="3" fill="none" stroke="#333" stroke-width="2"/>

  <!-- KT Master -->
  <rect x="10" y="182" width="130" height="110" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.5"/>
  <text x="75" y="232" text-anchor="middle" fill="#1E3A8A" font-weight="700">KT. MASTER</text>
  <text x="75" y="244" text-anchor="middle" fill="#1E3A8A">6.5×5.5 m</text>
  <!-- Louver kayu (elemen khas render kiri) -->
  <rect x="10" y="182" width="16" height="110" fill="#D97706" opacity="0.3"/>
  <text x="18" y="237" text-anchor="middle" fill="#92400E" font-size="7" transform="rotate(-90,18,237)">LOUVER KAYU</text>

  <!-- KM Master -->
  <rect x="140" y="182" width="50" height="55" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/>
  <text x="165" y="207" text-anchor="middle" fill="#3730A3">KM</text>
  <text x="165" y="219" text-anchor="middle" fill="#3730A3">Master</text>

  <!-- KT 2 -->
  <rect x="190" y="182" width="120" height="110" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="250" y="232" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 2</text>
  <text x="250" y="244" text-anchor="middle" fill="#1E3A8A">6×5.5 m</text>

  <!-- KM 2 -->
  <rect x="140" y="237" width="50" height="55" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/>
  <text x="165" y="265" text-anchor="middle" fill="#3730A3">KM 2</text>

  <!-- Balkon kaca depan -->
  <rect x="10" y="292" width="300" height="20" fill="#BFDBFE" stroke="#2563EB" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="160" y="306" text-anchor="middle" fill="#1D4ED8" font-weight="600">BALKON KACA DEPAN — RAILING TRANSPARAN</text>

  <text x="10" y="308" font-size="8" fill="#555">■ Biru = KT  ■ Hijau = Living  ■ Kuning = Dapur  ■ Abu = Garasi  ■ Coklat = Louver</text>
</svg>`;

/* ── PROJECT 6: Rumah 3 Lantai — Silinder/Lengkung Unik, Garasi Besar, Kayu Tropis
   Luas ≈ 420 m² (140 m²/lantai, 14m × 10m)
   ── */
const denahP6 = `<svg viewBox="0 0 420 360" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif" font-size="9">
  <rect x="0" y="0" width="420" height="360" fill="#F0EDE8"/>
  <text x="10" y="16" font-size="10" fill="#888" font-weight="600" letter-spacing="1">DENAH 3 LANTAI — SILINDER + LENGKUNG ORGANIK</text>

  <!-- LANTAI 1 -->
  <text x="10" y="32" font-size="9" fill="#555" font-weight="700">LANTAI 1 (140 m²) — GARASI BESAR + LOBBY</text>
  <rect x="10" y="38" width="300" height="90" rx="3" fill="none" stroke="#333" stroke-width="2"/>

  <!-- Garasi 3 Mobil -->
  <rect x="10" y="38" width="210" height="90" fill="#D1D5DB" stroke="#6B7280" stroke-width="1.5"/>
  <text x="115" y="78" text-anchor="middle" fill="#374151" font-weight="700">GARASI 3 MOBIL</text>
  <text x="115" y="90" text-anchor="middle" fill="#374151">10.5×4.5 m</text>

  <!-- Elemen Silinder kiri (khas dari render) -->
  <circle cx="30" cy="56" r="18" fill="#E5E7EB" stroke="#6B7280" stroke-width="1.5" opacity="0.6"/>
  <text x="30" y="59" text-anchor="middle" fill="#374151" font-size="7">SIL</text>

  <!-- Lobby -->
  <rect x="220" y="38" width="90" height="90" fill="#FEF3C7" stroke="#D97706" stroke-width="1.2"/>
  <text x="265" y="78" text-anchor="middle" fill="#92400E" font-weight="600">LOBBY +</text>
  <text x="265" y="90" text-anchor="middle" fill="#92400E">TANGGA</text>

  <!-- Elemen Silinder kanan -->
  <circle cx="390" cy="83" r="28" fill="#F5F3EF" stroke="#78716C" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="390" y="80" text-anchor="middle" fill="#57534E" font-size="8">KOLOM</text>
  <text x="390" y="92" text-anchor="middle" fill="#57534E" font-size="8">SILINDER</text>

  <!-- LANTAI 2 -->
  <text x="10" y="145" font-size="9" fill="#555" font-weight="700">LANTAI 2 (140 m²) — RUANG UTAMA + BALKON MELINGKAR</text>
  <rect x="10" y="151" width="300" height="90" rx="3" fill="none" stroke="#333" stroke-width="2"/>

  <!-- Ruang Tamu -->
  <rect x="10" y="151" width="120" height="90" fill="#BBF7D0" stroke="#16A34A" stroke-width="1.2"/>
  <text x="70" y="191" text-anchor="middle" fill="#166534" font-weight="600">RUANG TAMU</text>
  <text x="70" y="203" text-anchor="middle" fill="#166534">6×4.5 m</text>

  <!-- Balkon melingkar kiri (khas render: silinder bertumpuk) -->
  <circle cx="10" cy="196" r="30" fill="#D1FAE5" stroke="#059669" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.8"/>
  <text x="10" y="194" text-anchor="middle" fill="#065F46" font-size="8">BALKON</text>
  <text x="10" y="206" text-anchor="middle" fill="#065F46" font-size="8">MELINGKAR</text>

  <!-- Dining + Dapur -->
  <rect x="130" y="151" width="90" height="90" fill="#FDE68A" stroke="#D97706" stroke-width="1.2"/>
  <text x="175" y="191" text-anchor="middle" fill="#78350F" font-weight="600">DINING +</text>
  <text x="175" y="203" text-anchor="middle" fill="#78350F">DAPUR</text>
  <text x="175" y="215" text-anchor="middle" fill="#78350F">4.5×4.5 m</text>

  <!-- KM Tamu -->
  <rect x="220" y="151" width="90" height="45" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/>
  <text x="265" y="177" text-anchor="middle" fill="#3730A3">KM + TANGGA</text>

  <!-- Balkon kanan melingkar -->
  <circle cx="390" cy="196" r="30" fill="#D1FAE5" stroke="#059669" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.8"/>
  <text x="390" y="194" text-anchor="middle" fill="#065F46" font-size="8">BALKON</text>
  <text x="390" y="206" text-anchor="middle" fill="#065F46" font-size="8">MELINGKAR</text>

  <!-- Studio/Ruang Kerja -->
  <rect x="220" y="196" width="90" height="45" fill="#F5F3FF" stroke="#7C3AED" stroke-width="1"/>
  <text x="265" y="222" text-anchor="middle" fill="#5B21B6">STUDIO/</text>
  <text x="265" y="234" text-anchor="middle" fill="#5B21B6">R. KERJA</text>

  <!-- LANTAI 3 -->
  <text x="10" y="258" font-size="9" fill="#555" font-weight="700">LANTAI 3 (140 m²) — ZONA PRIVAT + ROOFTOP</text>
  <rect x="10" y="264" width="300" height="72" rx="3" fill="none" stroke="#333" stroke-width="2"/>

  <!-- KT Master -->
  <rect x="10" y="264" width="110" height="72" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.5"/>
  <text x="65" y="296" text-anchor="middle" fill="#1E3A8A" font-weight="700">KT. MASTER</text>
  <text x="65" y="308" text-anchor="middle" fill="#1E3A8A">+ EN-SUITE</text>

  <!-- KT 2 -->
  <rect x="120" y="264" width="100" height="72" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="170" y="296" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 2</text>
  <text x="170" y="308" text-anchor="middle" fill="#1E3A8A">5×3.6 m</text>

  <!-- KT 3 + Rooftop akses -->
  <rect x="220" y="264" width="90" height="72" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="265" y="293" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 3 +</text>
  <text x="265" y="305" text-anchor="middle" fill="#1E3A8A">AKSES</text>
  <text x="265" y="317" text-anchor="middle" fill="#1E3A8A">ROOFTOP</text>

  <!-- Elemen Silinder lantai 3 -->
  <circle cx="30" cy="285" r="18" fill="#F5F3EF" stroke="#78716C" stroke-width="1.5" opacity="0.5" stroke-dasharray="3,2"/>
  <circle cx="390" cy="285" r="18" fill="#F5F3EF" stroke="#78716C" stroke-width="1.5" opacity="0.5" stroke-dasharray="3,2"/>

  <!-- Overhang kayu atap -->
  <rect x="10" y="336" width="300" height="14" fill="#D97706" opacity="0.25" stroke="#B45309" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="155" y="346" text-anchor="middle" fill="#92400E" font-size="8">OVERHANG KAYU — ATAP RENDAH (khas render)</text>

  <text x="10" y="358" font-size="8" fill="#555">■ Abu = Garasi  ■ Biru = KT  ■ Hijau = Living  ■ Kuning = Dapur  ■ ○ = Kolom Silinder</text>
</svg>`;

/* ── PROJECT 7: Rumah 2 Lantai Modern Dark Concrete — Atap Segitiga Kaca, Lebar
   Luas ≈ 240 m² (120 m²/lantai, 12m × 10m)
   ── */
const denahP7 = `<svg viewBox="0 0 420 310" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif" font-size="9">
  <rect x="0" y="0" width="420" height="310" fill="#F0EDE8"/>
  <text x="10" y="16" font-size="10" fill="#888" font-weight="600" letter-spacing="1">DENAH 2 LANTAI — DARK CONCRETE + ATAP SEGITIGA KACA</text>

  <!-- LANTAI 1 -->
  <text x="10" y="32" font-size="9" fill="#555" font-weight="700">LANTAI 1 (120 m²) — OPEN PLAN + KACA LEBAR</text>
  <rect x="10" y="38" width="290" height="110" rx="3" fill="none" stroke="#333" stroke-width="2.5"/>

  <!-- CURTAIN WALL (khas render: kaca lebar full depan) -->
  <rect x="10" y="38" width="290" height="10" fill="#93C5FD" stroke="#1D4ED8" stroke-width="1" opacity="0.9"/>
  <text x="155" y="46" text-anchor="middle" fill="#1E3A8A" font-size="8" font-weight="700">CURTAIN WALL KACA LEBAR — 12m</text>

  <!-- Ruang Tamu Open (dari render: interior terlihat dari luar) -->
  <rect x="10" y="48" width="180" height="100" fill="#A7F3D0" stroke="#059669" stroke-width="1.5"/>
  <text x="100" y="93" text-anchor="middle" fill="#065F46" font-weight="700">RUANG TAMU</text>
  <text x="100" y="105" text-anchor="middle" fill="#065F46">OPEN PLAN</text>
  <text x="100" y="117" text-anchor="middle" fill="#065F46">9×5 m</text>

  <!-- Dapur -->
  <rect x="190" y="48" width="60" height="60" fill="#FDE68A" stroke="#D97706" stroke-width="1.2"/>
  <text x="220" y="74" text-anchor="middle" fill="#78350F" font-weight="600">DAPUR</text>
  <text x="220" y="86" text-anchor="middle" fill="#78350F">3×3 m</text>

  <!-- KM Tamu -->
  <rect x="250" y="48" width="50" height="60" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/>
  <text x="275" y="74" text-anchor="middle" fill="#3730A3">KM</text>
  <text x="275" y="86" text-anchor="middle" fill="#3730A3">Tamu</text>

  <!-- Tangga ke lantai 2 -->
  <rect x="190" y="108" width="110" height="40" fill="#F3F4F6" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4,2"/>
  <text x="245" y="132" text-anchor="middle" fill="#6B7280">TANGGA + UTILITAS</text>

  <!-- Pintu Utama (dari render: double door gelap tengah) -->
  <rect x="120" y="38" width="50" height="8" fill="#1F2937" opacity="0.5"/>
  <text x="145" y="44" text-anchor="middle" fill="#fff" font-size="7">PINTU UTAMA</text>

  <!-- Teras dengan tangga masuk -->
  <rect x="10" y="148" width="290" height="25" fill="#D1FAE5" stroke="#16A34A" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="155" y="163" text-anchor="middle" fill="#166534">TERAS BERUNDAK — PLAT BETON + TANAMAN</text>

  <!-- LANTAI 2 -->
  <text x="10" y="186" font-size="9" fill="#555" font-weight="700">LANTAI 2 (120 m²) — ZONA PRIVAT + ATAP SEGITIGA KACA</text>
  <rect x="10" y="192" width="290" height="100" rx="3" fill="none" stroke="#333" stroke-width="2.5"/>

  <!-- Atap Kaca Segitiga (void/skylight dari render) -->
  <polygon points="155,192 60,220 250,220" fill="#BFDBFE" stroke="#2563EB" stroke-width="1.5" opacity="0.6"/>
  <text x="155" y="212" text-anchor="middle" fill="#1D4ED8" font-size="8" font-weight="700">SKYLIGHT SEGITIGA</text>

  <!-- KT Master -->
  <rect x="10" y="192" width="130" height="100" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.5"/>
  <text x="75" y="237" text-anchor="middle" fill="#1E3A8A" font-weight="700">KT. MASTER</text>
  <text x="75" y="249" text-anchor="middle" fill="#1E3A8A">6.5×5 m</text>
  <text x="75" y="261" text-anchor="middle" fill="#1E3A8A">+KM EN-SUITE</text>

  <!-- KT 2 -->
  <rect x="140" y="192" width="90" height="100" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="185" y="237" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 2</text>
  <text x="185" y="249" text-anchor="middle" fill="#1E3A8A">4.5×5 m</text>

  <!-- KT 3 -->
  <rect x="230" y="192" width="70" height="60" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.2"/>
  <text x="265" y="222" text-anchor="middle" fill="#1E3A8A" font-weight="600">KT 3</text>
  <text x="265" y="234" text-anchor="middle" fill="#1E3A8A">3.5×3m</text>

  <!-- KM Lantai 2 -->
  <rect x="230" y="252" width="70" height="40" fill="#E0E7FF" stroke="#4338CA" stroke-width="1"/>
  <text x="265" y="275" text-anchor="middle" fill="#3730A3">KM 2</text>

  <text x="10" y="308" font-size="8" fill="#555">■ Hijau = Living + Kaca  ■ Biru = KT  ■ Biru muda = Skylight  ■ Kuning = Dapur</text>
</svg>`;

/* ── PROJECT 8: Weird Coffee — Fasad Box Gelap, 1 Lantai, 50 m²
   Luas ≈ 50 m² (10m × 5m), Semi-outdoor + Counter Bar
   ── */
const denahP8 = `<svg viewBox="0 0 420 280" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif" font-size="9">
  <rect x="0" y="0" width="420" height="280" fill="#F0EDE8"/>
  <text x="10" y="16" font-size="10" fill="#888" font-weight="600" letter-spacing="1">DENAH LANTAI 1 — WEIRD COFFEE (FASAD BOX)</text>

  <!-- BANGUNAN UTAMA (10m × 5m → skala 200×100) -->
  <rect x="100" y="40" width="200" height="140" rx="2" fill="none" stroke="#1F2937" stroke-width="2.5"/>

  <!-- FASAD BOX DEPAN (dari render: panel gelap vertikal + lampu garis) -->
  <rect x="100" y="40" width="200" height="14" fill="#374151" stroke="#111827" stroke-width="1"/>
  <text x="200" y="51" text-anchor="middle" fill="#F9FAFB" font-size="8" font-weight="700">FASAD BOX — PANEL ALUMINIUM DARK GREY</text>
  <!-- Lampu garis vertikal khas -->
  <line x1="155" y1="40" x2="155" y2="180" stroke="#FCD34D" stroke-width="1.5" opacity="0.6"/>
  <line x1="245" y1="40" x2="245" y2="180" stroke="#FCD34D" stroke-width="1.5" opacity="0.6"/>
  <text x="130" y="110" text-anchor="middle" fill="#FCD34D" font-size="7" transform="rotate(-90,130,110)">LAMPU GARIS</text>

  <!-- BAR COUNTER (dari render: counter dalam, posisi kanan) -->
  <rect x="230" y="54" width="60" height="110" rx="2" fill="#92400E" stroke="#78350F" stroke-width="1.5"/>
  <text x="260" y="100" text-anchor="middle" fill="#FEF3C7" font-weight="700">BAR</text>
  <text x="260" y="112" text-anchor="middle" fill="#FEF3C7">COUNTER</text>
  <text x="260" y="124" text-anchor="middle" fill="#FEF3C7">3×5.5 m</text>
  <!-- Meja bar -->
  <rect x="215" y="60" width="15" height="100" rx="2" fill="#B45309" opacity="0.7"/>

  <!-- AREA DUDUK INDOOR (dari render: kursi-kursi dalam, kiri) -->
  <rect x="100" y="54" width="120" height="110" rx="2" fill="#F5C4B3" stroke="#993C1D" stroke-width="1.2"/>
  <text x="160" y="100" text-anchor="middle" fill="#7C2D12" font-weight="600">AREA DUDUK</text>
  <text x="160" y="112" text-anchor="middle" fill="#7C2D12">INDOOR</text>
  <text x="160" y="124" text-anchor="middle" fill="#7C2D12">6×5.5 m</text>
  <!-- Meja-kursi dalam -->
  <rect x="110" y="65" width="28" height="20" rx="2" fill="#FECACA" stroke="#DC2626" stroke-width="0.8" opacity="0.6"/>
  <rect x="145" y="65" width="28" height="20" rx="2" fill="#FECACA" stroke="#DC2626" stroke-width="0.8" opacity="0.6"/>
  <rect x="110" y="95" width="28" height="20" rx="2" fill="#FECACA" stroke="#DC2626" stroke-width="0.8" opacity="0.6"/>
  <rect x="145" y="95" width="28" height="20" rx="2" fill="#FECACA" stroke="#DC2626" stroke-width="0.8" opacity="0.6"/>
  <rect x="110" y="125" width="60" height="20" rx="2" fill="#FECACA" stroke="#DC2626" stroke-width="0.8" opacity="0.6"/>

  <!-- PINTU KACA (dari render: pintu kaca frame hitam) -->
  <rect x="170" y="166" width="50" height="14" fill="#BFDBFE" stroke="#1D4ED8" stroke-width="1.5"/>
  <text x="195" y="176" text-anchor="middle" fill="#1D4ED8" font-size="8">PINTU KACA</text>

  <!-- SEMI OUTDOOR / TERAS (dari render: kursi kayu di luar) -->
  <rect x="60" y="180" width="290" height="60" rx="3" fill="#FEF3C7" stroke="#D97706" stroke-width="1.2" stroke-dasharray="5,3"/>
  <text x="205" y="205" text-anchor="middle" fill="#78350F" font-weight="600">AREA SEMI-OUTDOOR / TERAS</text>
  <text x="205" y="218" text-anchor="middle" fill="#78350F">Kursi Kayu + Pot Tanaman — 14.5×3 m</text>
  <!-- Kursi outdoor -->
  <rect x="80" y="186" width="30" height="20" rx="3" fill="#FDE68A" stroke="#B45309" stroke-width="1" opacity="0.7"/>
  <rect x="120" y="186" width="30" height="20" rx="3" fill="#FDE68A" stroke="#B45309" stroke-width="1" opacity="0.7"/>
  <rect x="160" y="186" width="30" height="20" rx="3" fill="#FDE68A" stroke="#B45309" stroke-width="1" opacity="0.7"/>

  <!-- POT TANAMAN (dari render: planter box) -->
  <rect x="60" y="180" width="14" height="60" rx="4" fill="#BBF7D0" stroke="#16A34A" stroke-width="1"/>
  <rect x="336" y="180" width="14" height="60" rx="4" fill="#BBF7D0" stroke="#16A34A" stroke-width="1"/>
  <text x="67" y="210" text-anchor="middle" fill="#15803D" font-size="7" transform="rotate(-90,67,210)">POT</text>
  <text x="343" y="210" text-anchor="middle" fill="#15803D" font-size="7" transform="rotate(-90,343,210)">POT</text>

  <!-- SIGNAGE / FASAD KOLOM -->
  <rect x="85" y="40" width="14" height="140" rx="2" fill="#374151" stroke="#111827" stroke-width="1.5"/>
  <text x="92" y="110" text-anchor="middle" fill="#FCD34D" font-size="7" transform="rotate(-90,92,110)">WEIRD COFFEE</text>

  <!-- DIMENSI -->
  <line x1="100" y1="255" x2="300" y2="255" stroke="#555" stroke-width="1" marker-end="url(#arrow)"/>
  <text x="200" y="268" text-anchor="middle" fill="#555" font-weight="600">10 METER</text>
  <line x1="60" y1="40" x2="60" y2="180" stroke="#555" stroke-width="1"/>
  <text x="45" y="112" text-anchor="middle" fill="#555" font-weight="600" transform="rotate(-90,45,112)">5 M</text>

  <text x="10" y="278" font-size="8" fill="#555">■ Coklat = Counter Bar  ■ Merah muda = Duduk Indoor  ■ Kuning = Teras Outdoor  ■ Hitam = Fasad Box</text>
</svg>`;


/* ============================================================
   DATA PROYEK — LENGKAP & AKURAT
   ============================================================ */
const projects = [
  {
    name: "Rumah Hunian Modern 1 Lantai",
    type: "Residensial",
    emoji: "🏠",
    color: "#E1F5EE",
    desc: "Rumah 1 lantai modern dengan konsep terbuka bergaya barn-modern. Atap segitiga ganda (dual gable) dengan curtain wall kaca tinggi memaksimalkan cahaya alami. Carport terintegrasi di sisi kanan, teras semi-outdoor menghadap taman stepping stone. Fasad: beton ekspos + cladding kayu vertikal + kaca hitam framing.",
    info: [
      { label: "Luas Bangunan", value: "180 m²" },
      { label: "Luas Tanah",    value: "±320 m²" },
      { label: "Jumlah Lantai", value: "1 Lantai" },
      { label: "Kamar Tidur",   value: "3 KT + 2 KM" },
      { label: "Carport",       value: "1 Mobil" },
      { label: "Tahun",         value: "2026" }
    ],
    denah: denahP1,
    legend: [
      { color: "#BBF7D0", label: "Ruang Tamu + Kaca" },
      { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#FDE68A", label: "Dapur / Dining" },
      { color: "#D1D5DB", label: "Carport" },
      { color: "#93C5FD", label: "Curtain Wall Kaca" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "Rumah1Lantai_Modern.skp",   size: "38.2 MB", type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_Lantai1.dwg",         size: "9.4 MB",  type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Gambar_Kerja_Lengkap.pdf",  size: "12.6 MB", type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Hunian 3 Lantai Neo-Futuristik",
    type: "Residensial",
    emoji: "🏠",
    color: "#E6F1FB",
    desc: "Desain neo-futuristik dengan bentuk organik melengkung pada masa bangunan. Volume putih bersih dengan bukaan kaca besar berbentuk kurva, balkon organik menonjol di lantai 2, dan garasi menyatu di bawah massa utama. Konsep fasad: pure white plaster + glass curtain + black steel framing.",
    info: [
      { label: "Luas Bangunan",  value: "260 m²" },
      { label: "Luas per Lantai", value: "130 m²" },
      { label: "Jumlah Lantai",  value: "3 Lantai" },
      { label: "Kamar Tidur",    value: "3 KT + 2 KM" },
      { label: "Garasi",         value: "2 Mobil" },
      { label: "Tahun",          value: "2026" }
    ],
    denah: denahP2,
    legend: [
      { color: "#C7D2FE", label: "Ruang Tamu Open" },
      { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#FDE68A", label: "Dapur + Dining" },
      { color: "#D1FAE5", label: "Balkon Organik" },
      { color: "#D1D5DB", label: "Garasi" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "NeoFuturistik_2Lt.rvt",      size: "124 MB", type: "Revit",    url: "#" },
      { icon: "ti-file-vector",   name: "Denah_Lt1_Lt2_Kurva.dwg",    size: "18.7 MB", type: "AutoCAD", url: "#" },
      { icon: "ti-file-type-pdf", name: "Konsep_Desain_Lengkap.pdf",  size: "22 MB",  type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Hunian 2 Lantai Modern Tropis",
    type: "Residensial",
    emoji: "🏠",
    color: "#FAEEDA",
    desc: "Rumah 2 lantai bergaya kontemporer tropis. Atap datar dengan overhang kayu ulin lebar untuk perlindungan hujan dan peneduh. Carport terintegrasi di kiri bawah, fasad paduan white plaster dan kayu. Lantai 2 memiliki balkon dengan railing kaca. Tanaman tropis di sisi bangunan menciptakan suasana hijau alami.",
    info: [
      { label: "Luas Bangunan",  value: "260 m²" },
      { label: "Luas per Lantai", value: "130 m²" },
      { label: "Jumlah Lantai",  value: "2 Lantai" },
      { label: "Kamar Tidur",    value: "3 KT + 2 KM" },
      { label: "Carport",        value: "1 Mobil" },
      { label: "Tahun",          value: "2023" }
    ],
    denah: denahP3,
    legend: [
      { color: "#BBF7D0", label: "Ruang Tamu/Keluarga" },
      { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#FDE68A", label: "Dapur" },
      { color: "#D1D5DB", label: "Carport" },
      { color: "#D1FAE5", label: "Taman/Balkon" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "Rumah2Lt_Tropis.skp",     size: "35.8 MB", type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_Lt1_Lt2.dwg",       size: "9.2 MB",  type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Gambar_Kerja_Lengkap.pdf", size: "14 MB",  type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Hunian 3 Lantai — Garasi Double",
    type: "Residensial",
    emoji: "🏘️",
    color: "#EAF3DE",
    desc: "Rumah 3 lantai modern dengan garasi double (2 mobil) di lantai dasar semi-basement. Fasad krem dengan balkon kaca memanjang di lantai 2, elemen plat beton menonjol, dan atap cantilever angular. Lantai 3 sebagai zona privat murni. Konsep: stacked volumes dengan garasi sebagai podium bangunan.",
    info: [
      { label: "Luas Bangunan",  value: "350 m²" },
      { label: "Luas per Lantai", value: "~117 m²" },
      { label: "Jumlah Lantai",  value: "3 Lantai" },
      { label: "Kamar Tidur",    value: "3 KT + 2 KM" },
      { label: "Garasi",         value: "2 Mobil" },
      { label: "Tahun",          value: "2026" }
    ],
    denah: denahP4,
    legend: [
      { color: "#D1D5DB", label: "Garasi 2 Mobil" },
      { color: "#BBF7D0", label: "Ruang Tamu/Dining" },
      { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#93C5FD", label: "Balkon Kaca" },
      { color: "#FEF3C7", label: "Lobby/Tangga" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "Rumah3Lt_GarasiDouble.skp", size: "67 MB",  type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_Lt1-2-3.dwg",         size: "24 MB",  type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Konsep_Material.pdf",        size: "5.4 MB", type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Weird Coffee",
    type: "Komersil",
    emoji: "☕",
    color: "#FBEAF0",
    desc: "Kedai kopi dengan konsep Fasad Box — panel aluminium dark grey tebal dengan lampu garis vertikal LED sebagai elemen dramatik. Signage 'Weird Coffee' pada bidang box atas. Area indoor 6m² + area semi-outdoor dengan kursi kayu dan planter box. Bar counter kayu natural di dalam sebagai focal point.",
    info: [
      { label: "Luas Bangunan", value: "50 m²" },
      { label: "Luas Outdoor",  value: "±43 m²" },
      { label: "Kapasitas",     value: "15 kursi indoor + 9 outdoor" },
      { label: "Konsep",        value: "Fasad Box Dark Grey" },
      { label: "Lampu",         value: "LED Garis Vertikal" },
      { label: "Tahun",         value: "2026" }
    ],
    denah: denahP8,
    legend: [
      { color: "#374151", label: "Fasad Box Aluminium" },
      { color: "#F5C4B3", label: "Area Duduk Indoor" },
      { color: "#92400E", label: "Bar Counter" },
      { color: "#FEF3C7", label: "Teras Semi-Outdoor" },
      { color: "#BBF7D0", label: "Planter Box Tanaman" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "WeirdCoffee_Fasad.skp",   size: "28 MB",  type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_WeirdCoffee.dwg",   size: "7.1 MB", type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Konsep_Interior.pdf",      size: "9 MB",   type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Minimalis — Silinder Organik",
    type: "Residensial",
    emoji: "🏠",
    color: "#EEEDFE",
    desc: "Rumah 3 lantai dengan elemen silinder beton putih bertumpuk pada fasad — desain eksklusif yang memadukan geometri organik dan material alam. Atap rendah kayu melayang di atas massa utama. Garasi lebar untuk 3 kendaraan. Balkon melingkar di tiap lantai mengikuti bentuk kolom silinder.",
    info: [
      { label: "Luas Bangunan",  value: "420 m²" },
      { label: "Luas per Lantai", value: "140 m²" },
      { label: "Jumlah Lantai",  value: "3 Lantai" },
      { label: "Kamar Tidur",    value: "3 KT + 3 KM" },
      { label: "Garasi",         value: "3 Mobil" },
      { label: "Tahun",          value: "2026" }
    ],
    denah: denahP6,
    legend: [
      { color: "#D1D5DB", label: "Garasi 3 Mobil" },
      { color: "#BBF7D0", label: "Ruang Tamu" },
      { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#FDE68A", label: "Dapur + Dining" },
      { color: "#F5F3EF", label: "Kolom Silinder" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "Silinder3Lt_Model.skp",  size: "22 MB",  type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_SilinderOrganic.dwg", size: "5.8 MB", type: "AutoCAD", url: "#" },
      { icon: "ti-file-type-pdf", name: "RAB_Gambar_Lengkap.pdf", size: "11 MB",  type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Hunian 2 Lantai — Dark Concrete",
    type: "Residensial",
    emoji: "🏠",
    color: "#FAECE7",
    desc: "Rumah 2 lantai dengan material beton ekspos gelap (dark concrete) dan atap segitiga kaca besar sebagai focal point. Curtain wall kaca memanjang di lantai 1 menampilkan interior dari luar. Tangga masuk berundak dengan tanaman tropis di sisi. Skylight segitiga di lantai 2 menghadirkan cahaya alami dramatis.",
    info: [
      { label: "Luas Bangunan",  value: "240 m²" },
      { label: "Luas per Lantai", value: "120 m²" },
      { label: "Jumlah Lantai",  value: "2 Lantai" },
      { label: "Kamar Tidur",    value: "3 KT + 2 KM" },
      { label: "Material Fasad", value: "Dark Concrete + Kaca" },
      { label: "Tahun",          value: "2026" }
    ],
    denah: denahP7,
    legend: [
      { color: "#A7F3D0", label: "Ruang Tamu Open" },
      { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#93C5FD", label: "Skylight Segitiga" },
      { color: "#FDE68A", label: "Dapur" },
      { color: "#D1FAE5", label: "Teras Berundak" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "DarkConcrete_2Lt.skp",   size: "58 MB",  type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_Lengkap.dwg",       size: "13 MB",  type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Konsep_Material.pdf",     size: "19 MB",  type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Hunian 2 Lantai — Minimalis Tropis",
    type: "Residensial",
    emoji: "🏠",
    color: "#FAEEDA",
    desc: "Rumah 2 lantai minimalis tropis dengan palet warna krem warm. Louver kayu vertikal pada lantai 2 sebagai elemen shading dan estetika. Garasi kanan dengan carport, balkon kaca railing transparan. Entrance dengan tangga bertingkat dan lansekap tanaman tropis. Overhang atap tipis melayang di atas entrance.",
    info: [
      { label: "Luas Bangunan",  value: "260 m²" },
      { label: "Luas per Lantai", value: "130 m²" },
      { label: "Jumlah Lantai",  value: "2 Lantai" },
      { label: "Kamar Tidur",    value: "2 KT + 2 KM" },
      { label: "Garasi",         value: "1 Mobil" },
      { label: "Tahun",          value: "2026" }
    ],
    denah: denahP5,
    legend: [
      { color: "#BBF7D0", label: "Ruang Tamu/Keluarga" },
      { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#FDE68A", label: "Dapur" },
      { color: "#D97706", label: "Louver Kayu" },
      { color: "#D1D5DB", label: "Garasi" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "Minimalis_Tropis_2Lt.skp", size: "58 MB",  type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_Lengkap.dwg",         size: "13 MB",  type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Konsep_Material.pdf",       size: "19 MB",  type: "PDF",      url: "#" }
    ]
  }
];
 
  /* ============================================================
     STATE & FUNGSI UTAMA
  ============================================================ */
  let currentIndex = 0;
 
  function openModal(idx) {
    currentIndex = idx;
    populateModal(idx);
    document.getElementById('pfModalBackdrop').classList.add('open');
    switchTab('konsep');
    document.body.style.overflow = 'hidden';
  }
 
  function closeModal() {
    document.getElementById('pfModalBackdrop').classList.remove('open');
    document.body.style.overflow = '';
  }
 
  function populateModal(idx) {
    const p = projects[idx];
    document.getElementById('modalTitle').textContent = p.name;
    document.getElementById('modalType').textContent  = p.type;
 
    // Konsep
    document.getElementById('konsepVisual').innerHTML =
      `<span style="font-size:64px">${p.emoji}</span>
       <span class="pf-preview-label">${p.type} — Visualisasi Konsep</span>`;
    document.getElementById('konsepDesc').textContent = p.desc;
    document.getElementById('infoGrid').innerHTML = p.info.map(f =>
      `<div class="pf-info-card">
         <div class="pf-info-label">${f.label}</div>
         <div class="pf-info-value">${f.value}</div>
       </div>`
    ).join('');
 
    // Denah
    document.getElementById('denahSvg').innerHTML = p.denah;
    document.getElementById('denahLegend').innerHTML = p.legend.map(l =>
      `<div class="pf-legend-item">
         <div class="pf-legend-dot" style="background:${l.color}"></div>
         <span>${l.label}</span>
       </div>`
    ).join('');
 
    // File storage
    document.getElementById('storageList').innerHTML = p.files.map(f =>
      `<a class="pf-storage-item" href="${f.url}" target="_blank" rel="noopener" aria-label="Buka ${f.name}">
         <i class="ti ${f.icon} pf-storage-icon" aria-hidden="true"></i>
         <div class="pf-storage-meta">
           <div class="pf-storage-name">${f.name}</div>
           <div class="pf-storage-size">${f.type} &middot; ${f.size}</div>
         </div>
         <i class="ti ti-download pf-storage-dl" aria-hidden="true"></i>
       </a>`
    ).join('');
 
    // Nav
    document.getElementById('navCount').textContent = `${idx + 1} / ${projects.length}`;
    document.getElementById('btnPrev').disabled = idx === 0;
    document.getElementById('btnNext').disabled = idx === projects.length - 1;
  }
 
  function navigate(dir) {
    const next = currentIndex + dir;
    if (next >= 0 && next < projects.length) openModal(next);
  }
 
  function switchTab(tab) {
    ['konsep', 'denah', 'file'].forEach(t => {
      document.getElementById('tab-' + t).classList.toggle('active', t === tab);
      document.getElementById('content-' + t).classList.toggle('active', t === tab);
    });
  }
 
  /* ============================================================
     EVENT LISTENERS
  ============================================================ */
 
  document.querySelectorAll('.portfolio-item').forEach(item => {
    item.addEventListener('click', () => openModal(+item.dataset.index));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(+item.dataset.index);
      }
    });
  });
 
  document.getElementById('pfModalBackdrop').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
 
  document.addEventListener('keydown', e => {
    if (!document.getElementById('pfModalBackdrop').classList.contains('open')) return;
    if (e.key === 'Escape')     closeModal();
    if (e.key === 'ArrowRight') navigate(1);
    if (e.key === 'ArrowLeft')  navigate(-1);
  });

// ==================== ENTRY POINT ====================
document.addEventListener('DOMContentLoaded', () => {
    window.statsCounter = new AdvancedStatsCounter();
    initChatNotification();
    init();
 
    setTimeout(() => {
        if (window.statsCounter) {
            window.statsCounter.incrementVisitors();
            window.statsCounter.updateDisplay(true);
        }
    }, 1000);
});
