---
title: "Tokenization：从文本到 Token 序列"
slug: "cs336-tokenization"
description: "从字符、字节和单词级编码出发，理解 BPE 如何构造词表，以及词表规模、序列长度与计算效率之间的取舍。"
publishedAt: "2026-11-16T12:00:00+08:00"
category: "学习笔记"
subcategory: "CS336"
topic: "Tokenization"
tags: ["CS336", "BPE", "Tokenizer", "大语言模型"]
minutes: 12
sample: false
language: "zh-CN"
---

## 为什么语言模型需要 Tokenization？

我们阅读的是文字，语言模型处理的却是一串离散的符号。把输入文本变成这些符号，并用整数编号表示它们，就是 tokenization 的任务。

<strong>语言模型为各种可能的 token 序列分配概率</strong>，用来描述不同文本组合出现的可能性。模型通过训练学习语言中的规律，而 tokenizer 决定这些文本以什么样的基本单位进入模型。

## Token、编号与词表

一个 token 不一定等于一个字或一个单词。它可能对应完整单词、词的一部分、空格或标点；在字节级方法中，也可能只对应某个字符的部分字节。Tokenizer 通常提供两个操作：

```text
encode：文本 → token ID 序列
decode：token ID 序列 → 文本
```

词表（vocabulary）记录可用 token 与编号之间的对应关系。Token ID 是类别编号，不是句子中的位置，也不是大小有意义的数值。编号 100 和 101 相邻，并不表示它们语义相近。

在常见的 Transformer 中，token ID 用于查找 embedding，得到参与后续计算的向量。我们可以把这条路径理解为：<strong>文本 → 离散编号 → 向量表示 → 模型计算</strong>。Tokenizer 本身并没有完成语言理解。

对于不额外改写文本的编码流程，我们希望 encode 后再 decode 能还原原文。如果流程还包含大小写转换等有损预处理，就不能直接假设这一点。[tiktoken 说明](https://github.com/openai/tiktoken)与 [Tokenizers 流程文档](https://huggingface.co/docs/tokenizers/pipeline)展示了这些不同环节。

## 字符和字节，为什么要分清？

Unicode 为字符定义码点，UTF-8 则把有效的 Unicode 标量值编码成一到四个字节。码点和字节值虽然都可以写成整数，但表示的是不同东西。[Unicode 官方说明](https://www.unicode.org/faq/utf_bom.html)

```python
ord("猫")                  # 29483
list("猫".encode("utf-8"))   # [231, 140, 171]
```

29483 是「猫」的码点；231、140、171 是它的三个 UTF-8 字节值。因此，按码点切分时它可以是一个 token，按原始字节切分时则需要三个 token。一个屏幕上看起来完整的符号还可能包含多个码点，例如某些组合 emoji。

有了这层区别，就可以比较三种直接的表示方式：

| 方法 | 表示单位 | 主要取舍 |
| --- | --- | --- |
| 字符级 | 例如 Unicode 码点 | 直观；覆盖广泛文字系统需要较大的字符集合，部分字符出现很少。 |
| 字节级 | 一个字节 | 基础词表只有 256 项；序列往往较长。 |
| 单词级 | 完整单词或文本片段 | 常见词表示紧凑；词表容易膨胀，新词可能无法直接表示。 |

字符和字节提供了比较细的表示单位。如果希望进一步缩短序列，一个自然的想法就是：直接把完整单词作为一个 token。

## 单词级编码：直观的起点，开放的词汇

单词级编码（word-level tokenization）在传统 NLP 中很常见，早期神经机器翻译也广泛使用固定的单词词表。它符合人的阅读习惯：先把句子切成词，再为每个不同的词分配编号。[词级表示与开放词汇问题](https://aclanthology.org/P16-1162/)

一个直接的实现是按照空格切分英文文本。例如：

```text
"I'm learning NLP!" → ["I'm", "learning", "NLP!"]
```

但这样会把标点粘在单词上：NLP 和 NLP! 可能成为两个词表条目。为了更细致地处理文本，可以增加标点、缩写等切分规则，或使用正则表达式。例如，一种保留空格的规则可以得到：

```text
["I", "'", "m", " ", "learning", " ", "NLP", "!"]
```

这只是其中一种规则；也可以保留 I'm 为整体。无论采用哪一种，切分之后仍要统计片段、建立词表，并把它们映射为整数编号。<strong>划分词边界和给片段编号，是相邻但不同的两步。</strong>

这种方式的优势很直接。learning 有八个 ASCII 字节，按字节表示需要八个 token；如果词表中包含整个 learning，就只需一个。很多 token 对应人能够识别的词，序列也更紧凑。

问题在于，自然语言的词汇并不是一个预先封闭的集合。扩大语料、增加领域或加入新的语言，都会带来新的词形。更复杂的切分规则能够改善边界处理，却无法消除下面这些限制。

- <strong>词表规模难以控制。</strong>如果收录所有见过的词，词表会随着语料增长。一个常见办法是只保留出现频率最高的若干词，但这会把其余词排除在外。

- <strong>大量词很少出现。</strong>给每个罕见词保留独立条目，并不意味着模型有足够样本学好它。walk、walks、walked 如果分别占据独立词条，其拼写中的共享结构也不会直接体现在这些编号中。

- <strong>新词会遇到词表外问题。</strong>词表固定后，新名字、专业术语或拼写变体可能没有编号。若统一替换成 &lt;UNK&gt;，不同原词就会变成相同的表示，具体拼写信息随之丢失。

- <strong>词边界依赖语言和规则。</strong>英语中的缩写与连字符就需要额外处理；中文等语言也不能直接靠空格找到词边界。一个简单规则很难覆盖各种语言现象。

例如，如果 Velora 和 Nuvex 都不在词表中，那么 “I met Velora” 和 “I met Nuvex” 都可能变成 “I met &lt;UNK&gt;”。模型只看到同一个未知词标记，无法从这串表示恢复究竟出现了哪个名字。这也是评估时要留意的地方：预测对 &lt;UNK&gt; 不等于预测对原词，不能忽略词表覆盖率就直接比较困惑度。

处理罕见词曾有扩大词表、借助外部词典或复制原词等办法，但这些办法仍有局限，例如翻译中的词形变化和音译。另一条路线是允许词被拆成可复用的子词：常见词可以保留为整体，罕见词和新词则由更小的片段组成。2016 年，Sennrich 等人把 BPE 应用于神经机器翻译中的子词切分，推动了这种表示方式的使用。[Neural Machine Translation of Rare Words with Subword Units](https://aclanthology.org/P16-1162/)

从单词走向子词，核心变化是让「可表示的词」不再受限于「词表里逐个列出的完整单词」。BPE、WordPiece 和 Unigram 都可以构造子词表示，不过它们学习片段的方式不同。[子词编码方法](https://huggingface.co/docs/transformers/en/tokenizer_summary)

## 为什么不能只追求更大的词表？

单词级编码带来了更短的序列，也暴露了大词表的代价。选择表示单位时，需要同时考虑<strong>序列长度、词表规模和片段的复用程度</strong>。

一个直观指标是平均每个 token 对应多少个 UTF-8 字节：

$$
\text{bytes per token} = \frac{\text{UTF-8 bytes}}{\text{tokens}}
$$

对于同一段原文，这个值越大，token 序列越短。例如 learning 占八个 UTF-8 字节：按字节编码时，指标为 8 ÷ 8 = 1；把整个单词作为一个 token 时，指标变为 8 ÷ 1 = 8。这表示序列更短，并不意味着文件大小恰好缩小八倍，因为 token ID 也需要存储空间。

更短的序列可以在相同上下文 token 上限内容纳更多原文，也通常能减少处理这些原文所需的计算。但大词表也有代价：若词表大小为 V，embedding 维度为 d，一张 embedding 矩阵就需要 V × d 个参数；输出层还需要为词表中的候选 token 计算分数。

更极端地说，给每篇训练文章各分配一个 token，会让那些文章的序列非常短，却几乎无法复用到新文章。我们需要的是能复用、能学好、计算代价合适的表示，而不只是更高的压缩数字。

于是，问题变成了：<strong>能否保留足够小的基础单位来覆盖新文本，同时给频繁出现的片段更紧凑的表示？</strong>BPE 提供了一种由数据决定片段的办法。

## BPE：让常见片段拥有自己的编号

<strong>BPE（Byte Pair Encoding）</strong>通过数据中的相邻片段频率构造词表。字节级 BPE 从全部 256 种字节值开始，每轮合并最常见的相邻 token 对，并为合并结果增加一个词表条目。然后在更新后的序列上重新统计，继续合并。[BPE 训练过程](https://huggingface.co/learn/llm-course/en/chapter6/5)

这里的 pair 指的是<strong>当前相邻的两个 token</strong>。随着训练进行，一个 token 可以包含多个字节，所以后续合并不再局限于两个单字节。

看一个简化的手算例子。假设训练数据有三个独立片段，不跨片段合并：

```text
ababc
ababc
ababd
```

它们都由 ASCII 字符组成，一个字母正好是一个字节。初始表示为：

```text
[a, b, a, b, c]
[a, b, a, b, c]
[a, b, a, b, d]
```

1. <strong>第一轮：</strong>(a, b) 出现 6 次，合并为 ab，分配编号 256。

   ```text
   [ab, ab, c]   [ab, ab, c]   [ab, ab, d]
   ```

2. <strong>第二轮：</strong>(ab, ab) 出现 3 次，合并为 abab，分配编号 257。

   ```text
   [abab, c]    [abab, c]    [abab, d]
   ```

3. <strong>第三轮：</strong>(abab, c) 出现 2 次，合并为 ababc，分配编号 258。

   ```text
   [ababc]      [ababc]      [abab, d]
   ```

最终，ababc 从五个 token 变为一个，ababd 则变为两个。原来的字节条目仍然保留；不计特殊 token，这个示例的词表从 256 项增长到 259 项。

这个过程只依据频率，不要求 ab、abab 或 ababc 是有语义的词。<strong>BPE 学到的是便于表示数据的片段，不是一本语言学词典。</strong>

## 训练规则，和使用规则

训练 tokenizer 时，我们统计语料并决定合并规则；使用训练好的 tokenizer 时，则按照已有合并优先级编码新文本，不会重新统计这句输入中的词频来训练一套规则。[tiktoken 教学实现](https://github.com/openai/tiktoken/blob/main/tiktoken/_educational.py)

沿用上面的词表，对没有在训练数据中出现过的 ababx 编码：

```text
[a, b, a, b, x]
      ↓
[ab, ab, x]
      ↓
[abab, x]  →  [257, 120]
```

120 是字节 x 的编号。尽管训练语料中没有 x，初始词表仍然包含它。只要保留全部基础字节，就可以把此前没有见过的有效 UTF-8 文本拆成已有 token；可表示不等于模型已经学会其含义。

解码时，先取出各 token 对应的字节片段，再拼接并进行 UTF-8 解码：

```text
[257, 120] → b"abab" + b"x" → "ababx"
```

一个 token 的字节不一定独立构成完整字符。因此，应先拼接字节，再解码文本。编码得到的完整序列可以还原原文，但任意组合或截断的 token 序列不一定是有效 UTF-8。[Unicode 对非法字节序列的说明](https://www.unicode.org/faq/utf_bom.html)

## 从基本算法到可用的 tokenizer

理解合并机制之后，还需要处理真实文本的边界。实际流程可能包括预处理、预切分、子词编码以及特殊标记的添加或识别。各模型的具体配置不同。[Tokenization pipeline](https://huggingface.co/docs/tokenizers/pipeline)

- <strong>预切分：</strong>先把文本划为片段，限制 BPE 的合并边界。空格和标点如何处理，会影响最终切分。

- <strong>特殊 token：</strong>例如文档结束标记。被配置为特殊标记时，需要按约定处理，而不是随意拆成普通文本。

- <strong>效率：</strong>避免对每次输入遍历大量无关合并规则；同样的算法含义，可以有速度差别很大的实现。

下面使用 tiktoken 的 o200k_base 编码配置，观察不同文本的 token ID、字节片段和 bytes per token。具体切分以程序输出为准。

```python
import tiktoken

encoder = tiktoken.get_encoding("o200k_base")
samples = ["Hello, world!", "你好，世界！",
           "hello hello", "1234567890", "👩‍💻"]

for text in samples:
    ids = encoder.encode(text)
    parts = [encoder.decode_single_token_bytes(i)
             for i in ids]
    ratio = len(text.encode("utf-8")) / len(ids)
    assert encoder.decode(ids) == text
    print(repr(text))
    print("IDs:", ids)
    print("Bytes:", parts)
    print("Bytes/token:", round(ratio, 2))
```

运行前需要在 Python 环境中安装 tiktoken。这里输出字节片段，是为了避免把每一个 token 都误当成完整字符。[安装与使用说明](https://github.com/openai/tiktoken)

## 以后可以直接从字节开始吗？

独立的 tokenizer 是一种设计选择。研究者也在探索直接读取字节、由模型形成内部片段的路线。例如 Byte Latent Transformer（BLT）根据预测难度构造动态长度的 patch，把更多计算分配给较复杂的输入。[BLT 论文](https://arxiv.org/abs/2412.09871)

这个方向把问题进一步推向：模型应当在什么粒度上计算，以及如何让计算粒度随数据变化。我们可以先把 BPE 理解为一个具体、可实现的答案，再以它为参照阅读其他方法。

下一步动手时，我会关注三个问题：编码能否可靠还原原文；新片段能否用已有词表表示；词表变化如何影响序列长度。把这几个问题逐一验证，tokenization 就从一个名词变成了一段能够解释清楚的流程。
