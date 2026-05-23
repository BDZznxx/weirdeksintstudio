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

        // BUG FIX #1: Tambahkan response.ok check
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

    if (document.readyState === 'complete') {
        hidePreloader();
    } else {
        window.addEventListener('load', hidePreloader, { once: true });
        setTimeout(hidePreloader, 3000);
    }

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

// ✅ hidePreloader — pakai display:none setelah transisi
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

        // BUG FIX #3
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
    // BUG FIX #4: Regex diperbaiki
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

// BUG FIX #5
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
        // BUG FIX #6: clamp activityScore + totalRating
        const activityScore = Math.min(5, 4.7 + (this.stats.clickCount * 0.005) + (this.stats.dailyVisitors * 0.01));
        this.stats.totalRating += activityScore;
        this.stats.ratingCount++;

        const maxTotal = 5.0 * this.stats.ratingCount;
        if (this.stats.totalRating > maxTotal) {
            this.stats.totalRating = maxTotal;
        }

        this.saveStats();
    }

    trackClicks() {
        // BUG FIX #7: hanya clickCount yang naik saat klik
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
        // BUG FIX #8: Clamp avgRating di display
        const rawAvg    = this.stats.totalRating / this.stats.ratingCount;
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
// BUG FIX #9: projects array didefinisikan SEKALI di sini saja
const projects = [
  {
    name: "Mansion classic modern 3 lantai",
    type: "Residensial", emoji: "🏠", color: "#E1F5EE",
    desc: "Rumah mewah bergaya Modern Classic Neo-European dengan fasad megah berwarna hitam putih yang elegan. Bay window bertingkat, atap mansard, kanopi lengkung, dan detail molding klasik menjadi ciri khasnya.",
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
    desc: "Rumah 3 lantai modern dengan garasi double di lantai dasar, balkon kaca memanjang, dan atap cantilever angular. Silinder beton bertumpuk menjadi elemen sculptural yang kuat.",
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
    desc: "Rumah 3 lantai dengan elemen silinder beton putih bertumpuk, garasi 3 mobil, dan balkon melingkar di tiap lantai. Atap kayu flat dengan overhang lebar.",
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

// ============================================================
// ==================== SVG DENAH LENGKAP ====================
// ============================================================

// Helper: tab selector SVG
function makeTabs(tabs, activeIdx, projectIdx) {
    const w = Math.floor(480 / tabs.length);
    return tabs.map((t, i) => `
        <rect x="${10 + i * w}" y="2" width="${w - 4}" height="22" rx="4"
              fill="${i === activeIdx ? '#c9a96e' : '#1a1a3a'}"
              stroke="${i === activeIdx ? '#c9a96e' : '#2a2a4e'}" stroke-width="0.5"
              style="cursor:pointer" onclick="showDenahFloor(${projectIdx},${i})"/>
        <text x="${10 + i * w + (w - 4)/2}" y="17" text-anchor="middle"
              fill="${i === activeIdx ? '#0a0a1a' : '#9ca3af'}"
              font-size="8.5" font-weight="${i === activeIdx ? '700' : '500'}"
              font-family="Poppins,sans-serif" style="pointer-events:none">${t}</text>
    `).join('');
}

// ============================================================
// PROJECT 1 — Mansion Classic Modern 3 Lantai (600 m²)
// Fasad: Hitam-putih Neo-Classical, bay window, mansard roof
// LT1: Garasi 2 mobil, foyer, living, dining, dapur, WC
// LT2: 3 Kamar tidur, 2 KM, balkon
// LT3: Ruang atap mansard, kamar tidur utama, KM mewah
// ============================================================
const denahP1_floors = [
`<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="420" fill="#0d0d1a"/>
  <!-- Tab selector -->
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 0, 0)}</g>
  <!-- Title -->
  <text x="250" y="42" text-anchor="middle" fill="#c9a96e" font-size="10" font-weight="700" letter-spacing="1.5">MANSION CLASSIC MODERN — LANTAI 1  |  600 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#c9a96e" stroke-width="0.5" opacity="0.4"/>
  <!-- GARASI 2 MOBIL -->
  <rect x="30" y="55" width="160" height="95" fill="#151520" stroke="#6b7280" stroke-width="1.2"/>
  <line x1="110" y1="55" x2="110" y2="150" stroke="#6b7280" stroke-width="0.5" stroke-dasharray="3,3"/>
  <rect x="38" y="70" width="60" height="32" rx="3" fill="#1f1f2e" stroke="#4b5563" stroke-width="0.7"/>
  <rect x="118" y="70" width="60" height="32" rx="3" fill="#1f1f2e" stroke="#4b5563" stroke-width="0.7"/>
  <text x="110" y="125" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">GARASI 2 MOBIL</text>
  <text x="110" y="137" text-anchor="middle" fill="#4b5563" font-size="7.5">± 48 m²</text>
  <line x1="30" y1="55" x2="190" y2="55" stroke="#c9a96e" stroke-width="2" opacity="0.5"/>
  <text x="110" y="52" text-anchor="middle" fill="#c9a96e" font-size="7" opacity="0.7">← PINTU GARASI →</text>
  <!-- FOYER KLASIK -->
  <rect x="190" y="55" width="90" height="60" fill="#12122a" stroke="#c9a96e" stroke-width="1.2"/>
  <text x="235" y="81" text-anchor="middle" fill="#c9a96e" font-size="9" font-weight="600">FOYER</text>
  <text x="235" y="93" text-anchor="middle" fill="#6b7280" font-size="7.5">ENTRANCE</text>
  <path d="M205 115 Q235 105 265 115" fill="none" stroke="#c9a96e" stroke-width="0.8" opacity="0.5"/>
  <!-- LIVING ROOM -->
  <rect x="280" y="55" width="100" height="120" fill="#101025" stroke="#4f46e5" stroke-width="1.2"/>
  <text x="330" y="108" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">RUANG</text>
  <text x="330" y="120" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">TAMU</text>
  <text x="330" y="132" text-anchor="middle" fill="#4b5563" font-size="7.5">± 40 m²</text>
  <rect x="288" y="145" width="50" height="18" rx="2" fill="#1a1a40" stroke="#4f46e5" stroke-width="0.6"/>
  <rect x="288" y="143" width="16" height="22" rx="1" fill="#1a1a40" stroke="#4f46e5" stroke-width="0.6"/>
  <!-- DINING -->
  <rect x="380" y="55" width="90" height="85" fill="#12120a" stroke="#d97706" stroke-width="1.2"/>
  <text x="425" y="89" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG</text>
  <text x="425" y="101" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">MAKAN</text>
  <text x="425" y="113" text-anchor="middle" fill="#4b5563" font-size="7.5">± 28 m²</text>
  <rect x="390" y="62" width="55" height="28" rx="2" fill="#1e1a08" stroke="#d97706" stroke-width="0.5"/>
  <!-- DAPUR -->
  <rect x="380" y="140" width="90" height="80" fill="#12120a" stroke="#d97706" stroke-width="1.2"/>
  <text x="425" y="176" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="425" y="188" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
  <rect x="385" y="145" width="80" height="10" rx="1" fill="#1e1a08" stroke="#d97706" stroke-width="0.5"/>
  <rect x="385" y="145" width="10" height="70" rx="1" fill="#1e1a08" stroke="#d97706" stroke-width="0.5"/>
  <!-- WC TAMU -->
  <rect x="190" y="115" width="60" height="45" fill="#05121a" stroke="#0891b2" stroke-width="1.2"/>
  <text x="220" y="135" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC</text>
  <text x="220" y="147" text-anchor="middle" fill="#4b5563" font-size="7.5">TAMU</text>
  <ellipse cx="220" cy="154" rx="10" ry="7" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- RUANG KELUARGA -->
  <rect x="30" y="150" width="250" height="100" fill="#101025" stroke="#4f46e5" stroke-width="1.2"/>
  <text x="155" y="195" text-anchor="middle" fill="#818cf8" font-size="9.5" font-weight="600">RUANG KELUARGA</text>
  <text x="155" y="208" text-anchor="middle" fill="#4b5563" font-size="7.5">± 60 m²</text>
  <rect x="40" y="218" width="110" height="22" rx="2" fill="#1a1a40" stroke="#4f46e5" stroke-width="0.6"/>
  <rect x="40" y="215" width="22" height="28" rx="2" fill="#1a1a40" stroke="#4f46e5" stroke-width="0.6"/>
  <ellipse cx="185" cy="210" rx="22" ry="16" fill="#1a1a40" stroke="#4f46e5" stroke-width="0.5"/>
  <!-- UTILITY + LAUNDRY -->
  <rect x="280" y="175" width="100" height="65" fill="#0d0d12" stroke="#374151" stroke-width="1"/>
  <text x="330" y="202" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">UTILITAS</text>
  <text x="330" y="214" text-anchor="middle" fill="#4b5563" font-size="7.5">LAUNDRY</text>
  <!-- TANGGA -->
  <rect x="190" y="160" width="90" height="80" fill="#0a0a18" stroke="#6b7280" stroke-width="1"/>
  <text x="235" y="183" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">TANGGA</text>
  <line x1="195" y1="170" x2="275" y2="170" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="195" y1="177" x2="275" y2="177" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="195" y1="184" x2="275" y2="184" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="195" y1="191" x2="275" y2="191" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="195" y1="198" x2="275" y2="198" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="195" y1="205" x2="275" y2="205" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="195" y1="212" x2="275" y2="212" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="195" y1="219" x2="275" y2="219" stroke="#4b5563" stroke-width="0.5"/>
  <!-- TAMAN + TERAS -->
  <rect x="30" y="250" width="250" height="45" fill="#050e08" stroke="#15803d" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="155" y="271" text-anchor="middle" fill="#16a34a" font-size="8.5">TERAS DEPAN — BATU ANDESIT</text>
  <text x="155" y="284" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
  <!-- COMPASS -->
  <g transform="translate(462,370)">
    <circle cx="0" cy="0" r="14" fill="none" stroke="#c9a96e" stroke-width="0.8"/>
    <polygon points="0,-12 -4,0 0,3 4,0" fill="#c9a96e"/>
    <polygon points="0,12 -4,0 0,-3 4,0" fill="#4b5563" opacity="0.5"/>
    <text x="0" y="-15" text-anchor="middle" fill="#c9a96e" font-size="7" font-weight="700">U</text>
  </g>
  <!-- LEGEND -->
  <rect x="30" y="305" width="8" height="8" fill="#101025" stroke="#4f46e5" stroke-width="1"/>
  <text x="42" y="313" fill="#818cf8" font-size="7.5">Ruang Tamu / Keluarga</text>
  <rect x="30" y="317" width="8" height="8" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="42" y="325" fill="#a78bfa" font-size="7.5">Kamar Tidur</text>
  <rect x="160" y="305" width="8" height="8" fill="#12120a" stroke="#d97706" stroke-width="1"/>
  <text x="172" y="313" fill="#fbbf24" font-size="7.5">Dapur / Makan</text>
  <rect x="160" y="317" width="8" height="8" fill="#05121a" stroke="#0891b2" stroke-width="1"/>
  <text x="172" y="325" fill="#67e8f9" font-size="7.5">Kamar Mandi</text>
  <rect x="290" y="305" width="8" height="8" fill="#151520" stroke="#6b7280" stroke-width="1"/>
  <text x="302" y="313" fill="#9ca3af" font-size="7.5">Garasi / Utilitas</text>
  <rect x="290" y="317" width="8" height="8" fill="#050e08" stroke="#15803d" stroke-width="1"/>
  <text x="302" y="325" fill="#16a34a" font-size="7.5">Taman / Teras</text>
  <text x="30" y="345" fill="#4b5563" font-size="7.5">SKALA 1:150  |  LT.1 ≈ 200 m²  |  TOTAL 3 LANTAI ≈ 600 m²</text>
</svg>`,
`<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="420" fill="#0d0d1a"/>
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 1, 0)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#c9a96e" font-size="10" font-weight="700" letter-spacing="1.5">MANSION CLASSIC MODERN — LANTAI 2</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#c9a96e" stroke-width="0.5" opacity="0.4"/>
  <!-- BALKON DEPAN (bay window projection) -->
  <rect x="60" y="55" width="130" height="35" fill="#091524" stroke="#0891b2" stroke-width="1.2" stroke-dasharray="4,2"/>
  <text x="125" y="73" text-anchor="middle" fill="#67e8f9" font-size="8.5">BALKON BAY WINDOW</text>
  <text x="125" y="84" text-anchor="middle" fill="#4b5563" font-size="7.5">± 12 m²</text>
  <!-- KT UTAMA -->
  <rect x="30" y="90" width="170" height="120" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="115" y="144" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="700">KT UTAMA</text>
  <text x="115" y="157" text-anchor="middle" fill="#4b5563" font-size="7.5">± 42 m²</text>
  <!-- King bed -->
  <rect x="45" y="165" width="60" height="35" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="45" y="165" width="60" height="12" rx="1" fill="#3a2560"/>
  <!-- Wardrobe -->
  <rect x="155" y="95" width="38" height="22" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>
  <line x1="174" y1="95" x2="174" y2="117" stroke="#7c3aed" stroke-width="0.3"/>
  <!-- KM UTAMA EN SUITE -->
  <rect x="200" y="90" width="120" height="80" fill="#050a14" stroke="#0891b2" stroke-width="1.2"/>
  <text x="260" y="125" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
  <text x="260" y="137" text-anchor="middle" fill="#67e8f9" font-size="7.5">EN SUITE</text>
  <rect x="208" y="97" width="50" height="20" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="265" y="97" width="20" height="20" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <!-- RUANG BELAJAR / DRESSING -->
  <rect x="200" y="170" width="120" height="60" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
  <text x="260" y="197" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">R. BELAJAR</text>
  <text x="260" y="209" text-anchor="middle" fill="#4b5563" font-size="7.5">DRESSING ± 18 m²</text>
  <rect x="208" y="176" width="55" height="14" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- KT 2 -->
  <rect x="320" y="90" width="140" height="100" fill="#1f1535" stroke="#7c3aed" stroke-width="1.2"/>
  <text x="390" y="135" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="700">KT 2</text>
  <text x="390" y="148" text-anchor="middle" fill="#4b5563" font-size="7.5">± 28 m²</text>
  <rect x="330" y="155" width="48" height="28" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="330" y="155" width="48" height="10" rx="1" fill="#3a2560"/>
  <!-- KT 3 -->
  <rect x="320" y="190" width="140" height="100" fill="#1f1535" stroke="#7c3aed" stroke-width="1.2"/>
  <text x="390" y="235" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="700">KT 3</text>
  <text x="390" y="248" text-anchor="middle" fill="#4b5563" font-size="7.5">± 26 m²</text>
  <rect x="330" y="255" width="48" height="28" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="330" y="255" width="48" height="10" rx="1" fill="#3a2560"/>
  <!-- KM 2 -->
  <rect x="200" y="230" width="80" height="60" fill="#050a14" stroke="#0891b2" stroke-width="1.2"/>
  <text x="240" y="256" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="240" cy="278" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <rect x="207" y="233" width="30" height="15" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>
  <!-- TANGGA -->
  <rect x="30" y="210" width="85" height="80" fill="#0a0a18" stroke="#4b5563" stroke-width="0.8"/>
  <text x="72" y="230" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">TANGGA</text>
  <line x1="35" y1="218" x2="110" y2="218" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="225" x2="110" y2="225" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="232" x2="110" y2="232" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="239" x2="110" y2="239" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="246" x2="110" y2="246" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="253" x2="110" y2="253" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="260" x2="110" y2="260" stroke="#4b5563" stroke-width="0.5"/>
  <!-- BALKON SAMPING -->
  <rect x="115" y="210" width="85" height="50" fill="#091524" stroke="#0891b2" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="157" y="233" text-anchor="middle" fill="#67e8f9" font-size="8">BALKON</text>
  <text x="157" y="245" text-anchor="middle" fill="#4b5563" font-size="7.5">SAMPING</text>
  <!-- NOTES -->
  <rect x="30" y="300" width="440" height="22" rx="4" fill="#12122a" stroke="#7c3aed" stroke-width="0.5"/>
  <text x="250" y="315" text-anchor="middle" fill="#c4b5fd" font-size="8.5">LT.2: 3 KT + 2 KM En-Suite + R.Belajar + 2 Balkon  |  Luas ≈ 200 m²</text>
  <!-- LEGEND -->
  <rect x="30" y="330" width="8" height="8" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="42" y="338" fill="#c4b5fd" font-size="7.5">Kamar Tidur</text>
  <rect x="130" y="330" width="8" height="8" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
  <text x="142" y="338" fill="#67e8f9" font-size="7.5">Kamar Mandi</text>
  <rect x="250" y="330" width="8" height="8" fill="#091524" stroke="#0891b2" stroke-width="1" stroke-dasharray="2,1"/>
  <text x="262" y="338" fill="#67e8f9" font-size="7.5">Balkon</text>
  <text x="30" y="355" fill="#4b5563" font-size="7.5">SKALA 1:150  |  LT.2 ≈ 200 m²  |  TOTAL 3 LANTAI ≈ 600 m²</text>
</svg>`,
`<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="420" fill="#0d0d1a"/>
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 2, 0)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#c9a96e" font-size="10" font-weight="700" letter-spacing="1.5">MANSION CLASSIC MODERN — LANTAI 3 (ATAP MANSARD)</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#c9a96e" stroke-width="0.5" opacity="0.4"/>
  <!-- MANSARD ROOF ZONE indicator -->
  <path d="M60 58 Q250 45 440 58 L440 310 L60 310 Z" fill="#0a0a18" stroke="#c9a96e" stroke-width="1" stroke-dasharray="6,3" opacity="0.5"/>
  <text x="250" y="72" text-anchor="middle" fill="#c9a96e" font-size="8" opacity="0.7">ZONA ATAP MANSARD — LANGIT-LANGIT MIRING</text>
  <!-- KT SUITE UTAMA -->
  <rect x="70" y="80" width="200" height="130" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="170" y="138" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="700">MASTER SUITE</text>
  <text x="170" y="152" text-anchor="middle" fill="#a78bfa" font-size="8.5">LT.3 — MANSARD</text>
  <text x="170" y="166" text-anchor="middle" fill="#4b5563" font-size="7.5">± 80 m²</text>
  <!-- King bed deluxe -->
  <rect x="85" y="172" width="75" height="30" rx="3" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="85" y="172" width="75" height="11" rx="1" fill="#3a2560"/>
  <!-- Walk-in wardrobe -->
  <rect x="200" y="85" width="60" height="30" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>
  <text x="230" y="98" text-anchor="middle" fill="#9ca3af" font-size="7.5">WALK-IN</text>
  <text x="230" y="108" text-anchor="middle" fill="#4b5563" font-size="7">WARDROBE</text>
  <!-- KM SUITE -->
  <rect x="270" y="80" width="110" height="90" fill="#050a14" stroke="#0891b2" stroke-width="1.2"/>
  <text x="325" y="118" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM SUITE</text>
  <text x="325" y="130" text-anchor="middle" fill="#67e8f9" font-size="7.5">MEWAH</text>
  <rect x="278" y="87" width="50" height="24" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="336" y="87" width="22" height="22" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <circle cx="335" cy="147" r="15" fill="none" stroke="#0891b2" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="335" y="151" text-anchor="middle" fill="#67e8f9" font-size="6">JACUZZI</text>
  <!-- RUANG DUDUK PRIVAT -->
  <rect x="270" y="170" width="160" height="80" fill="#101025" stroke="#4f46e5" stroke-width="1.2"/>
  <text x="350" y="205" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">R. DUDUK</text>
  <text x="350" y="218" text-anchor="middle" fill="#4b5563" font-size="7.5">PRIVAT  ± 25 m²</text>
  <rect x="280" y="220" width="70" height="18" rx="2" fill="#1a1a40" stroke="#4f46e5" stroke-width="0.5"/>
  <!-- ROOFTOP BALKON MANSARD -->
  <rect x="70" y="210" width="200" height="60" fill="#091524" stroke="#0891b2" stroke-width="1" stroke-dasharray="4,2"/>
  <text x="170" y="235" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">BALKON MANSARD</text>
  <text x="170" y="248" text-anchor="middle" fill="#4b5563" font-size="7.5">± 18 m²  —  Dormer View</text>
  <!-- Dormer windows -->
  <rect x="90" y="215" width="30" height="20" rx="3" fill="#0a1820" stroke="#60a5fa" stroke-width="0.8"/>
  <path d="M90 215 Q105 208 120 215" fill="none" stroke="#60a5fa" stroke-width="0.8"/>
  <rect x="160" y="215" width="30" height="20" rx="3" fill="#0a1820" stroke="#60a5fa" stroke-width="0.8"/>
  <path d="M160 215 Q175 208 190 215" fill="none" stroke="#60a5fa" stroke-width="0.8"/>
  <!-- TANGGA -->
  <rect x="70" y="270" width="90" height="35" fill="#0a0a18" stroke="#4b5563" stroke-width="0.8"/>
  <text x="115" y="288" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">TANGGA ↓ LT.2</text>
  <line x1="75" y1="278" x2="155" y2="278" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="75" y1="284" x2="155" y2="284" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="75" y1="290" x2="155" y2="290" stroke="#4b5563" stroke-width="0.5"/>
  <!-- NOTES -->
  <rect x="40" y="315" width="420" height="22" rx="4" fill="#12122a" stroke="#c9a96e" stroke-width="0.5"/>
  <text x="250" y="330" text-anchor="middle" fill="#c9a96e" font-size="8.5">LT.3: Master Suite + KM Mewah + Walk-in + Balkon Dormer + R.Duduk  |  ≈ 200 m²</text>
  <!-- LEGEND -->
  <rect x="40" y="345" width="8" height="8" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
  <text x="52" y="353" fill="#c4b5fd" font-size="7.5">Master Suite</text>
  <rect x="140" y="345" width="8" height="8" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
  <text x="152" y="353" fill="#67e8f9" font-size="7.5">KM Mewah + Jacuzzi</text>
  <rect x="290" y="345" width="8" height="8" fill="#091524" stroke="#0891b2" stroke-width="1" stroke-dasharray="2,1"/>
  <text x="302" y="353" fill="#67e8f9" font-size="7.5">Balkon Dormer</text>
  <text x="40" y="375" fill="#4b5563" font-size="7.5">SKALA 1:150  |  LT.3 ≈ 200 m²  |  TOTAL 3 LANTAI ≈ 600 m²</text>
</svg>`
];

// ============================================================
// PROJECT 2 — Neo-Futuristik 3 Lantai (260 m²) — 3 TABS
// LT1: Garasi 2, Living open, Dapur, WC, Taman
// LT2: 3 KT + 2 KM + Balkon Kurva
// LT3: Master Suite + Rooftop Garden
// ============================================================
const denahP2_floors = [
`<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="420" fill="#050a18"/>
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 0, 1)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#60a5fa" font-size="10" font-weight="700" letter-spacing="1.5">NEO-FUTURISTIK — LANTAI 1  |  87 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#60a5fa" stroke-width="0.5" opacity="0.4"/>
  <!-- Building footprint organic curve -->
  <path d="M40 58 Q40 54 44 54 L400 54 Q440 54 445 80 L445 290 Q445 310 420 312 L65 312 Q40 310 38 288 Z" fill="none" stroke="#1d4ed8" stroke-width="1" stroke-dasharray="5,3"/>
  <!-- GARASI 2 MOBIL -->
  <rect x="45" y="60" width="200" height="88" fill="#080d1a" stroke="#374151" stroke-width="1.2"/>
  <line x1="145" y1="60" x2="145" y2="148" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
  <rect x="55" y="75" width="78" height="36" rx="3" fill="#101828" stroke="#4b5563" stroke-width="0.6"/>
  <rect x="155" y="75" width="78" height="36" rx="3" fill="#101828" stroke="#4b5563" stroke-width="0.6"/>
  <text x="145" y="130" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">GARASI 2 MOBIL  ±  55 m²</text>
  <line x1="45" y1="60" x2="245" y2="60" stroke="#3b82f6" stroke-width="2" opacity="0.5"/>
  <!-- FOYER ORGANIC -->
  <ellipse cx="320" cy="100" rx="60" ry="45" fill="#080d1a" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="320" y="97" text-anchor="middle" fill="#60a5fa" font-size="9" font-weight="600">FOYER</text>
  <text x="320" y="110" text-anchor="middle" fill="#4b5563" font-size="7.5">ORGANIK</text>
  <!-- LIVING OPEN PLAN -->
  <rect x="45" y="148" width="310" height="100" fill="#080d1a" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="200" y="192" text-anchor="middle" fill="#60a5fa" font-size="9.5" font-weight="600">LIVING OPEN PLAN</text>
  <text x="200" y="206" text-anchor="middle" fill="#4b5563" font-size="7.5">± 65 m²</text>
  <path d="M60 228 Q115 215 175 228 L175 243 Q115 230 60 243 Z" fill="#0f1e3d" stroke="#3b82f6" stroke-width="0.7"/>
  <ellipse cx="240" cy="218" rx="28" ry="18" fill="#0f1e3d" stroke="#3b82f6" stroke-width="0.5"/>
  <!-- DAPUR MODERN -->
  <rect x="355" y="60" width="110" height="100" fill="#080d0a" stroke="#d97706" stroke-width="1.2"/>
  <text x="410" y="107" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="410" y="120" text-anchor="middle" fill="#4b5563" font-size="7.5">MODERN ± 22 m²</text>
  <rect x="360" y="65" width="100" height="10" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="360" y="65" width="10" height="90" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="380" y="100" width="60" height="20" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- WC -->
  <rect x="355" y="160" width="75" height="60" fill="#040c14" stroke="#0891b2" stroke-width="1.2"/>
  <text x="392" y="185" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC</text>
  <ellipse cx="392" cy="208" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- BALKON KURVA DEPAN -->
  <path d="M45 248 Q200 278 355 248 L355 265 Q200 298 45 265 Z" fill="#080d14" stroke="#22d3ee" stroke-width="1.2"/>
  <text x="200" y="264" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">BALKON KURVA DEPAN  ± 15 m²</text>
  <!-- TANGGA SPIRAL -->
  <g transform="translate(410,225)">
    <circle cx="0" cy="0" r="26" fill="#050a14" stroke="#3b82f6" stroke-width="1"/>
    <circle cx="0" cy="0" r="8" fill="#080d1a" stroke="#60a5fa" stroke-width="0.7"/>
    <path d="M0,-26 A26,26 0 0,1 26,0" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
    <path d="M26,0 A26,26 0 0,1 0,26" fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.6"/>
    <text x="0" y="3" text-anchor="middle" fill="#60a5fa" font-size="6.5" font-weight="600">TANGGA</text>
    <text x="0" y="12" text-anchor="middle" fill="#4b5563" font-size="5.5">SPIRAL</text>
  </g>
  <!-- LEGEND -->
  <rect x="45" y="300" width="8" height="8" fill="#080d1a" stroke="#3b82f6" stroke-width="1"/>
  <text x="57" y="308" fill="#60a5fa" font-size="7.5">Living Open Plan</text>
  <rect x="175" y="300" width="8" height="8" fill="#080d14" stroke="#22d3ee" stroke-width="1"/>
  <text x="187" y="308" fill="#67e8f9" font-size="7.5">Balkon Kurva</text>
  <rect x="300" y="300" width="8" height="8" fill="#080d0a" stroke="#d97706" stroke-width="1"/>
  <text x="312" y="308" fill="#fbbf24" font-size="7.5">Dapur Modern</text>
  <text x="45" y="325" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.1 ≈ 87 m²  |  TOTAL 3 LANTAI ≈ 260 m²</text>
</svg>`,
`<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="420" fill="#050a18"/>
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 1, 1)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#60a5fa" font-size="10" font-weight="700" letter-spacing="1.5">NEO-FUTURISTIK — LANTAI 2</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#60a5fa" stroke-width="0.5" opacity="0.4"/>
  <!-- KT UTAMA -->
  <rect x="45" y="58" width="200" height="130" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="145" y="118" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="700">KT UTAMA</text>
  <text x="145" y="132" text-anchor="middle" fill="#4b5563" font-size="7.5">± 40 m²</text>
  <rect x="60" y="148" width="55" height="32" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="60" y="148" width="55" height="11" rx="1" fill="#3a2560"/>
  <rect x="185" y="65" width="50" height="20" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>
  <text x="210" y="78" text-anchor="middle" fill="#9ca3af" font-size="7">WARDROBE</text>
  <!-- KM UTAMA -->
  <rect x="245" y="58" width="120" height="90" fill="#040c14" stroke="#0891b2" stroke-width="1.2"/>
  <text x="305" y="98" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
  <text x="305" y="110" text-anchor="middle" fill="#67e8f9" font-size="7.5">EN SUITE</text>
  <rect x="253" y="65" width="48" height="20" rx="4" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="308" y="65" width="20" height="20" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <!-- KT 2 -->
  <rect x="365" y="58" width="105" height="120" fill="#1f1535" stroke="#7c3aed" stroke-width="1.2"/>
  <text x="417" y="115" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="700">KT 2</text>
  <text x="417" y="128" text-anchor="middle" fill="#4b5563" font-size="7.5">± 28 m²</text>
  <rect x="375" y="145" width="45" height="28" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="375" y="145" width="45" height="10" rx="1" fill="#3a2560"/>
  <!-- KT 3 -->
  <rect x="245" y="148" width="120" height="105" fill="#1f1535" stroke="#7c3aed" stroke-width="1.2"/>
  <text x="305" y="197" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="700">KT 3</text>
  <text x="305" y="210" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
  <rect x="255" y="220" width="45" height="28" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <!-- KM 2 -->
  <rect x="365" y="178" width="105" height="75" fill="#040c14" stroke="#0891b2" stroke-width="1.2"/>
  <text x="417" y="212" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="417" cy="238" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <rect x="372" y="182" width="32" height="16" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>
  <!-- BALKON ORGANIK KURVA -->
  <path d="M45 188 Q145 218 245 188 L245 205 Q145 238 45 205 Z" fill="#080d14" stroke="#22d3ee" stroke-width="1.2"/>
  <text x="145" y="205" text-anchor="middle" fill="#67e8f9" font-size="8.5">BALKON ORGANIK  ± 12 m²</text>
  <!-- TANGGA -->
  <g transform="translate(115,248)">
    <circle cx="0" cy="0" r="24" fill="#050a14" stroke="#3b82f6" stroke-width="1"/>
    <circle cx="0" cy="0" r="7" fill="#080d1a" stroke="#60a5fa" stroke-width="0.7"/>
    <path d="M0,-24 A24,24 0 0,1 24,0" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
    <path d="M24,0 A24,24 0 0,1 0,24" fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.6"/>
    <text x="0" y="3" text-anchor="middle" fill="#60a5fa" font-size="6.5">TANGGA</text>
  </g>
  <!-- NOTES -->
  <rect x="45" y="285" width="425" height="22" rx="4" fill="#080d1a" stroke="#3b82f6" stroke-width="0.5"/>
  <text x="257" y="300" text-anchor="middle" fill="#60a5fa" font-size="8.5">LT.2: 3 KT + 2 KM En-Suite + Balkon Organik  |  Luas ≈ 87 m²</text>
  <text x="45" y="325" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.2 ≈ 87 m²  |  TOTAL 3 LANTAI ≈ 260 m²</text>
</svg>`,
`<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="420" fill="#050a18"/>
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 2, 1)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#60a5fa" font-size="10" font-weight="700" letter-spacing="1.5">NEO-FUTURISTIK — LANTAI 3 (ROOFTOP)</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#60a5fa" stroke-width="0.5" opacity="0.4"/>
  <!-- MASTER SUITE -->
  <rect x="45" y="58" width="220" height="150" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="155" y="125" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="700">MASTER SUITE</text>
  <text x="155" y="140" text-anchor="middle" fill="#a78bfa" font-size="8.5">Kamar Utama LT.3</text>
  <text x="155" y="155" text-anchor="middle" fill="#4b5563" font-size="7.5">± 55 m²</text>
  <rect x="60" y="168" width="65" height="35" rx="3" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="60" y="168" width="65" height="12" rx="2" fill="#3a2560"/>
  <!-- Walk-in closet -->
  <rect x="185" y="63" width="70" height="35" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>
  <text x="220" y="78" text-anchor="middle" fill="#9ca3af" font-size="7.5">WALK-IN</text>
  <text x="220" y="90" text-anchor="middle" fill="#4b5563" font-size="7">CLOSET</text>
  <!-- KM ROOFTOP SUITE -->
  <rect x="265" y="58" width="135" height="110" fill="#040c14" stroke="#0891b2" stroke-width="1.2"/>
  <text x="332" y="107" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM SUITE</text>
  <text x="332" y="120" text-anchor="middle" fill="#67e8f9" font-size="7.5">± 28 m²</text>
  <rect x="273" y="65" width="55" height="25" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <circle cx="355" cy="112" r="18" fill="none" stroke="#0891b2" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="355" y="116" text-anchor="middle" fill="#67e8f9" font-size="6">BATHTUB</text>
  <!-- ROOFTOP GARDEN ORGANIC -->
  <ellipse cx="380" cy="190" rx="80" ry="60" fill="#050e08" stroke="#15803d" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="380" y="185" text-anchor="middle" fill="#16a34a" font-size="9" font-weight="600">ROOFTOP</text>
  <text x="380" y="198" text-anchor="middle" fill="#16a34a" font-size="9" font-weight="600">GARDEN</text>
  <text x="380" y="212" text-anchor="middle" fill="#4b5563" font-size="7.5">± 30 m²</text>
  <circle cx="350" cy="175" r="10" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="400" cy="172" r="8" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="380" cy="220" r="9" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <!-- RUANG DUDUK ROOFTOP -->
  <rect x="45" y="208" width="220" height="75" fill="#080d1a" stroke="#3b82f6" stroke-width="1.2"/>
  <text x="155" y="244" text-anchor="middle" fill="#60a5fa" font-size="9" font-weight="600">TERAS ROOFTOP</text>
  <text x="155" y="258" text-anchor="middle" fill="#4b5563" font-size="7.5">R. Duduk + Santai  ± 20 m²</text>
  <rect x="60" y="256" width="80" height="18" rx="2" fill="#0f1e3d" stroke="#3b82f6" stroke-width="0.5"/>
  <!-- TANGGA -->
  <g transform="translate(265,225)">
    <circle cx="0" cy="0" r="24" fill="#050a14" stroke="#3b82f6" stroke-width="1"/>
    <circle cx="0" cy="0" r="7" fill="#080d1a" stroke="#60a5fa" stroke-width="0.7"/>
    <path d="M0,-24 A24,24 0 0,1 24,0" fill="none" stroke="#3b82f6" stroke-width="2.5"/>
    <path d="M24,0 A24,24 0 0,1 0,24" fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.6"/>
    <text x="0" y="3" text-anchor="middle" fill="#60a5fa" font-size="6.5">TANGGA</text>
  </g>
  <!-- NOTES -->
  <rect x="45" y="295" width="425" height="22" rx="4" fill="#080d1a" stroke="#15803d" stroke-width="0.5"/>
  <text x="257" y="310" text-anchor="middle" fill="#16a34a" font-size="8.5">LT.3: Master Suite + KM Suite + Teras Rooftop + Rooftop Garden  |  ≈ 86 m²</text>
  <text x="45" y="335" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.3 ≈ 86 m²  |  TOTAL 3 LANTAI ≈ 260 m²</text>
</svg>`
];

// ============================================================
// PROJECT 3 — Modern Tropis 2 Lantai (260 m²) — 2 TABS
// ============================================================
const denahP3_floors = [
`<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="400" fill="#0e0a05"/>
  <g>${makeTabs(['Lantai 1','Lantai 2'], 0, 2)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#d97706" font-size="10" font-weight="700" letter-spacing="1.5">MODERN TROPIS — LANTAI 1  |  130 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#d97706" stroke-width="0.5" opacity="0.4"/>
  <!-- CARPORT -->
  <rect x="30" y="55" width="140" height="90" fill="#0c0903" stroke="#92400e" stroke-width="1.2"/>
  <rect x="42" y="78" width="110" height="40" rx="3" fill="#181208" stroke="#78350f" stroke-width="0.6"/>
  <text x="100" y="130" text-anchor="middle" fill="#92400e" font-size="9" font-weight="600">CARPORT 1 MOBIL</text>
  <line x1="30" y1="55" x2="170" y2="55" stroke="#d97706" stroke-width="1.5" opacity="0.5"/>
  <!-- TAMAN DEPAN -->
  <rect x="170" y="55" width="90" height="90" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="215" y="95" text-anchor="middle" fill="#16a34a" font-size="8.5" font-weight="600">TAMAN</text>
  <circle cx="192" cy="72" r="12" fill="#052e0a" stroke="#16a34a" stroke-width="0.7"/>
  <circle cx="230" cy="78" r="9" fill="#052e0a" stroke="#16a34a" stroke-width="0.7"/>
  <!-- FOYER -->
  <rect x="260" y="55" width="80" height="60" fill="#100c04" stroke="#d97706" stroke-width="1.2"/>
  <text x="300" y="82" text-anchor="middle" fill="#d97706" font-size="9" font-weight="600">FOYER</text>
  <text x="300" y="96" text-anchor="middle" fill="#4b5563" font-size="7.5">MASUK</text>
  <!-- RUANG TAMU -->
  <rect x="30" y="145" width="200" height="110" fill="#100c04" stroke="#d97706" stroke-width="1.2"/>
  <text x="130" y="193" text-anchor="middle" fill="#fbbf24" font-size="9.5" font-weight="600">RUANG TAMU</text>
  <text x="130" y="208" text-anchor="middle" fill="#4b5563" font-size="7.5">± 38 m²</text>
  <rect x="42" y="222" width="90" height="22" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="42" y="220" width="22" height="26" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="135" y="220" width="22" height="26" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- DAPUR + DINING -->
  <rect x="340" y="55" width="140" height="95" fill="#100c04" stroke="#d97706" stroke-width="1.2"/>
  <text x="410" y="98" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR  ± 22 m²</text>
  <rect x="348" y="60" width="128" height="10" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="348" y="60" width="10" height="85" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- RUANG MAKAN -->
  <rect x="340" y="150" width="140" height="75" fill="#100c04" stroke="#d97706" stroke-width="1.2"/>
  <text x="410" y="185" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="410" y="198" text-anchor="middle" fill="#4b5563" font-size="7.5">± 18 m²</text>
  <rect x="352" y="158" width="95" height="45" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- RUANG KELUARGA -->
  <rect x="230" y="115" width="110" height="90" fill="#100c04" stroke="#d97706" stroke-width="1.2"/>
  <text x="285" y="157" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">R. KELUARGA</text>
  <text x="285" y="170" text-anchor="middle" fill="#4b5563" font-size="7.5">± 28 m²</text>
  <rect x="238" y="180" width="80" height="18" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- WC TAMU -->
  <rect x="230" y="205" width="70" height="50" fill="#050a12" stroke="#0891b2" stroke-width="1.2"/>
  <text x="265" y="228" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC TAMU</text>
  <ellipse cx="265" cy="245" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA -->
  <rect x="300" y="205" width="40" height="50" fill="#0a0804" stroke="#4b5563" stroke-width="0.8"/>
  <text x="320" y="223" text-anchor="middle" fill="#6b7280" font-size="7" font-weight="600">TANGGA</text>
  <line x1="305" y1="212" x2="335" y2="212" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="218" x2="335" y2="218" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="224" x2="335" y2="224" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="230" x2="335" y2="230" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="236" x2="335" y2="236" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="305" y1="242" x2="335" y2="242" stroke="#4b5563" stroke-width="0.5"/>
  <!-- SERVIS -->
  <rect x="30" y="255" width="200" height="40" fill="#0a0a0a" stroke="#374151" stroke-width="0.8"/>
  <text x="130" y="278" text-anchor="middle" fill="#6b7280" font-size="8.5">UTILITAS / LAUNDRY</text>
  <!-- NOTES -->
  <rect x="30" y="305" width="445" height="22" rx="4" fill="#100c04" stroke="#78350f" stroke-width="0.5"/>
  <text x="252" y="320" text-anchor="middle" fill="#d97706" font-size="8.5">LT.1: Carport + Foyer + Living + Keluarga + Dapur + Makan + WC + Laundry  |  ≈ 130 m²</text>
  <text x="30" y="345" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.1 ≈ 130 m²  |  TOTAL 2 LANTAI ≈ 260 m²</text>
</svg>`,
`<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="400" fill="#0e0a05"/>
  <g>${makeTabs(['Lantai 1','Lantai 2'], 1, 2)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#d97706" font-size="10" font-weight="700" letter-spacing="1.5">MODERN TROPIS — LANTAI 2  |  130 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#d97706" stroke-width="0.5" opacity="0.4"/>
  <!-- BALKON KACA -->
  <rect x="30" y="55" width="160" height="45" fill="#091524" stroke="#0891b2" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="110" y="77" text-anchor="middle" fill="#67e8f9" font-size="8.5">BALKON KACA RAILING</text>
  <text x="110" y="89" text-anchor="middle" fill="#4b5563" font-size="7.5">± 14 m²</text>
  <!-- KT UTAMA -->
  <rect x="30" y="100" width="180" height="130" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="120" y="158" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="700">KT UTAMA</text>
  <text x="120" y="172" text-anchor="middle" fill="#4b5563" font-size="7.5">± 40 m²</text>
  <rect x="45" y="188" width="65" height="35" rx="3" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="45" y="188" width="65" height="12" rx="2" fill="#3a2560"/>
  <rect x="168" y="108" width="35" height="20" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>
  <!-- KM UTAMA -->
  <rect x="210" y="100" width="110" height="90" fill="#050a12" stroke="#0891b2" stroke-width="1.2"/>
  <text x="265" y="142" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
  <text x="265" y="155" text-anchor="middle" fill="#4b5563" font-size="7.5">± 14 m²</text>
  <rect x="218" y="108" width="45" height="20" rx="4" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="270" y="108" width="20" height="20" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <!-- KT 2 -->
  <rect x="320" y="55" width="160" height="120" fill="#1f1535" stroke="#7c3aed" stroke-width="1.2"/>
  <text x="400" y="112" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="700">KT 2</text>
  <text x="400" y="126" text-anchor="middle" fill="#4b5563" font-size="7.5">± 28 m²</text>
  <rect x="335" y="140" width="50" height="30" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="335" y="140" width="50" height="11" rx="1" fill="#3a2560"/>
  <!-- KT 3 -->
  <rect x="320" y="175" width="160" height="95" fill="#1f1535" stroke="#7c3aed" stroke-width="1.2"/>
  <text x="400" y="218" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="700">KT 3</text>
  <text x="400" y="232" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
  <rect x="335" y="240" width="45" height="25" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <!-- KM 2 -->
  <rect x="210" y="190" width="110" height="80" fill="#050a12" stroke="#0891b2" stroke-width="1.2"/>
  <text x="265" y="228" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="265" cy="254" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <rect x="217" y="195" width="32" height="16" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>
  <!-- TANGGA -->
  <rect x="30" y="230" width="80" height="65" fill="#0a0804" stroke="#4b5563" stroke-width="0.8"/>
  <text x="70" y="258" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="35" y1="245" x2="105" y2="245" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="252" x2="105" y2="252" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="259" x2="105" y2="259" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="266" x2="105" y2="266" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="273" x2="105" y2="273" stroke="#4b5563" stroke-width="0.5"/>
  <!-- OVERHANG INDICATOR -->
  <rect x="30" y="295" width="450" height="22" rx="4" fill="#0e0a05" stroke="#78350f" stroke-width="0.5" stroke-dasharray="4,3"/>
  <text x="255" y="310" text-anchor="middle" fill="#d97706" font-size="8.5">OVERHANG KAYU ULIN LEBAR — Mengikuti fasad depan bangunan</text>
  <text x="30" y="340" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.2 ≈ 130 m²  |  TOTAL 2 LANTAI ≈ 260 m²</text>
</svg>`
];

// ============================================================
// PROJECT 4 — 3 Lantai Garasi Double (350 m²) — 3 TABS
// Dari gambar: Silinder beton bertumpuk, garasi bawah 2 mobil, balkon kaca
// ============================================================
const denahP4_floors = [
`<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="400" fill="#050a05"/>
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 0, 3)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#22c55e" font-size="10" font-weight="700" letter-spacing="1.5">GARASI DOUBLE — LANTAI 1  |  117 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#22c55e" stroke-width="0.5" opacity="0.4"/>
  <!-- GARASI DOUBLE -->
  <rect x="30" y="55" width="240" height="100" fill="#080e08" stroke="#374151" stroke-width="1.2"/>
  <line x1="150" y1="55" x2="150" y2="155" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
  <rect x="42" y="75" width="96" height="40" rx="3" fill="#0f1a0f" stroke="#4b5563" stroke-width="0.6"/>
  <rect x="158" y="75" width="96" height="40" rx="3" fill="#0f1a0f" stroke="#4b5563" stroke-width="0.6"/>
  <text x="150" y="135" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">GARASI 2 MOBIL  ±  55 m²</text>
  <line x1="30" y1="55" x2="270" y2="55" stroke="#22c55e" stroke-width="2" opacity="0.5"/>
  <!-- FOYER -->
  <rect x="270" y="55" width="110" height="70" fill="#081008" stroke="#22c55e" stroke-width="1.2"/>
  <text x="325" y="87" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">FOYER</text>
  <text x="325" y="100" text-anchor="middle" fill="#4b5563" font-size="7.5">LOBBY</text>
  <!-- LIVING -->
  <rect x="30" y="155" width="200" height="110" fill="#081008" stroke="#22c55e" stroke-width="1.2"/>
  <text x="130" y="204" text-anchor="middle" fill="#4ade80" font-size="9.5" font-weight="600">RUANG TAMU</text>
  <text x="130" y="218" text-anchor="middle" fill="#4b5563" font-size="7.5">± 40 m²</text>
  <rect x="42" y="228" width="90" height="22" rx="1" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
  <rect x="42" y="225" width="22" height="26" rx="1" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
  <!-- DINING -->
  <rect x="230" y="125" width="130" height="80" fill="#081008" stroke="#d97706" stroke-width="1.2"/>
  <text x="295" y="162" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="295" y="175" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
  <rect x="242" y="135" width="90" height="40" rx="1" fill="#0d1808" stroke="#d97706" stroke-width="0.5"/>
  <!-- DAPUR -->
  <rect x="360" y="55" width="120" height="110" fill="#081008" stroke="#d97706" stroke-width="1.2"/>
  <text x="420" y="108" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="420" y="122" text-anchor="middle" fill="#4b5563" font-size="7.5">± 24 m²</text>
  <rect x="368" y="60" width="105" height="10" fill="#0d1a0d" stroke="#d97706" stroke-width="0.5"/>
  <rect x="368" y="60" width="10" height="100" fill="#0d1a0d" stroke="#d97706" stroke-width="0.5"/>
  <!-- WC TAMU -->
  <rect x="360" y="165" width="80" height="65" fill="#040c12" stroke="#0891b2" stroke-width="1.2"/>
  <text x="400" y="195" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC TAMU</text>
  <ellipse cx="400" cy="216" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA -->
  <rect x="230" y="205" width="80" height="60" fill="#060e06" stroke="#4b5563" stroke-width="0.8"/>
  <text x="270" y="228" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="235" y1="215" x2="305" y2="215" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="235" y1="222" x2="305" y2="222" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="235" y1="229" x2="305" y2="229" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="235" y1="236" x2="305" y2="236" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="235" y1="243" x2="305" y2="243" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="235" y1="250" x2="305" y2="250" stroke="#4b5563" stroke-width="0.5"/>
  <!-- TAMAN SAMPING -->
  <rect x="30" y="265" width="200" height="40" fill="#050e05" stroke="#15803d" stroke-width="0.8" stroke-dasharray="3,3"/>
  <text x="130" y="287" text-anchor="middle" fill="#16a34a" font-size="8.5">TAMAN SAMPING</text>
  <!-- NOTES -->
  <rect x="30" y="315" width="445" height="22" rx="4" fill="#081008" stroke="#22c55e" stroke-width="0.5"/>
  <text x="252" y="330" text-anchor="middle" fill="#4ade80" font-size="8.5">LT.1: Garasi 2 Mobil + Foyer + R.Tamu + Makan + Dapur + WC + Taman  |  ≈ 117 m²</text>
  <text x="30" y="355" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.1 ≈ 117 m²  |  TOTAL 3 LANTAI ≈ 350 m²</text>
</svg>`,
`<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="400" fill="#050a05"/>
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 1, 3)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#22c55e" font-size="10" font-weight="700" letter-spacing="1.5">GARASI DOUBLE — LANTAI 2</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#22c55e" stroke-width="0.5" opacity="0.4"/>
  <!-- BALKON KACA MEMANJANG -->
  <rect x="30" y="55" width="320" height="40" fill="#04100a" stroke="#22c55e" stroke-width="1" stroke-dasharray="4,2"/>
  <text x="190" y="73" text-anchor="middle" fill="#4ade80" font-size="8.5">BALKON KACA CANTILEVER  ± 22 m²</text>
  <text x="190" y="86" text-anchor="middle" fill="#4b5563" font-size="7.5">Railing kaca transparan — memanjang</text>
  <!-- KT UTAMA -->
  <rect x="30" y="95" width="200" height="135" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="130" y="158" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="700">KT UTAMA</text>
  <text x="130" y="172" text-anchor="middle" fill="#4b5563" font-size="7.5">± 45 m²</text>
  <rect x="48" y="190" width="65" height="35" rx="3" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="48" y="190" width="65" height="12" rx="2" fill="#3a2560"/>
  <rect x="188" y="102" width="35" height="22" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>
  <text x="205" y="116" text-anchor="middle" fill="#9ca3af" font-size="7">WD</text>
  <!-- KM UTAMA -->
  <rect x="230" y="95" width="125" height="100" fill="#040c12" stroke="#0891b2" stroke-width="1.2"/>
  <text x="292" y="138" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
  <text x="292" y="152" text-anchor="middle" fill="#4b5563" font-size="7.5">EN SUITE  ± 18 m²</text>
  <rect x="238" y="103" width="50" height="22" rx="4" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="296" y="103" width="22" height="22" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <!-- KT 2 -->
  <rect x="355" y="55" width="130" height="130" fill="#1f1535" stroke="#7c3aed" stroke-width="1.2"/>
  <text x="420" y="115" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="700">KT 2</text>
  <text x="420" y="128" text-anchor="middle" fill="#4b5563" font-size="7.5">± 30 m²</text>
  <rect x="370" y="148" width="55" height="32" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="370" y="148" width="55" height="11" rx="1" fill="#3a2560"/>
  <!-- KT 3 -->
  <rect x="230" y="195" width="130" height="100" fill="#1f1535" stroke="#7c3aed" stroke-width="1.2"/>
  <text x="295" y="242" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="700">KT 3</text>
  <text x="295" y="256" text-anchor="middle" fill="#4b5563" font-size="7.5">± 28 m²</text>
  <rect x="245" y="262" width="50" height="28" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <!-- KM 2 -->
  <rect x="355" y="185" width="130" height="80" fill="#040c12" stroke="#0891b2" stroke-width="1.2"/>
  <text x="420" y="222" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="420" cy="249" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <rect x="362" y="190" width="32" height="16" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>
  <!-- TANGGA -->
  <rect x="30" y="230" width="90" height="70" fill="#060e06" stroke="#4b5563" stroke-width="0.8"/>
  <text x="75" y="260" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="35" y1="248" x2="115" y2="248" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="255" x2="115" y2="255" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="262" x2="115" y2="262" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="269" x2="115" y2="269" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="276" x2="115" y2="276" stroke="#4b5563" stroke-width="0.5"/>
  <!-- NOTES -->
  <rect x="30" y="315" width="445" height="22" rx="4" fill="#081008" stroke="#22c55e" stroke-width="0.5"/>
  <text x="252" y="330" text-anchor="middle" fill="#4ade80" font-size="8.5">LT.2: 3 KT + 2 KM + Balkon Kaca Cantilever  |  Luas ≈ 117 m²</text>
  <text x="30" y="355" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.2 ≈ 117 m²  |  TOTAL 3 LANTAI ≈ 350 m²</text>
</svg>`,
`<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="400" fill="#050a05"/>
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 2, 3)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#22c55e" font-size="10" font-weight="700" letter-spacing="1.5">GARASI DOUBLE — LANTAI 3 (ROOFTOP)</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#22c55e" stroke-width="0.5" opacity="0.4"/>
  <!-- ROOFTOP LOUNGE -->
  <rect x="30" y="58" width="440" height="160" fill="#060e06" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="250" y="72" text-anchor="middle" fill="#22c55e" font-size="8" opacity="0.7">ROOFTOP LOUNGE — VOID DOUBLE HEIGHT — ATAP CANTILEVER ANGULAR</text>
  <!-- VOID ZONE -->
  <rect x="60" y="80" width="200" height="120" fill="#04080a" stroke="#60a5fa" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="160" y="132" text-anchor="middle" fill="#60a5fa" font-size="9" font-weight="600">VOID</text>
  <text x="160" y="147" text-anchor="middle" fill="#60a5fa" font-size="9" font-weight="600">DOUBLE HEIGHT</text>
  <text x="160" y="162" text-anchor="middle" fill="#4b5563" font-size="7.5">Cahaya masuk dari atas</text>
  <line x1="60" y1="80" x2="260" y2="200" stroke="#60a5fa" stroke-width="0.5" opacity="0.3"/>
  <line x1="260" y1="80" x2="60" y2="200" stroke="#60a5fa" stroke-width="0.5" opacity="0.3"/>
  <!-- ROOFTOP GARDEN -->
  <rect x="270" y="80" width="190" height="120" fill="#050e05" stroke="#15803d" stroke-width="1.2"/>
  <text x="365" y="133" text-anchor="middle" fill="#16a34a" font-size="9.5" font-weight="600">ROOFTOP</text>
  <text x="365" y="148" text-anchor="middle" fill="#16a34a" font-size="9.5" font-weight="600">GARDEN</text>
  <text x="365" y="163" text-anchor="middle" fill="#4b5563" font-size="7.5">± 40 m²</text>
  <circle cx="310" cy="108" r="12" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="360" cy="102" r="10" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="410" cy="110" r="13" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <!-- LOUNGE AREA -->
  <rect x="30" y="230" width="440" height="75" fill="#081008" stroke="#22c55e" stroke-width="1.2"/>
  <text x="250" y="262" text-anchor="middle" fill="#4ade80" font-size="9.5" font-weight="600">AREA LOUNGE + BBQ ROOFTOP</text>
  <text x="250" y="277" text-anchor="middle" fill="#4b5563" font-size="7.5">Kursi santai + area BBQ outdoor  ± 55 m²</text>
  <rect x="50" y="250" width="90" height="35" rx="2" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
  <rect x="200" y="255" width="35" height="30" rx="2" fill="#0d1a0d" stroke="#4ade80" stroke-width="0.5"/>
  <text x="217" y="273" text-anchor="middle" fill="#4ade80" font-size="7">BBQ</text>
  <!-- TANGGA -->
  <rect x="30" y="305" width="90" height="30" fill="#060e06" stroke="#4b5563" stroke-width="0.8"/>
  <text x="75" y="322" text-anchor="middle" fill="#6b7280" font-size="7.5" font-weight="600">TANGGA ↓ LT.2</text>
  <!-- NOTES -->
  <rect x="130" y="305" width="340" height="22" rx="4" fill="#081008" stroke="#22c55e" stroke-width="0.5"/>
  <text x="300" y="320" text-anchor="middle" fill="#4ade80" font-size="8.5">LT.3: Void + Rooftop Garden + Lounge BBQ  |  ≈ 116 m²</text>
  <text x="30" y="355" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.3 ≈ 116 m²  |  TOTAL 3 LANTAI ≈ 350 m²</text>
</svg>`
];

// ============================================================
// PROJECT 5 — Weird Coffee (50 m²) — 1 LANTAI
// ============================================================
const denahP5_floors = [
`<svg viewBox="0 0 500 380" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="380" fill="#0a0a0a"/>
  <g>${makeTabs(['Denah'], 0, 4)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#f59e0b" font-size="10" font-weight="700" letter-spacing="2">WEIRD COFFEE — DENAH  |  50 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#f59e0b" stroke-width="0.5" opacity="0.4"/>
  <!-- Building outline box -->
  <rect x="50" y="55" width="400" height="220" fill="none" stroke="#374151" stroke-width="2"/>
  <!-- OUTDOOR AREA -->
  <rect x="50" y="55" width="155" height="220" fill="#0f0f0f" stroke="#374151" stroke-width="1"/>
  <text x="127" y="155" text-anchor="middle" fill="#6b7280" font-size="9.5" font-weight="600">OUTDOOR</text>
  <text x="127" y="168" text-anchor="middle" fill="#4b5563" font-size="8">SEMI-TERBUKA</text>
  <text x="127" y="182" text-anchor="middle" fill="#4b5563" font-size="7.5">9 Kursi</text>
  <!-- Tables outdoor -->
  <circle cx="90" cy="100" r="15" fill="none" stroke="#6b7280" stroke-width="0.8"/>
  <circle cx="90" cy="83" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="90" cy="117" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="74" cy="100" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="106" cy="100" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="165" cy="100" r="15" fill="none" stroke="#6b7280" stroke-width="0.8"/>
  <circle cx="165" cy="83" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="165" cy="117" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="149" cy="100" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <circle cx="181" cy="100" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <!-- Planter boxes outdoor -->
  <rect x="54" y="230" width="145" height="16" rx="2" fill="#1a2010" stroke="#15803d" stroke-width="0.8"/>
  <text x="126" y="241" text-anchor="middle" fill="#16a34a" font-size="7">PLANTER BOX</text>
  <!-- BAR COUNTER -->
  <rect x="205" y="55" width="245" height="48" fill="#1a1a1a" stroke="#f59e0b" stroke-width="1.5"/>
  <text x="327" y="75" text-anchor="middle" fill="#f59e0b" font-size="9.5" font-weight="700">BAR COUNTER</text>
  <text x="327" y="90" text-anchor="middle" fill="#6b7280" font-size="7.5">KASIR + DISPLAY KOPI</text>
  <!-- Coffee machines -->
  <rect x="215" y="60" width="20" height="16" rx="2" fill="#252525" stroke="#f59e0b" stroke-width="0.5"/>
  <rect x="240" y="60" width="14" height="16" rx="1" fill="#252525" stroke="#f59e0b" stroke-width="0.5"/>
  <!-- INDOOR AREA -->
  <rect x="205" y="103" width="245" height="172" fill="#111111" stroke="#374151" stroke-width="1"/>
  <text x="327" y="160" text-anchor="middle" fill="#6b7280" font-size="9.5" font-weight="600">AREA INDOOR</text>
  <text x="327" y="174" text-anchor="middle" fill="#4b5563" font-size="8">15 Kursi</text>
  <!-- Indoor tables -->
  <rect x="220" y="130" width="55" height="30" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="213" y="134" width="8" height="22" rx="1" fill="#141414"/>
  <rect x="274" y="134" width="8" height="22" rx="1" fill="#141414"/>
  <rect x="300" y="130" width="55" height="30" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="293" y="134" width="8" height="22" rx="1" fill="#141414"/>
  <rect x="354" y="134" width="8" height="22" rx="1" fill="#141414"/>
  <rect x="380" y="130" width="55" height="30" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="373" y="134" width="8" height="22" rx="1" fill="#141414"/>
  <rect x="434" y="134" width="8" height="22" rx="1" fill="#141414"/>
  <!-- Sofa bench -->
  <rect x="215" y="195" width="225" height="20" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <!-- Chairs bench -->
  <rect x="225" y="178" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="250" y="178" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="275" y="178" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="300" y="178" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <rect x="325" y="178" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
  <!-- WC + STORAGE -->
  <rect x="215" y="225" width="70" height="45" fill="#0d0d0d" stroke="#374151" stroke-width="0.8"/>
  <text x="250" y="245" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">WC</text>
  <ellipse cx="250" cy="260" rx="14" ry="9" fill="none" stroke="#374151" stroke-width="0.7"/>
  <rect x="285" y="225" width="150" height="45" fill="#0d0d0d" stroke="#374151" stroke-width="0.8"/>
  <text x="360" y="245" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">STORAGE / GUDANG</text>
  <!-- ENTRANCE -->
  <line x1="200" y1="275" x2="250" y2="275" stroke="#f59e0b" stroke-width="2" opacity="0.8"/>
  <path d="M200 275 Q225 262 250 275" fill="none" stroke="#f59e0b" stroke-width="0.8" opacity="0.5"/>
  <text x="225" y="290" text-anchor="middle" fill="#f59e0b" font-size="7.5">PINTU MASUK</text>
  <!-- LED indicators -->
  <line x1="50" y1="55" x2="50" y2="275" stroke="#f59e0b" stroke-width="1.5" opacity="0.3" stroke-dasharray="3,6"/>
  <line x1="450" y1="55" x2="450" y2="275" stroke="#f59e0b" stroke-width="1.5" opacity="0.3" stroke-dasharray="3,6"/>
  <!-- SIGNAGE -->
  <rect x="185" y="302" width="180" height="25" rx="4" fill="#1a1a1a" stroke="#f59e0b" stroke-width="1"/>
  <text x="275" y="318" text-anchor="middle" fill="#f59e0b" font-size="11" font-weight="700" letter-spacing="2">Weird Coffee</text>
  <!-- LEGEND -->
  <rect x="50" y="340" width="8" height="8" fill="#0f0f0f" stroke="#374151" stroke-width="1"/>
  <text x="62" y="348" fill="#6b7280" font-size="7.5">Outdoor Semi-terbuka</text>
  <rect x="190" y="340" width="8" height="8" fill="#111111" stroke="#6b7280" stroke-width="1"/>
  <text x="202" y="348" fill="#9ca3af" font-size="7.5">Indoor (15 kursi)</text>
  <rect x="330" y="340" width="8" height="8" fill="#1a1a1a" stroke="#f59e0b" stroke-width="1"/>
  <text x="342" y="348" fill="#f59e0b" font-size="7.5">Bar Counter</text>
  <text x="50" y="368" fill="#4b5563" font-size="7.5">SKALA 1:60  |  TOTAL ≈ 50 m²  |  Indoor: 35 m²  |  Outdoor: 15 m²</text>
</svg>`
];

// ============================================================
// PROJECT 6 — Silinder Organik 3 Lantai (420 m²) — 3 TABS
// Dari gambar: Silinder putih bertumpuk, garasi 3 mobil, overhang kayu
// ============================================================
const denahP6_floors = [
`<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="420" fill="#080510"/>
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 0, 5)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#a78bfa" font-size="10" font-weight="700" letter-spacing="1.5">SILINDER ORGANIK — LANTAI 1  |  140 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#a78bfa" stroke-width="0.5" opacity="0.4"/>
  <!-- KOLOM SILINDER sudut -->
  <circle cx="68" cy="78" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="68" y="82" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <circle cx="445" cy="78" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="445" y="82" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <circle cx="68" cy="268" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="68" y="272" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <circle cx="445" cy="268" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="445" y="272" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <!-- Center column -->
  <circle cx="256" cy="173" r="16" fill="#110e20" stroke="#8b5cf6" stroke-width="1.2"/>
  <text x="256" y="177" text-anchor="middle" fill="#8b5cf6" font-size="6.5" font-weight="600">CORE</text>
  <!-- GARASI 3 MOBIL -->
  <rect x="38" y="55" width="295" height="86" fill="#0c0a1a" stroke="#374151" stroke-width="1.2"/>
  <line x1="133" y1="55" x2="133" y2="141" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
  <line x1="228" y1="55" x2="228" y2="141" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
  <rect x="48" y="70" width="74" height="36" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
  <rect x="143" y="70" width="74" height="36" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
  <rect x="238" y="70" width="74" height="36" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
  <text x="185" y="128" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">GARASI 3 MOBIL  ±  75 m²</text>
  <line x1="38" y1="55" x2="333" y2="55" stroke="#a78bfa" stroke-width="2" opacity="0.5"/>
  <!-- FOYER BUNDAR -->
  <ellipse cx="400" cy="100" rx="60" ry="46" fill="#0d0b1e" stroke="#a78bfa" stroke-width="1.2"/>
  <text x="400" y="97" text-anchor="middle" fill="#c4b5fd" font-size="9" font-weight="600">FOYER</text>
  <text x="400" y="110" text-anchor="middle" fill="#4b5563" font-size="7.5">BUNDAR</text>
  <!-- LIVING ROOM -->
  <rect x="38" y="141" width="215" height="115" fill="#0d0b1e" stroke="#7c3aed" stroke-width="1.2"/>
  <text x="145" y="194" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="600">RUANG TAMU</text>
  <text x="145" y="208" text-anchor="middle" fill="#4b5563" font-size="7.5">± 60 m²</text>
  <path d="M55 228 Q110 210 170 228 L170 243 Q110 225 55 243 Z" fill="#15122a" stroke="#7c3aed" stroke-width="0.8"/>
  <ellipse cx="218" cy="215" rx="24" ry="17" fill="#0d0b1e" stroke="#7c3aed" stroke-width="0.5"/>
  <!-- DINING -->
  <rect x="253" y="141" width="135" height="80" fill="#0d0b1e" stroke="#d97706" stroke-width="1.2"/>
  <text x="320" y="178" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="320" y="192" text-anchor="middle" fill="#4b5563" font-size="7.5">± 30 m²</text>
  <ellipse cx="320" cy="163" rx="38" ry="27" fill="#15122a" stroke="#d97706" stroke-width="0.5"/>
  <circle cx="320" cy="138" r="7" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>
  <circle cx="320" cy="188" r="7" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>
  <circle cx="284" cy="163" r="7" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>
  <circle cx="356" cy="163" r="7" fill="#1a1228" stroke="#d97706" stroke-width="0.4"/>
  <!-- DAPUR -->
  <rect x="388" y="146" width="77" height="85" fill="#0d0b1e" stroke="#d97706" stroke-width="1.2"/>
  <text x="426" y="183" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
  <text x="426" y="196" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
  <rect x="393" y="151" width="67" height="10" fill="#15122a" stroke="#d97706" stroke-width="0.5"/>
  <rect x="393" y="151" width="10" height="76" fill="#15122a" stroke="#d97706" stroke-width="0.5"/>
  <!-- KM LT1 -->
  <rect x="253" y="221" width="85" height="60" fill="#050a14" stroke="#0891b2" stroke-width="1.2"/>
  <text x="295" y="248" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 1</text>
  <rect x="260" y="228" width="32" height="15" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <ellipse cx="295" cy="265" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA MELINGKAR -->
  <g transform="translate(370, 251)">
    <circle cx="0" cy="0" r="30" fill="#080514" stroke="#8b5cf6" stroke-width="1.2"/>
    <circle cx="0" cy="0" r="10" fill="#0d0b1e" stroke="#a78bfa" stroke-width="0.8"/>
    <path d="M0,-30 A30,30 0 0,1 30,0" fill="none" stroke="#8b5cf6" stroke-width="2.5"/>
    <path d="M30,0 A30,30 0 0,1 0,30" fill="none" stroke="#8b5cf6" stroke-width="1.5" opacity="0.6"/>
    <path d="M0,30 A30,30 0 0,1 -30,0" fill="none" stroke="#8b5cf6" stroke-width="1" opacity="0.35"/>
    <text x="0" y="3" text-anchor="middle" fill="#a78bfa" font-size="7" font-weight="600">TANGGA</text>
    <text x="0" y="13" text-anchor="middle" fill="#6b7280" font-size="6">BUNDAR</text>
  </g>
  <!-- UTILITAS -->
  <rect x="38" y="256" width="215" height="40" fill="#080514" stroke="#374151" stroke-width="0.8"/>
  <text x="145" y="278" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">UTILITAS / LAUNDRY  ± 12 m²</text>
  <!-- NOTES -->
  <rect x="38" y="305" width="427" height="22" rx="4" fill="#0d0b1e" stroke="#7c3aed" stroke-width="0.5"/>
  <text x="251" y="320" text-anchor="middle" fill="#c4b5fd" font-size="8.5">LT.1: Garasi 3 Mobil + Foyer + Living + Makan + Dapur + KM + Utilitas  |  ≈ 140 m²</text>
  <text x="38" y="345" fill="#4b5563" font-size="7.5">SKALA 1:150  |  LT.1 ≈ 140 m²  |  TOTAL 3 LANTAI ≈ 420 m²</text>
</svg>`,
`<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="420" fill="#080510"/>
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 1, 5)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#a78bfa" font-size="10" font-weight="700" letter-spacing="1.5">SILINDER ORGANIK — LANTAI 2  |  140 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#a78bfa" stroke-width="0.5" opacity="0.4"/>
  <!-- KOLOM SILINDER -->
  <circle cx="68" cy="88" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="68" y="92" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <circle cx="445" cy="88" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="445" y="92" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <circle cx="68" cy="268" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="68" y="272" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <circle cx="445" cy="268" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="445" y="272" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <!-- BALKON MELINGKAR LT2 -->
  <ellipse cx="250" cy="55" rx="200" ry="20" fill="none" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="5,4" opacity="0.6"/>
  <text x="250" y="58" text-anchor="middle" fill="#8b5cf6" font-size="7.5">← BALKON MELINGKAR ± 25 m² →</text>
  <!-- KT UTAMA -->
  <rect x="38" y="65" width="210" height="135" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="143" y="126" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="700">KT UTAMA</text>
  <text x="143" y="141" text-anchor="middle" fill="#4b5563" font-size="7.5">± 55 m²</text>
  <rect x="55" y="157" width="65" height="37" rx="3" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="55" y="157" width="65" height="13" rx="2" fill="#3a2560"/>
  <rect x="193" y="72" width="45" height="22" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>
  <text x="215" y="85" text-anchor="middle" fill="#9ca3af" font-size="7">WALK-IN</text>
  <!-- KM UTAMA -->
  <rect x="248" y="65" width="130" height="100" fill="#050a14" stroke="#0891b2" stroke-width="1.2"/>
  <text x="313" y="108" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
  <text x="313" y="122" text-anchor="middle" fill="#67e8f9" font-size="7.5">EN SUITE  ± 22 m²</text>
  <rect x="256" y="73" width="50" height="24" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <circle cx="340" cy="130" r="18" fill="none" stroke="#0891b2" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="340" y="134" text-anchor="middle" fill="#67e8f9" font-size="6.5">BATHTUB</text>
  <!-- KT 2 -->
  <rect x="378" y="65" width="90" height="130" fill="#1f1535" stroke="#7c3aed" stroke-width="1.2"/>
  <text x="423" y="128" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="700">KT 2</text>
  <text x="423" y="142" text-anchor="middle" fill="#4b5563" font-size="7.5">± 30 m²</text>
  <rect x="390" y="155" width="50" height="35" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="390" y="155" width="50" height="12" rx="1" fill="#3a2560"/>
  <!-- KT 3 -->
  <rect x="38" y="200" width="130" height="110" fill="#1f1535" stroke="#7c3aed" stroke-width="1.2"/>
  <text x="103" y="252" text-anchor="middle" fill="#c4b5fd" font-size="9.5" font-weight="700">KT 3</text>
  <text x="103" y="266" text-anchor="middle" fill="#4b5563" font-size="7.5">± 28 m²</text>
  <rect x="50" y="272" width="50" height="32" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <!-- KM 2 -->
  <rect x="168" y="200" width="80" height="70" fill="#050a14" stroke="#0891b2" stroke-width="1.2"/>
  <text x="208" y="232" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="208" cy="255" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA BUNDAR -->
  <g transform="translate(320, 245)">
    <circle cx="0" cy="0" r="30" fill="#080514" stroke="#8b5cf6" stroke-width="1.2"/>
    <circle cx="0" cy="0" r="10" fill="#0d0b1e" stroke="#a78bfa" stroke-width="0.8"/>
    <path d="M0,-30 A30,30 0 0,1 30,0" fill="none" stroke="#8b5cf6" stroke-width="2.5"/>
    <path d="M30,0 A30,30 0 0,1 0,30" fill="none" stroke="#8b5cf6" stroke-width="1.5" opacity="0.6"/>
    <text x="0" y="3" text-anchor="middle" fill="#a78bfa" font-size="7" font-weight="600">TANGGA</text>
  </g>
  <!-- UTILITAS -->
  <rect x="248" y="165" width="130" height="60" fill="#080514" stroke="#374151" stroke-width="0.8"/>
  <text x="313" y="193" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">R. BELAJAR</text>
  <text x="313" y="206" text-anchor="middle" fill="#4b5563" font-size="7.5">UTILITAS  ± 18 m²</text>
  <!-- NOTES -->
  <rect x="38" y="320" width="427" height="22" rx="4" fill="#0d0b1e" stroke="#7c3aed" stroke-width="0.5"/>
  <text x="251" y="335" text-anchor="middle" fill="#c4b5fd" font-size="8.5">LT.2: 3 KT + 2 KM En-Suite + R.Belajar + Balkon Melingkar  |  ≈ 140 m²</text>
  <text x="38" y="360" fill="#4b5563" font-size="7.5">SKALA 1:150  |  LT.2 ≈ 140 m²  |  TOTAL 3 LANTAI ≈ 420 m²</text>
</svg>`,
`<svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="420" fill="#080510"/>
  <g>${makeTabs(['Lantai 1','Lantai 2','Lantai 3'], 2, 5)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#a78bfa" font-size="10" font-weight="700" letter-spacing="1.5">SILINDER ORGANIK — LANTAI 3 (ROOFTOP)</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#a78bfa" stroke-width="0.5" opacity="0.4"/>
  <!-- KOLOM SILINDER -->
  <circle cx="68" cy="88" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="68" y="92" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <circle cx="445" cy="88" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="445" y="92" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
  <!-- BALKON MELINGKAR LT3 -->
  <ellipse cx="250" cy="55" rx="200" ry="20" fill="none" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="5,4" opacity="0.6"/>
  <text x="250" y="58" text-anchor="middle" fill="#8b5cf6" font-size="7.5">← BALKON MELINGKAR LT.3 ± 28 m² →</text>
  <!-- MASTER SUITE LT3 -->
  <rect x="38" y="65" width="250" height="155" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
  <text x="163" y="138" text-anchor="middle" fill="#c4b5fd" font-size="10" font-weight="700">MASTER SUITE</text>
  <text x="163" y="152" text-anchor="middle" fill="#a78bfa" font-size="8.5">LT.3 — Puncak Silinder</text>
  <text x="163" y="167" text-anchor="middle" fill="#4b5563" font-size="7.5">± 70 m²</text>
  <rect x="55" y="177" width="70" height="38" rx="3" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.7"/>
  <rect x="55" y="177" width="70" height="13" rx="2" fill="#3a2560"/>
  <rect x="225" y="73" width="50" height="28" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.5"/>
  <text x="250" y="88" text-anchor="middle" fill="#9ca3af" font-size="7.5">WALK-IN</text>
  <!-- KM PREMIUM -->
  <rect x="288" y="65" width="175" height="120" fill="#050a14" stroke="#0891b2" stroke-width="1.2"/>
  <text x="375" y="118" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM SUITE</text>
  <text x="375" y="132" text-anchor="middle" fill="#67e8f9" font-size="7.5">PREMIUM  ± 32 m²</text>
  <rect x="296" y="73" width="58" height="26" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <circle cx="395" cy="150" r="22" fill="none" stroke="#0891b2" stroke-width="0.8" stroke-dasharray="4,2"/>
  <text x="395" y="148" text-anchor="middle" fill="#67e8f9" font-size="6.5">JACUZZI</text>
  <text x="395" y="158" text-anchor="middle" fill="#67e8f9" font-size="6">ROOFTOP</text>
  <!-- ROOFTOP TERRACE MELINGKAR -->
  <ellipse cx="250" cy="290" rx="190" ry="80" fill="#050e08" stroke="#15803d" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="250" y="278" text-anchor="middle" fill="#16a34a" font-size="10" font-weight="600">ROOFTOP TERRACE</text>
  <text x="250" y="293" text-anchor="middle" fill="#16a34a" font-size="8.5">Taman + Santai + 360° View</text>
  <text x="250" y="308" text-anchor="middle" fill="#4b5563" font-size="7.5">± 60 m²</text>
  <circle cx="170" cy="280" r="14" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="330" cy="280" r="14" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <circle cx="250" cy="340" r="12" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
  <!-- TANGGA BUNDAR -->
  <rect x="38" y="220" width="90" height="60" fill="#080514" stroke="#8b5cf6" stroke-width="0.8"/>
  <text x="83" y="250" text-anchor="middle" fill="#a78bfa" font-size="8" font-weight="600">TANGGA</text>
  <text x="83" y="263" text-anchor="middle" fill="#6b7280" font-size="7">↓ LT.2</text>
  <!-- NOTES -->
  <rect x="38" y="375" width="427" height="22" rx="4" fill="#0d0b1e" stroke="#8b5cf6" stroke-width="0.5"/>
  <text x="251" y="390" text-anchor="middle" fill="#c4b5fd" font-size="8.5">LT.3: Master Suite + KM Jacuzzi + Rooftop Terrace 360° + Balkon Melingkar  |  ≈ 140 m²</text>
</svg>`
];

// ============================================================
// PROJECT 7 — Dark Concrete 2 Lantai (240 m²) — 2 TABS
// Dari gambar: Beton gelap, skylight segitiga, curtain wall
// ============================================================
const denahP7_floors = [
`<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="400" fill="#080808"/>
  <g>${makeTabs(['Lantai 1','Lantai 2'], 0, 6)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#e5e7eb" font-size="10" font-weight="700" letter-spacing="1.5">DARK CONCRETE — LANTAI 1  |  120 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#6b7280" stroke-width="0.5" opacity="0.4"/>
  <!-- CURTAIN WALL INDICATOR -->
  <rect x="30" y="55" width="445" height="10" fill="#112233" stroke="#60a5fa" stroke-width="0.8"/>
  <line x1="80" y1="55" x2="80" y2="65" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="140" y1="55" x2="140" y2="65" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="200" y1="55" x2="200" y2="65" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="260" y1="55" x2="260" y2="65" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="320" y1="55" x2="320" y2="65" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="380" y1="55" x2="380" y2="65" stroke="#60a5fa" stroke-width="0.4"/>
  <line x1="420" y1="55" x2="420" y2="65" stroke="#60a5fa" stroke-width="0.4"/>
  <text x="252" y="62" text-anchor="middle" fill="#60a5fa" font-size="6.5" letter-spacing="1">CURTAIN WALL — KACA FULL</text>
  <!-- LIVING OPEN -->
  <rect x="30" y="65" width="220" height="120" fill="#0d0d0d" stroke="#4b5563" stroke-width="1.2"/>
  <text x="140" y="118" text-anchor="middle" fill="#d1d5db" font-size="9.5" font-weight="600">LIVING OPEN</text>
  <text x="140" y="132" text-anchor="middle" fill="#6b7280" font-size="7.5">CURTAIN WALL  ± 45 m²</text>
  <rect x="42" y="148" width="105" height="25" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="42" y="145" width="25" height="29" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="148" y="145" width="25" height="29" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
  <rect x="68" y="128" width="55" height="18" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>
  <!-- SKYLIGHT SEGITIGA -->
  <polygon points="248,65 328,65 288,100" fill="#0a1a2a" stroke="#60a5fa" stroke-width="1.2"/>
  <text x="288" y="92" text-anchor="middle" fill="#60a5fa" font-size="7.5" font-weight="600">SKYLIGHT ▲</text>
  <line x1="268" y1="65" x2="288" y2="98" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
  <line x1="308" y1="65" x2="288" y2="98" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
  <!-- DINING -->
  <rect x="248" y="100" width="140" height="85" fill="#0d0d0d" stroke="#4b5563" stroke-width="1.2"/>
  <text x="318" y="138" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="318" y="152" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
  <rect x="260" y="112" width="100" height="48" rx="0" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <!-- DAPUR INDUSTRIAL -->
  <rect x="388" y="65" width="90" height="120" fill="#0d0d0d" stroke="#4b5563" stroke-width="1.2"/>
  <text x="433" y="118" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">DAPUR</text>
  <text x="433" y="131" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
  <rect x="393" y="70" width="80" height="11" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>
  <rect x="393" y="70" width="11" height="110" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>
  <rect x="415" y="95" width="55" height="28" rx="0" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
  <!-- VOID DOUBLE HEIGHT -->
  <rect x="30" y="185" width="220" height="55" fill="#0a0a0a" stroke="#374151" stroke-width="0.8" stroke-dasharray="4,3"/>
  <text x="140" y="209" text-anchor="middle" fill="#4b5563" font-size="8.5">VOID DOUBLE HEIGHT</text>
  <text x="140" y="223" text-anchor="middle" fill="#374151" font-size="7.5">+ TAMAN KERING</text>
  <!-- WC TAMU -->
  <rect x="248" y="185" width="80" height="55" fill="#0a0e14" stroke="#4b5563" stroke-width="1.2"/>
  <text x="288" y="208" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">WC TAMU</text>
  <ellipse cx="288" cy="228" rx="16" ry="10" fill="none" stroke="#4b5563" stroke-width="0.7"/>
  <rect x="256" y="190" width="32" height="16" rx="3" fill="none" stroke="#4b5563" stroke-width="0.6"/>
  <!-- TANGGA BETON -->
  <rect x="328" y="185" width="80" height="55" fill="#0d0d0d" stroke="#4b5563" stroke-width="0.8"/>
  <text x="368" y="208" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">TANGGA</text>
  <line x1="333" y1="196" x2="403" y2="196" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="333" y1="203" x2="403" y2="203" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="333" y1="210" x2="403" y2="210" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="333" y1="217" x2="403" y2="217" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="333" y1="224" x2="403" y2="224" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="333" y1="231" x2="403" y2="231" stroke="#4b5563" stroke-width="0.5"/>
  <!-- LAUNDRY -->
  <rect x="408" y="185" width="70" height="55" fill="#0a0a0a" stroke="#374151" stroke-width="0.8"/>
  <text x="443" y="210" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">LAUNDRY</text>
  <text x="443" y="224" text-anchor="middle" fill="#4b5563" font-size="7.5">UTILITAS</text>
  <!-- TERAS BETON -->
  <rect x="30" y="240" width="445" height="35" fill="#0a0a0a" stroke="#4b5563" stroke-width="0.8" stroke-dasharray="3,4"/>
  <text x="252" y="260" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">TERAS DEPAN — BETON EKSPOS  ± 20 m²</text>
  <!-- NOTES -->
  <rect x="30" y="285" width="445" height="22" rx="4" fill="#111" stroke="#4b5563" stroke-width="0.5"/>
  <text x="252" y="300" text-anchor="middle" fill="#d1d5db" font-size="8.5">LT.1: Living + Dapur + Makan + WC + Tangga + Void + Teras  |  ≈ 120 m²</text>
  <text x="30" y="325" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.1 ≈ 120 m²  |  TOTAL 2 LANTAI ≈ 240 m²</text>
</svg>`,
`<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="400" fill="#080808"/>
  <g>${makeTabs(['Lantai 1','Lantai 2'], 1, 6)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#e5e7eb" font-size="10" font-weight="700" letter-spacing="1.5">DARK CONCRETE — LANTAI 2  |  120 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#6b7280" stroke-width="0.5" opacity="0.4"/>
  <!-- SKYLIGHT SEGITIGA LT2 (atap) -->
  <polygon points="200,55 350,55 275,88" fill="#0a1a2a" stroke="#60a5fa" stroke-width="1.5"/>
  <text x="275" y="80" text-anchor="middle" fill="#60a5fa" font-size="8" font-weight="600">SKYLIGHT SEGITIGA</text>
  <text x="275" y="92" text-anchor="middle" fill="#60a5fa" font-size="7">Bukaan atap dramatis</text>
  <line x1="240" y1="55" x2="275" y2="86" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
  <line x1="310" y1="55" x2="275" y2="86" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
  <line x1="275" y1="55" x2="275" y2="86" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
  <!-- KT UTAMA -->
  <rect x="30" y="95" width="210" height="140" fill="#1a1a1a" stroke="#4b5563" stroke-width="1.5"/>
  <text x="135" y="160" text-anchor="middle" fill="#d1d5db" font-size="10" font-weight="700">KT UTAMA</text>
  <text x="135" y="175" text-anchor="middle" fill="#6b7280" font-size="7.5">± 45 m²</text>
  <rect x="45" y="188" width="70" height="40" rx="2" fill="#252525" stroke="#4b5563" stroke-width="0.7"/>
  <rect x="45" y="188" width="70" height="14" rx="1" fill="#1f1f1f"/>
  <rect x="193" y="102" width="40" height="24" rx="1" fill="#1f1f1f" stroke="#4b5563" stroke-width="0.5"/>
  <text x="213" y="116" text-anchor="middle" fill="#9ca3af" font-size="7">WDROBE</text>
  <!-- KM UTAMA -->
  <rect x="240" y="95" width="130" height="100" fill="#0a0e14" stroke="#4b5563" stroke-width="1.2"/>
  <text x="305" y="138" text-anchor="middle" fill="#9ca3af" font-size="9" font-weight="600">KM UTAMA</text>
  <text x="305" y="152" text-anchor="middle" fill="#4b5563" font-size="7.5">± 16 m²</text>
  <rect x="248" y="103" width="55" height="26" rx="5" fill="none" stroke="#4b5563" stroke-width="0.8"/>
  <rect x="310" y="103" width="24" height="24" rx="2" fill="none" stroke="#4b5563" stroke-width="0.8"/>
  <!-- KT 2 -->
  <rect x="370" y="55" width="108" height="130" fill="#1a1a1a" stroke="#4b5563" stroke-width="1.2"/>
  <text x="424" y="115" text-anchor="middle" fill="#d1d5db" font-size="9.5" font-weight="700">KT 2</text>
  <text x="424" y="128" text-anchor="middle" fill="#4b5563" font-size="7.5">± 28 m²</text>
  <rect x="383" y="148" width="55" height="32" rx="2" fill="#252525" stroke="#4b5563" stroke-width="0.7"/>
  <!-- KT 3 -->
  <rect x="240" y="195" width="130" height="110" fill="#1a1a1a" stroke="#4b5563" stroke-width="1.2"/>
  <text x="305" y="247" text-anchor="middle" fill="#d1d5db" font-size="9.5" font-weight="700">KT 3</text>
  <text x="305" y="261" text-anchor="middle" fill="#4b5563" font-size="7.5">± 26 m²</text>
  <rect x="253" y="272" width="55" height="30" rx="2" fill="#252525" stroke="#4b5563" stroke-width="0.7"/>
  <!-- KM 2 -->
  <rect x="370" y="185" width="108" height="80" fill="#0a0e14" stroke="#4b5563" stroke-width="1.2"/>
  <text x="424" y="222" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="424" cy="248" rx="18" ry="11" fill="none" stroke="#4b5563" stroke-width="0.7"/>
  <rect x="377" y="190" width="32" height="16" rx="3" fill="none" stroke="#4b5563" stroke-width="0.6"/>
  <!-- BALKON KACA (atas void) -->
  <rect x="30" y="235" width="210" height="45" fill="#0a1a2a" stroke="#60a5fa" stroke-width="1" stroke-dasharray="4,2"/>
  <text x="135" y="257" text-anchor="middle" fill="#60a5fa" font-size="8.5" font-weight="600">BALKON KACA</text>
  <text x="135" y="270" text-anchor="middle" fill="#4b5563" font-size="7.5">Di atas Void — ± 18 m²</text>
  <!-- TANGGA -->
  <rect x="30" y="55" width="85" height="40" fill="#0d0d0d" stroke="#4b5563" stroke-width="0.8"/>
  <text x="72" y="75" text-anchor="middle" fill="#9ca3af" font-size="7.5" font-weight="600">TANGGA ↑↓</text>
  <line x1="35" y1="63" x2="110" y2="63" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="70" x2="110" y2="70" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="77" x2="110" y2="77" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="84" x2="110" y2="84" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="35" y1="91" x2="110" y2="91" stroke="#4b5563" stroke-width="0.5"/>
  <!-- NOTES -->
  <rect x="30" y="295" width="445" height="22" rx="4" fill="#111" stroke="#4b5563" stroke-width="0.5"/>
  <text x="252" y="310" text-anchor="middle" fill="#d1d5db" font-size="8.5">LT.2: 3 KT + 2 KM + Balkon Kaca + Skylight Segitiga  |  ≈ 120 m²</text>
  <text x="30" y="338" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.2 ≈ 120 m²  |  TOTAL 2 LANTAI ≈ 240 m²</text>
</svg>`
];

// ============================================================
// PROJECT 8 — Minimalis Tropis 2 Lantai (260 m²) — 2 TABS
// Dari gambar: Krem putih bersih, louver, carport, balkon kaca
// ============================================================
const denahP8_floors = [
`<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="400" fill="#0e0a04"/>
  <g>${makeTabs(['Lantai 1','Lantai 2'], 0, 7)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#d97706" font-size="10" font-weight="700" letter-spacing="1.5">MINIMALIS TROPIS — LANTAI 1  |  130 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#d97706" stroke-width="0.5" opacity="0.4"/>
  <!-- LOUVER INDICATOR -->
  <line x1="30" y1="55" x2="30" y2="270" stroke="#d97706" stroke-width="2" opacity="0.6"/>
  <line x1="33" y1="60" x2="33" y2="265" stroke="#d97706" stroke-width="1" opacity="0.3"/>
  <line x1="36" y1="60" x2="36" y2="265" stroke="#d97706" stroke-width="1" opacity="0.3"/>
  <line x1="39" y1="60" x2="39" y2="265" stroke="#d97706" stroke-width="1" opacity="0.3"/>
  <text x="22" y="165" text-anchor="middle" fill="#d97706" font-size="6.5" transform="rotate(-90,22,165)" opacity="0.7">LOUVER KAYU</text>
  <!-- CARPORT -->
  <rect x="43" y="55" width="140" height="95" fill="#0c0903" stroke="#92400e" stroke-width="1.2"/>
  <rect x="58" y="78" width="110" height="44" rx="3" fill="#181208" stroke="#78350f" stroke-width="0.6"/>
  <text x="113" y="137" text-anchor="middle" fill="#92400e" font-size="9" font-weight="600">CARPORT 1 MOBIL</text>
  <line x1="43" y1="55" x2="183" y2="55" stroke="#d97706" stroke-width="1.5" opacity="0.5"/>
  <!-- TAMAN MASUK -->
  <rect x="183" y="55" width="100" height="95" fill="#071208" stroke="#15803d" stroke-width="1"/>
  <text x="233" y="95" text-anchor="middle" fill="#16a34a" font-size="8.5" font-weight="600">TAMAN</text>
  <text x="233" y="108" text-anchor="middle" fill="#4b5563" font-size="7.5">MASUK</text>
  <circle cx="200" cy="72" r="13" fill="#052e0a" stroke="#16a34a" stroke-width="0.7"/>
  <circle cx="240" cy="68" r="10" fill="#052e0a" stroke="#16a34a" stroke-width="0.7"/>
  <!-- FOYER -->
  <rect x="283" y="55" width="90" height="65" fill="#100c04" stroke="#d97706" stroke-width="1.2"/>
  <text x="328" y="85" text-anchor="middle" fill="#d97706" font-size="9" font-weight="600">FOYER</text>
  <text x="328" y="99" text-anchor="middle" fill="#4b5563" font-size="7.5">MASUK</text>
  <!-- RUANG TAMU -->
  <rect x="43" y="150" width="210" height="115" fill="#100c04" stroke="#d97706" stroke-width="1.2"/>
  <text x="148" y="202" text-anchor="middle" fill="#fbbf24" font-size="9.5" font-weight="600">RUANG TAMU</text>
  <text x="148" y="217" text-anchor="middle" fill="#4b5563" font-size="7.5">± 38 m²</text>
  <rect x="58" y="230" width="90" height="24" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="58" y="227" width="22" height="28" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="150" y="227" width="22" height="28" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- RUANG KELUARGA -->
  <rect x="253" y="120" width="130" height="100" fill="#100c04" stroke="#d97706" stroke-width="1.2"/>
  <text x="318" y="168" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">R. KELUARGA</text>
  <text x="318" y="182" text-anchor="middle" fill="#4b5563" font-size="7.5">± 30 m²</text>
  <rect x="262" y="192" width="90" height="20" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- DAPUR OPEN -->
  <rect x="373" y="55" width="110" height="100" fill="#100c04" stroke="#d97706" stroke-width="1.2"/>
  <text x="428" y="100" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR OPEN</text>
  <text x="428" y="114" text-anchor="middle" fill="#4b5563" font-size="7.5">± 20 m²</text>
  <rect x="378" y="60" width="100" height="10" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="468" y="60" width="15" height="90" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <rect x="395" y="88" width="72" height="24" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- RUANG MAKAN -->
  <rect x="373" y="155" width="110" height="75" fill="#100c04" stroke="#d97706" stroke-width="1.2"/>
  <text x="428" y="190" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
  <text x="428" y="204" text-anchor="middle" fill="#4b5563" font-size="7.5">± 18 m²</text>
  <rect x="385" y="163" width="90" height="45" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- WC TAMU -->
  <rect x="253" y="220" width="80" height="55" fill="#050a12" stroke="#0891b2" stroke-width="1.2"/>
  <text x="293" y="245" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC TAMU</text>
  <ellipse cx="293" cy="264" rx="16" ry="10" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <!-- TANGGA -->
  <rect x="333" y="220" width="40" height="55" fill="#0d0a04" stroke="#4b5563" stroke-width="0.8"/>
  <text x="353" y="243" text-anchor="middle" fill="#6b7280" font-size="7" font-weight="600">TANGGA</text>
  <line x1="338" y1="230" x2="368" y2="230" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="338" y1="236" x2="368" y2="236" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="338" y1="242" x2="368" y2="242" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="338" y1="248" x2="368" y2="248" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="338" y1="254" x2="368" y2="254" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="338" y1="260" x2="368" y2="260" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="338" y1="266" x2="368" y2="266" stroke="#4b5563" stroke-width="0.5"/>
  <!-- UTILITAS -->
  <rect x="43" y="265" width="210" height="38" fill="#0a0804" stroke="#374151" stroke-width="0.8"/>
  <text x="148" y="287" text-anchor="middle" fill="#6b7280" font-size="8.5">UTILITAS / LAUNDRY</text>
  <!-- NOTES -->
  <rect x="43" y="313" width="440" height="22" rx="4" fill="#100c04" stroke="#78350f" stroke-width="0.5"/>
  <text x="263" y="328" text-anchor="middle" fill="#d97706" font-size="8.5">LT.1: Carport + Foyer + Taman + Living + Keluarga + Dapur + Makan + WC  |  ≈ 130 m²</text>
  <text x="43" y="355" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.1 ≈ 130 m²  |  TOTAL 2 LANTAI ≈ 260 m²</text>
</svg>`,
`<svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
  <rect width="500" height="400" fill="#0e0a04"/>
  <g>${makeTabs(['Lantai 1','Lantai 2'], 1, 7)}</g>
  <text x="250" y="42" text-anchor="middle" fill="#d97706" font-size="10" font-weight="700" letter-spacing="1.5">MINIMALIS TROPIS — LANTAI 2  |  130 m²</text>
  <line x1="40" y1="48" x2="460" y2="48" stroke="#d97706" stroke-width="0.5" opacity="0.4"/>
  <!-- LOUVER LT2 -->
  <line x1="30" y1="55" x2="30" y2="280" stroke="#d97706" stroke-width="2" opacity="0.6"/>
  <line x1="33" y1="60" x2="33" y2="275" stroke="#d97706" stroke-width="1" opacity="0.3"/>
  <line x1="36" y1="60" x2="36" y2="275" stroke="#d97706" stroke-width="1" opacity="0.3"/>
  <!-- BALKON KACA RAILING -->
  <rect x="43" y="55" width="170" height="45" fill="#091524" stroke="#0891b2" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="128" y="75" text-anchor="middle" fill="#67e8f9" font-size="8.5">BALKON KACA RAILING</text>
  <text x="128" y="88" text-anchor="middle" fill="#4b5563" font-size="7.5">± 14 m²</text>
  <!-- KT UTAMA -->
  <rect x="43" y="100" width="205" height="135" fill="#100c04" stroke="#d97706" stroke-width="1.5"/>
  <text x="145" y="162" text-anchor="middle" fill="#fbbf24" font-size="10" font-weight="700">KT UTAMA</text>
  <text x="145" y="177" text-anchor="middle" fill="#4b5563" font-size="7.5">± 40 m²</text>
  <rect x="58" y="192" width="68" height="38" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.7"/>
  <rect x="58" y="192" width="68" height="13" rx="2" fill="#1a1208"/>
  <rect x="193" y="108" width="46" height="24" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <text x="216" y="123" text-anchor="middle" fill="#9ca3af" font-size="7">WDROBE</text>
  <!-- KM UTAMA -->
  <rect x="248" y="100" width="125" height="100" fill="#050a12" stroke="#0891b2" stroke-width="1.2"/>
  <text x="310" y="145" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
  <text x="310" y="159" text-anchor="middle" fill="#4b5563" font-size="7.5">± 14 m²</text>
  <rect x="256" y="108" width="52" height="26" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <rect x="316" y="108" width="24" height="24" rx="2" fill="none" stroke="#0891b2" stroke-width="0.8"/>
  <!-- KT 2 -->
  <rect x="373" y="55" width="110" height="140" fill="#100c04" stroke="#d97706" stroke-width="1.2"/>
  <text x="428" y="122" text-anchor="middle" fill="#fbbf24" font-size="9.5" font-weight="700">KT 2</text>
  <text x="428" y="137" text-anchor="middle" fill="#4b5563" font-size="7.5">± 28 m²</text>
  <rect x="385" y="153" width="55" height="35" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.7"/>
  <rect x="385" y="153" width="55" height="12" rx="1" fill="#1a1208"/>
  <!-- KM 2 -->
  <rect x="248" y="200" width="125" height="80" fill="#050a12" stroke="#0891b2" stroke-width="1.2"/>
  <text x="310" y="238" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
  <ellipse cx="310" cy="263" rx="18" ry="11" fill="none" stroke="#0891b2" stroke-width="0.7"/>
  <rect x="255" y="205" width="34" height="18" rx="3" fill="none" stroke="#0891b2" stroke-width="0.6"/>
  <!-- R. BELAJAR -->
  <rect x="373" y="195" width="110" height="80" fill="#0f0c04" stroke="#d97706" stroke-width="1"/>
  <text x="428" y="230" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">R. BELAJAR</text>
  <text x="428" y="244" text-anchor="middle" fill="#4b5563" font-size="7.5">± 18 m²</text>
  <rect x="383" y="203" width="85" height="16" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
  <!-- TANGGA -->
  <rect x="43" y="235" width="90" height="65" fill="#0a0804" stroke="#4b5563" stroke-width="0.8"/>
  <text x="88" y="267" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
  <line x1="48" y1="252" x2="128" y2="252" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="48" y1="259" x2="128" y2="259" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="48" y1="266" x2="128" y2="266" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="48" y1="273" x2="128" y2="273" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="48" y1="280" x2="128" y2="280" stroke="#4b5563" stroke-width="0.5"/>
  <line x1="48" y1="287" x2="128" y2="287" stroke="#4b5563" stroke-width="0.5"/>
  <!-- VOID / ATAP OVERHANG INDICATOR -->
  <rect x="133" y="235" width="115" height="65" fill="#050e05" stroke="#15803d" stroke-width="0.8" stroke-dasharray="3,3"/>
  <text x="190" y="260" text-anchor="middle" fill="#16a34a" font-size="8">OVERHANG</text>
  <text x="190" y="274" text-anchor="middle" fill="#4b5563" font-size="7.5">KAYU  ± 14 m²</text>
  <!-- NOTES -->
  <rect x="43" y="313" width="440" height="22" rx="4" fill="#100c04" stroke="#78350f" stroke-width="0.5"/>
  <text x="263" y="328" text-anchor="middle" fill="#d97706" font-size="8.5">LT.2: 2 KT + 2 KM + R.Belajar + Balkon Kaca + Louver Kayu + Overhang  |  ≈ 130 m²</text>
  <text x="43" y="355" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.2 ≈ 130 m²  |  TOTAL 2 LANTAI ≈ 260 m²</text>
</svg>`
];

// ============================================================
// Mapping denah ke projects — index per project, array of SVG
// ============================================================
const denahMap = [
    denahP1_floors,  // Project 0 — 3 lantai
    denahP2_floors,  // Project 1 — 3 lantai
    denahP3_floors,  // Project 2 — 2 lantai
    denahP4_floors,  // Project 3 — 3 lantai
    denahP5_floors,  // Project 4 — 1 lantai (Weird Coffee)
    denahP6_floors,  // Project 5 — 3 lantai
    denahP7_floors,  // Project 6 — 2 lantai
    denahP8_floors,  // Project 7 — 2 lantai
];

// Current floor index per project
const currentFloors = [0, 0, 0, 0, 0, 0, 0, 0];

// Function dipanggil dari SVG onclick
function showDenahFloor(projectIdx, floorIdx) {
    currentFloors[projectIdx] = floorIdx;
    const floors = denahMap[projectIdx];
    if (!floors || !floors[floorIdx]) return;
    const denahSvgEl = document.getElementById('denahSvg');
    if (denahSvgEl) {
        denahSvgEl.innerHTML = floors[floorIdx];
    }
}

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

    // Load floor 0 by default each time modal opens
    currentFloors[idx] = 0;
    const floors = denahMap[idx];
    const denahSvgEl = document.getElementById('denahSvg');
    if (denahSvgEl) {
        denahSvgEl.innerHTML = (floors && floors[0]) ? floors[0] : `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                        padding:40px;color:#888;text-align:center;gap:12px">
                <i class="ti ti-layout-2" style="font-size:48px;opacity:0.4"></i>
                <p style="font-size:13px;margin:0">Denah belum tersedia.</p>
            </div>`;
    }

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

// BUG FIX #11: switchTab() update aria-selected
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
    // BUG FIX #12: Inisialisasi statsCounter SEKALI
    initStatsCounter();
    initChatNotification();
    init();

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

// Custom cursor
const cur = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{
  mx=e.clientX; my=e.clientY;
  cur.style.left=(mx-4)+'px'; cur.style.top=(my-4)+'px';
});
function animRing(){
  rx+=(mx-rx)*.12; ry+=(my-ry)*.12;
  ring.style.left=(rx-18)+'px'; ring.style.top=(ry-18)+'px';
  requestAnimationFrame(animRing);
}
animRing();
document.addEventListener('mousedown',()=>cur.style.transform='scale(2.5)');
document.addEventListener('mouseup',()=>cur.style.transform='scale(1)');
 
// Canvas: particles + lines
const canvas=document.getElementById('bg-canvas');
const ctx=canvas.getContext('2d');
let W,H,particles=[];
 
function resize(){
  W=canvas.width=window.innerWidth;
  H=canvas.height=window.innerHeight;
}
resize();
window.addEventListener('resize',()=>{resize();init()});
 
class Particle{
  constructor(){this.reset()}
  reset(){
    this.x=Math.random()*W;
    this.y=Math.random()*H;
    this.vx=(Math.random()-.5)*.4;
    this.vy=(Math.random()-.5)*.4;
    this.r=Math.random()*1.5+.5;
    this.alpha=Math.random()*.5+.1;
    this.color=Math.random()>.5?'23,195,255':'124,58,237';
  }
  update(){
    this.x+=this.vx; this.y+=this.vy;
    if(this.x<0||this.x>W||this.y<0||this.y>H)this.reset();
  }
  draw(){
    ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(${this.color},${this.alpha})`;ctx.fill();
  }
}
 
// Floating architecture nodes
class Node{
  constructor(){this.reset()}
  reset(){
    this.x=Math.random()*W; this.y=Math.random()*H;
    this.vx=(Math.random()-.5)*.25; this.vy=(Math.random()-.5)*.25;
    this.size=Math.random()*3+2;
    this.type=Math.floor(Math.random()*3); // 0=dot, 1=square, 2=cross
  }
  update(){
    this.x+=this.vx; this.y+=this.vy;
    if(this.x<0||this.x>W||this.y<0||this.y>H)this.reset();
  }
  draw(){
    ctx.save();
    ctx.strokeStyle='rgba(23,195,255,.15)';
    ctx.fillStyle='rgba(23,195,255,.08)';
    ctx.lineWidth=1;
    ctx.translate(this.x,this.y);
    if(this.type===0){
      ctx.beginPath();ctx.arc(0,0,this.size,0,Math.PI*2);ctx.fill();
    }else if(this.type===1){
      ctx.strokeRect(-this.size,-this.size,this.size*2,this.size*2);
    }else{
      ctx.beginPath();
      ctx.moveTo(-this.size,0);ctx.lineTo(this.size,0);
      ctx.moveTo(0,-this.size);ctx.lineTo(0,this.size);
      ctx.stroke();
    }
    ctx.restore();
  }
}
 
function init(){
  particles=[];
  for(let i=0;i<90;i++) particles.push(new Particle());
  for(let i=0;i<30;i++) particles.push(new Node());
}
init();
 
function drawConnections(){
  for(let i=0;i<particles.length;i++){
    for(let j=i+1;j<particles.length;j++){
      if(!(particles[i] instanceof Node)||!(particles[j] instanceof Node))continue;
      const dx=particles[i].x-particles[j].x;
      const dy=particles[i].y-particles[j].y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<120){
        ctx.beginPath();
        ctx.moveTo(particles[i].x,particles[i].y);
        ctx.lineTo(particles[j].x,particles[j].y);
        const a=(1-dist/120)*.08;
        ctx.strokeStyle=`rgba(75,106,255,${a})`;
        ctx.lineWidth=.5;ctx.stroke();
      }
    }
  }
}
 
// Mouse-reactive ripple
let mouseX=W/2,mouseY=H/2;
document.addEventListener('mousemove',e=>{mouseX=e.clientX;mouseY=e.clientY});
 
// Animated measurement lines (blueprint style)
let lineAnim=0;
function drawBlueprintLines(){
  lineAnim+=.003;
  const lines=[
    {x1:0,y1:H*.2,x2:W*.15,y2:H*.2},
    {x1:W*.85,y1:H*.3,x2:W,y2:H*.3},
    {x1:0,y1:H*.7,x2:W*.12,y2:H*.7},
    {x1:W*.88,y1:H*.75,x2:W,y2:H*.75},
  ];
  lines.forEach((l,i)=>{
    const prog=(Math.sin(lineAnim+i*.8)+1)/2;
    ctx.save();
    ctx.strokeStyle=`rgba(23,195,255,${.06+prog*.04})`;
    ctx.lineWidth=.5;
    ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(l.x1,l.y1);ctx.lineTo(l.x2,l.y2);ctx.stroke();
    // Tick marks
    ctx.setLineDash([]);
    const midX=(l.x1+l.x2)/2; const midY=(l.y1+l.y2)/2;
    ctx.beginPath();ctx.moveTo(midX,midY-4);ctx.lineTo(midX,midY+4);ctx.stroke();
    ctx.restore();
  });
}
 
let raf;
function draw(){
  ctx.clearRect(0,0,W,H);
  
  // Dark vignette
  const vg=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*.7);
  vg.addColorStop(0,'rgba(5,10,20,0)');
  vg.addColorStop(1,'rgba(3,6,14,.7)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
 
  drawBlueprintLines();
  particles.forEach(p=>{p.update();p.draw()});
  drawConnections();
 
  // Mouse glow
  const mg=ctx.createRadialGradient(mouseX,mouseY,0,mouseX,mouseY,200);
  mg.addColorStop(0,'rgba(23,195,255,.04)');
  mg.addColorStop(1,'rgba(23,195,255,0)');
  ctx.fillStyle=mg;ctx.fillRect(0,0,W,H);
 
  raf=requestAnimationFrame(draw);
}
draw();
 
// Parallax on logo
const logoWrap=document.getElementById('logoWrap');
document.addEventListener('mousemove',e=>{
  const cx=W/2,cy=H/2;
  const dx=(e.clientX-cx)/cx;
  const dy=(e.clientY-cy)/cy;
  logoWrap.style.transform=`translate(${dx*8}px,${dy*6}px)`;
});
 
// Count-up animation
function countUp(el,target){
  let current=0;
  const step=target/60;
  const timer=setInterval(()=>{
    current+=step;
    if(current>=target){current=target;clearInterval(timer)}
    el.textContent=Math.round(current)+(el.dataset.suffix||'');
  },25);
}
setTimeout(()=>{
  document.querySelectorAll('.counting').forEach(el=>{
    countUp(el,parseInt(el.dataset.target));
  });
},1200);

