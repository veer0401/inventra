import type { ReceiptDocument, PrintFormattingOptions } from "../models/receipt";

/**
 * ESC/POS Command Constants
 */
export const ESC = 0x1b;
export const FS = 0x1c;
export const GS = 0x1d;
export const DLE = 0x10;
export const EOT = 0x04;

export const COMMANDS = {
  INIT: new Uint8Array([ESC, 0x40]), // ESC @
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]), // ESC a 2
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]), // ESC E 0
  UNDERLINE_ON: new Uint8Array([ESC, 0x2d, 0x01]), // ESC - 1
  UNDERLINE_OFF: new Uint8Array([ESC, 0x2d, 0x00]), // ESC - 0
  DOUBLE_SIZE: new Uint8Array([GS, 0x21, 0x11]), // GS ! 0x11 (2x width + 2x height)
  DOUBLE_HEIGHT: new Uint8Array([GS, 0x21, 0x01]), // GS ! 0x01
  DOUBLE_WIDTH: new Uint8Array([GS, 0x21, 0x10]), // GS ! 0x10
  NORMAL_SIZE: new Uint8Array([GS, 0x21, 0x00]), // GS ! 0x00
  CUT_FULL: new Uint8Array([GS, 0x56, 0x00]), // GS V 0
  CUT_PARTIAL: new Uint8Array([GS, 0x56, 0x01]), // GS V 1
  FEED_AND_CUT: new Uint8Array([GS, 0x56, 0x42, 0x03]), // GS V 66 3 (feed 3 lines & cut)
  DRAWER_KICK: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]), // ESC p 0 25 250
  LINE_FEED: new Uint8Array([0x0a]),
};

export class EscPosBuffer {
  private chunks: Uint8Array[] = [];
  private encoder = new TextEncoder();

  public append(data: Uint8Array): this {
    this.chunks.push(data);
    return this;
  }

  public text(str: string): this {
    this.chunks.push(this.encoder.encode(str));
    return this;
  }

  public line(str = ""): this {
    if (str.length > 0) {
      this.chunks.push(this.encoder.encode(str));
    }
    this.chunks.push(COMMANDS.LINE_FEED);
    return this;
  }

  public feed(lines = 1): this {
    for (let i = 0; i < lines; i++) {
      this.chunks.push(COMMANDS.LINE_FEED);
    }
    return this;
  }

  public toUint8Array(): Uint8Array {
    const totalLength = this.chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}

export class EscPosRenderer {
  public static render(doc: ReceiptDocument, options: PrintFormattingOptions = { paperWidth: "80mm" }): Uint8Array {
    const buf = new EscPosBuffer();
    const width = options.paperWidth === "58mm" ? 32 : 48;

    // 1. Initialize
    buf.append(COMMANDS.INIT);

    // Optional: Open Cash Drawer
    if (options.openDrawer) {
      buf.append(COMMANDS.DRAWER_KICK);
    }

    // 2. Pharmacy & Store Header (Centered)
    buf.append(COMMANDS.ALIGN_CENTER);
    buf.append(COMMANDS.DOUBLE_SIZE);
    buf.append(COMMANDS.BOLD_ON);
    const primaryHeader = doc.header.storeName || doc.header.pharmacyName || "INVENTRA PHARMACY";
    buf.line(primaryHeader);
    buf.append(COMMANDS.NORMAL_SIZE);
    buf.append(COMMANDS.BOLD_OFF);

    if (doc.header.pharmacyName && doc.header.storeName && doc.header.pharmacyName !== doc.header.storeName) {
      buf.line(doc.header.pharmacyName);
    }
    if (doc.header.address) buf.line(doc.header.address);
    if (doc.header.phone) buf.line(`Tel: ${doc.header.phone}`);
    if (doc.header.gstin) buf.line(`GSTIN: ${doc.header.gstin}`);
    if (doc.header.drugLicenseNumber) buf.line(`D.L. No: ${doc.header.drugLicenseNumber}`);

    buf.line("-".repeat(width));

    // 3. Receipt Metadata (Left-aligned key-values)
    buf.append(COMMANDS.ALIGN_LEFT);
    buf.line(this.padRow(`Sale No: ${doc.metadata.saleNumber}`, `Date: ${doc.metadata.date}`, width));
    buf.line(`Invoice: ${doc.metadata.invoiceNumber}`);
    buf.line(`Cashier: ${doc.metadata.cashierName}`);
    if (doc.metadata.customerName) {
      buf.line(`Customer: ${doc.metadata.customerName}${doc.metadata.customerPhone ? ` (${doc.metadata.customerPhone})` : ""}`);
    }

    buf.line("-".repeat(width));

    // 4. Line Items Table
    buf.append(COMMANDS.BOLD_ON);
    if (width === 48) {
      // 80mm layout: Item(22), Qty(6), Price(9), Total(11)
      buf.line(this.format4Col("Item / Batch", "Qty", "Price", "Total", 22, 6, 9, 11));
    } else {
      // 58mm layout: Item(14), Qty(4), Price(6), Total(8)
      buf.line(this.format4Col("Item", "Qty", "Price", "Total", 14, 4, 6, 8));
    }
    buf.append(COMMANDS.BOLD_OFF);
    buf.line("-".repeat(width));

    for (const item of doc.lines) {
      let itemName = item.name;
      if (item.sellingUnit && item.sellingUnit !== "UNIT") {
        itemName += ` (${item.sellingUnit})`;
      }

      if (width === 48) {
        const truncatedName = itemName.length > 22 ? itemName.substring(0, 20) + ".." : itemName;
        buf.line(this.format4Col(
          truncatedName,
          item.quantity.toString(),
          item.unitPrice.toFixed(2),
          item.totalAmount.toFixed(2),
          22, 6, 9, 11
        ));

        // Additional Batch line if available
        if (item.batchNumber) {
          const batchInfo = ` B: ${item.batchNumber}${item.expiryDate ? ` Exp: ${item.expiryDate}` : ""}`;
          buf.line(batchInfo);
        }
      } else {
        const truncatedName = itemName.substring(0, 14);
        buf.line(this.format4Col(
          truncatedName,
          item.quantity.toString(),
          item.unitPrice.toFixed(2),
          item.totalAmount.toFixed(2),
          14, 4, 6, 8
        ));
        if (item.batchNumber) {
          buf.line(` B: ${item.batchNumber}`);
        }
      }
    }

    buf.line("-".repeat(width));

    // 5. Financial Summary
    buf.append(COMMANDS.ALIGN_LEFT);
    buf.line(this.padRow("Subtotal:", doc.financials.subtotal.toFixed(2), width));
    if (doc.financials.discountAmount > 0) {
      buf.line(this.padRow("Discount:", `-${doc.financials.discountAmount.toFixed(2)}`, width));
    }
    if (doc.financials.taxAmount > 0) {
      buf.line(this.padRow("Tax (GST):", `+${doc.financials.taxAmount.toFixed(2)}`, width));
    }
    if (doc.financials.roundOffAmount !== 0) {
      const sign = doc.financials.roundOffAmount > 0 ? "+" : "";
      buf.line(this.padRow("Round Off:", `${sign}${doc.financials.roundOffAmount.toFixed(2)}`, width));
    }

    buf.line("=".repeat(width));
    buf.append(COMMANDS.BOLD_ON);
    buf.append(COMMANDS.DOUBLE_HEIGHT);
    buf.line(this.padRow("TOTAL AMOUNT:", doc.financials.totalAmount.toFixed(2), width));
    buf.append(COMMANDS.NORMAL_SIZE);
    buf.append(COMMANDS.BOLD_OFF);
    buf.line("=".repeat(width));

    buf.line(this.padRow(`Paid (${doc.financials.paymentMethod}):`, doc.financials.paidAmount.toFixed(2), width));
    if (doc.financials.changeAmount > 0) {
      buf.line(this.padRow("Change Due:", doc.financials.changeAmount.toFixed(2), width));
    }

    buf.line("-".repeat(width));

    // 6. Footer & Legal Notice
    buf.append(COMMANDS.ALIGN_CENTER);
    if (doc.footer.customNote) {
      buf.line(doc.footer.customNote);
    }
    buf.line(doc.footer.returnPolicyNotice || "Goods once sold cannot be returned without receipt.");
    buf.line("Get Well Soon!");
    buf.line("Inventra POS");

    // 7. Optional Barcode / QR Code
    if (doc.footer.barcodeValue) {
      buf.feed(1);
      buf.append(this.generateCode128Barcode(doc.footer.barcodeValue));
      buf.line(doc.footer.barcodeValue);
    }

    // 8. Feed & Cut
    const feedLines = options.feedLines ?? 3;
    buf.feed(feedLines);
    if (options.cutPaper !== false) {
      buf.append(COMMANDS.FEED_AND_CUT);
    }

    return buf.toUint8Array();
  }

  private static padRow(left: string, right: string, width: number): string {
    const spaceCount = Math.max(1, width - left.length - right.length);
    return left + " ".repeat(spaceCount) + right;
  }

  private static format4Col(c1: string, c2: string, c3: string, c4: string, w1: number, w2: number, w3: number, w4: number): string {
    const col1 = c1.padEnd(w1, " ");
    const col2 = c2.padStart(w2, " ");
    const col3 = c3.padStart(w3, " ");
    const col4 = c4.padStart(w4, " ");
    return `${col1}${col2}${col3}${col4}`;
  }

  private static generateCode128Barcode(data: string): Uint8Array {
    // GS k 73 {length} {data} (Code 128)
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const header = new Uint8Array([GS, 0x6b, 0x49, dataBytes.length]);
    const result = new Uint8Array(header.length + dataBytes.length);
    result.set(header, 0);
    result.set(dataBytes, header.length);
    return result;
  }
}
