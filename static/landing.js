/* Landing-page interactions: the skills + projects popovers (hover, click, keyboard) and the
   keyboard navigation inside the projects popover. Theme and cursor behaviour live in
   theme.js / cursor.js; the magnetic cursor forks the popovers open through the
   "bento:magnetic-enter" event it dispatches, so neither file knows about the other. */
(function () {
    function initLanding() {
        const skillsWrap = document.querySelector('.skills-popover-wrap');
        const workWrap = document.querySelector('.work-popover-wrap');
        const skillsBtn = document.querySelector('.skills-btn');
        const workBtn = document.querySelector('.work-btn');
        if (!skillsWrap && !workWrap && !skillsBtn && !workBtn) return;

    let skillsTimer = null;
    let workTimer = null;

    function openSkills() {
        clearTimeout(skillsTimer);
        clearTimeout(workTimer);
        document.body.classList.remove('popover-work-active');
        if (workBtn) workBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.add('popover-skills-active');
        if (skillsBtn) skillsBtn.setAttribute('aria-expanded', 'true');
    }

    function closeSkills() {
        clearTimeout(skillsTimer);
        skillsTimer = setTimeout(() => {
            document.body.classList.remove('popover-skills-active');
            if (skillsBtn) skillsBtn.setAttribute('aria-expanded', 'false');
        }, 180);
    }

    function openWork() {
        clearTimeout(workTimer);
        clearTimeout(skillsTimer);
        document.body.classList.remove('popover-skills-active');
        if (skillsBtn) skillsBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.add('popover-work-active');
        if (workBtn) workBtn.setAttribute('aria-expanded', 'true');
    }

    function closeWork() {
        clearTimeout(workTimer);
        workTimer = setTimeout(() => {
            document.body.classList.remove('popover-work-active');
            if (workBtn) workBtn.setAttribute('aria-expanded', 'false');
        }, 180);
    }

    if (skillsWrap) {
        skillsWrap.addEventListener('mouseenter', openSkills);
        skillsWrap.addEventListener('mouseleave', closeSkills);
        skillsWrap.addEventListener('focusin', openSkills);
        skillsWrap.addEventListener('focusout', closeSkills);
    }

    if (workWrap) {
        workWrap.addEventListener('mouseenter', openWork);
        workWrap.addEventListener('mouseleave', closeWork);
        workWrap.addEventListener('focusin', openWork);
        workWrap.addEventListener('focusout', closeWork);
    }

    if (skillsBtn) {
        skillsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (document.body.classList.contains('popover-skills-active')) {
                closeSkills();
            } else {
                openSkills();
            }
        });
    }

    if (workBtn) {
        workBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (document.body.classList.contains('popover-work-active')) {
                closeWork();
            } else {
                openWork();
            }
        });
    }

    // Close active popovers when clicking outside or pressing Escape
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.skills-popover-wrap') && !e.target.closest('.skill-popover-card')) {
            document.body.classList.remove('popover-skills-active');
            if (skillsBtn) skillsBtn.setAttribute('aria-expanded', 'false');
        }
        if (!e.target.closest('.work-popover-wrap') && !e.target.closest('.project-popover-card')) {
            document.body.classList.remove('popover-work-active');
            if (workBtn) workBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Keyboard Navigation (Arrow keys, Home, End, Escape, Enter) for Projects Popover
    const projItems = Array.from(document.querySelectorAll('.project-popover-card .proj-item'));
    let currentProjIndex = -1;

    function focusProjItem(index) {
        if (projItems.length === 0) return;
        if (index < 0) index = projItems.length - 1;
        if (index >= projItems.length) index = 0;
        currentProjIndex = index;

        projItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add('is-hovered');
                item.focus();
            } else {
                item.classList.remove('is-hovered');
            }
        });
    }

    function clearProjFocus() {
        currentProjIndex = -1;
        projItems.forEach(item => item.classList.remove('is-hovered'));
    }

    // Keyboard navigation on work button
    if (workBtn) {
        workBtn.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                if (!document.body.classList.contains('popover-work-active')) {
                    e.preventDefault();
                    openWork();
                    setTimeout(() => {
                        focusProjItem(e.key === 'ArrowUp' ? projItems.length - 1 : 0);
                    }, 50);
                }
            }
        });
    }

    const projectsPopoverCard = document.getElementById('projectsPopover');
    if (projectsPopoverCard) {
        projectsPopoverCard.addEventListener('keydown', (e) => {
            if (!document.body.classList.contains('popover-work-active')) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusProjItem(currentProjIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                focusProjItem(currentProjIndex - 1);
            } else if (e.key === 'Home') {
                e.preventDefault();
                focusProjItem(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                focusProjItem(projItems.length - 1);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeWork();
                clearProjFocus();
                if (workBtn) workBtn.focus();
            } else if (e.key === 'Enter' && currentProjIndex >= 0) {
                const activeItem = projItems[currentProjIndex];
                if (activeItem) {
                    e.preventDefault();
                    activeItem.click();
                }
            }
        });

        // Sync currentProjIndex with mouse hovering
        projItems.forEach((item, idx) => {
            item.addEventListener('mouseenter', () => {
                currentProjIndex = idx;
                projItems.forEach((p, i) => {
                    if (i !== idx) p.classList.remove('is-hovered');
                });
            });
        });
    }

    // Global Escape key listener to dismiss any active popover
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.body.classList.contains('popover-skills-active')) {
                closeSkills();
                if (skillsBtn) skillsBtn.focus();
            }
            if (document.body.classList.contains('popover-work-active')) {
                closeWork();
                clearProjFocus();
                if (workBtn) workBtn.focus();
            }
        }
    });

    // Clear lingering browser focus after click when using mouse
    document.querySelectorAll('.proj-item, .skills-btn, .work-btn, .pill-btn, .circle-btn, .theme-toggle-btn').forEach(el => {
        el.addEventListener('mouseup', () => {
            setTimeout(() => {
                if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
            }, 50);
        });
    });

        // The magnetic cursor snapping onto a trigger opens its popover
        window.addEventListener('bento:magnetic-enter', (e) => {
            const el = e.detail.el;
            if (el && el.classList.contains('skills-btn')) {
                openSkills();
            } else if (el && el.classList.contains('work-btn')) {
                openWork();
            }
        });
    }

    initLanding();
    if (!window.__landingJsListenerAttached) {
        window.__landingJsListenerAttached = true;
        document.addEventListener('astro:page-load', initLanding);
    }
})();
