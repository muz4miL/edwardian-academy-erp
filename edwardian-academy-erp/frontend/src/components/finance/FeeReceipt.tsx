import { forwardRef } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeeReceiptProps {
  receiptNumber: string;
  studentName: string;
  fatherName: string;
  studentId?: string;
  className: string;
  subject: string;
  professorName: string;
  amount: number;
  month: string;
  date: string;
  collectedBy?: string;
  studentPhone?: string;
  time?: string;
  seatNo?: string;
  splitBreakdown?: {
    teacherShare: number;
    academyShare: number;
    teacherPercentage: number;
    academyPercentage: number;
  };
  showSplit?: boolean;
  onPrint?: () => void;
}

// Printable Fee Receipt - Matches Genius Islamian's Academy physical paper format EXACTLY
// Red & Black branded with shield logo
const FeeReceipt = forwardRef<HTMLDivElement, FeeReceiptProps>(
  (
    {
      receiptNumber,
      studentName,
      fatherName,
      studentId,
      className,
      subject,
      professorName,
      amount,
      month,
      date,
      collectedBy,
      studentPhone,
      time,
      seatNo,
      splitBreakdown,
      showSplit = false,
      onPrint,
    },
    ref,
  ) => {
    // Extract just the number part for S.No display (e.g., "2766" from "FEE-202601-2766")
    const serialNumber =
      receiptNumber?.match(/\d+$/)?.[0] || receiptNumber?.slice(-4) || "----";

    return (
      <div className="space-y-4">
        {/* Receipt Card - Landscape Style matching physical form */}
        <div
          ref={ref}
          className="relative bg-white w-full max-w-[700px] mx-auto shadow-lg print:shadow-none overflow-hidden"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        >
          {/* Top Red Border */}
          <div className="h-2 bg-red-700" />

          {/* Main Content with Left Red Border */}
          <div className="flex">
            {/* Left Red Accent */}
            <div className="w-2 bg-red-700" />

            {/* Content Area */}
            <div className="flex-1 p-5">
              {/* Watermark Logo */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none"
                aria-hidden="true"
              >
                <div className="w-64 h-64 rounded-full border-[10px] border-red-700 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-2xl font-serif italic text-red-700">
                      Genius
                    </span>
                    <br />
                    <span className="text-3xl font-bold text-red-700">
                      ISLAMIAN'S
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Row */}
              <div className="relative z-10 flex items-start justify-between mb-4">
                {/* Left: Logo + Title */}
                <div className="flex items-center gap-3">
                  {/* Academy Emblem */}
                  <div className="w-16 h-16 rounded-full border-2 border-red-700 flex items-center justify-center bg-gradient-to-b from-red-50 to-white flex-shrink-0">
                    <img
                      src="/logo.png"
                      alt="Genius Islamian's Academy"
                      className="w-12 h-12 object-contain"
                    />
                  </div>

                  {/* Title */}
                  <div>
                    <h1 className="text-2xl font-bold leading-tight">
                      <span className="text-red-700 font-serif italic">
                        Genius{" "}
                      </span>
                      <span className="text-red-700 tracking-wide">
                        ISLAMIAN'S{" "}
                      </span>
                      <span className="text-gray-900">Academy</span>
                    </h1>
                    {/* Contact in Red */}
                    <p className="text-red-600 font-semibold text-sm mt-0.5">
                      Contact: 091-5601600 / 0334-5852326
                    </p>
                  </div>
                </div>

                {/* Right: S.No Box (matching physical form style) */}
                <div className="text-right">
                  <div className="inline-block border-2 border-gray-800 bg-white">
                    <div className="px-2 py-0.5 border-b border-gray-400 text-xs font-semibold text-gray-600">
                      S.No.
                    </div>
                    <div className="px-4 py-2 text-2xl font-bold text-gray-900 min-w-[80px] text-center">
                      {serialNumber}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Fields - 2 Column Layout like physical form */}
              <div className="relative z-10 grid grid-cols-2 gap-x-8 gap-y-2 text-sm border-t border-gray-300 pt-4">
                {/* Left Column */}
                <div className="space-y-2">
                  {/* Professor Row */}
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-20">
                      Professor:
                    </span>
                    <span className="flex-1 border-b border-gray-400 px-2 py-0.5 uppercase font-bold text-red-800">
                      {professorName || "—"}
                    </span>
                  </div>

                  {/* Name Row */}
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-20">
                      Name:
                    </span>
                    <span className="flex-1 border-b border-gray-400 px-2 py-0.5">
                      {studentName}
                    </span>
                  </div>

                  {/* Father Row */}
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-20">
                      Father:
                    </span>
                    <span className="flex-1 border-b border-gray-400 px-2 py-0.5">
                      {fatherName}
                    </span>
                  </div>

                  {/* Subject Row with Yellow Highlight */}
                  <div className="flex items-center mt-2">
                    <span className="font-semibold text-gray-700 w-20">
                      Subject:
                    </span>
                    <span className="bg-yellow-400 px-4 py-1 font-bold uppercase border border-gray-800 shadow-sm">
                      {subject || "—"}
                    </span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  {/* TIME Row */}
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-20">
                      TIME:
                    </span>
                    <span className="flex-1 border-b border-gray-400 px-2 py-0.5">
                      {time || "—"}
                    </span>
                  </div>

                  {/* Seat No Row */}
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-20">
                      Seat No.:
                    </span>
                    <span className="flex-1 border-b border-gray-400 px-2 py-0.5">
                      {seatNo || studentId || "—"}
                    </span>
                  </div>

                  {/* Student Cell Row */}
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-20">
                      Cell#:
                    </span>
                    <span className="flex-1 border-b border-gray-400 px-2 py-0.5">
                      {studentPhone || "—"}
                    </span>
                  </div>

                  {/* Class Row with boxes */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-semibold text-gray-700">Class:</span>
                    <div className="flex gap-2">
                      <span
                        className={`px-3 py-1 border border-gray-400 text-xs ${className?.toLowerCase().includes("first") ? "bg-yellow-200 font-bold" : "bg-white"}`}
                      >
                        First Year
                      </span>
                      <span
                        className={`px-3 py-1 border border-gray-400 text-xs ${className?.toLowerCase().includes("second") ? "bg-yellow-200 font-bold" : "bg-white"}`}
                      >
                        Second Year
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Section */}
              <div className="relative z-10 mt-4 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-3 border border-green-300 rounded">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Month:</span>
                  <span className="font-bold text-lg">{month}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Amount:</span>
                  <span className="font-bold text-2xl text-green-700">
                    Rs. {amount?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Split Breakdown (internal use) */}
              {showSplit && splitBreakdown && (
                <div className="relative z-10 mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
                  <div className="flex justify-between">
                    <span>Teacher ({splitBreakdown.teacherPercentage}%):</span>
                    <span className="font-semibold">
                      Rs. {splitBreakdown.teacherShare?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Academy ({splitBreakdown.academyPercentage}%):</span>
                    <span className="font-semibold">
                      Rs. {splitBreakdown.academyShare?.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Footer Row */}
              <div className="relative z-10 mt-4 pt-3 border-t border-gray-300 flex justify-between items-end">
                {/* Left: Non-Refundable Box */}
                <div className="border-2 border-red-600 px-3 py-2 bg-red-50">
                  <p className="text-[10px] font-bold text-red-700 uppercase leading-tight">
                    FEE IS NON-REFUNDABLE
                  </p>
                  <p className="text-[10px] font-bold text-red-700 uppercase leading-tight">
                    IN ANY CASE
                  </p>
                </div>

                {/* Right: Signature */}
                <div className="text-center">
                  <div className="border-t border-gray-800 w-32 mb-1" />
                  <p className="text-xs text-gray-600">Signature</p>
                </div>
              </div>

              {/* Bottom Address */}
              <div className="relative z-10 text-center text-[9px] text-gray-500 mt-3 pt-2 border-t border-gray-200">
                <p>
                  Address: Opposite Islamia College Behind, Danishabad
                  University Road Peshawar
                </p>
                <p className="mt-0.5">
                  Email: geniusislamians@gmail.com |
                  www.facebook.com/geniusislamians
                </p>
                <p className="text-[8px] text-gray-400 mt-1 italic">
                  Can't Be Used For Legal Purpose
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Red Border */}
          <div className="h-1 bg-red-600" />
        </div>

        {/* Print Button */}
        {onPrint && (
          <div className="flex justify-center print:hidden">
            <Button onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          </div>
        )}
      </div>
    );
  },
);

FeeReceipt.displayName = "FeeReceipt";

export default FeeReceipt;
export { FeeReceipt };
