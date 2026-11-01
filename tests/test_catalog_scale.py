import csv
import hashlib
import io
import json
import sys
from pathlib import Path
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'analysis'))
from catalog_scale import parse_desi,parse_cf4


class CatalogScaleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cf4=json.loads((ROOT/'web/data/catalogs/cf4.json').read_text())
        cls.desi=json.loads((ROOT/'web/data/catalogs/desi-bins.json').read_text())
        cls.summary=json.loads((ROOT/'web/data/catalogs/summary.json').read_text())
        cls.provenance=json.loads((ROOT/'data/catalog-provenance.json').read_text())

    def test_desi_all_cells_reconcile_with_count_and_snapshot(self):
        rows=self.desi['rows']
        self.assertEqual(len(rows),39364)
        self.assertEqual(sum(r[3] for r in rows),14140375)
        self.assertEqual(hashlib.sha256(json.dumps(rows,separators=(',',':')).encode()).hexdigest(),self.provenance['canonical_desi_rows_sha256'])
        self.assertEqual(len({tuple(r[:3]) for r in rows}),len(rows))

    def test_cf4_full_inventory_identifiers_errors_methods(self):
        rows=self.cf4['rows']
        self.assertEqual(len(rows),55877)
        self.assertEqual(len({r[0] for r in rows}),55877)
        self.assertTrue(np.isfinite(np.array(rows,dtype=float)).all())
        self.assertTrue(all(r[9]>0 and 0<r[10]<256 for r in rows))
        for i,name in enumerate(self.cf4['methods']):
            self.assertEqual(sum(bool(r[10]&(1<<i)) for r in rows),self.summary['cf4_method_counts'][name])
        first=next(r for r in rows if r[0]==2)
        self.assertEqual(first,[2,73150,0,0.007,47.2745,113.9553,-14.6992,4726,34.535,0.46,2])

    def test_norma_count_independent_cartesian_angle(self):
        r=np.array(self.cf4['rows']);l,b=np.deg2rad(r[:,5]),np.deg2rad(r[:,6])
        xyz=np.column_stack([np.cos(b)*np.cos(l),np.cos(b)*np.sin(l),np.sin(b)])
        l0,b0=np.deg2rad([325,-7]);unit=np.array([np.cos(b0)*np.cos(l0),np.cos(b0)*np.sin(l0),np.sin(b0)])
        mask=xyz.dot(unit)>=np.cos(np.deg2rad(20));d=10**((r[:,8]-25)/5)
        self.assertEqual(int(mask.sum()),389)
        self.assertEqual(int((mask&(d>=40)&(d<=100)).sum()),126)

    def test_csv_exports_match_numeric_browser_records(self):
        for file,expected in [('cf4',self.cf4['rows']),('desi-bins',self.desi['rows'])]:
            with (ROOT/('web/data/catalogs/'+file+'.csv')).open() as f:
                rows=list(csv.reader(f))[1:]
            self.assertEqual(len(rows),len(expected))
            np.testing.assert_allclose(np.array(rows,dtype=float),np.array(expected,dtype=float),rtol=0,atol=0)

    def test_query_error_truncation_and_duplicate_rejection(self):
        good=b'lon_bin,lat_bin,z_bin,n\n1,2,0,10\n'
        self.assertEqual(parse_desi(good,b'n\n10\n')[1],10)
        for data,count in [(b'<VOTABLE>error</VOTABLE>',b'n\n10\n'),(good,b'n\n11\n'),(good+b'1,2,0,10\n',b'n\n20\n')]:
            with self.assertRaises(ValueError):parse_desi(data,count)
        with self.assertRaises(ValueError):parse_cf4(b'Table download failed')


if __name__=='__main__':unittest.main()
