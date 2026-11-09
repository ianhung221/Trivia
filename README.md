# 途中 TRIVIA

給好奇旅人的繁體中文口袋知識網站。首版 1,000 題：800 填充、100 選擇、100 是非；涵蓋地理、國家、交通、航空與科技，答完顯示解說和來源。

## 本機預覽

需要 Node.js 20.11 以上（開發時使用 24）。網站本身不需要建置或第三方執行期套件。

```sh
npm start
```

開啟 http://127.0.0.1:4173/Trivia/ 。伺服器同時支援根路徑與 GitHub Pages 的 `/Trivia/` 子路徑。結束時按 Ctrl+C。不要直接以 `file://` 開啟 `index.html`。

## GitHub Pages

目標 repository：<https://github.com/ianhung221/Trivia>。

將專案提交到 `main` 後，在 GitHub repository 的 **Settings → Pages → Build and deployment** 選擇 **Deploy from a branch**、分支 **main**、目錄 **/(root)**，按 Save。GitHub 完成部署後，預期網址為 <https://ianhung221.github.io/Trivia/>。這個網址在 Pages 尚未啟用或部署未完成時不會生效。

`.nojekyll` 讓 GitHub 直接提供靜態檔案。所有應用資源使用相對網址，不需要後端、API 金鑰、Firebase 或 Google Maps。不要把任何憑證加入 repository。

## 遊玩與保存

- 依分類及題型探索，每回合 10、20 或 50 題，回合內不重複。符合條件的題目較少時使用實際可用題數。
- 隨興旅程優先安排尚未探索的題目；可用時約三成安排故事題，避免全部都是資料記憶題。
- 填充題接受明列的別名、英文大小寫、全半形及「台／臺」差異；不使用不可靠的模糊比對。合理的其他寫法可於揭曉後自行改判，會標記於結果。
- 可暫停續答、收藏、重訪錯題；沒有倒數、帳號、排行榜或對戰。
- 進度及收藏存在瀏覽器 `localStorage` 的 `en-route-trivia:v1`。清除網站資料、私密瀏覽或換裝置可能失去紀錄；沒有跨裝置同步。

## 離線與更新

首次必須連網，以 HTTPS 或 localhost 開啟，等頁尾顯示「離線題庫已就緒」才表示網站、完整題庫與旗幟圖片已快取。之後可離線重新開啟及作答；外部來源網站仍需要網路。瀏覽器可因空間不足或使用者清除資料而移除快取，因此離線不是永久保證。

服務工作執行緒將每個版本作為一組快取，避免新版程式配上舊題庫。修改任何應用資源或題庫時，**必須更新 `sw.js` 的 `VERSION`**。新版本準備完成後，頁尾會提供更新按鈕；點擊前先保存作答紀錄，再載入新版本。

Cache Storage 與使用者的 localStorage 獨立。快取重試不清除收藏及作答紀錄，版本更新僅清理本網站自身的舊快取。

## 題庫維護與授權

- `data/curated.json`：100 題故事與科學知識，來源為官方、研究、文化機構及可靠專題資料。
- `data/geography.json`：900 題公開資料衍生題，包含多種事實類型；並非 900 篇獨立軼聞。
- `data/questions.json`：前端使用的合併題庫；不要只修改此檔而遺漏來源檔。
- `scripts/build-geography.mjs`、`scripts/research/build-curated.cjs`：產生題庫；原始研究快照供重現與審核，不加入離線快取。
- `assets/flags/`：本地旗幟圖像，離線辨識題不依賴 emoji 的裝置支援。
- `credits.html`：公開顯示來源與授權。國家資料來源採 ODbL 1.0，衍生資料型題庫遵循相同授權。原始授權全文在 `scripts/research/countries-LICENSE.txt`。

編輯題目時保留穩定 ID。每題須有分類、題型、答案、別名陣列、解說、來源 ID、查核日期；選擇題須四個不重複選項，是非題為「是／否」。地名別稱應補進 aliases。資料快照的讀取日期不等於外部資料提供者保證每個欄位在該日重新查證；時效性題目需回到原始來源再確認。

```sh
npm run build:data
npm run check
```

檢查題量、比例、唯一題目 ID、來源映射、選項、圖檔及基本內容完整性。語意正確性仍需人工查核；有爭議或不確定的題目應移除或修訂，不以換句話說湊題數。

## 測試

```sh
npm ci
npm test
npm run check
```

瀏覽器測試使用 Playwright 與已安裝的 Chrome。先在另一個終端執行 `npm start`，再執行：

```sh
node tests/browser.mjs
```

測試腳本目前指定 Windows Chrome 路徑；其他平台請改 `executablePath`。測試使用獨立瀏覽器 context，截圖和報告寫到 `test-results/`，不接觸日常瀏覽器的使用者資料。驗證結束需關閉預覽伺服器。
