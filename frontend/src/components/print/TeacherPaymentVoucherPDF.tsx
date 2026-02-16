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
    padding: 20,
    fontFamily: "Helvetica",
    fontSize: 11,
    backgroundColor: "#FFFFFF",
    color: "#333333",
  },

  // ==================== HEADER (COMPACT INLINE) ====================
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Center the entire header row
    marginBottom: 12,
    paddingBottom: 10,
    borderBottom: "2pt solid #DAA520",
  },

  logoContainer: {
    width: 50,
    height: 50,
    marginRight: 15, // Space between logo and text
    backgroundColor: "#FFFBF0",
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#DAA520",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  logoImage: {
    width: 40,
    height: 40,
    objectFit: "contain",
  },

  headerText: {
    alignItems: "flex-start",
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8B4513",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  subtitle: {
    fontSize: 9,
    color: "#DAA520",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 1,
  },

  // ==================== VOUCHER BADGE ====================
  voucherBadge: {
    backgroundColor: "#DAA520",
    color: "#FFFFFF",
    textAlign: "center",
    paddingVertical: 5,
    marginBottom: 15,
    textTransform: "uppercase",
    fontWeight: "bold",
    letterSpacing: 2,
    fontSize: 11,
    borderRadius: 2,
  },

  // ==================== INFO GRID ====================
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8, // Reduced from 10 to save space
  },

  col: {
    flex: 1,
  },

  colRight: {
    flex: 1,
    alignItems: "flex-end",
    textAlign: "right",
  },

  label: {
    fontSize: 8,
    color: "#B8860B",
    textTransform: "uppercase",
    marginBottom: 2,
    fontWeight: "bold",
  },

  value: {
    fontSize: 12, // Reduced from 13 to save space
    color: "#000000",
    fontWeight: "bold",
  },

  // ==================== AMOUNT BOX ====================
  amountContainer: {
    backgroundColor: "#FFFBF0",
    borderWidth: 1,
    borderColor: "#F4E4A6",
    padding: 12, // Reduced from 15
    borderRadius: 4,
    alignItems: "center",
    marginVertical: 12, // Reduced from 15
  },

  amountLabel: {
    fontSize: 9,
    color: "#8B4513",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  amountValue: {
    fontSize: 26, // Reduced from 28
    fontWeight: "bold",
    color: "#228B22",
  },

  // ==================== BOTTOM DETAILS ====================
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8, // Reduced
    paddingBottom: 8, // Reduced
    borderBottom: "1pt dashed #DAA520",
  },

  balanceText: {
    fontSize: 13, // Reduced from 14
    fontWeight: "bold",
    color: "#D32F2F",
  },

  // ==================== SIGNATURES ====================
  footer: {
    flexDirection: "row",
    justifyContent: "space-between", // Accountant on left, Receiver on right
    marginTop: 12, // Reduced
  },

  signatureBlock: {
    width: "40%",
  },

  signatureLine: {
    borderTop: "1pt solid #8B4513",
    paddingTop: 4,
    marginTop: 20, // Reduced from 25
    textAlign: "center",
    fontSize: 9,
    color: "#8B4513",
    fontWeight: "bold",
    textTransform: "uppercase",
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

// ==================== HELPERS ====================
const formatCurrency = (amount: number): string => {
  return `PKR ${amount.toLocaleString("en-PK")}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ==================== COMPONENT ====================
export const TeacherPaymentVoucherPDF = ({
  data,
  logoDataUrl,
}: TeacherPaymentVoucherPDFProps) => {
  return (
    <Document>
      <Page size="A5" orientation="landscape" style={styles.page}>
        {/* --- HEADER (INLINE, CENTERED) --- */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {logoDataUrl ? (
              <Image src={logoDataUrl} style={styles.logoImage} />
            ) : (
              <Text
                style={{ fontSize: 20, fontWeight: "bold", color: "#DAA520" }}
              >
                EA
              </Text>
            )}
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>Edwardian Academy</Text>
            <Text style={styles.subtitle}>Excellence in Education</Text>
          </View>
        </View>

        {/* --- BADGE --- */}
        <Text style={styles.voucherBadge}>Payment Voucher</Text>

        {/* --- TOP ROW: PAYEE & DATE --- */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Paid To</Text>
            <Text style={styles.value}>{data.teacherName}</Text>
            <Text style={{ fontSize: 9, color: "#666" }}>
              ({data.subject} Teacher)
            </Text>
          </View>
          <View style={styles.colRight}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(data.paymentDate)}</Text>
          </View>
        </View>

        {/* --- MIDDLE ROW: VOUCHER # & DESC --- */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Voucher No.</Text>
            <Text style={styles.value}>{data.voucherId}</Text>
          </View>
          {data.description && (
            <View style={styles.colRight}>
              <Text style={styles.label}>Description</Text>
              <Text style={{ fontSize: 10, textAlign: "right", maxWidth: 200 }}>
                {data.description}
              </Text>
            </View>
          )}
        </View>

        {/* --- AMOUNT HIGHLIGHT --- */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(data.amountPaid)}
          </Text>
        </View>

        {/* --- BALANCE --- */}
        <View style={styles.detailsRow}>
          <View>
            <Text style={styles.label}>Remaining Balance</Text>
            <Text style={styles.balanceText}>
              {formatCurrency(data.remainingBalance)}
            </Text>
          </View>
        </View>

        {/* --- SIGNATURES --- */}
        <View style={styles.footer}>
          {/* Accountant on the Left */}
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLine}>Accountant</Text>
          </View>

          {/* Receiver at the End (Right) */}
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLine}>Receiver</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default TeacherPaymentVoucherPDF;
