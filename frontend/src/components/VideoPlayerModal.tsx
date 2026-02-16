import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Eye, Play } from "lucide-react";
import { toast } from "sonner";

interface Lecture {
  _id: string;
  title: string;
  youtubeId: string;
  subject: string;
  classRef?: {
    _id: string;
    name?: string;
    className?: string;
    classTitle?: string;
    grade?: string;
    section?: string;
    group?: string;
    gradeLevel?: string;
  };
  viewCount: number;
  description?: string;
  thumbnailUrl: string;
}

interface VideoPlayerModalProps {
  lecture: Lecture | null;
  isOpen: boolean;
  onClose: () => void;
  onIncrementView?: (lectureId: string) => void;
}

export function VideoPlayerModal({ 
  lecture, 
  isOpen, 
  onClose,
  onIncrementView 
}: VideoPlayerModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!lecture) return null;

  const handleViewIncrement = async () => {
    if (onIncrementView) {
      try {
        setIsLoading(true);
        await onIncrementView(lecture._id);
      } catch (error) {
        console.error("Failed to increment view count:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="relative">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* YouTube Embed with Security */}
          <div className="relative aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${lecture.youtubeId}?rel=0&modestbranding=1&disablekb=1&controls=1&fs=1&autoplay=1`}
              title={lecture.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              onLoad={handleViewIncrement}
            />
            
            {/* Security Overlay - Prevents right-click and URL copying */}
            <div 
              className="absolute inset-0 z-10"
              style={{
                background: "transparent",
                pointerEvents: "none"
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                toast.error("🚫 Video protection enabled. Right-click disabled.");
                return false;
              }}
            />
          </div>
        </div>

        {/* Video Info */}
        <div className="p-4 border-t">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">{lecture.title}</h3>
              
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="secondary">{lecture.subject}</Badge>
                {lecture.classRef && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {lecture.classRef.classTitle || lecture.classRef.className || lecture.classRef.name || "No Class"}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  {lecture.viewCount} views
                </span>
              </div>

              {lecture.description && (
                <p className="text-sm text-muted-foreground">
                  {lecture.description}
                </p>
              )}
            </div>

            {/* Thumbnail Preview */}
            <div className="flex-shrink-0">
              <img
                src={lecture.thumbnailUrl}
                alt={lecture.title}
                className="w-20 h-12 object-cover rounded border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 
                    "https://via.placeholder.com/80x48?text=No+Thumb";
                }}
              />
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="px-4 pb-4 text-xs text-muted-foreground border-t pt-3">
          🔒 Video protection enabled: Right-click and URL copying disabled
        </div>
      </DialogContent>
    </Dialog>
  );
}