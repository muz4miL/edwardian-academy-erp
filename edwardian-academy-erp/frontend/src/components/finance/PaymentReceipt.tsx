import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle } from "lucide-react";
import { useRef } from "react";

interface PaymentReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  voucherData: {
    voucherId: string;
    teacherName: string;
    subject: string;
    amountPaid: number;
    month: string;
    year: number;
    paymentDate: string;
    paymentMethod: string;
  } | null;
}

export const PaymentReceipt = ({ isOpen, onClose, voucherData }: PaymentReceiptProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!voucherData) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Voucher - ${voucherData.voucherId}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              background: white;
            }
            .receipt-container {
              max-width: 700px;
              margin: 0 auto;
              border: 2px solid #000;
              padding: 30px;
            }
            .header {
              text-align: center;
              border-bottom: 3px double #000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .header p {
              font-size: 14px;
              color: #666;
            }
            .voucher-id {
              background: #f3f4f6;
              padding: 10px;
              text-align: center;
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 25px;
              border: 1px dashed #000;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .detail-item {
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 8px;
            }
            .detail-label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .detail-value {
              font-size: 16px;
              font-weight: 600;
              margin-top: 4px;
            }
            .amount-section {
              background: #10b981;
              color: white;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
              border-radius: 8px;
            }
            .amount-section .label {
              font-size: 14px;
              opacity: 0.9;
            }
            .amount-section .amount {
              font-size: 32px;
              font-weight: bold;
              margin-top: 5px;
            }
            .signature-section {
              margin-top: 60px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
            }
            .signature-box {
              text-align: center;
            }
            .signature-line {
              border-top: 2px solid #000;
              margin-bottom: 8px;
              padding-top: 5px;
            }
            .signature-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 11px;
              color: #9ca3af;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[520px] p-0">
        <DialogHeader className="px-5 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Payment Voucher Generated
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="px-5 pb-4">
          <div className="receipt-container border-2 border-gray-900 p-4 bg-white">
            {/* Compact Header */}
            <div className="header text-center border-b-2 border-gray-900 pb-3 mb-4">
              <h1 className="text-lg font-bold mb-0.5">Academy Management System</h1>
              <p className="text-[10px] text-gray-600">Peshawar, Khyber Pakhtunkhwa</p>
              <p className="text-[10px] text-gray-600 font-medium">Teacher Payment Voucher</p>
            </div>

            {/* Voucher ID - Compact */}
            <div className="voucher-id bg-gray-100 border border-dashed border-gray-900 p-2 text-center font-bold text-sm mb-4">
              Voucher ID: {voucherData.voucherId}
            </div>

            {/* Details Grid - Compact */}
            <div className="details-grid grid grid-cols-2 gap-3 mb-4">
              <div className="detail-item border-b border-gray-300 pb-1.5">
                <div className="detail-label text-[9px] text-gray-500 uppercase tracking-wide">Teacher Name</div>
                <div className="detail-value text-sm font-semibold mt-0.5">{voucherData.teacherName}</div>
              </div>
              <div className="detail-item border-b border-gray-300 pb-1.5">
                <div className="detail-label text-[9px] text-gray-500 uppercase tracking-wide">Subject</div>
                <div className="detail-value text-sm font-semibold mt-0.5 capitalize">{voucherData.subject}</div>
              </div>
              <div className="detail-item border-b border-gray-300 pb-1.5">
                <div className="detail-label text-[9px] text-gray-500 uppercase tracking-wide">Payment Period</div>
                <div className="detail-value text-sm font-semibold mt-0.5">{voucherData.month} {voucherData.year}</div>
              </div>
              <div className="detail-item border-b border-gray-300 pb-1.5">
                <div className="detail-label text-[9px] text-gray-500 uppercase tracking-wide">Payment Date</div>
                <div className="detail-value text-sm font-semibold mt-0.5">
                  {new Date(voucherData.paymentDate).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
              </div>
              <div className="detail-item border-b border-gray-300 pb-1.5 col-span-2">
                <div className="detail-label text-[9px] text-gray-500 uppercase tracking-wide">Payment Method</div>
                <div className="detail-value text-sm font-semibold mt-0.5 capitalize">{voucherData.paymentMethod}</div>
              </div>
            </div>

            {/* Amount Section - Compact */}
            <div className="amount-section bg-green-600 text-white p-4 text-center rounded-lg my-4">
              <div className="label text-xs opacity-90">Amount Paid</div>
              <div className="amount text-3xl font-bold mt-1">PKR {voucherData.amountPaid.toLocaleString()}</div>
            </div>

            {/* Signature Section - Compact */}
            <div className="signature-section grid grid-cols-2 gap-6 mt-6">
              <div className="signature-box text-center">
                <div className="signature-line border-t-2 border-gray-900 pt-1.5 mb-1"></div>
                <div className="signature-label text-[9px] text-gray-600 uppercase">Teacher's Signature</div>
              </div>
              <div className="signature-box text-center">
                <div className="signature-line border-t-2 border-gray-900 pt-1.5 mb-1"></div>
                <div className="signature-label text-[9px] text-gray-600 uppercase">Authorized By (Admin)</div>
              </div>
            </div>

            {/* Footer - Compact */}
            <div className="footer mt-6 pt-3 border-t border-gray-300 text-center text-[9px] text-gray-500">
              <p>This is a computer-generated voucher. Please retain for your records.</p>
              <p className="mt-0.5">For queries, contact academy administration.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 px-5 pb-4 no-print">
          <Button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-9"
            size="sm"
          >
            <Printer className="mr-2 h-3.5 w-3.5" />
            Print Receipt
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-9"
            size="sm"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
