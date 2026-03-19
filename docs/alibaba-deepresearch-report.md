# Alibaba Tongyi DeepResearch 深度研究报告

## 一、项目概述：什么是 DeepResearch，它解决了什么问题？

**Tongyi DeepResearch**（通义深度研究）是阿里巴巴通义实验室（Tongyi Lab）开发的一个**智能体大语言模型（Agentic LLM）**，专门为**长周期、深层次信息检索和研究任务**（long-horizon, deep information-seeking research tasks）而设计。

该项目的核心模型 **Tongyi-DeepResearch-30B-A3B** 采用 **MoE（混合专家）架构**，总参数量 305 亿（30.5B），但每个 token 仅激活 33 亿（3.3B）参数，在极其高效的计算开销下实现了超越 OpenAI o3、DeepSeek-V3.1、Gemini DeepResearch 等商业闭源系统的性能。底座模型基于 **Qwen3-30B-A3B-Base**，上下文长度为 **128K tokens**。

### 它解决的核心问题

传统的信息检索方式（包括简单 RAG）面临两个关键挑战：

1. **认知窒息（Cognitive Suffocation）**：随着多轮搜索和推理的进行，上下文窗口被大量中间结果填满，导致模型无法有效聚焦于关键信息，推理能力急剧下降。
2. **噪声污染（Noise Pollution）**：从多个网页和搜索结果中积累的冗余和不相关信息干扰模型的判断。

DeepResearch 通过其创新的 **IterResearch**（迭代研究）范式，将复杂研究任务分解为多个离散的研究轮次，每轮重建一个精简的工作区（workspace），从而突破了传统方法的上下文长度瓶颈，使模型能够进行任意深度的探索。

---

## 二、核心架构与工作流程

### 2.1 双推理范式（Dual Inference Paradigms）

Tongyi DeepResearch 支持两种推理模式：

#### (1) ReAct 模式（标准模式）

采用经典的 **Thought-Action-Observation** 循环：
- **Thought**：模型思考下一步应该做什么
- **Action**：调用工具（搜索、访问网页、执行代码等）
- **Observation**：获取工具返回的结果

此模式用于严格评估模型的**内在能力（intrinsic capabilities）**，无需任何 prompt engineering。在 128K 上下文窗口内进行多轮迭代推理。

#### (2) IterResearch "Heavy" 模式（重型模式）——test-time scaling 策略

这是项目最核心的技术创新，采用**研究-综合（Research-Synthesis）**框架：

**并行研究阶段（Parallel Research Phase）**：
- 部署 n 个独立的研究 Agent（Research Agent），每个 Agent 通过不同的工具使用策略和推理路径探索问题
- 每个 Agent 使用 IterResearch 范式独立工作

**综合合成阶段（Integrative Synthesis Phase）**：
- 一个综合 Agent（Synthesis Agent）整合所有并行研究 Agent 的报告
- 产出最终的综合性答案

### 2.2 IterResearch 的核心机制——马尔可夫状态重建（Markovian State Reconstruction）

IterResearch 的关键设计思想是：**不保留完整历史，而是在每一步重建工作区**。

在每个时间步 t，Agent 的操作条件仅包含三个要素：
- **原始问题 q**：始终保持不变
- **演化报告 S_t（Evolving Report）**：作为压缩记忆（compressed memory），是前几轮研究结果的结构化摘要
- **最近一次交互的上下文**：即上一步的动作 a_t 和观察 o_t

这种设计的优势：
- **防止上下文溢出**：无论进行多少轮研究，工作区始终保持精简
- **支持任意深度探索**：理论上可以无限迭代
- **强制结构化推理**：要求 Agent 在每一步显式地综合和优先排序信息
- **有效去噪**：每轮只保留最关键的产出，丢弃冗余信息

### 2.3 迭代研究循环的完整流程

```
初始问题 q
    ↓
[第1轮] 构建工作区 → 思考 → 调用工具（搜索/访问/代码） → 获取结果 → 综合为报告 S₁
    ↓
[第2轮] 重建工作区(q + S₁ + 最新交互) → 思考 → 调用工具 → 获取结果 → 更新报告 S₂
    ↓
[第3轮] 重建工作区(q + S₂ + 最新交互) → 思考 → 调用工具 → 获取结果 → 更新报告 S₃
    ↓
  ... 持续迭代直到 Agent 判断信息足够 ...
    ↓
最终综合 → 输出答案
```

---

## 三、关键技术组件

### 3.1 工具体系（Action Space）

模型的行动空间包含五个核心工具：

| 工具 | 功能描述 |
|------|---------|
| **Search** | 执行 Google 网页搜索，返回 top-10 排名结果，支持多个查询同时执行（通过 Serper.dev API） |
| **Visit** | 从网页中提取目标信息，使用 Jina.ai 进行网页解析，并通过摘要模型提取关键内容 |
| **Python Interpreter** | 在沙箱环境中执行 Python 代码，用于数据分析和计算推理 |
| **Google Scholar** | 执行学术文献检索，获取学术出版物 |
| **File Parser** | 分析多种格式文件（PDF、DOCX、MP4 等），包括转录功能 |

### 3.2 训练流水线（Training Pipeline）——三阶段端到端框架

#### 第一阶段：智能体持续预训练（Agentic Continual Pre-Training, CPT）

- **AgentFounder 方案**：构建数据飞轮（data flywheel），利用后训练阶段的数据反哺预训练
- **实体锚定知识记忆（Entity-Anchored Knowledge Memory）**：将多源异构知识重组为实体的结构化表示
- 构建一阶和高阶动作合成数据（first-order and higher-order action synthesis data）
- 目的：扩展模型能力、保持知识新鲜度、强化推理性能

#### 第二阶段：监督微调（Supervised Fine-Tuning, SFT）

- 使用**拒绝采样（Rejection Sampling）**在 ReAct 和 IterResearch 框架下生成高质量轨迹
- 从类专家演示中引导初始能力（bootstrap initial capabilities）

#### 第三阶段：强化学习（Reinforcement Learning, RL）

采用定制化的 **GRPO（Group Relative Policy Optimization）** 算法：

- **严格在线策略（Strictly On-Policy）**训练
- **Token 级策略梯度损失（Token-Level Policy Gradient Loss）**
- **Leave-One-Out 方差缩减策略**：降低梯度估计的方差
- **保守负样本过滤（Conservative Negative Sample Filtering）**：防止"格式崩溃（format collapse）"现象
- **奖励信号**：二元（0/1）答案正确性，不使用格式奖励
- **异步 RL 框架**：步骤级异步训练循环，支持多个并行 Agent 实例

### 3.3 数据合成方法论

#### 后训练 QA 生成

1. **知识图谱构建**：通过随机游走和同构表格融合，从真实网站构建高度互联的知识图谱
2. **可控难度提升**：通过"可控原子操作"（controllable atomic operations）增加问题难度——包括实体合并和属性修改
3. **集合论形式化**：支持 QA 正确性的高效验证

#### PhD 级别问题引擎

- 自动化引擎生成需要多源推理的种子 QA 对
- **迭代复杂度升级**：前一轮的输出成为下一轮的输入，逐步提升问题难度
- 问题构造 Agent 使用网页搜索、学术检索和 Python 执行

### 3.4 基础设施组件

- **合成训练环境**：离线 Wikipedia 数据库搭配定制工具，替代实时 Web API，兼顾成本效益和一致性
- **统一工具沙箱**：支持并发请求处理、结果缓存、重试逻辑和冗余提供者回退，保证确定性和稳定性
- **自动数据策展**：动态调整训练集——移除已掌握的问题，加入新的挑战性问题

---

## 四、与简单 RAG 和单次查询搜索的本质区别

| 维度 | 简单 RAG / 单次搜索 | Tongyi DeepResearch |
|------|-------------------|---------------------|
| **搜索策略** | 单次查询，检索 top-k 文档 | 多轮迭代搜索，动态生成查询，策略性探索 |
| **推理深度** | 基于检索结果的一次性生成 | 多步推理，每轮综合-重建-再探索 |
| **上下文管理** | 简单拼接检索结果，易超出窗口 | 马尔可夫状态重建，每轮精简工作区，理论上可无限探索 |
| **噪声处理** | 无显式噪声过滤 | 每轮强制综合和优先级排序，有效去噪 |
| **工具使用** | 通常仅有检索器 | 五种工具协同：搜索、网页访问、代码执行、学术检索、文件解析 |
| **规划能力** | 无规划 | 自主规划多步研究策略，动态调整 |
| **冲突解决** | 无冲突处理 | 多源信息综合与冲突消解 |
| **训练方式** | 检索器+生成器独立训练或简单微调 | 端到端三阶段训练（CPT → SFT → RL），包含智能体交互数据 |
| **扩展性** | 固定计算量 | Heavy 模式支持 test-time scaling，通过并行 Agent 提升性能上限 |

核心差异总结：简单 RAG 是 **"检索-然后-生成"** 的管道式架构，而 DeepResearch 是一个**具有自主规划、迭代探索和结构化综合能力的完整研究智能体**。

---

## 五、评测结果与基准性能

### 5.1 主要基准测试成绩（ReAct 标准模式）

| 基准测试 | Tongyi DeepResearch | OpenAI o3 | 说明 |
|---------|---------------------|-----------|------|
| **Humanity's Last Exam (HLE)** | **32.9** | 24.9 | 学术推理能力，超越 o3 |
| **BrowseComp** | 43.4 | 49.7 | 复杂信息检索（接近 o3） |
| **BrowseComp-ZH** | **46.7** | - | 中文复杂信息检索 |
| **GAIA** | **70.9** | - | 通用 AI 助手能力 |
| **xbench-DeepSearch** | **75.0** | 67.0 | 用户中心的深度搜索评测，超越 o3 |
| **WebWalkerQA** | **72.2** | - | 网页导航问答 |
| **FRAMES** | **90.6** | 84.0 | 多源推理框架评测，超越 o3 |

### 5.2 Heavy 模式性能提升

| 基准测试 | ReAct 模式 | Heavy 模式 | 提升 |
|---------|-----------|-----------|------|
| Humanity's Last Exam | 32.9 | **38.3** | +5.4 |
| BrowseComp-ZH | 46.7 | **58.1** | +11.4 |

Heavy 模式通过并行多 Agent 探索和最终综合，在困难任务上显著提升了性能上限，验证了 test-time scaling 策略的有效性。

### 5.3 关键对比结论

- 在几乎所有评测基准上达到最高分，展现出跨英文和中文任务的强泛化能力
- 仅用 **3.3B 激活参数**（约为 o3 的十分之一规模）即超越多个闭源商业系统
- 被 VentureBeat 称为 AI Agent 领域的 **"DeepSeek 时刻"**

---

## 六、DeepSearch 与 DeepResearch 的关系

### 6.1 作为任务类别（Task Category）

- **DeepSearch（深度搜索）**：侧重于复杂信息检索任务，强调通过多步搜索找到特定的、难以直接获取的信息。对应的评测基准是 **xbench-DeepSearch**。
- **DeepResearch（深度研究）**：更广泛的概念，涵盖深度搜索在内的完整研究流程——包括问题分解、多步规划、迭代检索、多源综合、冲突消解和结构化报告生成。

### 6.2 作为产品功能（Product Feature）

- **Qwen DeepResearch**：阿里巴巴通义千问（Qwen）App 中的产品功能，提供 Normal 模式（高效通用）和 Advanced 模式（深度多步推理）。
- 这一产品功能背后的技术引擎正是 **Tongyi DeepResearch** 开源项目所代表的技术体系。

### 6.3 作为开源项目

GitHub 仓库 `Alibaba-NLP/DeepResearch` 是整个技术体系的开源实现，包含：
- 核心智能体框架（Agent/）
- 网页智能体能力（WebAgent/）
- 推理流水线（inference/）——支持 ReAct 和 Heavy 两种模式
- 评测脚本（evaluation/）

### 6.4 相关研究家族

该项目是一个更大的 Agent 研究计划的一部分，包含 18+ 篇相关论文，涵盖 WebWalker、WebDancer、WebSailor、WebShaper、WebWatcher、WebResearch、ReSum、WebWeaver 等系列工作。

---

## 七、已知局限性

1. **128K 上下文长度**对于极其复杂的长周期任务仍然不够充分
2. **规模验证不足**：训练流水线的可扩展性尚未在显著大于 30B 的基础模型上验证
3. **RL 效率**：需要通过部分 rollout 等技术进一步提升强化学习效率

---

## 参考资料

- [GitHub - Alibaba-NLP/DeepResearch](https://github.com/Alibaba-NLP/DeepResearch)
- [Tongyi DeepResearch Technical Report (arXiv:2510.24701)](https://arxiv.org/abs/2510.24701)
- [Tongyi DeepResearch: A New Era of Open-Source AI Researchers (Official Blog)](https://tongyi-agent.github.io/blog/introducing-tongyi-deep-research/)
- [HuggingFace Model Card - Tongyi-DeepResearch-30B-A3B](https://huggingface.co/Alibaba-NLP/Tongyi-DeepResearch-30B-A3B)
- [VentureBeat - The 'DeepSeek' moment for AI agents](https://venturebeat.com/ai/the-deepseek-moment-for-ai-agents-is-here-meet-alibabas-open-source-tongyi)
- [Qwen DeepResearch (Alibaba Cloud Blog)](https://www.alibabacloud.com/blog/qwen-deepresearch-when-inspiration-becomes-its-own-reason_602676)
- [xbench-DeepSearch Benchmark](https://xbench.org/agi/aisearch)
