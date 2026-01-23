import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts for better PDF rendering
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
      fontWeight: 300,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf",
      fontWeight: 500,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: 700,
    },
  ],
});

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    width: "8.5in",
    height: "4in",
    padding: 18,
    fontFamily: "Roboto",
    fontSize: 11,
    backgroundColor: "#ffffff",
    position: "relative",
  },
  container: {
    border: "2pt solid #000000",
    padding: 15,
    height: "100%",
    position: "relative",
  },
  // Watermark for duplicate copies
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-30deg)",
    fontSize: 48,
    fontWeight: 700,
    color: "rgba(255, 0, 0, 0.08)",
    whiteSpace: "nowrap",
  },
  // Header section
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "2pt solid #000000",
    paddingBottom: 8,
    marginBottom: 10,
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoCircle: {
    width: 45,
    height: 45,
    borderRadius: 25,
    border: "2pt solid #1a365d",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a365d",
  },
  academyName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1a365d",
  },
  contactText: {
    fontSize: 8,
    color: "#c53030",
    marginTop: 2,
  },
  versionBadge: {
    padding: "4pt 12pt",
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
    color: "#ffffff",
  },
  originalBadge: {
    backgroundColor: "#38a169",
  },
  copyBadge: {
    backgroundColor: "#e53e3e",
  },
  receiptInfo: {
    alignItems: "flex-end",
  },
  studentIdBox: {
    border: "1pt solid #000000",
    padding: "3pt 8pt",
    fontSize: 13,
    fontWeight: 700,
  },
  dateText: {
    fontSize: 8,
    marginTop: 4,
  },
  // Main content
  mainContent: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },
  // Left column - Student details
  leftColumn: {
    flex: 1.5,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  detailLabel: {
    width: 70,
    fontWeight: 700,
    fontSize: 10,
  },
  detailValue: {
    flex: 1,
    borderBottom: "1pt solid #000000",
    fontSize: 10,
    paddingBottom: 2,
  },
  groupBadge: {
    padding: "2pt 8pt",
    fontSize: 9,
    fontWeight: 700,
    color: "#ffffff",
  },
  medicalGroup: {
    backgroundColor: "#c53030",
  },
  nonMedicalGroup: {
    backgroundColor: "#2b6cb0",
  },
  subjectsSection: {
    marginTop: 8,
  },
  subjectsTitle: {
    fontWeight: 700,
    fontSize: 9,
    marginBottom: 4,
  },
  subjectsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  subjectTag: {
    padding: "2pt 6pt",
    backgroundColor: "#edf2f7",
    border: "1pt solid #cbd5e0",
    fontSize: 8,
    borderRadius: 2,
  },
  // Center column - Barcode
  centerColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderLeft: "1pt dashed #000000",
    borderRight: "1pt dashed #000000",
    paddingHorizontal: 10,
  },
  barcodeTitle: {
    fontSize: 8,
    fontWeight: 700,
    marginBottom: 4,
  },
  barcodeImage: {
    width: 120,
    height: 50,
  },
  barcodeHint: {
    fontSize: 6,
    color: "#666666",
    marginTop: 4,
    textAlign: "center",
  },
  // Right column - Fee status
  rightColumn: {
    flex: 0.8,
    alignItems: "center",
  },
  feeStatusBox: {
    padding: 8,
    marginBottom: 8,
    width: "100%",
    textAlign: "center",
  },
  paidBorder: {
    border: "2pt solid #38a169",
  },
  pendingBorder: {
    border: "2pt solid #e53e3e",
  },
  feeStatusLabel: {
    fontSize: 8,
    fontWeight: 700,
  },
  feeStatusValue: {
    fontSize: 13,
    fontWeight: 700,
  },
  paidColor: {
    color: "#38a169",
  },
  pendingColor: {
    color: "#e53e3e",
  },
  feeTable: {
    width: "100%",
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    fontSize: 8,
  },
  feeRowBorder: {
    borderTop: "1pt solid #000000",
  },
  feeLabel: {
    textAlign: "left",
  },
  feeValue: {
    textAlign: "right",
    fontWeight: 700,
  },
  signatureSection: {
    marginTop: 12,
    borderTop: "1pt solid #000000",
    paddingTop: 8,
  },
  signatureLabel: {
    fontSize: 7,
  },
  signatureLine: {
    borderBottom: "1pt solid #000000",
    height: 18,
    marginTop: 2,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 15,
    left: 15,
    right: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1pt solid #000000",
    paddingTop: 6,
    fontSize: 7,
  },
  footerWarning: {
    color: "#c53030",
    fontWeight: 700,
  },
  footerReceiptId: {
    color: "#666666",
  },
  footerAddress: {
    textAlign: "right",
  },
});

// Interface for student data
export interface StudentPDFData {
  _id?: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  class: string;
  group: string;
  parentCell?: string;
  studentCell?: string;
  totalFee: number;
  paidAmount: number;
  discountAmount?: number;
  feeStatus: string;
  admissionDate?: string | Date;
  subjects?: Array<{ name: string; fee: number }>;
}

export interface ReceiptPDFConfig {
  receiptId: string;
  version: number;
  isOriginal: boolean;
  printedAt: Date | string;
}

interface ReceiptPDFProps {
  student: StudentPDFData;
  receiptConfig: ReceiptPDFConfig;
  barcodeDataUrl: string; // Base64 data URL for the barcode image
}

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return new Date().toLocaleDateString("en-GB");
  return new Date(date).toLocaleDateString("en-GB");
};

const formatCurrency = (amount: number): string => {
  return `PKR ${amount?.toLocaleString() || 0}`;
};

/**
 * ReceiptPDF - Horizontal Landscape Admission Receipt
 *
 * Uses @react-pdf/renderer to generate a printable PDF receipt.
 * Matches the academy's yellow slip format with barcode for Smart Gate.
 */
export const ReceiptPDF = ({
  student,
  receiptConfig,
  barcodeDataUrl,
}: ReceiptPDFProps) => {
  const balance = Math.max(
    0,
    (student.totalFee || 0) - (student.paidAmount || 0),
  );
  const isPaid = student.feeStatus === "paid" || balance === 0;
  const isMedical = student.group?.toLowerCase().includes("medical");

  return (
    <Document>
      <Page size={[612, 288]} style={styles.page}>
        <View style={styles.container}>
          {/* Watermark for duplicate copies */}
          {!receiptConfig.isOriginal && (
            <Text style={styles.watermark}>
              DUPLICATE COPY #{receiptConfig.version}
            </Text>
          )}

          {/* Header */}
          <View style={styles.header}>
            {/* Logo & Academy Name */}
            <View style={styles.logoSection}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>EA</Text>
              </View>
              <View>
                <Text style={styles.academyName}>THE EDWARDIAN'S ACADEMY</Text>
                <Text style={styles.contactText}>
                  Contact: 091-5601600 / 0334-5852326
                </Text>
              </View>
            </View>

            {/* Version Badge */}
            <View
              style={[
                styles.versionBadge,
                receiptConfig.isOriginal
                  ? styles.originalBadge
                  : styles.copyBadge,
              ]}
            >
              <Text>
                {receiptConfig.isOriginal
                  ? "ORIGINAL RECEIPT"
                  : `COPY #${receiptConfig.version}`}
              </Text>
            </View>

            {/* Receipt Info */}
            <View style={styles.receiptInfo}>
              <View style={styles.studentIdBox}>
                <Text>S.No: {student.studentId}</Text>
              </View>
              <Text style={styles.dateText}>
                Date: {formatDate(student.admissionDate)}
              </Text>
            </View>
          </View>

          {/* Main Content - 3 Column Layout */}
          <View style={styles.mainContent}>
            {/* Left Column - Student Details */}
            <View style={styles.leftColumn}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{student.studentName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Father:</Text>
                <Text style={styles.detailValue}>{student.fatherName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Group:</Text>
                <View
                  style={[
                    styles.groupBadge,
                    isMedical ? styles.medicalGroup : styles.nonMedicalGroup,
                  ]}
                >
                  <Text>{student.group}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Class:</Text>
                <Text style={styles.detailValue}>{student.class}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cell No:</Text>
                <Text style={styles.detailValue}>
                  {student.parentCell || student.studentCell || "-"}
                </Text>
              </View>

              {/* Subjects */}
              {student.subjects && student.subjects.length > 0 && (
                <View style={styles.subjectsSection}>
                  <Text style={styles.subjectsTitle}>Subjects:</Text>
                  <View style={styles.subjectsRow}>
                    {student.subjects.map((s, idx) => (
                      <View key={idx} style={styles.subjectTag}>
                        <Text>{s.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Center Column - Barcode */}
            <View style={styles.centerColumn}>
              <Text style={styles.barcodeTitle}>SMART GATE ID</Text>
              {barcodeDataUrl ? (
                <Image src={barcodeDataUrl} style={styles.barcodeImage} />
              ) : (
                <Text style={{ fontSize: 8, color: "#666" }}>
                  Barcode unavailable
                </Text>
              )}
              <Text style={styles.barcodeHint}>
                Scan for entry verification
              </Text>
            </View>

            {/* Right Column - Fee Status */}
            <View style={styles.rightColumn}>
              <View
                style={[
                  styles.feeStatusBox,
                  isPaid ? styles.paidBorder : styles.pendingBorder,
                ]}
              >
                <Text style={styles.feeStatusLabel}>FEE STATUS</Text>
                <Text
                  style={[
                    styles.feeStatusValue,
                    isPaid ? styles.paidColor : styles.pendingColor,
                  ]}
                >
                  {isPaid ? "PAID" : "PENDING"}
                </Text>
              </View>

              <View style={styles.feeTable}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Total:</Text>
                  <Text style={styles.feeValue}>
                    {formatCurrency(student.totalFee)}
                  </Text>
                </View>
                {/* Show discount row if applicable */}
                {student.discountAmount && student.discountAmount > 0 && (
                  <View style={styles.feeRow}>
                    <Text style={[styles.feeLabel, { color: "#15803d" }]}>
                      Discount:
                    </Text>
                    <Text
                      style={[
                        styles.feeValue,
                        { color: "#15803d", fontWeight: 700 },
                      ]}
                    >
                      -{formatCurrency(student.discountAmount)}
                    </Text>
                  </View>
                )}
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Paid:</Text>
                  <Text style={[styles.feeValue, styles.paidColor]}>
                    {formatCurrency(student.paidAmount)}
                  </Text>
                </View>
                <View style={[styles.feeRow, styles.feeRowBorder]}>
                  <Text style={[styles.feeLabel, { fontWeight: 700 }]}>
                    Balance:
                  </Text>
                  <Text
                    style={[
                      styles.feeValue,
                      balance > 0 ? styles.pendingColor : styles.paidColor,
                    ]}
                  >
                    {formatCurrency(balance)}
                  </Text>
                </View>
              </View>

              <View style={styles.signatureSection}>
                <Text style={styles.signatureLabel}>Signature</Text>
                <View style={styles.signatureLine} />
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerWarning}>
              ⚠️ FEE IS NON-REFUNDABLE IN ANY CASE
            </Text>
            <Text style={styles.footerReceiptId}>
              Receipt ID: {receiptConfig.receiptId}
            </Text>
            <View style={styles.footerAddress}>
              <Text>
                Address: Opposite Islamia College, Danishabad University Road,
                Peshawar
              </Text>
              <Text>facebook.com/theedwardiansacademy</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptPDF;
