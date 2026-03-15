from __future__ import annotations

from bs4 import BeautifulSoup, Tag


TOP_BAR_HTML = """
<button data-test-id="bard-g1-dynamic-upsell-menu-button" class="mdc-button mat-mdc-button-base mdc-button--unelevated mat-mdc-unelevated-button gds-button-tonal mat-unthemed ng-star-inserted">
  <span class="mdc-button__label">
    <span class="dynamic-upsell-label gds-label-l" data-gm-ultra-upsell-label="1" data-gm-ultra-upsell-blocked="1">升级到 Google AI Ultra</span>
  </span>
</button>
"""

UNDER_INPUT_HTML = """
<div class="upgrade-container g1-upsell-container under-input ng-star-inserted">
  <div class="upgrade-text-container">
    <span class="upgrade-title gds-label-l">升级到 Google AI Ultra</span>
    <span class="upgrade-desc gds-body-s">获享最高的模型和功能使用权限</span>
  </div>
  <div mat-menu-item="" class="mat-mdc-menu-item mat-focus-indicator upgrade-button-container" role="menuitem" tabindex="0" aria-disabled="false">
    <span class="mat-mdc-menu-item-text">
      <button tabindex="-1" mat-button="" class="mdc-button mat-mdc-button-base upsell-button gds-button-secondary mat-mdc-button mat-unthemed ng-star-inserted">
        <span class="mdc-button__label"><span>升级</span></span>
      </button>
    </span>
  </div>
</div>
"""

ULTRA_LABELS = {
    "升级到googleaiultra",
    "upgradetogoogleaiultra",
}

ULTRA_SELECTORS = [
    ".buttons-container.adv-upsell",
    ".buttons-container[class*='adv-upsell']",
    "span.dynamic-upsell-label",
    ".dynamic-upsell-label",
    "[data-test-id*='upsell-label']",
    ".upgrade-title",
    ".upgrade-text-container .upgrade-title",
    ".g1-upsell-container .upgrade-title",
]

ROOT_SELECTORS = [
    ".buttons-container.adv-upsell",
    ".buttons-container[class*='adv-upsell']",
    ".upgrade-container",
    ".g1-upsell-container",
    "[class*='upgrade-container']",
    "[class*='upsell-container']",
    "button",
    "a",
    "[role='button']",
    "mat-card",
    "[data-test-id*='upsell']",
    "[class*='upsell']",
    "[class*='Upsell']",
]


def normalize_label(value: str) -> str:
    return "".join(value.split()).strip().lower()


def is_exact_ultra_upsell_label(value: str) -> bool:
    return normalize_label(value) in ULTRA_LABELS


def resolve_root(node: Tag) -> Tag:
    for selector in ROOT_SELECTORS:
        root = node.find_parent(lambda tag: isinstance(tag, Tag) and tag in tag.parent.select(selector) if tag.parent else False)
        if root is not None:
            return root
    return node


def collect_marked_roots(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    marked: list[str] = []
    for selector in ULTRA_SELECTORS:
        for node in soup.select(selector):
            if not isinstance(node, Tag):
                continue
            classes = set(node.get("class", []))
            if "adv-upsell" not in classes and not is_exact_ultra_upsell_label(node.get_text(" ", strip=True)):
                continue
            marked.append(" ".join(resolve_root(node).get("class", [])) or resolve_root(node).name)
    return marked


def main() -> None:
    top_bar_marked = collect_marked_roots(TOP_BAR_HTML)
    under_input_marked = collect_marked_roots(UNDER_INPUT_HTML)

    print(f"top_bar_marked={top_bar_marked}")
    print(f"under_input_marked={under_input_marked}")

    if not top_bar_marked:
        raise SystemExit("FAIL: top bar Ultra upsell is not recognized by pure mode cleanup")
    if not any("upgrade-container" in value or "g1-upsell-container" in value for value in under_input_marked):
        raise SystemExit("FAIL: under-input Ultra upsell container is not recognized by pure mode cleanup")

    print("PASS: pure mode cleanup recognizes both Ultra upsell variants")


if __name__ == "__main__":
    main()
