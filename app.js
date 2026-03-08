// ── Image state ──────────────────────────────────────────
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

function buildExportSVG() {
  const svgEl  = document.getElementById('barcode');
  const title  = document.getElementById('label-title').textContent;
  const sub    = document.getElementById('label-subtitle').textContent;
  const bcW    = parseInt(svgEl.getAttribute('width'))  || 300;
  const bcH    = parseInt(svgEl.getAttribute('height')) || 100;
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

function downloadSVG() {
  const blob = new Blob([buildExportSVG()], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'barcode-label.svg';
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
    a.download = 'barcode-label.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

// Auto-generate on load
generate();