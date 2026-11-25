import type { FileHandle } from "node:fs/promises";
import type { FastifyReply, FastifyRequest } from "fastify";

function readRange(header: string, size: number) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (!m[1] && !m[2]) || !size) return null;
  const length = BigInt(size),
    last = length - 1n;
  const low = m[1] ? BigInt(m[1]) : length - BigInt(m[2]!);
  const high = m[1] && m[2] ? BigInt(m[2]) : last;
  if (low >= length || low > high) return null;
  return {
    start: Number(low < 0n ? 0n : low),
    end: Number(high > last ? last : high),
  };
}
export async function sendVideo(
  req: FastifyRequest,
  reply: FastifyReply,
  { file, size, mime }: { file: FileHandle; size: number; mime: string },
) {
  let handedOff = false;
  try {
    reply
      .header("Accept-Ranges", "bytes")
      .header("X-Content-Type-Options", "nosniff");
    const header = req.headers.range;
    const range = header === undefined ? undefined : readRange(header, size);
    if (range === null)
      return reply
        .code(416)
        .header("Content-Range", "bytes */" + size)
        .header("Content-Length", 0)
        .send();
    if (range)
      reply
        .code(206)
        .header("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    reply
      .type(mime)
      .header("Content-Length", range ? range.end - range.start + 1 : size);
    if (req.method === "HEAD") return reply.send();
    const body = file.createReadStream({ ...range, autoClose: true });
    handedOff = true;
    return reply.send(body);
  } finally {
    if (!handedOff) await file.close();
  }
}
