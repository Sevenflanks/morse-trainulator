/**
 * RX STATS & HISTORY PERSISTENCE MANAGER: rx-stats-manager.js
 * 聽力抄收歷史紀錄持久化、跨會話評測指標彙總與弱點資料庫
 * (100% Zero-Emoji, Material Design Icons, Decoupled Domain Model)
 */

class RxStatsManager {
  constructor(storage = null, options = {}) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.storageKey = options.storageKey || 'morse_rx_sessions';
    this.profileKey = options.profileKey || 'morse_rx_confusion_profile';
    this.maxSessions = options.maxSessions || 50;
    this.sessions = [];
    this.confusionProfile = {
      confusionPairs: {},
      charStats: {}
    };
    this.load();
  }

  load() {
    this.sessions = [];
    this.confusionProfile = { confusionPairs: {}, charStats: {} };
    if (!this.storage) return;

    // 1. Sessions History
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

    // 2. Confusion Profile
    try {
      const profileRaw = this.storage.getItem(this.profileKey);
      if (profileRaw) {
        const parsedProfile = JSON.parse(profileRaw);
        if (parsedProfile && typeof parsedProfile === 'object') {
          this.confusionProfile = {
            confusionPairs: parsedProfile.confusionPairs || {},
            charStats: parsedProfile.charStats || {}
          };
        }
      }
    } catch (e) {
      console.warn('[RxStatsManager] Failed to load confusion profile:', e);
      this.confusionProfile = { confusionPairs: {}, charStats: {} };
    }
  }

  save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.sessions));
    } catch (e) {
      console.warn('[RxStatsManager] Failed to save sessions to storage:', e);
    }
    try {
      this.storage.setItem(this.profileKey, JSON.stringify(this.confusionProfile));
    } catch (e) {
      console.warn('[RxStatsManager] Failed to save confusion profile to storage:', e);
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

    // Prepend session
    this.sessions.unshift(session);
    if (this.sessions.length > this.maxSessions) {
      this.sessions = this.sessions.slice(0, this.maxSessions);
    }

    // Update cumulative confusion profile
    if (Array.isArray(session.confusions)) {
      session.confusions.forEach(c => {
        if (c.expected && c.actual) {
          const pairKey = `${c.expected}->${c.actual}`;
          const count = c.count || 1;
          this.confusionProfile.confusionPairs[pairKey] =
            (this.confusionProfile.confusionPairs[pairKey] || 0) + count;
        }
      });
    }

    // Update character-level statistics
    if (Array.isArray(session.trials)) {
      session.trials.forEach(t => {
        const char = (t.target || '').toUpperCase().trim();
        if (char && char.length === 1) {
          if (!this.confusionProfile.charStats[char]) {
            this.confusionProfile.charStats[char] = { attempts: 0, correct: 0, totalLatency: 0 };
          }
          const s = this.confusionProfile.charStats[char];
          s.attempts++;
          if (t.isCorrect) s.correct++;
          if (typeof t.reflexLatency === 'number' && t.reflexLatency > 0) {
            s.totalLatency += t.reflexLatency;
          }
        }
      });
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

  getTopConfusions(limit = 3) {
    if (!this.confusionProfile || !this.confusionProfile.confusionPairs) return [];
    const pairs = Object.entries(this.confusionProfile.confusionPairs)
      .map(([pair, count]) => {
        const [expected, actual] = pair.split('->');
        let severity = 'notice';
        if (count >= 5) severity = 'critical';
        else if (count >= 3) severity = 'warning';
        return { pair, expected, actual, count, severity };
      })
      .sort((a, b) => b.count - a.count);
    return pairs.slice(0, limit);
  }

  getWeakestCharacters(limit = 5) {
    if (!this.confusionProfile || !this.confusionProfile.charStats) return [];
    const chars = Object.entries(this.confusionProfile.charStats)
      .map(([char, s]) => {
        const accuracy = s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : 100;
        const avgLatency = s.attempts > 0 ? Math.round(s.totalLatency / s.attempts) : 0;
        return {
          char,
          attempts: s.attempts,
          correct: s.correct,
          accuracy,
          avgLatency
        };
      })
      .sort((a, b) => {
        if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
        return b.attempts - a.attempts;
      });
    return chars.slice(0, limit);
  }

  demoteConfusion(pairOrExpected, actual = null) {
    if (!this.confusionProfile || !this.confusionProfile.confusionPairs) {
      return { pairKey: '', previousCount: 0, newCount: 0, resolved: true };
    }

    let pairKey = '';
    if (actual) {
      pairKey = `${pairOrExpected}->${actual}`;
    } else if (typeof pairOrExpected === 'string') {
      pairKey = pairOrExpected;
    }

    const previousCount = this.confusionProfile.confusionPairs[pairKey] || 0;
    if (previousCount <= 0) {
      return { pairKey, previousCount: 0, newCount: 0, resolved: true };
    }

    let newCount = Math.floor(previousCount / 2);
    if (newCount <= 1 && previousCount > 1) {
      newCount = 1;
    } else if (previousCount <= 1) {
      newCount = 0;
    }

    if (newCount <= 0) {
      delete this.confusionProfile.confusionPairs[pairKey];
    } else {
      this.confusionProfile.confusionPairs[pairKey] = newCount;
    }

    this.save();
    return {
      pairKey,
      previousCount,
      newCount,
      resolved: newCount === 0
    };
  }

  clearHistory() {
    this.sessions = [];
    this.confusionProfile = {
      confusionPairs: {},
      charStats: {}
    };
    this.save();
  }
}

if (typeof window !== 'undefined') {
  window.RxStatsManager = RxStatsManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RxStatsManager };
}
