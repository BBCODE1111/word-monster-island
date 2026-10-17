# 單字獸島 · Wordling Island

原創角色的亮色日系漫畫英語學習遊戲。帶著捕捉電腦，聽單字、選答案、排字母，和六隻夥伴一起冒險。

遊戲網站：https://word-monster-island.dreamuzik.chatgpt.site

原始碼目的地：https://github.com/BBCODE1111/word-monster-island

## 玩法

- 聽音選字：電腦唸英文，四選一送出捕捉訊號。
- 字母拼拼：依序點選字母，重複字母及連字號也需正確排列。
- 混合冒險：兩種題型輪流出現。
- 每趟 5 隻小怪加魔王。魔王有 3 格血量，須答對 3 題才能捕捉。
- 不限時間，或每題 15／25／40 秒。首次發音結束後開始倒數；可暫停，換分頁也會暫停。
- 可選全部 CET、全部 FET、全部一起，或複選 Week／Lesson。
- 英文由瀏覽器 SpeechSynthesis 發音，喇叭按鈕可重聽。建議 Chrome、Edge 或 Safari；裝置需有英文語音並開啟聲音。
- 答錯可再試。無提示首次答對 100 分、重試答對 70 分、使用提示答對 50 分。
- 圖鑑、單字練習紀錄與選單偏好保存在目前裝置的 localStorage；不跨裝置同步。

## 本機執行

無需安裝前端套件，用 Python 3 提供靜態網站：

```sh
python3 -m http.server 4187 --directory dist
```

瀏覽 http://localhost:4187 。請使用 HTTP，直接開啟 HTML 檔案無法載入 JSON 字庫。

## 從哪裡修改

| 檔案 | 用途 |
| --- | --- |
| `dist/app.js` | 選單、發音、題目、時間、動畫與圖鑑 |
| `dist/engine.mjs` | 怪物名稱／故事、題庫篩選、洗牌與魔王規則 |
| `dist/style.css` | 桌機／手機版面、色彩、動畫 |
| `dist/index.html` | 網站標題、圖示、入口 |
| `dist/assets/` | 六隻原創怪物圖集、研究員主角、森林場景 |
| `dist/data/vocabulary.json` | 遊戲實際讀取的字庫 |
| `data/translations-zh-TW.json` | 可修改的繁體中文翻譯 |
| `data/vocabulary.sqlite3` | 完整單字 SQLite 資料庫 |
| `sources/` | 原始 PDF、來源雜湊與核對後擷取資料 |
| `scripts/build_database.py` | 重建資料庫與遊戲 JSON，僅需 Python 標準函式庫 |
| `scripts/import_sources.py` | 從目前兩份 PDF 重新擷取，需要 pdfplumber |
| `tests/engine.test.mjs` | 題庫、拼字、複習與魔王規則檢查 |

改中文後執行 `python3 scripts/build_database.py`，會自動更新 SQLite、JSON 和 `dist/data/` 的遊戲資料。

怪物圖集為 3 欄 × 2 列的透明 PNG，CSS 的 `.monster-0` 到 `.monster-5` 對應位置，換圖時須維持此版面。主角為原創銅橘髮研究員，使用 `researcher-v2.png`，未保留最初已被否決的主角版本。

## 字庫

來源為康橋國際學校一年級 2026 秋季單字表：FET 170 筆、CET 150 筆，33 個課次／週次分組，231 種拼字、235 張依詞性分開的卡。遊戲按拼字去重，仍可依原課次篩選。

- [FET 原表](https://passport.kcis.ntpc.edu.tw/WebFiles/EClass/2211/FET%202026%20Fall%20Vocab%20List%20G1.pdf)
- [CET 原表](https://passport.kcis.ntpc.edu.tw/WebFiles/EClass/2211/CET%202026%20Fall%20Vocab%20List%20G1.pdf)

原表未附中文，中文為助理補充，部分多義字保留常見意思。原詞形、詞性與來源頁碼均保存。CET 沒有 Week 9–10、18–19；沒有自行新增。原表把 teeth 標為 `(*n.)`，資料中保留原標記並加註複數說明。PDF 中重複、被裁切的隱藏文字已去除，未重複匯入。

## 驗證

```sh
node --test tests/engine.test.mjs
```

涵蓋全部 231 個拼字的篩選、33 組的四選一、235 張卡的字母完整性（含重複字母及連字號）、抽題避免立即重複、五隻小怪與三格魔王血量。

瀏覽器人工操作已檢查：完整魔王通關、選字／拼字答錯重試、課程篩選、提示、暫停計時、限時到期、圖鑑與紀錄、390px 手機版面。

## 發布

`dist/` 是完整可部署的靜態網站；可用 Sites 或其他靜態主機發布。`.openai/hosting.json` 保存目前 Sites 專案身分，不含密碼或權杖。GitHub 存放可編輯原始碼；GitHub 上修改後仍需將同一版本重新發布到遊戲網站。

圖片以內建 Imagegen 生成，原創角色設計方向及提示記錄見 `art-notes/prompts.md`。學校單字表的權利歸原來源所有。
