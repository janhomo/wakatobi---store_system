import re, json, collections
src = open('/tmp/claude-0/-home-claude/eda91aa1-27da-5de8-9165-aabef528fe76/scratchpad/data/build.py').read()
src = src.split("assert len(rows) == 98")[0]
ns = {}
exec(src.split("wb = Workbook()")[0], ns)   # hanya bagian data
rows = ns['rows']
assert len(rows) == 98

CAT = {  # nama mesin -> kategori
 'Bor/Breker': ['Bor impak 18V','Bor magnet 1050W','Bor duduk','Bor cas 1.5Ah','Bor cas 18V 5.0Ah','Bor cas 7.2V 1.5Ah','Bor cas 18V 2.0Ah','Bor listrik 350W','Bor listrik 750W','Bor listrik 400W','Core drill 2400W','Bor breaker kecil','Bor breaker sedang','Breker besar'],
 'Peralatan Baja/Besi': ['Rebar tier','Rebar tier kuning','Pembengkok besi'],
 'Mesin Pembersihan': ['Blower','Vakum','Vakum/Blower'],
 'Peralatan Udara': ['Hot gun','Air compressor'],
 'Mesin Karpenter': ['Jiksaw','Skap','Somel','Somel cas 18V','Gergaji mesin'],
 'Mesin Amplas': ['Amplas dinding 18V','Amplas tembok','Belt sander 440W'],
 'Gurinda/Mesin Potong': ['Gurinda besar','Pemotong multifungsi','Potong ubin','Potong keramik 860W','Potong besi 2000W'],
 'Pengaduk': ['Mixer'],
 'Alat Ukur & Pendeteksi': ['Laser'],
 'Mesin Las': ['Las PVC','Las 160A','Las 200A'],
}
kat_of = {n: k for k, l in CAT.items() for n in l}

K_CONFIRMED = {('H3',29),('H3',37),('H3',38),('H1 Gurinda',7),('H1 Gurinda',13)}
K_SENT = re.compile(r'(Tanda K di tepi\.?|Ada goresan di tepi foto, mungkin K yang terpotong\.?|Goresan di tepi foto, mungkin K terpotong\.?)\s*')
out = []
for (l, no, nama, merek, model, unit, kond, lok, cek, cat, filled) in rows:
    assert nama in kat_of, nama
    tempat = 'Gudang Karpenter' if (l, no) in K_CONFIRMED else 'Gudang'
    cat = K_SENT.sub('', cat).strip()
    cat = re.sub(r"\s*Disamakan dengan baris 57-58 \(model sama\)\.", " Disamakan dengan baris lain yang modelnya sama.", cat)
    note = []
    if merek == 'Machine code': merek = ''; note.append("Merek tertulis 'Machine code' di kertas, dikosongkan.")
    if model == 'Machine code': model = ''; note.append("Model tertulis 'Machine code' di kertas, dikosongkan.")
    if cek and cat: note.append(cat)
    elif cek and not cat: pass
    kondisi = 'Belum dicek' if kond == 'Belum diisi' else kond
    out.append(dict(l=l, no=no, kat=kat_of[nama], nama=nama, merek=merek, model=model, unit=unit, kondisi=kondisi, tempat=tempat, note=note, cek=bool(cek)))

# bersihkan catatan "Sama dengan baris 17." yang merujuk nomor kertas: tetap dipertahankan sebagai teks
# nomor unit kembar dalam satu jenis -> beri nomor bebas berikutnya
groups = collections.defaultdict(list)
for r in out: groups[(r['nama'].lower(), r['merek'].lower(), r['model'].lower())].append(r)
clash = []
for k, lst in groups.items():
    used = set()
    for r in lst:
        if r['unit'] in used:
            clash.append((r['nama'], r['merek'], r['model'], r['unit'], r['l'], r['no']))
            nxt = max(max(x['unit'] for x in lst), max(used)) + 1
            while nxt in used or any(x['unit'] == nxt for x in lst): nxt += 1
            r['note'] = [n for n in r['note'] if 'kembar' not in n]
            r['note'].append(f"No. unit di kertas {r['unit']} sama dengan unit lain di jenis ini (H5 baris 58, unit 3). Diberi nomor {nxt}. Mesin yang sama?")
            r['unit'] = nxt
        used.add(r['unit'])
for r in out:
    if r['l']=='H5' and r['no']==58: r['note']=['No. unit 3 kembar dengan Lembar Bosch baris 2, yang diberi nomor 4. Mesin yang sama?']
print('jenis:', len(groups), 'bentrok:', clash)

# urutan: kategori, nama, merek, model, nomor unit
order = sorted(out, key=lambda r: (r['kat'], r['nama'].lower(), r['merek'].lower(), r['model'].lower(), r['unit']))
data = [[r['kat'], r['nama'], r['merek'], r['model'], r['unit'], r['kondisi'], r['tempat'], ' '.join(r['note']).strip()] for r in order]
json.dump(data, open('impor/data_awal.json', 'w'), ensure_ascii=False, indent=0)
print(len(data), collections.Counter(d[0] for d in data))
print(collections.Counter(d[6] for d in data), collections.Counter(d[5] for d in data))
print(sum(1 for d in data if d[7]), 'unit dengan catatan')
