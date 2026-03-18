// ── Tabs ──────────────────────────────────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).style.display = 'block';
  btn.classList.add('active');
}

function toggleFillAll() {
  const checked = document.getElementById('fillAll').checked;
  document.getElementById('singleUpcField').style.display = checked ? 'block' : 'none';
  document.getElementById('upcListField').style.display   = checked ? 'none'  : 'block';
}


const TEMPLATES = {
  '5160': { name:'5160', labelW:2.625, labelH:1,   cols:3, rows:10, count:30, marginTop:0.5,  marginLeft:0.19,  colGap:0.125, rowGap:0    },
  '5167': { name:'5167', labelW:1.75,  labelH:0.5, cols:4, rows:20, count:80, marginTop:0.5,  marginLeft:0.305, colGap:0.297, rowGap:0    },
};

let startPos = 1;

function updateStartPicker() {
  const tpl = TEMPLATES[document.getElementById('averyTemplate').value];
  const picker = document.getElementById('startPicker');
  let html = `<div class="label-grid" style="grid-template-columns:repeat(${tpl.cols},1fr)">`;
  for (let i = 1; i <= tpl.count; i++) {
    html += `<div class="grid-cell" id="gc${i}" onclick="setStart(${i})">${i}</div>`;
  }
  html += '</div>';
  picker.innerHTML = html;
  startPos = 1;
  document.getElementById('startInput').max = tpl.count;
  refreshGrid();
}

function setStart(n) {
  const tpl = TEMPLATES[document.getElementById('averyTemplate').value];
  n = Math.max(1, Math.min(n, tpl.count));
  startPos = n;
  document.getElementById('startNum').textContent = n;
  document.getElementById('startInput').value = n;
  refreshGrid();
}

function refreshGrid() {
  const tpl = TEMPLATES[document.getElementById('averyTemplate').value];
  for (let i = 1; i <= tpl.count; i++) {
    const el = document.getElementById('gc' + i);
    if (!el) continue;
    el.className = 'grid-cell' + (i < startPos ? ' used' : i === startPos ? ' selected' : '');
  }
}

// ── Image state ───────────────────────────────────────────
let originalImage = null;
let bwDataUrl = null;

function handleImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      originalImage = img;
      document.getElementById('imgOriginal').src = ev.target.result;
      document.getElementById('imgControls').style.display = 'block';
      document.getElementById('uploadLabel').textContent = '✅ ' + file.name;
      applyThreshold(parseInt(document.getElementById('threshold').value));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function updateThreshold(val) {
  document.getElementById('threshVal').textContent = val;
  applyThreshold(parseInt(val));
}

function applyThreshold(thresh) {
  if (!originalImage) return;
  const maxSize = 300;
  const scale = Math.min(1, maxSize / Math.max(originalImage.width, originalImage.height));
  const w = Math.round(originalImage.width * scale);
  const h = Math.round(originalImage.height * scale);

  const proc = document.getElementById('processCanvas');
  proc.width = w; proc.height = h;
  const ctx = proc.getContext('2d');
  ctx.drawImage(originalImage, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
    const bw = lum >= thresh ? 255 : 0;
    d[i] = d[i+1] = d[i+2] = bw;
    d[i+3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const prev = document.getElementById('previewCanvas');
  prev.width = w; prev.height = h;
  prev.getContext('2d').putImageData(imgData, 0, 0);

  bwDataUrl = proc.toDataURL('image/png');

  if (document.getElementById('preview').style.display === 'block') {
    renderImageSlot();
  }
}

function renderImageSlot() {
  const slot = document.getElementById('img-slot');
  if (!bwDataUrl) { slot.innerHTML = ''; return; }
  const stretch = document.getElementById('stretchImg').checked;
  if (stretch) {
    slot.innerHTML = `<img src="${bwDataUrl}" style="height:100%;width:auto;max-width:160px;">`;
  } else {
    slot.innerHTML = `<img src="${bwDataUrl}" style="max-height:120px;max-width:120px;">`;
  }
}

function removeImage() {
  originalImage = null;
  bwDataUrl = null;
  document.getElementById('imgUpload').value = '';
  document.getElementById('imgControls').style.display = 'none';
  document.getElementById('uploadLabel').textContent = '📁 Click or drag an image here';
  document.getElementById('img-slot').innerHTML = '';
}

// ── Barcode ───────────────────────────────────────────────
function generate() {
  const val   = document.getElementById('val').value.trim();
  const fmt   = document.getElementById('fmt').value;
  const color = document.getElementById('barColor').value;
  const w     = parseInt(document.getElementById('barWidth').value)  || 2;
  const h     = parseInt(document.getElementById('barHeight').value) || 80;
  const errEl = document.getElementById('err');
  errEl.style.display = 'none';

  try {
    JsBarcode('#barcode', val, {
      format: fmt, lineColor: color, width: w, height: h,
      displayValue: true, background: '#ffffff', margin: 10,
    });
    document.getElementById('label-title').textContent    = document.getElementById('titleText').value;
    document.getElementById('label-subtitle').textContent = document.getElementById('subtitleText').value;
    renderImageSlot();
    document.getElementById('preview').style.display = 'block';
    document.getElementById('preview').scrollIntoView({ behavior: 'smooth' });
  } catch(e) {
    errEl.style.display = 'block';
  }
}

// ── Export ────────────────────────────────────────────────
function escXml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildExportSVG() {
  const svgEl   = document.getElementById('barcode');
  const title   = document.getElementById('label-title').textContent;
  const sub     = document.getElementById('label-subtitle').textContent;
  const bcW     = parseInt(svgEl.getAttribute('width'))  || 300;
  const bcH     = parseInt(svgEl.getAttribute('height')) || 100;
  const stretch = !!(bwDataUrl && document.getElementById('stretchImg').checked);

  const pad      = 20;
  const titleH   = title ? 22 : 0;
  const subH     = sub   ? 18 : 0;
  const contentH = titleH + bcH + subH + 10;
  const totalH   = contentH + pad * 2;

  const imgH    = bwDataUrl ? (stretch ? contentH : bcH) : 0;
  const aspectR = (originalImage && originalImage.naturalHeight)
                    ? originalImage.naturalWidth / originalImage.naturalHeight : 1;
  const imgW    = bwDataUrl ? Math.round(imgH * aspectR) : 0;
  const gap     = bwDataUrl ? 20 : 0;
  const totalW  = imgW + gap + bcW + pad * 2;
  const imgY    = stretch ? pad : pad + titleH;
  const bcX     = pad + imgW + gap;

  let y   = pad;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}">`;
  svg    += `<rect width="${totalW}" height="${totalH}" fill="white"/>`;

  if (bwDataUrl) {
    svg += `<image href="${bwDataUrl}" x="${pad}" y="${imgY}" width="${imgW}" height="${imgH}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  if (title) {
    y   += 16;
    svg += `<text x="${bcX + bcW/2}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#111">${escXml(title)}</text>`;
    y   += 6;
  }
  svg += `<g transform="translate(${bcX},${y})">${svgEl.innerHTML}</g>`;
  y   += bcH;
  if (sub) {
    y   += 14;
    svg += `<text x="${bcX + bcW/2}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#555">${escXml(sub)}</text>`;
  }
  svg += `</svg>`;
  return svg;
}

function getFileName() {
  const name = document.getElementById('fileName').value.trim();
  return name || 'barcode-label';
}

function downloadSVG() {
  const blob = new Blob([buildExportSVG()], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = getFileName() + '.svg';
  a.click();
}

function downloadPNG() {
  const svg = buildExportSVG();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width  = img.width  * 3;
    canvas.height = img.height * 3;
    const ctx = canvas.getContext('2d');
    ctx.scale(3, 3);
    ctx.drawImage(img, 0, 0);
    const a = document.createElement('a');
    a.download = getFileName() + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

// ── Print Sheet ───────────────────────────────────────────
function printSheet() {
  const errEl = document.getElementById('printErr');
  errEl.style.display = 'none';

  const tpl   = TEMPLATES[document.getElementById('averyTemplate').value];
  const fillAll = document.getElementById('fillAll').checked;
  let upcs;
  if (fillAll) {
    const single = document.getElementById('singleUpc').value.trim();
    if (!single) {
      errEl.textContent = '⚠️ Please enter a barcode value.';
      errEl.style.display = 'block';
      return;
    }
    const available = tpl.count - startPos + 1;
    upcs = Array(available).fill(single);
  } else {
    upcs = document.getElementById('upcList').value
             .split('\n').map(s => s.trim()).filter(Boolean);
  }
  const fmt   = document.getElementById('averyFmt').value;
  const color = document.getElementById('averyColor').value;
  const title = document.getElementById('averyTitle').value;
  const sub   = document.getElementById('averySub').value;

  if (!upcs.length) {
    errEl.textContent = '⚠️ Please enter at least one UPC.';
    errEl.style.display = 'block';
    return;
  }
  const available = tpl.count - startPos + 1;
  if (upcs.length > available) {
    errEl.textContent = `⚠️ ${upcs.length} UPCs but only ${available} labels available from position ${startPos}. Extra UPCs will be ignored.`;
    errEl.style.display = 'block';
  }

  const labels = [];
  let upcIdx = 0;
  for (let pos = startPos; pos <= tpl.count && upcIdx < upcs.length; pos++) {
    labels.push({ pos, upc: upcs[upcIdx++] });
  }

  const win = window.open('', '_blank');
  win.document.write(buildPrintHTML(tpl, labels, fmt, color, title, sub));
  win.document.close();
}

function buildPrintHTML(tpl, labels, fmt, color, title, sub) {
  const tiny      = tpl.labelH < 0.6;
  const titleSize = tiny ? '5pt' : '7pt';
  const subSize   = tiny ? '4pt' : '6pt';
  const bcHeight  = Math.round(tpl.labelH * 55);

  let divs = '';
  for (const { pos, upc } of labels) {
    const row = Math.floor((pos - 1) / tpl.cols);
    const col = (pos - 1) % tpl.cols;
    const x   = tpl.marginLeft + col * (tpl.labelW + tpl.colGap);
    const y   = tpl.marginTop  + row * (tpl.labelH + tpl.rowGap);
    divs += `
    <div class="label" style="left:${x}in;top:${y}in;width:${tpl.labelW}in;height:${tpl.labelH}in;">
      ${title ? `<div class="ltitle">${escHtml(title)}</div>` : ''}
      <svg id="bc${pos}" class="bcsvg"></svg>
      ${sub ? `<div class="lsub">${escHtml(sub)}</div>` : ''}
      <span class="bc-err" style="font-size:6pt;color:red;display:none">Invalid</span>
    </div>`;
  }

  const inits = labels.map(({ pos, upc }) => `
  try {
    JsBarcode('#bc${pos}', ${JSON.stringify(upc)}, {
      format: ${JSON.stringify(fmt)}, lineColor: ${JSON.stringify(color)},
      width: 1, height: ${bcHeight}, displayValue: true,
      background: 'transparent', margin: 1, fontSize: ${tiny ? 5 : 7}
    });
  } catch(e) {
    var err = document.querySelector('#bc${pos} ~ .bc-err');
    if (err) { err.style.display='inline'; document.getElementById('bc${pos}').style.display='none'; }
  }`).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Avery ${tpl.name} Print Sheet</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js"><\/script>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  @page { size:8.5in 11in; margin:0; }
  body { width:8.5in; background:white; font-family:sans-serif; }
  .toolbar { background:#1a1d27; color:#fff; padding:10px 16px; display:flex; align-items:center; gap:12px; font-size:13px; }
  .toolbar strong { color:#6c63ff; }
  .tbtn { padding:7px 16px; background:#6c63ff; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; }
  .tbtn:hover { background:#574fd6; }
  .sheet { position:relative; width:8.5in; height:11in; background:white; }
  .label { position:absolute; overflow:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1px; }
  .bcsvg { max-width:100%; height:auto; display:block; }
  .ltitle { font-size:${titleSize}; font-weight:bold; text-align:center; line-height:1.2; color:#000; }
  .lsub   { font-size:${subSize};   text-align:center; line-height:1.2; color:#444; }
  @media print { .toolbar { display:none; } }
</style>
</head>
<body>
<div class="toolbar">
  <div>
    <strong>Avery ${tpl.name}</strong> &nbsp;·&nbsp; ${labels.length} label${labels.length !== 1 ? 's' : ''}
    &nbsp;·&nbsp; Set margins to <strong>None</strong> and paper to <strong>Letter</strong> before printing.
  </div>
  <button class="tbtn" onclick="window.print()">🖨️ Print Now</button>
</div>
<div class="sheet">
${divs}
</div>
<script>
window.onload = function() {
${inits}
};
<\/script>
</body>
</html>`;
}

// ── Init ──────────────────────────────────────────────────
generate();
updateStartPicker();