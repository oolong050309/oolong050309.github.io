---
title: "扩展 ASCII、GBK 与多国标准"
description: "对照扩展 ASCII、GBK 等地区编码，观察同一串字节在不同解码规则下会得到什么结果。"
---

## 扩展 ASCII 的范围

ASCII 用 7 位就能表示 128 个编号。用一个 8 位字节保存时，有些编码保留了低半区 `0x00`～`0x7F` 的 ASCII 对应关系，再把高半区 `0x80`～`0xFF` 用于其他字符。这些方案常被统称为「扩展 ASCII」。同一个高位字节具体代表什么，要看采用了哪张表。

比如，查看下面两种欧洲编码。字母 `A` 和空格沿用相同的编号，到了字节 `A1`，两张表给出的答案就分开了。表中的字节都用十六进制表示。

| 编码（十六进制） | `41` | `20` | `A1` |
| --- | --- | --- | --- |
| ISO-8859-1（用于多种西欧语言） | A | 空格 | ¡（倒感叹号） |
| ISO-8859-2（用于多种中欧语言） | A | 空格 | Ą（波兰语等语言使用的字母） |

## GBK 与其他地区编码

汉字有成千上万个，一个字节的 256 种取值远远不够。中文编码 GBK 扩充了 GB2312 的字符范围，保留 ASCII 字符的单字节写法，用两个字节的组合表示汉字。例如，字母 `A` 仍写作 `41`，空格仍写作 `20`，而一个「猫」字写作 `C3 A8`。后来的 GB 18030 还引入了四字节序列。处理旧文件时，繁体中文资料中也常见 Big5，日文资料中常见 Shift_JIS，韩文资料中常见 EUC-KR，各有自己的字节映射。[WHATWG《编码标准》中的传统编码](https://encoding.spec.whatwg.org/#legacy-multi-byte-chinese-(simplified)-encodings)

## 同一串字节怎样出现乱码

选错编码，有时连报错都不会出现。下面分别用 GBK 和 UTF-8 读取 `A 猫` 的 GBK 字节。C 版用 `iconv` 把 GBK 转成 UTF-8，再将原始字节直接交给 UTF-8 终端作对照。

<div class="code-example" data-code-example>

```python
data = bytes.fromhex("41 20 c3 a8")
print(data.decode("gbk"))   # A 猫
print(data.decode("utf-8")) # A è
```

```c
// macOS: cc demo.c -o demo -liconv
// Linux (glibc): cc demo.c -o demo
#include <iconv.h>
#include <stdio.h>

int main(void) {
    char data[] = "\x41\x20\xc3\xa8";
    char decoded[16] = {0};
    char *input = data, *output = decoded;
    size_t remaining = sizeof data - 1, space = sizeof decoded - 1;

    iconv_t converter = iconv_open("UTF-8", "GBK");
    if (converter == (iconv_t)-1) return 1;
    size_t result = iconv(converter, &input, &remaining, &output, &space);
    iconv_close(converter);
    if (result == (size_t)-1) return 1;

    puts(decoded); // A 猫
    puts(data);    // A è (UTF-8 terminal)
    return 0;
}
```

</div>

两次读取的数据都是 `41 20 C3 A8`。在两种编码中，`41 20` 都对应字母 A 和空格。GBK 把 `C3 A8` 读成「猫」，它在 UTF-8 中也正好是合法序列，对应 `è`。所以即使英文看起来正常，排查乱码时也要核对文件保存时使用的编码。
