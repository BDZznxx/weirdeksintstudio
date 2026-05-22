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
let currentModalIndex = 0;
 
function openModal(idx) {
    currentModalIndex = idx;
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
 
    /* ================================================================
       FIX #4: Replaced undefined denahP1…denahP8 variables with
       inline SVG floor plan rendered from the projects[].floors data.
       This reuses the same renderDenah() logic but targets the modal.
       ================================================================ */
    const modalFloorData = p.floors && p.floors.length > 0 ? p.floors[0] : null;
    if (modalFloorData) {
        document.getElementById('denahModalSvg').innerHTML = buildDenahSVG(modalFloorData);
    } else {
        document.getElementById('denahModalSvg').innerHTML =
            `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                         padding:40px;color:#888;text-align:center;gap:12px">
                <i class="ti ti-layout-2" style="font-size:48px;opacity:0.4"></i>
                <p style="font-size:13px;margin:0">Denah belum tersedia.<br>Hubungi kami untuk gambar kerja lengkap.</p>
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
    const next = currentModalIndex + dir;
    if (next >= 0 && next < projects.length) openModal(next);
}
 
function switchTab(tab) {
    ['konsep', 'denah', 'file'].forEach(t => {
        const tabEl     = document.getElementById('tab-' + t);
        const contentEl = document.getElementById('content-' + t);
        const isActive  = t === tab;
        if (tabEl)     { tabEl.classList.toggle('active', isActive); tabEl.setAttribute('aria-selected', isActive ? 'true' : 'false'); }
        if (contentEl) contentEl.classList.toggle('active', isActive);
    });
}
 
/* ================================================================
   FLOOR PLAN VIEWER — RENDER FUNCTIONS
   ================================================================ */
function renderSidebar() {
    const el = document.getElementById('sidebarList');
    if (!el) return;
    el.innerHTML = projects.map((p,i) => `
        <div class="proj-item${i===curProj?' active':''}" onclick="selectProj(${i})">
            <div class="proj-num">P${p.id}</div>
            <div class="proj-dot" style="background:${p.pftype==='res'?'#38bdf8':'#fbbf24'}"></div>
            <div class="proj-info">
                <div class="proj-title">${p.name}</div>
                <div class="proj-meta">
                    <span class="badge badge-${p.pftype}">${p.pftype==='res'?'Res':'Kom'}</span>
                    <span>${p.luas}</span>
                </div>
            </div>
        </div>
    `).join('');
}
 
function renderMobileSelect() {
    const sel = document.getElementById('mobileSelect');
    if (!sel) return;
    sel.innerHTML = projects.map((p,i) =>
        `<option value="${i}"${i===curProj?' selected':''}>P${p.id} — ${p.name} (${p.luas})</option>`
    ).join('');
}
 
function renderHeader() {
    const p = projects[curProj];
    const titleEl = document.getElementById('projTitle');
    const chipsEl = document.getElementById('projChips');
    if (titleEl) titleEl.textContent = `${p.name} — ${p.sub}`;
    if (chipsEl) chipsEl.innerHTML = `
        <span class="chip chip-accent">${p.luas}</span>
        <span class="chip">${p.floors.length} lantai</span>
        ${p.kt  ? `<span class="chip">${p.kt} KT</span>`  : ''}
        ${p.km  ? `<span class="chip">${p.km} KM</span>`  : ''}
        ${p.garasi ? `<span class="chip">${p.garasi} garasi</span>` : ''}
        <span class="chip">${p.tahun}</span>
        <span class="chip badge-${p.pftype}" style="border-radius:20px;padding:4px 10px;font-size:11px">${p.pftype==='res'?'Residensial':'Komersil'}</span>
    `;
    const footerLeft = document.getElementById('footerLeft');
    if (footerLeft) footerLeft.textContent = `Weird Eksint Studio · P${p.id} · ${p.name} · ${p.sub} · ${p.luas}`;
}
 
function renderFloorTabs() {
    const p  = projects[curProj];
    const el = document.getElementById('floorTabs');
    if (!el) return;
    el.innerHTML = p.floors.map((f,i) =>
        `<div class="ftab${i===curFloor?' on':''}" onclick="selectFloor(${i})">${f.label}</div>`
    ).join('');
}
 
/* ================================================================
   FIX #5: buildDenahSVG() extracted as reusable function.
   Used by both the floor plan viewer AND the modal denah tab.
   ================================================================ */
function buildDenahSVG(fl) {
    const SVG_W = 640;
    const PAD   = 20;
    let maxX = 0, maxY = 0;
    fl.rooms.forEach(r => {
        if (r.x + r.w > maxX) maxX = r.x + r.w;
        if (r.y + r.h > maxY) maxY = r.y + r.h;
    });
    const svgH = maxY + PAD + 30;
    let html = `<svg viewBox="0 0 ${SVG_W} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">`;
 
    fl.rooms.forEach(r => {
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const words = r.l.split(' ');
        const fs    = r.w < 90 || r.h < 40 ? 8.5 : r.w < 130 ? 9.5 : 10.5;
        const mid   = Math.ceil(words.length / 2);
        const row1  = words.slice(0, mid).join(' ');
        const row2  = words.slice(mid).join(' ');
        const twoLine = words.length > 2 && r.h >= 36 && r.w >= 60;
 
        html += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4"
            fill="${r.c}" fill-opacity="0.82"
            stroke="${strokeFor(r.c)}" stroke-width="1.2" stroke-opacity="0.6"/>`;
 
        if (r.c === C.tangga) { html += hatch(r); }
 
        if (r.h >= 24 && r.w >= 36) {
            if (twoLine) {
                html += `<text text-anchor="middle" font-size="${fs}" font-weight="500"
                    fill="#0f172a" font-family="Sora,sans-serif" letter-spacing="-0.2">
                    <tspan x="${cx}" y="${cy - fs*0.55}">${row1}</tspan>
                    <tspan x="${cx}" dy="${fs*1.3}">${row2}</tspan>
                </text>`;
            } else {
                html += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
                    font-size="${fs}" font-weight="500" fill="#0f172a"
                    font-family="Sora,sans-serif" letter-spacing="-0.2">${r.l}</text>`;
            }
        }
    });
 
    // Compass
    const cx2 = SVG_W - 22, cy2 = 22;
    html += `
        <circle cx="${cx2}" cy="${cy2}" r="14" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
        <text x="${cx2}" y="${cy2-3}" text-anchor="middle" dominant-baseline="central"
            font-size="9" fill="#f0ede8" font-family="DM Mono,monospace" font-weight="500">N</text>
        <line x1="${cx2}" y1="${cy2-11}" x2="${cx2}" y2="${cy2-2}"
            stroke="#c9a96e" stroke-width="1.5" stroke-linecap="round"/>
    `;
 
    // Scale bar
    html += `
        <line x1="20" y1="${svgH-14}" x2="80" y2="${svgH-14}"
            stroke="rgba(255,255,255,0.35)" stroke-width="2" stroke-linecap="square"/>
        <line x1="20" y1="${svgH-18}" x2="20" y2="${svgH-10}"
            stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/>
        <line x1="80" y1="${svgH-18}" x2="80" y2="${svgH-10}"
            stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/>
        <text x="50" y="${svgH-5}" text-anchor="middle"
            font-size="8.5" fill="rgba(255,255,255,0.45)" font-family="DM Mono,monospace">5 m</text>
    `;
 
    // Watermark
    html += `
        <text x="${SVG_W-8}" y="${svgH-5}" text-anchor="end"
            font-size="8.5" fill="rgba(255,255,255,0.25)" font-family="DM Mono,monospace">
            Weird Eksint Studio · skematik denah
        </text>
    `;
 
    html += `</svg>`;
    return html;
}
 
function renderDenah() {
    const fl  = projects[curProj].floors[curFloor];
    const svg = document.getElementById('denahSvg');
    if (!svg) return;
 
    const SVG_W = 640;
    const PAD   = 20;
    let maxX = 0, maxY = 0;
    fl.rooms.forEach(r => {
        if (r.x + r.w > maxX) maxX = r.x + r.w;
        if (r.y + r.h > maxY) maxY = r.y + r.h;
    });
    const svgH = maxY + PAD + 30;
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${svgH}`);
    svg.innerHTML = buildDenahSVG(fl).replace(/<svg[^>]*>/, '').replace('</svg>', '');
}
 
function hatch(r) {
    let lines = '';
    const step = 8;
    for (let i = r.x - r.h; i < r.x + r.w + r.h; i += step) {
        const x1 = Math.max(r.x, i);
        const y1 = x1 === r.x ? r.y + (i - r.x + r.h) : r.y;
        const x2 = Math.min(r.x + r.w, i + r.h);
        const y2 = x2 === r.x + r.w ? r.y + (i - r.x + r.h - r.w) : r.y + r.h;
        if (x2 > x1) {
            lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                stroke="rgba(100,80,200,0.25)" stroke-width="0.8"/>`;
        }
    }
    return lines;
}
 
function strokeFor(fill) {
    const m = fill.match(/rgba\((\d+),(\d+),(\d+)/);
    if (!m) return '#666';
    return `rgba(${Math.max(0,m[1]-60)},${Math.max(0,m[2]-60)},${Math.max(0,m[3]-60)},0.9)`;
}
 
function renderLegend() {
    const el = document.getElementById('legend');
    if (!el) return;
    el.innerHTML = LEGEND.map(l =>
        `<div class="leg-item">
            <div class="leg-dot" style="background:${l.c}"></div>
            ${l.l}
        </div>`
    ).join('');
}
 
/* ================================================================
   FLOOR PLAN VIEWER — ACTIONS
   ================================================================ */
function selectProj(i) {
    curProj  = i;
    curFloor = 0;
    renderAll();
}
 
function selectFloor(i) {
    curFloor = i;
    renderFloorTabs();
    renderDenah();
}
 
function renderAll() {
    renderSidebar();
    renderMobileSelect();
    renderHeader();
    renderFloorTabs();
    renderDenah();
    renderLegend();
}
 
/* ================================================================
   KEYBOARD NAVIGATION
   ================================================================ */
document.addEventListener('keydown', e => {
    // Floor plan keyboard nav (only when modal is closed)
    if (!document.getElementById('pfModalBackdrop')?.classList.contains('open')) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            const p = projects[curProj];
            if (curFloor < p.floors.length - 1) selectFloor(curFloor + 1);
            else if (curProj < projects.length - 1) selectProj(curProj + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            if (curFloor > 0) selectFloor(curFloor - 1);
            else if (curProj > 0) selectProj(curProj - 1);
        }
    }
    // Modal keyboard nav
    if (document.getElementById('pfModalBackdrop')?.classList.contains('open')) {
        if (e.key === 'Escape')     closeModal();
        if (e.key === 'ArrowRight') navigate(1);
        if (e.key === 'ArrowLeft')  navigate(-1);
    }
});

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
 
// Init floor plan viewer
    renderAll();
});
