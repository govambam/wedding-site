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
}

interface Invite {
  id: string;
  invite_code: string;
  accommodation_group: string;
  invited_to_atitlan: boolean;
  rsvp_status: string;
}

interface RsvpResponse {
  id: string;
  guest_id: string;
  attending: boolean;
  dietary_restrictions: string[];
  dietary_notes: string | null;
  accommodation_needed: boolean;
  accommodation_payment_level: string;
  atitlan_attending: boolean;
  atitlan_payment_level: string;
}

interface TravelDetails {
  guest_id: string;
  arrival_date: string | null;
  arrival_time: string | null;
  arrival_airline: string | null;
  arrival_flight_number: string | null;
  departure_date: string | null;
  departure_time: string | null;
  departure_airline: string | null;
  departure_flight_number: string | null;
  needs_transfer: boolean;
  notes: string | null;
}

interface Payment {
  id: string;
  invite_id: string;
  payment_type: string;
  amount_committed: number;
  amount_paid: number | null;
  payment_method: string | null;
  notes: string | null;
}

interface UserData {
  currentGuest: Guest;
  invite: Invite;
  allGuests: Guest[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [rsvpResponses, setRsvpResponses] = useState<
    Record<string, RsvpResponse>
  >({});
  const [travelDetails, setTravelDetails] = useState<
    Record<string, TravelDetails>
  >({});
  const [payments, setPayments] = useState<Payment[]>([]);
  const [savingTravel, setSavingTravel] = useState<Record<string, boolean>>({});
  const [travelFormState, setTravelFormState] = useState<
    Record<string, TravelDetails>
  >({});
  const [showRsvpForm, setShowRsvpForm] = useState(false);
  const [savingRsvp, setSavingRsvp] = useState(false);
  const [rsvpFormState, setRsvpFormState] = useState<Record<string, any>>({});

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

      // Get current guest
      const { data: currentGuest, error: guestError } = await supabase
        .from("guests")
        .select("*")
        .eq("user_id", session.session.user.id)
        .single();

      if (guestError || !currentGuest) {
        navigate("/login");
        return;
      }

      // Get invite
      const { data: inviteData, error: inviteError } = await supabase
        .from("invites")
        .select("*")
        .eq("id", (currentGuest as Guest).invite_id)
        .single();

      if (inviteError || !inviteData) {
        navigate("/login");
        return;
      }

      const invite = inviteData as Invite;

      // Check RSVP status
      if (invite.rsvp_status === "pending") {
        navigate("/rsvp");
        return;
      } else if (invite.rsvp_status === "declined") {
        navigate("/wedding");
        return;
      }

      // Get all guests in invite
      const { data: allGuests, error: allGuestsError } = await supabase
        .from("guests")
        .select("*")
        .eq("invite_id", (currentGuest as Guest).invite_id)
        .order("is_primary", { ascending: false });

      if (allGuestsError || !allGuests) {
        navigate("/login");
        return;
      }

      const userData: UserData = {
        currentGuest: currentGuest as Guest,
        invite: invite,
        allGuests: allGuests as Guest[],
      };

      setUserData(userData);

      // Fetch RSVP responses
      const { data: rsvpData } = await supabase
        .from("rsvp_responses")
        .select("*")
        .in("guest_id", allGuests.map((g) => g.id));

      if (rsvpData) {
        const rsvpMap: Record<string, RsvpResponse> = {};
        rsvpData.forEach((r) => {
          rsvpMap[r.guest_id] = r as RsvpResponse;
        });
        setRsvpResponses(rsvpMap);
        setRsvpFormState(rsvpMap);
      }

      // Fetch travel details
      const { data: travelData } = await supabase
        .from("travel_details")
        .select("*")
        .in("guest_id", allGuests.map((g) => g.id));

      if (travelData) {
        const travelMap: Record<string, TravelDetails> = {};
        travelData.forEach((t) => {
          travelMap[t.guest_id] = t as TravelDetails;
        });
        setTravelDetails(travelMap);
        setTravelFormState(travelMap);
      } else {
        // Initialize empty travel details for form
        const emptyTravel: Record<string, TravelDetails> = {};
        allGuests.forEach((g) => {
          emptyTravel[g.id] = {
            guest_id: g.id,
            arrival_date: null,
            arrival_time: null,
            arrival_airline: null,
            arrival_flight_number: null,
            departure_date: null,
            departure_time: null,
            departure_airline: null,
            departure_flight_number: null,
            needs_transfer: false,
            notes: null,
          };
        });
        setTravelFormState(emptyTravel);
      }

      // Fetch payments
      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .eq("invite_id", invite.id);

      if (paymentData) {
        setPayments(paymentData as Payment[]);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading dashboard:", err);
      navigate("/login");
    }
  };

  const getAttendingGuests = () => {
    if (!userData) return [];
    return userData.allGuests.filter((g) => rsvpResponses[g.id]?.attending);
  };

  const handleTravelInputChange = (
    guestId: string,
    field: keyof TravelDetails,
    value: any
  ) => {
    setTravelFormState((prev) => ({
      ...prev,
      [guestId]: {
        ...prev[guestId],
        [field]: value,
      },
    }));
  };

  const saveTravelDetails = async (guestId: string) => {
    setSavingTravel((prev) => ({ ...prev, [guestId]: true }));
    try {
      const data = travelFormState[guestId];

      const { error } = await supabase.from("travel_details").upsert(
        {
          guest_id: guestId,
          arrival_date: data.arrival_date || null,
          arrival_time: data.arrival_time || null,
          arrival_airline: data.arrival_airline || null,
          arrival_flight_number: data.arrival_flight_number || null,
          departure_date: data.departure_date || null,
          departure_time: data.departure_time || null,
          departure_airline: data.departure_airline || null,
          departure_flight_number: data.departure_flight_number || null,
          needs_transfer: data.needs_transfer,
          notes: data.notes || null,
        },
        { onConflict: "guest_id" }
      );

      if (error) throw error;

      setTravelDetails((prev) => ({
        ...prev,
        [guestId]: travelFormState[guestId],
      }));

      alert("Travel details saved successfully!");
    } catch (err) {
      console.error("Error saving travel details:", err);
      alert("Failed to save travel details. Please try again.");
    } finally {
      setSavingTravel((prev) => ({ ...prev, [guestId]: false }));
    }
  };

  const getTotalPaymentCommitted = () => {
    return payments.reduce((sum, p) => sum + (p.amount_committed || 0), 0);
  };

  const getTotalPaymentPaid = () => {
    return payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  };

  const handleRsvpDietaryChange = (
    guestId: string,
    option: string,
    checked: boolean
  ) => {
    setRsvpFormState((prev) => {
      const current = prev[guestId] || rsvpResponses[guestId];
      if (!current) return prev;

      const restrictions = [...(current.dietary_restrictions || [])];

      if (option === "None") {
        return {
          ...prev,
          [guestId]: {
            ...current,
            dietary_restrictions: checked ? ["__none__"] : [],
          },
        };
      } else if (checked) {
        const updated = restrictions.filter((r) => r !== "__none__");
        if (!updated.includes(option)) {
          updated.push(option);
        }
        return {
          ...prev,
          [guestId]: {
            ...current,
            dietary_restrictions: updated,
          },
        };
      } else {
        const updated = restrictions.filter((r) => r !== option);
        return {
          ...prev,
          [guestId]: {
            ...current,
            dietary_restrictions: updated,
          },
        };
      }
    });
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
    return restrictions
      .filter((r) => r !== "None" && r !== "__none__")
      .map((r) => r.toLowerCase().replace(/\s+/g, "_"));
  };

  const saveRsvpUpdate = async () => {
    setSavingRsvp(true);
    try {
      for (const guest of userData!.allGuests) {
        const formData = rsvpFormState[guest.id];
        if (!formData) continue;

        const cleanedDietary = cleanDietaryRestrictions(
          formData.dietary_restrictions || []
        );

        const { error } = await supabase
          .from("rsvp_responses")
          .update({
            attending: formData.attending,
            dietary_restrictions: cleanedDietary,
            dietary_notes: formData.dietary_notes || null,
            accommodation_needed: formData.accommodation_needed,
            accommodation_payment_level: formData.accommodation_payment_level || null,
            atitlan_attending: formData.atitlan_attending,
            atitlan_payment_level: formData.atitlan_payment_level || null,
          })
          .eq("guest_id", guest.id);

        if (error) throw error;
      }

      setRsvpResponses(rsvpFormState);
      setShowRsvpForm(false);
      alert("RSVP updated successfully!");
    } catch (err) {
      console.error("Error saving RSVP:", err);
      alert("Failed to update RSVP. Please try again.");
    } finally {
      setSavingRsvp(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-wrapper">
        <div className="dashboard-loading">
          <div className="dashboard-spinner"></div>
        </div>
      </div>
    );
  }

  if (accessDenied || !userData) {
    return null;
  }

  const attendingGuests = getAttendingGuests();

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        <h1 className="dashboard-title">
          Welcome, {userData.currentGuest.first_name}!
        </h1>

        <p className="dashboard-subtitle">
          Manage your wedding details and travel information
        </p>

        {/* SECTION 1: RSVP Summary & Update Form */}
        <div className="dashboard-card">
          <h2 className="dashboard-card-heading">Your RSVP</h2>

          <div className="dashboard-status-badge">
            {userData.invite.rsvp_status === "confirmed"
              ? "Confirmed"
              : "Partial"}
          </div>

          <div className="dashboard-rsvp-content">
            <h3 className="dashboard-subsection-heading">Attending Guests</h3>
            <ul className="dashboard-guest-list">
              {attendingGuests.map((guest) => (
                <li key={guest.id}>
                  {guest.first_name} {guest.last_name}
                </li>
              ))}
            </ul>

            {userData.allGuests.length > attendingGuests.length && (
              <>
                <h3 className="dashboard-subsection-heading">
                  Not Attending
                </h3>
                <ul className="dashboard-guest-list">
                  {userData.allGuests
                    .filter((g) => !rsvpResponses[g.id]?.attending)
                    .map((guest) => (
                      <li key={guest.id}>
                        {guest.first_name} {guest.last_name}
                      </li>
                    ))}
                </ul>
              </>
            )}

            <h3 className="dashboard-subsection-heading">Dietary Needs</h3>
            {attendingGuests.map((guest) => {
              const rsvp = rsvpResponses[guest.id];
              return (
                <div key={guest.id} className="dashboard-dietary-item">
                  <strong>{guest.first_name}:</strong>{" "}
                  {rsvp?.dietary_restrictions?.length
                    ? rsvp.dietary_restrictions.join(", ")
                    : "None"}
                </div>
              );
            })}

            {attendingGuests.some((g) => rsvpResponses[g.id]?.accommodation_needed) && (
              <>
                <h3 className="dashboard-subsection-heading">Accommodations</h3>
                <div className="dashboard-info-text">
                  Yes, you've arranged accommodations.{" "}
                  {attendingGuests.find(
                    (g) => rsvpResponses[g.id]?.accommodation_payment_level
                  ) &&
                    `Contributing: $${
                      attendingGuests
                        .map(
                          (g) =>
                            rsvpResponses[g.id]?.accommodation_payment_level
                        )
                        .filter(Boolean).length > 0
                        ? (
                            rsvpResponses[attendingGuests[0].id]
                              ?.accommodation_payment_level === "full"
                              ? 200
                              : 100
                          ).toFixed(0)
                        : "TBD"
                    }`}
                </div>
              </>
            )}

            {userData.invite.invited_to_atitlan &&
              attendingGuests.some(
                (g) => rsvpResponses[g.id]?.atitlan_attending
              ) && (
                <>
                  <h3 className="dashboard-subsection-heading">
                    Lake Atitlan
                  </h3>
                  <div className="dashboard-info-text">
                    You're attending the Lake Atitlan celebration!
                  </div>
                </>
              )}
          </div>

          {/* Inline RSVP Update Form */}
          {!showRsvpForm ? (
            <button
              className="dashboard-button"
              onClick={() => setShowRsvpForm(true)}
            >
              Update RSVP
            </button>
          ) : (
            <div className="dashboard-rsvp-form-wrapper">
              <h3 className="dashboard-form-title">Update RSVP Details</h3>

              {userData.allGuests.map((guest) => {
                const formData = rsvpFormState[guest.id];
                if (!formData) return null;

                return (
                  <div key={guest.id} className="dashboard-rsvp-guest-section">
                    <div className="dashboard-rsvp-guest-header">
                      <label className="dashboard-checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.attending || false}
                          onChange={(e) =>
                            setRsvpFormState((prev) => ({
                              ...prev,
                              [guest.id]: {
                                ...formData,
                                attending: e.target.checked,
                              },
                            }))
                          }
                          disabled={savingRsvp}
                        />
                        <span>
                          {guest.first_name} {guest.last_name} is attending
                        </span>
                      </label>
                    </div>

                    {formData.attending && (
                      <div className="dashboard-rsvp-guest-details">
                        <h4 className="dashboard-rsvp-subheading">
                          Dietary Restrictions
                        </h4>
                        <div className="dashboard-dietary-checkboxes">
                          {[
                            "Vegetarian",
                            "Vegan",
                            "Pescatarian",
                            "Dairy-Free",
                            "Gluten-Free",
                            "Nut Allergy",
                            "Other",
                            "None",
                          ].map((option) => (
                            <label
                              key={option}
                              className="dashboard-dietary-checkbox"
                            >
                              <input
                                type="checkbox"
                                checked={isDietaryOptionSelected(
                                  formData.dietary_restrictions,
                                  option
                                )}
                                onChange={(e) =>
                                  handleRsvpDietaryChange(
                                    guest.id,
                                    option,
                                    e.target.checked
                                  )
                                }
                                disabled={savingRsvp}
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="dashboard-rsvp-form-actions">
                <button
                  className="dashboard-button"
                  onClick={saveRsvpUpdate}
                  disabled={savingRsvp}
                >
                  {savingRsvp ? "Saving..." : "Save Changes"}
                </button>
                <button
                  className="dashboard-button-secondary"
                  onClick={() => {
                    setShowRsvpForm(false);
                    setRsvpFormState(rsvpResponses);
                  }}
                  disabled={savingRsvp}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Travel Information */}
        <div className="dashboard-card">
          <h2 className="dashboard-card-heading">Travel Details</h2>

          {attendingGuests.map((guest) => (
            <div key={guest.id} className="dashboard-travel-guest">
              <h3 className="dashboard-travel-heading">
                {guest.first_name} {guest.last_name}
              </h3>

              <div className="dashboard-travel-grid">
                <div className="dashboard-travel-column">
                  <div className="dashboard-form-group">
                    <label className="dashboard-label">Arrival Date</label>
                    <input
                      type="date"
                      className="dashboard-input"
                      value={travelFormState[guest.id]?.arrival_date || ""}
                      onChange={(e) =>
                        handleTravelInputChange(
                          guest.id,
                          "arrival_date",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="dashboard-form-group">
                    <label className="dashboard-label">Arrival Time</label>
                    <input
                      type="time"
                      className="dashboard-input"
                      value={travelFormState[guest.id]?.arrival_time || ""}
                      onChange={(e) =>
                        handleTravelInputChange(
                          guest.id,
                          "arrival_time",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="dashboard-form-group">
                    <label className="dashboard-label">Airline</label>
                    <input
                      type="text"
                      className="dashboard-input"
                      value={
                        travelFormState[guest.id]?.arrival_airline || ""
                      }
                      onChange={(e) =>
                        handleTravelInputChange(
                          guest.id,
                          "arrival_airline",
                          e.target.value
                        )
                      }
                      placeholder="e.g. United Airlines"
                    />
                  </div>

                  <div className="dashboard-form-group">
                    <label className="dashboard-label">Flight Number</label>
                    <input
                      type="text"
                      className="dashboard-input"
                      value={
                        travelFormState[guest.id]?.arrival_flight_number || ""
                      }
                      onChange={(e) =>
                        handleTravelInputChange(
                          guest.id,
                          "arrival_flight_number",
                          e.target.value
                        )
                      }
                      placeholder="e.g. UA123"
                    />
                  </div>
                </div>

                <div className="dashboard-travel-column">
                  <div className="dashboard-form-group">
                    <label className="dashboard-label">Departure Date</label>
                    <input
                      type="date"
                      className="dashboard-input"
                      value={travelFormState[guest.id]?.departure_date || ""}
                      onChange={(e) =>
                        handleTravelInputChange(
                          guest.id,
                          "departure_date",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="dashboard-form-group">
                    <label className="dashboard-label">Departure Time</label>
                    <input
                      type="time"
                      className="dashboard-input"
                      value={travelFormState[guest.id]?.departure_time || ""}
                      onChange={(e) =>
                        handleTravelInputChange(
                          guest.id,
                          "departure_time",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="dashboard-form-group">
                    <label className="dashboard-label">Airline</label>
                    <input
                      type="text"
                      className="dashboard-input"
                      value={
                        travelFormState[guest.id]?.departure_airline || ""
                      }
                      onChange={(e) =>
                        handleTravelInputChange(
                          guest.id,
                          "departure_airline",
                          e.target.value
                        )
                      }
                      placeholder="e.g. United Airlines"
                    />
                  </div>

                  <div className="dashboard-form-group">
                    <label className="dashboard-label">Flight Number</label>
                    <input
                      type="text"
                      className="dashboard-input"
                      value={
                        travelFormState[guest.id]
                          ?.departure_flight_number || ""
                      }
                      onChange={(e) =>
                        handleTravelInputChange(
                          guest.id,
                          "departure_flight_number",
                          e.target.value
                        )
                      }
                      placeholder="e.g. UA456"
                    />
                  </div>
                </div>
              </div>

              <div className="dashboard-form-group">
                <label className="dashboard-checkbox-label">
                  <input
                    type="checkbox"
                    checked={
                      travelFormState[guest.id]?.needs_transfer || false
                    }
                    onChange={(e) =>
                      handleTravelInputChange(
                        guest.id,
                        "needs_transfer",
                        e.target.checked
                      )
                    }
                  />
                  <span>I need airport transfer to Antigua</span>
                </label>
              </div>

              <div className="dashboard-form-group">
                <label className="dashboard-label">Additional Notes</label>
                <textarea
                  className="dashboard-textarea"
                  value={travelFormState[guest.id]?.notes || ""}
                  onChange={(e) =>
                    handleTravelInputChange(guest.id, "notes", e.target.value)
                  }
                  placeholder="Any special requests or information..."
                />
              </div>

              <button
                className="dashboard-button"
                onClick={() => saveTravelDetails(guest.id)}
                disabled={savingTravel[guest.id] || false}
              >
                {savingTravel[guest.id] ? "Saving..." : "Save Travel Details"}
              </button>
            </div>
          ))}
        </div>

        {/* SECTION 2.5: Transfer Details */}
        {attendingGuests.some((g) => travelDetails[g.id]?.needs_transfer) && (
          <div className="dashboard-card">
            <h2 className="dashboard-card-heading">Airport Transfer Details</h2>

            {attendingGuests
              .filter((g) => travelDetails[g.id]?.needs_transfer)
              .map((guest) => (
                <div key={guest.id} className="dashboard-transfer-section">
                  <h3 className="dashboard-transfer-heading">
                    {guest.first_name} {guest.last_name}
                  </h3>
                  <div className="dashboard-transfer-empty-state">
                    <p>
                      Transfer details will be shared with you once confirmed.
                      We'll coordinate timing and meet-up information closer to
                      the wedding date.
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* SECTION 3: Payments & Contributions */}
        <div className="dashboard-card">
          <h2 className="dashboard-card-heading">
            Financial Contributions
          </h2>

          {payments.length > 0 ? (
            <>
              <div className="dashboard-payment-grid">
                {payments.map((payment) => (
                  <div key={payment.id} className="dashboard-payment-item">
                    <h4 className="dashboard-payment-type">
                      {payment.payment_type === "accommodation"
                        ? "Accommodation"
                        : "Lake Atitlan"}
                    </h4>
                    <p className="dashboard-payment-amount">
                      ${(payment.amount_committed || 0).toFixed(2)}
                    </p>
                    {payment.amount_paid ? (
                      <p className="dashboard-payment-paid">
                        Paid: ${(payment.amount_paid || 0).toFixed(2)}
                      </p>
                    ) : (
                      <p className="dashboard-payment-pending">
                        Payment pending
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="dashboard-payment-total">
                <h3>Total Committed</h3>
                <p className="dashboard-payment-total-amount">
                  ${getTotalPaymentCommitted().toFixed(2)}
                </p>
              </div>

              <p className="dashboard-payment-info">
                Payment instructions will be shared closer to the wedding date.
              </p>
            </>
          ) : (
            <p className="dashboard-info-text">
              No financial contributions recorded yet.
            </p>
          )}
        </div>

        {/* SECTION 5: Helpful Links */}
        <div className="dashboard-card">
          <h2 className="dashboard-card-heading">Helpful Links</h2>
          <p className="dashboard-links-placeholder">
            Useful links will be shared here as we get closer to the wedding.
          </p>
        </div>
      </div>

      <style>{`
        .dashboard-wrapper {
          padding: 2rem 1rem;
          min-height: 100vh;
          background-color: #f9f9f9;
        }

        .dashboard-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
        }

        .dashboard-spinner {
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

        .dashboard-container {
          max-width: 1000px;
          margin: 0 auto;
        }

        .dashboard-title {
          font-size: 3rem;
          font-weight: 400;
          margin: 2rem 0 0.5rem 0;
          letter-spacing: 0.02em;
          font-family: "orpheuspro", serif;
          text-align: center;
          color: #000000;
        }

        .dashboard-subtitle {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #666666;
          margin: 0 0 2rem 0;
          text-align: center;
          font-family: "orpheuspro", serif;
        }

        .dashboard-card {
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          padding: 24px;
          margin-top: 2.5rem;
        }

        .dashboard-card-heading {
          font-size: 1.5rem;
          font-weight: 400;
          margin: 0 0 1.5rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
          color: #000000;
        }

        .dashboard-status-badge {
          display: inline-block;
          background-color: #22c55e;
          color: #ffffff;
          padding: 0.5rem 1.5rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-family: "orpheuspro", serif;
          margin-bottom: 1.5rem;
        }

        .dashboard-rsvp-content {
          margin-top: 1rem;
        }

        .dashboard-subsection-heading {
          font-size: 1.1rem;
          font-weight: 500;
          margin: 1.5rem 0 1rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
          color: #000000;
        }

        .dashboard-guest-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem 0;
        }

        .dashboard-guest-list li {
          padding: 0.5rem 0;
          font-size: 0.95rem;
          font-family: "orpheuspro", serif;
          color: #333333;
        }

        .dashboard-dietary-item {
          padding: 0.5rem 0;
          font-size: 0.95rem;
          font-family: "orpheuspro", serif;
          color: #333333;
        }

        .dashboard-info-text {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #333333;
          margin: 0.5rem 0;
          font-family: "orpheuspro", serif;
        }

        .dashboard-travel-guest {
          margin-bottom: 2.5rem;
          padding-bottom: 2.5rem;
          border-bottom: 1px solid #e5e5e5;
        }

        .dashboard-travel-guest:last-child {
          border-bottom: none;
        }

        .dashboard-travel-heading {
          font-size: 1.1rem;
          font-weight: 500;
          margin: 0 0 1.5rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
          color: #000000;
        }

        .dashboard-travel-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 1.5rem;
        }

        .dashboard-travel-column {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .dashboard-form-group {
          display: flex;
          flex-direction: column;
        }

        .dashboard-label {
          font-size: 0.9rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          font-family: "orpheuspro", serif;
          color: #000000;
        }

        .dashboard-input,
        .dashboard-textarea {
          padding: 0.75rem;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          font-family: "orpheuspro", serif;
          font-size: 0.95rem;
          background-color: #ffffff;
        }

        .dashboard-input:focus,
        .dashboard-textarea:focus {
          outline: none;
          border-color: #000000;
        }

        .dashboard-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .dashboard-checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.95rem;
          font-family: "orpheuspro", serif;
          color: #333333;
          cursor: pointer;
        }

        .dashboard-checkbox-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #000000;
        }

        .dashboard-payment-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .dashboard-payment-item {
          padding: 1.5rem;
          background-color: #f9f9f9;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          text-align: center;
        }

        .dashboard-payment-type {
          font-size: 0.9rem;
          font-weight: 500;
          color: #666666;
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        .dashboard-payment-amount {
          font-size: 1.5rem;
          font-weight: 500;
          color: #000000;
          margin: 0.5rem 0;
          font-family: "orpheuspro", serif;
        }

        .dashboard-payment-paid {
          font-size: 0.85rem;
          color: #22c55e;
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        .dashboard-payment-pending {
          font-size: 0.85rem;
          color: #666666;
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        .dashboard-payment-total {
          padding: 1.5rem;
          background-color: #f9f9f9;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .dashboard-payment-total h3 {
          font-size: 1rem;
          font-weight: 400;
          margin: 0 0 0.5rem 0;
          font-family: "orpheuspro", serif;
        }

        .dashboard-payment-total-amount {
          font-size: 1.75rem;
          font-weight: 500;
          color: #000000;
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        .dashboard-payment-info {
          font-size: 0.9rem;
          line-height: 1.6;
          color: #666666;
          font-family: "orpheuspro", serif;
          margin: 0;
        }

        .dashboard-quick-links {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .dashboard-quick-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem;
          background-color: #f9f9f9;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          text-decoration: none;
          color: #000000;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .dashboard-quick-link:hover {
          background-color: #000000;
          color: #ffffff;
          border-color: #000000;
        }

        .dashboard-quick-link-icon {
          font-size: 2rem;
        }

        .dashboard-quick-link-text {
          font-size: 0.9rem;
          font-family: "orpheuspro", serif;
          text-align: center;
        }

        .dashboard-button {
          padding: 0.75rem 2rem;
          background-color: #ffffff;
          color: #000000;
          border: 1px solid #000000;
          border-radius: 4px;
          font-size: 0.95rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          letter-spacing: 0.02em;
          transition: all 0.2s ease;
          margin-top: 1.5rem;
        }

        .dashboard-button:hover:not(:disabled) {
          background-color: #000000;
          color: #ffffff;
        }

        .dashboard-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dashboard-button-secondary {
          padding: 0.75rem 2rem;
          background-color: #f5f5f5;
          color: #000000;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          font-size: 0.95rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          letter-spacing: 0.02em;
          transition: all 0.2s ease;
          margin-left: 1rem;
        }

        .dashboard-button-secondary:hover:not(:disabled) {
          background-color: #eeeeee;
          border-color: #cccccc;
        }

        .dashboard-button-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dashboard-rsvp-form-wrapper {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background-color: #f9f9f9;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
        }

        .dashboard-form-title {
          font-size: 1.1rem;
          font-weight: 500;
          margin: 0 0 1.5rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
          color: #000000;
        }

        .dashboard-rsvp-guest-section {
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e5e5e5;
        }

        .dashboard-rsvp-guest-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .dashboard-rsvp-guest-header {
          margin-bottom: 1rem;
        }

        .dashboard-rsvp-guest-details {
          margin-left: 2rem;
          padding: 1rem;
          background-color: #ffffff;
          border-left: 2px solid #000000;
        }

        .dashboard-rsvp-subheading {
          font-size: 0.95rem;
          font-weight: 500;
          margin: 0 0 1rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
          color: #333333;
        }

        .dashboard-dietary-checkboxes {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 0;
        }

        .dashboard-dietary-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-family: "orpheuspro", serif;
          color: #333333;
          cursor: pointer;
        }

        .dashboard-dietary-checkbox input {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #000000;
        }

        .dashboard-rsvp-form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e5e5;
        }

        .dashboard-transfer-section {
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e5e5e5;
        }

        .dashboard-transfer-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .dashboard-transfer-heading {
          font-size: 1rem;
          font-weight: 500;
          margin: 0 0 1rem 0;
          letter-spacing: 0.01em;
          font-family: "orpheuspro", serif;
          color: #000000;
        }

        .dashboard-transfer-empty-state {
          padding: 1.5rem;
          background-color: #f9f9f9;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          text-align: center;
        }

        .dashboard-transfer-empty-state p {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #666666;
          margin: 0;
          font-family: "orpheuspro", serif;
        }

        .dashboard-links-placeholder {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #999999;
          margin: 0;
          font-family: "orpheuspro", serif;
          padding: 1.5rem;
          background-color: #f9f9f9;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .dashboard-wrapper {
            padding: 1rem 0.75rem;
          }

          .dashboard-title {
            font-size: 2rem;
            margin-top: 1rem;
          }

          .dashboard-subtitle {
            font-size: 1rem;
          }

          .dashboard-card {
            padding: 1.5rem;
            margin-top: 1.5rem;
          }

          .dashboard-travel-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .dashboard-payment-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-rsvp-form-wrapper {
            padding: 1rem;
          }

          .dashboard-rsvp-guest-details {
            margin-left: 1rem;
            padding: 1rem;
          }

          .dashboard-dietary-checkboxes {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .dashboard-rsvp-form-actions {
            flex-direction: column;
            gap: 0.75rem;
          }

          .dashboard-button-secondary {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}
