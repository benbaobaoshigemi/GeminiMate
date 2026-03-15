from __future__ import annotations

from pathlib import Path
import re


TARGET = Path("C:/Users/zhang/Desktop/GeminiHelper/GeminiMate/src/features/thoughtTranslation/index.ts")


def extract_block(source: str, marker: str) -> str:
    start = source.find(marker)
    if start < 0:
        raise SystemExit(f"marker not found: {marker}")

    body_marker = source.find("=> {", start)
    if body_marker < 0:
        raise SystemExit(f"function body not found: {marker}")

    brace_start = source.find("{", body_marker)
    if brace_start < 0:
        raise SystemExit(f"brace start not found: {marker}")

    depth = 0
    for index in range(brace_start, len(source)):
        char = source[index]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return source[start : index + 1]

    raise SystemExit(f"unterminated block: {marker}")


def main() -> None:
    source = TARGET.read_text(encoding="utf-8")
    block = extract_block(source, "const ensureTranslationLayout =")
    anchor_index = block.find("const anchorNode =")
    replace_index = block.find("originalNode.replaceChildren(...incomingSourceNodes);")

    if anchor_index < 0:
        raise SystemExit("anchor resolution not found")
    if replace_index < 0:
        raise SystemExit("incoming source move not found")

    print(f"anchor_index={anchor_index}")
    print(f"replace_index={replace_index}")

    if anchor_index > replace_index:
        raise SystemExit(
            "FAIL: ensureTranslationLayout resolves insertion anchor after moving incoming source nodes"
        )

    show_block = extract_block(source, "const showCompletedThoughtTranslation =")
    normalized_show_block = re.sub(r"\s+", " ", show_block)
    expected_call = "ensureTranslationLayout( container, payload.sourceNodes, completed.html, )"
    normalized_expected_call = re.sub(r"\s+", " ", expected_call)
    if normalized_expected_call not in normalized_show_block:
        raise SystemExit(
            "FAIL: showCompletedThoughtTranslation does not preload completed html during layout sync"
        )

    if "translationNode.innerHTML = completed.html;" in show_block:
        raise SystemExit(
            "FAIL: showCompletedThoughtTranslation still mutates translation html after layout sync"
        )

    print("PASS: insertion anchor resolves before incoming source nodes move")
    print("PASS: completed html is preloaded during layout sync")


if __name__ == "__main__":
    main()
