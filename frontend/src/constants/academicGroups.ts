export type AcademicGroupOption = {
  value: string;
  label: string;
  description: string;
};

export const ACADEMIC_GROUP_OPTIONS: AcademicGroupOption[] = [
  {
    value: "Pre-Medical",
    label: "Pre-Medical",
    description: "Biology, Chemistry, Physics",
  },
  {
    value: "Pre-Engineering",
    label: "Pre-Engineering",
    description: "Maths, Chemistry, Physics",
  },
  {
    value: "Computer Science",
    label: "Computer Science",
    description: "Computer Science, Maths, Physics",
  },
  {
    value: "Arts",
    label: "Arts",
    description: "Humanities and social sciences",
  },
  {
    value: "General Science",
    label: "General Science",
    description: "Core science foundation track",
  },
];
