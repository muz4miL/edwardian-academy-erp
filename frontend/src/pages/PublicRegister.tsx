/**
 * Public Registration Page
 * 
 * Allows students/parents to register online without login.
 * Submissions go to "Pending" status for admin approval.
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    GraduationCap,
    User,
    Phone,
    Mail,
    MapPin,
    CreditCard,
    CheckCircle2,
    Loader2,
    ArrowRight,
    BookOpen,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function PublicRegister() {
    const [formData, setFormData] = useState({
        studentName: "",
        fatherName: "",
        cnic: "",
        parentCell: "",
        studentCell: "",
        email: "",
        address: "",
        class: "",
        group: "",
        subjects: [] as string[],
    });

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedData, setSubmittedData] = useState<any>(null);

    // Fetch available classes
    const { data: classesData } = useQuery({
        queryKey: ["public-classes"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/api/classes`);
            if (!res.ok) throw new Error("Failed to fetch classes");
            return res.json();
        },
    });

    const classes = classesData?.data || [];

    // Get selected class details
    const selectedClass = classes.find((c: any) => c.name === formData.class);
    const availableGroups = selectedClass?.groups || [];
    const availableSubjects = selectedClass?.subjects || [];

    // Registration mutation
    const registerMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await fetch(`${API_BASE_URL}/api/public/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Registration failed");
            }
            return res.json();
        },
        onSuccess: (data) => {
            setIsSubmitted(true);
            setSubmittedData(data.data);
            toast.success("Registration submitted successfully!");
        },
        onError: (error: any) => {
            toast.error(error.message || "Registration failed");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.studentName || !formData.fatherName || !formData.parentCell || !formData.class || !formData.group) {
            toast.error("Please fill all required fields");
            return;
        }

        registerMutation.mutate(formData);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // Reset form when class changes
    useEffect(() => {
        setFormData((prev) => ({ ...prev, group: "", subjects: [] }));
    }, [formData.class]);

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg text-center shadow-xl border-0">
                    <CardContent className="pt-12 pb-8">
                        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            Registration Submitted!
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Your application is pending admin approval.
                        </p>

                        <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
                            <h3 className="font-semibold text-gray-800 mb-3">Application Details</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Application ID:</span>
                                    <span className="font-mono font-medium">{submittedData?.studentId}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Student Name:</span>
                                    <span className="font-medium">{submittedData?.studentName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Class:</span>
                                    <span className="font-medium">{submittedData?.class} ({submittedData?.group})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Status:</span>
                                    <span className="font-medium text-amber-600">Pending Approval</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 mb-6">
                            You will receive an SMS with login credentials once your application is approved.
                        </p>

                        <Button
                            onClick={() => {
                                setIsSubmitted(false);
                                setFormData({
                                    studentName: "",
                                    fatherName: "",
                                    cnic: "",
                                    parentCell: "",
                                    studentCell: "",
                                    email: "",
                                    address: "",
                                    class: "",
                                    group: "",
                                    subjects: [],
                                });
                            }}
                            variant="outline"
                            className="w-full"
                        >
                            Register Another Student
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Edwardian Academy
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Online Admission Registration Form
                    </p>
                </div>

                {/* Registration Form */}
                <Card className="shadow-xl border-0">
                    <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-xl">
                        <CardTitle className="text-xl">Student Registration</CardTitle>
                        <CardDescription className="text-indigo-100">
                            Fill in the details below to submit your admission application
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Student Information */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <User className="h-5 w-5 text-indigo-600" />
                                    Student Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-gray-700">
                                            Student Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            placeholder="Full name as per documents"
                                            value={formData.studentName}
                                            onChange={(e) => handleInputChange("studentName", e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-gray-700">
                                            Father's Name <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            placeholder="Father's full name"
                                            value={formData.fatherName}
                                            onChange={(e) => handleInputChange("fatherName", e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-gray-700 flex items-center gap-1">
                                        <CreditCard className="h-4 w-4" />
                                        CNIC / B-Form Number
                                    </Label>
                                    <Input
                                        placeholder="XXXXX-XXXXXXX-X"
                                        value={formData.cnic}
                                        onChange={(e) => handleInputChange("cnic", e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <Phone className="h-5 w-5 text-indigo-600" />
                                    Contact Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-gray-700">
                                            Parent's Phone <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            placeholder="03XX-XXXXXXX"
                                            value={formData.parentCell}
                                            onChange={(e) => handleInputChange("parentCell", e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-gray-700">Student's Phone</Label>
                                        <Input
                                            placeholder="03XX-XXXXXXX (Optional)"
                                            value={formData.studentCell}
                                            onChange={(e) => handleInputChange("studentCell", e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-gray-700 flex items-center gap-1">
                                            <Mail className="h-4 w-4" />
                                            Email Address
                                        </Label>
                                        <Input
                                            type="email"
                                            placeholder="email@example.com"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange("email", e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-gray-700 flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            Address
                                        </Label>
                                        <Input
                                            placeholder="City / Area"
                                            value={formData.address}
                                            onChange={(e) => handleInputChange("address", e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Academic Information */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-indigo-600" />
                                    Academic Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-gray-700">
                                            Class <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={formData.class}
                                            onValueChange={(value) => handleInputChange("class", value)}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select class" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classes.map((cls: any) => (
                                                    <SelectItem key={cls._id} value={cls.name}>
                                                        {cls.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className="text-gray-700">
                                            Group <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={formData.group}
                                            onValueChange={(value) => handleInputChange("group", value)}
                                            disabled={!formData.class}
                                        >
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Select group" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableGroups.map((group: string) => (
                                                    <SelectItem key={group} value={group}>
                                                        {group}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Subject Selection */}
                                {availableSubjects.length > 0 && (
                                    <div>
                                        <Label className="text-gray-700">Subjects</Label>
                                        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {availableSubjects.map((subject: any) => {
                                                const subjectName = typeof subject === "string" ? subject : subject.name;
                                                const isSelected = formData.subjects.includes(subjectName);

                                                return (
                                                    <button
                                                        key={subjectName}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                subjects: isSelected
                                                                    ? prev.subjects.filter((s) => s !== subjectName)
                                                                    : [...prev.subjects, subjectName],
                                                            }));
                                                        }}
                                                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${isSelected
                                                                ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                                                                : "bg-white border-gray-200 text-gray-700 hover:border-indigo-200"
                                                            }`}
                                                    >
                                                        {subjectName}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="pt-6">
                                <Button
                                    type="submit"
                                    disabled={registerMutation.isPending}
                                    className="w-full h-14 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                                >
                                    {registerMutation.isPending ? (
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    ) : (
                                        <>
                                            Submit Application
                                            <ArrowRight className="h-5 w-5 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    Already registered?{" "}
                    <a href="/student-portal" className="text-indigo-600 hover:underline">
                        Login to Student Portal
                    </a>
                </p>
            </div>
        </div>
    );
}
