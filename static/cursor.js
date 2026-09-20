/* Shared custom cursor: ambient card spotlight + liquid mercury magnetic ring.
   Used by the landing page and the 404 page (the project pages have their own
   rect-caching variant in project.js).

   Page-specific reactions to a snap are not baked in here — listen for the
   "bento:magnetic-enter" / "bento:magnetic-leave" events on window instead, e.g. the landing
   page uses them to open its skills/projects popovers. Elements inside a
   [data-no-magnetic] subtree (the open popover cards) never attract the ring. */
(function () {
    const spotlightCards = document.querySelectorAll(
        '.hero-box, .poster-box, .card-skills, .card-work, .card-connect, .error-box'
    );
    spotlightCards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        }, { passive: true });
    });

    const cursorRing = document.getElementById('cursorRing');
    if (!cursorRing || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const SNAP_SELECTOR = '.theme-toggle-btn, .circle-btn, .pill-btn';
    const SNAP_RANGE = 32;

    let mouseX = -100, mouseY = -100;
    let ringX = -100, ringY = -100;
    let isVisible = false;
    let snappedEl = null;
    let currentSnappedElement = null;
    let lastTime = performance.now();

    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (!isVisible) {
            isVisible = true;
            ringX = mouseX;
            ringY = mouseY;
            cursorRing.classList.add('visible');
        }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
        isVisible = false;
        snappedEl = null;
        currentSnappedElement = null;
        cursorRing.classList.remove('visible', 'is-snapped');
        document.querySelectorAll('.is-hovered').forEach(el => el.classList.remove('is-hovered'));
    });

    function getNearestMagneticElement(x, y) {
        const candidates = document.querySelectorAll(SNAP_SELECTOR);
        let closestEl = null, closestRect = null, closestDist = Infinity;

        for (let i = 0; i < candidates.length; i++) {
            const el = candidates[i];
            // Open popovers opt out of snapping entirely, cards and all.
            if (el.closest('[data-no-magnetic]')) continue;

            const rect = el.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) continue;

            const nearX = Math.max(rect.left, Math.min(x, rect.right));
            const nearY = Math.max(rect.top, Math.min(y, rect.bottom));
            const dist = Math.hypot(x - nearX, y - nearY);

            if (dist < closestDist) {
                closestDist = dist;
                closestEl = el;
                closestRect = rect;
            }
        }

        return closestDist <= SNAP_RANGE ? { el: closestEl, rect: closestRect } : null;
    }

    // A click that lands inside the magnet's pull activates the snapped element, even when the
    // pointer stopped just short of it.
    window.addEventListener('click', e => {
        if (!currentSnappedElement || !document.body.contains(currentSnappedElement)) return;
        if (currentSnappedElement === e.target || currentSnappedElement.contains(e.target)) return;

        const rect = currentSnappedElement.getBoundingClientRect();
        const nearX = Math.max(rect.left, Math.min(e.clientX, rect.right));
        const nearY = Math.max(rect.top, Math.min(e.clientY, rect.bottom));
        if (Math.hypot(e.clientX - nearX, e.clientY - nearY) > SNAP_RANGE + 8) return;

        e.preventDefault();
        if (currentSnappedElement.tagName.toLowerCase() === 'a' && currentSnappedElement.href) {
            if (currentSnappedElement.target === '_blank') {
                window.open(currentSnappedElement.href, '_blank', 'noopener,noreferrer');
            } else {
                window.location.href = currentSnappedElement.href;
            }
        } else {
            currentSnappedElement.click();
        }
    });

    function renderCursor(now) {
        // Frame-rate independent smoothing: identical feel at 60/120/144Hz.
        // K = 33 reproduces the previous 0.42-per-frame easing at 60Hz.
        const dt = Math.min((now - lastTime) / 1000, 0.05) || 0;
        lastTime = now;
        const ease = 1 - Math.exp(-33 * dt);

        const magnetic = getNearestMagneticElement(mouseX, mouseY);
        let transform;

        if (magnetic) {
            const { el, rect } = magnetic;
            currentSnappedElement = el;

            if (snappedEl !== el) {
                if (snappedEl) snappedEl.classList.remove('is-hovered');
                el.classList.add('is-hovered');
                snappedEl = el;

                // Size/shape change once per snap, never per frame (the 0.22s CSS transition
                // would otherwise restart every frame and never settle).
                const isRound = el.classList.contains('theme-toggle-btn') || el.classList.contains('circle-btn');
                const pad = isRound ? 10 : 12;
                cursorRing.style.setProperty('--ring-w', `${rect.width + pad}px`);
                cursorRing.style.setProperty('--ring-h', `${rect.height + pad}px`);
                cursorRing.style.setProperty('--ring-r', isRound ? '50%' : '50px');

                window.dispatchEvent(new CustomEvent('bento:magnetic-enter', { detail: { el } }));
            }

            ringX += (rect.left + rect.width / 2 - ringX) * ease;
            ringY += (rect.top + rect.height / 2 - ringY) * ease;

            cursorRing.classList.add('is-snapped');
            transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
        } else {
            if (currentSnappedElement !== null) {
                currentSnappedElement = null;
                cursorRing.style.removeProperty('--ring-w');
                cursorRing.style.removeProperty('--ring-h');
                cursorRing.style.removeProperty('--ring-r');
            }

            if (snappedEl) {
                snappedEl.classList.remove('is-hovered');
                window.dispatchEvent(new CustomEvent('bento:magnetic-leave', { detail: { el: snappedEl } }));
                snappedEl = null;
            }

            const vx = mouseX - ringX;
            const vy = mouseY - ringY;
            const speed = Math.hypot(vx, vy);

            ringX += vx * ease;
            ringY += vy * ease;
            cursorRing.classList.remove('is-snapped');

            // Compositor-only write: no layout, no paint.
            if (speed > 1.5) {
                const angle = Math.atan2(vy, vx);
                const stretch = Math.min(speed * 0.0028, 0.42);
                const scaleX = 1 + stretch;
                const scaleY = 1 - Math.min(speed * 0.0018, 0.22);
                transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
            } else {
                transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
            }
        }

        cursorRing.style.transform = transform;
        requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);
})();
