import { describe, expect, it } from 'vitest';
import {
  batteryHealthPhrase,
  cpuPhrase,
  diskPhrase,
  memoryPercent,
  memoryPhrase,
  percentText,
  shouldRestart,
  spaceWarning,
  uptimeText,
} from '@/modules/performance/utils/phrases';

const GB = 1024 ** 3;

describe('phrases', () => {
  it('tells the processor by its thresholds', () => {
    expect(cpuPhrase(5)).toBe('Tu PC está tranquila');
    expect(cpuPhrase(29.9)).toBe('Tu PC está tranquila');
    expect(cpuPhrase(30)).toBe('Tu PC está trabajando');
    expect(cpuPhrase(75)).toBe('El procesador está muy ocupado');
    expect(cpuPhrase(95)).toBe('El procesador está al máximo');
  });

  it('tells the memory and the disk', () => {
    expect(memoryPhrase(memoryPercent(4 * GB, 16 * GB))).toBe('Hay memoria de sobra');
    expect(memoryPhrase(80)).toBe('La memoria está bastante usada');
    expect(memoryPhrase(91)).toBe('La memoria está casi llena');
    expect(memoryPercent(1, 0)).toBe(0);
    expect(diskPhrase(3)).toBe('El disco está tranquilo');
    expect(diskPhrase(65)).toBe('El disco está muy ocupado');
  });

  it('warns about little space by share or by size', () => {
    expect(spaceWarning({ root: 'C:\\', label: '', free: 200 * GB, total: 500 * GB })).toBeNull();
    // 8 % of a big disk, but 80 GB: by share.
    expect(spaceWarning({ root: 'D:\\', label: '', free: 80 * GB, total: 1000 * GB })).toBe('Queda poco espacio');
    // 30 % of a small disk, but 9 GB: by size.
    expect(spaceWarning({ root: 'E:\\', label: '', free: 9 * GB, total: 30 * GB })).toBe('Queda poco espacio');
    expect(spaceWarning({ root: 'C:\\', label: '', free: 1 * GB, total: 256 * GB })).toBe('Casi no queda espacio');
  });

  it('tells the time on and suggests a restart after some days', () => {
    expect(uptimeText(30)).toBe('1 minuto');
    expect(uptimeText(45 * 60)).toBe('45 minutos');
    expect(uptimeText(5 * 3600 + 10)).toBe('5 horas');
    expect(uptimeText(86400)).toBe('1 día');
    expect(uptimeText(4 * 86400)).toBe('4 días');
    expect(shouldRestart(2 * 86400)).toBe(false);
    expect(shouldRestart(3 * 86400)).toBe(true);
  });

  it('tells the battery health when Windows gives it', () => {
    expect(batteryHealthPhrase({ percent: 80, charging: false, plugged: false, health: 92 })).toBe('Rinde el 92 % de cuando era nueva');
    expect(batteryHealthPhrase({ percent: 80, charging: false, plugged: false, health: 71 })).toContain('Ya no dura como nueva');
    expect(batteryHealthPhrase({ percent: 80, charging: false, plugged: false, health: null })).toBe('Windows no dice cómo está su salud');
  });

  it('writes percents the Spanish way', () => {
    expect(percentText(0.42)).toBe('0,4');
    expect(percentText(37.6)).toBe('38');
  });
});
