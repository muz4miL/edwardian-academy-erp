import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, DollarSign, Wallet, Eye, Printer, UserPlus } from "lucide-react";

interface AdmissionSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentData: any;
    onNavigateToStudents: () => void;
    onPrintReceipt: () => void; // Unified: Print admission slip with barcode
    onNewAdmission: () => void;
}

export const AdmissionSuccessModal = ({
    isOpen,
    onClose,
    studentData,
    onNavigateToStudents,
    onPrintReceipt,
    onNewAdmission,
}: AdmissionSuccessModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[420px] p-0 bg-white/95 backdrop-blur-xl border-2 border-sky-100 shadow-2xl">
                {/* Ultra-Compact Header - Horizontal Layout */}
                <div className="bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600 px-5 py-4 relative overflow-hidden rounded-t-xl">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full -ml-10 -mb-10"></div>

                    <div className="relative z-10 flex items-center gap-3">
                        {/* Success Checkmark */}
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 shadow-md flex-shrink-0">
                            <CheckCircle2 className="h-7 w-7 text-white" strokeWidth={2.5} />
                        </div>

                        <div className="flex-1">
                            <DialogTitle className="text-xl font-bold text-white drop-shadow-md">
                                Enrollment Confirmed
                            </DialogTitle>
                            {/* DOM Fix: Using div instead of DialogDescription to avoid p tag nesting */}
                            <div className="text-sky-50 text-[10px]">
                                Student successfully enrolled
                            </div>
                        </div>
                    </div>
                </div>

                {studentData && (
                    <div className="px-5 py-4 space-y-3">
                        {/* Ultra-Compact ID Card */}
                        <div className="bg-gradient-to-br from-slate-50 to-sky-50/50 border border-sky-200 rounded-lg p-4 shadow-sm">
                            {/* Subtle pattern */}
                            <div className="absolute inset-0 opacity-5">
                                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                            </div>

                            <div className="flex items-center gap-2.5 pb-2.5 border-b border-sky-200">
                                <div className="h-10 w-10 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-md flex items-center justify-center shadow-sm flex-shrink-0">
                                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wide mb-0.5">Student ID</p>
                                    <p className="text-lg font-bold text-indigo-700 font-mono truncate">{studentData?.studentId}</p>
                                </div>
                            </div>

                            {/* Student Info */}
                            <div className="space-y-1.5 mt-2.5">
                                <div>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Full Name</p>
                                    <p className="text-base font-bold text-gray-900">{studentData?.studentName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Class</p>
                                        <p className="text-sm font-semibold text-gray-900">{studentData?.class}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Group</p>
                                        <p className="text-sm font-semibold text-gray-900">{studentData?.group}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ultra-Compact Info Grid */}
                        <div className="grid grid-cols-3 gap-1.5">
                            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-md p-2 text-center">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600 mx-auto mb-0.5" />
                                <p className="text-[8px] text-emerald-700 font-bold uppercase">Fee</p>
                                <p className="text-sm font-bold text-emerald-900">{studentData?.totalFee?.toLocaleString()}</p>
                            </div>

                            <div className={`bg-gradient-to-br ${studentData?.feeStatus === 'paid' ? 'from-green-50 to-emerald-50 border-green-200' :
                                studentData?.feeStatus === 'partial' ? 'from-yellow-50 to-amber-50 border-yellow-200' :
                                    'from-orange-50 to-red-50 border-orange-200'
                                } border rounded-md p-2 text-center`}>
                                <Wallet className={`h-3.5 w-3.5 mx-auto mb-0.5 ${studentData?.feeStatus === 'paid' ? 'text-green-600' :
                                    studentData?.feeStatus === 'partial' ? 'text-yellow-600' :
                                        'text-orange-600'
                                    }`} />
                                <p className={`text-[8px] font-bold uppercase ${studentData?.feeStatus === 'paid' ? 'text-green-700' :
                                    studentData?.feeStatus === 'partial' ? 'text-yellow-700' :
                                        'text-orange-700'
                                    }`}>Status</p>
                                <p className={`text-sm font-bold capitalize ${studentData?.feeStatus === 'paid' ? 'text-green-900' :
                                    studentData?.feeStatus === 'partial' ? 'text-yellow-900' :
                                        'text-orange-900'
                                    }`}>
                                    {studentData?.feeStatus}
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-md p-2 text-center">
                                <svg className="h-3.5 w-3.5 text-blue-600 mx-auto mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-[8px] text-blue-700 font-bold uppercase">Date</p>
                                <p className="text-[10px] font-bold text-blue-900">
                                    {new Date(studentData.admissionDate).toLocaleDateString('en-PK', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="px-5 pb-4 space-y-2 relative z-50 pointer-events-auto">
                    <div className="flex gap-2">
                        {/* Students Button */}
                        <button
                            type="button"
                            onClick={() => {
                                console.log('✅ STUDENTS BUTTON CLICKED');
                                onClose();
                                setTimeout(() => {
                                    onNavigateToStudents();
                                }, 200);
                            }}
                            className="flex-1 h-8 text-xs border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Students</span>
                        </button>

                        {/* Unified Print Button - Prints Admission Slip with Barcode */}
                        <button
                            type="button"
                            onClick={() => {
                                console.log('✅ PRINT ADMISSION SLIP CLICKED');
                                onPrintReceipt();
                            }}
                            className="flex-1 h-8 text-xs border border-sky-400 bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            <span>🖨️ Print Admission Slip</span>
                        </button>
                    </div>

                    {/* New Admission Button */}
                    <button
                        type="button"
                        onClick={() => {
                            console.log('✅ NEW ADMISSION BUTTON CLICKED');
                            onClose();
                            setTimeout(() => {
                                onNewAdmission();
                            }, 200);
                        }}
                        className="w-full h-10 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 active:from-sky-800 active:to-indigo-800 text-white shadow-lg rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all font-semibold text-sm"
                    >
                        <UserPlus className="h-4 w-4" />
                        <span>New Admission</span>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
