
import { toast as sonnerToast } from "sonner";
// Import useToast from shadcn's toast implementation, not from Radix UI directly
import { type ToasterToast } from "@/components/ui/toast";

// Create a simple useToast implementation that matches the expected interface
export const useToast = () => {
  return {
    toasts: [] as ToasterToast[],
    dismiss: (toastId?: string) => {},
    toast: (props: ToasterToast) => {}
  };
};

// Create a toast function that matches the expected interface
export const toast = sonnerToast;
