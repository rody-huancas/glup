# Fotos de prueba HEIC y AVIF

Fotos diminutas (de 64 × 48 o menos, menos de 1,2 KB cada una) para las pruebas de
`src/services/image/heif` y `src/services/image/metadata.rs`. **Las hizo Glup para estas pruebas**:
son cuadros de colores y rampas de grises generados por los scripts de esta carpeta, sin ninguna foto
de nadie. Se publican bajo la misma licencia MIT del repositorio (o CC0, a elección).

| Archivo | Qué prueba |
| --- | --- |
| `rotada.heic` | 4:2:0 de 8 bits, como las del iPhone, con `irot` (EXIF orientación 6: girar un cuarto a la derecha), fecha y GPS en su EXIF |
| `diez-bits-p3.heic` | 10 bits en Display P3 (`nclx` 12/13/6): un color P3 arriba y una rampa de grises abajo |
| `rafaga.heic` | Dos fotos (ráfaga); la principal es la segunda (azul) |
| `mosaico.heic` | Mosaico (`grid`) de dos piezas de 64 × 64, recortado a 120 × 60, como las fotos del iPhone (piezas de 512 × 512) |
| `rotada.avif` | AVIF de 8 bits con `irot` de 90° a la izquierda |
| `diez-bits.avif` | AVIF de 10 bits con una rampa de grises |

`rafaga.heic` y `diez-bits.avif` también van dentro de Glup (`include_bytes!`): con ellas pregunta a
Windows si sabe abrir cada formato.

## Cómo se hicieron

Con Python 3.12, en un entorno aparte que se borró al terminar (nada de esto entra en Glup):

```bash
python -m venv heicenv
heicenv/Scripts/python -m pip install pillow pillow-heif numpy
heicenv/Scripts/python make_fixtures.py . <ruta a ffmpeg.exe>
heicenv/Scripts/python add_irot.py rotada.avif 1
heicenv/Scripts/python make_grid.py mosaico.heic
```

- **HEIC**: [pillow-heif](https://github.com/bigcat88/pillow_heif) 1.8.1 (BSD-3) con libheif 1.23.6
  y el codificador x265. Solo se usaron para crear los archivos; Glup no los incluye ni los enlaza.
- **AVIF**: el mismo `ffmpeg.exe` LGPL que Glup descarga (n9.0.2, `libaom-av1`).
- `add_irot.py` agrega la caja `irot` a un AVIF (FFmpeg no la escribe) y corrige los tamaños y los
  desplazamientos de `iloc`. `make_grid.py` arma el mosaico a partir de dos HEIC de una pieza.
