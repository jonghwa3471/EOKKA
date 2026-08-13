import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { GoogleLogo } from "~/features/auth/components/logos/google";
import { KakaoLogo } from "~/features/auth/components/logos/kakao";

import {
  ConnectProviderButton,
  DisconnectProviderButton,
} from "../connect-provider-buttons";

const enabledProviders = [
  {
    name: "구글",
    key: "google",
    logo: <GoogleLogo />,
  },
  {
    name: "카카오",
    key: "kakao",
    logo: <KakaoLogo className="size-5 text-[#FEE500]" />,
  },
];

export default function ConnectSocialAccountsForm({
  providers,
}: {
  providers: string[];
}) {
  return (
    <Card className="w-full max-w-screen-md">
      <CardHeader>
        <CardTitle>소셜 계정 연결</CardTitle>
        <CardDescription>
          구글이나 카카오 계정을 연결하거나 연결을 해제할 수 있어요.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {enabledProviders.map((provider) => {
          if (providers.includes(provider.key)) {
            return (
              <DisconnectProviderButton
                key={provider.key}
                provider={provider.name}
                logo={provider.logo}
                providerKey={provider.key}
              />
            );
          } else {
            return (
              <ConnectProviderButton
                key={provider.key}
                provider={provider.name}
                logo={provider.logo}
                providerKey={provider.key}
              />
            );
          }
        })}
      </CardContent>
    </Card>
  );
}
