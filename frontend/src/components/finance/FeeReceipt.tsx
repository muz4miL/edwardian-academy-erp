import { GraduationCap, Printer, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReceiptProps {
  receiptNo: string;
  date: string;
  studentName: string;
  fatherName: string;
  className: string;
  group: string;
  subjects: string[];
  teacherName: string;
  phoneNo: string;
  totalFee: number;
  amountReceived: number;
  balance: number;
}

export function FeeReceipt({
  receiptNo,
  date,
  studentName,
  fatherName,
  className,
  group,
  subjects,
  teacherName,
  phoneNo,
  totalFee,
  amountReceived,
  balance,
}: ReceiptProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-card p-6 card-shadow">
      {/* Header */}
      <div className="border-b-2 border-dashed border-border pb-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Academy Name</h2>
            <p className="text-sm text-muted-foreground">
              Excellence in Education
            </p>
          </div>
        </div>
        <div className="mt-3 inline-block rounded-full bg-primary px-4 py-1">
          <span className="text-sm font-medium text-primary-foreground">
            Fee Receipt
          </span>
        </div>
      </div>

      {/* Receipt Details */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-b-2 border-dashed border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Receipt No:</span>
          <span className="font-medium text-foreground">{receiptNo}</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{date}</span>
        </div>
      </div>

      {/* Student Info */}
      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Student Name</p>
            <p className="font-medium text-foreground">{studentName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Father's Name</p>
            <p className="font-medium text-foreground">{fatherName}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Class</p>
            <p className="font-medium text-foreground">{className}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Group</p>
            <p className="font-medium text-foreground">{group}</p>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{phoneNo}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Subjects</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {subjects.map((subject) => (
              <span
                key={subject}
                className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Teacher</p>
          <p className="font-medium text-foreground">{teacherName}</p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="mt-4 rounded-lg bg-secondary p-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Fee:</span>
            <span className="font-medium text-foreground">
              PKR {totalFee.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-success">Amount Received:</span>
            <span className="font-bold text-success">
              PKR {amountReceived.toLocaleString()}
            </span>
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Balance:</span>
              <span className="font-bold text-destructive">
                PKR {balance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t-2 border-dashed border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Thank you for choosing our academy!
        </p>
        <Button variant="outline" size="sm">
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}
