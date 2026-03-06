# NGSL 零基础单词站

## 已完成
- 数据来源：`https://www.linguaeruditio.com/Glossary/NGSL/CN/NGSL_ch_gloss.html`
- 词库：`data/words.json`（当前 2809 条）
- 完整词表（按 rank 排序）：`data/words_full_ranked.csv`
- 功能：抽卡学习、认识/不认识、收藏、搜索、学习进度本地保存
- 新增：浏览器英文朗读（TTS）、错词间隔复习（SRS 到期词）
- 新增：词表分页（按 rank 顺序，每页 50 词，支持搜索分页）
- 新增：每个单词自动生成简单例句（卡片和词表都可见）
- 新增：训练模式（中文提示 -> 输入英文），快捷键：
  - `Ctrl+'` 发音
  - `Ctrl+M` 标记掌握
  - `Ctrl+N` 标记生词
  - `Ctrl+;` 显示答案
  - `Enter` / `Space` 提交并下一题

## 本地使用
1. 直接双击 `index.html`（部分浏览器可能因 `fetch` 本地文件限制无法读 JSON）。
2. 推荐在当前目录启动本地服务器：
   - `python -m http.server 8000`
   - 浏览器打开 `http://localhost:8000`

## 重新抓取词表
1. 下载网页源码到 `ngsl_raw.html`
2. 执行：
   - `powershell -ExecutionPolicy Bypass -File .\\scripts\\extract-ngsl.ps1`
