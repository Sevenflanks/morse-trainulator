/**
 * QSL CONFIRMATION CARD RENDERER: qsl-card-renderer.js
 * 純原生 HTML5 Canvas 2D 高畫質 QSL 通聯確認卡繪製引擎 (Zero External Dependencies)
 * 規格：1200×800 高解析度 (3:2 明信片黃金比例)
 * 三款經典主題：賽博黃銅 (cyber-brass)、復古老電報 (vintage-telegraph)、經典聯盟 (classic-arrl)
 * (100% Zero-Emoji, Material Design Icons, file:/// Offline Compatible)
 */

class QslCardRenderer {
  constructor() {
    this.width = 1200;
    this.height = 800;
  }

  /**
   * Main Render Entry Point
   * @param {HTMLCanvasElement} canvas
   * @param {Object} data - QSO contact data
   * @param {string} theme - 'cyber-brass' | 'vintage-telegraph' | 'classic-arrl'
   */
  render(canvas, data = {}, theme = 'cyber-brass') {
    if (!canvas) return;
    canvas.width = this.width;
    canvas.height = this.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Normalize QSO data with robust defaults
    const qso = this._normalizeData(data);

    switch (theme) {
      case 'vintage-telegraph':
        this._renderVintageTelegraph(ctx, qso);
        break;
      case 'classic-arrl':
        this._renderClassicArrl(ctx, qso);
        break;
      case 'cyber-brass':
      default:
        this._renderCyberBrass(ctx, qso);
        break;
    }
  }

  _normalizeData(data) {
    const now = new Date();
    return {
      myCall: String(data.myCall || 'BV2TT').trim().toUpperCase(),
      dxCall: String(data.dxCall || 'JA1ABC').trim().toUpperCase(),
      dateDisplay: String(data.dateDisplay || now.toISOString().slice(0, 10)).trim(),
      timeDisplay: String(data.timeDisplay || (now.toISOString().slice(11, 16) + ' UTC')).trim(),
      band: String(data.band || '20M').trim().toUpperCase(),
      freq: String(data.freq || '14.025').trim(),
      mode: String(data.mode || 'CW').trim().toUpperCase(),
      rstSent: String(data.rstSent || '599').trim(),
      rstRcvd: String(data.rstRcvd || '599').trim(),
      myName: String(data.myName || 'EDDIE').trim().toUpperCase(),
      dxName: String(data.dxName || data.name || 'KEN').trim().toUpperCase(),
      myQth: String(data.myQth || 'TAIPEI, TAIWAN').trim().toUpperCase(),
      dxQth: String(data.dxQth || data.qth || 'TOKYO, JAPAN').trim().toUpperCase(),
      myGrid: String(data.myGrid || 'PL05').trim().toUpperCase(),
      dxGrid: String(data.dxGrid || data.grid || 'PM95').trim().toUpperCase(),
      rig: String(data.rig || '100W').trim().toUpperCase(),
      ant: String(data.ant || 'DIPOLE').trim().toUpperCase(),
      notes: String(data.notes || 'TNX FER FB CW QSO! 73 ES GL').trim()
    };
  }

  // ==========================================
  // THEME 1: CYBER BRASS (賽博黃銅)
  // ==========================================
  _renderCyberBrass(ctx, qso) {
    const w = this.width;
    const h = this.height;

    // 1. Base Obsidian Background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0c0e14');
    bgGrad.addColorStop(0.5, '#121620');
    bgGrad.addColorStop(1, '#090b10');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle brushed diagonal lines
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.02)';
    ctx.lineWidth = 1;
    for (let x = -h; x < w + h; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h, h);
      ctx.stroke();
    }

    // 2. High-Tech PCB Vector Circuit Traces & Watermark
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Trace 1
    ctx.moveTo(40, 200);
    ctx.lineTo(160, 200);
    ctx.lineTo(220, 260);
    ctx.lineTo(380, 260);
    ctx.stroke();

    // Trace 2
    ctx.moveTo(w - 40, 180);
    ctx.lineTo(w - 180, 180);
    ctx.lineTo(w - 240, 240);
    ctx.lineTo(w - 420, 240);
    ctx.stroke();

    // Solder pads
    ctx.fillStyle = '#00e5ff';
    [ [160, 200], [220, 260], [380, 260], [w - 180, 180], [w - 240, 240], [w - 420, 240] ].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Double Chassis Beveled Border & Corner Rivets
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, w - 56, h - 56);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    // 4 Corner Screws / Vias
    const corners = [ [40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40] ];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = '#1e2638';
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // 4. Header Bar
    ctx.fillStyle = '#d4af37';
    ctx.font = '700 15px "SF Mono", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '3px';
    ctx.fillText('MORSE TRAINULATOR · AMATEUR RADIO CW QSO CONFIRMATION', w / 2, 78);

    ctx.fillStyle = '#6e7d94';
    ctx.font = '600 13px "SF Mono", Consolas, monospace';
    ctx.fillText(`OPERATOR: ${qso.myName} · QTH: ${qso.myQth} · GRID: ${qso.myGrid} · RIG: ${qso.rig} (${qso.ant})`, w / 2, 102);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 118);
    ctx.lineTo(w - 80, 118);
    ctx.stroke();

    // 5. Massive Dual Station Callsigns
    ctx.textAlign = 'center';

    // My Station Box (Left)
    ctx.fillStyle = '#ffd700';
    ctx.font = '900 84px "SF Mono", Consolas, monospace';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
    ctx.shadowBlur = 16;
    ctx.fillText(qso.myCall, w / 2 - 270, 220);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#8c9bb0';
    ctx.font = '700 14px "SF Mono", Consolas, monospace';
    ctx.fillText('TRANSMITTING STATION', w / 2 - 270, 252);

    // Center Badge
    ctx.fillStyle = '#00e5ff';
    ctx.font = '800 18px "SF Mono", Consolas, monospace';
    ctx.fillText('2-WAY CW', w / 2, 200);
    ctx.fillStyle = '#6e7d94';
    ctx.font = '700 12px "SF Mono", Consolas, monospace';
    ctx.fillText('CONFIRMED WITH', w / 2, 224);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w / 2, 208, 48, 0, Math.PI * 2);
    ctx.stroke();

    // Remote Station Box (Right)
    ctx.fillStyle = '#00e5ff';
    ctx.font = '900 84px "SF Mono", Consolas, monospace';
    ctx.shadowColor = 'rgba(0, 229, 255, 0.5)';
    ctx.shadowBlur = 16;
    ctx.fillText(qso.dxCall, w / 2 + 270, 220);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#8c9bb0';
    ctx.font = '700 14px "SF Mono", Consolas, monospace';
    ctx.fillText(`OP: ${qso.dxName} · ${qso.dxQth}`, w / 2 + 270, 252);

    // 6. High-Tech Telemetry Data Grid Table
    const tableX = 70;
    const tableY = 300;
    const tableW = w - 140;
    const tableH = 190;

    ctx.fillStyle = 'rgba(12, 16, 25, 0.85)';
    ctx.fillRect(tableX, tableY, tableW, tableH);
    ctx.strokeStyle = '#222b3d';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tableX, tableY, tableW, tableH);

    // Columns: Date | Time | Band | Freq | Mode | RST Sent | RST Rcvd | 2-Way
    const cols = [
      { label: 'DATE (UTC)', val: qso.dateDisplay, width: 140 },
      { label: 'TIME (UTC)', val: qso.timeDisplay, width: 120 },
      { label: 'BAND', val: qso.band, width: 90 },
      { label: 'FREQ (MHz)', val: `${qso.freq}.00`, width: 150 },
      { label: 'MODE', val: '2-WAY CW', width: 120 },
      { label: 'RST SENT', val: qso.rstSent, width: 110 },
      { label: 'RST RCVD', val: qso.rstRcvd, width: 110 },
      { label: 'QSL STATUS', val: 'CONFIRMED', width: 140 }
    ];

    // Header Row
    ctx.fillStyle = '#161d2b';
    ctx.fillRect(tableX, tableY, tableW, 46);
    ctx.strokeStyle = '#243044';
    ctx.beginPath();
    ctx.moveTo(tableX, tableY + 46);
    ctx.lineTo(tableX + tableW, tableY + 46);
    ctx.stroke();

    let curX = tableX;
    cols.forEach((col, idx) => {
      // Header text
      ctx.fillStyle = '#7a8ba3';
      ctx.font = '700 12px "SF Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(col.label, curX + col.width / 2, tableY + 28);

      // Data text
      ctx.fillStyle = (col.label === 'QSL STATUS') ? '#00e676' : (col.label === 'FREQ (MHz)' || col.label === 'MODE' ? '#ffd700' : '#ffffff');
      ctx.font = '800 18px "SF Mono", Consolas, monospace';
      ctx.fillText(col.val, curX + col.width / 2, tableY + 115);

      if (idx < cols.length - 1) {
        ctx.strokeStyle = '#1e2638';
        ctx.beginPath();
        ctx.moveTo(curX + col.width, tableY);
        ctx.lineTo(curX + col.width, tableY + tableH);
        ctx.stroke();
      }
      curX += col.width;
    });

    // Sub-row notes inside table
    ctx.strokeStyle = '#1c2436';
    ctx.beginPath();
    ctx.moveTo(tableX, tableY + 145);
    ctx.lineTo(tableX + tableW, tableY + 145);
    ctx.stroke();

    ctx.fillStyle = '#7e90aa';
    ctx.font = '600 13px "SF Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`REMARKS / LOG: ${qso.notes}`, tableX + 16, tableY + 172);

    // 7. Security Vector Stamp (Bottom Right)
    const stampX = w - 170;
    const stampY = h - 145;

    ctx.save();
    ctx.translate(stampX, stampY);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 54, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#00e5ff';
    ctx.font = '800 11px "SF Mono", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MORSE TRAINULATOR', 0, -22);
    ctx.fillStyle = '#ffd700';
    ctx.font = '900 17px "SF Mono", Consolas, monospace';
    ctx.fillText('73 & GL', 0, 4);
    ctx.fillStyle = '#00e676';
    ctx.font = '700 10px "SF Mono", Consolas, monospace';
    ctx.fillText('VERIFIED QSO', 0, 26);
    ctx.restore();

    // 8. Bottom Footer Signoff
    ctx.fillStyle = '#637287';
    ctx.font = '600 12px "SF Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ELECTRONIC QSL CONFIRMATION GENERATED BY MORSE TRAINULATOR (ZERO LATENCY DSP)', 70, h - 80);
    ctx.fillText('THANKS FOR THE CONTACT AND SEE YOU ON THE AIRWAVES! 73 DE EDDIE', 70, h - 60);
  }

  // ==========================================
  // THEME 2: VINTAGE TELEGRAPH (復古老電報)
  // ==========================================
  _renderVintageTelegraph(ctx, qso) {
    const w = this.width;
    const h = this.height;

    // 1. Aged Warm Parchment Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#fbf6ea');
    bgGrad.addColorStop(0.5, '#f4ecd8');
    bgGrad.addColorStop(1, '#ede2ca');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle paper grain noise
    ctx.fillStyle = 'rgba(100, 70, 30, 0.015)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }

    // 2. Ornate Telegraph Double Border
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 5;
    ctx.strokeRect(32, 32, w - 64, h - 64);

    ctx.lineWidth = 1.5;
    ctx.strokeRect(44, 44, w - 88, h - 88);

    // Corner Ornaments
    const cornerSize = 20;
    const cornerPts = [
      [44, 44], [w - 44, 44], [44, h - 44], [w - 44, h - 44]
    ];
    cornerPts.forEach(([cx, cy]) => {
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(cx - 4, cy - 4, 8, 8);
    });

    // 3. Header Typography
    ctx.fillStyle = '#3e2723';
    ctx.font = '900 24px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('INTERNATIONAL POSTAL & TELEGRAPH ADMINISTRATION', w / 2, 88);

    ctx.font = 'italic 700 15px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#5d4037';
    ctx.fillText('OFFICIAL RADIOTELEGRAPH DISPATCH · TWO-WAY CW CONTACT ACKNOWLEDGEMENT', w / 2, 114);

    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(120, 130);
    ctx.lineTo(w - 120, 130);
    ctx.stroke();

    // 4. Station Callsigns in Antique Serif
    ctx.fillStyle = '#2b1b17';
    ctx.font = '900 80px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(qso.myCall, w / 2 - 260, 225);

    ctx.font = 'italic 700 18px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#4e342e';
    ctx.fillText('Confirming QSO with', w / 2, 205);
    ctx.font = '700 14px "Times New Roman", Georgia, serif';
    ctx.fillText('VIA CW TELEGRAPHY', w / 2, 230);

    ctx.font = '900 80px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#2b1b17';
    ctx.fillText(qso.dxCall, w / 2 + 260, 225);

    // Sub details
    ctx.font = '700 14px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#5d4037';
    ctx.fillText(`OPERATOR: ${qso.myName} · QTH: ${qso.myQth}`, w / 2 - 260, 260);
    ctx.fillText(`OPERATOR: ${qso.dxName} · QTH: ${qso.dxQth}`, w / 2 + 260, 260);

    // 5. Classic Telegram Ledger Box
    const boxX = 80;
    const boxY = 300;
    const boxW = w - 160;
    const boxH = 200;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Table rows
    const cols = [
      { label: 'DATE (GMT)', val: qso.dateDisplay, w: 140 },
      { label: 'TIME (UTC)', val: qso.timeDisplay, w: 120 },
      { label: 'BAND', val: qso.band, w: 100 },
      { label: 'MC/S (FREQ)', val: `${qso.freq} MC/S`, w: 150 },
      { label: 'EMISSION', val: 'A1A (CW)', w: 120 },
      { label: 'UR RST', val: qso.rstSent, w: 110 },
      { label: 'MY RST', val: qso.rstRcvd, w: 110 },
      { label: 'DISPATCH', val: 'RECORDED', w: 140 }
    ];

    ctx.fillStyle = '#e8d8bd';
    ctx.fillRect(boxX, boxY, boxW, 44);
    ctx.strokeStyle = '#4e342e';
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + 44);
    ctx.lineTo(boxX + boxW, boxY + 44);
    ctx.stroke();

    let cx = boxX;
    cols.forEach((col, idx) => {
      ctx.fillStyle = '#3e2723';
      ctx.font = '700 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(col.label, cx + col.w / 2, boxY + 28);

      ctx.fillStyle = '#1b120c';
      ctx.font = '800 19px "Courier New", monospace';
      ctx.fillText(col.val, cx + col.w / 2, boxY + 115);

      if (idx < cols.length - 1) {
        ctx.strokeStyle = '#c4b294';
        ctx.beginPath();
        ctx.moveTo(cx + col.w, boxY);
        ctx.lineTo(cx + col.w, boxY + boxH);
        ctx.stroke();
      }
      cx += col.w;
    });

    // Telegram Remarks Line
    ctx.strokeStyle = '#d7c7aa';
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + 150);
    ctx.lineTo(boxX + boxW, boxY + 150);
    ctx.stroke();

    ctx.fillStyle = '#4e342e';
    ctx.font = 'italic 700 14px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`TELEGRAM MESSAGE: "${qso.notes}"`, boxX + 16, boxY + 178);

    // 6. Authentic Postal Rubber Stamp (Rotated)
    ctx.save();
    ctx.translate(w - 200, h - 150);
    ctx.rotate(-0.12); // -7 degrees

    ctx.strokeStyle = 'rgba(180, 40, 40, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 58, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(180, 40, 40, 0.85)';
    ctx.font = '900 11px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAIPEI RADIO TELEGRAPH', 0, -26);
    ctx.font = '900 20px "Times New Roman", Georgia, serif';
    ctx.fillText('CONFIRMED', 0, 6);
    ctx.font = '700 12px "Times New Roman", Georgia, serif';
    ctx.fillText(qso.dateDisplay, 0, 26);
    ctx.fillText('73 · CW QSO', 0, 42);
    ctx.restore();

    // 7. Signature & Stamp Footer
    ctx.fillStyle = '#4e342e';
    ctx.font = '700 14px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(`APPARATUS: ${qso.rig} TRANSMITTER · ${qso.ant} ANTENNA SYSTEM`, boxX, h - 100);
    ctx.fillText('CERTIFIED BY CHIEF TELEGRAPH OPERATOR: __________________________ (EDDIE, BV2TT)', boxX, h - 70);
  }

  // ==========================================
  // THEME 3: CLASSIC ARRL (經典聯盟)
  // ==========================================
  _renderClassicArrl(ctx, qso) {
    const w = this.width;
    const h = this.height;

    // 1. Crisp White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // 2. Navy Blue Banner Header
    ctx.fillStyle = '#0a2342';
    ctx.fillRect(0, 0, w, 110);

    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, 110, w, 8);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AMATEUR RADIO STATION · 2-WAY CW QSO CONFIRMATION', w / 2, 56);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 14px Arial, Helvetica, sans-serif';
    ctx.fillText('MEMBER INTERNATIONAL AMATEUR RADIO UNION (IARU) · AIRWAVES HERITAGE', w / 2, 88);

    // 3. Station Callsign Display
    ctx.fillStyle = '#0a2342';
    ctx.font = '900 96px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '4px';
    ctx.fillText(qso.myCall, w / 2, 235);

    ctx.fillStyle = '#475569';
    ctx.font = '700 15px Arial, Helvetica, sans-serif';
    ctx.fillText(`TAIPEI, TAIWAN · CQ ZONE 24 · ITU ZONE 44 · GRID SQUARE: ${qso.myGrid}`, w / 2, 268);

    ctx.fillStyle = '#0a2342';
    ctx.font = '800 18px Arial, Helvetica, sans-serif';
    ctx.fillText(`CONFIRMING TWO-WAY MORSE CODE (CW) CONTACT WITH RADIO STATION:`, w / 2, 310);

    ctx.fillStyle = '#d4af37';
    ctx.font = '900 54px Arial, Helvetica, sans-serif';
    ctx.fillText(qso.dxCall, w / 2, 375);

    ctx.fillStyle = '#64748b';
    ctx.font = '700 14px Arial, Helvetica, sans-serif';
    ctx.fillText(`OPERATOR: ${qso.dxName} · QTH: ${qso.dxQth} (GRID: ${qso.dxGrid})`, w / 2, 404);

    // 4. Standard ARRL Log Table
    const tblX = 60;
    const tblY = 440;
    const tblW = w - 120;
    const tblH = 180;

    ctx.strokeStyle = '#0a2342';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(tblX, tblY, tblW, tblH);

    ctx.fillStyle = '#0a2342';
    ctx.fillRect(tblX, tblY, tblW, 44);

    const cols = [
      { label: 'YEAR / DATE', val: qso.dateDisplay, w: 150 },
      { label: 'UTC TIME', val: qso.timeDisplay, w: 130 },
      { label: 'BAND', val: qso.band, w: 100 },
      { label: 'FREQ (MHz)', val: `${qso.freq}.00`, w: 150 },
      { label: '2-WAY MODE', val: 'CW (A1A)', w: 130 },
      { label: 'RST SENT', val: qso.rstSent, w: 110 },
      { label: 'RST RCVD', val: qso.rstRcvd, w: 110 },
      { label: 'QSL STATUS', val: 'TNX QSO', w: 140 }
    ];

    let xPos = tblX;
    cols.forEach((col, idx) => {
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 13px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(col.label, xPos + col.w / 2, tblY + 28);

      ctx.fillStyle = '#0a2342';
      ctx.font = '900 18px Arial, Helvetica, sans-serif';
      ctx.fillText(col.val, xPos + col.w / 2, tblY + 110);

      if (idx < cols.length - 1) {
        ctx.strokeStyle = '#0a2342';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(xPos + col.w, tblY);
        ctx.lineTo(xPos + col.w, tblY + tblH);
        ctx.stroke();
      }
      xPos += col.w;
    });

    // Notes Row in table
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(tblX, tblY + 140);
    ctx.lineTo(tblX + tblW, tblY + 140);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '600 13px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`NOTES: ${qso.notes} · RIG: ${qso.rig} · ANT: ${qso.ant}`, tblX + 16, tblY + 164);

    // 5. Official Diamond Logo Emblem (Left)
    ctx.save();
    ctx.translate(140, h - 85);
    ctx.strokeStyle = '#0a2342';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(32, 0);
    ctx.lineTo(0, 32);
    ctx.lineTo(-32, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#0a2342';
    ctx.font = '900 18px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CW', 0, 6);
    ctx.restore();

    // 6. Signoff & Operator Line (Right)
    ctx.fillStyle = '#0a2342';
    ctx.font = '700 16px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`MANY THANKS FOR THE EXCELLENT QSO! 73 ES CU AGN`, w - 80, h - 90);
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 700 15px Arial, Helvetica, sans-serif';
    ctx.fillText(`73 DE ${qso.myName} (${qso.myCall})`, w - 80, h - 64);
  }

  // ==========================================
  // EXPORT UTILITIES
  // ==========================================
  toDataURL(canvas, type = 'image/png') {
    if (!canvas || typeof canvas.toDataURL !== 'function') return '';
    return canvas.toDataURL(type);
  }

  toBlob(canvas, type = 'image/png') {
    return new Promise((resolve) => {
      if (!canvas || typeof canvas.toBlob !== 'function') {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => resolve(blob), type);
    });
  }

  downloadCard(canvas, filename = 'QSL_CARD.png') {
    if (typeof document === 'undefined') return;
    const dataUrl = this.toDataURL(canvas, 'image/png');
    if (!dataUrl) return;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  }

  async copyToClipboard(canvas) {
    if (typeof navigator === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
      return false;
    }
    const blob = await this.toBlob(canvas, 'image/png');
    if (!blob) return false;

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    } catch (e) {
      console.warn('[QslCardRenderer] Failed to copy to clipboard:', e);
      return false;
    }
  }
}

// Global window registration
if (typeof window !== 'undefined') {
  window.QslCardRenderer = QslCardRenderer;
}

// Export for Node.js test environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QslCardRenderer };
}
