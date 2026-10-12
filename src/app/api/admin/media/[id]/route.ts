import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin(request)))
    return new Response(null, { status: 401 });
  const { id } = await params;
  const image = await db.mediaAsset.findUnique({ where: { id } });
  if (!image) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
