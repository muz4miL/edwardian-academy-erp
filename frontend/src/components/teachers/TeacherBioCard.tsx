/**
 * TeacherBioCard - Left column component for Teacher Profile
 * Displays: Avatar, Name, Subject, Phone, Joining Date
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Calendar, BookOpen, Crown, Mail } from "lucide-react";

interface TeacherBioCardProps {
  teacher: {
    name: string;
    subject: string;
    phone: string;
    email?: string;
    joiningDate: string;
    status: string;
  };
  isPartner?: boolean;
}

export function TeacherBioCard({
  teacher,
  isPartner = false,
}: TeacherBioCardProps) {
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
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-primary" />
          Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Avatar */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20">
              <span className="text-3xl font-bold text-primary">
                {teacher.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            {isPartner && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center border-2 border-white">
                <Crown className="h-4 w-4 text-yellow-800" />
              </div>
            )}
          </div>
        </div>

        {/* Teacher Name with Partner Badge */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">{teacher.name}</h2>
          {isPartner && (
            <Badge className="mt-1 bg-yellow-100 text-yellow-700 gap-1">
              <Crown className="h-3 w-3" />
              Academy Partner
            </Badge>
          )}
        </div>

        <div className="space-y-3 pt-2 border-t">
          {/* Subject */}
          <div className="flex items-start gap-3">
            <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="font-medium">
                {capitalizeSubject(teacher.subject)}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{teacher.phone || "N/A"}</p>
            </div>
          </div>

          {/* Email */}
          {teacher.email && (
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-sm break-all">{teacher.email}</p>
              </div>
            </div>
          )}

          {/* Joining Date */}
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Joining Date</p>
              <p className="font-medium">
                {new Date(teacher.joiningDate).toLocaleDateString("en-PK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
