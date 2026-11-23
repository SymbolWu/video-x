import {
  randomBytes,
  createHash,
  scrypt as rawScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { Static } from "@sinclair/typebox";
import { Login, type ProfileDto } from "@video-x/contracts";
import { Database, sql, AppError } from "../../platform/db.js";
const scrypt = promisify(rawScrypt);
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return (
    "scrypt$" +
    salt +
    "$" +
    ((await scrypt(password, salt, 64)) as Buffer).toString("hex")
  );
}
async function verify(password: string, encoded: string) {
  const [algorithm, salt, key] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !key || !/^[a-f0-9]{128}$/.test(key))
    return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(key, "hex"));
}
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest();
const dummy = "scrypt$00000000000000000000000000000000$" + "0".repeat(128);
export async function createAccount(
  db: Database,
  username: string,
  password: string,
  displayName: string,
) {
  username = username.trim().toLowerCase();
  if (
    !/^[a-z0-9._-]{1,80}$/.test(username) ||
    password.length < 12 ||
    password.length > 128 ||
    !displayName.trim()
  )
    throw new AppError(
      400,
      "INVALID_ACCOUNT",
      "用户名限英文字母、数字及 ._-；密码需 12～128 位",
    );
  const hashed = await passwordHash(password);
  return db.transaction(async (tx) => {
    const [a] = await tx.query<{ id: string }>(
      sql`INSERT INTO video_x.accounts(username,password_hash) VALUES(${username},${hashed}) RETURNING id`,
    );
    const [p] = await tx.query<{ id: string }>(
      sql`INSERT INTO video_x.profiles(account_id,display_name) VALUES(${a!.id},${displayName.trim()}) RETURNING id`,
    );
    return p!.id;
  });
}
export async function login(db: Database, input: Static<typeof Login>) {
  const [account] = await db.query<{
    id: string;
    password_hash: string;
    profileId: string;
    displayName: string;
    username: string;
  }>(
    sql`SELECT a.id,a.password_hash,p.id AS "profileId",p.display_name AS "displayName",a.username FROM video_x.accounts a JOIN video_x.profiles p ON p.account_id=a.id WHERE a.username=${input.username.trim().toLowerCase()} AND a.disabled_at IS NULL`,
  );
  const valid = await verify(input.password, account?.password_hash ?? dummy);
  if (!account || !valid)
    throw new AppError(401, "INVALID_CREDENTIALS", "账号或密码不正确");
  const token = randomBytes(32).toString("base64url");
  const profile: ProfileDto = {
    id: account.profileId,
    displayName: account.displayName,
    username: account.username,
  };
  await db.transaction(async (tx) => {
    const [device] = await tx.query<{ id: string; revoked_at: Date | null }>(
      sql`INSERT INTO video_x.devices(profile_id,installation_id,client_kind,display_name,last_seen_at) VALUES(${profile.id},${input.installationId},${input.clientKind},${input.deviceName},now()) ON CONFLICT(profile_id,installation_id) DO UPDATE SET last_seen_at=now(),display_name=EXCLUDED.display_name RETURNING id,revoked_at`,
    );
    if (device!.revoked_at)
      throw new AppError(
        403,
        "DEVICE_REVOKED",
        "此设备已被撤销，请重新登记设备",
      );
    await tx.query(
      sql`INSERT INTO video_x.auth_sessions(device_id,token_hash,expires_at) VALUES(${device!.id},${hashToken(token)},now()+interval '7 days')`,
    );
  });
  return { profile, token };
}
export async function authenticate(db: Database, token: string) {
  if (token.length !== 43) return null;
  const [row] = await db.query<
    ProfileDto & { sessionId: string; deviceId: string }
  >(
    sql`SELECT p.id,p.display_name AS "displayName",a.username,s.id AS "sessionId", d.id AS "deviceId" FROM video_x.auth_sessions s JOIN video_x.devices d ON d.id=s.device_id JOIN video_x.profiles p ON p.id=d.profile_id JOIN video_x.accounts a ON a.id=p.account_id WHERE s.token_hash=${hashToken(token)} AND s.expires_at>now() AND s.revoked_at IS NULL AND d.revoked_at IS NULL AND a.disabled_at IS NULL`,
  );
  return row ?? null;
}
