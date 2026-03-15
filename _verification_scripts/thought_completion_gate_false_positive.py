from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup


SNAPSHOTS = ["失败1.html", "失败2.html", "失败3.html"]


def has_model_streaming_signal(soup: BeautifulSoup) -> bool:
    selectors = [
        "model-response .deferred-response-indicator",
        ".model-response .deferred-response-indicator",
        '[data-message-author-role="model"] .deferred-response-indicator',
        '[aria-label="Gemini response"] .deferred-response-indicator',
        ".response-container .deferred-response-indicator",
        'button[aria-label*="Stop generating"]',
        'button[aria-label*="Stop response"]',
        'button[aria-label*="停止生成"]',
        '[data-test-id*="stop"][data-test-id*="response"]',
        '[data-test-id*="stop"][data-test-id*="generate"]',
    ]
    return any(soup.select(selector) for selector in selectors)


def has_thought_streaming_signal(soup: BeautifulSoup) -> bool:
    return bool(soup.select(".thoughts-streaming"))


def should_display_translation(has_ready_translation: bool, has_thought_streaming: bool, has_model_streaming: bool) -> bool:
    if not has_ready_translation:
        return False
    if has_thought_streaming:
        return False
    if has_model_streaming:
        return False
    return True


def main() -> None:
    for name in SNAPSHOTS:
        path = Path(name)
        if not path.exists():
            continue
        soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
        model_streaming = has_model_streaming_signal(soup)
        thought_streaming = has_thought_streaming_signal(soup)
        would_display = should_display_translation(
            has_ready_translation=True,
            has_thought_streaming=thought_streaming,
            has_model_streaming=model_streaming,
        )
        print(
            {
                "snapshot": name,
                "model_streaming_signal": model_streaming,
                "thought_streaming_signal": thought_streaming,
                "gate_would_display_translation": would_display,
            }
        )


if __name__ == "__main__":
    main()
