// Mock canvas context for tests
export class MockCanvasContext {
  private mockData: Uint8ClampedArray;
  private _canvas: HTMLCanvasElement;
  private _width: number;
  private _height: number;

  constructor(width = 400, height = 300) {
    this._width = width;
    this._height = height;
    this.mockData = new Uint8ClampedArray(width * height * 4);
    
    // Initialize with black transparent pixels
    for (let i = 0; i < this.mockData.length; i += 4) {
      this.mockData[i] = 0;     // R
      this.mockData[i + 1] = 0; // G
      this.mockData[i + 2] = 0; // B
      this.mockData[i + 3] = 0; // A
    }
  }

  // Required properties to mock canvas
  get canvas(): any {
    return {
      width: this._width,
      height: this._height,
    };
  }

  // Required methods for image analysis
  drawImage(): void {
    // No-op in test environment
  }

  getImageData(): ImageData {
    // Create a new ImageData object with the mock data
    return new ImageData(
      new Uint8ClampedArray(this.mockData),
      this._width,
      this._height,
      { colorSpace: 'srgb' }
    );
  }

  setMockData(data: Uint8ClampedArray): void {
    if (data.length === this.mockData.length) {
      this.mockData = data;
    } else {
      throw new Error('Mock data length must match canvas dimensions');
    }
  }
}