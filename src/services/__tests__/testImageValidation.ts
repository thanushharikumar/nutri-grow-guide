import { analyzeCropImage } from '../cropAnalysisService';

// Mock canvas and context for testing
const mockCanvas = {
  width: 400,
  height: 300,
  getContext: () => ({
    drawImage: jest.fn(),
    getImageData: () => ({
      data: new Uint8ClampedArray([
        // Mock pixel data will go here
      ])
    })
  })
};

// Mock document.createElement
global.document.createElement = jest.fn(() => mockCanvas);

// Mock Image class
class MockImage {
  onload: () => void = () => {};
  src: string = '';
  width: number = 400;
  height: number = 300;
  
  constructor() {
    setTimeout(() => this.onload(), 0);
  }
}
global.Image = MockImage as any;

// Helper to create mock image data
function createMockImageData(params: {
  greenPercentage?: number;
  strongGreenPercentage?: number;
  bluePercentage?: number;
  uniformity?: number;
  textureVariation?: number;
}) {
  const pixelCount = 400 * 300;
  const data = new Uint8ClampedArray(pixelCount * 4);
  
  for (let i = 0; i < pixelCount * 4; i += 4) {
    // Default to brownish color
    data[i] = 139;     // R
    data[i + 1] = 69;  // G
    data[i + 2] = 19;  // B
    data[i + 3] = 255; // A
  }
  
  // Add green pixels based on percentage
  if (params.greenPercentage) {
    const greenPixels = Math.floor(pixelCount * (params.greenPercentage / 100));
    for (let i = 0; i < greenPixels * 4; i += 4) {
      data[i] = 60;      // R
      data[i + 1] = 150; // G
      data[i + 2] = 60;  // B
    }
  }
  
  // Add strong green pixels
  if (params.strongGreenPercentage) {
    const strongGreenPixels = Math.floor(pixelCount * (params.strongGreenPercentage / 100));
    for (let i = 0; i < strongGreenPixels * 4; i += 4) {
      data[i] = 40;      // R
      data[i + 1] = 180; // G
      data[i + 2] = 40;  // B
    }
  }
  
  // Add blue pixels (sky)
  if (params.bluePercentage) {
    const bluePixels = Math.floor(pixelCount * (params.bluePercentage / 100));
    for (let i = pixelCount * 4 - bluePixels * 4; i < pixelCount * 4; i += 4) {
      data[i] = 135;     // R
      data[i + 1] = 206; // G
      data[i + 2] = 235; // B
    }
  }
  
  return data;
}

// Mock file for testing
function createMockFile(name: string, type: string = 'image/jpeg', size: number = 1024 * 1024) {
  return new File([''], name, { type });
}

describe('analyzeCropImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should reject files over 5MB', async () => {
    const largeFile = createMockFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024);
    await expect(analyzeCropImage(largeFile)).rejects.toThrow('too large');
  });
  
  it('should reject non-image files', async () => {
    const pdfFile = createMockFile('doc.pdf', 'application/pdf');
    await expect(analyzeCropImage(pdfFile)).rejects.toThrow('Invalid file type');
  });
  
  it('should accept valid crop images', async () => {
    // Mock a good crop image (45% green, 20% strong green)
    const mockData = createMockImageData({
      greenPercentage: 45,
      strongGreenPercentage: 20,
      bluePercentage: 5,
      uniformity: 20,
      textureVariation: 8
    });
    
    mockCanvas.getContext = () => ({
      drawImage: jest.fn(),
      getImageData: () => ({ data: mockData })
    });
    
    const result = await analyzeCropImage(createMockFile('good_crop.jpg'));
    expect(result.cropHealth).toBe('good');
  });
  
  it('should reject images with too much sky', async () => {
    const mockData = createMockImageData({
      greenPercentage: 30,
      strongGreenPercentage: 15,
      bluePercentage: 45  // Too much sky
    });
    
    mockCanvas.getContext = () => ({
      drawImage: jest.fn(),
      getImageData: () => ({ data: mockData })
    });
    
    await expect(analyzeCropImage(createMockFile('sky_heavy.jpg')))
      .rejects.toThrow('too much sky/water content');
  });
  
  it('should reject images with insufficient green content', async () => {
    const mockData = createMockImageData({
      greenPercentage: 15,  // Too low
      strongGreenPercentage: 5
    });
    
    mockCanvas.getContext = () => ({
      drawImage: jest.fn(),
      getImageData: () => ({ data: mockData })
    });
    
    await expect(analyzeCropImage(createMockFile('low_green.jpg')))
      .rejects.toThrow('insufficient green');
  });
  
  // Add more test cases for other validation criteria
});