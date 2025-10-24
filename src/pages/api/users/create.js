import { supabaseAdmin } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { email, password, roleIds } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);

    // Step 1: Create the user
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from("users")
      .insert({ email, password_hash })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        return res.status(409).json({ error: "A user with this email already exists." });
      }
      throw insertError;
    }

    // Step 2: Set the external_user_id to match the internal id for consistency
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ external_user_id: newUser.id })
      .eq('id', newUser.id);

    if (updateError) throw updateError;

    // Step 3: Assign roles if provided
    if (roleIds && roleIds.length > 0) {
      const rolesToInsert = roleIds.map(roleId => ({
        user_id: newUser.id,
        role_id: roleId,
      }));
      const { error: rolesError } = await supabaseAdmin.from('user_roles').insert(rolesToInsert);
      if (rolesError) throw rolesError;
    }

    res.status(201).json({ message: "User created successfully." });

  } catch (error) {
    console.error("User creation error:", error);
    res.status(500).json({ error: "Could not create user." });
  }
}