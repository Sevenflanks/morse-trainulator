/**
 * RX STATS & HISTORY PERSISTENCE MANAGER: rx-stats-manager.js
 * 聽力抄收歷史紀錄持久化、跨會話評測指標彙總與弱點資料庫
 * (100% Zero-Emoji, Material Design Icons, Decoupled Domain Model)
 */

class RxStatsManager {
  constructor(storage = null, options = {}) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.storageKey = options.storageKey || 'morse_rx_sessions';
    this.maxSessions = options.maxSessions || 50;
    this.sessions = [];
    this.load();
  }

  load() {
    this.sessions = [];
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.sessions = parsed;
        }
      }
    } catch (e) {
      console.warn('[RxStatsManager] Failed to load sessions from storage:', e);
      this.sessions = [];
    }
  }

  save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.sessions));
    } catch (e) {
      console.warn('[RxStatsManager] Failed to save sessions to storage:', e);
    }
  }

  recordSession(sessionData = {}) {
    const session = {
      id: 'rx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: sessionData.timestamp || Date.now(),
      submode: sessionData.submode || 'koch',
      charWpm: sessionData.charWpm || 20,
      totalTrials: sessionData.totalTrials || 0,
      correctCount: sessionData.correctCount || 0,
      accuracy: (typeof sessionData.accuracy === 'number') ? sessionData.accuracy : 0,
      avgLatency: (typeof sessionData.avgLatency === 'number') ? sessionData.avgLatency : 0,
      confusions: Array.isArray(sessionData.confusions) ? sessionData.confusions : [],
      trials: Array.isArray(sessionData.trials) ? sessionData.trials : []
    };

    // Prepend (newest first)
    this.sessions.unshift(session);

    // FIFO cap
    if (this.sessions.length > this.maxSessions) {
      this.sessions = this.sessions.slice(0, this.maxSessions);
    }

    this.save();
    return session;
  }

  getHistory(limit = 50) {
    return this.sessions.slice(0, limit);
  }

  getSummaryStats() {
    const total = this.sessions.length;
    if (total === 0) {
      return {
        totalSessions: 0,
        recentAccuracy: 0,
        recentAvgLatency: 0,
        bestAccuracy: 0,
        latestSession: null
      };
    }

    const recent = this.sessions.slice(0, 5);
    const recentAccSum = recent.reduce((sum, s) => sum + (s.accuracy || 0), 0);
    const recentAccuracy = Math.round(recentAccSum / recent.length);

    const validLatencySessions = recent.filter(s => typeof s.avgLatency === 'number' && s.avgLatency > 0);
    const recentAvgLatency = validLatencySessions.length > 0
      ? Math.round(validLatencySessions.reduce((sum, s) => sum + s.avgLatency, 0) / validLatencySessions.length)
      : (recent[0].avgLatency || 0);

    const bestAccuracy = this.sessions.reduce((max, s) => Math.max(max, s.accuracy || 0), 0);

    return {
      totalSessions: total,
      recentAccuracy,
      recentAvgLatency,
      bestAccuracy,
      latestSession: this.sessions[0] || null
    };
  }

  clearHistory() {
    this.sessions = [];
    this.save();
  }
}

if (typeof window !== 'undefined') {
  window.RxStatsManager = RxStatsManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RxStatsManager };
}
