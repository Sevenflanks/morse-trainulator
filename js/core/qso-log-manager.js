/**
 * DOMAIN MODULE: QsoLogManager
 * 業餘無線電通聯日誌持久化管理器、CRUD 與標準 ADIF 3.1.4 / CSV 匯出引擎 (Zero DOM Dependencies)
 * (100% Zero-Emoji, Material Design Icons, Decoupled Domain Model)
 */

class QsoLogManager {
  constructor(storage = null, options = {}) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.storageKey = options.storageKey || 'morse_qso_logbook';
    this.maxEntries = options.maxEntries || 100;
    this.logs = [];
    this.load();
  }

  load() {
    this.logs = [];
    if (!this.storage) return;

    try {
      const raw = this.storage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.logs = parsed;
        }
      }
    } catch (e) {
      console.warn('[QsoLogManager] Failed to load logbook from storage:', e);
      this.logs = [];
    }
  }

  save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (e) {
      console.warn('[QsoLogManager] Failed to save logbook to storage:', e);
    }
  }

  addLog(rawEntry) {
    if (!rawEntry || !rawEntry.dxCall) {
      throw new Error('[QsoLogManager] Invalid entry: dxCall is required');
    }

    const now = new Date();
    const dateUtc = (rawEntry.dateUtc || now.toISOString().slice(0, 10).replace(/-/g, '')).replace(/[^0-9]/g, '');
    const timeUtc = (rawEntry.timeUtc || now.toISOString().slice(11, 19).replace(/:/g, '')).replace(/[^0-9]/g, '');

    const entry = {
      id: rawEntry.id || `qso_${now.getTime()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: rawEntry.timestamp || now.getTime(),
      dateUtc: dateUtc.slice(0, 8),
      timeUtc: (timeUtc + '000000').slice(0, 6),
      dateDisplay: rawEntry.dateDisplay || `${dateUtc.slice(0, 4)}-${dateUtc.slice(4, 6)}-${dateUtc.slice(6, 8)}`,
      timeDisplay: rawEntry.timeDisplay || `${timeUtc.slice(0, 2)}:${timeUtc.slice(2, 4)} UTC`,
      myCall: String(rawEntry.myCall || 'BV2TT').trim().toUpperCase(),
      dxCall: String(rawEntry.dxCall).trim().toUpperCase(),
      band: String(rawEntry.band || '20M').trim().toUpperCase(),
      freq: String(rawEntry.freq || '14.025').trim(),
      mode: 'CW',
      rstSent: String(rawEntry.rstSent || '599').trim(),
      rstRcvd: String(rawEntry.rstRcvd || '599').trim(),
      name: String(rawEntry.name || '').trim().toUpperCase(),
      qth: String(rawEntry.qth || '').trim().toUpperCase(),
      grid: String(rawEntry.grid || '').trim().toUpperCase(),
      country: String(rawEntry.country || '').trim().toUpperCase(),
      operator: String(rawEntry.operator || rawEntry.myCall || 'BV2TT').trim().toUpperCase(),
      notes: String(rawEntry.notes || 'Morse Trainulator CW QSO').trim(),
      confirmed: (rawEntry.confirmed !== undefined) ? !!rawEntry.confirmed : true
    };

    // Prepend to top of list
    this.logs.unshift(entry);

    // Limit to maxEntries
    if (this.logs.length > this.maxEntries) {
      this.logs = this.logs.slice(0, this.maxEntries);
    }

    this.save();
    return entry;
  }

  getLog(id) {
    return this.logs.find(item => item.id === id) || null;
  }

  deleteLog(id) {
    const initialLen = this.logs.length;
    this.logs = this.logs.filter(item => item.id !== id);
    if (this.logs.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  clearLogs() {
    this.logs = [];
    this.save();
  }

  getStats() {
    const total = this.logs.length;
    const uniqueCalls = new Set(this.logs.map(l => l.dxCall)).size;
    const bands = {};

    this.logs.forEach(l => {
      const b = l.band || 'OTHER';
      bands[b] = (bands[b] || 0) + 1;
    });

    return {
      total,
      uniqueCalls,
      bands,
      lastQso: this.logs.length > 0 ? this.logs[0] : null
    };
  }

  // ==========================================
  // ADIF 3.1.4 EXPORT ENGINE
  // ==========================================
  exportADIF(filterFn = null) {
    const records = filterFn ? this.logs.filter(filterFn) : this.logs;
    const lines = [];

    // ADIF Standard Header
    lines.push('Morse Trainulator CW Logbook');
    lines.push('<ADIF_VER:5>3.1.4');
    lines.push('<PROGRAMID:17>MorseTrainulator');
    lines.push('<PROGRAMVERSION:5>1.3.3');
    lines.push('<EOH>\n');

    records.forEach(r => {
      const parts = [];

      const addTag = (tag, val) => {
        if (val !== undefined && val !== null && String(val).length > 0) {
          const str = String(val);
          parts.push(`<${tag}:${str.length}>${str}`);
        }
      };

      addTag('CALL', r.dxCall);
      addTag('QSO_DATE', r.dateUtc);
      addTag('TIME_ON', r.timeUtc);
      addTag('BAND', r.band);
      addTag('FREQ', r.freq);
      addTag('MODE', r.mode || 'CW');
      addTag('RST_SENT', r.rstSent);
      addTag('RST_RCVD', r.rstRcvd);
      addTag('NAME', r.name);
      addTag('QTH', r.qth);
      addTag('GRIDSQUARE', r.grid);
      addTag('OPERATOR', r.myCall);
      addTag('COMMENT', r.notes);
      parts.push('<EOR>');

      lines.push(parts.join(' '));
    });

    return lines.join('\n');
  }

  // ==========================================
  // CSV EXPORT ENGINE
  // ==========================================
  exportCSV(filterFn = null) {
    const records = filterFn ? this.logs.filter(filterFn) : this.logs;
    const headers = [
      'ID',
      'Date_UTC',
      'Time_UTC',
      'DX_Callsign',
      'My_Callsign',
      'Band',
      'Freq_MHz',
      'Mode',
      'RST_Sent',
      'RST_Rcvd',
      'Name',
      'QTH',
      'Grid_Locator',
      'Notes'
    ];

    const escapeCsv = (str) => {
      if (str === undefined || str === null) return '';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = [headers.join(',')];

    records.forEach(r => {
      const row = [
        escapeCsv(r.id),
        escapeCsv(r.dateUtc),
        escapeCsv(r.timeUtc),
        escapeCsv(r.dxCall),
        escapeCsv(r.myCall),
        escapeCsv(r.band),
        escapeCsv(r.freq),
        escapeCsv(r.mode),
        escapeCsv(r.rstSent),
        escapeCsv(r.rstRcvd),
        escapeCsv(r.name),
        escapeCsv(r.qth),
        escapeCsv(r.grid),
        escapeCsv(r.notes)
      ];
      rows.push(row.join(','));
    });

    return rows.join('\r\n');
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  window.QsoLogManager = QsoLogManager;
}

// Export for Node.js test environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QsoLogManager };
}
