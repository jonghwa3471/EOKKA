/**
 * FormErrors Component
 *
 * A reusable component for displaying form validation errors and server errors.
 * This component renders a list of error messages with a consistent styling and
 * visual indicator (X-circle icon) to clearly communicate errors to users.
 *
 * Used throughout the application to provide consistent error feedback in forms,
 * including:
 * - Validation errors from Zod schemas
 * - Authentication errors from Supabase
 * - Server-side errors from API responses
 */
import { XCircleIcon } from "lucide-react";

/**
 * FormErrors component for displaying validation and server errors
 *
 * This component renders a list of error messages with a consistent visual style,
 * including an X-circle icon to clearly indicate errors to users.
 *
 * @param errors - Array of error message strings to display
 * @returns A component that displays the list of error messages with consistent styling
 */
export default function FormErrors({ errors }: { errors: string[] }) {
  return (
    <div className="space-y-2 text-sm text-red-500">
      {/* Map through each error message and render it with an icon */}
      {errors.map((error, index) => (
        <p key={index} className="flex items-start gap-2 leading-relaxed">
          {/* X-circle icon to visually indicate an error */}
          <XCircleIcon className="mt-0.5 size-4 shrink-0" />
          {/* The error message text */}
          {error}
        </p>
      ))}
    </div>
  );
}
