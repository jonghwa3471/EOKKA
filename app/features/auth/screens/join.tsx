/**
 * User Registration Screen Component
 *
 * This component handles new user registration with:
 * - Email 및 password registration
 * - Form validation for all fields
 * - Terms of service 및 marketing consent options
 * - Social authentication providers
 * - Success confirmation with email verification instructions
 *
 * The registration flow includes validation, duplicate email checking,
 * 및 Supabase authentication integration.
 */
import type { Route } from "./+types/join";

import { CheckCircle2Icon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Form, Link, data } from "react-router";
import { z } from "zod";

import FormButton from "~/core/components/form-button";
import FormErrors from "~/core/components/form-error";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/core/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Checkbox } from "~/core/components/ui/checkbox";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import makeServerClient from "~/core/lib/supa-client.server";

import { SignUpButtons } from "../components/auth-login-buttons";
import { doesUserExist } from "../lib/queries.server";

/**
 * Meta function for the registration page
 *
 * Sets the page title using the application name from environment variables
 */
export const meta: Route.MetaFunction = () => {
  return [
    {
      title: `회원가입 | ${import.meta.env.VITE_APP_NAME}`,
    },
  ];
};

/**
 * Form validation schema for user registration
 *
 * Uses Zod to validate:
 * - Name: Required field
 * - Email: Must be a valid email format
 * - Password: Must be at least 8 characters long
 * - Confirm Password: Must match the password field
 * - Marketing: Boolean for marketing consent (defaults to false)
 * - Terms: Boolean for terms acceptance
 *
 * The schema includes a custom refinement to ensure passwords match
 */
const joinSchema = z
  .object({
    name: z.string().min(1, { message: "이름을 입력해주세요." }),
    email: z.string().email({ message: "올바른 이메일 주소를 입력해주세요." }),
    password: z
      .string()
      .min(8, { message: "비밀번호는 8자 이상이어야 합니다." }),
    confirmPassword: z
      .string()
      .min(8, { message: "비밀번호는 8자 이상이어야 합니다." }),
    marketing: z.coerce.boolean().default(false),
    terms: z.coerce.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

/**
 * Server action for handling user registration form submission
 *
 * This function processes the registration form data 및 attempts to create a new user.
 * The flow is:
 * 1. Parse 및 validate form data using the join schema
 * 2. Return validation errors if the data is invalid
 * 3. Verify terms of service acceptance
 * 4. Check if a user with the provided email already exists
 * 5. Create a new user with Supabase auth
 * 6. Return success or error response
 *
 * @param request - The form submission request
 * @returns Validation errors, auth errors, or success confirmation
 */
export async function action({ request }: Route.ActionArgs) {
  // Parse form data from the request
  const formData = await request.formData();
  const {
    data: validData,
    success,
    error,
  } = joinSchema.safeParse(Object.fromEntries(formData));

  // Return validation errors if form data is invalid
  if (!success) {
    return data({ fieldErrors: error.flatten().fieldErrors }, { status: 400 });
  }

  // Verify terms of service acceptance
  if (!validData.terms) {
    return data({ error: "이용약관에 동의해주세요." }, { status: 400 });
  }

  // Check if a user with the provided email already exists
  const userExists = await doesUserExist(validData.email);

  if (userExists) {
    return data({ error: "이미 가입된 이메일입니다." }, { status: 400 });
  }

  // Create Supabase client 및 attempt to sign up the user
  const [client] = makeServerClient(request);
  const { error: signInError } = await client.auth.signUp({
    ...validData,
    options: {
      // Store additional user metadata in Supabase auth
      data: {
        name: validData.name,
        display_name: validData.name,
        marketing_consent: validData.marketing,
      },
    },
  });

  // Return error if user creation fails
  if (signInError) {
    return data({ error: signInError.message }, { status: 400 });
  }

  // Return success response
  return {
    success: true,
  };
}

/**
 * Registration Component
 *
 * This component renders the registration form 및 handles user interactions.
 * It includes:
 * - Personal information fields (name, email)
 * - Password creation with confirmation
 * - Terms of service 및 marketing consent checkboxes
 * - Error display for form validation 및 registration errors
 * - Success confirmation with email verification instructions
 * - Social registration options
 * - Sign in link for existing users
 *
 * @param actionData - Data returned from the form action, including errors or success status
 */
export default function Join({ actionData }: Route.ComponentProps) {
  // Reference to the form element for resetting after successful submission
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the form when registration is successful
  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      formRef.current?.reset();
      formRef.current?.blur();
    }
  }, [actionData]);
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-2xl font-semibold" role="heading">
            억까 시작하기
          </CardTitle>
          <CardDescription className="text-base">
            간단한 정보로 계정을 만들어보세요
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Form
            className="flex w-full flex-col gap-5"
            method="post"
            ref={formRef}
          >
            <div className="flex flex-col items-start space-y-2">
              <Label htmlFor="name" className="flex flex-col items-start gap-1">
                이름
              </Label>
              <Input
                id="name"
                name="name"
                required
                type="text"
                placeholder="이름을 입력해주세요"
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors?.name ? (
                <FormErrors errors={actionData.fieldErrors.name} />
              ) : null}
            </div>
            <div className="flex flex-col items-start space-y-2">
              <Label
                htmlFor="email"
                className="flex flex-col items-start gap-1"
              >
                이메일
              </Label>
              <Input
                id="email"
                name="email"
                required
                type="email"
                placeholder="name@example.com"
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors?.email ? (
                <FormErrors errors={actionData.fieldErrors.email} />
              ) : null}
            </div>
            <div className="flex flex-col items-start space-y-2">
              <Label
                htmlFor="password"
                className="flex flex-col items-start gap-1"
              >
                비밀번호
                <small className="text-muted-foreground">
                  8자 이상 입력해주세요.
                </small>
              </Label>
              <Input
                id="password"
                name="password"
                required
                type="password"
                placeholder="비밀번호를 입력해주세요"
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors?.password ? (
                <FormErrors errors={actionData.fieldErrors.password} />
              ) : null}
            </div>
            <div className="flex flex-col items-start space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="flex flex-col items-start gap-1"
              >
                비밀번호 확인
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                required
                type="password"
                placeholder="비밀번호를 다시 입력해주세요"
              />
              {actionData &&
              "fieldErrors" in actionData &&
              actionData.fieldErrors?.confirmPassword ? (
                <FormErrors errors={actionData.fieldErrors.confirmPassword} />
              ) : null}
            </div>
            <FormButton label="회원가입" className="w-full" />
            {actionData && "error" in actionData && actionData.error ? (
              <FormErrors errors={[actionData.error]} />
            ) : null}

            <div className="flex items-center gap-2">
              <Checkbox id="marketing" name="marketing" />
              <Label htmlFor="marketing" className="text-muted-foreground">
                새로운 소식과 혜택을 이메일로 받을게요
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="terms" name="terms" checked />
              <Label htmlFor="terms" className="text-muted-foreground">
                <span>
                  다음 내용을 확인하고 동의합니다:{" "}
                  <Link
                    to="/legal/terms-of-service"
                    viewTransition
                    className="text-muted-foreground text-underline hover:text-foreground underline transition-colors"
                  >
                    이용약관
                  </Link>{" "}
                  및{" "}
                  <Link
                    to="/legal/privacy-policy"
                    viewTransition
                    className="text-muted-foreground hover:text-foreground text-underline underline transition-colors"
                  >
                    개인정보처리방침
                  </Link>
                </span>
              </Label>
            </div>
            {actionData && "success" in actionData && actionData.success ? (
              <Alert className="bg-green-600/20 text-green-700 dark:bg-green-950/20 dark:text-green-600">
                <CheckCircle2Icon
                  className="size-4"
                  color="oklch(0.627 0.194 149.214)"
                />
                <AlertTitle>회원가입이 완료됐어요!</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-600">
                  이메일로 전송된 인증 링크를 확인해주세요. 인증을 완료하면
                  로그인할 수 있어요.
                </AlertDescription>
              </Alert>
            ) : null}
          </Form>
          <SignUpButtons />
        </CardContent>
      </Card>
      <div className="flex flex-col items-center justify-center text-sm">
        <p className="text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link
            to="/login"
            viewTransition
            data-testid="form-signin-link"
            className="text-muted-foreground hover:text-foreground text-underline underline transition-colors"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
