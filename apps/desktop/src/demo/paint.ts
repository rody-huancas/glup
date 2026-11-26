// Pictures of the demo, drawn here (nothing with anybody's rights): a landscape for the Portapapeles and a
// sheet on a table for Escanear documento, as the bytes Rust would send.
type Draw = (context: CanvasRenderingContext2D, width: number, height: number) => void;

export const paint = (width: number, height: number, draw: Draw, type = 'image/jpeg'): Promise<ArrayBuffer> => {
  const canvas  = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) draw(context, width, height);
  return new Promise((done) => canvas.toBlob((blob) => void (blob ? blob.arrayBuffer().then(done) : done(new ArrayBuffer(0))), type, 0.9));
};

export const landscape: Draw = (context, width, height) => {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#f6c36b');
  sky.addColorStop(0.55, '#f2777a');
  sky.addColorStop(1, '#3a2b52');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#fbe3b0';
  context.beginPath();
  context.arc(width * 0.68, height * 0.45, height * 0.12, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#2a2140';
  context.beginPath();
  context.moveTo(0, height);
  context.lineTo(0, height * 0.7);
  context.lineTo(width * 0.25, height * 0.48);
  context.lineTo(width * 0.45, height * 0.66);
  context.lineTo(width * 0.7, height * 0.42);
  context.lineTo(width, height * 0.64);
  context.lineTo(width, height);
  context.fill();
};

// A sheet with lines of «text», a little tilted, on a wooden table.
export const sheetOnTable: Draw = (context, width, height) => {
  context.fillStyle = '#6b4b33';
  context.fillRect(0, 0, width, height);
  for (let line = 0; line < height; line += 18) {
    context.fillStyle = line % 36 === 0 ? '#73523a' : '#654630';
    context.fillRect(0, line, width, 9);
  }
  const corners = [[0.2, 0.1], [0.82, 0.14], [0.78, 0.92], [0.16, 0.88]].map(([x, y]) => [x * width, y * height]);
  context.fillStyle = '#f4f1ea';
  context.beginPath();
  corners.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
  context.closePath();
  context.fill();
  context.save();
  context.transform(0.98, 0.06, -0.06, 0.98, width * 0.24, height * 0.17);
  context.fillStyle = '#2b2a33';
  context.fillRect(0, 0, width * 0.32, 14);
  for (let row = 0; row < 22; row += 1) {
    context.fillStyle = '#8d8a96';
    context.fillRect(0, 40 + row * 22, width * (row % 5 === 4 ? 0.3 : 0.5), 6);
  }
  context.restore();
};

// The same sheet, straight and clean (what Escanear documento makes of it).
export const flatSheet: Draw = (context, width, height) => {
  context.fillStyle = '#fbfaf7';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#26252d';
  context.fillRect(width * 0.1, height * 0.08, width * 0.5, height * 0.03);
  for (let row = 0; row < 26; row += 1) {
    context.fillStyle = '#7f7c88';
    context.fillRect(width * 0.1, height * (0.16 + row * 0.03), width * (row % 6 === 5 ? 0.45 : 0.8), height * 0.009);
  }
};
