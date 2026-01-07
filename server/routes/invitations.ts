import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/adminAuth";
import { supabaseAdmin } from "../utils/supabaseAdmin";

interface CreateInvitationRequest {
  primaryFirstName: string;
  primaryLastName: string;
  primaryEmail: string;
  inviteType: "single" | "couple" | "plusone";
  secondFirstName?: string;
  secondLastName?: string;
  accommodationGroup: string;
  invitedToAtitlan: boolean;
  inviteCode: string;
}

export async function createInvitation(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const {
      primaryFirstName,
      primaryLastName,
      primaryEmail,
      inviteType,
      secondFirstName,
      secondLastName,
      accommodationGroup,
      invitedToAtitlan,
      inviteCode,
    }: CreateInvitationRequest = req.body;

    console.log("📨 Creating invitation:", {
      primaryEmail,
      inviteType,
      inviteCode,
    });

    // Validation
    if (
      !primaryFirstName ||
      !primaryLastName ||
      !primaryEmail ||
      !inviteType ||
      !accommodationGroup ||
      !inviteCode
    ) {
      return res.status(400).json({
        error: "Validation error",
        message: "Missing required fields",
      });
    }

    // Validate invite type
    if (!["single", "couple", "plusone"].includes(inviteType)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid invite type",
      });
    }

    // If couple, validate second guest fields
    if (inviteType === "couple" && (!secondFirstName || !secondLastName)) {
      return res.status(400).json({
        error: "Validation error",
        message:
          "Second guest first name and last name are required for couple invitations",
      });
    }

    // Validate invite code format (alphanumeric, no spaces)
    if (!/^[a-zA-Z0-9]+$/.test(inviteCode)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invite code must be alphanumeric with no spaces",
      });
    }

    // Check if email already exists in auth.users
    console.log("Checking if email exists...");
    const { data: existingAuthUsers, error: authCheckError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (authCheckError) {
      console.error("Error checking existing users:", authCheckError);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to check existing users",
      });
    }

    const emailExists = existingAuthUsers.users.some(
      (user) => user.email?.toLowerCase() === primaryEmail.toLowerCase()
    );

    if (emailExists) {
      return res.status(409).json({
        error: "Conflict",
        message:
          "This email is already registered. Please ask the user to log in or reset their password.",
      });
    }

    // Check if invite code already exists
    console.log("Checking if invite code exists...");
    const { data: existingInvite, error: inviteCheckError } =
      await supabaseAdmin
        .from("invites")
        .select("invite_code")
        .eq("invite_code", inviteCode)
        .maybeSingle();

    if (inviteCheckError) {
      console.error("Error checking invite code:", inviteCheckError);
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to check invite code",
      });
    }

    if (existingInvite) {
      return res.status(409).json({
        error: "Conflict",
        message:
          "This invite code is already in use. Please choose a different code.",
      });
    }

    // Step 1: Create auth user
    console.log("Creating auth user...");
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: primaryEmail,
        password: inviteCode, // Use invite code as password
        email_confirm: true, // Auto-confirm so they can log in immediately
      });

    if (authError || !authData.user) {
      console.error("Error creating auth user:", authError);
      return res.status(500).json({
        error: "Internal server error",
        message: `Failed to create authentication account: ${authError?.message}`,
      });
    }

    console.log("✅ Auth user created:", authData.user.id);

    try {
      // Step 2: Create invite record
      console.log("Creating invite record...");
      const { data: invite, error: inviteError } = await supabaseAdmin
        .from("invites")
        .insert({
          invite_code: inviteCode,
          invite_type: inviteType,
          accommodation_group: accommodationGroup,
          invited_to_atitlan: invitedToAtitlan,
          rsvp_status: "pending",
        })
        .select()
        .single();

      if (inviteError || !invite) {
        console.error("Error creating invite:", inviteError);
        // Rollback: Delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(500).json({
          error: "Internal server error",
          message: `Failed to create invite record: ${inviteError?.message}`,
        });
      }

      console.log("✅ Invite created:", invite.id);

      // Step 3: Create primary guest record
      console.log("Creating primary guest record...");
      const { data: primaryGuest, error: primaryGuestError } =
        await supabaseAdmin
          .from("guests")
          .insert({
            invite_id: invite.id,
            user_id: authData.user.id, // Link to auth user
            first_name: primaryFirstName,
            last_name: primaryLastName,
            email: primaryEmail,
            is_primary: true,
          })
          .select()
          .single();

      if (primaryGuestError || !primaryGuest) {
        console.error("Error creating primary guest:", primaryGuestError);
        // Rollback: Delete invite and auth user
        await supabaseAdmin.from("invites").delete().eq("id", invite.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(500).json({
          error: "Internal server error",
          message: `Failed to create primary guest record: ${primaryGuestError?.message}`,
        });
      }

      console.log("✅ Primary guest created:", primaryGuest.id);

      // Step 4: If couple, create second guest record
      if (inviteType === "couple" && secondFirstName && secondLastName) {
        console.log("Creating second guest record...");
        const { data: secondGuest, error: secondGuestError } =
          await supabaseAdmin
            .from("guests")
            .insert({
              invite_id: invite.id,
              user_id: null, // No auth account for second guest
              first_name: secondFirstName,
              last_name: secondLastName,
              email: null,
              is_primary: false,
            })
            .select()
            .single();

        if (secondGuestError) {
          console.error("Error creating second guest:", secondGuestError);
          // Continue anyway - second guest creation is not critical
        } else {
          console.log("✅ Second guest created:", secondGuest.id);
        }
      }

      // Success!
      console.log("🎉 Invitation created successfully!");
      return res.status(201).json({
        success: true,
        inviteCode: inviteCode,
        message: "Invitation created successfully",
        data: {
          inviteId: invite.id,
          primaryGuestId: primaryGuest.id,
        },
      });
    } catch (err: any) {
      console.error("Error in invitation creation:", err);
      // Attempt rollback
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }
      return res.status(500).json({
        error: "Internal server error",
        message: err.message || "Failed to create invitation",
      });
    }
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message || "An unexpected error occurred",
    });
  }
}
