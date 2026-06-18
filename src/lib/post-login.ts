import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the path the given user should land on after login,
 * based on their role in user_roles.
 */
export async function getPostLoginPath(userId: string): Promise<string> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) return "/";
  return data === true ? "/admin" : "/";
}
