import { useState, useCallback } from "react";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import {
  TeacherPaymentVoucherPDF,
  TeacherVoucherData,
} from "@/components/print/TeacherPaymentVoucherPDF";

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
 * useTeacherPaymentPDF - Hook for generating Teacher Payment Voucher PDFs
 *
 * Uses @react-pdf/renderer to create bank-grade payment vouchers.
 * Opens the generated PDF in a new browser tab for printing/saving.
 */
export function useTeacherPaymentPDF() {
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Generate PDF blob and open in new tab
   */
  const generateVoucherPDF = useCallback(
    async (data: TeacherVoucherData): Promise<void> => {
      setIsGenerating(true);

      try {
        // Load logo as data URL if not cached
        if (!cachedLogoDataUrl) {
          cachedLogoDataUrl = await loadLogoAsDataUrl();
        }

        console.log(`📄 Generating payment voucher: ${data.voucherId}`);

        // Create PDF document
        const pdfDoc = (
          <TeacherPaymentVoucherPDF
            data={data}
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
          newTab.document.title = `Payment_Voucher_${data.teacherName.replace(/\s+/g, "_")}_${data.voucherId}`;
        } else {
          // Fallback: download the file if popup blocked
          const link = document.createElement("a");
          link.href = pdfUrl;
          link.download = `Payment_Voucher_${data.teacherName.replace(/\s+/g, "_")}_${data.voucherId}.pdf`;
          link.click();
          toast.info("PDF downloaded", {
            description:
              "Pop-up was blocked. The PDF has been downloaded instead.",
          });
        }

        // Cleanup URL after a delay
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);

        toast.success("Voucher generated successfully", {
          description: `${data.teacherName} - ${data.voucherId}`,
        });
      } catch (error: any) {
        console.error("Error generating voucher PDF:", error);
        toast.error("Failed to generate voucher", {
          description: error.message || "Please try again",
        });
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return {
    isGenerating,
    generateVoucherPDF,
  };
}

export default useTeacherPaymentPDF;
