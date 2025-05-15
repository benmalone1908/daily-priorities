
import { toast as sonnerToast } from "sonner";
// Fix circular import - don't import useToast from component that's importing from here
import { useToast as useRadixToast } from "@radix-ui/react-toast";

// Re-export the useToast hook from radix UI
export const useToast = useRadixToast;

// Create a toast function that matches the expected interface
export const toast = sonnerToast;
