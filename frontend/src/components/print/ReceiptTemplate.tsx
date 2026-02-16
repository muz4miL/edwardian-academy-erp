import React, { forwardRef } from "react";
import Barcode from "react-barcode";

/**
 * ReceiptTemplate - Horizontal Landscape Admission Receipt
 *
 * Matches the academy's yellow slip format with added barcode for Smart Gate.
 * Designed for thermal or standard printers (8.5" x 4" landscape).
 */

interface StudentData {
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
  feeStatus: string;
  admissionDate?: string | Date;
  subjects?: Array<{ name: string; fee: number }>;
  photo?: string;
  imageUrl?: string;
}

interface ReceiptConfig {
  receiptId: string;
  version: number;
  isOriginal: boolean;
  printedAt: Date | string;
}

interface ReceiptTemplateProps {
  student: StudentData;
  receiptConfig: ReceiptConfig;
}

const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  ({ student, receiptConfig }, ref) => {
    const formatDate = (date: Date | string | undefined) => {
      if (!date) return new Date().toLocaleDateString("en-GB");
      return new Date(date).toLocaleDateString("en-GB");
    };

    const formatCurrency = (amount: number) => {
      return `PKR ${amount?.toLocaleString() || 0}`;
    };

    const balance = Math.max(
      0,
      (student.totalFee || 0) - (student.paidAmount || 0),
    );
    const isPaid = student.feeStatus === "paid" || balance === 0;

    return (
      <>
        {/* Print-specific CSS to ensure barcode renders */}
        <style>{`
          /* Global print color adjustment */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          @media print {
            .receipt-container {
              page-break-inside: avoid;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            /* CRITICAL: Force barcode visibility with fixed dimensions */
            .receipt-container svg,
            .receipt-container canvas {
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              max-width: 100% !important;
              min-height: 45px !important; /* Prevent collapse to 0px */
              height: auto !important;
            }
            /* Ensure barcode paths are visible with high contrast */
            .receipt-container svg * {
              fill: #000 !important;
              stroke: #000 !important;
            }
            
            /* Force barcode rect elements to be black */
            .receipt-container svg rect {
              fill: #000 !important;
            }
            @page {
              size: 8.5in 4in landscape;
              margin: 0;
            }
          }
        `}</style>
        <div
          ref={ref}
          className="receipt-container"
          style={{
            width: "8.5in",
            height: "4in",
            padding: "0.25in",
            fontFamily: "Arial, sans-serif",
            fontSize: "11px",
            backgroundColor: "#fff",
            color: "#000",
            border: "2px solid #000",
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          {/* Duplicate Warning Watermark */}
          {!receiptConfig.isOriginal && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-30deg)",
                fontSize: "48px",
                fontWeight: "bold",
                color: "rgba(255, 0, 0, 0.15)",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                zIndex: 0,
              }}
            >
              DUPLICATE COPY #{receiptConfig.version}
            </div>
          )}

          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "2px solid #000",
              paddingBottom: "8px",
              marginBottom: "10px",
            }}
          >
            {/* Logo & Name */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src="/logo.png"
                alt="Edwardian Academy"
                style={{
                  width: "55px",
                  height: "55px",
                  objectFit: "contain",
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#1a365d",
                  }}
                >
                  The EDWARDIAN'S ACADEMY
                </div>
                <div style={{ fontSize: "9px", color: "#c53030" }}>
                  Contact: 091-5601600 / 0334-5852326
                </div>
              </div>
            </div>

            {/* Version Badge */}
            <div
              style={{
                padding: "4px 12px",
                backgroundColor: receiptConfig.isOriginal ? "#38a169" : "#e53e3e",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "10px",
                borderRadius: "4px",
              }}
            >
              {receiptConfig.isOriginal
                ? "ORIGINAL RECEIPT"
                : `COPY #${receiptConfig.version}`}
            </div>

            {/* Receipt Info */}
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  border: "1px solid #000",
                  padding: "2px 8px",
                }}
              >
                S.No: {student.studentId}
              </div>
              <div style={{ fontSize: "9px", marginTop: "4px" }}>
                Date: {formatDate(student.admissionDate)}
              </div>
            </div>
          </div>

          {/* Main Content - 3 Column Layout */}
          <div
            style={{
              display: "flex",
              gap: "15px",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Left Column - Student Photo & Details */}
            <div style={{ flex: "1.5" }}>
              {/* Student Photo (if available) */}
              {(student.imageUrl || student.photo) && (
                <div style={{ float: "right", marginLeft: "10px", marginBottom: "8px" }}>
                  <img
                    src={student.imageUrl || student.photo}
                    alt={student.studentName}
                    style={{
                      width: "70px",
                      height: "80px",
                      objectFit: "cover",
                      border: "1px solid #000",
                    }}
                  />
                </div>
              )}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "11px",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: "4px 0",
                        fontWeight: "bold",
                        width: "100px",
                      }}
                    >
                      Name:
                    </td>
                    <td
                      style={{ padding: "4px 0", borderBottom: "1px solid #000" }}
                    >
                      {student.studentName}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", fontWeight: "bold" }}>
                      Father:
                    </td>
                    <td
                      style={{ padding: "4px 0", borderBottom: "1px solid #000" }}
                    >
                      {student.fatherName}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", fontWeight: "bold" }}>
                      Group:
                    </td>
                    <td style={{ padding: "4px 0" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          backgroundColor: student.group?.includes("Medical")
                            ? "#c53030"
                            : "#2b6cb0",
                          color: "#fff",
                          fontSize: "10px",
                          fontWeight: "bold",
                        }}
                      >
                        {student.group}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", fontWeight: "bold" }}>
                      Class:
                    </td>
                    <td
                      style={{ 
                        padding: "4px 0", 
                        borderBottom: "1px solid #000",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "150px",
                      }}
                    >
                      {student.class?.replace(/-/g, " ")}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0", fontWeight: "bold" }}>
                      Cell No:
                    </td>
                    <td
                      style={{ padding: "4px 0", borderBottom: "1px solid #000" }}
                    >
                      {student.parentCell || student.studentCell || "-"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Subjects */}
              {student.subjects && student.subjects.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: "10px",
                      marginBottom: "4px",
                    }}
                  >
                    Subjects:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {student.subjects.map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: "2px 6px",
                          backgroundColor: "#edf2f7",
                          border: "1px solid #cbd5e0",
                          fontSize: "9px",
                          borderRadius: "2px",
                        }}
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Center Column - Barcode */}
            <div
              style={{
                flex: "1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderLeft: "1px dashed #000",
                borderRight: "1px dashed #000",
                padding: "0 10px",
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                SMART GATE ID
              </div>
              <Barcode
                value={receiptConfig.receiptId}
                width={1.2}
                height={45}
                fontSize={9}
                margin={0}
                displayValue={true}
              />
              <div style={{ fontSize: "7px", color: "#666", marginTop: "4px" }}>
                Scan for entry verification
              </div>
            </div>

            {/* Right Column - Fee Status */}
            <div style={{ flex: "0.8", textAlign: "center" }}>
              <div
                style={{
                  padding: "8px",
                  border: "2px solid " + (isPaid ? "#38a169" : "#e53e3e"),
                  marginBottom: "8px",
                }}
              >
                <div style={{ fontSize: "9px", fontWeight: "bold" }}>
                  FEE STATUS
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: isPaid ? "#38a169" : "#e53e3e",
                  }}
                >
                  {isPaid ? "PAID" : "PENDING"}
                </div>
              </div>

              <table
                style={{
                  width: "100%",
                  fontSize: "9px",
                  borderCollapse: "collapse",
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ textAlign: "left", padding: "2px 0" }}>
                      Total:
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "bold" }}>
                      {formatCurrency(student.totalFee)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: "left", padding: "2px 0" }}>Paid:</td>
                    <td style={{ textAlign: "right", color: "#38a169" }}>
                      {formatCurrency(student.paidAmount)}
                    </td>
                  </tr>
                  <tr style={{ borderTop: "1px solid #000" }}>
                    <td
                      style={{
                        textAlign: "left",
                        padding: "2px 0",
                        fontWeight: "bold",
                      }}
                    >
                      Balance:
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: "bold",
                        color: balance > 0 ? "#e53e3e" : "#38a169",
                      }}
                    >
                      {formatCurrency(balance)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div
                style={{
                  marginTop: "12px",
                  borderTop: "1px solid #000",
                  paddingTop: "8px",
                }}
              >
                <div style={{ fontSize: "8px" }}>Signature</div>
                <div
                  style={{ borderBottom: "1px solid #000", height: "20px" }}
                ></div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: "0.25in",
              left: "0.25in",
              right: "0.25in",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #000",
              paddingTop: "6px",
              fontSize: "8px",
            }}
          >
            <div style={{ color: "#c53030", fontWeight: "bold" }}>
              ⚠️ FEE IS NON-REFUNDABLE IN ANY CASE
            </div>
            <div style={{ color: "#666" }}>
              Receipt ID: {receiptConfig.receiptId}
            </div>
            <div style={{ textAlign: "right" }}>
              <div>
                Address: Opposite Islamia College, Danishabad University Road,
                Peshawar
              </div>
              <div>facebook.com/theedwardiansacademy</div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

ReceiptTemplate.displayName = "ReceiptTemplate";

export default ReceiptTemplate;
