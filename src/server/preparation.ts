import { createHash } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { preparationMessages, preparationRooms } from '@/db/schema';

export type KairosDb = NonNullable<ReturnType<typeof getDb>>;

export const PERSONAL_PREPARATION_ROOM_TYPE = 'personal';
export const PERSONAL_PREPARATION_ROOM_METADATA = {
  visibility: 'private',
  audience: 'owner',
  collaboration: false,
} as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asMetadata(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function personalRoomMetadata(value: unknown): Record<string, unknown> {
  return {
    ...asMetadata(value),
    ...PERSONAL_PREPARATION_ROOM_METADATA,
  };
}

export function serializePreparationRoom(room: typeof preparationRooms.$inferSelect) {
  return {
    ...room,
    roomType: PERSONAL_PREPARATION_ROOM_TYPE,
    metadata: personalRoomMetadata(room.metadata),
    isPersonal: true,
  };
}

export function hashPreparationContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function findOwnedPreparationRoom(
  db: KairosDb,
  roomId: string,
  userId: string,
) {
  const [room] = await db
    .select()
    .from(preparationRooms)
    .where(and(eq(preparationRooms.id, roomId), eq(preparationRooms.userId, userId)));
  return room;
}

export async function findOwnedPreparationMessage(
  db: KairosDb,
  messageId: string,
  userId: string,
) {
  const [message] = await db
    .select()
    .from(preparationMessages)
    .where(and(eq(preparationMessages.id, messageId), eq(preparationMessages.userId, userId)));

  if (!message) return undefined;

  const room = await findOwnedPreparationRoom(db, message.roomId, userId);
  if (!room) return undefined;

  return { message, room };
}

export async function getNextPreparationMessageSequence(
  db: KairosDb,
  roomId: string,
  userId: string,
): Promise<number> {
  const messages = await db
    .select({ sequence: preparationMessages.sequence })
    .from(preparationMessages)
    .where(and(eq(preparationMessages.roomId, roomId), eq(preparationMessages.userId, userId)))
    .orderBy(desc(preparationMessages.sequence));

  return (messages[0]?.sequence ?? 0) + 1;
}
