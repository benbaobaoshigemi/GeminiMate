"""
Gemini LaTeX Fixer — Diagnostic Dump Server
Receives JSON diagnostic reports from the extension and saves them with timestamps.
Run: python dump_server.py
"""
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

DUMP_DIR = os.path.join(os.path.dirname(__file__), 'dumps')
os.makedirs(DUMP_DIR, exist_ok=True)

class DumpHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8')

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        filename = f'diag_{timestamp}.json'
        filepath = os.path.join(DUMP_DIR, filename)

        # Try to pretty-print if it's JSON
        try:
            data = json.loads(body)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            # Print summary to terminal
            p1 = data.get('phase1_demolish', {})
            p3 = data.get('phase3_render', [])
            p4 = data.get('phase4_replace', {})
            ok = sum(1 for r in p3 if r.get('success'))
            fail = sum(1 for r in p3 if not r.get('success'))
            print(f'\n{"="*60}')
            print(f'  DIAGNOSTIC REPORT @ {data.get("timestamp", "?")}')
            print(f'{"="*60}')
            print(f'  Containers: {p4.get("containers_handled", "?")}')
            print(f'  Demolished: {p1.get("math_inline_reverted", 0)} inline, {p1.get("math_block_reverted", 0)} block')
            print(f'  KaTeX: {ok} OK, {fail} FAILED')
            print(f'  Fragments: {p4.get("total_fragments_created", 0)} from {p4.get("text_nodes_processed", 0)} text nodes')
            print(f'  Saved to: {filepath}')

            # Print any failed renders
            for r in p3:
                if not r.get('success'):
                    print(f'  FAIL: {r.get("mathSrc", "?")[:80]} | {r.get("errorMsg", "")}')

            # Print sanitize entries with CJK extraction
            for s in data.get('phase2_sanitize', []):
                if s.get('prefix') or s.get('suffix'):
                    print(f'  CJK extracted: prefix="{s["prefix"]}" suffix="{s["suffix"]}" math="{s["mathSrc"][:60]}"')

            print(f'{"="*60}\n')

        except json.JSONDecodeError:
            # Fallback: save raw text
            filepath = filepath.replace('.json', '.txt')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(body)
            print(f'[DUMP] Raw text saved to {filepath} ({len(body)} bytes)')

        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b'OK')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        # Suppress default request logging noise
        pass

if __name__ == '__main__':
    port = 8000
    server = HTTPServer(('localhost', port), DumpHandler)
    print(f'[Gemini LaTeX Fixer] Diagnostic dump server running on http://localhost:{port}/dump')
    print(f'[Gemini LaTeX Fixer] Reports will be saved to: {os.path.abspath(DUMP_DIR)}')
    print(f'[Gemini LaTeX Fixer] Waiting for data...\n')
    server.serve_forever()
