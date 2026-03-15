from __future__ import annotations

from pathlib import Path


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
    block = extract_block(source, "const isThoughtTranslationDisplayReady =")

    completion_index = block.find("hasResponseCompleted: isModelResponseComplete(container)")
    body_index = block.find("hasResponseBodyContent: hasMeaningfulResponseBodyContent(findResponseBodyBlock(container))")
    display_call_index = block.find("return shouldDisplayThoughtTranslation({")

    print(f"display_call_index={display_call_index}")
    print(f"body_index={body_index}")
    print(f"completion_index={completion_index}")

    if display_call_index < 0:
        raise SystemExit("FAIL: display readiness function not found")
    if body_index < 0:
        raise SystemExit("FAIL: display readiness no longer checks response body content")
    if completion_index < 0:
        raise SystemExit("FAIL: display readiness does not require full response completion")

    print("PASS: thought translation display waits for full response completion")


if __name__ == "__main__":
    main()
