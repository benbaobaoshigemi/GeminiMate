import re
import json

with open(r'c:\Users\zhang\Desktop\GeminiHelper\Google Gemini.html', 'r', encoding='utf-8') as f:
    html = f.read()

def get_hierarchy(text, steps):
    idx = html.find(text)
    if idx == -1: return "Not found"
    
    current_idx = idx
    hierarchy = []
    
    for _ in range(steps):
        open_tag_idx = html.rfind('<', 0, current_idx)
        if open_tag_idx == -1: break
        
        close_tag_idx = html.find('>', open_tag_idx)
        tag_str = html[open_tag_idx:close_tag_idx+1]
        
        # very basic tag name extraction
        tag_match = re.search(r'<([^\s>]+)', tag_str)
        tag_name = tag_match.group(1) if tag_match else '?'
        if tag_name.startswith('/'):
            current_idx = open_tag_idx - 1
            continue
            
        # very basic class extraction
        class_match = re.search(r'class="([^"]+)"', tag_str)
        classes = class_match.group(1) if class_match else ''
        
        hierarchy.append(f"{tag_name}(class='{classes}')")
        current_idx = open_tag_idx - 1
        
    return "\n  ".join(hierarchy)


with open(r'c:\Users\zhang\Desktop\GeminiHelper\GeminiMate\_verification_scripts\out.txt', 'w', encoding='utf-8') as f:
    f.write("User Prompt:\n")
    f.write(get_hierarchy("巴塞罗那最好的公园在哪里", 20))
    f.write("\n\nModel Response:\n")
    f.write(get_hierarchy("奎尔公园", 20))
    f.write("\n\nBottom elements with gradient:\n")
    for g in re.findall(r'<[^>]*class="[^"]*gradient[^"]*"[^>]*>', html)[:10]:
         f.write(g + "\n")
