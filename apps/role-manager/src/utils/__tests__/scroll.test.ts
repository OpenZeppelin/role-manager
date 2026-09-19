import { afterEach, describe, expect, it, vi } from 'vitest';

import { scrollMainToTop } from '../scroll';

describe('scrollMainToTop', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('scrolls the app page viewport to the top without animation', () => {
    const main = document.createElement('main');
    const scrollTo = vi.fn();
    main.scrollTo = scrollTo;
    document.body.append(main);

    scrollMainToTop();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('does nothing when the app page viewport is absent', () => {
    expect(() => scrollMainToTop()).not.toThrow();
  });
});
