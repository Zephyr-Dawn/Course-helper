# 模拟电路（下半学期）互动复习

在线入口：[模拟电路（下半学期）](https://zephyr-dawn.github.io/Course-helper/analog-circuit-micro/)。

本课程在 `analog-circuit-micro` 分支维护。`main` 为整个 Course Helper 的 Pages 汇总发布分支，每门课程放在同名目录。更新本课程后，将通过验证的变更同步到 `main`，由 GitHub Pages 自动发布。上半学期（第 1–9 讲电路原理）见 [`analog-circuit`](../analog-circuit/)。

## 内容

依据课堂讲义 `chap_6m`–`chap_12m`（含第 8、11 章补充讲义），以 MIT 讲义作补充：二极管、三极管（BJT）、场效应管（FET）、频率响应、反馈、功率放大器，共 6 章、89 个专题。

| 内容 | 数量 |
|---|---|
| 讲义配图（从课堂讲义裁出，紧邻对应文字，可放大） | 157 |
| 习题（[EC2024](https://bc0403.github.io/EC2024/) Microelectronic Circuits 部分，题面、题图与原参考答案照录） | 191 |
| 重点公式（人工精选，含用途、适用条件、易错点） | 52 |
| 概念快测 | 38 |
| 互动实验（理想化解析模型） | 18 |

191 道习题逐题看图独立求解：156 题与原答案一致，29 题答案正确但补充了条件或说明，5 题勘误，1 题题图存疑。勘误和讲义疑点见 [ERRATA.md](ERRATA.md)。运放（第 9 章）属上半学期，只保留其习题；不包含 LTspice 等仿真软件教程；不推断未标明的考试年份。

包含搜索（可搜题号、术语）、本页目录、收藏、错题本、按知识点/题型/状态筛选、学习记录导入导出、打印当前页和打印全部讲义。

## 在线版与离线版

`index.html` 已内嵌字体、数学排版（KaTeX 预渲染）、图片和程序，另存这一个 HTML 后可离线使用，打开时不发出任何网络请求（只有“原题页”链接需要联网）。原始讲义 PDF 和整页课件截图不发布。

学习记录保存在当前浏览器。在线站点与本地文件的存储来源不同；需要迁移时，在“收藏与学习记录”导出 JSON，再到另一入口导入。

## 重建和核验

在本目录运行：

```bash
python3 -m pip install -r requirements.txt
python3 build.py --out index.html        # 生成 Pages 产物
python3 src/lint_content.py ch06 ch07 ch08 ch10 ch11 ch12 ex:diode ex:bjt ex:mosfet ex:opam ex:freq ex:feedbak ex:pa ex:int
node tests/models.test.cjs               # 互动模型数值校验
SITE_HTML=index.html QA_OUTPUT=test-output PLAYWRIGHT_MODULE=<playwright-core 路径> node tests/functional.browser.cjs
```

- 构建需要 Node.js（KaTeX 预渲染）。浏览器测试需要 `playwright-core` 与本机 Google Chrome。
- 讲义配图已生成在 `assets/figs/`；只有调整裁剪时才需要把讲义 PDF 放到上一级目录并运行 `src/render_figures.py`。
- 习题由 `src/parse_ec2024.py` 从 `assets/ec2024/*.md` 解析（EC2024 为 MIT License，许可证见 `assets/ec2024/LICENSE`）；人工核对写在 `content/exercises/<set>.review.json`。
- 编写规范见 [docs/AUTHORING.md](docs/AUTHORING.md)，验证记录见 [QA.md](QA.md)。
