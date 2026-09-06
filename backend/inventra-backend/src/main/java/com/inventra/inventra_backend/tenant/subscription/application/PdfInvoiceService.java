package com.inventra.inventra_backend.tenant.subscription.application;

import com.inventra.inventra_backend.tenant.domain.model.Business;
import com.inventra.inventra_backend.tenant.subscription.api.dto.LicenseInvoiceResponse;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class PdfInvoiceService {

    private static final Logger log = LoggerFactory.getLogger(PdfInvoiceService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm 'IST'")
        .withZone(ZoneId.of("Asia/Kolkata"));

    // Styling Palette
    private static final Color PRIMARY_COLOR = new Color(15, 118, 110);    // Emerald-700
    private static final Color DARK_COLOR = new Color(15, 23, 42);         // Slate-900
    private static final Color MUTED_COLOR = new Color(100, 116, 139);     // Slate-500
    private static final Color BG_LIGHT = new Color(248, 250, 252);        // Slate-50
    private static final Color BORDER_COLOR = new Color(226, 232, 240);    // Slate-200
    private static final Color SUCCESS_COLOR = new Color(5, 150, 105);     // Emerald-600
    private static final Color SUCCESS_BG = new Color(240, 253, 244);      // Emerald-50

    // Fonts
    private static final Font FONT_TITLE = new Font(Font.HELVETICA, 18, Font.BOLD, PRIMARY_COLOR);
    private static final Font FONT_SUBTITLE = new Font(Font.HELVETICA, 9, Font.NORMAL, MUTED_COLOR);
    private static final Font FONT_SECTION_HEADER = new Font(Font.HELVETICA, 10, Font.BOLD, PRIMARY_COLOR);
    private static final Font FONT_REGULAR = new Font(Font.HELVETICA, 9, Font.NORMAL, DARK_COLOR);
    private static final Font FONT_BOLD = new Font(Font.HELVETICA, 9, Font.BOLD, DARK_COLOR);
    private static final Font FONT_MUTED = new Font(Font.HELVETICA, 8, Font.NORMAL, MUTED_COLOR);
    private static final Font FONT_MONO = new Font(Font.COURIER, 9, Font.NORMAL, DARK_COLOR);
    private static final Font FONT_MONO_BOLD = new Font(Font.COURIER, 9, Font.BOLD, DARK_COLOR);
    private static final Font FONT_BADGE = new Font(Font.HELVETICA, 9, Font.BOLD, SUCCESS_COLOR);

    public byte[] generateSubscriptionInvoicePdf(Business business, LicenseInvoiceResponse invoice) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, baos);
            document.open();

            // 1. Header Bar: Logo / Brand on Left, Tax Invoice details on Right
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60, 40});

            // Left cell (Brand)
            PdfPCell brandCell = new PdfPCell();
            brandCell.setBorder(Rectangle.NO_BORDER);
            brandCell.addElement(new Paragraph("INVENTRA TECHNOLOGIES", FONT_TITLE));
            brandCell.addElement(new Paragraph("Cloud Pharmacy ERP & SaaS Platform Services", FONT_SUBTITLE));
            brandCell.addElement(new Paragraph("GSTIN: 27AAACI1234F1Z5 · SAC: " + invoice.hsnSac(), FONT_MUTED));
            headerTable.addCell(brandCell);

            // Right cell (Invoice metadata)
            PdfPCell invMetaCell = new PdfPCell();
            invMetaCell.setBorder(Rectangle.NO_BORDER);
            invMetaCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

            Paragraph badge = new Paragraph("GST TAX INVOICE", new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE));
            PdfPCell badgeCell = new PdfPCell(badge);
            badgeCell.setBackgroundColor(PRIMARY_COLOR);
            badgeCell.setPadding(4);
            badgeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            badgeCell.setBorder(Rectangle.NO_BORDER);

            PdfPTable badgeTable = new PdfPTable(1);
            badgeTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            badgeTable.setWidthPercentage(60);
            badgeTable.addCell(badgeCell);
            invMetaCell.addElement(badgeTable);

            Paragraph invNoPara = new Paragraph(invoice.invoiceNumber(), new Font(Font.COURIER, 12, Font.BOLD, DARK_COLOR));
            invNoPara.setAlignment(Element.ALIGN_RIGHT);
            invMetaCell.addElement(invNoPara);

            String formattedDate = invoice.invoiceDate() != null ? DATE_FORMATTER.format(invoice.invoiceDate()) : "N/A";
            Paragraph invDatePara = new Paragraph("Date: " + formattedDate, FONT_MUTED);
            invDatePara.setAlignment(Element.ALIGN_RIGHT);
            invMetaCell.addElement(invDatePara);

            headerTable.addCell(invMetaCell);
            document.add(headerTable);

            // Spacer
            addSpacer(document, 12);

            // 2. Razorpay Verification Box (Prominent Payment Details)
            PdfPTable rzpTable = new PdfPTable(3);
            rzpTable.setWidthPercentage(100);
            rzpTable.setWidths(new float[]{35, 35, 30});

            String paymentId = invoice.razorpayPaymentId() != null && !invoice.razorpayPaymentId().isBlank()
                ? invoice.razorpayPaymentId()
                : (invoice.paymentMethod() != null ? invoice.paymentMethod() : "pay_verified");
            String orderId = invoice.razorpayOrderId() != null && !invoice.razorpayOrderId().isBlank()
                ? invoice.razorpayOrderId()
                : "order_inventra_" + invoice.invoiceNumber();

            PdfPCell rzpCell1 = createBorderedCell("RAZORPAY PAYMENT ID", paymentId, true);
            PdfPCell rzpCell2 = createBorderedCell("RAZORPAY ORDER ID", orderId, true);
            PdfPCell rzpCell3 = createBorderedCell("PAYMENT STATUS", "PAID IN FULL (VERIFIED)", false);
            rzpCell3.setBackgroundColor(SUCCESS_BG);

            rzpTable.addCell(rzpCell1);
            rzpTable.addCell(rzpCell2);
            rzpTable.addCell(rzpCell3);
            document.add(rzpTable);

            addSpacer(document, 14);

            // 3. Parties Grid (Billed By vs Billed To)
            PdfPTable partiesTable = new PdfPTable(2);
            partiesTable.setWidthPercentage(100);
            partiesTable.setWidths(new float[]{50, 50});

            // Supplier Box
            PdfPCell supplierCell = new PdfPCell();
            supplierCell.setBorderColor(BORDER_COLOR);
            supplierCell.setBackgroundColor(BG_LIGHT);
            supplierCell.setPadding(10);
            supplierCell.addElement(new Paragraph("BILLED BY (SUPPLIER)", FONT_SECTION_HEADER));
            supplierCell.addElement(new Paragraph("Inventra Technologies India Pvt Ltd", FONT_BOLD));
            supplierCell.addElement(new Paragraph("Enterprise Cloud Platform Services", FONT_REGULAR));
            supplierCell.addElement(new Paragraph("State: Maharashtra (Code: 27)", FONT_MUTED));
            supplierCell.addElement(new Paragraph("GSTIN: 27AAACI1234F1Z5", FONT_MONO_BOLD));
            supplierCell.addElement(new Paragraph("Email: billing@inventra.io", FONT_MUTED));
            partiesTable.addCell(supplierCell);

            // Customer Box
            PdfPCell customerCell = new PdfPCell();
            customerCell.setBorderColor(BORDER_COLOR);
            customerCell.setBackgroundColor(BG_LIGHT);
            customerCell.setPadding(10);
            customerCell.addElement(new Paragraph("BILLED TO (CUSTOMER)", FONT_SECTION_HEADER));
            customerCell.addElement(new Paragraph(business.getLegalName() != null ? business.getLegalName() : "Partner Pharmacy", FONT_BOLD));
            if (business.getTradeName() != null && !business.getTradeName().isBlank()) {
                customerCell.addElement(new Paragraph("Trade Name: " + business.getTradeName(), FONT_REGULAR));
            }
            customerCell.addElement(new Paragraph("GSTIN: " + (business.getGstin() != null && !business.getGstin().isBlank() ? business.getGstin() : "Unregistered"), FONT_MONO_BOLD));
            if (business.getDrugLicenseNumber() != null && !business.getDrugLicenseNumber().isBlank()) {
                customerCell.addElement(new Paragraph("Drug License: " + business.getDrugLicenseNumber(), FONT_REGULAR));
            }
            customerCell.addElement(new Paragraph("Plan Tier: " + invoice.planTier(), FONT_MUTED));
            partiesTable.addCell(customerCell);

            document.add(partiesTable);

            addSpacer(document, 16);

            // 4. Line Items Table
            PdfPTable itemsTable = new PdfPTable(6);
            itemsTable.setWidthPercentage(100);
            itemsTable.setWidths(new float[]{40, 12, 12, 12, 12, 12});

            // Table Header
            String[] headers = {"Description", "SAC", "Taxable (INR)", "CGST 9%", "SGST 9%", "Total (INR)"};
            for (String h : headers) {
                PdfPCell hCell = new PdfPCell(new Phrase(h, FONT_BOLD));
                hCell.setBackgroundColor(new Color(241, 245, 249));
                hCell.setBorderColor(BORDER_COLOR);
                hCell.setPadding(8);
                if (!h.equals("Description")) {
                    hCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                }
                itemsTable.addCell(hCell);
            }

            // Table Row: Item
            PdfPCell descCell = new PdfPCell(new Phrase(invoice.description(), FONT_REGULAR));
            descCell.setBorderColor(BORDER_COLOR);
            descCell.setPadding(8);
            itemsTable.addCell(descCell);

            PdfPCell sacCell = new PdfPCell(new Phrase(invoice.hsnSac(), FONT_MONO));
            sacCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            sacCell.setBorderColor(BORDER_COLOR);
            sacCell.setPadding(8);
            itemsTable.addCell(sacCell);

            PdfPCell subtotalCell = new PdfPCell(new Phrase("₹" + String.format("%.2f", invoice.subtotal()), FONT_MONO));
            subtotalCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            subtotalCell.setBorderColor(BORDER_COLOR);
            subtotalCell.setPadding(8);
            itemsTable.addCell(subtotalCell);

            PdfPCell cgstCell = new PdfPCell(new Phrase("₹" + String.format("%.2f", invoice.cgstAmount()), FONT_MONO));
            cgstCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            cgstCell.setBorderColor(BORDER_COLOR);
            cgstCell.setPadding(8);
            itemsTable.addCell(cgstCell);

            PdfPCell sgstCell = new PdfPCell(new Phrase("₹" + String.format("%.2f", invoice.sgstAmount()), FONT_MONO));
            sgstCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            sgstCell.setBorderColor(BORDER_COLOR);
            sgstCell.setPadding(8);
            itemsTable.addCell(sgstCell);

            PdfPCell totalCell = new PdfPCell(new Phrase("₹" + String.format("%.2f", invoice.totalAmount()), FONT_MONO_BOLD));
            totalCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalCell.setBorderColor(BORDER_COLOR);
            totalCell.setPadding(8);
            itemsTable.addCell(totalCell);

            document.add(itemsTable);

            addSpacer(document, 12);

            // 5. Summary Totals on Right
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(45);
            summaryTable.setHorizontalAlignment(Element.ALIGN_RIGHT);
            summaryTable.setWidths(new float[]{60, 40});

            if (invoice.originalAmount() != null && invoice.originalAmount().compareTo(invoice.subtotal()) > 0) {
                addSummaryRow(summaryTable, "Base Plan Price:", "₹" + String.format("%.2f", invoice.originalAmount()), false);
            }
            if (invoice.discountAmount() != null && invoice.discountAmount().compareTo(BigDecimal.ZERO) > 0) {
                addSummaryRow(summaryTable, "Prorated Credit:", "-₹" + String.format("%.2f", invoice.discountAmount()), false);
            }
            if (invoice.couponDiscount() != null && invoice.couponDiscount().compareTo(BigDecimal.ZERO) > 0) {
                String label = invoice.couponCode() != null ? "Coupon (" + invoice.couponCode() + "):" : "Promo Discount:";
                addSummaryRow(summaryTable, label, "-₹" + String.format("%.2f", invoice.couponDiscount()), false);
            }
            addSummaryRow(summaryTable, "Net Taxable Subtotal:", "₹" + String.format("%.2f", invoice.subtotal()), false);
            addSummaryRow(summaryTable, "CGST (9%):", "₹" + String.format("%.2f", invoice.cgstAmount()), false);
            addSummaryRow(summaryTable, "SGST (9%):", "₹" + String.format("%.2f", invoice.sgstAmount()), false);
            addSummaryRow(summaryTable, "Total Paid:", "₹" + String.format("%.2f", invoice.totalAmount()), true);

            document.add(summaryTable);

            addSpacer(document, 24);

            // 6. Footer & Signatory Note
            PdfPTable footerTable = new PdfPTable(1);
            footerTable.setWidthPercentage(100);

            PdfPCell footerCell = new PdfPCell();
            footerCell.setBorderColor(BORDER_COLOR);
            footerCell.setBackgroundColor(BG_LIGHT);
            footerCell.setPadding(10);

            Paragraph stampPara = new Paragraph("✔ VERIFIED DIGITAL TAX INVOICE · PAYMENT COMPLETED VIA RAZORPAY", FONT_BADGE);
            Paragraph notePara = new Paragraph("This is an electronically generated tax invoice under Rule 48 of the CGST Rules, 2017. No physical signature is required.", FONT_MUTED);
            Paragraph contactPara = new Paragraph("Inventra Technologies India Pvt Ltd · CIN: U72900MH2025PTC123456 · support@inventra.io", FONT_MUTED);

            footerCell.addElement(stampPara);
            footerCell.addElement(notePara);
            footerCell.addElement(contactPara);
            footerTable.addCell(footerCell);

            document.add(footerTable);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF tax invoice for {}: {}", invoice.invoiceNumber(), e.getMessage(), e);
            throw new RuntimeException("Could not generate PDF invoice: " + e.getMessage(), e);
        }
    }

    private PdfPCell createBorderedCell(String label, String value, boolean isMono) {
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(BORDER_COLOR);
        cell.setBackgroundColor(BG_LIGHT);
        cell.setPadding(8);
        cell.addElement(new Paragraph(label, FONT_MUTED));
        cell.addElement(new Paragraph(value, isMono ? FONT_MONO_BOLD : FONT_BOLD));
        return cell;
    }

    private void addSummaryRow(PdfPTable table, String label, String value, boolean isGrandTotal) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, isGrandTotal ? FONT_BOLD : FONT_REGULAR));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPadding(4);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, isGrandTotal ? FONT_MONO_BOLD : FONT_MONO));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        valueCell.setPadding(4);

        if (isGrandTotal) {
            labelCell.setBackgroundColor(new Color(240, 253, 250));
            valueCell.setBackgroundColor(new Color(240, 253, 250));
        }

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addSpacer(Document document, float points) throws Exception {
        Paragraph spacer = new Paragraph(" ");
        spacer.setSpacingAfter(points);
        document.add(spacer);
    }
}
