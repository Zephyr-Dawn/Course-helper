# Course Helper｜课程复习

每门课程放在独立目录，在同名分支维护；`main` 汇总通过验证的课程版本并作为 GitHub Pages 发布源。

| 课程 | 在线入口 | 维护分支 |
|---|---|---|
| 复变函数与积分变换 | [打开课程](https://zephyr-dawn.github.io/Course-helper/complex-functions/) | `complex-functions` |
| 电子电路基础 | [打开课程](https://zephyr-dawn.github.io/Course-helper/analog-circuit/) | `analog-circuit` |
| 模拟电路（下半学期） | [打开课程](https://zephyr-dawn.github.io/Course-helper/analog-circuit-micro/) | `analog-circuit-micro` |

[课程总入口](https://zephyr-dawn.github.io/Course-helper/)。后续课程新增同级目录并在首页添加入口。

公开版保留讲义、题面与独立解析、必要电路图、精选公式和学习记录。原始讲义与试卷 PDF/PPT、整页课件截图和本地完整离线包另行保留，不发布到仓库。

维护时进入课程目录安装 `requirements.txt` 并运行构建；具体命令见各课程 README。电子电路基础直接生成 `analog-circuit/index.html`；模拟电路（下半学期）用 `python3 build.py --out index.html` 生成 `analog-circuit-micro/index.html`；其余课程遵循各自构建说明。通过检查后将课程分支同步到 `main`，Pages 自动更新。

浏览器记录保存在本地；在线站点与本地 HTML 之间可通过“收藏与记录”导出、导入 JSON 迁移。
