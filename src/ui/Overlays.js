// Pause menu + win/lose end screens.
export class Overlays {
  constructor() {
    // Pause.
    const pause = document.createElement('div');
    pause.id = 'pause';
    pause.className = 'overlay hidden';
    pause.innerHTML = `
      <h2>Paused</h2>
      <div class="menu-buttons">
        <button class="btn primary" id="p-resume">Resume</button>
        <button class="btn" id="p-restart">Restart Floor</button>
        <button class="btn" id="p-menu">Abort to Menu</button>
        <button class="btn" id="p-mute">Sound: On</button>
      </div>
      <div class="controls-list">
        <div><b>Move</b> W A S D &nbsp; <b>Look</b> Mouse</div>
        <div><b>Sprint</b> Shift &nbsp; <b>Crouch</b> C (toggle) &nbsp; <b>Flashlight</b> F</div>
        <div><b>Fire</b> LMB &nbsp; <b>Aim</b> RMB &nbsp; <b>Reload</b> R</div>
      </div>
    `;
    document.body.appendChild(pause);
    this.pause = pause;

    // End screen.
    const end = document.createElement('div');
    end.id = 'endscreen';
    end.className = 'overlay hidden';
    end.innerHTML = `
      <h1 class="result"></h1>
      <p class="result-msg"></p>
      <div class="menu-buttons">
        <button class="btn primary" id="e-retry">Try Again</button>
        <button class="btn" id="e-menu">Main Menu</button>
      </div>
    `;
    document.body.appendChild(end);
    this.end = end;
    this.resultEl = end.querySelector('.result');
    this.resultMsg = end.querySelector('.result-msg');

    // callbacks
    this.onResume = null;
    this.onRestart = null;
    this.onMenu = null;
    this.onRetry = null;
    this.onToggleMute = null;

    pause.querySelector('#p-resume').addEventListener('click', () => this.onResume?.());
    pause.querySelector('#p-restart').addEventListener('click', () => this.onRestart?.());
    pause.querySelector('#p-menu').addEventListener('click', () => this.onMenu?.());
    this.pMute = pause.querySelector('#p-mute');
    this.pMute.addEventListener('click', () => this.onToggleMute?.());
    end.querySelector('#e-retry').addEventListener('click', () => this.onRetry?.());
    end.querySelector('#e-menu').addEventListener('click', () => this.onMenu?.());
  }

  setMuteLabel(muted) {
    if (this.pMute) this.pMute.textContent = 'Sound: ' + (muted ? 'Off' : 'On');
  }

  showPause() { this.pause.classList.remove('hidden'); }
  hidePause() { this.pause.classList.add('hidden'); }

  showEnd(win, title, message) {
    this.resultEl.textContent = title;
    this.resultEl.className = 'result ' + (win ? 'win' : 'lose');
    this.resultMsg.textContent = message;
    this.end.querySelector('#e-retry').textContent = win ? 'Play Again' : 'Retry Mission';
    this.end.classList.remove('hidden');
  }
  hideEnd() { this.end.classList.add('hidden'); }

  hideAll() {
    this.hidePause();
    this.hideEnd();
  }
}
