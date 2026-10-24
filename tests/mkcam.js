// Buat video kamera palsu (y4m) berisi QR kode-saja, bergantian: GRD-001, BOR-001, KRP-002, UKR-003 (urutan dipakai uji)
const qrcode = require('qrcode-generator'), fs = require('fs');
const W = 640, H = 480, codes = process.argv.slice(3), out = process.argv[2];
const frames = [];
for (const code of codes) {
  const qr = qrcode(0, 'H'); qr.addData(code); qr.make();
  const n = qr.getModuleCount(), m = 4, tot = n + 2 * m, px = Math.floor((Number(process.env.QRSIZE) || 400) / tot);
  const Y = Buffer.alloc(W * H, 255);
  const ox = Math.floor((W - tot * px) / 2), oy = Math.floor((H - tot * px) / 2);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c))
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) Y[(oy + (r + m) * px + y) * W + ox + (c + m) * px + x] = 0;
  const U = Buffer.alloc(W * H / 4, 128), V = Buffer.alloc(W * H / 4, 128);
  frames.push(Buffer.concat([Buffer.from('FRAME\n'), Y, U, V]));
}
// tiap kode ditampilkan 40 frame (4 detik pada 10 fps), diulang
const parts = [Buffer.from('YUV4MPEG2 W' + W + ' H' + H + ' F10:1 Ip A1:1 C420jpeg\n')];
for (let rep = 0; rep < 1; rep++) for (const f of frames) for (let i = 0; i < 20; i++) parts.push(f);
fs.writeFileSync(out, Buffer.concat(parts));
console.log('ok', out, codes.join(','));
