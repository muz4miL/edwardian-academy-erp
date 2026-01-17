/**
 * TeacherClassesCard - Right column component for Teacher Profile
 * Displays: Classes being taught, Total students in those classes
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Users, BookOpen, School } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface ClassInfo {
  _id: string;
  name: string;
  section?: string;
  studentCount?: number;
}

interface TeacherClassesCardProps {
  teacherId: string;
  teacherSubject: string;
}

export function TeacherClassesCard({
  teacherId,
  teacherSubject,
}: TeacherClassesCardProps) {
  // Fetch classes assigned to this teacher
  const { data: classesData, isLoading } = useQuery({
    queryKey: ["teacher-classes", teacherId],
    queryFn: async () => {
      // Fetch classes where this teacher is assigned
      const res = await fetch(
        `${API_BASE_URL}/classes?assignedTeacher=${teacherId}`,
        { credentials: "include" },
      );
      if (!res.ok) return { data: [], totalStudents: 0 };

      const data = await res.json();
      const classes: ClassInfo[] = data.data || [];

      // Calculate total students from all assigned classes
      let totalStudents = 0;
      for (const cls of classes) {
        // Fetch student count per class
        try {
          const studentsRes = await fetch(
            `${API_BASE_URL}/students?class=${encodeURIComponent(cls.name)}&countOnly=true`,
            { credentials: "include" },
          );
          if (studentsRes.ok) {
            const studentData = await studentsRes.json();
            cls.studentCount =
              studentData.count || studentData.data?.length || 0;
            totalStudents += cls.studentCount;
          }
        } catch {
          cls.studentCount = 0;
        }
      }

      return { data: classes, totalStudents };
    },
    enabled: !!teacherId,
  });

  const classes = classesData?.data || [];
  const totalStudents = classesData?.totalStudents || 0;

  // Capitalize subject name
  const capitalizeSubject = (subject: string) => {
    const subjectMap: Record<string, string> = {
      biology: "Biology",
      chemistry: "Chemistry",
      physics: "Physics",
      math: "Mathematics",
      english: "English",
    };
    return (
      subjectMap[subject?.toLowerCase()] ||
      subject?.charAt(0)?.toUpperCase() + subject?.slice(1) ||
      "N/A"
    );
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="h-5 w-5 text-primary" />
          Teaching Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">Subject</p>
            <p className="text-lg font-bold text-blue-800 dark:text-blue-200">
              {capitalizeSubject(teacherSubject)}
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
            <p className="text-xs text-purple-600 dark:text-purple-400">
              Total Students
            </p>
            <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
              {isLoading ? "..." : totalStudents}
            </p>
          </div>
        </div>

        {/* Classes List */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <School className="h-4 w-4" />
            Assigned Classes
          </p>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <School className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No classes assigned yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {classes.map((cls) => (
                <div
                  key={cls._id}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{cls.name}</p>
                      {cls.section && (
                        <p className="text-xs text-muted-foreground">
                          Section: {cls.section}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {cls.studentCount || 0}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
