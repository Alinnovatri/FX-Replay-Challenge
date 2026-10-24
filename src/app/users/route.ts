import { createUserSchema, listUsersQuerySchema } from '@/contracts/users';
import { track } from '@/server/analytics';
import { profileCookie, requireAdmin } from '@/server/auth';
import { HttpError, handle, json, logError, parseOr400, readJson } from '@/server/http';
import { createUser, findIdempotent, listUsers, rememberIdempotent, requestHash } from '@/server/users';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Create an account. Public; sets the short-lived self-service cookie for the optional profile step. */
export async function POST(request: Request): Promise<Response> {
  return handle(async (requestId) => {
    const key = request.headers.get('idempotency-key') ?? undefined;
    if (key !== undefined && !UUID.test(key)) {
      throw new HttpError(400, 'VALIDATION_FAILED', 'Idempotency-Key must be a UUID', {
        'Idempotency-Key': 'Must be a UUID',
      });
    }
    const input = parseOr400(createUserSchema.safeParse(await readJson(request)));
    const hash = requestHash(input);

    if (key) {
      const previous = await findIdempotent(key);
      if (previous) {
        if (previous.requestHash !== hash) {
          throw new HttpError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'This Idempotency-Key was already used with a different request',
          );
        }
        // A retry of a request that already succeeded: same response, no second conversion event.
        return json({ user: previous.body }, previous.status, {
          'set-cookie': profileCookie(previous.userId),
          'idempotent-replayed': 'true',
          location: `/users/${previous.userId}`,
        });
      }
    }

    let user;
    try {
      user = await createUser(input.email);
    } catch (error) {
      // Two concurrent retries with the same key: the loser replays the winner's stored response.
      if (key && error instanceof HttpError && error.code === 'EMAIL_TAKEN') {
        const winner = await findIdempotent(key);
        if (winner && winner.requestHash === hash) {
          return json({ user: winner.body }, winner.status, {
            'set-cookie': profileCookie(winner.userId),
            'idempotent-replayed': 'true',
            location: `/users/${winner.userId}`,
          });
        }
      }
      throw error;
    }
    // The account exists from here on: count the conversion first, then store the replay record.
    await track({ name: 'user_signed_up', userId: user.id });
    if (key) {
      try {
        await rememberIdempotent(key, hash, user);
      } catch (error) {
        // Losing the replay record only weakens retries (they get 409 EMAIL_TAKEN); the signup itself succeeded.
        logError('idempotency_store_failed', error, requestId);
      }
    }
    return json({ user }, 201, { 'set-cookie': profileCookie(user.id), location: `/users/${user.id}` });
  });
}

/** List users, newest first. Admin only: the response contains email addresses. */
export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    requireAdmin(request);
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const query = parseOr400(listUsersQuerySchema.safeParse(params));
    return json(await listUsers(query.limit ?? 20, query.cursor), 200);
  });
}
