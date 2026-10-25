/**
 * Face Recognition Feature Extraction & Matching Utility
 *
 * Implements real-time spatial luminance, gradient projection, and facial ratio
 * feature extraction on HTML5 Canvas to produce 128-dimensional normalized embeddings.
 * Cosine similarity is computed for matching candidate faces against enrolled records.
 */

export interface FaceExtractionResult {
  dataUrl: string; // Base64 JPEG thumbnail of the aligned face
  descriptor: number[]; // 128-dimensional normalized float embedding
  brightness: number; // 0 - 255 indicator of frame lighting
  qualityOk: boolean; // True if lighting and contrast are sufficient
}

/**
 * Calculates cosine similarity between two 128-d embedding vectors.
 * Since vectors are L2-normalized, Cosine Similarity equals the dot product.
 */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, (similarity + 1) / 2)); // Map [-1, 1] to [0, 1]
}

/**
 * Extracts a 128-dimensional facial feature descriptor and base64 picture from a video element.
 */
export function extractFaceDescriptorFromVideo(
  video: HTMLVideoElement,
  cropRatio = 0.65
): FaceExtractionResult | null {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Center crop focused on face oval
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cropW = vw * cropRatio;
  const cropH = vh * cropRatio;
  const cropX = (vw - cropW) / 2;
  const cropY = (vh - cropH) / 2;

  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, size, size);

  return extractDescriptorFromCanvas(canvas);
}

/**
 * Extracts a 128-dimensional facial feature descriptor from an image or canvas element.
 */
export function extractFaceDescriptorFromImage(
  img: HTMLImageElement
): FaceExtractionResult | null {
  if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) return null;

  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, size, size);
  return extractDescriptorFromCanvas(canvas);
}

/**
 * Extracts 128-dimensional normalized descriptor from a 256x256 canvas
 */
function extractDescriptorFromCanvas(canvas: HTMLCanvasElement): FaceExtractionResult {
  const ctx = canvas.getContext('2d')!;
  const size = canvas.width;
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Convert to grayscale 64x64 grid
  const gridSize = 64;
  const grayGrid: number[][] = Array.from({ length: gridSize }, () => new Array(gridSize).fill(0));
  const step = size / gridSize;

  let totalLuminance = 0;
  let pixelCount = 0;

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const srcX = Math.floor(gx * step);
      const srcY = Math.floor(gy * step);
      const idx = (srcY * size + srcX) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Perceived luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      grayGrid[gy][gx] = lum;
      totalLuminance += lum;
      pixelCount++;
    }
  }

  const avgBrightness = totalLuminance / pixelCount;
  const descriptor: number[] = [];

  // Part 1: 8x8 block average luminance (64 floats)
  const blockSize = gridSize / 8; // 8x8 blocks
  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      let blockSum = 0;
      for (let y = by * blockSize; y < (by + 1) * blockSize; y++) {
        for (let x = bx * blockSize; x < (bx + 1) * blockSize; x++) {
          blockSum += grayGrid[y][x];
        }
      }
      descriptor.push(blockSum / (blockSize * blockSize * 255));
    }
  }

  // Part 2: Horizontal gradient projections across 4 vertical bands (16 floats)
  for (let band = 0; band < 4; band++) {
    const startY = band * 16;
    for (let col = 0; col < 4; col++) {
      let hGradSum = 0;
      for (let y = startY; y < startY + 16; y++) {
        for (let x = col * 16; x < (col + 1) * 16 - 1; x++) {
          hGradSum += Math.abs(grayGrid[y][x + 1] - grayGrid[y][x]);
        }
      }
      descriptor.push(hGradSum / (16 * 15 * 255));
    }
  }

  // Part 3: Vertical gradient projections across 4 horizontal bands (16 floats)
  for (let band = 0; band < 4; band++) {
    const startX = band * 16;
    for (let row = 0; row < 4; row++) {
      let vGradSum = 0;
      for (let x = startX; x < startX + 16; x++) {
        for (let y = row * 16; y < (row + 1) * 16 - 1; y++) {
          vGradSum += Math.abs(grayGrid[y + 1][x] - grayGrid[y][x]);
        }
      }
      descriptor.push(vGradSum / (16 * 15 * 255));
    }
  }

  // Part 4: Key facial feature regional luminance ratios (16 floats)
  // Eye region (rows 16-28), Nose bridge (rows 28-40), Mouth region (rows 40-52)
  const leftEyeLum = getRegionAverage(grayGrid, 16, 28, 12, 28);
  const rightEyeLum = getRegionAverage(grayGrid, 16, 28, 36, 52);
  const noseBridgeLum = getRegionAverage(grayGrid, 24, 38, 24, 40);
  const mouthLum = getRegionAverage(grayGrid, 42, 54, 20, 44);
  const foreheadLum = getRegionAverage(grayGrid, 6, 16, 18, 46);
  const chinLum = getRegionAverage(grayGrid, 54, 62, 22, 42);

  descriptor.push(leftEyeLum / 255);
  descriptor.push(rightEyeLum / 255);
  descriptor.push(noseBridgeLum / 255);
  descriptor.push(mouthLum / 255);
  descriptor.push(foreheadLum / 255);
  descriptor.push(chinLum / 255);
  descriptor.push((leftEyeLum - rightEyeLum) / 255);
  descriptor.push((noseBridgeLum - mouthLum) / 255);
  descriptor.push((foreheadLum - chinLum) / 255);
  descriptor.push(getRegionAverage(grayGrid, 16, 32, 0, 16) / 255); // Left cheek
  descriptor.push(getRegionAverage(grayGrid, 16, 32, 48, 64) / 255); // Right cheek
  descriptor.push(getRegionAverage(grayGrid, 32, 48, 8, 24) / 255);
  descriptor.push(getRegionAverage(grayGrid, 32, 48, 40, 56) / 255);
  descriptor.push(getRegionAverage(grayGrid, 8, 20, 8, 20) / 255);
  descriptor.push(getRegionAverage(grayGrid, 8, 20, 44, 56) / 255);
  descriptor.push(getRegionAverage(grayGrid, 44, 60, 12, 52) / 255);

  // Part 5: Local contrast & texture metrics (16 floats) => Total 128
  for (let i = 0; i < 16; i++) {
    const rx = (i % 4) * 16;
    const ry = Math.floor(i / 4) * 16;
    const stdDev = getRegionStdDev(grayGrid, ry, ry + 16, rx, rx + 16);
    descriptor.push(stdDev / 128);
  }

  // L2-Normalize the 128-dimensional vector
  let sumSq = 0;
  for (let i = 0; i < descriptor.length; i++) {
    sumSq += descriptor[i] * descriptor[i];
  }
  const norm = Math.sqrt(sumSq) || 1;
  const normalizedDescriptor = descriptor.map((v) => Number((v / norm).toFixed(6)));

  const qualityOk = avgBrightness > 25 && avgBrightness < 240;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  return {
    dataUrl,
    descriptor: normalizedDescriptor,
    brightness: Math.round(avgBrightness),
    qualityOk,
  };
}

function getRegionAverage(
  grid: number[][],
  y1: number,
  y2: number,
  x1: number,
  x2: number
): number {
  let sum = 0;
  let count = 0;
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      sum += grid[y][x];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

function getRegionStdDev(
  grid: number[][],
  y1: number,
  y2: number,
  x1: number,
  x2: number
): number {
  const avg = getRegionAverage(grid, y1, y2, x1, x2);
  let varianceSum = 0;
  let count = 0;
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const diff = grid[y][x] - avg;
      varianceSum += diff * diff;
      count++;
    }
  }
  return count > 0 ? Math.sqrt(varianceSum / count) : 0;
}
