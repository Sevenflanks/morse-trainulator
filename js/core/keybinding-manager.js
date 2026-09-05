/**
 * KEYBOARD BINDINGS MANAGER: KeybindingManager
 * 鍵位預設集 (標準/盲打 F-J/左手/方向鍵)、即時錄製與鍵盤事件路由
 */

class KeybindingManager {
  constructor(profilesRef = null, settingsMgrRef = null) {
    this.profiles = profilesRef || (typeof KEY_PROFILES !== 'undefined' ? KEY_PROFILES : {
      standard: {
        name: '標準電鍵',
        desc: '直鍵: K · 撥片: [ , / ] .',
        straight: ['KeyK'],
        dit: ['BracketLeft', 'Comma'],
        dah: ['BracketRight', 'Period']
      }
    });
    this.settingsManager = settingsMgrRef;

    this.activeProfile = 'standard';
    this.customBindings = {
      straight: ['KeyK'],
      dit: ['BracketLeft', 'Comma'],
      dah: ['BracketRight', 'Period']
    };
    this.recordingTarget = null;
  }

  getBindings() {
    if (this.activeProfile === 'custom') {
      return this.customBindings;
    }
    return this.profiles[this.activeProfile] || this.profiles.standard;
  }

  setProfile(profileKey) {
    if (this.profiles[profileKey]) {
      this.activeProfile = profileKey;
      this.updateUI();
      const sm = this.settingsManager || (typeof settingsManager !== 'undefined' ? settingsManager : null);
      if (sm) {
        sm.settings.keyProfile = profileKey;
        sm.settings.customBindings = this.customBindings;
        sm.save();
      }
    }
  }

  formatKeys(keyList) {
    if (!keyList || !keyList.length) return '無';
    return keyList.map(k => {
      return k.replace(/^Key/, '')
              .replace(/^Digit/, '')
              .replace('Slash', '/')
              .replace('BracketLeft', '[')
              .replace('BracketRight', ']')
              .replace('Comma', ',')
              .replace('Period', '.')
              .replace('ArrowDown', '↓')
              .replace('ArrowLeft', '←')
              .replace('ArrowRight', '→');
    }).join(' / ');
  }

  updateUI() {
    if (typeof document === 'undefined') return;
    const b = this.getBindings();
    const btnStraight = document.getElementById('btn-bind-straight');
    const btnDit = document.getElementById('btn-bind-dit');
    const btnDah = document.getElementById('btn-bind-dah');
    const tagProfile = document.getElementById('tag-current-profile');

    if (btnStraight) btnStraight.textContent = this.formatKeys(b.straight);
    if (btnDit) btnDit.textContent = this.formatKeys(b.dit);
    if (btnDah) btnDah.textContent = this.formatKeys(b.dah);
    if (tagProfile) tagProfile.textContent = (this.profiles[this.activeProfile] || {name:'自訂'}).name;

    document.querySelectorAll('.key-profile-btn').forEach(btn => {
      btn.classList.toggle('active-key-profile', btn.dataset.profile === this.activeProfile);
    });

    // Update in-page button hints
    const straightSpan = document.querySelector('#key-trigger span');
    const leftHint = document.getElementById('paddle-left-hint');
    const rightHint = document.getElementById('paddle-right-hint');

    if (straightSpan) straightSpan.textContent = `⚡ 按住發報 (鍵盤「${this.formatKeys(b.straight)}」)`;
    if (leftHint) leftHint.textContent = `鍵盤 ${this.formatKeys(b.dit)}`;
    if (rightHint) rightHint.textContent = `鍵盤 ${this.formatKeys(b.dah)}`;
  }

  startRecording(target) {
    if (typeof document === 'undefined') return;
    this.recordingTarget = target;
    const btn = document.getElementById(`btn-bind-${target}`);
    if (btn) {
      btn.classList.add('recording');
      btn.textContent = '請按下任意鍵...';
    }
  }

  recordKey(code) {
    if (!this.recordingTarget) return;
    const target = this.recordingTarget;
    this.customBindings[target] = [code];
    this.activeProfile = 'custom';
    this.recordingTarget = null;

    if (typeof document !== 'undefined') {
      const btn = document.getElementById(`btn-bind-${target}`);
      if (btn) btn.classList.remove('recording');
    }

    this.updateUI();
    const sm = this.settingsManager || (typeof settingsManager !== 'undefined' ? settingsManager : null);
    if (sm) {
      sm.settings.keyProfile = 'custom';
      sm.settings.customBindings = this.customBindings;
      sm.save();
    }
  }

  isStraight(e) {
    return this.getBindings().straight.includes(e.code);
  }

  isDit(e) {
    return this.getBindings().dit.includes(e.code);
  }

  isDah(e) {
    return this.getBindings().dah.includes(e.code);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KeybindingManager };
}
