# 2026 世界杯实时赛程图 — 部署说明

这个文件夹包含一个**单文件网页** (`index.html`) 和一个**比分数据文件** (`scores.json`)。
网页每 5 分钟自动读取一次 `scores.json` 并刷新积分榜，所以**你只要更新 scores.json，所有访客刷新就能看到最新比分**。

---

## 一、获得「永久有效的链接」（免费托管，二选一）

### 方案 A：GitHub Pages（推荐，永久免费）
1. 注册并登录 https://github.com ，点右上角 **+ → New repository**，建一个仓库（例如 `worldcup`），勾选 Public，创建。
2. 进入仓库 → **Add file → Upload files**，把本文件夹里的 `index.html` 和 `scores.json` 一起拖进去，Commit。
3. 仓库 **Settings → Pages** → Source 选 `Deploy from a branch`，Branch 选 `main` / 根目录 `/ (root)`，Save。
4. 等 1 分钟，页面顶部会给出你的永久网址，形如：
   `https://你的用户名.github.io/worldcup/`
   —— 这就是可以长期分享的链接。

### 方案 B：Netlify Drop（最快，拖一下就好）
1. 打开 https://app.netlify.com/drop
2. 把本文件夹**整个拖进去**。
3. 立刻得到一个永久网址（可在 Site settings 里改成好记的名字）。

> 两种方式都能让**所有人看到同一份**比分，因为大家读的是你托管的同一个 `scores.json`。

---

## 二、每日更新比分

### 做法 1：手动改（最简单，2 分钟/天）
直接编辑 `scores.json` 里的数字再上传覆盖即可。格式：

```json
{
  "updated": "2026-06-20 晚",
  "scores": {
    "A1": { "a": 2, "b": 1 },   // a = 左边球队进球, b = 右边球队进球
    "A2": { "a": 1, "b": 1 }
    // ... 没踢的场次不用写，会显示 "– : –"
  }
}
```

**场次编号规则**：组别字母 + 该组第几场（1~6），顺序见下表 `fixtures.txt`。
例如 `C1` = C 组第 1 场（巴西 vs 摩洛哥）。

- GitHub：仓库里点 `scores.json` → 铅笔图标编辑 → Commit。
- Netlify：改完本地文件后再拖一次整个文件夹覆盖。

### 做法 2：全自动（GitHub Actions 定时抓取，免费，无需改代码）
本文件夹的 `.github/workflows/update-scores.yml` + `scripts/update-scores.mjs` 已对接 **football-data.org**（免费档永久包含世界杯），开箱即用：
1. 用 GitHub Pages 方案（方案 A）托管。
2. 去 https://www.football-data.org/client/register 免费注册，拿到 API Token。
3. 仓库 **Settings → Secrets and variables → Actions → New repository secret**，
   名字填 `FOOTBALL_API_TOKEN`，值填你的 token，保存。
4. 完成。Actions 会**每 6 小时自动抓取真实比分、更新 scores.json 并提交**，网页随之刷新。
   （想改频率就编辑 yml 里的 `cron`；也可在 Actions 页面点 “Run workflow” 手动触发。）

> 脚本靠球队三字母码自动配对，无需你写代码。若个别球队没对上，运行日志会提示，
> 在脚本的 `NAME` 表里补一行该队全名即可。免费档比分有几分钟延迟，每日更新完全够用。

---

## 三、改用别的比分接口（可选）
如果你已经有一个返回相同 JSON 格式、带 CORS 的接口，可以不改 scores.json，而是在网页里把数据源指向它：用浏览器打开页面后右侧的 Tweaks 面板，把 `scoresUrl` 改成你的接口地址即可。
