/**
 * Reports Page - Financial Reports Hub
 * Placeholder for Payroll and Settlement Reports
 */

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BarChart,
    FileText,
    DollarSign,
    TrendingUp,
    Calendar,
    Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Reports() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isOwner = user?.role === "OWNER";

    const reportCards = [
        {
            title: "Fee Collection Report",
            description: "Daily, weekly, and monthly fee collection summaries",
            icon: DollarSign,
            color: "text-green-600",
            bgColor: "bg-green-100",
            action: () => navigate("/finance"),
        },
        {
            title: "Payroll Report",
            description: "Staff salary disbursements and history",
            icon: FileText,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
            action: () => navigate("/payroll"),
            ownerOnly: true,
        },
        {
            title: "Partner Settlement",
            description: "Revenue sharing and partner payouts",
            icon: TrendingUp,
            color: "text-purple-600",
            bgColor: "bg-purple-100",
            action: () => navigate("/partner-settlement"),
            ownerOnly: true,
        },
        {
            title: "Attendance Report",
            description: "Student gate scan attendance analytics",
            icon: Calendar,
            color: "text-amber-600",
            bgColor: "bg-amber-100",
            action: () => navigate("/gatekeeper"),
        },
    ];

    return (
        <DashboardLayout title="Reports">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart className="h-6 w-6 text-primary" />
                        Reports & Analytics
                    </h1>
                    <p className="text-muted-foreground">
                        Access financial reports and business analytics
                    </p>
                </div>

                {/* Report Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reportCards
                        .filter((card) => !card.ownerOnly || isOwner)
                        .map((card) => (
                            <Card
                                key={card.title}
                                className="hover:shadow-lg transition-shadow cursor-pointer"
                                onClick={card.action}
                            >
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${card.bgColor}`}>
                                            <card.icon className={`h-6 w-6 ${card.color}`} />
                                        </div>
                                        <CardTitle className="text-lg">{card.title}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        {card.description}
                                    </p>
                                    <Button variant="outline" size="sm" className="w-full gap-2">
                                        <Download className="h-4 w-4" />
                                        View Report
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                </div>

                {/* Coming Soon */}
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                        <BarChart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Advanced Analytics Coming Soon</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Detailed charts, exportable PDFs, and custom date range reports
                            will be available in the next update.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
