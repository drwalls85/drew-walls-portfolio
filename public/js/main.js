(function() {
    'use strict';

    const CONFIG = {
        animationThreshold: 0.1,
        animationRootMargin: '0px 0px -50px 0px',
        messageDisplayTime: 3000,
        debounceDelay: 150
    };

    const debounce = (func, delay) => {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const showMessage = (message, type = 'success') => {
        const messageEl = document.createElement('div');
        messageEl.className = `notification notification--${type}`;
        messageEl.textContent = message;
        messageEl.setAttribute('role', 'alert');
        
        const styles = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            font-weight: 500;
            max-width: 400px;
        `;
        
        messageEl.style.cssText = styles;
        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transition = 'opacity 0.3s ease';
            setTimeout(() => messageEl.remove(), 300);
        }, CONFIG.messageDisplayTime);
    };

    const initSectionAnimations = () => {
        const sections = document.querySelectorAll('section');
        if (!sections.length) return;

        if (!('IntersectionObserver' in window)) {
            sections.forEach(section => section.classList.add('visible'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: CONFIG.animationThreshold,
            rootMargin: CONFIG.animationRootMargin
        });

        sections.forEach(section => observer.observe(section));
    };

    const initSmoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#' || !href) return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    
                    const navMenu = document.querySelector('.nav-menu');
                    const navToggle = document.querySelector('.nav-toggle');
                    if (navMenu && navMenu.classList.contains('active')) {
                        navMenu.classList.remove('active');
                        if (navToggle) {
                            navToggle.setAttribute('aria-expanded', 'false');
                        }
                    }
                    
                    const navHeight = document.querySelector('.main-nav')?.offsetHeight || 0;
                    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    if (history.pushState) {
                        history.pushState(null, null, href);
                    }
                    
                    target.setAttribute('tabindex', '-1');
                    target.focus();
                }
            });
        });
    };

    const initMobileNav = () => {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        if (!navToggle || !navMenu) return;

        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = navMenu.classList.toggle('active');
            navToggle.setAttribute('aria-expanded', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
            
            if (isOpen) {
                const firstLink = navMenu.querySelector('a');
                if (firstLink) setTimeout(() => firstLink.focus(), 100);
            }
        });

        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                if (navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    navToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
                navToggle.focus();
            }
        });

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });
    };

    const initContactForm = () => {
        const form = document.querySelector('#contact-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            submitBtn.style.opacity = '0.7';

            const formData = {
                name: form.querySelector('[name="name"]')?.value.trim(),
                email: form.querySelector('[name="email"]')?.value.trim(),
                message: form.querySelector('[name="message"]')?.value.trim()
            };

            if (!formData.name || !formData.email || !formData.message) {
                showMessage('Please fill in all required fields', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.style.opacity = '1';
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                showMessage('Please enter a valid email address', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.style.opacity = '1';
                return;
            }

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage('Message sent successfully! I will get back to you soon.', 'success');
                    form.reset();
                } else {
                    showMessage(data.error || 'Failed to send message. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Form submission error:', error);
                showMessage('Network error. Please check your connection and try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.style.opacity = '1';
            }
        });

        form.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('blur', function() {
                if (this.hasAttribute('required') && !this.value.trim()) {
                    this.style.borderColor = '#e74c3c';
                } else if (this.type === 'email' && this.value) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    this.style.borderColor = emailRegex.test(this.value) ? '#27ae60' : '#e74c3c';
                } else if (this.value) {
                    this.style.borderColor = '#27ae60';
                }
            });

            input.addEventListener('focus', function() {
                this.style.borderColor = '#4a90e2';
            });
        });
    };

    const initBackToTop = () => {
        const btn = document.createElement('button');
        btn.className = 'back-to-top';
        btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        btn.setAttribute('aria-label', 'Back to top');
        btn.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4a90e2, #9b59b6);
            color: white;
            border: none;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s, transform 0.3s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 999;
            font-size: 1.2rem;
        `;
        
        document.body.appendChild(btn);

        const toggle = () => {
            if (window.scrollY > 300) {
                btn.style.opacity = '1';
                btn.style.visibility = 'visible';
            } else {
                btn.style.opacity = '0';
                btn.style.visibility = 'hidden';
            }
        };

        window.addEventListener('scroll', debounce(toggle, CONFIG.debounceDelay));

        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-5px)';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(0)';
        });
    };

    const init = () => {
        console.log('Drew Walls Portfolio Loaded');
        initSectionAnimations();
        initSmoothScroll();
        initMobileNav();
        initContactForm();
        initBackToTop();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.portfolioApp = { showMessage, debounce };
})();

// Experience Carousel
const initExperienceCarousel = () => {
    const timeline = document.querySelector('.timeline');
    if (!timeline) return;

    // Add carousel wrapper
    timeline.classList.add('experience-carousel');
    const container = document.createElement('div');
    container.className = 'carousel-container';
    
    const items = Array.from(timeline.querySelectorAll('.timeline-item'));
    items.forEach(item => container.appendChild(item));
    timeline.appendChild(container);

    let currentIndex = 0;
    const totalSlides = items.length;

    // Create controls
    const controls = document.createElement('div');
    controls.className = 'carousel-controls';
    controls.innerHTML = `
        <button class="carousel-btn" id="prevBtn" aria-label="Previous experience">
            <i class="fas fa-chevron-left"></i>
        </button>
        <div class="carousel-indicators" role="tablist">
            ${items.map((_, i) => `
                <button class="carousel-dot ${i === 0 ? 'active' : ''}" 
                        data-index="${i}" 
                        aria-label="Go to experience ${i + 1}"
                        role="tab"></button>
            `).join('')}
        </div>
        <button class="carousel-btn" id="nextBtn" aria-label="Next experience">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    timeline.appendChild(controls);

    // Add counter
    const counter = document.createElement('div');
    counter.className = 'carousel-counter';
    counter.textContent = `${currentIndex + 1} / ${totalSlides}`;
    controls.appendChild(counter);

    const updateCarousel = (index) => {
        currentIndex = index;
        container.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        // Update dots
        document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
        
        // Update counter
        counter.textContent = `${currentIndex + 1} / ${totalSlides}`;
        
        // Update button states
        document.getElementById('prevBtn').disabled = currentIndex === 0;
        document.getElementById('nextBtn').disabled = currentIndex === totalSlides - 1;
    };

    // Event listeners
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentIndex > 0) updateCarousel(currentIndex - 1);
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentIndex < totalSlides - 1) updateCarousel(currentIndex + 1);
    });

    document.querySelectorAll('.carousel-dot').forEach((dot, index) => {
        dot.addEventListener('click', () => updateCarousel(index));
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
            updateCarousel(currentIndex - 1);
        } else if (e.key === 'ArrowRight' && currentIndex < totalSlides - 1) {
            updateCarousel(currentIndex + 1);
        }
    });

    // Touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50 && currentIndex < totalSlides - 1) {
            updateCarousel(currentIndex + 1);
        } else if (touchEndX - touchStartX > 50 && currentIndex > 0) {
            updateCarousel(currentIndex - 1);
        }
    });

    updateCarousel(0);
};

// Update init function
const originalInit = init;
init = () => {
    originalInit();
    initExperienceCarousel();
};