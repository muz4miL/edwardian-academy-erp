import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Loader2,
    Wallet,
    Info,
    CheckCircle2
} from "lucide-react";

interface Teacher {
    teacherId: string;
    name: string;
    subject: string;
    compensationType: string;
    revenue: number;
    earnedAmount: number;
    classesCount: number;
}

interface TeacherPayrollTableProps {
    teachers: Teacher[];
    filter: string;
    onFilterChange: (value: string) => void;
    onPay: (teacher: Teacher) => void;
    isPaying: boolean;
}

export const TeacherPayrollTable = ({
    teachers,
    filter,
    onFilterChange,
    onPay,
    isPaying,
}: TeacherPayrollTableProps) => {

    const filteredTeachers = teachers.filter(
        (teacher) => filter === "all" || teacher.teacherId === filter
    );

    const totalPending = filteredTeachers.reduce(
        (sum, t) => sum + (t.earnedAmount > 0 ? t.earnedAmount : 0),
        0
    );
    const paidCount = filteredTeachers.filter(t => t.earnedAmount === 0).length;

    return (
        <div className="mt-6 rounded-xl border border-border/50 bg-card overflow-hidden card-shadow">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b bg-muted/30 px-6 py-4">
                <div>
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        Teacher Payroll
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Earnings based on collected fees</p>
                </div>

                {/* Summary Stats - Refined */}
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pending Payments</p>
                        <p className="text-base font-semibold text-primary">PKR {totalPending.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Paid This Month</p>
                        <p className="text-base font-semibold text-green-600">{paidCount} Teachers</p>
                    </div>

                    {/* Filter Dropdown - Refined */}
                    <div className="flex items-center gap-3 pl-6 border-l">
                        <Select value={filter} onValueChange={onFilterChange}>
                            <SelectTrigger className="w-[180px] h-9 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Teachers</SelectItem>
                                {teachers.map((teacher) => (
                                    <SelectItem key={teacher.teacherId} value={teacher.teacherId}>
                                        {teacher.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span className="font-medium">{filteredTeachers.length} Teachers</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table - Elegant & Clean */}
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20 border-b">
                        <TableHead className="font-semibold text-foreground text-sm">Teacher Name</TableHead>
                        <TableHead className="font-semibold text-foreground text-sm">Subject</TableHead>
                        <TableHead className="font-semibold text-foreground text-sm">Model</TableHead>
                        <TableHead className="font-semibold text-foreground text-sm text-right">
                            <div className="flex items-center justify-end gap-1">
                                Revenue
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs text-xs">
                                            Total fees collected from students
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </TableHead>
                        <TableHead className="font-semibold text-foreground text-sm text-right">
                            <div className="flex items-center justify-end gap-1">
                                Earned
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs text-xs">
                                            Teacher's share after deductions
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </TableHead>
                        <TableHead className="font-semibold text-foreground text-sm text-center">Classes</TableHead>
                        <TableHead className="font-semibold text-foreground text-sm text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredTeachers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-sm">
                                No teachers found
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredTeachers.map((teacher) => (
                            <TableRow
                                key={teacher.teacherId}
                                className="hover:bg-muted/5 transition-colors border-b border-border/50"
                            >
                                <TableCell className="font-medium text-sm">
                                    {teacher.name}
                                </TableCell>
                                <TableCell className="text-sm">
                                    <span className="text-primary capitalize font-medium">
                                        {teacher.subject}
                                    </span>
                                </TableCell>
                                <TableCell className="text-sm">
                                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs capitalize font-medium">
                                        {teacher.compensationType}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground font-medium">
                                    PKR {teacher.revenue.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className={`text-sm font-semibold ${teacher.earnedAmount > 0 ? 'text-primary' : 'text-green-600'
                                        }`}>
                                        PKR {teacher.earnedAmount.toLocaleString()}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {teacher.classesCount}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    {teacher.earnedAmount <= 0 ? (
                                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 hover:bg-green-50 font-medium text-xs">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            PAID
                                        </Badge>
                                    ) : (
                                        <Button
                                            size="sm"
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-8 px-3 text-xs"
                                            onClick={() => onPay(teacher)}
                                            disabled={isPaying}
                                        >
                                            {isPaying ? (
                                                <>
                                                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <Wallet className="mr-1.5 h-3 w-3" />
                                                    Pay Now
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};
