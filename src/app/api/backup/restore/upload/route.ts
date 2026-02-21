import { NextResponse } from "next/server";
import { requireRestoreAdmin } from "@/lib/auth";
import { prepareRestoreUpload, RestoreLimitError, RestoreValidationError } from "@/lib/restore";
import { checkRateLimit, defaultRateLimitPolicies, isSameOriginRequest } from "@/lib/request-security";

export const dynamic = "force-dynamic";

function parseUploadMaxBytes() {
  const raw = process.env.RESTORE_UPLOAD_MAX_BYTES;
  if (!raw) {
    return 100 * 1024 * 1024;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100 * 1024 * 1024;
  }
  return Math.floor(parsed);
}

function authErrorStatus(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return 401;
  }
  return 403;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, message: "Forbidden origin" }, { status: 403 });
  }

  const limitResult = checkRateLimit(request, defaultRateLimitPolicies().restoreUpload);
  if (!limitResult.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Please retry later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limitResult.retryAfterSec)
        }
      }
    );
  }

  try {
    await requireRestoreAdmin();
  } catch (error) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: authErrorStatus(error) });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "복원할 DB 파일(.sqlite)을 선택해 주세요." },
        { status: 400 }
      );
    }

    const maxBytes = parseUploadMaxBytes();
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          ok: false,
          message: `업로드 파일이 너무 큽니다. 최대 ${maxBytes.toLocaleString("en-US")} bytes까지 허용됩니다.`
        },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.byteLength === 0) {
      return NextResponse.json({ ok: false, message: "업로드 파일이 비어 있습니다." }, { status: 400 });
    }

    const prepared = await prepareRestoreUpload({
      fileName: file.name,
      bytes
    });

    return NextResponse.json({
      ok: true,
      restoreToken: prepared.restoreToken,
      validation: prepared.validation
    });
  } catch (error) {
    if (error instanceof RestoreLimitError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message
        },
        { status: error.status }
      );
    }

    if (error instanceof RestoreValidationError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
          validation: error.validation
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "복원 파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
