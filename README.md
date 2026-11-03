# Course Helper｜课程复习

课程复习网站与可维护源码。每门课程在独立目录中组织，复变函数与积分变换位于 `complex-functions/`。

- 网站首页：GitHub Pages 的仓库根路径。
- 复变函数：`complex-functions/`，包含七章正文、五份近年卷解析、公式速查、概念自检与原PDF来源。
- 新课程可新增同级目录，并在根目录 `index.html` 添加入口。
- 分支 `complex-functions` 用于复变函数的独立维护；将变更合并到发布分支后才会更新网站。

复变函数重建：在 `complex-functions/` 安装 `requirements.txt` 后运行 `python -X utf8 build.py`，再把生成的 `复变函数与积分变换-全面复习.html` 复制为同目录 `index.html`。原 PDF 保留于 `assets/sources/`，题面/讲义内容和所附版权声明归原作者。

浏览器学习记录保存在本地。离线文件与在线网站的来源不同，迁移学习记录请在“收藏与记录”中导出并导入。

