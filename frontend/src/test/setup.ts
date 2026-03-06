import "@testing-library/jest-dom/vitest";

// Mock HTMLCanvasElement.getContext with a stub 2D context for jsdom
const noop = () => {};
const mockContext = {
  setTransform: noop,
  clearRect: noop,
  fillRect: noop,
  beginPath: noop,
  closePath: noop,
  moveTo: noop,
  lineTo: noop,
  arc: noop,
  fill: noop,
  stroke: noop,
  scale: noop,
  translate: noop,
  save: noop,
  restore: noop,
  drawImage: noop,
  createLinearGradient: () => ({ addColorStop: noop }),
  createRadialGradient: () => ({ addColorStop: noop }),
  measureText: () => ({ width: 0 }),
  fillText: noop,
  strokeText: noop,
  getImageData: () => ({ data: new Uint8ClampedArray(0) }),
  putImageData: noop,
  canvas: { width: 0, height: 0 },
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
  globalAlpha: 1,
  globalCompositeOperation: "source-over",
  font: "",
  textAlign: "",
  textBaseline: "",
  shadowColor: "",
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  lineCap: "",
  lineJoin: "",
};
HTMLCanvasElement.prototype.getContext = (() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock IntersectionObserver for jsdom
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
