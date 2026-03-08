function generate() {
  const val = document.getElementById('val').value.trim();
  const fmt = document.getElementById('fmt').value;
  const color = document.getElementById('barColor').value;
  const w = parseInt(document.getElementById('barWidth').value) || 2;
  const h = parseInt(document.getElementById('barHeight').value) || 80;
  const title = document.getElementById('titleText').value;
  const sub = document.getElementById('subtitleText').value;
  const errEl = document.getElementById('err');
  errEl.style.display = 'none';

  try {
    JsBarcode('#barcode', val, {
      format: fmt,
      lineColor: color,
      width: w,
      height: h,
      displayValue: true,
      background: '#ffffff',
      margin: 10,
    });
    document.getElementById('label-title').textContent = title;
    document.getElementById('label-subtitle').textContent = sub;
    document.getElementById('preview').style.display = 'block';
    document.getElementById('preview').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    errEl.style.display = 'block';
  }
}

function getSVGString() {
  const svgEl = document.getElementById('barcode');
  const title = document.getElementById('label-title').textContent;
  const sub = document.getElementById('label-subtitle').textContent;
  const svgW = svgEl.getAttribute('width') || 300;
  const svgH = svgEl.getAttribute('height') || 100;
  const barcodeContent = svgEl.innerHTML;
  const totalH = parseInt(svgH) + (title ? 30 : 0) + (sub ? 22 : 0) + 20;

  let y = 10;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${totalH}">`;
  svg += `<rect width="${svgW}" height="${totalH}" fill="white"/>`;
  if (title) {
    y += 20;
    svg += `<text x="${svgW/2}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#111">${escXml(title)}</text>`;
    y += 6;
  }
  svg += `<g transform="translate(0,${y})">${barcodeContent}</g>`;
  y += parseInt(svgH);
  if (sub) {
    y += 16;
    svg += `<text x="${svgW/2}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#555">${escXml(sub)}</text>`;
  }
  svg += `</svg>`;
  return svg;
}

function escXml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function downloadSVG() {
  const blob = new Blob([getSVGString()], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'barcode-label.svg';
  a.click();
}

function downloadPNG() {
  const svg = getSVGString();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * 3;
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

// Auto-generate on page load
generate();