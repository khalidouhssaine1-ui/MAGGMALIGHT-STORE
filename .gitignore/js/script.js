/* ============================================
   MAGGMALIGHT — Main Script
   ============================================ */

/* ---- Hero Slider ---- */
let currentSlide = 0;
const totalSlides = 3;
let slideInterval;

function goToSlide(n) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = (n + totalSlides) % totalSlides;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}

function changeSlide(dir) {
  goToSlide(currentSlide + dir);
  resetInterval();
}

function resetInterval() {
  clearInterval(slideInterval);
  slideInterval = setInterval(() => goToSlide(currentSlide + 1), 5500);
}

slideInterval = setInterval(() => goToSlide(currentSlide + 1), 5500);

/* ---- Navbar scroll effect ---- */
const navbar = document.getElementById('navbar');

function updateNavbar() {
  const hero = document.querySelector('.hero');
  const ticker = document.querySelector('.ticker-bar');
  const tickerH = ticker ? ticker.offsetHeight : 38;
  const heroHeight = hero ? hero.offsetHeight : 600;

  if (window.scrollY > heroHeight * 0.55) {
    navbar.classList.remove('hero-mode');
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.add('hero-mode');
    navbar.classList.remove('scrolled');
  }

  const scrollTop = document.getElementById('scrollTop');
  if (scrollTop) {
    if (window.scrollY > 400) {
      scrollTop.classList.add('visible');
    } else {
      scrollTop.classList.remove('visible');
    }
  }
}

window.addEventListener('scroll', updateNavbar);
updateNavbar();

/* ---- Mobile Nav ---- */
function toggleMobileNav() {
  const nav = document.getElementById('mobileNav');
  nav.classList.toggle('open');
  document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
}

/* ---- Horizontal Product Carousels ---- */
function scrollCarousel(id, dir) {
  const track = document.getElementById(id);
  if (!track) return;
  const card = track.querySelector('.product-card');
  const step = card ? card.offsetWidth + 20 : 290;
  track.scrollBy({ left: dir * step * 2, behavior: 'smooth' });
}

/* ---- Cart ---- */
let cart = [];

function openCart() {
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartSidebar').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
  document.getElementById('cartSidebar').classList.remove('open');
  document.body.style.overflow = '';
}

function addToCart(name, price) {
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, price, qty: 1 });
  }
  updateCart();
  showToast(`"${name}" ajouté au panier`);
  openCart();
}

function updateCart() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  document.getElementById('cart-count').textContent = count;
  document.getElementById('cart-items-count').textContent = count;
  document.getElementById('cart-total-price').textContent = total.toLocaleString('fr-MA') + ',00 MAD';

  const cartItems = document.getElementById('cartItems');
  const cartEmpty = document.getElementById('cartEmpty');
  const cartFooter = document.getElementById('cartFooter');

  if (cart.length === 0) {
    cartEmpty.style.display = 'flex';
    cartItems.style.display = 'none';
    cartFooter.style.display = 'none';
    return;
  }

  cartEmpty.style.display = 'none';
  cartItems.style.display = 'flex';
  cartFooter.style.display = 'block';

  cartItems.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-img">💡</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${(item.price * item.qty).toLocaleString('fr-MA')},00 MAD</div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" onclick="changeQty(${idx}, -1)">−</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button class="cart-qty-btn" onclick="changeQty(${idx}, 1)">+</button>
          <button class="cart-qty-btn" onclick="removeItem(${idx})" style="margin-left:8px;color:#e63946">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function changeQty(idx, dir) {
  cart[idx].qty += dir;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  updateCart();
}

function removeItem(idx) {
  cart.splice(idx, 1);
  updateCart();
}

/* ---- Search ---- */
function openSearch() {
  document.getElementById('searchOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('searchInput').focus(), 100);
}

function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function searchProduct(term) {
  document.getElementById('searchInput').value = term;
  closeSearch();
  showToast(`Recherche : "${term}"`);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeSearch();
    closeCart();
  }
});

/* ---- Reviews Slider ---- */
let reviewsOffset = 0;

function scrollReviews(dir) {
  const track = document.getElementById('reviewsTrack');
  const card = track.querySelector('.review-card');
  if (!card) return;
  const cardW = card.offsetWidth + 24;
  const maxOffset = (track.children.length - 3) * cardW;
  reviewsOffset = Math.max(0, Math.min(reviewsOffset + dir * cardW, maxOffset));
  track.style.transform = `translateX(-${reviewsOffset}px)`;
}

/* ---- Contact Form ---- */
function submitContact(e) {
  e.preventDefault();
  const form = e.target;
  const getVal = (sel) => { const el = form.querySelector(sel); return el ? el.value.trim() : ''; };

  const firstName = getVal('[name="firstname"]') || getVal('#cf-first');
  const lastName  = getVal('[name="lastname"]')  || getVal('#cf-last');
  const name      = (firstName + ' ' + lastName).trim();
  const email     = getVal('[name="email"]')     || getVal('#cf-email');
  const phone     = getVal('[name="phone"]')     || getVal('#cf-phone');
  const subject   = getVal('[name="subject"]')   || getVal('#cf-subject') || 'Message';
  const message   = getVal('[name="message"]')   || getVal('#cf-message');

  if (!name || !email || !message) {
    showToast('Veuillez remplir tous les champs obligatoires.');
    return;
  }

  const bodyText = `Nom: ${name}\nEmail: ${email}\nTéléphone: ${phone}\nSujet: ${subject}\n\n${message}`;
  const mailtoLink = `mailto:contact@maggmalight.com?subject=${encodeURIComponent((subject || 'Message') + ' — ' + name)}&body=${encodeURIComponent(bodyText)}`;

  window.location.href = mailtoLink;
  showToast('Votre client e-mail va s\'ouvrir. Merci !');
  form.reset();
}

/* ---- Toast ---- */
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ---- Intersection Observer for fade-in-up ---- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));

/* ---- Newsletter ---- */
function subscribeNewsletter(e) {
  e.preventDefault();
  const input = e.target.querySelector('.newsletter-input');
  showToast(`Merci ! Vous êtes inscrit avec ${input.value}`);
  input.value = '';
}

/* ---- Category filter placeholder ---- */
function filterCategory(cat) {
  showToast(`Catégorie : ${cat} — bientôt disponible`);
}

/* ---- Smooth scroll for anchor links ---- */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
