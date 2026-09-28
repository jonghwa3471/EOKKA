/**
 * Edit Profile API Endpoint
 *
 * This file implements an API endpoint for updating a user's profile information.
 * It handles form data processing, validation, avatar image uploads, and database updates.
 *
 * Key features:
 * - Form data validation with Zod schema
 * - File upload handling for avatar images
 * - Storage management with Supabase Storage
 * - Profile data updates in both auth and profiles tables
 * - Comprehensive error handling
 */
import type { Route } from "./+types/edit-profile";

import { data } from "react-router";
import { z } from "zod";

import makeServerClient from "~/core/lib/supa-client.server";

import { getUserProfile } from "../queries";

/**
 * Validation schema for profile update form data
 *
 * This schema defines the required fields and validation rules:
 * - name: Required, must be at least 1 character
 * - avatar: Must be a File instance (for avatar image uploads)
 * - marketingConsent: Boolean flag for marketing communications consent
 *
 * The schema is used with Zod's safeParse method to validate form submissions
 * before processing them further.
 */
const schema = z.object({
  name: z.string().min(1),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(5, "사용자 ID는 5자 이상이어야 해요.")
    .max(20, "사용자 ID는 20자 이하여야 해요.")
    .regex(/^[a-z0-9_]+$/, "영문 소문자, 숫자, 밑줄만 사용할 수 있어요."),
  avatar: z.instanceof(File),
  marketingConsent: z.coerce.boolean(),
});

/**
 * Action handler for processing profile update requests
 *
 * This function handles the complete profile update flow:
 * 1. Validates the request method and authentication status
 * 2. Processes and validates form data using the Zod schema
 * 3. Handles avatar image uploads to Supabase Storage
 * 4. Updates profile information in both auth and profiles tables
 * 5. Returns appropriate success or error responses
 *
 * Security considerations:
 * - Validates authentication status before processing
 * - Validates file size and type for avatar uploads
 * - Uses user ID from authenticated session for database operations
 * - Handles errors gracefully with appropriate status codes
 *
 * @param request - The incoming HTTP request with form data
 * @returns Response indicating success or error with appropriate details
 */
export async function action({ request }: Route.ActionArgs) {
  // Create a server-side Supabase client with the user's session
  const [client] = makeServerClient(request);

  // Get the authenticated user's information
  const {
    data: { user },
  } = await client.auth.getUser();

  // Validate request method (only allow POST)
  if (request.method !== "POST") {
    return data(null, { status: 405 }); // Method Not Allowed
  }

  // Ensure user is authenticated
  if (!user) {
    return data(null, { status: 401 }); // Unauthorized
  }

  // Extract and validate form data
  const formData = await request.formData();
  const {
    success,
    data: validData,
    error,
  } = schema.safeParse(Object.fromEntries(formData));

  // Return validation errors if any
  if (!success) {
    return data({ fieldErrors: error.flatten().fieldErrors }, { status: 400 });
  }

  // Get current user profile to determine existing avatar URL
  const profile = await getUserProfile(client, { userId: user.id });
  let avatarUrl = profile?.avatar_url || null;
  const hasAvatarUpload =
    validData.avatar instanceof File && validData.avatar.size > 0;

  if (hasAvatarUpload && validData.avatar.size > 1024 * 1024) {
    return data(
      { error: "프로필 사진은 1MB 이하만 업로드할 수 있어요." },
      { status: 400 },
    );
  }

  // Handle avatar image upload if a valid file was provided
  if (
    hasAvatarUpload &&
    validData.avatar.type.startsWith("image/") // Ensure it's an image file
  ) {
    // Upload avatar to Supabase Storage
    const { error: uploadError } = await client.storage
      .from("avatars")
      .upload(user.id, validData.avatar, {
        upsert: true, // Replace existing avatar if any
        cacheControl: "3600",
        contentType: validData.avatar.type,
      });

    // Handle upload errors
    if (uploadError) {
      const isMissingAvatarBucket = uploadError.message
        .toLowerCase()
        .includes("bucket not found");

      return data(
        {
          error: isMissingAvatarBucket
            ? "프로필 이미지 저장소가 아직 준비되지 않았어요. 잠시 후 다시 시도해 주세요."
            : uploadError.message,
        },
        { status: 400 },
      );
    }

    // Get public URL for the uploaded avatar
    const {
      data: { publicUrl },
    } = await client.storage.from("avatars").getPublicUrl(user.id);
    // The storage object keeps the same path when it is replaced. Add a
    // version query so browsers and social-provider image caches request the
    // newly uploaded image instead of reusing the previous response.
    avatarUrl = `${publicUrl}?v=${Date.now()}`;
  }

  // Update profile information in the profiles table
  const { error: updateProfileError } = await client
    .from("profiles")
    .update({
      name: validData.name,
      username: validData.username,
      marketing_consent: validData.marketingConsent,
      avatar_url: avatarUrl,
    })
    .eq("profile_id", user.id);

  // Update user metadata in the auth table
  if (updateProfileError) {
    const isDuplicateUsername =
      updateProfileError.code === "23505" ||
      updateProfileError.message.includes("profiles_username_unique");
    return data(
      isDuplicateUsername
        ? {
            fieldErrors: {
              name: undefined,
              avatar: undefined,
              username: ["이미 사용 중인 사용자 ID예요."],
              marketingConsent: undefined,
            },
          }
        : { error: updateProfileError.message },
      { status: 400 },
    );
  }

  const { error: updateError } = await client.auth.updateUser({
    data: {
      name: validData.name,
      display_name: validData.name,
      marketing_consent: validData.marketingConsent,
      avatar_url: avatarUrl,
    },
  });

  // Handle auth update errors
  if (updateError) {
    return data({ error: updateError.message }, { status: 400 });
  }

  // Return success response
  return {
    success: true,
  };
}
