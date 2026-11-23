---
title: "ASCII: How Characters Become Numbers"
slug: "ascii-en"
description: "Understand how ASCII assigns values to letters, digits, spaces, and control characters, why its repertoire is limited, and how it leads to Unicode."
publishedAt: "2026-11-17T12:00:00+08:00"
category: "学习笔记"
topic: "Character encoding"
tags: ["ASCII", "Character encoding", "Control characters", "Computer fundamentals"]
minutes: 6
sample: false
language: "en"
translationOf: "ascii"
---

ASCII stands for American Standard Code for Information Interchange. It assigns values to characters and control functions so that different systems can exchange text.

For example, ASCII assigns 65 to the letter `A`, 97 to lowercase `a`, and 32 to a space. A sender represents characters using these values, and a receiver reconstructs them using the same table.

```text
Character "A" → ASCII value 65 → character "A"
```

**A shared convention determines how characters correspond to numbers.** ASCII provides one such character table.

## How ASCII assigns character values

Standard ASCII has 128 code positions, numbered 0–127, covering English letters, digits, punctuation, spaces, and control characters.

Some familiar entries are:

| Character or function | ASCII value |
| --- | ---: |
| Space, SP | 32 |
| `0` | 48 |
| `9` | 57 |
| `A` | 65 |
| `Z` | 90 |
| `a` | 97 |
| `z` | 122 |

The letters and digits occupy consecutive ranges: uppercase letters at 65–90, lowercase letters at 97–122, and digit characters at 48–57. This explains many seemingly special constants in programs.

For example, the values for uppercase A and lowercase a differ by 32. That relationship applies to these ASCII letters; general case conversion across writing systems requires more extensive rules.

## The number 5 and the character “5”

The integer 5 is a numerical value. The string `"5"` contains a digit character, whose ASCII value is 53:

```text
Character "5" → ASCII value 53
```

Similarly, the text `"65"` contains two characters with two ASCII values:

```text
"6" → 54
"5" → 53

"65" → [54, 53]
```

The character `A` corresponds to the single value 65. Although its assigned value is 65, `A` and the text `"65"` are different content.

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

You can also convert every character in a string to its value and reconstruct the text:

```python
text = "Hello, A!"
codes = [ord(char) for char in text]

print(codes)                             # [72, 101, 108, 108, 111, 44, 32, 65, 33]
print("".join(chr(code) for code in codes)) # Hello, A!
```

Every character in this example belongs to ASCII, so the values returned by `ord()` match its ASCII values. Keeping the values in order lets us reconstruct the original text using the same mapping.

Invisible characters can be inspected in the same way:

```python
text = "A B\n"
print([ord(char) for char in text]) # [65, 32, 66, 10]
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

One way to expand the repertoire is to extend the range to 0–255. However, an extra 128 positions still cannot accommodate the world’s writing systems. Different systems also assigned different characters to the additional values. The name “extended ASCII” alone therefore does not identify one unique encoding table.

Regional encodings developed for different needs. Examples encountered in Chinese text processing include GB2312, GBK, GB18030, and Big5, each with its own history and rules. If the sender and receiver interpret the same data differently, the resulting text can be corrupted.

Expanding separate tables does not automatically solve exchange between systems. A shared character standard and suitable encoding forms are also needed.

## From ASCII to Unicode

[Unicode](/blog/unicode-en/) supplies a shared system of characters and code points for a much wider repertoire, along with encoding forms such as UTF-8, UTF-16, and UTF-32. ASCII characters retain their original numerical values, and UTF-8 preserves their original encoded representations.

Text consisting entirely of ASCII-range characters can therefore be read correctly as UTF-8. This provides an important compatibility foundation for existing text, protocols, and software.

The Unicode article continues the same investigation with 猫 and Emoji: how they acquire code points and how they are encoded and stored. When returning to [Tokenization](/blog/cs336-tokenization-en/), these distinctions help separate character values and vocabulary IDs.
