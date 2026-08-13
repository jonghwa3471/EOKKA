import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@^1.0.0";
import React from "npm:react@^19.0.0";

type EmailActionType = "signup" | "magiclink" | "recovery" | "email_change";

interface AuthEmailProps {
  action: EmailActionType;
  confirmationUrl: string;
  recipientName?: string;
}

const copy: Record<
  EmailActionType,
  { preview: string; heading: string; description: string; button: string }
> = {
  signup: {
    preview: "EOKKA 회원가입을 완료해 주세요.",
    heading: "EOKKA에 오신 것을 환영해요",
    description: "아래 버튼을 누르면 회원가입과 로그인이 완료됩니다.",
    button: "EOKKA 시작하기",
  },
  magiclink: {
    preview: "요청하신 EOKKA 로그인 링크입니다.",
    heading: "다시 만나서 반가워요",
    description: "아래 버튼을 누르면 비밀번호 없이 안전하게 로그인됩니다.",
    button: "EOKKA 로그인",
  },
  recovery: {
    preview: "EOKKA 계정 복구를 진행해 주세요.",
    heading: "계정 복구를 도와드릴게요",
    description: "아래 버튼을 눌러 계정 복구 절차를 계속해 주세요.",
    button: "계정 복구하기",
  },
  email_change: {
    preview: "EOKKA 이메일 주소 변경을 확인해 주세요.",
    heading: "이메일 변경을 확인해 주세요",
    description: "아래 버튼을 누르면 이메일 주소 변경이 확인됩니다.",
    button: "이메일 변경 확인",
  },
};

export default function AuthEmail({
  action,
  confirmationUrl,
  recipientName,
}: AuthEmailProps) {
  const content = copy[action];

  return (
    <Html lang="ko">
      <Head />
      <Preview>{content.preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={accent} />
          <Section style={contentBox}>
            <Text style={brand}>EOKKA</Text>
            <Text style={badge}>BETA</Text>
            <Heading style={heading}>{content.heading}</Heading>
            <Text style={description}>
              {recipientName ? `${recipientName}님, ` : ""}
              {content.description}
            </Text>
            <Button href={confirmationUrl} style={button}>
              {content.button}
            </Button>
            <Text style={notice}>
              이 링크는 한 번만 사용할 수 있으며 일정 시간이 지나면 만료됩니다.
            </Text>
            <Hr style={divider} />
            <Text style={help}>
              버튼이 작동하지 않으면 아래 주소를 브라우저에 복사해 주세요.
            </Text>
            <Text style={urlText}>{confirmationUrl}</Text>
            <Text style={help}>
              본인이 요청하지 않았다면 이 이메일을 무시해도 안전합니다.
            </Text>
          </Section>
          <Text style={footer}>© {new Date().getFullYear()} EOKKA</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#090b0f",
  color: "#f8fafc",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: 0,
  padding: "32px 12px",
};

const container = { margin: "0 auto", maxWidth: "560px" };
const accent = {
  background: "linear-gradient(90deg, #10b981, #22d3ee, #8b5cf6)",
  borderRadius: "18px 18px 0 0",
  height: "5px",
};
const contentBox = {
  backgroundColor: "#15181d",
  border: "1px solid #2b3038",
  borderRadius: "0 0 18px 18px",
  padding: "38px 36px 32px",
};
const brand = {
  color: "#34d399",
  display: "inline-block",
  fontSize: "18px",
  fontWeight: "800",
  letterSpacing: "2px",
  margin: "0 10px 28px 0",
};
const badge = {
  border: "1px solid #4b5563",
  borderRadius: "999px",
  color: "#9ca3af",
  display: "inline-block",
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "1px",
  margin: 0,
  padding: "4px 8px",
};
const heading = {
  color: "#ffffff",
  fontSize: "26px",
  lineHeight: "1.35",
  margin: "0 0 14px",
};
const description = {
  color: "#c4c9d1",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: "0 0 28px",
};
const button = {
  backgroundColor: "#f8fafc",
  borderRadius: "10px",
  color: "#111827",
  display: "block",
  fontSize: "15px",
  fontWeight: "700",
  padding: "14px 20px",
  textAlign: "center" as const,
  textDecoration: "none",
};
const notice = {
  color: "#8b93a1",
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "18px 0 0",
  textAlign: "center" as const,
};
const divider = { borderColor: "#30353d", margin: "30px 0" };
const help = {
  color: "#8b93a1",
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "12px 0",
};
const urlText = {
  color: "#67e8f9",
  fontSize: "11px",
  lineHeight: "1.6",
  overflowWrap: "anywhere" as const,
};
const footer = {
  color: "#626a76",
  fontSize: "11px",
  margin: "18px 0 0",
  textAlign: "center" as const,
};
