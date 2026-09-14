/**
 * Change Email API Endpoint
 *
 * This file implements an API endpoint for changing a user's email address.
 * It handles form validation, authentication checks, and email update requests
 * to the Supabase Auth API.
 *
 * Key features:
 * - Request method validation (POST only)
 * - Authentication protection
 * - Email validation with Zod schema
 * - Integration with Supabase Auth API for email updates
 * - Error handling for invalid inputs and API errors
 */
import type { Route } from "./+types/change-email";

import { data } from "react-router";
import { z } from "zod";

import { requireAuthentication, requireMethod } from "~/core/lib/guards.server";
import makeServerClient from "~/core/lib/supa-client.server";

/**
 * Validation schema for email change form data
 *
 * This schema defines the required fields and validation rules:
 * - email: Required, must be a valid email format
 *
 * The schema is used with Zod's safeParse method to validate form submissions
 * before processing them further.
 */
const schema = z.object({
  email: z.string().email(),
});

/**
 * Action handler for processing email change requests
 *
 * This function handles the complete email change flow:
 * 1. Validates that the request method is POST
 * 2. Authenticates the user making the request
 * 3. Validates the new email address format
 * 4. Submits the email change request to Supabase Auth API
 * 5. Returns appropriate success or error responses
 *
 * Security considerations:
 * - Requires POST method to prevent unintended changes
 * - Requires authentication to protect user data
 * - Validates email format before submission
 * - Handles errors gracefully with appropriate status codes
 *
 * Note: When the email is changed, Supabase will send a confirmation email
 * to the new address. The user must confirm this email before the change takes effect.
 *
 * @param request - The incoming HTTP request with form data
 * @returns Response indicating success or error with appropriate details
 */
export async function action({ request }: Route.ActionArgs) {
  // Validate request method (only allow POST)
  requireMethod("POST")(request);

  // Create a server-side Supabase client with the user's session
  const [client] = makeServerClient(request);

  // Verify the user is authenticated
  await requireAuthentication(client);

  const { data: identities, error: identitiesError } =
    await client.auth.getUserIdentities();
  if (identitiesError) {
    return data(
      { error: "로그인 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
  if (
    !identities?.identities.some((identity) => identity.provider === "email")
  ) {
    return data(
      { error: "소셜 로그인으로 가입한 계정의 이메일은 변경할 수 없어요." },
      { status: 403 },
    );
  }

  // Extract and validate form data
  const formData = await request.formData();
  const { success, data: validData } = schema.safeParse(
    Object.fromEntries(formData),
  );

  // Return error if email validation fails
  if (!success) {
    return data(
      { error: "올바른 이메일 주소를 입력해 주세요." },
      { status: 400 },
    );
  }

  const {
    data: { user },
  } = await client.auth.getUser();
  if (user?.email?.toLowerCase() === validData.email.toLowerCase()) {
    return data(
      { error: "현재 이메일과 다른 주소를 입력해 주세요." },
      { status: 400 },
    );
  }

  // Submit email change request to Supabase Auth API
  const { error } = await client.auth.updateUser(
    {
      email: validData.email,
    },
    {
      emailRedirectTo: `${new URL(request.url).origin}/auth/confirm?next=/account/edit`,
    },
  );

  // Handle API errors
  if (error) {
    return data(
      { error: "이메일 변경을 요청하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 400 },
    );
  }

  // Return success response
  // Note: At this point, the user will receive a confirmation email
  // and must verify the new address before the change takes effect
  return {
    success: true,
  };
}
