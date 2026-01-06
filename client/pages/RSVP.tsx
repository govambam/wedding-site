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

type Step = 1 | 2 | 3 | 4 | 5 | 6;

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

export default function RSVP() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>(1);
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

  const handleContinueFromStep1 = () => {
    if (attendanceDecision === false) {
      submitDecline();
    } else {
      setCurrentStep(2);
    }
  };

  const handleContinueFromStep2 = async () => {
    if (invite?.invite_type === "single") {
      setCurrentStep(3);
    } else if (invite?.invite_type === "couple") {
      if (selectedAttendees.size === 0) {
        setError("At least one guest must attend");
        return;
      }
      setCurrentStep(3);
    } else if (invite?.invite_type === "plusone") {
      if (showPlusOneForm) {
        if (!plusOneNames.firstName || !plusOneNames.lastName) {
          setError("Please enter first and last name for your guest");
          return;
        }
        // Create new guest
        try {
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
            setSelectedAttendees(
              new Set([...selectedAttendees, newGuest.id])
            );
          }
        } catch (err) {
          console.error("Error creating guest:", err);
          setError("Failed to add guest");
          return;
        }
      }
      setCurrentStep(3);
    }
    setError("");
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
            restrictions = checked ? ["None"] : [];
          } else if (checked) {
            restrictions = restrictions.filter((r) => r !== "None");
            if (!restrictions.includes(option)) {
              restrictions.push(option);
            }
          } else {
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

  const handleContinueFromStep3 = () => {
    const attendingGuests = getAttendingGuests();
    const hasInvalidDietary = attendingGuests.some(
      (g) => !g.dietary_restrictions || g.dietary_restrictions.length === 0
    );

    if (hasInvalidDietary) {
      setError("Please select dietary restrictions for each guest");
      return;
    }

    setError("");
    setCurrentStep(4);
  };

  const getStepProgressText = () => {
    if (invite?.invited_to_atitlan) {
      return `Step ${currentStep} of 6`;
    } else {
      return `Step ${currentStep} of 5`;
    }
  };

  const handleContinueFromStep4 = () => {
    if (accommodationNeeded === null) {
      setError("Please select whether you need accommodation");
      return;
    }

    if (accommodationNeeded && accommodationPayment === null) {
      setError("Please select your contribution level");
      return;
    }

    // Update guests with accommodation info
    setGuests(
      guests.map((g) =>
        selectedAttendees.has(g.id)
          ? {
              ...g,
              accommodation_needed: accommodationNeeded,
              accommodation_payment_level: accommodationPayment || "full",
            }
          : {
              ...g,
              accommodation_needed: false,
              accommodation_payment_level: "full",
            }
      )
    );

    setError("");
    if (invite?.invited_to_atitlan) {
      setCurrentStep(5);
    } else {
      setCurrentStep(6);
    }
  };

  const handleContinueFromStep5 = () => {
    if (atitlanAttending === null) {
      setError("Please select whether you'll attend Lake Atitlan");
      return;
    }

    if (atitlanAttending) {
      if (getAttendingGuests().length === 1) {
        const guest = getAttendingGuests()[0];
        if (!atitlanPayments[guest.id]) {
          setError("Please select your contribution level");
          return;
        }
      } else {
        if (atitlanGuests.size === 0) {
          setError("Please select at least one guest for Lake Atitlan");
          return;
        }
        for (const guestId of atitlanGuests) {
          if (!atitlanPayments[guestId]) {
            setError("Please select contribution level for each guest");
            return;
          }
        }
      }
    }

    // Update guests with atitlan info
    const updatedGuests = getAttendingGuests().map((g) => {
      if (atitlanAttending && atitlanGuests.has(g.id)) {
        return {
          ...g,
          atitlan_attending: true,
          atitlan_payment_level: atitlanPayments[g.id] || "full",
        };
      }
      return {
        ...g,
        atitlan_attending: false,
        atitlan_payment_level: "full",
      };
    });

    setGuests(updatedGuests);
    setError("");
    setCurrentStep(6);
  };

  const handleSubmitRSVP = async () => {
    if (!invite) return;

    setSubmitting(true);
    try {
      const attendingGuests = getAttendingGuests();

      // Calculate RSVP status
      let rsvpStatus = "confirmed";
      if (attendingGuests.length === 0) {
        rsvpStatus = "declined";
      } else if (attendingGuests.length < guests.length) {
        rsvpStatus = "partial";
      }

      // Upsert RSVP responses
      for (const guest of guests) {
        if (selectedAttendees.has(guest.id)) {
          await supabase.from("rsvp_responses").upsert({
            guest_id: guest.id,
            attending: true,
            dietary_restrictions: guest.dietary_restrictions || [],
            dietary_notes: guest.dietary_notes || null,
            accommodation_needed: guest.accommodation_needed || false,
            accommodation_payment_level:
              guest.accommodation_payment_level || "full",
            atitlan_attending: guest.atitlan_attending || false,
            atitlan_payment_level: guest.atitlan_payment_level || "full",
          });
        } else {
          await supabase.from("rsvp_responses").upsert({
            guest_id: guest.id,
            attending: false,
            dietary_restrictions: [],
            accommodation_needed: false,
            atitlan_attending: false,
          });
        }
      }

      // Update invite
      await supabase
        .from("invites")
        .update({
          rsvp_status: rsvpStatus,
          rsvp_submitted_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      // Insert accommodation payment if applicable
      if (
        accommodationNeeded &&
        accommodationGroup &&
        accommodationPayment !== null
      ) {
        const total =
          accommodationGroup.per_night_cost *
          accommodationGroup.number_of_nights;
        const multiplier =
          accommodationPayment === "none" ? 0 : accommodationPayment === "half" ? 0.5 : 1;

        await supabase.from("payments").insert({
          invite_id: invite.id,
          payment_type: "accommodation",
          amount_committed: total * multiplier,
        });
      }

      // Insert atitlan payment if applicable
      if (atitlanAttending && atitlanGuests.size > 0) {
        let totalAtitlan = 0;
        // You'll need to define atitlan_cost_per_person
        const atitlanCostPerPerson = 100; // Placeholder - should come from DB
        for (const guestId of atitlanGuests) {
          const multiplier =
            atitlanPayments[guestId] === "none"
              ? 0
              : atitlanPayments[guestId] === "half"
                ? 0.5
                : 1;
          totalAtitlan += atitlanCostPerPerson * multiplier;
        }

        if (totalAtitlan > 0) {
          await supabase.from("payments").insert({
            invite_id: invite.id,
            payment_type: "atitlan",
            amount_committed: totalAtitlan,
          });
        }
      }

      setSuccessMessage("Thank you for your RSVP!");
      setTimeout(() => navigate("/wedding"), 2000);
    } catch (err) {
      console.error("Error submitting RSVP:", err);
      setError("Failed to submit RSVP. Please try again.");
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

        <div className="rsvp-progress">
          <p className="rsvp-progress-text">{getStepProgressText()}</p>
          <div className="rsvp-progress-bar">
            <div
              className="rsvp-progress-fill"
              style={{
                width: `${(currentStep / (invite?.invited_to_atitlan ? 6 : 5)) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {error && <div className="rsvp-error">{error}</div>}

        {/* STEP 1: Will you be attending? */}
        {currentStep === 1 && (
          <div className="rsvp-step">
            <h2 className="rsvp-question">Will you be attending?</h2>
            <div className="rsvp-button-group">
              <button
                className={`rsvp-option-button ${attendanceDecision === true ? "active" : ""}`}
                onClick={() => handleAttendanceDecision(true)}
              >
                Yes
              </button>
              <button
                className={`rsvp-option-button ${attendanceDecision === false ? "active" : ""}`}
                onClick={() => handleAttendanceDecision(false)}
              >
                No
              </button>
            </div>
            <button
              className="rsvp-submit-button"
              disabled={attendanceDecision === null || submitting}
              onClick={handleContinueFromStep1}
            >
              {attendanceDecision === false ? "Submit" : "Continue"}
            </button>
          </div>
        )}

        {/* STEP 2: Who will be attending? */}
        {currentStep === 2 && (
          <div className="rsvp-step">
            {invite?.invite_type === "couple" && (
              <>
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
                      />
                      <span>
                        {guest.first_name} {guest.last_name}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {invite?.invite_type === "plusone" && (
              <>
                <h2 className="rsvp-question">
                  Will you be bringing a guest?
                </h2>
                <div className="rsvp-button-group">
                  <button
                    className={`rsvp-option-button ${!showPlusOneForm ? "active" : ""}`}
                    onClick={() => setShowPlusOneForm(false)}
                  >
                    No
                  </button>
                  <button
                    className={`rsvp-option-button ${showPlusOneForm ? "active" : ""}`}
                    onClick={() => setShowPlusOneForm(true)}
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
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              className="rsvp-submit-button"
              onClick={handleContinueFromStep2}
              disabled={submitting}
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 3: Dietary Restrictions */}
        {currentStep === 3 && (
          <div className="rsvp-step">
            {getAttendingGuests().map((guest) => (
              <div key={guest.id} className="rsvp-guest-section">
                <h2 className="rsvp-guest-heading">
                  Dietary Restrictions for {guest.first_name}
                </h2>
                <div className="rsvp-checkboxes">
                  {DIETARY_OPTIONS.map((option) => (
                    <label key={option} className="rsvp-checkbox-label">
                      <input
                        type="checkbox"
                        checked={
                          guest.dietary_restrictions?.includes(option) || false
                        }
                        onChange={(e) =>
                          handleDietaryChange(guest.id, option, e.target.checked)
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))}
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
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              className="rsvp-submit-button"
              onClick={handleContinueFromStep3}
              disabled={submitting}
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 4: Accommodations */}
        {currentStep === 4 && (
          <div className="rsvp-step">
            <h2 className="rsvp-question">
              Will you be staying at{" "}
              {accommodationGroup?.display_name || "the accommodation"}?
            </h2>

            {accommodationGroup?.description && (
              <p className="rsvp-description">{accommodationGroup.description}</p>
            )}

            <div className="rsvp-button-group">
              <button
                className={`rsvp-option-button ${accommodationNeeded === false ? "active" : ""}`}
                onClick={() => setAccommodationNeeded(false)}
              >
                No
              </button>
              <button
                className={`rsvp-option-button ${accommodationNeeded === true ? "active" : ""}`}
                onClick={() => setAccommodationNeeded(true)}
              >
                Yes
              </button>
            </div>

            {accommodationNeeded && accommodationGroup && (
              <>
                <div className="rsvp-pricing">
                  <p>
                    Cost: ${accommodationGroup.per_night_cost} per night ×{" "}
                    {accommodationGroup.number_of_nights} nights = $
                    {accommodationGroup.per_night_cost *
                      accommodationGroup.number_of_nights}
                  </p>
                </div>

                <h3 className="rsvp-subquestion">What can you contribute?</h3>
                <div className="rsvp-payment-buttons">
                  {accommodationGroup.payment_options.map((option, idx) => {
                    const total =
                      accommodationGroup.per_night_cost *
                      accommodationGroup.number_of_nights;
                    const amount = total * option;
                    const level =
                      option === 0 ? "none" : option === 0.5 ? "half" : "full";
                    const label =
                      option === 0
                        ? "$0 (100% assistance)"
                        : option === 0.5
                          ? `$${(amount).toFixed(0)} (50% assistance)`
                          : `$${amount.toFixed(0)} (No assistance needed)`;

                    return (
                      <button
                        key={idx}
                        className={`rsvp-payment-button ${accommodationPayment === level ? "active" : ""}`}
                        onClick={() =>
                          setAccommodationPayment(
                            level as "none" | "half" | "full"
                          )
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <button
              className="rsvp-submit-button"
              onClick={handleContinueFromStep4}
              disabled={submitting}
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 5: Lake Atitlan */}
        {currentStep === 5 && invite?.invited_to_atitlan && (
          <div className="rsvp-step">
            <h2 className="rsvp-question">
              Will you be attending the post-ceremony celebration at Lake
              Atitlan?
            </h2>

            <div className="rsvp-button-group">
              <button
                className={`rsvp-option-button ${atitlanAttending === false ? "active" : ""}`}
                onClick={() => setAtitlanAttending(false)}
              >
                No
              </button>
              <button
                className={`rsvp-option-button ${atitlanAttending === true ? "active" : ""}`}
                onClick={() => setAtitlanAttending(true)}
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
                      {getAttendingGuests()[0]?.first_name || "you"} contribute?
                    </h3>
                    <div className="rsvp-payment-buttons">
                      {[
                        { level: "none", label: "$0 (100% assistance)" },
                        { level: "half", label: "$75 (50% assistance)" },
                        { level: "full", label: "$150 (No assistance needed)" },
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
                        <label key={guest.id} className="rsvp-checkbox-label">
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
                            <div key={guestId} className="rsvp-guest-payment">
                              <p className="rsvp-guest-name">
                                {guest?.first_name} {guest?.last_name}
                              </p>
                              <div className="rsvp-payment-buttons">
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

            <button
              className="rsvp-submit-button"
              onClick={handleContinueFromStep5}
              disabled={submitting}
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 6: Review & Submit */}
        {currentStep === 6 && (
          <div className="rsvp-step">
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
                <h3 className="rsvp-review-heading">Dietary Restrictions:</h3>
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

            <button
              className="rsvp-submit-button"
              onClick={handleSubmitRSVP}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit RSVP"}
            </button>

            <button
              className="rsvp-back-button"
              onClick={() => setCurrentStep(1)}
              disabled={submitting}
            >
              Back to Edit
            </button>
          </div>
        )}
      </div>

      <style>{`
        .rsvp-wrapper {
          padding: 2rem 1rem;
          min-height: 100%;
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
          min-height: 100%;
          padding: 2rem;
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
        }

        .rsvp-title {
          font-size: 3rem;
          font-weight: 400;
          margin: 0 0 2rem 0;
          letter-spacing: 0.02em;
          font-family: "orpheuspro", serif;
        }

        .rsvp-progress {
          margin-bottom: 3rem;
        }

        .rsvp-progress-text {
          font-size: 0.875rem;
          color: #666666;
          margin: 0 0 0.5rem 0;
          font-family: "orpheuspro", serif;
        }

        .rsvp-progress-bar {
          width: 100%;
          height: 2px;
          background-color: #e5e5e5;
          border-radius: 1px;
          overflow: hidden;
        }

        .rsvp-progress-fill {
          height: 100%;
          background-color: #000000;
          transition: width 0.3s ease;
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

        .rsvp-step {
          margin-bottom: 3rem;
        }

        .rsvp-question {
          font-size: 1.75rem;
          font-weight: 400;
          margin: 0 0 2rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
        }

        .rsvp-subquestion {
          font-size: 1.25rem;
          font-weight: 400;
          margin: 2rem 0 1rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
        }

        .rsvp-button-group {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .rsvp-option-button {
          padding: 0.75rem 2rem;
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

        .rsvp-option-button:hover {
          opacity: 0.7;
        }

        .rsvp-option-button.active {
          background-color: #000000;
          color: #ffffff;
        }

        .rsvp-checkboxes {
          margin: 1.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
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

        .rsvp-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .rsvp-guest-section {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background-color: #f9f9f9;
          border: 1px solid #e5e5e5;
        }

        .rsvp-guest-heading {
          font-size: 1.25rem;
          font-weight: 400;
          margin: 0 0 1rem 0;
          font-family: "orpheuspro", serif;
        }

        .rsvp-description {
          font-size: 0.95rem;
          color: #666666;
          margin: 1rem 0 1.5rem 0;
          line-height: 1.6;
          font-family: "orpheuspro", serif;
        }

        .rsvp-pricing {
          padding: 1rem;
          background-color: #f5f5f5;
          border-left: 2px solid #000000;
          margin: 1.5rem 0;
          font-family: "orpheuspro", serif;
        }

        .rsvp-pricing p {
          margin: 0;
          font-size: 1rem;
        }

        .rsvp-payment-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin: 1.5rem 0;
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
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }

        .rsvp-payment-button:hover,
        .rsvp-payment-button-sm:hover {
          opacity: 0.7;
        }

        .rsvp-payment-button.active,
        .rsvp-payment-button-sm.active {
          background-color: #000000;
          color: #ffffff;
        }

        .rsvp-guest-payment {
          margin: 1.5rem 0;
          padding: 1rem;
          background-color: #f5f5f5;
          border: 1px solid #e5e5e5;
        }

        .rsvp-guest-name {
          font-size: 1rem;
          font-weight: 500;
          margin: 0 0 0.75rem 0;
          font-family: "orpheuspro", serif;
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

        .rsvp-submit-button {
          width: 100%;
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
          margin-top: 2rem;
        }

        .rsvp-submit-button:hover:not(:disabled) {
          opacity: 0.8;
        }

        .rsvp-submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .rsvp-back-button {
          width: 100%;
          padding: 0.75rem;
          background-color: #ffffff;
          color: #000000;
          border: 1px solid #000000;
          font-size: 0.95rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          transition: opacity 0.2s ease;
          letter-spacing: 0.02em;
          font-weight: 400;
          margin-top: 1rem;
        }

        .rsvp-back-button:hover:not(:disabled) {
          opacity: 0.7;
        }

        .rsvp-back-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .rsvp-wrapper {
            padding: 1rem 0.75rem;
          }

          .rsvp-title {
            font-size: 2rem;
          }

          .rsvp-question {
            font-size: 1.25rem;
          }

          .rsvp-button-group {
            flex-direction: column;
            gap: 0.75rem;
          }

          .rsvp-option-button {
            padding: 0.75rem 1.5rem;
          }

          .rsvp-payment-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
