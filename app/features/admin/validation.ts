import { z } from "zod";

export const ticketSchema = z.object({
  category: z.enum(["bug", "feature", "other"]),
  title: z.string().trim().min(2).max(100),
  body: z.string().trim().min(5).max(5000),
});
export const replySchema = z.object({
  ticket: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});
export const deleteTicketSchema = z.object({
  ticket: z.string().uuid(),
});
export const deleteMessageSchema = deleteTicketSchema.extend({
  message: z.string().uuid(),
});
export const announcementSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(2).max(100),
  body: z.string().trim().min(5).max(5000),
});
export const categoryLabels = {
  bug: "버그 신고",
  feature: "기능 제안",
  other: "기타 문의",
};

export function assertSameOrigin(request: Request) {
  if (
    request.method !== "POST" ||
    request.headers.get("origin") !== new URL(request.url).origin
  ) {
    throw new Response("허용되지 않은 요청입니다.", { status: 403 });
  }
}
