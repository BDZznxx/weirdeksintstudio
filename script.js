'use strict';
 
const state = {
    isMenuOpen: false,
    isScrolled: false
};
 
// ✅ FIX: fetchGlobalStats diberi timeout 3 detik + response.ok check sebelum .json()
async function fetchGlobalStats() {
    try {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 3000);
 
        const response = await fetch('/simpanstats.php', { signal: controller.signal });
        clearTimeout(timeoutId);
 
        // BUG FIX #1: Tambahkan response.ok check — tanpa ini, HTTP 500 tetap di-parse dan crash
        if (!response.ok) return;
 
        const stats = await response.json();
 
        const visitorEl = document.querySelector('[data-visitor="true"]');
        const ratingEl  = document.querySelector('[data-rating="true"]');
        const daysEl    = document.querySelector('[data-days="true"]');
 
        if (visitorEl) visitorEl.setAttribute('data-target', (stats.visitors / 1000).toFixed(1));
        if (ratingEl)  ratingEl.setAttribute('data-target', stats.rating);
        if (daysEl)    daysEl.setAttribute('data-target', stats.days);
 
        console.log('✅ SERVER stats loaded:', stats);
    } catch (e) {
        // Timeout atau server tidak ada — pakai localStorage fallback (silent)
    }
}
 
const init = async () => {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
 
    setupEventListeners();
    initAnimations();
 
    // ✅ Preloader hilang saat window load ATAU maksimal 3 detik
    if (document.readyState === 'complete') {
        hidePreloader();
    } else {
        window.addEventListener('load', hidePreloader, { once: true });
        setTimeout(hidePreloader, 3000); // failsafe
    }
 
    // BUG FIX #2: initStatsCounter() dihapus dari sini karena window.statsCounter
    // sudah diinisialisasi di DOMContentLoaded sebelum init() dipanggil.
    // Memanggil initStatsCounter() di sini tidak melakukan apa-apa (fungsinya kosong).
 
    // Stats fetch tidak boleh blokir init
    fetchGlobalStats().catch(() => {});
    setInterval(() => fetchGlobalStats().catch(() => {}), 30000);
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
 
// ✅ hidePreloader yang benar — pakai display:none setelah transisi
const hidePreloader = (() => {
    let called = false;
    return function () {
        if (called) return;
        called = true;
 
        const preloader = document.getElementById('preloader');
        if (!preloader) return;
 
        preloader.classList.add('hidden');
 
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 600);
 
        // BUG FIX #3: Hanya set overflow ke auto jika menu TIDAK sedang terbuka
        // Sebelumnya ini selalu override state menu yang sedang terbuka
        if (!state.isMenuOpen) {
            document.body.style.overflow = 'auto';
        }
    };
})();
 
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
            showFieldError(el, errorEl, `${el.placeholder.replace(' *', '')} wajib diisi`);
            isValid = false;
        } else {
            hideFieldError(el, errorEl);
        }
    });
 
    const phone = document.getElementById('phone')?.value;
    // BUG FIX #4: Regex sebelumnya mengandung \+ duplikat di dalam character class [...]
    // [\d\s\-()\+] sudah mencakup +, tidak perlu \+ lagi di luar. Diperbaiki:
    if (phone && phone.trim() && !/^\+?[\d\s\-()]{10,15}$/.test(phone.replace(/\s+/g, ''))) {
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
    return function () {
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
 
// BUG FIX #5: Fungsi ini sebelumnya kosong dan tidak berguna.
// Diisi dengan guard yang benar agar tidak double-init jika dipanggil lebih dari sekali.
const initStatsCounter = () => {
    if (window.statsCounter) return;
    window.statsCounter = new AdvancedStatsCounter();
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
        // BUG FIX #6: activityScore bisa menghasilkan avgRating > 5.0.
        // Tambahkan clamp agar rata-rata tidak pernah melebihi 5.0.
        const activityScore = Math.min(5, 4.7 + (this.stats.clickCount * 0.005) + (this.stats.dailyVisitors * 0.01));
        this.stats.totalRating += activityScore;
        this.stats.ratingCount++;
 
        // Clamp totalRating agar avgRating tidak pernah > 5.0
        const maxTotal = 5.0 * this.stats.ratingCount;
        if (this.stats.totalRating > maxTotal) {
            this.stats.totalRating = maxTotal;
        }
 
        this.saveStats();
    }
 
    trackClicks() {
        // BUG FIX #7: Sebelumnya incrementVisitors() + autoRating() dipanggil setiap klik,
        // sehingga visitor count membengkak sangat cepat dan tidak realistis.
        // Sekarang hanya clickCount yang naik; visitor & rating hanya update display.
        document.addEventListener('click', (e) => {
            const isLink   = e.target.closest('a');
            const isButton = e.target.closest('button, .btn');
 
            if (isLink || isButton || e.target.closest('.stats-grid')) {
                this.stats.clickCount++;
                this.saveStats();
                this.updateDisplay();
            }
        });
 
        let scrollCount = 0;
        window.addEventListener('scroll', () => {
            scrollCount++;
            if (scrollCount % 50 === 0) {
                this.stats.clickCount += 0.1;
                this.saveStats();
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
 
        const activeDays        = this.getActiveDays();
        const formattedVisitors = (this.stats.totalVisitors / 1000).toFixed(1);
        // BUG FIX #8: Clamp avgRating di display agar tidak pernah tampil > 5.0
        const rawAvg  = this.stats.totalRating / this.stats.ratingCount;
        const avgRating = Math.min(5.0, rawAvg).toFixed(1);
 
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
        const typingEl  = showTyping();
        const thinkTime = 800 + messages[index].length * 18;
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
 
// ==================== PORTFOLIO MODAL ====================
// BUG FIX #9: projects array hanya didefinisikan SEKALI di sini.
// Sebelumnya ada duplikasi di index.html inline script yang menyebabkan
// konflik — array di HTML override array ini karena dieksekusi lebih dulu.
const projects = [
  {
    name: "Mansion classic modern 3 lantai",
    type: "Residensial", emoji: "🏠", color: "#E1F5EE",
    desc: "Rumah mewah bergaya Modern Classic Neo-European dengan fasad megah berwarna hitam putih yang elegan.",
    info: [
      { label: "Luas Bangunan", value: "600 m²" }, { label: "Jumlah Lantai", value: "3 Lantai" },
      { label: "Kamar Tidur",   value: "3 KT + 2 KM" }, { label: "Carport", value: "2 Mobil" },
      { label: "Tahun",         value: "2026" }
    ],
    legend: [
      { color: "#C8F0D8", label: "Ruang Tamu" }, { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#FDE68A", label: "Dapur / Dining" }, { color: "#E8E6E0", label: "Carport" },
      { color: "#E0E7FF", label: "Kamar Mandi" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "Rumah3Lantai_classic.skp",  size: "38.2 MB", type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_3Lantai.dwg",          size: "9.4 MB",  type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Gambar_Kerja_Lengkap.pdf",  size: "12.6 MB", type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Hunian 3 Lantai Neo-Futuristik",
    type: "Residensial", emoji: "🏠", color: "#E6F1FB",
    desc: "Desain neo-futuristik dengan bentuk organik melengkung. Volume putih bersih dengan bukaan kaca besar berbentuk kurva dan balkon organik menonjol.",
    info: [
      { label: "Luas Bangunan",  value: "260 m²" }, { label: "Jumlah Lantai", value: "3 Lantai" },
      { label: "Kamar Tidur",    value: "3 KT + 2 KM" }, { label: "Garasi", value: "2 Mobil" },
      { label: "Tahun",          value: "2026" }
    ],
    legend: [
      { color: "#C7D2FE", label: "Ruang Tamu Open" }, { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#FDE68A", label: "Dapur + Dining" }, { color: "#D1FAE5", label: "Balkon Organik" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "NeoFuturistik_3Lt.rvt",      size: "124 MB",  type: "Revit",    url: "#" },
      { icon: "ti-file-vector",   name: "Denah_Lt1_Lt2_Kurva.dwg",    size: "18.7 MB", type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Konsep_Desain_Lengkap.pdf",  size: "22 MB",   type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Hunian 2 Lantai Modern Tropis",
    type: "Residensial", emoji: "🏠", color: "#FAEEDA",
    desc: "Rumah 2 lantai kontemporer tropis dengan overhang kayu ulin lebar, carport terintegrasi, dan balkon railing kaca.",
    info: [
      { label: "Luas Bangunan", value: "260 m²" }, { label: "Jumlah Lantai", value: "2 Lantai" },
      { label: "Kamar Tidur",   value: "3 KT + 2 KM" }, { label: "Carport", value: "1 Mobil" },
      { label: "Tahun",         value: "2023" }
    ],
    legend: [
      { color: "#BBF7D0", label: "Ruang Tamu/Keluarga" }, { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#FDE68A", label: "Dapur" }, { color: "#D1D5DB", label: "Carport" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "Rumah2Lt_Tropis.skp",      size: "35.8 MB", type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_Lt1_Lt2.dwg",         size: "9.2 MB",  type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Gambar_Kerja_Lengkap.pdf",  size: "14 MB",   type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Hunian 3 Lantai — Garasi Double",
    type: "Residensial", emoji: "🏘️", color: "#EAF3DE",
    desc: "Rumah 3 lantai modern dengan garasi double di lantai dasar, balkon kaca memanjang, dan atap cantilever angular.",
    info: [
      { label: "Luas Bangunan", value: "350 m²" }, { label: "Jumlah Lantai", value: "3 Lantai" },
      { label: "Kamar Tidur",   value: "3 KT + 2 KM" }, { label: "Garasi", value: "2 Mobil" },
      { label: "Tahun",         value: "2026" }
    ],
    legend: [
      { color: "#D1D5DB", label: "Garasi 2 Mobil" }, { color: "#BBF7D0", label: "Ruang Tamu" },
      { color: "#BFDBFE", label: "Kamar Tidur" }, { color: "#93C5FD", label: "Balkon Kaca" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "Rumah3Lt_GarasiDouble.skp", size: "67 MB",  type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_Lt1-2-3.dwg",          size: "24 MB",  type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Konsep_Material.pdf",         size: "5.4 MB", type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Weird Coffee",
    type: "Komersil", emoji: "☕", color: "#FBEAF0",
    desc: "Kedai kopi fasad box — panel aluminium dark grey dengan lampu garis vertikal LED. Area indoor + semi-outdoor dengan kursi kayu dan planter box.",
    info: [
      { label: "Luas Bangunan", value: "50 m²" }, { label: "Kapasitas", value: "15 indoor + 9 outdoor" },
      { label: "Konsep",        value: "Fasad Box Dark Grey" }, { label: "Tahun", value: "2026" }
    ],
    legend: [
      { color: "#374151", label: "Fasad Box" }, { color: "#F5C4B3", label: "Area Indoor" },
      { color: "#92400E", label: "Bar Counter" }, { color: "#FEF3C7", label: "Teras Outdoor" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "WeirdCoffee_Fasad.skp",  size: "28 MB",  type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_WeirdCoffee.dwg",   size: "7.1 MB", type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Konsep_Interior.pdf",      size: "9 MB",   type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Minimalis — Silinder Organik",
    type: "Residensial", emoji: "🏠", color: "#EEEDFE",
    desc: "Rumah 3 lantai dengan elemen silinder beton putih bertumpuk, garasi 3 mobil, dan balkon melingkar di tiap lantai.",
    info: [
      { label: "Luas Bangunan", value: "420 m²" }, { label: "Jumlah Lantai", value: "3 Lantai" },
      { label: "Kamar Tidur",   value: "3 KT + 3 KM" }, { label: "Garasi", value: "3 Mobil" },
      { label: "Tahun",         value: "2026" }
    ],
    legend: [
      { color: "#D1D5DB", label: "Garasi 3 Mobil" }, { color: "#BBF7D0", label: "Ruang Tamu" },
      { color: "#BFDBFE", label: "Kamar Tidur" }, { color: "#F5F3EF", label: "Kolom Silinder" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "Silinder3Lt_Model.skp",     size: "22 MB",  type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_SilinderOrganic.dwg", size: "5.8 MB", type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "RAB_Gambar_Lengkap.pdf",    size: "11 MB",  type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Hunian 2 Lantai — Dark Concrete",
    type: "Residensial", emoji: "🏠", color: "#FAECE7",
    desc: "Rumah 2 lantai beton ekspos gelap dengan atap segitiga kaca besar, curtain wall lantai 1, dan skylight dramatis di lantai 2.",
    info: [
      { label: "Luas Bangunan", value: "240 m²" }, { label: "Jumlah Lantai", value: "2 Lantai" },
      { label: "Kamar Tidur",   value: "3 KT + 2 KM" }, { label: "Material", value: "Dark Concrete + Kaca" },
      { label: "Tahun",         value: "2026" }
    ],
    legend: [
      { color: "#A7F3D0", label: "Ruang Tamu Open" }, { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#93C5FD", label: "Skylight Segitiga" }, { color: "#FDE68A", label: "Dapur" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "DarkConcrete_2Lt.skp",  size: "58 MB",  type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_Lengkap.dwg",      size: "13 MB",  type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Konsep_Material.pdf",    size: "19 MB",  type: "PDF",      url: "#" }
    ]
  },
  {
    name: "Rumah Hunian 2 Lantai — Minimalis Tropis",
    type: "Residensial", emoji: "🏠", color: "#FAEEDA",
    desc: "Rumah 2 lantai minimalis tropis palet krem warm dengan louver kayu vertikal, garasi, dan balkon kaca railing transparan.",
    info: [
      { label: "Luas Bangunan", value: "260 m²" }, { label: "Jumlah Lantai", value: "2 Lantai" },
      { label: "Kamar Tidur",   value: "2 KT + 2 KM" }, { label: "Garasi", value: "1 Mobil" },
      { label: "Tahun",         value: "2026" }
    ],
    legend: [
      { color: "#BBF7D0", label: "Ruang Tamu/Keluarga" }, { color: "#BFDBFE", label: "Kamar Tidur" },
      { color: "#FDE68A", label: "Dapur" }, { color: "#D97706", label: "Louver Kayu" }
    ],
    files: [
      { icon: "ti-file-3d",       name: "Minimalis_Tropis_2Lt.skp", size: "58 MB",  type: "SketchUp", url: "#" },
      { icon: "ti-file-vector",   name: "Denah_Lengkap.dwg",         size: "13 MB",  type: "AutoCAD",  url: "#" },
      { icon: "ti-file-type-pdf", name: "Konsep_Material.pdf",        size: "19 MB",  type: "PDF",      url: "#" }
    ]
  }
];
 
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

// ============================================================
// denahP1 — Mansion Classic Modern 3 Lantai (600 m²)
// Neo-Classical, hitam-putih elegan, 3KT + 2KM, garasi 2 mobil
// ============================================================
const denahP1 = `
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <defs>
    <pattern id="hatch1" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#555" stroke-width="0.5" opacity="0.3"/>
    </pattern>
  </defs>
  <!-- Background -->
  <rect width="520" height="400" fill="#0d0d1a"/>
  
  <!-- Title -->
  <text x="260" y="22" text-anchor="middle" fill="#c9a96e" font-size="11" font-weight="600" letter-spacing="2">DENAH LANTAI 1 — MANSION CLASSIC MODERN</text>
  <line x1="80" y1="28" x2="440" y2="28" stroke="#c9a96e" stroke-width="0.5" opacity="0.4"/>

  <!-- GARASI DOUBLE -->
  <rect x="30" y="40" width="150" height="90" fill="#2a2a3e" stroke="#6b7280" stroke-width="1"/>
  <rect x="30" y="40" width="150" height="90" fill="url(#hatch1)"/>
  <text x="105" y="82" text-anchor="middle" fill="#9ca3af" font-size="9" font-weight="500">GARASI</text>
  <text x="105" y="94" text-anchor="middle" fill="#6b7280" font-size="8">2 MOBIL</text>
  <!-- Car symbols -->
  <rect x="42" y="68" width="30" height="14" rx="2" fill="#374151" stroke="#6b7280" stroke-width="0.5"/>
  <rect x="98" y="68" width="30" height="14" rx="2" fill="#374151" stroke="#6b7280" stroke-width="0.5"/>

  <!-- FOYER / ENTRANCE -->
  <rect x="180" y="40" width="80" height="50" fill="#1a1f3a" stroke="#c9a96e" stroke-width="1"/>
  <text x="220" y="62" text-anchor="middle" fill="#c9a96e" font-size="8.5" font-weight="600">FOYER</text>
  <text x="220" y="74" text-anchor="middle" fill="#6b7280" font-size="7.5">ENTRANCE</text>
  <!-- Decorative arch -->
  <path d="M195 40 Q220 32 245 40" fill="none" stroke="#c9a96e" stroke-width="1" opacity="0.5"/>

  <!-- LIVING ROOM -->
  <rect x="260" y="40" width="120" height="110" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
  <text x="320" y="88" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">RUANG TAMU</text>
  <text x="320" y="100" text-anchor="middle" fill="#6b7280" font-size="7.5">± 40 m²</text>
  <!-- Sofa symbol -->
  <rect x="275" y="105" width="50" height="15" rx="2" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.5"/>
  <rect x="325" y="108" width="15" height="12" rx="1" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.5"/>

  <!-- DINING ROOM -->
  <rect x="380" y="40" width="110" height="80" fill="#1a1a2e" stroke="#d97706" stroke-width="1"/>
  <text x="435" y="77" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="435" y="89" text-anchor="middle" fill="#6b7280" font-size="7.5">± 25 m²</text>
  <!-- Table symbol -->
  <rect x="405" y="50" width="60" height="25" rx="2" fill="#292929" stroke="#d97706" stroke-width="0.5"/>
  <rect x="405" y="46" width="8" height="6" rx="1" fill="#3a3a3a"/>
  <rect x="447" y="46" width="8" height="6" rx="1" fill="#3a3a3a"/>
  <rect x="405" y="75" width="8" height="6" rx="1" fill="#3a3a3a"/>
  <rect x="447" y="75" width="8" height="6" rx="1" fill="#3a3a3a"/>

  <!-- KITCHEN -->
  <rect x="380" y="120" width="110" height="70" fill="#1a1a2e" stroke="#d97706" stroke-width="1"/>
  <text x="435" y="152" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="435" y="164" text-anchor="middle" fill="#6b7280" font-size="7.5">± 20 m²</text>
  <!-- Counter -->
  <rect x="385" y="125" width="100" height="12" rx="1" fill="#252535" stroke="#d97706" stroke-width="0.5"/>
  <rect x="385" y="125" width="12" height="60" rx="1" fill="#252535" stroke="#d97706" stroke-width="0.5"/>

  <!-- TOILET/WC TAMU -->
  <rect x="180" y="90" width="50" height="40" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
  <text x="205" y="107" text-anchor="middle" fill="#67e8f9" font-size="7.5" font-weight="600">WC</text>
  <text x="205" y="118" text-anchor="middle" fill="#6b7280" font-size="7">TAMU</text>
  <!-- Toilet symbol -->
  <ellipse cx="205" cy="122" rx="8" ry="6" fill="none" stroke="#0891b2" stroke-width="0.5"/>

  <!-- FAMILY ROOM -->
  <rect x="30" y="160" width="220" height="100" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
  <text x="140" y="208" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">RUANG KELUARGA</text>
  <text x="140" y="220" text-anchor="middle" fill="#6b7280" font-size="7.5">± 45 m²</text>
  <!-- TV Unit -->
  <rect x="40" y="165" width="80" height="8" rx="1" fill="#252535" stroke="#4f46e5" stroke-width="0.5"/>
  <!-- Sofa L -->
  <rect x="40" y="220" width="120" height="20" rx="2" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.5"/>
  <rect x="40" y="200" width="20" height="40" rx="2" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.5"/>

  <!-- KAMAR TIDUR UTAMA -->
  <rect x="250" y="180" width="130" height="100" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="315" y="224" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT UTAMA</text>
  <text x="315" y="236" text-anchor="middle" fill="#6b7280" font-size="7.5">± 35 m²</text>
  <!-- Bed King -->
  <rect x="260" y="240" width="55" height="30" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
  <rect x="260" y="240" width="55" height="10" rx="1" fill="#3a2560"/>
  <!-- Wardrobe -->
  <rect x="330" y="185" width="40" height="20" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>

  <!-- KM UTAMA (EN SUITE) -->
  <rect x="380" y="190" width="110" height="60" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
  <text x="435" y="215" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM UTAMA</text>
  <text x="435" y="227" text-anchor="middle" fill="#6b7280" font-size="7.5">EN SUITE</text>
  <!-- Bathtub -->
  <rect x="395" y="198" width="40" height="18" rx="4" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <!-- Shower -->
  <rect x="440" y="196" width="18" height="18" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <line x1="440" y1="196" x2="458" y2="214" stroke="#0891b2" stroke-width="0.3" opacity="0.5"/>
  <line x1="445" y1="196" x2="458" y2="209" stroke="#0891b2" stroke-width="0.3" opacity="0.5"/>

  <!-- KAMAR TIDUR 2 -->
  <rect x="30" y="280" width="120" height="90" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="90" y="322" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 2</text>
  <text x="90" y="334" text-anchor="middle" fill="#6b7280" font-size="7.5">± 20 m²</text>
  <!-- Bed Double -->
  <rect x="40" y="290" width="45" height="30" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
  <rect x="40" y="290" width="45" height="10" rx="1" fill="#3a2560"/>

  <!-- KAMAR TIDUR 3 -->
  <rect x="150" y="280" width="100" height="90" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="200" y="322" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 3</text>
  <text x="200" y="334" text-anchor="middle" fill="#6b7280" font-size="7.5">± 18 m²</text>
  <rect x="158" y="290" width="40" height="28" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
  <rect x="158" y="290" width="40" height="9" rx="1" fill="#3a2560"/>

  <!-- KM 2 -->
  <rect x="250" y="290" width="80" height="55" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
  <text x="290" y="315" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <text x="290" y="327" text-anchor="middle" fill="#6b7280" font-size="7.5">± 8 m²</text>
  <rect x="258" y="298" width="30" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.8"/>

  <!-- TANGGA -->
  <rect x="330" y="280" width="60" height="55" fill="#1e1e2e" stroke="#6b7280" stroke-width="0.8"/>
  <text x="360" y="305" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="500">TANGGA</text>
  <!-- Stair lines -->
  <line x1="335" y1="288" x2="385" y2="288" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="335" y1="295" x2="385" y2="295" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="335" y1="302" x2="385" y2="302" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="335" y1="309" x2="385" y2="309" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="335" y1="316" x2="385" y2="316" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="335" y1="323" x2="385" y2="323" stroke="#6b7280" stroke-width="0.5"/>

  <!-- UTILITY / LAUNDRY -->
  <rect x="390" y="280" width="100" height="55" fill="#1a1a2e" stroke="#374151" stroke-width="1"/>
  <text x="440" y="303" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">LAUNDRY</text>
  <text x="440" y="315" text-anchor="middle" fill="#6b7280" font-size="7.5">UTILITAS</text>

  <!-- COMPASS -->
  <g transform="translate(468, 355)">
    <circle cx="0" cy="0" r="14" fill="none" stroke="#c9a96e" stroke-width="0.8"/>
    <polygon points="0,-12 -4,0 0,3 4,0" fill="#c9a96e" opacity="0.9"/>
    <polygon points="0,12 -4,0 0,-3 4,0" fill="#6b7280" opacity="0.5"/>
    <text x="0" y="-15" text-anchor="middle" fill="#c9a96e" font-size="7" font-weight="700">U</text>
  </g>

  <!-- SCALE -->
  <text x="30" y="390" fill="#6b7280" font-size="7.5">SKALA 1:150  |  LT.1 ≈ 200 m²</text>

  <!-- LEGEND -->
  <rect x="30" y="348" width="8" height="8" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
  <text x="42" y="356" fill="#818cf8" font-size="7.5">Ruang Tamu / Keluarga</text>
  <rect x="30" y="360" width="8" height="8" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="42" y="368" fill="#a78bfa" font-size="7.5">Kamar Tidur</text>
  <rect x="120" y="348" width="8" height="8" fill="#1a1a2e" stroke="#d97706" stroke-width="1"/>
  <text x="132" y="356" fill="#fbbf24" font-size="7.5">Dapur / Makan</text>
  <rect x="120" y="360" width="8" height="8" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
  <text x="132" y="368" fill="#67e8f9" font-size="7.5">Kamar Mandi</text>
  <rect x="210" y="348" width="8" height="8" fill="#2a2a3e" stroke="#6b7280" stroke-width="1"/>
  <text x="222" y="356" fill="#9ca3af" font-size="7.5">Garasi / Utilitas</text>
</svg>`;

// ============================================================
// denahP2 — Rumah Neo-Futuristik 3 Lantai (260 m²)
// Bentuk organik melengkung, kaca kurva, balkon organik
// ============================================================
const denahP2 = `
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <!-- BG -->
  <rect width="520" height="400" fill="#050a18"/>
  <text x="260" y="22" text-anchor="middle" fill="#60a5fa" font-size="11" font-weight="600" letter-spacing="2">DENAH LANTAI 1 — NEO-FUTURISTIK 3 LANTAI</text>
  <line x1="60" y1="28" x2="460" y2="28" stroke="#60a5fa" stroke-width="0.5" opacity="0.4"/>

  <!-- Outer building footprint — curved organic shape -->
  <path d="M60 60 Q60 40 80 38 L380 38 Q420 38 440 70 L440 300 Q440 340 400 345 L100 345 Q60 340 58 300 Z" 
        fill="none" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="5,3"/>

  <!-- OPEN LIVING + DINING (ground floor open plan) -->
  <rect x="70" y="50" width="200" height="130" fill="#0a1628" stroke="#3b82f6" stroke-width="1"/>
  <text x="170" y="105" text-anchor="middle" fill="#60a5fa" font-size="9" font-weight="600">LIVING OPEN PLAN</text>
  <text x="170" y="117" text-anchor="middle" fill="#4b5563" font-size="7.5">± 80 m²</text>
  <!-- Curved sofa -->
  <path d="M85 150 Q140 140 185 150 L185 165 Q140 160 85 165 Z" fill="#0f1e3d" stroke="#3b82f6" stroke-width="0.8"/>
  <!-- Coffee table -->
  <ellipse cx="155" cy="135" rx="22" ry="14" fill="#0a1628" stroke="#3b82f6" stroke-width="0.5"/>

  <!-- KITCHEN MODERN -->
  <rect x="270" y="50" width="110" height="80" fill="#0a1628" stroke="#d97706" stroke-width="1"/>
  <text x="325" y="87" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="325" y="99" text-anchor="middle" fill="#4b5563" font-size="7.5">MODERN</text>
  <!-- Island -->
  <rect x="285" y="60" width="80" height="20" rx="3" fill="#151d35" stroke="#d97706" stroke-width="0.5"/>
  <!-- Counter -->
  <rect x="270" y="50" width="110" height="10" fill="#151d35" stroke="#d97706" stroke-width="0.5"/>

  <!-- BALKON KURVA (front) -->
  <path d="M70 180 Q170 210 270 180 L270 200 Q170 232 70 200 Z" fill="#091524" stroke="#22d3ee" stroke-width="1"/>
  <text x="170" y="197" text-anchor="middle" fill="#67e8f9" font-size="8" font-weight="600">BALKON KURVA</text>

  <!-- KM/WC GROUND -->
  <rect x="380" y="50" width="60" height="60" fill="#0a1a2a" stroke="#0891b2" stroke-width="1"/>
  <text x="410" y="77" text-anchor="middle" fill="#67e8f9" font-size="8" font-weight="600">WC</text>
  <ellipse cx="410" cy="96" rx="12" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <rect x="385" y="53" width="28" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>

  <!-- GARASI 2 MOBIL -->
  <rect x="70" y="210" width="220" height="90" fill="#0d0d1a" stroke="#6b7280" stroke-width="1"/>
  <rect x="75" y="215" width="90" height="50" rx="2" fill="#111827" stroke="#374151" stroke-width="0.5"/>
  <rect x="175" y="215" width="90" height="50" rx="2" fill="#111827" stroke="#374151" stroke-width="0.5"/>
  <text x="180" y="275" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">GARASI 2 MOBIL</text>

  <!-- TANGGA SPIRAL -->
  <g transform="translate(310, 230)">
    <circle cx="0" cy="0" r="28" fill="#070d1a" stroke="#3b82f6" stroke-width="1"/>
    <circle cx="0" cy="0" r="8" fill="#0a1628" stroke="#60a5fa" stroke-width="0.8"/>
    <path d="M0,-28 A28,28 0 0,1 28,0" fill="none" stroke="#3b82f6" stroke-width="2"/>
    <path d="M28,0 A28,28 0 0,1 0,28" fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.6"/>
    <path d="M0,28 A28,28 0 0,1 -28,0" fill="none" stroke="#3b82f6" stroke-width="1" opacity="0.4"/>
    <text x="0" y="3" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="600">TANGGA</text>
    <text x="0" y="12" text-anchor="middle" fill="#4b5563" font-size="6">SPIRAL</text>
  </g>

  <!-- RUANG UTILITY -->
  <rect x="360" y="130" width="80" height="60" fill="#0d0d1a" stroke="#374151" stroke-width="1"/>
  <text x="400" y="158" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">UTILITAS</text>
  <text x="400" y="170" text-anchor="middle" fill="#4b5563" font-size="7.5">LAUNDRY</text>

  <!-- LT2 KAMAR NOTE -->
  <rect x="70" y="310" width="380" height="28" rx="4" fill="#0a1020" stroke="#1d4ed8" stroke-width="0.5"/>
  <text x="260" y="327" text-anchor="middle" fill="#60a5fa" font-size="8.5">LT.2: 3 Kamar Tidur + 2 KM + Balkon Organik  |  LT.3: Master Suite + Rooftop Garden</text>

  <!-- COMPASS -->
  <g transform="translate(468, 355)">
    <circle cx="0" cy="0" r="14" fill="none" stroke="#3b82f6" stroke-width="0.8"/>
    <polygon points="0,-12 -4,0 0,3 4,0" fill="#60a5fa" opacity="0.9"/>
    <polygon points="0,12 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-15" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="700">U</text>
  </g>

  <!-- SCALE -->
  <text x="30" y="390" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.1 ≈ 87 m²  |  TOTAL 3 LANTAI ≈ 260 m²</text>

  <!-- LEGEND -->
  <rect x="30" y="348" width="8" height="8" fill="#0a1628" stroke="#3b82f6" stroke-width="1"/>
  <text x="42" y="356" fill="#60a5fa" font-size="7.5">Living Open Plan</text>
  <rect x="30" y="360" width="8" height="8" fill="#091524" stroke="#22d3ee" stroke-width="1"/>
  <text x="42" y="368" fill="#67e8f9" font-size="7.5">Balkon Kurva</text>
  <rect x="140" y="348" width="8" height="8" fill="#0a1628" stroke="#d97706" stroke-width="1"/>
  <text x="152" y="356" fill="#fbbf24" font-size="7.5">Dapur Modern</text>
  <rect x="140" y="360" width="8" height="8" fill="#0d0d1a" stroke="#6b7280" stroke-width="1"/>
  <text x="152" y="368" fill="#9ca3af" font-size="7.5">Garasi / Tangga</text>
</svg>`;

// ============================================================
// denahP3 — Rumah Modern Tropis 2 Lantai (260 m²)
// Overhang kayu, carport 1 mobil, balkon kaca, 3KT+2KM
// ============================================================
const denahP3 = `
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="400" fill="#0e0a05"/>
  <text x="260" y="22" text-anchor="middle" fill="#d97706" font-size="11" font-weight="600" letter-spacing="2">DENAH LANTAI 1 — MODERN TROPIS 2 LANTAI</text>
  <line x1="60" y1="28" x2="460" y2="28" stroke="#d97706" stroke-width="0.5" opacity="0.4"/>

  <!-- CARPORT -->
  <rect x="30" y="40" width="120" height="75" fill="#0f1008" stroke="#78350f" stroke-width="1"/>
  <rect x="30" y="40" width="120" height="75" fill="none" stroke="#78350f" stroke-width="0.3" stroke-dasharray="4,4"/>
  <text x="90" y="74" text-anchor="middle" fill="#92400e" font-size="9" font-weight="500">CARPORT</text>
  <text x="90" y="86" text-anchor="middle" fill="#4b5563" font-size="7.5">1 MOBIL</text>
  <!-- Car shape -->
  <rect x="48" y="75" width="60" height="25" rx="3" fill="#1c1c0a" stroke="#78350f" stroke-width="0.5"/>

  <!-- TAMAN DEPAN -->
  <rect x="150" y="40" width="80" height="75" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="190" y="74" text-anchor="middle" fill="#16a34a" font-size="8.5" font-weight="600">TAMAN</text>
  <text x="190" y="86" text-anchor="middle" fill="#4b5563" font-size="7.5">DEPAN</text>
  <!-- Tree dots -->
  <circle cx="170" cy="60" r="10" fill="#052e0a" stroke="#15803d" stroke-width="0.8"/>
  <circle cx="210" cy="65" r="8" fill="#052e0a" stroke="#15803d" stroke-width="0.8"/>

  <!-- FOYER / ENTRANCE -->
  <rect x="230" y="40" width="70" height="50" fill="#130f08" stroke="#d97706" stroke-width="1"/>
  <text x="265" y="63" text-anchor="middle" fill="#d97706" font-size="8.5" font-weight="600">FOYER</text>
  <text x="265" y="75" text-anchor="middle" fill="#4b5563" font-size="7.5">MASUK</text>

  <!-- RUANG TAMU -->
  <rect x="30" y="115" width="170" height="110" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="115" y="165" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG TAMU</text>
  <text x="115" y="177" text-anchor="middle" fill="#4b5563" font-size="7.5">± 35 m²</text>
  <!-- Sofa + coffee table -->
  <rect x="40" y="185" width="80" height="25" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <rect x="40" y="182" width="18" height="28" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <rect x="102" y="182" width="18" height="28" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <rect x="65" y="168" width="30" height="18" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.3"/>

  <!-- RUANG KELUARGA -->
  <rect x="200" y="90" width="140" height="100" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="270" y="135" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG KELUARGA</text>
  <text x="270" y="147" text-anchor="middle" fill="#4b5563" font-size="7.5">± 30 m²</text>
  <!-- TV unit -->
  <rect x="205" y="95" width="80" height="8" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <!-- Sofa -->
  <rect x="210" y="160" width="75" height="18" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>

  <!-- DAPUR -->
  <rect x="340" y="40" width="160" height="100" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="420" y="87" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="420" y="99" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
  <!-- Kitchen counter L-shape -->
  <rect x="345" y="44" width="150" height="12" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <rect x="345" y="44" width="12" height="90" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <!-- Stove -->
  <rect x="380" y="46" width="35" height="10" rx="1" fill="#252010" stroke="#d97706" stroke-width="0.3"/>
  <circle cx="388" cy="51" r="3" fill="none" stroke="#d97706" stroke-width="0.5"/>
  <circle cx="400" cy="51" r="3" fill="none" stroke="#d97706" stroke-width="0.5"/>
  <circle cx="407" cy="51" r="3" fill="none" stroke="#d97706" stroke-width="0.5"/>

  <!-- DINING -->
  <rect x="340" y="140" width="160" height="80" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="420" y="177" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="420" y="189" text-anchor="middle" fill="#4b5563" font-size="7.5">± 18 m²</text>
  <!-- Dining table -->
  <rect x="360" y="150" width="90" height="45" rx="3" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <!-- Chairs -->
  <rect x="355" y="155" width="6" height="35" rx="1" fill="#252010"/>
  <rect x="449" y="155" width="6" height="35" rx="1" fill="#252010"/>

  <!-- WC/KM BAWAH -->
  <rect x="200" y="190" width="70" height="55" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="235" y="215" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM</text>
  <text x="235" y="227" text-anchor="middle" fill="#4b5563" font-size="7.5">TAMU</text>
  <ellipse cx="235" cy="237" rx="12" ry="8" fill="none" stroke="#0891b2" stroke-width="0.7"/>

  <!-- TANGGA -->
  <rect x="270" y="190" width="70" height="55" fill="#0a0a14" stroke="#4b5563" stroke-width="0.8"/>
  <text x="305" y="212" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="275" y1="198" x2="335" y2="198" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="275" y1="204" x2="335" y2="204" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="275" y1="210" x2="335" y2="210" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="275" y1="216" x2="335" y2="216" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="275" y1="222" x2="335" y2="222" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="275" y1="228" x2="335" y2="228" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="275" y1="234" x2="335" y2="234" stroke="#4b5563" stroke-width="0.5"/>

  <!-- SERVICE / LAUNDRY -->
  <rect x="30" y="225" width="170" height="50" fill="#0a0a0a" stroke="#374151" stroke-width="1"/>
  <text x="115" y="248" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">SERVIS / LAUNDRY</text>

  <!-- LT2 NOTE -->
  <rect x="30" y="290" width="460" height="25" rx="4" fill="#100c05" stroke="#78350f" stroke-width="0.5"/>
  <text x="260" y="306" text-anchor="middle" fill="#d97706" font-size="8.5">LT.2: 3 Kamar Tidur + KM Utama + Balkon Kaca Railing + Ruang Belajar</text>

  <!-- COMPASS -->
  <g transform="translate(468, 355)">
    <circle cx="0" cy="0" r="14" fill="none" stroke="#d97706" stroke-width="0.8"/>
    <polygon points="0,-12 -4,0 0,3 4,0" fill="#d97706" opacity="0.9"/>
    <polygon points="0,12 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-15" text-anchor="middle" fill="#d97706" font-size="7" font-weight="700">U</text>
  </g>

  <!-- SCALE -->
  <text x="30" y="390" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.1 ≈ 130 m²  |  TOTAL 2 LANTAI ≈ 260 m²</text>

  <!-- LEGEND -->
  <rect x="30" y="325" width="8" height="8" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="42" y="333" fill="#fbbf24" font-size="7.5">Ruang Tamu / Keluarga / Makan</text>
  <rect x="30" y="337" width="8" height="8" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="42" y="345" fill="#67e8f9" font-size="7.5">Kamar Mandi</text>
  <rect x="200" y="325" width="8" height="8" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="212" y="333" fill="#16a34a" font-size="7.5">Taman</text>
  <rect x="200" y="337" width="8" height="8" fill="#0f1008" stroke="#78350f" stroke-width="1"/>
  <text x="212" y="345" fill="#92400e" font-size="7.5">Carport / Servis</text>
</svg>`;

// ============================================================
// denahP4 — Rumah 3 Lantai Garasi Double (350 m²)
// Garasi 2 mobil, balkon kaca, cantilever angular, 3KT+2KM
// ============================================================
const denahP4 = `
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="400" fill="#050e05"/>
  <text x="260" y="22" text-anchor="middle" fill="#22c55e" font-size="11" font-weight="600" letter-spacing="2">DENAH LANTAI 1 — GARASI DOUBLE 3 LANTAI</text>
  <line x1="60" y1="28" x2="460" y2="28" stroke="#22c55e" stroke-width="0.5" opacity="0.4"/>

  <!-- GARASI DOUBLE (Lt 1 basement-level) -->
  <rect x="30" y="40" width="220" height="100" fill="#080e08" stroke="#374151" stroke-width="1.2"/>
  <!-- Garis garasi -->
  <line x1="140" y1="40" x2="140" y2="140" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
  <!-- Car L -->
  <rect x="40" y="65" width="85" height="35" rx="3" fill="#0f1a0f" stroke="#4b5563" stroke-width="0.5"/>
  <!-- Car R -->
  <rect x="148" y="65" width="85" height="35" rx="3" fill="#0f1a0f" stroke="#4b5563" stroke-width="0.5"/>
  <text x="140" y="120" text-anchor="middle" fill="#6b7280" font-size="9" font-weight="500">GARASI 2 MOBIL</text>
  <text x="140" y="132" text-anchor="middle" fill="#4b5563" font-size="7.5">± 50 m²</text>
  <!-- Garage door indicator -->
  <line x1="30" y1="40" x2="250" y2="40" stroke="#22c55e" stroke-width="2" opacity="0.4"/>
  <text x="140" y="36" text-anchor="middle" fill="#22c55e" font-size="7" opacity="0.7">← PINTU GARASI →</text>

  <!-- FOYER / LOBBY ENTRANCE -->
  <rect x="250" y="40" width="90" height="70" fill="#081008" stroke="#22c55e" stroke-width="1"/>
  <text x="295" y="72" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">FOYER</text>
  <text x="295" y="84" text-anchor="middle" fill="#4b5563" font-size="7.5">LOBBY</text>
  <!-- Door arc -->
  <path d="M250 110 Q268 110 268 92" fill="none" stroke="#22c55e" stroke-width="0.8" opacity="0.6"/>

  <!-- LIVING ROOM -->
  <rect x="30" y="140" width="180" height="110" fill="#081008" stroke="#22c55e" stroke-width="1"/>
  <text x="120" y="190" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">RUANG TAMU</text>
  <text x="120" y="202" text-anchor="middle" fill="#4b5563" font-size="7.5">± 40 m²</text>
  <!-- Angular sofa (matching design style) -->
  <rect x="40" y="210" width="90" height="22" rx="1" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
  <rect x="40" y="208" width="22" height="24" rx="1" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
  <rect x="130" y="210" width="22" height="22" rx="1" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
  <!-- Coffee table angular -->
  <rect x="65" y="196" width="45" height="15" rx="0" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.3"/>

  <!-- DINING -->
  <rect x="210" y="110" width="130" height="80" fill="#081008" stroke="#d97706" stroke-width="1"/>
  <text x="275" y="147" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="275" y="159" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
  <!-- Table rect angular -->
  <rect x="225" y="120" width="85" height="40" rx="0" fill="#0d1a0d" stroke="#d97706" stroke-width="0.5"/>
  <rect x="220" y="125" width="6" height="30" rx="0" fill="#0d1808"/>
  <rect x="309" y="125" width="6" height="30" rx="0" fill="#0d1808"/>

  <!-- KITCHEN -->
  <rect x="340" y="40" width="160" height="100" fill="#081008" stroke="#d97706" stroke-width="1"/>
  <text x="420" y="87" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="420" y="99" text-anchor="middle" fill="#4b5563" font-size="7.5">± 24 m²</text>
  <!-- Counter angular (L-shape) -->
  <rect x="345" y="44" width="150" height="11" rx="0" fill="#0d1a0d" stroke="#d97706" stroke-width="0.5"/>
  <rect x="345" y="44" width="11" height="92" rx="0" fill="#0d1a0d" stroke="#d97706" stroke-width="0.5"/>
  <!-- Stove -->
  <rect x="380" y="47" width="40" height="8" fill="#121c12" stroke="#d97706" stroke-width="0.3"/>

  <!-- TANGGA + LIFT (angular modern) -->
  <rect x="340" y="140" width="80" height="70" fill="#060e06" stroke="#4b5563" stroke-width="0.8"/>
  <text x="380" y="165" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <!-- Stair lines angular -->
  <line x1="345" y1="150" x2="415" y2="150" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="157" x2="415" y2="157" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="164" x2="415" y2="164" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="171" x2="415" y2="171" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="178" x2="415" y2="178" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="185" x2="415" y2="185" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="192" x2="415" y2="192" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="199" x2="415" y2="199" stroke="#4b5563" stroke-width="0.5"/>

  <!-- WC TAMU -->
  <rect x="420" y="140" width="80" height="70" fill="#040c12" stroke="#0891b2" stroke-width="1"/>
  <text x="460" y="165" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC TAMU</text>
  <ellipse cx="460" cy="195" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <rect x="425" y="143" width="35" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>

  <!-- UTILITY -->
  <rect x="210" y="190" width="130" height="60" fill="#060e06" stroke="#374151" stroke-width="1"/>
  <text x="275" y="218" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">UTILITAS</text>
  <text x="275" y="230" text-anchor="middle" fill="#4b5563" font-size="7.5">LAUNDRY / SERVIS</text>

  <!-- TAMAN SAMPING / VOID -->
  <rect x="30" y="250" width="180" height="60" fill="#050e05" stroke="#15803d" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="120" y="278" text-anchor="middle" fill="#16a34a" font-size="8.5">TAMAN SAMPING</text>

  <!-- BALKON KACA CANTILEVER (note) -->
  <rect x="340" y="215" width="160" height="50" fill="#04100a" stroke="#22c55e" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="420" y="238" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="600">BALKON KACA</text>
  <text x="420" y="250" text-anchor="middle" fill="#4b5563" font-size="7.5">CANTILEVER (LT.2)</text>

  <!-- LT2+LT3 NOTE -->
  <rect x="30" y="322" width="460" height="24" rx="4" fill="#080e08" stroke="#22c55e" stroke-width="0.5"/>
  <text x="260" y="337" text-anchor="middle" fill="#4ade80" font-size="8.5">LT.2: 3 KT + 2 KM + Balkon Kaca  |  LT.3: Rooftop Lounge + Void Double Height</text>

  <!-- COMPASS -->
  <g transform="translate(468, 365)">
    <circle cx="0" cy="0" r="14" fill="none" stroke="#22c55e" stroke-width="0.8"/>
    <polygon points="0,-12 -4,0 0,3 4,0" fill="#22c55e" opacity="0.9"/>
    <polygon points="0,12 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-15" text-anchor="middle" fill="#22c55e" font-size="7" font-weight="700">U</text>
  </g>

  <!-- SCALE -->
  <text x="30" y="390" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.1 ≈ 117 m²  |  TOTAL 3 LANTAI ≈ 350 m²</text>
</svg>`;

// ============================================================
// denahP5 — Weird Coffee (50 m²)
// Box commercial, dark grey, LED, indoor + semi-outdoor
// ============================================================
const denahP5 = `
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="400" fill="#0a0a0a"/>
  <text x="260" y="22" text-anchor="middle" fill="#9ca3af" font-size="11" font-weight="600" letter-spacing="3">DENAH — WEIRD COFFEE</text>
  <line x1="80" y1="28" x2="440" y2="28" stroke="#f59e0b" stroke-width="0.5" opacity="0.4"/>

  <!-- Building outline — angular box -->
  <rect x="80" y="45" width="360" height="220" fill="none" stroke="#374151" stroke-width="2"/>

  <!-- OUTDOOR AREA / TERAS -->
  <rect x="80" y="45" width="140" height="220" fill="#0f0f0f" stroke="#374151" stroke-width="1"/>
  <text x="150" y="155" text-anchor="middle" fill="#6b7280" font-size="10" font-weight="600">AREA OUTDOOR</text>
  <text x="150" y="168" text-anchor="middle" fill="#4b5563" font-size="8.5">SEMI-TERBUKA</text>
  <text x="150" y="180" text-anchor="middle" fill="#4b5563" font-size="8">9 Kursi</text>
  <!-- Outdoor chairs arrangement -->
  <!-- Table 1 -->
  <circle cx="110" cy="100" r="16" fill="none" stroke="#6b7280" stroke-width="0.8"/>
  <circle cx="110" cy="82" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="110" cy="118" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="94" cy="100" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="126" cy="100" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <!-- Table 2 -->
  <circle cx="175" cy="100" r="16" fill="none" stroke="#6b7280" stroke-width="0.8"/>
  <circle cx="175" cy="82" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="175" cy="118" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="159" cy="100" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="191" cy="100" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <!-- Planter boxes -->
  <rect x="84" y="220" width="130" height="18" rx="2" fill="#1a2010" stroke="#15803d" stroke-width="0.8"/>
  <text x="149" y="233" text-anchor="middle" fill="#16a34a" font-size="7">PLANTER BOX</text>

  <!-- ENTRANCE / PINTU -->
  <line x1="220" y1="265" x2="280" y2="265" stroke="#f59e0b" stroke-width="2" opacity="0.8"/>
  <text x="250" y="278" text-anchor="middle" fill="#f59e0b" font-size="7.5">PINTU MASUK</text>
  <path d="M220 265 Q250 248 280 265" fill="none" stroke="#f59e0b" stroke-width="0.8" opacity="0.5"/>

  <!-- INDOOR AREA -->
  <rect x="220" y="45" width="220" height="220" fill="#111111" stroke="#374151" stroke-width="1"/>

  <!-- BAR COUNTER -->
  <rect x="225" y="50" width="210" height="40" fill="#1a1a1a" stroke="#f59e0b" stroke-width="1.2"/>
  <text x="330" y="66" text-anchor="middle" fill="#f59e0b" font-size="9" font-weight="600">BAR COUNTER</text>
  <text x="330" y="78" text-anchor="middle" fill="#6b7280" font-size="7.5">MEJA KASIR + DISPLAY</text>
  <!-- Coffee machines on counter -->
  <rect x="235" y="54" width="20" height="16" rx="2" fill="#252525" stroke="#f59e0b" stroke-width="0.5"/>
  <rect x="260" y="54" width="14" height="16" rx="1" fill="#252525" stroke="#f59e0b" stroke-width="0.5"/>
  <rect x="278" y="57" width="10" height="10" rx="1" fill="#252525" stroke="#6b7280" stroke-width="0.3"/>

  <!-- INDOOR SEATING -->
  <text x="330" y="130" text-anchor="middle" fill="#6b7280" font-size="9" font-weight="600">AREA INDOOR</text>
  <text x="330" y="142" text-anchor="middle" fill="#4b5563" font-size="8">15 Kursi</text>
  <!-- Tables indoor 2+2 -->
  <!-- Row 1 -->
  <rect x="235" y="105" width="50" height="30" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="228" y="108" width="8" height="24" rx="1" fill="#141414"/>
  <rect x="284" y="108" width="8" height="24" rx="1" fill="#141414"/>
  <rect x="235" y="98" width="50" height="8" rx="1" fill="#141414"/>
  <rect x="235" y="135" width="50" height="8" rx="1" fill="#141414"/>
  <!-- Row 2 -->
  <rect x="310" y="105" width="50" height="30" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="303" y="108" width="8" height="24" rx="1" fill="#141414"/>
  <rect x="359" y="108" width="8" height="24" rx="1" fill="#141414"/>
  <rect x="310" y="98" width="50" height="8" rx="1" fill="#141414"/>
  <rect x="310" y="135" width="50" height="8" rx="1" fill="#141414"/>
  <!-- Row 3 sofa bench -->
  <rect x="235" y="165" width="180" height="18" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <!-- Row 3 chairs -->
  <rect x="245" y="148" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="270" y="148" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="295" y="148" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="320" y="148" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="345" y="148" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>

  <!-- WC / STORAGE -->
  <rect x="225" y="200" width="70" height="55" fill="#0d0d0d" stroke="#374151" stroke-width="0.8"/>
  <text x="260" y="222" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">WC</text>
  <ellipse cx="260" cy="242" rx="14" ry="9" fill="none" stroke="#374151" stroke-width="0.7"/>
  <rect x="228" y="202" width="30" height="15" rx="3" fill="none" stroke="#374151" stroke-width="0.6"/>

  <rect x="295" y="200" width="130" height="55" fill="#0d0d0d" stroke="#374151" stroke-width="0.8"/>
  <text x="360" y="225" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">STORAGE</text>
  <text x="360" y="237" text-anchor="middle" fill="#4b5563" font-size="7.5">GUDANG STOK</text>

  <!-- LED LINE INDICATOR on facade -->
  <line x1="80" y1="45" x2="80" y2="265" stroke="#f59e0b" stroke-width="1.5" opacity="0.3" stroke-dasharray="3,6"/>
  <line x1="440" y1="45" x2="440" y2="265" stroke="#f59e0b" stroke-width="1.5" opacity="0.3" stroke-dasharray="3,6"/>
  <text x="68" y="160" text-anchor="middle" fill="#f59e0b" font-size="7" transform="rotate(-90,68,160)" opacity="0.5">LED VERTIKAL</text>
  <text x="452" y="160" text-anchor="middle" fill="#f59e0b" font-size="7" transform="rotate(90,452,160)" opacity="0.5">LED VERTIKAL</text>

  <!-- SIGNAGE -->
  <rect x="230" y="290" width="200" height="28" rx="4" fill="#1a1a1a" stroke="#f59e0b" stroke-width="1"/>
  <text x="330" y="308" text-anchor="middle" fill="#f59e0b" font-size="10" font-weight="700" letter-spacing="2">Weird Coffee</text>

  <!-- COMPASS -->
  <g transform="translate(468, 355)">
    <circle cx="0" cy="0" r="14" fill="none" stroke="#6b7280" stroke-width="0.8"/>
    <polygon points="0,-12 -4,0 0,3 4,0" fill="#9ca3af" opacity="0.9"/>
    <polygon points="0,12 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-15" text-anchor="middle" fill="#9ca3af" font-size="7" font-weight="700">U</text>
  </g>

  <!-- SCALE -->
  <text x="30" y="390" fill="#4b5563" font-size="7.5">SKALA 1:60  |  TOTAL BANGUNAN ≈ 50 m²  |  INDOOR: 35 m²  |  OUTDOOR: 15 m²</text>
  <!-- LEGEND -->
  <rect x="30" y="348" width="8" height="8" fill="#0f0f0f" stroke="#374151" stroke-width="1"/>
  <text x="42" y="356" fill="#6b7280" font-size="7.5">Area Outdoor</text>
  <rect x="30" y="360" width="8" height="8" fill="#111111" stroke="#6b7280" stroke-width="1"/>
  <text x="42" y="368" fill="#9ca3af" font-size="7.5">Area Indoor</text>
  <rect x="140" y="348" width="8" height="8" fill="#1a1a1a" stroke="#f59e0b" stroke-width="1"/>
  <text x="152" y="356" fill="#f59e0b" font-size="7.5">Bar Counter</text>
  <rect x="140" y="360" width="8" height="8" fill="#1a2010" stroke="#15803d" stroke-width="1"/>
  <text x="152" y="368" fill="#16a34a" font-size="7.5">Planter Box</text>
</svg>`;

// ============================================================
// denahP6 — Rumah Silinder Organik 3 Lantai (420 m²)
// Kolom silinder beton, garasi 3 mobil, balkon melingkar
// ============================================================
const denahP6 = `
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="400" fill="#080510"/>
  <text x="260" y="22" text-anchor="middle" fill="#a78bfa" font-size="11" font-weight="600" letter-spacing="2">DENAH LANTAI 1 — SILINDER ORGANIK 3 LANTAI</text>
  <line x1="60" y1="28" x2="460" y2="28" stroke="#a78bfa" stroke-width="0.5" opacity="0.4"/>

  <!-- Main building footprint — rectangular with cylindrical elements -->
  <rect x="30" y="40" width="460" height="260" fill="#0a0816" stroke="#6d28d9" stroke-width="1" stroke-dasharray="6,3"/>

  <!-- KOLOM SILINDER (4 corners + center) — structural cylinders -->
  <circle cx="70" cy="80" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="70" y="84" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <circle cx="450" cy="80" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="450" y="84" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <circle cx="70" cy="260" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="70" y="264" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <circle cx="450" cy="260" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="450" y="264" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <!-- Center column -->
  <circle cx="260" cy="170" r="16" fill="#110e20" stroke="#8b5cf6" stroke-width="1.2"/>
  <text x="260" y="174" text-anchor="middle" fill="#8b5cf6" font-size="6.5" font-weight="600">CORE</text>

  <!-- GARASI 3 MOBIL -->
  <rect x="38" y="48" width="280" height="80" fill="#0c0a1a" stroke="#374151" stroke-width="1"/>
  <line x1="128" y1="48" x2="128" y2="128" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
  <line x1="218" y1="48" x2="218" y2="128" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
  <!-- Cars -->
  <rect x="48" y="68" width="70" height="30" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
  <rect x="138" y="68" width="70" height="30" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
  <rect x="228" y="68" width="70" height="30" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
  <text x="179" y="120" text-anchor="middle" fill="#6b7280" font-size="9" font-weight="600">GARASI 3 MOBIL  ±  65 m²</text>
  <!-- Garage door line -->
  <line x1="38" y1="48" x2="318" y2="48" stroke="#a78bfa" stroke-width="2" opacity="0.5"/>

  <!-- FOYER BUNDAR -->
  <ellipse cx="390" cy="88" rx="55" ry="40" fill="#0d0b1e" stroke="#a78bfa" stroke-width="1.2"/>
  <text x="390" y="85" text-anchor="middle" fill="#c4b5fd" font-size="9" font-weight="600">FOYER</text>
  <text x="390" y="97" text-anchor="middle" fill="#4b5563" font-size="7.5">BUNDAR</text>

  <!-- LIVING ROOM (main zone) -->
  <rect x="38" y="128" width="200" height="110" fill="#0d0b1e" stroke="#7c3aed" stroke-width="1"/>
  <text x="138" y="178" text-anchor="middle" fill="#c4b5fd" font-size="9" font-weight="600">RUANG TAMU</text>
  <text x="138" y="190" text-anchor="middle" fill="#4b5563" font-size="7.5">± 55 m²</text>
  <!-- Curved sofa around column -->
  <path d="M55 220 Q105 200 155 220 L155 235 Q105 215 55 235 Z" fill="#15122a" stroke="#7c3aed" stroke-width="0.8"/>
  <!-- Round coffee table -->
  <ellipse cx="140" cy="200" rx="20" ry="15" fill="#0d0b1e" stroke="#7c3aed" stroke-width="0.5"/>

  <!-- DINING -->
  <rect x="238" y="128" width="130" height="80" fill="#0d0b1e" stroke="#d97706" stroke-width="1"/>
  <text x="303" y="165" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="303" y="177" text-anchor="middle" fill="#4b5563" font-size="7.5">± 30 m²</text>
  <!-- Round table (organic) -->
  <ellipse cx="303" cy="152" rx="35" ry="25" fill="#15122a" stroke="#d97706" stroke-width="0.5"/>
  <!-- Chairs around -->
  <circle cx="303" cy="128" r="6" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>
  <circle cx="303" cy="176" r="6" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>
  <circle cx="270" cy="150" r="6" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>
  <circle cx="336" cy="150" r="6" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>

  <!-- KITCHEN -->
  <rect x="370" y="128" width="120" height="80" fill="#0d0b1e" stroke="#d97706" stroke-width="1"/>
  <text x="430" y="165" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="430" y="177" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
  <!-- Counter -->
  <rect x="375" y="132" width="110" height="10" fill="#15122a" stroke="#d97706" stroke-width="0.5"/>
  <rect x="375" y="132" width="10" height="72" fill="#15122a" stroke="#d97706" stroke-width="0.5"/>

  <!-- KM + WC LT1 -->
  <rect x="238" y="208" width="80" height="60" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
  <text x="278" y="232" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 1</text>
  <rect x="245" y="214" width="30" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <ellipse cx="278" cy="255" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>

  <!-- TANGGA MELINGKAR -->
  <g transform="translate(340, 238)">
    <circle cx="0" cy="0" r="30" fill="#080514" stroke="#8b5cf6" stroke-width="1.2"/>
    <circle cx="0" cy="0" r="10" fill="#0d0b1e" stroke="#a78bfa" stroke-width="0.8"/>
    <path d="M0,-30 A30,30 0 0,1 30,0" fill="none" stroke="#8b5cf6" stroke-width="2.5"/>
    <path d="M30,0 A30,30 0 0,1 0,30" fill="none" stroke="#8b5cf6" stroke-width="1.5" opacity="0.6"/>
    <path d="M0,30 A30,30 0 0,1 -30,0" fill="none" stroke="#8b5cf6" stroke-width="1" opacity="0.35"/>
    <text x="0" y="3" text-anchor="middle" fill="#a78bfa" font-size="7" font-weight="600">TANGGA</text>
    <text x="0" y="12" text-anchor="middle" fill="#6b7280" font-size="6">BUNDAR</text>
  </g>

  <!-- UTILITY -->
  <rect x="38" y="250" width="200" height="42" fill="#080514" stroke="#374151" stroke-width="0.8"/>
  <text x="138" y="274" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">UTILITAS / LAUNDRY</text>

  <!-- BALKON MELINGKAR indicator -->
  <ellipse cx="260" cy="310" rx="230" ry="22" fill="none" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="5,4" opacity="0.5"/>
  <text x="260" y="314" text-anchor="middle" fill="#8b5cf6" font-size="8">← BALKON MELINGKAR (LT.2 DAN LT.3) →</text>

  <!-- LT2+LT3 NOTE -->
  <rect x="30" y="338" width="460" height="24" rx="4" fill="#0d0b1e" stroke="#7c3aed" stroke-width="0.5"/>
  <text x="260" y="353" text-anchor="middle" fill="#c4b5fd" font-size="8.5">LT.2: 3 KT + 2 KM + Balkon Melingkar  |  LT.3: Master Suite + KM Premium + Rooftop</text>

  <!-- COMPASS -->
  <g transform="translate(468, 375)">
    <circle cx="0" cy="0" r="14" fill="none" stroke="#8b5cf6" stroke-width="0.8"/>
    <polygon points="0,-12 -4,0 0,3 4,0" fill="#a78bfa" opacity="0.9"/>
    <polygon points="0,12 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-15" text-anchor="middle" fill="#a78bfa" font-size="7" font-weight="700">U</text>
  </g>

  <!-- SCALE -->
  <text x="30" y="392" fill="#4b5563" font-size="7.5">SKALA 1:150  |  LT.1 ≈ 140 m²  |  TOTAL 3 LANTAI ≈ 420 m²</text>
</svg>`;

// ============================================================
// denahP7 — Rumah Dark Concrete 2 Lantai (240 m²)
// Beton ekspos, skylight segitiga, curtain wall, 3KT+2KM
// ============================================================
const denahP7 = `
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="400" fill="#080808"/>
  <text x="260" y="22" text-anchor="middle" fill="#e5e7eb" font-size="11" font-weight="600" letter-spacing="2">DENAH LANTAI 1 — DARK CONCRETE</text>
  <line x1="80" y1="28" x2="440" y2="28" stroke="#6b7280" stroke-width="0.5" opacity="0.4"/>

  <!-- Building outline -->
  <rect x="30" y="38" width="460" height="250" fill="none" stroke="#4b5563" stroke-width="1.5"/>

  <!-- CURTAIN WALL (front glass) -->
  <rect x="30" y="38" width="460" height="10" fill="#112233" stroke="#60a5fa" stroke-width="0.8"/>
  <line x1="80" y1="38" x2="80" y2="48" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="140" y1="38" x2="140" y2="48" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="200" y1="38" x2="200" y2="48" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="260" y1="38" x2="260" y2="48" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="320" y1="38" x2="320" y2="48" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="380" y1="38" x2="380" y2="48" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="440" y1="38" x2="440" y2="48" stroke="#60a5fa" stroke-width="0.4"/>
  <text x="260" y="47" text-anchor="middle" fill="#60a5fa" font-size="6.5" letter-spacing="1">CURTAIN WALL — KACA FULL LANTAI 1</text>

  <!-- RUANG TAMU OPEN (Curtain wall section) -->
  <rect x="30" y="48" width="200" height="110" fill="#0d0d0d" stroke="#4b5563" stroke-width="1"/>
  <text x="130" y="98" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">LIVING OPEN</text>
  <text x="130" y="110" text-anchor="middle" fill="#6b7280" font-size="7.5">CURTAIN WALL</text>
  <text x="130" y="122" text-anchor="middle" fill="#4b5563" font-size="7.5">± 45 m²</text>
  <!-- Industrial style sofa -->
  <rect x="40" y="125" width="100" height="22" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="40" y="122" width="22" height="25" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="118" y="122" width="22" height="25" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <!-- Concrete coffee table -->
  <rect x="65" y="108" width="50" height="16" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>

  <!-- SKYLIGHT SEGITIGA (visual indicator on plan) -->
  <polygon points="230,48 310,48 270,80" fill="#0a1a2a" stroke="#60a5fa" stroke-width="1.2"/>
  <text x="270" y="72" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="600">SKYLIGHT</text>
  <text x="270" y="82" text-anchor="middle" fill="#3b82f6" font-size="6.5">▲ SEGITIGA</text>
  <!-- Glass lines -->
  <line x1="250" y1="48" x2="270" y2="78" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
  <line x1="290" y1="48" x2="270" y2="78" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
  <line x1="270" y1="48" x2="270" y2="78" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>

  <!-- DINING -->
  <rect x="230" y="90" width="140" height="80" fill="#0d0d0d" stroke="#6b7280" stroke-width="1"/>
  <text x="300" y="127" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="300" y="139" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
  <!-- Concrete table -->
  <rect x="248" y="100" width="100" height="45" rx="0" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <rect x="242" y="105" width="7" height="35" rx="0" fill="#121212"/>
  <rect x="347" y="105" width="7" height="35" rx="0" fill="#121212"/>

  <!-- KITCHEN INDUSTRIAL -->
  <rect x="370" y="48" width="120" height="110" fill="#0d0d0d" stroke="#6b7280" stroke-width="1"/>
  <text x="430" y="98" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">DAPUR</text>
  <text x="430" y="110" text-anchor="middle" fill="#4b5563" font-size="7.5">INDUSTRIAL</text>
  <text x="430" y="122" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
  <!-- Counter -->
  <rect x="375" y="52" width="110" height="11" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>
  <rect x="375" y="52" width="11" height="100" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>
  <!-- Kitchen island -->
  <rect x="400" y="80" width="60" height="25" rx="0" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>

  <!-- WC TAMU -->
  <rect x="230" y="170" width="70" height="55" fill="#0a0e14" stroke="#4b5563" stroke-width="1"/>
  <text x="265" y="192" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">WC</text>
  <ellipse cx="265" cy="212" rx="14" ry="9" fill="none" stroke="#4b5563" stroke-width="0.7"/>
  <rect x="235" y="172" width="30" height="14" rx="3" fill="none" stroke="#4b5563" stroke-width="0.6"/>

  <!-- TANGGA BETON -->
  <rect x="300" y="170" width="70" height="55" fill="#0d0d0d" stroke="#4b5563" stroke-width="0.8"/>
  <text x="335" y="192" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">TANGGA</text>
  <line x1="305" y1="178" x2="365" y2="178" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="184" x2="365" y2="184" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="190" x2="365" y2="190" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="196" x2="365" y2="196" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="202" x2="365" y2="202" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="208" x2="365" y2="208" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="214" x2="365" y2="214" stroke="#4b5563" stroke-width="0.5"/>

  <!-- LAUNDRY / UTILITY -->
  <rect x="370" y="158" width="120" height="67" fill="#0a0a0a" stroke="#374151" stroke-width="0.8"/>
  <text x="430" y="188" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">LAUNDRY</text>
  <text x="430" y="200" text-anchor="middle" fill="#4b5563" font-size="7.5">UTILITAS</text>

  <!-- VOID / DOUBLE HEIGHT -->
  <rect x="30" y="158" width="200" height="55" fill="#0a0a0a" stroke="#374151" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="130" y="182" text-anchor="middle" fill="#4b5563" font-size="8.5">VOID DOUBLE HEIGHT</text>
  <text x="130" y="194" text-anchor="middle" fill="#374151" font-size="7.5">+ TAMAN KERING</text>

  <!-- TERAS DEPAN -->
  <rect x="30" y="290" width="460" height="40" fill="#0a0a0a" stroke="#4b5563" stroke-width="0.8" stroke-dasharray="3,4"/>
  <text x="260" y="313" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">TERAS DEPAN — BETON EKSPOS</text>

  <!-- LT2 NOTE -->
  <rect x="30" y="335" width="460" height="24" rx="4" fill="#111" stroke="#4b5563" stroke-width="0.5"/>
  <text x="260" y="350" text-anchor="middle" fill="#d1d5db" font-size="8.5">LT.2: 3 KT + 2 KM + Skylight Segitiga + Balkon Kaca (diatas void)</text>

  <!-- COMPASS -->
  <g transform="translate(468, 375)">
    <circle cx="0" cy="0" r="14" fill="none" stroke="#6b7280" stroke-width="0.8"/>
    <polygon points="0,-12 -4,0 0,3 4,0" fill="#9ca3af" opacity="0.9"/>
    <polygon points="0,12 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-15" text-anchor="middle" fill="#9ca3af" font-size="7" font-weight="700">U</text>
  </g>

  <text x="30" y="392" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.1 ≈ 120 m²  |  TOTAL 2 LANTAI ≈ 240 m²</text>
</svg>`;

// ============================================================
// denahP8 — Rumah Minimalis Tropis 2 Lantai (260 m²)
// Krem warm, louver kayu vertikal, balkon kaca, garasi 1 mobil
// ============================================================
const denahP8 = `
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="400" fill="#0e0a04"/>
  <text x="260" y="22" text-anchor="middle" fill="#d97706" font-size="11" font-weight="600" letter-spacing="2">DENAH LANTAI 1 — MINIMALIS TROPIS</text>
  <line x1="80" y1="28" x2="440" y2="28" stroke="#d97706" stroke-width="0.5" opacity="0.4"/>

  <!-- CARPORT + TAMAN MASUK -->
  <rect x="30" y="40" width="130" height="90" fill="#0c0903" stroke="#92400e" stroke-width="1"/>
  <rect x="30" y="40" width="130" height="90" fill="none" stroke="#92400e" stroke-width="0.4" stroke-dasharray="5,5"/>
  <text x="95" y="82" text-anchor="middle" fill="#92400e" font-size="8.5" font-weight="500">CARPORT</text>
  <text x="95" y="94" text-anchor="middle" fill="#4b5563" font-size="7.5">1 MOBIL</text>
  <rect x="45" y="75" width="75" height="30" rx="3" fill="#181208" stroke="#78350f" stroke-width="0.5"/>
  <!-- Louver indicator (left side) -->
  <line x1="30" y1="40" x2="30" y2="130" stroke="#d97706" stroke-width="2" opacity="0.6"/>
  <line x1="33" y1="45" x2="33" y2="125" stroke="#d97706" stroke-width="1" opacity="0.3"/>
  <line x1="36" y1="45" x2="36" y2="125" stroke="#d97706" stroke-width="1" opacity="0.3"/>
  <line x1="39" y1="45" x2="39" y2="125" stroke="#d97706" stroke-width="1" opacity="0.3"/>
  <text x="22" y="90" text-anchor="middle" fill="#d97706" font-size="6.5" transform="rotate(-90,22,90)" opacity="0.7">LOUVER KAYU</text>

  <!-- TAMAN MASUK / STEPPING -->
  <rect x="160" y="40" width="80" height="90" fill="#071208" stroke="#15803d" stroke-width="0.8"/>
  <text x="200" y="82" text-anchor="middle" fill="#16a34a" font-size="8" font-weight="600">TAMAN</text>
  <text x="200" y="94" text-anchor="middle" fill="#4b5563" font-size="7.5">MASUK</text>
  <!-- Stepping stones -->
  <rect x="174" y="95" width="12" height="8" rx="1" fill="#0c1a0c" stroke="#16a34a" stroke-width="0.4"/>
  <rect x="190" y="100" width="12" height="8" rx="1" fill="#0c1a0c" stroke="#16a34a" stroke-width="0.4"/>
  <rect x="206" y="95" width="12" height="8" rx="1" fill="#0c1a0c" stroke="#16a34a" stroke-width="0.4"/>
  <rect x="222" y="100" width="8" height="8" rx="1" fill="#0c1a0c" stroke="#16a34a" stroke-width="0.4"/>
  <!-- Trees -->
  <circle cx="175" cy="60" r="12" fill="#052e0a" stroke="#16a34a" stroke-width="0.7"/>
  <circle cx="220" cy="55" r="9" fill="#052e0a" stroke="#16a34a" stroke-width="0.7"/>

  <!-- FOYER ENTRANCE -->
  <rect x="240" y="40" width="80" height="60" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="280" y="68" text-anchor="middle" fill="#d97706" font-size="9" font-weight="600">FOYER</text>
  <text x="280" y="80" text-anchor="middle" fill="#4b5563" font-size="7.5">MASUK</text>
  <path d="M240 100 Q258 100 258 82" fill="none" stroke="#d97706" stroke-width="0.8" opacity="0.5"/>

  <!-- RUANG TAMU -->
  <rect x="30" y="130" width="200" height="110" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="130" y="180" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG TAMU</text>
  <text x="130" y="192" text-anchor="middle" fill="#4b5563" font-size="7.5">± 38 m²</text>
  <!-- Warm minimalist sofa -->
  <rect x="40" y="200" width="90" height="22" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="40" y="197" width="20" height="25" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="110" y="197" width="20" height="25" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- Side table organic -->
  <ellipse cx="160" cy="192" rx="12" ry="10" fill="#1e1508" stroke="#d97706" stroke-width="0.4"/>

  <!-- RUANG KELUARGA -->
  <rect x="230" y="100" width="140" height="100" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="300" y="145" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG KELUARGA</text>
  <text x="300" y="157" text-anchor="middle" fill="#4b5563" font-size="7.5">± 32 m²</text>
  <!-- TV wall minimal -->
  <rect x="235" y="105" width="90" height="8" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- Sofa -->
  <rect x="240" y="170" width="85" height="20" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>

  <!-- DAPUR OPEN TO DINING -->
  <rect x="320" y="100" width="180" height="70" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="410" y="132" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR OPEN</text>
  <text x="410" y="144" text-anchor="middle" fill="#4b5563" font-size="7.5">± 20 m²</text>
  <!-- Counter -->
  <rect x="325" y="104" width="170" height="10" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="480" y="104" width="15" height="62" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- Kitchen island -->
  <rect x="360" y="125" width="80" height="22" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>

  <!-- DINING -->
  <rect x="370" y="170" width="130" height="70" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="435" y="202" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="435" y="214" text-anchor="middle" fill="#4b5563" font-size="7.5">± 18 m²</text>
  <!-- Dining table -->
  <rect x="385" y="178" width="90" height="40" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="379" y="183" width="7" height="30" rx="1" fill="#140e04"/>
  <rect x="474" y="183" width="7" height="30" rx="1" fill="#140e04"/>

  <!-- WC TAMU -->
  <rect x="230" y="200" width="70" height="55" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="265" y="224" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC TAMU</text>
  <ellipse cx="265" cy="245" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <rect x="235" y="202" width="30" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>

  <!-- TANGGA MINIMALIS -->
  <rect x="300" y="200" width="70" height="55" fill="#0d0a04" stroke="#4b5563" stroke-width="0.8"/>
  <text x="335" y="222" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="305" y1="208" x2="365" y2="208" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="214" x2="365" y2="214" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="220" x2="365" y2="220" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="226" x2="365" y2="226" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="232" x2="365" y2="232" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="238" x2="365" y2="238" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="244" x2="365" y2="244" stroke="#4b5563" stroke-width="0.5"/>

  <!-- UTILITY -->
  <rect x="30" y="240" width="200" height="40" fill="#0a0804" stroke="#374151" stroke-width="0.8"/>
  <text x="130" y="262" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">UTILITAS / SERVIS</text>

  <!-- LT2 NOTE -->
  <rect x="30" y="295" width="460" height="24" rx="4" fill="#100c04" stroke="#78350f" stroke-width="0.5"/>
  <text x="260" y="310" text-anchor="middle" fill="#d97706" font-size="8.5">LT.2: 2 KT + 2 KM + Balkon Kaca Railing + Louver Kayu Vertikal + R. Belajar</text>

  <!-- COMPASS -->
  <g transform="translate(468, 355)">
    <circle cx="0" cy="0" r="14" fill="none" stroke="#d97706" stroke-width="0.8"/>
    <polygon points="0,-12 -4,0 0,3 4,0" fill="#d97706" opacity="0.9"/>
    <polygon points="0,12 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-15" text-anchor="middle" fill="#d97706" font-size="7" font-weight="700">U</text>
  </g>

  <text x="30" y="390" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.1 ≈ 130 m²  |  TOTAL 2 LANTAI ≈ 260 m²</text>

  <!-- LEGEND -->
  <rect x="30" y="328" width="8" height="8" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="42" y="336" fill="#fbbf24" font-size="7.5">Ruang Tamu / Keluarga / Makan</text>
  <rect x="30" y="340" width="8" height="8" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="42" y="348" fill="#67e8f9" font-size="7.5">Kamar Mandi</text>
  <rect x="220" y="328" width="8" height="8" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="232" y="336" fill="#16a34a" font-size="7.5">Taman / Carport</text>
  <rect x="220" y="340" width="8" height="8" fill="#0c0903" stroke="#92400e" stroke-width="1"/>
  <text x="232" y="348" fill="#92400e" font-size="7.5">Louver / Servis</text>
</svg>`;

function populateModal(idx) {
    const p = projects[idx];
    document.getElementById('modalTitle').textContent = p.name;
    document.getElementById('modalType').textContent  = p.type;
 
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
 
    // BUG FIX #10: denahP1…denahP8 tidak pernah didefinisikan di file ini,
    // menyebabkan ReferenceError. Diganti dengan placeholder SVG yang aman.
    // Isi dengan SVG denah nyata jika tersedia, atau hubungkan ke file terpisah.
    const denahPlaceholder = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                    padding:40px;color:#888;text-align:center;gap:12px">
            <i class="ti ti-layout-2" style="font-size:48px;opacity:0.4"></i>
            <p style="font-size:13px;margin:0">Denah untuk proyek ini belum tersedia.<br>
            Hubungi kami untuk gambar kerja lengkap.</p>
        </div>`;
 
    const denahMap = [denahP1, denahP2, denahP3, denahP4, denahP5, denahP6, denahP7, denahP8];
document.getElementById('denahSvg').innerHTML = denahMap[idx] || denahPlaceholder;
 
    document.getElementById('denahLegend').innerHTML = p.legend.map(l =>
        `<div class="pf-legend-item">
           <div class="pf-legend-dot" style="background:${l.color}"></div>
           <span>${l.label}</span>
         </div>`
    ).join('');
 
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
 
    document.getElementById('navCount').textContent = `${idx + 1} / ${projects.length}`;
    document.getElementById('btnPrev').disabled = idx === 0;
    document.getElementById('btnNext').disabled = idx === projects.length - 1;
}
 
function navigate(dir) {
    const next = currentIndex + dir;
    if (next >= 0 && next < projects.length) openModal(next);
}
 
// BUG FIX #11: switchTab() tidak mengupdate aria-selected pada tab,
// melanggar aksesibilitas. Ditambahkan update aria-selected.
function switchTab(tab) {
    ['konsep', 'denah', 'file'].forEach(t => {
        const tabEl = document.getElementById('tab-' + t);
        const contentEl = document.getElementById('content-' + t);
        const isActive = t === tab;
 
        tabEl.classList.toggle('active', isActive);
        tabEl.setAttribute('aria-selected', isActive ? 'true' : 'false');
        contentEl.classList.toggle('active', isActive);
    });
}
 
// ==================== ENTRY POINT ====================
document.addEventListener('DOMContentLoaded', () => {
    // BUG FIX #12: Inisialisasi statsCounter SEKALI di sini saja.
    // Sebelumnya ada pemanggilan ganda: initStatsCounter() di dalam init()
    // DAN new AdvancedStatsCounter() langsung di sini — menyebabkan dua instance.
    initStatsCounter();
    initChatNotification();
    init();
 
    // Update display setelah 1 detik untuk memberi waktu DOM siap
    setTimeout(() => {
        if (window.statsCounter) {
            window.statsCounter.updateDisplay(true);
        }
    }, 1000);
 
    // Portfolio item click listeners
    document.querySelectorAll('.portfolio-item').forEach(item => {
        item.addEventListener('click', () => openModal(+item.dataset.index));
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(+item.dataset.index);
            }
        });
    });
 
    // Modal backdrop click
    const backdrop = document.getElementById('pfModalBackdrop');
    if (backdrop) {
        backdrop.addEventListener('click', function (e) {
            if (e.target === this) closeModal();
        });
    }
 
    // Keyboard nav modal
    document.addEventListener('keydown', e => {
        if (!document.getElementById('pfModalBackdrop').classList.contains('open')) return;
        if (e.key === 'Escape')     closeModal();
        if (e.key === 'ArrowRight') navigate(1);
        if (e.key === 'ArrowLeft')  navigate(-1);
    });
});
