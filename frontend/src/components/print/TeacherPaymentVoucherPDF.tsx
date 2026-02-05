import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ==================== ENHANCED STYLES ====================
const styles = StyleSheet.create({
  // Page container - A5 Landscape for voucher
  page: {
    width: "210mm",
    height: "148mm",
    padding: 16,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#ffffff",
  },

  // Enhanced golden border container with shadow effect
  container: {
    border: "4pt solid #DAA520",
    borderRadius: 12,
    padding: 0,
    height: "100%",
    position: "relative",
    backgroundColor: "#FEFDF8",
    overflow: "hidden",
  },

  // Inner decorative border
  innerContainer: {
    margin: 8,
    border: "1pt solid #F4E4A6",
    borderRadius: 8,
    padding: 20,
    height: "calc(100% - 16px)",
    position: "relative",
    backgroundColor: "transparent",
  },

  // Enhanced corner decorations with rounded corners
  cornerTL: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 32,
    height: 32,
    borderTop: "4pt solid #B8860B",
    borderLeft: "4pt solid #B8860B",
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 32,
    height: 32,
    borderTop: "4pt solid #B8860B",
    borderRight: "4pt solid #B8860B",
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: "absolute",
    bottom: 2,
    left: 2,
    width: 32,
    height: 32,
    borderBottom: "4pt solid #B8860B",
    borderLeft: "4pt solid #B8860B",
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderBottom: "4pt solid #B8860B",
    borderRight: "4pt solid #B8860B",
    borderBottomRightRadius: 8,
  },

  // Watermark background
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-45deg)",
    fontSize: 48,
    color: "#F4E4A6",
    fontWeight: "bold",
    letterSpacing: 8,
    zIndex: -1,
    opacity: 0.1,
  },

  // ==================== ENHANCED HEADER ====================
  header: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: "2pt solid #DAA520",
  },
  logoContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 8,
    marginBottom: 12,
    border: "2pt solid #DAA520",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logo: {
    width: 56,
    height: 56,
    objectFit: "contain",
  },
  academyName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#8B4513",
    letterSpacing: 2.5,
    marginBottom: 4,
    textAlign: "center",
  },
  academySubtitle: {
    fontSize: 10,
    color: "#B8860B",
    letterSpacing: 1.2,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  voucherTitle: {
    backgroundColor: "linear-gradient(135deg, #DAA520 0%, #B8860B 100%)",
    color: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 32,
    borderRadius: 6,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 3,
    textTransform: "uppercase",
    border: "1pt solid #B8860B",
  },

  // Enhanced voucher number with background
  voucherNumber: {
    alignItems: "flex-end",
    marginBottom: 18,
  },
  voucherBox: {
    backgroundColor: "#F8F6F0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    border: "1pt solid #E6D68A",
  },
  voucherLabel: {
    fontSize: 9,
    color: "#8B4513",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  voucherValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#654321",
    fontFamily: "Courier",
    letterSpacing: 1,
  },

  // ==================== ENHANCED BODY ====================
  bodySection: {
    backgroundColor: "#FEFCF5",
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    border: "1pt solid #F4E4A6",
    shadowColor: "#DAA520",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },

  // Enhanced row styling
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottom: "1pt dashed #E6D68A",
  },
  rowNoBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  // Enhanced info blocks
  infoBlock: {
    flex: 1,
    paddingRight: 16,
  },
  infoBlockRight: {
    flex: 1,
    alignItems: "flex-end",
    paddingLeft: 16,
  },
  infoLabel: {
    fontSize: 9,
    color: "#B8860B",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#654321",
    lineHeight: 1.2,
  },
  infoSubValue: {
    fontSize: 11,
    color: "#8B7765",
    marginTop: 3,
    fontStyle: "italic",
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#654321",
  },

  // Enhanced amount section with golden background
  amountSection: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 16,
    borderBottom: "2pt solid #DAA520",
    backgroundColor: "#FFF8DC",
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    border: "1pt solid #F4E4A6",
  },
  amountLabel: {
    fontSize: 10,
    color: "#B8860B",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "bold",
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#228B22",
    letterSpacing: 2,
    textAlign: "center",
    textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
  },

  // Enhanced balance and description
  balanceLabel: {
    fontSize: 9,
    color: "#B8860B",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  balancePositive: {
    color: "#D2691E",
  },
  balanceZero: {
    color: "#228B22",
  },
  descriptionValue: {
    fontSize: 12,
    color: "#654321",
    fontStyle: "italic",
    textAlign: "right",
  },

  // ==================== ENHANCED SIGNATURE ====================
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 20,
    borderTop: "2pt solid #DAA520",
  },
  signatureBlock: {
    width: "42%",
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderTop: "2pt solid #8B4513",
    paddingTop: 8,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 10,
    color: "#8B4513",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "bold",
    textAlign: "center",
  },
  signatureNote: {
    fontSize: 8,
    color: "#B8860B",
    textAlign: "center",
    marginTop: 2,
    fontStyle: "italic",
  },

  // ==================== ENHANCED FOOTER ====================
  footer: {
    marginTop: "auto",
    paddingTop: 16,
    borderTop: "1pt dashed #E6D68A",
    alignItems: "center",
    backgroundColor: "#FEFDF8",
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#A0895C",
    textAlign: "center",
    lineHeight: 1.3,
  },
  securityText: {
    fontSize: 7,
    color: "#B8860B",
    textAlign: "center",
    marginTop: 4,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});

// ==================== INTERFACES ====================
export interface TeacherVoucherData {
  voucherId: string;
  teacherName: string;
  subject: string;
  amountPaid: number;
  remainingBalance: number;
  paymentDate: string;
  description?: string;
}

interface TeacherPaymentVoucherPDFProps {
  data: TeacherVoucherData;
  logoDataUrl?: string;
}

// ==================== HELPER FUNCTIONS ====================
const formatCurrency = (amount: number): string => {
  return `PKR ${amount.toLocaleString("en-PK")}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const capitalizeSubject = (subject: string): string => {
  const subjectMap: Record<string, string> = {
    biology: "Biology",
    chemistry: "Chemistry",
    physics: "Physics",
    math: "Mathematics",
    english: "English",
  };
  return (
    subjectMap[subject] || subject.charAt(0).toUpperCase() + subject.slice(1)
  );
};

// ==================== ENHANCED PDF COMPONENT ====================
export const TeacherPaymentVoucherPDF = ({
  data,
  logoDataUrl,
}: TeacherPaymentVoucherPDFProps) => {
  return (
    <Document>
      <Page size={[595.28, 419.53]} style={styles.page}>
        <View style={styles.container}>
          {/* Enhanced corner decorations */}
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />

          {/* Background watermark */}
          <Text style={styles.watermark}>EDWARDIAN ACADEMY</Text>

          {/* Inner container with second border */}
          <View style={styles.innerContainer}>
            {/* Enhanced Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                {logoDataUrl ? (
                  <Image src={logoDataUrl} style={styles.logo} />
                ) : (
                  <View
                    style={{
                      ...styles.logo,
                      backgroundColor: "#F8F6F0",
                      borderRadius: 28,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 24,
                        color: "#DAA520",
                        fontWeight: "bold",
                      }}
                    >
                      📚
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.academyName}>EDWARDIAN ACADEMY</Text>
              <Text style={styles.academySubtitle}>
                Excellence in Education Leadership
              </Text>
              <Text style={styles.voucherTitle}>PAYMENT VOUCHER</Text>
            </View>

            {/* Enhanced voucher number */}
            <View style={styles.voucherNumber}>
              <View style={styles.voucherBox}>
                <Text style={styles.voucherLabel}>
                  Voucher No:{" "}
                  <Text style={styles.voucherValue}>{data.voucherId}</Text>
                </Text>
              </View>
            </View>

            {/* Enhanced body section */}
            <View style={styles.bodySection}>
              {/* Paid To Row */}
              <View style={styles.row}>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>💼 Paid To</Text>
                  <Text style={styles.infoValue}>{data.teacherName}</Text>
                  <Text style={styles.infoSubValue}>
                    {capitalizeSubject(data.subject)} Teacher
                  </Text>
                </View>
                <View style={styles.infoBlockRight}>
                  <Text style={styles.infoLabel}>📅 Date</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(data.paymentDate)}
                  </Text>
                </View>
              </View>

              {/* Enhanced amount section with golden background */}
              <View style={styles.amountSection}>
                <Text style={styles.amountLabel}>💰 Amount Paid</Text>
                <Text style={styles.amountValue}>
                  {formatCurrency(data.amountPaid)}
                </Text>
              </View>

              {/* Balance & Description Row */}
              <View style={styles.rowNoBorder}>
                <View style={styles.infoBlock}>
                  <Text style={styles.balanceLabel}>💳 Remaining Balance</Text>
                  <Text
                    style={[
                      styles.balanceValue,
                      data.remainingBalance > 0
                        ? styles.balancePositive
                        : styles.balanceZero,
                    ]}
                  >
                    {formatCurrency(data.remainingBalance)}
                  </Text>
                </View>
                {data.description && (
                  <View style={styles.infoBlockRight}>
                    <Text style={styles.infoLabel}>📝 Description</Text>
                    <Text style={styles.descriptionValue}>
                      {data.description}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Enhanced signature section */}
            <View style={styles.signatureSection}>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureLabel}>
                    Accountant Signature
                  </Text>
                </View>
                <Text style={styles.signatureNote}>
                  This is a computer-generated voucher.
                </Text>
              </View>
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureLabel}>Receiver Signature</Text>
                </View>
                <Text style={styles.signatureNote}>
                  Valid without signature for amounts under PKR 50,000.
                </Text>
              </View>
            </View>

            {/* Enhanced footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                🏫 Edwardian Academy - Teacher Payment Voucher System |
                Generated on{" "}
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text style={styles.securityText}>
                SECURE DOCUMENT • ANTI-FRAUD MEASURES APPLIED
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default TeacherPaymentVoucherPDF;
