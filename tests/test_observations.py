"""Check the scientific provenance boundary and the actual distributed assets."""
import hashlib
import json
from pathlib import Path
import unittest
from urllib.parse import urlparse
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'


class ObservationTests(unittest.TestCase):
    def test_published_reconstruction_provenance(self):
        record = json.loads((WEB / 'data/reconstruction.json').read_text(encoding='utf-8'))
        self.assertEqual(record['kind'], 'published_velocity_reconstruction')
        data = (WEB / record['file']).read_bytes()
        self.assertEqual(hashlib.sha256(data).hexdigest(), record['sha256'])
        self.assertEqual(len(data), record['bytes'])
        with Image.open(WEB / record['file']) as image:
            self.assertEqual(image.size, (record['width'], record['height']))
            image.verify()
        self.assertIn('not a telescope photograph', record['limitations'])
        self.assertTrue(record['paper'].startswith('https://doi.org/'))

    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((WEB / 'data/observations.json').read_text(encoding='utf-8'))

    def test_pinned_bytes_and_real_dimensions(self):
        for target in self.catalog['targets']:
            for layer in target['layers']:
                with self.subTest(image=layer['file']):
                    path = (WEB / layer['file']).resolve()
                    self.assertIn(WEB.resolve(), path.parents)
                    content = path.read_bytes()
                    self.assertEqual(hashlib.sha256(content).hexdigest(), layer['sha256'])
                    self.assertEqual(len(content), layer['bytes'])
                    with Image.open(path) as image:
                        self.assertEqual(image.format, 'JPEG')
                        self.assertEqual(image.size, (layer['width'], layer['height']))
                        image.verify()

    def test_sources_credits_and_selection_keys(self):
        targets = self.catalog['targets']
        self.assertEqual(len({target['id'] for target in targets}), len(targets))
        allowed = {'esahubble.org', 'www.eso.org', 'esawebb.org', 'www.chandra.harvard.edu'}
        for target in targets:
            ids = [layer['id'] for layer in target['layers']]
            self.assertEqual(len(ids), len(set(ids)))
            self.assertIn(target['default_layer'], ids)
            for layer in target['layers']:
                for key in ('source', 'usage'):
                    self.assertEqual(urlparse(layer[key]).scheme, 'https')
                    self.assertIn(urlparse(layer[key]).hostname, allowed)
                for key in ('alt', 'credit', 'license', 'interpretation', 'centre', 'field'):
                    self.assertTrue(layer[key].strip())

    def test_inference_and_registration_are_explicit(self):
        bullet = next(t for t in self.catalog['targets'] if t['id'] == 'bullet')
        composite = next(x for x in bullet['layers'] if x['id'] == 'composite')
        self.assertEqual(composite['kind'], 'observations_plus_inference')
        self.assertIn('inferred', composite['interpretation'])
        self.assertIn('different crop', bullet['comparison'])
        self.assertIn('No image pixels are fitted', self.catalog['scope'])
        for target in self.catalog['targets']:
            for layer in target['layers']:
                if layer is not composite:
                    self.assertEqual(layer['kind'], 'observed_light')


if __name__ == '__main__':
    unittest.main()
