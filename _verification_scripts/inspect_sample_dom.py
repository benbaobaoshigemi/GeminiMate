from __future__ import annotations

from pathlib import Path
from typing import Iterable

try:
    from bs4 import BeautifulSoup  # type: ignore
except Exception as exc:  # pragma: no cover - script fallback path
    raise SystemExit(f"BeautifulSoup import failed: {exc}")


ROOT = Path("C:/Users/zhang/Desktop/GeminiHelper")
SAMPLES = [ROOT / "样本1.html", ROOT / "样本2.html"]

THOUGHT_SELECTORS = [
    '[data-test-id="thoughts-content"]',
    ".thoughts-content",
    ".thoughts-content-expanded",
    ".thoughts-streaming",
    ".thoughts-container",
    ".thoughts-wrapper",
]


def css_join(selectors: Iterable[str]) -> str:
    return ", ".join(selectors)


def inspect_sample(path: Path) -> None:
    html = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "html.parser")
    thought_roots = soup.select(css_join(THOUGHT_SELECTORS))
    code_in_thought = 0
    pre_in_thought = 0
    code_block_custom = 0
    youtube_like = 0

    for root in thought_roots:
        code_in_thought += len(root.select("code"))
        pre_in_thought += len(root.select("pre"))
        code_block_custom += len(root.select("code-block"))
        youtube_like += len(
            root.select(
                "a[href*='youtube.com/watch'], a[href*='youtu.be/'], a[href*='youtube.com/shorts/']"
            )
        )

    print(f"\n=== {path.name} ===")
    print(f"thought roots: {len(thought_roots)}")
    print(f"code tags in thought: {code_in_thought}")
    print(f"pre tags in thought: {pre_in_thought}")
    print(f"code-block custom tags in thought: {code_block_custom}")
    print(f"youtube-like links in thought: {youtube_like}")

    if thought_roots:
        first = thought_roots[0]
        first_code = first.select_one("pre, code-block, code")
        if first_code is not None:
            snippet = first_code.get_text("\n", strip=True)
            print("first code-like snippet preview:")
            print(snippet[:400])


def main() -> None:
    for sample in SAMPLES:
        if not sample.exists():
            print(f"missing: {sample}")
            continue
        inspect_sample(sample)


if __name__ == "__main__":
    main()
