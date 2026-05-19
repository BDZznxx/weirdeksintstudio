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
      name: "Pasar Tradisional Jungkat",
      type: "Komersial",
      emoji: "🏪",
      color: "#E1F5EE",
      desc: "Revitalisasi pasar tradisional Jungkat dengan konsep modern yang mempertahankan nuansa lokal. Fasad terbuka dengan atap joglo modern, sirkulasi udara alami, dan zonasi pedagang yang tertata rapi.",
      info: [
        { label: "Luas Bangunan", value: "4.200 m²" },
        { label: "Jumlah Kios",   value: "120 unit"  },
        { label: "Lantai",        value: "2 Lantai"  },
        { label: "Tahun",         value: "2022"      }
      ],
      denah: `<svg viewBox="0 0 380 260" width="380" height="260" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="10" y="10" width="360" height="240" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <rect x="20" y="20" width="160" height="95" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="100" y="70" text-anchor="middle" font-size="11" fill="#085041" font-weight="500">Zona Basah</text>
        <rect x="192" y="20" width="168" height="95" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="276" y="70" text-anchor="middle" font-size="11" fill="#0C447C" font-weight="500">Zona Kering</text>
        <rect x="20" y="130" width="340" height="36" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="190" y="152" text-anchor="middle" font-size="11" fill="#633806">Koridor Utama &amp; Akses Pengunjung</text>
        <rect x="20" y="178" width="340" height="62" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="190" y="213" text-anchor="middle" font-size="11" fill="#444441">Area Parkir Kendaraan</text>
        <rect x="160" y="20" width="32" height="95" fill="#F8F6F2" stroke="#ccc" stroke-width="0.5"/>
        <text x="176" y="70" text-anchor="middle" font-size="9" fill="#7a7a8c">Toilet</text>
      </svg>`,
      legend: [
        { color: "#9FE1CB", label: "Zona Basah"    },
        { color: "#B5D4F4", label: "Zona Kering"   },
        { color: "#FAC775", label: "Sirkulasi"     },
        { color: "#D3D1C7", label: "Area Parkir"   }
      ],
      files: [
        { icon: "ti-file-3d",       name: "Konsep_3D_Pasar_Jungkat.skp",   size: "48.2 MB", type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Pasar_Jungkat_Lt1.dwg",   size: "12.4 MB", type: "AutoCAD",  url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Pasar_Jungkat_Lt2.dwg",   size: "10.1 MB", type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Presentasi_Konsep_Pasar.pdf",   size: "8.6 MB",  type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Mix Building Mall & Apartemen",
      type: "Mixed-Use",
      emoji: "🏢",
      color: "#E6F1FB",
      desc: "Konsep bangunan campuran yang mengintegrasikan mal retail, tower apartemen premium, dan fasilitas publik dalam satu kawasan terpadu dengan aksesibilitas tinggi dan konsep Transit-Oriented Development.",
      info: [
        { label: "Luas Lahan",      value: "12.000 m²" },
        { label: "Tinggi Tower",    value: "32 Lantai"  },
        { label: "Unit Apartemen",  value: "280 unit"   },
        { label: "Tahun",           value: "2023"       }
      ],
      denah: `<svg viewBox="0 0 380 260" width="380" height="260" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="10" y="10" width="360" height="240" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <rect x="150" y="10" width="80" height="240" rx="0" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="190" y="130" text-anchor="middle" font-size="10" fill="#444441">Core &amp; Lift</text>
        <rect x="20" y="25" width="120" height="60" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="80" y="58" text-anchor="middle" font-size="10" fill="#0C447C">Unit A – 2BR</text>
        <rect x="20" y="100" width="120" height="60" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="80" y="133" text-anchor="middle" font-size="10" fill="#0C447C">Unit B – 2BR</text>
        <rect x="20" y="175" width="120" height="65" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="80" y="211" text-anchor="middle" font-size="10" fill="#085041">Area Komersial</text>
        <rect x="240" y="25" width="120" height="60" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="300" y="58" text-anchor="middle" font-size="10" fill="#0C447C">Unit C – 1BR</text>
        <rect x="240" y="100" width="120" height="60" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="300" y="133" text-anchor="middle" font-size="10" fill="#0C447C">Unit D – 1BR</text>
        <rect x="240" y="175" width="120" height="65" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="300" y="211" text-anchor="middle" font-size="10" fill="#085041">Area Komersial</text>
        <rect x="142" y="18" width="96" height="12" fill="#FAC775" stroke="#BA7517" stroke-width="0.5" opacity="0.7"/>
        <rect x="142" y="165" width="96" height="12" fill="#FAC775" stroke="#BA7517" stroke-width="0.5" opacity="0.7"/>
        <text x="190" y="27" text-anchor="middle" font-size="8" fill="#633806">Koridor</text>
        <text x="190" y="174" text-anchor="middle" font-size="8" fill="#633806">Koridor</text>
      </svg>`,
      legend: [
        { color: "#B5D4F4", label: "Unit Apartemen"  },
        { color: "#9FE1CB", label: "Area Komersial"  },
        { color: "#D3D1C7", label: "Core & Lift"     },
        { color: "#FAC775", label: "Koridor"         }
      ],
      files: [
        { icon: "ti-file-3d",       name: "MixBuilding_Massing_Model.rvt",   size: "124 MB", type: "Revit",    url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Tipikal_Apartemen.dwg",     size: "18.7 MB", type: "AutoCAD", url: "#" },
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
        { label: "Luas Tanah",     value: "300 m²"        },
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
      name: "Cluster Perumahan Elite",
      type: "Residensial",
      emoji: "🏘️",
      color: "#EAF3DE",
      desc: "Perencanaan kawasan cluster tertutup premium dengan fasilitas lengkap: clubhouse, kolam renang, jogging track, dan taman hijau yang nyaman bagi seluruh penghuni.",
      info: [
        { label: "Luas Kawasan", value: "3.5 Ha"  },
        { label: "Jumlah Unit",  value: "64 unit" },
        { label: "Tipe Rumah",   value: "60/80/120" },
        { label: "Tahun",        value: "2022"    }
      ],
      denah: `<svg viewBox="0 0 380 260" width="380" height="260" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="250" rx="4" fill="#EAF3DE" stroke="#ccc" stroke-width="1"/>
        <rect x="170" y="5" width="40" height="250" fill="#FAC775" opacity="0.5"/>
        <rect x="5" y="120" width="370" height="20" fill="#FAC775" opacity="0.5"/>
        <text x="190" y="134" text-anchor="middle" font-size="9" fill="#633806">Jalan Utama Cluster</text>
        ${[0,1,2,3].map(i=>`<rect x="${15+i*38}" y="15" width="30" height="24" rx="2" fill="#C0DD97" stroke="#3B6D11" stroke-width="0.7"/><text x="${30+i*38}" y="31" text-anchor="middle" font-size="8" fill="#27500A">Unit</text>`).join('')}
        ${[0,1,2,3].map(i=>`<rect x="${218+i*38}" y="15" width="30" height="24" rx="2" fill="#C0DD97" stroke="#3B6D11" stroke-width="0.7"/><text x="${233+i*38}" y="31" text-anchor="middle" font-size="8" fill="#27500A">Unit</text>`).join('')}
        ${[0,1,2,3].map(i=>`<rect x="${15+i*38}" y="52" width="30" height="24" rx="2" fill="#C0DD97" stroke="#3B6D11" stroke-width="0.7"/><text x="${30+i*38}" y="68" text-anchor="middle" font-size="8" fill="#27500A">Unit</text>`).join('')}
        ${[0,1,2,3].map(i=>`<rect x="${218+i*38}" y="52" width="30" height="24" rx="2" fill="#C0DD97" stroke="#3B6D11" stroke-width="0.7"/><text x="${233+i*38}" y="68" text-anchor="middle" font-size="8" fill="#27500A">Unit</text>`).join('')}
        ${[0,1,2,3].map(i=>`<rect x="${15+i*38}" y="150" width="30" height="24" rx="2" fill="#C0DD97" stroke="#3B6D11" stroke-width="0.7"/><text x="${30+i*38}" y="166" text-anchor="middle" font-size="8" fill="#27500A">Unit</text>`).join('')}
        ${[0,1,2,3].map(i=>`<rect x="${218+i*38}" y="150" width="30" height="24" rx="2" fill="#C0DD97" stroke="#3B6D11" stroke-width="0.7"/><text x="${233+i*38}" y="166" text-anchor="middle" font-size="8" fill="#27500A">Unit</text>`).join('')}
        <rect x="15" y="186" width="140" height="58" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="85" y="219" text-anchor="middle" font-size="10" fill="#0C447C">Club House + Pool</text>
        <rect x="218" y="186" width="152" height="58" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="294" y="219" text-anchor="middle" font-size="10" fill="#085041">Taman RTH</text>
      </svg>`,
      legend: [
        { color: "#C0DD97", label: "Unit Rumah"   },
        { color: "#B5D4F4", label: "Fasilitas"    },
        { color: "#FAC775", label: "Jalan Cluster"},
        { color: "#9FE1CB", label: "RTH / Taman"  }
      ],
      files: [
        { icon: "ti-file-3d",       name: "Cluster_Siteplan_3D.skp", size: "67 MB",   type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Siteplan_Cluster.dwg",    size: "24 MB",   type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Brosur_Cluster.pdf",      size: "5.4 MB",  type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Rumah Modern 2 Lantai",
      type: "Residensial",
      emoji: "🏡",
      color: "#FBEAF0",
      desc: "Rumah modern 2 lantai dengan fasad minimalis clean, atap dak beton, jendela kaca besar, dan balkon privat. Desain interior open plan memperluas kesan ruang pada lahan terbatas.",
      info: [
        { label: "Luas Tanah",    value: "150 m²" },
        { label: "Luas Bangunan", value: "210 m²" },
        { label: "Kamar Tidur",   value: "4 KT"   },
        { label: "Tahun",         value: "2023"   }
      ],
      denah: `<svg viewBox="0 0 380 260" width="380" height="260" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="250" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <text x="12" y="20" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 1</text>
        <rect x="10" y="25" width="115" height="85" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="67" y="71" text-anchor="middle" font-size="10" fill="#085041">Ruang Tamu</text>
        <rect x="133" y="25" width="110" height="85" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="188" y="71" text-anchor="middle" font-size="10" fill="#085041">Ruang Keluarga</text>
        <rect x="251" y="25" width="75" height="45" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="288" y="51" text-anchor="middle" font-size="10" fill="#633806">Dapur</text>
        <rect x="251" y="78" width="75" height="32" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="288" y="98" text-anchor="middle" font-size="9" fill="#633806">Gudang</text>
        <rect x="334" y="25" width="40" height="85" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="354" y="71" text-anchor="middle" font-size="8" fill="#444441">Garasi</text>
        <rect x="10" y="116" width="364" height="10" fill="#FAC775" opacity="0.4"/>
        <text x="12" y="142" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 2</text>
        <rect x="10" y="130" width="175" height="110" rx="3" fill="#F4C0D1" stroke="#993556" stroke-width="1"/>
        <text x="97" y="189" text-anchor="middle" font-size="10" fill="#72243E">KT Master + KM En Suite</text>
        <rect x="193" y="130" width="95" height="50" rx="3" fill="#F4C0D1" stroke="#993556" stroke-width="1"/>
        <text x="240" y="159" text-anchor="middle" font-size="10" fill="#72243E">KT 2</text>
        <rect x="296" y="130" width="78" height="50" rx="3" fill="#F4C0D1" stroke="#993556" stroke-width="1"/>
        <text x="335" y="159" text-anchor="middle" font-size="10" fill="#72243E">KT 3</text>
        <rect x="193" y="188" width="181" height="52" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="283" y="218" text-anchor="middle" font-size="10" fill="#085041">Ruang Keluarga + Balkon</text>
      </svg>`,
      legend: [
        { color: "#F4C0D1", label: "Kamar Tidur"          },
        { color: "#9FE1CB", label: "Ruang Tamu/Keluarga"  },
        { color: "#FAC775", label: "Dapur & KM"           },
        { color: "#D3D1C7", label: "Garasi / Tangga"      }
      ],
      files: [
        { icon: "ti-file-3d",       name: "RumahModern_Render.skp", size: "28 MB",  type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Lt1_Lt2.dwg",      size: "7.1 MB", type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Gambar_Kerja.pdf",       size: "9 MB",   type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Rumah Minimalis 2 Lantai",
      type: "Residensial",
      emoji: "🏠",
      color: "#EEEDFE",
      desc: "Rumah minimalis 2 lantai yang mengoptimalkan setiap sudut ruang. Palet warna putih-abu dengan aksen kayu natural menciptakan atmosfer bersih, tenang, dan hangat.",
      info: [
        { label: "Luas Tanah",    value: "120 m²" },
        { label: "Luas Bangunan", value: "160 m²" },
        { label: "Kamar Tidur",   value: "3 KT"   },
        { label: "Tahun",         value: "2024"   }
      ],
      denah: `<svg viewBox="0 0 380 260" width="380" height="260" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="250" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <text x="12" y="20" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 1</text>
        <rect x="10" y="25" width="120" height="90" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="70" y="73" text-anchor="middle" font-size="10" fill="#085041">Ruang Tamu</text>
        <rect x="138" y="25" width="120" height="90" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="198" y="73" text-anchor="middle" font-size="10" fill="#633806">Dapur + Makan</text>
        <rect x="266" y="25" width="104" height="90" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="318" y="73" text-anchor="middle" font-size="10" fill="#444441">Garasi</text>
        <rect x="10" y="122" width="364" height="10" fill="#FAC775" opacity="0.4"/>
        <text x="12" y="148" font-size="10" fill="#7a7a8c" font-weight="500">Lantai 2</text>
        <rect x="10" y="136" width="180" height="108" rx="3" fill="#CECBF6" stroke="#534AB7" stroke-width="1"/>
        <text x="100" y="194" text-anchor="middle" font-size="10" fill="#3C3489">KT Master + KM</text>
        <rect x="198" y="136" width="110" height="108" rx="3" fill="#CECBF6" stroke="#534AB7" stroke-width="1"/>
        <text x="253" y="194" text-anchor="middle" font-size="10" fill="#3C3489">KT 2</text>
        <rect x="316" y="136" width="58" height="108" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="345" y="190" text-anchor="middle" font-size="8" fill="#633806">KM + Tangga</text>
      </svg>`,
      legend: [
        { color: "#CECBF6", label: "Kamar Tidur"          },
        { color: "#9FE1CB", label: "Ruang Tamu/Keluarga"  },
        { color: "#FAC775", label: "Dapur & KM"           },
        { color: "#D3D1C7", label: "Garasi / Tangga"      }
      ],
      files: [
        { icon: "ti-file-3d",       name: "Minimalis_2L_Model.skp", size: "22 MB",  type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Minimalis.dwg",    size: "5.8 MB", type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "RAB_dan_Gambar.pdf",     size: "11 MB",  type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Interior Bar & Cafe",
      type: "Interior",
      emoji: "☕",
      color: "#FAECE7",
      desc: "Desain interior bar dan kafe berkonsep industrial chic. Perpaduan bata ekspos, besi hitam, dan pencahayaan Edison warm-white menciptakan suasana hangat dan sangat instagrammable.",
      info: [
        { label: "Luas Ruang", value: "280 m²"        },
        { label: "Kapasitas",  value: "80 kursi"       },
        { label: "Konsep",     value: "Industrial Chic"},
        { label: "Tahun",      value: "2023"           }
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
        { icon: "ti-file-3d",       name: "Cafe_Interior_3D.skp",       size: "41 MB",  type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Furnitur_Layout.dwg",  size: "8.3 MB", type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Mood_Board_Material.pdf",    size: "17 MB",  type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Vila Premium 2 Lantai",
      type: "Residensial",
      emoji: "🌴",
      color: "#E1F5EE",
      desc: "Vila premium 2 lantai dengan kolam renang infinity dan view alam terbuka. Konsep resort tropis dengan material batu andesit, kayu ulin, dan kaca maksimal untuk menyatu dengan alam.",
      info: [
        { label: "Luas Tanah",    value: "500 m²"  },
        { label: "Luas Bangunan", value: "350 m²"  },
        { label: "Kamar Tidur",   value: "3 Suite" },
        { label: "Tahun",         value: "2024"    }
      ],
      denah: `<svg viewBox="0 0 380 260" width="380" height="260" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="250" rx="4" fill="#E1F5EE" stroke="#ccc" stroke-width="1"/>
        <rect x="10" y="10" width="155" height="115" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="87" y="71" text-anchor="middle" font-size="10" fill="#085041">Living + Dining</text>
        <rect x="173" y="10" width="95" height="115" rx="3" fill="#9FE1CB" stroke="#0F6E56" stroke-width="1"/>
        <text x="220" y="71" text-anchor="middle" font-size="10" fill="#085041">KT Suite 1</text>
        <rect x="276" y="10" width="98" height="115" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="325" y="71" text-anchor="middle" font-size="10" fill="#444441">Servis + Garasi</text>
        <rect x="10" y="133" width="265" height="112" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="142" y="193" text-anchor="middle" font-size="12" fill="#0C447C" font-weight="500">Kolam Renang</text>
        <text x="142" y="210" text-anchor="middle" font-size="10" fill="#185FA5">Infinity Pool</text>
        <rect x="283" y="133" width="91" height="112" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="328" y="193" text-anchor="middle" font-size="10" fill="#633806">Sun Deck</text>
        <text x="328" y="208" text-anchor="middle" font-size="9" fill="#633806">&amp; Bale</text>
      </svg>`,
      legend: [
        { color: "#9FE1CB", label: "Area Indoor"    },
        { color: "#B5D4F4", label: "Kolam Renang"   },
        { color: "#FAC775", label: "Outdoor / Deck"  },
        { color: "#D3D1C7", label: "Area Servis"    }
      ],
      files: [
        { icon: "ti-file-3d",       name: "Vila_Premium_Render.skp",   size: "58 MB",  type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Denah_Vila_Lengkap.dwg",    size: "13 MB",  type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Konsep_Material_Vila.pdf",  size: "19 MB",  type: "PDF",      url: "#" }
      ]
    },
    {
      name: "Interior Ruang Keluarga",
      type: "Interior",
      emoji: "🛋️",
      color: "#FAEEDA",
      desc: "Desain interior ruang keluarga bertemakan japandi — perpaduan estetika Jepang dan Skandinavia. Material kayu terang, kain linen, dan tanaman hijau menciptakan ruang yang tenang dan fungsional.",
      info: [
        { label: "Luas Ruang",    value: "36 m²"         },
        { label: "Konsep",        value: "Japandi"        },
        { label: "Material",      value: "Kayu + Linen"  },
        { label: "Tahun",         value: "2024"           }
      ],
      denah: `<svg viewBox="0 0 380 260" width="380" height="260" xmlns="http://www.w3.org/2000/svg" font-family="DM Sans,sans-serif">
        <rect x="5" y="5" width="370" height="250" rx="4" fill="#F8F6F2" stroke="#ccc" stroke-width="1"/>
        <rect x="10" y="10" width="255" height="155" rx="3" fill="#FAC775" stroke="#BA7517" stroke-width="1"/>
        <text x="137" y="91" text-anchor="middle" font-size="11" fill="#633806">Area Duduk Utama</text>
        <rect x="273" y="10" width="102" height="155" rx="3" fill="#B5D4F4" stroke="#185FA5" stroke-width="1"/>
        <text x="324" y="91" text-anchor="middle" font-size="10" fill="#0C447C">Media Wall</text>
        <text x="324" y="106" text-anchor="middle" font-size="9" fill="#185FA5">/ TV Unit</text>
        <rect x="10" y="173" width="120" height="77" rx="3" fill="#C0DD97" stroke="#3B6D11" stroke-width="1"/>
        <text x="70" y="215" text-anchor="middle" font-size="10" fill="#27500A">Area Tanaman</text>
        <rect x="138" y="173" width="237" height="77" rx="3" fill="#D3D1C7" stroke="#5F5E5A" stroke-width="1"/>
        <text x="256" y="215" text-anchor="middle" font-size="10" fill="#444441">Sirkulasi + Pintu Akses</text>
      </svg>`,
      legend: [
        { color: "#FAC775", label: "Area Duduk"    },
        { color: "#B5D4F4", label: "Media Wall/TV" },
        { color: "#C0DD97", label: "Area Tanaman"  },
        { color: "#D3D1C7", label: "Sirkulasi"     }
      ],
      files: [
        { icon: "ti-file-3d",       name: "Ruang_Keluarga_3D.skp", size: "19 MB",  type: "SketchUp", url: "#" },
        { icon: "ti-file-vector",   name: "Layout_Furnitur.dwg",   size: "3.5 MB", type: "AutoCAD",  url: "#" },
        { icon: "ti-file-type-pdf", name: "Daftar_Material.pdf",   size: "4.2 MB", type: "PDF",      url: "#" }
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

 
