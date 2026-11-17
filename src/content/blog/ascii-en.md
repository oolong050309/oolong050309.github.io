---
title: "ASCII: How Characters Become Numbers"
slug: "ascii-en"
description: "Understand bits, bytes, number bases, ASCII character values and control characters, and how ASCII leads to Unicode and modern text encoding."
publishedAt: "2026-11-17T12:00:00+08:00"
category: "学习笔记"
topic: "Character encoding"
tags: ["ASCII", "Character encoding", "Byte", "Hexadecimal", "Computer fundamentals"]
minutes: 9
sample: false
language: "en"
translationOf: "ascii"
---

Press A on a keyboard, and a letter appears on the screen. Save it to a file, and the storage device records bits. How does a letter become a sequence of zeros and ones?

We need a shared convention: assign values to characters and define how to represent those values. ASCII is one such convention. Its repertoire is small, which makes it a useful starting point for understanding the layers involved in text encoding.

## Bits, bytes, and interpretation

A bit has two possible values, conventionally written as 0 and 1. Throughout this article, a byte means the common modern unit of eight bits.

Eight bits have 256 possible combinations. Interpreted as an unsigned integer, a byte can represent values from 0 to 255:

```text
00000000 → 0
00000001 → 1
...
11111111 → 255
```

The bits `01000001` carry no built-in label saying “letter.” Interpreted as an unsigned integer, their value is 65. Interpreted using ASCII, they represent A. Within a different data format, that byte might contribute to a color, a sound, or an instruction.

Reading data therefore requires both the bytes and <strong>the rules for interpreting them</strong>. Character encoding provides conventions for representing text.

## Why encoding examples use hexadecimal

Binary exposes every bit, but long runs of zeros and ones are hard to read. Hexadecimal represents each group of four bits with one digit, using 0–9 and A–F for values 0–15.

Split a byte into two groups:

```text
0100 0001
  4    1
```

These three notations represent the same numerical value:

| Notation | Base | Value |
| --- | --- | ---: |
| `01000001` | Binary | 65 |
| `65` | Decimal | 65 |
| `0x41` | Hexadecimal | 65 |

The prefix `0x` commonly marks hexadecimal in programs. Changing the base changes how a value is written.

When an example shows bytes such as `48 65 6C 6C 6F`, first check the notation. Those entries are hexadecimal byte values.

## How ASCII assigns character values

ASCII stands for American Standard Code for Information Interchange. It assigns values to characters and control functions so that different systems can exchange text.

Standard ASCII uses seven bits and has 128 code positions, numbered 0–127. When stored in an eight-bit byte, the high bit can be set to zero. The value assigned to A is 65, represented by the byte `01000001`.

Some familiar entries are:

| Character or function | Decimal | Hexadecimal | Binary in an eight-bit byte |
| --- | ---: | --- | --- |
| Space, SP | 32 | `20` | `00100000` |
| `0` | 48 | `30` | `00110000` |
| `9` | 57 | `39` | `00111001` |
| `A` | 65 | `41` | `01000001` |
| `Z` | 90 | `5A` | `01011010` |
| `a` | 97 | `61` | `01100001` |
| `z` | 122 | `7A` | `01111010` |

A sender encodes A as 65, and a receiver using the same convention reconstructs A.

The letters and digits occupy consecutive ranges: uppercase letters at 65–90, lowercase letters at 97–122, and digit characters at 48–57. This explains many seemingly special constants in programs.

For example, the values for uppercase A and lowercase a differ by 32. That relationship applies to these ASCII letters; general case conversion across writing systems requires more extensive rules.

## The number 5 and the character “5”

The integer 5 is a numerical value. The string `"5"` contains a digit character, whose ASCII value is 53:

```text
Character "5" → ASCII value 53 → byte 00110101
```

Similarly, the text `"65"` contains two characters:

```text
"6" → 54 → 0x36
"5" → 53 → 0x35

"65" → 36 35
```

A itself uses the single ASCII byte `41`. Although its character value is 65, storing A and storing the text `"65"` produce different byte sequences.

This is why reading a number from text requires parsing: the program converts a sequence of digit characters into a numerical value.

## Spaces and control characters are data

ASCII includes more than visible letters. Values 0–31 and 127 identify control functions. Value 32 is space. The range 32–126 is commonly called printable ASCII; space occupies a position without drawing a visible mark.

Several entries are especially useful:

| Name | Decimal | Common notation | Meaning or use |
| --- | ---: | --- | --- |
| NUL | 0 | `\0` | Null character; some interfaces use it to terminate strings |
| HT | 9 | `\t` | Horizontal tab |
| LF | 10 | `\n` | Line feed |
| CR | 13 | `\r` | Carriage return |
| SP | 32 | Space | Separation and layout |
| DEL | 127 | — | Delete control character |

Carriage return and line feed originated as different device actions. Text files commonly use LF alone or the sequence CR followed by LF, written `\r\n`. A displayed line break may therefore correspond to one or two control characters.

In Python source, `"\n"` uses an escape to construct one line-feed character. By comparison, `"\\n"` contains a backslash followed by n. Source notation and the contents of the resulting string need to be examined separately.

The same care applies to spaces. Our tokenization animation displays an existing space as `␣`. An actual ASCII space has value 32; the visible symbol `␣` is a different character used as a display marker. The underlying input retains its real spaces.

## Inspecting ASCII with Python

Python’s `ord()` returns a character’s Unicode code point, and `chr()` performs the reverse operation. Unicode’s first 128 code points preserve ASCII’s values, so these functions can also illustrate the ASCII range:

```python
ord("A")       # 65
chr(65)        # 'A'
ord("5")       # 53
int("5")       # 5
```

To inspect explicitly encoded ASCII bytes, select the encoding:

```python
text = "Hello, A!"
raw = text.encode("ascii")

print(raw)                 # b'Hello, A!'
print(list(raw))           # [72, 101, 108, 108, 111, 44, 32, 65, 33]
print(raw.hex(" "))        # 48 65 6c 6c 6f 2c 20 41 21
print(raw.decode("ascii")) # Hello, A!
```

`b'Hello, A!'` is Python’s display representation of a bytes object. Printable ASCII bytes can be shown using their corresponding characters. `list()` displays integer byte values, while `hex()` writes them in hexadecimal.

Invisible characters can be inspected in the same way:

```python
raw = "A B\n".encode("ascii")
print(list(raw))       # [65, 32, 66, 10]
print(raw.hex(" "))    # 41 20 42 0a
```

Letters, spaces, and line breaks all contribute to the encoded data. Removing whitespace changes the original text.

## Why 128 positions are insufficient

ASCII represents the English letters used here, but it cannot directly represent Chinese characters, many accented letters, or numerous other writing systems:

```python
try:
    "猫".encode("ascii")
except UnicodeEncodeError:
    print("This character has no ASCII representation")
```

The failure tells us that this particular encoding cannot represent the character.

One way to expand the repertoire is to use the remaining values of an eight-bit byte. However, an extra 128 positions still cannot accommodate the world’s writing systems. Different systems also assigned different characters to the additional values. The name “extended ASCII” alone therefore does not identify one unique encoding table.

Regional encodings developed for different needs. Examples encountered in Chinese text processing include GB2312, GBK, GB18030, and Big5, each with its own history and rules. If the sender and receiver interpret the same bytes differently, the resulting text can be corrupted.

Expanding separate tables does not automatically solve exchange between systems. A shared character standard and suitable encoding forms are also needed.

## From ASCII to Unicode

[Unicode](/blog/unicode-en/) supplies a shared system of characters and code points for a much wider repertoire, along with encoding forms such as UTF-8, UTF-16, and UTF-32. ASCII characters retain their original numerical values. In UTF-8, they also retain their original single-byte representations.

A text consisting entirely of ASCII-range characters therefore has identical bytes in ASCII and UTF-8. This provides an important compatibility foundation for existing text, protocols, and software.

The Unicode article continues the same investigation with 猫 and Emoji: how they acquire code points and how those values become multiple bytes. When returning to [Tokenization](/blog/cs336-tokenization-en/), these distinctions help separate character values, byte values, and vocabulary IDs.
