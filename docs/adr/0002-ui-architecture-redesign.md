# 2. 系統架構重構：三層工作台佈局、多維視圖與漸進式揭露

Date: 2026-09-06

## 狀態 (Status)

Accepted (已採納)

## 背景 (Context)

隨着摩斯訓練儀陸續加入直鍵/雙撥片/Bug Key、三軸時間儀表、示波器、即時 WPM、科赫 36 關地圖與 4 階通關榮譽勳章，系統面臨顯著的資訊密度膨脹：
1. **視線與資訊過載 (Information Overload)**：二元樹 PCB 卡片、控制按鈕、儀表、文字輸出與設定滑桿全數堆疊於同一視線層級，桌面端垂直滾動過長，新手學習曲線陡峭。
2. **行動裝置操作障礙 (Mobile Usability)**：在行動觸控直向螢幕中，發報電鍵隨頁面滾動飄移，脫離使用者大拇指自然操作熱區（Thumb Zone）。
3. **擴充性瓶頸 (Scalability)**：後續規劃加入「CW 聽力抄收/聽寫 (Receive / Copy Practice)」與「空通模擬 (QSO Simulator)」，現有單頁看板已無法承載兩套截然不同的互動模式（聽寫不需要發報鍵，發報不需要聽寫輸入框）。
4. **二元樹視覺心智查表干擾**：二元樹對初學者具備極高趣味性與直觀性，但對進階與高速電報操作者（$\ge 15\text{ WPM}$）而言，依賴視覺樹狀路徑可能阻礙直接聽覺節奏反射（Acoustic Reflex）。

## 決策 (Decision)

自本決策起，確立新一代系統架構與介面規範：

1. **三層工作台佈局 (Three-Zone Architecture)**：
   - **Zone 1: 頂部導航與狀態抬頭 (Top Bar / HUD)**：包含品牌專屬 Logo/Mark、工作台切換器、即時 WPM 徽章與設定抽屜按鈕。
   - **Zone 2: 主舞台多維視圖 (Main Stage)**：自適應視窗高度，具備三段式視圖切換器（`Tree View` / `Focus HUD` / `Telemetry View`）。
   - **Zone 3: 底部控制台 (Bottom Dock)**：固定於螢幕下半部拇指熱區；發報工作台呈現雙撥片/直鍵觸控板，聽寫工作台呈現專屬電信打字鍵盤。
   - **附屬抽屜 (Slide-up Settings Drawer)**：非即時參數（Farnsworth、音調、Iambic Mode A/B、Bug、左右對調、QRN 底噪、鍵位錄製）收納為滑動抽屜，預設收起，落實漸進式揭露。

2. **工作台分流 (Workspace Segregation)**：
   - **發報實戰 (Transmit Workspace)**：承載自由拍發、文章跟打、科赫闖關。
   - **聽力抄收 (Receive Workspace)**：承載隨機字母、單字、電台呼號聽寫。
   - **空通模擬 (QSO Simulator)**：承載電台頻段對話與虛擬 QSO 通聯。

3. **三段式主舞台視圖模式 (Segmented View Modes)**：
   - **二元樹視圖 (Tree View)**：預設招牌視圖，完整呈現 PCB 銅箔樹與點劃發光路徑。
   - **專注 HUD 視圖 (Focus HUD)**：隱藏二元樹，提供極簡、高對比、大字號的盲打當前字元與文本流，專注於肌肉記憶與聽覺反射。
   - **電信示波視圖 (Telemetry View)**：呈現大面積 60FPS 示波帶與三軸時間差儀表，專供微調點劃比率與手感。

4. **堅持零外部依賴與本機雙軌運行 (Zero-Dependency & Offline Execution)**：
   - 恪守專案核心工程原則：系統完全以 100% 原生 Vanilla JS 與純 CSS 實現，不引入任何外部運行時框架或第三方動畫庫（如 GSAP）。
   - 抽屜平滑開闔與視圖切換全數採用硬體加速 CSS transitions / transforms 與 requestAnimationFrame 實現 60FPS 絲滑動態。
   - 保證 `index.html` 與 `prototype_morse_card.html` 在離線本機 `file:///` 環境下 100% 完整運作無虞，不依賴任何網路請求或 CDN。
   - 後續擴展 Rx 與 QSO 工作台時，持續維持此零外部依賴與純原生標準。

5. **品牌識別標誌 (Brand Mark)**：
   - 建立專屬向量 SVG Logo/Mark，融合摩斯電碼節奏（Dit/Dah）、電報電鍵與 PCB 導線意象，提升專業儀式感與產品辨識度。

## 後果 (Consequences)

### 正面影響 (Positive)
- 資訊過載徹底解除，新手 3 秒內即可開始拍發，進階者享有純淨無干擾的 Focus HUD。
- 行動端電鍵固定於下半部觸控熱區，操作體驗躍升為 Native App 級別。
- 清楚劃分 Transmit / Receive / QSO 邊界，後續擴充聽寫與通聯功能皆有專屬容器，無須再塞入發報主頁。

### 潛在挑戰與緩解 (Mitigations)
- 雙軌檔案需重構 CSS 結構與 DOM 階層，需確保既有 30 組自動化測試（包含各按鍵 callback 與 DOM id）在重構後持續相容通過。
