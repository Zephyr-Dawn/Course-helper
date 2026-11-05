# 大学物理甲-II 互动复习讲义系统 (`physics-ii/`)

> **进度说明：仅进行到期中内容，历年题待补。**

面向浙江大学 **《大学物理甲-II》** 课程打造的高密度、零外网依赖、单文件离线互动复习网页。当前版本完整覆盖 **期中及之前全部教学内容（第 1～14 讲 / 第 9～14 章电磁学，原始汇总课件共 502 页 PDF）**，并已为后续期末内容（第 15 章电磁场与电磁波、几何光学、波动光学、量子物理基础）及历年真题卷预留无缝扩展接口。

---

## 1. 快速打开方式（100% 本地离线）
直接用任何现代浏览器（Chrome / Edge / Safari / Firefox）双击打开以下任一单文件 HTML（无需启动服务器，无需联网）：
- 项目根目录交付件：`../大学物理II-互动复习.html`
- 工程目录构建产物：`./index.html`

> **安全与离线保证**：所有 KaTeX 数学公式均在构建期预渲染为静态 HTML+MathML，所有 `.woff2` 数学字体与 `.webp` 课件裁剪配图均以 Base64 内嵌于单文件中，并启用严格 CSP（`default-src 'none'`），杜绝任何外部网络请求。

---

## 2. 当前覆盖范围（期中电磁学全卷：第 9～14 章）

| 章节 | 标题 | 对应课件讲次与 PDF 页码 | 核心内容模块 |
| :--- | :--- | :--- | :--- |
| **第 9 章** | 真空中的静电场 | 第 1～4 讲 · PDF p12–138 | 库仑定律、电偶极子、连续带电体场强叠加、高斯定理、环路定理、电势与电势梯度（8 节 + 2 实验 + 14 例题） |
| **第 10 章** | 静电场中的导体和电介质 | 第 4～7 讲 · PDF p139–238 | 导体静电平衡、平行板与接地屏蔽、电容器、电介质极化、有介质高斯定理($\vec{D}/\vec{E}/\vec{P}$)、静电场能量（7 节 + 2 实验 + 10 例题） |
| **第 11 章** | 稳恒电流 | 第 7～8 讲 · PDF p239–271 | 电流密度与连续性方程、欧姆定律微分形式、电动势、基尔霍夫定律(KCL/KVL)、惠斯通电桥与电子秤、RC 暂态过程（6 节 + 2 实验 + 6 例题） |
| **第 12 章** | 稳恒磁场 | 第 8～11 讲 · PDF p272–365 | 毕奥-萨伐尔定律、磁偶极矩、磁场高斯定理、安培环路定理、安培力与磁力矩、洛伦兹力与霍尔效应（6 节 + 2 实验 + 10 例题） |
| **第 13 章** | 磁场中的磁介质 | 第 11～12 讲 · PDF p366–404 | 顺磁与抗磁微观机制(拉莫尔进动)、磁化强度与磁化电流、有介质安培环路定理($\vec{H}/\vec{B}/\vec{M}$)、铁磁质磁滞回线与磁畴（4 节 + 2 实验 + 5 例题） |
| **第 14 章** | 电磁感应 | 第 12～14 讲 · PDF p405–502 | 法拉第定律与楞次定律、动生电动势、感生电动势(涡旋电场)与复合问题、自感与互感、RL 暂态与磁场能量（5 节 + 2 实验 + 13 例题） |

---

## 3. 目录结构与构建指令

```text
physics-ii/
├── build.py                  # 单文件离线 HTML 编译器（生成 index.html 与 ../大学物理II-互动复习.html）
├── build-manifest.json       # 构建统计清单与 SHA-256 校验值
├── docs/AUTHORING.md         # 章节/公式/配图/习题编写与排版规范
├── ERRATA.md                 # 原始 502 页 PDF 课件笔误、重号与易错陷阱勘误表
├── QA.md                     # 多层自动化校验与端到端质量门禁报告
├── assets/
│   ├── katex/                # 本地 KaTeX 引擎与 woff2 字体
│   ├── figs/                 # 从原版 PDF 精确裁剪的讲义配图 (F9-01.webp ~ F14-xx.webp)
│   └── ex/                   # 从原版 PDF 精确裁剪的例题配图 (EX09-01.webp ~ EX14-13.webp)
├── content/
│   ├── ch09.md ~ ch14.md     # 各章详尽讲义正文
│   ├── figures-ch09..14.json # 配图裁剪坐标与图注定义
│   ├── formulas-ch09..14.json# 人工精选核心公式卡片
│   ├── quiz-ch09..14.json    # 概念快测题库
│   └── exercises/ch09..14.json # 课堂例题与思考题独立精解
├── src/
│   ├── mdconv.py             # Markdown + Callout + KaTeX 保护转换器
│   ├── katex_render.cjs      # Node 构建期 KaTeX 批量预渲染脚本
│   ├── render_figures.py     # PyMuPDF 自动裁剪与页码遮罩脚本
│   ├── lint_content.py       # 零容忍内容、公式、引用与配图校验器
│   ├── models.js             # 12 组纯函数 SI 物理仿真数学模型
│   ├── labs.js               # 12 组互动物理实验室 SVG 视图与控制器
│   ├── app.js                # 路由、全文搜索(⌘K)、错题本、进度与打印引擎
│   ├── style.css             # 亮/暗双主题与响应式三栏/打印样式
│   └── shell.html            # 单页应用 HTML 骨架
└── tests/
    └── models.test.cjs       # 12 个物理模型独立单元测试
```

### 常用维护与构建命令
```bash
# 1. 运行 12 个物理模型单元测试
node physics-ii/tests/models.test.cjs

# 2. 渲染全部章节配图与例题图（支持指定单章，如 ch11）
.venv/bin/python physics-ii/src/render_figures.py --force

# 3. 运行内容与 KaTeX 零错误校验
.venv/bin/python physics-ii/src/lint_content.py

# 4. 构建生成单文件离线 HTML
.venv/bin/python physics-ii/build.py
```

---

## 4. 后续补充内容（期末章节与历年真题）扩展指南
当期中之后补充第 15 章（位移电流与麦克斯韦方程组）、光学、量子力学或历年真题 PDF 时：
1. 在 `build.py` 的 `CHAPTER_SPECS` 中追加 `ch15`、`ch16` 等章节元数据；
2. 按 `docs/AUTHORING.md` 规范新增 `content/ch15.md`、`figures-ch15.json`、`formulas-ch15.json`、`quiz-ch15.json`、`exercises/ch15.json`；
3. 运行 `render_figures.py`、`lint_content.py` 与 `build.py`，即可一键更新离线单文件并合入个人 `Course-helper` 仓库。
