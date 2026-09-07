import { useState } from "react";

function DoctorLogin({ onLogin, onBack }) {
  const [doctorId, setDoctorId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  function handleLogin(event) {
    event.preventDefault();

    if (!doctorId.trim()) {
      alert("Please enter your Doctor ID.");
      return;
    }

    if (!password.trim()) {
      alert("Please enter your password.");
      return;
    }

    onLogin({
      doctorId: doctorId.trim(),
      name: "Dr. Demo",
    });
  }

  return (
    <div className="kiosk portal-page">
      <div className="portal-header">
        <div className="brand">
          <div className="logo small">M</div>

          <div>
            <strong>MediKiosk</strong>
            <span>Clinical Intelligence Platform</span>
          </div>
        </div>

        <div className="header-security">
          🔒 Secure Clinical Portal
        </div>
      </div>

      <div className="portal-content">
        <div className="portal-info doctor-info">
          <div className="portal-icon doctor-icon">
            🩺
          </div>

          <p className="step-label">HEALTHCARE PROFESSIONAL</p>

          <h1>
            Clinical intelligence
            <br />
            at your fingertips.
          </h1>

          <p className="portal-description">
            Review structured patient histories, identify
            predefined warning patterns and make informed
            clinical decisions.
          </p>

          <div className="feature-list">
            <div>
              <span>✓</span>
              <div>
                <strong>Patient Queue</strong>
                <p>View patients waiting for clinical review.</p>
              </div>
            </div>

            <div>
              <span>✓</span>
              <div>
                <strong>Structured History</strong>
                <p>Review organized clinical information.</p>
              </div>
            </div>

            <div>
              <span>✓</span>
              <div>
                <strong>Safety Screening</strong>
                <p>Review predefined urgent warning patterns.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="login-card portal-login-card doctor-login-card">
          <div className="card-heading">
            <div className="card-icon doctor-card-icon">
              🩺
            </div>

            <div>
              <h2>Doctor Sign In</h2>
              <p>Access your secure clinical workspace.</p>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="doctorId">
                Doctor ID
              </label>

              <input
                id="doctorId"
                type="text"
                placeholder="Enter your Doctor ID"
                value={doctorId}
                onChange={(event) =>
                  setDoctorId(event.target.value)
                }
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <div className="password-label">
                <label htmlFor="doctorPassword">
                  Password
                </label>

                <button
                  type="button"
                  className="show-password"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <input
                id="doctorPassword"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
              />
            </div>

            <div className="login-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(event) =>
                    setRememberDevice(
                      event.target.checked
                    )
                  }
                />

                <span>Remember this device</span>
              </label>

              <button
                type="button"
                className="forgot-button"
                onClick={() =>
                  alert(
                    "Please contact your hospital administrator to reset your password."
                  )
                }
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="primary-button full-width"
            >
              🔐 Secure Login →
            </button>
          </form>

          <div className="security-box">
            <div>🛡️</div>

            <div>
              <strong>Authorized Access Only</strong>
              <p>
                This portal is intended for authorized
                healthcare professionals. All clinical
                actions should be performed according to
                hospital policies.
              </p>
            </div>
          </div>

          <div className="prototype-note">
            <strong>Prototype Mode</strong>
            <p>
              Demonstration login is enabled for this
              hackathon prototype. Production deployment
              should use secure hospital authentication,
              role-based access and session management.
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
        <span>🔒 Secure Clinical Environment</span>
        <span>•</span>
        <span>Role-Based Access</span>
        <span>•</span>
        <span>MediKiosk Prototype</span>
      </div>
    </div>
  );
}

export default DoctorLogin;