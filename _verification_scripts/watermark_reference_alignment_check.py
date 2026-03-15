from __future__ import annotations

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "src" / "features" / "watermarkRemover" / "index.ts"


def require(pattern: str, content: str, description: str) -> None:
    if re.search(pattern, content, re.MULTILINE | re.DOTALL) is None:
        raise AssertionError(description)


def forbid(pattern: str, content: str, description: str) -> None:
    if re.search(pattern, content, re.MULTILINE | re.DOTALL) is not None:
        raise AssertionError(description)


def main() -> int:
    content = TARGET.read_text(encoding="utf-8")

    require(
        r"function\s+setupFetchInterceptorBridge\s*\(",
        content,
        "missing fetch interceptor bridge wiring",
    )
    require(
        r"notifyFetchInterceptor\(true\)",
        content,
        "watermark bridge is not enabled during start",
    )
    require(
        r"nativeDownloadButton\.click\(\)",
        content,
        "banana button does not proxy Gemini native download",
    )
    forbid(
        r"// Disable Voyager-style native download interception path\.",
        content,
        "legacy interceptor-disable branch is still present",
    )

    print("watermark_reference_alignment_check: ok")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"watermark_reference_alignment_check: fail: {exc}")
        raise SystemExit(1)
