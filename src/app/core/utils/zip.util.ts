export class ZipWriter {
  private files: { name: string; data: Uint8Array; crc32: number; headerOffset: number; nameBuf: Uint8Array }[] = [];

  public addFile(name: string, uint8array: Uint8Array): void {
    this.files.push({
      name,
      data: uint8array,
      crc32: 0,
      headerOffset: 0,
      nameBuf: new Uint8Array(),
    });
  }

  public generate(): Uint8Array {
    let offset = 0;
    let totalSize = 0;

    for (const f of this.files) {
      const nameBuf = new TextEncoder().encode(f.name);
      f.nameBuf = nameBuf;
      // Local header: 30 bytes + name length + extra field (0)
      totalSize += 30 + nameBuf.length + f.data.length;
      // Central header: 46 bytes + name length + extra field (0) + file comment (0)
      totalSize += 46 + nameBuf.length;
    }
    // End of central dir: 22 bytes
    totalSize += 22;

    const out = new Uint8Array(totalSize);
    const view = new DataView(out.buffer);

    for (const f of this.files) {
      const headerStart = offset;
      
      view.setUint32(offset, 0x04034b50, true); offset += 4;
      view.setUint16(offset, 10, true); offset += 2; // version needed to extract (1.0 = 10)
      view.setUint16(offset, 0, true); offset += 2; // general purpose bit flag
      view.setUint16(offset, 0, true); offset += 2; // compression method (0 = store)
      view.setUint16(offset, 0, true); offset += 2; // last mod file time
      view.setUint16(offset, 0, true); offset += 2; // last mod file date
      
      const crc = this.crc32(f.data);
      f.crc32 = crc;
      f.headerOffset = headerStart;

      view.setUint32(offset, crc, true); offset += 4;
      view.setUint32(offset, f.data.length, true); offset += 4;
      view.setUint32(offset, f.data.length, true); offset += 4;
      view.setUint16(offset, f.nameBuf.length, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      
      out.set(f.nameBuf, offset); offset += f.nameBuf.length;
      out.set(f.data, offset); offset += f.data.length;
    }
    
    const centralDirStart = offset;
    for (const f of this.files) {
      view.setUint32(offset, 0x02014b50, true); offset += 4;
      view.setUint16(offset, 10, true); offset += 2;
      view.setUint16(offset, 10, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      
      view.setUint32(offset, f.crc32, true); offset += 4;
      view.setUint32(offset, f.data.length, true); offset += 4;
      view.setUint32(offset, f.data.length, true); offset += 4;
      view.setUint16(offset, f.nameBuf.length, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint16(offset, 0, true); offset += 2;
      view.setUint32(offset, 0, true); offset += 4;
      view.setUint32(offset, f.headerOffset, true); offset += 4;
      
      out.set(f.nameBuf, offset); offset += f.nameBuf.length;
    }
    
    const centralDirSize = offset - centralDirStart;
    view.setUint32(offset, 0x06054b50, true); offset += 4;
    view.setUint16(offset, 0, true); offset += 2;
    view.setUint16(offset, 0, true); offset += 2;
    view.setUint16(offset, this.files.length, true); offset += 2;
    view.setUint16(offset, this.files.length, true); offset += 2;
    view.setUint32(offset, centralDirSize, true); offset += 4;
    view.setUint32(offset, centralDirStart, true); offset += 4;
    view.setUint16(offset, 0, true); offset += 2;
    
    return out;
  }

  private crc32(data: Uint8Array): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
}
