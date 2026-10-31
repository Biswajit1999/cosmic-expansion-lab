"""Check local asset links and unique HTML IDs without requiring a browser."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import unittest
ROOT=Path(__file__).resolve().parents[1]/'web'


class Page(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.links=[]
    def handle_starttag(self,tag,attrs):
        data=dict(attrs)
        if 'id' in data:self.ids.append(data['id'])
        for attr in ['src','href']:
            if attr in data:self.links.append(data[attr])


class SiteTests(unittest.TestCase):
    def test_links_and_ids(self):
        for source in ROOT.glob('*.html'):
            page=Page();page.feed(source.read_text(encoding='utf8'))
            self.assertEqual(len(page.ids),len(set(page.ids)),source.name)
            for link in page.links:
                parsed=urlsplit(link)
                if parsed.scheme or parsed.netloc:continue
                destination=source.parent/unquote(parsed.path) if parsed.path else source
                self.assertTrue(destination.is_file(),link)
                if parsed.fragment and destination.suffix=='.html':
                    other=Page();other.feed(destination.read_text(encoding='utf8'))
                    self.assertIn(unquote(parsed.fragment),other.ids,link)


if __name__=='__main__':unittest.main()
