import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/db";
import { requireAdmin, canAdminWrite } from "@/lib/adminAuth";
import { sameOrigin } from "@/lib/telegramSession";
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin || !canAdminWrite(admin.role, "campaigns") || !sameOrigin(request))
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 4000000)
    return NextResponse.json(
      { error: "Image must be below 3 MB" },
      { status: 413 },
    );
  try {
    const file = (await request.formData()).get("image");
    if (
      !(file instanceof File) ||
      file.size > 3000000 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    )
      return NextResponse.json(
        { error: "Upload PNG, JPEG or WebP below 3 MB" },
        { status: 400 },
      );
    const decoder = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 16000000,
    });
    const metadata = await decoder.metadata();
    if (!metadata.format || !["png", "jpeg", "webp"].includes(metadata.format))
      return NextResponse.json(
        { error: "Unsupported image format" },
        { status: 400 },
      );
    const data = await decoder
      .rotate()
      .resize({
        width: 1280,
        height: 1280,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
    if (data.length > 3000000)
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    const image = await db.mediaAsset.create({
      data: { mime: "image/png", data, createdBy: admin.username },
    });
    return NextResponse.json({ id: image.id });
  } catch {
    return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  }
}
