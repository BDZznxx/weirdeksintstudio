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
 
// BUG FIX #13: FUNGSI YANG HILANG - renderDenahTabs()
// Digunakan di populateModal() untuk menampilkan multiple denah lantai
function renderDenahTabs(idx) {
    const p = projects[idx];
    const denahKey = `p${idx + 1}`; // p1, p2, p3, dst
    const floors = denahData[denahKey] || [];
    
    if (!floors || floors.length === 0) {
        document.getElementById('denahContainer').innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">Denah tidak tersedia</p>';
        return;
    }
 
    // Buat tab buttons
    let tabButtonsHTML = floors.map((floor, i) => 
        `<button class="pf-denah-tab ${i === 0 ? 'active' : ''}" 
                 data-floor="${i}" 
                 aria-selected="${i === 0 ? 'true' : 'false'}"
                 role="tab">
            ${floor.label}
        </button>`
    ).join('');
 
    // Buat tab content
    let tabContentHTML = floors.map((floor, i) =>
        `<div class="pf-denah-content ${i === 0 ? 'active' : ''}" 
              data-floor="${i}" 
              role="tabpanel">
            ${floor.svg}
        </div>`
    ).join('');
 
    // Render ke container
    const container = document.getElementById('denahContainer');
    container.innerHTML = `
        <div class="pf-denah-tabs" role="tablist">
            ${tabButtonsHTML}
        </div>
        <div class="pf-denah-panels">
            ${tabContentHTML}
        </div>
    `;
 
    // Setup event listeners untuk tab switching
    document.querySelectorAll('.pf-denah-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const floorIdx = +e.target.dataset.floor;
            switchDenahTab(floorIdx);
        });
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const tabs = Array.from(document.querySelectorAll('.pf-denah-tab'));
                const currentIdx = tabs.indexOf(e.target);
                const direction = e.key === 'ArrowLeft' ? -1 : 1;
                const nextIdx = (currentIdx + direction + tabs.length) % tabs.length;
                tabs[nextIdx].click();
                tabs[nextIdx].focus();
            }
        });
    });
}
 
// BUG FIX #14: FUNGSI YANG HILANG - switchDenahTab()
// Untuk switch antar lantai di modal denah
function switchDenahTab(floorIdx) {
    document.querySelectorAll('.pf-denah-tab').forEach((tab, i) => {
        const isActive = i === floorIdx;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
 
    document.querySelectorAll('.pf-denah-content').forEach((content, i) => {
        content.classList.toggle('active', i === floorIdx);
    });
}
 
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

const denahData = {
 
  // ──────────────────────────────────────────────────────────
  // P1 — MANSION CLASSIC MODERN 3 LANTAI (600 m²)
  // ──────────────────────────────────────────────────────────
  p1: [
    {
      label: 'Lantai 1',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#0d0d1a"/>
  <text x="260" y="18" text-anchor="middle" fill="#c9a96e" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 1 — MANSION CLASSIC MODERN</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#c9a96e" stroke-width="0.4" opacity="0.4"/>
  <!-- GARASI 2 MOBIL -->
  <rect x="20" y="34" width="155" height="90" fill="#1e1e2e" stroke="#6b7280" stroke-width="1"/>
  <rect x="28" y="50" width="55" height="28" rx="2" fill="#2a2a3e" stroke="#6b7280" stroke-width="0.5"/>
  <rect x="98" y="50" width="55" height="28" rx="2" fill="#2a2a3e" stroke="#6b7280" stroke-width="0.5"/>
  <text x="97" y="90" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">GARASI 2 MOBIL</text>
  <text x="97" y="102" text-anchor="middle" fill="#6b7280" font-size="7.5">50 m²</text>
  <!-- FOYER -->
  <rect x="175" y="34" width="85" height="55" fill="#1a1f3a" stroke="#c9a96e" stroke-width="1"/>
  <text x="217" y="58" text-anchor="middle" fill="#c9a96e" font-size="8.5" font-weight="600">FOYER</text>
  <text x="217" y="70" text-anchor="middle" fill="#6b7280" font-size="7">ENTRANCE</text>
  <path d="M175 34 Q217 24 259 34" fill="none" stroke="#c9a96e" stroke-width="0.8" opacity="0.5"/>
  <!-- RUANG TAMU -->
  <rect x="260" y="34" width="130" height="115" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
  <text x="325" y="85" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">RUANG TAMU</text>
  <text x="325" y="97" text-anchor="middle" fill="#6b7280" font-size="7.5">40 m²</text>
  <rect x="272" y="110" width="55" height="14" rx="2" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.5"/>
  <rect x="330" y="113" width="14" height="11" rx="1" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.5"/>
  <!-- RUANG MAKAN -->
  <rect x="390" y="34" width="110" height="80" fill="#1a1a2e" stroke="#d97706" stroke-width="1"/>
  <text x="445" y="71" text-anchor="middle" fill="#fbbf24" font-size="8.5" font-weight="600">RUANG MAKAN</text>
  <text x="445" y="83" text-anchor="middle" fill="#6b7280" font-size="7.5">25 m²</text>
  <rect x="408" y="44" width="65" height="24" rx="2" fill="#252525" stroke="#d97706" stroke-width="0.5"/>
  <!-- DAPUR -->
  <rect x="390" y="114" width="110" height="75" fill="#1a1a2e" stroke="#d97706" stroke-width="1"/>
  <text x="445" y="148" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="445" y="160" text-anchor="middle" fill="#6b7280" font-size="7.5">22 m²</text>
  <rect x="395" y="118" width="100" height="10" rx="1" fill="#252535" stroke="#d97706" stroke-width="0.5"/>
  <rect x="395" y="118" width="10" height="65" rx="1" fill="#252535" stroke="#d97706" stroke-width="0.5"/>
  <!-- WC TAMU -->
  <rect x="175" y="89" width="55" height="45" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
  <text x="202" y="107" text-anchor="middle" fill="#67e8f9" font-size="7.5" font-weight="600">WC TAMU</text>
  <ellipse cx="202" cy="125" rx="10" ry="7" fill="none" stroke="#0891b2" stroke-width="0.6"/>
  <!-- RUANG KELUARGA -->
  <rect x="20" y="134" width="230" height="105" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
  <text x="135" y="181" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">RUANG KELUARGA</text>
  <text x="135" y="193" text-anchor="middle" fill="#6b7280" font-size="7.5">45 m²</text>
  <rect x="30" y="200" width="110" height="18" rx="2" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.5"/>
  <rect x="30" y="182" width="18" height="36" rx="2" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.5"/>
  <!-- SERVIS / LAUNDRY -->
  <rect x="20" y="249" width="230" height="50" fill="#111122" stroke="#374151" stroke-width="1"/>
  <text x="135" y="278" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">SERVIS / LAUNDRY</text>
  <!-- TANGGA -->
  <rect x="260" y="189" width="70" height="60" fill="#1e1e2e" stroke="#6b7280" stroke-width="0.8"/>
  <text x="295" y="215" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">TANGGA</text>
  <line x1="265" y1="197" x2="325" y2="197" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="265" y1="204" x2="325" y2="204" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="265" y1="211" x2="325" y2="211" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="265" y1="218" x2="325" y2="218" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="265" y1="225" x2="325" y2="225" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="265" y1="232" x2="325" y2="232" stroke="#6b7280" stroke-width="0.5"/>
  <!-- TERAS -->
  <rect x="20" y="309" width="480" height="35" fill="#0a0a14" stroke="#4b5563" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="260" y="329" text-anchor="middle" fill="#6b7280" font-size="8.5">TERAS DEPAN + TAMAN</text>
  <!-- LEGEND -->
  <rect x="20" y="352" width="7" height="7" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
  <text x="31" y="359" fill="#818cf8" font-size="7">Ruang Tamu/Keluarga</text>
  <rect x="150" y="352" width="7" height="7" fill="#1a1a2e" stroke="#d97706" stroke-width="1"/>
  <text x="161" y="359" fill="#fbbf24" font-size="7">Dapur/Makan</text>
  <rect x="250" y="352" width="7" height="7" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
  <text x="261" y="359" fill="#67e8f9" font-size="7">KM/WC</text>
  <rect x="310" y="352" width="7" height="7" fill="#1e1e2e" stroke="#6b7280" stroke-width="1"/>
  <text x="321" y="359" fill="#9ca3af" font-size="7">Garasi/Servis/Tangga</text>
  <!-- COMPASS -->
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#c9a96e" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#c9a96e"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#6b7280" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#c9a96e" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#6b7280" font-size="7">SKALA 1:150  |  LT.1 ≈ 200 m²</text>
</svg>`
    },
    {
      label: 'Lantai 2',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#0d0d1a"/>
  <text x="260" y="18" text-anchor="middle" fill="#c9a96e" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 2 — MANSION CLASSIC MODERN</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#c9a96e" stroke-width="0.4" opacity="0.4"/>
  <!-- KORIDOR/HALL -->
  <rect x="20" y="34" width="480" height="40" fill="#1a1a2e" stroke="#6b7280" stroke-width="0.8"/>
  <text x="260" y="58" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">KORIDOR / HALL LANTAI 2</text>
  <!-- MASTER BEDROOM -->
  <rect x="20" y="74" width="175" height="140" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="107" y="138" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">MASTER BEDROOM</text>
  <text x="107" y="150" text-anchor="middle" fill="#6b7280" font-size="7.5">40 m²</text>
  <rect x="30" y="168" width="60" height="35" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
  <rect x="30" y="168" width="60" height="12" rx="1" fill="#3a2560"/>
  <rect x="130" y="80" width="55" height="20" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>
  <!-- KM UTAMA EN SUITE -->
  <rect x="195" y="74" width="110" height="75" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
  <text x="250" y="107" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM UTAMA</text>
  <text x="250" y="119" text-anchor="middle" fill="#6b7280" font-size="7.5">EN SUITE</text>
  <rect x="203" y="82" width="45" height="20" rx="4" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="252" y="80" width="20" height="20" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <!-- KAMAR TIDUR 2 -->
  <rect x="195" y="149" width="110" height="110" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="250" y="198" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KAMAR TIDUR 2</text>
  <text x="250" y="210" text-anchor="middle" fill="#6b7280" font-size="7.5">22 m²</text>
  <rect x="205" y="220" width="50" height="30" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
  <rect x="205" y="220" width="50" height="10" rx="1" fill="#3a2560"/>
  <!-- KM 2 -->
  <rect x="305" y="74" width="90" height="70" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
  <text x="350" y="107" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="350" cy="128" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- KAMAR TIDUR 3 -->
  <rect x="305" y="144" width="115" height="115" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="362" y="198" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KAMAR TIDUR 3</text>
  <text x="362" y="210" text-anchor="middle" fill="#6b7280" font-size="7.5">20 m²</text>
  <rect x="315" y="220" width="50" height="30" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
  <rect x="315" y="220" width="50" height="10" rx="1" fill="#3a2560"/>
  <!-- TANGGA -->
  <rect x="420" y="74" width="80" height="60" fill="#1e1e2e" stroke="#6b7280" stroke-width="0.8"/>
  <text x="460" y="100" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">TANGGA</text>
  <line x1="425" y1="82" x2="495" y2="82" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="425" y1="89" x2="495" y2="89" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="425" y1="96" x2="495" y2="96" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="425" y1="103" x2="495" y2="103" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="425" y1="110" x2="495" y2="110" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="425" y1="117" x2="495" y2="117" stroke="#6b7280" stroke-width="0.5"/>
  <!-- RUANG BELAJAR -->
  <rect x="420" y="134" width="80" height="75" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
  <text x="460" y="168" text-anchor="middle" fill="#818cf8" font-size="8.5" font-weight="600">RUANG</text>
  <text x="460" y="180" text-anchor="middle" fill="#818cf8" font-size="8.5" font-weight="600">BELAJAR</text>
  <!-- BALKON DEPAN -->
  <rect x="20" y="224" width="175" height="40" fill="#0d1525" stroke="#22d3ee" stroke-width="1"/>
  <text x="107" y="248" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">BALKON DEPAN</text>
  <!-- LEGEND -->
  <rect x="20" y="280" width="7" height="7" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="31" y="287" fill="#a78bfa" font-size="7">Kamar Tidur</text>
  <rect x="120" y="280" width="7" height="7" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
  <text x="131" y="287" fill="#67e8f9" font-size="7">KM/WC</text>
  <rect x="200" y="280" width="7" height="7" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
  <text x="211" y="287" fill="#818cf8" font-size="7">Ruang Belajar</text>
  <rect x="310" y="280" width="7" height="7" fill="#0d1525" stroke="#22d3ee" stroke-width="1"/>
  <text x="321" y="287" fill="#67e8f9" font-size="7">Balkon</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#c9a96e" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#c9a96e"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#6b7280" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#c9a96e" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#6b7280" font-size="7">SKALA 1:150  |  LT.2 ≈ 200 m²</text>
</svg>`
    },
    {
      label: 'Lantai 3',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#0d0d1a"/>
  <text x="260" y="18" text-anchor="middle" fill="#c9a96e" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 3 (MANSARD) — MANSION CLASSIC MODERN</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#c9a96e" stroke-width="0.4" opacity="0.4"/>
  <!-- Bentuk mansard (lebih kecil dari lt2) -->
  <rect x="60" y="34" width="400" height="220" fill="none" stroke="#c9a96e" stroke-width="0.8" stroke-dasharray="5,3"/>
  <!-- MASTER SUITE ATAP -->
  <rect x="70" y="44" width="200" height="145" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="170" y="110" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">MASTER SUITE ATAP</text>
  <text x="170" y="122" text-anchor="middle" fill="#6b7280" font-size="7.5">38 m²</text>
  <rect x="82" y="148" width="65" height="32" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
  <rect x="82" y="148" width="65" height="12" rx="1" fill="#3a2560"/>
  <rect x="160" y="148" width="95" height="18" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>
  <!-- KM MASTER PREMIUM -->
  <rect x="270" y="44" width="120" height="145" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
  <text x="330" y="110" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM MASTER</text>
  <text x="330" y="122" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">PREMIUM</text>
  <rect x="280" y="58" width="50" height="22" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="338" y="56" width="22" height="22" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <ellipse cx="330" cy="155" rx="20" ry="14" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA NAIK -->
  <rect x="390" y="44" width="70" height="70" fill="#1e1e2e" stroke="#6b7280" stroke-width="0.8"/>
  <text x="425" y="76" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">TANGGA</text>
  <line x1="395" y1="52" x2="455" y2="52" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="395" y1="59" x2="455" y2="59" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="395" y1="66" x2="455" y2="66" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="395" y1="73" x2="455" y2="73" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="395" y1="80" x2="455" y2="80" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="395" y1="87" x2="455" y2="87" stroke="#6b7280" stroke-width="0.5"/>
  <line x1="395" y1="94" x2="455" y2="94" stroke="#6b7280" stroke-width="0.5"/>
  <!-- ROOFTOP LOUNGE -->
  <rect x="390" y="114" width="70" height="75" fill="#1a1535" stroke="#7c3aed" stroke-width="0.8"/>
  <text x="425" y="148" text-anchor="middle" fill="#a78bfa" font-size="7.5" font-weight="600">ROOFTOP</text>
  <text x="425" y="160" text-anchor="middle" fill="#a78bfa" font-size="7.5" font-weight="600">LOUNGE</text>
  <!-- BALKON KELILING -->
  <rect x="60" y="199" width="400" height="40" fill="#0d1525" stroke="#22d3ee" stroke-width="1"/>
  <text x="260" y="223" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">BALKON KELILING (MANSARD)</text>
  <!-- LEGEND -->
  <rect x="20" y="270" width="7" height="7" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="31" y="277" fill="#a78bfa" font-size="7">Master Suite</text>
  <rect x="130" y="270" width="7" height="7" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
  <text x="141" y="277" fill="#67e8f9" font-size="7">KM Premium</text>
  <rect x="240" y="270" width="7" height="7" fill="#1a1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="251" y="277" fill="#a78bfa" font-size="7">Rooftop Lounge</text>
  <rect x="370" y="270" width="7" height="7" fill="#0d1525" stroke="#22d3ee" stroke-width="1"/>
  <text x="381" y="277" fill="#67e8f9" font-size="7">Balkon Keliling</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#c9a96e" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#c9a96e"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#6b7280" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#c9a96e" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#6b7280" font-size="7">SKALA 1:150  |  LT.3 MANSARD ≈ 120 m²</text>
</svg>`
    }
  ],
 
  // ──────────────────────────────────────────────────────────
  // P2 — NEO-FUTURISTIK 3 LANTAI (260 m²)
  // ──────────────────────────────────────────────────────────
  p2: [
    {
      label: 'Lantai 1',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#050a18"/>
  <text x="260" y="18" text-anchor="middle" fill="#60a5fa" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 1 — NEO-FUTURISTIK 3 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#60a5fa" stroke-width="0.4" opacity="0.4"/>
  <!-- GARASI 2 MOBIL -->
  <rect x="20" y="34" width="220" height="90" fill="#0c0c1a" stroke="#374151" stroke-width="1"/>
  <line x1="130" y1="34" x2="130" y2="124" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
  <rect x="30" y="55" width="85" height="32" rx="3" fill="#111827" stroke="#4b5563" stroke-width="0.5"/>
  <rect x="138" y="55" width="85" height="32" rx="3" fill="#111827" stroke="#4b5563" stroke-width="0.5"/>
  <text x="120" y="110" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">GARASI 2 MOBIL</text>
  <!-- LIVING OPEN PLAN -->
  <rect x="240" y="34" width="170" height="115" fill="#0a1628" stroke="#3b82f6" stroke-width="1"/>
  <text x="325" y="86" text-anchor="middle" fill="#60a5fa" font-size="9" font-weight="600">LIVING OPEN PLAN</text>
  <text x="325" y="98" text-anchor="middle" fill="#4b5563" font-size="7.5">80 m²</text>
  <path d="M252 128 Q308 116 360 128 L360 142 Q308 130 252 142 Z" fill="#0f1e3d" stroke="#3b82f6" stroke-width="0.8"/>
  <ellipse cx="325" cy="112" rx="24" ry="14" fill="#0a1628" stroke="#3b82f6" stroke-width="0.5"/>
  <!-- DAPUR MODERN -->
  <rect x="410" y="34" width="90" height="80" fill="#0a1628" stroke="#d97706" stroke-width="1"/>
  <text x="455" y="68" text-anchor="middle" fill="#fbbf24" font-size="8.5" font-weight="600">DAPUR</text>
  <text x="455" y="80" text-anchor="middle" fill="#4b5563" font-size="7.5">MODERN</text>
  <rect x="416" y="38" width="78" height="10" fill="#151d35" stroke="#d97706" stroke-width="0.5"/>
  <rect x="416" y="38" width="10" height="70" fill="#151d35" stroke="#d97706" stroke-width="0.5"/>
  <!-- WC GROUND -->
  <rect x="410" y="114" width="90" height="60" fill="#0a1a2a" stroke="#0891b2" stroke-width="1"/>
  <text x="455" y="141" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC / KM</text>
  <ellipse cx="455" cy="162" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA SPIRAL -->
  <g transform="translate(120, 185)">
    <circle cx="0" cy="0" r="32" fill="#070d1a" stroke="#3b82f6" stroke-width="1"/>
    <circle cx="0" cy="0" r="9" fill="#0a1628" stroke="#60a5fa" stroke-width="0.8"/>
    <path d="M0,-32 A32,32 0 0,1 32,0" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
    <path d="M32,0 A32,32 0 0,1 0,32" fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.6"/>
    <path d="M0,32 A32,32 0 0,1 -32,0" fill="none" stroke="#3b82f6" stroke-width="1" opacity="0.4"/>
    <text x="0" y="3" text-anchor="middle" fill="#60a5fa" font-size="7.5" font-weight="600">TANGGA</text>
    <text x="0" y="13" text-anchor="middle" fill="#4b5563" font-size="6.5">SPIRAL</text>
  </g>
  <!-- BALKON KURVA -->
  <path d="M20 134 Q130 165 240 134 L240 158 Q130 190 20 158 Z" fill="#091524" stroke="#22d3ee" stroke-width="1"/>
  <text x="130" y="152" text-anchor="middle" fill="#67e8f9" font-size="8" font-weight="600">BALKON KURVA ORGANIK</text>
  <!-- UTILITAS -->
  <rect x="240" y="149" width="170" height="60" fill="#0d0d1a" stroke="#374151" stroke-width="1"/>
  <text x="325" y="178" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">UTILITAS / LAUNDRY</text>
  <!-- LEGEND -->
  <rect x="20" y="290" width="7" height="7" fill="#0a1628" stroke="#3b82f6" stroke-width="1"/>
  <text x="31" y="297" fill="#60a5fa" font-size="7">Living Open Plan</text>
  <rect x="150" y="290" width="7" height="7" fill="#091524" stroke="#22d3ee" stroke-width="1"/>
  <text x="161" y="297" fill="#67e8f9" font-size="7">Balkon Kurva</text>
  <rect x="260" y="290" width="7" height="7" fill="#0a1628" stroke="#d97706" stroke-width="1"/>
  <text x="271" y="297" fill="#fbbf24" font-size="7">Dapur Modern</text>
  <rect x="370" y="290" width="7" height="7" fill="#0c0c1a" stroke="#374151" stroke-width="1"/>
  <text x="381" y="297" fill="#9ca3af" font-size="7">Garasi / Tangga</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#3b82f6" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#60a5fa"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#60a5fa" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:120  |  LT.1 ≈ 87 m²  |  TOTAL 3 LANTAI ≈ 260 m²</text>
</svg>`
    },
    {
      label: 'Lantai 2',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#050a18"/>
  <text x="260" y="18" text-anchor="middle" fill="#60a5fa" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 2 — NEO-FUTURISTIK 3 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#60a5fa" stroke-width="0.4" opacity="0.4"/>
  <!-- HALL / KORIDOR -->
  <rect x="20" y="34" width="480" height="38" fill="#0a1020" stroke="#1d4ed8" stroke-width="0.8"/>
  <text x="260" y="57" text-anchor="middle" fill="#60a5fa" font-size="8.5" font-weight="600">KORIDOR / HALL LANTAI 2</text>
  <!-- KT 1 -->
  <rect x="20" y="72" width="155" height="130" fill="#0f1e3d" stroke="#3b82f6" stroke-width="1"/>
  <text x="97" y="130" text-anchor="middle" fill="#60a5fa" font-size="9" font-weight="600">KAMAR TIDUR 1</text>
  <text x="97" y="142" text-anchor="middle" fill="#4b5563" font-size="7.5">20 m²</text>
  <rect x="30" y="158" width="50" height="34" rx="2" fill="#152242" stroke="#3b82f6" stroke-width="0.5"/>
  <rect x="30" y="158" width="50" height="11" rx="1" fill="#1a2d52"/>
  <!-- KT 2 -->
  <rect x="175" y="72" width="155" height="130" fill="#0f1e3d" stroke="#3b82f6" stroke-width="1"/>
  <text x="252" y="130" text-anchor="middle" fill="#60a5fa" font-size="9" font-weight="600">KAMAR TIDUR 2</text>
  <text x="252" y="142" text-anchor="middle" fill="#4b5563" font-size="7.5">18 m²</text>
  <rect x="185" y="158" width="50" height="34" rx="2" fill="#152242" stroke="#3b82f6" stroke-width="0.5"/>
  <rect x="185" y="158" width="50" height="11" rx="1" fill="#1a2d52"/>
  <!-- KT 3 -->
  <rect x="330" y="72" width="100" height="130" fill="#0f1e3d" stroke="#3b82f6" stroke-width="1"/>
  <text x="380" y="130" text-anchor="middle" fill="#60a5fa" font-size="8.5" font-weight="600">KT 3</text>
  <text x="380" y="142" text-anchor="middle" fill="#4b5563" font-size="7.5">16 m²</text>
  <rect x="340" y="158" width="45" height="32" rx="2" fill="#152242" stroke="#3b82f6" stroke-width="0.5"/>
  <rect x="340" y="158" width="45" height="10" rx="1" fill="#1a2d52"/>
  <!-- KM 1 -->
  <rect x="430" y="72" width="70" height="65" fill="#0a1a2a" stroke="#0891b2" stroke-width="1"/>
  <text x="465" y="103" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 1</text>
  <ellipse cx="465" cy="126" rx="14" ry="8" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- KM 2 -->
  <rect x="430" y="137" width="70" height="65" fill="#0a1a2a" stroke="#0891b2" stroke-width="1"/>
  <text x="465" y="168" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <rect x="438" y="143" width="30" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>
  <!-- TANGGA SPIRAL -->
  <g transform="translate(85, 242)">
    <circle cx="0" cy="0" r="28" fill="#070d1a" stroke="#3b82f6" stroke-width="1"/>
    <circle cx="0" cy="0" r="8" fill="#0a1628" stroke="#60a5fa" stroke-width="0.8"/>
    <path d="M0,-28 A28,28 0 0,1 28,0" fill="none" stroke="#3b82f6" stroke-width="2"/>
    <text x="0" y="3" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="600">TANGGA</text>
  </g>
  <!-- BALKON ORGANIK -->
  <path d="M20 212 Q260 248 500 212 L500 238 Q260 274 20 238 Z" fill="#091524" stroke="#22d3ee" stroke-width="1"/>
  <text x="260" y="232" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">BALKON ORGANIK MELENGKUNG</text>
  <!-- LEGEND -->
  <rect x="20" y="290" width="7" height="7" fill="#0f1e3d" stroke="#3b82f6" stroke-width="1"/>
  <text x="31" y="297" fill="#60a5fa" font-size="7">Kamar Tidur</text>
  <rect x="140" y="290" width="7" height="7" fill="#0a1a2a" stroke="#0891b2" stroke-width="1"/>
  <text x="151" y="297" fill="#67e8f9" font-size="7">Kamar Mandi</text>
  <rect x="270" y="290" width="7" height="7" fill="#091524" stroke="#22d3ee" stroke-width="1"/>
  <text x="281" y="297" fill="#67e8f9" font-size="7">Balkon Organik</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#3b82f6" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#60a5fa"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#60a5fa" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:120  |  LT.2 ≈ 87 m²</text>
</svg>`
    },
    {
      label: 'Lantai 3',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#050a18"/>
  <text x="260" y="18" text-anchor="middle" fill="#60a5fa" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 3 (MASTER SUITE) — NEO-FUTURISTIK</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#60a5fa" stroke-width="0.4" opacity="0.4"/>
  <!-- MASTER SUITE -->
  <rect x="20" y="34" width="260" height="160" fill="#0f1e3d" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="150" y="105" text-anchor="middle" fill="#60a5fa" font-size="9" font-weight="600">MASTER SUITE</text>
  <text x="150" y="117" text-anchor="middle" fill="#4b5563" font-size="7.5">30 m²</text>
  <rect x="32" y="152" width="70" height="35" rx="2" fill="#152242" stroke="#3b82f6" stroke-width="0.5"/>
  <rect x="32" y="152" width="70" height="12" rx="1" fill="#1a2d52"/>
  <rect x="190" y="40" width="80" height="18" rx="1" fill="#0a1628" stroke="#3b82f6" stroke-width="0.5"/>
  <!-- KM MASTER PREMIUM -->
  <rect x="280" y="34" width="140" height="160" fill="#0a1a2a" stroke="#0891b2" stroke-width="1"/>
  <text x="350" y="105" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM MASTER</text>
  <text x="350" y="117" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">PREMIUM</text>
  <rect x="290" y="50" width="55" height="24" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="352" y="48" width="24" height="24" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <ellipse cx="350" cy="170" rx="22" ry="14" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA SPIRAL -->
  <g transform="translate(450, 114)">
    <circle cx="0" cy="0" r="28" fill="#070d1a" stroke="#3b82f6" stroke-width="1"/>
    <circle cx="0" cy="0" r="8" fill="#0a1628" stroke="#60a5fa" stroke-width="0.8"/>
    <path d="M0,-28 A28,28 0 0,1 28,0" fill="none" stroke="#3b82f6" stroke-width="2"/>
    <text x="0" y="3" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="600">TANGGA</text>
  </g>
  <!-- ROOFTOP GARDEN -->
  <rect x="20" y="204" width="480" height="80" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="260" y="238" text-anchor="middle" fill="#16a34a" font-size="9" font-weight="600">ROOFTOP GARDEN</text>
  <text x="260" y="252" text-anchor="middle" fill="#4b5563" font-size="7.5">Taman Atap + Area Santai Terbuka</text>
  <circle cx="80" cy="245" r="18" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="150" cy="240" r="14" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="380" cy="245" r="16" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="450" cy="240" r="12" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <!-- LEGEND -->
  <rect x="20" y="305" width="7" height="7" fill="#0f1e3d" stroke="#3b82f6" stroke-width="1"/>
  <text x="31" y="312" fill="#60a5fa" font-size="7">Master Suite</text>
  <rect x="140" y="305" width="7" height="7" fill="#0a1a2a" stroke="#0891b2" stroke-width="1"/>
  <text x="151" y="312" fill="#67e8f9" font-size="7">KM Premium</text>
  <rect x="270" y="305" width="7" height="7" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="281" y="312" fill="#16a34a" font-size="7">Rooftop Garden</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#3b82f6" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#60a5fa"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#60a5fa" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:120  |  LT.3 ≈ 86 m²</text>
</svg>`
    }
  ],
 
  // ──────────────────────────────────────────────────────────
  // P3 — MODERN TROPIS 2 LANTAI (260 m²)
  // ──────────────────────────────────────────────────────────
  p3: [
    {
      label: 'Lantai 1',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#0e0a05"/>
  <text x="260" y="18" text-anchor="middle" fill="#d97706" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 1 — MODERN TROPIS 2 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#d97706" stroke-width="0.4" opacity="0.4"/>
  <!-- CARPORT -->
  <rect x="20" y="34" width="120" height="80" fill="#0f1008" stroke="#78350f" stroke-width="1"/>
  <rect x="28" y="60" width="60" height="26" rx="3" fill="#1c1c0a" stroke="#78350f" stroke-width="0.5"/>
  <text x="80" y="104" text-anchor="middle" fill="#92400e" font-size="8.5" font-weight="600">CARPORT</text>
  <text x="80" y="116" text-anchor="middle" fill="#4b5563" font-size="7.5">1 Mobil</text>
  <line x1="20" y1="34" x2="140" y2="34" stroke="#d97706" stroke-width="1.5" opacity="0.5"/>
  <!-- TAMAN DEPAN -->
  <rect x="140" y="34" width="90" height="80" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="185" y="70" text-anchor="middle" fill="#16a34a" font-size="8.5" font-weight="600">TAMAN</text>
  <text x="185" y="82" text-anchor="middle" fill="#4b5563" font-size="7.5">DEPAN</text>
  <circle cx="163" cy="55" r="11" fill="#052e0a" stroke="#15803d" stroke-width="0.8"/>
  <circle cx="205" cy="60" r="8" fill="#052e0a" stroke="#15803d" stroke-width="0.8"/>
  <!-- FOYER -->
  <rect x="230" y="34" width="75" height="55" fill="#130f08" stroke="#d97706" stroke-width="1"/>
  <text x="267" y="58" text-anchor="middle" fill="#d97706" font-size="8.5" font-weight="600">FOYER</text>
  <text x="267" y="70" text-anchor="middle" fill="#4b5563" font-size="7">MASUK</text>
  <!-- DAPUR -->
  <rect x="305" y="34" width="130" height="95" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="370" y="78" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="370" y="90" text-anchor="middle" fill="#4b5563" font-size="7.5">22 m²</text>
  <rect x="310" y="38" width="120" height="10" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <rect x="310" y="38" width="10" height="85" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <!-- RUANG MAKAN -->
  <rect x="435" y="34" width="65" height="95" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="467" y="78" text-anchor="middle" fill="#fbbf24" font-size="8" font-weight="600">RUANG</text>
  <text x="467" y="90" text-anchor="middle" fill="#fbbf24" font-size="8" font-weight="600">MAKAN</text>
  <text x="467" y="102" text-anchor="middle" fill="#4b5563" font-size="7.5">18 m²</text>
  <!-- RUANG TAMU -->
  <rect x="20" y="129" width="185" height="110" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="112" y="179" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG TAMU</text>
  <text x="112" y="191" text-anchor="middle" fill="#4b5563" font-size="7.5">35 m²</text>
  <rect x="30" y="198" width="85" height="22" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <rect x="30" y="195" width="18" height="25" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <!-- RUANG KELUARGA -->
  <rect x="205" y="129" width="145" height="90" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="277" y="169" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG KELUARGA</text>
  <text x="277" y="181" text-anchor="middle" fill="#4b5563" font-size="7.5">30 m²</text>
  <rect x="210" y="133" width="80" height="8" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <rect x="215" y="195" width="75" height="18" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <!-- WC TAMU -->
  <rect x="205" y="219" width="70" height="55" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="240" y="243" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC TAMU</text>
  <ellipse cx="240" cy="263" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA -->
  <rect x="275" y="219" width="75" height="55" fill="#0a0a14" stroke="#4b5563" stroke-width="0.8"/>
  <text x="312" y="242" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="280" y1="228" x2="345" y2="228" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="280" y1="235" x2="345" y2="235" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="280" y1="242" x2="345" y2="242" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="280" y1="249" x2="345" y2="249" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="280" y1="256" x2="345" y2="256" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="280" y1="263" x2="345" y2="263" stroke="#4b5563" stroke-width="0.5"/>
  <!-- SERVIS / LAUNDRY -->
  <rect x="20" y="249" width="185" height="45" fill="#0a0a0a" stroke="#374151" stroke-width="1"/>
  <text x="112" y="275" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">SERVIS / LAUNDRY</text>
  <!-- LEGEND -->
  <rect x="20" y="312" width="7" height="7" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="31" y="319" fill="#fbbf24" font-size="7">Ruang Tamu/Keluarga/Makan/Dapur</text>
  <rect x="280" y="312" width="7" height="7" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="291" y="319" fill="#67e8f9" font-size="7">KM/WC</text>
  <rect x="20" y="324" width="7" height="7" fill="#0f1008" stroke="#78350f" stroke-width="1"/>
  <text x="31" y="331" fill="#92400e" font-size="7">Carport</text>
  <rect x="100" y="324" width="7" height="7" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="111" y="331" fill="#16a34a" font-size="7">Taman</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#d97706" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#d97706"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#d97706" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:120  |  LT.1 ≈ 130 m²  |  TOTAL 2 LANTAI ≈ 260 m²</text>
</svg>`
    },
    {
      label: 'Lantai 2',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#0e0a05"/>
  <text x="260" y="18" text-anchor="middle" fill="#d97706" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 2 — MODERN TROPIS 2 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#d97706" stroke-width="0.4" opacity="0.4"/>
  <!-- HALL -->
  <rect x="20" y="34" width="480" height="38" fill="#100a04" stroke="#78350f" stroke-width="0.8"/>
  <text x="260" y="57" text-anchor="middle" fill="#d97706" font-size="8.5" font-weight="600">KORIDOR / HALL LANTAI 2</text>
  <!-- KT UTAMA -->
  <rect x="20" y="72" width="190" height="145" fill="#130f08" stroke="#d97706" stroke-width="1.5"/>
  <text x="115" y="138" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">KT UTAMA</text>
  <text x="115" y="150" text-anchor="middle" fill="#4b5563" font-size="7.5">30 m²</text>
  <rect x="30" y="168" width="65" height="38" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <rect x="30" y="168" width="65" height="12" rx="1" fill="#252010"/>
  <rect x="140" y="78" width="60" height="18" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <!-- KM UTAMA EN SUITE -->
  <rect x="210" y="72" width="100" height="80" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="260" y="105" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM UTAMA</text>
  <text x="260" y="117" text-anchor="middle" fill="#4b5563" font-size="7.5">EN SUITE</text>
  <rect x="218" y="80" width="42" height="20" rx="4" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="266" y="78" width="20" height="20" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <!-- KT 2 -->
  <rect x="310" y="72" width="120" height="100" fill="#130f08" stroke="#d97706" stroke-width="1"/>
  <text x="370" y="119" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">KAMAR TIDUR 2</text>
  <text x="370" y="131" text-anchor="middle" fill="#4b5563" font-size="7.5">20 m²</text>
  <rect x="320" y="138" width="50" height="28" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <rect x="320" y="138" width="50" height="10" rx="1" fill="#252010"/>
  <!-- KT 3 -->
  <rect x="430" y="72" width="70" height="100" fill="#130f08" stroke="#d97706" stroke-width="1"/>
  <text x="465" y="117" text-anchor="middle" fill="#fbbf24" font-size="8.5" font-weight="600">KT 3</text>
  <text x="465" y="129" text-anchor="middle" fill="#4b5563" font-size="7.5">18 m²</text>
  <rect x="438" y="136" width="45" height="28" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
  <rect x="438" y="136" width="45" height="10" rx="1" fill="#252010"/>
  <!-- KM 2 -->
  <rect x="210" y="152" width="100" height="65" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="260" y="183" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="260" cy="205" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- RUANG BELAJAR -->
  <rect x="310" y="172" width="120" height="55" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="370" y="198" text-anchor="middle" fill="#fbbf24" font-size="8.5" font-weight="600">RUANG BELAJAR</text>
  <!-- TANGGA -->
  <rect x="430" y="172" width="70" height="55" fill="#0a0a14" stroke="#4b5563" stroke-width="0.8"/>
  <text x="465" y="197" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="435" y1="180" x2="495" y2="180" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="435" y1="187" x2="495" y2="187" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="435" y1="194" x2="495" y2="194" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="435" y1="201" x2="495" y2="201" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="435" y1="208" x2="495" y2="208" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="435" y1="215" x2="495" y2="215" stroke="#4b5563" stroke-width="0.5"/>
  <!-- BALKON KACA + OVERHANG KAYU -->
  <rect x="20" y="227" width="480" height="40" fill="#04100a" stroke="#22d3ee" stroke-width="1"/>
  <text x="260" y="251" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">BALKON KACA RAILING + OVERHANG KAYU ULIN</text>
  <!-- LEGEND -->
  <rect x="20" y="290" width="7" height="7" fill="#130f08" stroke="#d97706" stroke-width="1"/>
  <text x="31" y="297" fill="#fbbf24" font-size="7">Kamar Tidur / Ruang Belajar</text>
  <rect x="220" y="290" width="7" height="7" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="231" y="297" fill="#67e8f9" font-size="7">Kamar Mandi</text>
  <rect x="340" y="290" width="7" height="7" fill="#04100a" stroke="#22d3ee" stroke-width="1"/>
  <text x="351" y="297" fill="#67e8f9" font-size="7">Balkon Kaca</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#d97706" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#d97706"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#d97706" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:120  |  LT.2 ≈ 130 m²</text>
</svg>`
    }
  ],
 
  // ──────────────────────────────────────────────────────────
  // P4 — GARASI DOUBLE 3 LANTAI (350 m²)
  // ──────────────────────────────────────────────────────────
  p4: [
    {
      label: 'Lantai 1',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#050e05"/>
  <text x="260" y="18" text-anchor="middle" fill="#22c55e" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 1 — GARASI DOUBLE 3 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#22c55e" stroke-width="0.4" opacity="0.4"/>
  <!-- GARASI DOUBLE -->
  <rect x="20" y="34" width="240" height="105" fill="#080e08" stroke="#374151" stroke-width="1.2"/>
  <line x1="140" y1="34" x2="140" y2="139" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
  <rect x="30" y="62" width="95" height="36" rx="3" fill="#0f1a0f" stroke="#4b5563" stroke-width="0.5"/>
  <rect x="148" y="62" width="95" height="36" rx="3" fill="#0f1a0f" stroke="#4b5563" stroke-width="0.5"/>
  <text x="140" y="115" text-anchor="middle" fill="#6b7280" font-size="9" font-weight="600">GARASI 2 MOBIL</text>
  <text x="140" y="127" text-anchor="middle" fill="#4b5563" font-size="7.5">50 m²</text>
  <line x1="20" y1="34" x2="260" y2="34" stroke="#22c55e" stroke-width="2" opacity="0.5"/>
  <!-- FOYER -->
  <rect x="260" y="34" width="95" height="75" fill="#081008" stroke="#22c55e" stroke-width="1"/>
  <text x="307" y="68" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">FOYER</text>
  <text x="307" y="80" text-anchor="middle" fill="#4b5563" font-size="7.5">LOBBY</text>
  <!-- DAPUR -->
  <rect x="355" y="34" width="145" height="95" fill="#081008" stroke="#d97706" stroke-width="1"/>
  <text x="427" y="78" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="427" y="90" text-anchor="middle" fill="#4b5563" font-size="7.5">24 m²</text>
  <rect x="360" y="38" width="135" height="10" rx="0" fill="#0d1a0d" stroke="#d97706" stroke-width="0.5"/>
  <rect x="360" y="38" width="10" height="85" rx="0" fill="#0d1a0d" stroke="#d97706" stroke-width="0.5"/>
  <!-- RUANG TAMU -->
  <rect x="20" y="139" width="185" height="115" fill="#081008" stroke="#22c55e" stroke-width="1"/>
  <text x="112" y="193" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">RUANG TAMU</text>
  <text x="112" y="205" text-anchor="middle" fill="#4b5563" font-size="7.5">40 m²</text>
  <rect x="30" y="218" width="95" height="22" rx="1" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
  <rect x="30" y="216" width="22" height="24" rx="1" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
  <!-- RUANG MAKAN -->
  <rect x="205" y="109" width="150" height="85" fill="#081008" stroke="#d97706" stroke-width="1"/>
  <text x="280" y="148" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="280" y="160" text-anchor="middle" fill="#4b5563" font-size="7.5">22 m²</text>
  <rect x="220" y="118" width="90" height="42" rx="0" fill="#0d1a0d" stroke="#d97706" stroke-width="0.5"/>
  <!-- WC TAMU -->
  <rect x="355" y="129" width="85" height="75" fill="#040c12" stroke="#0891b2" stroke-width="1"/>
  <text x="397" y="163" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC TAMU</text>
  <ellipse cx="397" cy="192" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA -->
  <rect x="440" y="129" width="60" height="75" fill="#060e06" stroke="#4b5563" stroke-width="0.8"/>
  <text x="470" y="162" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="445" y1="138" x2="495" y2="138" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="445" y1="146" x2="495" y2="146" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="445" y1="154" x2="495" y2="154" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="445" y1="162" x2="495" y2="162" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="445" y1="170" x2="495" y2="170" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="445" y1="178" x2="495" y2="178" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="445" y1="186" x2="495" y2="186" stroke="#4b5563" stroke-width="0.5"/>
  <!-- UTILITAS -->
  <rect x="205" y="194" width="150" height="60" fill="#060e06" stroke="#374151" stroke-width="1"/>
  <text x="280" y="221" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">UTILITAS / SERVIS</text>
  <!-- TAMAN SAMPING -->
  <rect x="20" y="254" width="185" height="45" fill="#050e05" stroke="#15803d" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="112" y="280" text-anchor="middle" fill="#16a34a" font-size="8">TAMAN SAMPING</text>
  <!-- LEGEND -->
  <rect x="20" y="318" width="7" height="7" fill="#081008" stroke="#22c55e" stroke-width="1"/>
  <text x="31" y="325" fill="#4ade80" font-size="7">Ruang Tamu</text>
  <rect x="140" y="318" width="7" height="7" fill="#081008" stroke="#d97706" stroke-width="1"/>
  <text x="151" y="325" fill="#fbbf24" font-size="7">Dapur/Makan</text>
  <rect x="260" y="318" width="7" height="7" fill="#040c12" stroke="#0891b2" stroke-width="1"/>
  <text x="271" y="325" fill="#67e8f9" font-size="7">WC</text>
  <rect x="320" y="318" width="7" height="7" fill="#080e08" stroke="#374151" stroke-width="1"/>
  <text x="331" y="325" fill="#9ca3af" font-size="7">Garasi/Utilitas</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#22c55e" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#22c55e"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#22c55e" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:130  |  LT.1 ≈ 117 m²  |  TOTAL 3 LANTAI ≈ 350 m²</text>
</svg>`
    },
    {
      label: 'Lantai 2',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#050e05"/>
  <text x="260" y="18" text-anchor="middle" fill="#22c55e" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 2 — GARASI DOUBLE 3 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#22c55e" stroke-width="0.4" opacity="0.4"/>
  <!-- HALL -->
  <rect x="20" y="34" width="480" height="38" fill="#060e06" stroke="#22c55e" stroke-width="0.8"/>
  <text x="260" y="57" text-anchor="middle" fill="#4ade80" font-size="8.5" font-weight="600">KORIDOR / HALL LANTAI 2</text>
  <!-- MASTER BEDROOM -->
  <rect x="20" y="72" width="185" height="150" fill="#081008" stroke="#22c55e" stroke-width="1.5"/>
  <text x="112" y="142" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">MASTER BEDROOM</text>
  <text x="112" y="154" text-anchor="middle" fill="#4b5563" font-size="7.5">35 m²</text>
  <rect x="30" y="172" width="65" height="40" rx="2" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
  <rect x="30" y="172" width="65" height="13" rx="1" fill="#122012"/>
  <rect x="130" y="78" width="65" height="18" rx="1" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
  <!-- KM UTAMA EN SUITE -->
  <rect x="205" y="72" width="110" height="85" fill="#040c12" stroke="#0891b2" stroke-width="1"/>
  <text x="260" y="107" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM UTAMA</text>
  <text x="260" y="119" text-anchor="middle" fill="#4b5563" font-size="7.5">EN SUITE</text>
  <rect x="213" y="80" width="45" height="20" rx="4" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="264" y="78" width="22" height="20" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <!-- KT 2 -->
  <rect x="315" y="72" width="125" height="110" fill="#081008" stroke="#22c55e" stroke-width="1"/>
  <text x="377" y="122" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">KAMAR TIDUR 2</text>
  <text x="377" y="134" text-anchor="middle" fill="#4b5563" font-size="7.5">20 m²</text>
  <rect x="325" y="146" width="55" height="30" rx="2" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
  <rect x="325" y="146" width="55" height="10" rx="1" fill="#122012"/>
  <!-- KT 3 -->
  <rect x="440" y="72" width="60" height="110" fill="#081008" stroke="#22c55e" stroke-width="1"/>
  <text x="470" y="116" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="600">KT 3</text>
  <text x="470" y="128" text-anchor="middle" fill="#4b5563" font-size="7">18 m²</text>
  <!-- KM 2 -->
  <rect x="205" y="157" width="110" height="65" fill="#040c12" stroke="#0891b2" stroke-width="1"/>
  <text x="260" y="187" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="260" cy="210" rx="17" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA -->
  <rect x="315" y="182" width="80" height="55" fill="#060e06" stroke="#4b5563" stroke-width="0.8"/>
  <text x="355" y="207" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="320" y1="190" x2="390" y2="190" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="320" y1="198" x2="390" y2="198" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="320" y1="206" x2="390" y2="206" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="320" y1="214" x2="390" y2="214" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="320" y1="222" x2="390" y2="222" stroke="#4b5563" stroke-width="0.5"/>
  <!-- VOID / HALL -->
  <rect x="395" y="182" width="105" height="55" fill="#040e04" stroke="#22c55e" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="447" y="207" text-anchor="middle" fill="#4ade80" font-size="7.5">VOID / HALL</text>
  <!-- BALKON KACA CANTILEVER -->
  <rect x="20" y="237" width="480" height="40" fill="#04100a" stroke="#22c55e" stroke-width="1"/>
  <text x="260" y="261" text-anchor="middle" fill="#4ade80" font-size="8.5" font-weight="600">BALKON KACA CANTILEVER ANGULAR</text>
  <!-- LEGEND -->
  <rect x="20" y="300" width="7" height="7" fill="#081008" stroke="#22c55e" stroke-width="1"/>
  <text x="31" y="307" fill="#4ade80" font-size="7">Kamar Tidur</text>
  <rect x="140" y="300" width="7" height="7" fill="#040c12" stroke="#0891b2" stroke-width="1"/>
  <text x="151" y="307" fill="#67e8f9" font-size="7">KM</text>
  <rect x="200" y="300" width="7" height="7" fill="#04100a" stroke="#22c55e" stroke-width="1"/>
  <text x="211" y="307" fill="#4ade80" font-size="7">Balkon Cantilever</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#22c55e" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#22c55e"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#22c55e" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:130  |  LT.2 ≈ 117 m²</text>
</svg>`
    },
    {
      label: 'Lantai 3',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#050e05"/>
  <text x="260" y="18" text-anchor="middle" fill="#22c55e" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 3 (ROOFTOP) — GARASI DOUBLE</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#22c55e" stroke-width="0.4" opacity="0.4"/>
  <!-- ROOFTOP LOUNGE -->
  <rect x="20" y="34" width="320" height="150" fill="#04100a" stroke="#22c55e" stroke-width="1.5"/>
  <text x="180" y="105" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">ROOFTOP LOUNGE</text>
  <text x="180" y="117" text-anchor="middle" fill="#4b5563" font-size="7.5">Open Air — 80 m²</text>
  <circle cx="80" cy="85" r="18" fill="#071208" stroke="#15803d" stroke-width="0.8"/>
  <circle cx="145" cy="80" r="14" fill="#071208" stroke="#15803d" stroke-width="0.8"/>
  <circle cx="280" cy="90" r="16" fill="#071208" stroke="#15803d" stroke-width="0.8"/>
  <rect x="160" y="128" width="70" height="30" rx="3" fill="#060e06" stroke="#22c55e" stroke-width="0.5"/>
  <text x="195" y="147" text-anchor="middle" fill="#4ade80" font-size="7.5">SOFA AREA</text>
  <!-- RUANG BELAJAR -->
  <rect x="340" y="34" width="160" height="80" fill="#081008" stroke="#22c55e" stroke-width="1"/>
  <text x="420" y="68" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">RUANG BELAJAR</text>
  <text x="420" y="80" text-anchor="middle" fill="#4b5563" font-size="7.5">20 m²</text>
  <!-- KM ROOFTOP -->
  <rect x="340" y="114" width="80" height="70" fill="#040c12" stroke="#0891b2" stroke-width="1"/>
  <text x="380" y="147" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM</text>
  <rect x="348" y="120" width="32" height="16" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>
  <ellipse cx="380" cy="172" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- VOID DOUBLE HEIGHT -->
  <rect x="420" y="114" width="80" height="70" fill="#030903" stroke="#22c55e" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="460" y="147" text-anchor="middle" fill="#4ade80" font-size="7.5">VOID</text>
  <text x="460" y="159" text-anchor="middle" fill="#4b5563" font-size="7">DOUBLE HT</text>
  <!-- TANGGA -->
  <rect x="340" y="184" width="80" height="60" fill="#060e06" stroke="#4b5563" stroke-width="0.8"/>
  <text x="380" y="211" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="345" y1="192" x2="415" y2="192" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="200" x2="415" y2="200" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="208" x2="415" y2="208" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="216" x2="415" y2="216" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="224" x2="415" y2="224" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="345" y1="232" x2="415" y2="232" stroke="#4b5563" stroke-width="0.5"/>
  <!-- PARAPET + RAILING -->
  <rect x="20" y="199" width="320" height="35" fill="#040e04" stroke="#22c55e" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="180" y="220" text-anchor="middle" fill="#4ade80" font-size="8">PARAPET + RAILING KACA</text>
  <!-- LEGEND -->
  <rect x="20" y="260" width="7" height="7" fill="#04100a" stroke="#22c55e" stroke-width="1"/>
  <text x="31" y="267" fill="#4ade80" font-size="7">Rooftop Lounge</text>
  <rect x="160" y="260" width="7" height="7" fill="#081008" stroke="#22c55e" stroke-width="1"/>
  <text x="171" y="267" fill="#4ade80" font-size="7">Ruang Belajar</text>
  <rect x="290" y="260" width="7" height="7" fill="#040c12" stroke="#0891b2" stroke-width="1"/>
  <text x="301" y="267" fill="#67e8f9" font-size="7">KM</text>
  <rect x="350" y="260" width="7" height="7" fill="#030903" stroke="#22c55e" stroke-width="1"/>
  <text x="361" y="267" fill="#4ade80" font-size="7">Void Double Height</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#22c55e" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#22c55e"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#22c55e" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:130  |  LT.3 ROOFTOP ≈ 116 m²</text>
</svg>`
    }
  ],
 
  // ──────────────────────────────────────────────────────────
  // P5 — WEIRD COFFEE (50 m²) — 1 LANTAI
  // (Tetap 1 lantai, SVG asli dipertahankan)
  // ──────────────────────────────────────────────────────────
  p5: [
    {
      label: 'Denah Lantai',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#0a0a0a"/>
  <text x="260" y="18" text-anchor="middle" fill="#9ca3af" font-size="10" font-weight="600" letter-spacing="2">DENAH — WEIRD COFFEE</text>
  <line x1="60" y1="24" x2="460" y2="24" stroke="#f59e0b" stroke-width="0.4" opacity="0.4"/>
  <!-- Building outline -->
  <rect x="60" y="34" width="390" height="220" fill="none" stroke="#374151" stroke-width="2"/>
  <!-- OUTDOOR -->
  <rect x="60" y="34" width="145" height="220" fill="#0f0f0f" stroke="#374151" stroke-width="1"/>
  <text x="132" y="138" text-anchor="middle" fill="#6b7280" font-size="9" font-weight="600">AREA OUTDOOR</text>
  <text x="132" y="150" text-anchor="middle" fill="#4b5563" font-size="8">SEMI-TERBUKA 15 m²</text>
  <text x="132" y="162" text-anchor="middle" fill="#4b5563" font-size="7.5">9 Kursi</text>
  <!-- Meja outdoor -->
  <circle cx="100" cy="90" r="17" fill="none" stroke="#6b7280" stroke-width="0.8"/>
  <circle cx="100" cy="72" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="100" cy="108" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="83" cy="90" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="117" cy="90" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="168" cy="90" r="17" fill="none" stroke="#6b7280" stroke-width="0.8"/>
  <circle cx="168" cy="72" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="168" cy="108" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="151" cy="90" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="185" cy="90" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <!-- Planter box -->
  <rect x="64" y="212" width="134" height="16" rx="2" fill="#1a2010" stroke="#15803d" stroke-width="0.8"/>
  <text x="131" y="224" text-anchor="middle" fill="#16a34a" font-size="6.5">PLANTER BOX</text>
  <!-- INDOOR -->
  <rect x="205" y="34" width="245" height="220" fill="#111111" stroke="#374151" stroke-width="1"/>
  <!-- BAR COUNTER -->
  <rect x="210" y="38" width="235" height="42" fill="#1a1a1a" stroke="#f59e0b" stroke-width="1.2"/>
  <text x="327" y="55" text-anchor="middle" fill="#f59e0b" font-size="9" font-weight="600">BAR COUNTER</text>
  <text x="327" y="67" text-anchor="middle" fill="#6b7280" font-size="7.5">KASIR + DISPLAY KOPI</text>
  <rect x="220" y="42" width="20" height="16" rx="2" fill="#252525" stroke="#f59e0b" stroke-width="0.5"/>
  <rect x="245" y="42" width="14" height="16" rx="1" fill="#252525" stroke="#f59e0b" stroke-width="0.5"/>
  <!-- Indoor seating -->
  <text x="327" y="112" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">AREA INDOOR — 35 m²</text>
  <text x="327" y="124" text-anchor="middle" fill="#4b5563" font-size="7.5">15 Kursi</text>
  <!-- Meja indoor -->
  <rect x="218" y="95" width="52" height="32" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="211" y="99" width="8" height="24" rx="1" fill="#141414"/>
  <rect x="269" y="99" width="8" height="24" rx="1" fill="#141414"/>
  <rect x="218" y="88" width="52" height="8" rx="1" fill="#141414"/>
  <rect x="218" y="127" width="52" height="8" rx="1" fill="#141414"/>
  <rect x="298" y="95" width="52" height="32" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="291" y="99" width="8" height="24" rx="1" fill="#141414"/>
  <rect x="349" y="99" width="8" height="24" rx="1" fill="#141414"/>
  <rect x="298" y="88" width="52" height="8" rx="1" fill="#141414"/>
  <rect x="298" y="127" width="52" height="8" rx="1" fill="#141414"/>
  <!-- Sofa bench -->
  <rect x="218" y="150" width="185" height="18" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="228" y="135" width="18" height="16" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="253" y="135" width="18" height="16" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="278" y="135" width="18" height="16" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="303" y="135" width="18" height="16" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="328" y="135" width="18" height="16" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <!-- WC + STORAGE -->
  <rect x="210" y="185" width="72" height="55" fill="#0d0d0d" stroke="#374151" stroke-width="0.8"/>
  <text x="246" y="208" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">WC</text>
  <ellipse cx="246" cy="228" rx="14" ry="8" fill="none" stroke="#374151" stroke-width="0.7"/>
  <rect x="282" y="185" width="138" height="55" fill="#0d0d0d" stroke="#374151" stroke-width="0.8"/>
  <text x="351" y="210" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">STORAGE STOK</text>
  <!-- LED fasad -->
  <line x1="60" y1="34" x2="60" y2="254" stroke="#f59e0b" stroke-width="1.5" opacity="0.3" stroke-dasharray="3,6"/>
  <line x1="450" y1="34" x2="450" y2="254" stroke="#f59e0b" stroke-width="1.5" opacity="0.3" stroke-dasharray="3,6"/>
  <!-- PINTU MASUK -->
  <line x1="205" y1="265" x2="265" y2="265" stroke="#f59e0b" stroke-width="2" opacity="0.8"/>
  <text x="235" y="278" text-anchor="middle" fill="#f59e0b" font-size="7.5">PINTU MASUK</text>
  <!-- SIGNAGE -->
  <rect x="210" y="290" width="200" height="26" rx="4" fill="#1a1a1a" stroke="#f59e0b" stroke-width="1"/>
  <text x="310" y="307" text-anchor="middle" fill="#f59e0b" font-size="10" font-weight="700" letter-spacing="2">Weird Coffee</text>
  <!-- LEGEND -->
  <rect x="20" y="330" width="7" height="7" fill="#0f0f0f" stroke="#374151" stroke-width="1"/>
  <text x="31" y="337" fill="#6b7280" font-size="7">Area Outdoor</text>
  <rect x="130" y="330" width="7" height="7" fill="#111111" stroke="#6b7280" stroke-width="1"/>
  <text x="141" y="337" fill="#9ca3af" font-size="7">Area Indoor</text>
  <rect x="240" y="330" width="7" height="7" fill="#1a1a1a" stroke="#f59e0b" stroke-width="1"/>
  <text x="251" y="337" fill="#f59e0b" font-size="7">Bar Counter</text>
  <rect x="360" y="330" width="7" height="7" fill="#1a2010" stroke="#15803d" stroke-width="1"/>
  <text x="371" y="337" fill="#16a34a" font-size="7">Planter Box</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#6b7280" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#9ca3af"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#9ca3af" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:60  |  TOTAL ≈ 50 m²  |  INDOOR: 35 m²  |  OUTDOOR: 15 m²</text>
</svg>`
    }
  ],
 
  // ──────────────────────────────────────────────────────────
  // P6 — SILINDER ORGANIK 3 LANTAI (420 m²)
  // ──────────────────────────────────────────────────────────
  p6: [
    {
      label: 'Lantai 1',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#080510"/>
  <text x="260" y="18" text-anchor="middle" fill="#a78bfa" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 1 — SILINDER ORGANIK 3 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#a78bfa" stroke-width="0.4" opacity="0.4"/>
  <!-- Bounding box bangunan -->
  <rect x="20" y="34" width="480" height="255" fill="#0a0816" stroke="#6d28d9" stroke-width="1" stroke-dasharray="5,3"/>
  <!-- Kolom silinder di sudut -->
  <circle cx="55" cy="65" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="55" y="69" text-anchor="middle" fill="#8b5cf6" font-size="6.5" font-weight="600">SIL.</text>
  <circle cx="465" cy="65" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="465" y="69" text-anchor="middle" fill="#8b5cf6" font-size="6.5" font-weight="600">SIL.</text>
  <circle cx="55" cy="260" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="55" y="264" text-anchor="middle" fill="#8b5cf6" font-size="6.5" font-weight="600">SIL.</text>
  <circle cx="465" cy="260" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="465" y="264" text-anchor="middle" fill="#8b5cf6" font-size="6.5" font-weight="600">SIL.</text>
  <!-- GARASI 3 MOBIL -->
  <rect x="28" y="44" width="295" height="80" fill="#0c0a1a" stroke="#374151" stroke-width="1"/>
  <line x1="126" y1="44" x2="126" y2="124" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
  <line x1="224" y1="44" x2="224" y2="124" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
  <rect x="38" y="62" width="76" height="30" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
  <rect x="136" y="62" width="76" height="30" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
  <rect x="234" y="62" width="76" height="30" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
  <text x="175" y="115" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">GARASI 3 MOBIL — 65 m²</text>
  <line x1="28" y1="44" x2="323" y2="44" stroke="#a78bfa" stroke-width="2" opacity="0.5"/>
  <!-- FOYER BUNDAR -->
  <ellipse cx="405" cy="84" rx="62" ry="40" fill="#0d0b1e" stroke="#a78bfa" stroke-width="1.2"/>
  <text x="405" y="81" text-anchor="middle" fill="#c4b5fd" font-size="8.5" font-weight="600">FOYER</text>
  <text x="405" y="93" text-anchor="middle" fill="#4b5563" font-size="7.5">BUNDAR</text>
  <!-- RUANG TAMU -->
  <rect x="28" y="124" width="220" height="110" fill="#0d0b1e" stroke="#7c3aed" stroke-width="1"/>
  <text x="138" y="174" text-anchor="middle" fill="#c4b5fd" font-size="9" font-weight="600">RUANG TAMU</text>
  <text x="138" y="186" text-anchor="middle" fill="#4b5563" font-size="7.5">55 m²</text>
  <path d="M42 218 Q102 198 152 218 L152 232 Q102 212 42 232 Z" fill="#15122a" stroke="#7c3aed" stroke-width="0.8"/>
  <ellipse cx="145" cy="200" rx="22" ry="15" fill="#0d0b1e" stroke="#7c3aed" stroke-width="0.5"/>
  <!-- RUANG MAKAN -->
  <rect x="248" y="124" width="140" height="80" fill="#0d0b1e" stroke="#d97706" stroke-width="1"/>
  <text x="318" y="160" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="318" y="172" text-anchor="middle" fill="#4b5563" font-size="7.5">30 m²</text>
  <ellipse cx="318" cy="147" rx="35" ry="24" fill="#15122a" stroke="#d97706" stroke-width="0.5"/>
  <circle cx="318" cy="124" r="6" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>
  <circle cx="318" cy="170" r="6" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>
  <circle cx="285" cy="147" r="6" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>
  <circle cx="351" cy="147" r="6" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>
  <!-- DAPUR -->
  <rect x="388" y="124" width="110" height="80" fill="#0d0b1e" stroke="#d97706" stroke-width="1"/>
  <text x="443" y="160" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="443" y="172" text-anchor="middle" fill="#4b5563" font-size="7.5">25 m²</text>
  <rect x="393" y="128" width="100" height="10" fill="#15122a" stroke="#d97706" stroke-width="0.5"/>
  <rect x="393" y="128" width="10" height="70" fill="#15122a" stroke="#d97706" stroke-width="0.5"/>
  <!-- KM 1 -->
  <rect x="248" y="204" width="90" height="65" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
  <text x="293" y="233" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 1</text>
  <rect x="256" y="210" width="32" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <ellipse cx="293" cy="256" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA BUNDAR -->
  <g transform="translate(365, 242)">
    <circle cx="0" cy="0" r="30" fill="#080514" stroke="#8b5cf6" stroke-width="1.2"/>
    <circle cx="0" cy="0" r="10" fill="#0d0b1e" stroke="#a78bfa" stroke-width="0.8"/>
    <path d="M0,-30 A30,30 0 0,1 30,0" fill="none" stroke="#8b5cf6" stroke-width="2.5"/>
    <path d="M30,0 A30,30 0 0,1 0,30" fill="none" stroke="#8b5cf6" stroke-width="1.5" opacity="0.6"/>
    <path d="M0,30 A30,30 0 0,1 -30,0" fill="none" stroke="#8b5cf6" stroke-width="1" opacity="0.35"/>
    <text x="0" y="3" text-anchor="middle" fill="#a78bfa" font-size="7" font-weight="600">TANGGA</text>
    <text x="0" y="13" text-anchor="middle" fill="#6b7280" font-size="6">BUNDAR</text>
  </g>
  <!-- UTILITAS -->
  <rect x="28" y="244" width="220" height="42" fill="#080514" stroke="#374151" stroke-width="0.8"/>
  <text x="138" y="268" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">UTILITAS / LAUNDRY</text>
  <!-- LEGEND -->
  <rect x="20" y="310" width="7" height="7" fill="#0d0b1e" stroke="#7c3aed" stroke-width="1"/>
  <text x="31" y="317" fill="#c4b5fd" font-size="7">Ruang Tamu</text>
  <rect x="130" y="310" width="7" height="7" fill="#0d0b1e" stroke="#d97706" stroke-width="1"/>
  <text x="141" y="317" fill="#fbbf24" font-size="7">Dapur/Makan</text>
  <rect x="250" y="310" width="7" height="7" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
  <text x="261" y="317" fill="#67e8f9" font-size="7">KM</text>
  <rect x="310" y="310" width="7" height="7" fill="#0c0a1a" stroke="#374151" stroke-width="1"/>
  <text x="321" y="317" fill="#9ca3af" font-size="7">Garasi 3 Mobil</text>
  <rect x="430" y="310" width="7" height="7" fill="#110e20" stroke="#8b5cf6" stroke-width="1"/>
  <text x="441" y="317" fill="#a78bfa" font-size="7">Kolom Silinder</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#8b5cf6" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#a78bfa"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#a78bfa" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:150  |  LT.1 ≈ 140 m²  |  TOTAL 3 LANTAI ≈ 420 m²</text>
</svg>`
    },
    {
      label: 'Lantai 2',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#080510"/>
  <text x="260" y="18" text-anchor="middle" fill="#a78bfa" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 2 — SILINDER ORGANIK 3 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#a78bfa" stroke-width="0.4" opacity="0.4"/>
  <!-- Kolom silinder -->
  <circle cx="50" cy="55" r="16" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="50" y="59" text-anchor="middle" fill="#8b5cf6" font-size="6">SIL.</text>
  <circle cx="470" cy="55" r="16" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="470" y="59" text-anchor="middle" fill="#8b5cf6" font-size="6">SIL.</text>
  <circle cx="50" cy="235" r="16" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="50" y="239" text-anchor="middle" fill="#8b5cf6" font-size="6">SIL.</text>
  <circle cx="470" cy="235" r="16" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="470" y="239" text-anchor="middle" fill="#8b5cf6" font-size="6">SIL.</text>
  <!-- HALL / KORIDOR -->
  <rect x="20" y="34" width="480" height="38" fill="#0d0b1e" stroke="#6d28d9" stroke-width="0.8"/>
  <text x="260" y="57" text-anchor="middle" fill="#a78bfa" font-size="8.5" font-weight="600">KORIDOR / HALL LANTAI 2</text>
  <!-- KT 1 -->
  <rect x="20" y="72" width="175" height="130" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="107" y="130" text-anchor="middle" fill="#c4b5fd" font-size="9" font-weight="600">KAMAR TIDUR 1</text>
  <text x="107" y="142" text-anchor="middle" fill="#4b5563" font-size="7.5">22 m²</text>
  <rect x="30" y="160" width="55" height="34" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
  <rect x="30" y="160" width="55" height="11" rx="1" fill="#3a2560"/>
  <!-- KT 2 -->
  <rect x="195" y="72" width="165" height="130" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="277" y="130" text-anchor="middle" fill="#c4b5fd" font-size="9" font-weight="600">KAMAR TIDUR 2</text>
  <text x="277" y="142" text-anchor="middle" fill="#4b5563" font-size="7.5">20 m²</text>
  <rect x="205" y="160" width="55" height="34" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
  <rect x="205" y="160" width="55" height="11" rx="1" fill="#3a2560"/>
  <!-- KT 3 -->
  <rect x="360" y="72" width="140" height="130" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="430" y="130" text-anchor="middle" fill="#c4b5fd" font-size="9" font-weight="600">KAMAR TIDUR 3</text>
  <text x="430" y="142" text-anchor="middle" fill="#4b5563" font-size="7.5">18 m²</text>
  <rect x="370" y="160" width="50" height="34" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
  <rect x="370" y="160" width="50" height="11" rx="1" fill="#3a2560"/>
  <!-- KM 1 -->
  <rect x="20" y="202" width="95" height="70" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
  <text x="67" y="233" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 1</text>
  <rect x="28" y="208" width="32" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>
  <ellipse cx="67" cy="255" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- KM 2 -->
  <rect x="115" y="202" width="95" height="70" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
  <text x="162" y="233" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <rect x="123" y="208" width="32" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>
  <ellipse cx="162" cy="255" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA BUNDAR -->
  <g transform="translate(285, 242)">
    <circle cx="0" cy="0" r="28" fill="#080514" stroke="#8b5cf6" stroke-width="1.2"/>
    <circle cx="0" cy="0" r="9" fill="#0d0b1e" stroke="#a78bfa" stroke-width="0.8"/>
    <path d="M0,-28 A28,28 0 0,1 28,0" fill="none" stroke="#8b5cf6" stroke-width="2"/>
    <path d="M28,0 A28,28 0 0,1 0,28" fill="none" stroke="#8b5cf6" stroke-width="1.5" opacity="0.6"/>
    <text x="0" y="3" text-anchor="middle" fill="#a78bfa" font-size="7" font-weight="600">TANGGA</text>
  </g>
  <!-- BALKON MELINGKAR -->
  <ellipse cx="260" cy="295" rx="235" ry="22" fill="none" stroke="#8b5cf6" stroke-width="1.2" stroke-dasharray="5,4"/>
  <text x="260" y="299" text-anchor="middle" fill="#8b5cf6" font-size="8">← BALKON MELINGKAR →</text>
  <!-- LEGEND -->
  <rect x="20" y="332" width="7" height="7" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="31" y="339" fill="#c4b5fd" font-size="7">Kamar Tidur</text>
  <rect x="140" y="332" width="7" height="7" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
  <text x="151" y="339" fill="#67e8f9" font-size="7">KM</text>
  <rect x="200" y="332" width="7" height="7" fill="none" stroke="#8b5cf6" stroke-width="1"/>
  <text x="211" y="339" fill="#a78bfa" font-size="7">Balkon Melingkar</text>
  <rect x="360" y="332" width="7" height="7" fill="#110e20" stroke="#8b5cf6" stroke-width="1"/>
  <text x="371" y="339" fill="#a78bfa" font-size="7">Kolom Silinder</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#8b5cf6" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#a78bfa"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#a78bfa" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:150  |  LT.2 ≈ 140 m²</text>
</svg>`
    },
    {
      label: 'Lantai 3',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#080510"/>
  <text x="260" y="18" text-anchor="middle" fill="#a78bfa" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 3 (MASTER SUITE) — SILINDER ORGANIK</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#a78bfa" stroke-width="0.4" opacity="0.4"/>
  <!-- Kolom silinder -->
  <circle cx="50" cy="55" r="16" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="50" y="59" text-anchor="middle" fill="#8b5cf6" font-size="6">SIL.</text>
  <circle cx="470" cy="55" r="16" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="470" y="59" text-anchor="middle" fill="#8b5cf6" font-size="6">SIL.</text>
  <!-- MASTER SUITE LUAS -->
  <rect x="20" y="34" width="280" height="175" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="160" y="115" text-anchor="middle" fill="#c4b5fd" font-size="9" font-weight="600">MASTER SUITE</text>
  <text x="160" y="127" text-anchor="middle" fill="#4b5563" font-size="7.5">40 m²</text>
  <rect x="30" y="157" width="75" height="44" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
  <rect x="30" y="157" width="75" height="14" rx="1" fill="#3a2560"/>
  <rect x="185" y="40" width="100" height="20" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>
  <!-- KM MASTER PREMIUM -->
  <rect x="300" y="34" width="200" height="175" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
  <text x="400" y="111" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM MASTER</text>
  <text x="400" y="123" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">PREMIUM</text>
  <rect x="310" y="50" width="55" height="24" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="373" y="48" width="24" height="24" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <ellipse cx="400" cy="175" rx="24" ry="16" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <rect x="440" y="50" width="50" height="50" rx="3" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <text x="465" y="78" text-anchor="middle" fill="#67e8f9" font-size="6.5">SHOWER</text>
  <!-- TANGGA BUNDAR -->
  <g transform="translate(160, 257)">
    <circle cx="0" cy="0" r="30" fill="#080514" stroke="#8b5cf6" stroke-width="1.2"/>
    <circle cx="0" cy="0" r="10" fill="#0d0b1e" stroke="#a78bfa" stroke-width="0.8"/>
    <path d="M0,-30 A30,30 0 0,1 30,0" fill="none" stroke="#8b5cf6" stroke-width="2.5"/>
    <path d="M30,0 A30,30 0 0,1 0,30" fill="none" stroke="#8b5cf6" stroke-width="1.5" opacity="0.6"/>
    <text x="0" y="3" text-anchor="middle" fill="#a78bfa" font-size="7" font-weight="600">TANGGA</text>
  </g>
  <!-- ROOFTOP GARDEN -->
  <rect x="20" y="220" width="480" height="80" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="260" y="253" text-anchor="middle" fill="#16a34a" font-size="9" font-weight="600">ROOFTOP GARDEN</text>
  <text x="260" y="265" text-anchor="middle" fill="#4b5563" font-size="7.5">Taman Atap — Balkon Melingkar Lt.3</text>
  <circle cx="80" cy="255" r="16" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="140" cy="250" r="12" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="390" cy="255" r="15" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="450" cy="250" r="12" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <!-- LEGEND -->
  <rect x="20" y="320" width="7" height="7" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="31" y="327" fill="#c4b5fd" font-size="7">Master Suite</text>
  <rect x="150" y="320" width="7" height="7" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
  <text x="161" y="327" fill="#67e8f9" font-size="7">KM Premium</text>
  <rect x="280" y="320" width="7" height="7" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="291" y="327" fill="#16a34a" font-size="7">Rooftop Garden</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#8b5cf6" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#a78bfa"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#a78bfa" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:150  |  LT.3 ≈ 140 m²</text>
</svg>`
    }
  ],
 
  // ──────────────────────────────────────────────────────────
  // P7 — DARK CONCRETE 2 LANTAI (240 m²)
  // ──────────────────────────────────────────────────────────
  p7: [
    {
      label: 'Lantai 1',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#080808"/>
  <text x="260" y="18" text-anchor="middle" fill="#e5e7eb" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 1 — DARK CONCRETE 2 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#6b7280" stroke-width="0.4" opacity="0.4"/>
  <!-- Garis curtain wall atas -->
  <rect x="20" y="34" width="480" height="10" fill="#112233" stroke="#60a5fa" stroke-width="0.8"/>
  <line x1="80" y1="34" x2="80" y2="44" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="140" y1="34" x2="140" y2="44" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="200" y1="34" x2="200" y2="44" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="260" y1="34" x2="260" y2="44" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="320" y1="34" x2="320" y2="44" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="380" y1="34" x2="380" y2="44" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="440" y1="34" x2="440" y2="44" stroke="#60a5fa" stroke-width="0.4"/>
  <text x="260" y="43" text-anchor="middle" fill="#60a5fa" font-size="6.5" letter-spacing="0.8">CURTAIN WALL — KACA FULL LANTAI 1</text>
  <!-- LIVING OPEN + CURTAIN WALL -->
  <rect x="20" y="44" width="215" height="115" fill="#0d0d0d" stroke="#4b5563" stroke-width="1"/>
  <text x="127" y="95" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">LIVING OPEN</text>
  <text x="127" y="107" text-anchor="middle" fill="#6b7280" font-size="7.5">CURTAIN WALL 45 m²</text>
  <rect x="30" y="125" width="105" height="22" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="30" y="122" width="22" height="25" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="113" y="122" width="22" height="25" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="55" y="108" width="55" height="16" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>
  <!-- SKYLIGHT SEGITIGA -->
  <polygon points="235,44 310,44 272,78" fill="#0a1a2a" stroke="#60a5fa" stroke-width="1.2"/>
  <text x="272" y="70" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="600">SKYLIGHT ▲</text>
  <line x1="255" y1="44" x2="272" y2="76" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
  <line x1="291" y1="44" x2="272" y2="76" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
  <line x1="272" y1="44" x2="272" y2="76" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
  <!-- RUANG MAKAN -->
  <rect x="235" y="90" width="145" height="80" fill="#0d0d0d" stroke="#6b7280" stroke-width="1"/>
  <text x="307" y="127" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="307" y="139" text-anchor="middle" fill="#4b5563" font-size="7.5">25 m²</text>
  <rect x="250" y="100" width="105" height="45" rx="0" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <!-- DAPUR INDUSTRIAL -->
  <rect x="380" y="44" width="120" height="115" fill="#0d0d0d" stroke="#6b7280" stroke-width="1"/>
  <text x="440" y="97" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">DAPUR</text>
  <text x="440" y="109" text-anchor="middle" fill="#6b7280" font-size="7.5">INDUSTRIAL</text>
  <text x="440" y="121" text-anchor="middle" fill="#4b5563" font-size="7.5">22 m²</text>
  <rect x="385" y="48" width="110" height="11" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>
  <rect x="385" y="48" width="11" height="105" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>
  <rect x="410" y="78" width="65" height="26" rx="0" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <!-- WC TAMU -->
  <rect x="235" y="170" width="75" height="60" fill="#0a0e14" stroke="#4b5563" stroke-width="1"/>
  <text x="272" y="197" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">WC TAMU</text>
  <ellipse cx="272" cy="218" rx="16" ry="10" fill="none" stroke="#4b5563" stroke-width="0.7"/>
  <!-- TANGGA BETON -->
  <rect x="310" y="170" width="75" height="60" fill="#0d0d0d" stroke="#4b5563" stroke-width="0.8"/>
  <text x="347" y="197" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">TANGGA</text>
  <line x1="315" y1="178" x2="380" y2="178" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="315" y1="185" x2="380" y2="185" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="315" y1="192" x2="380" y2="192" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="315" y1="199" x2="380" y2="199" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="315" y1="206" x2="380" y2="206" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="315" y1="213" x2="380" y2="213" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="315" y1="220" x2="380" y2="220" stroke="#4b5563" stroke-width="0.5"/>
  <!-- LAUNDRY -->
  <rect x="385" y="159" width="115" height="71" fill="#0a0a0a" stroke="#374151" stroke-width="0.8"/>
  <text x="442" y="192" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">LAUNDRY</text>
  <text x="442" y="204" text-anchor="middle" fill="#4b5563" font-size="7.5">UTILITAS</text>
  <!-- VOID DOUBLE HEIGHT -->
  <rect x="20" y="159" width="215" height="60" fill="#0a0a0a" stroke="#374151" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="127" y="184" text-anchor="middle" fill="#4b5563" font-size="8.5">VOID DOUBLE HEIGHT</text>
  <text x="127" y="196" text-anchor="middle" fill="#374151" font-size="7.5">+ TAMAN KERING</text>
  <!-- TERAS DEPAN -->
  <rect x="20" y="230" width="480" height="40" fill="#0a0a0a" stroke="#4b5563" stroke-width="0.8" stroke-dasharray="3,4"/>
  <text x="260" y="253" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">TERAS DEPAN — BETON EKSPOS</text>
  <!-- LEGEND -->
  <rect x="20" y="295" width="7" height="7" fill="#0d0d0d" stroke="#4b5563" stroke-width="1"/>
  <text x="31" y="302" fill="#d1d5db" font-size="7">Living + Makan + Dapur</text>
  <rect x="210" y="295" width="7" height="7" fill="#0a1a2a" stroke="#60a5fa" stroke-width="1"/>
  <text x="221" y="302" fill="#60a5fa" font-size="7">Skylight Segitiga</text>
  <rect x="340" y="295" width="7" height="7" fill="#0a0a0a" stroke="#374151" stroke-width="1"/>
  <text x="351" y="302" fill="#9ca3af" font-size="7">Void / Laundry</text>
  <rect x="20" y="308" width="7" height="7" fill="#0a0e14" stroke="#4b5563" stroke-width="1"/>
  <text x="31" y="315" fill="#9ca3af" font-size="7">WC</text>
  <rect x="80" y="308" width="7" height="7" fill="#112233" stroke="#60a5fa" stroke-width="1"/>
  <text x="91" y="315" fill="#60a5fa" font-size="7">Curtain Wall</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#6b7280" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#9ca3af"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#9ca3af" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:130  |  LT.1 ≈ 120 m²  |  TOTAL 2 LANTAI ≈ 240 m²</text>
</svg>`
    },
    {
      label: 'Lantai 2',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#080808"/>
  <text x="260" y="18" text-anchor="middle" fill="#e5e7eb" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 2 — DARK CONCRETE 2 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#6b7280" stroke-width="0.4" opacity="0.4"/>
  <!-- HALL / KORIDOR -->
  <rect x="20" y="34" width="480" height="38" fill="#111111" stroke="#4b5563" stroke-width="0.8"/>
  <text x="260" y="57" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">KORIDOR / HALL LANTAI 2</text>
  <!-- KT UTAMA -->
  <rect x="20" y="72" width="190" height="145" fill="#0d0d0d" stroke="#4b5563" stroke-width="1"/>
  <text x="115" y="140" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">KT UTAMA</text>
  <text x="115" y="152" text-anchor="middle" fill="#6b7280" font-size="7.5">35 m²</text>
  <rect x="30" y="168" width="65" height="40" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="30" y="168" width="65" height="13" rx="0" fill="#252525"/>
  <rect x="130" y="78" width="70" height="18" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>
  <!-- KM UTAMA EN SUITE -->
  <rect x="210" y="72" width="100" height="90" fill="#0a0e14" stroke="#4b5563" stroke-width="1"/>
  <text x="260" y="110" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">KM UTAMA</text>
  <text x="260" y="122" text-anchor="middle" fill="#4b5563" font-size="7.5">EN SUITE</text>
  <rect x="218" y="80" width="45" height="20" rx="4" fill="none" stroke="#4b5563" stroke-width="0.8"/>
  <rect x="269" y="78" width="20" height="20" rx="2" fill="none" stroke="#4b5563" stroke-width="0.8"/>
  <!-- KT 2 -->
  <rect x="310" y="72" width="105" height="100" fill="#0d0d0d" stroke="#4b5563" stroke-width="1"/>
  <text x="362" y="118" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">KT 2</text>
  <text x="362" y="130" text-anchor="middle" fill="#6b7280" font-size="7.5">20 m²</text>
  <rect x="320" y="140" width="55" height="26" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="320" y="140" width="55" height="9" fill="#252525"/>
  <!-- KT 3 -->
  <rect x="415" y="72" width="85" height="100" fill="#0d0d0d" stroke="#4b5563" stroke-width="1"/>
  <text x="457" y="118" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">KT 3</text>
  <text x="457" y="130" text-anchor="middle" fill="#6b7280" font-size="7.5">18 m²</text>
  <rect x="425" y="140" width="50" height="26" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="425" y="140" width="50" height="9" fill="#252525"/>
  <!-- KM 2 -->
  <rect x="210" y="162" width="100" height="55" fill="#0a0e14" stroke="#4b5563" stroke-width="1"/>
  <text x="260" y="188" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="260" cy="207" rx="16" ry="10" fill="none" stroke="#4b5563" stroke-width="0.7"/>
  <!-- TANGGA -->
  <rect x="310" y="172" width="75" height="45" fill="#0d0d0d" stroke="#4b5563" stroke-width="0.8"/>
  <text x="347" y="196" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">TANGGA</text>
  <line x1="315" y1="180" x2="380" y2="180" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="315" y1="187" x2="380" y2="187" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="315" y1="194" x2="380" y2="194" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="315" y1="201" x2="380" y2="201" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="315" y1="208" x2="380" y2="208" stroke="#4b5563" stroke-width="0.5"/>
  <!-- VOID ATAS -->
  <rect x="20" y="217" width="190" height="45" fill="#0a0a0a" stroke="#374151" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="115" y="238" text-anchor="middle" fill="#4b5563" font-size="8.5">VOID ATAS (di atas taman kering)</text>
  <!-- SKYLIGHT SEGITIGA (proyeksi atas) -->
  <polygon points="385,172 460,172 422,210" fill="#0a1a2a" stroke="#60a5fa" stroke-width="1.2"/>
  <text x="422" y="197" text-anchor="middle" fill="#60a5fa" font-size="6.5" font-weight="600">SKYLIGHT ▲</text>
  <!-- BALKON KACA di atas void -->
  <rect x="20" y="262" width="480" height="35" fill="#0a1a2a" stroke="#60a5fa" stroke-width="1"/>
  <text x="260" y="283" text-anchor="middle" fill="#60a5fa" font-size="8.5" font-weight="600">BALKON KACA (DI ATAS VOID) + RAILING KACA</text>
  <!-- LEGEND -->
  <rect x="20" y="315" width="7" height="7" fill="#0d0d0d" stroke="#4b5563" stroke-width="1"/>
  <text x="31" y="322" fill="#d1d5db" font-size="7">Kamar Tidur</text>
  <rect x="140" y="315" width="7" height="7" fill="#0a0e14" stroke="#4b5563" stroke-width="1"/>
  <text x="151" y="322" fill="#9ca3af" font-size="7">KM</text>
  <rect x="200" y="315" width="7" height="7" fill="#0a1a2a" stroke="#60a5fa" stroke-width="1"/>
  <text x="211" y="322" fill="#60a5fa" font-size="7">Balkon Kaca + Skylight</text>
  <rect x="380" y="315" width="7" height="7" fill="#0a0a0a" stroke="#374151" stroke-width="1"/>
  <text x="391" y="322" fill="#9ca3af" font-size="7">Void Atas</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#6b7280" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#9ca3af"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#9ca3af" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:130  |  LT.2 ≈ 120 m²</text>
</svg>`
    }
  ],
 
  // ──────────────────────────────────────────────────────────
  // P8 — MINIMALIS TROPIS 2 LANTAI (260 m²)
  // ──────────────────────────────────────────────────────────
  p8: [
    {
      label: 'Lantai 1',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#0e0a04"/>
  <text x="260" y="18" text-anchor="middle" fill="#d97706" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 1 — MINIMALIS TROPIS 2 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#d97706" stroke-width="0.4" opacity="0.4"/>
  <!-- CARPORT -->
  <rect x="20" y="34" width="130" height="90" fill="#0c0903" stroke="#92400e" stroke-width="1"/>
  <rect x="28" y="62" width="75" height="30" rx="3" fill="#181208" stroke="#78350f" stroke-width="0.5"/>
  <text x="85" y="106" text-anchor="middle" fill="#92400e" font-size="8.5" font-weight="500">CARPORT</text>
  <text x="85" y="118" text-anchor="middle" fill="#4b5563" font-size="7.5">1 Mobil</text>
  <!-- Louver kayu vertikal indicator -->
  <line x1="20" y1="34" x2="20" y2="130" stroke="#d97706" stroke-width="2.5" opacity="0.7"/>
  <line x1="24" y1="38" x2="24" y2="126" stroke="#d97706" stroke-width="1" opacity="0.35"/>
  <line x1="28" y1="38" x2="28" y2="126" stroke="#d97706" stroke-width="1" opacity="0.35"/>
  <line x1="32" y1="38" x2="32" y2="126" stroke="#d97706" stroke-width="1" opacity="0.35"/>
  <!-- TAMAN MASUK -->
  <rect x="150" y="34" width="85" height="90" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="192" y="72" text-anchor="middle" fill="#16a34a" font-size="8.5" font-weight="600">TAMAN</text>
  <text x="192" y="84" text-anchor="middle" fill="#4b5563" font-size="7.5">MASUK</text>
  <circle cx="168" cy="52" r="12" fill="#052e0a" stroke="#16a34a" stroke-width="0.7"/>
  <circle cx="210" cy="57" r="9" fill="#052e0a" stroke="#16a34a" stroke-width="0.7"/>
  <!-- FOYER -->
  <rect x="235" y="34" width="80" height="60" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="275" y="62" text-anchor="middle" fill="#d97706" font-size="9" font-weight="600">FOYER</text>
  <text x="275" y="74" text-anchor="middle" fill="#4b5563" font-size="7">MASUK</text>
  <!-- DAPUR OPEN -->
  <rect x="315" y="34" width="145" height="75" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="387" y="68" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR OPEN</text>
  <text x="387" y="80" text-anchor="middle" fill="#4b5563" font-size="7.5">20 m²</text>
  <rect x="320" y="38" width="135" height="10" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="450" y="38" width="5" height="65" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="355" y="55" width="75" height="22" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- RUANG MAKAN -->
  <rect x="460" y="34" width="40" height="75" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="480" y="64" text-anchor="middle" fill="#fbbf24" font-size="7.5" font-weight="600">R.MAKAN</text>
  <text x="480" y="76" text-anchor="middle" fill="#4b5563" font-size="7">18 m²</text>
  <!-- RUANG TAMU -->
  <rect x="20" y="134" width="205" height="105" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="122" y="182" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG TAMU</text>
  <text x="122" y="194" text-anchor="middle" fill="#4b5563" font-size="7.5">38 m²</text>
  <rect x="30" y="202" width="90" height="22" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="30" y="199" width="20" height="25" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <ellipse cx="158" cy="196" rx="14" ry="11" fill="#1e1508" stroke="#d97706" stroke-width="0.4"/>
  <!-- RUANG KELUARGA -->
  <rect x="225" y="94" width="150" height="100" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="300" y="140" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG KELUARGA</text>
  <text x="300" y="152" text-anchor="middle" fill="#4b5563" font-size="7.5">32 m²</text>
  <rect x="230" y="98" width="90" height="8" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="235" y="166" width="85" height="20" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- WC TAMU -->
  <rect x="225" y="194" width="75" height="60" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="262" y="222" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC TAMU</text>
  <ellipse cx="262" cy="243" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA -->
  <rect x="300" y="194" width="75" height="60" fill="#0d0a04" stroke="#4b5563" stroke-width="0.8"/>
  <text x="337" y="220" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="305" y1="202" x2="370" y2="202" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="209" x2="370" y2="209" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="216" x2="370" y2="216" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="223" x2="370" y2="223" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="230" x2="370" y2="230" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="237" x2="370" y2="237" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="244" x2="370" y2="244" stroke="#4b5563" stroke-width="0.5"/>
  <!-- UTILITAS -->
  <rect x="375" y="109" width="125" height="75" fill="#0a0804" stroke="#374151" stroke-width="0.8"/>
  <text x="437" y="148" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">UTILITAS</text>
  <text x="437" y="160" text-anchor="middle" fill="#4b5563" font-size="7.5">SERVIS</text>
  <!-- SERVIS -->
  <rect x="20" y="249" width="205" height="40" fill="#0a0804" stroke="#374151" stroke-width="0.8"/>
  <text x="122" y="272" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">AREA SERVIS / LAUNDRY</text>
  <!-- LEGEND -->
  <rect x="20" y="308" width="7" height="7" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="31" y="315" fill="#fbbf24" font-size="7">Ruang Tamu/Keluarga/Dapur/Makan</text>
  <rect x="280" y="308" width="7" height="7" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="291" y="315" fill="#67e8f9" font-size="7">WC/KM</text>
  <rect x="20" y="322" width="7" height="7" fill="#0c0903" stroke="#92400e" stroke-width="1"/>
  <text x="31" y="329" fill="#92400e" font-size="7">Carport</text>
  <rect x="110" y="322" width="7" height="7" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="121" y="329" fill="#16a34a" font-size="7">Taman</text>
  <rect x="200" y="322" width="7" height="7" fill="#0a0804" stroke="#374151" stroke-width="1"/>
  <text x="211" y="329" fill="#9ca3af" font-size="7">Servis</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#d97706" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#d97706"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#d97706" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:120  |  LT.1 ≈ 130 m²  |  TOTAL 2 LANTAI ≈ 260 m²</text>
</svg>`
    },
    {
      label: 'Lantai 2',
      svg: `<svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="520" height="380" fill="#0e0a04"/>
  <text x="260" y="18" text-anchor="middle" fill="#d97706" font-size="10" font-weight="600" letter-spacing="1.5">LANTAI 2 — MINIMALIS TROPIS 2 LANTAI</text>
  <line x1="40" y1="24" x2="480" y2="24" stroke="#d97706" stroke-width="0.4" opacity="0.4"/>
  <!-- LOUVER KAYU indicator -->
  <line x1="20" y1="34" x2="20" y2="220" stroke="#d97706" stroke-width="2.5" opacity="0.7"/>
  <line x1="24" y1="38" x2="24" y2="216" stroke="#d97706" stroke-width="1" opacity="0.35"/>
  <line x1="28" y1="38" x2="28" y2="216" stroke="#d97706" stroke-width="1" opacity="0.35"/>
  <line x1="32" y1="38" x2="32" y2="216" stroke="#d97706" stroke-width="1" opacity="0.35"/>
  <!-- HALL / KORIDOR -->
  <rect x="20" y="34" width="480" height="38" fill="#100c04" stroke="#78350f" stroke-width="0.8"/>
  <text x="260" y="57" text-anchor="middle" fill="#d97706" font-size="8.5" font-weight="600">KORIDOR / HALL LANTAI 2</text>
  <!-- KT UTAMA -->
  <rect x="20" y="72" width="195" height="150" fill="#100c04" stroke="#d97706" stroke-width="1.5"/>
  <text x="117" y="142" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">KT UTAMA</text>
  <text x="117" y="154" text-anchor="middle" fill="#4b5563" font-size="7.5">30 m²</text>
  <rect x="30" y="172" width="65" height="40" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="30" y="172" width="65" height="12" rx="2" fill="#2a1e08"/>
  <rect x="140" y="78" width="65" height="18" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- KM UTAMA EN SUITE -->
  <rect x="215" y="72" width="105" height="85" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="267" y="108" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM UTAMA</text>
  <text x="267" y="120" text-anchor="middle" fill="#4b5563" font-size="7.5">EN SUITE</text>
  <rect x="223" y="80" width="45" height="20" rx="4" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="274" y="78" width="22" height="20" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <!-- KT 2 -->
  <rect x="320" y="72" width="160" height="105" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="400" y="120" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">KAMAR TIDUR 2</text>
  <text x="400" y="132" text-anchor="middle" fill="#4b5563" font-size="7.5">20 m²</text>
  <rect x="330" y="146" width="55" height="26" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="330" y="146" width="55" height="9" rx="1" fill="#2a1e08"/>
  <!-- KM 2 -->
  <rect x="215" y="157" width="105" height="65" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="267" y="188" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="267" cy="210" rx="17" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- RUANG BELAJAR -->
  <rect x="320" y="177" width="105" height="65" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="372" y="206" text-anchor="middle" fill="#fbbf24" font-size="8.5" font-weight="600">RUANG</text>
  <text x="372" y="218" text-anchor="middle" fill="#fbbf24" font-size="8.5" font-weight="600">BELAJAR</text>
  <!-- TANGGA -->
  <rect x="425" y="177" width="75" height="65" fill="#0d0a04" stroke="#4b5563" stroke-width="0.8"/>
  <text x="462" y="206" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="430" y1="185" x2="495" y2="185" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="430" y1="192" x2="495" y2="192" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="430" y1="199" x2="495" y2="199" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="430" y1="206" x2="495" y2="206" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="430" y1="213" x2="495" y2="213" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="430" y1="220" x2="495" y2="220" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="430" y1="227" x2="495" y2="227" stroke="#4b5563" stroke-width="0.5"/>
  <!-- BALKON KACA + LOUVER KAYU -->
  <rect x="20" y="242" width="480" height="38" fill="#04100a" stroke="#22d3ee" stroke-width="1"/>
  <text x="260" y="264" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">BALKON KACA RAILING + LOUVER KAYU VERTIKAL</text>
  <!-- LEGEND -->
  <rect x="20" y="300" width="7" height="7" fill="#100c04" stroke="#d97706" stroke-width="1"/>
  <text x="31" y="307" fill="#fbbf24" font-size="7">Kamar Tidur / Ruang Belajar</text>
  <rect x="230" y="300" width="7" height="7" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
  <text x="241" y="307" fill="#67e8f9" font-size="7">Kamar Mandi</text>
  <rect x="350" y="300" width="7" height="7" fill="#04100a" stroke="#22d3ee" stroke-width="1"/>
  <text x="361" y="307" fill="#67e8f9" font-size="7">Balkon + Louver Kayu</text>
  <rect x="20" y="315" width="7" height="7" fill="none" stroke="#d97706" stroke-width="2"/>
  <text x="31" y="322" fill="#d97706" font-size="7">Louver Kayu Vertikal (sisi kiri)</text>
  <g transform="translate(490,345)">
    <circle cx="0" cy="0" r="12" fill="none" stroke="#d97706" stroke-width="0.8"/>
    <polygon points="0,-10 -3,0 0,3 3,0" fill="#d97706"/>
    <polygon points="0,10 -3,0 0,-3 3,0" fill="#374151" opacity="0.5"/>
    <text x="0" y="-13" text-anchor="middle" fill="#d97706" font-size="7">U</text>
  </g>
  <text x="20" y="375" fill="#4b5563" font-size="7">SKALA 1:120  |  LT.2 ≈ 130 m²</text>
</svg>`
    }
  ]
};

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
 
  // ✅ BUG FIX #13: Panggil renderDenahTabs() untuk generate denah
  renderDenahTabs(idx);
 
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
 
// BUG FIX #11: switchTab() sekarang dengan proper aria-selected
function switchTab(tab) {
    ['konsep', 'denah', 'file'].forEach(t => {
        const tabEl = document.getElementById('tab-' + t);
        const contentEl = document.getElementById('content-' + t);
        const isActive = t === tab;
 
        if (tabEl) {
            tabEl.classList.toggle('active', isActive);
            tabEl.setAttribute('aria-selected', isActive ? 'true' : 'false');
        }
        if (contentEl) {
            contentEl.classList.toggle('active', isActive);
        }
    });
}
 
// ==================== ENTRY POINT ====================
document.addEventListener('DOMContentLoaded', () => {
    // BUG FIX #12: Inisialisasi statsCounter SEKALI saja
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
 
    // BUG FIX #15: Setup navigation button listeners
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    if (btnPrev) btnPrev.addEventListener('click', () => navigate(-1));
    if (btnNext) btnNext.addEventListener('click', () => navigate(1));
 
    // Keyboard nav modal
    document.addEventListener('keydown', e => {
        if (!document.getElementById('pfModalBackdrop')?.classList.contains('open')) return;
        if (e.key === 'Escape')     closeModal();
        if (e.key === 'ArrowRight') navigate(1);
        if (e.key === 'ArrowLeft')  navigate(-1);
    });
});

