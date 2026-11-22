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
