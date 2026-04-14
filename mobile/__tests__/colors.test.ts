import { describe, it, expect } from 'vitest';
import { colors } from '../lib/colors';

describe('Brand Colors', () => {
  it('exports a colors object', () => {
    expect(colors).toBeDefined();
    expect(typeof colors).toBe('object');
  });

  it('pink is #EC4899', () => {
    expect(colors.pink).toBe('#EC4899');
  });

  it('purple is #A855F7', () => {
    expect(colors.purple).toBe('#A855F7');
  });

  it('background (bg) is #0D0D0D', () => {
    expect(colors.bg).toBe('#0D0D0D');
  });

  it('pinkDark is #DB2777', () => {
    expect(colors.pinkDark).toBe('#DB2777');
  });

  it('purpleDark is #9333EA', () => {
    expect(colors.purpleDark).toBe('#9333EA');
  });

  it('violet is #7C3AED', () => {
    expect(colors.violet).toBe('#7C3AED');
  });

  it('card is #1A1A2E', () => {
    expect(colors.card).toBe('#1A1A2E');
  });

  it('border is #2D2D44', () => {
    expect(colors.border).toBe('#2D2D44');
  });

  it('white is #FFFFFF', () => {
    expect(colors.white).toBe('#FFFFFF');
  });

  it('text is #F9FAFB', () => {
    expect(colors.text).toBe('#F9FAFB');
  });

  it('muted is #9CA3AF', () => {
    expect(colors.muted).toBe('#9CA3AF');
  });

  it('has all 11 required color keys', () => {
    const keys = Object.keys(colors);
    const required = ['pink', 'pinkDark', 'purple', 'purpleDark', 'violet', 'bg', 'card', 'border', 'muted', 'white', 'text'];
    for (const key of required) {
      expect(keys).toContain(key);
    }
  });

  it('all color values are valid hex codes', () => {
    const hexRegex = /^#([0-9A-F]{3}|[0-9A-F]{6})$/i;
    for (const [key, value] of Object.entries(colors)) {
      expect(hexRegex.test(value), `${key}: "${value}" is not a valid hex color`).toBe(true);
    }
  });
});
