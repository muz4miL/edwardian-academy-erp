import { useState, useRef, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
    return `https://${codespaceBase}-5000.app.github.dev`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};
const API_BASE_URL = getApiBaseUrl();

interface StudentData {
  _id: string;
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
}

interface ReceiptConfig {
  receiptId: string;
  version: number;
  isOriginal: boolean;
  printedAt: Date | string;
}

interface PrintReceiptResult {
  student: StudentData;
  receiptConfig: ReceiptConfig;
}

type PrintReason = "admission" | "verification" | "reprint" | "lost";

/**
 * usePrintReceipt - Universal hook for printing student receipts
 *
 * Handles:
 * 1. Calling backend to generate unique receipt ID
 * 2. Tracking print version in database
 * 3. Triggering the print dialog
 */
export function usePrintReceipt() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<PrintReceiptResult | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Track print in backend and get unique receipt ID
  const trackPrint = useCallback(
    async (
      studentId: string,
      reason: PrintReason = "reprint",
    ): Promise<PrintReceiptResult | null> => {
      try {
        setIsPrinting(true);

        const response = await fetch(
          `${API_BASE_URL}/api/students/${studentId}/print`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              reason,
              printedBy: "System",
            }),
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to generate receipt");
        }

        const result = await response.json();

        const receiptData: PrintReceiptResult = {
          student: result.data.student,
          receiptConfig: {
            receiptId: result.data.receiptId,
            version: result.data.version,
            isOriginal: result.data.isOriginal,
            printedAt: result.data.printedAt,
          },
        };

        setPrintData(receiptData);
        return receiptData;
      } catch (error: any) {
        console.error("Error tracking print:", error);
        toast.error("Failed to generate receipt", {
          description: error.message,
        });
        return null;
      } finally {
        setIsPrinting(false);
      }
    },
    [],
  );

  // Print without tracking (for preview or already-tracked receipts)
  const printDirect = useCallback((data: PrintReceiptResult) => {
    setPrintData(data);
  }, []);

  // React-to-print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printData
      ? `Receipt-${printData.student.studentId}-V${printData.receiptConfig.version}`
      : "Receipt",
    onAfterPrint: () => {
      console.log("🖨️ Print completed");
      toast.success("Receipt printed successfully", {
        description: printData
          ? `${printData.student.studentName} - Version ${printData.receiptConfig.version}`
          : undefined,
      });
    },
    onPrintError: (error) => {
      console.error("Print error:", error);
      toast.error("Print failed", {
        description: "Please try again",
      });
    },
  });

  // Combined function: track + print
  const printReceipt = useCallback(
    async (studentId: string, reason: PrintReason = "reprint") => {
      const data = await trackPrint(studentId, reason);
      if (data) {
        setPrintData(data); // Ensure state is set

        // CRITICAL: Wait for React to update state and render barcode
        // Increased to 1000ms to be absolutely safe
        // This ensures the hidden DOM element is fully painted before print dialog grabs it
        setTimeout(() => {
          handlePrint();
        }, 1000);
      }
    },
    [trackPrint, handlePrint],
  );

  // Print with existing data (no tracking)
  const printWithData = useCallback(
    (data: PrintReceiptResult) => {
      setPrintData(data);
      setTimeout(() => {
        handlePrint();
      }, 1000); // Consistent 1s delay
    },
    [handlePrint],
  );

  return {
    printRef,
    printData,
    isPrinting,
    printReceipt,
    printWithData,
    trackPrint,
    triggerPrint: handlePrint,
  };
}

export type { StudentData, ReceiptConfig, PrintReceiptResult, PrintReason };
