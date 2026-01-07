import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/supabase";

type InviteType = "single" | "couple" | "plusone";

interface FormData {
  primaryFirstName: string;
  primaryLastName: string;
  primaryEmail: string;
  inviteType: InviteType;
  secondFirstName: string;
  secondLastName: string;
  accommodationGroup: string;
  invitedToAtitlan: boolean;
  inviteCode: string;
}

export default function AdminCreateInvitation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState("");

  const [formData, setFormData] = useState<FormData>({
    primaryFirstName: "",
    primaryLastName: "",
    primaryEmail: "",
    inviteType: "single",
    secondFirstName: "",
    secondLastName: "",
    accommodationGroup: "bokeh",
    invitedToAtitlan: false,
    inviteCode: "",
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Primary guest validation
    if (!formData.primaryFirstName.trim()) {
      errors.primaryFirstName = "First name is required";
    }
    if (!formData.primaryLastName.trim()) {
      errors.primaryLastName = "Last name is required";
    }
    if (!formData.primaryEmail.trim()) {
      errors.primaryEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryEmail)) {
      errors.primaryEmail = "Invalid email format";
    }

    // Couple validation
    if (formData.inviteType === "couple") {
      if (!formData.secondFirstName.trim()) {
        errors.secondFirstName = "Second guest first name is required";
      }
      if (!formData.secondLastName.trim()) {
        errors.secondLastName = "Second guest last name is required";
      }
    }

    // Invite code validation
    if (!formData.inviteCode.trim()) {
      errors.inviteCode = "Invite code is required";
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.inviteCode)) {
      errors.inviteCode = "Invite code must be alphanumeric with no spaces";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Get the current user's session token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("You must be logged in to create invitations");
        setLoading(false);
        return;
      }

      // Call the API endpoint
      const response = await fetch("/api/admin/invitations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 409) {
          setError(data.message);
        } else if (response.status === 403) {
          setError("You do not have admin access");
        } else if (response.status === 401) {
          setError("Authentication required. Please log in again.");
        } else {
          setError(data.message || "Failed to create invitation");
        }
        setLoading(false);
        return;
      }

      // Success!
      setSuccess(true);
      setCreatedInviteCode(data.inviteCode);
      setLoading(false);
    } catch (err: any) {
      console.error("Error creating invitation:", err);
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      primaryFirstName: "",
      primaryLastName: "",
      primaryEmail: "",
      inviteType: "single",
      secondFirstName: "",
      secondLastName: "",
      accommodationGroup: "bokeh",
      invitedToAtitlan: false,
      inviteCode: "",
    });
    setSuccess(false);
    setCreatedInviteCode("");
    setError("");
    setValidationErrors({});
  };

  if (success) {
    return (
      <div className="admin-page">
        <h1 className="admin-page-title">Create New Invitation</h1>

        <div className="success-container">
          <div className="success-icon">✓</div>
          <h2 className="success-title">Invitation Created Successfully!</h2>

          <div className="invite-code-display">
            <div className="invite-code-label">Invite Code:</div>
            <div className="invite-code-value">{createdInviteCode}</div>
          </div>

          <p className="success-message">
            Share this code with the guest. They can log in with their email and
            this code as the password.
          </p>

          <div className="success-actions">
            <button onClick={handleReset} className="btn btn-primary">
              Create Another Invitation
            </button>
            <button
              onClick={() => navigate("/admin/guests")}
              className="btn btn-secondary"
            >
              Back to Guests
            </button>
          </div>
        </div>

        <style>{`
          .success-container {
            background: white;
            padding: 3rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 600px;
            margin: 0 auto;
          }

          .success-icon {
            width: 80px;
            height: 80px;
            background-color: #2e7d32;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            margin: 0 auto 1.5rem;
          }

          .success-title {
            font-size: 1.75rem;
            margin: 0 0 2rem 0;
            color: #000000;
          }

          .invite-code-display {
            background-color: #f5f5f5;
            border: 2px solid #2e7d32;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2rem;
          }

          .invite-code-label {
            font-size: 0.9rem;
            color: #666666;
            margin-bottom: 0.5rem;
          }

          .invite-code-value {
            font-size: 2rem;
            font-weight: 600;
            color: #000000;
            font-family: monospace;
            letter-spacing: 0.1em;
          }

          .success-message {
            font-size: 1rem;
            color: #666666;
            margin-bottom: 2rem;
          }

          .success-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }

          .btn {
            padding: 0.875rem 1.5rem;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            font-family: "orpheuspro", serif;
            cursor: pointer;
            transition: opacity 0.2s;
          }

          .btn-primary {
            background-color: #000000;
            color: #ffffff;
          }

          .btn-secondary {
            background-color: #f5f5f5;
            color: #000000;
            border: 1px solid #d5d5d5;
          }

          .btn:hover {
            opacity: 0.85;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Create New Invitation</h1>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="form-container">
        <form onSubmit={handleSubmit}>
          {/* Primary Guest Section */}
          <section className="form-section">
            <h2 className="section-title">Primary Guest Information</h2>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="primaryFirstName" className="form-label">
                  First Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="primaryFirstName"
                  className={`form-input ${validationErrors.primaryFirstName ? "error" : ""}`}
                  value={formData.primaryFirstName}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryFirstName: e.target.value })
                  }
                  disabled={loading}
                />
                {validationErrors.primaryFirstName && (
                  <div className="field-error">
                    {validationErrors.primaryFirstName}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="primaryLastName" className="form-label">
                  Last Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="primaryLastName"
                  className={`form-input ${validationErrors.primaryLastName ? "error" : ""}`}
                  value={formData.primaryLastName}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryLastName: e.target.value })
                  }
                  disabled={loading}
                />
                {validationErrors.primaryLastName && (
                  <div className="field-error">
                    {validationErrors.primaryLastName}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="primaryEmail" className="form-label">
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                id="primaryEmail"
                className={`form-input ${validationErrors.primaryEmail ? "error" : ""}`}
                value={formData.primaryEmail}
                onChange={(e) =>
                  setFormData({ ...formData, primaryEmail: e.target.value })
                }
                disabled={loading}
                placeholder="guest@example.com"
              />
              {validationErrors.primaryEmail && (
                <div className="field-error">{validationErrors.primaryEmail}</div>
              )}
            </div>
          </section>

          {/* Invitation Type Section */}
          <section className="form-section">
            <h2 className="section-title">
              Invitation Type <span className="required">*</span>
            </h2>

            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="inviteType"
                  value="single"
                  checked={formData.inviteType === "single"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inviteType: e.target.value as InviteType,
                    })
                  }
                  disabled={loading}
                />
                <span className="radio-text">Single</span>
              </label>

              <label className="radio-label">
                <input
                  type="radio"
                  name="inviteType"
                  value="couple"
                  checked={formData.inviteType === "couple"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inviteType: e.target.value as InviteType,
                    })
                  }
                  disabled={loading}
                />
                <span className="radio-text">Couple</span>
              </label>

              <label className="radio-label">
                <input
                  type="radio"
                  name="inviteType"
                  value="plusone"
                  checked={formData.inviteType === "plusone"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inviteType: e.target.value as InviteType,
                    })
                  }
                  disabled={loading}
                />
                <span className="radio-text">Plus One</span>
              </label>
            </div>
          </section>

          {/* Second Guest Section (Couple Only) */}
          {formData.inviteType === "couple" && (
            <section className="form-section">
              <h2 className="section-title">Second Guest Information</h2>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="secondFirstName" className="form-label">
                    First Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="secondFirstName"
                    className={`form-input ${validationErrors.secondFirstName ? "error" : ""}`}
                    value={formData.secondFirstName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        secondFirstName: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                  {validationErrors.secondFirstName && (
                    <div className="field-error">
                      {validationErrors.secondFirstName}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="secondLastName" className="form-label">
                    Last Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="secondLastName"
                    className={`form-input ${validationErrors.secondLastName ? "error" : ""}`}
                    value={formData.secondLastName}
                    onChange={(e) =>
                      setFormData({ ...formData, secondLastName: e.target.value })
                    }
                    disabled={loading}
                  />
                  {validationErrors.secondLastName && (
                    <div className="field-error">
                      {validationErrors.secondLastName}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Details Section */}
          <section className="form-section">
            <h2 className="section-title">Invitation Details</h2>

            <div className="form-group">
              <label htmlFor="accommodationGroup" className="form-label">
                Accommodation Group <span className="required">*</span>
              </label>
              <select
                id="accommodationGroup"
                className="form-input"
                value={formData.accommodationGroup}
                onChange={(e) =>
                  setFormData({ ...formData, accommodationGroup: e.target.value })
                }
                disabled={loading}
              >
                <option value="bokeh">Villa Bokeh</option>
                <option value="convento">El Convento Boutique Hotel</option>
                <option value="santadomingo">Casa Santo Domingo</option>
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.invitedToAtitlan}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      invitedToAtitlan: e.target.checked,
                    })
                  }
                  disabled={loading}
                />
                <span className="checkbox-text">
                  Invite to Lake Atitlan celebration
                </span>
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="inviteCode" className="form-label">
                Invite Code <span className="required">*</span>
              </label>
              <input
                type="text"
                id="inviteCode"
                className={`form-input ${validationErrors.inviteCode ? "error" : ""}`}
                value={formData.inviteCode}
                onChange={(e) =>
                  setFormData({ ...formData, inviteCode: e.target.value })
                }
                disabled={loading}
                placeholder="SMITH2027"
              />
              <div className="helper-text">
                This will be used as the temporary password. Must be alphanumeric
                with no spaces.
              </div>
              {validationErrors.inviteCode && (
                <div className="field-error">{validationErrors.inviteCode}</div>
              )}
            </div>
          </section>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate("/admin/guests")}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create Invitation"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .admin-page-title {
          font-size: 2rem;
          font-weight: 400;
          margin: 0 0 2rem 0;
          color: #000000;
        }

        .error-banner {
          background-color: #ffebee;
          color: #c62828;
          padding: 1rem 1.5rem;
          border-radius: 4px;
          margin-bottom: 2rem;
          border-left: 4px solid #c62828;
        }

        .form-container {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          max-width: 800px;
        }

        .form-section {
          margin-bottom: 2.5rem;
        }

        .form-section:last-of-type {
          margin-bottom: 0;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 500;
          margin: 0 0 1.5rem 0;
          color: #000000;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e5e5e5;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          color: #333333;
          margin-bottom: 0.5rem;
        }

        .required {
          color: #c62828;
        }

        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d5d5d5;
          border-radius: 4px;
          font-size: 1rem;
          font-family: "orpheuspro", serif;
          transition: border-color 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #000000;
        }

        .form-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .form-input.error {
          border-color: #c62828;
        }

        .field-error {
          color: #c62828;
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }

        .helper-text {
          font-size: 0.85rem;
          color: #666666;
          margin-top: 0.25rem;
        }

        .radio-group {
          display: flex;
          gap: 2rem;
        }

        .radio-label {
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .radio-label input[type="radio"] {
          margin-right: 0.5rem;
          cursor: pointer;
        }

        .radio-text {
          font-size: 1rem;
          color: #333333;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          margin-right: 0.75rem;
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checkbox-text {
          font-size: 1rem;
          color: #333333;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 2px solid #e5e5e5;
        }

        .btn {
          padding: 0.875rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          font-family: "orpheuspro", serif;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .btn-primary {
          background-color: #000000;
          color: #ffffff;
        }

        .btn-secondary {
          background-color: #f5f5f5;
          color: #000000;
          border: 1px solid #d5d5d5;
        }

        .btn:hover:not(:disabled) {
          opacity: 0.85;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .radio-group {
            flex-direction: column;
            gap: 1rem;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
