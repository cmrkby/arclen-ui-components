// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { defaults, mount, render, resolveSettings, type Controller } from './src/core';

let controller: Controller | undefined;
afterEach(() => {
  controller?.destroy();
  controller = undefined;
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

test('validates settings, escapes prompt text and keeps static instance IDs distinct', () => {
  expect(resolveSettings({})).toEqual(defaults);
  expect(resolveSettings({model:'juniper'}).model).toBe('silicon');
  expect(resolveSettings({model:'soul'}).model).toBe('argon');
  expect(() => resolveSettings({ model: 'invalid' })).toThrow();
  expect(() => resolveSettings({ placeholder: ' '.repeat(121) })).toThrow();
  expect(() => resolveSettings({ onSend: true })).toThrow();
  expect(render({ placeholder: '"><img src=x>' })).toContain(
    'placeholder="&quot;&gt;&lt;img src=x&gt;"',
  );
  expect(render()).not.toBe(render());
});

test('keeps draft on action removal and sends a selected action with the chosen model', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const onSend = vi.fn();
  const onEvent = vi.fn();
  host.addEventListener('action-composer-send', onEvent);
  controller = mount(host, {}, undefined, { onSend });
  const find = <T extends HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  const root = find('[data-ac-root]');
  const prompt = find<HTMLTextAreaElement>('[data-ac-prompt]');
  const send = find<HTMLButtonElement>('[data-ac-send]');
  const model = find<HTMLButtonElement>('[data-ac-model]');
  expect(host.querySelectorAll('[data-ac-action]')).toHaveLength(5);
  expect(send.disabled).toBe(true);

  find<HTMLButtonElement>('[data-ac-action="note"]').click();
  expect(document.activeElement).toBe(prompt);
  expect(root.dataset.acMode).toBe('compose');
  expect(prompt.placeholder).toBe('What should the document cover?');
  prompt.value = ' Keep the source links. ';
  prompt.dispatchEvent(new Event('input'));
  find<HTMLButtonElement>('[data-ac-chip]').click();
  expect(prompt.value).toBe(' Keep the source links. ');
  find<HTMLButtonElement>('[data-ac-action="docs"]').click();
  model.click();
  find<HTMLButtonElement>('[data-ac-choice="silicon"]').click();
  controller.update({ theme: 'light' });
  expect(model.textContent).toContain('Silicon');

  prompt.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
  expect(onSend).not.toHaveBeenCalled();
  prompt.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const detail = { text: 'Keep the source links.', action: 'docs', intent: 'create-chart', model: 'silicon' };
  expect(onSend).toHaveBeenCalledExactlyOnceWith(detail);
  expect((onEvent.mock.calls[0][0] as CustomEvent).detail).toEqual(detail);
  expect(prompt.value).toBe('');
  expect(root.dataset.acMode).toBe('open');
  expect(send.disabled).toBe(true);
});

test('simulates voice without changing the prior draft when canceled', () => {
  const host = document.createElement('div');
  document.body.append(host);
  controller = mount(host);
  const find = <T extends HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  const prompt = find<HTMLTextAreaElement>('[data-ac-prompt]');
  const mic = find<HTMLButtonElement>('[data-ac-mic]');
  const cancel = find<HTMLButtonElement>('[data-ac-cancel]');
  const stop = find<HTMLButtonElement>('[data-ac-stop]');
  prompt.value = 'My draft';

  find<HTMLButtonElement>('[data-ac-action="voice"]').click();
  expect(prompt.placeholder).toContain('Paste the text');
  expect(find('[data-ac-record]').hidden).toBe(true);
  mic.click();
  expect(find('[data-ac-record]').hidden).toBe(false);
  expect(find('[data-ac-time]').textContent).toBe('0:00');
  expect(document.activeElement).toBe(stop);
  cancel.click();
  expect(prompt.value).toBe('My draft');

  mic.click();
  controller.pause();
  expect(stop.disabled).toBe(true);
  controller.resume();
  expect(stop.disabled).toBe(false);
  stop.click();
  expect(prompt.value).toMatch(/^My draft\n.+Friday/);
  expect(find('[data-ac-chip-label]').textContent).toBe('Analyze doc');
  expect(document.activeElement).toBe(prompt);
  controller.destroy();
  expect(prompt.disabled).toBe(true);
  expect(find('[data-ac-record]').hidden).toBe(true);
});

test('locks the partial transcript and restores focus and Send when all beats arrive', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches: false }));
  const host = document.createElement('div');
  document.body.append(host);
  try {
    controller = mount(host);
    const prompt = host.querySelector<HTMLTextAreaElement>('[data-ac-prompt]')!;
    const mic = host.querySelector<HTMLButtonElement>('[data-ac-mic]')!;
    const stop = host.querySelector<HTMLButtonElement>('[data-ac-stop]')!;
    const send = host.querySelector<HTMLButtonElement>('[data-ac-send]')!;
    mic.click();
    stop.click();
    expect(prompt.value).toBe('Meet me');
    expect(prompt.readOnly).toBe(true);
    expect(mic.disabled).toBe(true);
    expect(send.disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(800);
    expect(prompt.value).toBe('Meet me at the pier on Friday. Bring the sketches from the last walk.');
    expect(prompt.readOnly).toBe(false);
    expect(send.disabled).toBe(false);
    expect(document.activeElement).toBe(prompt);
  } finally {
    vi.useRealTimers();
  }
});

test('updates live fan, artwork, labels and local transcript settings', () => {
  const host = document.createElement('div');
  controller = mount(host, { fanTravel: 210, fanSpread: 88, artStrength: 57 });
  const root = host.querySelector<HTMLElement>('[data-ac-root]')!;
  const labels = ['Picture', 'Write', 'Plan', 'Record', 'Summarize'];
  controller.update({
    actionLabels: labels,
    voiceSample: 'Buy paper.',
    accent: '#884422',
    fanStagger: 54,
    motionSpeed: 1.8,
  });
  expect(root.style.getPropertyValue('--ac-spread')).toBe('0.88');
  expect(root.style.getPropertyValue('--ac-art-ink')).toBe('0.57');
  expect(root.style.getPropertyValue('--ac-control-accent')).toBe('#884422');
  expect(
    [...root.querySelectorAll('[data-ac-action]')].map((b) => b.getAttribute('aria-label')),
  ).toEqual(labels);
  root.querySelector<HTMLButtonElement>('[data-ac-action="voice"]')!.click();
  root.querySelector<HTMLButtonElement>('[data-ac-mic]')!.click();
  root.querySelector<HTMLButtonElement>('[data-ac-stop]')!.click();
  expect(root.querySelector<HTMLTextAreaElement>('[data-ac-prompt]')!.value).toBe('Buy paper.');
  expect(root.querySelector('[data-ac-chip-label]')?.textContent).toBe('Record');
  expect(() => controller!.update({ fanTravel: 4 })).toThrow();
  expect(() => controller!.update({ actionLabels: ['Only one'] })).toThrow();
});

test('carries each fan card through an interrupted movement and settles it while paused', () => {
  vi.useFakeTimers();
  try {
    const host = document.createElement('div');
    controller = mount(host, { fanStagger: 50 });
    const toggle = host.querySelector<HTMLButtonElement>('[data-ac-toggle]')!;
    const cards = [...host.querySelectorAll<HTMLElement>('[data-ac-action]')];
    const at = (i: number) => Number(cards[i].style.getPropertyValue('--ac-fold'));
    toggle.click();
    vi.advanceTimersByTime(128);
    const midway = at(0);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1);
    toggle.click();
    expect(at(0)).toBe(midway);
    vi.advanceTimersByTime(80);
    expect(at(0)).toBeLessThan(at(4));
    vi.advanceTimersByTime(1024);
    expect(at(0)).toBe(0);
    toggle.click();
    controller.pause();
    expect(cards.every((_, i) => at(i) === 1)).toBe(true);
    controller.resume();
    toggle.click();
    vi.advanceTimersByTime(64);
    expect(at(0)).toBeLessThan(at(4));
  } finally {
    vi.useRealTimers();
  }
});

test('paper stock, input radius, tilt, and Enter behavior agree in SSR and live controls', () => {
  const host = document.createElement('div');
  const first = { paperPalette: 'blueprint', inputRadius: 8, fanTilt: 55, submitOnEnter: false };
  host.innerHTML = render(first);
  expect(host.querySelector<HTMLElement>('[data-ac-root]')!.dataset.paper).toBe('blueprint');
  expect(host.querySelector<HTMLElement>('[data-ac-root]')!.style.getPropertyValue('--ac-tilt')).toBe(
    '0.55',
  );
  expect(host.querySelector('[data-ac-prompt]')!.getAttribute('enterkeyhint')).toBe('enter');
  const onSend = vi.fn();
  controller = mount(host, first, undefined, { onSend });
  const root = host.querySelector<HTMLElement>('[data-ac-root]')!;
  const prompt = host.querySelector<HTMLTextAreaElement>('[data-ac-prompt]')!;
  prompt.value = 'A draft';
  prompt.dispatchEvent(new Event('input'));
  const enter = () => new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  expect(prompt.dispatchEvent(enter())).toBe(true);
  expect(onSend).not.toHaveBeenCalled();
  controller.update({ paperPalette: 'newsprint', inputRadius: 22, fanTilt: 0, submitOnEnter: true });
  expect(root.dataset.paper).toBe('newsprint');
  expect(root.style.getPropertyValue('--ac-input-radius')).toBe('22px');
  expect(root.style.getPropertyValue('--ac-tilt')).toBe('0');
  expect(prompt.getAttribute('enterkeyhint')).toBe('send');
  expect(prompt.value).toBe('A draft');
  expect(prompt.dispatchEvent(enter())).toBe(false);
  expect(onSend).toHaveBeenCalledOnce();
  expect(() => controller!.update({ fanTilt: 200 })).toThrow();
  expect(() => controller!.update({ paperPalette: 'orange' })).toThrow();
});

test('routes every card by intent even when its label is customized', () => {
  const host = document.createElement('div');
  const onSend = vi.fn();
  controller = mount(host, { actionLabels: ['One', 'Two', 'Three', 'Four', 'Five'] }, undefined, { onSend });
  const prompt = host.querySelector<HTMLTextAreaElement>('[data-ac-prompt]')!;
  const intents = ['create-image', 'create-doc', 'create-slides', 'analyze-doc', 'create-chart'];
  const cards = host.querySelectorAll<HTMLButtonElement>('[data-ac-action]');
  cards.forEach((card, index) => {
    card.click();
    expect(host.querySelector<HTMLElement>('[data-ac-record]')!.hidden).toBe(true);
    expect(host.querySelector('[data-ac-chip-label]')!.textContent).toBe(card.getAttribute('aria-label'));
    prompt.value = 'Example input';
    prompt.dispatchEvent(new Event('input'));
    host.querySelector<HTMLButtonElement>('[data-ac-send]')!.click();
    expect(onSend).toHaveBeenLastCalledWith(expect.objectContaining({ intent: intents[index], action: card.dataset.acAction }));
  });
});
