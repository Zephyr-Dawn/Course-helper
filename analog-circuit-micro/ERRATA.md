# 勘误与源材料疑点

页码为 PDF 物理页序（从 1 开始；幻灯片右下角印的页码通常比物理页小 1）。网页正文已按下列结论讲解，并在相应位置用“易错/说明”框标注。

## 习题勘误（EC2024 原参考答案）

核对结果：191 题中 156 题一致（ok），29 题答案正确但需补充说明（note），5 题已勘误（corrected），1 题存疑（unclear）。下表只列 corrected（原答案错误或缺项）与 unclear（题面/题图无法确定）；note（答案对但需补条件）见网页“核对结论”。

| 题号 | 结论 | 本站结论（摘要） |
|---|---|---|
| CH07-KP3-10 | 已勘误 | 题面未要求估算，按戴维南等效精确计算：$V_{BB}=2.94\,\mathrm{V}$，$R_B=R_{B1}\parallel R_{B2}=29.4\,\mathrm{k\Omega}$，$I_{BQ}=\dfrac{V_{BB}-0.7}{R_B+(\beta+1)R_E}\approx16.4\,\mathrm{\mu A}$，$I_{CQ}\approx0.82\,\mathrm{mA}$，$V_{CEQ}\approx7.… |
| CH08-KP3-08 | 已勘误 | $R_S=7\,\mathrm{k\Omega}$；$1\,\mathrm{k\Omega}\le R_D\le11\,\mathrm{k\Omega}$（原答案只给出上限 $R_D\le11\,\mathrm{k\Omega}$，缺下限 $R_D\ge1\,\mathrm{k\Omega}$）。 |
| CH09-KP2-08 | 存疑 | 题图中集电极接 $A_1$ 的反相端、分压点接同相端。$V_2$ 上升 → $I_B$ 增大 → $I_C$ 增大 → $V_C$ 下降 → $A_1$ 差模输入变大 → $V_2$ 继续上升，经三极管形成正反馈，虚短在图示接法下不成立（$A_1$ 会饱和）。原答案假设 $A_1$ 工作在线性区、$V_C=V_{CC}/2$，这只有在 $A_1$ 两输入端对调（集电极接同相端，负反馈）时才成立。无法确定是原题图画反还是原意如此，故判 u… |
| CH10-KP3-09 | 已勘误 | (1) $R_E\approx0.42\,\mathrm{k\Omega}$（忽略 $I_B$ 时 $0.43\,\mathrm{k\Omega}$），$A_{vs}\approx-38$；(2) $f_L\approx2.8\,\mathrm{kHz}$，$f\to0$ 时信号相对中频超前 $180^\circ$（总相位约 $0^\circ$），不是 $270^\circ$；(3) $f_H\approx387\,\mathrm{kH… |
| CH11-KP2-08 | 已勘误 | (1) 电压串联负反馈。(2) 开环 $A=173.9$，$F=0.1$，$1+AF=18.4$。闭环电压增益 $v_o/v_i=A/(1+AF)=9.46$（深度负反馈近似为 10），$R_{in}=\infty$，$R_{out}=R_o/(1+AF)=5\,\mathrm{k\Omega}/18.4\approx 0.27\,\mathrm{k\Omega}$。 |
| CH13-KP1-01 | 已勘误 | （a）$A_v\approx-86\ \mathrm{V/V}$（原答案 $-193.3$ 把射随器增益取为 $1$，不成立；若只计一只射随器则约 $-78$）。（b）电压并联负反馈，$R_f$ 接 $v_o$ 与 $Q_1$ 基极之间。（c）$R_f=20\,\mathrm{k}\Omega$。（d）$P_L=6.25\,\mathrm{W}$，$\eta=65.4\%$，$Q_4$、$Q_5$ 各 $1.65\,\mathrm{W}… |

## 课堂讲义疑点（按章）

| 章 | 页 | 疑点 | 本站处理 |
|---|---|---|---|
| 7 | chap_7m p38 | 放大区 $v_{CB}>-0.4$ 与饱和区 $v_{CB}<-0.3$ 在 $(-0.4,-0.3)\,\mathrm{V}$ 重叠 | 注明为工程近似，统一取 $V_{CB}>-0.4\,\mathrm{V}$ |
| 7 | chap_7m p58 | $h_{21}$ 下标写成 $V_{BE}$ | 按 p57 与推导应为 $V_{CE}$ |
| 7 | chap_7m p63 | 方法 2 末式 $R_i/R_L$ 写反 | 应为 $R_L/R_i$ |
| 8 | chap_8m p9/13/15/26 | 阈值电压 $V_t$、$V_{tn}$、$v_{tn}$ 混用 | 正文统一写 $V_t$ |
| 8 | chap_8m p39–40 | cascode $A_v=-g_{m1}R_D$ 未注明忽略 $r_o$；$R_{out}$ 式不含 $R_D$ | 补条件；总输出电阻再并 $R_D$ |
| 8 | chap_8m_补充 p32 | PMOS 加电条件未区分 $\lvert V_{tp}\rvert$ | 改用 $\lvert V_{tp}\rvert$ |
| 10 | chap_10m p25 | $R=100\,\Omega$、$C=1\,\mu\mathrm{F}$ 时 $\omega_n$ 写成 $1000\,\mathrm{rad/s}$ | 应为 $10^4\,\mathrm{rad/s}$ |
| 10 | chap_10m p27–28 | $H=H_1H_2H_2$ | 应为 $H_1H_2H_3$ |
| 10 | chap_10m p16–17 | 标题“RC 无源带通/带阻”，电路含 L | 按 RLC 讲 |
| 10 | chap_10m p49 | $C_S$ 的转折频率记作 $\omega_{LCe}$ | 应为 $\omega_{LCs}$ |
| 10 | chap_10m p52 | 开路时间常数法参考文献写成 Short-Circuit | 应为 Open-Circuit |
| 10 | chap_10m p56 | $\beta$ 相位式缺负号 | $\varphi=-\arctan(\omega/\omega_\beta)$ |
| 11 | chap_11m p41/43 | 增益裕度 25 dB、临界 60 dB 为折线近似 | 精确约 26.7 dB、58.3 dB（数值解） |
| 11 | chap_11m p44 | 小节号“12.3.4” | 应为 11.3.4 |
| 11 | chap_11m p45 | “最大附加相移 −135°、裕度 45°”未计第三极点 | 数值解约 −141°，PM≈47° |
| 11 | chap_11m_补充 p16 | 电流并联 $A_{vf}=A_fR_L/R_s$ 缺负号，与 p10 不一致 | 在同一 $I_o$ 方向下统一符号 |
| 12 | chap_12m p13/p16 | 交越死区图标 ±0.5 V，文字写 ±0.7 V | 说明二者都是示意值 |
| 12 | chap_12m p19 | $r_e$ 被说成“输出电阻”；“$R_O<R_L$”应为 $R_O\ll R_L$；输出电阻近似常数需 $\lvert i_L\rvert\ll 2I_Q$ | 给出 $R_O=V_T/\sqrt{i_L^2+4I_Q^2}$ |
| 12 | chap_12m p22 | 只画 $Q_1$ 侧限流 | 说明 $Q_2$ 侧对称 |

## 解析器修正

`src/parse_ec2024.py` 曾把被删除线划掉的可选题图片并入上一题（CH06-KP2-22、CH07-KP3-13 的答案图），已修正。
