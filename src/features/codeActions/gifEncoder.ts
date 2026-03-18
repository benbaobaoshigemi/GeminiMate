const GIF_HEADER = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] as const;
const GIF_GLOBAL_COLOR_TABLE_SIZE = 256;
const GIF_GLOBAL_COLOR_TABLE_PACKED = 0xf7;
const GIF_IMAGE_SEPARATOR = 0x2c;
const GIF_EXTENSION_INTRODUCER = 0x21;
const GIF_GRAPHIC_CONTROL_LABEL = 0xf9;
const GIF_APPLICATION_EXTENSION_LABEL = 0xff;
const GIF_TRAILER = 0x3b;
const GIF_LZW_MIN_CODE_SIZE = 8;

export type GifAnimationFrame =
  | {
      delayMs: number;
      rgba: Uint8ClampedArray;
    }
  | {
      delayMs: number;
      indexed: Uint8Array;
    };

export type GifAnimationInput = {
  width: number;
  height: number;
  frames: GifAnimationFrame[];
  loopCount?: number;
};

const writeShort = (bytes: number[], value: number): void => {
  bytes.push(value & 0xff, (value >> 8) & 0xff);
};

const buildGif332Palette = (): Uint8Array => {
  const palette = new Uint8Array(GIF_GLOBAL_COLOR_TABLE_SIZE * 3);

  for (let index = 0; index < GIF_GLOBAL_COLOR_TABLE_SIZE; index += 1) {
    const red = Math.round((((index >> 5) & 0x07) / 7) * 255);
    const green = Math.round((((index >> 2) & 0x07) / 7) * 255);
    const blue = Math.round(((index & 0x03) / 3) * 255);
    const offset = index * 3;
    palette[offset] = red;
    palette[offset + 1] = green;
    palette[offset + 2] = blue;
  }

  return palette;
};

const GIF_332_PALETTE = buildGif332Palette();

export const quantizeRgbaToGif332Indices = (rgba: Uint8ClampedArray): Uint8Array => {
  const indices = new Uint8Array(rgba.length / 4);

  for (let offset = 0; offset < rgba.length; offset += 4) {
    const red = rgba[offset] & 0xe0;
    const green = (rgba[offset + 1] & 0xe0) >> 3;
    const blue = rgba[offset + 2] >> 6;
    indices[offset / 4] = red | green | blue;
  }

  return indices;
};

const createBitWriter = () => {
  const bytes: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;

  return {
    pushCode(code: number, size: number): void {
      bitBuffer |= code << bitCount;
      bitCount += size;

      while (bitCount >= 8) {
        bytes.push(bitBuffer & 0xff);
        bitBuffer >>= 8;
        bitCount -= 8;
      }
    },
    finish(): Uint8Array {
      if (bitCount > 0) {
        bytes.push(bitBuffer & 0xff);
      }
      return Uint8Array.from(bytes);
    },
  };
};

const encodeLzwImageData = (indexedPixels: Uint8Array): Uint8Array => {
  const clearCode = 1 << GIF_LZW_MIN_CODE_SIZE;
  const endCode = clearCode + 1;
  const writer = createBitWriter();
  let codeSize = GIF_LZW_MIN_CODE_SIZE + 1;
  let nextCode = endCode + 1;
  let codeSizeUpperBound = 1 << codeSize;
  let dictionary = new Map<string, number>();

  const resetDictionary = (): void => {
    dictionary = new Map<string, number>();
    for (let index = 0; index < clearCode; index += 1) {
      dictionary.set(String(index), index);
    }
    codeSize = GIF_LZW_MIN_CODE_SIZE + 1;
    nextCode = endCode + 1;
    codeSizeUpperBound = 1 << codeSize;
  };

  resetDictionary();
  writer.pushCode(clearCode, codeSize);

  if (indexedPixels.length === 0) {
    writer.pushCode(endCode, codeSize);
    return writer.finish();
  }

  let sequence = String(indexedPixels[0]);

  for (let offset = 1; offset < indexedPixels.length; offset += 1) {
    const symbol = indexedPixels[offset];
    const candidate = `${sequence},${symbol}`;

    if (dictionary.has(candidate)) {
      sequence = candidate;
      continue;
    }

    writer.pushCode(dictionary.get(sequence) ?? 0, codeSize);

    if (nextCode < 4096) {
      dictionary.set(candidate, nextCode);
      nextCode += 1;

      if (nextCode >= codeSizeUpperBound && codeSize < 12) {
        codeSize += 1;
        codeSizeUpperBound = 1 << codeSize;
      }
    } else {
      writer.pushCode(clearCode, codeSize);
      resetDictionary();
    }

    sequence = String(symbol);
  }

  writer.pushCode(dictionary.get(sequence) ?? 0, codeSize);
  writer.pushCode(endCode, codeSize);
  return writer.finish();
};

const writeSubBlocks = (bytes: number[], payload: Uint8Array): void => {
  for (let offset = 0; offset < payload.length; offset += 255) {
    const chunk = payload.subarray(offset, offset + 255);
    bytes.push(chunk.length, ...chunk);
  }
  bytes.push(0x00);
};

const writeGraphicControlExtension = (bytes: number[], delayMs: number): void => {
  const delayInCentiseconds = Math.max(1, Math.round(delayMs / 10));
  bytes.push(GIF_EXTENSION_INTRODUCER, GIF_GRAPHIC_CONTROL_LABEL, 0x04, 0x00);
  writeShort(bytes, delayInCentiseconds);
  bytes.push(0x00, 0x00);
};

const writeImageDescriptor = (bytes: number[], width: number, height: number): void => {
  bytes.push(GIF_IMAGE_SEPARATOR);
  writeShort(bytes, 0);
  writeShort(bytes, 0);
  writeShort(bytes, width);
  writeShort(bytes, height);
  bytes.push(0x00);
};

const writeLoopingExtension = (bytes: number[], loopCount: number): void => {
  bytes.push(
    GIF_EXTENSION_INTRODUCER,
    GIF_APPLICATION_EXTENSION_LABEL,
    0x0b,
    0x4e,
    0x45,
    0x54,
    0x53,
    0x43,
    0x41,
    0x50,
    0x45,
    0x32,
    0x2e,
    0x30,
    0x03,
    0x01,
  );
  writeShort(bytes, Math.max(0, loopCount));
  bytes.push(0x00);
};

const resolveIndexedPixels = (frame: GifAnimationFrame, pixelCount: number): Uint8Array => {
  const indexedPixels =
    'indexed' in frame ? frame.indexed : quantizeRgbaToGif332Indices(frame.rgba);

  if (indexedPixels.length !== pixelCount) {
    throw new Error('GIF frame pixel data does not match width and height');
  }

  return indexedPixels;
};

export const encodeGifAnimation = (input: GifAnimationInput): Uint8Array => {
  const width = Math.max(1, Math.round(input.width));
  const height = Math.max(1, Math.round(input.height));
  const pixelCount = width * height;

  if (input.frames.length === 0) {
    throw new Error('GIF animation requires at least one frame');
  }

  const bytes: number[] = [...GIF_HEADER];
  writeShort(bytes, width);
  writeShort(bytes, height);
  bytes.push(GIF_GLOBAL_COLOR_TABLE_PACKED, 0x00, 0x00, ...GIF_332_PALETTE);
  writeLoopingExtension(bytes, input.loopCount ?? 0);

  input.frames.forEach((frame) => {
    const indexedPixels = resolveIndexedPixels(frame, pixelCount);
    const compressed = encodeLzwImageData(indexedPixels);

    writeGraphicControlExtension(bytes, frame.delayMs);
    writeImageDescriptor(bytes, width, height);
    bytes.push(GIF_LZW_MIN_CODE_SIZE);
    writeSubBlocks(bytes, compressed);
  });

  bytes.push(GIF_TRAILER);
  return Uint8Array.from(bytes);
};
