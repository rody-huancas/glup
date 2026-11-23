# Cómo contribuir a Glup

¡Gracias por querer ayudar! Glup es una mascota de escritorio que hace tareas cotidianas con tus
archivos, gratis y sin subir nada a internet.

> **English speakers:** contributions are welcome in English too. The code is written in English; the
> app's interface and docs are in Spanish for now. Please follow the rules below and open an issue if
> anything is unclear.

## Antes de empezar

1. Busca si ya hay un issue sobre lo que quieres hacer. Si no, ábrelo y cuéntalo antes de escribir
   código: así evitamos trabajo repetido o cambios que no encajan.
2. Lee las reglas del proyecto en `.claude/skills/`:
   - `convenciones`: reglas de todo el repo (idioma, formato, licencias, archivos de la persona).
   - `desktop-ui`: la interfaz en React.
   - `tauri-rust`: el lado nativo en Rust.
   - `acciones`: cómo agregar una acción sobre archivos.
   - `isla-y-mascota`: la isla y las animaciones de Glup.

   Si usas Claude Code u otro asistente, el `CLAUDE.md` de la raíz le indica qué leer.

## Preparar el entorno

Requisitos: Rust (stable, con `rustup`), Node.js 20+, pnpm 10 y, en Windows, las Build Tools de C++.
Más detalles en el `README.md`.

```bash
pnpm install
pnpm dev
```

## Lo que no se negocia

- **Los archivos originales nunca se modifican ni se borran.**
- **Nada sale de la computadora de la persona.**
- **Solo dependencias con licencias permisivas** (MIT, Apache-2.0, BSD, ISC, Zlib). Nada GPL ni AGPL.
- **El formato es manual**: no pases formateadores automáticos sobre archivos existentes.
- **Textos de la interfaz en español llano**, con la voz de Glup.

## Antes de abrir el PR

```bash
pnpm --filter desktop typecheck
pnpm --filter desktop test
cd apps/desktop/src-tauri && cargo check && cargo test
```

- Todo en verde, sin warnings.
- Una rama por cambio: `feature/<nombre>`, `fix/<nombre>` o `chore/<nombre>`, desde `master`.
- Commits convencionales en español: `feat: …`, `fix: …`, `chore: …`.
- Completa la plantilla del PR, incluida la sección «Qué probar a mano».

## Publicar una versión

Solo Windows por ahora. La versión vive en `apps/desktop/src-tauri/Cargo.toml` (Tauri la lee de ahí) y
`apps/desktop/package.json` la sigue.

1. **Subir la versión** en `master`: `pnpm version:set 0.2.0`. Cambia `Cargo.toml`, `Cargo.lock` y
   `package.json` juntos.
2. **Commit**: `git commit -am "chore: versión 0.2.0"` y `git push`. Espera a que el CI pase.
3. **Tag con las notas**. El mensaje del tag es lo que trae la versión: va al Release y a lo que Glup
   muestra en Ajustes (cambiar el texto del borrador después no cambia lo que ve Glup).

   ```bash
   git tag -a v0.2.0 -m "- Herramientas: el catálogo completo
   - Arreglos en la isla"
   ```

4. **Push del tag**: `git push origin v0.2.0`. El workflow `Release` compila y deja un **borrador**
   con el instalador `.exe`, el `.msi` y `latest.json`. Falla si el tag no coincide con `Cargo.toml`.
5. **Revisar el borrador** en GitHub › Releases: que estén los archivos (también los `.sig`), instalar
   el `.exe` y probarlo.
6. **Publicarlo** («Publish release»). Desde ese momento las copias instaladas lo ven como versión
   nueva (lo revisan al arrancar y cada 6 horas, o con «Buscar actualizaciones» en Ajustes).

La firma usa los secretos `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Si se
pierde la clave privada, las copias instaladas ya no pueden actualizarse solas: guárdala bien.
