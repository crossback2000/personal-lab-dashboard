import { prepareRestoreUpload, RestoreLimitError, RestoreValidationError } from "@/lib/restore";
import { defaultRateLimitPolicies } from "@/lib/request-security";
import { guardApiRequest, jsonNoStore } from "@/lib/http/guard";

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

export async function POST(request: Request) {
  const guard = await guardApiRequest(request, {
    auth: "restore-admin",
    sameOrigin: true,
    rateLimitPolicy: defaultRateLimitPolicies().restoreUpload
  });
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonNoStore(
        { ok: false, message: "복원할 DB 파일(.sqlite)을 선택해 주세요." },
        { status: 400 }
      );
    }

    const maxBytes = parseUploadMaxBytes();
    if (file.size > maxBytes) {
      return jsonNoStore(
        {
          ok: false,
          message: `업로드 파일이 너무 큽니다. 최대 ${maxBytes.toLocaleString("en-US")} bytes까지 허용됩니다.`
        },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.byteLength === 0) {
      return jsonNoStore(
        { ok: false, message: "업로드 파일이 비어 있습니다." },
        { status: 400 }
      );
    }

    const prepared = await prepareRestoreUpload({
      fileName: file.name,
      bytes
    });

    return jsonNoStore({
      ok: true,
      restoreToken: prepared.restoreToken,
      validation: prepared.validation
    });
  } catch (error) {
    if (error instanceof RestoreLimitError) {
      return jsonNoStore(
        {
          ok: false,
          message: error.message
        },
        { status: error.status }
      );
    }

    if (error instanceof RestoreValidationError) {
      return jsonNoStore(
        {
          ok: false,
          message: error.message,
          validation: error.validation
        },
        { status: 400 }
      );
    }

    console.error("[restore.upload] failed", error);
    return jsonNoStore(
      { ok: false, message: "복원 파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
