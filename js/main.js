// ============================================
// PORTFOLIO WEBSITE — SHARED JAVASCRIPT
// ============================================

// --- Mobile Nav Toggle ---
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('open');
        });
    }

    // --- Active nav link based on current page ---
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });

    // --- Scroll animations ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
});

// --- Reusable nav HTML ---
function getNavHTML(activePage) {
    return `
    <nav class="navbar">
        <div class="container">
            <a href="index.html" class="logo">Port<span>folio</span></a>
            <ul class="nav-links">
                <li><a href="index.html" ${activePage === 'index' ? 'class="active"' : ''}>Home</a></li>
                <li><a href="about.html" ${activePage === 'about' ? 'class="active"' : ''}>About</a></li>
                <li><a href="projects.html" ${activePage === 'projects' ? 'class="active"' : ''}>Projects</a></li>
                <li><a href="contact.html" ${activePage === 'contact' ? 'class="active"' : ''}>Contact</a></li>
            </ul>
            <div class="hamburger">
                <span></span><span></span><span></span>
            </div>
        </div>
    </nav>`;
}

// --- Reusable footer HTML ---
function getFooterHTML() {
    return `
    <footer class="footer">
        <div class="container">
            <div class="footer-grid">
                <div>
                    <h4>Portfolio</h4>
                    <p>Building beautiful digital experiences with clean code and creative design.</p>
                    <div class="social-links">
                        <a href="#">🐦</a>
                        <a href="#">💼</a>
                        <a href="#">🐙</a>
                        <a href="#">📷</a>
                    </div>
                </div>
                <div>
                    <h4>Quick Links</h4>
                    <a href="index.html">Home</a>
                    <a href="about.html">About</a>
                    <a href="projects.html">Projects</a>
                    <a href="contact.html">Contact</a>
                </div>
                <div>
                    <h4>Contact</h4>
                    <p>📧 hello@portfolio.dev</p>
                    <p>📍 San Francisco, CA</p>
                    <p>📞 (555) 123-4567</p>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025 Portfolio. All rights reserved. Built with ❤️</p>
            </div>
        </div>
    </footer>`;
}
