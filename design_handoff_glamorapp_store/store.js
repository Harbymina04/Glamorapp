/* ============================================================
   Glamorapp Store — data + rendering + interactivity
   ============================================================ */

// ---------- Utilities ----------
const COP = (n) => '$' + n.toLocaleString('es-CO');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Category metadata
const CATS = {
  nails:  { label: 'Uñas',       color: '#F43F5E', g: ['#FFE4E6', '#FECDD3'] },
  hair:   { label: 'Cabello',    color: '#8B5CF6', g: ['#EDE9FE', '#DDD6FE'] },
  makeup: { label: 'Maquillaje', color: '#EC4899', g: ['#FCE7F3', '#FBCFE8'] },
  skin:   { label: 'Piel',       color: '#F97316', g: ['#FFEDD5', '#FED7AA'] },
  spa:    { label: 'Spa',        color: '#14B8A6', g: ['#CCFBF1', '#99F6E4'] },
};

// ---------- Placeholder SVG icons (product silhouettes) ----------
const ICONS = {
  bottle: '<path d="M9 2h6v3l1.5 2.5A4 4 0 0 1 17 9.7V20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9.7a4 4 0 0 1 .5-2.2L9 5z"/><path d="M9 5h6"/>',
  jar: '<rect x="5" y="8" width="14" height="13" rx="3"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  polish: '<path d="M8 21h8V9l-1-2V3H9v4L8 9z"/><path d="M9 3h6"/><path d="M8 13h8"/>',
  brush: '<path d="M14 3 4 13l3 3L17 6z"/><path d="m14 3 6 6-3 3-6-6z"/><path d="M4 13l-1 6 6-1"/>',
  spray: '<rect x="7" y="9" width="9" height="13" rx="2"/><path d="M16 12h2l2-2V6l-2-2h-2"/><path d="M10 9V5h4v4"/>',
  drop: '<path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.5 15.5M14.5 12.5 20 18M8.5 8.5 12 12"/>',
  sparkle: '<path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/>',
  hand: '<path d="M7 11V6a1.5 1.5 0 0 1 3 0v5M10 11V4.5a1.5 1.5 0 0 1 3 0V11M13 11V5.5a1.5 1.5 0 0 1 3 0V13c0 4-2.5 8-6 8s-6-3-6-7v-1a1.5 1.5 0 0 1 3 0z"/>',
};

// ---------- DATA: Salones ----------
const SHOPS = [
  { id:'s1', name:'Glamour Studio', type:'Salón de belleza & spa', city:'Bogotá', zone:'Chapinero', dist:'0.8 km', rating:4.8, reviews:234, tags:['nails','hair','spa'], g:['#EF2D8F','#8B5CF6'] },
  { id:'s2', name:'Beauty Zone', type:'Estudio de uñas', city:'Bogotá', zone:'Usaquén', dist:'1.4 km', rating:4.9, reviews:312, tags:['nails','skin'], g:['#F43F5E','#FB7185'] },
  { id:'s3', name:'Lumière Spa', type:'Spa & bienestar', city:'Bogotá', zone:'Zona T', dist:'2.1 km', rating:4.7, reviews:189, tags:['spa','skin'], g:['#14B8A6','#22D3EE'] },
  { id:'s4', name:'Rosa & Co', type:'Salón premium', city:'Bogotá', zone:'Rosales', dist:'2.6 km', rating:4.9, reviews:421, tags:['hair','makeup'], g:['#8B5CF6','#EC4899'] },
  { id:'s5', name:'Nailcraft', type:'Nail art studio', city:'Bogotá', zone:'Cedritos', dist:'3.2 km', rating:4.6, reviews:156, tags:['nails'], g:['#EC4899','#F97316'] },
  { id:'s6', name:'Mía Beauty', type:'Belleza integral', city:'Bogotá', zone:'Salitre', dist:'4.0 km', rating:4.8, reviews:278, tags:['makeup','skin','hair'], g:['#F97316','#FBBF24'] },
];

// ---------- DATA: Productos ----------
const PRODUCTS = [
  { id:'p1',  name:'Esmalte Gel OPI Rosa Pastel', brand:'OPI', cat:'nails', icon:'polish', price:25000, old:32000, rating:4.7, reviews:23, shop:'Glamour Studio' },
  { id:'p2',  name:'Base Coat Fortalecedor CND', brand:'CND', cat:'nails', icon:'bottle', price:18500, rating:4.8, reviews:41, shop:'Beauty Zone' },
  { id:'p3',  name:'Acrílico Premium Transparente', brand:'CND', cat:'nails', icon:'jar', price:37000, rating:4.6, reviews:18, shop:'Nailcraft' },
  { id:'p4',  name:'Top Coat Brillo Espejo', brand:'OPI', cat:'nails', icon:'polish', price:22000, old:28000, rating:4.9, reviews:67, shop:'Beauty Zone' },
  { id:'p5',  name:'Shampoo Reparador Keratina', brand:'L\'Oréal', cat:'hair', icon:'bottle', price:45000, rating:4.7, reviews:89, shop:'Rosa & Co' },
  { id:'p6',  name:'Mascarilla Capilar Nutritiva', brand:'Kérastase', cat:'hair', icon:'jar', price:78000, old:92000, rating:4.9, reviews:120, shop:'Rosa & Co' },
  { id:'p7',  name:'Spray Termoprotector', brand:'GHD', cat:'hair', icon:'spray', price:54000, rating:4.6, reviews:34, shop:'Glamour Studio' },
  { id:'p8',  name:'Labial Mate Larga Duración', brand:'MAC', cat:'makeup', icon:'polish', price:68000, rating:4.8, reviews:201, shop:'Mía Beauty' },
  { id:'p9',  name:'Base Líquida HD Cobertura', brand:'Fenty', cat:'makeup', icon:'bottle', price:115000, old:135000, rating:4.9, reviews:312, shop:'Mía Beauty' },
  { id:'p10', name:'Paleta Sombras Nude', brand:'Huda', cat:'makeup', icon:'jar', price:98000, rating:4.7, reviews:78, shop:'Rosa & Co' },
  { id:'p11', name:'Sérum Vitamina C', brand:'The Ordinary', cat:'skin', icon:'drop', price:42000, rating:4.8, reviews:156, shop:'Lumière Spa' },
  { id:'p12', name:'Crema Hidratante Ácido Hialurónico', brand:'CeraVe', cat:'skin', icon:'jar', price:58000, old:69000, rating:4.9, reviews:245, shop:'Lumière Spa' },
  { id:'p13', name:'Protector Solar FPS 50+', brand:'ISDIN', cat:'skin', icon:'bottle', price:72000, rating:4.7, reviews:98, shop:'Mía Beauty' },
  { id:'p14', name:'Aceite Esencial Relajante', brand:'Lumière', cat:'spa', icon:'drop', price:35000, rating:4.6, reviews:42, shop:'Lumière Spa' },
  { id:'p15', name:'Sales de Baño Lavanda', brand:'Lumière', cat:'spa', icon:'jar', price:28000, old:34000, rating:4.8, reviews:31, shop:'Lumière Spa' },
  { id:'p16', name:'Kit Pinceles Maquillaje x12', brand:'Real Tech', cat:'makeup', icon:'brush', price:89000, rating:4.7, reviews:64, shop:'Mía Beauty' },
  { id:'p17', name:'Removedor de Esmalte Sin Acetona', brand:'OPI', cat:'nails', icon:'bottle', price:16000, rating:4.5, reviews:22, shop:'Nailcraft' },
  { id:'p18', name:'Tinte Permanente Rubio Ceniza', brand:'Wella', cat:'hair', icon:'bottle', price:38000, rating:4.6, reviews:53, shop:'Glamour Studio' },
  { id:'p19', name:'Exfoliante Facial Suave', brand:'Neutrogena', cat:'skin', icon:'jar', price:31000, old:39000, rating:4.7, reviews:87, shop:'Lumière Spa' },
  { id:'p20', name:'Esmalte Semipermanente Rojo', brand:'Gelish', cat:'nails', icon:'polish', price:29000, rating:4.9, reviews:143, shop:'Beauty Zone' },
];

// ---------- DATA: Servicios ----------
const SERVICES = [
  { id:'sv1', name:'Manicure Clásico', cat:'nails', icon:'hand', min:60, from:35000, rating:4.8, reviews:145, shops:15 },
  { id:'sv2', name:'Uñas Acrílicas + Diseño', cat:'nails', icon:'sparkle', min:120, from:90000, rating:4.9, reviews:212, shops:9 },
  { id:'sv3', name:'Corte & Peinado', cat:'hair', icon:'scissors', min:45, from:45000, rating:4.7, reviews:98, shops:22 },
  { id:'sv4', name:'Balayage & Color', cat:'hair', icon:'brush', min:180, from:220000, rating:4.9, reviews:76, shops:11 },
  { id:'sv5', name:'Maquillaje Social', cat:'makeup', icon:'brush', min:60, from:80000, rating:4.8, reviews:54, shops:14 },
  { id:'sv6', name:'Limpieza Facial Profunda', cat:'skin', icon:'drop', min:75, from:65000, rating:4.7, reviews:122, shops:18 },
];

// ---------- DATA: Diseños de uñas (masonry) ----------
const DESIGNS = [
  { id:'d1', name:'French Pink Ombré', tech:'Acrílico', price:60000, shop:'Nailcraft', likes:234, h:340, g:['#FBCFE8','#F9A8D4'] },
  { id:'d2', name:'Glitter Galaxy', tech:'Gel', price:55000, shop:'Beauty Zone', likes:189, h:280, g:['#C4B5FD','#818CF8'] },
  { id:'d3', name:'Nude Minimalista', tech:'Semipermanente', price:40000, shop:'Glamour Studio', likes:312, h:360, g:['#FED7AA','#FDBA74'] },
  { id:'d4', name:'Cherry Red Glossy', tech:'Gel', price:48000, shop:'Beauty Zone', likes:156, h:300, g:['#FECACA','#FB7185'] },
  { id:'d5', name:'Marble Effect', tech:'Acrílico', price:65000, shop:'Nailcraft', likes:278, h:330, g:['#A7F3D0','#6EE7B7'] },
  { id:'d6', name:'Chrome Mirror', tech:'Gel', price:58000, shop:'Glamour Studio', likes:201, h:290, g:['#DDD6FE','#C4B5FD'] },
  { id:'d7', name:'Floral Hand-paint', tech:'Manual', price:72000, shop:'Nailcraft', likes:345, h:380, g:['#FBCFE8','#FDA4AF'] },
  { id:'d8', name:'Baby Boomer', tech:'Acrílico', price:62000, shop:'Beauty Zone', likes:167, h:310, g:['#FEF3C7','#FCD34D'] },
];

// ============================================================
//   RENDER HELPERS
// ============================================================
function starRow(rating, reviews, size = 14) {
  const full = Math.round(rating);
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<svg class="star ${i <= full ? 'on' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="m12 2 2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z"/></svg>`;
  }
  return `<span class="rating">${stars}<b>${rating}</b>${reviews != null ? `<span class="rcount">(${reviews})</span>` : ''}</span>`;
}

function placeholder(icon, g, ratio = '1/1', extra = '') {
  return `<div class="ph" style="aspect-ratio:${ratio};background:linear-gradient(150deg,${g[0]},${g[1]})">
    <svg class="ph-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon] || ICONS.sparkle}</svg>
    ${extra}
  </div>`;
}

// ---------- Product card ----------
function productCard(p) {
  const cat = CATS[p.cat];
  const disc = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
  return `<article class="card prod" data-cat="${p.cat}" data-id="${p.id}">
    <div class="card-media">
      ${placeholder(p.icon, cat.g, '1/1', `<span class="brand-chip">${p.brand}</span>`)}
      ${disc ? `<span class="disc-badge">-${disc}%</span>` : ''}
      <button class="fav" data-fav="${p.id}" aria-label="Favorito">
        <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.5 8.5 2 5 5.5 5 7.7 5 9 6.3 12 9c3-2.7 4.3-4 6.5-4C22 5 23.5 8.5 22 11.7 19.5 16.4 12 21 12 21z"/></svg>
      </button>
    </div>
    <div class="card-body">
      ${starRow(p.rating, p.reviews)}
      <h4 class="prod-name">${p.name}</h4>
      <p class="prod-shop"><svg class="pin" viewBox="0 0 24 24"><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>${p.shop}</p>
      <div class="price-row">
        ${p.old ? `<span class="price-old">${COP(p.old)}</span>` : ''}
        <span class="price">${COP(p.price)}</span>
        <span class="cur">COP</span>
      </div>
      <button class="btn-add" data-add="${p.id}">
        <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
        Agregar
      </button>
    </div>
  </article>`;
}

// ---------- Shop card ----------
function shopCard(s) {
  const tags = s.tags.map(t => CATS[t].label).join(' · ');
  return `<article class="card shop" data-id="${s.id}">
    <div class="shop-banner" style="background:linear-gradient(135deg,${s.g[0]},${s.g[1]})">
      <div class="shop-logo">${s.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
      <span class="shop-overlay-name">${s.name}</span>
    </div>
    <div class="card-body">
      ${starRow(s.rating, s.reviews)}
      <p class="shop-type">${s.type}</p>
      <p class="prod-shop"><svg class="pin" viewBox="0 0 24 24"><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>${s.zone} · ${s.dist}</p>
      <p class="shop-tags">${tags}</p>
      <a class="btn-outline-cta" href="Salon.html">Ver salón <span>→</span></a>
    </div>
  </article>`;
}

// ---------- Service card ----------
function serviceCard(s) {
  const cat = CATS[s.cat];
  return `<article class="card service" data-id="${s.id}">
    <div class="svc-media">${placeholder(s.icon, cat.g, '1/1')}</div>
    <div class="svc-body">
      <span class="cat-pill" style="background:${cat.g[0]};color:${cat.color}">${cat.label}</span>
      <h4 class="prod-name">${s.name}</h4>
      ${starRow(s.rating, s.reviews)}
      <p class="svc-meta">${s.min} min · Desde <b>${COP(s.from)}</b></p>
      <p class="prod-shop"><svg class="pin" viewBox="0 0 24 24"><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>${s.shops} salones disponibles</p>
      <button class="btn-outline-cta full">Agendar cita <span>→</span></button>
    </div>
  </article>`;
}

// ---------- Nail design card ----------
function designCard(d) {
  return `<article class="card design" data-id="${d.id}">
    <div class="design-media" style="height:${d.h}px;background:linear-gradient(160deg,${d.g[0]},${d.g[1]})">
      <svg class="ph-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${ICONS.hand}</svg>
      <button class="fav on-media" data-fav="${d.id}" aria-label="Favorito">
        <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.5 8.5 2 5 5.5 5 7.7 5 9 6.3 12 9c3-2.7 4.3-4 6.5-4C22 5 23.5 8.5 22 11.7 19.5 16.4 12 21 12 21z"/></svg>
      </button>
    </div>
    <div class="design-body">
      <h4 class="prod-name">${d.name}</h4>
      <p class="design-meta">${d.tech} · <b>${COP(d.price)}</b></p>
      <div class="design-foot">
        <span class="design-shop">${d.shop}</span>
        <span class="design-likes"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.5 8.5 2 5 5.5 5 7.7 5 9 6.3 12 9c3-2.7 4.3-4 6.5-4C22 5 23.5 8.5 22 11.7 19.5 16.4 12 21 12 21z"/></svg>${d.likes}</span>
      </div>
    </div>
  </article>`;
}

// ============================================================
//   STATE
// ============================================================
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let cart = load('ga_cart', {});       // { productId: qty }
let favs = new Set(load('ga_favs', [])); // ids
let activeCat = 'all';

const productById = id => PRODUCTS.find(p => p.id === id);

// ============================================================
//   RENDER PAGE
// ============================================================
function renderAll() {
  if ($('#shopsRow')) $('#shopsRow').innerHTML = SHOPS.map(shopCard).join('');
  if ($('#servicesGrid')) $('#servicesGrid').innerHTML = SERVICES.map(serviceCard).join('');
  if ($('#designsGrid')) $('#designsGrid').innerHTML = DESIGNS.map(designCard).join('');
  if ($('#productsGrid')) renderProducts();
  syncFavs();
  renderCart();
}

function renderProducts() {
  const grid = $('#productsGrid');
  if (!grid) return;
  const list = activeCat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.cat === activeCat);
  grid.innerHTML = list.map(productCard).join('');
  if ($('#prodCount')) $('#prodCount').textContent = list.length;
  syncFavs();
}

function syncFavs() {
  $$('[data-fav]').forEach(b => b.classList.toggle('active', favs.has(b.dataset.fav)));
  const n = favs.size;
  const fb = $('#favBadge');
  if (fb) { fb.textContent = n; fb.classList.toggle('show', n > 0); }
}

// ============================================================
//   CART
// ============================================================
function cartCount() { return Object.values(cart).reduce((a, b) => a + b, 0); }

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  save('ga_cart', cart);
  renderCart();
  bounceCart();
}
function addToCartQty(id, q) {
  cart[id] = (cart[id] || 0) + q;
  save('ga_cart', cart);
  renderCart();
  bounceCart();
}
function setQty(id, q) {
  if (q <= 0) delete cart[id]; else cart[id] = q;
  save('ga_cart', cart);
  renderCart();
  if (document.getElementById('coGrid')) renderCheckout();
}

function bounceCart() {
  const b = $('#cartBtn');
  b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce');
}

function renderCart() {
  const cb = $('#cartBadge');
  if (cb) { const c = cartCount(); cb.textContent = c; cb.classList.toggle('show', c > 0); }
  const body = $('#cartItems');
  if (!body) return; // page has no cart drawer (e.g. checkout)
  const n = cartCount();
  const ids = Object.keys(cart);
  $('#cartTitle').textContent = `Tu carrito (${n})`;

  if (!ids.length) {
    body.innerHTML = `<div class="cart-empty">
      <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
      <p>Tu carrito está vacío</p>
      <span>Explora productos y agrégalos aquí</span>
    </div>`;
    $('#cartFoot').style.display = 'none';
    return;
  }
  $('#cartFoot').style.display = 'block';

  // group by shop
  const groups = {};
  ids.forEach(id => {
    const p = productById(id);
    (groups[p.shop] ||= []).push(p);
  });

  let subtotal = 0;
  let html = '';
  for (const shop in groups) {
    html += `<div class="cart-group"><p class="cart-shop">${shop}</p>`;
    groups[shop].forEach(p => {
      const q = cart[p.id];
      subtotal += p.price * q;
      const cat = CATS[p.cat];
      html += `<div class="cart-item">
        <div class="ci-media" style="background:linear-gradient(150deg,${cat.g[0]},${cat.g[1]})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[p.icon]}</svg>
        </div>
        <div class="ci-info">
          <p class="ci-name">${p.name}</p>
          <p class="ci-price">${COP(p.price)}</p>
          <div class="qty">
            <button data-qty="${p.id}" data-d="-1">−</button>
            <span>${q}</span>
            <button data-qty="${p.id}" data-d="1">+</button>
          </div>
        </div>
        <button class="ci-del" data-del="${p.id}" aria-label="Eliminar">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>`;
    });
    html += `</div>`;
  }
  body.innerHTML = html;
  $('#cartSubtotal').textContent = COP(subtotal);
  $('#cartTotal').textContent = COP(subtotal);
}

function openCart() { $('#cartDrawer').classList.add('open'); $('#overlay').classList.add('show'); document.body.style.overflow = 'hidden'; }
function closeCart() { $('#cartDrawer').classList.remove('open'); $('#overlay').classList.remove('show'); document.body.style.overflow = ''; }

// ============================================================
//   EVENTS
// ============================================================
document.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) { addToCart(add.dataset.add); return; }

  const fav = e.target.closest('[data-fav]');
  if (fav) {
    const id = fav.dataset.fav;
    if (favs.has(id)) favs.delete(id); else { favs.add(id); fav.classList.add('pop'); setTimeout(()=>fav.classList.remove('pop'),300); }
    save('ga_favs', [...favs]);
    syncFavs();
    return;
  }

  const qty = e.target.closest('[data-qty]');
  if (qty) { setQty(qty.dataset.qty, (cart[qty.dataset.qty] || 0) + (+qty.dataset.d)); return; }

  const del = e.target.closest('[data-del]');
  if (del) { setQty(del.dataset.del, 0); return; }

  const pill = e.target.closest('[data-cat]');
  if (pill && pill.classList.contains('cat-link')) {
    activeCat = pill.dataset.cat;
    $$('.cat-link').forEach(c => c.classList.toggle('active', c === pill));
    renderProducts();
    return;
  }

  const tab = e.target.closest('[data-tab]');
  if (tab) {
    $$('.s-tab').forEach(t => t.classList.toggle('active', t === tab));
    $$('.tab-panel').forEach(p => p.classList.toggle('show', p.id === 'tab-' + tab.dataset.tab));
    return;
  }

  // navigate to product detail (clicking card but not its buttons)
  const pcard = e.target.closest('.card.prod');
  if (pcard && !e.target.closest('button')) {
    location.href = 'Producto.html?id=' + pcard.dataset.id;
    return;
  }
});

$('#cartBtn')?.addEventListener('click', openCart);
$('#cartClose')?.addEventListener('click', closeCart);
$('#overlay')?.addEventListener('click', closeCart);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

// Scroll-aware navbar
window.addEventListener('scroll', () => {
  $('#nav').classList.toggle('scrolled', window.scrollY > 8);
});

// Shop row scroll buttons
$('#shopsPrev')?.addEventListener('click', () => $('#shopsRow').scrollBy({ left: -360, behavior: 'smooth' }));
$('#shopsNext')?.addEventListener('click', () => $('#shopsRow').scrollBy({ left: 360, behavior: 'smooth' }));

// ============================================================
//   SALON PROFILE rendering (used by Salon.html)
// ============================================================
const shopById = id => SHOPS.find(s => s.id === id);

function renderSalon(shopId) {
  const shop = shopById(shopId);
  if (!shop) return;
  // Own products first, then fill with category-matching products up to 10
  const own = PRODUCTS.filter(p => p.shop === shop.name);
  const extra = PRODUCTS.filter(p => shop.tags.includes(p.cat) && p.shop !== shop.name);
  const prods = [...own, ...extra].slice(0, 10);
  const desg = DESIGNS.filter(d => d.shop === shop.name);
  const svcs = SERVICES.filter(s => shop.tags.includes(s.cat));

  if ($('#tab-productos')) $('#tab-productos').querySelector('.products-grid').innerHTML = prods.map(productCard).join('');
  if ($('#tab-servicios')) $('#tab-servicios').querySelector('.services-grid').innerHTML = svcs.map(serviceCard).join('');
  if ($('#tab-disenos')) $('#tab-disenos').querySelector('.designs-grid').innerHTML = (desg.length ? desg : DESIGNS.slice(0, 6)).map(designCard).join('');

  renderAll();
}

renderAll();
window.renderSalon = renderSalon;

// ============================================================
//   PRODUCT DETAIL rendering (used by Producto.html)
// ============================================================
const DESCRIPTIONS = {
  nails: 'Fórmula profesional de larga duración, brillo intenso y secado rápido. Ideal para uso en salón y en casa. Aplicación uniforme sin grumos, resistente a astillados hasta por 3 semanas.',
  hair: 'Tratamiento profesional que nutre, repara y protege la fibra capilar desde la raíz hasta las puntas. Formulado con activos de alta penetración para un cabello visiblemente más suave y manejable.',
  makeup: 'Cosmético de alta pigmentación y acabado profesional. Larga duración, resistente al agua y al sudor. Dermatológicamente probado, apto para todo tipo de piel.',
  skin: 'Activo dermocosmético de absorción rápida que hidrata, repara y protege la barrera cutánea. Textura ligera no comedogénica, ideal para uso diario mañana y noche.',
  spa: 'Producto de bienestar elaborado con ingredientes naturales para una experiencia sensorial de relajación profunda. Aromas envolventes que transforman tu rutina en un ritual.',
};
const BRANCHES = [
  { name: 'Sede Chapinero', dist: '0.8 km', stock: true },
  { name: 'Sede Usaquén', dist: '2.1 km', stock: true },
  { name: 'Sede Salitre', dist: '3.5 km', stock: false },
];
let pdQty = 1;
let pdProduct = null;

function pdStockFor(id) { return 8 + (id.charCodeAt(1) * 3) % 18; } // deterministic 8-25

function renderProductDetail() {
  const id = new URLSearchParams(location.search).get('id') || 'p1';
  const p = productById(id) || PRODUCTS[0];
  pdProduct = p;
  const cat = CATS[p.cat];
  const stock = pdStockFor(p.id);
  const disc = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;

  // breadcrumb + titles
  $('#pdCrumbCat').textContent = cat.label;
  $('#pdCrumbName').textContent = p.name;
  $('#pdName').textContent = p.name;
  $('#pdBrand').textContent = p.brand;
  $('#pdRating').innerHTML = starRow(p.rating, p.reviews, 16);
  $('#pdPrice').textContent = COP(p.price);
  $('#pdCur').textContent = 'COP';
  $('#pdOld').innerHTML = p.old ? `<span class="price-old">${COP(p.old)}</span><span class="disc-inline">-${disc}%</span>` : '';
  $('#pdStock').innerHTML = `<span class="dot-ok"></span> En stock · <b>${stock} disponibles</b>`;

  // gallery — main + 4 thumbs (color variations of the category gradient)
  const shades = [cat.g, [cat.g[1], cat.g[0]], ['#fff0', cat.g[0]], [cat.g[1], '#1112']];
  $('#pdMain').innerHTML = `<div class="ph" style="aspect-ratio:1/1;background:linear-gradient(150deg,${cat.g[0]},${cat.g[1]})">
      <svg class="ph-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${ICONS[p.icon]}</svg>
      <span class="brand-chip">${p.brand}</span></div>`;
  $('#pdThumbs').innerHTML = shades.map((g, i) => `<button class="pd-thumb ${i===0?'active':''}" data-thumb="${i}" style="background:linear-gradient(150deg,${g[0]},${g[1]})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[p.icon]}</svg></button>`).join('');

  // shop + branches
  $('#pdShop').textContent = p.shop;
  $('#pdBranches').innerHTML = BRANCHES.map((b, i) => `<label class="branch ${i===0?'sel':''}">
      <input type="radio" name="branch" ${i===0?'checked':''} ${!b.stock?'disabled':''}>
      <span class="branch-dot"></span>
      <span class="branch-info"><b>${b.name}</b><span>${b.dist}</span></span>
      <span class="branch-stock ${b.stock?'':'out'}">${b.stock?'Disponible':'Agotado'}</span>
    </label>`).join('');

  $('#pdQtyVal').textContent = pdQty;

  // favorite state
  $('#pdFav').classList.toggle('active', favs.has(p.id));

  // description tab
  $('#pdDesc').innerHTML = `<p>${DESCRIPTIONS[p.cat]}</p>
    <ul class="pd-specs">
      <li><span>Marca</span><b>${p.brand}</b></li>
      <li><span>Categoría</span><b>${cat.label}</b></li>
      <li><span>Vendido por</span><b>${p.shop}</b></li>
      <li><span>Calificación</span><b>${p.rating} / 5 (${p.reviews} reseñas)</b></li>
      <li><span>Disponibilidad</span><b>${stock} unidades</b></li>
    </ul>`;

  // reviews count + similar
  $('#pdRevCount').textContent = p.reviews;
  const similar = PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 5);
  $('#tab-similares').querySelector('.products-grid').innerHTML = similar.map(productCard).join('');

  document.title = p.name + ' · Glamorapp';
  renderAll();
}

// detail-page specific events
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-thumb]');
  if (t) {
    $$('.pd-thumb').forEach(x => x.classList.toggle('active', x === t));
    const cat = CATS[pdProduct.cat];
    const shades = [cat.g, [cat.g[1], cat.g[0]], ['#fff0', cat.g[0]], [cat.g[1], '#1112']];
    const g = shades[+t.dataset.thumb];
    $('#pdMain').querySelector('.ph').style.background = `linear-gradient(150deg,${g[0]},${g[1]})`;
    return;
  }
  const stepper = e.target.closest('[data-pdqty]');
  if (stepper) {
    pdQty = Math.max(1, pdQty + (+stepper.dataset.pdqty));
    $('#pdQtyVal').textContent = pdQty;
    return;
  }
  const pdAdd = e.target.closest('#pdAdd');
  if (pdAdd) { addToCartQty(pdProduct.id, pdQty); openCart(); return; }
  const pdFav = e.target.closest('#pdFav');
  if (pdFav) {
    const fid = pdProduct.id;
    if (favs.has(fid)) favs.delete(fid); else favs.add(fid);
    save('ga_favs', [...favs]);
    pdFav.classList.toggle('active', favs.has(fid));
    syncFavs();
    return;
  }
  const branch = e.target.closest('.branch');
  if (branch && !branch.querySelector('input').disabled) {
    $$('.branch').forEach(b => b.classList.remove('sel'));
    branch.classList.add('sel');
    branch.querySelector('input').checked = true;
    return;
  }

  const checkout = e.target.closest('.btn-checkout');
  if (checkout) { location.href = 'Checkout.html'; return; }
});

window.renderProductDetail = renderProductDetail;

// ============================================================
//   CHECKOUT rendering (used by Checkout.html)
// ============================================================
const CO_BRANCHES = ['Sede Chapinero · 0.8 km', 'Sede Usaquén · 2.1 km', 'Sede Salitre · 3.5 km'];

function renderCheckout() {
  const ids = Object.keys(cart);
  const empty = $('#coEmpty'), grid = $('#coGrid');
  if (!grid) return;
  if (!ids.length) {
    if (empty) empty.style.display = 'block';
    grid.style.display = 'none';
    return;
  }
  if (empty) empty.style.display = 'none';
  grid.style.display = 'grid';

  // group by shop
  const groups = {};
  ids.forEach(id => { const p = productById(id); (groups[p.shop] ||= []).push(p); });

  let subtotal = 0, items = 0;
  let html = '';
  let gi = 0;
  for (const shop in groups) {
    html += `<div class="co-order">
      <div class="co-order-head">
        <span class="co-shop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>${shop}</span>
        <span class="co-order-tag">Pedido ${gi + 1}</span>
      </div>
      <div class="co-pickup">
        <p class="co-pickup-label">Recoger en:</p>
        <div class="co-branches">
          ${CO_BRANCHES.map((b, i) => `<label class="co-branch ${i===0?'sel':''}"><input type="radio" name="branch-${gi}" ${i===0?'checked':''}><span class="branch-dot"></span>${b}</label>`).join('')}
        </div>
      </div>
      <div class="co-items">`;
    groups[shop].forEach(p => {
      const q = cart[p.id]; subtotal += p.price * q; items += q;
      const cat = CATS[p.cat];
      html += `<div class="co-item">
        <div class="ci-media" style="background:linear-gradient(150deg,${cat.g[0]},${cat.g[1]})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[p.icon]}</svg></div>
        <div class="ci-info">
          <p class="ci-name">${p.name}</p>
          <p class="co-item-brand">${p.brand}</p>
          <div class="qty"><button data-qty="${p.id}" data-d="-1">−</button><span>${q}</span><button data-qty="${p.id}" data-d="1">+</button></div>
        </div>
        <div class="co-item-right">
          <span class="co-item-price">${COP(p.price * q)}</span>
          <button class="ci-del" data-del="${p.id}" aria-label="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button>
        </div>
      </div>`;
    });
    html += `</div></div>`;
    gi++;
  }
  $('#coOrders').innerHTML = html;

  // summary
  $('#coSumItems').textContent = items + (items === 1 ? ' producto' : ' productos');
  $('#coSumShops').textContent = Object.keys(groups).length + (Object.keys(groups).length === 1 ? ' tienda' : ' tiendas');
  $('#coSubtotal').textContent = COP(subtotal);
  $('#coTotal').textContent = COP(subtotal);
  $('#coPayAmount').textContent = COP(subtotal);
}

// checkout events
document.addEventListener('click', (e) => {
  const cob = e.target.closest('.co-branch');
  if (cob) {
    const group = cob.parentElement;
    group.querySelectorAll('.co-branch').forEach(b => b.classList.remove('sel'));
    cob.classList.add('sel');
    cob.querySelector('input').checked = true;
    return;
  }
  const pay = e.target.closest('.pay-method');
  if (pay) {
    $$('.pay-method').forEach(m => m.classList.remove('sel'));
    pay.classList.add('sel');
    pay.querySelector('input').checked = true;
    // toggle card fields
    const cf = $('#cardFields');
    if (cf) cf.style.display = pay.dataset.method === 'card' ? 'grid' : 'none';
    return;
  }
  const payBtn = e.target.closest('#coPayBtn');
  if (payBtn) {
    if (!Object.keys(cart).length) return;
    const order = 'GA-' + Math.floor(100000 + Math.random() * 900000);
    $('#coConfNum').textContent = order;
    const method = $('.pay-method.sel')?.querySelector('.pm-name')?.textContent || 'Tarjeta';
    $('#coConfMethod').textContent = method;
    $('#coConfTotal').textContent = $('#coTotal').textContent;
    $('#checkoutMain').style.display = 'none';
    $('#coConfirm').style.display = 'flex';
    // re-trigger the success pop animation (it was hidden at load)
    const chk = $('.conf-check');
    if (chk) { chk.style.animation = 'none'; void chk.offsetWidth; chk.style.animation = ''; }
    // mark steps complete
    $$('.step').forEach((s, i) => { s.classList.toggle('done', i < 3); s.classList.toggle('active', i === 3); });
    cart = {}; save('ga_cart', cart); renderCart();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
});

window.renderCheckout = renderCheckout;

// ============================================================
//   CATALOG: filters + search + favorites (used by Catalogo.html)
// ============================================================
const PRICE_MAX = 150000;
const ALL_BRANDS = [...new Set(PRODUCTS.map(p => p.brand))].sort();
const catState = { q: '', cat: 'all', brands: new Set(), pmin: 0, pmax: PRICE_MAX, rating: 0, sale: false, fav: false, sort: 'relevance' };
const SORTS = {
  relevance: 'Relevancia', 'price-asc': 'Precio: menor a mayor', 'price-desc': 'Precio: mayor a menor',
  rating: 'Mejor calificados', discount: 'Mayor descuento',
};

function discountOf(p) { return p.old ? (1 - p.price / p.old) : 0; }

function catFiltered() {
  let list = PRODUCTS.filter(p => {
    if (catState.q) { const q = catState.q.toLowerCase(); if (!(p.name + ' ' + p.brand + ' ' + CATS[p.cat].label).toLowerCase().includes(q)) return false; }
    if (catState.cat !== 'all' && p.cat !== catState.cat) return false;
    if (catState.brands.size && !catState.brands.has(p.brand)) return false;
    if (p.price < catState.pmin || p.price > catState.pmax) return false;
    if (catState.rating && p.rating < catState.rating) return false;
    if (catState.sale && !p.old) return false;
    if (catState.fav && !favs.has(p.id)) return false;
    return true;
  });
  const s = catState.sort;
  if (s === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (s === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (s === 'rating') list.sort((a, b) => b.rating - a.rating);
  else if (s === 'discount') list.sort((a, b) => discountOf(b) - discountOf(a));
  return list;
}

function renderCatChips() {
  const chips = [];
  if (catState.q) chips.push(['q', `“${catState.q}”`]);
  if (catState.cat !== 'all') chips.push(['cat', CATS[catState.cat].label]);
  catState.brands.forEach(b => chips.push(['brand:' + b, b]));
  if (catState.pmin > 0 || catState.pmax < PRICE_MAX) chips.push(['price', `${COP(catState.pmin)} – ${COP(catState.pmax)}`]);
  if (catState.rating) chips.push(['rating', `★ ${catState.rating}+`]);
  if (catState.sale) chips.push(['sale', 'En oferta']);
  if (catState.fav) chips.push(['fav', '♥ Favoritos']);
  const box = $('#catChips');
  if (!chips.length) { box.innerHTML = ''; box.classList.remove('show'); return; }
  box.classList.add('show');
  box.innerHTML = chips.map(([k, l]) => `<button class="fchip" data-rm="${k}">${l}<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`).join('') +
    `<button class="fchip clear" data-rm="all">Limpiar todo</button>`;
}

function renderCatalogGrid() {
  const list = catFiltered();
  const grid = $('#catGrid');
  $('#catCount').textContent = list.length;
  if (!list.length) {
    grid.innerHTML = `<div class="cat-noresults"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><h3>Sin resultados</h3><p>Prueba ajustando o limpiando los filtros.</p></div>`;
  } else {
    grid.innerHTML = list.map(productCard).join('');
  }
  // sync sidebar active states
  $$('[data-catpick]').forEach(b => b.classList.toggle('active', b.dataset.catpick === catState.cat));
  $$('[data-rating]').forEach(b => b.classList.toggle('active', +b.dataset.rating === catState.rating));
  const st = $('#catSale'); if (st) st.checked = catState.sale;
  const ft = $('#catFav'); if (ft) ft.checked = catState.fav;
  renderCatChips();
  syncFavs();
}

function renderCatalog() {
  const params = new URLSearchParams(location.search);
  if (params.get('q')) catState.q = params.get('q');
  if (params.get('cat') && CATS[params.get('cat')]) catState.cat = params.get('cat');
  if (params.get('fav')) catState.fav = true;
  if (params.get('sale')) catState.sale = true;

  // search input prefill
  const si = $('#catSearch'); if (si) si.value = catState.q;

  // brand checkboxes
  $('#catBrands').innerHTML = ALL_BRANDS.map(b =>
    `<label class="fcheck"><input type="checkbox" data-brand="${b}"><span class="fbox"></span>${b}</label>`).join('');

  // price sliders init
  const pmin = $('#priceMin'), pmax = $('#priceMax');
  if (pmin && pmax) {
    pmin.max = pmax.max = PRICE_MAX; pmin.value = catState.pmin; pmax.value = catState.pmax;
    updatePriceLabel();
  }

  // sort options
  const sortSel = $('#catSort');
  if (sortSel) sortSel.innerHTML = Object.entries(SORTS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

  renderCatalogGrid();
}

function updatePriceLabel() {
  const pmin = $('#priceMin'), pmax = $('#priceMax');
  if (pmin && pmax) $('#priceLabel').textContent = `${COP(+pmin.value)} – ${COP(+pmax.value)}`;
}

// catalog events
document.addEventListener('click', (e) => {
  const pick = e.target.closest('[data-catpick]');
  if (pick) { catState.cat = pick.dataset.catpick; renderCatalogGrid(); return; }
  const rate = e.target.closest('[data-rating]');
  if (rate) { const v = +rate.dataset.rating; catState.rating = (catState.rating === v ? 0 : v); renderCatalogGrid(); return; }
  const rm = e.target.closest('[data-rm]');
  if (rm) {
    const k = rm.dataset.rm;
    if (k === 'all') { catState.q = ''; catState.cat = 'all'; catState.brands.clear(); catState.pmin = 0; catState.pmax = PRICE_MAX; catState.rating = 0; catState.sale = false; catState.fav = false;
      const si = $('#catSearch'); if (si) si.value = ''; const pmin = $('#priceMin'), pmax = $('#priceMax'); if (pmin) pmin.value = 0; if (pmax) pmax.value = PRICE_MAX; updatePriceLabel();
      $$('[data-brand]').forEach(c => c.checked = false); }
    else if (k === 'q') { catState.q = ''; const si = $('#catSearch'); if (si) si.value = ''; }
    else if (k === 'cat') catState.cat = 'all';
    else if (k === 'price') { catState.pmin = 0; catState.pmax = PRICE_MAX; const pmin = $('#priceMin'), pmax = $('#priceMax'); if (pmin) pmin.value = 0; if (pmax) pmax.value = PRICE_MAX; updatePriceLabel(); }
    else if (k === 'rating') catState.rating = 0;
    else if (k === 'sale') catState.sale = false;
    else if (k === 'fav') catState.fav = false;
    else if (k.startsWith('brand:')) { const b = k.slice(6); catState.brands.delete(b); const cb = $(`[data-brand="${CSS.escape(b)}"]`); if (cb) cb.checked = false; }
    renderCatalogGrid(); return;
  }
});

document.addEventListener('change', (e) => {
  const brand = e.target.closest('[data-brand]');
  if (brand) { if (brand.checked) catState.brands.add(brand.dataset.brand); else catState.brands.delete(brand.dataset.brand); renderCatalogGrid(); return; }
  if (e.target.id === 'catSale') { catState.sale = e.target.checked; renderCatalogGrid(); return; }
  if (e.target.id === 'catFav') { catState.fav = e.target.checked; renderCatalogGrid(); return; }
  if (e.target.id === 'catSort') { catState.sort = e.target.value; renderCatalogGrid(); return; }
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'catSearch') { catState.q = e.target.value; renderCatalogGrid(); return; }
  if (e.target.id === 'priceMin' || e.target.id === 'priceMax') {
    const pmin = $('#priceMin'), pmax = $('#priceMax');
    let lo = +pmin.value, hi = +pmax.value;
    if (lo > hi) { if (e.target.id === 'priceMin') lo = hi; else hi = lo; pmin.value = lo; pmax.value = hi; }
    catState.pmin = lo; catState.pmax = hi; updatePriceLabel(); renderCatalogGrid(); return;
  }
});

// navbar search + favorites shortcuts (all pages)
(function () {
  const si = $('.search input');
  if (si && !document.getElementById('catGrid')) {
    si.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) location.href = 'Catalogo.html?q=' + encodeURIComponent(e.target.value.trim()); });
  }
  $('.icon-btn[aria-label="Favoritos"]')?.addEventListener('click', () => location.href = 'Catalogo.html?fav=1');
})();

window.renderCatalog = renderCatalog;
