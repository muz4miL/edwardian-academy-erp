import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts
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

// Vertical ID Card styles (CR80 standard: 3.375" x 2.125")
const styles = StyleSheet.create({
  page: {
    width: "3.375in",
    height: "2.125in",
    padding: 0,
    fontFamily: "Roboto",
    backgroundColor: "#ffffff",
  },
  card: {
    width: "100%",
    height: "100%",
    border: "1pt solid #4c51bf",
    overflow: "hidden",
  },
  // Header
  header: {
    backgroundColor: "#4c51bf",
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    border: "1pt solid #ffffff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  logoText: {
    fontSize: 7,
    fontWeight: 700,
    color: "#ffffff",
  },
  academyNameContainer: {
    alignItems: "flex-start",
  },
  academyName: {
    fontSize: 8,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  academySubtitle: {
    fontSize: 5,
    color: "#c7d2fe",
    marginTop: 1,
  },
  cardTypeLabel: {
    fontSize: 5,
    color: "#c7d2fe",
    marginTop: 3,
    letterSpacing: 1,
  },
  // Main Content
  mainContent: {
    flexDirection: "row",
    flex: 1,
    padding: 8,
    gap: 10,
  },
  // Left side - Photo placeholder and name
  leftSection: {
    alignItems: "center",
    width: 60,
  },
  photoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#e0e7ff",
    border: "2pt solid #4c51bf",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  photoInitial: {
    fontSize: 20,
    fontWeight: 700,
    color: "#4c51bf",
  },
  studentName: {
    fontSize: 6,
    fontWeight: 700,
    color: "#1e1b4b",
    textAlign: "center",
    maxWidth: 60,
  },
  // Right side - Details and Barcode
  rightSection: {
    flex: 1,
    justifyContent: "space-between",
  },
  detailsGrid: {
    gap: 3,
  },
  detailRow: {
    flexDirection: "row",
  },
  detailLabel: {
    fontSize: 5,
    color: "#6b7280",
    width: 35,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 6,
    fontWeight: 500,
    color: "#1f2937",
    flex: 1,
  },
  idRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  studentIdLabel: {
    fontSize: 5,
    color: "#6b7280",
    width: 35,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  studentIdValue: {
    fontSize: 7,
    fontWeight: 700,
    color: "#dc2626",
    letterSpacing: 0.5,
  },
  // Barcode section
  barcodeSection: {
    alignItems: "center",
    marginTop: 4,
  },
  barcodeImage: {
    width: 80,
    height: 25,
  },
  barcodeHint: {
    fontSize: 4,
    color: "#9ca3af",
    marginTop: 1,
  },
  // Footer
  footer: {
    backgroundColor: "#4c51bf",
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 4,
    color: "#c7d2fe",
  },
  validDate: {
    fontSize: 4,
    color: "#fef3c7",
    fontWeight: 500,
  },
});

export interface StudentIDData {
  studentId: string;
  barcodeId?: string;
  studentName: string;
  fatherName: string;
  class: string;
  group: string;
  admissionDate: string | Date;
  studentStatus?: string;
}

interface StudentIDCardPDFProps {
  student: StudentIDData;
  barcodeDataUrl: string;
}

const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * StudentIDCardPDF - Compact ID Card for printing
 *
 * Standard CR80 card size (3.375" x 2.125" - credit card size)
 * Horizontal layout with photo placeholder, details, and barcode
 */
export const StudentIDCardPDF = ({
  student,
  barcodeDataUrl,
}: StudentIDCardPDFProps) => {
  const displayId = student.barcodeId || student.studentId;
  const initial = student.studentName?.charAt(0)?.toUpperCase() || "?";

  return (
    <Document>
      <Page size={[243, 153]} style={styles.page}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>EA</Text>
              </View>
              <View style={styles.academyNameContainer}>
                <Text style={styles.academyName}>THE EDWARDIAN'S ACADEMY</Text>
                <Text style={styles.academySubtitle}>
                  Excellence in Education
                </Text>
              </View>
            </View>
            <Text style={styles.cardTypeLabel}>
              STUDENT IDENTIFICATION CARD
            </Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Left - Photo and Name */}
            <View style={styles.leftSection}>
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitial}>{initial}</Text>
              </View>
              <Text style={styles.studentName}>{student.studentName}</Text>
            </View>

            {/* Right - Details and Barcode */}
            <View style={styles.rightSection}>
              {/* Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Father</Text>
                  <Text style={styles.detailValue}>{student.fatherName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Class</Text>
                  <Text style={styles.detailValue}>{student.class}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Group</Text>
                  <Text style={styles.detailValue}>{student.group}</Text>
                </View>
                <View style={styles.idRow}>
                  <Text style={styles.studentIdLabel}>ID No.</Text>
                  <Text style={styles.studentIdValue}>{displayId}</Text>
                </View>
              </View>

              {/* Barcode */}
              <View style={styles.barcodeSection}>
                {barcodeDataUrl ? (
                  <Image src={barcodeDataUrl} style={styles.barcodeImage} />
                ) : (
                  <Text style={{ fontSize: 5, color: "#666" }}>
                    Barcode unavailable
                  </Text>
                )}
                <Text style={styles.barcodeHint}>Scan for verification</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>📞 091-5601600</Text>
            <Text style={styles.validDate}>
              Valid from: {formatDate(student.admissionDate)}
            </Text>
            <Text style={styles.footerText}>Peshawar</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default StudentIDCardPDF;
