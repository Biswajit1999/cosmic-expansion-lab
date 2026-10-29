"""Download immutable upstream inputs; record and verify SHA-256 provenance."""
from pathlib import Path
import hashlib
import json
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REV = 'c447f0fea703fcd0fff57de5000947b5ca81286b'
BASE = f'https://raw.githubusercontent.com/PantheonPlusSH0ES/DataRelease/{REV}/Pantheon%2B_Data/4_DISTANCES_AND_COVAR/'
FILES = ['README', 'Pantheon+SH0ES.dat', 'Pantheon+SH0ES_STAT+SYS.cov']


def main():
    folder = ROOT / 'data'
    folder.mkdir(exist_ok=True)
    manifest = folder / 'provenance.json'
    previous = json.loads(manifest.read_text()) if manifest.exists() else None
    entries = []
    for name in FILES:
        path = folder / name
        if not path.exists():
            print('Downloading', name)
            temporary = path.with_suffix(path.suffix + '.part')
            urllib.request.urlretrieve(BASE + name, temporary)
            temporary.replace(path)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if previous:
            expected = next(x['sha256'] for x in previous['files'] if x['name'] == name)
            if digest != expected:
                raise ValueError(f'Checksum mismatch: {name}; restore the pinned input')
        entries.append(dict(name=name, url=BASE + name, sha256=digest, bytes=path.stat().st_size))
    manifest.write_text(json.dumps(dict(repository='https://github.com/PantheonPlusSH0ES/DataRelease', commit=REV, files=entries), indent=2) + '\n')
    print('All input checksums verified.')


if __name__ == '__main__':
    main()
