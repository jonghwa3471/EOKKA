import { useEffect, useRef } from "react";
import { useNavigation } from "react-router";
import Turnstile, { type BoundTurnstileObject } from "react-turnstile";

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

export function AuthTurnstile({ action }: { action: string }) {
  const navigation = useNavigation();
  const previousState = useRef(navigation.state);
  const widget = useRef<BoundTurnstileObject | null>(null);

  useEffect(() => {
    if (previousState.current !== "idle" && navigation.state === "idle")
      widget.current?.reset();
    previousState.current = navigation.state;
  }, [navigation.state]);

  if (!siteKey) return null;

  return (
    <div className="flex w-full justify-center py-1">
      <Turnstile
        sitekey={siteKey}
        action={action}
        theme="auto"
        language="ko"
        size="normal"
        appearance="always"
        refreshExpired="auto"
        responseField
        responseFieldName="captchaToken"
        onLoad={(_widgetId, boundWidget) => {
          widget.current = boundWidget;
        }}
      />
    </div>
  );
}

export function authCaptchaToken(formData: FormData) {
  const token = formData.get("captchaToken");
  if (!siteKey) return undefined;
  return typeof token === "string" && token.trim() ? token : null;
}
