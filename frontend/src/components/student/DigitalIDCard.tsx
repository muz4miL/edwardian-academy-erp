import Barcode from "react-barcode";
import { Shield, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIDCardPDF } from "@/hooks/useIDCardPDF";

interface DigitalIDCardProps {
  student: {
    studentId: string;
    barcodeId?: string;
    studentName: string;
    fatherName: string;
    class: string;
    group: string;
    admissionDate: string | Date;
    studentStatus?: string;
  };
}

export const DigitalIDCard = ({ student }: DigitalIDCardProps) => {
  const { isGenerating, generateIDCard } = useIDCardPDF();

  const handlePrintIDCard = () => {
    generateIDCard(student);
  };

  const displayId = student.barcodeId || student.studentId;

  return (
    <div className="space-y-6">
      {/* Digital ID Card - Vertical */}
      <Card className="max-w-sm mx-auto bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white border-2 border-indigo-400 shadow-2xl">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-center border-b-2 border-indigo-400">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold">
                EA
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold leading-tight">
                  THE EDWARDIAN'S
                </h3>
                <p className="text-xs opacity-90">ACADEMY</p>
              </div>
            </div>
            <p className="text-[10px] opacity-80">
              Student Identification Card
            </p>
          </div>

          {/* Photo Placeholder */}
          <div className="flex justify-center py-6 bg-gradient-to-b from-slate-800 to-slate-900">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-4 border-white shadow-xl">
              <span className="text-5xl font-bold">
                {student.studentName?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Student Details */}
          <div className="px-6 py-4 space-y-3 bg-slate-900/50">
            <div className="text-center border-b border-indigo-400/30 pb-3">
              <p className="text-xs text-indigo-300 uppercase tracking-wider mb-1">
                Student Name
              </p>
              <p className="text-lg font-bold">{student.studentName}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">
                  Father's Name
                </p>
                <p className="font-semibold text-xs">{student.fatherName}</p>
              </div>
              <div>
                <p className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">
                  Student ID
                </p>
                <p className="font-mono font-bold text-xs text-yellow-400">
                  {displayId}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">
                  Class
                </p>
                <p className="font-semibold text-xs">{student.class}</p>
              </div>
              <div>
                <p className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">
                  Group
                </p>
                <p className="font-semibold text-xs">{student.group}</p>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-[10px] text-indigo-300 uppercase tracking-wider mb-1">
                Valid From
              </p>
              <p className="text-xs font-semibold">
                {new Date(student.admissionDate).toLocaleDateString("en-PK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-center">
            <p className="text-[9px] opacity-90">
              📞 091-5601600 • 0334-5852326
            </p>
            <p className="text-[8px] opacity-75">
              Opposite Islamia College, Danishabad, Peshawar
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Primary Barcode Section */}
      <Card className="max-w-sm mx-auto">
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-indigo-600 mb-2">
            <Shield className="h-5 w-5" />
            <h3 className="text-lg font-bold">Security Barcode</h3>
          </div>

          <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
            <Barcode
              value={displayId}
              width={2}
              height={80}
              fontSize={14}
              margin={10}
              displayValue={true}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Scan this barcode for entry verification and attendance tracking
          </p>

          <Button
            onClick={handlePrintIDCard}
            disabled={isGenerating}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Print ID Card"}
          </Button>
        </CardContent>
      </Card>

      {/* PDF ID Card is now generated programmatically - no hidden DOM template needed */}
    </div>
  );
};
