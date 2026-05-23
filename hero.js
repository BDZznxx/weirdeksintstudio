/* ============================================================
   hero.js — Weird Eksint Studio
   Tambahkan sebelum </body>:
   <script src="hero.js"></script>

   Berisi:
   1. Particle system  — titik-titik naik ke atas
   2. Parallax tilt    — kartu miring mengikuti mouse (desktop)
   3. Intersection scroll reveal — matikan animasi ketika keluar viewport
   ============================================================ */

(function () {
    'use strict';

    /* ──────────────────────────────────────────────
       1. PARTICLE SYSTEM
    ────────────────────────────────────────────── */
    function initParticles() {
        var container = document.getElementById('heroParticles');
        if (!container) return;

        var isMobile = window.innerWidth < 600;
        var count    = isMobile ? 18 : 42;
        var styleEl  = document.createElement('style');
        var css      = '';

        for (var i = 0; i < count; i++) {
            var size    = (Math.random() * 2.5 + 0.8).toFixed(2);
            var x       = (Math.random() * 100).toFixed(2);
            var dur     = (Math.random() * 14 + 10).toFixed(1);
            var delay   = (Math.random() * 18).toFixed(1);
            var opacity = (Math.random() * 0.35 + 0.08).toFixed(2);
            var driftX  = ((Math.random() - 0.5) * 60).toFixed(1);
            var driftM  = ((Math.random() - 0.5) * 30).toFixed(1);
            var riseH   = (Math.random() * 30 + 80).toFixed(1);
            var scaleM  = (Math.random() * 0.5 + 0.75).toFixed(2);
            var name    = 'heroPf' + i;

            css += '@keyframes ' + name + ' {\n';
            css += '  0%   { transform: translate(0, 0) scale(1); opacity: ' + opacity + '; }\n';
            css += '  50%  { transform: translate(' + driftM + 'px, -' + (riseH / 2) + 'vh) scale(' + scaleM + '); opacity: ' + opacity + '; }\n';
            css += '  100% { transform: translate(' + driftX + 'px, -' + riseH + 'vh) scale(0.1); opacity: 0; }\n';
            css += '}\n';

            var p = document.createElement('div');
            p.className = 'hero-particle';
            p.style.cssText = [
                'left:'             + x       + '%',
                'bottom:-6px',
                'width:'            + size    + 'px',
                'height:'           + size    + 'px',
                'opacity:'          + opacity,
                'animation:'        + name    + ' ' + dur + 's -' + delay + 's linear infinite'
            ].join(';');

            container.appendChild(p);
        }

        styleEl.textContent = css;
        document.head.appendChild(styleEl);
    }

    /* ──────────────────────────────────────────────
       2. PARALLAX TILT  (desktop only, ≥ 900px)
    ────────────────────────────────────────────── */
    function initTilt() {
        if (window.innerWidth < 900) return;

        var card    = document.getElementById('heroOgCard');
        var section = document.getElementById('home');
        if (!card || !section) return;

        var RAF  = null;
        var tx   = 0;
        var ty   = 0;

        section.addEventListener('mousemove', function (e) {
            var rect = section.getBoundingClientRect();
            var cx   = rect.left + rect.width  / 2;
            var cy   = rect.top  + rect.height / 2;
            var dx   = (e.clientX - cx) / (rect.width  / 2);   /* -1 … 1 */
            var dy   = (e.clientY - cy) / (rect.height / 2);   /* -1 … 1 */

            tx = dx * 6;    /* max 6° horizontal */
            ty = dy * -4;   /* max 4° vertical   */

            if (RAF) cancelAnimationFrame(RAF);
            RAF = requestAnimationFrame(function () {
                card.style.transform  = 'perspective(900px) rotateY(' + tx + 'deg) rotateX(' + ty + 'deg) scale(1.025)';
                card.style.transition = 'transform 0.08s linear';
            });
        });

        section.addEventListener('mouseleave', function () {
            if (RAF) cancelAnimationFrame(RAF);
            card.style.transform  = 'perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)';
            card.style.transition = 'transform 0.55s ease';
        });
    }

    /* ──────────────────────────────────────────────
       3. SCROLL — pause particles when off-screen
          (performance optimisation)
    ────────────────────────────────────────────── */
    function initScrollPause() {
        var section   = document.getElementById('home');
        var particles = document.getElementById('heroParticles');
        if (!section || !particles || !window.IntersectionObserver) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                /* pause CSS animations when hero is not visible */
                particles.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
                var nodes = particles.querySelectorAll('.hero-particle');
                nodes.forEach(function (n) {
                    n.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
                });
            });
        }, { threshold: 0 });

        observer.observe(section);
    }

    /* ──────────────────────────────────────────────
       INIT — run after DOM is ready
    ────────────────────────────────────────────── */
    function init() {
        /* skip all motion if user prefers reduced motion */
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        initParticles();
        initTilt();
        initScrollPause();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
