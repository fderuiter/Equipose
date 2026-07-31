import { ZipWriter } from './zip.util';

describe('ZipWriter', () => {
  it('should generate a valid ZIP structure with correct PKWare headers, data offsets, and CRC32 checksums', async () => {
    const zip = new ZipWriter();
    const encoder = new TextEncoder();
    
    const file1Data = encoder.encode('hello'); // crc32 of 'hello' is 0x3610a686
    const file2Data = encoder.encode('world!'); // crc32 of 'world!' is 0x6e917d87 (or we can assert whatever it computes matches our calculated crc32)

    zip.addFile('hello.txt', file1Data);
    zip.addFile('world.txt', file2Data);

    const zipBuffer = await zip.generateAsync();
    expect(zipBuffer).toBeInstanceOf(Uint8Array);
    expect(zipBuffer.length).toBeGreaterThan(0);

    const view = new DataView(zipBuffer.buffer, zipBuffer.byteOffset, zipBuffer.byteLength);

    // Let's traverse the zip structure manually and assert PKWare headers
    let offset = 0;

    // --- File 1 Local Header ---
    expect(view.getUint32(offset, true)).toBe(0x04034b50); // Local Header Signature
    const f1VersionNeeded = view.getUint16(offset + 4, true);
    const f1CompressionMethod = view.getUint16(offset + 8, true);
    const f1Crc = view.getUint32(offset + 14, true);
    const f1CompressedSize = view.getUint32(offset + 18, true);
    const f1UncompressedSize = view.getUint32(offset + 22, true);
    const f1NameLength = view.getUint16(offset + 26, true);
    const f1ExtraFieldLength = view.getUint16(offset + 28, true);

    expect(f1UncompressedSize).toBe(file1Data.length);
    expect(f1NameLength).toBe('hello.txt'.length);
    expect(f1ExtraFieldLength).toBe(0);

    // Verify filename
    const f1NameBytes = zipBuffer.slice(offset + 30, offset + 30 + f1NameLength);
    expect(new TextDecoder().decode(f1NameBytes)).toBe('hello.txt');

    // Expected CRC32 for 'hello' is 0x3610a686
    expect(f1Crc).toBe(0x3610a686);

    const f1HeaderOffset = offset;
    offset += 30 + f1NameLength + f1CompressedSize;

    // --- File 2 Local Header ---
    expect(view.getUint32(offset, true)).toBe(0x04034b50); // Local Header Signature
    const f2VersionNeeded = view.getUint16(offset + 4, true);
    const f2CompressionMethod = view.getUint16(offset + 8, true);
    const f2Crc = view.getUint32(offset + 14, true);
    const f2CompressedSize = view.getUint32(offset + 18, true);
    const f2UncompressedSize = view.getUint32(offset + 22, true);
    const f2NameLength = view.getUint16(offset + 26, true);
    const f2ExtraFieldLength = view.getUint16(offset + 28, true);

    expect(f2UncompressedSize).toBe(file2Data.length);
    expect(f2NameLength).toBe('world.txt'.length);
    expect(f2ExtraFieldLength).toBe(0);

    // Verify filename
    const f2NameBytes = zipBuffer.slice(offset + 30, offset + 30 + f2NameLength);
    expect(new TextDecoder().decode(f2NameBytes)).toBe('world.txt');

    const f2HeaderOffset = offset;
    offset += 30 + f2NameLength + f2CompressedSize;

    // --- Central Directory 1 ---
    const cd1StartOffset = offset;
    expect(view.getUint32(offset, true)).toBe(0x02014b50); // Central Directory File Header Signature
    expect(view.getUint32(offset + 16, true)).toBe(f1Crc);
    expect(view.getUint32(offset + 20, true)).toBe(f1CompressedSize);
    expect(view.getUint32(offset + 24, true)).toBe(f1UncompressedSize);
    expect(view.getUint16(offset + 28, true)).toBe(f1NameLength);
    expect(view.getUint32(offset + 42, true)).toBe(f1HeaderOffset); // Relative offset of local header

    offset += 46 + f1NameLength;

    // --- Central Directory 2 ---
    const cd2StartOffset = offset;
    expect(view.getUint32(offset, true)).toBe(0x02014b50); // Central Directory File Header Signature
    expect(view.getUint32(offset + 16, true)).toBe(f2Crc);
    expect(view.getUint32(offset + 20, true)).toBe(f2CompressedSize);
    expect(view.getUint32(offset + 24, true)).toBe(f2UncompressedSize);
    expect(view.getUint16(offset + 28, true)).toBe(f2NameLength);
    expect(view.getUint32(offset + 42, true)).toBe(f2HeaderOffset); // Relative offset of local header

    offset += 46 + f2NameLength;

    // --- End of Central Directory (EOCD) ---
    expect(view.getUint32(offset, true)).toBe(0x06054b50); // End of Central Directory Signature
    expect(view.getUint16(offset + 8, true)).toBe(2); // Total entries in this disk
    expect(view.getUint16(offset + 10, true)).toBe(2); // Total entries in the central directory
    expect(view.getUint32(offset + 12, true)).toBe(offset - cd1StartOffset); // Size of the central directory
    expect(view.getUint32(offset + 16, true)).toBe(cd1StartOffset); // Offset of start of central directory
  });
});
