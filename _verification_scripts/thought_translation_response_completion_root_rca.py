from __future__ import annotations

from pathlib import Path

from bs4 import BeautifulSoup, Tag


RESPONSE_LIFECYCLE = Path("C:/Users/zhang/Desktop/GeminiHelper/GeminiMate/src/core/utils/responseLifecycle.ts")
SAMPLES = [
    Path("C:/Users/zhang/Desktop/GeminiHelper/GeminiMate/展开.html"),
    Path("C:/Users/zhang/Desktop/GeminiHelper/GeminiMate/思考中.html"),
    Path("C:/Users/zhang/Desktop/GeminiHelper/GeminiMate/极度愤怒.html"),
]

THOUGHT_SELECTOR = '[data-test-id="thoughts-content"], .thoughts-content, .thoughts-content-expanded, .thoughts-streaming, .thoughts-container, .thoughts-wrapper'


def has_class(tag: Tag, name: str) -> bool:
    return name in tag.get("class", [])


def find_nearest_response_root(node: Tag) -> Tag | None:
    current = node.parent
    while isinstance(current, Tag):
        if (
            current.name == "model-response"
            or has_class(current, "model-response")
            or current.get("data-message-author-role") == "model"
            or current.get("aria-label") == "Gemini response"
            or has_class(current, "presented-response-container")
            or has_class(current, "response-container")
        ):
            return current
        current = current.parent
    return None


def find_outer_complete_response_root(node: Tag) -> Tag | None:
    current = node.parent
    while isinstance(current, Tag):
        if current.name == "model-response" or has_class(current, "response-container"):
            return current
        current = current.parent
    return None


def main() -> None:
    lifecycle_source = RESPONSE_LIFECYCLE.read_text(encoding="utf-8")
    selector_marker = 'const MODEL_RESPONSE_COMPLETION_ROOT_SELECTOR = ['
    marker_index = lifecycle_source.find(selector_marker)
    if marker_index < 0:
        raise SystemExit("FAIL: completion-root selector is missing")
    selector_block = lifecycle_source[marker_index : lifecycle_source.find('].join', marker_index)]
    if '.presented-response-container' in selector_block:
        raise SystemExit(
            "FAIL: completion-root selector still includes .presented-response-container"
        )
    if '.response-container' not in selector_block:
        raise SystemExit(
            "FAIL: completion-root selector does not include .response-container"
        )

    mismatched = 0
    for sample in SAMPLES:
        soup = BeautifulSoup(sample.read_text(encoding="utf-8", errors="ignore"), "html.parser")
        thought = soup.select_one(THOUGHT_SELECTOR)
        if thought is None:
            print(sample.name, "no_thought")
            continue

        nearest = find_nearest_response_root(thought)
        outer = find_outer_complete_response_root(thought)
        nearest_has_actions = bool(nearest and nearest.select_one("message-actions"))
        outer_has_actions = bool(outer and outer.select_one("message-actions"))

        print(
            sample.name,
            {
                "nearest_tag": nearest.name if nearest else None,
                "nearest_class": nearest.get("class", [])[:3] if nearest else [],
                "nearest_has_actions": nearest_has_actions,
                "outer_tag": outer.name if outer else None,
                "outer_class": outer.get("class", [])[:3] if outer else [],
                "outer_has_actions": outer_has_actions,
            },
        )

        if nearest and outer and nearest is not outer and (not nearest_has_actions) and outer_has_actions:
            mismatched += 1

    if mismatched == 0:
        raise SystemExit(
            "FAIL: samples do not show completion-root mismatch; current RCA is insufficient"
        )

    print(
        "PASS: completion-root selector avoids presented-response-container, and samples confirm why outer response-container must own completion"
    )


if __name__ == "__main__":
    main()
