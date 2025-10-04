import type { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/api-utils";
import { createClient } from "@/lib/supabase/server";
import { monitorCreateSchema } from "@/lib/validation/schemas";
import { ValidationError, NotFoundError } from "@/lib/errors/error-handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (user) => {
    const { id } = await params;
    const supabase = await createClient();

    const { data: monitor, error } = await supabase
      .from("monitors")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !monitor) {
      throw new NotFoundError("Monitor");
    }

    return { data: monitor };
  }, request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(
    async (user) => {
      const { id } = await params;
      const body = await request.json();

      // Validate input
      const validationResult = monitorCreateSchema.partial().safeParse(body);
      if (!validationResult.success) {
        throw new ValidationError(
          validationResult.error.issues.map((e) => e.message).join(", ")
        );
      }

      const updateData = validationResult.data;
      const supabase = await createClient();

      const { data: monitor, error } = await supabase
        .from("monitors")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error || !monitor) {
        throw new NotFoundError("Monitor");
      }

      return {
        data: monitor,
        message: "Monitor updated successfully",
      };
    },
    request,
    { rateLimit: { limit: 100, window: 60000 } }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(
    async (user) => {
      const { id } = await params;
      const supabase = await createClient();

      const { error } = await supabase
        .from("monitors")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(`Failed to delete monitor: ${error.message}`);
      }

      return { message: "Monitor deleted successfully" };
    },
    request,
    { rateLimit: { limit: 50, window: 60000 } }
  );
}
