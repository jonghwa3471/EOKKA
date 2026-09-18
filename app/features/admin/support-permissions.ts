export function canDeleteSupportTicket(
  userId: string,
  ownerId: string,
  staff: boolean,
) {
  return staff || userId === ownerId;
}

export function canDeleteSupportMessage({
  userId,
  authorId,
  staff,
  isInitial,
}: {
  userId: string;
  authorId: string | null;
  staff: boolean;
  isInitial: boolean;
}) {
  return !isInitial && (staff || authorId === userId);
}
