# 地理題庫來源與查核範圍

`node scripts/build-geography.mjs` 使用本目錄保存的來源快照，離線重建 `data/geography.json`。首版為 900 題：720 填充、90 選擇、90 是非，涵蓋 15 種事實類型。這批為基礎地理與旅行知識資料題，不全是反直覺的歷史軼聞。

## 來源

- `countries.json`：2026-11-09 自 https://raw.githubusercontent.com/mledoze/countries/master/countries.json 取得。來源為開放社群資料集，不是各國官方機關逐題認證。下載時所附的授權為 **Open Database License (ODbL)**，完整文字保留於 `countries-LICENSE.txt`。衍生的國家資料庫同以 ODbL 提供。
- `airport-codes.csv`：2026-11-09 自 https://raw.githubusercontent.com/datasets/airport-codes/master/data/airport-codes.csv 取得。其資料源為 OurAirports，公有領域資料；DataHub 的完整來源和授權說明保留於 `airport-datapackage.json`。來源明確提醒 IATA/ICAO 原始代碼清單權利狀態另有說明。
- `assets/flags/*.svg`：由 https://github.com/lipis/flag-icons 的 `flags/4x3/` 下載，MIT 授權保留於 `assets/flags/LICENSE.txt`。圖像與題庫一起離線載入，不依賴作業系統是否支援旗幟 emoji。
- 繁體中文國家、貨幣、語言標籤主要由 Node.js `Intl.DisplayNames('zh-Hant')` 的 ICU/CLDR 名稱產生。另人工補上臺灣常用譯名、常見地名別稱，以及修正 XCD 等不合適的顯示名稱。

## 已完成的查核

- 檢查來源資料欄位與授權，保留原始快照及 SHA-256，確保資料可追溯與重建。
- 全量確認 900 個唯一題目 ID、題型比例、答案／選項一致性、來源對照、圖片檔案存在及解說內容。
- 抽樣閱讀每種題目，對填充題增補常見中文異譯；貨幣名稱不接受直接抄題目已給出的代碼作答。
- 排除首都定義容易爭議或近期遷都的案例；首都題採人工對照表，明確排除埃及、印尼、赤道幾內亞，也沒有直接採用資料中斯里蘭卡等易混淆列。
- 避開近期貨幣變更或資料有疑義的項目，例如辛巴威、保加利亞，以及來源錯列貨幣的南喬治亞與南三明治群島。
- 國界題盡量避開爭議邊境，並明確區分國家與地區；歐洲國家以歐洲本土為範圍。國際電話以「+國碼／地區碼」描述，避免把它誤稱為 00、011 等國際冠碼。
- 機場國家題優先選旅行常見樞紐，每個國家或地區最多兩座，並保留英文名稱供對照。

## 品質限制

`checkedAt` 表示這次題庫整理、資料取得及一致性檢查日期，不代表每題另經官方來源獨立覆核。公開社群資料可能有錯漏；發布後仍需接受回報與定期修訂。原始研究快照約 10 MB，前端只需題庫 JSON 與本地旗幟，不應快取本目錄。
