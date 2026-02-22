import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// Academy Logo - using public path
const LOGO_URL = "/logo.png";

// Using built-in Helvetica font (no registration needed)

// ==================== STYLES ====================
const styles = StyleSheet.create({
  // Page container
  page: {
    width: "8.5in",
    height: "5.5in",
    padding: 24,
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
  // Watermark for copies
  watermark: {
    position: "absolute",
    top: "45%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-25deg)",
    fontSize: 52,
    fontWeight: 700,
    color: "rgba(220, 38, 38, 0.06)",
    letterSpacing: 4,
  },

  // ==================== HEADER ====================
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2pt solid #1a365d",
    paddingBottom: 10,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: "contain",
  },
  logoFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    border: "2pt solid #1a365d",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1a365d",
  },
  academyInfo: {
    flexDirection: "column",
  },
  academyName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1a365d",
    letterSpacing: 0.5,
  },
  contactText: {
    fontSize: 9,
    color: "#dc2626",
    marginTop: 3,
    fontWeight: 500,
  },
  headerCenter: {
    alignItems: "center",
  },
  versionBadge: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginBottom: 4,
  },
  originalBadge: {
    backgroundColor: "#16a34a",
  },
  copyBadge: {
    backgroundColor: "#dc2626",
  },
  versionText: {
    fontSize: 9,
    fontWeight: 700,
    color: "#ffffff",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  serialBox: {
    border: "2pt solid #1a365d",
    backgroundColor: "#f8fafc",
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  serialText: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a365d",
  },
  dateText: {
    fontSize: 9,
    color: "#4b5563",
    marginTop: 2,
  },

  // ==================== MAIN CONTENT ====================
  mainContent: {
    flexDirection: "row",
    gap: 16,
    flex: 1,
  },

  // Left Section - Student Details + Subjects
  leftSection: {
    flex: 1.4,
    flexDirection: "column",
  },

  // Student Details Grid (2 columns)
  detailsGrid: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  detailItem: {
    flex: 1,
    flexDirection: "row",
  },
  detailLabel: {
    width: 55,
    fontSize: 9,
    fontWeight: 700,
    color: "#374151",
  },
  detailValue: {
    flex: 1,
    fontSize: 10,
    color: "#111827",
    borderBottom: "1pt solid #d1d5db",
    paddingBottom: 2,
  },
  groupBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 700,
    color: "#ffffff",
  },
  medicalGroup: {
    backgroundColor: "#dc2626",
  },
  nonMedicalGroup: {
    backgroundColor: "#2563eb",
  },

  // Subjects Section (Vertical List)
  subjectsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1pt solid #e5e7eb",
  },
  subjectsTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 6,
  },
  subjectsList: {
    flexDirection: "column",
    gap: 3,
  },
  subjectItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subjectBullet: {
    fontSize: 10,
    color: "#2563eb",
    fontWeight: 700,
  },
  subjectName: {
    fontSize: 9,
    color: "#1f2937",
  },

  // Center Section - Barcode
  centerSection: {
    flex: 0.8,
    alignItems: "center",
    justifyContent: "center",
    borderLeft: "1pt dashed #9ca3af",
    borderRight: "1pt dashed #9ca3af",
    paddingHorizontal: 12,
  },
  barcodeLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#4b5563",
    marginBottom: 6,
    letterSpacing: 1,
  },
  barcodeImage: {
    width: 110,
    height: 45,
    marginBottom: 4,
  },
  barcodeId: {
    fontSize: 12,
    fontWeight: 700,
    color: "#1a365d",
    letterSpacing: 1,
  },
  barcodeHint: {
    fontSize: 7,
    color: "#6b7280",
    marginTop: 4,
  },

  // Right Section - Financial Box
  rightSection: {
    flex: 0.8,
    alignItems: "center",
  },
  feeBox: {
    width: "100%",
    border: "2pt solid #16a34a",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  feeBoxPending: {
    borderColor: "#dc2626",
  },
  feeStatusHeader: {
    backgroundColor: "#16a34a",
    paddingVertical: 6,
    alignItems: "center",
  },
  feeStatusHeaderPending: {
    backgroundColor: "#dc2626",
  },
  feeStatusLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  feeStatusValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#ffffff",
  },
  feeDetails: {
    padding: 8,
    backgroundColor: "#f9fafb",
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  feeRowLabel: {
    fontSize: 9,
    color: "#4b5563",
  },
  feeRowValue: {
    fontSize: 9,
    fontWeight: 700,
    color: "#111827",
  },
  feeRowTotal: {
    borderTop: "1pt solid #d1d5db",
    marginTop: 4,
    paddingTop: 4,
  },
  discountText: {
    color: "#16a34a",
  },
  balancePositive: {
    color: "#dc2626",
  },
  balanceZero: {
    color: "#16a34a",
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
    marginBottom: 2,
  },
  signatureLine: {
    width: 100,
    borderBottom: "1pt solid #374151",
    height: 16,
  },

  // ==================== FOOTER ====================
  footer: {
    position: "absolute",
    bottom: 10,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTop: "1pt solid #e5e7eb",
    paddingTop: 8,
  },
  footerWarning: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#dc2626",
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
  subjects?: Array<{ name: string; fee: number; teacherName?: string }>;
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
  barcodeDataUrl: string;
  logoDataUrl?: string; // Optional logo data URL for PDF
}

// ==================== HELPERS ====================
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return new Date().toLocaleDateString("en-GB");
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount: number): string => {
  return `PKR ${(amount || 0).toLocaleString()}`;
};

const formatPhone = (phone: string | undefined): string => {
  if (!phone) return "-";
  // Clean and format as 0313-911053389
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return phone;
};

// Format class name - replace hyphens with spaces and clean up
const formatClassName = (className: string | undefined): string => {
  if (!className) return "-";
  // Replace hyphens with spaces, collapse multiple spaces
  return className.replace(/-/g, " ").replace(/\s+/g, " ").trim();
};

// ==================== COMPONENT ====================
export const ReceiptPDF = ({
  student,
  receiptConfig,
  barcodeDataUrl,
  logoDataUrl, // Optional logo data URL
}: ReceiptPDFProps) => {
  const balance = Math.max(
    0,
    (student.totalFee || 0) - (student.paidAmount || 0),
  );
  const isPaid = student.feeStatus === "paid" || balance === 0;
  const isMedical = student.group?.toLowerCase().includes("medical");

  return (
    <Document>
      <Page size={[612, 396]} style={styles.page}>
        <View style={styles.container}>
          {/* Watermark for duplicate copies */}
          {!receiptConfig.isOriginal && (
            <Text style={styles.watermark}>DUPLICATE</Text>
          )}

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
                <Text style={styles.academyName}>THE EDWARDIAN'S ACADEMY</Text>
                <Text style={styles.contactText}>
                  Contact: 091-5601600 / 0334-5852326
                </Text>
              </View>
            </View>

            {/* Center: Version Badge */}
            <View style={styles.headerCenter}>
              <View
                style={[
                  styles.versionBadge,
                  receiptConfig.isOriginal
                    ? styles.originalBadge
                    : styles.copyBadge,
                ]}
              >
                <Text style={styles.versionText}>
                  {receiptConfig.isOriginal
                    ? "ORIGINAL RECEIPT"
                    : `COPY #${receiptConfig.version}`}
                </Text>
              </View>
            </View>

            {/* Right: Date & S.No */}
            <View style={styles.headerRight}>
              <View style={styles.serialBox}>
                <Text style={styles.serialText}>S.No: {student.studentId}</Text>
              </View>
              <Text style={styles.dateText}>
                Date: {formatDate(receiptConfig.printedAt)}
              </Text>
            </View>
          </View>

          {/* ==================== MAIN CONTENT ==================== */}
          <View style={styles.mainContent}>
            {/* Left Section - Student Details + Subjects */}
            <View style={styles.leftSection}>
              {/* Student Details Grid */}
              <View style={styles.detailsGrid}>
                {/* Row 1: Name | Father */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>
                      {student.studentName}
                    </Text>
                  </View>
                  <View style={[styles.detailItem, { marginLeft: 16 }]}>
                    <Text style={styles.detailLabel}>Father:</Text>
                    <Text style={styles.detailValue}>{student.fatherName}</Text>
                  </View>
                </View>

                {/* Row 2: Class | Group */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Class:</Text>
                    <Text style={styles.detailValue}>{formatClassName(student.class)}</Text>
                  </View>
                  <View style={[styles.detailItem, { marginLeft: 16 }]}>
                    <Text style={styles.detailLabel}>Group:</Text>
                    <View
                      style={[
                        styles.groupBadge,
                        isMedical
                          ? styles.medicalGroup
                          : styles.nonMedicalGroup,
                      ]}
                    >
                      <Text>{student.group}</Text>
                    </View>
                  </View>
                </View>

                {/* Row 3: Contact */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Contact:</Text>
                    <Text style={styles.detailValue}>
                      {formatPhone(student.parentCell || student.studentCell)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Subjects - Vertical Bullet List */}
              {student.subjects && student.subjects.length > 0 && (
                <View style={styles.subjectsSection}>
                  <Text style={styles.subjectsTitle}>Enrolled Subjects:</Text>
                  <View style={styles.subjectsList}>
                    {student.subjects.map((s, idx) => (
                      <View key={idx} style={styles.subjectItem}>
                        <Text style={styles.subjectBullet}>•</Text>
                        <Text style={styles.subjectName}>
                          {s.name}{s.teacherName ? ` (${s.teacherName})` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Center Section - Barcode */}
            <View style={styles.centerSection}>
              <Text style={styles.barcodeLabel}>SMART GATE ID</Text>
              {barcodeDataUrl ? (
                <Image src={barcodeDataUrl} style={styles.barcodeImage} />
              ) : (
                <Text style={{ fontSize: 8, color: "#999" }}>No Barcode</Text>
              )}
              <Text style={styles.barcodeId}>{student.studentId}</Text>
              <Text style={styles.barcodeHint}>
                Scan for entry verification
              </Text>
            </View>

            {/* Right Section - Financial Box */}
            <View style={styles.rightSection}>
              <View style={[styles.feeBox, !isPaid && styles.feeBoxPending]}>
                {/* Status Header */}
                <View
                  style={[
                    styles.feeStatusHeader,
                    !isPaid && styles.feeStatusHeaderPending,
                  ]}
                >
                  <Text style={styles.feeStatusLabel}>FEE STATUS</Text>
                  <Text style={styles.feeStatusValue}>
                    {isPaid ? "PAID" : "PENDING"}
                  </Text>
                </View>

                {/* Fee Details */}
                <View style={styles.feeDetails}>
                  <View style={styles.feeRow}>
                    <Text style={styles.feeRowLabel}>Total Fee:</Text>
                    <Text style={styles.feeRowValue}>
                      {formatCurrency(student.totalFee)}
                    </Text>
                  </View>

                  {/* Discount Row (if applicable) */}
                  {student.discountAmount && student.discountAmount > 0 && (
                    <View style={styles.feeRow}>
                      <Text style={[styles.feeRowLabel, styles.discountText]}>
                        Discount:
                      </Text>
                      <Text style={[styles.feeRowValue, styles.discountText]}>
                        -{formatCurrency(student.discountAmount)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.feeRow}>
                    <Text style={styles.feeRowLabel}>Paid:</Text>
                    <Text style={styles.feeRowValue}>
                      {formatCurrency(student.paidAmount)}
                    </Text>
                  </View>

                  <View style={[styles.feeRow, styles.feeRowTotal]}>
                    <Text style={[styles.feeRowLabel, { fontWeight: 700 }]}>
                      Balance:
                    </Text>
                    <Text
                      style={[
                        styles.feeRowValue,
                        balance > 0
                          ? styles.balancePositive
                          : styles.balanceZero,
                      ]}
                    >
                      {formatCurrency(balance)}
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
              ⚠ Fee is non-refundable in any case
            </Text>
            <Text style={styles.footerReceipt}>
              Receipt: {receiptConfig.receiptId}
            </Text>
            <Text style={styles.footerAddress}>
              Opp. Islamia College, Danishabad, University Road, Peshawar
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptPDF;
