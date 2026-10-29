"""Check local asset links and unique HTML IDs without requiring a browser."""
from html.parser import HTMLParser
from pathlib import Path
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
        page=Page();page.feed((ROOT/'index.html').read_text(encoding='utf8'))
        self.assertEqual(len(page.ids),len(set(page.ids)))
        for link in page.links:
            if link.startswith(('https:','http:','mailto:')):continue
            if link.startswith('#'):
                if link!='#':self.assertIn(link[1:],page.ids)
            else:self.assertTrue((ROOT/link).is_file(),link)


if __name__=='__main__':unittest.main()
