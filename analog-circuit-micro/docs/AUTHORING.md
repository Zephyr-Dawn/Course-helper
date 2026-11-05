# 内容编写规范（讲义章节 + 习题核对）

本站：模拟电路下半学期离线复习网站。工作区根目录 `<工作区>`，源码在 `site/`。
Python 一律用 `python3`，在 `site/` 目录下运行。
**不要运行 `build.py`**（多人同时写 dist 会冲突），用 `src/lint_content.py` 自查。只改分配给你的文件。

## 1 范围与材料优先级

| 章 | 课堂讲义（主线，必须逐页读） | MIT 讲义（补充，次要） | EC2024 习题集 |
|---|---|---|---|
| 6 二极管 | `chap_6m 二极管.pdf`（32 页，key `ch06`） | `第06章_二极管_MIT讲义.pdf`（`mit06`） | diode |
| 7 三极管 | `chap_7m 三极管.pdf`（67 页，`ch07`） | `第07章_三极管_BJT_MIT讲义.pdf`（`mit07`） | bjt |
| 8 场效应管 | `chap_8m 场效应晶体管.pdf`（41 页，`ch08`）+ `chap_8m_补充.pdf`（41 页，`ch08s`） | `第08章_场效应晶体管_FET_MIT讲义.pdf`（`mit08`） | mosfet |
| 10 频率响应 | `chap_10m 频率响应.pdf`（73 页，`ch10`） | `第10章_频率响应_MIT讲义.pdf`（`mit10`） | freq |
| 11 反馈 | `chap_11m 反馈.pdf`（48 页，`ch11`）+ `chap_11m_补充.pdf`（16 页，`ch11s`） | `第11章_负反馈_MIT讲义.pdf`（`mit11`） | feedbak |
| 12 功放 | `chap_12m 功率放大器.pdf`（24 页，`ch12`） | （MIT 第 12 章仅 1 页，可忽略） | pa |

- 课堂讲义页面多为图片、文字提取很少。**必须看图**：`tmp/pages/<key>/pNNN.jpg`（单页，1008×756）和 `tmp/pages/<key>/sheet_*.jpg`（每张 4 页，先用 sheet 快速浏览，再看单页细节）。文字提取在 `tmp/pdfs/<PDF 文件名去后缀>.txt`（按 `===== PAGE n =====` 分页），MIT 讲义文字较全，可直接读 txt。
- 页码一律写 **PDF 物理页序（从 1 开始）**。幻灯片右下角印的数字通常比物理页小 1，不要用它。
- 排除 LTspice / 仿真软件操作内容。不推断考试年份或考频。
- MIT 讲义只用来补推导、条件和直观解释，并注明“补充”。符号以课堂讲义为准（如 $r_{be}$ 与 $r_\pi$ 的关系要说清）。

## 2 讲义章节 `content/chNN.md`

- 第一行 `# 第6章 二极管及其应用电路`（`# 第N章 标题`）。
- `## 6.1 标题` 为专题（每章约 8–14 个，覆盖讲义全部知识点），`###` 为小节。专题顺序决定 ID：第 k 个 `##` 是 `chNN-sKK`（如 `ch06-s03`），公式和快测的 `section` 字段用它。
- 每个核心专题要真正写出：解决什么问题；定义、符号、参考方向、单位；物理意义；从哪个定律出发的推导（关键变形写依据）；适用条件和失效情形；解题方法与步骤；代表例题（已知 → 列式 → 代入 → 结果 → 自检）；易错点；一句自检问题。每章至少 4 道完整例题（优先用课堂讲义例题，独立复算）。每章正文目标 10000–20000 字符（含 Markdown/TeX），不靠套话凑数。
- 写给本科生复习用：清楚、具体，名词第一次出现时解释。中文正文，保留英文术语（如 Early effect、Miller）。
- 数学：行内 `$...$`，独立 `$$...$$`（单独成段）。**公式里不放中文，不用 `\text{}`，不用 `\boxed`**；下标文字用 `\mathrm{}` 或直接字母，如 `V_{D(\mathrm{on})}`。表格内绝对值用 `\lvert x\rvert`，不要用 `|`。并联用 `\parallel` 或 `/\!/`。
- 提示框（单独成行开始与结束）：
  ```
  :::tip 要点标题      （tip 要点 / warn 易错 / note 说明 / example 例题 / check 自检 / derive 推导）
  内容（Markdown）
  :::
  ```
- 标记（单独一行）：`{{fig:F6-03}}` 放图；`{{lab:diode-iv}}` 放互动；`{{ex:CH06-KP2-05}}` 放一个相关 EC2024 习题链接（可同一行放多个）。每个专题末尾写一行来源：`*来源：chap_6m PDF p9–12；补充：MIT 第6章 p14–16*`。
- 可用互动 ID（每章选 2–4 个放到最相关的专题里，并在前后一句话说明要观察什么）：
  - 第 6 章：`diode-iv`（指数伏安、每十倍电流电压差、r_d）、`diode-loadline`（负载线，指数模型 vs 恒压降）、`rectifier`（半波/全波/桥式 + 电容滤波纹波）、`clipper`（限幅与钳位波形）、`zener`（齐纳稳压与最小负载）
  - 第 7 章：`bjt-output`（输出特性曲线族 + 直流负载线 + 工作区）、`bjt-bias`（分压偏置 Q 点对 β 的敏感度）、`bjt-amp`（CE/CC/CB 增益、输入输出电阻）
  - 第 8 章：`mos-iv`（平方律、工作区、λ）、`mos-amp`（CS/CD/CG 小信号参数）
  - 第 10 章：`bode`（极点零点波特图，精确 vs 渐近）、`miller`（密勒近似 vs 开路时间常数）、`lowfreq`（耦合/旁路电容的低频极点）
  - 第 11 章：`fb-gain`（Af、灵敏度、带宽扩展）、`fb-impedance`（四种组态输入输出电阻）、`fb-stability`（相位裕度、增益裕度）
  - 第 12 章：`pa-efficiency`（甲类/乙类功率与效率）、`crossover`（交越失真与甲乙类偏置）

## 3 讲义配图 `content/figures-chNN.json`

每章 12–25 幅，覆盖关键电路、特性曲线、等效模型、波形、例题电路。图必须紧邻讲它的文字，并与文字中的拓扑、参数、方向一致（例题图就配那道例题，不拿“同类图”顶替）。

```json
[{"id": "F6-01", "pdf": "ch06", "page": 6, "crop": [0.05, 0.15, 0.62, 0.95],
  "caption": "实际二极管伏安特性：正向导通、反向截止与反向击穿区", "alt": "二极管伏安特性曲线"}]
```

- `id` 为 `F<章号>-<两位序号>`；`pdf` 是第 1 节表中的 key；`page` 是 PDF 物理页；`crop` 是相对页面宽高的归一化坐标 `[x0,y0,x1,y1]`，只框图（尽量不带页眉标题和页码，可带图中必要标注）。
- 渲染：`python3 src/render_figures.py chNN --force`，输出 `assets/figs/<id>.webp`。**渲染后必须打开图片看一遍**，确认没有裁断、没有多余内容、内容与图注一致，不对就改 crop 重渲染。
- caption 可含行内数学；`sourceLabel` 由脚本自动生成，不要手写。

## 4 重点公式 `content/formulas-chNN.json`（每章 5–9 组，人工精选）

只收反复用到的通用关系，合并同类式；不收数值算例和推导中间式。

```json
[{"id": "KF6-01", "section": "ch06-s02", "title": "二极管指数模型与热电压",
  "tex": "i_D = I_S\\left(e^{v_D/(nV_T)}-1\\right),\\quad V_T=\\frac{kT}{q}",
  "use": "由电压求电流；反解 $v_D = nV_T\\ln(i_D/I_S)$ 由电流求电压。",
  "conditions": "正偏和小反偏；不含击穿区；$n$ 取 1~2，室温 $V_T\\approx 26\\,\\mathrm{mV}$。",
  "pitfall": "电流每变 10 倍，电压只变 $nV_T\\ln 10\\approx 60n\\,\\mathrm{mV}$，不要按线性估算。"}]
```

## 5 概念快测 `content/quiz-chNN.json`（每章 4–6 题）

```json
[{"id": "Q6-01", "section": "ch06-s04", "question": "...", "options": ["...", "...", "...", "..."], "correct": 2,
  "explanation": "为什么对、其余为什么错。"}]
```
`correct` 从 0 开始。每题针对一个易混概念，不出纯计算题。

## 6 习题核对 `content/exercises/<set>.review.json`

题目已由 `src/parse_ec2024.py` 从 EC2024 网站源码转成 `content/exercises/<set>.json`（字段 `question`、`answer` 为原题与原参考答案，`images` 为题图，图片在 `assets/ec2024/<images[i]>`）。**不要改 `<set>.json`**。对每道题写一条核对记录：

```json
{"CH06-KP2-03": {
  "verdict": "ok",
  "difficulty": 2,
  "hints": ["先假设两个二极管都导通，验证电流方向。"],
  "solution": "分步解析（Markdown + 数学）。计算题必须有；选择/填空题原答案只有字母或结论时也要写理由。",
  "check": "一种不同于主推导的校验：回代 KCL/KVL、极限、功率守恒、量纲等。",
  "final": "仅在 verdict=corrected 时写正确答案。",
  "note": "原答案的问题、题面歧义或你采用的假设。",
  "tags": ["恒压降模型", "假设-验证法"]}}
```

- `verdict`：`ok` 独立复算与原答案一致；`corrected` 原答案错误或缺项（必须写 `final` 和 `note` 说明差异）；`note` 答案对但需补充条件/近似说明；`unclear` 题图或题面无法确定（`note` 说明缺什么），不要猜。
- **先看题图再做**：打开 `assets/ec2024/` 下的图片核对拓扑、极性、元件值。独立列式计算，再与原答案比较；舍入差异（末位）不算错，但在 `note` 里写精确值。
- `difficulty`：1 基础 / 2 进阶 / 3 挑战。`hints` 1–2 条，逐级，不直接给答案。
- 数学规则同第 2 节（公式里不放中文、不用 `\text{}`）。JSON 中反斜杠要写成 `\\`。
- 自查：`python3 src/lint_content.py ex:<set>`，必须 `OK`。

## 7 自查与交付

- 讲义：`.venv/bin/python src/lint_content.py chNN` 必须输出 `OK`（检查 KaTeX、标记、图是否渲染、公式/快测字段和 section 是否存在）。
- 交付时报告：专题列表、字符数、图数、公式/快测数、用到的互动；源讲义中你发现的疑点或错误（页码 + 说明）；未完成项。
