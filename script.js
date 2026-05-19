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
    const href   = e.currentTarget.getAttribute('href'); // PERBAIKAN: currentTarget lebih aman
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
 
// PERBAIKAN: Fungsi initStatsCounter diperlukan oleh init()
const initStatsCounter = () => {
    if (window.statsCounter) return; // sudah diinit
    // AdvancedStatsCounter akan diinit di DOMContentLoaded
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
     DATA PROYEK
     ============================================================
     Sesuaikan:
     - emoji   : ikon placeholder (sebelum gambar asli dimuat)
     - desc    : deskripsi singkat proyek
     - info    : spesifikasi 4 kolom
     - denah   : SVG denah bangunan (ganti dengan gambar nyata jika ada)
     - legend  : keterangan warna denah
     - files   : daftar file; ganti url dengan link Google Drive / server Anda
  ============================================================ */
  const projects = [
    {
      name: "Rumah Hunian Moderen 3 Lantai",
      type: "Residensial",
      emoji: "🏠",
      color: "#E1F5EE",
      desc: "Rumah dengan konsep moderen yang memiliki teknologi pada setiap lantai nya.",
      info: [
        { label: "Luas Bangunan", value: "360 m²" },
        { label: "Luas perlantai", value :" 120 m²" },
        { label: "Lantai",        value: "3 Lantai"  },
        { label: "Tahun",         value: "2026"      }
      ],
      denah: `<svg viewBox="0 0 380 280" width="380" height="280" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="270" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <text x="12" y="22" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 1</text>
        <rect x="10" y="28" width="110" height="70" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="65" y="66" text-anchor="middle" font-size="10" fill="#085041">Ruang Tamu</text>
        <rect x="128" y="28" width="90" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="173" y="66" text-anchor="middle" font-size="10" fill="#633806">Dapur</text>
        <rect x="226" y="28" width="70" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="261" y="66" text-anchor="middle" font-size="10" fill="#633806">KM</text>
        <rect x="304" y="28" width="66" height="70" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="337" y="66" text-anchor="middle" font-size="10" fill="#444441">Garasi</text>
        <rect x="10" y="105" width="360" height="14" rx="2" fill="#FAC775" stroke="#BA7517" stroke-width="0.5" opacity="0.5"/>
        <text x="190" y="116" text-anchor="middle" font-size="8" fill="#633806">Koridor</text>
        <text x="12" y="138" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 2</text>
        <rect x="10" y="124" width="130" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="75" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT Master</text>
        <rect x="148" y="124" width="100" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="198" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 2</text>
        <rect x="256" y="124" width="114" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="313" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 3</text>
        <text x="12" y="208" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 3</text>
        <rect x="10" y="196" width="180" height="72" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="100" y="236" text-anchor="middle" font-size="10" fill="#0C447C">KT 4 &amp; KT 5</text>
      </svg>`,
      legend: [
        { color: "#C0DD97", label: "Unit Rumah"   },
        { color: "#B5D4F4", label: "Fasilitas"    },
        { color: "#FAC775", label: "Jalan Cluster"},
        { color: "#9FE1CB", label: "RTH / Taman"  }
      ],
      files: [
        { icon: "ti-file-3d",       name: "3Drumahhunian3lantai.skp",   size: "48.2 MB", type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah_hunian3lantai.dwg",   size: "12.4 MB", type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Presentasi_Konsep_bangunan.pdf",   size: "8.6 MB",  type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Rumah Hunian 2 Lantai Minimalis",
      type: "Residensial",
      emoji: "🏠",
      color: "#E6F1FB",
      desc: "Bangunan ini memiliki konsep bentuk geometris tegas dan bersih, bukaan kaca besar untuk pencahayaan alami, memiliki atap datar.",
      info: [
        { label: "Luas Bangunan", value: "260 m²" },
        { label: "Luas perlantai", value :130 m²" },
        { label: "Lantai",        value: "2 Lantai"  },
        { label: "Tahun",         value: "2026"      }
      ],
      denah: `<svg viewBox="0 0 380 280" width="380" height="280" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="270" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <text x="12" y="22" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 1</text>
        <rect x="10" y="28" width="110" height="70" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="65" y="66" text-anchor="middle" font-size="10" fill="#085041">Ruang Tamu</text>
        <rect x="128" y="28" width="90" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="173" y="66" text-anchor="middle" font-size="10" fill="#633806">Dapur</text>
        <rect x="226" y="28" width="70" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="261" y="66" text-anchor="middle" font-size="10" fill="#633806">KM</text>
        <rect x="304" y="28" width="66" height="70" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="337" y="66" text-anchor="middle" font-size="10" fill="#444441">Garasi</text>
        <rect x="10" y="105" width="360" height="14" rx="2" fill="#FAC775" stroke="#BA7517" stroke-width="0.5" opacity="0.5"/>
        <text x="190" y="116" text-anchor="middle" font-size="8" fill="#633806">Koridor</text>
        <text x="12" y="138" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 2</text>
        <rect x="10" y="124" width="130" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="75" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT Master</text>
        <rect x="148" y="124" width="100" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="198" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 2</text>
        <rect x="256" y="124" width="114" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="313" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 3</text>
      </svg>`,
      legend: [
        { color: "#C0DD97", label: "Unit Rumah"   },
        { color: "#B5D4F4", label: "Fasilitas"    },
        { color: "#FAC775", label: "Jalan Cluster"},
        { color: "#9FE1CB", label: "RTH / Taman"  }
      ],
      files: [
        { icon: "ti-file-3d",       name: "Rumah2lantai_Massing_Model.rvt",   size: "124 MB", type: "Revit",    url: "#" },
        { icon: "ti-file-vector",   name: "Denah.dwg",     size: "18.7 MB", type: "AutoCAD", url: "#" },
        { icon: "ti-file-type-pdf", name: "Konsep_Desain_Lengkap.pdf",       size: "22 MB",  type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Rumah Hunian 3 Lantai",
      type: "Residensial",
      emoji: "🏠",
      color: "#FAEEDA",
      desc: "Desain rumah 3 lantai bergaya kontemporer tropis. Memaksimalkan pencahayaan alami melalui void di tengah bangunan dan material fasad kayu ulin yang tahan iklim Kalimantan.",
      info: [
        { label: "Luas Bangunan",  value: "420 m²"        },
        { label: "Kamar Tidur",    value: "5 KT + 1 ART"  },
        { label: "Tahun",          value: "2023"           }
      ],
      denah: `<svg viewBox="0 0 380 280" width="380" height="280" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="270" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <text x="12" y="22" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 1</text>
        <rect x="10" y="28" width="110" height="70" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="65" y="66" text-anchor="middle" font-size="10" fill="#085041">Ruang Tamu</text>
        <rect x="128" y="28" width="90" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="173" y="66" text-anchor="middle" font-size="10" fill="#633806">Dapur</text>
        <rect x="226" y="28" width="70" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="261" y="66" text-anchor="middle" font-size="10" fill="#633806">KM</text>
        <rect x="304" y="28" width="66" height="70" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="337" y="66" text-anchor="middle" font-size="10" fill="#444441">Garasi</text>
        <rect x="10" y="105" width="360" height="14" rx="2" fill="#FAC775" stroke="#BA7517" stroke-width="0.5" opacity="0.5"/>
        <text x="190" y="116" text-anchor="middle" font-size="8" fill="#633806">Koridor</text>
        <text x="12" y="138" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 2</text>
        <rect x="10" y="124" width="130" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="75" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT Master</text>
        <rect x="148" y="124" width="100" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="198" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 2</text>
        <rect x="256" y="124" width="114" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="313" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 3</text>
        <text x="12" y="208" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 3</text>
        <rect x="10" y="196" width="180" height="72" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="100" y="236" text-anchor="middle" font-size="10" fill="#0C447C">KT 4 &amp; KT 5</text>
        <rect x="198" y="196" width="172" height="72" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="284" y="236" text-anchor="middle" font-size="10" fill="#085041">Rooftop Lounge</text>
      </svg>`,
      legend: [
        { color: "#B5D4F4", label: "Kamar Tidur"   },
        { color: "#9FE1CB", label: "Ruang Hidup"   },
        { color: "#FAC775", label: "Dapur & KM"    },
        { color: "#D3D1C7", label: "Garasi/Tangga" }
      ],
      files: [
        { icon: "ti-file-3d",       name: "Rumah3Lantai_Render.skp",    size: "35.8 MB", type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Lt1_Lt2_Lt3.dwg",     size: "9.2 MB",  type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Gambar_Kerja_Lengkap.pdf",  size: "14 MB",   type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Rumah Hunian Minimalis 2 Lantai",
      type: "Residensial",
      emoji: "🏘️",
      color: "#EAF3DE",
      desc: "Perencanaan rumah minimalis 2 lantai .",
      info: [
        { label: "Luas Bangunan",  value: "130 m²"        },
        { label: "Kamar Tidur",    value: "4 KT + 1 ART"  },
        { label: "Tahun",          value: "2026"           }
      ],
      denah: `<svg viewBox="0 0 380 280" width="380" height="280" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="270" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <text x="12" y="22" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 1</text>
        <rect x="10" y="28" width="110" height="70" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="65" y="66" text-anchor="middle" font-size="10" fill="#085041">Ruang Tamu</text>
        <rect x="128" y="28" width="90" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="173" y="66" text-anchor="middle" font-size="10" fill="#633806">Dapur</text>
        <rect x="226" y="28" width="70" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="261" y="66" text-anchor="middle" font-size="10" fill="#633806">KM</text>
        <rect x="304" y="28" width="66" height="70" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="337" y="66" text-anchor="middle" font-size="10" fill="#444441">Garasi</text>
        <rect x="10" y="105" width="360" height="14" rx="2" fill="#FAC775" stroke="#BA7517" stroke-width="0.5" opacity="0.5"/>
        <text x="190" y="116" text-anchor="middle" font-size="8" fill="#633806">Koridor</text>
        <text x="12" y="138" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 2</text>
        <rect x="10" y="124" width="130" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="75" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT Master</text>
        <rect x="148" y="124" width="100" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="198" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 2</text>
        <rect x="256" y="124" width="114" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="313" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 3</text>
      </svg>`,
      legend: [
        { color: "#C0DD97", label: "Unit Rumah"   },
        { color: "#B5D4F4", label: "Fasilitas"    },
        { color: "#FAC775", label: "Jalan Cluster"},
        { color: "#9FE1CB", label: "RTH / Taman"  }
      ],
      files: [
        { icon: "ti-file-3d",       name: "rumah2LT_3D.skp", size: "67 MB",   type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah.dwg",    size: "24 MB",   type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Konsep.pdf",      size: "5.4 MB",  type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Weird Coffee",
      type: "Komersil",
      emoji: "☕",
      color: "#FBEAF0",
      desc: "Memiliki konsep Fasad Box.",
      info: [
        { label: "Luas Bangunan", value: "50 m²"        },
        { label: "Kapasitas",  value: "15 kursi"       },
        { label: "Konsep",     value: "Fasad Box"},
        { label: "Tahun",      value: "2026"           }
      ],
      denah: `<svg viewBox="0 0 380 260" width="380" height="260" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="250" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <rect x="10" y="10" width="240" height="72" rx="3" fill="#F5C4B3" stroke="#993C1D" stroke-width="1"/>
        <text x="130" y="50" text-anchor="middle" font-size="10" fill="#712B13">Area Duduk Indoor A</text>
        <rect x="10" y="90" width="240" height="95" rx="3" fill="#F5C4B3" stroke="#993C1D" stroke-width="1"/>
        <text x="130" y="141" text-anchor="middle" font-size="10" fill="#712B13">Area Duduk Indoor B</text>
        <rect x="258" y="10" width="112" height="175" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="314" y="100" text-anchor="middle" font-size="10" fill="#0C447C">Bar Counter</text>
        <text x="314" y="115" text-anchor="middle" font-size="9" fill="#185FA5">+ Kasir</text>
        <rect x="10" y="193" width="240" height="57" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="130" y="225" text-anchor="middle" font-size="10" fill="#633806">Outdoor Terrace</text>
        <rect x="258" y="193" width="112" height="57" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="314" y="225" text-anchor="middle" font-size="10" fill="#444441">Dapur + Toilet</text>
      </svg>`,
      legend: [
        { color: "#F5C4B3", label: "Area Duduk"  },
        { color: "#B5D4F4", label: "Bar Counter"  },
        { color: "#D3D1C7", label: "Dapur/Servis" },
        { color: "#FAC775", label: "Outdoor"      }
      ],
      files: [
        { icon: "ti-file-3d",       name: "3D_Weird Coffee.skp", size: "28 MB",  type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Weird Coffee.dwg",      size: "7.1 MB", type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Konsep.pdf",       size: "9 MB",   type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Rumah Minimalis ",
      type: "Residensial",
      emoji: "🏠",
      color: "#EEEDFE",
      desc: "Rumah minimalis yang mengoptimalkan setiap sudut ruang. Palet warna putih-abu dengan aksen kayu natural menciptakan atmosfer bersih, tenang, dan hangat.",
      info: [
        { label: "Luas Bangunan", value: "150 m²" },
        { label: "Kamar Tidur",   value: "3 KT"   },
        { label: "Tahun",         value: "2026"   }
      ],
      denah: `<svg viewBox="0 0 380 260" width="380" height="260" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="250" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <text x="12" y="20" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 1</text>
        <rect x="10" y="25" width="120" height="90" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="70" y="73" text-anchor="middle" font-size="10" fill="#085041">Ruang Tamu</text>
        <rect x="138" y="25" width="120" height="90" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="198" y="73" text-anchor="middle" font-size="10" fill="#633806">Dapur + Makan</text>
        <rect x="266" y="25" width="104" height="90" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="75" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT Master</text>
        <rect x="148" y="124" width="100" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="198" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 2</text>
        <text x="318" y="73" text-anchor="middle" font-size="10" fill="#444441">Garasi</text>
        <rect x="10" y="122" width="364" height="10" fill="#FAC775" opacity="0.4"/>
      </svg>`,
      legend: [
        { color: "#CECBF6", label: "Kamar Tidur"          },
        { color: "#9FE1CB", label: "Ruang Tamu/Keluarga"  },
        { color: "#FAC775", label: "Dapur & KM"           },
        { color: "#D3D1C7", label: "Garasi / Tangga"      }
      ],
      files: [
        { icon: "ti-file-3d",       name: "Minimalis_1L_Model.skp", size: "22 MB",  type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Minimalis.dwg",    size: "5.8 MB", type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "RAB_dan_Gambar.pdf",     size: "11 MB",  type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Rumah Hunian 3 Lantai Moderen",
      type: "Residensial",
      emoji: "🏠",
      color: "#FAECE7",
      desc: "Memiliki konsep Neo Futuristik Minimalist.",
      info: [
        { label: "Luas Bangunan",  value: "350 m²"        },
        { label: "Kamar Tidur",    value: "5 KT + 1 ART"  },
        { label: "Tahun",          value: "2026"           }
      ],
      denah: `<svg viewBox="0 0 380 280" width="380" height="280" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="270" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <text x="12" y="22" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 1</text>
        <rect x="10" y="28" width="110" height="70" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="65" y="66" text-anchor="middle" font-size="10" fill="#085041">Ruang Tamu</text>
        <rect x="128" y="28" width="90" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="173" y="66" text-anchor="middle" font-size="10" fill="#633806">Dapur</text>
        <rect x="226" y="28" width="70" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="261" y="66" text-anchor="middle" font-size="10" fill="#633806">KM</text>
        <rect x="304" y="28" width="66" height="70" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="337" y="66" text-anchor="middle" font-size="10" fill="#444441">Garasi</text>
        <rect x="10" y="105" width="360" height="14" rx="2" fill="#FAC775" stroke="#BA7517" stroke-width="0.5" opacity="0.5"/>
        <text x="190" y="116" text-anchor="middle" font-size="8" fill="#633806">Koridor</text>
        <text x="12" y="138" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 2</text>
        <rect x="10" y="124" width="130" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="75" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT Master</text>
        <rect x="148" y="124" width="100" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="198" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 2</text>
        <rect x="256" y="124" width="114" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="313" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 3</text>
        <text x="12" y="208" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 3</text>
        <rect x="10" y="196" width="180" height="72" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="100" y="236" text-anchor="middle" font-size="10" fill="#0C447C">KT 4 &amp; KT 5</text>
        <rect x="198" y="196" width="172" height="72" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="284" y="236" text-anchor="middle" font-size="10" fill="#085041">Rooftop Lounge</text>
      </svg>`,
      legend: [
        { color: "#B5D4F4", label: "Kamar Tidur"   },
        { color: "#9FE1CB", label: "Ruang Hidup"   },
        { color: "#FAC775", label: "Dapur & KM"    },
        { color: "#D3D1C7", label: "Garasi/Tangga" }
      ],
      files: [
        { icon: "ti-file-3d",       name: "Rumah_Premium_3D.skp",   size: "58 MB",  type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Lengkap.dwg",    size: "13 MB",  type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Konsep_Material.pdf",  size: "19 MB",  type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Rumah Hunian 2 Lantai",
      type: "Residnsial",
      emoji: "🏠",
      color: "#FAEEDA",
      desc: "Desain .",
      info: [
        { label: "Luas Bangunan",  value: "280 m²"        },
        { label: "Kamar Tidur",    value: "3 KT + 1 ART"  },
        { label: "Tahun",          value: "2026"           }
      ],
      denah: `<svg viewBox="0 0 380 280" width="380" height="280" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="270" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <text x="12" y="22" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 1</text>
        <rect x="10" y="28" width="110" height="70" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="65" y="66" text-anchor="middle" font-size="10" fill="#085041">Ruang Tamu</text>
        <rect x="128" y="28" width="90" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="173" y="66" text-anchor="middle" font-size="10" fill="#633806">Dapur</text>
        <rect x="226" y="28" width="70" height="70" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="261" y="66" text-anchor="middle" font-size="10" fill="#633806">KM</text>
        <rect x="304" y="28" width="66" height="70" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="190" y="116" text-anchor="middle" font-size="8" fill="#633806">Koridor</text>
        <text x="12" y="138" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 2</text>
        <rect x="10" y="124" width="130" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="75" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT Master</text>
        <rect x="148" y="124" width="100" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="198" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 2</text>
        <rect x="256" y="124" width="114" height="62" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="313" y="158" text-anchor="middle" font-size="10" fill="#0C447C">KT 3</text>
      </svg>`,
      legend: [
        { color: "#B5D4F4", label: "Kamar Tidur"   },
        { color: "#9FE1CB", label: "Ruang Hidup"   },
        { color: "#FAC775", label: "Dapur & KM"    },
      ],
      files: [
        { icon: "ti-file-3d",       name: "Rumah_Premium2LT_3D.skp",   size: "58 MB",  type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Lengkap.dwg",    size: "13 MB",  type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Konsep_Material.pdf",  size: "19 MB",  type: "PDF",      url: "#" }
      ]
    },
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
 
  // Klik & keyboard pada tiap portfolio item
  document.querySelectorAll('.portfolio-item').forEach(item => {
    item.addEventListener('click', () => openModal(+item.dataset.index));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(+item.dataset.index);
      }
    });
  });
 
  // Klik backdrop untuk tutup
  document.getElementById('pfModalBackdrop').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
 
  // Keyboard: Esc tutup, Arrow navigasi
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

 
