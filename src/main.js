import * as THREE from 'three';
import './ui/styles.css';
import { Input } from './core/Input.js';
import { Audio } from './systems/Audio.js';
import { Game } from './core/Game.js';
import { MainMenu } from './ui/Menu.js';
import { Overlays } from './ui/Overlays.js';

// ---- Renderer ----
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// ---- Core systems ----
const input = new Input(renderer.domElement);
const audio = new Audio();
const menu = new MainMenu();
const overlays = new Overlays();
const game = new Game(renderer, input, audio);

let appState = 'menu'; // 'menu' | 'game'
let lastResult = null; // 'win' | 'lose'

// ---- Menu wiring ----
menu.onStart = () => {
  audio.init();
  audio.resume();
  menu.hide();
  overlays.hideAll();
  appState = 'game';
  game.startNewGame();
};
menu.onToggleMute = () => toggleMute();

// ---- Overlay wiring ----
overlays.onResume = () => {
  overlays.hidePause();
  if (game.state === 'paused') game.togglePause();
};
overlays.onRestart = () => {
  overlays.hidePause();
  game.loadFloor(game.currentFloorIndex);
  game.state = 'playing';
  game.hud.show();
  input.setEnabled(true);
  input.lock();
};
overlays.onMenu = () => toMenu();
overlays.onRetry = () => {
  overlays.hideEnd();
  if (lastResult === 'win') {
    game.startNewGame();
  } else {
    game.retryFromCheckpoint();
  }
};
overlays.onToggleMute = () => toggleMute();

// ---- Game callbacks ----
game.onPauseChange = (paused) => {
  if (paused) overlays.showPause();
  else overlays.hidePause();
};
game.onWin = () => {
  lastResult = 'win';
  overlays.showEnd(
    true,
    'Mission Complete',
    'The target is down and you reached the rooftop. Shadow Ascent cleared.'
  );
};
game.onLose = () => {
  lastResult = 'lose';
  overlays.showEnd(
    false,
    'You Were Eliminated',
    'Security got the better of you. Retry from your last checkpoint.'
  );
};

function toMenu() {
  overlays.hideAll();
  game.clearFloor();
  game.state = 'idle';
  game.hud.hide();
  audio.alarmOff();
  audio.ambientOff();
  input.setEnabled(false);
  input.unlock();
  appState = 'menu';
  menu.show();
}

function toggleMute() {
  audio.setMuted(!audio.muted);
  menu.setMuteLabel(audio.muted);
  overlays.setMuteLabel(audio.muted);
}

// ---- Resize ----
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  menu.resize(w, h);
  game.resize(w, h);
}
window.addEventListener('resize', onResize);

// ---- Main loop ----
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (appState === 'menu') {
    menu.update(dt);
    renderer.render(menu.scene, menu.camera);
  } else {
    game.update(dt);
    game.render();
  }
}
animate();
