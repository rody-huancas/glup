# Avisos de terceros

Glup es MIT. Aquí van las piezas de otros que usa y que merecen un aviso aparte, además de las
dependencias de Rust y de JavaScript (cada una con su licencia en su paquete).

## Quitar fondo

### BiRefNet_lite (el modelo)

- **Qué es**: el modelo de inteligencia artificial que separa el sujeto del fondo. Glup **no lo
  incluye en el instalador**: lo descarga una sola vez, con permiso de la persona, la primera vez
  que se usa «Quitar fondo». Corre en la computadora; las imágenes nunca salen de ella.
- **Autor**: Peng Zheng y colaboradores — [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)
  ([artículo](https://arxiv.org/abs/2401.03407)).
- **Archivo**: la exportación ONNX en media precisión (fp16) de
  [onnx-community/BiRefNet_lite-ONNX](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX),
  fijada a la revisión `de15b22ba131738a16dff04aab8bdf8dc32e3ac1` y verificada con su SHA-256
  (`apps/desktop/src-tauri/src/services/background/model.rs`).
- **Licencia**: MIT.

```text
MIT License

Copyright (c) 2024 ZhengPeng

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### ONNX Runtime (el motor que corre el modelo)

- **Qué es**: el motor de Microsoft que ejecuta el modelo en el procesador o, en Windows, en la
  tarjeta gráfica con DirectML. Va enlazado dentro de Glup.
- **Autor**: Microsoft Corporation — [microsoft/onnxruntime](https://github.com/microsoft/onnxruntime).
- **Licencia**: MIT.

```text
MIT License

Copyright (c) Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### ort (el puente de Rust con ONNX Runtime)

- **Autor**: pyke.io y Nicolas Bigaouette — [pykeio/ort](https://github.com/pykeio/ort).
- **Licencia**: MIT o Apache-2.0, a elección.

### DirectML

- **Qué es**: la capa de Windows que deja a ONNX Runtime usar la tarjeta gráfica. Glup usa la que
  ya trae Windows 10 y 11 (`C:\Windows\System32\DirectML.dll`); si falla, sigue con el procesador.
- **Autor**: Microsoft Corporation.
- **Licencia**: componente de Windows. Si algún día se empaqueta la versión redistribuible de
  `DirectML.dll` junto al instalador, se rige por los términos de Microsoft para DirectML (no es
  MIT) y hay que agregarlos aquí.

## Mejorar calidad

### Real-ESRGAN (los dos modelos)

- **Qué es**: los modelos de inteligencia artificial que agrandan fotos chicas o borrosas (x2 y x4).
  Glup **no los incluye en el instalador**: descarga el del nivel elegido una sola vez, con permiso de
  la persona, la primera vez que se usa «Mejorar calidad», y aparecen en Ajustes › Lo que aprendí.
  Corren en la computadora, con el mismo ONNX Runtime y DirectML de «Quitar fondo»; las fotos nunca
  salen de ella.
- **Autor**: Xintao Wang y colaboradores — [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)
  ([artículo](https://arxiv.org/abs/2107.10833)).
- **Archivos**: las exportaciones ONNX (fp32) de los pesos oficiales hechas por
  [jonathanst29/tinier-upscale-models](https://huggingface.co/jonathanst29/tinier-upscale-models),
  fijadas a la revisión `899dc1e4b22bbf1955c2f1739c085edc080cb366` y verificadas con su SHA-256
  (`apps/desktop/src-tauri/src/services/upscale/model.rs`):
  - «Rápido»: `realesr-general-x4v3.onnx` (SRVGGNetCompact, 4,9 MB).
  - «Más detalle»: `realesrgan-x4plus.onnx` (RRDBNet, 67 MB).
- **Licencia**: BSD-3-Clause.

```text
BSD 3-Clause License

Copyright (c) 2021, Xintao Wang
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## Marca de agua

### Las letras

- Glup no trae fuentes propias para la marca de agua: usa las que ya vienen con Windows (Segoe UI,
  Arial, Georgia, Consolas, Impact, Segoe Script), leídas de `C:\Windows\Fonts` en la computadora de
  la persona. No se copian ni se reparten.
- Las dibuja [ab_glyph](https://github.com/alexheretic/ab-glyph) (Apache-2.0), una dependencia de Rust.

## Crear y leer un QR

### qrcode (hacer el código)

- **Qué es**: la biblioteca de Rust que convierte el texto (un enlace, una red WiFi, un contacto) en el
  dibujo del QR, con su corrección de errores. Glup dibuja después los puntos, las esquinas y el logo.
- **Código**: [kennytm/qrcode-rust](https://github.com/kennytm/qrcode-rust), versión 0.14.
- **Licencia**: MIT o Apache-2.0, a elegir.

### rxing (leer códigos)

- **Qué es**: el lector de QR y de códigos de barras (EAN, UPC, Code 128, Code 39, Data Matrix), una
  versión en Rust de ZXing. Encuentra varios códigos en la misma imagen. Glup también lo usa para probar
  cada QR que crea antes de guardarlo. Lee en la computadora; nada sale de ella.
- **Código**: [rxing-core/rxing](https://github.com/rxing-core/rxing), versión 0.8.
- **Licencia**: Apache-2.0.

## Videos

### FFmpeg (el programa que reduce el peso de los videos y abre fotos HEIC y AVIF)

- **Qué es**: el programa que lee y vuelve a codificar los videos. Glup **no lo incluye en el
  instalador ni lo enlaza**: lo descarga una sola vez, con permiso de la persona, la primera vez que
  se reduce un video, y lo ejecuta como un programa aparte (`ffmpeg.exe`, en la carpeta `tools/` de
  los datos de la app). Los videos nunca salen de la computadora. También abre las fotos HEIC
  (iPhone) y AVIF cuando Windows no puede (sin sus extensiones de Microsoft Store): las decodifica con
  su decodificador HEVC propio y con `libdav1d` (BSD-2), y Glup las pone derechas y en sRGB.
- **Versión**: FFmpeg n9.0.2-39-g7adfbe40dc, compilación `win64-lgpl-9.0` de
  [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds) (autobuild del 2026-10-31). De ese
  paquete Glup baja solo `bin/ffmpeg.exe`, verificado con su SHA-256
  (`apps/desktop/src-tauri/src/services/video/tool.rs`).
- **Licencia**: GNU LGPL versión 3 (compilado con `--enable-version3`, sin `--enable-gpl` ni
  `--enable-nonfree`; sin `libx264` ni `libx265`). Glup codifica con `h264_mf` (Media Foundation de
  Windows) y el AAC propio de FFmpeg.
- **Código fuente**: el de esa versión exacta está en
  [FFmpeg/FFmpeg@7adfbe40dc](https://github.com/FFmpeg/FFmpeg/commit/7adfbe40dc) (rama `release/9.0`,
  sobre la etiqueta [n9.0.2](https://github.com/FFmpeg/FFmpeg/releases/tag/n9.0.2)); los scripts con
  que se compiló y las bibliotecas que incluye, con sus licencias, en
  [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds) y en el `LICENSE.txt` del paquete.
- **Reemplazarlo**: como es un programa aparte, cualquiera puede cambiar ese `ffmpeg.exe` por otra
  compilación de FFmpeg; Glup solo lo ejecuta.
- **Texto de la licencia**: [GNU Lesser General Public License v3](https://www.gnu.org/licenses/lgpl-3.0.html).

## Pasar audio a texto

### whisper.cpp (el motor que escucha)

- **Qué es**: la implementación en C/C++ de Whisper que corre en el procesador. Va **enlazada dentro
  de Glup** (se compila con el crate `whisper-rs-sys`, versión 0.15, que trae whisper.cpp).
- **Autor**: Georgi Gerganov y colaboradores — [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp).
- **Licencia**: MIT.

```text
MIT License

Copyright (c) 2023-2026 The ggml authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### glup-voz: whisper.cpp con Vulkan (la tarjeta de video)

- **Qué es**: `glup-voz.exe`, un programa aparte que va en el instalador junto a `glup.exe`. Lleva
  whisper.cpp con el backend Vulkan de ggml (sus shaders SPIR-V van compilados dentro), del mismo
  autor y con la misma licencia MIT de arriba. Glup lo ejecuta para escuchar con la tarjeta de video;
  si no hay una que sirva, no se usa.
- **Vulkan**: los encabezados de [Vulkan-Headers](https://github.com/KhronosGroup/Vulkan-Headers)
  (Apache-2.0 o MIT) se usan al compilar; `glslc` ([shaderc](https://github.com/google/shaderc),
  Apache-2.0) solo compila los shaders y no se distribuye. El cargador `vulkan-1.dll`
  ([Vulkan-Loader](https://github.com/KhronosGroup/Vulkan-Loader), Apache-2.0) **no va en el
  instalador**: lo instala el driver de la tarjeta de video. Nada de CUDA ni de otras bibliotecas de
  los fabricantes.

### whisper-rs (el puente de Rust con whisper.cpp)

- **Autor**: tazz4843 y colaboradores — [tazz4843/whisper-rs](https://github.com/tazz4843/whisper-rs).
- **Licencia**: Unlicense (dominio público).

### Los modelos de Whisper

- **Qué son**: los pesos del modelo de reconocimiento de voz de OpenAI, convertidos al formato ggml.
  Glup **no los incluye en el instalador**: descarga uno solo, con permiso, la primera vez que se usa
  cada nivel («Rápido»: `ggml-small-q5_1.bin`, 190 MB; «Más preciso»: `ggml-medium-q5_0.bin`, 539 MB).
  Corren en la computadora; los audios nunca salen de ella.
- **Origen**: [openai/whisper](https://github.com/openai/whisper) (código y pesos bajo MIT); la
  conversión ggml cuantizada es de [ggerganov/whisper.cpp en Hugging Face](https://huggingface.co/ggerganov/whisper.cpp)
  (MIT), fijada a la revisión `5359861c739e955e79d9a303bcbc70fb988958b1` y verificada con su SHA-256
  (`apps/desktop/src-tauri/src/services/transcribe/model.rs`).
- **Licencia**: MIT, Copyright (c) 2022 OpenAI.

### FFmpeg

Para leer el sonido usa el mismo `ffmpeg.exe` de «Videos» (ver arriba); si no está, se descarga junto
con el modelo.


## Copiar texto de la pantalla

El texto lo lee el mismo reconocimiento de texto que trae Windows («Sacar texto»); la captura de la
pantalla y el portapapeles usan las funciones de Windows. Nada se descarga ni se guarda en disco.

### tauri-plugin-global-shortcut (el atajo de teclado)

- **Qué es**: el plugin de Tauri que registra con Windows el atajo que abre «Copiar texto de la
  pantalla» desde cualquier programa. Va enlazado dentro de Glup.
- **Autor**: Tauri Programme within The Commons Conservancy —
  [tauri-apps/plugins-workspace](https://github.com/tauri-apps/plugins-workspace).
- **Licencia**: Apache-2.0 o MIT, a elección.

### global-hotkey (la pieza del plugin que habla con Windows)

- **Autor**: Tauri Programme within The Commons Conservancy —
  [tauri-apps/global-hotkey](https://github.com/tauri-apps/global-hotkey).
- **Licencia**: Apache-2.0 o MIT, a elección.
