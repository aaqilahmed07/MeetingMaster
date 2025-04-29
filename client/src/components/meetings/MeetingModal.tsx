import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MeetingForm from "./MeetingForm";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Meeting } from "@shared/schema";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting?: Meeting; // For editing existing meetings
  onSuccess?: () => void;
}

export default function MeetingModal({ isOpen, onClose, meeting, onSuccess }: MeetingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSuccess = () => {
    console.log("MeetingModal: handleSuccess called");
    setIsSubmitting(false);
    console.log("MeetingModal: setting isSubmitting to false");
    
    toast({
      title: meeting ? "Meeting updated" : "Meeting created",
      description: meeting 
        ? "The meeting has been updated successfully." 
        : "The meeting has been created successfully.",
      duration: 3000,
    });
    console.log("MeetingModal: displayed success toast");
    
    if (onSuccess) {
      console.log("MeetingModal: calling onSuccess callback");
      onSuccess();
    }
    
    console.log("MeetingModal: calling onClose");
    onClose();
  };

  const handleError = (error: Error) => {
    console.log("MeetingModal: handleError called with error:", error.message);
    setIsSubmitting(false);
    console.log("MeetingModal: setting isSubmitting to false");
    
    toast({
      title: "Error",
      description: error.message || "An error occurred. Please try again.",
      variant: "destructive",
      duration: 5000,
    });
    console.log("MeetingModal: displayed error toast");
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent 
        className="max-w-3xl relative overflow-y-auto rounded-lg fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-h-[80vh]"
        aria-describedby="meeting-form-description"
      >
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl">{meeting ? "Edit Meeting" : "Create Meeting"}</DialogTitle>
          <div id="meeting-form-description" className="text-sm text-muted-foreground">
            Fill in the meeting details below
          </div>
        </DialogHeader>
        
        <LoadingOverlay 
          isLoading={isSubmitting} 
          message={meeting ? "Updating meeting..." : "Creating meeting..."}
          variant="processing"
        />
        
        <div className="py-2">
          <MeetingForm 
            meeting={meeting}
            onSubmitting={() => setIsSubmitting(true)}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
        
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
