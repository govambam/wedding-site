import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabase";

interface Guest {
  id: string;
  invite_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  user_id: string | null;
  is_primary: boolean;
  attending?: boolean;
  dietary_restrictions?: string[];
  dietary_notes?: string;
  accommodation_needed?: boolean;
  accommodation_payment_level?: "none" | "half" | "full";
  atitlan_attending?: boolean;
  atitlan_payment_level?: "none" | "half" | "full";
}

interface Invite {
  id: string;
  invite_type: "single" | "couple" | "plusone";
  accommodation_group: string;
  invited_to_atitlan: boolean;
  rsvp_status: string;
}

interface AccommodationGroup {
  group_code: string;
  display_name: string;
  description: string;
  per_night_cost: number;
  number_of_nights: number;
  payment_options: number[];
}

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Dairy-Free",
  "Gluten-Free",
  "Nut Allergy",
  "Other",
  "None",
];

const DIETARY_LEFT_COLUMN = [
  "Vegetarian",
  "Pescatarian",
  "Gluten-Free",
  "Other",
];
const DIETARY_RIGHT_COLUMN = ["Vegan", "Dairy-Free", "Nut Allergy", "None"];

export default function RSVP() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Auth & data
  const [currentGuest, setCurrentGuest] = useState<Guest | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [accommodationGroup, setAccommodationGroup] =
    useState<AccommodationGroup | null>(null);

  // Form state
  const [guests, setGuests] = useState<Guest[]>([]);
  const [attendanceDecision, setAttendanceDecision] = useState<boolean | null>(
    null
  );
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(
    new Set()
  );
  const [plusOneNames, setPlusOneNames] = useState({
    firstName: "",
    lastName: "",
  });
  const [showPlusOneForm, setShowPlusOneForm] = useState(false);
  const [accommodationNeeded, setAccommodationNeeded] = useState<boolean | null>(
    null
  );
  const [accommodationPayment, setAccommodationPayment] = useState<
    "none" | "half" | "full" | null
  >(null);
  const [atitlanAttending, setAtitlanAttending] = useState<boolean | null>(null);
  const [atitlanGuests, setAtitlanGuests] = useState<Set<string>>(new Set());
  const [atitlanPayments, setAtitlanPayments] = useState<
    Record<string, "none" | "half" | "full">
  >({});
  const [formComplete, setFormComplete] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: session, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !session.session) {
        navigate("/login");
        return;
      }

      // Get current guest and invite
      const { data: guest, error: guestError } = await supabase
        .from("guests")
        .select("*")
        .eq("user_id", session.session.user.id)
        .single();

      if (guestError || !guest) {
        setError("Unable to load guest information");
        setLoading(false);
        return;
      }

      const { data: inviteData, error: inviteError } = await supabase
        .from("invites")
        .select("*")
        .eq("id", guest.invite_id)
        .single();

      if (inviteError || !inviteData) {
        setError("Unable to load invite information");
        setLoading(false);
        return;
      }

      // Get all guests in invite
      const { data: allGuests, error: allGuestsError } = await supabase
        .from("guests")
        .select("*")
        .eq("invite_id", guest.invite_id)
        .order("is_primary", { ascending: false });

      if (allGuestsError || !allGuests) {
        setError("Unable to load guest list");
        setLoading(false);
        return;
      }

      // Get accommodation group if applicable
      if (inviteData.accommodation_group) {
        const { data: accomGroup } = await supabase
          .from("accommodation_groups")
          .select("*")
          .eq("group_code", inviteData.accommodation_group)
          .single();

        if (accomGroup) {
          setAccommodationGroup(accomGroup);
        }
      }

      setCurrentGuest(guest as Guest);
      setInvite(inviteData as Invite);
      setGuests(
        allGuests.map((g) => ({
          ...g,
          attending: true,
          dietary_restrictions: [],
          accommodation_needed: true,
          accommodation_payment_level: "full",
          atitlan_attending: false,
          atitlan_payment_level: "full",
        }))
      );

      // Initialize selected attendees with all guests
      setSelectedAttendees(new Set(allGuests.map((g) => g.id)));

      setLoading(false);
    } catch (err) {
      console.error("Error loading RSVP data:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleAttendanceDecision = (attending: boolean) => {
    setAttendanceDecision(attending);
    if (!attending) {
      submitDecline();
    }
  };

  const submitDecline = async () => {
    setSubmitting(true);
    try {
      if (!invite) return;

      // Mark all guests as not attending
      for (const guest of guests) {
        await supabase.from("rsvp_responses").upsert({
          guest_id: guest.id,
          attending: false,
          dietary_restrictions: [],
          accommodation_needed: false,
          atitlan_attending: false,
        });
      }

      // Update invite
      await supabase
        .from("invites")
        .update({
          rsvp_status: "declined",
          rsvp_submitted_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      setSuccessMessage(
        "We will miss you and can't wait to celebrate with you soon!"
      );
      setTimeout(() => navigate("/wedding"), 2000);
    } catch (err) {
      console.error("Error submitting decline:", err);
      setError("Failed to submit decline. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttendeesChange = (guestId: string, checked: boolean) => {
    const updated = new Set(selectedAttendees);
    if (checked) {
      updated.add(guestId);
    } else {
      updated.delete(guestId);
    }
    setSelectedAttendees(updated);
  };

  const getAttendingGuests = () => {
    return guests.filter((g) => selectedAttendees.has(g.id));
  };

  const handleDietaryChange = (
    guestId: string,
    option: string,
    checked: boolean
  ) => {
    setGuests(
      guests.map((g) => {
        if (g.id === guestId) {
          let restrictions = [...(g.dietary_restrictions || [])];

          if (option === "None") {
            // When "None" is selected, use a marker to indicate no restrictions
            restrictions = checked ? ["__none__"] : [];
          } else if (checked) {
            // When any other option is selected, clear the "no restrictions" marker
            restrictions = restrictions.filter((r) => r !== "__none__");
            if (!restrictions.includes(option)) {
              restrictions.push(option);
            }
          } else {
            // When unchecking, just remove that option
            restrictions = restrictions.filter((r) => r !== option);
          }

          return {
            ...g,
            dietary_restrictions: restrictions,
          };
        }
        return g;
      })
    );
  };

  const isDietaryComplete = () => {
    const attendingGuests = getAttendingGuests();
    return attendingGuests.every((g) => {
      const restrictions = g.dietary_restrictions || [];
      // Complete if has restrictions OR has selected "None"
      return restrictions.length > 0;
    });
  };

  const isGuestSelectionComplete = () => {
    if (invite?.invite_type === "single") {
      return true;
    } else if (invite?.invite_type === "couple") {
      return selectedAttendees.size > 0;
    } else if (invite?.invite_type === "plusone") {
      if (showPlusOneForm) {
        return plusOneNames.firstName && plusOneNames.lastName;
      }
      return true;
    }
    return true;
  };

  const isAccommodationComplete = () => {
    if (accommodationNeeded === null) return false;
    if (accommodationNeeded && accommodationPayment === null) return false;
    return true;
  };

  const isAtitlanComplete = () => {
    if (!invite?.invited_to_atitlan) return true;
    if (atitlanAttending === null) return false;
    if (!atitlanAttending) return true;

    if (getAttendingGuests().length === 1) {
      const guest = getAttendingGuests()[0];
      return atitlanPayments[guest.id] !== undefined;
    } else {
      if (atitlanGuests.size === 0) return false;
      for (const guestId of atitlanGuests) {
        if (!atitlanPayments[guestId]) return false;
      }
    }
    return true;
  };

  const isFormComplete = () => {
    if (attendanceDecision !== true) return false;
    if (!isGuestSelectionComplete()) return false;
    if (!isDietaryComplete()) return false;
    if (!isAccommodationComplete()) return false;
    if (!isAtitlanComplete()) return false;
    return true;
  };

  useEffect(() => {
    setFormComplete(isFormComplete());
  }, [
    attendanceDecision,
    selectedAttendees,
    showPlusOneForm,
    plusOneNames,
    guests,
    accommodationNeeded,
    accommodationPayment,
    atitlanAttending,
    atitlanGuests,
    atitlanPayments,
  ]);

  const handleAddPlusOne = async () => {
    if (!plusOneNames.firstName || !plusOneNames.lastName) {
      setError("Please enter first and last name for your guest");
      return;
    }

    try {
      if (!invite) return;
      const { data: newGuest } = await supabase
        .from("guests")
        .insert({
          invite_id: invite.id,
          first_name: plusOneNames.firstName,
          last_name: plusOneNames.lastName,
          is_primary: false,
          email: null,
          user_id: null,
        })
        .select()
        .single();

      if (newGuest) {
        const updatedGuests = [...guests, newGuest as Guest];
        setGuests(updatedGuests);
        setSelectedAttendees(new Set([...selectedAttendees, newGuest.id]));
        setError("");
      }
    } catch (err) {
      console.error("Error creating guest:", err);
      setError("Failed to add guest");
    }
  };

  const isDietaryOptionSelected = (
    restrictions: string[] | undefined,
    option: string
  ): boolean => {
    if (!restrictions) return false;
    if (option === "None") {
      return restrictions.includes("__none__");
    }
    return restrictions.includes(option);
  };

  const cleanDietaryRestrictions = (restrictions: string[]): string[] => {
    if (!restrictions || restrictions.length === 0) return [];
    // Remove the "None" marker and convert to lowercase matching database enum
    return restrictions
      .filter((r) => r !== "None" && r !== "__none__")
      .map((r) => r.toLowerCase().replace(/\s+/g, "_"));
  };

  const handleSubmitRSVP = async () => {
    if (!invite) return;

    setSubmitting(true);
    try {
      console.log("=== Starting RSVP submission ===");
      const attendingGuests = getAttendingGuests();
      console.log(`Total guests in invite: ${guests.length}`);
      console.log(`Attending guests: ${attendingGuests.length}`);
      console.log("Attending guest IDs:", attendingGuests.map((g) => g.id));

      // STEP 1: Insert/Update rsvp_responses for EACH guest
      console.log("\n=== STEP 1: Saving RSVP responses for all guests ===");
      for (const guest of guests) {
        const isAttending = selectedAttendees.has(guest.id);
        const cleanedDietary = cleanDietaryRestrictions(
          guest.dietary_restrictions || []
        );

        const rsvpData = {
          guest_id: guest.id,
          attending: isAttending,
          dietary_restrictions: cleanedDietary,
          dietary_notes: isAttending ? guest.dietary_notes || null : null,
          accommodation_needed: isAttending
            ? accommodationNeeded || false
            : false,
          accommodation_payment_level: isAttending && accommodationNeeded
            ? accommodationPayment || "full"
            : null,
          atitlan_attending: isAttending ? guest.atitlan_attending || false : false,
          atitlan_payment_level: isAttending && guest.atitlan_attending
            ? guest.atitlan_payment_level || "full"
            : null,
        };

        console.log(
          `Saving RSVP for ${guest.first_name} ${guest.last_name} (ID: ${guest.id}):`,
          rsvpData
        );

        const { data: savedRsvp, error: rsvpError } = await supabase
          .from("rsvp_responses")
          .upsert(rsvpData, {
            onConflict: "guest_id",
          });

        if (rsvpError) {
          console.error(
            `❌ Error saving RSVP for ${guest.first_name}:`,
            rsvpError
          );
          throw new Error(
            `Failed to save RSVP for ${guest.first_name}: ${rsvpError.message}`
          );
        }

        console.log(
          `✓ Successfully saved RSVP for ${guest.first_name} ${guest.last_name}`
        );
      }

      // STEP 2: Calculate and update invite rsvp_status
      console.log("\n=== STEP 2: Updating invite status ===");
      const allAttending = attendingGuests.length === guests.length;
      const noneAttending = attendingGuests.length === 0;
      const rsvpStatus = noneAttending
        ? "declined"
        : allAttending
          ? "confirmed"
          : "partial";

      console.log(`Invite status: ${rsvpStatus}`);
      console.log(
        `All attending: ${allAttending}, None attending: ${noneAttending}`
      );

      const { error: inviteError } = await supabase
        .from("invites")
        .update({
          rsvp_status: rsvpStatus,
          rsvp_submitted_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      if (inviteError) {
        console.error("❌ Error updating invite:", inviteError);
        throw new Error(`Failed to update invite: ${inviteError.message}`);
      }

      console.log(`✓ Successfully updated invite status to: ${rsvpStatus}`);

      // STEP 3: Save accommodation payment if applicable
      if (attendingGuests.length > 0 && accommodationNeeded && accommodationPayment) {
        console.log("\n=== STEP 3: Saving accommodation payment ===");

        const total =
          accommodationGroup!.per_night_cost *
          accommodationGroup!.number_of_nights;
        const multiplier =
          accommodationPayment === "none"
            ? 0
            : accommodationPayment === "half"
              ? 0.5
              : 1;
        const accommodationCost = total * multiplier;

        console.log(`Accommodation cost: $${accommodationCost}`);
        console.log(`Payment level: ${accommodationPayment}`);

        const { error: paymentError } = await supabase
          .from("payments")
          .insert({
            invite_id: invite.id,
            payment_type: "accommodation",
            amount_committed: accommodationCost,
          });

        if (paymentError) {
          console.error("❌ Error saving accommodation payment:", paymentError);
          throw new Error(
            `Failed to save accommodation payment: ${paymentError.message}`
          );
        }

        console.log("✓ Successfully saved accommodation payment");
      }

      // STEP 4: Save Atitlan payment if applicable
      if (atitlanAttending && atitlanGuests.size > 0) {
        console.log("\n=== STEP 4: Saving Atitlan payment ===");

        let totalAtitlan = 0;
        const atitlanCostPerPerson = 100;

        for (const guestId of atitlanGuests) {
          const paymentLevel = atitlanPayments[guestId];
          const multiplier =
            paymentLevel === "none"
              ? 0
              : paymentLevel === "half"
                ? 0.5
                : 1;
          const guestCost = atitlanCostPerPerson * multiplier;
          totalAtitlan += guestCost;

          const guestName = guests.find((g) => g.id === guestId)?.first_name;
          console.log(
            `${guestName} - Payment level: ${paymentLevel}, Cost: $${guestCost}`
          );
        }

        console.log(`Total Atitlan cost: $${totalAtitlan}`);

        const { error: atitlanPaymentError } = await supabase
          .from("payments")
          .insert({
            invite_id: invite.id,
            payment_type: "atitlan",
            amount_committed: totalAtitlan,
          });

        if (atitlanPaymentError) {
          console.error("❌ Error saving Atitlan payment:", atitlanPaymentError);
          throw new Error(
            `Failed to save Atitlan payment: ${atitlanPaymentError.message}`
          );
        }

        console.log("✓ Successfully saved Atitlan payment");
      }

      console.log("\n=== ✓ RSVP submission complete! ===\n");
      setSuccessMessage("Thank you for your RSVP!");
      setTimeout(() => navigate("/wedding"), 2000);
    } catch (err) {
      console.error("❌ RSVP submission failed:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to submit RSVP: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rsvp-loading">
        <div className="rsvp-spinner"></div>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="rsvp-success-wrapper">
        <div className="rsvp-success">
          <p>{successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rsvp-wrapper">
      <div className="rsvp-container">
        <h1 className="rsvp-title">RSVP</h1>

        {error && <div className="rsvp-error">{error}</div>}

        {/* SECTION 1: Attendance */}
        <div className="rsvp-section">
          <h2 className="rsvp-question">Will you be attending?</h2>
          <div className="rsvp-button-group">
            <button
              className={`rsvp-option-button ${attendanceDecision === true ? "active" : ""}`}
              onClick={() => handleAttendanceDecision(true)}
              disabled={submitting}
            >
              Yes
            </button>
            <button
              className={`rsvp-option-button ${attendanceDecision === false ? "active" : ""}`}
              onClick={() => handleAttendanceDecision(false)}
              disabled={submitting}
            >
              No
            </button>
          </div>
        </div>

        {/* SECTION 2: Guest Selection (for couple/plusone) */}
        {attendanceDecision === true &&
          invite?.invite_type === "couple" && (
            <div className="rsvp-section">
              <h2 className="rsvp-question">Who will be attending?</h2>
              <div className="rsvp-checkboxes">
                {guests.map((guest) => (
                  <label key={guest.id} className="rsvp-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedAttendees.has(guest.id)}
                      onChange={(e) =>
                        handleAttendeesChange(guest.id, e.target.checked)
                      }
                      disabled={submitting}
                    />
                    <span>
                      {guest.first_name} {guest.last_name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

        {/* SECTION 2: Plus-One (for plusone invite) */}
        {attendanceDecision === true && invite?.invite_type === "plusone" && (
          <div className="rsvp-section">
            <h2 className="rsvp-question">Will you be bringing a guest?</h2>
            <div className="rsvp-button-group">
              <button
                className={`rsvp-option-button ${!showPlusOneForm ? "active" : ""}`}
                onClick={() => setShowPlusOneForm(false)}
                disabled={submitting}
              >
                No
              </button>
              <button
                className={`rsvp-option-button ${showPlusOneForm ? "active" : ""}`}
                onClick={() => setShowPlusOneForm(true)}
                disabled={submitting}
              >
                Yes
              </button>
            </div>

            {showPlusOneForm && (
              <div className="rsvp-form-group">
                <div>
                  <label className="rsvp-label">Guest's First Name:</label>
                  <input
                    type="text"
                    className="rsvp-input"
                    value={plusOneNames.firstName}
                    onChange={(e) =>
                      setPlusOneNames({
                        ...plusOneNames,
                        firstName: e.target.value,
                      })
                    }
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="rsvp-label">Guest's Last Name:</label>
                  <input
                    type="text"
                    className="rsvp-input"
                    value={plusOneNames.lastName}
                    onChange={(e) =>
                      setPlusOneNames({
                        ...plusOneNames,
                        lastName: e.target.value,
                      })
                    }
                    disabled={submitting}
                  />
                </div>
                {isGuestSelectionComplete() && (
                  <button
                    className="rsvp-add-guest-button"
                    onClick={handleAddPlusOne}
                    disabled={submitting}
                  >
                    Add Guest
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: Dietary Restrictions */}
        {attendanceDecision === true && isGuestSelectionComplete() && (
          <div className="rsvp-section">
            {getAttendingGuests().map((guest) => (
              <div key={guest.id} className="rsvp-guest-section">
                <h2 className="rsvp-section-subheading">
                  Dietary Restrictions for {guest.first_name}
                </h2>
                <div className="rsvp-dietary-grid">
                  <div className="rsvp-dietary-column">
                    {DIETARY_LEFT_COLUMN.map((option) => (
                      <label
                        key={option}
                        className="rsvp-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          checked={isDietaryOptionSelected(
                            guest.dietary_restrictions,
                            option
                          )}
                          onChange={(e) =>
                            handleDietaryChange(
                              guest.id,
                              option,
                              e.target.checked
                            )
                          }
                          disabled={submitting}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  <div className="rsvp-dietary-column">
                    {DIETARY_RIGHT_COLUMN.map((option) => (
                      <label
                        key={option}
                        className="rsvp-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          checked={isDietaryOptionSelected(
                            guest.dietary_restrictions,
                            option
                          )}
                          onChange={(e) =>
                            handleDietaryChange(
                              guest.id,
                              option,
                              e.target.checked
                            )
                          }
                          disabled={submitting}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {guest.dietary_restrictions?.includes("Other") && (
                  <div className="rsvp-form-group">
                    <label className="rsvp-label">Please specify:</label>
                    <textarea
                      className="rsvp-textarea"
                      value={guest.dietary_notes || ""}
                      onChange={(e) =>
                        setGuests(
                          guests.map((g) =>
                            g.id === guest.id
                              ? { ...g, dietary_notes: e.target.value }
                              : g
                          )
                        )
                      }
                      disabled={submitting}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* SECTION 4: Accommodations */}
        {attendanceDecision === true &&
          isGuestSelectionComplete() &&
          isDietaryComplete() && (
            <div className="rsvp-section">
              <h2 className="rsvp-question">
                Will you be staying at{" "}
                {accommodationGroup?.display_name || "the accommodation"}?
              </h2>

              <div className="rsvp-button-group">
                <button
                  className={`rsvp-option-button ${accommodationNeeded === false ? "active" : ""}`}
                  onClick={() => setAccommodationNeeded(false)}
                  disabled={submitting}
                >
                  No
                </button>
                <button
                  className={`rsvp-option-button ${accommodationNeeded === true ? "active" : ""}`}
                  onClick={() => setAccommodationNeeded(true)}
                  disabled={submitting}
                >
                  Yes
                </button>
              </div>

              {accommodationNeeded && accommodationGroup && (
                <>
                  <div className="rsvp-info-box">
                    <p>{accommodationGroup.description}</p>
                    <p>
                      This is a 'pay what you can' model for the{" "}
                      {accommodationGroup.number_of_nights}-night stay.{" "}
                      {accommodationGroup.display_name} has a $
                      {accommodationGroup.per_night_cost}/night rate, but the
                      travel fund is available to make traveling to Guatemala
                      easier.
                    </p>
                  </div>

                  <h3 className="rsvp-subquestion">
                    What can you contribute?
                  </h3>
                  <div className="rsvp-payment-buttons">
                    {[
                      { level: "none", label: "$0" },
                      {
                        level: "half",
                        label: `$${(
                          (accommodationGroup.per_night_cost *
                            accommodationGroup.number_of_nights) /
                          2
                        ).toFixed(0)}`,
                      },
                      {
                        level: "full",
                        label: `$${(
                          accommodationGroup.per_night_cost *
                          accommodationGroup.number_of_nights
                        ).toFixed(0)}`,
                      },
                    ].map(({ level, label }) => (
                      <button
                        key={level}
                        className={`rsvp-payment-button ${accommodationPayment === level ? "active" : ""}`}
                        onClick={() =>
                          setAccommodationPayment(
                            level as "none" | "half" | "full"
                          )
                        }
                        disabled={submitting}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

        {/* SECTION 5: Lake Atitlan */}
        {attendanceDecision === true &&
          isGuestSelectionComplete() &&
          isDietaryComplete() &&
          isAccommodationComplete() &&
          invite?.invited_to_atitlan && (
            <div className="rsvp-section">
              <h2 className="rsvp-question">
                Will you be attending the post-ceremony celebration at Lake
                Atitlan?
              </h2>

              <div className="rsvp-button-group">
                <button
                  className={`rsvp-option-button ${atitlanAttending === false ? "active" : ""}`}
                  onClick={() => setAtitlanAttending(false)}
                  disabled={submitting}
                >
                  No
                </button>
                <button
                  className={`rsvp-option-button ${atitlanAttending === true ? "active" : ""}`}
                  onClick={() => setAtitlanAttending(true)}
                  disabled={submitting}
                >
                  Yes
                </button>
              </div>

              {atitlanAttending && (
                <>
                  {getAttendingGuests().length === 1 ? (
                    <>
                      <h3 className="rsvp-subquestion">
                        What can{" "}
                        {getAttendingGuests()[0]?.first_name || "you"}{" "}
                        contribute?
                      </h3>
                      <div className="rsvp-payment-buttons">
                        {[
                          { level: "none", label: "$0" },
                          { level: "half", label: "$75" },
                          { level: "full", label: "$150" },
                        ].map(({ level, label }) => (
                          <button
                            key={level}
                            className={`rsvp-payment-button ${atitlanPayments[getAttendingGuests()[0].id] === level ? "active" : ""}`}
                            onClick={() => {
                              setAtitlanPayments({
                                [getAttendingGuests()[0].id]:
                                  level as "none" | "half" | "full",
                              });
                            }}
                            disabled={submitting}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="rsvp-subquestion">
                        Who will be attending Lake Atitlan?
                      </h3>
                      <div className="rsvp-checkboxes">
                        {getAttendingGuests().map((guest) => (
                          <label
                            key={guest.id}
                            className="rsvp-checkbox-label"
                          >
                            <input
                              type="checkbox"
                              checked={atitlanGuests.has(guest.id)}
                              onChange={(e) => {
                                const updated = new Set(atitlanGuests);
                                if (e.target.checked) {
                                  updated.add(guest.id);
                                } else {
                                  updated.delete(guest.id);
                                }
                                setAtitlanGuests(updated);
                              }}
                              disabled={submitting}
                            />
                            <span>
                              {guest.first_name} {guest.last_name}
                            </span>
                          </label>
                        ))}
                      </div>

                      {atitlanGuests.size > 0 && (
                        <>
                          <h3 className="rsvp-subquestion">
                            What can each guest contribute?
                          </h3>
                          {Array.from(atitlanGuests).map((guestId) => {
                            const guest = getAttendingGuests().find(
                              (g) => g.id === guestId
                            );
                            return (
                              <div
                                key={guestId}
                                className="rsvp-guest-payment"
                              >
                                <p className="rsvp-guest-name">
                                  {guest?.first_name} {guest?.last_name}
                                </p>
                                <div className="rsvp-payment-buttons-sm">
                                  {[
                                    { level: "none", label: "$0" },
                                    { level: "half", label: "$75" },
                                    { level: "full", label: "$150" },
                                  ].map(({ level, label }) => (
                                    <button
                                      key={level}
                                      className={`rsvp-payment-button-sm ${atitlanPayments[guestId] === level ? "active" : ""}`}
                                      onClick={() =>
                                        setAtitlanPayments({
                                          ...atitlanPayments,
                                          [guestId]:
                                            level as "none" | "half" | "full",
                                        })
                                      }
                                      disabled={submitting}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

        {/* SECTION 6: Review */}
        {attendanceDecision === true &&
          isGuestSelectionComplete() &&
          isDietaryComplete() &&
          isAccommodationComplete() &&
          isAtitlanComplete() && (
            <div className="rsvp-section">
              <h2 className="rsvp-question">Review Your RSVP</h2>

              <div className="rsvp-review">
                <div className="rsvp-review-section">
                  <h3 className="rsvp-review-heading">Attending:</h3>
                  <ul className="rsvp-review-list">
                    {getAttendingGuests().map((guest) => (
                      <li key={guest.id}>
                        {guest.first_name} {guest.last_name}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rsvp-review-section">
                  <h3 className="rsvp-review-heading">
                    Dietary Restrictions:
                  </h3>
                  <ul className="rsvp-review-list">
                    {getAttendingGuests().map((guest) => (
                      <li key={guest.id}>
                        <strong>{guest.first_name}:</strong>{" "}
                        {guest.dietary_restrictions?.length
                          ? guest.dietary_restrictions.join(", ")
                          : "None"}
                      </li>
                    ))}
                  </ul>
                </div>

                {accommodationNeeded && (
                  <div className="rsvp-review-section">
                    <h3 className="rsvp-review-heading">Accommodations:</h3>
                    <p>
                      Contributing:{" "}
                      {accommodationPayment === "none"
                        ? "$0"
                        : accommodationPayment === "half"
                          ? "$" +
                            (
                              (accommodationGroup?.per_night_cost || 0) *
                              (accommodationGroup?.number_of_nights || 1) *
                              0.5
                            ).toFixed(0)
                          : "$" +
                            (
                              (accommodationGroup?.per_night_cost || 0) *
                              (accommodationGroup?.number_of_nights || 1)
                            ).toFixed(0)}
                    </p>
                  </div>
                )}

                {atitlanAttending && atitlanGuests.size > 0 && (
                  <div className="rsvp-review-section">
                    <h3 className="rsvp-review-heading">Lake Atitlan:</h3>
                    <p>
                      Guests:{" "}
                      {Array.from(atitlanGuests)
                        .map(
                          (id) =>
                            getAttendingGuests().find((g) => g.id === id)
                              ?.first_name
                        )
                        .join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Submit Button - Always visible at bottom */}
        <div className="rsvp-submit-footer">
          <button
            className="rsvp-submit-button"
            onClick={handleSubmitRSVP}
            disabled={!formComplete || submitting}
          >
            {submitting ? "Submitting..." : "SUBMIT RSVP"}
          </button>
        </div>
      </div>

      <style>{`
        .rsvp-wrapper {
          padding: 2rem 1rem;
          min-height: 100vh;
          background-color: #ffffff;
        }

        .rsvp-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #ffffff;
        }

        .rsvp-spinner {
          width: 40px;
          height: 40px;
          border: 2px solid #e5e5e5;
          border-top: 2px solid #000000;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .rsvp-success-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem;
          background-color: #ffffff;
        }

        .rsvp-success {
          text-align: center;
          padding: 3rem 2rem;
          background-color: #f5f5f5;
          border: 1px solid #e5e5e5;
          max-width: 600px;
        }

        .rsvp-success p {
          font-size: 1.5rem;
          color: #000000;
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        .rsvp-container {
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 8rem;
        }

        .rsvp-title {
          font-size: 3rem;
          font-weight: 400;
          margin: 0 0 3rem 0;
          letter-spacing: 0.02em;
          font-family: "orpheuspro", serif;
          text-align: center;
        }

        .rsvp-error {
          padding: 1rem;
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c00;
          margin-bottom: 2rem;
          border-radius: 2px;
          font-family: "orpheuspro", serif;
          font-size: 0.95rem;
        }

        .rsvp-section {
          margin-bottom: 3rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e5e5e5;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .rsvp-section:last-of-type {
          border-bottom: none;
        }

        .rsvp-question {
          font-size: 1.75rem;
          font-weight: 400;
          margin: 0 0 2rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
        }

        .rsvp-section-subheading {
          font-size: 1.25rem;
          font-weight: 400;
          margin: 0 0 1.5rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
        }

        .rsvp-subquestion {
          font-size: 1.1rem;
          font-weight: 400;
          margin: 2rem 0 1.5rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
          color: #333333;
        }

        .rsvp-button-group {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .rsvp-option-button {
          flex: 1;
          min-width: 180px;
          max-width: 220px;
          padding: 0.875rem 2rem;
          background-color: #ffffff;
          color: #000000;
          border: 1px solid #000000;
          font-size: 1rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.05em;
          font-weight: 400;
        }

        .rsvp-option-button:hover:not(:disabled) {
          opacity: 0.7;
        }

        .rsvp-option-button.active {
          background-color: #000000;
          color: #ffffff;
        }

        .rsvp-option-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .rsvp-checkboxes {
          margin: 1.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .rsvp-checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
        }

        .rsvp-checkbox-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #000000;
        }

        .rsvp-checkbox-label input:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .rsvp-form-group {
          margin: 1.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .rsvp-label {
          font-size: 1rem;
          font-weight: 400;
          margin-bottom: 0.5rem;
          display: block;
          font-family: "orpheuspro", serif;
        }

        .rsvp-input,
        .rsvp-textarea {
          padding: 0.75rem;
          border: 1px solid #000000;
          font-family: "orpheuspro", serif;
          font-size: 1rem;
          background-color: #ffffff;
        }

        .rsvp-input:disabled,
        .rsvp-textarea:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .rsvp-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .rsvp-add-guest-button {
          padding: 0.75rem 2rem;
          background-color: #000000;
          color: #ffffff;
          border: 1px solid #000000;
          font-size: 0.95rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          transition: opacity 0.2s ease;
          letter-spacing: 0.02em;
          font-weight: 400;
          margin-top: 0.5rem;
        }

        .rsvp-add-guest-button:hover:not(:disabled) {
          opacity: 0.8;
        }

        .rsvp-add-guest-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .rsvp-guest-section {
          margin: 2rem 0;
          padding: 1.5rem;
          background-color: #f9f9f9;
          border: 1px solid #e5e5e5;
        }

        .rsvp-dietary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin: 1.5rem 0;
        }

        .rsvp-dietary-column {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .rsvp-info-box {
          margin: 1.5rem 0;
          padding: 1.5rem;
          background-color: #fafafa;
          border: 1px solid #e5e5e5;
          border-radius: 2px;
          font-family: "orpheuspro", serif;
          font-size: 0.95rem;
          line-height: 1.6;
          color: #333333;
        }

        .rsvp-info-box p {
          margin: 0.75rem 0;
        }

        .rsvp-info-box p:first-child {
          margin-top: 0;
        }

        .rsvp-info-box p:last-child {
          margin-bottom: 0;
        }

        .rsvp-payment-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin: 1.5rem 0;
        }

        .rsvp-payment-buttons-sm {
          display: flex;
          flex-direction: row;
          gap: 0.5rem;
          margin: 1rem 0;
        }

        .rsvp-payment-button,
        .rsvp-payment-button-sm {
          padding: 0.75rem 1.5rem;
          background-color: #ffffff;
          color: #000000;
          border: 1px solid #000000;
          font-size: 0.95rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          letter-spacing: 0.02em;
          font-weight: 400;
        }

        .rsvp-payment-button-sm {
          flex: 1;
          padding: 0.6rem 1rem;
          font-size: 0.85rem;
          text-align: center;
        }

        .rsvp-payment-button:hover:not(:disabled),
        .rsvp-payment-button-sm:hover:not(:disabled) {
          opacity: 0.7;
        }

        .rsvp-payment-button.active,
        .rsvp-payment-button-sm.active {
          background-color: #000000;
          color: #ffffff;
        }

        .rsvp-payment-button:disabled,
        .rsvp-payment-button-sm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .rsvp-guest-payment {
          margin: 1.5rem 0;
          padding: 1rem;
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
        }

        .rsvp-guest-name {
          font-size: 0.95rem;
          font-weight: 500;
          margin: 0 0 0.75rem 0;
          font-family: "orpheuspro", serif;
          color: #333333;
        }

        .rsvp-review {
          margin: 2rem 0;
          padding: 2rem;
          background-color: #f9f9f9;
          border: 1px solid #e5e5e5;
        }

        .rsvp-review-section {
          margin-bottom: 1.5rem;
        }

        .rsvp-review-section:last-child {
          margin-bottom: 0;
        }

        .rsvp-review-heading {
          font-size: 1.1rem;
          font-weight: 500;
          margin: 0 0 0.75rem 0;
          font-family: "orpheuspro", serif;
          color: #000000;
        }

        .rsvp-review-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .rsvp-review-list li {
          padding: 0.5rem 0;
          font-size: 0.95rem;
          font-family: "orpheuspro", serif;
          color: #333333;
        }

        .rsvp-submit-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: #ffffff;
          border-top: 1px solid #e5e5e5;
          padding: 1.5rem;
          z-index: 100;
        }

        .rsvp-submit-button {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          display: block;
          padding: 1rem;
          background-color: #000000;
          color: #ffffff;
          border: 1px solid #000000;
          font-size: 1rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          transition: opacity 0.2s ease;
          letter-spacing: 0.05em;
          font-weight: 400;
        }

        .rsvp-submit-button:hover:not(:disabled) {
          opacity: 0.8;
        }

        .rsvp-submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .rsvp-wrapper {
            padding: 1rem 0.75rem;
          }

          .rsvp-title {
            font-size: 2rem;
            margin-bottom: 2rem;
          }

          .rsvp-question {
            font-size: 1.25rem;
          }

          .rsvp-section-subheading {
            font-size: 1.1rem;
          }

          .rsvp-button-group {
            flex-direction: column;
            gap: 0.75rem;
          }

          .rsvp-option-button {
            min-width: unset;
            max-width: unset;
            flex: 1;
          }

          .rsvp-dietary-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .rsvp-payment-buttons-sm {
            flex-direction: column;
          }

          .rsvp-container {
            padding-bottom: 10rem;
          }

          .rsvp-submit-footer {
            padding: 1rem 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
