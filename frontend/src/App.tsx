import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Admissions from "./pages/Admissions";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Finance from "./pages/Finance";
import Classes from "./pages/Classes";
import Configuration from "./pages/Configuration";
import Timetable from "./pages/Timetable";
import Sessions from "./pages/Sessions";
import StudentCard from "./pages/StudentCard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admissions" element={<Admissions />} />
          <Route path="/students" element={<Students />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/configuration" element={<Configuration />} />
          <Route path="/student-card" element={<StudentCard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
