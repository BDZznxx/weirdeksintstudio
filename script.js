'use strict';
 
const state = {
    isMenuOpen: false,
    isScrolled: false
};
 
async function fetchGlobalStats() {
    try {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('/simpanstats.php', { signal: controller.signal });
        clearTimeout(timeoutId);

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
        const rawAvg            = this.stats.totalRating / this.stats.ratingCount;
        const avgRating         = Math.min(5.0, rawAvg).toFixed(1);

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
// PROJECTS array untuk tab denah interaktif
// ============================================================
const PROJECTS=[
{id:0,name:"Mansion Classic Modern",short:"Mansion",color:"#c9a96e",floors:[
{label:"LT.1",info:[["Luas","≈200m²"],["Fungsi","Garasi, Foyer, Tamu, Makan, Dapur"],["KM","2 (Tamu+Utama)"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<defs><pattern id="h1" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#555" stroke-width="0.5" opacity="0.3"/></pattern></defs>
<rect width="520" height="400" fill="#0d0d1a"/>
<text x="260" y="20" text-anchor="middle" fill="#c9a96e" font-size="10" font-weight="600" letter-spacing="2">LANTAI 1 — MANSION CLASSIC MODERN</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#c9a96e" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="150" height="85" fill="#2a2a3e" stroke="#6b7280" stroke-width="1"/>
<rect x="30" y="35" width="150" height="85" fill="url(#h1)"/>
<text x="105" y="73" text-anchor="middle" fill="#9ca3af" font-size="9" font-weight="500">GARASI 2 MOBIL</text>
<rect x="42" y="62" width="28" height="12" rx="2" fill="#374151" stroke="#6b7280" stroke-width="0.5"/>
<rect x="98" y="62" width="28" height="12" rx="2" fill="#374151" stroke="#6b7280" stroke-width="0.5"/>
<rect x="180" y="35" width="80" height="50" fill="#1a1f3a" stroke="#c9a96e" stroke-width="1"/>
<text x="220" y="57" text-anchor="middle" fill="#c9a96e" font-size="8.5" font-weight="600">FOYER</text>
<path d="M195 35 Q220 27 245 35" fill="none" stroke="#c9a96e" stroke-width="1" opacity="0.5"/>
<rect x="260" y="35" width="120" height="110" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
<text x="320" y="84" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">RUANG TAMU</text>
<text x="320" y="96" text-anchor="middle" fill="#6b7280" font-size="7.5">± 40 m²</text>
<rect x="275" y="100" width="50" height="14" rx="2" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.5"/>
<rect x="380" y="35" width="110" height="80" fill="#1a1a2e" stroke="#d97706" stroke-width="1"/>
<text x="435" y="72" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
<text x="435" y="84" text-anchor="middle" fill="#6b7280" font-size="7.5">± 25 m²</text>
<rect x="403" y="46" width="58" height="22" rx="2" fill="#292929" stroke="#d97706" stroke-width="0.5"/>
<rect x="380" y="115" width="110" height="70" fill="#1a1a2e" stroke="#d97706" stroke-width="1"/>
<text x="435" y="147" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
<text x="435" y="159" text-anchor="middle" fill="#6b7280" font-size="7.5">± 20 m²</text>
<rect x="383" y="120" width="100" height="10" rx="1" fill="#252535" stroke="#d97706" stroke-width="0.5"/>
<rect x="180" y="85" width="50" height="38" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="205" y="101" text-anchor="middle" fill="#67e8f9" font-size="7.5" font-weight="600">WC TAMU</text>
<rect x="30" y="155" width="220" height="100" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
<text x="140" y="200" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">RUANG KELUARGA</text>
<text x="140" y="212" text-anchor="middle" fill="#6b7280" font-size="7.5">± 45 m²</text>
<rect x="40" y="215" width="120" height="18" rx="2" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.5"/>
<rect x="250" y="175" width="130" height="100" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
<text x="315" y="219" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT UTAMA</text>
<text x="315" y="231" text-anchor="middle" fill="#6b7280" font-size="7.5">± 35 m²</text>
<rect x="260" y="235" width="55" height="28" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="380" y="185" width="110" height="58" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="435" y="210" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM UTAMA</text>
<text x="435" y="222" text-anchor="middle" fill="#6b7280" font-size="7.5">EN SUITE</text>
<rect x="393" y="194" width="38" height="16" rx="4" fill="none" stroke="#0891b2" stroke-width="0.8"/>
<rect x="30" y="270" width="120" height="90" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
<text x="90" y="312" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 2</text>
<text x="90" y="324" text-anchor="middle" fill="#6b7280" font-size="7.5">± 20 m²</text>
<rect x="40" y="280" width="44" height="28" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="150" y="270" width="100" height="90" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
<text x="200" y="312" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 3</text>
<text x="200" y="324" text-anchor="middle" fill="#6b7280" font-size="7.5">± 18 m²</text>
<rect x="158" y="280" width="40" height="26" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="250" y="280" width="80" height="55" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="290" y="305" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
<text x="290" y="317" text-anchor="middle" fill="#6b7280" font-size="7.5">± 8 m²</text>
<rect x="330" y="270" width="60" height="55" fill="#1e1e2e" stroke="#6b7280" stroke-width="0.8"/>
<text x="360" y="300" text-anchor="middle" fill="#9ca3af" font-size="8">TANGGA</text>
<line x1="335" y1="278" x2="385" y2="278" stroke="#6b7280" stroke-width="0.5"/>
<line x1="335" y1="285" x2="385" y2="285" stroke="#6b7280" stroke-width="0.5"/>
<line x1="335" y1="292" x2="385" y2="292" stroke="#6b7280" stroke-width="0.5"/>
<line x1="335" y1="299" x2="385" y2="299" stroke="#6b7280" stroke-width="0.5"/>
<line x1="335" y1="306" x2="385" y2="306" stroke="#6b7280" stroke-width="0.5"/>
<rect x="390" y="270" width="100" height="55" fill="#1a1a2e" stroke="#374151" stroke-width="1"/>
<text x="440" y="295" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">LAUNDRY</text>
<text x="440" y="307" text-anchor="middle" fill="#6b7280" font-size="7.5">UTILITAS</text>
<g transform="translate(468,352)"><circle cx="0" cy="0" r="13" fill="none" stroke="#c9a96e" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#c9a96e"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#6b7280" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#c9a96e" font-size="7" font-weight="700">U</text></g>
<text x="30" y="388" fill="#6b7280" font-size="7.5">SKALA 1:150  |  LT.1 ≈ 200 m²</text>
</svg>`},
{label:"LT.2",info:[["Luas","≈200m²"],["Fungsi","3KT+2KM, Balkon, Ruang Belajar"],["Balkon","Neo-Classical"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#0d0d1a"/>
<text x="260" y="20" text-anchor="middle" fill="#c9a96e" font-size="10" font-weight="600" letter-spacing="2">LANTAI 2 — MANSION CLASSIC MODERN</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#c9a96e" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="260" height="18" rx="3" fill="#111827" stroke="#c9a96e" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="160" y="48" text-anchor="middle" fill="#c9a96e" font-size="7.5">← BALKON KLASIK DEPAN →</text>
<rect x="30" y="55" width="165" height="130" fill="#1f1535" stroke="#7c3aed" stroke-width="1.5"/>
<text x="112" y="114" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT MASTER SUITE</text>
<text x="112" y="126" text-anchor="middle" fill="#6b7280" font-size="7.5">± 45 m²</text>
<rect x="45" y="140" width="65" height="35" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="45" y="140" width="65" height="12" rx="1" fill="#3a2560"/>
<rect x="120" y="145" width="30" height="18" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.4"/>
<rect x="30" y="55" width="165" height="8" fill="#221035" stroke="#7c3aed" stroke-width="0.4"/>
<text x="112" y="64" text-anchor="middle" fill="#c9a96e" font-size="7" font-weight="600">KEPALA RANJANG</text>
<rect x="195" y="55" width="100" height="130" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="245" y="108" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM MASTER</text>
<text x="245" y="120" text-anchor="middle" fill="#6b7280" font-size="7.5">PREMIUM</text>
<rect x="203" y="65" width="50" height="22" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
<text x="228" y="80" text-anchor="middle" fill="#67e8f9" font-size="7">BATHTUB</text>
<rect x="255" y="65" width="32" height="22" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="271" y="80" text-anchor="middle" fill="#67e8f9" font-size="7">SHOWER</text>
<rect x="203" y="138" width="30" height="18" rx="4" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="218" y="150" text-anchor="middle" fill="#67e8f9" font-size="7">WC</text>
<rect x="295" y="35" width="220" height="60" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
<text x="405" y="61" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">VOID — RUANG TAMU BAWAH</text>
<text x="405" y="73" text-anchor="middle" fill="#4b5563" font-size="7.5">Double height ceiling</text>
<line x1="295" y1="35" x2="515" y2="95" stroke="#4f46e5" stroke-width="0.4" stroke-dasharray="3,3" opacity="0.4"/>
<line x1="515" y1="35" x2="295" y2="95" stroke="#4f46e5" stroke-width="0.4" stroke-dasharray="3,3" opacity="0.4"/>
<rect x="295" y="95" width="100" height="90" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
<text x="345" y="135" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 4</text>
<text x="345" y="147" text-anchor="middle" fill="#6b7280" font-size="7.5">± 22 m²</text>
<rect x="303" y="152" width="52" height="28" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="395" y="95" width="120" height="90" fill="#1f1535" stroke="#7c3aed" stroke-width="1"/>
<text x="455" y="135" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 5</text>
<text x="455" y="147" text-anchor="middle" fill="#6b7280" font-size="7.5">± 22 m²</text>
<rect x="403" y="152" width="52" height="28" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="30" y="185" width="90" height="60" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="75" y="211" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 3</text>
<rect x="38" y="192" width="30" height="15" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<ellipse cx="75" cy="232" rx="14" ry="8" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="120" y="185" width="175" height="60" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
<text x="207" y="210" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG BELAJAR</text>
<text x="207" y="222" text-anchor="middle" fill="#6b7280" font-size="7.5">± 30 m²</text>
<rect x="128" y="193" width="80" height="20" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.4"/>
<rect x="295" y="185" width="80" height="60" fill="#1e1e2e" stroke="#6b7280" stroke-width="0.8"/>
<text x="335" y="212" text-anchor="middle" fill="#9ca3af" font-size="8">TANGGA</text>
<line x1="300" y1="193" x2="370" y2="193" stroke="#6b7280" stroke-width="0.5"/>
<line x1="300" y1="200" x2="370" y2="200" stroke="#6b7280" stroke-width="0.5"/>
<line x1="300" y1="207" x2="370" y2="207" stroke="#6b7280" stroke-width="0.5"/>
<line x1="300" y1="214" x2="370" y2="214" stroke="#6b7280" stroke-width="0.5"/>
<line x1="300" y1="221" x2="370" y2="221" stroke="#6b7280" stroke-width="0.5"/>
<rect x="375" y="185" width="140" height="100" fill="#1a1a2e" stroke="#374151" stroke-width="1"/>
<text x="445" y="228" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">TERAS / BALKON</text>
<text x="445" y="240" text-anchor="middle" fill="#6b7280" font-size="7.5">BELAKANG</text>
<rect x="383" y="193" width="124" height="84" fill="none" stroke="#c9a96e" stroke-width="0.5" stroke-dasharray="3,3"/>
<rect x="30" y="260" width="345" height="100" fill="#0a0a14" stroke="#333" stroke-width="0.8" stroke-dasharray="4,4"/>
<text x="202" y="307" text-anchor="middle" fill="#374151" font-size="9">AREA SERVIS / UTILITAS / LIFT BARANG</text>
<g transform="translate(468,355)"><circle cx="0" cy="0" r="13" fill="none" stroke="#c9a96e" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#c9a96e"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#6b7280" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#c9a96e" font-size="7" font-weight="700">U</text></g>
<text x="30" y="386" fill="#6b7280" font-size="7.5">SKALA 1:150  |  LT.2 ≈ 200 m²  |  5 KT + 2 KM</text>
</svg>`},
{label:"LT.3",info:[["Luas","≈200m²"],["Fungsi","Rooftop, Jacuzzi, Sky Lounge, Void"],["Spesial","Sky lounge 360°"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#0d0d1a"/>
<text x="260" y="20" text-anchor="middle" fill="#c9a96e" font-size="10" font-weight="600" letter-spacing="2">LANTAI 3 — ROOFTOP MANSION CLASSIC</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#c9a96e" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="460" height="310" fill="#0a0814" stroke="#c9a96e" stroke-width="1" stroke-dasharray="6,3"/>
<text x="50" y="52" fill="#c9a96e" font-size="8" font-weight="600">ROOFTOP TERRACE</text>
<rect x="40" y="58" width="160" height="120" fill="#1a1f3a" stroke="#4f46e5" stroke-width="1.2"/>
<text x="120" y="113" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">SKY LOUNGE</text>
<text x="120" y="125" text-anchor="middle" fill="#6b7280" font-size="7.5">± 60 m²</text>
<rect x="52" y="130" width="90" height="30" rx="3" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.5"/>
<rect x="52" y="115" width="20" height="45" rx="2" fill="#2a2a4e" stroke="#4f46e5" stroke-width="0.4"/>
<ellipse cx="148" cy="100" rx="16" ry="12" fill="none" stroke="#4f46e5" stroke-width="0.5" stroke-dasharray="2,2"/>
<text x="148" y="103" text-anchor="middle" fill="#818cf8" font-size="7">COFFEE TABLE</text>
<rect x="200" y="58" width="160" height="120" fill="#0e1a35" stroke="#0891b2" stroke-width="1.5"/>
<text x="280" y="100" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">JACUZZI / POOL</text>
<text x="280" y="112" text-anchor="middle" fill="#6b7280" font-size="7.5">OUTDOOR ± 35 m²</text>
<ellipse cx="280" cy="140" rx="60" ry="24" fill="#0a2535" stroke="#0891b2" stroke-width="1.5"/>
<ellipse cx="280" cy="138" rx="52" ry="18" fill="none" stroke="#0891b2" stroke-width="0.5" stroke-dasharray="3,3"/>
<text x="280" y="142" text-anchor="middle" fill="#67e8f9" font-size="7.5" font-weight="600">KOLAM RENDAM</text>
<rect x="360" y="58" width="120" height="120" fill="#1a1a2e" stroke="#d97706" stroke-width="1"/>
<text x="420" y="110" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">OUTDOOR</text>
<text x="420" y="122" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DINING</text>
<text x="420" y="134" text-anchor="middle" fill="#6b7280" font-size="7.5">± 30 m²</text>
<rect x="372" y="70" width="96" height="50" rx="3" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
<rect x="366" y="75" width="8" height="40" rx="1" fill="#1a1208"/>
<rect x="466" y="75" width="8" height="40" rx="1" fill="#1a1208"/>
<rect x="40" y="178" width="200" height="80" fill="#151d35" stroke="#4f46e5" stroke-width="1"/>
<text x="140" y="213" text-anchor="middle" fill="#818cf8" font-size="9" font-weight="600">KAMAR TIDUR VIP</text>
<text x="140" y="225" text-anchor="middle" fill="#6b7280" font-size="7.5">± 40 m²  |  Akses Langsung ke Rooftop</text>
<rect x="52" y="235" width="70" height="15" rx="2" fill="#2d1f4e" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="240" y="178" width="80" height="80" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="280" y="211" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM VIP</text>
<text x="280" y="223" text-anchor="middle" fill="#6b7280" font-size="7.5">EN SUITE</text>
<rect x="248" y="185" width="32" height="15" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<ellipse cx="280" cy="247" rx="15" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="320" y="178" width="80" height="80" fill="#1e1e2e" stroke="#6b7280" stroke-width="0.8"/>
<text x="360" y="215" text-anchor="middle" fill="#9ca3af" font-size="8">TANGGA</text>
<line x1="325" y1="186" x2="395" y2="186" stroke="#6b7280" stroke-width="0.5"/>
<line x1="325" y1="193" x2="395" y2="193" stroke="#6b7280" stroke-width="0.5"/>
<line x1="325" y1="200" x2="395" y2="200" stroke="#6b7280" stroke-width="0.5"/>
<line x1="325" y1="207" x2="395" y2="207" stroke="#6b7280" stroke-width="0.5"/>
<line x1="325" y1="214" x2="395" y2="214" stroke="#6b7280" stroke-width="0.5"/>
<rect x="400" y="178" width="90" height="80" fill="#0a0814" stroke="#c9a96e" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="445" y="213" text-anchor="middle" fill="#c9a96e" font-size="8" font-weight="600">BBQ AREA</text>
<text x="445" y="225" text-anchor="middle" fill="#6b7280" font-size="7.5">OUTDOOR</text>
<rect x="40" y="258" width="450" height="42" fill="#050a14" stroke="#4f46e5" stroke-width="0.5" stroke-dasharray="4,3"/>
<text x="265" y="280" text-anchor="middle" fill="#4f46e5" font-size="8.5" font-weight="600">VOID — DOUBLE HEIGHT (TERHUBUNG KE LT.2 DAN LT.1)</text>
<g transform="translate(468,355)"><circle cx="0" cy="0" r="13" fill="none" stroke="#c9a96e" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#c9a96e"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#6b7280" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#c9a96e" font-size="7" font-weight="700">U</text></g>
<text x="30" y="388" fill="#6b7280" font-size="7.5">SKALA 1:150  |  LT.3 ≈ 200 m²  |  Sky Lounge + Jacuzzi + KT VIP</text>
</svg>`}
]},
{id:1,name:"Neo-Futuristik 3Lt",short:"Neo-Futuristik",color:"#60a5fa",floors:[
{label:"LT.1",info:[["Luas","≈87m²"],["Fungsi","Living Open, Dapur, Garasi, WC"],["Tangga","Spiral"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#050a18"/>
<text x="260" y="20" text-anchor="middle" fill="#60a5fa" font-size="10" font-weight="600" letter-spacing="2">LANTAI 1 — NEO-FUTURISTIK 3 LANTAI</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#60a5fa" stroke-width="0.5" opacity="0.4"/>
<path d="M60 55 Q60 38 80 36 L380 36 Q420 36 440 68 L440 295 Q440 335 400 340 L100 340 Q60 335 58 295 Z" fill="none" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="5,3"/>
<rect x="70" y="48" width="200" height="130" fill="#0a1628" stroke="#3b82f6" stroke-width="1"/>
<text x="170" y="104" text-anchor="middle" fill="#60a5fa" font-size="9" font-weight="600">LIVING OPEN PLAN</text>
<text x="170" y="116" text-anchor="middle" fill="#4b5563" font-size="7.5">± 80 m²</text>
<path d="M85 148 Q140 138 185 148 L185 162 Q140 155 85 162 Z" fill="#0f1e3d" stroke="#3b82f6" stroke-width="0.8"/>
<ellipse cx="155" cy="132" rx="22" ry="14" fill="#0a1628" stroke="#3b82f6" stroke-width="0.5"/>
<rect x="270" y="48" width="110" height="80" fill="#0a1628" stroke="#d97706" stroke-width="1"/>
<text x="325" y="85" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR MODERN</text>
<text x="325" y="97" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
<rect x="283" y="58" width="80" height="18" rx="3" fill="#151d35" stroke="#d97706" stroke-width="0.5"/>
<path d="M70 178 Q170 208 270 178 L270 198 Q170 230 70 198 Z" fill="#091524" stroke="#22d3ee" stroke-width="1"/>
<text x="170" y="195" text-anchor="middle" fill="#67e8f9" font-size="8" font-weight="600">BALKON KURVA DEPAN</text>
<rect x="380" y="48" width="60" height="60" fill="#0a1a2a" stroke="#0891b2" stroke-width="1"/>
<text x="410" y="74" text-anchor="middle" fill="#67e8f9" font-size="8" font-weight="600">WC</text>
<ellipse cx="410" cy="94" rx="12" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="70" y="208" width="220" height="88" fill="#0d0d1a" stroke="#6b7280" stroke-width="1"/>
<rect x="75" y="213" width="90" height="48" rx="2" fill="#111827" stroke="#374151" stroke-width="0.5"/>
<rect x="175" y="213" width="90" height="48" rx="2" fill="#111827" stroke="#374151" stroke-width="0.5"/>
<text x="180" y="273" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">GARASI 2 MOBIL</text>
<g transform="translate(310,226)"><circle cx="0" cy="0" r="28" fill="#070d1a" stroke="#3b82f6" stroke-width="1"/><circle cx="0" cy="0" r="8" fill="#0a1628" stroke="#60a5fa" stroke-width="0.8"/><path d="M0,-28 A28,28 0 0,1 28,0" fill="none" stroke="#3b82f6" stroke-width="2"/><path d="M28,0 A28,28 0 0,1 0,28" fill="none" stroke="#3b82f6" stroke-width="1.5" opacity="0.6"/><text x="0" y="3" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="600">TANGGA</text><text x="0" y="12" text-anchor="middle" fill="#4b5563" font-size="6">SPIRAL</text></g>
<rect x="360" y="128" width="80" height="60" fill="#0d0d1a" stroke="#374151" stroke-width="1"/>
<text x="400" y="155" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">UTILITAS</text>
<text x="400" y="167" text-anchor="middle" fill="#4b5563" font-size="7.5">LAUNDRY</text>
<g transform="translate(468,350)"><circle cx="0" cy="0" r="13" fill="none" stroke="#3b82f6" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#60a5fa"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="700">U</text></g>
<text x="30" y="386" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.1 ≈ 87 m²</text>
</svg>`},
{label:"LT.2",info:[["Luas","≈87m²"],["KT","3 Kamar Tidur + 2 KM"],["Balkon","Organik Kurva"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#050a18"/>
<text x="260" y="20" text-anchor="middle" fill="#60a5fa" font-size="10" font-weight="600" letter-spacing="2">LANTAI 2 — NEO-FUTURISTIK 3 LANTAI</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#60a5fa" stroke-width="0.5" opacity="0.4"/>
<path d="M60 55 Q60 38 80 36 L380 36 Q420 36 440 68 L440 295 Q440 335 400 340 L100 340 Q60 335 58 295 Z" fill="none" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="5,3"/>
<rect x="70" y="48" width="170" height="120" fill="#0f1e3d" stroke="#7c3aed" stroke-width="1.5"/>
<text x="155" y="100" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT UTAMA</text>
<text x="155" y="112" text-anchor="middle" fill="#4b5563" font-size="7.5">± 38 m²</text>
<rect x="82" y="128" width="70" height="28" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="82" y="128" width="70" height="10" rx="1" fill="#2d1f4e"/>
<rect x="162" y="128" width="40" height="16" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.4"/>
<text x="182" y="140" text-anchor="middle" fill="#a78bfa" font-size="7">LEMARI</text>
<rect x="240" y="48" width="100" height="120" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="290" y="96" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
<text x="290" y="108" text-anchor="middle" fill="#4b5563" font-size="7.5">EN SUITE ± 15 m²</text>
<rect x="250" y="56" width="50" height="22" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
<text x="275" y="71" text-anchor="middle" fill="#67e8f9" font-size="7">BATHTUB</text>
<rect x="305" y="56" width="28" height="22" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="319" y="71" text-anchor="middle" fill="#67e8f9" font-size="7">SHOWER</text>
<rect x="248" y="128" width="28" height="16" rx="4" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="262" y="139" text-anchor="middle" fill="#67e8f9" font-size="7">WC</text>
<rect x="340" y="48" width="100" height="120" fill="#0f1e3d" stroke="#7c3aed" stroke-width="1"/>
<text x="390" y="100" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 2</text>
<text x="390" y="112" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
<rect x="350" y="128" width="55" height="28" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="350" y="128" width="55" height="10" rx="1" fill="#2d1f4e"/>
<rect x="70" y="168" width="130" height="100" fill="#0f1e3d" stroke="#7c3aed" stroke-width="1"/>
<text x="135" y="211" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 3</text>
<text x="135" y="223" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
<rect x="80" y="232" width="50" height="25" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="80" y="232" width="50" height="9" rx="1" fill="#2d1f4e"/>
<rect x="200" y="168" width="80" height="60" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="240" y="196" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
<rect x="208" y="175" width="30" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<ellipse cx="240" cy="218" rx="14" ry="8" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<g transform="translate(310,200)"><circle cx="0" cy="0" r="25" fill="#070d1a" stroke="#3b82f6" stroke-width="1"/><circle cx="0" cy="0" r="7" fill="#0a1628" stroke="#60a5fa" stroke-width="0.8"/><path d="M0,-25 A25,25 0 0,1 25,0" fill="none" stroke="#3b82f6" stroke-width="2"/><text x="0" y="3" text-anchor="middle" fill="#60a5fa" font-size="7">TANGGA</text></g>
<path d="M70 270 Q200 300 340 270 L340 290 Q200 322 70 290 Z" fill="#091524" stroke="#22d3ee" stroke-width="1"/>
<text x="205" y="287" text-anchor="middle" fill="#67e8f9" font-size="8" font-weight="600">BALKON ORGANIK KURVA</text>
<rect x="340" y="168" width="100" height="100" fill="#0a1a2a" stroke="#3b82f6" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="390" y="213" text-anchor="middle" fill="#60a5fa" font-size="8" font-weight="600">CORRIDOR</text>
<text x="390" y="225" text-anchor="middle" fill="#4b5563" font-size="7.5">+ STORAGE</text>
<g transform="translate(468,350)"><circle cx="0" cy="0" r="13" fill="none" stroke="#3b82f6" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#60a5fa"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="700">U</text></g>
<text x="30" y="386" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.2 ≈ 87 m²  |  3 KT + 2 KM + Balkon Organik</text>
</svg>`},
{label:"LT.3",info:[["Luas","≈86m²"],["KT","Master Suite Premium"],["Spesial","Rooftop Garden 360°"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#050a18"/>
<text x="260" y="20" text-anchor="middle" fill="#60a5fa" font-size="10" font-weight="600" letter-spacing="2">LANTAI 3 — NEO-FUTURISTIK (ROOFTOP)</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#60a5fa" stroke-width="0.5" opacity="0.4"/>
<path d="M60 55 Q60 38 80 36 L380 36 Q420 36 440 68 L440 295 Q440 335 400 340 L100 340 Q60 335 58 295 Z" fill="none" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="5,3"/>
<rect x="70" y="48" width="200" height="140" fill="#0f1e3d" stroke="#7c3aed" stroke-width="1.5"/>
<text x="170" y="110" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">MASTER SUITE</text>
<text x="170" y="122" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">PREMIUM</text>
<text x="170" y="134" text-anchor="middle" fill="#4b5563" font-size="7.5">± 55 m²  |  Akses Rooftop</text>
<rect x="82" y="152" width="80" height="28" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="82" y="152" width="80" height="10" rx="1" fill="#2d1f4e"/>
<rect x="172" y="152" width="45" height="20" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.4"/>
<text x="194" y="165" text-anchor="middle" fill="#a78bfa" font-size="7">WALK-IN</text>
<rect x="270" y="48" width="100" height="140" fill="#1a2535" stroke="#0891b2" stroke-width="1.2"/>
<text x="320" y="108" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM MASTER</text>
<text x="320" y="120" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">PREMIUM</text>
<text x="320" y="132" text-anchor="middle" fill="#4b5563" font-size="7.5">± 18 m²</text>
<rect x="278" y="58" width="58" height="26" rx="6" fill="none" stroke="#0891b2" stroke-width="0.9"/>
<text x="307" y="74" text-anchor="middle" fill="#67e8f9" font-size="7">SOAKING TUB</text>
<rect x="278" y="94" width="32" height="26" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="294" y="110" text-anchor="middle" fill="#67e8f9" font-size="7">SHOWER</text>
<rect x="316" y="148" width="30" height="16" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="331" y="159" text-anchor="middle" fill="#67e8f9" font-size="7">WC</text>
<rect x="370" y="48" width="70" height="140" fill="#091524" stroke="#22d3ee" stroke-width="1.2"/>
<text x="405" y="100" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">PRIVATE</text>
<text x="405" y="112" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">BALKON</text>
<text x="405" y="124" text-anchor="middle" fill="#4b5563" font-size="7.5">KURVA</text>
<path d="M375 68 Q405 60 435 68" fill="none" stroke="#22d3ee" stroke-width="0.7" stroke-dasharray="3,2"/>
<rect x="70" y="188" width="320" height="110" fill="#050e14" stroke="#15803d" stroke-width="1" stroke-dasharray="5,3"/>
<text x="230" y="220" text-anchor="middle" fill="#16a34a" font-size="9" font-weight="600">ROOFTOP GARDEN</text>
<text x="230" y="232" text-anchor="middle" fill="#4b5563" font-size="7.5">Taman Melayang 360°  ± 80 m²</text>
<circle cx="130" cy="268" r="18" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
<circle cx="230" cy="255" r="22" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
<circle cx="320" cy="265" r="16" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
<text x="130" y="272" text-anchor="middle" fill="#22c55e" font-size="7">🌿</text>
<text x="230" y="259" text-anchor="middle" fill="#22c55e" font-size="7">🌳</text>
<text x="320" y="269" text-anchor="middle" fill="#22c55e" font-size="7">🌿</text>
<g transform="translate(310,208)"><circle cx="0" cy="0" r="20" fill="#070d1a" stroke="#3b82f6" stroke-width="1"/><circle cx="0" cy="0" r="6" fill="#0a1628" stroke="#60a5fa" stroke-width="0.8"/><path d="M0,-20 A20,20 0 0,1 20,0" fill="none" stroke="#3b82f6" stroke-width="1.5"/><text x="0" y="3" text-anchor="middle" fill="#60a5fa" font-size="6">TANGGA</text></g>
<g transform="translate(468,350)"><circle cx="0" cy="0" r="13" fill="none" stroke="#3b82f6" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#60a5fa"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="700">U</text></g>
<text x="30" y="386" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.3 ≈ 86 m²  |  Master Suite + Rooftop Garden</text>
</svg>`}
]},
{id:2,name:"Modern Tropis 2Lt",short:"Modern Tropis",color:"#d97706",floors:[
{label:"LT.1",info:[["Luas","≈130m²"],["Fungsi","Carport, Tamu, Keluarga, Dapur, Makan"],["KM","1 WC Tamu"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#0e0a05"/>
<text x="260" y="20" text-anchor="middle" fill="#d97706" font-size="10" font-weight="600" letter-spacing="2">LANTAI 1 — MODERN TROPIS 2 LANTAI</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#d97706" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="120" height="75" fill="#0f1008" stroke="#78350f" stroke-width="1"/>
<text x="90" y="69" text-anchor="middle" fill="#92400e" font-size="9" font-weight="500">CARPORT 1 MOBIL</text>
<rect x="48" y="72" width="58" height="24" rx="3" fill="#1c1c0a" stroke="#78350f" stroke-width="0.5"/>
<rect x="150" y="35" width="80" height="75" fill="#071208" stroke="#15803d" stroke-width="1"/>
<text x="190" y="69" text-anchor="middle" fill="#16a34a" font-size="8.5" font-weight="600">TAMAN DEPAN</text>
<circle cx="170" cy="55" r="10" fill="#052e0a" stroke="#15803d" stroke-width="0.8"/>
<circle cx="210" cy="60" r="8" fill="#052e0a" stroke="#15803d" stroke-width="0.8"/>
<rect x="230" y="35" width="70" height="50" fill="#130f08" stroke="#d97706" stroke-width="1"/>
<text x="265" y="58" text-anchor="middle" fill="#d97706" font-size="8.5" font-weight="600">FOYER</text>
<text x="265" y="70" text-anchor="middle" fill="#4b5563" font-size="7.5">MASUK</text>
<rect x="30" y="110" width="170" height="110" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
<text x="115" y="160" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG TAMU</text>
<text x="115" y="172" text-anchor="middle" fill="#4b5563" font-size="7.5">± 35 m²</text>
<rect x="40" y="180" width="80" height="24" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
<rect x="200" y="85" width="140" height="100" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
<text x="270" y="128" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG KELUARGA</text>
<text x="270" y="140" text-anchor="middle" fill="#4b5563" font-size="7.5">± 30 m²</text>
<rect x="208" y="90" width="78" height="8" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
<rect x="340" y="35" width="160" height="100" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
<text x="420" y="82" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
<text x="420" y="94" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
<rect x="345" y="39" width="150" height="11" rx="1" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
<rect x="340" y="135" width="160" height="80" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
<text x="420" y="172" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
<text x="420" y="184" text-anchor="middle" fill="#4b5563" font-size="7.5">± 18 m²</text>
<rect x="358" y="145" width="90" height="44" rx="3" fill="#1a1208" stroke="#d97706" stroke-width="0.5"/>
<rect x="200" y="185" width="70" height="55" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
<text x="235" y="208" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM TAMU</text>
<ellipse cx="235" cy="230" rx="12" ry="8" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="270" y="185" width="70" height="55" fill="#0a0a14" stroke="#4b5563" stroke-width="0.8"/>
<text x="305" y="208" text-anchor="middle" fill="#6b7280" font-size="8">TANGGA</text>
<line x1="275" y1="193" x2="335" y2="193" stroke="#4b5563" stroke-width="0.5"/>
<line x1="275" y1="199" x2="335" y2="199" stroke="#4b5563" stroke-width="0.5"/>
<line x1="275" y1="205" x2="335" y2="205" stroke="#4b5563" stroke-width="0.5"/>
<line x1="275" y1="211" x2="335" y2="211" stroke="#4b5563" stroke-width="0.5"/>
<line x1="275" y1="217" x2="335" y2="217" stroke="#4b5563" stroke-width="0.5"/>
<line x1="275" y1="223" x2="335" y2="223" stroke="#4b5563" stroke-width="0.5"/>
<rect x="30" y="220" width="170" height="50" fill="#0a0a0a" stroke="#374151" stroke-width="1"/>
<text x="115" y="246" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">SERVIS / LAUNDRY</text>
<g transform="translate(468,350)"><circle cx="0" cy="0" r="13" fill="none" stroke="#d97706" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#d97706"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#d97706" font-size="7" font-weight="700">U</text></g>
<text x="30" y="386" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.1 ≈ 130 m²</text>
</svg>`},
{label:"LT.2",info:[["Luas","≈130m²"],["KT","3 Kamar Tidur + 2 KM"],["Balkon","Kaca Railing + Ruang Belajar"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#0e0a05"/>
<text x="260" y="20" text-anchor="middle" fill="#d97706" font-size="10" font-weight="600" letter-spacing="2">LANTAI 2 — MODERN TROPIS 2 LANTAI</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#d97706" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="260" height="20" rx="3" fill="#0c0903" stroke="#d97706" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="160" y="49" text-anchor="middle" fill="#d97706" font-size="7.5">← BALKON KACA RAILING DEPAN →</text>
<rect x="30" y="58" width="165" height="130" fill="#0f0a04" stroke="#7c3aed" stroke-width="1.5"/>
<text x="112" y="116" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT UTAMA</text>
<text x="112" y="128" text-anchor="middle" fill="#4b5563" font-size="7.5">± 40 m²</text>
<rect x="42" y="145" width="75" height="35" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="42" y="145" width="75" height="12" rx="1" fill="#2d1f4e"/>
<rect x="128" y="148" width="38" height="20" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.4"/>
<text x="147" y="160" text-anchor="middle" fill="#a78bfa" font-size="7">LEMARI</text>
<rect x="195" y="58" width="100" height="130" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="245" y="110" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
<text x="245" y="122" text-anchor="middle" fill="#4b5563" font-size="7.5">EN SUITE</text>
<rect x="203" y="66" width="48" height="22" rx="4" fill="none" stroke="#0891b2" stroke-width="0.8"/>
<text x="227" y="80" text-anchor="middle" fill="#67e8f9" font-size="7">BATHTUB</text>
<rect x="258" y="66" width="28" height="22" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="272" y="80" text-anchor="middle" fill="#67e8f9" font-size="7">SHOWER</text>
<rect x="203" y="148" width="28" height="16" rx="4" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="295" y="58" width="220" height="100" fill="#0f0a04" stroke="#d97706" stroke-width="1"/>
<text x="405" y="103" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG BELAJAR</text>
<text x="405" y="115" text-anchor="middle" fill="#4b5563" font-size="7.5">± 35 m²</text>
<rect x="305" y="68" width="100" height="22" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.4"/>
<rect x="30" y="188" width="120" height="110" fill="#0f0a04" stroke="#7c3aed" stroke-width="1"/>
<text x="90" y="236" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 2</text>
<text x="90" y="248" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
<rect x="40" y="258" width="60" height="32" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="40" y="258" width="60" height="11" rx="1" fill="#2d1f4e"/>
<rect x="150" y="188" width="120" height="110" fill="#0f0a04" stroke="#7c3aed" stroke-width="1"/>
<text x="210" y="236" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 3</text>
<text x="210" y="248" text-anchor="middle" fill="#4b5563" font-size="7.5">± 20 m²</text>
<rect x="160" y="258" width="55" height="30" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="160" y="258" width="55" height="11" rx="1" fill="#2d1f4e"/>
<rect x="270" y="188" width="80" height="60" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="310" y="216" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
<rect x="278" y="195" width="28" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<ellipse cx="310" cy="237" rx="14" ry="8" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="350" y="158" width="80" height="60" fill="#1e1e2e" stroke="#4b5563" stroke-width="0.8"/>
<text x="390" y="185" text-anchor="middle" fill="#6b7280" font-size="8">TANGGA</text>
<line x1="355" y1="166" x2="425" y2="166" stroke="#4b5563" stroke-width="0.5"/>
<line x1="355" y1="173" x2="425" y2="173" stroke="#4b5563" stroke-width="0.5"/>
<line x1="355" y1="180" x2="425" y2="180" stroke="#4b5563" stroke-width="0.5"/>
<line x1="355" y1="187" x2="425" y2="187" stroke="#4b5563" stroke-width="0.5"/>
<line x1="355" y1="194" x2="425" y2="194" stroke="#4b5563" stroke-width="0.5"/>
<rect x="430" y="158" width="80" height="140" fill="#071208" stroke="#15803d" stroke-width="1" stroke-dasharray="4,3"/>
<text x="470" y="228" text-anchor="middle" fill="#16a34a" font-size="8.5" font-weight="600">BALKON</text>
<text x="470" y="240" text-anchor="middle" fill="#4b5563" font-size="7.5">BELAKANG</text>
<g transform="translate(468,350)"><circle cx="0" cy="0" r="13" fill="none" stroke="#d97706" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#d97706"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#d97706" font-size="7" font-weight="700">U</text></g>
<text x="30" y="386" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.2 ≈ 130 m²  |  3 KT + 2 KM + Balkon Kaca</text>
</svg>`}
]},
{id:3,name:"Garasi Double 3Lt",short:"Garasi Double",color:"#22c55e",floors:[
{label:"LT.1",info:[["Luas","≈117m²"],["Garasi","2 Mobil + Foyer"],["Fungsi","Tamu, Makan, Dapur, WC"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#050e05"/>
<text x="260" y="20" text-anchor="middle" fill="#22c55e" font-size="10" font-weight="600" letter-spacing="2">LANTAI 1 — GARASI DOUBLE 3 LANTAI</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#22c55e" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="220" height="100" fill="#080e08" stroke="#374151" stroke-width="1.2"/>
<line x1="140" y1="35" x2="140" y2="135" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
<rect x="40" y="60" width="85" height="34" rx="3" fill="#0f1a0f" stroke="#4b5563" stroke-width="0.5"/>
<rect x="148" y="60" width="85" height="34" rx="3" fill="#0f1a0f" stroke="#4b5563" stroke-width="0.5"/>
<text x="140" y="115" text-anchor="middle" fill="#6b7280" font-size="9" font-weight="500">GARASI 2 MOBIL  ± 50 m²</text>
<line x1="30" y1="35" x2="250" y2="35" stroke="#22c55e" stroke-width="2" opacity="0.4"/>
<text x="140" y="32" text-anchor="middle" fill="#22c55e" font-size="7" opacity="0.7">← PINTU GARASI →</text>
<rect x="250" y="35" width="90" height="70" fill="#081008" stroke="#22c55e" stroke-width="1"/>
<text x="295" y="66" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">FOYER</text>
<text x="295" y="78" text-anchor="middle" fill="#4b5563" font-size="7.5">LOBBY</text>
<rect x="30" y="135" width="180" height="110" fill="#081008" stroke="#22c55e" stroke-width="1"/>
<text x="120" y="185" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">RUANG TAMU</text>
<text x="120" y="197" text-anchor="middle" fill="#4b5563" font-size="7.5">± 40 m²</text>
<rect x="40" y="205" width="90" height="22" rx="1" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
<rect x="210" y="105" width="130" height="80" fill="#081008" stroke="#d97706" stroke-width="1"/>
<text x="275" y="142" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
<text x="275" y="154" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
<rect x="225" y="115" width="85" height="38" rx="0" fill="#0d1a0d" stroke="#d97706" stroke-width="0.5"/>
<rect x="340" y="35" width="160" height="100" fill="#081008" stroke="#d97706" stroke-width="1"/>
<text x="420" y="82" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
<text x="420" y="94" text-anchor="middle" fill="#4b5563" font-size="7.5">± 24 m²</text>
<rect x="345" y="39" width="150" height="11" rx="0" fill="#0d1a0d" stroke="#d97706" stroke-width="0.5"/>
<rect x="340" y="135" width="80" height="70" fill="#060e06" stroke="#4b5563" stroke-width="0.8"/>
<text x="380" y="166" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">TANGGA</text>
<line x1="345" y1="145" x2="415" y2="145" stroke="#4b5563" stroke-width="0.5"/>
<line x1="345" y1="152" x2="415" y2="152" stroke="#4b5563" stroke-width="0.5"/>
<line x1="345" y1="159" x2="415" y2="159" stroke="#4b5563" stroke-width="0.5"/>
<line x1="345" y1="166" x2="415" y2="166" stroke="#4b5563" stroke-width="0.5"/>
<line x1="345" y1="173" x2="415" y2="173" stroke="#4b5563" stroke-width="0.5"/>
<rect x="420" y="135" width="80" height="70" fill="#040c12" stroke="#0891b2" stroke-width="1"/>
<text x="460" y="166" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC TAMU</text>
<ellipse cx="460" cy="192" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="210" y="185" width="130" height="60" fill="#060e06" stroke="#374151" stroke-width="1"/>
<text x="275" y="212" text-anchor="middle" fill="#9ca3af" font-size="8.5" font-weight="600">UTILITAS / LAUNDRY</text>
<g transform="translate(468,355)"><circle cx="0" cy="0" r="13" fill="none" stroke="#22c55e" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#22c55e"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#22c55e" font-size="7" font-weight="700">U</text></g>
<text x="30" y="386" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.1 ≈ 117 m²</text>
</svg>`},
{label:"LT.2",info:[["Luas","≈117m²"],["KT","3 Kamar Tidur + 2 KM"],["Balkon","Kaca Cantilever"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#050e05"/>
<text x="260" y="20" text-anchor="middle" fill="#22c55e" font-size="10" font-weight="600" letter-spacing="2">LANTAI 2 — GARASI DOUBLE 3 LANTAI</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#22c55e" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="300" height="18" rx="3" fill="#04100a" stroke="#22c55e" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="180" y="48" text-anchor="middle" fill="#22c55e" font-size="7.5">← BALKON KACA CANTILEVER DEPAN →</text>
<rect x="30" y="56" width="175" height="135" fill="#081008" stroke="#7c3aed" stroke-width="1.5"/>
<text x="117" y="117" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT UTAMA</text>
<text x="117" y="129" text-anchor="middle" fill="#4b5563" font-size="7.5">± 45 m²</text>
<rect x="42" y="148" width="80" height="36" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="42" y="148" width="80" height="12" rx="1" fill="#2d1f4e"/>
<rect x="132" y="148" width="38" height="22" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.4"/>
<text x="151" y="162" text-anchor="middle" fill="#a78bfa" font-size="7">LEMARI</text>
<rect x="205" y="56" width="105" height="135" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="257" y="114" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
<text x="257" y="126" text-anchor="middle" fill="#4b5563" font-size="7.5">EN SUITE</text>
<rect x="213" y="66" width="55" height="24" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
<text x="240" y="82" text-anchor="middle" fill="#67e8f9" font-size="7">BATHTUB</text>
<rect x="273" y="66" width="30" height="24" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="288" y="82" text-anchor="middle" fill="#67e8f9" font-size="7">SHOWER</text>
<rect x="213" y="152" width="30" height="18" rx="4" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="310" y="35" width="210" height="80" fill="#081008" stroke="#22c55e" stroke-width="1" stroke-dasharray="4,3"/>
<text x="415" y="70" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">VOID DOUBLE HEIGHT</text>
<text x="415" y="82" text-anchor="middle" fill="#4b5563" font-size="7.5">Terhubung ke LT.1</text>
<line x1="310" y1="35" x2="520" y2="115" stroke="#22c55e" stroke-width="0.4" stroke-dasharray="3,3" opacity="0.3"/>
<line x1="520" y1="35" x2="310" y2="115" stroke="#22c55e" stroke-width="0.4" stroke-dasharray="3,3" opacity="0.3"/>
<rect x="30" y="195" width="130" height="110" fill="#081008" stroke="#7c3aed" stroke-width="1"/>
<text x="95" y="242" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 2</text>
<text x="95" y="254" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
<rect x="40" y="262" width="65" height="32" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="40" y="262" width="65" height="11" rx="1" fill="#2d1f4e"/>
<rect x="160" y="195" width="120" height="110" fill="#081008" stroke="#7c3aed" stroke-width="1"/>
<text x="220" y="242" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 3</text>
<text x="220" y="254" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
<rect x="170" y="262" width="60" height="30" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="280" y="195" width="80" height="60" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="320" y="223" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
<rect x="288" y="202" width="28" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<ellipse cx="320" cy="244" rx="14" ry="8" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="360" y="115" width="80" height="60" fill="#060e06" stroke="#4b5563" stroke-width="0.8"/>
<text x="400" y="142" text-anchor="middle" fill="#6b7280" font-size="8">TANGGA</text>
<line x1="365" y1="123" x2="435" y2="123" stroke="#4b5563" stroke-width="0.5"/>
<line x1="365" y1="130" x2="435" y2="130" stroke="#4b5563" stroke-width="0.5"/>
<line x1="365" y1="137" x2="435" y2="137" stroke="#4b5563" stroke-width="0.5"/>
<line x1="365" y1="144" x2="435" y2="144" stroke="#4b5563" stroke-width="0.5"/>
<line x1="365" y1="151" x2="435" y2="151" stroke="#4b5563" stroke-width="0.5"/>
<rect x="440" y="115" width="80" height="90" fill="#081008" stroke="#22c55e" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="480" y="158" text-anchor="middle" fill="#4ade80" font-size="8">BALKON</text>
<text x="480" y="170" text-anchor="middle" fill="#4b5563" font-size="7.5">BELAKANG</text>
<rect x="280" y="255" width="240" height="50" fill="#081008" stroke="#22c55e" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="400" y="278" text-anchor="middle" fill="#4ade80" font-size="8" font-weight="600">BALKON KACA CANTILEVER</text>
<text x="400" y="290" text-anchor="middle" fill="#4b5563" font-size="7.5">← Kiri Kanan Menonjol →</text>
<g transform="translate(468,355)"><circle cx="0" cy="0" r="13" fill="none" stroke="#22c55e" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#22c55e"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#22c55e" font-size="7" font-weight="700">U</text></g>
<text x="30" y="386" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.2 ≈ 117 m²  |  3 KT + 2 KM + Balkon Kaca</text>
</svg>`},
{label:"LT.3",info:[["Luas","≈116m²"],["Fungsi","Rooftop Lounge + Void"],["Spesial","Double height void"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#050e05"/>
<text x="260" y="20" text-anchor="middle" fill="#22c55e" font-size="10" font-weight="600" letter-spacing="2">LANTAI 3 — ROOFTOP LOUNGE</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#22c55e" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="460" height="300" fill="#040e04" stroke="#22c55e" stroke-width="1" stroke-dasharray="6,3"/>
<text x="50" y="52" fill="#22c55e" font-size="8" font-weight="600">ROOFTOP TERRACE</text>
<rect x="40" y="58" width="160" height="110" fill="#081008" stroke="#22c55e" stroke-width="1.2"/>
<text x="120" y="107" text-anchor="middle" fill="#4ade80" font-size="9" font-weight="600">ROOFTOP LOUNGE</text>
<text x="120" y="119" text-anchor="middle" fill="#4b5563" font-size="7.5">± 50 m²</text>
<rect x="52" y="128" width="90" height="28" rx="3" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.5"/>
<rect x="52" y="115" width="18" height="40" rx="2" fill="#0d1a0d" stroke="#22c55e" stroke-width="0.4"/>
<rect x="200" y="58" width="160" height="110" fill="#050e14" stroke="#0891b2" stroke-width="1.2"/>
<text x="280" y="100" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">MINI POOL</text>
<text x="280" y="112" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">/ JACUZZI</text>
<text x="280" y="124" text-anchor="middle" fill="#4b5563" font-size="7.5">± 30 m²</text>
<ellipse cx="280" cy="145" rx="55" ry="18" fill="#0a1e2e" stroke="#0891b2" stroke-width="1.5"/>
<ellipse cx="280" cy="143" rx="46" ry="12" fill="none" stroke="#0891b2" stroke-width="0.5" stroke-dasharray="3,3"/>
<rect x="360" y="58" width="120" height="110" fill="#0a0814" stroke="#c9a96e" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="420" y="100" text-anchor="middle" fill="#c9a96e" font-size="8.5" font-weight="600">OUTDOOR</text>
<text x="420" y="112" text-anchor="middle" fill="#c9a96e" font-size="8.5" font-weight="600">DINING / BBQ</text>
<text x="420" y="124" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
<rect x="40" y="170" width="320" height="60" fill="#040e04" stroke="#22c55e" stroke-width="0.5" stroke-dasharray="4,3"/>
<text x="200" y="194" text-anchor="middle" fill="#22c55e" font-size="8.5" font-weight="600">VOID DOUBLE HEIGHT</text>
<text x="200" y="206" text-anchor="middle" fill="#4b5563" font-size="7.5">Terhubung LT.2 dan LT.1</text>
<rect x="360" y="170" width="120" height="60" fill="#081008" stroke="#6b7280" stroke-width="0.8"/>
<text x="420" y="196" text-anchor="middle" fill="#9ca3af" font-size="8">TANGGA</text>
<line x1="365" y1="178" x2="475" y2="178" stroke="#4b5563" stroke-width="0.5"/>
<line x1="365" y1="185" x2="475" y2="185" stroke="#4b5563" stroke-width="0.5"/>
<line x1="365" y1="192" x2="475" y2="192" stroke="#4b5563" stroke-width="0.5"/>
<line x1="365" y1="199" x2="475" y2="199" stroke="#4b5563" stroke-width="0.5"/>
<rect x="40" y="232" width="460" height="80" fill="#071408" stroke="#15803d" stroke-width="0.8" stroke-dasharray="5,4"/>
<text x="270" y="268" text-anchor="middle" fill="#16a34a" font-size="9" font-weight="600">GREEN ROOFTOP — AREA HIJAU</text>
<text x="270" y="280" text-anchor="middle" fill="#4b5563" font-size="7.5">Taman Rooftop, Planting Box, Area Santai</text>
<circle cx="100" cy="280" r="15" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
<circle cx="200" cy="272" r="18" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
<circle cx="320" cy="280" r="14" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
<circle cx="430" cy="275" r="16" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
<g transform="translate(468,355)"><circle cx="0" cy="0" r="13" fill="none" stroke="#22c55e" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#22c55e"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#22c55e" font-size="7" font-weight="700">U</text></g>
<text x="30" y="388" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.3 ≈ 116 m²  |  Rooftop Lounge + Pool + Green Area</text>
</svg>`}
]},
{id:4,name:"Weird Coffee",short:"Weird Coffee",color:"#f59e0b",floors:[
{label:"LT.1",info:[["Luas","≈50m²"],["Kapasitas","15 indoor + 9 outdoor"],["Konsep","Box Dark Grey"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#0a0a0a"/>
<text x="260" y="20" text-anchor="middle" fill="#9ca3af" font-size="10" font-weight="600" letter-spacing="3">DENAH — WEIRD COFFEE (1 LANTAI)</text>
<line x1="80" y1="26" x2="440" y2="26" stroke="#f59e0b" stroke-width="0.5" opacity="0.4"/>
<rect x="80" y="40" width="360" height="220" fill="none" stroke="#374151" stroke-width="2"/>
<rect x="80" y="40" width="140" height="220" fill="#0f0f0f" stroke="#374151" stroke-width="1"/>
<text x="150" y="148" text-anchor="middle" fill="#6b7280" font-size="10" font-weight="600">AREA OUTDOOR</text>
<text x="150" y="162" text-anchor="middle" fill="#4b5563" font-size="8.5">SEMI-TERBUKA</text>
<text x="150" y="174" text-anchor="middle" fill="#4b5563" font-size="8">9 Kursi</text>
<circle cx="110" cy="96" r="16" fill="none" stroke="#6b7280" stroke-width="0.8"/>
<circle cx="110" cy="80" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
<circle cx="110" cy="112" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
<circle cx="94" cy="96" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
<circle cx="126" cy="96" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
<circle cx="175" cy="96" r="16" fill="none" stroke="#6b7280" stroke-width="0.8"/>
<circle cx="175" cy="80" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
<circle cx="175" cy="112" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
<circle cx="159" cy="96" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
<circle cx="191" cy="96" r="5" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
<rect x="84" y="218" width="130" height="18" rx="2" fill="#1a2010" stroke="#15803d" stroke-width="0.8"/>
<text x="149" y="231" text-anchor="middle" fill="#16a34a" font-size="7">PLANTER BOX</text>
<line x1="220" y1="260" x2="280" y2="260" stroke="#f59e0b" stroke-width="2" opacity="0.8"/>
<text x="250" y="273" text-anchor="middle" fill="#f59e0b" font-size="7.5">PINTU MASUK</text>
<rect x="220" y="40" width="220" height="220" fill="#111111" stroke="#374151" stroke-width="1"/>
<rect x="225" y="45" width="210" height="40" fill="#1a1a1a" stroke="#f59e0b" stroke-width="1.2"/>
<text x="330" y="61" text-anchor="middle" fill="#f59e0b" font-size="9" font-weight="600">BAR COUNTER</text>
<text x="330" y="74" text-anchor="middle" fill="#6b7280" font-size="7.5">MEJA KASIR + DISPLAY</text>
<rect x="235" y="50" width="20" height="16" rx="2" fill="#252525" stroke="#f59e0b" stroke-width="0.5"/>
<rect x="260" y="50" width="14" height="16" rx="1" fill="#252525" stroke="#f59e0b" stroke-width="0.5"/>
<text x="330" y="126" text-anchor="middle" fill="#6b7280" font-size="9" font-weight="600">AREA INDOOR  15 Kursi</text>
<rect x="235" y="100" width="50" height="30" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
<rect x="310" y="100" width="50" height="30" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
<rect x="235" y="162" width="180" height="18" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
<rect x="245" y="145" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
<rect x="270" y="145" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
<rect x="295" y="145" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
<rect x="320" y="145" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
<rect x="345" y="145" width="18" height="18" rx="1" fill="#141414" stroke="#6b7280" stroke-width="0.4"/>
<rect x="225" y="198" width="70" height="52" fill="#0d0d0d" stroke="#374151" stroke-width="0.8"/>
<text x="260" y="219" text-anchor="middle" fill="#6b7280" font-size="8" font-weight="600">WC</text>
<ellipse cx="260" cy="238" rx="14" ry="9" fill="none" stroke="#374151" stroke-width="0.7"/>
<rect x="295" y="198" width="130" height="52" fill="#0d0d0d" stroke="#374151" stroke-width="0.8"/>
<text x="360" y="221" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">STORAGE GUDANG</text>
<rect x="230" y="288" width="200" height="28" rx="4" fill="#1a1a1a" stroke="#f59e0b" stroke-width="1"/>
<text x="330" y="305" text-anchor="middle" fill="#f59e0b" font-size="10" font-weight="700" letter-spacing="2">Weird Coffee</text>
<g transform="translate(468,352)"><circle cx="0" cy="0" r="13" fill="none" stroke="#6b7280" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#9ca3af"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#9ca3af" font-size="7" font-weight="700">U</text></g>
<text x="30" y="388" fill="#4b5563" font-size="7.5">SKALA 1:60  |  TOTAL ≈ 50 m²  |  Indoor 35 m²  |  Outdoor 15 m²</text>
</svg>`}
]},
{id:5,name:"Silinder Organik 3Lt",short:"Silinder Organik",color:"#a78bfa",floors:[
{label:"LT.1",info:[["Luas","≈140m²"],["Garasi","3 Mobil + Foyer Bundar"],["Fungsi","Tamu, Makan, Dapur, KM"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#080510"/>
<text x="260" y="20" text-anchor="middle" fill="#a78bfa" font-size="10" font-weight="600" letter-spacing="2">LANTAI 1 — SILINDER ORGANIK 3 LANTAI</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#a78bfa" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="460" height="260" fill="#0a0816" stroke="#6d28d9" stroke-width="1" stroke-dasharray="6,3"/>
<circle cx="70" cy="75" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
<text x="70" y="79" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<circle cx="450" cy="75" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
<text x="450" y="79" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<circle cx="70" cy="255" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
<text x="70" y="259" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<circle cx="450" cy="255" r="20" fill="#110e20" stroke="#8b5cf6" stroke-width="1.5"/>
<text x="450" y="259" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<circle cx="260" cy="165" r="16" fill="#110e20" stroke="#8b5cf6" stroke-width="1.2"/>
<text x="260" y="169" text-anchor="middle" fill="#8b5cf6" font-size="6.5" font-weight="600">CORE</text>
<rect x="38" y="43" width="280" height="78" fill="#0c0a1a" stroke="#374151" stroke-width="1"/>
<line x1="128" y1="43" x2="128" y2="121" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
<line x1="218" y1="43" x2="218" y2="121" stroke="#374151" stroke-width="0.5" stroke-dasharray="3,3"/>
<rect x="48" y="63" width="70" height="28" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
<rect x="138" y="63" width="70" height="28" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
<rect x="228" y="63" width="70" height="28" rx="3" fill="#15122a" stroke="#4b5563" stroke-width="0.5"/>
<text x="179" y="115" text-anchor="middle" fill="#6b7280" font-size="9" font-weight="600">GARASI 3 MOBIL  ± 65 m²</text>
<line x1="38" y1="43" x2="318" y2="43" stroke="#a78bfa" stroke-width="2" opacity="0.5"/>
<ellipse cx="390" cy="82" rx="55" ry="38" fill="#0d0b1e" stroke="#a78bfa" stroke-width="1.2"/>
<text x="390" y="79" text-anchor="middle" fill="#c4b5fd" font-size="9" font-weight="600">FOYER BUNDAR</text>
<rect x="38" y="121" width="200" height="110" fill="#0d0b1e" stroke="#7c3aed" stroke-width="1"/>
<text x="138" y="170" text-anchor="middle" fill="#c4b5fd" font-size="9" font-weight="600">RUANG TAMU</text>
<text x="138" y="182" text-anchor="middle" fill="#4b5563" font-size="7.5">± 55 m²</text>
<path d="M55 210 Q105 192 155 210 L155 225 Q105 208 55 225 Z" fill="#15122a" stroke="#7c3aed" stroke-width="0.8"/>
<ellipse cx="140" cy="192" rx="20" ry="14" fill="#0d0b1e" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="238" y="121" width="130" height="78" fill="#0d0b1e" stroke="#d97706" stroke-width="1"/>
<text x="303" y="157" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
<text x="303" y="169" text-anchor="middle" fill="#4b5563" font-size="7.5">± 30 m²</text>
<ellipse cx="303" cy="147" rx="35" ry="22" fill="#15122a" stroke="#d97706" stroke-width="0.5"/>
<rect x="370" y="121" width="120" height="78" fill="#0d0b1e" stroke="#d97706" stroke-width="1"/>
<text x="430" y="157" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR</text>
<text x="430" y="169" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
<rect x="375" y="125" width="110" height="10" fill="#15122a" stroke="#d97706" stroke-width="0.5"/>
<rect x="238" y="199" width="80" height="58" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
<text x="278" y="224" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 1</text>
<rect x="245" y="206" width="30" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<ellipse cx="278" cy="248" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<g transform="translate(340,228)"><circle cx="0" cy="0" r="28" fill="#080514" stroke="#8b5cf6" stroke-width="1.2"/><circle cx="0" cy="0" r="9" fill="#0d0b1e" stroke="#a78bfa" stroke-width="0.8"/><path d="M0,-28 A28,28 0 0,1 28,0" fill="none" stroke="#8b5cf6" stroke-width="2.5"/><path d="M28,0 A28,28 0 0,1 0,28" fill="none" stroke="#8b5cf6" stroke-width="1.5" opacity="0.6"/><text x="0" y="3" text-anchor="middle" fill="#a78bfa" font-size="7" font-weight="600">TANGGA</text><text x="0" y="12" text-anchor="middle" fill="#6b7280" font-size="6">BUNDAR</text></g>
<rect x="38" y="243" width="200" height="42" fill="#080514" stroke="#374151" stroke-width="0.8"/>
<text x="138" y="266" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">UTILITAS / LAUNDRY</text>
<ellipse cx="260" cy="308" rx="225" ry="22" fill="none" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="5,4" opacity="0.5"/>
<text x="260" y="312" text-anchor="middle" fill="#8b5cf6" font-size="8">← BALKON MELINGKAR (LT.2 DAN LT.3) →</text>
<g transform="translate(468,352)"><circle cx="0" cy="0" r="13" fill="none" stroke="#8b5cf6" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#a78bfa"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#a78bfa" font-size="7" font-weight="700">U</text></g>
<text x="30" y="388" fill="#4b5563" font-size="7.5">SKALA 1:150  |  LT.1 ≈ 140 m²</text>
</svg>`},
{label:"LT.2",info:[["Luas","≈140m²"],["KT","3 Kamar Tidur + 2 KM"],["Balkon","Melingkar Organik"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#080510"/>
<text x="260" y="20" text-anchor="middle" fill="#a78bfa" font-size="10" font-weight="600" letter-spacing="2">LANTAI 2 — SILINDER ORGANIK 3 LANTAI</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#a78bfa" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="460" height="280" fill="#0a0816" stroke="#6d28d9" stroke-width="1" stroke-dasharray="6,3"/>
<circle cx="70" cy="75" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.2"/>
<text x="70" y="79" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<circle cx="450" cy="75" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.2"/>
<text x="450" y="79" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<circle cx="70" cy="268" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.2"/>
<text x="70" y="272" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<circle cx="450" cy="268" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.2"/>
<text x="450" y="272" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<rect x="38" y="42" width="195" height="140" fill="#0f1535" stroke="#7c3aed" stroke-width="1.5"/>
<text x="135" y="105" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT UTAMA</text>
<text x="135" y="117" text-anchor="middle" fill="#4b5563" font-size="7.5">± 50 m²</text>
<rect x="50" y="145" width="85" height="32" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="50" y="145" width="85" height="11" rx="1" fill="#2d1f4e"/>
<rect x="145" y="145" width="40" height="22" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.4"/>
<text x="165" y="159" text-anchor="middle" fill="#a78bfa" font-size="7">LEMARI</text>
<rect x="233" y="42" width="115" height="140" fill="#1a2535" stroke="#0891b2" stroke-width="1.2"/>
<text x="290" y="104" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
<text x="290" y="116" text-anchor="middle" fill="#4b5563" font-size="7.5">PREMIUM</text>
<rect x="241" y="52" width="55" height="24" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
<text x="268" y="68" text-anchor="middle" fill="#67e8f9" font-size="7">SOAKING TUB</text>
<rect x="300" y="52" width="30" height="24" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="315" y="68" text-anchor="middle" fill="#67e8f9" font-size="7">SHOWER</text>
<rect x="241" y="152" width="30" height="16" rx="4" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="348" y="42" width="125" height="140" fill="#0f1535" stroke="#7c3aed" stroke-width="1"/>
<text x="410" y="104" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 2</text>
<text x="410" y="116" text-anchor="middle" fill="#4b5563" font-size="7.5">± 32 m²</text>
<rect x="358" y="145" width="60" height="30" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="358" y="145" width="60" height="11" rx="1" fill="#2d1f4e"/>
<rect x="38" y="182" width="130" height="108" fill="#0f1535" stroke="#7c3aed" stroke-width="1"/>
<text x="103" y="228" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 3</text>
<text x="103" y="240" text-anchor="middle" fill="#4b5563" font-size="7.5">± 28 m²</text>
<rect x="48" y="252" width="60" height="28" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="168" y="182" width="90" height="65" fill="#050a14" stroke="#0891b2" stroke-width="1"/>
<text x="213" y="213" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
<rect x="176" y="189" width="30" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<ellipse cx="213" cy="234" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<g transform="translate(300,218)"><circle cx="0" cy="0" r="25" fill="#080514" stroke="#8b5cf6" stroke-width="1.2"/><circle cx="0" cy="0" r="8" fill="#0d0b1e" stroke="#a78bfa" stroke-width="0.8"/><path d="M0,-25 A25,25 0 0,1 25,0" fill="none" stroke="#8b5cf6" stroke-width="2"/><text x="0" y="3" text-anchor="middle" fill="#a78bfa" font-size="7">TANGGA</text></g>
<rect x="348" y="182" width="125" height="65" fill="#0a0814" stroke="#374151" stroke-width="0.8"/>
<text x="410" y="212" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">CORRIDOR</text>
<text x="410" y="224" text-anchor="middle" fill="#4b5563" font-size="7.5">+ STORAGE</text>
<ellipse cx="260" cy="325" rx="228" ry="20" fill="none" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="5,4" opacity="0.6"/>
<text x="260" y="329" text-anchor="middle" fill="#8b5cf6" font-size="8">← BALKON MELINGKAR LANTAI 2 →</text>
<g transform="translate(468,355)"><circle cx="0" cy="0" r="13" fill="none" stroke="#8b5cf6" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#a78bfa"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#a78bfa" font-size="7" font-weight="700">U</text></g>
<text x="30" y="388" fill="#4b5563" font-size="7.5">SKALA 1:150  |  LT.2 ≈ 140 m²  |  3 KT + 2 KM + Balkon Melingkar</text>
</svg>`},
{label:"LT.3",info:[["Luas","≈140m²"],["KT","Master Suite Premium"],["Spesial","Rooftop + Balkon Melingkar"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#080510"/>
<text x="260" y="20" text-anchor="middle" fill="#a78bfa" font-size="10" font-weight="600" letter-spacing="2">LANTAI 3 — SILINDER ORGANIK (ROOFTOP)</text>
<line x1="60" y1="26" x2="460" y2="26" stroke="#a78bfa" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="460" height="280" fill="#0a0816" stroke="#6d28d9" stroke-width="1" stroke-dasharray="6,3"/>
<circle cx="70" cy="75" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.2"/>
<text x="70" y="79" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<circle cx="450" cy="75" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.2"/>
<text x="450" y="79" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<circle cx="70" cy="268" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.2"/>
<text x="70" y="272" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<circle cx="450" cy="268" r="18" fill="#110e20" stroke="#8b5cf6" stroke-width="1.2"/>
<text x="450" y="272" text-anchor="middle" fill="#8b5cf6" font-size="7" font-weight="600">SIL.</text>
<rect x="38" y="42" width="215" height="145" fill="#0f1535" stroke="#7c3aed" stroke-width="1.5"/>
<text x="145" y="107" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">MASTER SUITE</text>
<text x="145" y="119" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">PREMIUM LT.3</text>
<text x="145" y="131" text-anchor="middle" fill="#4b5563" font-size="7.5">± 60 m²  |  Akses Rooftop</text>
<rect x="50" y="155" width="90" height="26" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="50" y="155" width="90" height="10" rx="1" fill="#2d1f4e"/>
<rect x="152" y="155" width="45" height="20" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.4"/>
<text x="174" y="167" text-anchor="middle" fill="#a78bfa" font-size="7">WALK-IN</text>
<rect x="253" y="42" width="125" height="145" fill="#1a2535" stroke="#0891b2" stroke-width="1.2"/>
<text x="315" y="107" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM MASTER</text>
<text x="315" y="119" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">PREMIUM LT.3</text>
<text x="315" y="131" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
<rect x="261" y="52" width="65" height="28" rx="6" fill="none" stroke="#0891b2" stroke-width="0.9"/>
<text x="293" y="70" text-anchor="middle" fill="#67e8f9" font-size="7">SOAKING TUB PREMIUM</text>
<rect x="261" y="90" width="35" height="28" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="278" y="108" text-anchor="middle" fill="#67e8f9" font-size="7">SHOWER</text>
<rect x="378" y="42" width="80" height="145" fill="#091524" stroke="#22d3ee" stroke-width="1.2"/>
<text x="418" y="107" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">PRIVATE</text>
<text x="418" y="119" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">BALKON</text>
<text x="418" y="131" text-anchor="middle" fill="#4b5563" font-size="7.5">MELINGKAR</text>
<rect x="38" y="187" width="420" height="100" fill="#050a14" stroke="#15803d" stroke-width="1" stroke-dasharray="5,3"/>
<text x="248" y="220" text-anchor="middle" fill="#16a34a" font-size="9" font-weight="600">ROOFTOP GARDEN</text>
<text x="248" y="232" text-anchor="middle" fill="#4b5563" font-size="7.5">Taman Melayang + Area Santai  ± 90 m²</text>
<circle cx="100" cy="262" r="18" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
<circle cx="200" cy="255" r="22" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
<circle cx="310" cy="262" r="16" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
<circle cx="420" cy="258" r="18" fill="#052e0a" stroke="#16a34a" stroke-width="0.8"/>
<g transform="translate(280,218)"><circle cx="0" cy="0" r="20" fill="#080514" stroke="#8b5cf6" stroke-width="1.2"/><circle cx="0" cy="0" r="6" fill="#0d0b1e" stroke="#a78bfa" stroke-width="0.8"/><path d="M0,-20 A20,20 0 0,1 20,0" fill="none" stroke="#8b5cf6" stroke-width="1.5"/><text x="0" y="3" text-anchor="middle" fill="#a78bfa" font-size="6">TANGGA</text></g>
<ellipse cx="260" cy="333" rx="228" ry="20" fill="none" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="5,4" opacity="0.6"/>
<text x="260" y="337" text-anchor="middle" fill="#8b5cf6" font-size="8">← BALKON MELINGKAR LANTAI 3 →</text>
<g transform="translate(468,358)"><circle cx="0" cy="0" r="13" fill="none" stroke="#8b5cf6" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#a78bfa"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#a78bfa" font-size="7" font-weight="700">U</text></g>
<text x="30" y="392" fill="#4b5563" font-size="7.5">SKALA 1:150  |  LT.3 ≈ 140 m²  |  Master Suite Premium + Rooftop Garden</text>
</svg>`}
]},
{id:6,name:"Dark Concrete 2Lt",short:"Dark Concrete",color:"#e5e7eb",floors:[
{label:"LT.1",info:[["Luas","≈120m²"],["Fungsi","Living Open, Dapur Industrial, Dining"],["Spesial","Curtain Wall + Skylight Segitiga"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#080808"/>
<text x="260" y="20" text-anchor="middle" fill="#e5e7eb" font-size="10" font-weight="600" letter-spacing="2">LANTAI 1 — DARK CONCRETE 2 LANTAI</text>
<line x1="80" y1="26" x2="440" y2="26" stroke="#6b7280" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="33" width="460" height="250" fill="none" stroke="#4b5563" stroke-width="1.5"/>
<rect x="30" y="33" width="460" height="10" fill="#112233" stroke="#60a5fa" stroke-width="0.8"/>
<line x1="80" y1="33" x2="80" y2="43" stroke="#60a5fa" stroke-width="0.4"/>
<line x1="140" y1="33" x2="140" y2="43" stroke="#60a5fa" stroke-width="0.4"/>
<line x1="200" y1="33" x2="200" y2="43" stroke="#60a5fa" stroke-width="0.4"/>
<line x1="260" y1="33" x2="260" y2="43" stroke="#60a5fa" stroke-width="0.4"/>
<line x1="320" y1="33" x2="320" y2="43" stroke="#60a5fa" stroke-width="0.4"/>
<line x1="380" y1="33" x2="380" y2="43" stroke="#60a5fa" stroke-width="0.4"/>
<line x1="440" y1="33" x2="440" y2="43" stroke="#60a5fa" stroke-width="0.4"/>
<text x="260" y="42" text-anchor="middle" fill="#60a5fa" font-size="6.5" letter-spacing="1">CURTAIN WALL — KACA FULL</text>
<rect x="30" y="43" width="200" height="110" fill="#0d0d0d" stroke="#4b5563" stroke-width="1"/>
<text x="130" y="92" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">LIVING OPEN</text>
<text x="130" y="104" text-anchor="middle" fill="#6b7280" font-size="7.5">CURTAIN WALL  ± 45 m²</text>
<rect x="40" y="118" width="100" height="22" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
<rect x="40" y="115" width="22" height="25" rx="1" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.6"/>
<polygon points="230,43 310,43 270,75" fill="#0a1a2a" stroke="#60a5fa" stroke-width="1.2"/>
<text x="270" y="68" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="600">SKYLIGHT ▲</text>
<line x1="250" y1="43" x2="270" y2="73" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
<line x1="290" y1="43" x2="270" y2="73" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
<rect x="230" y="85" width="140" height="80" fill="#0d0d0d" stroke="#6b7280" stroke-width="1"/>
<text x="300" y="122" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">RUANG MAKAN</text>
<text x="300" y="134" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
<rect x="248" y="95" width="100" height="44" rx="0" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
<rect x="370" y="43" width="120" height="110" fill="#0d0d0d" stroke="#6b7280" stroke-width="1"/>
<text x="430" y="92" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">DAPUR INDUSTRIAL</text>
<text x="430" y="104" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
<rect x="375" y="47" width="110" height="11" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>
<rect x="375" y="47" width="11" height="100" rx="0" fill="#252525" stroke="#6b7280" stroke-width="0.5"/>
<rect x="400" y="75" width="60" height="24" rx="0" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.5"/>
<rect x="230" y="165" width="70" height="55" fill="#0a0e14" stroke="#4b5563" stroke-width="1"/>
<text x="265" y="187" text-anchor="middle" fill="#9ca3af" font-size="8" font-weight="600">WC TAMU</text>
<ellipse cx="265" cy="207" rx="14" ry="9" fill="none" stroke="#4b5563" stroke-width="0.7"/>
<rect x="300" y="165" width="70" height="55" fill="#0d0d0d" stroke="#4b5563" stroke-width="0.8"/>
<text x="335" y="188" text-anchor="middle" fill="#9ca3af" font-size="8">TANGGA</text>
<line x1="305" y1="173" x2="365" y2="173" stroke="#4b5563" stroke-width="0.5"/>
<line x1="305" y1="179" x2="365" y2="179" stroke="#4b5563" stroke-width="0.5"/>
<line x1="305" y1="185" x2="365" y2="185" stroke="#4b5563" stroke-width="0.5"/>
<line x1="305" y1="191" x2="365" y2="191" stroke="#4b5563" stroke-width="0.5"/>
<line x1="305" y1="197" x2="365" y2="197" stroke="#4b5563" stroke-width="0.5"/>
<line x1="305" y1="203" x2="365" y2="203" stroke="#4b5563" stroke-width="0.5"/>
<rect x="370" y="153" width="120" height="65" fill="#0a0a0a" stroke="#374151" stroke-width="0.8"/>
<text x="430" y="182" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">LAUNDRY / UTILITAS</text>
<rect x="30" y="153" width="200" height="55" fill="#0a0a0a" stroke="#374151" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="130" y="176" text-anchor="middle" fill="#4b5563" font-size="8.5">VOID DOUBLE HEIGHT</text>
<text x="130" y="188" text-anchor="middle" fill="#374151" font-size="7.5">+ TAMAN KERING</text>
<rect x="30" y="283" width="460" height="38" fill="#0a0a0a" stroke="#4b5563" stroke-width="0.8" stroke-dasharray="3,4"/>
<text x="260" y="304" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">TERAS DEPAN — BETON EKSPOS</text>
<g transform="translate(468,352)"><circle cx="0" cy="0" r="13" fill="none" stroke="#6b7280" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#9ca3af"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#9ca3af" font-size="7" font-weight="700">U</text></g>
<text x="30" y="388" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.1 ≈ 120 m²</text>
</svg>`},
{label:"LT.2",info:[["Luas","≈120m²"],["KT","3 Kamar Tidur + 2 KM"],["Spesial","Skylight Segitiga + Balkon Kaca atas Void"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#080808"/>
<text x="260" y="20" text-anchor="middle" fill="#e5e7eb" font-size="10" font-weight="600" letter-spacing="2">LANTAI 2 — DARK CONCRETE 2 LANTAI</text>
<line x1="80" y1="26" x2="440" y2="26" stroke="#6b7280" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="260" height="20" rx="3" fill="#0a0e14" stroke="#60a5fa" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="160" y="49" text-anchor="middle" fill="#60a5fa" font-size="7.5">← BALKON KACA ATAS VOID (VOID TERBUKA) →</text>
<rect x="30" y="58" width="175" height="140" fill="#0f1535" stroke="#7c3aed" stroke-width="1.5"/>
<text x="117" y="122" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT UTAMA</text>
<text x="117" y="134" text-anchor="middle" fill="#4b5563" font-size="7.5">± 40 m²</text>
<rect x="42" y="155" width="85" height="38" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="42" y="155" width="85" height="13" rx="1" fill="#2d1f4e"/>
<rect x="138" y="155" width="40" height="25" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.4"/>
<text x="158" y="170" text-anchor="middle" fill="#a78bfa" font-size="7">LEMARI</text>
<rect x="205" y="58" width="115" height="140" fill="#1a2535" stroke="#0891b2" stroke-width="1.2"/>
<text x="262" y="122" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
<text x="262" y="134" text-anchor="middle" fill="#4b5563" font-size="7.5">EN SUITE</text>
<rect x="213" y="68" width="55" height="26" rx="5" fill="none" stroke="#0891b2" stroke-width="0.8"/>
<text x="240" y="84" text-anchor="middle" fill="#67e8f9" font-size="7">BATHTUB</text>
<rect x="272" y="68" width="30" height="26" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="287" y="84" text-anchor="middle" fill="#67e8f9" font-size="7">SHOWER</text>
<rect x="213" y="160" width="30" height="18" rx="4" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<polygon points="320,58 400,58 360,92" fill="#0a1a2a" stroke="#60a5fa" stroke-width="1.2"/>
<text x="360" y="85" text-anchor="middle" fill="#60a5fa" font-size="7" font-weight="600">SKYLIGHT ▲</text>
<line x1="340" y1="58" x2="360" y2="90" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
<line x1="380" y1="58" x2="360" y2="90" stroke="#60a5fa" stroke-width="0.4" opacity="0.6"/>
<rect x="320" y="90" width="170" height="108" fill="#0d0d0d" stroke="#4b5563" stroke-width="1"/>
<text x="405" y="138" text-anchor="middle" fill="#d1d5db" font-size="9" font-weight="600">AREA KERJA</text>
<text x="405" y="150" text-anchor="middle" fill="#4b5563" font-size="7.5">BELAJAR  ± 30 m²</text>
<rect x="328" y="155" width="90" height="24" rx="2" fill="#1a1a1a" stroke="#6b7280" stroke-width="0.4"/>
<rect x="30" y="198" width="130" height="110" fill="#0f1535" stroke="#7c3aed" stroke-width="1"/>
<text x="95" y="245" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 2</text>
<text x="95" y="257" text-anchor="middle" fill="#4b5563" font-size="7.5">± 25 m²</text>
<rect x="40" y="268" width="70" height="34" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="160" y="198" width="130" height="110" fill="#0f1535" stroke="#7c3aed" stroke-width="1"/>
<text x="225" y="245" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 3</text>
<text x="225" y="257" text-anchor="middle" fill="#4b5563" font-size="7.5">± 22 m²</text>
<rect x="170" y="268" width="65" height="34" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="290" y="198" width="90" height="60" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="335" y="226" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
<rect x="298" y="205" width="30" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<ellipse cx="335" cy="247" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="380" y="198" width="110" height="110" fill="#0a0814" stroke="#22d3ee" stroke-width="1" stroke-dasharray="4,3"/>
<text x="435" y="245" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">BALKON KACA</text>
<text x="435" y="257" text-anchor="middle" fill="#4b5563" font-size="7.5">DI ATAS VOID</text>
<g transform="translate(468,352)"><circle cx="0" cy="0" r="13" fill="none" stroke="#6b7280" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#9ca3af"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#9ca3af" font-size="7" font-weight="700">U</text></g>
<text x="30" y="388" fill="#4b5563" font-size="7.5">SKALA 1:130  |  LT.2 ≈ 120 m²  |  3 KT + 2 KM + Skylight + Balkon Kaca</text>
</svg>`}
]},
{id:7,name:"Minimalis Tropis 2Lt",short:"Min. Tropis",color:"#fbbf24",floors:[
{label:"LT.1",info:[["Luas","≈130m²"],["Fungsi","Carport, Tamu, Keluarga, Dapur Open, Makan"],["Spesial","Louver Kayu Vertikal"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#0e0a04"/>
<text x="260" y="20" text-anchor="middle" fill="#d97706" font-size="10" font-weight="600" letter-spacing="2">LANTAI 1 — MINIMALIS TROPIS 2 LANTAI</text>
<line x1="80" y1="26" x2="440" y2="26" stroke="#d97706" stroke-width="0.5" opacity="0.4"/>
<rect x="30" y="35" width="130" height="88" fill="#0c0903" stroke="#92400e" stroke-width="1"/>
<text x="95" y="76" text-anchor="middle" fill="#92400e" font-size="8.5" font-weight="500">CARPORT 1 MOBIL</text>
<rect x="45" y="70" width="75" height="28" rx="3" fill="#181208" stroke="#78350f" stroke-width="0.5"/>
<line x1="30" y1="35" x2="30" y2="123" stroke="#d97706" stroke-width="2" opacity="0.6"/>
<line x1="33" y1="40" x2="33" y2="118" stroke="#d97706" stroke-width="1" opacity="0.3"/>
<line x1="36" y1="40" x2="36" y2="118" stroke="#d97706" stroke-width="1" opacity="0.3"/>
<text x="22" y="82" text-anchor="middle" fill="#d97706" font-size="6.5" transform="rotate(-90,22,82)" opacity="0.7">LOUVER KAYU</text>
<rect x="160" y="35" width="80" height="88" fill="#071208" stroke="#15803d" stroke-width="0.8"/>
<text x="200" y="76" text-anchor="middle" fill="#16a34a" font-size="8" font-weight="600">TAMAN MASUK</text>
<circle cx="175" cy="55" r="12" fill="#052e0a" stroke="#16a34a" stroke-width="0.7"/>
<circle cx="220" cy="50" r="9" fill="#052e0a" stroke="#16a34a" stroke-width="0.7"/>
<rect x="240" y="35" width="80" height="58" fill="#100c04" stroke="#d97706" stroke-width="1"/>
<text x="280" y="62" text-anchor="middle" fill="#d97706" font-size="9" font-weight="600">FOYER</text>
<text x="280" y="74" text-anchor="middle" fill="#4b5563" font-size="7.5">MASUK</text>
<rect x="30" y="125" width="200" height="110" fill="#100c04" stroke="#d97706" stroke-width="1"/>
<text x="130" y="174" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG TAMU</text>
<text x="130" y="186" text-anchor="middle" fill="#4b5563" font-size="7.5">± 38 m²</text>
<rect x="40" y="194" width="90" height="22" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
<rect x="40" y="191" width="20" height="25" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
<rect x="110" y="191" width="20" height="25" rx="2" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
<rect x="230" y="95" width="140" height="100" fill="#100c04" stroke="#d97706" stroke-width="1"/>
<text x="300" y="138" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG KELUARGA</text>
<text x="300" y="150" text-anchor="middle" fill="#4b5563" font-size="7.5">± 32 m²</text>
<rect x="235" y="100" width="90" height="8" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
<rect x="240" y="165" width="85" height="20" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
<rect x="320" y="95" width="180" height="70" fill="#100c04" stroke="#d97706" stroke-width="1"/>
<text x="410" y="126" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">DAPUR OPEN</text>
<text x="410" y="138" text-anchor="middle" fill="#4b5563" font-size="7.5">± 20 m²</text>
<rect x="325" y="99" width="170" height="10" rx="1" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
<rect x="360" y="120" width="80" height="22" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
<rect x="370" y="165" width="130" height="70" fill="#100c04" stroke="#d97706" stroke-width="1"/>
<text x="435" y="196" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG MAKAN</text>
<text x="435" y="208" text-anchor="middle" fill="#4b5563" font-size="7.5">± 18 m²</text>
<rect x="380" y="173" width="90" height="40" rx="3" fill="#1e1508" stroke="#d97706" stroke-width="0.5"/>
<rect x="230" y="195" width="70" height="55" fill="#050a12" stroke="#0891b2" stroke-width="1"/>
<text x="265" y="218" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">WC TAMU</text>
<ellipse cx="265" cy="238" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="300" y="195" width="70" height="55" fill="#0d0a04" stroke="#4b5563" stroke-width="0.8"/>
<text x="335" y="218" text-anchor="middle" fill="#6b7280" font-size="8">TANGGA</text>
<line x1="305" y1="203" x2="365" y2="203" stroke="#4b5563" stroke-width="0.5"/>
<line x1="305" y1="209" x2="365" y2="209" stroke="#4b5563" stroke-width="0.5"/>
<line x1="305" y1="215" x2="365" y2="215" stroke="#4b5563" stroke-width="0.5"/>
<line x1="305" y1="221" x2="365" y2="221" stroke="#4b5563" stroke-width="0.5"/>
<line x1="305" y1="227" x2="365" y2="227" stroke="#4b5563" stroke-width="0.5"/>
<line x1="305" y1="233" x2="365" y2="233" stroke="#4b5563" stroke-width="0.5"/>
<rect x="30" y="235" width="200" height="40" fill="#0a0804" stroke="#374151" stroke-width="0.8"/>
<text x="130" y="256" text-anchor="middle" fill="#6b7280" font-size="8.5" font-weight="600">UTILITAS / SERVIS</text>
<g transform="translate(468,350)"><circle cx="0" cy="0" r="13" fill="none" stroke="#d97706" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#d97706"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#d97706" font-size="7" font-weight="700">U</text></g>
<text x="30" y="386" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.1 ≈ 130 m²</text>
</svg>`},
{label:"LT.2",info:[["Luas","≈130m²"],["KT","2 Kamar Tidur + 2 KM"],["Balkon","Kaca Railing + Louver Kayu + Ruang Belajar"]],svg:`
<svg viewBox="0 0 520 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:'Poppins',sans-serif">
<rect width="520" height="400" fill="#0e0a04"/>
<text x="260" y="20" text-anchor="middle" fill="#d97706" font-size="10" font-weight="600" letter-spacing="2">LANTAI 2 — MINIMALIS TROPIS 2 LANTAI</text>
<line x1="80" y1="26" x2="440" y2="26" stroke="#d97706" stroke-width="0.5" opacity="0.4"/>
<line x1="30" y1="35" x2="30" y2="130" stroke="#d97706" stroke-width="2" opacity="0.6"/>
<line x1="33" y1="40" x2="33" y2="125" stroke="#d97706" stroke-width="1" opacity="0.3"/>
<line x1="36" y1="40" x2="36" y2="125" stroke="#d97706" stroke-width="1" opacity="0.3"/>
<text x="22" y="85" text-anchor="middle" fill="#d97706" font-size="6.5" transform="rotate(-90,22,85)" opacity="0.7">LOUVER KAYU</text>
<rect x="30" y="35" width="270" height="20" rx="3" fill="#0c0903" stroke="#d97706" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="165" y="49" text-anchor="middle" fill="#d97706" font-size="7.5">← BALKON KACA RAILING DEPAN →</text>
<rect x="30" y="58" width="175" height="135" fill="#100c04" stroke="#7c3aed" stroke-width="1.5"/>
<text x="117" y="119" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT UTAMA</text>
<text x="117" y="131" text-anchor="middle" fill="#4b5563" font-size="7.5">± 42 m²</text>
<rect x="42" y="148" width="85" height="40" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="42" y="148" width="85" height="13" rx="1" fill="#2d1f4e"/>
<rect x="138" y="148" width="40" height="28" rx="1" fill="#252535" stroke="#7c3aed" stroke-width="0.4"/>
<text x="158" y="164" text-anchor="middle" fill="#a78bfa" font-size="7">LEMARI</text>
<rect x="205" y="58" width="105" height="135" fill="#1a2535" stroke="#0891b2" stroke-width="1.2"/>
<text x="257" y="120" text-anchor="middle" fill="#67e8f9" font-size="9" font-weight="600">KM UTAMA</text>
<text x="257" y="132" text-anchor="middle" fill="#4b5563" font-size="7.5">EN SUITE</text>
<rect x="213" y="68" width="50" height="24" rx="4" fill="none" stroke="#0891b2" stroke-width="0.8"/>
<text x="238" y="83" text-anchor="middle" fill="#67e8f9" font-size="7">BATHTUB</text>
<rect x="268" y="68" width="30" height="24" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<text x="283" y="83" text-anchor="middle" fill="#67e8f9" font-size="7">SHOWER</text>
<rect x="213" y="158" width="30" height="18" rx="4" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="310" y="35" width="210" height="110" fill="#100c04" stroke="#d97706" stroke-width="1"/>
<text x="415" y="82" text-anchor="middle" fill="#fbbf24" font-size="9" font-weight="600">RUANG BELAJAR</text>
<text x="415" y="94" text-anchor="middle" fill="#4b5563" font-size="7.5">± 38 m²</text>
<rect x="320" y="46" width="100" height="24" rx="2" fill="#1a1208" stroke="#d97706" stroke-width="0.4"/>
<rect x="30" y="195" width="175" height="110" fill="#100c04" stroke="#7c3aed" stroke-width="1"/>
<text x="117" y="242" text-anchor="middle" fill="#a78bfa" font-size="9" font-weight="600">KT 2</text>
<text x="117" y="254" text-anchor="middle" fill="#4b5563" font-size="7.5">± 30 m²</text>
<rect x="42" y="265" width="75" height="34" rx="2" fill="#1f1535" stroke="#7c3aed" stroke-width="0.5"/>
<rect x="42" y="265" width="75" height="12" rx="1" fill="#2d1f4e"/>
<rect x="205" y="195" width="90" height="65" fill="#1a2535" stroke="#0891b2" stroke-width="1"/>
<text x="250" y="225" text-anchor="middle" fill="#67e8f9" font-size="8.5" font-weight="600">KM 2</text>
<rect x="213" y="202" width="30" height="14" rx="3" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<ellipse cx="250" cy="247" rx="14" ry="9" fill="none" stroke="#0891b2" stroke-width="0.7"/>
<rect x="295" y="145" width="80" height="60" fill="#0d0a04" stroke="#4b5563" stroke-width="0.8"/>
<text x="335" y="171" text-anchor="middle" fill="#6b7280" font-size="8">TANGGA</text>
<line x1="300" y1="153" x2="370" y2="153" stroke="#4b5563" stroke-width="0.5"/>
<line x1="300" y1="160" x2="370" y2="160" stroke="#4b5563" stroke-width="0.5"/>
<line x1="300" y1="167" x2="370" y2="167" stroke="#4b5563" stroke-width="0.5"/>
<line x1="300" y1="174" x2="370" y2="174" stroke="#4b5563" stroke-width="0.5"/>
<line x1="300" y1="181" x2="370" y2="181" stroke="#4b5563" stroke-width="0.5"/>
<rect x="375" y="145" width="145" height="160" fill="#071208" stroke="#15803d" stroke-width="1" stroke-dasharray="4,3"/>
<text x="447" y="225" text-anchor="middle" fill="#16a34a" font-size="8.5" font-weight="600">BALKON</text>
<text x="447" y="237" text-anchor="middle" fill="#16a34a" font-size="8.5" font-weight="600">BELAKANG</text>
<text x="447" y="249" text-anchor="middle" fill="#4b5563" font-size="7.5">+ TAMAN KECIL</text>
<rect x="295" y="210" width="80" height="90" fill="#100c04" stroke="#d97706" stroke-width="0.8" stroke-dasharray="4,3"/>
<text x="335" y="250" text-anchor="middle" fill="#fbbf24" font-size="8" font-weight="600">KORIDOR</text>
<text x="335" y="262" text-anchor="middle" fill="#4b5563" font-size="7.5">STORAGE</text>
<g transform="translate(468,350)"><circle cx="0" cy="0" r="13" fill="none" stroke="#d97706" stroke-width="0.8"/><polygon points="0,-11 -4,0 0,3 4,0" fill="#d97706"/><polygon points="0,11 -4,0 0,-3 4,0" fill="#374151" opacity="0.5"/><text x="0" y="-14" text-anchor="middle" fill="#d97706" font-size="7" font-weight="700">U</text></g>
<text x="30" y="386" fill="#4b5563" font-size="7.5">SKALA 1:120  |  LT.2 ≈ 130 m²  |  2 KT + 2 KM + Balkon Kaca + Louver</text>
</svg>`}
]}
];

let curProj=0,curFloor=0;
function render(){
const p=PROJECTS[curProj];
const f=p.floors[curFloor];
document.getElementById('svgContainer').innerHTML=f.svg;
document.getElementById('floorBadge').textContent=f.label;
document.getElementById('floorBadge').style.setProperty('--ac',p.color);
document.querySelectorAll('.ftab').forEach((t,i)=>{t.style.setProperty('--ac',p.color);t.classList.toggle('active',i===curFloor);});
document.querySelectorAll('.ptab').forEach((t,i)=>{t.classList.toggle('active',i===curProj);});
const chips=f.info.map(([k,v])=>`<div class="info-chip">${k}: <span>${v}</span></div>`).join('');
document.getElementById('infoBar').innerHTML=chips;
}
function buildTabs(){
const pt=document.getElementById('projTabs');
PROJECTS.forEach((p,i)=>{
const b=document.createElement('button');
b.className='ptab'+(i===0?' active':'');
b.textContent=p.short;
b.style.setProperty('--ac',p.color);
b.onclick=()=>{curProj=i;curFloor=0;buildFloorTabs();render();};
pt.appendChild(b);
});
buildFloorTabs();
}
function buildFloorTabs(){
const ft=document.getElementById('floorTabs');
ft.innerHTML='';
const p=PROJECTS[curProj];
p.floors.forEach((f,i)=>{
const b=document.createElement('button');
b.className='ftab'+(i===0?' active':'');
b.style.setProperty('--ac',p.color);
b.textContent=f.label;
b.onclick=()=>{curFloor=i;render();};
ft.appendChild(b);
});
}
buildTabs();
render();

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

    // ✅ FIX: Gunakan SVG dari array PROJECTS (huruf besar) yang sudah ada di atas.
    // Sebelumnya referensi ke denahP1..denahP8 yang tidak terdefinisi → ReferenceError.
    const denahPlaceholder = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                    padding:40px;color:#888;text-align:center;gap:12px">
            <i class="ti ti-layout-2" style="font-size:48px;opacity:0.4"></i>
            <p style="font-size:13px;margin:0">Denah untuk proyek ini belum tersedia.<br>
            Hubungi kami untuk gambar kerja lengkap.</p>
        </div>`;

    // Ambil SVG lantai pertama dari PROJECTS yang sesuai index, atau tampilkan placeholder
    const matchedProject = PROJECTS.find(proj => proj.id === idx);
    const denahSvg = matchedProject
        ? matchedProject.floors.map(f => f.svg).join('<hr style="border-color:#333;margin:8px 0">')
        : denahPlaceholder;

    document.getElementById('denahSvg').innerHTML = denahSvg;

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
    initStatsCounter();
    initChatNotification();
    init();

    setTimeout(() => {
        if (window.statsCounter) {
            window.statsCounter.updateDisplay(true);
        }
    }, 1000);

    document.querySelectorAll('.portfolio-item').forEach(item => {
        item.addEventListener('click', () => openModal(+item.dataset.index));
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(+item.dataset.index);
            }
        });
    });

    const backdrop = document.getElementById('pfModalBackdrop');
    if (backdrop) {
        backdrop.addEventListener('click', function (e) {
            if (e.target === this) closeModal();
        });
    }

    document.addEventListener('keydown', e => {
        if (!document.getElementById('pfModalBackdrop').classList.contains('open')) return;
        if (e.key === 'Escape')     closeModal();
        if (e.key === 'ArrowRight') navigate(1);
        if (e.key === 'ArrowLeft')  navigate(-1);
    });
});
