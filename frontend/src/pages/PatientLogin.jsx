import { useState } from "react";

function PatientLogin({ onLogin, onBack }) {
  const [patientId, setPatientId] = useState("");

  function handleLogin(event) {
    event.preventDefault();

    if (!patientId.trim()) {
      alert("Please enter your ABHA Number or Patient ID.");
      return;
    }

    onLogin({
      patientId: patientId.trim(),
      name: "Demo Patient",
    });
  }

  return (
    <div className="kiosk portal-page">
      <div className="portal-header">
        <div className="brand">
          <div className="logo small">M</div>

          <div>
            <strong>MediKiosk</strong>
            <span>AI Clinical Intake</span>
          </div>
        </div>

        <div className="header-actions">
          <span>🌐 {localStorage.getItem("language") || "English"}</span>
          <span>♿ Accessibility</span>
        </div>
      </div>

      <div className="portal-content">
        <div className="portal-info">
          <div className="portal-icon patient-icon">
            👤
          </div>

          <p className="step-label">PATIENT PORTAL</p>

          <h1>Your health.<br />Your history.<br />Your care.</h1>

          <p className="portal-description">
            Securely begin your digital clinical intake and
            provide your healthcare team with a structured
            history before your consultation.
          </p>

          <div className="feature-list">
            <div>
              <span>✓</span>
              <div>
                <strong>Structured History</strong>
                <p>Your symptoms are organized for your doctor.</p>
              </div>
            </div>

            <div>
              <span>✓</span>
              <div>
                <strong>Voice Enabled</strong>
                <p>Speak naturally in your selected language.</p>
              </div>
            </div>

            <div>
              <span>✓</span>
              <div>
                <strong>Consent Based</strong>
                <p>You control how your information is used.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="login-card portal-login-card">
          <div className="card-heading">
            <div className="card-icon">
              👤
            </div>

            <div>
              <h2>Patient Identity</h2>
              <p>Sign in to continue your healthcare journey.</p>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="patientId">
                ABHA Number / Patient ID
              </label>

              <input
                id="patientId"
                type="text"
                placeholder="Enter your ABHA Number or Patient ID"
                value={patientId}
                onChange={(event) =>
                  setPatientId(event.target.value)
                }
                autoComplete="off"
              />

              <p className="input-help">
                Enter your registered patient identifier.
              </p>
            </div>

            <button
              type="submit"
              className="primary-button full-width"
            >
              Continue as Patient →
            </button>
          </form>

          <div className="security-box">
            <div>🔐</div>

            <div>
              <strong>Secure & Consent-Based</strong>
              <p>
                Your health information is handled securely.
                In the production system, ABHA/ABDM identity
                and consent services can be integrated here.
              </p>
            </div>
          </div>

          <div className="prototype-note">
            <strong>Prototype Mode</strong>
            <p>
              For this demonstration, any Patient ID can be
              used. No real ABHA verification is performed.
            </p>
          </div>

          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >
            ← Back to Role Selection
          </button>
        </div>
      </div>

      <div className="portal-footer">
        <span>🔒 Privacy First</span>
        <span>•</span>
        <span>Designed for healthcare environments</span>
        <span>•</span>
        <span>MediKiosk Prototype</span>
      </div>
    </div>
  );
}

export default PatientLogin;