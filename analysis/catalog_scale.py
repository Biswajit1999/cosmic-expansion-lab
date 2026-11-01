"""Build a real-catalog inventory, not a peculiar-velocity fit.

Cached source bytes are pinned by data/catalog-provenance.json. --fetch obtains
missing inputs only; DESI responses are checked against independent COUNT(*).
The default run is offline. This code never fills observational gaps with mocks.
"""
import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
METHODS = ['SN Ia', 'Tully-Fisher', 'Fundamental Plane', 'SBF', 'SN II', 'TRGB', 'Cepheid', 'Masers']
METHOD_SLICES = [(41,47),(53,59),(65,71),(77,83),(90,96),(102,107),(113,119),(126,131)]
COLUMNS = ['pgc','group_pgc','tempel_group','ra_deg','dec_deg','gal_lon_deg','gal_lat_deg','vcmb_kms','distance_modulus','sigma_mu','method_mask']


def parse_cf4(content):
    rows=[]
    for line in content.decode('utf-8-sig').splitlines():
        if len(line)<190 or not line[:7].strip().isdigit():
            continue
        row=[int(line[:7]),int(line[8:15]),int(line[16:21]),float(line[137:145]),float(line[146:154]),float(line[155:163]),float(line[164:172]),int(line[22:27]),float(line[28:34]),float(line[35:40]),sum(1<<i for i,(a,b) in enumerate(METHOD_SLICES) if line[a:b].strip())]
        if not (0<=row[3]<360 and -90<=row[4]<=90 and 0<=row[5]<360 and -90<=row[6]<=90 and row[9]>0 and row[10]>0):
            raise ValueError('Invalid CF4 record: '+str(row[0]))
        rows.append(row)
    if not rows or len({r[0] for r in rows})!=len(rows):
        raise ValueError('Empty CF4 input or duplicate PGC IDs')
    return rows


def parse_desi(content, count_content):
    text=content.decode('utf-8-sig')
    if not text.startswith('lon_bin,lat_bin,z_bin,n'):
        raise ValueError('DESI response is not the expected CSV (check TAP errors)')
    rows=[[int(float(r[k])) for k in ['lon_bin','lat_bin','z_bin','n']] for r in csv.DictReader(io.StringIO(text))]
    total=list(csv.DictReader(io.StringIO(count_content.decode('utf-8-sig'))))
    expected=int(total[0]['n'])
    if len(rows)>=200000 or len({tuple(r[:3]) for r in rows})!=len(rows):
        raise ValueError('Potentially truncated or duplicate DESI bins')
    if any(not(0<=a<72 and 0<=b<36 and 0<=z<40 and n>0) for a,b,z,n in rows):
        raise ValueError('Invalid DESI bin')
    if sum(r[3] for r in rows)!=expected:
        raise ValueError('DESI bin sum does not match independent COUNT(*)')
    return sorted(rows),expected


def separation(l,b,l0=325,b0=-7):
    l,b,l0,b0=map(math.radians,(l,b,l0,b0))
    return math.degrees(math.acos(max(-1,min(1,math.sin(b)*math.sin(b0)+math.cos(b)*math.cos(b0)*math.cos(l-l0)))))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fetch',action='store_true')
    args=parser.parse_args()
    manifest=json.loads((ROOT/'data/catalog-provenance.json').read_text(encoding='utf-8'))
    inputs={}
    for item in manifest['inputs']:
        path=ROOT/item['cache_path']
        if not path.exists():
            if not args.fetch: raise FileNotFoundError(str(path)+'; run with --fetch')
            url=item['url']
            if 'query' in item:
                url+='?'+urllib.parse.urlencode({'REQUEST':'doQuery','LANG':'ADQL','FORMAT':'csv','MAXREC':item['maxrec'],'QUERY':item['query']})
            with urllib.request.urlopen(url,timeout=240) as response: content=response.read()
            # Live database responses are validated semantically below; byte ordering may change.
            if item['id']=='cf4' and hashlib.sha256(content).hexdigest()!=item['sha256']:
                raise ValueError('Published CF4 source changed')
            path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(content)
        content=path.read_bytes()
        if hashlib.sha256(content).hexdigest()!=item['sha256']:
            if item['id']=='cf4': raise ValueError('CF4 checksum mismatch')
            print('NOTE: DESI bytes differ from the archived query response; validating counts and bins.')
        inputs[item['id']]=content
    cf4=parse_cf4(inputs['cf4'])
    desi,total=parse_desi(inputs['desi_bins'],inputs['desi_count'])
    if hashlib.sha256(json.dumps(desi,separators=(',',':')).encode()).hexdigest()!=manifest['canonical_desi_rows_sha256']:
        raise ValueError('DESI cell counts changed; explicitly re-curate the snapshot')
    if len(cf4)!=manifest['expected_cf4_rows'] or total!=manifest['expected_desi_rows']:
        raise ValueError('Catalog counts changed; explicitly re-curate before publishing')
    target=ROOT/'web/data/catalogs';target.mkdir(exist_ok=True)
    cf4_data={'columns':COLUMNS,'methods':METHODS,'rows':cf4}
    (target/'cf4.json').write_text(json.dumps(cf4_data,separators=(',',':'))+'\n',encoding='utf-8')
    (target/'desi-bins.json').write_text(json.dumps({'columns':['longitude_bin','latitude_bin','redshift_bin','count'],'angular_step_deg':5,'redshift_step':0.05,'rows':desi},separators=(',',':'))+'\n',encoding='utf-8')
    with (target/'cf4.csv').open('w',newline='',encoding='utf-8') as f:
        writer=csv.writer(f);writer.writerow(COLUMNS);writer.writerows(cf4)
    with (target/'desi-bins.csv').open('w',newline='',encoding='utf-8') as f:
        writer=csv.writer(f);writer.writerow(['longitude_bin','latitude_bin','redshift_bin','count']);writer.writerows(desi)
    method_counts={name:sum(bool(r[10]&(1<<i)) for r in cf4) for i,name in enumerate(METHODS)}
    cone=[r for r in cf4 if separation(r[5],r[6])<=20]
    local=[r for r in cone if 40<=10**((r[8]-25)/5)<=100]
    summary={'status':'Catalog inventory and coverage only; no velocity-field or attractor fit', 'snapshot_date':manifest['snapshot_date'],'desi_selected_spectra':total,'desi_occupied_bins':len(desi),'cf4_records':len(cf4),'cf4_unique_pgc':len({r[0] for r in cf4}),'cf4_method_counts':method_counts,'norma_cone':{'centre_galactic_deg':[325,-7],'radius_deg':20,'all_distances_records':len(cone),'distance_40_100_mpc_records':len(local),'note':'Exploratory direction and cuts, not an inferred attractor boundary; distances are transforms of combined catalog moduli.'},'inputs':manifest['inputs'],'selection':manifest['selection'],'limitations':manifest['limitations']}
    (target/'summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in summary.items() if k not in ['inputs','selection','limitations']},indent=2))


if __name__=='__main__':main()
