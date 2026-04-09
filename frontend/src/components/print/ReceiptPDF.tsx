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
  // Page: A5 landscape (half-letter)
  page: {
    width: "8.5in",
    height: "5.5in",
    padding: 20,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#ffffff",
  },
  container: {
    border: "2.5pt solid #1a365d",
    borderRadius: 6,
    padding: 14,
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },

  // Watermarks
  watermark: {
    position: "absolute",
    top: "45%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-25deg)",
    fontSize: 54,
    fontWeight: 700,
    color: "rgba(220, 38, 38, 0.06)",
    letterSpacing: 6,
  },
  academyWatermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-30deg)",
    fontSize: 44,
    fontWeight: 700,
    color: "rgba(26, 54, 93, 0.06)",
    letterSpacing: 10,
    zIndex: 0,
  },

  // ==================== HEADER ====================
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "2.5pt solid #1a365d",
    paddingBottom: 8,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: "contain",
  },
  academyInfo: {
    flexDirection: "column",
  },
  academyName: {
    fontSize: 17,
    fontWeight: 700,
    color: "#1a365d",
    letterSpacing: 0.5,
  },
  contactText: {
    fontSize: 8,
    color: "#1a365d",
    marginTop: 2,
    fontWeight: 500,
  },
  headerCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  versionBadge: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 4,
  },
  originalBadge: {
    backgroundColor: "#16a34a",
  },
  copyBadge: {
    backgroundColor: "#0056b3",
  },
  versionText: {
    fontSize: 8,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  serialBox: {
    border: "2pt solid #1a365d",
    backgroundColor: "#f0f4f8",
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 3,
  },
  serialText: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1a365d",
  },
  dateText: {
    fontSize: 8,
    color: "#4b5563",
    marginTop: 2,
  },

  // ==================== MAIN CONTENT ====================
  mainContent: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
  },

  // Left Section
  leftSection: {
    flex: 1.5,
    flexDirection: "column",
  },

  photoSection: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  photoFrame: {
    width: 70,
    height: 88,
    border: "1pt solid #1f2937",
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1a365d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  photoFallbackInitials: {
    fontSize: 18,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 1,
    marginBottom: 2,
  },
  photoFallbackLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    color: "#d4af37",
    letterSpacing: 0.8,
    textAlign: "center",
  },

  // Student Details Grid
  detailsGrid: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  detailItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  detailLabel: {
    width: 52,
    fontSize: 9,
    fontWeight: 700,
    color: "#374151",
  },
  detailValue: {
    flex: 1,
    fontSize: 9.5,
    color: "#111827",
    borderBottom: "0.75pt solid #d1d5db",
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
    backgroundColor: "#1a365d",
  },
  nonMedicalGroup: {
    backgroundColor: "#2563eb",
  },

  // Schedule Table
  scheduleSection: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: "0.75pt solid #e5e7eb",
  },
  scheduleTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scheduleHeader: {
    flexDirection: "row",
    backgroundColor: "#1a365d",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  scheduleRow: {
    flexDirection: "row",
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    borderBottom: "0.5pt solid #e5e7eb",
  },
  scheduleRowAlt: {
    backgroundColor: "#f8fafc",
  },
  scheduleColSubject: { flex: 1.2 },
  scheduleColTeacher: { flex: 1.3 },
  scheduleColTime: { flex: 1.2 },
  scheduleHeaderText: {
    fontSize: 7,
    fontWeight: 700,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  scheduleSubjectText: {
    fontSize: 8,
    color: "#1a365d",
    fontWeight: 700,
  },
  scheduleTeacherText: {
    fontSize: 7.5,
    color: "#374151",
  },
  scheduleTimeText: {
    fontSize: 7,
    color: "#4b5563",
  },
  scheduleMoreText: {
    fontSize: 7,
    color: "#6b7280",
    fontStyle: "italic",
  },

  // Fallback bullet subjects
  subjectsSection: {
    marginTop: 8,
    paddingTop: 6,
    borderTop: "0.75pt solid #e5e7eb",
  },
  subjectsTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subjectsList: {
    flexDirection: "column",
    gap: 2,
  },
  subjectItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  subjectBullet: {
    fontSize: 9,
    color: "#1a365d",
    fontWeight: 700,
  },
  subjectName: {
    fontSize: 8.5,
    color: "#1f2937",
  },

  // Center Section — Barcode
  centerSection: {
    flex: 0.6,
    alignItems: "center",
    justifyContent: "center",
    borderLeft: "1pt dashed #9ca3af",
    borderRight: "1pt dashed #9ca3af",
    paddingHorizontal: 10,
  },
  barcodeLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#4b5563",
    marginBottom: 5,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  barcodeImage: {
    width: 110,
    height: 44,
    marginBottom: 3,
  },
  barcodeId: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a365d",
    letterSpacing: 1,
  },
  barcodeHint: {
    fontSize: 6.5,
    color: "#6b7280",
    marginTop: 3,
  },

  // Right Section — Financial Box
  rightSection: {
    flex: 0.85,
    alignItems: "center",
  },
  feeBox: {
    width: "100%",
    border: "2pt solid #16a34a",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 8,
  },
  feeBoxPending: {
    borderColor: "#0056b3",
  },
  feeStatusHeader: {
    backgroundColor: "#16a34a",
    paddingVertical: 5,
    alignItems: "center",
  },
  feeStatusHeaderPending: {
    backgroundColor: "#0056b3",
  },
  feeStatusLabel: {
    fontSize: 7,
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  feeStatusValue: {
    fontSize: 15,
    fontWeight: 700,
    color: "#ffffff",
  },
  feeDetails: {
    padding: 7,
    backgroundColor: "#f9fafb",
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2.5,
    alignItems: "center",
  },
  feeRowLabel: {
    fontSize: 8.5,
    color: "#4b5563",
    fontWeight: 600,
  },
  feeRowValue: {
    fontSize: 9,
    fontWeight: 700,
    color: "#111827",
  },
  feeRowTotal: {
    borderTop: "1pt solid #d1d5db",
    marginTop: 3,
    paddingTop: 3,
  },
  discountText: {
    color: "#16a34a",
  },
  balancePositive: {
    color: "#0056b3",
  },
  balanceZero: {
    color: "#16a34a",
  },

  // Signature
  signatureSection: {
    marginTop: "auto",
    alignItems: "flex-end",
    paddingTop: 6,
  },
  signatureLabel: {
    fontSize: 6.5,
    color: "#6b7280",
    marginBottom: 1,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  signatureLine: {
    width: 100,
    borderBottom: "1.5pt solid #1a365d",
    height: 14,
  },

  // ==================== FOOTER ====================
  footer: {
    position: "absolute",
    bottom: 8,
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTop: "0.75pt solid #e5e7eb",
    paddingTop: 6,
  },
  footerWarning: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#0056b3",
  },
  footerReceipt: {
    fontSize: 6.5,
    color: "#9ca3af",
  },
  footerAddress: {
    fontSize: 6.5,
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
  sessionRate?: number;
  paidAmount: number;
  discountAmount?: number;
  feeStatus: string;
  admissionDate?: string | Date;
  photo?: string;
  imageUrl?: string;
  subjects?: Array<{ name: string; fee: number; teacherName?: string }>;
  schedule?: Array<{
    subject: string;
    teacherName: string;
    time: string;
    days?: string[];
  }>;
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
  logoDataUrl?: string;
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
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return phone;
};

const formatClassName = (className: string | undefined): string => {
  if (!className) return "-";
  return className.replace(/-/g, " ").replace(/\s+/g, " ").trim();
};

const getInitials = (name: string | undefined): string => {
  if (!name) return "NA";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase() || "NA";
  }

  return name.trim().slice(0, 2).toUpperCase() || "NA";
};

const resolvePhotoSrc = (photo: string | undefined): string | null => {
  if (!photo) return null;
  if (photo.startsWith("http") || photo.startsWith("data:")) return photo;

  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
  return `${apiBaseUrl}${photo}`;
};

const cleanText = (value: string | undefined, fallback = "-"): string => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
};

const truncateText = (value: string | undefined, maxLength: number): string => {
  const normalized = cleanText(value, "");
  if (!normalized) return "-";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 1))}…`;
};

// ==================== COMPONENT ====================
export const ReceiptPDF = ({
  student,
  receiptConfig,
  barcodeDataUrl,
  logoDataUrl,
}: ReceiptPDFProps) => {
  const MAX_SCHEDULE_ROWS = 6;
  const MAX_SUBJECT_FALLBACK_ROWS = 6;

  const balance = Math.max(
    0,
    (student.totalFee || 0) - (student.paidAmount || 0),
  );
  const isPaid = student.feeStatus === "paid" || balance === 0;
  const isMedical = student.group?.toLowerCase().includes("medical");
  const studentPhoto = resolvePhotoSrc(student.imageUrl || student.photo);
  const studentInitials = getInitials(student.studentName);
  const scheduleRows = Array.isArray(student.schedule)
    ? student.schedule.filter((s) => s && (s.subject || s.teacherName || s.time))
    : [];
  const visibleScheduleRows = scheduleRows.slice(0, MAX_SCHEDULE_ROWS);
  const hiddenScheduleCount = Math.max(0, scheduleRows.length - MAX_SCHEDULE_ROWS);
  const fallbackSubjects = Array.isArray(student.subjects) ? student.subjects : [];
  const visibleFallbackSubjects = fallbackSubjects.slice(0, MAX_SUBJECT_FALLBACK_ROWS);
  const hiddenFallbackSubjectsCount = Math.max(
    0,
    fallbackSubjects.length - MAX_SUBJECT_FALLBACK_ROWS,
  );

  return (
    <Document>
      <Page size={[612, 396]} style={styles.page}>
        <View style={styles.container}>
          {/* Background watermarks */}
          <Text style={styles.academyWatermark}>{"THE EDWARDIAN'S ACADEMY"}</Text>
          {!receiptConfig.isOriginal && (
            <Text style={styles.watermark}>DUPLICATE</Text>
          )}

          {/* ==================== HEADER ==================== */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {logoDataUrl ? (
                <Image src={logoDataUrl} style={styles.logo} />
              ) : (
                <Image src="/logo.png" style={styles.logo} />
              )}
              <View style={styles.academyInfo}>
                <Text style={styles.academyName}>{"THE EDWARDIAN'S ACADEMY"}</Text>
                <Text style={styles.contactText}>
                  Contact: 091-5601600 / 0334-5852326
                </Text>
              </View>
            </View>

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
            {/* LEFT — Student Info + Schedule Table */}
            <View style={styles.leftSection}>
              <View style={styles.photoSection}>
                <View style={styles.photoFrame}>
                  {studentPhoto ? (
                    <Image src={studentPhoto} style={styles.photoImage} />
                  ) : (
                    <View style={styles.photoFallback}>
                      <Text style={styles.photoFallbackInitials}>
                        {studentInitials}
                      </Text>
                      <Text style={styles.photoFallbackLabel}>NO PHOTO</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.detailsGrid}>
                {/* Row 1: Name | Father */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{student.studentName}</Text>
                  </View>
                  <View style={[styles.detailItem, { marginLeft: 14 }]}>
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
                  <View style={[styles.detailItem, { marginLeft: 14 }]}>
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

              {/* Schedule Table — Subject / Teacher / Time */}
              {scheduleRows.length > 0 ? (
                <View style={styles.scheduleSection}>
                  <Text style={styles.scheduleTitle}>Class Schedule:</Text>
                  <View style={styles.scheduleHeader}>
                    <Text style={[styles.scheduleColSubject, styles.scheduleHeaderText]}>SUBJECT</Text>
                    <Text style={[styles.scheduleColTeacher, styles.scheduleHeaderText]}>TEACHER</Text>
                    <Text style={[styles.scheduleColTime, styles.scheduleHeaderText]}>TIME</Text>
                  </View>
                  {visibleScheduleRows.map((s, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.scheduleRow,
                        idx % 2 !== 0 ? styles.scheduleRowAlt : {},
                      ]}
                    >
                      <Text style={[styles.scheduleColSubject, styles.scheduleSubjectText]}>
                        {truncateText(s.subject, 18)}
                      </Text>
                      <Text style={[styles.scheduleColTeacher, styles.scheduleTeacherText]}>
                        {truncateText(s.teacherName || "-", 22)}
                      </Text>
                      <Text style={[styles.scheduleColTime, styles.scheduleTimeText]}>
                        {truncateText(s.time || "TBD", 22)}
                      </Text>
                    </View>
                  ))}
                  {hiddenScheduleCount > 0 && (
                    <View style={[styles.scheduleRow, styles.scheduleRowAlt]}>
                      <Text style={[styles.scheduleColSubject, styles.scheduleMoreText]}>
                        +{hiddenScheduleCount} more subjects
                      </Text>
                      <Text style={[styles.scheduleColTeacher, styles.scheduleMoreText]}>...</Text>
                      <Text style={[styles.scheduleColTime, styles.scheduleMoreText]}>...</Text>
                    </View>
                  )}
                </View>
              ) : visibleFallbackSubjects.length > 0 ? (
                /* Fallback: bullet list if no timetable data */
                <View style={styles.subjectsSection}>
                  <Text style={styles.subjectsTitle}>Enrolled Subjects:</Text>
                  <View style={styles.subjectsList}>
                    {visibleFallbackSubjects.map((s, idx) => (
                      <View key={idx} style={styles.subjectItem}>
                        <Text style={styles.subjectBullet}>{"\u2022"}</Text>
                        <Text style={styles.subjectName}>
                          {truncateText(
                            `${cleanText(s.name)}${s.teacherName ? ` (${s.teacherName})` : ""}`,
                            42,
                          )}
                        </Text>
                      </View>
                    ))}
                    {hiddenFallbackSubjectsCount > 0 && (
                      <View style={styles.subjectItem}>
                        <Text style={styles.subjectBullet}>{"\u2022"}</Text>
                        <Text style={styles.subjectName}>
                          +{hiddenFallbackSubjectsCount} more subjects
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : null}
            </View>

            {/* CENTER — Smart Gate Barcode */}
            <View style={styles.centerSection}>
              <Text style={styles.barcodeLabel}>SMART GATE ID</Text>
              {barcodeDataUrl ? (
                <Image src={barcodeDataUrl} style={styles.barcodeImage} />
              ) : (
                <Text style={{ fontSize: 8, color: "#999" }}>No Barcode</Text>
              )}
              <Text style={styles.barcodeId}>{student.studentId}</Text>
              <Text style={styles.barcodeHint}>Scan for entry verification</Text>
            </View>

            {/* RIGHT — Financial Box + Signature */}
            <View style={styles.rightSection}>
              <View style={[styles.feeBox, !isPaid && styles.feeBoxPending]}>
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

                <View style={styles.feeDetails}>
                  {student.sessionRate && student.sessionRate > 0 ? (
                    <>
                      <View style={styles.feeRow}>
                        <Text style={styles.feeRowLabel}>Session Rate:</Text>
                        <Text style={styles.feeRowValue}>{formatCurrency(student.sessionRate)}</Text>
                      </View>
                      {student.discountAmount && student.discountAmount > 0 && (
                        <View style={styles.feeRow}>
                          <Text style={[styles.feeRowLabel, styles.discountText]}>Discount:</Text>
                          <Text style={[styles.feeRowValue, styles.discountText]}>-{formatCurrency(student.discountAmount)}</Text>
                        </View>
                      )}
                      <View style={styles.feeRow}>
                        <Text style={styles.feeRowLabel}>Net Payable:</Text>
                        <Text style={styles.feeRowValue}>{formatCurrency(student.totalFee)}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.feeRow}>
                      <Text style={styles.feeRowLabel}>Total Fee:</Text>
                      <Text style={styles.feeRowValue}>{formatCurrency(student.totalFee)}</Text>
                    </View>
                  )}

                  <View style={styles.feeRow}>
                    <Text style={styles.feeRowLabel}>Paid:</Text>
                    <Text style={styles.feeRowValue}>{formatCurrency(student.paidAmount)}</Text>
                  </View>

                  <View style={[styles.feeRow, styles.feeRowTotal]}>
                    <Text style={[styles.feeRowLabel, { fontWeight: 700 }]}>Balance:</Text>
                    <Text
                      style={[
                        styles.feeRowValue,
                        balance > 0 ? styles.balancePositive : styles.balanceZero,
                      ]}
                    >
                      {formatCurrency(balance)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.signatureSection}>
                <Text style={styles.signatureLabel}>Authorized Signature</Text>
                <View style={styles.signatureLine} />
              </View>
            </View>
          </View>

          {/* ==================== FOOTER ==================== */}
          <View style={styles.footer}>
            <Text style={styles.footerWarning}>Fee is non-refundable in any case</Text>
            <Text style={styles.footerReceipt}>Receipt: {receiptConfig.receiptId}</Text>
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
