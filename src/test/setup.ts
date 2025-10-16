import { afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Window } from 'happy-dom'

// Establish browser environment
const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.navigator = window.navigator;

// Mock fetch globally
globalThis.fetch = vi.fn();

// Mock FileReader
class MockFileReader {
  onload: () => void = () => {};
  result: string = '';
  readAsDataURL(blob: Blob) {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,mockImageData';
      this.onload();
    }, 0);
  }
}

// Mock Canvas API
beforeAll(() => {
  // Mock FileReader
  (window as any).FileReader = MockFileReader;

  // Mock canvas functionality
  (window as any).HTMLCanvasElement.prototype.getContext = function() {
    return {
      canvas: this,
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(400 * 300 * 4),
        width: 400,
        height: 300,
        colorSpace: 'srgb'
      }))
    };
  };
});

// runs a cleanup after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});