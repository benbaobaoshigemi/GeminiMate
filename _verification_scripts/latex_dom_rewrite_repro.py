from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from bs4 import BeautifulSoup
import soupsieve as sv


SAMPLE_PATH = Path("C:/Users/zhang/Desktop/GeminiHelper/G样本i.html")

MESSAGE_CONTAINER_SELECTOR = ", ".join(
    [
        ".message-content",
        "message-content",
        '[data-test-id="message-content"]',
        ".markdown-main-panel",
        ".markdown",
        "model-response-text",
        ".model-response-text",
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

MODEL_RESPONSE_ROOT_SELECTOR = ", ".join(
    [
        "model-response",
        ".model-response",
        '[data-message-author-role="model"]',
        '[aria-label="Gemini response"]',
        ".presented-response-container",
        ".response-container",
    ]
)

THOUGHT_TREE_SELECTOR = ", ".join(
    [
        "model-thoughts",
        ".model-thoughts",
        '[data-test-id="thoughts-content"]',
        ".thoughts-container",
        ".thoughts-content",
        ".thoughts-content-expanded",
        ".thoughts-streaming",
        ".gm-thought-translation-layout",
        ".gm-thought-translation",
        '[data-gm-thought-replacement="1"]',
    ]
)

INLINE_MATH_HTML_REGEX = re.compile(r"\$((?:\\\$|[^$])+?)\$", re.S)
CJK_CHAR_REGEX = re.compile(
    r"[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF，。、《》；：！？“”’（）【】…—]"
)
MIXED_MATH_FRAGMENT_REGEX = re.compile(
    r"[A-Za-z0-9\\{}_^()[\]+\-./]+(?:\s+[A-Za-z0-9\\{}_^()[\]+\-./]+)*"
)


@dataclass(frozen=True)
class ChangeRecord:
    tag: str
    classes: str
    has_buttons: bool
    has_roles: bool
    has_header_toggle: bool
    text_preview: str


def closest(node, selector: str):
    cursor = node
    while cursor is not None:
        try:
            if sv.match(selector, cursor):
                return cursor
        except Exception:
            pass
        cursor = getattr(cursor, "parent", None)
    return None


def collect_leaf_message_containers(soup: BeautifulSoup):
    containers = list(soup.select(MESSAGE_CONTAINER_SELECTOR))
    scoped = [
        node
        for node in containers
        if closest(node, THOUGHT_TREE_SELECTOR) is None
        and closest(node, MODEL_RESPONSE_ROOT_SELECTOR) is not None
    ]
    return [
        node
        for node in scoped
        if not any(other is not node and node in other.parents for other in scoped)
    ]


def is_likely_math_fragment(fragment: str) -> bool:
    token = fragment.strip()
    if len(token) < 2:
        return False
    if CJK_CHAR_REGEX.search(token):
        return False
    if token.isdigit():
        return False
    if re.search(r"[\\_^{}\[\]()]", token):
        return True
    return bool(re.fullmatch(r"(?:[A-Z][a-z]?\d*){2,}", token))


def normalize_math_escapes(text: str) -> str:
    return re.sub(r"\\\\([a-zA-Z]+)", r"\\\1", text)


def normalize_inline_math_segment(segment_inner_html: str) -> str:
    template = BeautifulSoup(segment_inner_html, "html.parser")

    for element in template.select("[data-math]"):
        element.replace_with(element.get("data-math") or (element.get_text() or ""))

    for element in template.select("i, em"):
        element.replace_with(f"_{element.get_text() or ''}_")

    for element in template.select("b, strong"):
        element.replace_with(f"**{element.get_text() or ''}**")

    flattened = (template.get_text() or "").replace("\xa0", " ")
    return re.sub(r"\s{2,}", " ", normalize_math_escapes(flattened)).strip()


def rebuild_mixed_math_segment(content: str) -> str | None:
    if not CJK_CHAR_REGEX.search(content):
        return None

    rebuilt = ""
    last_index = 0
    math_fragment_count = 0
    for match in MIXED_MATH_FRAGMENT_REGEX.finditer(content):
        fragment = match.group(0)
        rebuilt += content[last_index : match.start()]
        if is_likely_math_fragment(fragment):
            rebuilt += f"${fragment.strip()}$"
            math_fragment_count += 1
        else:
            rebuilt += fragment
        last_index = match.end()

    rebuilt += content[last_index:]
    if math_fragment_count == 0:
        return None
    return rebuilt


def normalize_math_in_block_html(html: str) -> str:
    changed = False

    def repl(match: re.Match[str]) -> str:
        nonlocal changed
        full = match.group(0)
        inner = match.group(1)
        if "<" not in inner and "math-inline" not in inner and "math-block" not in inner:
            return full

        normalized_inner = normalize_inline_math_segment(inner)
        if not normalized_inner:
            return full

        rebuilt = rebuild_mixed_math_segment(normalized_inner) if CJK_CHAR_REGEX.search(normalized_inner) else None
        candidate = rebuilt if rebuilt is not None else f"${normalized_inner}$"
        if candidate != full:
            changed = True
        return candidate

    normalized = INLINE_MATH_HTML_REGEX.sub(repl, html)
    return normalized if changed else html


def inspect_changes(container, block_tags: Iterable[str]) -> list[ChangeRecord]:
    selector = ", ".join(block_tags)
    changes: list[ChangeRecord] = []
    for element in container.select(selector):
        if element.find_parent(["pre", "code", "code-block"]) is not None:
            continue
        original_html = "".join(str(node) for node in element.contents)
        if "$" not in original_html:
            continue
        normalized_html = normalize_math_in_block_html(original_html)
        if normalized_html == original_html:
            continue
        changes.append(
            ChangeRecord(
                tag=element.name or "",
                classes=" ".join(element.get("class") or []),
                has_buttons=bool(element.select_one("button, [role='button']")),
                has_roles=bool(element.select_one("[role]")),
                has_header_toggle=bool(element.select_one("button.thoughts-header-button")),
                text_preview=element.get_text(" ", strip=True)[:120],
            )
        )
    return changes


def main() -> None:
    if not SAMPLE_PATH.exists():
        print(f"missing sample: {SAMPLE_PATH}")
        return

    html = SAMPLE_PATH.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "html.parser")

    containers = collect_leaf_message_containers(soup)
    print(f"leaf message container count: {len(containers)}")
    if not containers:
        return

    for index, container in enumerate(containers):
        old_changes = inspect_changes(container, ["p", "li", "blockquote", "td", "span", "div"])
        safe_changes = inspect_changes(container, ["p", "li", "blockquote", "td"])

        print(f"\ncontainer[{index}] tag={container.name} class={' '.join(container.get('class') or [])}")
        print(f"old strategy changes: {len(old_changes)}")
        print(f"safe strategy changes: {len(safe_changes)}")

        risky = [item for item in old_changes if item.tag in {"div", "span"} and (item.has_buttons or item.has_roles)]
        if risky:
            print(f"risky high-level rewrites detected: {len(risky)}")
            for item in risky[:5]:
                print(
                    "  "
                    + f"tag={item.tag} classes={item.classes} has_buttons={item.has_buttons} "
                    + f"has_role={item.has_roles} has_toggle={item.has_header_toggle} "
                    + f"preview={item.text_preview}"
                )
        else:
            print("risky high-level rewrites detected: 0")


if __name__ == "__main__":
    main()
