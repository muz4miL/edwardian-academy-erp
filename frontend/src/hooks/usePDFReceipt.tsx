import { useState, useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import JsBarcode from "jsbarcode";
import { toast } from "sonner";
import {
  ReceiptPDF,
  StudentPDFData,
  ReceiptPDFConfig,
} from "@/components/print/ReceiptPDF";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type PrintReason = "admission" | "verification" | "reprint" | "lost";

interface PrintReceiptResult {
  student: StudentPDFData;
  receiptConfig: ReceiptPDFConfig;
}

/**
 * Generate a barcode as a Base64 Data URL using jsbarcode
 *
 * This creates a temporary canvas, renders the barcode, and returns the data URL.
 */
function generateBarcodeDataUrl(value: string): string {
  try {
    // Create an offscreen canvas
    const canvas = document.createElement("canvas");

    // Generate barcode on canvas - Use CODE39 for scanner compatibility
    JsBarcode(canvas, value, {
      format: "CODE39",
      width: 2,
      height: 40,
      displayValue: true,
      fontSize: 12,
      margin: 5,
      background: "#ffffff",
      lineColor: "#000000",
    });

    // Convert canvas to base64 data URL
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Error generating barcode:", error);
    return "";
  }
}

/**
 * Load logo image and convert to Base64 Data URL
 * This is needed because react-pdf cannot load images from public paths directly
 */
async function loadLogoAsDataUrl(): Promise<string> {
  try {
    const response = await fetch("/logo.png");
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading logo:", error);
    return "";
  }
}

// Cache the logo data URL to avoid repeated fetches
let cachedLogoDataUrl: string | null = null;

/**
 * usePDFReceipt - Universal hook for generating PDF receipts
 *
 * Replaces the react-to-print implementation with @react-pdf/renderer.
 * Opens the generated PDF in a new browser tab for printing/saving.
 *
 * Features:
 * 1. Calls backend to generate unique receipt ID and track prints
 * 2. Generates barcode as Base64 image using jsbarcode
 * 3. Creates PDF using @react-pdf/renderer
 * 4. Opens PDF in new tab (no DOM visibility issues)
 */
export function usePDFReceipt() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<PrintReceiptResult | null>(null);

  /**
   * Track print in backend and get unique receipt ID
   */
  const trackPrint = useCallback(
    async (
      studentId: string,
      reason: PrintReason = "reprint",
    ): Promise<PrintReceiptResult | null> => {
      try {
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

        return receiptData;
      } catch (error: any) {
        console.error("Error tracking print:", error);
        throw error;
      }
    },
    [],
  );

  /**
   * Generate PDF blob and open in new tab
   */
  const generateAndOpenPDF = useCallback(
    async (data: PrintReceiptResult): Promise<void> => {
      try {
        // Generate barcode as Base64 data URL
        // CRITICAL: Use studentId (numeric like "260011") NOT MongoDB _id or receiptId
        // This ensures scanner compatibility with CODE39 format
        const barcodeValue =
          data.student.studentId || data.receiptConfig.receiptId;
        const barcodeDataUrl = generateBarcodeDataUrl(barcodeValue);

        if (!barcodeDataUrl) {
          console.warn("Barcode generation failed, proceeding without barcode");
        }

        // Load logo as data URL if not cached
        if (!cachedLogoDataUrl) {
          cachedLogoDataUrl = await loadLogoAsDataUrl();
        }

        console.log(`🔢 Barcode generated for: ${barcodeValue}`);

        // Create PDF document
        const pdfDoc = (
          <ReceiptPDF
            student={data.student}
            receiptConfig={data.receiptConfig}
            barcodeDataUrl={barcodeDataUrl}
            logoDataUrl={cachedLogoDataUrl}
          />
        );

        // Generate PDF blob
        const blob = await pdf(pdfDoc).toBlob();

        // Create object URL and open in new tab
        const pdfUrl = URL.createObjectURL(blob);
        const newTab = window.open(pdfUrl, "_blank");

        if (newTab) {
          // Set tab title for clarity
          newTab.document.title = `Receipt-${data.student.studentId}-V${data.receiptConfig.version}`;
        } else {
          // Fallback: download the file if popup blocked
          const link = document.createElement("a");
          link.href = pdfUrl;
          link.download = `Receipt-${data.student.studentId}-V${data.receiptConfig.version}.pdf`;
          link.click();
          toast.info("PDF downloaded", {
            description:
              "Pop-up was blocked. The PDF has been downloaded instead.",
          });
        }

        // Cleanup URL after a delay
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
      } catch (error) {
        console.error("Error generating PDF:", error);
        throw error;
      }
    },
    [],
  );

  /**
   * Main function: Track print + Generate PDF + Open in new tab
   */
  const generatePDF = useCallback(
    async (studentId: string, reason: PrintReason = "reprint") => {
      setIsPrinting(true);

      try {
        // Step 1: Track print and get receipt data
        const data = await trackPrint(studentId, reason);

        if (!data) {
          throw new Error("Failed to get receipt data");
        }

        setPrintData(data);

        // Step 2: Generate and open PDF
        await generateAndOpenPDF(data);

        toast.success("Receipt generated successfully", {
          description: `${data.student.studentName} - Version ${data.receiptConfig.version}`,
        });
      } catch (error: any) {
        console.error("Error in generatePDF:", error);
        toast.error("Failed to generate receipt", {
          description: error.message || "Please try again",
        });
      } finally {
        setIsPrinting(false);
      }
    },
    [trackPrint, generateAndOpenPDF],
  );

  /**
   * Generate PDF with existing data (no tracking)
   */
  const generatePDFWithData = useCallback(
    async (data: PrintReceiptResult) => {
      setIsPrinting(true);

      try {
        setPrintData(data);
        await generateAndOpenPDF(data);

        toast.success("Receipt generated successfully", {
          description: `${data.student.studentName} - Version ${data.receiptConfig.version}`,
        });
      } catch (error: any) {
        console.error("Error in generatePDFWithData:", error);
        toast.error("Failed to generate receipt", {
          description: error.message || "Please try again",
        });
      } finally {
        setIsPrinting(false);
      }
    },
    [generateAndOpenPDF],
  );

  return {
    isPrinting,
    printData,
    generatePDF,
    generatePDFWithData,
    trackPrint,
  };
}

export type {
  StudentPDFData,
  ReceiptPDFConfig,
  PrintReceiptResult,
  PrintReason,
};
