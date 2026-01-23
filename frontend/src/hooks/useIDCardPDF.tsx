import { useState, useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import JsBarcode from "jsbarcode";
import { toast } from "sonner";
import {
  StudentIDCardPDF,
  StudentIDData,
} from "@/components/print/StudentIDCardPDF";

/**
 * Generate a barcode as a Base64 Data URL using jsbarcode
 */
function generateBarcodeDataUrl(value: string): string {
  try {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, value, {
      format: "CODE128",
      width: 1.5,
      height: 35,
      displayValue: true,
      fontSize: 10,
      margin: 3,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Error generating barcode:", error);
    return "";
  }
}

/**
 * useIDCardPDF - Hook for generating Student ID Card PDFs
 *
 * Generates a compact CR80 size ID card with barcode
 * Opens the PDF in a new browser tab for printing
 */
export function useIDCardPDF() {
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Generate ID Card PDF and open in new tab
   */
  const generateIDCard = useCallback(async (student: StudentIDData) => {
    setIsGenerating(true);

    try {
      // Generate barcode
      const barcodeValue = student.barcodeId || student.studentId;
      const barcodeDataUrl = generateBarcodeDataUrl(barcodeValue);

      if (!barcodeDataUrl) {
        console.warn("Barcode generation failed");
      }

      // Create PDF document
      const pdfDoc = (
        <StudentIDCardPDF student={student} barcodeDataUrl={barcodeDataUrl} />
      );

      // Generate PDF blob
      const blob = await pdf(pdfDoc).toBlob();

      // Create object URL and open in new tab
      const pdfUrl = URL.createObjectURL(blob);
      const newTab = window.open(pdfUrl, "_blank");

      if (newTab) {
        newTab.document.title = `ID-Card-${student.studentId}`;
      } else {
        // Fallback: download if popup blocked
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `ID-Card-${student.studentId}.pdf`;
        link.click();
        toast.info("PDF downloaded", {
          description: "Pop-up was blocked. The PDF has been downloaded.",
        });
      }

      // Cleanup URL after delay
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);

      toast.success("ID Card generated", {
        description: student.studentName,
      });
    } catch (error: any) {
      console.error("Error generating ID card:", error);
      toast.error("Failed to generate ID card", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    isGenerating,
    generateIDCard,
  };
}

export type { StudentIDData };
