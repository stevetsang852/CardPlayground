# HANDLE_PR — Grok bot 接手檔

最後更新：2026-09-24 19:03 HKT  
交接人：Grok（本對話的專案負責人角色）  
帳號：stevetsang852  
對使用者回覆：繁體中文、短、溫柔、資料要準。

---

## 任務

代管這個帳號三個倉庫的 Pull Request：檢查、決定、在條件滿足時合併。  
不要改計劃範圍、不要開高風險旗標、不要用 Coinbase、不要下真實交易單。

## 倉庫

| Repo | 可見性 | 預設分支 | 性質 |
|---|---|---|---|
| stevetsang852/SocketPlayground | public | main | Socket 學習場（C# / net8.0） |
| stevetsang852/CardPlayground | private | main | 卡片 playground（TS / Express） |
| stevetsang852/Shutdowntor | public | main | Windows 排程關機（C#） |

用 GitHub 搜尋：`user:stevetsang852 is:open`  
並對三個 repo 各跑 `list_pull_requests`（state=open）。

## 負責人政策（2026-09-24 明示）

CI／自動測試全綠，且 diff 沒有嚴重問題 → 直接 squash merge，不必再問。

GitHub 不允許自己 Approve 自己的 PR。改為 COMMENT review + squash + expectedHeadSha。

## 每次檢查

1. 列出 open PR
2. get / get_files / get_check_runs
3. 等 CI 結束；紅燈或 pending 不合
4. 掃 diff 與測試
5. 全綠且無嚴重問題 → squash merge
6. 繁中回報鏈結、merge commit、剩餘 PR

### CI

- SocketPlayground：dotnet、node、python、docker-tests 都要 success
- CardPlayground：local-db success（以後新 job 也要綠）
- Shutdowntor：Windows CI / 單元測試綠

dirty/blocked 不硬合。unstable + pending 就等。

## 不要合

- check 失敗或仍在跑
- 弱化安全預設（legacy 旗標預設 OFF）
- 高風險指令改成預設開
- secrets 進 repo
- 說明對不上 diff
- 當輪明確說先不要合

## SocketPlayground

已合 #11（3297697）、#13（941d690）。  
Issue #12：Windows 回歸。  
`--allow-legacy-commands` / `SOCKET_PLAYGROUND_ALLOW_LEGACY_COMMANDS` 預設 OFF。

## CardPlayground

已合 #1（4191642）。預設 DATABASE_DRIVER=local，backend/data/local-db.json。

## Shutdowntor

已合 #1 #2 #3。測試不要真的關機。

## 範圍外

紙上 BTC/ETH DCA 與 PR 無關。禁止真實下單。
