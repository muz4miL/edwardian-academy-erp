import { forwardRef } from "react";

interface TeacherPaymentReceiptProps {
  voucherId: string;
  teacherName: string;
  subject: string;
  amountPaid: number;
  remainingBalance: number;
  paymentDate: Date;
  description?: string;
  sessionName?: string;
  compensationType?: string;
}

/**
 * Golden Receipt - Bank-Grade Payment Voucher
 * This component is hidden and only rendered during print via react-to-print
 */
export const TeacherPaymentReceipt = forwardRef<
  HTMLDivElement,
  TeacherPaymentReceiptProps
>(
  (
    {
      voucherId,
      teacherName,
      subject,
      amountPaid,
      remainingBalance,
      paymentDate,
      description,
      sessionName,
      compensationType,
    },
    ref,
  ) => {
    const balanceBeforePayment = remainingBalance + amountPaid;
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
        .format(amount)
        .replace("PKR", "PKR ");
    };

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    };

    return (
      <div
        ref={ref}
        className="hidden print:block"
        style={{
          width: "210mm",
          minHeight: "148mm", // A5 landscape height
          padding: "20mm",
          backgroundColor: "#ffffff",
          fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
          color: "#1a1a1a",
        }}
      >
        {/* Voucher Container with Golden Border */}
        <div
          style={{
            border: "3px solid #c9a227",
            borderRadius: "12px",
            padding: "24px",
            position: "relative",
            background:
              "linear-gradient(135deg, #fffef5 0%, #ffffff 50%, #fffef5 100%)",
          }}
        >
          {/* Corner Decorations */}
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              width: "30px",
              height: "30px",
              borderTop: "3px solid #c9a227",
              borderLeft: "3px solid #c9a227",
              borderRadius: "4px 0 0 0",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              width: "30px",
              height: "30px",
              borderTop: "3px solid #c9a227",
              borderRight: "3px solid #c9a227",
              borderRadius: "0 4px 0 0",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "8px",
              left: "8px",
              width: "30px",
              height: "30px",
              borderBottom: "3px solid #c9a227",
              borderLeft: "3px solid #c9a227",
              borderRadius: "0 0 0 4px",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "8px",
              right: "8px",
              width: "30px",
              height: "30px",
              borderBottom: "3px solid #c9a227",
              borderRight: "3px solid #c9a227",
              borderRadius: "0 0 4px 0",
            }}
          />

          {/* Header Section */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            {/* Logo */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <img
                src="/logo.png"
                alt="Genius Islamian's Academy"
                style={{
                  height: "60px",
                  width: "auto",
                  objectFit: "contain",
                }}
              />
            </div>

            {/* Academy Name */}
            <h1
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: "#1a1a1a",
                margin: "0 0 4px 0",
                letterSpacing: "1px",
              }}
            >
              GENIUS ISLAMIAN'S ACADEMY
            </h1>

            {/* Address */}
            <p
              style={{
                fontSize: "11px",
                color: "#666666",
                margin: "0 0 16px 0",
              }}
            >
              Excellence in Education | Lahore, Pakistan
            </p>

            {/* Voucher Title */}
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#c9a227",
                color: "#ffffff",
                padding: "8px 32px",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: "700",
                letterSpacing: "3px",
                textTransform: "uppercase",
              }}
            >
              PAYMENT VOUCHER
            </div>
          </div>

          {/* Voucher Number */}
          <div
            style={{
              textAlign: "right",
              marginBottom: "20px",
              fontSize: "12px",
              color: "#666666",
            }}
          >
            <span style={{ fontWeight: "600" }}>Voucher No:</span>{" "}
            <span
              style={{
                fontFamily: "monospace",
                color: "#1a1a1a",
                fontWeight: "700",
              }}
            >
              {voucherId}
            </span>
          </div>

          {/* Body Section */}
          <div
            style={{
              backgroundColor: "#fafafa",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            {/* Paid To Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                paddingBottom: "16px",
                borderBottom: "1px dashed #e0e0e0",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#888888",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Paid To
                </span>
                <p
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#1a1a1a",
                    margin: "4px 0 0 0",
                  }}
                >
                  {teacherName}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#666666",
                    margin: "2px 0 0 0",
                  }}
                >
                  {subject.charAt(0).toUpperCase() + subject.slice(1)} Teacher
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#888888",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Date
                </span>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1a1a1a",
                    margin: "4px 0 0 0",
                  }}
                >
                  {formatDate(paymentDate)}
                </p>
              </div>
            </div>

            {/* Amount Section */}
            <div
              style={{
                padding: "16px 0",
                marginBottom: "16px",
                borderBottom: "1px dashed #e0e0e0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#888888",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Balance Before
                  </span>
                  <p
                    style={{
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#ea580c",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {formatCurrency(balanceBeforePayment)}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#888888",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Amount Paid
                  </span>
                  <p
                    style={{
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#16a34a",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {formatCurrency(amountPaid)}
                  </p>
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  padding: "16px 0",
                  backgroundColor: "#f0fdf4",
                  borderRadius: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#888888",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Remaining Balance
                </span>
                <p
                  style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: remainingBalance > 0 ? "#ea580c" : "#16a34a",
                    margin: "8px 0 0 0",
                    letterSpacing: "1px",
                  }}
                >
                  {formatCurrency(remainingBalance)}
                </p>
              </div>
            </div>

            {/* Details Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              {sessionName && (
                <div style={{ flex: "1 1 45%" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#888888",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Session
                  </span>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#1a1a1a",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {sessionName}
                  </p>
                </div>
              )}
              {compensationType && (
                <div style={{ flex: "1 1 45%" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#888888",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Compensation Type
                  </span>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#1a1a1a",
                      margin: "4px 0 0 0",
                      textTransform: "capitalize",
                    }}
                  >
                    {compensationType}
                  </p>
                </div>
              )}
              {description && (
                <div style={{ flex: "1 1 100%" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#888888",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    Payment Notes
                  </span>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#1a1a1a",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Signature Section */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "40px",
              paddingTop: "20px",
            }}
          >
            <div style={{ width: "40%", textAlign: "center" }}>
              <div
                style={{
                  borderTop: "2px solid #1a1a1a",
                  paddingTop: "8px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    color: "#666666",
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Accountant Signature
                </p>
              </div>
            </div>
            <div style={{ width: "40%", textAlign: "center" }}>
              <div
                style={{
                  borderTop: "2px solid #1a1a1a",
                  paddingTop: "8px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    color: "#666666",
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Receiver Signature
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #e5e5e5",
            }}
          >
            <p
              style={{
                fontSize: "10px",
                color: "#999999",
                margin: 0,
              }}
            >
              This is a computer-generated voucher. Valid without signature for
              amounts under PKR 50,000.
            </p>
          </div>
        </div>
      </div>
    );
  },
);

TeacherPaymentReceipt.displayName = "TeacherPaymentReceipt";

export default TeacherPaymentReceipt;
