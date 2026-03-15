from __future__ import annotations

from dataclasses import dataclass

from bs4 import BeautifulSoup, Tag


HTML = """
<body>
  <div class="thoughts-container">
    <div class="thoughts-content-expanded" id="thought-root">
      <div class="markdown markdown-main-panel">original reasoning</div>
    </div>
  </div>
</body>
"""

LAYOUT_CLASS = "gm-thought-translation-layout"
ORIGINAL_CLASS = "gm-thought-original"
TRANSLATION_CLASS = "gm-thought-translation"

THOUGHT_CONTAINER_SELECTORS = [
    '[data-test-id="thoughts-content"]',
    ".thoughts-content",
    ".thoughts-content-expanded",
    ".thoughts-streaming",
    ".thoughts-container",
    ".thoughts-wrapper",
]


@dataclass
class Snapshot:
    step: str
    containers: list[str]
    has_translation: bool
    dom: str


def matches_selector(tag: Tag, selector: str) -> bool:
    return tag in tag.parent.select(selector) if tag.parent else False


def is_expanded_thought_container(container: Tag) -> bool:
    classes = set(container.get("class", []))

    thought_root = container.find_parent(["model-thoughts"])
    if thought_root is None:
        thought_root = container.find_parent(class_="model-thoughts")

    toggle_expanded: bool | None = None
    if thought_root is not None:
        toggle = thought_root.select_one(
            "button.thoughts-header-button[aria-expanded], "
            "button[aria-expanded][data-test-id*='thought'], "
            "button[aria-expanded][class*='thought'], "
            "[role='button'][aria-expanded][data-test-id*='thought']"
        )
        if toggle is not None:
            if toggle.get("aria-expanded") == "false":
                toggle_expanded = False
            elif toggle.get("aria-expanded") == "true":
                toggle_expanded = True

    if toggle_expanded is False:
        return False

    has_managed_layout = container.find("div", class_=LAYOUT_CLASS, recursive=False) is not None
    has_open_signal = (
        has_managed_layout
        or "thoughts-content-expanded" in classes
        or "thoughts-streaming" in classes
        or toggle_expanded is True
    )
    if not has_open_signal:
        return False

    return True


def get_thought_containers(soup: BeautifulSoup) -> list[Tag]:
    containers: list[Tag] = []
    seen: set[int] = set()

    for selector in THOUGHT_CONTAINER_SELECTORS:
        for node in soup.select(selector):
            marker = id(node)
            if marker in seen:
                continue
            seen.add(marker)
            containers.append(node)

    expanded = [container for container in containers if is_expanded_thought_container(container)]
    deduped = [
        container
        for container in expanded
        if not any(other is not container and container in other.parents for other in expanded)
    ]
    explicitly_expanded = [
        container for container in deduped if "thoughts-content-expanded" in container.get("class", [])
    ]
    return explicitly_expanded if explicitly_expanded else deduped


def get_source_nodes(container: Tag) -> list[Tag]:
    return [
        node
        for node in container.select(".markdown.markdown-main-panel")
        if TRANSLATION_CLASS not in (node.get("class", []) or [])
    ]


def create_div(soup: BeautifulSoup, class_name: str) -> Tag:
    node = soup.new_tag("div")
    node["class"] = [class_name]
    return node


def ensure_translation_layout(soup: BeautifulSoup, container: Tag, source_nodes: list[Tag]) -> None:
    layout = container.find("div", class_=LAYOUT_CLASS, recursive=False)
    if layout is None:
        layout = create_div(soup, LAYOUT_CLASS)
        container.append(layout)

    original_node = layout.find("div", class_=ORIGINAL_CLASS, recursive=False)
    if original_node is None:
        original_node = create_div(soup, ORIGINAL_CLASS)
        layout.append(original_node)

    for node in source_nodes:
        if node.parent is not original_node:
            node.extract()
            original_node.append(node)

    translation_node = layout.find("div", class_=TRANSLATION_CLASS, recursive=False)
    if translation_node is None:
        translation_node = create_div(soup, TRANSLATION_CLASS)
        translation_node.string = "translated reasoning"
        layout.append(translation_node)


def restore_original_thought_layout(container: Tag) -> None:
    layout = container.find("div", class_=LAYOUT_CLASS, recursive=False)
    if layout is None:
        return

    original_node = layout.find("div", class_=ORIGINAL_CLASS, recursive=False)
    if original_node is not None:
        while original_node.contents:
            child = original_node.contents[0]
            child.extract()
            layout.insert_before(child)

    layout.decompose()


def process_thoughts(soup: BeautifulSoup) -> Snapshot:
    containers = get_thought_containers(soup)
    for container in containers:
        ensure_translation_layout(soup, container, get_source_nodes(container))

    scan_nodes = list(soup.select(f".{TRANSLATION_CLASS}, " + ", ".join(THOUGHT_CONTAINER_SELECTORS)))
    for node in scan_nodes:
        if not isinstance(node, Tag) or node.attrs is None:
            continue
        if TRANSLATION_CLASS in node.get("class", []):
            container = node.find_parent(
                attrs={"class": lambda value: value and any(
                    name in value for name in [
                        "thoughts-content",
                        "thoughts-content-expanded",
                        "thoughts-streaming",
                        "thoughts-container",
                        "thoughts-wrapper",
                    ]
                )}
            )
        else:
            container = node

        if container is None:
            continue

        if container not in containers:
            restore_original_thought_layout(container)

    return Snapshot(
        step="processed",
        containers=[tag.get("id", ".".join(tag.get("class", []))) for tag in containers],
        has_translation=bool(soup.select_one(f".{TRANSLATION_CLASS}")),
        dom=soup.body.decode(),
    )


def main() -> None:
    soup = BeautifulSoup(HTML, "html.parser")
    first = process_thoughts(soup)
    print("[step-1] expanded container")
    print("containers =", first.containers)
    print("has_translation =", first.has_translation)

    root = soup.select_one("#thought-root")
    assert root is not None
    root["class"] = ["thoughts-content"]

    second = process_thoughts(soup)
    print("[step-2] class switched to thoughts-content")
    print("containers =", second.containers)
    print("has_translation =", second.has_translation)
    print("dom =", second.dom)


if __name__ == "__main__":
    main()
