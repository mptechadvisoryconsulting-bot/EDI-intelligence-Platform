import { NextRequest, NextResponse } from "next/server";
import { isSessionResponse, requireSessionOr401 } from "@/lib/api-session";
import {
  createInterfaceDefinition,
  INTERFACE_LAYOUT_TYPES,
  listInterfaceDefinitions,
} from "@/lib/interface-definitions";
import { parseErpLayoutBuffer, validateLayoutFields } from "@/lib/erp-layout";

const MAX_LAYOUT_BYTES = 10 * 1024 * 1024;

export async function GET() {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;
  return NextResponse.json({ definitions: await listInterfaceDefinitions(session.id) });
}

export async function POST(request: NextRequest) {
  const session = await requireSessionOr401();
  if (isSessionResponse(session)) return session;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const transactionCode = String(formData.get("transactionCode") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const version = String(formData.get("version") ?? "").trim();
    const layoutType = String(formData.get("layoutType") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    const erpSystem = String(formData.get("erpSystem") ?? "").trim() || null;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "An interface layout file is required" }, { status: 400 });
    }
    if (!name || !version || !/^\d{3}$/.test(transactionCode)) {
      return NextResponse.json(
        { error: "Transaction code, interface name, and version are required" },
        { status: 400 }
      );
    }
    if (!INTERFACE_LAYOUT_TYPES.includes(layoutType as (typeof INTERFACE_LAYOUT_TYPES)[number])) {
      return NextResponse.json({ error: "Unsupported layout type" }, { status: 400 });
    }
    if (file.size > MAX_LAYOUT_BYTES) {
      return NextResponse.json({ error: "Layout file exceeds the 10 MB limit" }, { status: 413 });
    }

    const fields = parseErpLayoutBuffer(Buffer.from(await file.arrayBuffer()), file.name);
    if (fields.length === 0) {
      return NextResponse.json(
        {
          error:
            "No fields were found. Include Interface Column and Field Name, plus Record Type, positions, data type, validation, and repeating columns when available.",
        },
        { status: 400 }
      );
    }

    const definition = await createInterfaceDefinition(session.id, {
      transactionCode,
      name,
      version,
      layoutType: layoutType as (typeof INTERFACE_LAYOUT_TYPES)[number],
      description,
      erpSystem,
      originalFileName: file.name,
      fields,
    });

    return NextResponse.json(
      {
        ok: true,
        definition,
        validation: validateLayoutFields(fields),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create interface definition";
    const duplicate = /unique constraint/i.test(message);
    return NextResponse.json(
      {
        error: duplicate
          ? "That transaction and version already exist in the Interface Library"
          : message,
      },
      { status: duplicate ? 409 : 500 }
    );
  }
}
