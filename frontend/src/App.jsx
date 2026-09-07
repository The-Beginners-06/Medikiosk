import { useEffect, useState } from "react";

import PatientLogin from "./pages/PatientLogin";
import DoctorLogin from "./pages/DoctorLogin";

const API = "http://127.0.0.1:8000";

function App() {
  const [screen, setScreen] = useState("language");

  const [language, setLanguage] = useState("English");

  const [patientUser, setPatientUser] = useState(null);
  const [doctorUser, setDoctorUser] = useState(null);

  const [sessionId, setSessionId] = useState(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");

  const [complaint, setComplaint] = useState("");

  const [question, setQuestion] = useState("");
  const [field, setField] = useState("");
  const [answer, setAnswer] = useState("");

  const [answers, setAnswers] = useState({});

  const [completed, setCompleted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const [redFlagResult, setRedFlagResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [doctorCases, setDoctorCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);

  // ---------------------------------------------------------
  // LANGUAGE
  // ---------------------------------------------------------

  function selectLanguage(selectedLanguage) {
    setLanguage(selectedLanguage);
    localStorage.setItem("language", selectedLanguage);
    setScreen("welcome");
  }

  // ---------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------

  function handlePatientLogin(user) {
    setPatientUser(user);
    setName(user.name || "");
    setScreen("patientPortal");
  }

  function handleDoctorLogin(user) {
    setDoctorUser(user);
    setScreen("doctorDashboard");
    loadDoctorCases();
  }

  function logout() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
    setPatientUser(null);
    setDoctorUser(null);
    setSessionId(null);
    setSelectedCase(null);

    setScreen("language");
  }

  // ---------------------------------------------------------
  // CREATE PATIENT SESSION
  // ---------------------------------------------------------

  async function createPatientSession() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/v1/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: language,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not create patient session.");
      }

      const data = await response.json();

      setSessionId(data.session_id);

      setScreen("consent");
    } catch (err) {
      console.error(err);
      setError(
        "Unable to connect to MediKiosk backend. Please make sure the FastAPI server is running."
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // CONSENT
  // ---------------------------------------------------------

  async function giveConsent() {
    if (!sessionId) {
      setError("Patient session was not created.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/api/v1/sessions/${sessionId}/consent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            purposes: [
              "Clinical history taking",
              "Doctor review",
              "Safety screening",
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Consent could not be recorded.");
      }

      setScreen("patient");
    } catch (err) {
      console.error(err);
      setError("Could not save your consent.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // SAVE PATIENT INFORMATION
  // ---------------------------------------------------------

  async function savePatientInformation() {
    if (!sessionId) {
      setError("Patient session was not created.");
      return;
    }

    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!age) {
      alert("Please enter your age.");
      return;
    }

    if (!sex) {
      alert("Please select your sex.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/api/v1/sessions/${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            field: "patient_information",
            answer: {
              name: name.trim(),
              age: Number(age),
              sex: sex,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Could not save patient information.");
      }

      await startInterview();
    } catch (err) {
      console.error(err);
      setError("Could not save patient information.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // START INTERVIEW
  // ---------------------------------------------------------

  async function startInterview() {
    if (!sessionId) {
      setError("Patient session was not created.");
      return;
    }

    if (!complaint.trim()) {
      alert("Please enter your main health concern.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/api/v1/sessions/${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chief_complaint: complaint.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Could not save chief complaint.");
      }

      setAnswers({});

      await getNextQuestion({});

      setScreen("interview");
    } catch (err) {
      console.error(err);
      setError("Could not start the clinical interview.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // GET NEXT QUESTION
  // ---------------------------------------------------------

  async function getNextQuestion(currentAnswers) {
    if (!complaint.trim()) {
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/v1/interview/next-question`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            complaint: complaint.trim(),
            answers: currentAnswers,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Could not get next question.");
      }

      const data = await response.json();

      // -----------------------------------------------------
      // INTERVIEW COMPLETED
      // -----------------------------------------------------

      if (data.completed === true) {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }

        setSpeaking(false);
        setCompleted(true);
        setQuestion("");
        setField("");
        setAnswer("");

        // IMPORTANT:
        // Mark the patient session as completed in backend.
        try {
          const completeResponse = await fetch(
            `${API}/api/v1/sessions/${sessionId}/complete`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (!completeResponse.ok) {
            console.error(
              "Backend could not mark session as completed."
            );
          }
        } catch (completeError) {
          console.error(
            "Session completion error:",
            completeError
          );
        }

        await checkRedFlags();

        return;
      }

      setQuestion(data.question || "");
      setField(data.field || "");

      // Automatically speak the question.
      speakText(data.question || "");
    } catch (err) {
      console.error(err);
      setError("Could not load the next interview question.");
    }
  }

  // ---------------------------------------------------------
  // SUBMIT ANSWER
  // ---------------------------------------------------------

  async function submitAnswer() {
    if (!field) {
      return;
    }

    if (!answer.trim()) {
      alert("Please provide an answer.");
      return;
    }

    const updatedAnswers = {
      ...answers,
      [field]: answer.trim(),
    };

    setAnswers(updatedAnswers);

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/api/v1/sessions/${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            field: field,
            answer: answer.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Could not save answer.");
      }

      setAnswer("");

      await getNextQuestion(updatedAnswers);
    } catch (err) {
      console.error(err);
      setError("Could not save your answer.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // RED FLAG CHECK
  // ---------------------------------------------------------

  async function checkRedFlags() {
    if (!sessionId) {
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/v1/sessions/${sessionId}/red-flags`
      );

      if (!response.ok) {
        throw new Error("Could not check red flags.");
      }

      const data = await response.json();

      setRedFlagResult(data);
    } catch (err) {
      console.error("Red flag check failed:", err);
    }
  }

  // ---------------------------------------------------------
  // TEXT TO SPEECH
  // ---------------------------------------------------------

  function speakText(text) {
    if (!text || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    if (language === "Hindi") {
      utterance.lang = "hi-IN";
    } else if (language === "Marathi") {
      utterance.lang = "mr-IN";
    } else {
      utterance.lang = "en-IN";
    }

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
  }

  // ---------------------------------------------------------
  // DOCTOR DASHBOARD
  // ---------------------------------------------------------

  async function loadDoctorCases() {
    try {
      const response = await fetch(
        `${API}/api/v1/sessions/doctor/queue`
      );

      if (!response.ok) {
        throw new Error("Could not load doctor queue.");
      }

      const data = await response.json();

      setDoctorCases(data.cases || []);
    } catch (err) {
      console.error("Doctor queue error:", err);
      setDoctorCases([]);
    }
  }

  function openCase(patientCase) {
    setSelectedCase(patientCase);
    setScreen("doctor");
  }

  // ---------------------------------------------------------
  // REFRESH DOCTOR QUEUE
  // ---------------------------------------------------------

  useEffect(() => {
    if (screen !== "doctorDashboard") {
      return;
    }

    loadDoctorCases();

    const interval = setInterval(() => {
      loadDoctorCases();
    }, 5000);

    return () => clearInterval(interval);
  }, [screen]);

  // ---------------------------------------------------------
  // START NEW PATIENT
  // ---------------------------------------------------------

  function startNewPatient() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);

    setPatientUser(null);
    setSessionId(null);

    setName("");
    setAge("");
    setSex("");

    setComplaint("");

    setQuestion("");
    setField("");
    setAnswer("");

    setAnswers({});

    setCompleted(false);
    setRedFlagResult(null);

    setError("");

    setScreen("language");
  }

  // ---------------------------------------------------------
  // LANGUAGE SCREEN
  // ---------------------------------------------------------

  if (screen === "language") {
    return (
      <div className="kiosk">
        <div className="language-card">
          <div className="logo">M</div>

          <p className="step-label">MEDIKIOSK</p>

          <h1>Choose your language</h1>

          <p className="subtitle">
            Select your preferred language to begin.
          </p>

          <div className="language-grid">
            <button
              className="language-button"
              onClick={() => selectLanguage("English")}
            >
              <strong>English</strong>
              <span>English</span>
            </button>

            <button
              className="language-button"
              onClick={() => selectLanguage("Hindi")}
            >
              <strong>हिन्दी</strong>
              <span>Hindi</span>
            </button>

            <button
              className="language-button"
              onClick={() => selectLanguage("Marathi")}
            >
              <strong>मराठी</strong>
              <span>Marathi</span>
            </button>
          </div>

          <p className="privacy">
            🔒 Your information is handled with privacy and
            consent in mind.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // WELCOME / ROLE SELECTION
  // ---------------------------------------------------------

  if (screen === "welcome") {
    return (
      <div className="kiosk">
        <div className="welcome-card">
          <div className="logo">M</div>

          <p className="step-label">MEDIKIOSK</p>

          <h1>
            AI-Powered
            <br />
            Clinical Intake
          </h1>

          <p className="subtitle">
            Structured patient history-taking designed to help
            healthcare professionals begin consultations with
            better clinical context.
          </p>

          <div className="role-grid">
            <button
              className="role-card"
              onClick={() => setScreen("patientLogin")}
            >
              <div className="role-icon">👤</div>

              <strong>Patient</strong>

              <span>
                Start your clinical history
              </span>
            </button>

            <button
              className="role-card"
              onClick={() => setScreen("doctorLogin")}
            >
              <div className="role-icon">🩺</div>

              <strong>Doctor</strong>

              <span>
                Access clinical dashboard
              </span>
            </button>
          </div>

          <div className="accessibility">
            <span>🌐 {language}</span>
            <span>♿ Accessibility enabled</span>
            <span>🔒 Privacy first</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // PATIENT LOGIN
  // ---------------------------------------------------------

  if (screen === "patientLogin") {
    return (
      <PatientLogin
        onLogin={handlePatientLogin}
        onBack={() => setScreen("welcome")}
      />
    );
  }

  // ---------------------------------------------------------
  // DOCTOR LOGIN
  // ---------------------------------------------------------

  if (screen === "doctorLogin") {
    return (
      <DoctorLogin
        onLogin={handleDoctorLogin}
        onBack={() => setScreen("welcome")}
      />
    );
  }

  // ---------------------------------------------------------
  // PATIENT PORTAL
  // ---------------------------------------------------------

  if (screen === "patientPortal") {
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
            <span>🌐 {language}</span>
            <span>♿ Accessibility</span>
          </div>
        </div>

        <div className="portal-content">
          <div className="portal-info">
            <div className="portal-icon patient-icon">
              👤
            </div>

            <p className="step-label">PATIENT PORTAL</p>

            <h1>
              Your health.
              <br />
              Your history.
              <br />
              Your care.
            </h1>

            <p className="portal-description">
              Welcome to MediKiosk. Begin your digital clinical
              intake and provide your healthcare team with a
              structured history before your consultation.
            </p>

            <div className="feature-list">
              <div>
                <span>✓</span>
                <div>
                  <strong>Structured History</strong>
                  <p>
                    Your symptoms are organized for your doctor.
                  </p>
                </div>
              </div>

              <div>
                <span>✓</span>
                <div>
                  <strong>Voice Enabled</strong>
                  <p>
                    Speak naturally in your selected language.
                  </p>
                </div>
              </div>

              <div>
                <span>✓</span>
                <div>
                  <strong>Consent Based</strong>
                  <p>
                    You control how your information is used.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="login-card portal-login-card">
            <div className="card-heading">
              <div className="card-icon">👤</div>

              <div>
                <h2>Hello, {name || "Patient"}</h2>
                <p>
                  Your patient identity has been recognized.
                </p>
              </div>
            </div>

            <div className="security-box">
              <div>🔐</div>

              <div>
                <strong>Ready to Begin</strong>

                <p>
                  Your Patient ID is:
                  <br />
                  <strong>
                    {patientUser?.patientId}
                  </strong>
                </p>
              </div>
            </div>

            <button
              className="primary-button full-width"
              onClick={createPatientSession}
              disabled={loading}
            >
              {loading
                ? "Creating Secure Session..."
                : "Begin Clinical Intake →"}
            </button>

            <button
              className="back-button"
              onClick={() => setScreen("welcome")}
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

  // ---------------------------------------------------------
  // CONSENT
  // ---------------------------------------------------------

  if (screen === "consent") {
    return (
      <div className="kiosk">
        <div className="consent-card">
          <p className="step-label">
            STEP 1 OF 3
          </p>

          <h1>
            Your consent matters
          </h1>

          <p className="subtitle">
            Before beginning your clinical history, please
            review how your information will be used.
          </p>

          <div className="consent-box">
            <div>
              <strong>Clinical History</strong>
              <p>
                Your responses will be structured into a
                clinical history for healthcare professional
                review.
              </p>
            </div>

            <div>
              <strong>Safety Screening</strong>
              <p>
                MediKiosk may identify predefined warning
                patterns that should receive clinical attention.
              </p>
            </div>

            <div>
              <strong>Doctor Review</strong>
              <p>
                Your completed intake will be made available
                to the authorized doctor through the clinical
                dashboard.
              </p>
            </div>
          </div>

          <div className="privacy">
            🔒 You can stop the process at any time.
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            className="primary-button full-width"
            onClick={giveConsent}
            disabled={loading}
          >
            {loading
              ? "Saving Consent..."
              : "I Understand & Give Consent →"}
          </button>

          <button
            className="back-button"
            onClick={() => setScreen("patientPortal")}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // PATIENT INFORMATION
  // ---------------------------------------------------------

  if (screen === "patient") {
    return (
      <div className="kiosk">
        <div className="patient-card">
          <p className="step-label">
            STEP 2 OF 3
          </p>

          <h1>Tell us about yourself</h1>

          <p className="subtitle">
            This information helps your doctor understand
            your clinical history.
          </p>

          <div className="form-group">
            <label htmlFor="name">
              Full Name
            </label>

            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="age">
              Age
            </label>

            <input
              id="age"
              type="number"
              min="1"
              max="120"
              placeholder="Enter your age"
              value={age}
              onChange={(event) =>
                setAge(event.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="sex">
              Sex
            </label>

            <select
              id="sex"
              value={sex}
              onChange={(event) =>
                setSex(event.target.value)
              }
            >
              <option value="">
                Select
              </option>
              <option value="Male">
                Male
              </option>
              <option value="Female">
                Female
              </option>
              <option value="Other">
                Other
              </option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="complaint">
              What is your main health concern?
            </label>

            <textarea
              id="complaint"
              placeholder="For example: chest pain, fever, headache..."
              value={complaint}
              onChange={(event) =>
                setComplaint(event.target.value)
              }
              rows="4"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            className="primary-button full-width"
            onClick={savePatientInformation}
            disabled={loading}
          >
            {loading
              ? "Starting Clinical Interview..."
              : "Continue to Clinical Interview →"}
          </button>

          <button
            className="back-button"
            onClick={() => setScreen("consent")}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // CLINICAL INTERVIEW
  // ---------------------------------------------------------

  if (screen === "interview") {
    if (completed) {
      return (
        <div className="kiosk">
          <div className="interview-card">
            <div className="completion-banner">
              ✓ Clinical Interview Complete
            </div>

            <h1>Your history has been recorded.</h1>

            <p className="subtitle">
              Your structured clinical history has been
              successfully prepared for doctor review.
            </p>

            {redFlagResult && (
              <div
                className={`urgency-section ${
                  redFlagResult.urgent
                    ? "urgent"
                    : "routine"
                }`}
              >
                <div className="urgency-header">
                  <div className="urgency-icon">
                    {redFlagResult.urgent
                      ? "⚠️"
                      : "✓"}
                  </div>

                  <div>
                    <h2>
                      {redFlagResult.urgent
                        ? "Urgent Warning Pattern Detected"
                        : "No Urgent Warning Pattern Detected"}
                    </h2>

                    <p>
                      {redFlagResult.urgent
                        ? "Please inform a healthcare professional immediately."
                        : "Your responses have been prepared for routine clinical review."}
                    </p>
                  </div>
                </div>

                {redFlagResult.flags &&
                  redFlagResult.flags.length > 0 && (
                    <div className="flag-list">
                      <strong>
                        Warning patterns:
                      </strong>

                      {redFlagResult.flags.map(
                        (flag, index) => (
                          <div
                            className="flag-item"
                            key={index}
                          >
                            • {flag}
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            )}

            <div className="summary-section">
              <h2>Patient Summary</h2>

              <div className="summary-grid">
                <div>
                  <span>Name</span>
                  <strong>{name}</strong>
                </div>

                <div>
                  <span>Age</span>
                  <strong>{age}</strong>
                </div>

                <div>
                  <span>Sex</span>
                  <strong>{sex}</strong>
                </div>
              </div>
            </div>

            <div className="summary-section">
              <h2>Main Concern</h2>

              <div className="summary-box">
                {complaint}
              </div>
            </div>

            <p className="doctor-note">
              Your information has been securely submitted
              to the MediKiosk clinical workflow for doctor
              review.
            </p>

            <button
              className="primary-button full-width"
              onClick={() => setScreen("welcome")}
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="kiosk">
        <div className="interview-card">
          <div className="interview-header">
            <div>
              <p className="step-label">
                STEP 3 OF 3 • CLINICAL HISTORY
              </p>

              <h1>Let's understand your symptoms.</h1>
            </div>

            <div className="language-badge">
              🌐 {language}
            </div>
          </div>

          <div className="complaint-box">
            <span>Main concern</span>
            <strong>{complaint}</strong>
          </div>

          <div className="question-section">
            <div className="question-number">
              Clinical Question
            </div>

            <h2>{question}</h2>

            <div className="voice-controls">
              {!speaking ? (
                <button
                  className="secondary-button"
                  onClick={() => speakText(question)}
                >
                  🔊 Read Question
                </button>
              ) : (
                <button
                  className="secondary-button"
                  onClick={stopSpeaking}
                >
                  ⏹ Stop Speaking
                </button>
              )}
            </div>

            <textarea
              className="answer-input"
              placeholder="Type your answer here..."
              value={answer}
              onChange={(event) =>
                setAnswer(event.target.value)
              }
              rows="5"
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  event.ctrlKey
                ) {
                  submitAnswer();
                }
              }}
            />

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              className="primary-button full-width"
              onClick={submitAnswer}
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : "Continue →"}
            </button>

            <p className="input-help">
              Press Ctrl + Enter to submit your answer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // DOCTOR DASHBOARD
  // ---------------------------------------------------------

  if (screen === "doctorDashboard") {
    const urgentCases = doctorCases.filter((patientCase) => {
      const complaintText =
        patientCase.chief_complaint || "";

      const answersText = JSON.stringify(
        patientCase.answers || {}
      );

      const combinedText =
        `${complaintText} ${answersText}`.toLowerCase();

      return (
        combinedText.includes("breathing") ||
        combinedText.includes("faint") ||
        combinedText.includes("sweating") ||
        combinedText.includes("unconscious") ||
        combinedText.includes("severe bleeding")
      );
    });

    return (
      <div className="kiosk">
        <div className="doctor-card">
          <div className="doctor-header">
            <div>
              <p className="step-label">
                DOCTOR PORTAL
              </p>

              <h1>
                Welcome,{" "}
                {doctorUser?.name || "Doctor"}
              </h1>

              <p className="doctor-subtitle">
                Clinical Intelligence Dashboard
              </p>
            </div>

            <div className="review-status">
              ✓ Authorized
            </div>
          </div>

          <div className="summary-grid dashboard-stats">
            <div>
              <span>Waiting</span>
              <strong>
                {doctorCases.length}
              </strong>
            </div>

            <div>
              <span>In Review</span>
              <strong>0</strong>
            </div>

            <div>
              <span>Urgent</span>
              <strong>
                {urgentCases.length}
              </strong>
            </div>
          </div>

          <div className="summary-section">
            <div className="queue-heading">
              <div>
                <h2>Patient Queue</h2>
                <p>
                  Completed MediKiosk interviews awaiting
                  clinical review.
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={loadDoctorCases}
              >
                ↻ Refresh
              </button>
            </div>

            {doctorCases.length === 0 ? (
              <div className="summary-box">
                <strong>
                  No completed patient cases yet.
                </strong>

                <p>
                  Complete a patient interview in another
                  tab/browser, then refresh this dashboard.
                </p>
              </div>
            ) : (
              <div className="case-list">
                {doctorCases.map((patientCase) => {
                  const caseAnswers =
                    patientCase.answers || {};

                  const text =
                    `${patientCase.chief_complaint || ""} ${JSON.stringify(
                      caseAnswers
                    )}`.toLowerCase();

                  const isUrgent =
                    text.includes("breathing") ||
                    text.includes("faint") ||
                    text.includes("sweating") ||
                    text.includes("unconscious");

                  return (
                    <div
                      className="case-row"
                      key={patientCase.session_id}
                    >
                      <div className="case-patient">
                        <strong>
                          {patientCase.patient?.name ||
                            "Patient"}
                        </strong>

                        <span>
                          ID:{" "}
                          {patientCase.session_id.slice(
                            0,
                            8
                          )}
                        </span>
                      </div>

                      <div className="case-complaint">
                        <span>Chief Complaint</span>
                        <strong>
                          {patientCase.chief_complaint ||
                            "Not specified"}
                        </strong>
                      </div>

                      <div className="case-priority">
                        <span>Priority</span>

                        <strong
                          className={
                            isUrgent
                              ? "priority-urgent"
                              : "priority-routine"
                          }
                        >
                          {isUrgent
                            ? "🔴 URGENT"
                            : "🟢 ROUTINE"}
                        </strong>
                      </div>

                      <button
                        className="primary-button review-button"
                        onClick={() =>
                          openCase(patientCase)
                        }
                      >
                        Review →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="summary-section">
            <h2>Clinical Workflow</h2>

            <div className="summary-box">
              <strong>
                Patient completes intake
              </strong>

              <br />

              ↓

              <br />

              Structured history stored in backend

              <br />

              ↓

              <br />

              Case appears in doctor queue

              <br />

              ↓

              <br />

              Doctor reviews history and safety screening
            </div>
          </div>

          <button
            className="secondary-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // DOCTOR CLINICAL REVIEW
  // ---------------------------------------------------------

  if (screen === "doctor") {
    if (!selectedCase) {
      return (
        <div className="kiosk">
          <div className="doctor-card">
            <h1>No patient selected</h1>

            <button
              className="primary-button"
              onClick={() =>
                setScreen("doctorDashboard")
              }
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    const patient = selectedCase.patient || {};
    const caseAnswers =
      selectedCase.answers || {};

    const caseText =
      `${selectedCase.chief_complaint || ""} ${JSON.stringify(
        caseAnswers
      )}`.toLowerCase();

    const caseUrgent =
      caseText.includes("breathing") ||
      caseText.includes("faint") ||
      caseText.includes("sweating") ||
      caseText.includes("unconscious") ||
      caseText.includes("severe bleeding");

    return (
      <div className="kiosk">
        <div className="doctor-card">
          <div className="doctor-header">
            <div>
              <p className="step-label">
                CLINICAL REVIEW
              </p>

              <h1>Patient History</h1>

              <p className="doctor-subtitle">
                Session ID:{" "}
                {selectedCase.session_id}
              </p>
            </div>

            <div className="review-status">
              ✓ Completed Intake
            </div>
          </div>

          <div
            className={`urgency-section ${
              caseUrgent ? "urgent" : "routine"
            }`}
          >
            <div className="urgency-header">
              <div className="urgency-icon">
                {caseUrgent ? "⚠️" : "✓"}
              </div>

              <div>
                <h2>
                  {caseUrgent
                    ? "Urgent Warning Pattern"
                    : "No Urgent Warning Pattern Detected"}
                </h2>

                <p>
                  {caseUrgent
                    ? "Review the patient promptly according to clinical judgment."
                    : "No predefined urgent pattern was detected by the prototype safety screening."}
                </p>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <h2>Patient Information</h2>

            <div className="summary-grid">
              <div>
                <span>Name</span>
                <strong>
                  {patient.name ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>Age</span>
                <strong>
                  {patient.age ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>Sex</span>
                <strong>
                  {patient.sex ||
                    "Not available"}
                </strong>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <h2>Chief Complaint</h2>

            <div className="summary-box">
              {selectedCase.chief_complaint ||
                "Not specified"}
            </div>
          </div>

          <div className="summary-section">
            <h2>Structured Clinical History</h2>

            {Object.keys(caseAnswers).length ===
            0 ? (
              <div className="summary-box">
                No structured answers recorded.
              </div>
            ) : (
              <div className="history-list">
                {Object.entries(caseAnswers).map(
                  ([key, value]) => {
                    if (
                      key ===
                      "patient_information"
                    ) {
                      return null;
                    }

                    return (
                      <div
                        className="history-item"
                        key={key}
                      >
                        <span>
                          {key.replace(
                            /_/g,
                            " "
                          )}
                        </span>

                        <strong>
                          {typeof value ===
                          "object"
                            ? JSON.stringify(
                                value
                              )
                            : String(value)}
                        </strong>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          <div className="summary-section">
            <h2>Clinical Safety Note</h2>

            <div className="summary-box">
              MediKiosk's warning-pattern engine is a
              prototype screening aid. It does not diagnose
              disease and should not replace professional
              clinical judgment.
            </div>
          </div>

          <button
            className="primary-button full-width"
            onClick={() =>
              setScreen("doctorDashboard")
            }
          >
            ← Back to Patient Queue
          </button>

          <button
            className="secondary-button full-width"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // FALLBACK
  // ---------------------------------------------------------

  return (
    <div className="kiosk">
      <div className="welcome-card">
        <h1>MediKiosk</h1>

        <p>
          Something went wrong. Please restart the
          application.
        </p>

        <button
          className="primary-button"
          onClick={startNewPatient}
        >
          Restart
        </button>
      </div>
    </div>
  );
}

export default App;