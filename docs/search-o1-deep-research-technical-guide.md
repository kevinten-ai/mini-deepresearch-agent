# Search-o1 与 DeepSearch/DeepResearch 技术深度解析

> 培训文档 | Workshop 7 参考资料
> 基于 2025-2026 年前沿研究整理

---

## 目录

1. [Search-o1 概述与论文介绍](#1-search-o1-概述与论文介绍)
2. [Search-o1 核心方法论与架构](#2-search-o1-核心方法论与架构)
3. [搜索与推理的结合机制](#3-搜索与推理的结合机制)
4. [相较于前序工作的关键创新](#4-相较于前序工作的关键创新)
5. [评测基准与实验结果](#5-评测基准与实验结果)
6. [DeepResearch 生态中的定位](#6-deepresearch-生态中的定位)
7. [阿里云 AI 搜索 DeepSearch 技术实践](#7-阿里云-ai-搜索-deepsearch-技术实践)
8. [相关框架对比: Search-o1 vs Search-R1 vs R1-Searcher](#8-相关框架对比-search-o1-vs-search-r1-vs-r1-searcher)
9. [参考资料](#9-参考资料)

---

## 1. Search-o1 概述与论文介绍

### 1.1 论文基本信息

- **论文标题**: Search-o1: Agentic Search-Enhanced Large Reasoning Models
- **arXiv 编号**: 2501.05366
- **发表会议**: EMNLP 2025 主会议 (Main Conference)
- **提交日期**: 2025 年 1 月 9 日
- **作者**: 李小溪 (Xiaoxi Li)、董冠廷 (Guanting Dong)、金嘉杰 (Jiajie Jin)、张雨遥 (Yuyao Zhang)、周宇佳 (Yujia Zhou)、朱宇涛 (Yutao Zhu)、张佩天 (Peitian Zhang)、窦志成 (Zhicheng Dou)
- **作者单位**: 中国人民大学 (主要)、清华大学
- **开源地址**: https://github.com/RUC-NLPIR/Search-o1
- **许可证**: MIT License

### 1.2 研究背景与问题定义

以 OpenAI o1 为代表的**大型推理模型 (Large Reasoning Models, LRMs)** 展现了卓越的长链推理能力，能够通过逐步推理 (Chain-of-Thought) 解决复杂问题。然而，LRMs 在长链推理过程中存在一个关键缺陷: **知识不足 (Knowledge Insufficiency)**。

具体表现为:
- 在推理过程中频繁产生不确定性表达 (如 "perhaps"、"maybe")
- 初步实验表明，QwQ-32B 在 GPQA 基准上平均每条推理链中出现 30 次以上不确定性标记
- 知识缺口导致推理错误累积，最终影响答案正确性

传统的检索增强生成 (RAG) 方法在此场景下效果有限:
- **标准 RAG**: 仅在推理前进行一次检索，无法应对推理过程中动态出现的知识需求
- **简单文档插入**: 直接将检索到的原始文档插入推理链会破坏推理连贯性，引入大量噪声

### 1.3 核心目标

Search-o1 的目标是: **将外部知识检索无缝集成到 LRM 的推理过程中，在填补知识缺口的同时保持推理链的连贯性和逻辑一致性。**

---

## 2. Search-o1 核心方法论与架构

Search-o1 由两个核心组件构成: **Agentic RAG 机制** 和 **Reason-in-Documents 模块**。

### 2.1 Agentic RAG 机制 (智能体式检索增强生成)

与传统 RAG 的"先检索、后生成"模式不同，Agentic RAG 将检索行为**嵌入推理过程本身**，使模型能够在推理过程中自主决定何时需要外部知识。

**工作流程:**

```
推理生成过程中:
  ┌─────────────────────────────────────────────────────┐
  │ 模型正常进行推理生成                                    │
  │    ↓                                                 │
  │ 遇到知识不确定点                                       │
  │    ↓                                                 │
  │ 生成 <|begin_search_query|> 搜索关键词 <|end_search_query|>  │
  │    ↓                                                 │
  │ 系统检测到搜索触发标记                                   │
  │    ↓                                                 │
  │ 执行外部搜索，获取 top-k 文档                            │
  │    ↓                                                 │
  │ 将结果注入 <|begin_search_result|> ... <|end_search_result|> │
  │    ↓                                                 │
  │ 继续推理生成 (可能再次触发搜索)                           │
  └─────────────────────────────────────────────────────┘
```

**关键设计特点:**
- **自主触发**: 模型学会在需要时主动生成搜索查询，无需外部规则判断
- **多次迭代**: 在一次推理会话中可多次触发检索，满足不同推理步骤的知识需求
- **实时集成**: 检索结果实时注入推理上下文，不中断推理流程

**搜索查询生成的概率表示:**

$$P(q_{search}^{(i)} | I, q, \mathcal{R}^{(i-1)}) = \prod P(q_{search,t}^{(i)} | \text{前序 token}, \text{指令}, \text{问题}, \text{已有推理})$$

其中 $I$ 为指令，$q$ 为原始问题，$\mathcal{R}^{(i-1)}$ 为前序推理链。

### 2.2 Reason-in-Documents 模块 (文档内推理)

直接将检索到的原始文档插入推理链会带来两个问题:
1. **冗余性**: 检索文档包含大量与当前推理步骤无关的信息
2. **长上下文退化**: LRMs 在处理超长文档时推理性能会显著下降

Reason-in-Documents 模块通过两阶段处理解决这些问题:

**第一阶段 -- 中间分析 (Intermediate Analysis, r_docs):**
- 基于检索到的文档进行深度分析
- 同时考虑当前搜索查询和已有推理步骤
- 提取与推理需求直接相关的关键信息

**第二阶段 -- 知识精炼 (Knowledge Refinement, r_final):**
- 将第一阶段提取的信息进一步精炼
- 生成简洁、相关的知识片段
- 确保精炼后的信息能够**无缝衔接**到已有推理链中

**整体效果:** 将冗长的检索文档转化为精炼的推理步骤，既补充了所需知识，又保持了推理链的逻辑连贯性。

### 2.3 批量推理与并行检索

框架支持**批量生成 + 交替搜索**模式:
- 同时处理多个推理序列
- 统一检测各序列中的搜索查询
- 批量执行检索操作
- 将结果分别注入各推理链

这种设计显著提升了推理效率，适合大规模评测场景。

---

## 3. 搜索与推理的结合机制

### 3.1 推理过程中的动态知识补充

Search-o1 的核心创新在于将搜索行为视为推理的**内在组成部分**，而非外部预处理步骤。

传统方法与 Search-o1 的对比:

| 方法 | 搜索时机 | 搜索次数 | 知识注入方式 | 推理连贯性 |
|------|---------|---------|------------|-----------|
| 标准 RAG | 推理前 | 1次 | 上下文拼接 | 不影响 |
| Agentic RAG | 推理中 | 多次 | 原始文档插入 | 受损 |
| **Search-o1** | 推理中 | 多次 | 精炼后无缝集成 | **保持** |

### 3.2 具体示例

以 GPQA 中关于"反式肉桂醛 (trans-Cinnamaldehyde) 结构"的问题为例:

**(a) 直接推理 (无搜索):**
```
推理过程: "trans-Cinnamaldehyde 的结构是... 我不太确定具体的分子构型..."
→ 因知识不足导致推理错误
```

**(b) Agentic RAG (无 Reason-in-Documents):**
```
推理过程: "让我搜索 trans-Cinnamaldehyde..."
→ 插入大量原始文档 (可能数千字)
→ 推理链被打断，模型难以从噪声中提取关键信息
```

**(c) Search-o1 (完整方案):**
```
推理过程: "让我搜索 trans-Cinnamaldehyde..."
→ 检索文档经 Reason-in-Documents 精炼
→ 注入精炼后的知识: "trans-Cinnamaldehyde 为 C6H5CH=CHCHO，含苯环和共轭烯醛结构"
→ 推理链自然延续，基于准确知识继续推导
```

### 3.3 搜索触发的自适应性

模型并非机械地触发搜索，而是根据推理需求自适应决策:
- 对于模型内化的知识 (如基础数学公式)，不会触发搜索
- 对于专业领域的具体事实 (如特定化学物质的性质)，会主动触发搜索
- 搜索查询的措辞会根据推理上下文自动调整，确保检索精准性

---

## 4. 相较于前序工作的关键创新

### 4.1 首创: 将 Agentic Search 集成到 o1 式推理过程

Search-o1 是**第一个将智能体式搜索工作流集成到 o1 式推理过程中的框架**。此前的工作要么在推理前一次性检索 (标准 RAG)，要么使用 ReAct 等框架实现多轮交互但缺乏对检索结果的精炼处理。

### 4.2 Reason-in-Documents: 知识精炼而非简单注入

这是 Search-o1 最核心的创新。传统方法直接将检索文档插入上下文，带来以下问题:
- 上下文长度急剧膨胀
- 噪声信息干扰推理
- 推理链逻辑断裂

Reason-in-Documents 通过专门的分析和精炼步骤，将原始文档转化为与推理链高度契合的知识片段，这一设计直接解决了上述三个问题。

### 4.3 关键发现: 推理模型 vs 普通 LLM

论文中一个重要发现: **普通 LLM 使用 Agentic RAG 的效果与标准 RAG 基本持平，甚至在数学和代码任务上性能下降**。只有推理模型 (如 QwQ-32B) 才能真正从推理过程中的动态检索中获益。

这表明 Agentic Search 的效果并非来自"多搜几次"，而是来自推理模型能够**在推理过程中识别知识缺口并有针对性地补充知识**这一能力。

### 4.4 批量推理效率

通过批量生成和集体检索的设计，Search-o1 在保持高质量推理的同时具备了良好的效率和可扩展性。

---

## 5. 评测基准与实验结果

### 5.1 基础模型

- **主模型**: QwQ-32B-Preview (通义千问推理模型)
- **对比基线**: Qwen2.5-32B、Qwen2.5-72B、Llama3.3-70B 等

### 5.2 复杂推理任务

#### GPQA Diamond (博士级科学问答, 198 题)

| 方法 | 总分 | 物理 | 化学 | 生物 |
|------|-----|------|------|------|
| Qwen2.5-32B (直接推理) | 45.5% | - | - | - |
| QwQ-32B (直接推理) | 58.1% | - | - | - |
| RAG-QwQ-32B | 58.6% | - | - | - |
| RAgent-QwQ-32B | 61.6% | - | - | - |
| **Search-o1** | **63.6%** | **77.9%** | **47.3%** | **78.9%** |

> 对比人类专家 (GPQA Extended Set, 546 题): Search-o1 达到 57.9%，与领域物理学家持平 (57.9%)，在生物学上超过人类专家 (69.5% vs 68.9%)。

#### 数学任务

| 方法 | MATH500 | AMC2023 | AIME2024 |
|------|---------|---------|----------|
| QwQ-32B (直接推理) | 83.2% | - | - |
| **Search-o1** | **86.4%** | **85.0%** | **56.7%** |

#### 代码任务 (LiveCodeBench)

| 方法 | 总分 | Easy | Medium |
|------|-----|------|--------|
| **Search-o1** | **33.0%** | **32.4%** | **20.4%** |

### 5.3 开放域问答任务

#### 单跳问答

| 方法 | NQ (EM) | TriviaQA (EM) |
|------|---------|---------------|
| **Search-o1** | **34.0%** | **63.4%** |

#### 多跳问答

| 方法 | HotpotQA | 2WikiMHQA | MuSiQue | Bamboogle |
|------|----------|-----------|---------|-----------|
| RAgent-QwQ-32B | 43.0% | 58.4% | 13.6% | - |
| **Search-o1** | **45.2%** | 58.0% | **16.6%** | **56.0%** |

### 5.4 关键结论

1. **Search-o1 在五个复杂推理任务上平均优于 RAgent 4.7%**
2. **在多跳问答上的提升尤为明显**，证明多次迭代检索对复杂推理的价值
3. **单跳问答上变化不大**，说明该框架更适合复杂、多步推理场景
4. **化学领域仍有差距**: 47.3% 远低于人类化学专家 72.6%，反映出某些专业领域仍需更强的知识覆盖

---

## 6. DeepResearch 生态中的定位

### 6.1 三层技术演进

AI 搜索领域经历了三个阶段的演进:

```
阶段 1: Web Search + LLM (RAG)    阶段 2: DeepSearch           阶段 3: Deep ReSearch
==========================        ====================         ========================
单次查询                           多次查询                      多轮迭代
单次检索                           查询分解与改写                  搜索-分析-发现缺口-再搜索
直接生成                           结果重排序                      智能体架构
无结果推理                         更好的答案 + 引用               综合研究报告
秒级响应                           秒级到分钟级                    分钟到数十分钟
无状态                             基本无状态                      有状态 + 知识图谱
                                                                自我反思与缺口分析
```

### 6.2 Search-o1 的独特定位

Search-o1 在这三层架构中占据了一个**独特的交叉位置**:

- **它不是传统的 DeepSearch**: 因为它不仅仅是多次查询和结果重排序
- **它也不是完整的 Deep ReSearch**: 因为它的目标不是生成研究报告，而是提升推理准确性
- **它是"推理增强搜索"的代表**: 将搜索作为推理过程的内在组件，而非独立的信息检索系统

### 6.3 DeepSearch 是 DeepResearch 的构建模块

在技术生态中，DeepSearch 是 DeepResearch 的核心引擎:
- **DeepSearch** 负责: 迭代搜索、深度阅读、信息提取
- **DeepResearch** 在此基础上增加: 结构化规划、多章节报告生成、跨源综合、引用管理

Search-o1 可以被视为 DeepSearch 的一种**学术级实现**，专注于在推理链中精准补充知识，为后续构建完整的 DeepResearch 系统提供了核心技术基础。

### 6.4 与主流产品的关系

| 系统 | 类型 | 与 Search-o1 的关系 |
|------|------|-------------------|
| OpenAI Deep Research | 商业产品 | 基于 o3 模型的完整深度研究系统，Search-o1 可视为其核心推理-搜索交互机制的学术验证 |
| Google Gemini Deep Research | 商业产品 | 类似理念，但架构差异较大 |
| Alibaba Tongyi DeepResearch | 开源系统 | 完整的三阶段训练 (Agentic CPT + SFT + RL)，比 Search-o1 更全面 |
| Jina DeepSearch | 开源工具 | 侧重于快速精确搜索，与 Search-o1 目标相近 |
| Search-R1 | 开源框架 | 采用强化学习训练搜索策略，与 Search-o1 互补 |

---

## 7. 阿里云 AI 搜索 DeepSearch 技术实践

### 7.1 技术演进路线

阿里云 OpenSearch 自 2023 年推出 LLM 版以来，历经两年迭代:

**RAG 1.0 (基础单次检索):**
- 流程: 一次检索 + 一次阅读 + 一次推理
- 适用场景: 简单事实类问题
- 局限: 信息召回不全，难以处理复杂多跳问题

**RAG 1.5 (ReAct 过渡方案):**
- 引入推理 + 行动框架，支持多轮交互
- 局限: 推理与生成耦合、上下文膨胀、Agent 调优困难

**RAG 2.0 (DeepSearch 多智能体系统):**
- 核心理念: 通过多个专业化 Agent 协同工作，实现"规划--搜索--阅读--反思"的闭环迭代
- 将单 Agent 系统 (Agentic RAG 1.0) 升级为多 Agent 系统 (Agentic RAG 2.0)

### 7.2 多 Agent 架构设计

DeepSearch 采用 **Multi-Agent + 分层控制** 架构，包含四个 (控制台版六个) 专业化子 Agent:

#### (1) 问题规划 Agent -- "系统的大脑"
- **全局计划生成**: 针对用户问题生成高层次、可执行的推理路径 (Plan)
- **显式终止机制**: 通过预设工具明确结束条件，防止无限循环
- **全局 memory 更新**: 每轮迭代后汇总信息并反思
- **深度激发机制**: 防止模型"偷懒"，确保充分探索
- **操作约束机制**: 限制重复使用相同工具或参数
- **反思重试机制**: 失败时自动分析错误原因并调整策略
- **结构化输出规范**: 强制模型遵循指令格式

#### (2) 澄清 Agent -- "意图翻译官"
- 针对模糊问题进行意图澄清
- 强依赖客户领域知识库，精准识别语义
- 通过主动追问消除歧义

#### (3) 搜索 Agent -- "信息侦察兵"

支持三种数据源混合检索:
- **LLM 版知识库**: 完整离线处理，召回精度最高
- **用户外挂 ES 库**: 快速接入已有数据
- **联网数据**: 补充私有知识盲区

支持多种检索方式:
- 文本检索、向量检索、混合检索
- NL2SQL 结构化查询
- Graph 知识图谱查询
- 联网搜索优化

信息筛选能力:
- 过滤无关片段
- 使用 LLM 提取关键信息
- 返回精简、结构化上下文

#### (4) 总结 Agent -- "最终编辑者"
- 支持多种大模型 (Qwen、DeepSeek 等)
- 多格式优化: 图片、表格、图表等展现形式
- 中英文语言输出专门优化
- 自定义 Prompt 支持
- 识别闲聊请求，提升服务效率

### 7.3 核心技术配置

**关键参数:**
- `enable_deep_search`: 控制深度搜索启用状态 (默认 true)
- `think_process`: 是否返回推理过程
- `max_think_round`: 思考轮数 (最大 20 轮，默认 10 轮)
- `language`: 输出语言 (AUTO/CN/EN)

**响应事件序列:** THINK -> ACTION -> ANSWER -> SUMMARY

**平均延迟:** 约 34 秒 (包含多轮推理)，支持流式返回结果

### 7.4 性能评估数据

#### 多跳问答召回率对比 (full hit)

| 数据集 | 方法 | 平均搜索深度 | 召回率 |
|--------|------|------------|--------|
| hotpotQA_2hop | 单次召回 (RAG 1.0) | 1 | 42% |
| hotpotQA_2hop | **DeepSearch** | 4.77 | **86%** |
| musique_3hop | 单次召回 (RAG 1.0) | 1 | 2% |
| musique_3hop | **DeepSearch** | 9.14 | **59%** |

关键发现:
- **问题复杂度越高，DeepSearch 优势越明显**
- 三跳及以上问题中远超传统方法
- xBench-DeepSearch 基准上仅使用搜索工具达到 **63%** (5 轮均值) 的最优效果

#### 与传统搜索的核心差异

| 维度 | 深度搜索 (DeepSearch) | 传统 AI 搜索 |
|------|---------------------|-------------|
| 理解能力 | 上下文推理与意图识别 | 语义/关键词检索 |
| 响应模式 | 主动追问细节约束条件 | 被动接受原始提问 |
| 数据来源 | 支持跨平台聚合 | 依赖单一数据源 |
| 知识密度 | 多篇参考文献标注 | 仅 3-5 个数据段 |
| 交互深度 | 支持多轮专业对话 | 会话轮数影响显著 |

### 7.5 与 Search-o1 的技术对比

| 维度 | Search-o1 | 阿里云 DeepSearch |
|------|-----------|-----------------|
| 定位 | 学术研究框架 | 企业级产品 |
| 架构 | 单模型 + 检索模块 | 多 Agent 协作系统 |
| 搜索触发 | 推理链中自主触发 | 规划 Agent 统一调度 |
| 知识处理 | Reason-in-Documents 精炼 | 搜索 Agent 信息筛选 |
| 评测重点 | 科学/数学/代码推理 | 企业知识问答 |
| 数据源 | Bing + Jina API | LLM 知识库 + ES + 联网 |
| 部署形态 | 开源代码 | 云服务 (OpenSearch) |

---

## 8. 相关框架对比: Search-o1 vs Search-R1 vs R1-Searcher

在 2025 年初，涌现了多个将搜索与推理结合的框架。以下是三个代表性工作的对比:

### 8.1 核心方法论对比

| 维度 | Search-o1 | Search-R1 | R1-Searcher |
|------|-----------|-----------|-------------|
| **论文** | arXiv:2501.05366 | arXiv:2503.09516 | arXiv:2503.05592 |
| **会议** | EMNLP 2025 | COLM 2025 | - |
| **核心方法** | Agentic RAG + Reason-in-Documents | RL 训练搜索-推理交错 | 两阶段 RL |
| **训练方式** | 未明确说明 (推理时方法) | GRPO/PPO (强化学习) | 两阶段 GRPO |
| **搜索触发** | 特殊 token 自主触发 | RL 学习的搜索策略 | 分阶段学习触发时机 |
| **关键创新** | 文档内推理精炼 | 检索 token 掩码技术 | 解耦检索学习与利用 |

### 8.2 技术细节对比

**Search-o1 搜索标记:**
```
<|begin_search_query|> 搜索内容 <|end_search_query|>
<|begin_search_result|> 检索结果 <|end_search_result|>
```

**Search-R1 搜索标记:**
```
<search> 搜索查询 </search>
<information> 检索内容 </information>
```

**R1-Searcher 搜索标记:**
```
<|begin_of_query|> JSON 格式搜索请求 <|end_of_query|>
```

### 8.3 各自优势

- **Search-o1**: 专注于解决检索文档冗余问题，通过 Reason-in-Documents 保持推理链连贯性，适合学术研究和复现
- **Search-R1**: 端到端 RL 训练搜索策略，检索 token 掩码保证训练稳定性，性能提升显著 (Qwen2.5-7B 提升 41%)
- **R1-Searcher**: 阶段化设计更直观，清晰解耦学习目标，易于调试优化

### 8.4 共同启示

三个框架共同验证了一个核心结论: **让 LLM 在推理过程中自主学习何时搜索、如何搜索，比静态的 RAG 预检索策略更加有效**。这为构建 DeepResearch 系统提供了坚实的理论和实践基础。

---

## 9. 参考资料

### 核心论文

- [Search-o1: Agentic Search-Enhanced Large Reasoning Models](https://arxiv.org/abs/2501.05366) (EMNLP 2025)
- [Search-R1: Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning](https://arxiv.org/abs/2503.09516) (COLM 2025)
- [R1-Searcher: Incentivizing the Search Capability in LLMs via Reinforcement Learning](https://arxiv.org/abs/2503.05592)

### 开源代码

- [RUC-NLPIR/Search-o1](https://github.com/RUC-NLPIR/Search-o1) -- Search-o1 官方实现
- [PeterGriffinJin/Search-R1](https://github.com/PeterGriffinJin/Search-R1) -- Search-R1 官方实现
- [Alibaba-NLP/DeepResearch](https://github.com/Alibaba-NLP/DeepResearch) -- 阿里通义 DeepResearch

### 阿里云技术资料

- [阿里云 AI 搜索 DeepSearch 技术实践](https://developer.aliyun.com/article/1689040) -- 阿里云开发者社区
- [深度搜索功能原理实践指南](https://help.aliyun.com/zh/open-search/llm-intelligent-q-a-version/deep-search-practice-tutorial) -- OpenSearch 官方文档

### 综述与分析

- [DeepSearch 与 DeepResearch 的设计和实现](https://blog.csdn.net/Datawhale/article/details/146031161)
- [DeepResearch 系列 (Search-R1、Search-o1、R1-Searcher) 对比](https://blog.csdn.net/qq_35812205/article/details/146484812)
- [From Web Search towards Agentic Deep Research](https://arxiv.org/abs/2506.18959) -- 12 家学术机构联合综述
- [万字长文深度解析最新 Deep Research 技术](https://zhuanlan.zhihu.com/p/1972258410557862481)

### 行业产品

- [OpenAI Deep Research](https://openai.com/index/introducing-deep-research/)
- [Google Gemini Deep Research](https://ai.google.dev/gemini-api/docs/deep-research)
- [Jina DeepSearch](https://jina.ai/deepsearch/)
