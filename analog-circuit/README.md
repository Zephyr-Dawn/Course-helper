# 电子电路基础互动复习

在线入口：[电子电路基础](https://zephyr-dawn.github.io/Course-helper/analog-circuit/)。

本课程在 `analog-circuit` 分支维护。`main` 为整个 Course Helper 的 Pages 汇总发布分支，每门课程放在同名目录。更新本课程后，将通过验证的变更同步到 `main`，由 GitHub Pages 自动发布。

## 内容

依据 EC2026 第 1–9 讲，共 525 页课件，保留 9 章、95 个专题、55 页课后题的独立分步解析、12 道 EC2024 精选题、24 道概念快测、39 组人工精选重点公式和 18 个参数互动。

正文直接展示 76 幅电路、波形、相量和元件图，习题另配 50 幅独立电路题图，均可放大。重点公式按用途、适用条件、易错点组织，主公式和小字数学均参与排版。包含搜索、收藏、掌握状态、错题、学习记录导入导出和打印。

教材只补充对应知识，不包含 LTspice 或其他仿真软件使用教程。题库保留原编号和来源，不推断未标明的考试年份。源材料疑点和独立复算结论见 [ERRATA.md](ERRATA.md)。

## 在线版与本地离线版

本仓库保留完整教学文字、独立解析、裁出的电路图和必要资源。原始 PDF/PPT、完整课件题页截图、制作缓存与本地离线 ZIP 不发布。题目的讲次和物理页码继续保留，可对照自有课件核查。

`index.html` 已内嵌字体、数学排版、图片和程序，另存这一个 HTML 后也可离线使用。完整原页仅在本地离线资料包中提供。

学习记录保存在当前浏览器。在线站点与本地文件的存储来源不同；需要迁移时，在“收藏与记录”导出 JSON，再到另一入口导入。

## 重建和核验

在本目录运行：

```powershell
python -m pip install -r requirements.txt
python -X utf8 build.py
python -X utf8 tests/publication.test.py
python -X utf8 tests/content_check.py
python -X utf8 tests/formulas.test.py
node tests/models.test.cjs
```

生成入口为 `index.html`，无需服务器即可打开。公开构建不读取原课件或完整题页图像。修改正文、题目或样式时改 `content/`、`src/`，再构建。

三个 `tests/*.browser.cjs` 脚本需要 Playwright 模块和 Chrome；可通过 `PLAYWRIGHT_MODULE` 指定现有模块，`QA_OUTPUT` 指定仓库外的截图输出目录。

使用和制作的详细交接见 [HANDOFF.md](HANDOFF.md)。该文件主体记录本地离线版，开头已说明公开版的入口和素材差异。历史离线使用与验证记录保留在 `internal/`，当前公开版验证见 [QA.md](QA.md)。

原课件、教材和题库图像的权利归原作者。KaTeX 0.16.11 许可证保存在 `assets/katex/LICENSE`。
