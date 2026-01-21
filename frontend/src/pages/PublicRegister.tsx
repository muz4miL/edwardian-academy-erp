/**
 * Public Registration Page - Compact Version
 *
 * Allows students/parents to register online without login.
 * Submissions go to "Pending" status for admin approval.
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function PublicRegister() {
  const [formData, setFormData] = useState({
    studentName: "",
    fatherName: "",
    parentCell: "",
    studentCell: "",
    email: "",
    address: "",
    class: "", // Will store class _id
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Fetch available classes (active only)
  const { data: classesData } = useQuery({
    queryKey: ["public-classes"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/classes`);
      if (!res.ok) throw new Error("Failed to fetch classes");
      return res.json();
    },
  });

  const classes = (classesData?.data || []).filter(
    (c: any) => c.status === "active",
  );

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
    if (
      !formData.studentName ||
      !formData.fatherName ||
      !formData.parentCell ||
      !formData.class
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    registerMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center shadow-xl border-0">
          <CardContent className="pt-12 pb-8">
            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Application Submitted!
            </h2>
            <p className="text-gray-600 mb-6">
              Your application is pending verification.
            </p>

            <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">
                Application Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Application ID:</span>
                  <span className="font-mono font-medium">
                    {submittedData?.applicationId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Student Name:</span>
                  <span className="font-medium">
                    {submittedData?.studentName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium text-amber-600">
                    Pending Verification
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-indigo-900 font-medium mb-2">
                📍 Next Steps:
              </p>
              <p className="text-sm text-indigo-800">
                Please visit the <strong>administration office</strong> with
                your documents to verify your admission and receive your login
                credentials.
              </p>
            </div>

            <Button
              onClick={() => {
                setIsSubmitted(false);
                setFormData({
                  studentName: "",
                  fatherName: "",
                  parentCell: "",
                  studentCell: "",
                  email: "",
                  address: "",
                  class: "",
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Compact Header */}
        <div className="text-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Edwardian Academy
          </h1>
          <p className="text-gray-600">Online Admission Registration Form</p>
        </div>

        {/* Compact Form Card */}
        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Student Name | Father Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">
                    Student Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Full name as per documents"
                    value={formData.studentName}
                    onChange={(e) =>
                      handleInputChange("studentName", e.target.value)
                    }
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
                    onChange={(e) =>
                      handleInputChange("fatherName", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Row 2: Parent Phone | Student Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">
                    Parent's Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="03XX-XXXXXXX"
                    value={formData.parentCell}
                    onChange={(e) =>
                      handleInputChange("parentCell", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">
                    Student's Phone (Optional)
                  </Label>
                  <Input
                    placeholder="03XX-XXXXXXX"
                    value={formData.studentCell}
                    onChange={(e) =>
                      handleInputChange("studentCell", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Row 3: Email | Address */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Address</Label>
                  <Input
                    placeholder="City / Area"
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Row 4: Select Desired Batch | Submit */}
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <Label className="text-gray-700">
                    Select Desired Batch <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.class}
                    onValueChange={(value) => handleInputChange("class", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls: any) => (
                        <SelectItem key={cls._id} value={cls._id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {cls.classTitle ||
                                `${cls.gradeLevel} - ${cls.section}`}
                            </span>
                            {cls.scheduleDisplay && (
                              <span className="text-xs text-muted-foreground">
                                {cls.scheduleDisplay}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="h-10 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {registerMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-4">
          Already registered?{" "}
          <a href="/student-portal" className="text-indigo-600 hover:underline">
            Login to Student Portal
          </a>
        </p>
      </div>
    </div>
  );
}
