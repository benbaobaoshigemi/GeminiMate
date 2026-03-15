from __future__ import annotations

from pathlib import Path


THOUGHT_INDEX = Path("C:/Users/zhang/Desktop/GeminiHelper/GeminiMate/src/features/thoughtTranslation/index.ts")
RESPONSE_LIFECYCLE = Path("C:/Users/zhang/Desktop/GeminiHelper/GeminiMate/src/core/utils/responseLifecycle.ts")


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
    thought_source = THOUGHT_INDEX.read_text(encoding="utf-8")
    lifecycle_source = RESPONSE_LIFECYCLE.read_text(encoding="utf-8")

    display_ready_block = extract_block(thought_source, "const isThoughtTranslationDisplayReady =")
    mutation_block = extract_block(thought_source, "const hasRelevantThoughtMutations =")
    completion_block = extract_block(lifecycle_source, "export const isModelResponseComplete =")

    waits_for_completion = "hasResponseCompleted: isModelResponseComplete(container)" in display_ready_block
    mutation_tracks_response_root = (
        "isNodeInModelResponseLifecycle" in mutation_block
        or "message-actions" in mutation_block
        or "deferred-response-indicator" in mutation_block
    )
    completion_uses_message_actions = "message-actions" in completion_block

    print(f"waits_for_completion={waits_for_completion}")
    print(f"mutation_tracks_response_root={mutation_tracks_response_root}")
    print(f"completion_uses_message_actions={completion_uses_message_actions}")

    if not waits_for_completion:
        raise SystemExit("FAIL: display readiness is not gated by response completion")
    if not completion_uses_message_actions:
        raise SystemExit("FAIL: response completion does not rely on stable completion evidence")
    if not mutation_tracks_response_root:
        raise SystemExit(
            "FAIL: mutation observer still ignores response completion changes; hidden completed translations can remain invisible"
        )

    print(
        "PASS: display waits for response completion and mutation observer tracks response completion changes"
    )


if __name__ == "__main__":
    main()
