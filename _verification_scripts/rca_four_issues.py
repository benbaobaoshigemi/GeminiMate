from __future__ import annotations

import re
from pathlib import Path


REPO = Path(r"C:/Users/zhang/Desktop/GeminiHelper/GeminiMate")
ROOT = REPO.parent

THOUGHT_TS = REPO / "src/features/thoughtTranslation/index.ts"
FONT_TS = REPO / "src/features/layout/fontSize.ts"
SAMPLE_1 = ROOT / "样本1.html"
SAMPLE_2 = ROOT / "样本2.html"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def section(title: str) -> None:
    print(f"\n=== {title} ===")


def check_contains(code: str, needle: str) -> bool:
    return needle in code


def inspect_issue_1(code: str) -> None:
    section("Issue-1: thought translation keeps running when collapsed")
    print(
        "[evidence] has wrapper fallback in isExpandedThoughtContainer =",
        check_contains(
            code,
            "container.closest('.thoughts-wrapper, .thoughts-container, thoughts-entry') !== null",
        ),
    )
    print(
        "[evidence] mutation filter checks thought-tree only (no expanded guard) =",
        check_contains(code, "return isNodeInThoughtTree(mutation.target);"),
    )
    print(
        "[evidence] source extraction prefers innerText (layout-sensitive) =",
        check_contains(code, "typeof element.innerText === 'string' && element.innerText.length > 0"),
    )


def inspect_issue_2(code: str) -> None:
    section("Issue-2: occasional missed phrases")
    print(
        "[evidence] block extraction uses querySelectorAll(BLOCK_SELECTOR) and ignores direct text nodes =",
        check_contains(code, "const getTranslatableBlocks = (root: HTMLElement): HTMLElement[] => {"),
    )
    print(
        "[evidence] candidate pruning keeps deepest nodes (parent can be dropped) =",
        check_contains(
            code,
            ".sort((left, right) => getNodeDepth(right) - getNodeDepth(left))",
        ),
    )

    for sample in [SAMPLE_1, SAMPLE_2]:
        html = read(sample)
        has_bare_text_shape = bool(
            re.search(
                r'</response-element>\s*[^<\s][^<]{3,}\s*<div\s+class="attachment-container\s+youtube"',
                html,
                re.IGNORECASE | re.DOTALL,
            )
        )
        print(
            f"[evidence] sample={sample.name} has bare text between response-element and youtube attachment = {has_bare_text_shape}",
        )


def inspect_issue_3_4(font_code: str, sample_html: str) -> None:
    section("Issue-3: placeholder '问问 Gemini 3' still affected by weight")
    placeholder_block_start = font_code.find("parts.push(`${INPUT_PLACEHOLDER_SELECTORS} {")
    placeholder_block_end = font_code.find("}`);", placeholder_block_start)
    placeholder_block = font_code[placeholder_block_start:placeholder_block_end]

    print(
        "[evidence] placeholder has font-weight: inherit =",
        "font-weight: inherit !important;" in placeholder_block,
    )
    print(
        "[evidence] input area rule applies custom fontWeight to contenteditable =",
        "const inputTextRules = [fontSizeRule, fontWeightRule, fontVariationRule, fontFamilyRule]" in font_code,
    )

    section("Issue-4: font weight has only a few effective levels")
    print(
        "[evidence] custom font-variation-settings has no !important =",
        "font-variation-settings: 'wght' ${weight};" in font_code,
    )
    print(
        "[evidence] sample page defines many gds font-variation-settings rules =",
        bool(re.search(r"font-variation-settings\s*:", sample_html)),
    )
    print(
        "[evidence] sample page uses Google Sans Flex variable font family chain =",
        "Google Sans Flex" in sample_html,
    )


def main() -> None:
    thought_code = read(THOUGHT_TS)
    font_code = read(FONT_TS)
    sample_1_html = read(SAMPLE_1)

    print("[RCA] four-issues inspection start")
    inspect_issue_1(thought_code)
    inspect_issue_2(thought_code)
    inspect_issue_3_4(font_code, sample_1_html)
    print("\n[RCA] four-issues inspection end")


if __name__ == "__main__":
    main()
