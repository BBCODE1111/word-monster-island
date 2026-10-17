# 單字獸島 · Wordling Island

原創人物與怪物的日系漫畫英語學習遊戲。帶著捕捉電腦，聽單字、選答案、排字母，和六隻可愛夥伴一起冒險。

遊戲網站：https://word-monster-island.dreamuzik.chatgpt.site

## 玩法

- 聽音選字：聽英文，從四個答案送出正確的捕捉訊號。
- 字母拼拼：依序排列打亂字母，重複字母和連字號都要正確排入。
- 混合冒險：輪流練習兩種題型。
- 每趟五隻小怪加魔王。魔王三格血量，答對三題才能捕捉。
- 不限時或每題 15／25／40 秒。首次發音完成後倒數，可暫停，切分頁自動暫停。
- 可選 CET／FET 全部、合併字庫，或複選 Week／Lesson。
- 使用瀏覽器英文語音，按喇叭可重聽。建議 Chrome、Edge 或 Safari，並開啟裝置聲音。
- 無提示首次答對 100 分，重試答對 70 分，使用提示答對 50 分。
- 圖鑑、學習足跡和選單設定存在目前瀏覽器，不跨裝置同步。

## 本機啟動

不需要安裝前端依賴，用 Python 3 提供靜態網站：

```sh
python3 -m http.server 4187 --directory dist
```

開啟 http://localhost:4187 。請使用 HTTP，直接開 HTML 檔案無法載入字庫。

## 修改網站

| 檔案 | 用途 |
| --- | --- |
| `dist/app.js` | 選單、發音、出題、時間、捕捉動畫與圖鑑 |
| `dist/engine.mjs` | 怪物名稱與描述、題庫篩選、洗牌和魔王規則 |
| `dist/style.css` | 桌機／手機版面、色彩與動畫 |
| `dist/index.html` | 網站標題、圖示與入口 |
| `dist/assets/` | 原創怪物圖集、研究員主角與森林場景 |
| `dist/data/vocabulary.json` | 遊戲實際讀取的單字資料 |
| `data/` | 單字資料庫、JSON 與中文翻譯對照備份 |
| `tests/engine.test.mjs` | 遊戲規則檢查 |

要調整遊戲文字或單字意思，請修改 `dist/data/vocabulary.json` 中的資料；`cards` 保存詞性與中文，`groups` 保存週次／Lesson。`data/` 的檔案供資料庫查詢與維護參考，不會被遊戲自動載入。

怪物圖集為 3 欄 × 2 列透明 PNG，`.monster-0` 至 `.monster-5` 對應六個位置，換圖時請維持此排版。原創主角使用 `researcher-v2.png`。

## 字庫與來源

共 231 種拼字，保留 320 筆課表紀錄（FET 170、CET 150）及 33 個分組。遊戲按拼字去重，可依原課次篩選。

來源為康橋國際學校 G1 2026 秋季 [FET](https://passport.kcis.ntpc.edu.tw/WebFiles/EClass/2211/FET%202026%20Fall%20Vocab%20List%20G1.pdf) 與 [CET](https://passport.kcis.ntpc.edu.tw/WebFiles/EClass/2211/CET%202026%20Fall%20Vocab%20List%20G1.pdf) 單字表。原表未附中文，中文為補充翻譯，部分多義字保留常見意思。學校單字表的權利歸原來源所有。

## 檢查與發布

```sh
node --test tests/engine.test.mjs
```

檢查課程篩選、四選一、字母完整性、抽題重複與魔王血量。

`dist/` 是可直接部署的靜態網站。GitHub 上修改後，仍需把同一版本重新發布至遊戲網站。

此儲存庫僅保存網站程式、素材、字庫與必要使用說明。專案討論、設計筆記、生成提示與 SKILL.md 留在本機，不納入 GitHub。
