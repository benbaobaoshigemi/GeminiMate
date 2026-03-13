from __future__ import annotations

from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path("C:/Users/zhang/Desktop/GeminiHelper")
SAMPLE = ROOT / "样本2.html"

EARLY_CONTAINER_SELECTOR = (
    '.message-content, message-content, [data-test-id="message-content"], '
    "model-response, model-response-text, .model-response-text, .response-content, "
    ".markdown-main-panel, .markdown"
)

STRICT_CONTAINER_SELECTOR = ", ".join(
    [
        "model-response message-content",
        ".model-response message-content",
        '[data-message-author-role="model"] message-content',
        '[aria-label="Gemini response"] message-content',
        ".presented-response-container message-content",
        ".response-container message-content",
        "model-response .markdown-main-panel",
        ".model-response .markdown-main-panel",
        '[data-message-author-role="model"] .markdown-main-panel',
        '[aria-label="Gemini response"] .markdown-main-panel',
    ]
)

PROBLEMATIC_STREAMING_SELECTOR = ", ".join(
    [
        "model-response .deferred-response-indicator",
        ".model-response .deferred-response-indicator",
        '[data-message-author-role="model"] .deferred-response-indicator',
        '[aria-label="Gemini response"] .deferred-response-indicator',
        ".response-container .deferred-response-indicator",
        'button[aria-label*="Stop generating"]',
        'button[aria-label*="Stop response"]',
        '[data-test-id*="stop"][data-test-id*="response"]',
        '[data-test-id*="stop"][data-test-id*="generate"]',
        ".response-container img[src*='sparkle']",
        "model-response img[src*='sparkle']",
    ]
)

STRONG_STREAMING_SELECTOR = ", ".join(
    [
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
)


def count(selector: str, soup: BeautifulSoup) -> int:
    return len(soup.select(selector))


def main() -> None:
    html = SAMPLE.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "html.parser")

    print("=== sample container coverage ===")
    print("early selector count:", count(EARLY_CONTAINER_SELECTOR, soup))
    print("strict selector count:", count(STRICT_CONTAINER_SELECTOR, soup))

    synthetic = """
    <div class="response-container">
      <img src="https://www.gstatic.com/lamda/images/gemini_sparkle.svg" />
      <div class="markdown-main-panel">E = mc^2</div>
    </div>
    """
    synthetic_soup = BeautifulSoup(synthetic, "html.parser")

    print("\n=== synthetic streaming check ===")
    print(
        "problematic selector says streaming:",
        count(PROBLEMATIC_STREAMING_SELECTOR, synthetic_soup) > 0,
    )
    print(
        "strong selector says streaming:",
        count(STRONG_STREAMING_SELECTOR, synthetic_soup) > 0,
    )


if __name__ == "__main__":
    main()
