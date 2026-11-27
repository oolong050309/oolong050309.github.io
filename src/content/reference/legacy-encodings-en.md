---
title: "Extended ASCII, GBK, and regional encodings"
description: "Compare extended ASCII, GBK, and other regional encodings, and see what happens when the same bytes are decoded in different ways."
---

## Extending the ASCII range

ASCII needs seven bits for its 128 values. Some encodings use an eight-bit byte, keeping ASCII’s assignments in the lower half, `0x00`–`0x7F`, and using the upper half, `0x80`–`0xFF`, for additional characters. These schemes are often called “extended ASCII.” The meaning of an upper-half value depends on the encoding.

Compare two European encodings. Both keep the values for `A` and space, but they assign different characters to `A1`. The table shows byte values in hexadecimal.

| Encoding (hexadecimal) | `41` | `20` | `A1` |
| --- | --- | --- | --- |
| ISO-8859-1, used for several Western European languages | A | Space | ¡ (inverted exclamation mark) |
| ISO-8859-2, used for several Central European languages | A | Space | Ą (a letter used in Polish and other languages) |

## GBK and other regional encodings

There are thousands of Chinese characters, far more than the 256 values available in one byte. GBK extends GB2312, keeps the single-byte representation of ASCII characters, and uses pairs of bytes for Chinese characters. For example, `A` still uses `41` and space still uses `20`, while 猫 uses `C3 A8`. The later GB 18030 also introduced four-byte sequences. When reading older files, you may encounter Big5 for traditional Chinese, Shift_JIS for Japanese, and EUC-KR for Korean. Each has its own mapping. [Legacy encodings in the WHATWG Encoding Standard](https://encoding.spec.whatwg.org/#legacy-multi-byte-chinese-(simplified)-encodings)

## Decoding the same bytes

Using the wrong encoding can yield garbled text without raising an error. The following examples read the GBK bytes for `A 猫` as GBK and as UTF-8. The C version converts the GBK data to UTF-8 with `iconv`, then prints the original bytes directly to a UTF-8 terminal for comparison.

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

Both reads use the bytes `41 20 C3 A8`. In both encodings, `41 20` represents `A` followed by a space. GBK reads `C3 A8` as 猫. Those bytes also form a valid UTF-8 sequence for `è`. This is why some text can appear intact even when a file was decoded using the wrong encoding.
