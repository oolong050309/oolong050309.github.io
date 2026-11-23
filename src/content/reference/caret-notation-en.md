---
title: "Caret notation"
description: "Use XOR with 64 to derive ^M and ^?, and see how terminals enter and display ASCII control characters."
---

## Why XOR with 64 works

A carriage return is one character with ASCII value 13. It usually has no visible shape, so some terminal tools display it as `^M`. The caret `^` marks a control character, and `M` identifies which one.

For ASCII control characters (values 0–31 and 127), the display rule is **control character value XOR 64**. Look up the resulting ASCII character and put a caret before it.

In binary, 64 is `01000000`. Only the bit with weight 64 is set. XOR flips that bit and leaves all the others alone.

```text
CR    00001101  (13)
XOR   01000000  (64)
    = 01001101  (77, M)  → ^M

DEL   01111111  (127)
XOR   01000000  (64)
    = 00111111  (63, ?)  → ^?
```

For values 0–31, the bit starts at 0. Flipping it adds 64 and gives a visible symbol from `@` through `_`. For DEL, the bit starts at 1. Flipping it subtracts 64 and turns 127 into 63, the value of `?`. The same mapping gives both `^M` and `^?`.

## Reading the notation in reverse

Flipping the same bit twice restores the original value. To reverse the display, XOR the value of the character after the caret with 64. For `^J`, `74 XOR 64 = 10` yields line feed (LF). For `^?`, `63 XOR 64 = 127` yields DEL.

| Original character | ASCII value | Value and character after XOR with 64 | Display |
| --- | ---: | --- | --- |
| NUL, null | 0 | 64 → `@` | `^@` |
| ETX, end of text | 3 | 67 → `C` | `^C` |
| HT, horizontal tab | 9 | 73 → `I` | `^I` |
| LF, line feed | 10 | 74 → `J` | `^J` |
| CR, carriage return | 13 | 77 → `M` | `^M` |
| ESC, escape control character | 27 | 91 → `[` | `^[` |
| DEL, delete | 127 | 63 → `?` | `^?` |

## How Ctrl produces control characters

Key input and display are separate operations. On the DEC VT100, when Ctrl was held, the terminal firmware checked a table to see whether the combination could produce a control character. It then cleared the bits with weights 32 and 64, keeping the five low bits of the ASCII value. `M` is 77 and `m` is 109. Both end in `01101`, so Ctrl+M sent carriage return, value 13. Under the same rule, Ctrl+I sent horizontal tab, value 9.

Modern terminals commonly retain these mappings. A program receiving the same control character can treat Ctrl+M like Return and Ctrl+I like Tab. The terminal and application determine how the keys behave. A display tool only needs the control character value. It can show `^M` for value 13 even when the value came from a file.

## Seeing it in a terminal

On macOS or Linux, use `printf` to write `A`, a carriage return, and a line feed, then pass the result to `cat -v`.

```sh
printf 'A\r\n' | cat -v
# A^M
```

The screen shows `A^M` followed by a line break. Here `cat -v` renders the carriage return as `^M` and leaves the line feed visible as a line break. The input still contains a carriage return with value 13. Viewing a file with CRLF endings this way often shows `^M` at the end of each line.

Tools can implement the same mapping in different ways. GNU `cat` uses addition for the characters it displays from 0–31 and writes `^?` directly for 127. The result matches the XOR formula.

The meaning of `^C` depends on where it appears. A file viewer may use it for the control character with value 3. An interactive terminal may echo it when you press Ctrl+C. Common terminal settings treat that input as an interrupt and signal the foreground process group.

In ordinary text, `^M` consists of two characters. A tool interprets it as carriage return when it explicitly uses caret notation. In source code, the language interprets a string escape such as `"\r"`, which can produce a string containing one carriage return.
