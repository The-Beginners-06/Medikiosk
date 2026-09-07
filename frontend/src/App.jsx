import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const languages = [
  ["English", "English"],
  ["Hindi", "हिन्दी"],
  ["Marathi", "मराठी"],
  ["Tamil", "தமிழ்"],
  ["Telugu", "తెలుగు"],
  ["Bengali", "বাংলা"],
];

function App() {
  const [screen, setScreen] = useState("language");
  const [language, setLanguage] = useState("");
  const [sessionId, setSessionId] = useState("");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");

  const [complaint, setComplaint] = useState("");
  const [question, setQuestion] = useState("");
  const [field, setField] = useState("");
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState({});

  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Red-flag state
  const [redFlagResult, setRedFlagResult] = useState(null);
  const [checkingRedFlags, setCheckingRedFlags] = useState(false);

  function speechCode() {
    const codes = {
      English: "en-IN",
      Hindi: "hi-IN",
      Marathi: "mr-IN",
      Tamil: "ta-IN",
      Telugu: "te-IN",
      Bengali: "bn-IN",
    };

    return codes[language] || "en-IN";
  }

  function speak(text) {
    if (!text || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance(text);

    message.lang = speechCode();
    message.rate = 0.85;
    message.pitch = 1;
    message.volume = 1;

    message.onstart = () => {
      setSpeaking(true);
    };

    message.onend = () => {
      setSpeaking(false);
    };

    message.onerror = () => {
      setSpeaking(false);
    };

    window.speechSynthesis.speak(message);
  }

  useEffect(() => {
    if (screen !== "interview" || completed) {
      return;
    }

    if (question) {
      speak(question);
    } else {
      speak(
        "What is the main problem or symptom you are experiencing today?"
      );
    }
  }, [screen, question, completed]);

  useEffect(() => {
    if (screen !== "interview" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [screen]);

  async function createSession() {
    try {
      setLoading(true);

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
        throw new Error("Session creation failed");
      }

      const data = await response.json();

      setSessionId(data.session_id);
      setScreen("patient");
    } catch (error) {
      console.error(error);
      alert("Could not connect to the MediKiosk backend.");
    } finally {
      setLoading(false);
    }
  }

  function startInterview() {
    if (!name.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!age) {
      alert("Please enter your age.");
      return;
    }

    setCompleted(false);
    setQuestion("");
    setField("");
    setAnswer("");
    setAnswers({});
    setRedFlagResult(null);

    setScreen("interview");
  }

  async function checkRedFlags() {
    if (!sessionId) {
      return;
    }

    try {
      setCheckingRedFlags(true);

      const response = await fetch(
        `${API}/api/v1/sessions/${sessionId}/red-flags`
      );

      if (!response.ok) {
        throw new Error("Red-flag check failed");
      }

      const data = await response.json();

      console.log("Red-flag assessment:", data);

      setRedFlagResult(data);
    } catch (error) {
      console.error(error);

      // Do not block Doctor Review if the safety
      // assessment service is unavailable.
      setRedFlagResult({
        has_red_flags: false,
        urgency: "unknown",
        message:
          "Urgency assessment could not be completed.",
        flags: [],
      });
    } finally {
      setCheckingRedFlags(false);
    }
  }

  async function nextQuestion(newAnswers) {
    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/v1/interview/next-question`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            complaint: complaint,
            answers: newAnswers,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Question request failed");
      }

      const data = await response.json();

      console.log("Adaptive engine:", data);

      if (data.completed === true) {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }

        setSpeaking(false);
        setCompleted(true);
        setQuestion("");
        setField("");
        setAnswer("");

        // Automatically check for urgent patterns
        // before showing Doctor Review.
        await checkRedFlags();

        return;
      }

      setCompleted(false);
      setQuestion(data.question || "");
      setField(data.field || "");
      setAnswer("");
    } catch (error) {
      console.error(error);
      alert("Could not get the next clinical question.");
    } finally {
      setLoading(false);
    }
  }

  async function submitComplaint() {
    if (!complaint.trim()) {
      alert("Please enter your main symptom or problem.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/v1/sessions/${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chief_complaint: complaint,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Complaint save failed");
      }

      const emptyAnswers = {};

      setAnswers(emptyAnswers);

      await nextQuestion(emptyAnswers);
    } catch (error) {
      console.error(error);
      alert("Could not save the complaint.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) {
      alert("Please provide an answer.");
      return;
    }

    const newAnswers = {
      ...answers,
      [field]: answer,
    };

    try {
      setLoading(true);

      const response = await fetch(
        `${API}/api/v1/sessions/${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            field: field,
            answer: answer,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Answer save failed");
      }

      setAnswers(newAnswers);

      await nextQuestion(newAnswers);
    } catch (error) {
      console.error(error);
      alert("Could not save the answer.");
    } finally {
      setLoading(false);
    }
  }

  function voiceInput() {
    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Recognition) {
      alert("Please use Google Chrome for voice input.");
      return;
    }

    const recognition = new Recognition();

    recognition.lang = speechCode();
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;

      if (!complaint.trim()) {
        setComplaint(text);
      } else {
        setAnswer(text);
      }
    };

    recognition.onerror = (event) => {
      console.error("Voice error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  }

  function formatFieldName(key) {
    return key
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function startNewPatient() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setScreen("language");
    setLanguage("");
    setSessionId("");

    setName("");
    setAge("");
    setSex("");

    setComplaint("");
    setQuestion("");
    setField("");
    setAnswer("");
    setAnswers({});

    setLoading(false);
    setListening(false);
    setSpeaking(false);
    setCompleted(false);

    setRedFlagResult(null);
    setCheckingRedFlags(false);
  }

  if (screen === "language") {
    return (
      <div className="kiosk">
        <div className="language-card">
          <div className="logo">
            M
          </div>

          <p className="step-label">
            WELCOME TO MEDIKIOSK
          </p>

          <h1>
            Select your language
          </h1>

          <p>
            Choose the language you are most
            comfortable speaking.
          </p>

          <div className="language-grid">
            {languages.map(([code, native]) => (
              <button
                key={code}
                onClick={() => {
                  setLanguage(code);
                  setScreen("welcome");
                }}
              >
                {native}
              </button>
            ))}
          </div>

          <p className="privacy">
            🌐 Your selected language will be used
            throughout the clinical intake.
          </p>
        </div>
      </div>
    );
  }

  if (screen === "welcome") {
    return (
      <div className="kiosk">
        <div className="welcome-card">
          <div className="logo">
            M
          </div>

          <p className="step-label">
            LANGUAGE: {language.toUpperCase()}
          </p>

          <h1>
            Welcome to MediKiosk
          </h1>

          <p className="tagline">
            AI-Powered Clinical Intake
          </p>

          <p className="description">
            MediKiosk helps collect your medical
            history before you meet your doctor.
          </p>

          <button
            className="primary-button"
            onClick={() => setScreen("consent")}
          >
            Start Clinical Intake →
          </button>

          <div className="accessibility">
            <span>
              🎤 Voice enabled
            </span>

            <span>
              🔊 Questions read aloud
            </span>

            <span>
              👆 Touch enabled
            </span>

            <span>
              🔒 Secure
            </span>
          </div>

          <button
            className="back-button"
            onClick={() => setScreen("language")}
          >
            ← Change Language
          </button>
        </div>
      </div>
    );
  }

  if (screen === "consent") {
    return (
      <div className="kiosk">
        <div className="consent-card">
          <div className="logo small">
            M
          </div>

          <p className="step-label">
            CONSENT
          </p>

          <h1>
            Before we begin
          </h1>

          <div className="consent-box">
            <h2>
              Your information
            </h2>

            <p>
              MediKiosk will ask questions about
              your current symptoms, medical
              history, medicines and allergies.
            </p>

            <p>
              Your answers will be organized into
              a structured clinical history to help
              your healthcare professional.
            </p>

            <p>
              You can stop the process at any time.
            </p>
          </div>

          <div className="consent-actions">
            <button
              className="secondary-button"
              onClick={() => setScreen("welcome")}
            >
              ← Back
            </button>

            <button
              className="primary-button"
              onClick={createSession}
              disabled={loading}
            >
              {loading
                ? "Creating Session..."
                : "I Understand & Continue →"}
            </button>
          </div>

          <p className="privacy">
            🔒 Your information is collected with
            your consent.
          </p>
        </div>
      </div>
    );
  }

  if (screen === "patient") {
    return (
      <div className="kiosk">
        <div className="patient-card">
          <div className="logo small">
            M
          </div>

          <p className="step-label">
            STEP 2 OF 4
          </p>

          <h1>
            Patient Information
          </h1>

          <p>
            Please provide some basic information
            before we begin your clinical interview.
          </p>

          <div className="form-group">
            <label>
              Full Name
            </label>

            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Age
              </label>

              <input
                type="number"
                min="0"
                max="150"
                placeholder="Age"
                value={age}
                onChange={(e) =>
                  setAge(e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>
                Sex
              </label>

              <select
                value={sex}
                onChange={(e) =>
                  setSex(e.target.value)
                }
              >
                <option
                  value=""
                  disabled
                >
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

                <option value="Prefer not to say">
                  Prefer not to say
                </option>
              </select>
            </div>
          </div>

          {sessionId && (
            <p className="session-info">
              ✓ Session created successfully
            </p>
          )}

          <button
            className="primary-button full-width"
            onClick={startInterview}
          >
            Continue to Clinical Interview →
          </button>
        </div>
      </div>
    );
  }

  if (screen === "interview") {
    return (
      <div className="kiosk">
        <div className="interview-card">
          <p className="step-label">
            STEP 3 OF 4
          </p>

          <div className="progress-container">
            <div
              className="progress-bar"
              style={{
                width: completed
                  ? "100%"
                  : question
                  ? "55%"
                  : "35%",
              }}
            />
          </div>

          <h1>
            Clinical Interview
          </h1>

          {completed ? (
            <div className="completion-screen">
              <div className="completion-icon">
                ✓
              </div>

              <h2>
                Clinical Interview Complete
              </h2>

              <p>
                Thank you. Your responses have been
                recorded successfully.
              </p>

              {checkingRedFlags ? (
                <p className="completion-note">
                  Checking responses for urgent
                  clinical warning patterns...
                </p>
              ) : (
                <p className="completion-note">
                  Your information has been assessed
                  for predefined urgent warning
                  patterns.
                </p>
              )}

              <button
                className="primary-button full-width"
                onClick={() => setScreen("doctor")}
                disabled={checkingRedFlags}
              >
                {checkingRedFlags
                  ? "Completing Assessment..."
                  : "Continue to Doctor Review →"}
              </button>
            </div>
          ) : (
            <div>
              <p className="question">
                {question ||
                  "What is the main problem or symptom you are experiencing today?"}
              </p>

              {speaking && (
                <div className="speaking-indicator">
                  🔊 Reading question aloud...
                </div>
              )}

              <button
                className={
                  listening
                    ? "voice-button listening"
                    : "voice-button"
                }
                onClick={voiceInput}
              >
                {listening ? "🔴" : "🎤"}
              </button>

              <p className="voice-hint">
                {listening
                  ? "Listening... speak naturally"
                  : "Tap the microphone and speak naturally"}
              </p>

              <div className="divider">
                <span>
                  {question
                    ? "YOUR ANSWER"
                    : "OR"}
                </span>
              </div>

              <input
                className="complaint-input"
                type="text"
                placeholder={
                  question
                    ? "Type your answer"
                    : "Type your main complaint"
                }
                value={
                  question
                    ? answer
                    : complaint
                }
                onChange={(e) => {
                  if (question) {
                    setAnswer(e.target.value);
                  } else {
                    setComplaint(e.target.value);
                  }
                }}
              />

              <button
                className="primary-button full-width"
                onClick={
                  question
                    ? submitAnswer
                    : submitComplaint
                }
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : "Continue →"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "doctor") {
    return (
      <div className="kiosk">
        <div className="doctor-card">

          <div className="doctor-header">
            <div>
              <p className="step-label">
                STEP 4 OF 4
              </p>

              <h1>
                Doctor Clinical Review
              </h1>

              <p className="doctor-subtitle">
                Structured clinical history generated
                from the patient's responses.
              </p>
            </div>

            <div className="review-status">
              ✓ Complete
            </div>
          </div>

          {/* --------------------------------
              URGENCY ASSESSMENT
          --------------------------------- */}

          <div
            className={
              redFlagResult?.has_red_flags
                ? "urgency-section urgent"
                : "urgency-section routine"
            }
          >
            <div className="urgency-header">
              <div className="urgency-icon">
                {redFlagResult?.has_red_flags
                  ? "⚠️"
                  : "✓"}
              </div>

              <div>
                <h2>
                  Urgency Assessment
                </h2>

                <p>
                  {redFlagResult?.has_red_flags
                    ? "Potential urgent warning pattern detected"
                    : "No predefined urgent warning pattern detected"}
                </p>
              </div>
            </div>

            <div className="urgency-message">
              {redFlagResult?.message ||
                "Urgency assessment information is unavailable."}
            </div>

            {redFlagResult?.flags?.length > 0 && (
              <div className="flag-list">
                <strong>
                  Triggered warning:
                </strong>

                {redFlagResult.flags.map(
                  (flag, index) => (
                    <div
                      className="flag-item"
                      key={index}
                    >
                      {flag.message}
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="summary-section">
            <h2>
              Patient Details
            </h2>

            <div className="summary-grid">

              <div className="summary-field">
                <span>
                  Name
                </span>

                <strong>
                  {name || "Not provided"}
                </strong>
              </div>

              <div className="summary-field">
                <span>
                  Age
                </span>

                <strong>
                  {age
                    ? `${age} years`
                    : "Not provided"}
                </strong>
              </div>

              <div className="summary-field">
                <span>
                  Sex
                </span>

                <strong>
                  {sex || "Not provided"}
                </strong>
              </div>

            </div>
          </div>

          <div className="summary-section">
            <h2>
              Chief Complaint
            </h2>

            <div className="summary-box complaint-summary">
              <strong>
                {complaint || "Not provided"}
              </strong>
            </div>
          </div>

          <div className="summary-section">
            <h2>
              History of Present Illness
            </h2>

            {Object.keys(answers).length === 0 ? (
              <div className="summary-box">
                No additional history recorded.
              </div>
            ) : (
              <div className="history-list">
                {Object.entries(answers).map(
                  ([key, value]) => (
                    <div
                      className="history-item"
                      key={key}
                    >
                      <span>
                        {formatFieldName(key)}
                      </span>

                      <strong>
                        {String(value)}
                      </strong>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div className="summary-section">
            <h2>
              Interview Status
            </h2>

            <div className="completion-banner">
              <span className="status-icon">
                ✓
              </span>

              <div>
                <strong>
                  Clinical interview completed
                </strong>

                <p>
                  All required questions in the
                  selected clinical pathway were
                  completed.
                </p>
              </div>
            </div>
          </div>

          <div className="clinical-note">
            <strong>
              Clinical Note
            </strong>

            <p>
              This summary is generated from
              patient-provided responses and is
              intended to support clinical review.
              It does not provide an automated
              diagnosis.
            </p>
          </div>

          <button
            className="secondary-button full-width"
            onClick={startNewPatient}
          >
            Start New Patient →
          </button>

        </div>
      </div>
    );
  }

  return null;
}

export default App;