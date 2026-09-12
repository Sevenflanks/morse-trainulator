/**
 * SETTINGS PERSISTENCE MANAGER: SettingsManager
 * 全系統設定 localStorage 自動同步、舊鍵位自動平滑遷移與出廠重設
 */

const _DEFAULT_SETTINGS = (typeof DEFAULT_SETTINGS !== 'undefined') ? DEFAULT_SETTINGS : {
  keyerDevice: 'paddle', // 'straight' | 'paddle' | 'bug'
  speedPreset: 'intermediate',
  unitT: 80,
  threshold: 160,
  letterGap: 240,
  wordGap: 560,
  freq: 680,
  sidetoneVolume: 70,
  farnsworthEnabled: false,
  farnsworthWpm: 18,
  qrnEnabled: false,
  qrnVolume: 0.04,
  iambicMode: 'B',
  paddleReverse: false,
  keyProfile: 'standard',
  customBindings: {
    straight: ['KeyK'],
    dit: ['BracketLeft', 'Comma'],
    dah: ['BracketRight', 'Period']
  },
  textShowHints: true,
  textStrictMode: false,
  kochShowHints: false,
  layoutMode: '2col', // '2col' | '3col'
  themePreset: 'cyber-brass' // 'cyber-brass' | 'classic-amber' | 'green-phosphor'
};

class SettingsManager {
  constructor(defaults = null, storage = null) {
    this.defaults = defaults || _DEFAULT_SETTINGS;
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.storageKey = 'morse_card_settings_v1';
    this.settings = Object.assign({}, this.defaults);
    this.load();
  }

  load() {
    try {
      if (this.storage) {
        const raw = this.storage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.settings = Object.assign({}, this.defaults, parsed);
          // Cleanse legacy straight key bindings (/ or Space trigger browser search / scrolling)
          if (this.settings.customBindings && Array.isArray(this.settings.customBindings.straight)) {
            if (this.settings.customBindings.straight.includes('Slash') || this.settings.customBindings.straight.includes('Space')) {
              this.settings.customBindings.straight = ['KeyK'];
              this.save();
            }
          }
        }
        // Theme preset synchronization (supports direct morse_theme_preset and settings.themePreset)
        const directTheme = this.storage.getItem('morse_theme_preset');
        if (directTheme) {
          this.settings.themePreset = directTheme;
        }
      }
    } catch(e) {
      console.warn('Failed to load settings:', e);
    }
    if (!this.settings.themePreset) {
      this.settings.themePreset = 'cyber-brass';
    }
    return this.settings;
  }

  save() {
    try {
      if (this.storage) {
        this.storage.setItem(this.storageKey, JSON.stringify(this.settings));
        if (this.settings.themePreset) {
          this.storage.setItem('morse_theme_preset', this.settings.themePreset);
        }
      }
    } catch(e) {
      console.warn('Failed to save settings:', e);
    }
  }

  reset() {
    try {
      if (this.storage) {
        this.storage.removeItem(this.storageKey);
        this.storage.removeItem('morse_theme_preset');
      }
    } catch(_) {}
    this.settings = Object.assign({}, this.defaults);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsManager, DEFAULT_SETTINGS: _DEFAULT_SETTINGS };
}
