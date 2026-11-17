"""Regenerate the small, verified trace used by the article animation.

Run with Python and tiktoken==0.14.0 installed. No tokenizer or vocabulary
download is needed in the reader's browser.
"""
from importlib.metadata import version
from pathlib import Path
import json
import regex
import tiktoken

text = "I miss you, Larry."
assert text.isascii(), "This walkthrough records an ASCII sentence; byte fragments are displayed as ASCII."
encoding = tiktoken.get_encoding("o200k_base")
segments = []
tokens = []
merges = []
offset = 0
for segment_index, text_segment in enumerate(regex.findall(encoding._pat_str, text)):
    segment_bytes = text_segment.encode("utf-8")
    segments.append({"text": text_segment, "start": offset, "end": offset + len(segment_bytes)})
    parts = [
        {"text": chr(byte), "start": offset + i, "end": offset + i + 1}
        for i, byte in enumerate(segment_bytes)
    ]
    while len(parts) > 1:
        candidates = []
        for i in range(len(parts) - 1):
            joined = (parts[i]["text"] + parts[i + 1]["text"]).encode("utf-8")
            rank = encoding._mergeable_ranks.get(joined)
            if rank is not None:
                candidates.append((rank, i))
        if not candidates:
            break
        rank, index = min(candidates)
        left, right = parts[index:index + 2]
        merged = {
            "text": left["text"] + right["text"],
            "start": left["start"],
            "end": right["end"],
        }
        merges.append({"segment": segment_index, "left": left, "right": right, "result": {**merged, "id": rank}})
        parts[index:index + 2] = [merged]
    for part in parts:
        token_id = encoding._mergeable_ranks[part["text"].encode("utf-8")]
        assert encoding.decode_single_token_bytes(token_id) == part["text"].encode("utf-8")
        tokens.append({**part, "id": token_id})
    offset += len(segment_bytes)

assert [token["id"] for token in tokens] == encoding.encode(text)
assert encoding.decode([token["id"] for token in tokens]) == text
trace = {
    "encoding": "o200k_base",
    "generator": "tiktoken " + version("tiktoken"),
    "text": text,
    "bytes": list(text.encode("utf-8")),
    "segments": segments,
    "merges": merges,
    "tokens": tokens,
}
target = Path(__file__).resolve().parents[1] / "src/config/tokenization-demo.json"
target.write_text(json.dumps(trace, ensure_ascii=False, indent=2) + "\n")
print(f"Wrote {len(tokens)} tokens and {len(merges)} merges to {target}")
