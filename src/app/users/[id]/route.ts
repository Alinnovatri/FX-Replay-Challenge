import { adminUpdateSchema } from '@/contracts/users';
import { track } from '@/server/analytics';
import { isAdmin, PROFILE_COOKIE, readCookie, verifyProfileToken } from '@/server/auth';
import { HttpError, handle, json, parseOr400, readJson } from '@/server/http';
import { updateUser } from '@/server/users';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Update a user. The admin token may change any field. The self-service cookie set by POST /users may change
 * profile fields of that same user only, never the email.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    if (!UUID.test(id)) throw new HttpError(404, 'NOT_FOUND', 'No user with this id');

    const admin = isAdmin(request);
    const selfId = admin ? null : verifyProfileToken(readCookie(request, PROFILE_COOKIE));
    if (!admin && !selfId)
      throw new HttpError(401, 'UNAUTHORIZED', 'Sign up again or use an admin token to update this user');
    if (!admin && selfId !== id) throw new HttpError(403, 'FORBIDDEN', 'You can only update your own profile');

    const changes = parseOr400(adminUpdateSchema.safeParse(await readJson(request)));
    if (!admin && changes.email !== undefined)
      throw new HttpError(403, 'FORBIDDEN', 'Email can only be changed by an admin');
    if (Object.keys(changes).length === 0)
      throw new HttpError(400, 'VALIDATION_FAILED', 'Send at least one field to update');

    const user = await updateUser(id, changes);
    if (!admin) await track({ name: 'profile_completed', userId: id, fieldsCount: Object.keys(changes).length });
    return json({ user }, 200);
  });
}
