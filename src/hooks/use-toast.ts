
import { toast as sonnerToast } from "sonner";
import { useToast as useRadixToast } from "@/components/ui/use-toast";

// Re-export the useToast hook from radix UI
export const useToast = useRadixToast;

// Create a toast function that matches the expected interface
export const toast = sonnerToast;
