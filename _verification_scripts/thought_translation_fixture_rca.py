from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from bs4 import BeautifulSoup, Tag


ROOT = Path("C:/Users/zhang/Desktop/GeminiHelper/GeminiMate")
SAMPLES = [
    ROOT / "思考中.html",
    ROOT / "展开.html",
]

THOUGHT_CONTAINER_SELECTORS = [
    '[data-test-id="thoughts-content"]',
    ".thoughts-content",
    ".thoughts-content-expanded",
    ".thoughts-streaming",
    ".thoughts-container",
    ".thoughts-wrapper",
]
THOUGHT_TEXT_SELECTORS = [
    ":scope .markdown.markdown-main-panel",
    ":scope > .markdown.markdown-main-panel",
    ":scope .message-container message-content .markdown.markdown-main-panel",
    ":scope .message-container message-content .markdown",
    ":scope message-content .markdown.markdown-main-panel",
    ":scope message-content .markdown",
    ":scope .thought-content",
]
RESPONSE_BODY_SELECTORS = [
    "structured-content-container.model-response-text",
    ".model-response-text",
]


@dataclass
class ContainerProbe:
    classes: str
    text_length: int
    source_node_count: int
    source_preview: str
    has_response_body: bool
    response_body_text_length: int
    anchor_before_move: bool
    anchor_after_move: bool
    active_container_kind: str


def css_join(selectors: Iterable[str]) -> str:
    return ", ".join(selectors)


def normalize_text(value: str) -> str:
    return " ".join(value.replace("\u00a0", " ").split())


def get_node_depth(node: Tag) -> int:
    depth = 0
    current = node
    while current.parent is not None and isinstance(current.parent, Tag):
        current = current.parent
        depth += 1
    return depth


def sort_key(node: Tag) -> tuple[int, int]:
    return (get_node_depth(node), len(list(node.parents)))


def find_toggle_expanded(container: Tag) -> bool | None:
    thought_root = container.find_parent("model-thoughts")
    if thought_root is None:
        thought_root = container.find_parent(class_="model-thoughts")
    if thought_root is None:
        return None

    toggle = thought_root.select_one(
        "button.thoughts-header-button[aria-expanded], "
        "button[aria-expanded][data-test-id*='thought'], "
        "button[aria-expanded][class*='thought'], "
        "[role='button'][aria-expanded][data-test-id*='thought']"
    )
    if toggle is None:
        return None

    expanded = toggle.get("aria-expanded")
    if expanded == "true":
        return True
    if expanded == "false":
        return False
    return None


def is_expanded_thought_container(container: Tag) -> bool:
    toggle_expanded = find_toggle_expanded(container)
    if toggle_expanded is False:
        return False

    classes = set(container.get("class", []))
    has_open_signal = (
        "thoughts-content-expanded" in classes
        or "thoughts-streaming" in classes
        or toggle_expanded is True
    )
    return has_open_signal


def get_thought_containers(soup: BeautifulSoup) -> list[Tag]:
    seen: set[int] = set()
    containers: list[Tag] = []
    for node in soup.select(css_join(THOUGHT_CONTAINER_SELECTORS)):
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


def get_thought_source_nodes(container: Tag) -> list[Tag]:
    candidates: list[Tag] = []
    seen: set[int] = set()

    if container.has_attr("class") and "markdown" in container.get("class", []):
        marker = id(container)
        seen.add(marker)
        candidates.append(container)

    for selector in THOUGHT_TEXT_SELECTORS:
        for node in container.select(selector):
            if not isinstance(node, Tag):
                continue
            marker = id(node)
            if marker in seen:
                continue
            if normalize_text(node.get_text(" ", strip=True)) == "":
                continue
            seen.add(marker)
            candidates.append(node)

    active_candidates = sorted(candidates, key=sort_key)
    depth_pruned = [
        candidate
        for candidate in active_candidates
        if not any(other is not candidate and other.find(lambda tag: tag is candidate) for other in active_candidates)
    ]
    return depth_pruned


def find_response_body_block(container: Tag) -> Tag | None:
    response_content = container.find_parent(class_="response-content")
    if response_content is not None:
        direct_children = [child for child in response_content.children if isinstance(child, Tag)]
        for child in direct_children:
            if child.select_one(css_join(RESPONSE_BODY_SELECTORS)) is child:
                return child
            if child.name == "structured-content-container" and "model-response-text" in child.get("class", []):
                return child
            if "model-response-text" in child.get("class", []):
                return child

    response_container = container.find_parent(class_="response-container-content")
    if response_container is None:
        response_container = container.find_parent(class_="presented-response-container")
    if response_container is None:
        return None
    return response_container.select_one(css_join(RESPONSE_BODY_SELECTORS))


def resolve_top_level_source_anchor(container: Tag, source_nodes: list[Tag]) -> Tag | None:
    for source_node in source_nodes:
        current: Tag | None = source_node
        while current is not None and current.parent is not container:
            parent = current.parent
            current = parent if isinstance(parent, Tag) else None
        if current is not None and current.parent is container:
            return current
    return None


def probe_container(container: Tag) -> ContainerProbe:
    source_nodes = get_thought_source_nodes(container)
    response_body = find_response_body_block(container)
    source_preview = normalize_text(" ".join(node.get_text(" ", strip=True) for node in source_nodes))[:160]
    before_anchor = resolve_top_level_source_anchor(container, source_nodes) is not None

    moved_nodes: list[Tag] = []
    for node in source_nodes:
        current_parent = node.parent
        if isinstance(current_parent, Tag):
            node.extract()
            moved_nodes.append(node)

    after_anchor = resolve_top_level_source_anchor(container, moved_nodes) is not None

    return ContainerProbe(
        classes=" ".join(container.get("class", [])),
        text_length=len(normalize_text(container.get_text(" ", strip=True))),
        source_node_count=len(source_nodes),
        source_preview=source_preview,
        has_response_body=response_body is not None,
        response_body_text_length=len(normalize_text(response_body.get_text(" ", strip=True))) if response_body else 0,
        anchor_before_move=before_anchor,
        anchor_after_move=after_anchor,
        active_container_kind=container.name,
    )


def inspect_sample(path: Path) -> None:
    html = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "html.parser")
    containers = get_thought_containers(soup)

    print(f"=== {path.name} ===")
    print(f"active_containers={len(containers)}")
    for index, container in enumerate(containers, start=1):
        probe = probe_container(container)
        print(
            f"[container {index}] classes={probe.classes} "
            f"text_length={probe.text_length} source_nodes={probe.source_node_count} "
            f"response_body={probe.has_response_body} response_text_length={probe.response_body_text_length}"
        )
        print(
            f"  anchor_before_move={probe.anchor_before_move} "
            f"anchor_after_move={probe.anchor_after_move} active_tag={probe.active_container_kind}"
        )
        print(f"  source_preview={probe.source_preview}")
    print()


def main() -> None:
    for sample in SAMPLES:
        if not sample.exists():
            print(f"missing={sample}")
            continue
        inspect_sample(sample)


if __name__ == "__main__":
    main()
