export type Lang = "mr" | "hi" | "en";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "mr", label: "मराठी" },
  { code: "hi", label: "हिंदी" },
  { code: "en", label: "English" },
];

type Dict = Record<Lang, string>;

const strings = {
  appTitle: {
    mr: "कायझेन सुचना",
    hi: "काइज़ेन सुझाव",
    en: "Kaizen Suggestion",
  },
  appSubtitle: {
    mr: "आपली सुधारणा सुचवा",
    hi: "अपना सुधार बताइए",
    en: "Share your improvement idea",
  },
  step: { mr: "पायरी", hi: "चरण", en: "Step" },
  employeeId: { mr: "कर्मचारी क्रमांक", hi: "कर्मचारी नंबर", en: "Employee ID" },
  employeeIdHint: {
    mr: "४ अंकी क्रमांक टाका",
    hi: "4 अंकों का नंबर डालें",
    en: "Enter your 4-digit ID",
  },
  voiceNote: { mr: "आवाज नोंद", hi: "आवाज़ नोट", en: "Voice note" },
  voiceHint: {
    mr: "मराठी, हिंदी किंवा इंग्रजीत बोला",
    hi: "मराठी, हिंदी या अंग्रेज़ी में बोलिए",
    en: "Speak in Marathi, Hindi or English",
  },
  tapToRecord: { mr: "बोलण्यासाठी दाबा", hi: "बोलने के लिए दबाएँ", en: "Tap to record" },
  recording: { mr: "रेकॉर्डिंग चालू…", hi: "रिकॉर्डिंग चालू…", en: "Recording…" },
  stop: { mr: "थांबवा", hi: "रोकें", en: "Stop" },
  reRecord: { mr: "पुन्हा रेकॉर्ड", hi: "फिर रिकॉर्ड करें", en: "Re-record" },
  processing: { mr: "प्रक्रिया चालू…", hi: "प्रोसेस हो रहा है…", en: "Processing…" },
  transcript: { mr: "लिहिलेला मजकूर", hi: "लिखा हुआ पाठ", en: "Transcribed summary" },
  transcriptOk: { mr: "बरोबर आहे", hi: "सही है", en: "Looks good" },
  photo: { mr: "फोटो जोडा", hi: "फ़ोटो जोड़ें", en: "Add photo" },
  photoHint: {
    mr: "मशीन किंवा जागेचा फोटो (ऐच्छिक)",
    hi: "मशीन या जगह की फ़ोटो (वैकल्पिक)",
    en: "Photo of the machine or area (optional)",
  },
  camera: { mr: "कॅमेरा", hi: "कैमरा", en: "Camera" },
  gallery: { mr: "गॅलरी", hi: "गैलरी", en: "Gallery" },
  remove: { mr: "काढा", hi: "हटाएँ", en: "Remove" },
  submit: { mr: "सबमिट करा", hi: "सबमिट करें", en: "Submit Kaizen" },
  submitting: { mr: "पाठवत आहे…", hi: "भेज रहे हैं…", en: "Submitting…" },
  thanks: { mr: "धन्यवाद!", hi: "धन्यवाद!", en: "Thank you!" },
  received: { mr: "सुचना मिळाली", hi: "सुझाव मिल गया", en: "Submission received" },
  nextOperator: {
    mr: "पुढील कर्मचाऱ्यासाठी तयार…",
    hi: "अगले कर्मचारी के लिए तैयार…",
    en: "Resetting for the next operator…",
  },
  needId: { mr: "४ अंकी क्रमांक आवश्यक", hi: "4 अंकों का नंबर ज़रूरी", en: "Enter a 4-digit ID" },
  needVoice: {
    mr: "आवाज नोंद आवश्यक",
    hi: "आवाज़ नोट ज़रूरी है",
    en: "A voice note is required",
  },
  micDenied: {
    mr: "माइक परवानगी नाकारली",
    hi: "माइक की अनुमति नहीं मिली",
    en: "Microphone permission denied",
  },
  clear: { mr: "साफ करा", hi: "साफ़ करें", en: "Clear" },
  privacyNote: {
    mr: "जुन्या सुचना येथे पाहता येत नाहीत.",
    hi: "पुराने सुझाव यहाँ नहीं देख सकते।",
    en: "Past submissions are not viewable here.",
  },
} satisfies Record<string, Dict>;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, lang: Lang): string {
  return strings[key][lang];
}

export function tt(key: StringKey, lang: Lang): { primary: string; secondary: string } {
  return { primary: strings[key][lang], secondary: strings[key].en };
}
