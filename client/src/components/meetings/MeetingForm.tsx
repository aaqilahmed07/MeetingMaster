import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Meeting, insertMeetingSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { X } from "lucide-react";

interface MeetingFormProps {
  meeting?: Meeting;
  onSubmitting: () => void;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

// Extend the insert schema with any additional validation
const formSchema = insertMeetingSchema.extend({
  // We'll handle participants separately since it's an array
});

type FormValues = z.infer<typeof formSchema>;

export default function MeetingForm({ meeting, onSubmitting, onSuccess, onError }: MeetingFormProps) {
  const queryClient = useQueryClient();
  const [participants, setParticipants] = useState<string[]>(
    meeting?.participants || ["Aaqil Ahmed"]
  );
  const [participantInput, setParticipantInput] = useState("");

  // We need to remove participants from defaultValues since it's handled separately
  const defaultValues: Partial<FormValues> = {
    title: meeting?.title || "",
    date: meeting?.date || new Date().toISOString().split("T")[0],
    startTime: meeting?.startTime || "09:00 AM",
    endTime: meeting?.endTime || "10:00 AM",
    duration: meeting?.duration || "1 hour",
    location: meeting?.location || "Virtual",
    createdBy: meeting?.createdBy || 1, // Default to user ID 1 (Aaqil Ahmed)
    teamId: meeting?.teamId || null,
    isPublic: meeting?.isPublic !== undefined ? meeting.isPublic : true,
    transcriptUrl: meeting?.transcriptUrl || "",
    transcriptText: meeting?.transcriptText || "",
    // We're handling participants through the useState above
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Making POST request to create meeting with data:", JSON.stringify(data, null, 2));
      try {
        // Make sure we have all required fields
        const requiredFields = ["title", "date", "startTime", "endTime", "duration", "location", "participants", "createdBy"];
        for (const field of requiredFields) {
          if (!data[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }
        
        console.log("All fields validated, sending direct fetch request");
        // Direct fetch request instead of using apiRequest
        const response = await fetch("/api/meetings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include"
        });
        
        console.log("Create meeting response status:", response.status);
        
        if (response.ok) {
          // Parse the JSON response
          const jsonData = await response.json();
          console.log("Meeting created with data:", jsonData);
          return jsonData;
        } else {
          const errorText = await response.text();
          console.error("Server error response:", errorText);
          throw new Error(`Failed to create meeting: ${errorText}`);
        }
      } catch (error) {
        console.error("Error in createMutation:", error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log("Meeting created successfully:", data);
      await queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      console.log("Query cache invalidated, calling onSuccess");
      onSuccess();
    },
    onError: (error: Error) => {
      console.error("Meeting creation failed:", error);
      onError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Making PUT request to update meeting with data:", JSON.stringify(data, null, 2));
      try {
        // Replace participants string with array of participants
        data.participants = participants;
        
        // Direct fetch request
        const response = await fetch(`/api/meetings/${meeting!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include"
        });
        
        console.log("Update meeting response status:", response.status);
        
        if (response.ok) {
          // Parse the JSON response
          const jsonData = await response.json();
          console.log("Meeting updated with data:", jsonData);
          return jsonData;
        } else {
          const errorText = await response.text();
          console.error("Server error response:", errorText);
          throw new Error(`Failed to update meeting: ${errorText}`);
        }
      } catch (error) {
        console.error("Error in updateMutation:", error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log("Meeting updated successfully:", data);
      await queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      console.log("Query cache invalidated, calling onSuccess");
      onSuccess();
    },
    onError: (error: Error) => {
      console.error("Meeting update failed:", error);
      onError(error);
    },
  });

  const onSubmit = (values: FormValues) => {
    console.log("Form submitted with handleSubmit event");
    // Call onSubmitting to show loading state
    onSubmitting();
    console.log("Form values:", values);
    console.log("Participants:", participants);
    
    if (participants.length === 0) {
      console.error("No participants provided");
      return onError(new Error("Please add at least one participant"));
    }
    
    try {
      // Ensure all fields are properly formatted
      const finalValues = {
        ...values,
        participants: Array.isArray(participants) ? participants : [participants].filter(Boolean),
        createdBy: typeof values.createdBy === 'number' ? values.createdBy : 1,
        teamId: values.teamId ?? null,
        isPublic: values.isPublic === undefined ? true : Boolean(values.isPublic),
      };
      
      console.log("Submitting values:", JSON.stringify(finalValues, null, 2));
      
      if (meeting) {
        console.log("Updating existing meeting:", meeting.id);
        updateMutation.mutate(finalValues);
      } else {
        console.log("Creating new meeting with direct mutation call");
        createMutation.mutate(finalValues);
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      onError(error instanceof Error ? error : new Error("Unknown error in form submission"));
    }
  };

  const addParticipant = () => {
    if (participantInput.trim() && !participants.includes(participantInput.trim())) {
      setParticipants([...participants, participantInput.trim()]);
      setParticipantInput("");
    }
  };

  const removeParticipant = (participant: string) => {
    setParticipants(participants.filter(p => p !== participant));
  };

  // Explicit form submit handler for debugging
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submit event triggered");
    try {
      form.handleSubmit(onSubmit)(e);
    } catch (error) {
      console.error("Error in form submit:", error);
      onError(error instanceof Error ? error : new Error("Error submitting form"));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter meeting title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 09:00 AM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 10:00 AM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 1 hour" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location/Platform</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Zoom, Google Meet" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div>
          <FormLabel>Participants</FormLabel>
          <div className="flex flex-wrap gap-2 mb-2">
            {participants.map((participant, index) => (
              <Badge key={index} variant="secondary" className="py-1 px-2">
                {participant}
                <button
                  type="button"
                  onClick={() => removeParticipant(participant)}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              placeholder="Add participant"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addParticipant();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addParticipant}
            >
              Add
            </Button>
          </div>
          {participants.length === 0 && (
            <div className="text-sm text-destructive mt-1">
              Please add at least one participant
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {/* Primary action button - direct method that's known to work */}
          <Button 
            type="button" 
            className="w-full bg-primary hover:bg-primary/90"
            onClick={() => {
              // Manually gather form values and call onSubmit
              const formValues = form.getValues();
              onSubmit(formValues as FormValues);
            }}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {meeting ? "Update Meeting" : "Create Meeting"}
          </Button>
          
          <div className="text-xs text-center text-gray-500">Click the button above to {meeting ? "update" : "create"} your meeting</div>
        </div>
      </form>
    </Form>
  );
}
