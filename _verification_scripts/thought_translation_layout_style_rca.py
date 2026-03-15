from __future__ import annotations

from pathlib import Path

from bs4 import BeautifulSoup


def main() -> None:
    html = Path('失败4.html').read_text(encoding='utf-8')
    soup = BeautifulSoup(html, 'lxml')
    container = soup.select_one('.thoughts-content-expanded')
    if container is None:
        print('expanded_container_found=False')
        return

    direct_children = [child for child in container.children if getattr(child, 'name', None)]
    source_nodes = container.select('.gm-thought-original > .markdown.markdown-main-panel')
    strong_nodes = container.select('.gm-thought-original strong, .gm-thought-original b')

    first_source_parent = source_nodes[0].parent if source_nodes else None
    first_source_index = -1
    if first_source_parent is not None:
        siblings = [child for child in first_source_parent.children if getattr(child, 'name', None)]
        first_source_index = siblings.index(source_nodes[0])

    print(f'container_direct_child_count={len(direct_children)}')
    print(f'source_node_count={len(source_nodes)}')
    print(f'first_source_index_in_parent={first_source_index}')
    print(f'layout_would_shift_when_append_tail={first_source_index > -1}')
    print(f'strong_block_count={len(strong_nodes)}')
    for idx, node in enumerate(strong_nodes[:8], 1):
        text = ' '.join(node.get_text(' ', strip=True).split())
        print(f'strong_{idx}={text}')


if __name__ == '__main__':
    main()
