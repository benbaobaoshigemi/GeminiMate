from __future__ import annotations

import re
from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path("C:/Users/zhang/Desktop/GeminiHelper")
SAMPLE = ROOT / "G样本i.html"

INLINE_MATH_REGEX = re.compile(r"\$((?:\\\$|[^$])+?)\$", re.S)
CJK_REGEX = re.compile(
    r"[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF，。、《》；：！？“”’（）【】…—]"
)
FRAGMENT_REGEX = re.compile(
    r"[A-Za-z0-9\\{}_^()[\]+\-./]+(?:\s+[A-Za-z0-9\\{}_^()[\]+\-./]+)*"
)


def is_likely_math_fragment(fragment: str) -> bool:
    token = fragment.strip()
    if len(token) < 2:
        return False
    if CJK_REGEX.search(token):
        return False
    if token.isdigit():
        return False
    if re.search(r"[\\_^{}\[\]()]", token):
        return True
    return bool(re.fullmatch(r"(?:[A-Z][a-z]?\d*){2,}", token))


def normalize_inline_inner(inner_html: str) -> str:
    soup = BeautifulSoup(inner_html, "html.parser")

    for node in soup.select("[data-math]"):
        node.replace_with(node.get("data-math") or node.get_text())

    for node in soup.select("i, em"):
        node.replace_with(f"_{node.get_text()}_")

    for node in soup.select("b, strong"):
        node.replace_with(f"**{node.get_text()}**")

    text = soup.get_text("", strip=False).replace("\xa0", " ")
    text = re.sub(r"\\\\([a-zA-Z]+)", r"\\\1", text)
    text = re.sub(r"\s{2,}", " ", text).strip()
    return text


def rebuild_mixed_math(content: str) -> str:
    if not CJK_REGEX.search(content):
        return f"${content}$"

    rebuilt: list[str] = []
    last = 0
    count = 0

    for match in FRAGMENT_REGEX.finditer(content):
        fragment = match.group(0)
        rebuilt.append(content[last : match.start()])
        if is_likely_math_fragment(fragment):
            rebuilt.append(f"${fragment.strip()}$")
            count += 1
        else:
            rebuilt.append(fragment)
        last = match.end()

    rebuilt.append(content[last:])
    if count == 0:
        return f"${content}$"
    return "".join(rebuilt)


def normalize_math_html(html: str) -> str:
    def repl(match: re.Match[str]) -> str:
        inner = match.group(1)
        if "<" not in inner and "math-inline" not in inner and "math-block" not in inner:
            return match.group(0)
        normalized = normalize_inline_inner(inner)
        if not normalized:
            return match.group(0)
        return rebuild_mixed_math(normalized)

    return INLINE_MATH_REGEX.sub(repl, html)


def main() -> None:
    html = SAMPLE.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "html.parser")
    panels = soup.select("model-response .markdown-main-panel")
    panel = panels[3]

    normalized_html = normalize_math_html(str(panel))
    formulas = [m.group(1).strip() for m in INLINE_MATH_REGEX.finditer(normalized_html)]
    likely = [item for item in formulas if is_likely_math_fragment(item)]

    print("panel_count:", len(panels))
    print("formula_count_after_rebuild:", len(formulas))
    print("likely_formula_count_after_rebuild:", len(likely))
    print("first_likely_formulas:")
    for item in likely[:8]:
        print("-", item)


if __name__ == "__main__":
    main()
