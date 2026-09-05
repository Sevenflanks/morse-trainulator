# 1. 全面採用 Material Design Icons (MDI) 取代 Emoji/顏文字

Date: 2026-09-05

## 狀態 (Status)

Accepted (已採納)

## 背景 (Context)

專案原先在介面按鈕、儀表指示、科赫全景地圖與成就標章中使用了部分 Unicode Emoji（顏文字 / 表情符號，例如 📻, ⚡, 📖, 🎯, 👑, 🏆, 🟢, 🔒 等）。

雖然 Emoji 在開發初期具備直覺與免加載資源的便利性，但在跨平台生產環境中暴露以下問題：
1. **跨平台渲染差異過大**：Windows、macOS、Linux、iOS 與 Android 的 Emoji 著色風格、尺寸基準與基準線（baseline）各異，造成按鈕文字與圖標垂直居中對齊不一致與排版抖動。
2. **專業電信儀表視覺風格衝突**：高飽和度、卡通化或擬物化的彩色 Emoji 與本專案的深色金屬 PCB 儀表科技風格（Cyberpunk Brass / Dark Navy Instrumentation）產生視覺割裂。
3. **字體縮放與動態染色受限**：Emoji 無法如同向量圖示般透過 CSS `color` 屬性靈活呈現狀態色彩（如極限黑金、冷冽青藍、翠綠通過、鎖定暗灰等）。

## 決策 (Decision)

自本決策起，專案確立以下 UI 設計原則：
1. **全站禁用 UI 顏文字/Emoji**：所有使用者介面元素一律改用 **Material Design Icons (MDI)**。
2. **雙軌相容載入策略**：
   - 模組化正式版 (`index.html`)：透過 CDN 載入 `@mdi/font` CSS 樣式表。
   - 單檔案離線版 (`prototype_morse_card.html`)：內建相容之 MDI SVG 圖示定義或離線相容樣式，確保在離線斷網與 `file:///` 環境下依然 100% 完整顯示。
3. **樣式與色彩規範**：圖示採用標準 `<i class="mdi mdi-..."></i>` 標籤，尺寸與色彩由周圍文字或專屬 CSS 樣式控制，確保動態響應深色主題。

## 後果 (Consequences)

### 正面影響 (Positive)
- 跨作業系統視覺呈現嚴格統一，完全消除不同平台 Emoji 渲染不一與排版高度跳動問題。
- 介面質感更加硬核、專注且具備專業電台儀表儀式感。
- 圖標支援 CSS 動態變色、懸停動畫與微光投影效果。

### 潛在挑戰與緩解 (Mitigations)
- 需要確保無網路離線環境（如以本機雙擊開啟 `prototype_morse_card.html`）不會因無法連線外部 CDN 產生破圖，需在單檔案版提供內建向量 SVG 或相容圖標回退機制。
