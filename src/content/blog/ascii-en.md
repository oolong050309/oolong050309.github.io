---
title: "ASCII: How Characters Become Numbers"
slug: "ascii-en"
description: "Read the ASCII character table, explore control characters and forms such as ^M, and see how Python escapes and Unicode relate to ASCII."
publishedAt: "2026-11-17T12:00:00+08:00"
category: "学习笔记"
topic: "Character encoding"
tags: ["ASCII", "Character encoding", "Control characters", "Caret notation", "Escape sequences", "Computer fundamentals"]
minutes: 10
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

The table can be divided into these consecutive ranges.

| ASCII value | Category | Examples |
| --- | --- | --- |
| 0–31 | Control characters | NUL is 0, LF is 10 |
| 32 | Space | Abbreviated SP |
| 33–47 | Punctuation and symbols | `!` is 33, `/` is 47 |
| 48–57 | Digit characters | `0` is 48, `9` is 57 |
| 58–64 | Punctuation and symbols | `:` is 58, `@` is 64 |
| 65–90 | Uppercase letters | `A` is 65, `Z` is 90 |
| 91–96 | Punctuation and symbols | `\` is 92, `^` is 94, `_` is 95 |
| 97–122 | Lowercase letters | `a` is 97, `z` is 122 |
| 123–126 | Punctuation and symbols | `{` is 123, `~` is 126 |
| 127 | Delete control character | Abbreviated DEL |

Letters and digits each occupy consecutive ranges. If `A` is 65, then `B` is 66. Punctuation and symbols occupy several ranges between them. Fullwidth punctuation such as `，` and corner brackets such as `「」` fall outside ASCII.

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

Values 32–126 are usually grouped as printable ASCII. Space (SP, 32) occupies a position and displays as a blank. Values 0–31 and 127 identify control characters. Many originally controlled printers, marked boundaries in records, or coordinated communication. What a control character does today depends on the application or protocol reading it.

### Common control characters

| ASCII value | Abbreviation | Meaning |
| ---: | --- | --- |
| 0 | NUL | Null character. C-style strings use it as a terminator. A Python string can retain it as a character |
| 7 | BEL | Bell. A terminal may beep, flash, or stay quiet |
| 8 | BS | Backspace. Originally moved the printing position one place left |
| 9 | HT | Horizontal tab. Advances to the next tab stop, so its displayed width depends on the position and settings |
| 10 | LF | Line feed. Originally moved the printing position down one line |
| 11 | VT | Vertical tab. Advances to the next vertical tab stop |
| 12 | FF | Form feed. Moves the printing position to the next page |
| 13 | CR | Carriage return. Originally moved the printing position to the start of the current line |
| 27 | ESC | Escape control character. Often begins a control sequence in terminal protocols |
| 127 | DEL | Delete. Historically used to mark a canceled position on punched tape |

Other control characters had their own uses. SOH, STX, ETX, and EOT mark boundaries around headers, text, or transmissions. ENQ, ACK, and NAK provide ways to make an inquiry, acknowledge it, or give a negative acknowledgment. FS, GS, RS, and US are separators for files, groups, records, and units. Modern formats have their own rules, so the protocol determines how each character is interpreted.

CR and LF originally controlled horizontal and vertical movement. Unix text files typically use LF alone, while Windows text files often use CR followed by LF. An editor can display either sequence as a single line break, even though they contain different numbers of characters.

## How to write invisible characters

Carriage return has ASCII value 13. Documentation may write it as `CR` or `<CR>`, a terminal diagnostic tool may display `^M`, and an interface can mark it with `␍`. In Python, `"\r"` constructs a string containing one carriage return. The first forms help a person read the data. The last is syntax for constructing a string.

### Abbreviations and visible symbols

`NUL`, `LF`, and `ESC` are abbreviated names. A specification, editor, or diagnostic tool might format them as `<LF>` or `[ESC]`. The brackets are a display convention that can vary between tools.

Unicode provides dedicated characters for displaying these controls, including `␀` for NUL, `␉` for HT, `␊` for LF, `␍` for CR, and `␛` for ESC. These symbols have their own character values and can help an interface mark invisible characters in the input. A space can also be displayed as `␠` or `␣`. The [tokenization animation](/blog/cs336-tokenization-en/) uses `␣` while retaining ordinary spaces, with ASCII value 32, in the input.

### Caret notation

`^` is called a caret. In caret notation, the caret and the symbol after it together represent one control character. For example, `^I` corresponds to horizontal tab (HT), `^J` to line feed (LF), and `^M` to carriage return (CR).

For values 0–31, add 64 to the control character’s value and look up the character that follows the caret. Carriage return has value 13. Adding 64 gives 77, the value of `M`, which gives `^M`. DEL has a separate convention, `^?`.

| Caret notation | ASCII value | Character |
| --- | ---: | --- |
| `^@` | 0 | NUL |
| `^C` | 3 | ETX, end of text |
| `^D` | 4 | EOT, end of transmission |
| `^H` | 8 | BS, backspace |
| `^I` | 9 | HT, horizontal tab |
| `^J` | 10 | LF, line feed |
| `^M` | 13 | CR, carriage return |
| `^[` | 27 | ESC |
| `^_` | 31 | US, unit separator |
| `^?` | 127 | DEL |

On macOS or Linux, use the following command to see the notation. `printf` writes the letter `A`, a carriage return, and a line feed. `cat -v` displays the carriage return as `^M` and leaves the final line break visible as a line break.

```sh
printf 'A\r\n' | cat -v
# Outputs A^M followed by a line break
```

Typing `"^M"` in a normal Python string gives two characters, `^` and `M`. In a terminal, the `^C` you may see after pressing Ctrl+C is input echoed by the terminal. Under common terminal settings, Ctrl+C sends an interrupt signal to the foreground process group. Similarly, pressing Ctrl+D on an empty line in the terminal’s default line input mode normally lets a read operation report the end of input. That terminal behavior is distinct from storing the EOT character with value 4 in a file.

### Backslash escapes in Python

In an ordinary Python string, a backslash `\` (value 92) can introduce an escape sequence. A forward slash `/` (value 47) can appear directly, as in `"notes/ascii"`.

| Syntax | Character | ASCII value |
| --- | --- | ---: |
| `\0` | NUL | 0 |
| `\a` | BEL, bell | 7 |
| `\b` | BS, backspace | 8 |
| `\t` | HT, horizontal tab | 9 |
| `\n` | LF, line feed | 10 |
| `\v` | VT, vertical tab | 11 |
| `\f` | FF, form feed | 12 |
| `\r` | CR, carriage return | 13 |
| `\"` | Double quote | 34 |
| `\'` | Single quote | 39 |
| `\\` | Backslash | 92 |

`\"` and `\'` are useful when a string must include the same type of quote used around it. For example, `"She said \"hello\""` produces `She said "hello"`. You can also enclose the text in single quotes and write the inner double quotes directly.

Compare these similar source forms. `len()` counts the characters in the resulting string, and `repr()` shows a representation suitable for inspection.

```python
print(len("\n"), repr("\n"))    # 1 '\n'
print(len("\\n"), repr("\\n"))  # 2 '\\n'
print(len(r"\n"), repr(r"\n"))  # 2 '\\n'
print(len("\r\n"))              # 2
print(len("^M"), len("\r"))     # 2 1
```

`"\n"` contains one actual line feed. In `"\\n"`, the first two backslashes produce a single backslash followed by the letter `n`. An `r` prefix creates a raw string, which preserves the two characters in a sequence such as `\n`. Therefore `r"\n"` and `"\\n"` have the same value. Raw strings are useful when several backslashes should be preserved, such as in the path `r"C:\new\test"`. A raw literal cannot end with an odd number of backslashes.

You can also specify a character by value or Unicode name. Every form below produces `A`. `\x` takes exactly two digits, `\u` takes four, `\U` takes eight, and `\N{...}` takes a character name. An escape that begins with a digit, such as `\101`, is another form for specifying a character by value.

```python
print("\101", "\x41", "\u0041", "\U00000041", "\N{LATIN CAPITAL LETTER A}")
# A A A A A

print(ord("\x1b"), ord("\x7f"))  # 27 127, for ESC and DEL
```

Escape syntax depends on the language or data format. For example, JSON allows the forward slash escape `\/`. Both `"/"` and `"\/"` parse to one forward slash in JSON. In a Python string, write `"/"` directly. The [Unicode article](/blog/unicode-en/#files-declarations-and-escapes) uses `\u` to distinguish source notation from the characters in a string.

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
