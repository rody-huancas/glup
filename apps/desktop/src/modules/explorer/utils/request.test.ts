import { describe, expect, it } from 'vitest';
import { needsPanel, requestAction } from '@/modules/explorer/utils/request';
import { TOOLS } from '@/modules/tools/constants/tools';

describe('a request from the Explorer', () => {
  it('runs the action of the option chosen, with every file of the selection', () => {
    expect(requestAction({ tool: 'convert-image', paths: ['a.jpg', 'b.png'] }, TOOLS)).toBe('convert');
    expect(requestAction({ tool: 'compress-pdf', paths: ['a.pdf'] }, TOOLS)).toBe('compress');
  });

  it('loads the files in Inicio for "Enviar a" or an option that is gone', () => {
    expect(requestAction({ tool: null, paths: ['a.docx'] }, TOOLS)).toBeNull();
    expect(requestAction({ tool: 'cleanup', paths: ['a.pdf'] }, TOOLS)).toBeNull();
    expect(requestAction({ tool: 'nothing', paths: ['a.pdf'] }, TOOLS)).toBeNull();
  });

  it('every option of the menu is an action of tools.json (or a screen that takes files) and says whether it asks something', () => {
    const menu = TOOLS.filter((tool) => tool.menu);
    expect(menu.length).toBeGreaterThan(5);
    expect(menu.every((tool) => (tool.kind === 'action' || (tool.kind === 'page' && tool.actionId)) && typeof tool.menuNeedsStep === 'boolean')).toBe(true);
    // «Leer QR» opens its screen with the files.
    expect(requestAction({ tool: 'qr-read', paths: ['codigo.png'] }, TOOLS)).toBe('read-qr');
  });

  it('opens the island only when something is left to do there', () => {
    const compress = { tool: 'compress-image', paths: ['a.jpg', 'b.jpg'] };
    const convert  = { tool: 'convert-image', paths: ['a.jpg'] };

    // Reducir peso runs with the usual options; Convertir a… asks the format.
    expect(needsPanel({ request: compress, tools: TOOLS, chosen: true })).toBe(false);
    expect(needsPanel({ request: convert, tools: TOOLS, chosen: true })).toBe(true);
    expect(needsPanel({ request: { tool: 'compress-pdf', paths: ['a.pdf'] }, tools: TOOLS, chosen: true })).toBe(true);

    // Not chosen (refused, not fitting, "Enviar a"): the files wait in Inicio, so it opens.
    expect(needsPanel({ request: compress, tools: TOOLS, chosen: false })).toBe(true);
    expect(needsPanel({ request: { tool: null, paths: ['a.docx'] }, tools: TOOLS, chosen: false })).toBe(true);
  });
});
