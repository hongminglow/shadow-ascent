// In-game heads-up display, built as DOM over the canvas.
export class HUD {
  constructor() {
    const root = document.createElement('div');
    root.id = 'hud';
    root.className = 'hidden';
    root.innerHTML = `
      <div class="alarm"></div>
      <div class="damage-vignette"></div>
      <div class="scope"></div>
      <div class="crosshair"></div>
      <div class="hitmarker"></div>
      <div class="alert-text">⚠ DETECTED</div>

      <div class="hud-top">
        <div class="floor-name"></div>
        <div class="objective"></div>
        <div class="threats"></div>
      </div>

      <div class="hud-bottom-left">
        <div class="bar-label">Vitals</div>
        <div class="health-bar"><div class="health-fill"></div></div>
      </div>

      <div class="hud-bottom-right">
        <div class="ammo"><span class="mag">12</span><span class="reserve"> / 60</span></div>
        <div class="weapon-name">M9 Sidearm</div>
      </div>

      <div class="prompt"></div>
      <div class="toast"></div>
    `;
    document.body.appendChild(root);
    this.root = root;
    this.$ = (s) => root.querySelector(s);

    this.alarmEl = this.$('.alarm');
    this.vignette = this.$('.damage-vignette');
    this.scopeEl = this.$('.scope');
    this.hit = this.$('.hitmarker');
    this.alertEl = this.$('.alert-text');
    this.floorEl = this.$('.floor-name');
    this.objEl = this.$('.objective');
    this.threatEl = this.$('.threats');
    this.healthFill = this.$('.health-fill');
    this.magEl = this.$('.mag');
    this.reserveEl = this.$('.reserve');
    this.weaponEl = this.$('.weapon-name');
    this.toastEl = this.$('.toast');
    this.promptEl = this.$('.prompt');

    this._vignetteTimer = 0;
    this._alertTimer = 0;
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  setHealth(cur, max) {
    const pct = Math.max(0, (cur / max) * 100);
    this.healthFill.style.width = pct + '%';
    this.healthFill.style.background =
      pct > 50 ? 'linear-gradient(90deg,#44e08a,#6fffb0)'
      : pct > 25 ? 'linear-gradient(90deg,#ffcc33,#ffe066)'
      : 'linear-gradient(90deg,#ff3b3b,#ff7b7b)';
  }

  setAmmo(ammo, reserve, name) {
    this.magEl.textContent = ammo;
    this.reserveEl.textContent = ' / ' + reserve;
    if (name) this.weaponEl.textContent = name;
  }

  setFloor(name) { this.floorEl.textContent = name; }
  setObjective(text) { this.objEl.textContent = text; }
  setThreats(n) {
    this.threatEl.textContent = n > 0 ? `Threats remaining: ${n}` : 'Floor secure — stairwell unlocked';
  }

  setAlarm(on) {
    this.alarmEl.classList.toggle('on', on);
    if (on) {
      this.alertEl.classList.add('on');
      this._alertTimer = 1.2;
    }
  }

  hitMarker() {
    this.hit.classList.remove('show');
    void this.hit.offsetWidth; // restart animation
    this.hit.classList.add('show');
  }

  flashDamage() {
    this.vignette.style.boxShadow = 'inset 0 0 160px rgba(180,0,0,0.7)';
    this._vignetteTimer = 0.4;
  }

  setScope(on) { this.scopeEl.classList.toggle('on', on); }

  setPrompt(text) {
    if (!text) {
      this.promptEl.classList.remove('show');
      return;
    }
    this.promptEl.textContent = text;
    this.promptEl.classList.add('show');
  }

  toast(text, dur = 2.2) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this._toastTimer = dur;
  }

  update(dt) {
    if (this._vignetteTimer > 0) {
      this._vignetteTimer -= dt;
      if (this._vignetteTimer <= 0) this.vignette.style.boxShadow = 'inset 0 0 140px rgba(180,0,0,0)';
    }
    if (this._alertTimer > 0) {
      this._alertTimer -= dt;
      if (this._alertTimer <= 0) this.alertEl.classList.remove('on');
    }
    if (this._toastTimer > 0) {
      this._toastTimer -= dt;
      if (this._toastTimer <= 0) this.toastEl.classList.remove('show');
    }
  }
}
