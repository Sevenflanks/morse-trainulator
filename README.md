# 📻 摩斯訓練儀 (Morse Trainulator)

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Platform](https://img.shields.io/badge/Platform-Web%20(Pure%20Vanilla%20JS)-gold.svg)]()
[![Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API-00e5ff.svg)]()
[![Tests](https://img.shields.io/badge/Tests-23%20Passing%20(100%25)-brightgreen.svg)]()
[![Offline](https://img.shields.io/badge/Offline-100%25%20file%3A%2F%2F%2F%20Ready-green.svg)]()

> **Morse Trainulator（Trainer 訓練器 ＋ Simulator 模擬器）**  
> 純前端、零依賴、兼具硬體儀表美學與專業級無線電報務模擬的互動式訓練體系。  
> 協助練習者從零基礎出發，逐步掌握實體直鍵、雙撥片夾發 (Iambic Mode A/B)、半自動震報鍵 (Bug Key)，邁向具備反射神經的合格報務員！

---

## 🌐 線上直接體驗 (Live Demo)

本專案為純靜態架構，可直接於 GitHub Pages 線上免安裝遊玩：  
👉 **[線上體驗 Demo 連結](https://your-username.github.io/morse-trainulator/)**  
*(將 `your-username` 替換為您的 GitHub 帳號名稱即可)*

或者下載原始碼後，直接在瀏覽器雙擊點開 `index.html` 即可 100% 離線運行！

---

## 🌟 核心特色功能 (Key Features)

### 1. 🎛️ PCB 向量電路板二元決策樹 (Binary Decision Tree)
- **硬體儀表美學**：高對比黑金工控面板，沉金質感焊盤與流光走線。
- **即時尋路點亮**：由頂部天線節點出發，**長音 Dah (—) 向左分岔、短音 Dit (·) 向右分岔**，動態高亮當前字元與走線路徑。
- **支援標準 26 字母、0~9 數字及更正符號**：底部數字晶片動態點亮，完整覆蓋業餘無線電基礎字符。

### 2. ⚡ 全電鍵發報裝置模擬 (Three Keyer Modes)
- **🔘 直鍵模式 (Straight Key)**：手動按鍵練習，支援實體鍵盤、滑鼠點擊與觸控，具備即時發報長度動態量表。
- **🎛️ 雙撥片電鍵 (Iambic Paddle Keyer)**：
  - 嚴格實作 **Curtis 8044 / Winkeyer** 標準夾發邏輯。
  - **全時點劃記憶 (Element Memory)**：發報中預先拍擊另一撥片自動排入下一音元。
  - **Mode B（經典自動補發）** 與 **Mode A（即放即停）** 自由切換。
  - **左右撥片反轉**：支援反轉為左 Dah / 右 Dit，滿足慣用左手或不同電鍵接線習慣。
- **📻 半自動機械震報鍵 (Bug Key / Vibroplex)**：
  - 短音撥片：機械共振式自動高頻連發。
  - 長音撥片：全手動控制時長，完美還原經典機械式發報手感。

### 3. 🎯 三大實戰練習與挑戰模式
- **⚡ 自由練習模式 (Free Input Mode)**：隨打隨解碼，內建 4 組引導式情境（E、T、SOS 求救信號、門檻邊界測試）與**國際摩斯更正信號 `<HH>` (8 連續短音，自動作廢並刪除上一單字)**。
- **📖 文章發報挑戰 (Text Mode)**：自由輸入文章或選擇經典通聯短句（`SOS`、`CQ CQ DE`、`PARIS` 等），支援**自動表演示範 (Auto Play)**、打鍵即時比對（綠對紅錯）與發報成績結算卡。
- **🎯 國際科赫闖關 (Koch Method Drill)**：
  - 國際標準 35 關階梯式學習（由 `K` 與 `M` 開始逐步加入新字元）。
  - **防連出保護演算法 (Anti-Streak Protection)**：避免連續 3 題出現同字元。
  - **考核模式切換**：
    - 快速考核 (Quick Mode, 12字)
    - 經典雙排滾動矩陣 (Standard Mode, 24字 2排平滑替換)
    - **180 秒極限挑戰 (Challenge Mode)**：限時倒數考核，正確率跌破 90% 立即重置計時，直至達成報務員反射神經標竿！

### 4. 📻 專業無線電聲學與節奏儀表
- **法恩斯沃斯節奏 (Farnsworth Timing)**：音元本身維持高 WPM（如 18~24 WPM）聲學輪廓，僅拉長字母與單字停頓間隔，徹底破除初學者「數點劃」的心魔。
- **QRN 電台大氣微底噪**：原生 Web Audio 生成粉紅雜訊，模擬短波接收機的真實大氣雜訊環境。
- **雙門檻結算間隔時間軸 (Settlement Gap Timeline)**：
  - $0 \sim 3T$：同字接續區（金色光條，即時倒數距字母結算毫秒數）
  - $3T \sim 7T$：同詞下一字母區（青藍光條，字母已確認）
  - $\ge 7T$：單字空格區（翠綠光條，自動插入空格）

### 5. 🖥️ 雙排佈局與全時自動記憶
- **雙欄沉浸專注 (2-Column Focus)** vs **三欄專業工作台 (3-Column Cockpit)** 一鍵切換。
- **全時自動記憶 (Settings Persistence)**：電鍵模式、雙撥片選項、法恩斯沃斯參數、底噪大小、鍵位設定集，重新載入 100% 完整復原。

---

## ⌨️ 預設鍵盤快捷鍵 (Keybindings)

| 功能 | 預設按鍵 (`standard`) | 盲打模式 (`homerow`) | 說明 |
| :--- | :--- | :--- | :--- |
| **直鍵發報** | `K` | `K` | 按住發報、放開結算 |
| **短音撥片 (Dit)** | `[` 或 `,` | `F` | 單擊 Dit，按住連發 |
| **長音撥片 (Dah)** | `]` 或 `.` | `J` | 單擊 Dah，按住連發 |
| **重新開始練習** | `R` | `R` | 重設當前題目或計時 |
| **闖關下一題 / 開始** | `Enter` 或 `N` | `Enter` 或 `N` | 科赫闖關免動滑鼠純鍵盤流 |
| **緊急中斷測試** | `Esc` | `Esc` | 立即停止進行中的科赫考核 |

> 💡 **自訂按鍵**：在右側面板的「自訂鍵位」區域，點擊按鍵按鈕後按下鍵盤上的任意鍵，即可即時錄製為您專屬的發報鍵！

---

## 🚀 快速上手 (Quick Start)

### 方式 1：本機離線直接點開（推薦）
本專案為純原生前端開發，**不需要 Node.js、不需要 Webpack、不需要任何伺服器**：
1. 下載或 Clone 本專案。
2. 雙擊以瀏覽器開啟 `index.html`（或單檔案版 `prototype_morse_card.html`）。
3. 即可直接開始發報練習！

### 方式 2：使用靜態伺服器
```bash
# 使用 npx 快速預覽
npx serve .

# 或使用 Python 內建伺服器
python -m http.server 8000
```

### 方式 3：執行自動化單元測試
專案內建 23 套完整的單元測試：
```bash
npm test
# 或
node test/run-all.js
```

---

## 🌐 如何啟用 GitHub Pages 免費線上展示

1. 將本專案推送到您的 GitHub 倉庫（例如 `morse-trainulator`）。
2. 在 GitHub 倉庫頁面，點選上方 **Settings**（設定）。
3. 在左側選單點擊 **Pages**。
4. 在 **Build and deployment** 下方的 **Branch**：
   - 選擇 `main`（或 `master`）。
   - 資料夾選擇 `/(root)`。
   - 點擊 **Save**（儲存）。
5. 等待 1~2 分鐘，重新整理頁面，頂部即會顯示您的專屬網址：  
   `https://<your-username>.github.io/morse-trainulator/`

---

## 📁 專案目錄結構

```text
morse-trainulator/
├── index.html               # 現代模組化主入口（支援 GitHub Pages）
├── prototype_morse_card.html # 獨立單檔案發布版（100% 離線攜帶）
├── css/                     # 分層樣式表
│   ├── base.css             # 基礎變數與重設樣式
│   ├── pcb-card.css         # PCB 向量電路板樣式
│   ├── controls.css         # 儀表量表與電鍵控制板樣式
│   └── modes.css            # 文章模式與科赫闖關專屬樣式
├── js/                      # 模組化領域核心
│   ├── core/                # 無 UI 核心領域邏輯
│   │   ├── morse-data.js    # 摩斯編碼、樹節點座標、預設值
│   │   ├── morse-engine.js  # 發報計時狀態機與二元樹解碼
│   │   ├── morse-audio.js   # Web Audio 純正弦波合成器與 QRN 雜訊
│   │   ├── iambic-keyer.js  # 雙撥片 Iambic Mode A/B 與震報鍵狀態機
│   │   ├── cw-ribbon.js     # 示波波形紙帶 Canvas 渲染
│   │   ├── koch-manager.js  # 科赫法關卡生成與防連出演算法
│   │   ├── keybinding-manager.js # 鍵位集路由與即時鍵位錄製
│   │   └── settings-manager.js   # localStorage 自動同步與版本遷移
│   ├── ui/                  # 介面控制器
│   │   ├── pcb-renderer.js  # SVG 導線節點快顯與點亮控制器
│   │   ├── meter-controller.js # 發報時長量表與間隔時間軸
│   │   ├── free-mode.js     # 自由練習模式情境引導
│   │   ├── text-mode.js     # 文章挑戰模式與自動表演
│   │   └── koch-mode.js     # 科赫闖關雙排滾動與考核計時
│   └── app.js               # 應用程式總調度與開機引導
├── test/                    # 自動化單元測試套件
│   ├── run-all.js           # 測試總執行器 (23 套測試)
│   └── test_*.js            # 各模組獨立斷言測試
├── LICENSE                  # CC BY-NC-SA 4.0 授權條款
├── package.json             # 輕量測試腳本設定
└── README.md                # 專案詳細說明文件
```

---

## 📜 開源授權與非商業聲明 (License)

本專案採用 **[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](LICENSE)** 授權釋出。

### 條款摘要
- **允許 (Permissions)**：
  - ✅ **自由分享與傳播**：可在任何媒介以任何形式複製、發行本素材。
  - ✅ **修改與衍生創作**：可修改、轉換或以此為基礎進行非商業創作。
- **條件與限制 (Conditions & Restrictions)**：
  - 👤 **姓名標示 (Attribution)**：您必須標註原作者資訊與本專案來源連結。
  - 🚫 **非商業性 (Non-Commercial)**：**嚴格禁止任何形式的商業營利用途**（包括但不限於付費銷售、包裝轉賣、付費課程專有素材、嵌入營利性廣告等）。
  - 🔄 **相同方式分享 (Share-Alike)**：若您修改或衍生本專案，衍生作品必須採用完全相同的 `CC BY-NC-SA 4.0` 授權免費開源分享。

---

## 📻 致謝與技術標準 (Credits)

- **摩斯電碼國際標準**：依據 ITU-R M.1677-1 國際電信聯盟規範。
- **報務訓練理論**：遵循 Ludwig Koch (1936) 心理物理學闖關法與 ARRL 法恩斯沃斯 (Farnsworth) 節奏間隔規範。
- **雙撥片電鍵邏輯**：致敬經典 Curtis 8044 / Winkeyer 狀態機演算法。
- **機械震報鍵原理**：致敬 Horace G. Martin 於 1904 年發明的 Vibroplex 半自動電鍵。
