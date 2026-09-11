import { useEffect, useState } from "react";
import "./App.css";

import PatientLogin from "./pages/PatientLogin";
import DoctorLogin from "./pages/DoctorLogin";

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

  const [patientUser, setPatientUser] = useState(null);
  const [doctorUser, setDoctorUser] = useState(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");

  const [complaint, setComplaint] = useState("");
  const [question, setQuestion] = useState("");
  const [firstQuestion, setFirstQuestion] = useState("");
  const [field, setField] = useState("");
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState({});

  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [completed, setCompleted] = useState(false);

const [doctorCases, setDoctorCases] = useState([]);
const [loadingDoctorCases, setLoadingDoctorCases] = useState(false);
const [selectedCase, setSelectedCase] = useState(null);

const [redFlagResult, setRedFlagResult] = useState(null);
const [checkingRedFlags, setCheckingRedFlags] = useState(false);

const [patientRecord, setPatientRecord] = useState(null);
  const [loadingPatientRecord, setLoadingPatientRecord] = useState(false);
  const [recordSaving, setRecordSaving] = useState(false);

  const [doctorAssessment, setDoctorAssessment] = useState({
    diagnosis: "",
    procedure: "",
    treatment: "",
    notes: "",
    follow_up: "",
  });
  const [savingDoctorAssessment, setSavingDoctorAssessment] = useState(false);
  const [documentReviewNotes, setDocumentReviewNotes] = useState({});
  const [verifyingDocumentId, setVerifyingDocumentId] = useState("");

  const [medicalHistoryInput, setMedicalHistoryInput] = useState("");

  const [surgeryHistoryInput, setSurgeryHistoryInput] = useState("");

  const [medicationInput, setMedicationInput] = useState("");

  const [allergyInput, setAllergyInput] = useState("");

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

  const synth = window.speechSynthesis;

  synth.cancel();

  const languageCode = speechCode();

  const speakNow = () => {
    const voices = synth.getVoices();

    console.log("TTS language:", languageCode);
    console.log(
      "Available voices:",
      voices.map((voice) => `${voice.name} — ${voice.lang}`)
    );

    let matchingVoice = voices.find(
      (voice) => voice.lang.toLowerCase() === languageCode.toLowerCase()
    );

    if (!matchingVoice) {
      matchingVoice = voices.find((voice) =>
        voice.lang
          .toLowerCase()
          .startsWith(languageCode.split("-")[0].toLowerCase())
      );
    }

    const message = new SpeechSynthesisUtterance(text);

    message.lang = languageCode;
    message.rate = 0.85;
    message.pitch = 1;
    message.volume = 1;

    if (matchingVoice) {
      message.voice = matchingVoice;
      console.log("Selected TTS voice:", matchingVoice.name);
    } else {
      console.warn(
        `No voice found for ${languageCode}. Browser will use its default voice.`
      );
    }

    message.onstart = () => {
      console.log("TTS started:", text);
      setSpeaking(true);
    };

    message.onend = () => {
      console.log("TTS finished");
      setSpeaking(false);
    };

    message.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setSpeaking(false);
    };

    synth.speak(message);
  };

  const voices = synth.getVoices();

  if (voices.length > 0) {
    speakNow();
  } else {
    synth.addEventListener("voiceschanged", speakNow, {
      once: true,
    });
  }
}

useEffect(() => {
  if (screen !== "interview" || completed) {
    return;
  }

  let cancelled = false;

  async function prepareAndSpeakQuestion() {
    if (question) {
      speak(question);
      return;
    }

    const defaultQuestion =
      "What is the main problem or symptom you are experiencing today?";

    const translatedQuestion = await translateQuestion(defaultQuestion);

    if (!cancelled) {
      setFirstQuestion(translatedQuestion);
      speak(translatedQuestion);
    }
  }

  prepareAndSpeakQuestion();

  return () => {
    cancelled = true;
  };
}, [screen, question, completed, language]);

  useEffect(() => {
    if (screen !== "interview" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [screen]);

  async function translateQuestion(text) {
    if (!text || language === "English") {
      return text;
    }

    try {
      const response = await fetch(
        `${API}/api/v1/translation/translate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            target_language: language,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Translation request failed");
      }

      const data = await response.json();

      return data.translated || text;
    } catch (error) {
      console.error("Translation error:", error);

      // If translation fails, keep the original clinical question.
      return text;
    }
  }
 async function createSession() {
  const patientId = patientUser?.patientId?.trim();

  if (!patientId) {
    alert("Patient ID is missing. Please log in again.");
    return;
  }

  try {
    setLoading(true);

    const response = await fetch(`${API}/api/v1/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language,
        patient_id: patientId,
      }),
    });

    if (!response.ok) {
      throw new Error("Session creation failed");
    }

    const data = await response.json();

    console.log("Patient session created:", data);

    setSessionId(data.session_id);
    setScreen("patient");
  } catch (error) {
    console.error(error);

    alert(
      "Could not connect to the MediKiosk backend."
    );
  } finally {
    setLoading(false);
  }
}
async function startInterview() {
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

  if (!sessionId) {
    alert("Session is missing. Please start a new patient session.");
    return;
  }

  const patientId = patientUser?.patientId?.trim();

  if (!patientId) {
    alert("Patient ID is missing. Please log in again.");
    return;
  }

  try {
    setLoading(true);

    // -----------------------------------------
    // 1. Save patient information to the session
    // -----------------------------------------

    const sessionResponse = await fetch(
      `${API}/api/v1/sessions/${sessionId}/patient`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          age: Number(age),
          sex: sex,
        }),
      }
    );

    if (!sessionResponse.ok) {
      throw new Error(
        "Patient information could not be saved to the session."
      );
    }

    const sessionData = await sessionResponse.json();

    console.log(
      "Patient information saved to session:",
      sessionData
    );

    // -----------------------------------------
    // 2. Save patient information to the
    //    permanent clinical record
    // -----------------------------------------

    const recordResponse = await fetch(
      `${API}/api/v1/patients/${encodeURIComponent(
        patientId
      )}/identity`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          age: Number(age),
          sex: sex,
        }),
      }
    );

    if (!recordResponse.ok) {
      throw new Error(
        "Patient information could not be saved to the clinical record."
      );
    }

    const updatedRecord = await recordResponse.json();

    console.log(
      "Patient clinical record updated:",
      updatedRecord
    );

    // Update frontend copy of the clinical record
    setPatientRecord(updatedRecord);

    // -----------------------------------------
    // 3. Reset interview state
    // -----------------------------------------

    setCompleted(false);
    setQuestion("");
    setField("");
    setAnswer("");
    setAnswers({});
    setRedFlagResult(null);

    // -----------------------------------------
    // 4. Continue to clinical interview
    // -----------------------------------------

    setScreen("interview");
  } catch (error) {
    console.error(
      "Patient information error:",
      error
    );

    alert(
      error.message ||
        "Could not save patient information. Please try again."
    );
  } finally {
    setLoading(false);
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
            complaint,
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
  setQuestion("");
  setField("");
  setAnswer("");

  try {
    const completeResponse = await fetch(
      `${API}/api/v1/sessions/${sessionId}/complete`,
      {
        method: "POST",
      }
    );

    if (!completeResponse.ok) {
      throw new Error("Session completion failed");
    }

    const completedSession = await completeResponse.json();

    console.log("Completed MediKiosk session:", completedSession);

    setCompleted(true);

    await checkRedFlags();
  } catch (error) {
    console.error("Session completion error:", error);
    alert("The clinical session could not be completed.");
  }

  return;
}

      setCompleted(false);

      const originalQuestion = data.question || "";
      const translatedQuestion = await translateQuestion(originalQuestion);

      setQuestion(translatedQuestion);
      setField(data.field || "");
      setAnswer("");
    } catch (error) {
      console.error(error);
      alert("Could not get the next clinical question.");
    } finally {
      setLoading(false);
    }
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
      console.error("Red-flag assessment error:", error);

      setRedFlagResult({
        has_red_flags: false,
        urgency: "unknown",
        message:
          "Safety screening could not be completed. A clinician should review the history.",
        flags: [],
      });
    } finally {
      setCheckingRedFlags(false);
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
            field,
            answer,
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
    const text = event.results[0][0].transcript.trim();

    if (!text) {
      return;
    }

    // -----------------------------------------
    // CHIEF COMPLAINT
    // -----------------------------------------
    if (!complaint.trim()) {
      setComplaint(text);
      return;
    }

    // -----------------------------------------
    // ADAPTIVE INTERVIEW ANSWER
    // -----------------------------------------
    setAnswer((currentAnswer) => {
      if (!currentAnswer.trim()) {
        return text;
      }

      return `${currentAnswer.trim()} ${text}`;
    });
  };

  recognition.onerror = (event) => {
    console.error("Voice recognition error:", event.error);

    setListening(false);

    if (event.error === "not-allowed") {
      alert(
        "Microphone permission was denied. Please allow microphone access in Google Chrome."
      );
    } else if (event.error === "no-speech") {
      alert("No speech was detected. Please try speaking again.");
    }
  };

  recognition.onend = () => {
    setListening(false);
  };

  try {
    recognition.start();
  } catch (error) {
    console.error("Could not start voice recognition:", error);
    setListening(false);
  }
}

function recordVoiceInput(setter) {
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
    const text = event.results[0][0].transcript.trim();

    if (!text) {
      return;
    }

    setter((currentValue) => {
      if (!currentValue.trim()) {
        return text;
      }

      return `${currentValue.trim()} ${text}`;
    });
  };

  recognition.onerror = (event) => {
    console.error(
      "Clinical record voice error:",
      event.error
    );

    setListening(false);

    if (event.error === "not-allowed") {
      alert(
        "Microphone permission was denied. Please allow microphone access in Google Chrome."
      );
    } else if (event.error === "no-speech") {
      alert(
        "No speech was detected. Please try speaking again."
      );
    }
  };

  recognition.onend = () => {
    setListening(false);
  };

  try {
    recognition.start();
  } catch (error) {
    console.error(
      "Could not start clinical record voice recognition:",
      error
    );

    setListening(false);
  }
}

  function formatFieldName(key) {
    return key
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function startNewPatient() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setScreen("language");

    setLanguage("");
    setSessionId("");

    setPatientUser(null);
    setDoctorUser(null);

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

  async function handlePatientLogin(user) {
  setPatientUser(user);
  setName(user.name || "");

  const patientId = user.patientId?.trim();

  if (!patientId) {
    alert("Patient ID is missing.");
    return;
  }

  try {
    setLoadingPatientRecord(true);

    const response = await fetch(
      `${API}/api/v1/patients/${encodeURIComponent(patientId)}`
    );

    if (response.ok) {
      // Existing clinical record found
      const data = await response.json();

      console.log("Existing patient clinical record:", data);

      setPatientRecord(data);

      const identity = data.identity || {};

      if (identity.name) {
        setName(identity.name);
      }

      if (identity.age !== null && identity.age !== undefined) {
        setAge(String(identity.age));
      }

      if (identity.sex) {
        setSex(identity.sex);
      }
    } else if (response.status === 404) {
      // No record exists yet, so create a new one
      console.log(
        "No clinical record found. Creating a new patient record..."
      );

      const createResponse = await fetch(
        `${API}/api/v1/patients/${encodeURIComponent(patientId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: user.name || null,
            age: null,
            sex: null,
          }),
        }
      );

      if (!createResponse.ok) {
        throw new Error(
          "Could not create patient clinical record."
        );
      }

      const newRecord = await createResponse.json();

      console.log("New patient clinical record created:", newRecord);

      setPatientRecord(newRecord);
    } else {
      throw new Error(
        "Could not load patient clinical record."
      );
    }

    setScreen("patientPortal");
  } catch (error) {
    console.error(
      "Patient clinical record error:",
      error
    );

    alert(
      "Could not load the patient clinical record. Please try again."
    );
  } finally {
    setLoadingPatientRecord(false);
  }
}

async function saveMedicalHistory() {
  const patientId = patientUser?.patientId?.trim();

  if (!patientId) {
    alert("Patient ID is missing.");
    return;
  }

  if (!medicalHistoryInput.trim()) {
    alert("Please enter your medical history first.");
    return;
  }

  try {
    setRecordSaving(true);

    const response = await fetch(
      `${API}/api/v1/patients/${encodeURIComponent(
        patientId
      )}/medical-history`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: medicalHistoryInput.trim(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Could not save medical history."
      );
    }

    const updatedRecord = await response.json();

    console.log(
      "Medical history saved:",
      updatedRecord
    );

    setPatientRecord(updatedRecord);
    setMedicalHistoryInput("");
  } catch (error) {
    console.error(
      "Medical history error:",
      error
    );

    alert(
      "Could not save medical history. Please try again."
    );
  } finally {
    setRecordSaving(false);
  }
}

async function saveSurgeryHistory() {
  const patientId = patientUser?.patientId?.trim();

  if (!patientId) {
    alert("Patient ID is missing.");
    return;
  }

  if (!surgeryHistoryInput.trim()) {
    alert("Please enter your surgery history first.");
    return;
  }

  try {
    setRecordSaving(true);

    const response = await fetch(
      `${API}/api/v1/patients/${encodeURIComponent(
        patientId
      )}/surgery-history`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: surgeryHistoryInput.trim(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Could not save surgery history."
      );
    }

    const updatedRecord = await response.json();

    console.log(
      "Surgery history saved:",
      updatedRecord
    );

    setPatientRecord(updatedRecord);
    setSurgeryHistoryInput("");
  } catch (error) {
    console.error(
      "Surgery history error:",
      error
    );

    alert(
      "Could not save surgery history. Please try again."
    );
  } finally {
    setRecordSaving(false);
  }
}

async function saveMedication() {
  const patientId = patientUser?.patientId?.trim();

  if (!patientId) {
    alert("Patient ID is missing.");
    return;
  }

  if (!medicationInput.trim()) {
    alert("Please enter a medication first.");
    return;
  }

  try {
    setRecordSaving(true);

    const response = await fetch(
      `${API}/api/v1/patients/${encodeURIComponent(
        patientId
      )}/medications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: medicationInput.trim(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Could not save medication.");
    }

    const updatedRecord = await response.json();

    console.log(
      "Medication saved:",
      updatedRecord
    );

    setPatientRecord(updatedRecord);
    setMedicationInput("");
  } catch (error) {
    console.error(
      "Medication error:",
      error
    );

    alert(
      "Could not save medication. Please try again."
    );
  } finally {
    setRecordSaving(false);
  }
}

async function saveAllergy() {
  const patientId = patientUser?.patientId?.trim();

  if (!patientId) {
    alert("Patient ID is missing.");
    return;
  }

  if (!allergyInput.trim()) {
    alert("Please enter an allergy first.");
    return;
  }

  try {
    setRecordSaving(true);

    const response = await fetch(
      `${API}/api/v1/patients/${encodeURIComponent(
        patientId
      )}/allergies`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: allergyInput.trim(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Could not save allergy.");
    }

    const updatedRecord = await response.json();

    console.log(
      "Allergy saved:",
      updatedRecord
    );

    setPatientRecord(updatedRecord);
    setAllergyInput("");
  } catch (error) {
    console.error(
      "Allergy error:",
      error
    );

    alert(
      "Could not save allergy. Please try again."
    );
  } finally {
    setRecordSaving(false);
  }
}
  async function handleDoctorLogin(user) {
  setDoctorUser(user);
  setScreen("doctorDashboard");

  try {
    setLoadingDoctorCases(true);

    const response = await fetch(
      `${API}/api/v1/sessions/doctor/queue`
    );

    if (!response.ok) {
      throw new Error("Could not load doctor queue");
    }

    const data = await response.json();

    console.log("Doctor queue:", data);

    setDoctorCases(data.cases || []);
  } catch (error) {
    console.error("Doctor queue error:", error);

    setDoctorCases([]);

    alert("Could not load the doctor patient queue.");
  } finally {
    setLoadingDoctorCases(false);
  }
}

  async function openDoctorCase(patientCase) {
  const caseInReview = {
    ...patientCase,
    status:
      patientCase.status === "waiting"
        ? "in_review"
        : patientCase.status,
  };

  setSelectedCase(caseInReview);

  setDoctorCases((currentCases) =>
    currentCases.map((currentCase) =>
      currentCase.session_id === caseInReview.session_id
        ? caseInReview
        : currentCase
    )
  );

  setRedFlagResult(null);
  setPatientRecord(null);
  setDoctorAssessment({
    diagnosis: "",
    procedure: "",
    treatment: "",
    notes: "",
    follow_up: "",
  });
  setDocumentReviewNotes({});
  setScreen("doctorCaseReview");

  try {
    // -----------------------------------------
    // 1. Load patient's permanent clinical record
    // -----------------------------------------

    const patientId = caseInReview.patient_id?.trim();

    if (patientId) {
      const patientResponse = await fetch(
        `${API}/api/v1/patients/${encodeURIComponent(
          patientId
        )}`
      );

      if (patientResponse.ok) {
        const patientData = await patientResponse.json();

        console.log(
          "Doctor loaded patient clinical record:",
          patientData
        );

        setPatientRecord(patientData);

        const currentVisit = patientData.visits?.find(
          (visit) => visit.visit_id === caseInReview.session_id
        );

        if (currentVisit?.doctor_assessment) {
          setDoctorAssessment({
            diagnosis: currentVisit.doctor_assessment.diagnosis || "",
            procedure: currentVisit.doctor_assessment.procedure || "",
            treatment: currentVisit.doctor_assessment.treatment || "",
            notes: currentVisit.doctor_assessment.notes || "",
            follow_up: currentVisit.doctor_assessment.follow_up || "",
          });
        }
      } else if (patientResponse.status === 404) {
        console.log(
          "No permanent clinical record found for this patient."
        );
      } else {
        throw new Error(
          "Could not load patient clinical record."
        );
      }
    }

    // -----------------------------------------
    // 2. Load red-flag assessment
    // -----------------------------------------

    const response = await fetch(
      `${API}/api/v1/sessions/${caseInReview.session_id}/red-flags`
    );

    if (!response.ok) {
      throw new Error("Red-flag check failed");
    }

    const data = await response.json();

    console.log(
      "Doctor case red-flag assessment:",
      data
    );

    setRedFlagResult(data);
  } catch (error) {
    console.error(
      "Doctor case loading error:",
      error
    );

    setRedFlagResult({
      has_red_flags: false,
      urgency: "unknown",
      message:
        "Urgency assessment could not be loaded for this case.",
      flags: [],
    });
  }
}

  async function verifyDocument(documentId) {
    const patientId = selectedCase?.patient_id?.trim();

    if (!patientId || !documentId) {
      alert("The patient record or document is missing.");
      return;
    }

    try {
      setVerifyingDocumentId(documentId);

      const response = await fetch(
        `${API}/api/v1/patients/${encodeURIComponent(
          patientId
        )}/documents/${encodeURIComponent(documentId)}/verification`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctor_id: doctorUser?.doctorId || "Doctor",
            verified: true,
            notes: documentReviewNotes[documentId] || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Document verification could not be saved.");
      }

      const updatedRecord = await response.json();
      setPatientRecord(updatedRecord);
    } catch (error) {
      console.error("Document verification error:", error);
      alert(error.message || "Could not save document verification.");
    } finally {
      setVerifyingDocumentId("");
    }
  }

  async function saveDoctorAssessment() {
    const patientId = selectedCase?.patient_id?.trim();

    if (!patientId || !selectedCase?.session_id) {
      alert("The patient case is missing.");
      return;
    }

    if (!Object.values(doctorAssessment).some((value) => value.trim())) {
      alert("Enter at least one assessment field before saving.");
      return;
    }

    try {
      setSavingDoctorAssessment(true);

      const response = await fetch(
        `${API}/api/v1/patients/${encodeURIComponent(
          patientId
        )}/visits/${encodeURIComponent(
          selectedCase.session_id
        )}/assessment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctor_id: doctorUser?.doctorId || "Doctor",
            ...doctorAssessment,
            chief_complaint: selectedCase.chief_complaint || null,
            answers: selectedCase.answers || {},
            red_flags: redFlagResult,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Assessment could not be saved.");
      }

      const updatedRecord = await response.json();
      setPatientRecord(updatedRecord);
      alert("Doctor assessment saved to the current visit.");
    } catch (error) {
      console.error("Doctor assessment error:", error);
      alert(error.message || "Could not save the doctor assessment.");
    } finally {
      setSavingDoctorAssessment(false);
    }
  }

  function markCaseAsReviewed() {
    if (!selectedCase) {
      return;
    }

    const reviewedCase = {
      ...selectedCase,
      status: "reviewed",
    };

    setSelectedCase(reviewedCase);

    setDoctorCases((currentCases) =>
      currentCases.map((patientCase) =>
        patientCase.session_id === reviewedCase.session_id
          ? reviewedCase
          : patientCase
      )
    );

    setScreen("doctorDashboard");
  }

  function logout() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setPatientUser(null);
    setDoctorUser(null);

    setScreen("language");
  }

  /* =========================
     LANGUAGE SCREEN
  ========================= */

  if (screen === "language") {
    return (
      <div className="kiosk">
        <div className="language-card">
          <div className="logo">M</div>

          <p className="step-label">WELCOME TO MEDIKIOSK</p>

          <h1>Select your language</h1>

          <p>
            Choose the language you are most comfortable speaking.
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
            🌐 Your selected language will be used throughout the
            clinical intake.
          </p>
        </div>
      </div>
    );
  }

  /* =========================
     WELCOME / ROLE SELECTION
  ========================= */

  if (screen === "welcome") {
    return (
      <div className="kiosk">
        <div className="welcome-card">
          <div className="logo">M</div>

          <p className="step-label">
            LANGUAGE: {language.toUpperCase()}
          </p>

          <h1>Welcome to MediKiosk</h1>

          <p className="tagline">
            AI-Powered Clinical Intake
          </p>

          <p className="description">
            A smart clinical intake platform that collects structured
            patient history and helps doctors review cases efficiently.
          </p>

          <h2 style={{ marginTop: "28px" }}>
            Who are you?
          </h2>

          <button
            className="primary-button full-width"
            onClick={() => setScreen("patientLogin")}
          >
            👤 Patient Portal →
          </button>

          <button
            className="secondary-button full-width"
            style={{ marginTop: "12px" }}
            onClick={() => setScreen("doctorLogin")}
          >
            🩺 Doctor Portal →
          </button>

          <div className="accessibility">
            <span>🎤 Voice enabled</span>
            <span>🔊 Questions read aloud</span>
            <span>👆 Touch enabled</span>
            <span>🔒 Secure</span>
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

  /* =========================
     PATIENT LOGIN
  ========================= */

  if (screen === "patientLogin") {
    return (
      <PatientLogin
        onLogin={handlePatientLogin}
        onBack={() => setScreen("welcome")}
      />
    );
  }

  /* =========================
     DOCTOR LOGIN
  ========================= */

  if (screen === "doctorLogin") {
    return (
      <DoctorLogin
        onLogin={handleDoctorLogin}
        onBack={() => setScreen("welcome")}
      />
    );
  }

  /* =========================
     PATIENT PORTAL
  ========================= */

 if (screen === "patientPortal") {
  return (
    <div className="kiosk">
      <div className="welcome-card">
        <div className="logo">M</div>

        <p className="step-label">PATIENT PORTAL</p>

        <h1>
          Welcome, {patientUser?.name || "Patient"}
        </h1>

        <p className="description">
          Your MediKiosk patient portal is ready.
        </p>

        {/* =========================
            PATIENT IDENTITY
        ========================= */}

        <div className="summary-section">
          <h2>Patient Identity</h2>

          <div className="summary-grid">
            <div>
              <span>Patient ID</span>
              <strong>
                {patientUser?.patientId || "Demo"}
              </strong>
            </div>

            <div>
              <span>Language</span>
              <strong>{language}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>Verified</strong>
            </div>
          </div>
        </div>

        {/* =========================
            CLINICAL RECORD
        ========================= */}

        <div className="summary-section">
          <h2>My Clinical Record</h2>

          {loadingPatientRecord ? (
            <div className="summary-box">
              Loading your clinical record...
            </div>
          ) : patientRecord ? (
            <>
              {/* Patient Information */}

              <div className="summary-box">
                <h3>Patient Information</h3>

                <p>
                  <strong>Name:</strong>{" "}
                  {patientRecord.identity?.name ||
                    "Not provided"}
                </p>

                <p>
                  <strong>Age:</strong>{" "}
                  {patientRecord.identity?.age ??
                    "Not provided"}
                </p>

                <p>
                  <strong>Sex:</strong>{" "}
                  {patientRecord.identity?.sex ||
                    "Not provided"}
                </p>
              </div>

              {/* Medical History */}

<div className="summary-box">
  <h3>Medical History</h3>

  {patientRecord.medical_history?.length > 0 ? (
    patientRecord.medical_history.map(
      (item, index) => (
        <p key={index}>
          • {item.text}
        </p>
      )
    )
  ) : (
    <p>No medical history recorded.</p>
  )}

  <div style={{ marginTop: "16px" }}>
    <div
  style={{
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginTop: "16px",
  }}
>
  <input
    type="text"
    placeholder="Enter your medical history"
    value={medicalHistoryInput}
    onChange={(e) =>
      setMedicalHistoryInput(e.target.value)
    }
    style={{
      flex: 1,
      padding: "12px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      boxSizing: "border-box",
    }}
  />

  <button
    type="button"
    className={
      listening
        ? "voice-button listening"
        : "voice-button"
    }
    onClick={() =>
      recordVoiceInput(setMedicalHistoryInput)
    }
    aria-label="Speak medical history"
    title="Speak medical history"
  >
    {listening ? "🔴" : "🎤"}
  </button>
</div>

<button
  className="primary-button full-width"
  onClick={saveMedicalHistory}
  disabled={recordSaving}
  style={{ marginTop: "10px" }}
>
  {recordSaving
    ? "Saving..."
    : "Save Medical History"}
</button>
  </div>
</div>

        {/* Surgery History */}

<div className="summary-box">
  <h3>Surgery History</h3>

  {patientRecord.surgery_history?.length > 0 ? (
    patientRecord.surgery_history.map(
      (item, index) => (
        <p key={index}>
          • {item.text}
        </p>
      )
    )
  ) : (
    <p>No surgery history recorded.</p>
  )}

  <div style={{ marginTop: "16px" }}>
    <div
  style={{
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginTop: "16px",
  }}
>
  <input
    type="text"
    placeholder="Enter your surgery history"
    value={surgeryHistoryInput}
    onChange={(e) =>
      setSurgeryHistoryInput(e.target.value)
    }
    style={{
      flex: 1,
      padding: "12px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      boxSizing: "border-box",
    }}
  />

  <button
    type="button"
    className={
      listening
        ? "voice-button listening"
        : "voice-button"
    }
    onClick={() =>
      recordVoiceInput(setSurgeryHistoryInput)
    }
    aria-label="Speak surgery history"
    title="Speak surgery history"
  >
    {listening ? "🔴" : "🎤"}
  </button>
</div>

<button
  className="primary-button full-width"
  onClick={saveSurgeryHistory}
  disabled={recordSaving}
  style={{ marginTop: "10px" }}
>
  {recordSaving
    ? "Saving..."
    : "Save Surgery History"}
</button>
  </div>
</div>
{/* Medications */}

<div className="summary-box">
  <h3>Medications</h3>

  {patientRecord.medications?.length > 0 ? (
    patientRecord.medications.map(
      (item, index) => (
        <p key={index}>
          • {item.text}
        </p>
      )
    )
  ) : (
    <p>No medications recorded.</p>
  )}

  <div style={{ marginTop: "16px" }}>
    <div
  style={{
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginTop: "16px",
  }}
>
  <input
    type="text"
    placeholder="Enter your medication"
    value={medicationInput}
    onChange={(e) =>
      setMedicationInput(e.target.value)
    }
    style={{
      flex: 1,
      padding: "12px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      boxSizing: "border-box",
    }}
  />

  <button
    type="button"
    className={
      listening
        ? "voice-button listening"
        : "voice-button"
    }
    onClick={() =>
      recordVoiceInput(setMedicationInput)
    }
    aria-label="Speak medication"
    title="Speak medication"
  >
    {listening ? "🔴" : "🎤"}
  </button>
</div>

<button
  className="primary-button full-width"
  onClick={saveMedication}
  disabled={recordSaving}
  style={{ marginTop: "10px" }}
>
  {recordSaving
    ? "Saving..."
    : "Save Medication"}
</button>
  </div>
</div>

{/* Allergies */}

<div className="summary-box">
  <h3>Allergies</h3>

  {patientRecord.allergies?.length > 0 ? (
    patientRecord.allergies.map(
      (item, index) => (
        <p key={index}>
          • {item.text}
        </p>
      )
    )
  ) : (
    <p>No allergies recorded.</p>
  )}

  <div style={{ marginTop: "16px" }}>
    <div
  style={{
    display: "flex",
    gap: "10px",
    alignItems: "center",
    marginTop: "16px",
  }}
>
  <input
    type="text"
    placeholder="Enter allergy"
    value={allergyInput}
    onChange={(e) =>
      setAllergyInput(e.target.value)
    }
    style={{
      flex: 1,
      padding: "12px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      boxSizing: "border-box",
    }}
  />

  <button
    type="button"
    className={
      listening
        ? "voice-button listening"
        : "voice-button"
    }
    onClick={() =>
      recordVoiceInput(setAllergyInput)
    }
    aria-label="Speak allergy"
    title="Speak allergy"
  >
    {listening ? "🔴" : "🎤"}
  </button>
</div>

<button
  className="primary-button full-width"
  onClick={saveAllergy}
  disabled={recordSaving}
  style={{ marginTop: "10px" }}
>
  {recordSaving
    ? "Saving..."
    : "Save Allergy"}
</button>
  </div>
</div>
              {/* Previous Visits */}

              <div className="summary-box">
                <h3>Previous Visits</h3>

                {patientRecord.visits?.length > 0 ? (
                  patientRecord.visits.map(
                    (visit, index) => (
                      <div
                        key={visit.visit_id || index}
                        style={{
                          marginBottom: "12px",
                          paddingBottom: "12px",
                          borderBottom:
                            "1px solid #e5e7eb",
                        }}
                      >
                        <p>
                          <strong>
                            Visit {index + 1}
                          </strong>
                        </p>

                        <p>
                          <strong>Date:</strong>{" "}
                          {visit.date
                            ? new Date(
                                visit.date
                              ).toLocaleString()
                            : "Not available"}
                        </p>

                        <p>
                          <strong>
                            Chief Complaint:
                          </strong>{" "}
                          {visit.chief_complaint ||
                            "Not recorded"}
                        </p>
                      </div>
                    )
                  )
                ) : (
                  <p>
                    No previous visits recorded yet.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="summary-box">
              No clinical record found yet.
            </div>
          )}
        </div>

        <p className="doctor-note">
          Your clinical record will contain your medical history,
          surgery history, medicines, allergies and previous visits.
          Information can be updated during your clinical care.
        </p>

        <button
          className="primary-button full-width"
          onClick={() => setScreen("consent")}
        >
          Start Clinical Intake →
        </button>

        <button
          className="back-button"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

  /* =========================
     CONSENT
  ========================= */

  if (screen === "consent") {
    return (
      <div className="kiosk">
        <div className="consent-card">
          <div className="logo small">M</div>

          <p className="step-label">CONSENT</p>

          <h1>Before we begin</h1>

          <div className="consent-box">
            <h2>Your information</h2>

            <p>
              MediKiosk will ask questions about your current symptoms,
              medical history, medicines and allergies.
            </p>

            <p>
              Your answers will be organized into a structured
              clinical history to help your healthcare professional.
            </p>

            <p>
              You can stop the process at any time.
            </p>
          </div>

          <div className="consent-actions">
            <button
              className="secondary-button"
              onClick={() => setScreen("patientPortal")}
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
            🔒 Your information is collected with your consent.
          </p>
        </div>
      </div>
    );
  }

  /* =========================
     PATIENT INFORMATION
  ========================= */

  if (screen === "patient") {
    return (
      <div className="kiosk">
        <div className="patient-card">
          <div className="logo small">M</div>

          <p className="step-label">STEP 2 OF 4</p>

          <h1>Patient Information</h1>

          <p>
            Please provide some basic information before we begin
            your clinical interview.
          </p>

          <div className="form-group">
            <label>Full Name</label>

            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Age</label>

              <input
                type="number"
                min="0"
                max="150"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Sex</label>

              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
              >
                <option value="" disabled>
                  Select
                </option>

                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
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

  /* =========================
     INTERVIEW
  ========================= */

  if (screen === "interview") {
    return (
      <div className="kiosk">
        <div className="interview-card">
          <p className="step-label">STEP 3 OF 4</p>

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

          <h1>Clinical Interview</h1>

          {completed ? (
            <div className="completion-screen">
              <div className="completion-icon">✓</div>

              <h2>Clinical Interview Complete</h2>

              <p>
                Thank you. Your responses have been recorded
                successfully.
              </p>

              {checkingRedFlags ? (
                <p className="completion-note">
                  Checking responses for urgent clinical warning
                  patterns...
                </p>
              ) : (
                <p className="completion-note">
                  Your information has been assessed for predefined
                  urgent warning patterns.
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
  {question || firstQuestion || "Loading question..."}
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
                <span>{question ? "YOUR ANSWER" : "OR"}</span>
              </div>

              <input
                className="complaint-input"
                type="text"
                placeholder={
                  question
                    ? "Type your answer"
                    : "Type your main complaint"
                }
                value={question ? answer : complaint}
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
                {loading ? "Please wait..." : "Continue →"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* =========================
     DOCTOR DASHBOARD
  ========================= */

  if (screen === "doctorDashboard") {
    return (
      <div className="kiosk">
        <div className="doctor-card">
          <div className="doctor-header">
            <div>
              <p className="step-label">DOCTOR PORTAL</p>

              <h1>
                Welcome, {doctorUser?.name || "Doctor"}
              </h1>

              <p className="doctor-subtitle">
                MediKiosk clinical dashboard
              </p>
            </div>

            <div className="review-status">
              ✓ Authorized
            </div>
          </div>

<div className="summary-section">
  <h2>Patient Queue</h2>

  {loadingDoctorCases ? (
    <div className="summary-box">
      Loading patient cases...
    </div>
  ) : doctorCases.length === 0 ? (
    <div className="summary-box">
      No completed patient cases are currently waiting for review.
    </div>
  ) : (
    <div className="doctor-queue">
      {doctorCases.map((patientCase) => (
        <div
          className="doctor-patient-card"
          key={patientCase.session_id}
        >
          {/* Patient information */}
          <div className="patient-card-info">

            <div className="patient-card-header">
              <div>
                <p className="patient-label">PATIENT</p>

                <h3>
                  {patientCase.patient?.name || "Patient"}
                </h3>
              </div>

              <span className="patient-status">
                {patientCase.status
                  ?.replaceAll("_", " ")
                  .toUpperCase()}
              </span>
            </div>

            <div className="patient-details">
              <div className="patient-detail">
                <span>Age</span>
                <strong>
                  {patientCase.patient?.age ?? "Not provided"}
                </strong>
              </div>

              <div className="patient-detail">
                <span>Sex</span>
                <strong>
                  {patientCase.patient?.sex || "Not provided"}
                </strong>
              </div>

              <div className="patient-detail complaint">
                <span>Chief Complaint</span>
                <strong>
                  {patientCase.chief_complaint || "Not provided"}
                </strong>
              </div>
            </div>
          </div>

          {/* Open case button */}
          <div className="patient-card-action">
            <button
              className="primary-button"
              onClick={() => openDoctorCase(patientCase)}
            >
              Open Case →
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

          <div className="summary-section">
            <h2>Clinical Workflow</h2>

<div className="summary-grid">
  <div>
    <span>Waiting</span>
    <strong>
      {
        doctorCases.filter(
          (patientCase) =>
            patientCase.status === "waiting"
        ).length
      }
    </strong>
  </div>

  <div>
    <span>In Review</span>
    <strong>
      {
        doctorCases.filter(
          (patientCase) =>
            patientCase.status === "in_review"
        ).length
      }
    </strong>
  </div>

  <div>
    <span>Reviewed</span>
    <strong>
      {
        doctorCases.filter(
          (patientCase) =>
            patientCase.status === "reviewed"
        ).length
      }
    </strong>
  </div>
</div>
          </div>

          <p className="doctor-note">
            Completed patient cases are shown here for structured
            clinical review. Final diagnosis and treatment decisions
            must be made by a qualified healthcare professional.
          </p>

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

  /* =========================
     DOCTOR CASE REVIEW
  ========================= */

  if (screen === "doctorCaseReview") {
  if (!selectedCase) {
    return (
      <div className="kiosk">
        <div className="doctor-card">
          <h1>No patient case selected</h1>

          <p className="doctor-subtitle">
            Please return to the doctor dashboard and open a patient case.
          </p>

          <button
            className="primary-button full-width"
            onClick={() => setScreen("doctorDashboard")}
          >
            ← Back to Patient Queue
          </button>
        </div>
      </div>
    );
  }

  const patient = selectedCase.patient || {};
  const caseAnswers = selectedCase.answers || {};
  const caseStatus = selectedCase.status || "waiting";

  // openDoctorCase() loads red flags for selectedCase. sessionId belongs to
  // the patient intake flow and may be unrelated to the doctor's selection.
  const caseRedFlagResult = redFlagResult;

  return (
    <div className="kiosk">
      <div className="doctor-card">
        <div className="doctor-header">
          <div>
            <p className="step-label">STEP 4 OF 4</p>

            <h1>Doctor Clinical Review</h1>

            <p className="doctor-subtitle">
              Review the structured clinical history collected by MediKiosk.
            </p>
          </div>

          <div className="review-status">
            {caseStatus === "reviewed"
              ? "✓ Reviewed"
              : caseStatus === "in_review"
              ? "● In Review"
              : "● Waiting"}
          </div>
        </div>

        {/* ----------------------------------------- */}
        {/* PATIENT SUMMARY */}
        {/* ----------------------------------------- */}

        <div className="summary-section">
          <h2>Patient Summary</h2>

          <div className="summary-grid">
            <div>
              <span>Name</span>
              <strong>{patient.name || "Not provided"}</strong>
            </div>

            <div>
              <span>Age</span>
              <strong>{patient.age ?? "Not provided"}</strong>
            </div>

            <div>
              <span>Sex</span>
              <strong>{patient.sex || "Not provided"}</strong>
            </div>
          </div>
        </div>

        {/* ----------------------------------------- */}
        {/* PERMANENT PATIENT CLINICAL RECORD */}
        {/* ----------------------------------------- */}

        <div className="summary-section">
          <h2>Patient Clinical Record</h2>

          {!patientRecord ? (
            <div className="summary-box">
              Patient clinical record is not available.
            </div>
          ) : (
            <>
              {/* Patient ID */}

              <div className="summary-box">
                <h3>Patient ID</h3>

                <p>
                  <strong>
                    {patientRecord.patient_id || "Not available"}
                  </strong>
                </p>
              </div>

              {/* Medical History */}

              <div className="summary-box">
                <h3>Medical History</h3>

                {patientRecord.medical_history?.length > 0 ? (
                  patientRecord.medical_history.map(
                    (item, index) => (
                      <p key={index}>
                        • {item.text}
                      </p>
                    )
                  )
                ) : (
                  <p>No medical history recorded.</p>
                )}
              </div>

              {/* Surgery History */}

              <div className="summary-box">
                <h3>Surgery History</h3>

                {patientRecord.surgery_history?.length > 0 ? (
                  patientRecord.surgery_history.map(
                    (item, index) => (
                      <p key={index}>
                        • {item.text}
                      </p>
                    )
                  )
                ) : (
                  <p>No surgery history recorded.</p>
                )}
              </div>

              {/* Medications */}

              <div className="summary-box">
                <h3>Medications</h3>

                {patientRecord.medications?.length > 0 ? (
                  patientRecord.medications.map(
                    (item, index) => (
                      <p key={index}>
                        • {item.text}
                      </p>
                    )
                  )
                ) : (
                  <p>No medications recorded.</p>
                )}
              </div>

              {/* Allergies */}

              <div className="summary-box">
                <h3>Allergies</h3>

                {patientRecord.allergies?.length > 0 ? (
                  patientRecord.allergies.map(
                    (item, index) => (
                      <p key={index}>
                        • {item.text}
                      </p>
                    )
                  )
                ) : (
                  <p>No allergies recorded.</p>
                )}
              </div>

              {/* Previous Visits */}

              <div className="summary-box">
                <h3>Uploaded Medical Documents</h3>

                {patientRecord.documents?.length > 0 ? (
                  patientRecord.documents.map((document) => {
                    const validation = document.clinical_validation || {};
                    const warnings = validation.warnings || [];

                    return (
                      <div
                        key={document.document_id}
                        style={{
                          marginBottom: "16px",
                          paddingBottom: "16px",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <p><strong>{document.file_name || "Unnamed document"}</strong></p>
                        <p><strong>Document type:</strong> {document.document_type || "Medical Document"}</p>
                        <p><strong>Uploaded:</strong> {document.uploaded_at ? new Date(document.uploaded_at).toLocaleString() : "Not available"}</p>
                        <p><strong>OCR status:</strong> {document.ocr_status || "Not available"}</p>
                        <p>
                          <strong>Clinical validation:</strong>{" "}
                          {document.verified
                            ? "Verified by doctor"
                            : validation.requires_doctor_verification
                            ? `${validation.warning_count || warnings.length} item(s) require review`
                            : validation.status || "No warnings"}
                        </p>

                        {warnings.length > 0 && (
                          <div className="flag-list">
                            <strong>Clinical validation warnings</strong>
                            {warnings.map((warning, index) => (
                              <div className="flag-item" key={`${document.document_id}-${index}`}>
                                <strong>{warning.field || "Warning"}:</strong>{" "}
                                {warning.value || "Value not available"}
                                <div>{warning.reason}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        <details style={{ marginTop: "12px" }}>
                          <summary>View OCR extracted text</summary>
                          <pre style={{ whiteSpace: "pre-wrap", maxHeight: "260px", overflow: "auto" }}>
                            {document.ocr_text || "No OCR text is available for this document."}
                          </pre>
                        </details>

                        {!document.verified && (
                          <>
                            <label htmlFor={`review-${document.document_id}`}>Review note (optional)</label>
                            <textarea
                              id={`review-${document.document_id}`}
                              value={documentReviewNotes[document.document_id] || ""}
                              onChange={(event) =>
                                setDocumentReviewNotes((current) => ({
                                  ...current,
                                  [document.document_id]: event.target.value,
                                }))
                              }
                              placeholder="Record what was verified or needs follow-up"
                            />
                            <button
                              className="secondary-button"
                              onClick={() => verifyDocument(document.document_id)}
                              disabled={verifyingDocumentId === document.document_id}
                            >
                              {verifyingDocumentId === document.document_id
                                ? "Saving review..."
                                : "Mark Document Verified"}
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p>No medical documents have been uploaded.</p>
                )}
              </div>

              <div className="summary-box">
                <h3>Previous Visits</h3>

                {patientRecord.visits?.length > 0 ? (
                  patientRecord.visits.map(
                    (visit, index) => (
                      <div
                        key={visit.visit_id || index}
                        style={{
                          marginBottom: "12px",
                          paddingBottom: "12px",
                          borderBottom:
                            "1px solid #e5e7eb",
                        }}
                      >
                        <p>
                          <strong>
                            Visit {index + 1}
                          </strong>
                        </p>

                        <p>
                          <strong>Date:</strong>{" "}
                          {visit.date
                            ? new Date(
                                visit.date
                              ).toLocaleString()
                            : "Not available"}
                        </p>

                        <p>
                          <strong>
                            Chief Complaint:
                          </strong>{" "}
                          {visit.chief_complaint ||
                            "Not recorded"}
                        </p>

                        {visit.doctor_assessment && (
                          <>
                            <p>
                              <strong>
                                Procedure:
                              </strong>{" "}
                              {visit.doctor_assessment.procedure ||
                                "Not recorded"}
                            </p>

                            <p>
                              <strong>
                                Treatment:
                              </strong>{" "}
                              {visit.doctor_assessment.treatment ||
                                "Not recorded"}
                            </p>
                          </>
                        )}
                      </div>
                    )
                  )
                ) : (
                  <p>
                    No previous visits recorded yet.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="summary-section">
          <h2>Doctor Assessment — Current Visit</h2>
          <p className="doctor-subtitle">
            Saving updates only this visit and keeps all previous visits unchanged.
          </p>

          <div className="form-group">
            <label htmlFor="diagnosis">Diagnosis</label>
            <input id="diagnosis" value={doctorAssessment.diagnosis} onChange={(event) => setDoctorAssessment((current) => ({ ...current, diagnosis: event.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="procedure">Procedure performed</label>
            <input id="procedure" value={doctorAssessment.procedure} onChange={(event) => setDoctorAssessment((current) => ({ ...current, procedure: event.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="treatment">Treatment</label>
            <textarea id="treatment" value={doctorAssessment.treatment} onChange={(event) => setDoctorAssessment((current) => ({ ...current, treatment: event.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="assessment-notes">Clinical notes</label>
            <textarea id="assessment-notes" value={doctorAssessment.notes} onChange={(event) => setDoctorAssessment((current) => ({ ...current, notes: event.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="follow-up">Follow-up</label>
            <input id="follow-up" value={doctorAssessment.follow_up} onChange={(event) => setDoctorAssessment((current) => ({ ...current, follow_up: event.target.value }))} />
          </div>
          <button
            className="primary-button"
            onClick={saveDoctorAssessment}
            disabled={savingDoctorAssessment}
          >
            {savingDoctorAssessment ? "Saving assessment..." : "Save Doctor Assessment"}
          </button>
        </div>

        {/* ----------------------------------------- */}
        {/* CURRENT CHIEF COMPLAINT */}
        {/* ----------------------------------------- */}

        <div className="summary-section">
          <h2>Current Visit — Chief Complaint</h2>

          <div className="summary-box">
            {selectedCase.chief_complaint ||
              "No complaint recorded."}
          </div>
        </div>

        {/* ----------------------------------------- */}
        {/* CURRENT STRUCTURED HISTORY */}
        {/* ----------------------------------------- */}

        <div className="summary-section">
          <h2>Current Visit — Structured Clinical History</h2>

          {Object.keys(caseAnswers).length === 0 ? (
            <div className="summary-box">
              No additional history was recorded.
            </div>
          ) : (
            <div className="history-list">
              {Object.entries(caseAnswers).map(
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

        {/* ----------------------------------------- */}
        {/* SAFETY SCREENING */}
        {/* ----------------------------------------- */}

        <div className="summary-section">
          <h2>Safety Screening</h2>

          {caseRedFlagResult ? (
            <div
              className={
                caseRedFlagResult.has_red_flags
                  ? "urgency-section urgent"
                  : "urgency-section routine"
              }
            >
              <div className="urgency-header">
                <div className="urgency-icon">
                  {caseRedFlagResult.has_red_flags
                    ? "⚠️"
                    : "✓"}
                </div>

                <div>
                  <h2>
                    {caseRedFlagResult.has_red_flags
                      ? "Urgent Warning Pattern Detected"
                      : "No Urgent Warning Pattern Detected"}
                  </h2>

                  <p>
                    {caseRedFlagResult.urgency
                      ? `Assessment: ${caseRedFlagResult.urgency}`
                      : "Safety screening completed"}
                  </p>
                </div>
              </div>

              <div className="urgency-message">
                {caseRedFlagResult.message ||
                  "Urgency assessment is not available."}
              </div>

              {caseRedFlagResult.flags?.length > 0 && (
                <div className="flag-list">
                  <strong>
                    Detected warning patterns:
                  </strong>

                  {caseRedFlagResult.flags.map(
                    (flag, index) => (
                      <div
                        className="flag-item"
                        key={`${flag.type || "flag"}-${index}`}
                      >
                        <strong>
                          {flag.type || "Warning"}
                        </strong>

                        {flag.severity && (
                          <span>
                            {" "}
                            — Severity:{" "}
                            {flag.severity}
                          </span>
                        )}

                        {flag.message && (
                          <div>
                            {flag.message}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="summary-box">
              Safety screening information is not
              loaded for this case.
            </div>
          )}
        </div>

        {/* ----------------------------------------- */}
        {/* CASE INFORMATION */}
        {/* ----------------------------------------- */}

        <div className="summary-section">
          <h2>Case Information</h2>

          <div className="summary-grid">
            <div>
              <span>Status</span>

              <strong>
                {caseStatus
                  .replaceAll("_", " ")
                  .toUpperCase()}
              </strong>
            </div>

            <div>
              <span>Started</span>

              <strong>
                {selectedCase.started_at
                  ? new Date(
                      selectedCase.started_at
                    ).toLocaleString()
                  : "Not available"}
              </strong>
            </div>

            <div>
              <span>Completed</span>

              <strong>
                {selectedCase.completed_at
                  ? new Date(
                      selectedCase.completed_at
                    ).toLocaleString()
                  : "Not available"}
              </strong>
            </div>
          </div>
        </div>

        {/* ----------------------------------------- */}
        {/* MEDICAL DISCLAIMER */}
        {/* ----------------------------------------- */}

        <div className="completion-banner">
          ⚕️ This is a clinical decision-support prototype.
          The final diagnosis and treatment decision must be
          made by a qualified healthcare professional.
        </div>

        {/* ----------------------------------------- */}
        {/* ACTIONS */}
        {/* ----------------------------------------- */}

        <div className="consent-actions">
          <button
            className="secondary-button"
            onClick={() =>
              setScreen("doctorDashboard")
            }
          >
            ← Back to Queue
          </button>

          <button
            className="primary-button"
            onClick={markCaseAsReviewed}
            disabled={caseStatus === "reviewed"}
          >
            {caseStatus === "reviewed"
              ? "✓ Case Reviewed"
              : "Mark as Reviewed"}
          </button>
        </div>
      </div>
    </div>
  );
}

  /* =========================
     DOCTOR CLINICAL REVIEW
  ========================= */

  if (screen === "doctor") {
    return (
      <div className="kiosk">
        <div className="doctor-card">
          <div className="doctor-header">
            <div>
              <p className="step-label">STEP 4 OF 4</p>

              <h1>Doctor Clinical Review</h1>

              <p className="doctor-subtitle">
                Structured clinical history generated from the
                patient's responses.
              </p>
            </div>

            <div className="review-status">
              ✓ Complete
            </div>
          </div>

          {/* URGENCY ASSESSMENT */}

          <div
            className={
              redFlagResult?.has_red_flags
                ? "urgency-section urgent"
                : "urgency-section routine"
            }
          >
            <div className="urgency-header">
              <div className="urgency-icon">
                {redFlagResult?.has_red_flags ? "⚠️" : "✓"}
              </div>

              <div>
                <h2>
                  {redFlagResult?.has_red_flags
                    ? "Urgent Warning Pattern Detected"
                    : "No Urgent Warning Pattern Detected"}
                </h2>

                <p>
                  {redFlagResult?.urgency
                    ? `Assessment: ${redFlagResult.urgency}`
                    : "Safety screening completed"}
                </p>
              </div>
            </div>

            <div className="urgency-message">
              {redFlagResult?.message ||
                "Urgency assessment is not available."}
            </div>

{redFlagResult?.flags?.length > 0 && (
  <div className="flag-list">
    <strong>Detected warning patterns:</strong>

    {redFlagResult.flags.map((flag, index) => (
      <div
        className="flag-item"
        key={`${flag.type || "flag"}-${index}`}
      >
        <strong>
          {flag.type || "Warning"}
        </strong>

        {flag.severity && (
          <span>
            {" "}
            — Severity: {flag.severity}
          </span>
        )}

        {flag.message && (
          <div>
            {flag.message}
          </div>
        )}
      </div>
    ))}
  </div>
)}
          </div>

          {/* PATIENT SUMMARY */}

          <div className="summary-section">
            <h2>Patient Summary</h2>

            <div className="summary-grid">
              <div>
                <span>Name</span>
                <strong>{name || "Not provided"}</strong>
              </div>

              <div>
                <span>Age</span>
                <strong>{age || "Not provided"}</strong>
              </div>

              <div>
                <span>Sex</span>
                <strong>{sex || "Not provided"}</strong>
              </div>
            </div>
          </div>

          {/* CHIEF COMPLAINT */}

          <div className="summary-section">
            <h2>Chief Complaint</h2>

            <div className="summary-box">
              {complaint || "No complaint recorded."}
            </div>
          </div>

          {/* HISTORY */}

          <div className="summary-section">
            <h2>Structured Clinical History</h2>

            {Object.keys(answers).length === 0 ? (
              <div className="summary-box">
                No additional history was recorded.
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

          {/* DISCLAIMER */}

          <div className="completion-banner">
            ⚕️ This is a clinical decision-support prototype.
            The final diagnosis and treatment decision must be made
            by a qualified healthcare professional.
          </div>

          <button
            className="primary-button full-width"
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

