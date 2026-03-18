from __future__ import annotations

import re


RE_MATH = re.compile(r"(\$\$[\s\S]*?\$\$)|(\$((?:\\\$|[^$])+?)\$)")
CJK_CHAR_REGEX = re.compile(
    r"[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF，。、《》；：！？“”’（）【】…—]"
)


def inspect_inline_math(text: str) -> list[dict[str, object]]:
    findings: list[dict[str, object]] = []
    for match in RE_MATH.finditer(text):
        inline_math = match.group(2)
        if not inline_math:
            continue
        before = text[match.start() - 1] if match.start() > 0 else ""
        after = text[match.end()] if match.end() < len(text) else ""
        findings.append(
            {
                "fragment": inline_math,
                "before": before,
                "after": after,
                "before_needs_space_current": bool(before and not before.isspace()),
                "after_needs_space_current": bool(after and not after.isspace()),
                "before_is_cjk_or_punct": bool(before and CJK_CHAR_REGEX.search(before)),
                "after_is_cjk_or_punct": bool(after and CJK_CHAR_REGEX.search(after)),
            }
        )
    return findings


def main() -> None:
    text = (
        "相比之下，磁场分析器依赖于电磁铁产生的磁场 $B$ 。根据洛伦兹力公式，电子在磁场中的轨道半径 "
        "$R$ 满足 $R = \\frac{mv}{qB}$ 。要改变测量的能量，就必须改变线圈中的电流。"
        "对于需要 $0.1 \\text{ eV}$ 级别精度的 XPS 来说，即便是地球那微弱的磁场（约 $0.5\\text{ Gauss}$ ）"
        "都能让电子偏离预定轨道，XPS 整个分析室通常需要包裹数层昂贵的坡莫合金（ $\\mu\\text{-metal}$ ）进行磁屏蔽。"
    )
    for finding in inspect_inline_math(text):
        print(finding)


if __name__ == "__main__":
    main()
