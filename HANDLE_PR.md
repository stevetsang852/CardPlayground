# Grok bot HANDLE / 接手索引

更新日期：2026-09-25

用家 GitHub：`stevetsang852`  
規則：CI 綠且無嚴重問題可 merge，不必再問。

## 檔案

| 檔 | 用途 |
|---|---|
| [docs/HKJC_GROK_BOT_HANDOFF.md](./docs/HKJC_GROK_BOT_HANDOFF.md) | **主接手**：馬會 MCP 可行性、足球只讀、紙上預測、硬規則 |

## 兩條線

1. **CardPlayground（PTCG）**  
   PR #4 開著，CI 曾綠。不要把 HKJC 代碼混進 `backend/` 遊戲邏輯。

2. **HKJC / 足球**  
   只讀 GraphQL + 外站 API + 統計建議。  
   **禁止**非官方 login / place_bet。詳見 HKJC 接手檔。

接手 bot：先讀 `docs/HKJC_GROK_BOT_HANDOFF.md`。
