# 秋招管理（Job Hunt）PRD v1.0

> 文档类型：AI 开发型产品需求文档（Implementation-oriented PRD）  
> 状态：v1.0 Draft / 可进入开发  
> 日期：2026-08-24  
> 产品定位：Local-first、单用户、开源的个人招聘季管理 Web App  
> 目标读者：Coding Agent、前端工程师、维护者、开源贡献者

---

## 0. 文档使用约束

本 PRD 是后续实现的唯一产品基线之一。Coding Agent 在实现过程中应遵循：

1. 不擅自改变本文的数据实体关系、核心状态机和敏感数据边界。
2. 如实现细节与本文冲突，以“产品规则 > 数据规则 > 页面交互 > 技术建议”的优先级执行。
3. v1 必须保持 Local-first：除用户主动调用 LLM API 外，不向外部服务发送业务数据。
4. 不引入云数据库、后端数据库、本地数据库服务、登录系统、账号体系或遥测服务。
5. 新功能如不在 v1 Scope 内，不应为了“预留”而显著增加复杂度。
6. 所有破坏性操作必须有二次确认或可恢复机制。
7. 所有核心业务数据必须支持导出与导入。

---

# 1. 产品概述

## 1.1 产品一句话

一个帮助个人管理秋招、春招、实习等招聘季中「关注岗位 → 投递 → 前置筛选/测评/笔试 → 多轮面试 → Offer」全过程的本地优先 Web 应用。

## 1.2 核心问题

个人招聘季通常同时维护数十至数百个岗位，信息分散在：

- 招聘官网；
- 表格；
- 浏览器收藏；
- 日历；
- 笔记软件；
- 聊天记录；
- 各公司招聘账号；
- 面经文档。

本产品的目标是将这些“个人招聘流程状态”集中到一个可长期维护、可搜索、可备份、无需服务器的本地工作台中。

## 1.3 核心价值

产品必须优先做到：

- 快速知道“我投了什么，现在到哪一步”；
- 快速知道“这周有什么测评、笔试、面试、截止事项”；
- 快速查找某公司的招聘官网、登录账号和密码；
- 快速查看某岗位经过 AI 提纯后的 JD；
- 快速记录每场面试和面经；
- 多个招聘季之间数据互不污染；
- 数据归用户本人所有，可完整备份迁移；
- 无需安装数据库服务或后端服务。

---

# 2. 产品原则

## P1. Local-first

除用户主动调用 LLM API 外，所有数据均存储于用户当前浏览器本地。

## P2. Recruitment Cycle First

招聘季是一级业务作用域。秋招、春招、暑期实习等不同招聘季默认独立。

即使以下信息完全相同：

- 公司相同；
- 岗位名称相同；

只要招聘季不同，即视为新的 Position，并重新维护 JD、岗位链接等信息。

## P3. Position 与 Application 分离

Position 表示“该招聘季中的岗位信息”；Application 表示“用户对该岗位的一次具体投递流程”。

同一 Position 可以存在多个 Application，但常规使用中通常为 0 或 1 个。该能力用于误删恢复、特殊重复投递等边缘场景，不用于跨招聘季复用。

## P4. Pipeline 可变，统计口径固定

具体公司流程可以：

- 顺序不同；
- 阶段数量不同；
- 面试轮数未知；
- HR 面位置不同；
- 中途增加新阶段。

用户看到的 Pipeline Stage 可完全自定义，但每一个 Stage 必须映射到固定的系统大类，以支持统一统计。

## P5. History 不可被当前状态覆盖

所有关键流程推进应产生历史快照。后续修改 Pipeline 名称、顺序或当前状态不得破坏历史记录。

## P6. Sensitive Data 独立

招聘官网账号密码、LLM API Key 属于敏感数据，与普通业务数据逻辑隔离，普通导出不得包含。

## P7. Lightweight

普通用户使用 GitHub Pages 时不需要安装任何运行环境；离线版本最多允许通过静态 Web Server 启动，不要求数据库、Docker、Node 后端或 Python 后端。

---

# 3. 用户与使用场景

## 3.1 用户模型

v1 仅考虑：

- 单用户；
- 个人设备；
- 个人招聘管理；
- 无账号注册；
- 无团队协作；
- 无跨设备实时同步。

## 3.2 典型使用场景

### 场景 A：收藏岗位

用户看到一个感兴趣的岗位，将公司、岗位、链接、招聘季和复制的原始 JD 保存至岗位库，再使用 AI 提纯 JD。

### 场景 B：开始投递

用户从岗位库点击“开始投递”，创建 Application，选择投递渠道、投递时间，并使用默认 Pipeline 或复制已有 Pipeline。

### 场景 C：推进流程

用户收到笔试通知，将当前 Pipeline 推进至“笔试”，系统记录 Stage History，并可顺手建立笔试日程。

### 场景 D：记录面试

用户进入“一面”，建立 Interview Event，填写时间、形式、链接；面试结束后在该场 Interview 下记录 Markdown 面经。

### 场景 E：官网登录过期

用户在公司详情中直接显示/复制招聘官网账号或密码，并打开公司招聘官网重新登录。

### 场景 F：新招聘季

秋招结束后归档；春招开始新建招聘季。即使出现同名岗位，也重新建立 Position 和 JD。

---

# 4. v1 Scope

## 4.1 必须实现

1. Recruitment Cycle 招聘季管理
2. Dashboard 总览
3. 本周事项
4. 日历
5. 岗位库
6. 公司信息管理
7. 公司招聘官网账号密码管理
8. 投递管理
9. Pipeline 看板
10. 投递列表视图
11. 自定义 Pipeline
12. Pipeline History
13. 测评/笔试/面试/Offer 等 Event
14. 面试与面经管理
15. Global Search
16. Markdown 备注
17. JD 原始文本保存
18. LLM JD 提纯
19. SiliconFlow/OpenAI-compatible Provider 基础能力
20. 数据 JSON 导入/导出
21. 投递 CSV 导出
22. 敏感数据独立存储
23. 明暗主题
24. GitHub Pages 部署
25. 静态离线部署
26. README 与首次使用说明

## 4.2 明确不做

v1 及产品长期方向默认不包含：

- 自动爬取招聘岗位；
- 自动登录招聘网站；
- 自动投递；
- 云同步；
- 多用户；
- 用户注册登录；
- 团队协作；
- 企业 ATS；
- 社交功能；
- 手机原生 App；
- 微信小程序；
- AI 自动修改简历；
- AI 模拟面试；
- 自动采集第三方招聘平台账号密码；
- 浏览器扩展。

---

# 5. 信息架构

桌面端一级导航：

```text
[招聘季切换器]

总览 Dashboard
投递 Applications
岗位库 Positions
面经 Interviews
数据 Data
设置 Settings
```

全局能力：

```text
Cmd/Ctrl + K  全局搜索
主题切换
当前招聘季切换
```

---

# 6. Recruitment Cycle 招聘季

## 6.1 数据模型

```ts
interface RecruitmentCycle {
  id: string
  name: string                 // e.g. "2026 秋招"
  type?: 'autumn' | 'spring' | 'summer_intern' | 'daily_intern' | 'other'
  status: 'active' | 'archived'
  startDate?: string           // ISO date
  endDate?: string
  notes?: string               // Markdown
  createdAt: string
  updatedAt: string
  archivedAt?: string
}
```

## 6.2 产品规则

- 首次启动必须引导用户创建招聘季。
- 任意时刻至少允许 0 个或 1 个“当前招聘季”。
- 用户可切换查看历史招聘季。
- 归档后默认只读，但允许用户显式“恢复为活动状态”。
- Dashboard、岗位库、投递、日历、统计默认仅作用于当前招聘季。
- Company 可跨招聘季共享。
- Position 不得跨招聘季共享。

## 6.3 新建招聘季

支持：

1. 空白创建；
2. 可选“复制上一招聘季公司列表”。

禁止默认复制：

- Position；
- JD；
- Application；
- Pipeline；
- Event；
- Interview。

---

# 7. Company 公司

## 7.1 数据模型

```ts
interface Company {
  id: string
  name: string
  websiteUrl?: string
  careerUrl?: string
  notes?: string               // Markdown
  createdAt: string
  updatedAt: string
}
```

## 7.2 规则

- Company 是跨招聘季可复用实体。
- 公司名称要求去除首尾空格。
- 不强制唯一，但新增时若存在高度相似名称应提示。
- Company 删除前必须检查关联 Position；存在关联时默认禁止直接删除，可改为“保留岗位并删除公司”不得出现。

---

# 8. 公司招聘官网账号

## 8.1 定位

仅管理“公司官方招聘站”的登录信息，不管理 Boss、牛客、实习僧等第三方招聘平台账号。

核心需求是：

- 查看；
- 显示密码；
- 一键复制账号；
- 一键复制密码；
- 一键打开招聘官网。

不是专业密码管理器。

## 8.2 数据模型（逻辑层）

```ts
interface CareerAccount {
  id: string
  companyId: string
  label?: string                // e.g. "校招官网"
  loginUrl?: string

  loginMethods: Array<'phone' | 'email' | 'wechat' | 'username' | 'other'>
  phone?: string
  email?: string
  username?: string
  password?: string
  wechatEnabled: boolean

  notes?: string
  createdAt: string
  updatedAt: string
}
```

## 8.3 页面行为

公司详情显示：

```text
招聘官网账号

登录方式  手机号 + 微信
手机号    138****1234   [复制]
密码      ••••••••••    [显示] [复制]

[打开招聘官网]
```

- 密码默认遮罩。
- “显示”后当前组件可见，刷新后重新遮罩。
- 复制成功显示短 Toast。
- 不将密码写入 URL、日志或埋点。
- 允许一个 Company 存多个 CareerAccount。

## 8.4 安全模型

v1 不要求用户设置主密码。

实现建议：

- 敏感数据使用独立 IndexedDB store；
- 可使用 Web Crypto API + 当前浏览器本地产生的随机密钥进行 AES-GCM 加密；
- 密钥与密文逻辑隔离；
- 不宣称达到专业密码管理器安全等级。

必须在 README 明确说明：

> 本产品是本地个人招聘管理工具。无主密码模式主要用于降低普通数据泄露时的明文暴露风险；若攻击者已控制当前浏览器、系统账户或本应用执行环境，则无法保证敏感信息安全。

---

# 9. Position 岗位库

## 9.1 数据模型

```ts
interface Position {
  id: string
  cycleId: string
  companyId: string

  title: string
  department?: string
  locations: string[]
  category?: string

  jobUrl?: string
  officialUrl?: string
  consultUrl?: string

  jdRaw?: string
  jdStructured?: StructuredJD
  jdParsedAt?: string
  jdParserProvider?: string
  jdParserModel?: string

  notes?: string               // Markdown
  createdAt: string
  updatedAt: string
}
```

## 9.2 Structured JD

```ts
interface StructuredJD {
  title?: string
  department?: string
  locations: string[]
  responsibilities: string[]
  requirements: string[]
  preferred: string[]
  keywords: string[]
  education?: string
  graduationRequirement?: string
  other?: string[]
}
```

## 9.3 关键规则

- Position 必须属于一个 RecruitmentCycle。
- 相同公司 + 相同岗位名 + 不同招聘季 = 不同 Position。
- JD 不跨招聘季复用。
- jdRaw 保存用户原始粘贴文本，用于重解析与备份。
- 正常 UI 不展示 jdRaw。
- 岗位详情仅展示 jdStructured。
- AI 解析不得删除或覆盖 jdRaw。
- 用户可手动编辑 AI 提纯后的结果。

## 9.4 岗位库页面

默认字段：

- 公司；
- 岗位；
- 地点；
- 是否已投递；
- 更新时间。

支持：

- 新增；
- 编辑；
- 删除；
- 搜索；
- 公司筛选；
- 地点筛选；
- 是否已投筛选；
- 排序。

## 9.5 新增岗位

推荐流程：

```text
选择/新增公司
→ 输入岗位名称
→ 地点/链接
→ 粘贴原始 JD
→ [AI 提纯]
→ 检查结构化结果
→ 保存
```

AI 失败时必须允许保存岗位和原始 JD。

---

# 10. Application 投递记录

## 10.1 数据模型

```ts
interface Application {
  id: string
  cycleId: string
  positionId: string

  appliedAt?: string
  applyChannel?: 'official' | 'boss' | 'referral' | 'campus' | 'other'
  applyChannelText?: string

  pipeline: PipelineStage[]
  currentStageId: string

  result: 'active' | 'rejected' | 'withdrawn' | 'closed' | 'offer_accepted'

  resumeVersion?: string
  notes?: string               // Markdown

  createdAt: string
  updatedAt: string
}
```

## 10.2 新增投递入口

支持两个入口：

### A. 从 Position 开始投递

```text
岗位详情 → 开始投递
```

### B. 投递页快速新增

用户可以一步填写：

- 公司；
- 岗位；
- 投递渠道；
- 投递时间。

如果 Company/Position 不存在，系统自动建立缺失实体。

---

# 11. Pipeline 模型

## 11.1 固定统计大类

```ts
type PipelineCategory =
  | 'todo'
  | 'applied'
  | 'pre_interview'
  | 'interview'
  | 'offer'
```

结束不作为普通正向 Pipeline Category，由 Application.result 表达。

含义：

### todo
待投递。

### applied
已经提交但尚未进入明确筛选/测评/笔试。

### pre_interview
尚未进入面试的流程，包括但不限于：

- 简历筛选；
- 性格测评；
- 在线测评；
- 技术测评；
- 笔试。

### interview
所有面试，包括：

- 一面；
- 二面；
- 三面；
- 技术面；
- 主管面；
- 交叉面；
- HR 面；
- HRBP 面。

HR 面无论位于流程前后，统计均归 interview。

### offer
包括：

- OC；
- 薪资沟通；
- Offer 审批；
- 正式 Offer。

## 11.2 PipelineStage

```ts
interface PipelineStage {
  id: string
  name: string
  category: PipelineCategory
  order: number
}
```

## 11.3 默认 Pipeline

新建 Application 默认提供：

```text
待投递            todo
已投递            applied
简历筛选          pre_interview
测评              pre_interview
笔试              pre_interview
一面              interview
二面              interview
HR 面             interview
OC                offer
Offer             offer
```

用户可在创建时删除不需要的阶段。

## 11.4 自定义能力

Application 级别支持：

- 新增 Stage；
- 插入 Stage；
- 删除未使用 Stage；
- 重命名；
- 修改 Category；
- 拖拽排序；
- 中途新增未知面试轮次。

## 11.5 Pipeline 复制

新增 Application 时允许：

- 使用默认 Pipeline；
- 从当前招聘季已有 Application 复制 Pipeline。

复制只复制 Stage 定义，不复制：

- 当前状态；
- History；
- Event；
- Interview；
- Result。

---

# 12. Pipeline History

## 12.1 数据模型

```ts
interface ApplicationStageHistory {
  id: string
  applicationId: string

  fromStageId?: string
  fromStageNameSnapshot?: string
  fromCategorySnapshot?: PipelineCategory

  toStageId?: string
  toStageNameSnapshot?: string
  toCategorySnapshot?: PipelineCategory

  action: 'created' | 'stage_changed' | 'result_changed' | 'stage_inserted' | 'note'
  resultSnapshot?: Application['result']

  note?: string
  occurredAt: string
  createdAt: string
}
```

## 12.2 规则

- Application 创建必须建立 History。
- currentStage 改变必须自动建立 History。
- result 改变必须建立 History。
- History 使用名称与 Category 快照，不得只依赖当前 Stage 引用。
- 修改 Stage 名称不得 retroactively 修改 History。
- History 默认不可直接删除。
- 若未来提供更正，应创建 correction 记录而非静默改历史；v1 可不实现 correction UI。

---

# 13. 投递看板

## 13.1 定位

产品核心页面。

## 13.2 看板列

看板默认按当前 Application 的具体 Pipeline Stage 展示，而不是只按固定 Category 展示。

由于不同 Application 的 Stage 名称可能不同，v1 看板采用“系统大类分组 + 当前具体阶段显示”的方式：

```text
待投递 | 已投递 | 前置流程 | 面试 | Offer
```

每个大类列中卡片显示具体 Stage，例如：

```text
┌ 腾讯
│ 后端开发工程师
│ 技术二面
│ 08-20 · 官网
│ 下一事项：08-27 14:00
└
```

说明：

- 顶层看板列固定为 5 个 Category，保证不同岗位可统一放在同一看板；
- 卡片内部显示其自定义具体 Stage；
- 拖动至另一 Category 后，如果该 Application Pipeline 中存在对应 Category 的候选 Stage，应让用户选择具体 Stage；仅一个候选时直接推进；无候选时允许即时新增 Stage。

## 13.3 卡片字段

默认展示：

- 公司；
- 岗位；
- 当前具体 Stage；
- 投递日期；
- 投递渠道；
- 最近/下一 Event（如存在）。

不在卡片堆叠：

- 完整 JD；
- 官网账号；
- 长备注；
- 完整 History。

## 13.4 看板筛选

支持：

- 公司；
- Pipeline Category；
- Result（默认仅 active）；
- 投递渠道；
- 投递日期范围；
- 地点；
- 关键词。

## 13.5 排序

每列支持至少：

- 最近更新；
- 投递时间；
- 下一事项时间；
- 公司名称。

默认：最近更新倒序。

---

# 14. 投递列表视图

投递页提供：

```text
[看板] [列表]
```

默认列：

| 字段 | 可排序 | 可筛选 |
|---|---:|---:|
| 公司 | 是 | 是 |
| 岗位 | 是 | 搜索 |
| 当前阶段 | 否 | 是 |
| 大类 | 否 | 是 |
| 投递时间 | 是 | 日期范围 |
| 投递渠道 | 是 | 是 |
| 下一事项 | 是 | 否 |
| Result | 否 | 是 |

支持点击行进入 Application 详情。

---

# 15. Event / 日程

## 15.1 数据模型

```ts
type RecruitmentEventType =
  | 'assessment'
  | 'written_test'
  | 'interview'
  | 'hr_interview'
  | 'offer'
  | 'deadline'
  | 'follow_up'
  | 'custom'

interface RecruitmentEvent {
  id: string
  cycleId: string
  applicationId?: string
  positionId?: string

  type: RecruitmentEventType
  title: string

  startAt?: string
  endAt?: string
  allDay: boolean

  mode?: 'online' | 'offline' | 'phone' | 'unknown'
  meetingUrl?: string
  location?: string

  completed: boolean
  notes?: string               // Markdown

  createdAt: string
  updatedAt: string
}
```

## 15.2 业务规则

- 测评、笔试、面试、HR 面、Offer 沟通、截止时间均可进入日历。
- Pipeline 与 Event 关联但不强制一一对应。
- 一个 Pipeline Stage 可无 Event。
- 一个 Application 可在同一阶段存在多个 Event。
- 创建/推进到测评、笔试、面试等 Stage 时，UI 可提示“是否安排日程”，但不得强制。

## 15.3 日历

支持至少：

- 月视图；
- 本周列表。

日历事件点击后显示：

- 公司；
- 岗位；
- 类型；
- 时间；
- 形式；
- 链接；
- 备注；
- 快速进入 Application。

---

# 16. Interview 与面经

## 16.1 数据模型

```ts
interface Interview {
  id: string
  cycleId: string
  applicationId: string
  eventId?: string

  stageId?: string
  stageNameSnapshot: string

  interviewer?: string
  durationMinutes?: number
  result?: 'pending' | 'passed' | 'failed' | 'unknown'

  notes?: string               // Markdown 面经正文
  reflection?: string          // Markdown 个人复盘

  createdAt: string
  updatedAt: string
}
```

## 16.2 规则

- 面经按“某 Application 的某一场 Interview”组织。
- 不允许只有一篇覆盖整个公司的单一面经文档作为核心模型。
- Event 可关联 Interview；面试 Event 完成后应提供“记录面经”快捷入口。
- Interview 的 stageName 使用快照，避免 Pipeline 后续改名影响历史。

## 16.3 面经页面

支持：

- 按招聘季；
- 公司；
- 岗位；
- 面试轮次；
- 日期；
- 关键词；

筛选和全局搜索。

---

# 17. Dashboard 总览

## 17.1 页面目标

Dashboard 的首要问题不是展示漂亮图表，而是回答：

> 我当前招聘季进展如何，以及这周要处理什么？

## 17.2 顶部 KPI

至少显示：

1. 岗位库总数；
2. 已投递数；
3. 前置流程中；
4. 面试中；
5. Offer 阶段。

### 统计口径

岗位库总数：当前 cycle 的 Position 数。

已投递数：当前 cycle 中存在 Application 且当前不处于 todo 的数量，可包含其他更后阶段。

前置流程中：`currentStage.category === pre_interview && result === active`。

面试中：`currentStage.category === interview && result === active`。

Offer 阶段：`currentStage.category === offer && result === active`，以及可单独展示 `offer_accepted`。

## 17.3 本周模块

按照用户本地时区展示本周 Event：

- 今天；
- 明天；
- 本周后续。

同时显示“需要关注”：

- 活跃 Application 长时间无更新；
- Event 临近；
- Deadline 临近。

v1 的“长时间无更新”默认阈值：7 天，可后续配置。

## 17.4 日历模块

Dashboard 提供紧凑日历/本周预览，完整月历可展开或进入专门区域。

---

# 18. Application 详情

建议 Tab：

```text
概览 | JD | 流程 | 日程 | 面试/面经 | 备注
```

## 18.1 概览

- 公司；
- 岗位；
- 地点；
- 当前 Stage；
- Result；
- 投递时间；
- 渠道；
- 相关链接；
- 简历版本。

## 18.2 JD

仅展示 Structured JD。

## 18.3 流程

- 当前 Pipeline 编辑器；
- History 时间线；
- 推进流程操作。

## 18.4 日程

当前 Application 的 RecruitmentEvent。

## 18.5 面试/面经

按时间展示所有 Interview。

## 18.6 备注

Markdown。

---

# 19. Global Search

## 19.1 入口

```text
Cmd + K / Ctrl + K
```

## 19.2 搜索范围

当前招聘季默认搜索：

- 公司名；
- 岗位名称；
- Structured JD；
- Application 备注；
- Company 备注；
- Position 备注；
- Interview 面经；
- Interview reflection；
- Event 标题/备注。

不得默认搜索：

- 密码；
- LLM API Key；
- jdRaw。

## 19.3 结果分组

```text
公司
岗位
投递
面经
日程
```

点击结果进入对应详情。

---

# 20. Markdown

支持 Markdown 的字段：

- RecruitmentCycle.notes；
- Company.notes；
- Position.notes；
- Application.notes；
- RecruitmentEvent.notes；
- Interview.notes；
- Interview.reflection。

编辑器 v1：

- textarea；
- 编辑/预览切换；
- 不引入重型富文本编辑器。

渲染必须进行安全 Sanitization，禁止任意 HTML/脚本执行。

---

# 21. LLM 与 JD 提纯

## 21.1 v1 AI Scope

仅实现：

> 原始招聘网站文本 → Structured JD

不实现：

- 简历生成；
- 简历改写；
- 面试模拟；
- 求职建议 Agent；
- 自动网络搜索。

## 21.2 Provider 抽象

```ts
interface LLMProviderConfig {
  id: string
  name: string
  providerType: 'openai_compatible'
  baseUrl: string
  model: string
  apiKeyRef?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}
```

业务层不得写死 SiliconFlow 专属 SDK。

定义统一接口：

```ts
interface LLMProvider {
  parseJD(rawText: string): Promise<StructuredJD>
  testConnection(): Promise<{ ok: boolean; message?: string }>
}
```

## 21.3 默认 Provider Preset

v1 提供 SiliconFlow preset：

```text
Provider Type: OpenAI-compatible
Base URL: https://api.siliconflow.cn/v1
Suggested Model: Qwen3-8B 对应的当前 SiliconFlow 模型 ID
```

注意：模型 ID 不得作为不可修改的业务常量。设置页允许用户手动修改，并允许后续使用 `/models` 拉取当前账号可用模型。

SiliconFlow 官方当前提供模型列表接口，并提供 Qwen3 系列模型；实现时应以实时模型列表或 preset 配置为准，避免将供应商模型生命周期写死到业务逻辑。

## 21.4 API Key

禁止：

```text
VITE_SILICONFLOW_API_KEY=真实用户密钥
```

作为生产用户密钥机制。

原因：纯前端构建产物无法安全隐藏编译期 Secret。

用户应在设置页输入 API Key，保存策略：

1. 本次会话；或
2. 敏感数据本地存储。

## 21.5 JD Prompt 规则

系统提示必须要求：

- 忽略导航、版权、推荐岗位等网页噪声；
- 不编造原文不存在的要求；
- 不总结成散文；
- 输出 StructuredJD；
- 缺失字段返回空数组/空值；
- keywords 应来自 JD 内容，不得无限扩展。

## 21.6 JSON Schema

建议使用结构化输出能力；若 Provider 不支持严格 JSON Schema，则回退为 JSON-only + 本地 Schema Validation。

解析后必须通过运行时校验（建议 Zod）。

校验失败：

- 不覆盖已有 jdStructured；
- 显示错误；
- 允许重试；
- 原始 jdRaw 保留。

---

# 22. 数据存储

## 22.1 技术原则

不依赖：

- MySQL；
- PostgreSQL；
- MongoDB；
- Redis；
- SQLite server；
- Docker；
- 后端 API。

浏览器本地使用 IndexedDB。

建议 Dexie 作为封装。

## 22.2 Store 建议

普通数据：

```text
recruitmentCycles
companies
positions
applications
applicationStageHistory
events
interviews
settings
llmProviderConfigs
```

敏感数据：

```text
careerAccountSecrets
llmSecrets
```

可以将 CareerAccount 非敏感元数据与 Secret 拆开：

```ts
interface CareerAccountMeta {
  id: string
  companyId: string
  label?: string
  loginUrl?: string
  loginMethods: string[]
  wechatEnabled: boolean
  notes?: string
}

interface CareerAccountSecret {
  careerAccountId: string
  phone?: string
  email?: string
  username?: string
  password?: string
}
```

---

# 23. 数据导入导出

## 23.1 普通 JSON 导出

文件建议：

```text
job-hunt-data-YYYY-MM-DD.json
```

必须包含：

- schemaVersion；
- exportedAt；
- ordinary business data；
- 非敏感设置。

必须排除：

- 招聘官网密码等 Secret；
- LLM API Key；
- 本地加密 key。

建议结构：

```ts
interface ExportBundle {
  schemaVersion: number
  appVersion: string
  exportedAt: string
  data: {
    recruitmentCycles: RecruitmentCycle[]
    companies: Company[]
    positions: Position[]
    applications: Application[]
    applicationStageHistory: ApplicationStageHistory[]
    events: RecruitmentEvent[]
    interviews: Interview[]
    settings: Record<string, unknown>
    llmProviderConfigs: Array<Omit<LLMProviderConfig, 'apiKeyRef'>>
  }
}
```

## 23.2 导入

导入前必须：

1. 解析 JSON；
2. 校验 schemaVersion；
3. Schema Validation；
4. 显示导入摘要；
5. 用户确认。

导入模式 v1：

- 合并导入；
- 全量替换。

全量替换必须二次确认并建议先导出当前备份。

## 23.3 CSV

投递列表支持 CSV 导出，至少包含：

- 招聘季；
- 公司；
- 岗位；
- 地点；
- 当前 Stage；
- Category；
- Result；
- 投递时间；
- 投递渠道；
- 岗位链接；
- 官网链接；
- 咨询链接。

## 23.4 敏感数据导出

v1 普通导出不得包含敏感信息。

敏感数据如实现导出，必须作为单独入口，明确警示，并采用独立格式；该功能可延后到 v1.1，不阻塞 v1。

---

# 24. 设置

## 24.1 General

- Theme：system / light / dark；
- 默认招聘季；
- 本周起始日（v1 可固定周一）；
- 长时间无更新阈值（默认 7 天，可 v1.1）。

## 24.2 AI

- Provider 名称；
- Base URL；
- API Key；
- Model；
- 测试连接；
- 保存方式：session / local sensitive store。

## 24.3 Data

- 导出 JSON；
- 导入 JSON；
- CSV 导出；
- 清空全部普通数据；
- 清空敏感数据。

---

# 25. Theme / UI

## 25.1 主题

```ts
type Theme = 'system' | 'light' | 'dark'
```

必须支持：

- 系统主题；
- 浅色；
- 深色。

## 25.2 UI 原则

- 桌面优先；
- 移动端至少可查看与基础编辑；
- 不使用过度动画；
- 看板是视觉重点；
- 数据表格密度适中；
- 重要日期和阶段明显；
- 敏感信息不在列表页展示。

---

# 26. Error / Empty / Loading States

必须覆盖：

## 26.1 空招聘季

引导创建第一个招聘季。

## 26.2 空岗位库

提供“新增第一个岗位”。

## 26.3 空投递

提供“从岗位库开始投递 / 快速新增投递”。

## 26.4 AI 未配置

点击 AI 提纯时引导至设置页，不得崩溃。

## 26.5 AI 调用失败

必须显示：

- 网络失败；
- 鉴权失败；
- 模型不存在；
- Rate Limit；
- 输出解析失败。

不得丢失 jdRaw。

## 26.6 IndexedDB 不可用

显示明确错误，禁止假装保存成功。

## 26.7 导入失败

不得写入部分数据后无提示；应使用事务或验证后写入。

---

# 27. 删除规则

## RecruitmentCycle

删除前显示其 Position/Application 数量。推荐以归档替代删除。

## Position

若不存在 Application：可确认后删除。

存在 Application：默认禁止直接删除，应提示先删除关联投递，或提供级联删除并列出影响范围。

## Application

删除会同时影响：

- History；
- Events；
- Interviews。

必须明确显示影响范围并确认。

## Company

存在 Position 时禁止删除。

## Interview/Event

可删除，需确认；删除 Interview 不自动改变 Pipeline。

---

# 28. 隐私与安全要求

1. 默认不接入分析/遥测服务。
2. 不向项目维护者上传业务数据。
3. LLM 只有用户点击 AI 操作时才发送对应 jdRaw。
4. 调用 LLM 前 UI 应明确当前文本会发送给配置的第三方模型服务。
5. 普通导出不包含 Secret。
6. Global Search 不索引 Secret。
7. 日志不得输出 API Key、Password。
8. 浏览器 Dev 模式错误处理应避免打印完整敏感对象。
9. Markdown 必须防 XSS。
10. 外部链接使用安全属性，避免 opener 风险。
11. `.env.example` 只能放示例值，不得提交真实 Key。
12. README 必须说明浏览器本地数据清理风险并建议定期导出备份。

---

# 29. 技术架构建议

## 29.1 Stack

```text
React
TypeScript
Vite
Tailwind CSS
Dexie / IndexedDB
Zod
Web Crypto API
OpenAI-compatible REST API
```

可选轻量库：

- React Router；
- date-fns；
- dnd-kit（Pipeline 拖拽）；
- react-markdown + sanitize；
- Lucide icons。

避免：

- Redux（除非实际复杂度证明需要）；
- Electron；
- 本地 Node server 作为正式运行依赖；
- 后端框架；
- 重型富文本编辑器。

## 29.2 建议目录

```text
src/
├── app/
│   ├── router/
│   └── providers/
├── components/
├── features/
│   ├── cycles/
│   ├── companies/
│   ├── positions/
│   ├── applications/
│   ├── pipeline/
│   ├── events/
│   ├── interviews/
│   ├── search/
│   ├── ai/
│   ├── data-transfer/
│   └── settings/
├── db/
│   ├── schema.ts
│   ├── migrations.ts
│   └── repositories/
├── security/
│   └── secrets.ts
├── lib/
├── types/
└── styles/
```

核心要求：组件不得直接到处操作 Dexie table；使用 repository/service 层，方便迁移和测试。

---

# 30. IndexedDB Schema Versioning

从第一版即启用数据库版本：

```text
DB v1
```

原则：

- 所有 schema 变更必须使用 migration；
- 不允许开发阶段通过“让用户清库”解决正式版本迁移；
- ExportBundle 独立维护 schemaVersion；
- App DB version 与 Export schemaVersion 可独立递增。

---

# 31. URL 与部署

## 31.1 GitHub Pages

必须支持静态部署。

如果使用 React Router，应使用：

- HashRouter；或
- 配置适配 GitHub Pages 的静态路由方案。

优先保证用户刷新详情页不会 404。

## 31.2 离线静态运行

Release 提供构建产物或明确构建步骤。

用户可通过：

```bash
python -m http.server 8000
```

或：

```bash
npx serve
```

运行静态目录。

不能要求：

- 数据库服务；
- API server；
- Docker。

注：直接 `file://` 双击打开不是 v1 必须保证的运行方式，因为浏览器安全限制可能影响模块、IndexedDB 或 Web Crypto 行为。

---

# 32. README 必须包含

1. 产品截图或 GIF（开发完成后）；
2. 功能介绍；
3. GitHub Pages 使用入口；
4. 本地运行方式；
5. 开发方式；
6. 数据保存位置说明；
7. 浏览器清理数据风险；
8. 导入导出备份说明；
9. 招聘官网密码安全边界；
10. LLM API Key 安全说明；
11. SiliconFlow 配置示例；
12. 自定义 OpenAI-compatible Provider 示例；
13. 隐私说明；
14. 贡献指南入口；
15. License。

`.env.example` 不得要求用户填写生产 API Key 才能使用产品。

---

# 33. 推荐开发阶段

## Phase 0：工程骨架

- Vite + React + TS；
- Router；
- Tailwind；
- Theme；
- Dexie；
- Zod；
- 基础 layout。

验收：GitHub Pages 可部署，IndexedDB 可持久化测试记录。

## Phase 1：招聘季 + 公司 + 岗位库

- RecruitmentCycle CRUD；
- Company CRUD；
- Position CRUD；
- 招聘季切换；
- JD Raw 保存；
- Structured JD 手动编辑。

验收：不同招聘季同名岗位完全独立。

## Phase 2：Application + Pipeline

- 创建投递；
- 默认 Pipeline；
- Pipeline Editor；
- 当前阶段推进；
- History；
- 看板；
- 列表；
- 筛选/排序；
- Pipeline 复制。

验收：中途插入“主管面”不破坏历史。

## Phase 3：Event + Dashboard

- Event CRUD；
- 本周；
- 月历；
- 测评/笔试/面试日程；
- Dashboard KPI。

验收：Pipeline 进入笔试后可创建日程，并在本周和日历同步出现。

## Phase 4：Interview + Search + Markdown

- 面试记录；
- 面经；
- Markdown；
- 全局搜索。

验收：搜索“Redis”可同时找到 JD 和面经，但搜不到 Secret/jdRaw。

## Phase 5：账号密码 + Secrets

- CareerAccount；
- 独立 Secret store；
- 显示/复制；
- Web Crypto 隔离；
- 安全提示。

验收：普通 JSON Export 中不存在手机号/邮箱/密码等 CareerAccount Secret（若账号也定义为敏感则全部排除）。

## Phase 6：LLM

- OpenAI-compatible Provider；
- SiliconFlow preset；
- API Key secret；
- JD Parse；
- Zod validation；
- 错误处理；
- connection test。

验收：杂乱 JD 可生成 StructuredJD；失败时原始 JD 不丢失。

## Phase 7：Data Transfer + Release

- JSON Export；
- Import；
- CSV；
- README；
- GitHub Pages；
- Release workflow；
- 隐私说明。

---

# 34. v1 验收场景（E2E）

## AC-01 首次使用

Given 用户首次打开应用  
When 没有 RecruitmentCycle  
Then 页面引导创建招聘季，创建后进入 Dashboard。

## AC-02 招聘季隔离

Given 已存在“2026 秋招”的腾讯后端岗位  
When 用户新建“2027 春招”并新增同名岗位  
Then 两条 Position ID 不同，JD、链接、Application 完全独立。

## AC-03 JD 提纯

Given 用户粘贴包含导航、版权、推荐信息的 JD 原文  
When 点击 AI 提纯  
Then 返回职责、要求、加分项、关键词等结构化结果；原始文本保存但日常详情不展示。

## AC-04 创建投递

Given Position 尚未投递  
When 点击开始投递  
Then 创建 Application 和默认 Pipeline，并生成 created History。

## AC-05 自定义 Pipeline

Given 当前流程为“一面 → 二面 → HR 面”  
When 用户在二面后插入“主管面”  
Then Pipeline 更新，既有 History 不变。

## AC-06 Pipeline 复制

Given 已有 Application A 的自定义 Pipeline  
When Application B 选择复制 Pipeline  
Then B 仅复制 Stage 定义，不复制历史/事件/当前状态。

## AC-07 看板统计

Given 不同岗位拥有不同 Stage 名称  
When Stage Category 均为 interview  
Then Dashboard 面试中统一统计这些 Application。

## AC-08 HR 位置变化

Given A 的 HR 面位于技术面之前，B 的 HR 面位于技术面之后  
Then 两者均归类为 interview，具体顺序由各 Application Pipeline 决定。

## AC-09 笔试日程

Given Application 进入“笔试”  
When 用户填写 8 月 28 日 19:00  
Then本周、日历、Application 日程均出现同一 Event。

## AC-10 面经

Given 某 Application 有三场面试  
Then 用户可分别记录三篇 Interview notes，并通过全局搜索命中其中内容。

## AC-11 官网密码

Given 用户保存公司招聘官网账号  
When 点击显示或复制密码  
Then 可立即完成操作，无需主密码；列表和全局搜索不显示密码。

## AC-12 普通导出

Given 应用包含公司官网密码与 LLM API Key  
When 执行普通 JSON 导出  
Then 导出文件不得包含这些 Secret。

## AC-13 导入恢复

Given 用户导出普通数据后清空浏览器普通数据  
When 重新导入  
Then招聘季、公司、岗位、投递、Pipeline、History、Event、Interview 恢复且引用关系完整。

## AC-14 LLM 未配置

Given 未配置 Provider/API Key  
When 点击 AI 提纯  
Then 引导用户配置，不产生未捕获异常。

## AC-15 GitHub Pages

Given 用户不安装 Node/Python  
When 打开项目 GitHub Pages  
Then 可使用除 LLM 网络调用外的全部本地功能。

---

# 35. 测试要求

## 35.1 Unit Test 优先对象

- Pipeline category 统计；
- History 生成；
- Export secret filtering；
- Import validation；
- StructuredJD schema；
- RecruitmentCycle 隔离；
- Search indexing exclusion；
- Pipeline copy。

## 35.2 Integration Test

- Position → Application；
- Stage change → History；
- Stage → Event；
- Event → Dashboard；
- Interview → Search；
- Export → Import round trip。

## 35.3 E2E

至少覆盖第 34 节 AC-01、02、04、05、09、11、12、13、15。

---

# 36. 性能目标

个人使用规模假设：

- 20 个 RecruitmentCycle；
- 1,000 个 Company；
- 10,000 个 Position；
- 10,000 个 Application；
- 100,000 条 History/Event/Interview 级别记录。

v1 在常规数百岗位规模下必须流畅。

原则：

- 不一次渲染数千张卡片；
- 列表采用分页/虚拟化视复杂度决定；
- 搜索索引不得包含 Secret；
- IndexedDB 查询应建立必要索引。

---

# 37. Accessibility

v1 至少要求：

- 键盘可操作基本表单；
- 可见 focus；
- Icon button 有 aria-label；
- 颜色不是唯一状态表达方式；
- 深浅主题均保证基础对比度；
- Password show/copy 对屏幕阅读器有明确文本。

---

# 38. 开源与仓库要求

建议仓库包含：

```text
README.md
LICENSE
CONTRIBUTING.md
SECURITY.md
.env.example
docs/
  PRD.md
src/
```

## SECURITY.md

至少说明：

- 不提交真实 API Key；
- 不在 Issue 中上传包含个人招聘信息的完整备份；
- 密码功能的安全边界；
- 安全漏洞报告方式。

---

# 39. 后续可能方向（非承诺）

可考虑但不进入 v1：

- PWA；
- 可配置等待提醒阈值；
- 高级转化漏斗；
- 不同阶段平均等待时长；
- Encrypted Sensitive Backup；
- Pipeline 模板收藏；
- 模型列表动态获取；
- JD 重新解析版本历史；
- 更丰富的招聘季复盘。

明确不因为这些方向改变 v1 核心数据边界。

---

# 40. Coding Agent 启动指令建议

可以将以下文本与本 PRD 一并提供给 Coding Agent：

```text
你正在实现一个 Local-first 的个人招聘季管理 Web App。

严格遵守 docs/PRD.md：
1. 先阅读完整 PRD，不要直接开始写页面。
2. 先实现数据类型、IndexedDB schema、repository 和 migration，再实现 UI。
3. 不允许将 Position 跨 RecruitmentCycle 复用。
4. Pipeline 的具体 Stage 属于 Application，但必须映射到固定 PipelineCategory。
5. 所有 Stage 变化必须产生不可被后续 Stage 改名影响的 History 快照。
6. 普通导出、全局搜索、日志均不得包含 Secret。
7. 不得加入后端、云数据库、登录系统或遥测。
8. LLM 必须通过 OpenAI-compatible provider 抽象实现，SiliconFlow 只是默认 preset。
9. 每完成一个 Phase，先运行 test/build，再进入下一 Phase。
10. 若需求不明确，优先选择最简单、Local-first、数据可迁移的实现，不擅自扩展 Scope。
```

---

# 41. Definition of Done

v1 只有同时满足以下条件才算完成：

- 可管理多个招聘季并归档；
- 不同招聘季 Position/JD 完全隔离；
- 岗位库 CRUD 可用；
- 投递看板是核心且可筛选排序；
- Pipeline 每条投递可自定义；
- 中途新增面试轮次可用；
- Pipeline History 完整；
- 测评/笔试/面试日程进入本周和日历；
- 面经按每场 Interview 保存并可搜索；
- 公司招聘官网账号可查看复制；
- Secret 不进入普通导出与全局搜索；
- JD Raw 可保存、AI 可提纯、Raw 默认隐藏；
- SiliconFlow preset + OpenAI-compatible Provider 可用；
- JSON 导入导出可 round-trip；
- CSV 可导出投递；
- 明暗主题可用；
- GitHub Pages 可直接使用；
- 本地静态部署可用；
- README / SECURITY 文档完成；
- 核心测试通过；
- 无需云数据库、后端服务或本地数据库服务。

---

# 42. 最终产品边界总结

本产品应始终保持为：

> **个人招聘季管理工具，而不是招聘平台。**

它管理的是用户本人主动维护的：

```text
招聘季
→ 公司 / 岗位
→ JD
→ 投递
→ Pipeline
→ 测评 / 笔试 / 面试 / Offer 日程
→ History
→ 面经
→ 个人招聘官网登录信息
```

产品成功的标准是：用户即使同时进行几十个招聘流程，也能快速回答：

1. 我现在有哪些岗位？
2. 每个岗位进行到哪一步？
3. 这周有什么事情？
4. 某个岗位的 JD 到底要求什么？
5. 我之前这一家公司每轮面试问了什么？
6. 招聘官网登录信息是什么？
7. 一个招聘季结束后，我能否完整归档并在下一招聘季干净重启？

若以上问题都能在少量操作内得到答案，则 v1 的产品目标成立。
