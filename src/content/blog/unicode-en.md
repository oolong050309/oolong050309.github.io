---
title: "Unicode: From Code Points and UTF-8 to Emoji"
slug: "unicode-en"
description: "Distinguish characters, code points, code units and bytes; work through UTF-8, UTF-16 surrogate pairs, Emoji, normalization and decoding errors."
publishedAt: "2026-11-17T14:00:00+08:00"
category: "学习笔记"
topic: "Character encoding"
tags: ["Unicode", "UTF-8", "UTF-16", "UTF-32", "Code point", "Emoji", "Character encoding"]
minutes: 16
sample: false
language: "en"
translationOf: "unicode"
---

[ASCII](/blog/ascii-en/) assigns shared values to English letters, digits, and control functions. Everyday text, however, can combine English, Chinese, mathematical symbols, and Emoji. Exchanging this text requires conventions that work across writing systems.

Unicode defines code points, names, character properties, and text-processing rules. It also defines encoding forms such as UTF-8, UTF-16, and UTF-32. A concrete way to understand the layers is to follow <strong>characters to code points, code points to bytes, and bytes back to text</strong>.

## Characters, code points, code units, and glyphs

These terms describe different parts of the process:

| Term | What it describes | Example |
| --- | --- | --- |
| Character | An abstract element with an identity in text | Latin A or the character 猫 |
| Code point | A numerical position in the Unicode codespace | `U+0041` or `U+732B` |
| Code unit | The basic unit used by an encoding form | An eight-bit UTF-8 unit or a 16-bit UTF-16 unit |
| Byte | An eight-bit data unit in this article | The hexadecimal byte `E7` |
| Glyph | A shape drawn by a font and rendering system | The appearance of A in a particular font |
| Grapheme cluster | A text unit grouped by segmentation rules | A letter with a combining accent, or certain Emoji sequences |

For example, 猫 has code point `U+732B`. UTF-8 represents it with the bytes `E7 8C AB`. Drawing it on screen additionally requires a font and a rendering system.

For simple English text, several of these quantities happen to coincide. Combining characters and Emoji expose the differences.

## Writing a code point

Unicode writes a code point as `U+` followed by four to six hexadecimal digits. Pad shorter values on the left with zeros, as in `U+0041`. Keep longer values at their natural length, as in `U+1F600`. The padding is a convention for writing code points. The UTF-8 encoding of `A` still takes one byte.

| Text | Code point | Decimal value |
| --- | --- | ---: |
| `A` | `U+0041` | 65 |
| `猫` | `U+732B` | 29483 |
| `😀` | `U+1F600` | 128512 |

`U+732B` denotes the position whose hexadecimal value is 732B. The number of symbols used to write that notation does not determine how many bytes an encoding needs.

Python can display code points and names:

```python
import unicodedata

for ch in ["A", "猫", "😀"]:
    print(ch, f"U+{ord(ch):04X}", unicodedata.name(ch))
```

Unicode preserves the first 128 ASCII values. Thus `ord("A")` returns 65, corresponding both to its ASCII value and to `U+0041`. The result of `ord("猫")` lies beyond ASCII’s repertoire.

### How many code points are there, and how many characters?

Every integer from `U+0000` through `U+10FFFF` is a code point, a position in the Unicode codespace. The space has 17 planes of 65,536 (2¹⁶) positions each. Plane 0, the Basic Multilingual Plane (BMP), runs from `U+0000` through `U+FFFF`. The remaining 16 planes are supplementary planes.

In Unicode 17.0, each of the **1,114,112 positions** falls into one of the six groups below. All ranges include both endpoints.

| Use | Positions | Where they occur |
| --- | ---: | --- |
| Graphic and format characters (the published character count) | 159,801 | Spread across many ranges. Examples include uppercase Latin letters at `U+0041`–`U+005A`, 猫 at `U+732B`, and the zero width joiner at `U+200D`. |
| Controls | 65 | `U+0000`–`U+001F` and `U+007F`–`U+009F`. Line feed is `U+000A`. |
| Private-use code points | 137,468 | `U+E000`–`U+F8FF`, `U+F0000`–`U+FFFFD`, and `U+100000`–`U+10FFFD`. Users agree on what a given position means. |
| Surrogate code points | 2,048 | `U+D800`–`U+DBFF` supplies the first code unit in a UTF-16 surrogate pair, and `U+DC00`–`U+DFFF` supplies the second. |
| Noncharacters | 66 | The 32 positions from `U+FDD0` through `U+FDEF`, plus the last two positions in each of the 17 planes (such as `U+FFFE` and `U+FFFF`). All 32 + 17 × 2 positions are permanently set aside for internal use. |
| Unassigned positions | 814,664 | The gaps between the ranges covered by the first five rows. For example, `U+0378`–`U+0379` are available for future assignment in version 17.0. |

The rows add up to three useful totals.

- **Assigned characters** occupy the first three rows. Adding controls and private-use code points to the published character count gives 159,801 + 65 + 137,468 = **297,334**.
- **Designated code points** occupy the first five rows. Adding surrogates and noncharacters to the assigned characters gives 297,334 + 2,048 + 66 = **299,448**. For example, `U+FFFF` already has a permanent use as a noncharacter, so it will never be allocated to a new character.
- **The entire codespace** spans all six rows. The 299,448 designated positions and 814,664 unassigned positions add up to **1,114,112**.

Why set aside the surrogate range? The code point for `😀`, `U+1F600`, exceeds `FFFF`, the largest value a single 16-bit code unit can hold. UTF-16 represents the face with two code units, `D83D DE00`. The first tells the decoder to read its partner so it can recover the original code point. Neither value represents a character on its own. Removing the surrogate range leaves two ranges of **Unicode scalar values**, `U+0000`–`U+D7FF` and `U+E000`–`U+10FFFF`.

## How Unicode and the UTFs fit together

A code point still needs a representation when text is saved or transmitted. Unicode defines three common encoding forms:

- <strong>UTF-8:</strong> eight-bit code units; one scalar value uses one to four units.
- <strong>UTF-16:</strong> 16-bit code units; one scalar value uses one or two units.
- <strong>UTF-32:</strong> 32-bit code units; one scalar value uses one unit.

The numbers 8, 16, and 32 describe the width of a code unit. Serializing multi-byte code units also requires a byte-order convention.

The same 猫 can consequently have different byte representations:

| Encoding scheme | Bytes, without a BOM |
| --- | --- |
| UTF-8 | `E7 8C AB` |
| UTF-16BE (big-endian) | `73 2B` |
| UTF-16LE (little-endian) | `2B 73` |
| UTF-32BE (big-endian) | `00 00 73 2B` |

Decoding each representation with its corresponding rules recovers the same code point. The later section on [byte order and BOM](#byte-order-and-bom) explains how big-endian and little-endian encodings order the bytes.

## UTF-8

UTF-8 uses different sequence lengths for different scalar-value ranges. The first byte contains structural information, and continuation bytes start with the bits `10`:

| Code point range | Bytes | Bit structure |
| --- | ---: | --- |
| `U+0000`–`U+007F` | 1 | `0xxxxxxx` |
| `U+0080`–`U+07FF` | 2 | `110xxxxx 10xxxxxx` |
| `U+0800`–`U+FFFF`, excluding surrogates | 3 | `1110xxxx 10xxxxxx 10xxxxxx` |
| `U+10000`–`U+10FFFF` | 4 | `11110xxx 10xxxxxx 10xxxxxx 10xxxxxx` |

Each x carries a bit of the code point value. The fixed prefixes identify the structure. Valid encoding also requires the appropriate range and shortest representation, so the prefixes alone are insufficient for validation.

**Range** determines which values can be encoded. UTF-8 can represent only Unicode scalar values. For example, `U+D800` is a surrogate code point, and `0x110000` exceeds the highest code point, `U+10FFFF`. Neither has a valid UTF-8 encoding.

**Shortest representation** determines how many bytes a value takes. The code point for `A` is 65, or `1000001` in binary. It fits in the one-byte pattern `0xxxxxxx`, giving `01000001` (hex `41`). Suppose we force the same value into the two-byte pattern `110xxxxx 10xxxxxx`. The six slots on the right take `000001`. The remaining `1` is padded to `00001` for the five slots on the left. The result is `11000001 10000001` (`C1 81`). The prefixes fit the pattern, but 65 needs only one byte. A UTF-8 decoder must treat `C1 81` as an invalid **overlong encoding**.

### Start with ASCII

`A` has code point `U+0041`, which falls in the one-byte range. First, write its value in binary:

```text
0x41 → 1000001
```

The one-byte pattern `0xxxxxxx` has seven payload bits. Insert those bits after the fixed prefix `0`:

```text
0 + 1000001 → 01000001
```

The result is:

```text
Binary:              01000001
Hexadecimal:         41
Decimal byte values: [65]
```

This is also the ASCII byte for `A`. The same holds throughout the ASCII range, so valid ASCII text can be read unchanged as UTF-8.

### Work through 猫 by hand

猫 has code point `U+732B`, which falls in the three-byte range. First, write its value in binary:

```text
0x732B → 0111 0011 0010 1011
```

The three-byte pattern has 4 + 6 + 6 payload bits. Group the value accordingly:

```text
0111 | 001100 | 101011
```

Insert those groups into the fixed structure:

```text
1110 + 0111   → 11100111
10   + 001100 → 10001100
10   + 101011 → 10101011
```

The result is:

```text
Binary:              11100111 10001100 10101011
Hexadecimal:         E7 8C AB
Decimal byte values: [231, 140, 171]
```

Verify it with the standard library:

```python
text = "猫"
raw = text.encode("utf-8")

print(ord(text))           # 29483
print(raw.hex(" "))        # e7 8c ab
print(list(raw))           # [231, 140, 171]
print(raw.decode("utf-8")) # 猫
```

29483 is the decimal code point value. The numbers 231, 140, and 171 are the values of the resulting individual bytes.

### Four bytes and decoding

`😀` has code point `U+1F600`, which falls in the four-byte range. First, write its value in binary:

```text
0x1F600 → 1 1111 0110 0000 0000
```

The four-byte pattern `11110xxx 10xxxxxx 10xxxxxx 10xxxxxx` has 3 + 6 + 6 + 6 payload bits. The binary value takes 17 bits, so pad it on the left with four zeros to fill all 21 slots. Working from the right, take three groups of six bits. That leaves three bits on the left:

```text
000 | 011111 | 011000 | 000000
```

Insert the groups from left to right. Prefix the first group with `11110` and each remaining group with `10`:

```text
11110 + 000    → 11110000
10    + 011111 → 10011111
10    + 011000 → 10011000
10    + 000000 → 10000000
```

The result is:

```text
Binary:              11110000 10011111 10011000 10000000
Hexadecimal:         F0 9F 98 80
Decimal byte values: [240, 159, 152, 128]
```

To decode these bytes, read the `11110` prefix in the first byte. It signals a four-byte sequence. After validating the sequence, remove that prefix and the `10` prefix from each continuation byte. Joining the four payload groups in order recovers `U+1F600`, the code point for `😀`.

The question “How many bytes does a Chinese character use?” therefore needs both an encoding and a specific character. Many common Han characters use three UTF-8 bytes; supplementary-plane Han characters use four.

### Can every byte fragment be decoded?

A continuation byte of the form `10xxxxxx` cannot start a character by itself. A three-byte sequence may arrive with only its first two bytes. Overlong representations, surrogate values, and values above `U+10FFFF` are also invalid in UTF-8.

File and network chunks can end in the middle of a character. An incremental decoder keeps an incomplete sequence until the remaining bytes arrive. Slicing by arbitrary byte positions can therefore produce fragments that cannot be decoded independently.

## UTF-16 and surrogate pairs

UTF-16 uses 16-bit code units. A scalar value in the BMP uses one unit. A supplementary scalar value uses two units, known as a <strong>surrogate pair</strong>.

For `😀`:

```text
U+1F600 → D83D DE00
```

To calculate the pair, first subtract `0x10000`:

```text
0x1F600 - 0x10000 = 0xF600
```

Split this result into two groups of ten bits. Add the high group to `0xD800` and the low group to `0xDC00`, producing `D83D` and `DE00`. Together, the two code units represent the original scalar value.

A code point consequently uses either two or four UTF-16 bytes. Taking only half of a surrogate pair produces an incomplete representation.

### Byte order and BOM

A 16-bit code unit has two bytes. Big-endian, or BE, places the high byte first. Little-endian, or LE, places the low byte first. For `0x732B`:

```text
UTF-16BE: 73 2B
UTF-16LE: 2B 73
```

The code units of a surrogate pair remain in their logical order. Byte order determines the byte arrangement within each unit. Thus `D83D DE00` becomes `3D D8 00 DE` in UTF-16LE.

A Byte Order Mark, or BOM, uses `U+FEFF` as an initial marker. Its bytes are `FE FF` in UTF-16BE and `FF FE` in UTF-16LE, allowing a reader to identify the byte order.

UTF-8 can also carry the BOM bytes `EF BB BF`. Because a UTF-8 code unit is one byte, this marker acts as an encoding signature rather than choosing an endianness. Whether a format uses, accepts, or ignores a BOM depends on that format and its parser.

## UTF-32 and representation size

UTF-32 represents each Unicode scalar value with one 32-bit code unit, or four bytes. Code point and code unit counts therefore coincide for valid scalar-value sequences. A visible text unit made of several code points still requires several UTF-32 units.

Compare the encoded byte counts:

| Text | UTF-8 | UTF-16 | UTF-32 |
| --- | ---: | ---: | ---: |
| `A` | 1 | 2 | 4 |
| `猫` | 3 | 2 | 4 |
| `😀` | 4 | 4 | 4 |
| `ABC猫` | 6 | 8 | 16 |

These counts exclude a BOM, language-object overhead, and any file-format or protocol metadata.

All three forms can represent the same Unicode scalar-value sequence. Their size trade-offs depend on the text, while processing costs also depend on the application.

## One visible character can contain several code points

The letter `é` can use the single code point `U+00E9` or a sequence consisting of e and a combining acute accent:

```text
U+0065 + U+0301
```

These sequences can look the same while having different code point counts and bytes.

The pregnant man emoji `🫃` uses one code point. Adding a medium skin tone modifier gives `🫃🏽`, a sequence of two code points.

```text
🫃   → U+1FAC3
🫃🏽  → U+1FAC3 + U+1F3FD
```

A font that supports the combination displays `🫃🏽` as one emoji with the specified skin tone. The sequence still counts as one grapheme cluster.

Unicode’s <strong>extended grapheme cluster</strong> rules provide boundaries useful for operations such as cursor movement and truncation. Grapheme clusters are text-processing units. Their count does not necessarily equal the glyph count or the width on screen.

The following quantities can all be correct:

| Text | UTF-8 bytes | Code points | UTF-16 code units | Default extended grapheme clusters |
| --- | ---: | ---: | ---: | ---: |
| `A` | 1 | 1 | 1 | 1 |
| `猫` | 3 | 1 | 1 | 1 |
| `😀` | 4 | 1 | 2 | 1 |
| `é` as `U+00E9` | 2 | 1 | 1 | 1 |
| `e` + `U+0301` | 3 | 2 | 2 | 1 |
| `🫃` | 4 | 1 | 2 | 1 |
| `🫃🏽` | 8 | 2 | 4 | 1 |

A limit of “20 characters” therefore needs a chosen unit: bytes, code points, or grapheme clusters. Byte truncation can break UTF-8 sequences; code point truncation can still split combining sequences and Emoji.

## Why Python and JavaScript report different lengths

Python’s `str` exposes code point-based length and indexing operations. JavaScript string length and ordinary indexing use UTF-16 code units.

In Python:

```python
text = "🫃"
print(len(text))                   # 1
print(len(text.encode("utf-8")))   # 4
```

In JavaScript:

```javascript
const text = "🫃";
console.log(text.length);                         // 2 UTF-16 code units
console.log([...text].length);                    // 1 code point
console.log(new TextEncoder().encode(text).length); // 4 UTF-8 bytes

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
console.log([...segmenter.segment(text)].length); // 1 grapheme cluster
```

The operations measure different units. For valid Unicode text, JavaScript string iteration can visit code points, while ordinary indexing still visits code units. A language’s string semantics also do not fully specify an engine’s internal memory representation.

Fonts handle another layer: the same code point can have different shapes in different fonts, and multiple code points can participate in one glyph. A missing-glyph box calls for checking font support; an unusual display alone does not establish that the bytes were decoded incorrectly.

## Comparing text that looks the same

The two forms of `é` can render alike but compare differently as strings:

```python
import unicodedata

a = "\u00e9"
b = "e\u0301"

print(a == b)  # False
print(unicodedata.normalize("NFC", a) ==
      unicodedata.normalize("NFC", b))  # True
```

Unicode normalization provides consistent representations for specific equivalence relations:

| Form | Main process |
| --- | --- |
| NFD | Canonical decomposition and ordering |
| NFC | Canonical decomposition and ordering, followed by composition |
| NFKD | Compatibility decomposition and ordering |
| NFKC | Compatibility decomposition and ordering, followed by composition |

Canonical equivalence covers examples such as composed and decomposed accents. Compatibility equivalence additionally merges certain presentation distinctions. For example, NFKC maps fullwidth `Ａ` and circled `①` to `A` and `1`.

The appropriate normalization depends on which distinctions a task should preserve. Search, deduplication, and storage of original text can have different requirements. Normalization, case folding, and collation also address different operations.

Normalization can change code points and encoded bytes. Claims about recovering the original input must therefore specify whether such preprocessing occurred.

## Where corrupted text comes from

Files and networks require conversion between text and bytes:

```text
Text → encode → bytes → storage or transport → bytes → decode → text
```

Using different encoding and decoding conventions can produce incorrect text:

```python
original = "café"
raw = original.encode("utf-8")
wrong = raw.decode("latin-1")

print(raw.hex(" ")) # 63 61 66 c3 a9
print(wrong)        # cafÃ©
```

The final two UTF-8 bytes jointly represent é, but the other decoder interprets them separately. If no information was replaced or discarded, this particular transformation can be reversed:

```python
wrong = "cafÃ©"
restored = wrong.encode("latin-1").decode("utf-8")
print(restored)  # café
```

Discarded bytes and replaced characters generally cannot be reconstructed completely from the resulting text alone. Troubleshooting should therefore examine the original bytes and the actual conversion rules where possible.

### Handling invalid bytes

Consider 猫 with its final UTF-8 byte missing:

```python
raw = b"\xe7\x8c"

try:
    raw.decode("utf-8", errors="strict")
except UnicodeDecodeError:
    print("Incomplete UTF-8 sequence")

print(raw.decode("utf-8", errors="replace")) # �
print(repr(raw.decode("utf-8", errors="ignore"))) # ''
```

`strict` reports an error, `replace` inserts a replacement character, and `ignore` discards undecodable data. Each choice produces a different result.

### Files, declarations, and escapes

Specify the encoding when reading or writing text:

```python
from pathlib import Path

path = Path("unicode-example.txt")
path.write_text("猫😀", encoding="utf-8")

print(path.read_bytes().hex(" ")) # e7 8c ab f0 9f 98 80
print(path.read_text(encoding="utf-8")) # 猫😀
```

An HTML declaration such as `<meta charset="UTF-8">`, and relevant HTTP metadata, help a receiver select decoding rules. Editing a declaration by itself does not transcode the existing file.

Source-code escapes operate at another layer:

```python
text = "\u732b"
literal = r"\u732b"

print(text, len(text))       # 猫 1
print(literal, len(literal)) # \u732b 6
```

The first string contains 猫. The second contains a backslash, u, and four hexadecimal digit characters. Interpreting `\uXXXX` requires the surrounding language or data format: it may be escape syntax or ordinary literal text.

## Connecting this to tokenization

These units lead into the representation used by language models:

```text
Text → UTF-8 bytes → tokenizer pieces → token IDs
```

猫 has Unicode code point value 29483 and UTF-8 byte values 231, 140, and 171. Its representation in a tokenizer depends on the tokenizer’s vocabulary. Character standards, byte encodings, and model input representations each introduce their own units.

A byte-level token can cover several characters or only some bytes of one character. Decoding usually combines token bytes before interpreting the complete text as UTF-8.

These distinctions provide the background used in [Tokenization: From Text to Token Sequences](/blog/cs336-tokenization-en/). Specifying the unit makes it possible to explain why character, byte, and token counts differ.
