# From Web Search to Deep ReSearch: A Technical Overview of AI-Powered Search Evolution

> Training document for Workshop 6 & 7: DeepResearch Agent
> Last updated based on research through early 2026

---

## Table of Contents

1. [Traditional Web Search with AI](#1-traditional-web-search-with-ai)
2. [DeepSearch: Beyond Single-Query Retrieval](#2-deepsearch-beyond-single-query-retrieval)
3. [Deep ReSearch: Iterative Research Agents](#3-deep-research-iterative-research-agents)
4. [Key Open-Source Implementations](#4-key-open-source-implementations)
5. [Evaluation Benchmarks](#5-evaluation-benchmarks)
6. [References and Further Reading](#6-references-and-further-reading)

---

## 1. Traditional Web Search with AI

### 1.1 The Basic RAG (Retrieval-Augmented Generation) Paradigm

The foundational approach to integrating LLMs with search is **Retrieval-Augmented Generation (RAG)**, introduced by Lewis et al. (2020). The standard RAG pipeline operates in four stages:

1. **Indexing**: Text from web pages or documents is converted into numerical vector embeddings and stored in a vector database.
2. **Retrieval**: Given a user query, the system retrieves the most relevant document chunks based on vector similarity (semantic search) or keyword matching (lexical search), often using hybrid approaches.
3. **Augmentation**: Retrieved documents are injected into the LLM's prompt as additional context.
4. **Generation**: The LLM generates a response grounded in both its parametric knowledge and the retrieved context.

This is a **single-turn, single-query** architecture: one query goes in, one set of results comes back, and one answer is generated.

### 1.2 Industry Examples of AI + Web Search

**Perplexity AI** is the canonical example of a production RAG-based answer engine. Its architecture includes:

- **Vespa.ai** as the retrieval backend, combining real-time indexing, hybrid retrieval (vector + lexical), and advanced ranking.
- **Vector search** using semantic embeddings to match intent rather than keywords.
- **Model-agnostic orchestration**: Perplexity's competitive advantage is not any single LLM, but its proprietary orchestration layer that manages interactions between open-source and closed-source models.
- **Strict grounding principle**: "You are not supposed to say anything that you didn't retrieve." Every claim includes inline citations linking back to source documents.

**Google AI Overviews** integrates Gemini models directly into Google Search results to provide synthesized answers atop traditional search results, using Google's existing search index as the retrieval layer.

### 1.3 Limitations of Single-Query RAG

Traditional RAG suffers from several well-documented limitations:

| Limitation | Description |
|---|---|
| **Low Precision** | Retrieved chunks may not align well with the query's actual intent |
| **Low Recall** | A single query often fails to retrieve all relevant information |
| **Vocabulary Mismatch** | Users ask about "PTO policy" but documents reference "time off" or "leave allowance" |
| **No Iterative Refinement** | The system cannot follow up on incomplete or ambiguous initial results |
| **Information Overload / Redundancy** | When multiple passages are retrieved, reconciling conflicting or redundant information is challenging |
| **Over-reliance on Retrieved Content** | The model may simply restate retrieved content rather than reasoning over it |
| **Outdated Information** | Retrieved content may be stale, leading to hallucinations despite RAG's intended purpose |
| **Single-Perspective** | One query captures one angle; complex questions require multiple perspectives |

These limitations motivate the evolution toward multi-step, agentic search paradigms.

---

## 2. DeepSearch: Beyond Single-Query Retrieval

### 2.1 What Defines "DeepSearch"?

**DeepSearch** represents the intermediate step between basic RAG and full autonomous research. The core idea: instead of issuing a single query and generating from those results, the system executes **multiple search steps** with **query transformation** and **result analysis** between steps.

Think of it as: a basic RAG system is a student who looks up one reference and writes their answer. DeepSearch is a skilled librarian who finds the best and most relevant books using multiple search strategies, cross-references them, and surfaces the most relevant passages.

Key characteristics of DeepSearch:

- **Multi-query execution**: A single user question may trigger 5-20 search queries.
- **Query decomposition**: Complex questions are broken into simpler sub-questions.
- **Query reformulation**: If initial results are insufficient, queries are rewritten from different angles.
- **Result re-ranking and filtering**: Retrieved results are analyzed and ranked by relevance before generation.
- **Dynamic retrieval depth**: The system decides when it has "enough" information.

### 2.2 Query Transformation Techniques

The evolution from single-query to multi-query search relies on several query transformation strategies:

**Multi-Query Rewriting**: Generates multiple reformulations of the original query from different perspectives to improve retrieval recall. Example: "What causes climate change?" might become:
- "greenhouse gas emissions global warming mechanism"
- "human activities contributing to climate change"
- "natural vs anthropogenic factors climate change"

**Sub-Query Decomposition**: Breaks complex questions into independent, answerable sub-questions. Example: "Compare the economic impact of renewable energy adoption in Germany and China" decomposes into:
- "Economic impact of renewable energy in Germany"
- "Economic impact of renewable energy in China"
- "Renewable energy adoption rate Germany vs China"

**Step-Back Prompting**: Generates a more abstract or fundamental version of the query to retrieve broader context before addressing specifics. Example: "Why did the 2008 financial crisis happen?" steps back to "What are the common causes of financial crises?"

**Decomposition + Interpretation**: Research shows that decomposition alone is insufficient. Adding semantic interpretation to each sub-query significantly improves retrieval by providing semantic grounding, reducing lexical mismatch, and enabling more complete coverage of multi-faceted queries.

### 2.3 Major DeepSearch Implementations

#### Google Gemini Deep Research (December 2024)

Google kicked off the "deep research race" by launching Gemini Deep Research in December 2024. The system:

- Uses a **multi-stage process**: planning, searching, reading, and reasoning in an autonomous loop.
- Is powered by **Gemini models** (initially 1.5, later upgraded through the Gemini 2.x and 3.x series).
- Produces **detailed, cited reports** by navigating complex information landscapes via web search.
- Later evolved into **Gemini Deep Think** (May 2025 at Google I/O), the first publicly available multi-agent model that spawns multiple AI agents to tackle a question in parallel.
- Deep Think achieved 48.4% on Humanity's Last Exam (without tools) and 84.6% on ARC-AGI-2.

#### OpenAI Deep Research (February 2025)

OpenAI launched Deep Research in February 2025, powered by a specialized version of the **o3 model** optimized for web browsing and data analysis:

- **Training method**: End-to-end reinforcement learning on complex browsing and reasoning tasks. The model was placed in simulated research environments with access to tools and given real-world tasks requiring multi-step problem solving.
- **Architecture**: Follows the **Plan-Act-Observe** loop from the ReAct paradigm.
- **Key capability**: Maintains extended chains of thought (sometimes hundreds of steps) without diverging or hallucinating, achieved through special training that optimized the model to stay on task through many intermediate steps.
- **Tool integration**: Can agentically use and combine every tool within ChatGPT -- web search, Python for data analysis, visual input reasoning, and image generation.
- **Private chain of thought**: Uses what OpenAI calls a "private chain of thought" enabling planning ahead and reasoning through tasks.
- Uses a **second custom-prompted o3-mini model** to summarize chains of thought for user presentation.
- As of April 2025, a lightweight version powered by **o4-mini** was introduced for cost efficiency.
- As of July 2025, Deep Research gained access to a **visual browser** as part of ChatGPT agent.

#### DeepSeek R1 with Search (January 2025)

DeepSeek R1, released January 2025, was notable as the **first reasoning model to successfully integrate web search** without compromising analytical capabilities:

- Adapts ChatGPT's proven RAG methodology for reasoning models.
- Combines **initial index lookup with selective real-time crawling**, mirroring human research behavior.
- Shows transparent reasoning traces so users can see why certain sources were chosen and how credibility was evaluated.
- Available on Perplexity as a Pro Search reasoning mode alongside OpenAI o1.

#### Perplexity Deep Research

Perplexity introduced its own Deep Research feature using a customized version of the open-source **DeepSeek R1 model**, combining Perplexity's proven retrieval infrastructure with reasoning capabilities.

### 2.4 How DeepSearch Improves Upon Basic RAG

| Dimension | Basic RAG | DeepSearch |
|---|---|---|
| Queries per request | 1 | 5-20+ |
| Query strategy | Single pass | Decompose, reformulate, step-back |
| Retrieval depth | Fixed | Dynamic, based on information sufficiency |
| Result processing | Direct injection | Re-rank, filter, cross-reference |
| Reasoning | Generate from context | Analyze, identify gaps, reason over results |
| Output | Direct answer | Answer with synthesis and citations |

---

## 3. Deep ReSearch: Iterative Research Agents

### 3.1 What Makes It "Research" vs Just "Search"?

The transition from "DeepSearch" to "Deep ReSearch" represents a fundamental architectural shift. As one analysis puts it: Deep Search is a skilled librarian who quickly finds the best and most relevant books for you. Deep Research is a diligent scientist who reads all those books and then generates new insights or a summary from them.

Key differentiators:

| Aspect | DeepSearch | Deep ReSearch |
|---|---|---|
| **Goal** | Find the best answer | Produce a comprehensive research report |
| **Duration** | Seconds to low minutes | Minutes to tens of minutes |
| **Architecture** | Enhanced retrieval pipeline | Autonomous agent with loop |
| **Iteration** | Multi-query, single pass | Multi-round: search, analyze, identify gaps, search again |
| **Output** | Synthesized answer | Structured, cited report with sections |
| **Memory** | Stateless across queries | Maintains state across iterations |
| **Self-reflection** | Minimal | Active gap analysis and strategy adjustment |

### 3.2 The Iterative Reasoning Loop

The core architecture of a Deep ReSearch agent follows an iterative **Think-Act-Observe** loop:

```
User Query
    |
    v
[PLAN] -- Decompose query into research plan with sub-questions
    |
    v
+---> [THINK] -- Analyze current knowledge state, identify gaps
|         |
|         v
|     [ACT] -- Execute search queries, read pages, run code
|         |
|         v
|     [OBSERVE] -- Process results, extract key evidence
|         |
|         v
|     [EVALUATE] -- Is the research sufficient? Are there gaps?
|         |
|         +--- NO (gaps identified) ---> reformulate queries --+
|                                                               |
+---------------------------------------------------------------+
          |
          YES (sufficient)
          |
          v
    [SYNTHESIZE] -- Generate structured report with citations
          |
          v
    Final Report
```

At each iteration:

1. **The agent updates its working query** based on newly retrieved information or internal reasoning.
2. **Query planners dynamically guide retrieval** by formulating novel sub-questions targeted at identified information gaps.
3. **Conditioning on both global and local memory states**, the system disallows previously issued sub-questions to mitigate over-planning and redundant retrieval.
4. **The line of investigation evolves dynamically**, making each iteration an opportunity to refine understanding and discover new angles.

### 3.3 Agent-Based Architecture

Modern Deep ReSearch implementations typically use a **multi-agent architecture**:

**Supervisor / Orchestrator Agent**:
- Manages the overall research plan and progress.
- Decides when to delegate sub-tasks and when to synthesize.
- Tracks which sub-questions have been answered and which gaps remain.

**Research Sub-Agents**:
- Dedicated to specific sub-topics or sub-questions.
- Each operates within its own context window, avoiding context pollution.
- Can use different tools and strategies depending on the sub-task.

**Knowledge Gap Agent**:
- Analyzes current research state and identifies what is missing.
- Formulates follow-up questions that uncover missing context, implicit assumptions, or areas requiring further investigation.
- Ensures the system does not just restate what is already present but highlights what needs to be explored further.

**Tool Selector Agent**:
- Determines which tools (web search, document reader, code executor, scholar search) to use for addressing specific knowledge gaps.

### 3.4 Memory and Context Management

Context management is one of the hardest engineering challenges in Deep ReSearch, because the accumulated information across many search iterations can easily exceed any model's context window. Key strategies include:

**Hierarchical Memory**:
- **Working Memory**: Current iteration's active context -- the sub-question being investigated, retrieved documents, intermediate reasoning.
- **Short-Term Memory**: Summaries of recent iterations, key findings so far.
- **Long-Term Memory**: The accumulated knowledge graph, all extracted facts with source attributions.

**Incremental Knowledge Graphs**: Each iteration extends newly found relationships and entities into a structured knowledge representation, enabling deduplication and conflict detection.

**State Persistence**: Each iteration's data, summaries, and reasoned outputs are stored with timestamps and version IDs. Agents save intermediate states for replay or auditing.

**Context Window Isolation**: In multi-agent architectures (like LangChain's Open Deep Research), sub-topic research is isolated into dedicated context windows. This prevents context pollution and allows each sub-agent to focus on its specific research thread before results are synthesized at the supervisor level.

### 3.5 Report Generation and Synthesis

The final synthesis phase transforms accumulated research into a structured output:

**Structure Control**: Planning-based generation and constraint-guided decoding produce reports with hierarchical organization (sections, subsections, bullet points).

**Evidence Integration**: The system weaves evidence from heterogeneous sources (web pages, PDFs, tables, charts) into a coherent narrative.

**Conflict Resolution**: When sources disagree, the system must manage conflicts and uncertainty, often presenting multiple viewpoints with source attribution.

**Grounded Citation Generation**: Accurate, verifiable inline citations link each synthesized claim to specific retrieved documents. This is typically enforced through explicit prompting and post-processing validation.

**Factual Integrity**: Faithful modeling grounds generation in relevant evidence, and conflict reasoning enforces consistency across retrieved sources.

---

## 4. Key Open-Source Implementations

### 4.1 Alibaba Tongyi DeepResearch

**Repository**: https://github.com/Alibaba-NLP/DeepResearch
**Paper**: [Tongyi DeepResearch Technical Report](https://arxiv.org/abs/2510.24701) (arXiv:2510.24701)

This is the leading open-source Deep Research agent, developed by Alibaba's Tongyi team.

#### Model Architecture

- **Base model**: Qwen3-30B-A3B-Base (Mixture of Experts architecture)
- **Total parameters**: 30.5 billion
- **Activated parameters per token**: 3.3 billion (MoE efficiency -- small-model inference cost, large-model capacity)
- **Context window**: 128K tokens for long-horizon rollouts with evidence accumulation

#### Training Framework (Three-Stage)

The key innovation is introducing **agentic mid-training** as a bridge between pre-training and post-training:

**Stage 1 -- Agentic Continual Pre-Training (Agentic CPT)**:
- Two-stage mid-training phase.
- Goal: Endow the base model with strong inductive bias for agentic behavior while preserving broad linguistic competence.
- Powered by a fully automatic, scalable data synthesis pipeline (no costly human annotation).

**Stage 2 -- Supervised Fine-Tuning (SFT)**:
- Standard instruction tuning on curated agentic task demonstrations.

**Stage 3 -- Reinforcement Learning (RL) with GRPO**:
- Algorithm: Adapted **Group Relative Policy Optimization (GRPO)** with:
  - Token-level policy gradients
  - Leave-one-out advantage estimation
  - Selective negative-sample filtering for stability
  - Clip-higher strategy for exploration
  - Binary reward signals for correctness
  - Strict on-policy training
- **Custom asynchronous rollout framework**: Parallel agent instances interact with environments simultaneously.
- **Three environment types**:
  - *Prior World Environment*: Stability from pre-trained knowledge
  - *Simulated Environment*: Controlled interactions for safe exploration
  - *Real-world Environment*: Authentic feedback via Google Search, web parsing, Python interpreter, Google Scholar

#### Tool / Action Space

The model natively uses five tools:
- `Search` -- web search queries
- `Visit` -- read/parse a specific URL
- `Python` -- execute code for data analysis
- `Scholar` -- academic paper search
- `File Parser` -- extract content from uploaded documents

#### Dual Inference Paradigm

- **Native ReAct**: For intrinsic tool-use evaluation (standard agent loop).
- **IterResearch "Heavy"**: Test-time scaling mode for deeper multi-round synthesis.

#### Performance (as of November 2025)

| Benchmark | Score |
|---|---|
| Humanity's Last Exam | 32.9 |
| BrowseComp | 43.4 |
| BrowseComp-ZH | 46.7 |
| WebWalkerQA | 72.2 |
| GAIA | 70.9 |
| xbench-DeepSearch | 75.0 |
| FRAMES | 90.6 |

These scores outperform strong baselines including OpenAI-o3 and DeepSeek-V3.1 on multiple benchmarks.

### 4.2 Search-o1

**Repository**: https://github.com/RUC-NLPIR/Search-o1
**Paper**: [Search-o1: Agentic Search-Enhanced Large Reasoning Models](https://arxiv.org/abs/2501.05366) (EMNLP 2025)

Search-o1 addresses a specific problem: Large Reasoning Models (like OpenAI o1) have impressive chain-of-thought reasoning but suffer from **knowledge insufficiency** during extended reasoning, leading to uncertainties and errors.

#### Architecture -- Two Core Components

**Component 1: Agentic RAG Integration**
- The model is trained to **actively decode search queries** when it encounters knowledge gaps during reasoning.
- This triggers a retrieval mechanism to obtain relevant external knowledge in real-time.
- Unlike post-hoc RAG (retrieve then generate), the search is embedded **within the reasoning chain itself**.

**Component 2: Reason-in-Documents Module**
- Raw retrieved documents are not injected directly (which would break coherence).
- Instead, this module **condenses retrieved documents into focused reasoning steps** that integrate external knowledge while maintaining the logical flow of the main reasoning chain.
- It considers: (a) the current search query, (b) retrieved documents, and (c) the existing reasoning chain, to generate coherent continuation steps.

#### Key Insight

The agentic mechanism enables the model to dynamically and efficiently incorporate external knowledge while maintaining coherence and relevance of the reasoning process, avoiding information overload from excessive or irrelevant retrieval results. This is distinct from Deep ReSearch systems that produce reports -- Search-o1 is focused on **improving reasoning accuracy** by filling knowledge gaps in real-time.

#### Evaluation

Demonstrated strong performance across:
- Complex reasoning tasks in science, mathematics, and coding
- Six open-domain QA benchmarks

### 4.3 Stanford STORM

**Repository**: https://github.com/stanford-oval/storm
**Paper**: [Assisting in Writing Wikipedia-like Articles From Scratch with Large Language Models](https://arxiv.org/abs/2402.14207) (NAACL 2024)

STORM (Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking) is a pioneering system for automated research report generation, predating the "Deep Research" branding.

#### Methodology

**Phase 1 -- Perspective Discovery**: Survey existing articles on similar topics to discover diverse research perspectives.

**Phase 2 -- Simulated Conversations**: For each perspective, simulate a conversation between a Wikipedia writer and a topic expert grounded in Internet sources. This enables the LLM to:
- Update its understanding of the topic iteratively
- Ask follow-up questions based on previous answers
- Cover the topic from multiple angles

**Phase 3 -- Outline Curation**: Organize the collected information from all simulated conversations into a structured outline.

**Phase 4 -- Article Generation**: Generate a full-length, cited article following the outline.

#### Significance

STORM was a key precursor to modern Deep ReSearch systems. Its insight -- that multi-perspective question asking produces better research than single-perspective querying -- directly influenced subsequent architectures. Stanford later optimized STORM end-to-end using DSPy, addressing earlier shortcomings of haphazard prompt engineering.

### 4.4 Open Deep Search (ODS)

**Paper**: [Open Deep Search: Democratizing Search with Open-source Reasoning Agents](https://arxiv.org/abs/2503.20201)

ODS aims to close the gap between proprietary solutions (Perplexity Sonar Reasoning Pro, OpenAI GPT-4o Search Preview) and open-source alternatives.

#### Architecture -- Two Components

1. **Open Search Tool**: An open-source search infrastructure layer.
2. **Open Reasoning Agent**: Augments reasoning capabilities of open-source LLMs (like DeepSeek-R1) with the ability to judiciously use web search tools.

#### Performance

Together with DeepSeek-R1, ODS nearly matches and sometimes surpasses proprietary baselines on SimpleQA and FRAMES benchmarks.

### 4.5 Jina DeepSearch / node-DeepResearch

**Repository**: https://github.com/jina-ai/node-DeepResearch
**Product**: https://jina.ai/deepsearch/

Jina launched their open-source `node-DeepResearch` on the same day as Google and OpenAI's Deep Research releases (February 2025).

#### Key Characteristics

- **Iterative search-read-reason loop**: Keeps searching, reading web pages, and reasoning until it finds the answer or exceeds the token budget.
- **Focused on precise answers**: Unlike OpenAI and Gemini (which generate long reports), Jina DeepSearch is optimized for quick, precise answers from deep web search.
- **ReaderLM-v2** (1.54B parameters): Specialized model for high-quality HTML-to-Markdown conversion, critical for processing complex web pages.
- **Flexible LLM backend**: Works with Gemini, OpenAI, or local LLMs for the reasoning component.
- **100% open source, self-hostable**.

### 4.6 LangChain Open Deep Research

**Repository**: https://github.com/langchain-ai/open_deep_research
**Released**: July 2025

#### Architecture

Built on **LangGraph's StateGraph abstraction**, it implements a **supervisor architecture**:

- A supervisor agent coordinates multiple research sub-agents.
- Sub-topic research is isolated into dedicated context windows to prevent context pollution.
- Findings are synthesized at the supervisor level into coherent reports.

#### Key Features

- **Flexibility**: Supports different research strategies depending on the request.
- **Tool-agnostic**: Default Tavily search API, but supports full MCP compatibility and native web search for Anthropic and OpenAI.
- **Model-agnostic**: Works with any LLM backend.
- **Production-grade**: Deployable locally or on LangGraph Platform.
- Ranked **#6 on the Deep Research Bench Leaderboard** under MIT license.

### 4.7 Hugging Face Open Deep Research (smolagents)

**Repository**: https://github.com/huggingface/smolagents
**Blog**: [Open-source DeepResearch -- Freeing our search agents](https://huggingface.co/blog/open-deep-research)

#### Framework

- **Code-First Agents**: `CodeAgent` writes its actions in code to invoke tools or perform computations, enabling natural composability.
- **Sandboxed execution**: Supports Blaxel, E2B, Modal, Docker, or Pyodide+Deno WebAssembly sandbox.
- **Model-agnostic**: Works with local transformers, ollama, OpenAI, Anthropic via LiteLLM.
- **Multi-Agent Systems**: Supports multiple agents interacting and collaborating on complex tasks.

### 4.8 Other Notable Implementations

| Project | Description |
|---|---|
| **ManuSearch** | Multi-agent framework for transparent deep search in LLMs (arxiv:2505.18105) |
| **deep-searcher** (Zilliz) | Open-source Deep Research alternative for reasoning and searching on private data |
| **qx-labs/agents-deep-research** | Iterative deep research using the OpenAI Agents SDK |
| **Jan-Nano** | Open-source DeepSearch agent with public checkpoints |
| **R1-Searcher** | Open-source deep search agent |
| **ZeroSearch** | Open-source deep search agent |

---

## 5. Evaluation Benchmarks

The field has converged on several benchmarks for evaluating deep search and deep research systems:

| Benchmark | What It Measures |
|---|---|
| **Humanity's Last Exam** | Extremely hard questions across all domains |
| **BrowseComp / BrowseComp-ZH** | Ability to find specific information by browsing the web |
| **GAIA** | General AI Assistant benchmark -- multi-step reasoning with tools |
| **FRAMES** | Factual retrieval and multi-step reasoning |
| **SimpleQA** | Straightforward factual question answering |
| **WebWalkerQA** | Web navigation and information extraction |
| **ARC-AGI-2** | Abstract reasoning capabilities |
| **xbench-DeepSearch** | Dedicated deep search evaluation |
| **Deep Research Bench** | Comprehensive deep research leaderboard |

Evaluation frameworks include:
- **RACE**: Targets assessment of report generation quality.
- **FACT**: Focuses on evaluating information retrieval and citation accuracy.
- **DeepResearchEval**: Automated framework for deep research task construction and agentic evaluation.
- **RESEARCHRUBRICS**: Benchmark of prompts and rubrics for evaluating deep research output quality.

---

## 6. References and Further Reading

### Survey Papers

- [A Comprehensive Survey of Deep Research: Systems, Methodologies, and Challenges](https://arxiv.org/pdf/2506.12594) (June 2025)
- [Deep Research: A Survey of Autonomous Research Agents](https://arxiv.org/pdf/2508.12752) (August 2025)
- [A Survey of LLM-based Deep Search Agents: Paradigm, Optimization, Evaluation, and Challenges](https://arxiv.org/html/2508.05668v3) (August 2025)
- [Deep Research: A Systematic Survey](https://www.preprints.org/manuscript/202511.2077) (November 2025)

### Key Technical Papers

- [Search-o1: Agentic Search-Enhanced Large Reasoning Models](https://arxiv.org/abs/2501.05366) -- Search-o1 (EMNLP 2025)
- [Tongyi DeepResearch Technical Report](https://arxiv.org/abs/2510.24701) -- Alibaba (October 2025)
- [Open Deep Search: Democratizing Search with Open-source Reasoning Agents](https://arxiv.org/abs/2503.20201) -- ODS (March 2025)
- [STORM: Synthesis of Topic Outlines through Retrieval and Multi-perspective Question Asking](https://arxiv.org/abs/2402.14207) -- Stanford (NAACL 2024)
- [AgentIR: Reasoning-Aware Retrieval for Deep Research Agents](https://arxiv.org/html/2603.04384v2) -- (2026)
- [Beyond the Limitation of a Single Query: Train Your LLM](https://arxiv.org/pdf/2510.10009) -- (October 2025)
- [How Far Are We from Genuinely Useful Deep Research Agents?](https://arxiv.org/pdf/2512.01948) -- OPPO AI (December 2025)

### System Cards and Official Documentation

- [OpenAI Deep Research System Card](https://cdn.openai.com/deep-research-system-card.pdf) (February 2025)
- [OpenAI Deep Research API Guide](https://platform.openai.com/docs/guides/deep-research)
- [Google Gemini Deep Research Agent API](https://ai.google.dev/gemini-api/docs/deep-research)

### Blog Posts and Analysis

- [The Differences between Deep Research, Deep Research, and Deep Research](https://leehanchung.github.io/blogs/2025/02/26/deep-research/) -- Lee Han Chung
- [Search vs Deepsearch vs Deep Research](https://www.glukhov.org/post/2025/05/search-vs-deepsearch-vs-deep-research) -- Rost Glukhov
- [How OpenAI's Deep Research Works](https://blog.promptlayer.com/how-deep-research-works/) -- PromptLayer
- [A Practical Guide to Implementing DeepSearch/DeepResearch](https://jina.ai/news/a-practical-guide-to-implementing-deepsearch-deepresearch/) -- Jina AI
- [Open Deep Research](https://blog.langchain.com/open-deep-research/) -- LangChain
- [Multi-Agent Deep Research Architecture](https://trilogyai.substack.com/p/multi-agent-deep-research-architecture) -- Trilogy AI
- [How Perplexity Built an AI Google](https://blog.bytebytego.com/p/how-perplexity-built-an-ai-google) -- ByteByteGo
- [AI-Powered Deep Search Tools 2025: Evolution, Trends & Future Impact](https://guptadeepak.com/the-evolution-and-impact-of-ai-powered-deep-search-tools-in-2025/)

### Open-Source Repositories

- [Alibaba-NLP/DeepResearch](https://github.com/Alibaba-NLP/DeepResearch) -- Tongyi DeepResearch
- [RUC-NLPIR/Search-o1](https://github.com/RUC-NLPIR/Search-o1) -- Search-o1
- [stanford-oval/storm](https://github.com/stanford-oval/storm) -- STORM
- [jina-ai/node-DeepResearch](https://github.com/jina-ai/node-DeepResearch) -- Jina DeepSearch
- [langchain-ai/open_deep_research](https://github.com/langchain-ai/open_deep_research) -- LangChain Open Deep Research
- [huggingface/smolagents](https://github.com/huggingface/smolagents) -- HuggingFace smolagents
- [zilliztech/deep-searcher](https://github.com/zilliztech/deep-searcher) -- Zilliz Deep Searcher

---

## Summary: The Three-Stage Evolution

```
Stage 1: Web Search + LLM (RAG)          Stage 2: DeepSearch              Stage 3: Deep ReSearch
================================          ======================           ========================
Single query                              Multi-query                      Multi-round iterative
Single retrieval pass                     Query decomposition              Search-Analyze-Gap-Search loop
Direct generation                         Query reformulation              Agent-based architecture
No reasoning over results                 Result re-ranking                Memory across iterations
Answer only                               Better answer with citations     Comprehensive research report
Seconds                                   Seconds to minutes               Minutes to tens of minutes
Stateless                                 Mostly stateless                 Stateful with knowledge graph
                                                                           Self-reflection and gap analysis
```

The progression from Web Search to DeepSearch to Deep ReSearch represents a shift from **retrieval-augmented generation** to **retrieval-augmented reasoning** to **autonomous research agents** -- each stage adding more agency, iteration, and synthesis capability.
