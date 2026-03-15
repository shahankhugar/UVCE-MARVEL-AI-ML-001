// ─── CANVAS STARFIELD ───────────────────────────────────────────────
const canvas = document.getElementById('starCanvas');
const ctx    = canvas.getContext('2d');

let stars = [];
let shootingStars = [];
let W, H;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
  initStars();
}

function initStars() {
  stars = Array.from({ length: 220 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.4,
    a: Math.random(),
    speed: 0.0004 + Math.random() * 0.0006,
    dir: Math.random() < 0.5 ? 1 : -1,
  }));
}

function spawnShootingStar() {
  shootingStars.push({
    x: Math.random() * W * 0.6,
    y: Math.random() * H * 0.3,
    len: 120 + Math.random() * 80,
    speed: 10 + Math.random() * 8,
    a: 1,
    angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
  });
}

setInterval(spawnShootingStar, 4000);

function drawStars() {
  ctx.clearRect(0, 0, W, H);

  stars.forEach(s => {
    s.a += s.speed * s.dir;
    if (s.a > 1 || s.a < 0.1) s.dir *= -1;

    const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2);
    gradient.addColorStop(0, `rgba(180, 230, 255, ${s.a})`);
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  });

  shootingStars = shootingStars.filter(ss => ss.a > 0);
  shootingStars.forEach(ss => {
    const dx = Math.cos(ss.angle) * ss.len;
    const dy = Math.sin(ss.angle) * ss.len;

    const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - dx, ss.y - dy);
    grad.addColorStop(0, `rgba(0, 234, 255, ${ss.a})`);
    grad.addColorStop(1, 'rgba(0, 234, 255, 0)');

    ctx.beginPath();
    ctx.moveTo(ss.x, ss.y);
    ctx.lineTo(ss.x - dx, ss.y - dy);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ss.x += Math.cos(ss.angle) * ss.speed;
    ss.y += Math.sin(ss.angle) * ss.speed;
    ss.a -= 0.025;
  });

  requestAnimationFrame(drawStars);
}

window.addEventListener('resize', resize);
resize();
drawStars();

// ─── BUTTON RIPPLE ───────────────────────────────────────────────────
document.getElementById('launchBtn').addEventListener('click', function (e) {
  const btn  = this;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.classList.add('btn-ripple');
  const size = Math.max(btn.offsetWidth, btn.offsetHeight) * 2;
  ripple.style.cssText = `
    width:${size}px; height:${size}px;
    left:${e.clientX - rect.left - size / 2}px;
    top:${e.clientY - rect.top - size / 2}px;
  `;
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
});

// ─── COUNT-UP ANIMATION ──────────────────────────────────────────────
function countUp(el, target, suffix = '', duration = 1200) {
  const start     = 0;
  const startTime = performance.now();
  const isFloat   = String(target).includes('.');

  function step(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = start + (target - start) * eased;
    el.textContent = isFloat
      ? current.toFixed(1) + suffix
      : Math.round(current).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ─── SPACEX API ──────────────────────────────────────────────────────
const API = 'https://api.spacexdata.com/v4/rockets';
let rockets = [];

async function loadRockets() {
  const res  = await fetch(API);
  rockets    = await res.json();

  const sel = document.getElementById('rocketSelect');
  rockets.forEach((r, i) => {
    const opt   = document.createElement('option');
    opt.value   = i;
    opt.textContent = r.name;
    sel.appendChild(opt);
  });
}

function showRocket() {
  const idx    = document.getElementById('rocketSelect').value;
  const info   = document.getElementById('rocketInfo');

  if (idx === '') {
    flashCard(info, '<p style="text-align:center;color:#556;font-family:Orbitron,monospace;font-size:12px;letter-spacing:2px;padding:30px 0">SELECT A ROCKET TO BEGIN</p>');
    return;
  }

  // Loading
  info.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'rocketCard';
  card.innerHTML = `
    <div class="loading-container">
      <div class="loader-ring"></div>
      <div class="loading-text">Fetching Telemetry...</div>
    </div>`;
  info.appendChild(card);

  setTimeout(() => renderRocket(rockets[idx], info), 900);
}

function renderRocket(r, info) {
  const img = r.flickr_images?.[0] || '';

  const heightM  = r.height?.meters   || 0;
  const massT    = r.mass?.kg         ? Math.round(r.mass.kg / 1000) : 0;
  const thrustKN = r.engines?.thrust_sea_level?.kN || 0;

  const firstFlight = r.first_flight
    ? new Date(r.first_flight).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  const isActive = r.active;

  info.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'rocketCard';
  card.innerHTML = `
    <div class="card-header">
      <div class="rocket-name">${r.name}</div>
      <span class="rocket-badge ${isActive ? 'badge-active' : 'badge-inactive'}">
        ${isActive ? '● ACTIVE' : '○ RETIRED'}
      </span>
    </div>

    ${img ? `
    <div class="img-container">
      <img src="${img}" alt="${r.name}" loading="lazy" />
      <div class="img-overlay-text">// MISSION VEHICLE</div>
    </div>` : ''}

    <div class="stats-grid">
      <div class="stat-box">
        <span class="stat-value" data-countup="${heightM}" data-suffix="m">–</span>
        <span class="stat-label">Height</span>
      </div>
      <div class="stat-box">
        <span class="stat-value" data-countup="${massT}" data-suffix="t">–</span>
        <span class="stat-label">Mass</span>
      </div>
      <div class="stat-box">
        <span class="stat-value" data-countup="${thrustKN}" data-suffix=" kN">–</span>
        <span class="stat-label">Thrust SL</span>
      </div>
    </div>

    <div class="desc-block">
      <p>${r.description || 'No mission description available.'}</p>
    </div>

    <div class="info-rows">
      <div class="info-row">
        <span class="info-key">Company</span>
        <span class="info-val">${r.company || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-key">Country</span>
        <span class="info-val">${r.country || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-key">First Flight</span>
        <span class="info-val">${firstFlight}</span>
      </div>
      <div class="info-row">
        <span class="info-key">Engines</span>
        <span class="info-val">${r.engines?.number || '—'} × ${r.engines?.type || ''} ${r.engines?.version || ''}</span>
      </div>
      <div class="info-row">
        <span class="info-key">Payload to LEO</span>
        <span class="info-val">${r.payload_weights?.find(p => p.id === 'leo')?.kg?.toLocaleString() || '—'} kg</span>
      </div>
      <div class="info-row">
        <span class="info-key">Stages</span>
        <span class="info-val">${r.stages || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-key">Cost Per Launch</span>
        <span class="info-val">$${r.cost_per_launch?.toLocaleString() || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-key">Success Rate</span>
        <span class="info-val">${r.success_rate_pct != null ? r.success_rate_pct + '%' : '—'}</span>
      </div>
    </div>
  `;

  info.appendChild(card);

  // Trigger count-ups after a brief delay
  setTimeout(() => {
    card.querySelectorAll('[data-countup]').forEach(el => {
      const val    = parseFloat(el.dataset.countup);
      const suffix = el.dataset.suffix || '';
      countUp(el, val, suffix);
    });
  }, 400);
}

// ─── INIT ────────────────────────────────────────────────────────────
loadRockets();