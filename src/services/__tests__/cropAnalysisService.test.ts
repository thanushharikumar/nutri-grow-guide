import { describe, beforeEach, it, expect, vi } from 'vitest';
import { analyzeCropImage } from '../cropAnalysisService';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => ({
            then: (callback: any) => callback({ error: null })
          })
        })
      })
    })
  }
}));

// Mock canvas operations
vi.mock('happy-dom', () => ({
  Window: class {
    document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 400,
            height: 300,
            getContext: () => null  // Will be mocked per test
          };
        }
        return document.createElement(tag);
      }
    };
  }
}));

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
  const blob = new Blob([''], { type });
  Object.defineProperty(blob, 'size', { value: size });
  return Object.assign(blob, { name }) as File;
}

describe('analyzeCropImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should reject files over 5MB', async () => {
    const largeFile = createMockFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024);
    await expect(analyzeCropImage(largeFile))
      .rejects
      .toThrow('too large');
  });
  
  it('should reject non-image files', async () => {
    const pdfFile = createMockFile('doc.pdf', 'application/pdf');
    await expect(analyzeCropImage(pdfFile))
      .rejects
      .toThrow('Invalid file type');
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

    // Create custom mock canvas context
    const mockCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => new ImageData(mockData, 400, 300)),
      canvas: document.createElement('canvas')
    };
    mockCtx.canvas.width = 400;
    mockCtx.canvas.height = 300;

    // Mock getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => mockCtx as unknown as CanvasRenderingContext2D);

    const file = createMockFile('good_crop.jpg');
    const result = await analyzeCropImage(file);
    
    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(mockCtx.getImageData).toHaveBeenCalled();
    expect(result.cropHealth).toBe('good');
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.8);
  });
  
  it('should reject images with too much sky', async () => {
    const mockData = createMockImageData({
      greenPercentage: 30,
      strongGreenPercentage: 15,
      bluePercentage: 45  // Too much sky
    });

    // Create custom mock canvas context
    const mockCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => new ImageData(mockData, 400, 300)),
      canvas: document.createElement('canvas')
    };
    mockCtx.canvas.width = 400;
    mockCtx.canvas.height = 300;

    // Mock getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => mockCtx as unknown as CanvasRenderingContext2D);
    
    await expect(analyzeCropImage(createMockFile('sky_heavy.jpg')))
      .rejects
      .toThrow('too much sky/water content');
  });
  
  it('should reject images with insufficient green content', async () => {
    const mockData = createMockImageData({
      greenPercentage: 15,  // Too low
      strongGreenPercentage: 5
    });

    // Create custom mock canvas context
    const mockCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => new ImageData(mockData, 400, 300)),
      canvas: document.createElement('canvas')
    };
    mockCtx.canvas.width = 400;
    mockCtx.canvas.height = 300;

    // Mock getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => mockCtx as unknown as CanvasRenderingContext2D);
    
    await expect(analyzeCropImage(createMockFile('low_green.jpg')))
      .rejects
      .toThrow('insufficient green');
  });
  
  it('should detect nitrogen deficiency', async () => {
    const mockData = createMockImageData({
      greenPercentage: 30,
      strongGreenPercentage: 15,
      bluePercentage: 5
    });
    
    // Modify data to add yellowish tint
    for (let i = 0; i < mockData.length; i += 4) {
      if (mockData[i + 1] > 100) {  // If it's a green pixel
        mockData[i] = 180;     // Increase red
        mockData[i + 1] = 90;  // Decrease green
      }
    }
    
    // Create custom mock canvas context
    const mockCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => new ImageData(mockData, 400, 300)),
      canvas: document.createElement('canvas')
    };
    mockCtx.canvas.width = 400;
    mockCtx.canvas.height = 300;

    // Mock getContext
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => mockCtx as unknown as CanvasRenderingContext2D);
    
    const result = await analyzeCropImage(createMockFile('nitrogen_deficient.jpg'));
    
    expect(result.deficiencies).toContainEqual(expect.objectContaining({
      nutrient: 'nitrogen',
      symptoms: expect.arrayContaining(['Yellowing of lower leaves'])
    }));
  });
});