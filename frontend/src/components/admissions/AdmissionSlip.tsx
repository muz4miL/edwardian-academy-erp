import { useRef } from "react";

interface AdmissionSlipProps {
    student: {
        studentId: string;
        studentName: string;
        fatherName: string;
        class: string;
        group: string;
        subjects?: Array<{ name: string; fee: number }>;
        totalFee: number;
        paidAmount: number;
        admissionDate: string;
        sessionRef?: any;
    };
    session?: {
        sessionName: string;
    };
}

export const AdmissionSlip = ({ student, session }: AdmissionSlipProps) => {
    const printRef = useRef<HTMLDivElement>(null);

    const balance = Math.max(0, student.totalFee - student.paidAmount);
    const admissionDateFormatted = new Date(student.admissionDate).toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div ref={printRef} className="print-slip hidden print:block">
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        @media print {
          body * {
            visibility: hidden;
          }
          .print-slip, .print-slip * {
            visibility: visible;
          }
          .print-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
        
        .print-slip {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          font-weight: 900;
          color: rgba(14, 165, 233, 0.03);
          z-index: 0;
          pointer-events: none;
          white-space: nowrap;
          letter-spacing: 8px;
        }
        
        .content-wrapper {
          position: relative;
          z-index: 1;
        }
        
        .hairline {
          border-width: 0.5px;
        }
      `}</style>

            <div className="max-w-4xl mx-auto p-8 bg-white relative">
                {/* Watermark */}
                <div className="watermark">ACADEMY</div>

                <div className="content-wrapper">
                    {/* Two-Column Header */}
                    <div className="flex justify-between items-start mb-8 pb-8 hairline border-b border-slate-200">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-1" style={{ letterSpacing: '-0.5px' }}>
                                Academy Management System
                            </h1>
                            <p className="text-sm text-gray-600 italic mb-1">Shaping Futures in Peshawar</p>
                            <p className="text-xs text-gray-500">Peshawar, Khyber Pakhtunkhwa</p>
                        </div>
                        {/* Vertical Divider */}
                        <div className="h-20 w-px bg-slate-300 mx-6"></div>
                        <div className="text-right">
                            <div className="inline-block px-4 py-2 bg-sky-600 text-white rounded">
                                <p className="text-xs font-semibold tracking-wider">OFFICIAL RECEIPT</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Admission Confirmation</p>
                        </div>
                    </div>

                    {/* Student ID Section */}
                    <div className="mb-8 bg-gradient-to-r from-sky-50 to-blue-50 hairline border border-slate-200 rounded-lg p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mb-1">Student ID</p>
                                <p className="text-2xl font-bold text-indigo-700 font-mono">{student.studentId}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mb-1">Issue Date</p>
                                <p className="text-sm font-semibold text-indigo-900">{admissionDateFormatted}</p>
                            </div>
                        </div>
                    </div>

                    {/* Student Profile Section */}
                    <div className="mb-8">
                        <div className="hairline border border-slate-200 rounded-lg overflow-hidden">
                            <div className="bg-slate-50 px-5 py-3 hairline border-b border-slate-200">
                                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-[0.1em]">Student Profile</h2>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mb-1">Student Name</p>
                                        <p className="text-sm font-semibold text-indigo-900">{student.studentName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mb-1">Father's Name</p>
                                        <p className="text-sm font-semibold text-indigo-900">{student.fatherName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mb-1">Class</p>
                                        <p className="text-sm font-semibold text-indigo-900">{student.class}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mb-1">Group</p>
                                        <p className="text-sm font-semibold text-indigo-900">{student.group}</p>
                                    </div>
                                    {session && (
                                        <div className="col-span-2">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] mb-1">Academic Session</p>
                                            <p className="text-sm font-semibold text-indigo-900">{session.sessionName}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enrolled Subjects */}
                    {student.subjects && student.subjects.length > 0 && (
                        <div className="mb-6">
                            <div className="hairline border border-gray-300 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 hairline border-b border-gray-300">
                                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Enrolled Subjects</h2>
                                </div>
                                <div className="p-4">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="hairline border-b border-gray-200">
                                                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide pb-2">Subject</th>
                                                <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wide pb-2">Fee (PKR)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {student.subjects.map((subject, index) => (
                                                <tr key={index} className={`hairline border-b border-gray-100 ${index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                                                    <td className="py-2 text-sm text-gray-800">{subject.name}</td>
                                                    <td className="py-2 text-sm text-right font-semibold text-gray-900">{subject.fee.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment Breakdown */}
                    <div className="mb-8">
                        <div className="hairline border border-gray-300 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 hairline border-b border-gray-300">
                                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Payment Breakdown</h2>
                            </div>
                            <div className="p-4">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center pb-3 hairline border-b border-gray-200">
                                        <span className="text-sm text-gray-600 font-medium">Total Fee</span>
                                        <span className="text-lg font-bold text-gray-900">{student.totalFee.toLocaleString()} PKR</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 hairline border-b border-gray-200">
                                        <span className="text-sm text-gray-600 font-medium">Amount Paid</span>
                                        <span className="text-lg font-bold text-green-600">{student.paidAmount.toLocaleString()} PKR</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-sm text-gray-700 font-semibold">Outstanding Balance</span>
                                        <span className={`text-xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {balance.toLocaleString()} PKR
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Signature Section */}
                    <div className="flex justify-between items-end mb-8 pt-8">
                        <div className="text-center">
                            <div className="w-48 hairline border-t border-gray-900 mb-2"></div>
                            <p className="text-xs text-gray-600 font-medium">Student/Parent Signature</p>
                        </div>
                        <div className="text-center">
                            <div className="w-48 hairline border-t border-gray-900 mb-2"></div>
                            <p className="text-xs text-gray-600 font-medium">Authorized Signature</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="hairline border-t border-gray-300 pt-4">
                        <div className="text-center space-y-1">
                            <p className="text-xs text-gray-600 font-medium">This is a computer-generated document. No signature required.</p>
                            <p className="text-xs text-gray-500">For inquiries, contact academy administration.</p>
                            <p className="text-xs text-gray-400 mt-2">
                                Generated: {new Date().toLocaleDateString('en-PK', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
