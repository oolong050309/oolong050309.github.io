---
title: "CS336 Lecture 1: Tokenization, From Text to Token Sequences"
slug: "cs336-tokenization-en"
description: "Stanford CS336 Lecture 1 tokenization notes: how language models represent text across characters, UTF-8 bytes, word-level encoding, and BPE."
publishedAt: "2026-11-16T12:00:00+08:00"
category: "学习笔记"
subcategory: "CS336"
topic: "Tokenization"
tags: ["CS336", "Tokenization", "分词", "BPE", "Tokenizer", "UTF-8", "Unicode", "大语言模型"]
minutes: 13
sample: false
language: "en"
tokenizationDemo: true
translationOf: "cs336-tokenization"
---

## Why do language models need tokenization?

We read text, while a language model operates on a sequence of discrete symbols. Tokenization converts input text into those symbols and represents them with integer IDs.

<strong>A language model assigns probabilities to possible token sequences</strong> to describe how likely different text combinations are. The model learns patterns in language through training, while the tokenizer determines the units used to represent that text.

## Tokens, IDs, and the vocabulary

A token need not correspond to one character or one word. It can represent a word, a fragment, whitespace, or punctuation. With byte-level methods, it may even represent only part of a character’s bytes. A tokenizer typically supports two operations:

```text
encode: text → token IDs
decode: token IDs → text
```

The vocabulary maps available tokens to IDs. An ID is a categorical label, not a position in a sentence or a meaningful numerical magnitude. Tokens with IDs 100 and 101 need not be semantically related.

In a typical Transformer, the IDs index an embedding matrix to obtain vectors for subsequent computation. The path is <strong>text → discrete IDs → vectors → model computation</strong>. Tokenization itself does not provide language understanding.

For a pipeline that does not otherwise alter the input, encoding and then decoding should recover the original text. Lossy preprocessing, such as lowercasing, can invalidate that assumption.

### Watch a sentence become tokens

<!-- tokenization-demo -->

## Characters and bytes are different units

[Unicode](/blog/unicode-en/) defines code points. [UTF-8](/blog/unicode-en/#utf-8) represents valid Unicode scalar values using one to four bytes. Both code points and byte values can be written as integers, but they represent different things.

```python
# ord() returns the character's Unicode code point
ord("猫")                  # 29483

# encode("utf-8") produces UTF-8 bytes; list() displays their integer values
list("猫".encode("utf-8"))   # [231, 140, 171]
```

The character 猫 has code point 29483 and three UTF-8 bytes: 231, 140, and 171. A code-point tokenizer could represent it with one token, while a raw byte tokenizer would use three. A single visible symbol may also contain several code points, as with some combined emoji.

This distinction leads to three straightforward approaches:

| Method | Unit | Main trade-off |
| --- | --- | --- |
| Character-level | For example, a Unicode code point | Intuitive, but broad language coverage requires a large inventory, including rare characters. |
| Byte-level | One byte | Only 256 basic symbols, but often long sequences. |
| Word-level | A complete word or segment | Compact for familiar words, but a large vocabulary and difficulty with unseen words. |

Characters and bytes provide relatively small units. To shorten sequences further, a natural idea is to represent each complete word with a single token.

## Word-level encoding meets an open vocabulary

Word-level tokenization has been common in traditional NLP, and early neural machine translation also relied heavily on fixed word vocabularies. The approach follows an intuitive pattern: split a sentence into words, then assign an ID to each distinct word.

A straightforward implementation splits English text on whitespace:

```text
"I'm learning NLP!" → ["I'm", "learning", "NLP!"]
```

However, punctuation remains attached: NLP and NLP! could become separate vocabulary entries. More detailed rules or regular expressions can handle punctuation and contractions. One possible segmentation that preserves spaces is:

```text
["I", "'", "m", " ", "learning", " ", "NLP", "!"]
```

This is only one choice; a different rule could keep I'm intact. Either way, the resulting pieces still need to be counted, collected into a vocabulary, and mapped to integer IDs. <strong>Finding word boundaries and assigning IDs are separate steps.</strong>

The benefit is clear. The word learning consists of eight [ASCII](/blog/ascii-en/) characters and occupies eight UTF-8 bytes. A byte tokenizer needs eight tokens, while a vocabulary containing the whole word needs only one. Many tokens are recognizable words, and sequences become more compact.

Natural-language vocabulary, however, is not a closed set. More data, new domains, and additional languages introduce new word forms. Better boundary rules help with segmentation, but they do not remove the following limitations.

- <strong>Vocabulary size is difficult to control.</strong> Including every observed word makes the vocabulary grow with the corpus. Keeping only the most frequent words limits its size, but excludes the rest.

- <strong>Many words are rare.</strong> A separate entry does not ensure enough examples to learn it well. If walk, walks, and walked have separate IDs, those IDs do not explicitly encode the shared structure in their spelling.

- <strong>New words become out of vocabulary.</strong> Names, technical terms, or spelling variants may have no ID. Replacing them all with &lt;UNK&gt; collapses distinct words into the same representation and loses their spelling.

- <strong>Word boundaries depend on language and rules.</strong> English contractions and hyphens already require decisions. Languages such as Chinese cannot be segmented into words simply by splitting on spaces.

If neither Velora nor Nuvex is in the vocabulary, “I met Velora” and “I met Nuvex” could both become “I met &lt;UNK&gt;”. The representation cannot recover which name appeared. This also matters for evaluation: correctly predicting &lt;UNK&gt; is not the same as predicting the original word, so vocabulary coverage cannot be ignored when comparing perplexity.

Earlier approaches handled rare words through larger vocabularies, external dictionaries, or copying source words. These still had limitations, including inflection and transliteration in translation. Subword methods offer another route: frequent words may remain intact, while rare and new words can be composed from smaller reusable pieces. In 2016, Sennrich and colleagues adapted BPE for subword segmentation in neural machine translation. [Neural Machine Translation of Rare Words with Subword Units](https://aclanthology.org/P16-1162/)

The key change is that representable words no longer have to be listed individually as complete vocabulary entries. BPE, WordPiece, and Unigram all support subword representations, although they learn pieces differently.

## Why not keep growing the vocabulary?

Word-level encoding gives us shorter sequences while exposing the costs of a large vocabulary. Choosing a representation means considering <strong>sequence length, vocabulary size, and the reusability of pieces</strong> together.

One intuitive measure is the average number of UTF-8 bytes represented by each token:

$$
\text{bytes per token} = \frac{\text{UTF-8 bytes}}{\text{tokens}}
$$

For the same text, a larger value means a shorter token sequence. A passage occupying 1,000 UTF-8 bytes requires 1,000 tokens with raw byte encoding. At an average of four bytes per token, it needs only about 250 tokens. This “compression” shortens the sequence while preserving the input information. It does not necessarily reduce the file size fourfold, since token IDs also require storage.

Sequence length directly affects computation. In standard full self-attention, each token can interact with the other tokens in the sequence. With a fixed hidden dimension, the computation for these pairwise interactions grows as $O(L^2)$ with sequence length $L$. Reducing a sequence from 1,000 to 250 tokens makes it four times shorter, reducing this attention computation to approximately one sixteenth. Shorter sequences also allow more original text within the same context-token limit.

This explains why compact representations usually help during training and prompt processing. Actual model speed also depends on projections, feed-forward networks, hardware utilization, and memory access, so the reduction above is not an overall speedup factor.

Step-by-step generation also involves caching. Typical autoregressive generation uses a KV cache to reuse the keys and values of past tokens. Each step mainly computes attention between the new token and the existing context, making this part of the cost approximately linear in context length. For the same output text, a more compact representation usually requires fewer generation steps; the same input text also occupies a shorter cache. Shorter sequences still help, but each generation step does not recompute a full $L \times L$ attention matrix.

Adding ever longer pieces to the vocabulary also brings costs. First, <strong>training examples become sparse</strong>. If many complete words, phrases, or sentences receive their own tokens, some may occur only a few times in the training corpus. The model has more individual entries to learn, without necessarily having enough examples for the rare ones. Reusable smaller pieces allow different texts to share training opportunities for those pieces.

Second, <strong>parameter and computation costs increase</strong>. With vocabulary size $V$ and embedding dimension $d$, one embedding matrix contains $V \times d$ parameters. Holding the dimension fixed, a fourfold vocabulary increase makes that matrix four times larger, using more storage and device memory. A typical full-vocabulary output layer also scores every candidate token at each prediction, so a larger vocabulary increases that computation.

As an extreme thought experiment, assigning one token to every training article would make those articles very short sequences, but the entries would barely transfer to new articles. We need representations that are reusable, learnable, and computationally appropriate, beyond a high compression number.

The aim is therefore to <strong>use a bounded vocabulary that represents frequent pieces compactly while composing rare pieces from smaller units</strong>. We want fewer tokens to process, enough examples to learn vocabulary entries well, and manageable parameter and computation costs. BPE provides a way to choose those pieces from data.

## BPE gives common pieces their own IDs

<strong>Byte Pair Encoding (BPE)</strong> builds a vocabulary using adjacent-piece frequencies. Byte-level BPE begins with all 256 byte values. Each training step merges the most frequent adjacent token pair and adds the resulting token to the vocabulary. Pair counts are then recomputed on the updated sequences.

A pair consists of two tokens that are adjacent <strong>at the current training step</strong>. Tokens grow during training, so later merges need not involve single bytes.

Consider three independent segments, with no merging across segment boundaries:

```text
ababc
ababc
ababd
```

These are ASCII characters, so each letter occupies one byte. Initially:

```text
[a, b, a, b, c]
[a, b, a, b, c]
[a, b, a, b, d]
```

1. <strong>Step 1:</strong> (a, b) occurs 6 times. Merge it into ab and assign ID 256.

   ```text
   [ab, ab, c]   [ab, ab, c]   [ab, ab, d]
   ```

2. <strong>Step 2:</strong> (ab, ab) occurs 3 times. Merge it into abab and assign ID 257.

   ```text
   [abab, c]    [abab, c]    [abab, d]
   ```

3. <strong>Step 3:</strong> (abab, c) occurs 2 times. Merge it into ababc and assign ID 258.

   ```text
   [ababc]      [ababc]      [abab, d]
   ```

The segment ababc now takes one token instead of five, while ababd takes two. The original byte entries remain available. Excluding special tokens, the vocabulary has grown from 256 to 259 entries.

Nothing requires ab, abab, or ababc to be meaningful words. <strong>BPE learns reusable pieces for representing data, rather than a linguistic dictionary.</strong>

## Learning rules and applying rules

Training a tokenizer uses corpus statistics to learn merges. Encoding new text applies the existing merge priorities; it does not train a new set of rules from the frequencies in each input.

Using our vocabulary, the unseen segment ababx becomes:

```text
[a, b, a, b, x]
      ↓
[ab, ab, x]
      ↓
[abab, x]  →  [257, 120]
```

The byte value for x is 120. Even though x was absent from the training segments, it remains in the base vocabulary. Retaining all bytes makes previously unseen valid UTF-8 text representable. Representability, however, does not mean the model has learned its meaning.

Decoding retrieves each token’s bytes, concatenates them, and then decodes the combined sequence as UTF-8:

```text
[257, 120] → b"abab" + b"x" → "ababx"
```

An individual token may not contain a complete character, so bytes should be combined before decoding. A complete encoded sequence can reconstruct its input, but arbitrary or truncated token sequences may not form valid UTF-8.

## From a basic algorithm to a usable tokenizer

Real text requires more than a merge loop. A practical pipeline may include preprocessing, pre-tokenization, subword encoding, and the addition or recognition of special markers. The exact configuration depends on the model.

- <strong>Pre-tokenization:</strong> divide text into segments that constrain merge boundaries. Whitespace and punctuation handling affect the result.

- <strong>Special tokens:</strong> document-end markers, for example, need their configured treatment when recognized as special markers.

- <strong>Efficiency:</strong> avoid scanning many irrelevant merge rules for every input. Implementations of the same algorithm can differ greatly in speed.

The following code uses tiktoken’s o200k_base encoding to inspect token IDs, byte pieces, and bytes per token for different inputs. The program’s output determines the concrete segmentation.

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

Install tiktoken in your Python environment before running the example. Printing byte pieces helps avoid treating each token as a complete character.

## Could models start directly from bytes?

A separate tokenizer is a design choice. Researchers also explore models that read bytes directly and form internal groups. For example, the Byte Latent Transformer (BLT) forms dynamically sized patches using prediction difficulty, allocating more computation to complex input. [BLT paper](https://arxiv.org/abs/2412.09871)

This extends the question to the granularity at which a model should compute, and how that granularity might adapt to the data. BPE provides a concrete, implementable starting point against which other approaches can be understood.

When implementing a tokenizer, I will focus on three questions: can the encoding reliably reconstruct the input, can new segments be represented with the existing vocabulary, and how does vocabulary growth affect sequence length? Working through these questions turns tokenization from a term into a process that can be explained and checked.
