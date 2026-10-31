"""Fetch publisher JPEGs; verify pinned bytes (no image processing).

Use --record only when deliberately curating a new manifest or asset version.
Existing assets are verified locally without making network requests.
"""
import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'web/data/observations.json'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--record', action='store_true')
    args = parser.parse_args()
    data = json.loads(MANIFEST.read_text(encoding='utf-8'))
    for target in data['targets']:
        for layer in target['layers']:
            path = ROOT / 'web' / layer['file']
            if path.exists():
                content = path.read_bytes()
            else:
                request = urllib.request.Request(layer['download'], headers={'User-Agent': 'CosmicExpansionLab/3.1 (research image attribution)'})
                with urllib.request.urlopen(request, timeout=60) as response:
                    content = response.read()
            if not content.startswith(b'\xff\xd8'):
                raise ValueError('Expected JPEG: ' + layer['file'])
            digest = hashlib.sha256(content).hexdigest()
            if args.record:
                # Pillow is only needed for deliberate metadata curation.
                from PIL import Image
                import io
                with Image.open(io.BytesIO(content)) as img:
                    img.verify()
                with Image.open(io.BytesIO(content)) as img:
                    layer['width'], layer['height'] = img.size
                layer.update(sha256=digest, bytes=len(content), verified_on=date.today().isoformat(), pixel_modifications='None; unmodified publisher JPEG')
            elif digest != layer.get('sha256'):
                raise ValueError('SHA-256 mismatch: ' + layer['file'])
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists():
                path.write_bytes(content)
            print(layer['file'], len(content), digest[:12])
    if args.record:
        MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
