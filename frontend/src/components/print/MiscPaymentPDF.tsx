import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ==================== STYLES ====================
const styles = StyleSheet.create({
  page: {
    width: "8.5in",
    height: "5.5in",
    padding: 20,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#ffffff",
  },
  container: {
    border: "2pt solid #1a365d",
    borderRadius: 4,
    padding: 16,
    height: "100%",
    position: "relative",
  },

  // Watermark
  academyWatermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-30deg)",
    fontSize: 48,
    fontWeight: 700,
    color: "rgba(37, 99, 235, 0.12)",
    letterSpacing: 10,
    zIndex: 10,
  },

  // ==================== HEADER ====================
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2pt solid #1a365d",
    paddingBottom: 8,
    marginBottom: 10,
    position: "relative",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  academyInfo: {
    flexDirection: "column",
  },
  academyName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1a365d",
    letterSpacing: 0.5,
  },
  contactText: {
    fontSize: 8,
    color: "#dc2626",
    marginTop: 2,
    fontWeight: 500,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  titleBadge: {
    backgroundColor: "#2563eb",
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 3,
    marginBottom: 3,
    alignSelf: "flex-end",
  },
  titleBadgeText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 2,
  },
  receiptBox: {
    border: "2pt solid #1a365d",
    backgroundColor: "#f8fafc",
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 3,
    alignSelf: "flex-end",
  },
  receiptIdText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#1a365d",
    fontFamily: "Courier",
  },
  dateText: {
    fontSize: 8,
    color: "#4b5563",
    marginTop: 2,
    alignSelf: "flex-end",
  },

  // ==================== MAIN CONTENT ====================
  mainContent: {
    flexDirection: "row",
    gap: 10,
    flex: 1,
    height: "calc(100% - 120px)",
  },

  // Left Section - Student & Payment Details
  leftSection: {
    flex: 2,
    flexDirection: "column",
    paddingRight: 8,
  },
  detailsGrid: {
    marginBottom: 8,
    height: "calc(100% - 60px)",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 5,
    height: 20,
  },
  detailItem: {
    flex: 1,
    flexDirection: "row",
  },
  detailLabel: {
    width: 65,
    fontSize: 8,
    fontWeight: 700,
    color: "#374151",
  },
  detailValue: {
    flex: 1,
    fontSize: 10,
    color: "#111827",
    borderBottom: "1pt solid #d1d5db",
    paddingBottom: 3,
  },

  // Payment purpose section
  purposeSection: {
    marginTop: 6,
    paddingTop: 8,
    borderTop: "1pt solid #e5e7eb",
    flex: 1,
  },
  purposeTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 4,
  },
  purposeBadge: {
    backgroundColor: "#dbeafe",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 3,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  purposeBadgeText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#1e40af",
  },
  purposeDescription: {
    fontSize: 9,
    color: "#4b5563",
    marginTop: 3,
  },

  // Center Section - Receipt Ref
  centerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderLeft: "1pt dashed #9ca3af",
    borderRight: "1pt dashed #9ca3af",
    paddingHorizontal: 10,
    height: "100%",
  },
  centerLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#4b5563",
    marginBottom: 5,
    letterSpacing: 1,
  },
  centerValue: {
    fontSize: 9,
    fontWeight: 700,
    color: "#1a365d",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 8,
  },
  centerHint: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 4,
  },
  studentIdBox: {
    marginTop: 14,
    paddingTop: 10,
    borderTop: "1pt dashed #d1d5db",
    alignItems: "center",
  },
  studentIdLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#4b5563",
    letterSpacing: 1,
    marginBottom: 2,
  },
  studentIdValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a365d",
  },

  // Right Section - Payment Box
  rightSection: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "space-between",
  },
  paymentBox: {
    width: "100%",
    border: "2pt solid #2563eb",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  paymentHeader: {
    backgroundColor: "#2563eb",
    paddingVertical: 5,
    alignItems: "center",
  },
  paymentHeaderLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  paymentHeaderValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#ffffff",
  },
  paymentDetails: {
    padding: 8,
    backgroundColor: "#eff6ff",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  paymentRowLabel: {
    fontSize: 8,
    color: "#4b5563",
    fontWeight: 600,
  },
  paymentRowValue: {
    fontSize: 10,
    fontWeight: 700,
    color: "#111827",
  },
  paymentRowDivider: {
    borderTop: "1pt solid #bfdbfe",
    marginTop: 4,
    paddingTop: 4,
  },
  amountColor: {
    color: "#16a34a",
  },
  methodColor: {
    color: "#2563eb",
  },

  // Signature
  signatureSection: {
    marginTop: "auto",
    alignItems: "flex-end",
    paddingTop: 8,
  },
  signatureLabel: {
    fontSize: 7,
    color: "#6b7280",
    marginBottom: 18,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  signatureLine: {
    width: 120,
    borderBottom: "1.5pt solid #1a365d",
    height: 1,
  },

  // ==================== FOOTER ====================
  footer: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTop: "1pt solid #e5e7eb",
    paddingTop: 6,
  },
  footerWarning: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#2563eb",
  },
  footerReceipt: {
    fontSize: 7,
    color: "#9ca3af",
  },
  footerAddress: {
    fontSize: 7,
    color: "#6b7280",
    textAlign: "right",
    maxWidth: 200,
  },
});

// ==================== INTERFACES ====================
export interface MiscPaymentPDFData {
  receiptId: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  class: string;
  contact: string;
  paymentType: string;
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  paymentDate: Date | string;
  collectedBy: string;
}

interface MiscPaymentPDFProps {
  data: MiscPaymentPDFData;
  logoDataUrl?: string;
}

// ==================== HELPERS ====================
const formatCurrency = (amount: number): string => {
  return `PKR ${(amount || 0).toLocaleString()}`;
};

const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ==================== COMPONENT ====================
export const MiscPaymentPDF = ({
  data,
  logoDataUrl,
}: MiscPaymentPDFProps) => {
  return (
    <Document>
      <Page size={[612, 396]} style={styles.page}>
        <View style={styles.container}>
          {/* ==================== HEADER ==================== */}
          <View style={styles.header}>
            {/* Left: Logo & Academy Name */}
            <View style={styles.headerLeft}>
              {logoDataUrl ? (
                <Image src={logoDataUrl} style={styles.logo} />
              ) : (
                <Image src="/logo.png" style={styles.logo} />
              )}
              <View style={styles.academyInfo}>
                <Text style={styles.academyName}>
                  GENIUS ISLAMIAN'S ACADEMY
                </Text>
                <Text style={styles.contactText}>
                  Contact: 091-5601600 / 0334-5852326
                </Text>
              </View>
            </View>

            {/* Right: Title Badge, Receipt No & Date */}
            <View style={styles.headerRight}>
              <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>PAYMENT RECEIPT</Text>
              </View>
              <View style={styles.receiptBox}>
                <Text style={styles.receiptIdText}>{data.receiptId}</Text>
              </View>
              <Text style={styles.dateText}>
                Date: {formatDate(data.paymentDate)}
              </Text>
            </View>
          </View>

          {/* ==================== MAIN CONTENT ==================== */}
          <View style={styles.mainContent}>
            {/* Left Section - Student & Payment Details */}
            <View style={styles.leftSection}>
              <View style={styles.detailsGrid}>
                {/* Row 1: Student Name */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{data.studentName}</Text>
                  </View>
                  <View style={[styles.detailItem, { marginLeft: 14 }]}>
                    <Text style={styles.detailLabel}>Father:</Text>
                    <Text style={styles.detailValue}>{data.fatherName}</Text>
                  </View>
                </View>

                {/* Row 2: Class | Contact */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Class:</Text>
                    <Text style={styles.detailValue}>{data.class}</Text>
                  </View>
                  <View style={[styles.detailItem, { marginLeft: 14 }]}>
                    <Text style={styles.detailLabel}>Contact:</Text>
                    <Text style={styles.detailValue}>{data.contact}</Text>
                  </View>
                </View>

                {/* Row 3: Collected By */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Received By:</Text>
                    <Text style={styles.detailValue}>{data.collectedBy}</Text>
                  </View>
                </View>
              </View>

              {/* Payment Purpose */}
              <View style={styles.purposeSection}>
                <Text style={styles.purposeTitle}>Payment For:</Text>
                <View style={styles.purposeBadge}>
                  <Text style={styles.purposeBadgeText}>
                    {data.paymentType}
                  </Text>
                </View>
                {data.description && (
                  <Text style={styles.purposeDescription}>
                    {data.description}
                  </Text>
                )}
              </View>
            </View>

            {/* Center Section - Receipt Ref & Student ID */}
            <View style={styles.centerSection}>
              <Text style={styles.centerLabel}>RECEIPT REF</Text>
              <Text style={styles.centerValue}>{data.receiptId}</Text>
              <Text style={styles.centerHint}>For record verification</Text>

              <View style={styles.studentIdBox}>
                <Text style={styles.studentIdLabel}>STUDENT ID</Text>
                <Text style={styles.studentIdValue}>{data.studentId}</Text>
              </View>
            </View>

            {/* Right Section - Payment Box */}
            <View style={styles.rightSection}>
              <View style={styles.paymentBox}>
                {/* Status Header */}
                <View style={styles.paymentHeader}>
                  <Text style={styles.paymentHeaderLabel}>PAYMENT STATUS</Text>
                  <Text style={styles.paymentHeaderValue}>RECEIVED</Text>
                </View>

                {/* Payment Details */}
                <View style={styles.paymentDetails}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentRowLabel}>Type:</Text>
                    <Text style={[styles.paymentRowValue, styles.methodColor]}>
                      {data.paymentType}
                    </Text>
                  </View>

                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentRowLabel}>Method:</Text>
                    <Text style={styles.paymentRowValue}>
                      {data.paymentMethod}
                    </Text>
                  </View>

                  <View
                    style={[styles.paymentRow, styles.paymentRowDivider]}
                  >
                    <Text
                      style={[styles.paymentRowLabel, { fontWeight: 700 }]}
                    >
                      Amount Paid:
                    </Text>
                    <Text style={[styles.paymentRowValue, styles.amountColor]}>
                      {formatCurrency(data.amount)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Signature */}
              <View style={styles.signatureSection}>
                <Text style={styles.signatureLabel}>Authorized Signature</Text>
                <View style={styles.signatureLine} />
              </View>
            </View>
          </View>

          {/* ==================== FOOTER ==================== */}
          <View style={styles.footer}>
            <Text style={styles.footerWarning}>
              Non-refundable payment
            </Text>
            <Text style={styles.footerReceipt}>Ref: {data.receiptId}</Text>
            <Text style={styles.footerAddress}>
              Opp. Islamia College, Danishabad, University Road, Peshawar
            </Text>
          </View>

          {/* Watermark - rendered last to appear on top */}
          <Text style={styles.academyWatermark}>GENIUS ISLAMIAN'S ACADEMY</Text>
        </View>
      </Page>
    </Document>
  );
};

export default MiscPaymentPDF;