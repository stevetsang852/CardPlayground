# Grok bot 接手文件 — HKJC / 足球紙上預測（2026-09-25）

給下一任 Grok bot。先讀本檔，再動手。語言：用家以粵語／書面中文為主；回覆保持正面、資料正確；涉及投注只做建議／紙上盤，不代落真注。

## 0. 用家與帳號

- GitHub（已連 connector）：`stevetsang852`
- 現有 repo：https://github.com/stevetsang852/CardPlayground  
  （這是 PTCG / 卡牌 playground，**不是** HKJC 主倉。HKJC 工作尚未獨立建 repo。）
- 用家偏好（已聲明）：
  - 加密貨幣：先紙上，後先講「確認下單」才執行
  - GitHub：PR CI 綠且無嚴重問題可直接 merge
  - 馬會：**不開發非官方登入／落注 API**；足球行情可用外站 API
- 本對話結論：HKJC MCP 只做 **Read-only**；登入 + place_bet **不做**

## 1. 硬規則（不可破）

1. 不要實作 HKJC `login`、session cookie、SMS、place_bet、轉帳。
2. 不要重放投注單 POST／私有交易 GraphQL。
3. MCP 若要做，工具只限讀取與建議：`health`、`fb_matches`、`fb_odds`、`recommend`。
4. 建議卡必須帶 `place_via: official_app`。真注只經官方 App／網站，由用家人手落。
5. 短賠（約 ≤1.20）預設細注或空過；亞運 1.001 類盤空過。
6. 預測是娛樂／研究，不是保證。

## 2. 已驗證的技術事實

閘道：`POST https://info.cld.hkjc.com/graphql/base/`

- `{ __typename }` → 200
- 自訂精簡 football query → WHITELIST_ERROR
- Bobosky2005/hkjc-api 全文 matchList → 200，2026-09-25 約 110–111 場 + HAD
- 無公開 OAuth / login API 域名

足球一次約 4 個玩法：HAD HHA HIL CRS。
Query 必須整段原樣：https://github.com/Bobosky2005/hkjc-api/blob/master/src/query/footballMatchesQuery.ts

## 3. 產品方向

外站 API + 可選 HKJC 讀取 → Elo/Dixon-Coles → 建議卡 → 官方 App 人手落注。賽馬暫緩。

建議新 repo：`stevetsang852/hkjc-fb-read`。不要塞進 CardPlayground backend。

MCP：fb_health, fb_matches, fb_odds, recommend。禁止 login / place_bet。

## 4. 統計參考

- https://www.eloratings.net/
- liveljack/soccer_prediction
- Reymes/football-match-prediction
- jdgoated1/football-predictor
- DOsinga/football_predictions
- Bobosky2005/hkjc-api

主場 +80 Elo；WE=1/(1+10^(-d/400))；短賠細注或空過。

## 5. 2026-09-25 紙上盤

- 印尼 vs 新加坡 HAD 主勝 1.0 單位
- 意大利U20 vs 英格蘭U20 客/和各 0.5
- 塞內加爾客勝 0.5；馬來西亞客勝 0.5
- 1.00x / 1.11 空過

## 6. CardPlayground PR #4

開著；CI 曾 success。連線實驗時未 merge。

## 7. 下一步

1. 建 hkjc-fb-read
2. 收 matchList 為套件
3. 對照外站 API
4. 建議卡 + 今日結算
5. 不做登入 R&D
