// ============================================================
// i18n — Hindi + English translations
// ============================================================

export type Language = "en" | "hi";

const translations: Record<string, Record<Language, string>> = {
  // Navigation
  "nav.emergency": { en: "Emergency", hi: "आपातकाल" },
  "nav.requests": { en: "Requests", hi: "अनुरोध" },
  "nav.map": { en: "Map", hi: "मानचित्र" },
  "nav.resources": { en: "Resources", hi: "संसाधन" },
  "nav.network": { en: "Network", hi: "नेटवर्क" },
  "nav.profile": { en: "Profile", hi: "प्रोफ़ाइल" },
  "nav.settings": { en: "Settings", hi: "सेटिंग्स" },
  "nav.notifications": { en: "Notifications", hi: "सूचनाएं" },

  // Auth
  "auth.signIn": { en: "Sign In", hi: "साइन इन करें" },
  "auth.register": { en: "Register", hi: "रजिस्टर करें" },
  "auth.email": { en: "Email", hi: "ईमेल" },
  "auth.password": { en: "Password", hi: "पासवर्ड" },
  "auth.confirmPassword": { en: "Confirm Password", hi: "पासवर्ड की पुष्टि करें" },
  "auth.fullName": { en: "Full Name", hi: "पूरा नाम" },
  "auth.phone": { en: "Phone", hi: "फ़ोन" },
  "auth.joinNetwork": { en: "Join the emergency network", hi: "आपातकालीन नेटवर्क से जुड़ें" },
  "auth.createAccount": { en: "Create Account", hi: "अकाउंट बनाएं" },

  // Roles
  "role.citizen": { en: "I need help", hi: "मुझे मदद चाहिए" },
  "role.volunteer": { en: "I want to help", hi: "मैं मदद करना चाहता हूं" },
  "role.ngo": { en: "I represent an NGO", hi: "मैं एक NGO का प्रतिनिधि हूं" },

  // Emergency Page
  "emergency.title": { en: "Report an emergency", hi: "आपातकाल की रिपोर्ट करें" },
  "emergency.subtitle": { en: "Select category, fill in details, and we'll auto-match the nearest help.", hi: "श्रेणी चुनें, विवरण भरें, और हम निकटतम सहायता स्वचालित रूप से मिलाएंगे।" },
  "emergency.category": { en: "Category", hi: "श्रेणी" },
  "emergency.urgency": { en: "Urgency", hi: "तत्काल" },
  "emergency.describe": { en: "Describe the situation", hi: "स्थिति का वर्णन करें" },
  "emergency.requestHelp": { en: "Request Help", hi: "मदद मांगें" },
  "emergency.sending": { en: "Sending...", hi: "भेज रहे हैं..." },
  "emergency.sent": { en: "Emergency sent!", hi: "आपातकाल भेजा गया!" },
  "emergency.findingHelp": { en: "Finding nearest volunteers…", hi: "निकटतम स्वयंसेवकों को खोज रहे हैं…" },
  "emergency.reporting": { en: "Emergency reporting", hi: "आपातकालीन रिपोर्टिंग" },

  // Categories
  "category.food": { en: "Food", hi: "भोजन" },
  "category.disaster": { en: "Disaster", hi: "आपदा" },
  "category.sanitation": { en: "Sanitation", hi: "स्वच्छता" },
  "category.others": { en: "Others", hi: "अन्य" },

  // Urgency
  "urgency.low": { en: "Low", hi: "कम" },
  "urgency.medium": { en: "Medium", hi: "मध्यम" },
  "urgency.high": { en: "High", hi: "उच्च" },
  "urgency.critical": { en: "Critical", hi: "गंभीर" },

  // Form fields
  "form.peopleAffected": { en: "People affected", hi: "प्रभावित लोग" },
  "form.volunteersNeeded": { en: "Volunteers needed", hi: "स्वयंसेवक आवश्यक" },
  "form.foodType": { en: "Type of food needed", hi: "आवश्यक भोजन का प्रकार" },
  "form.landmark": { en: "Nearby landmark", hi: "निकटतम लैंडमार्क" },
  "form.landmarkPlaceholder": { en: "Near school / temple / hospital...", hi: "स्कूल / मंदिर / अस्पताल के पास..." },
  "form.disasterType": { en: "Type of disaster", hi: "आपदा का प्रकार" },
  "form.severityLevel": { en: "Severity level", hi: "गंभीरता स्तर" },
  "form.immediateDanger": { en: "Immediate danger to life?", hi: "जीवन को तात्कालिक खतरा?" },
  "form.uploadMedia": { en: "Upload photo / video", hi: "फ़ोटो / वीडियो अपलोड करें" },
  "form.required": { en: "required", hi: "आवश्यक" },
  "form.optional": { en: "optional", hi: "वैकल्पिक" },
  "form.areaSize": { en: "Area size", hi: "क्षेत्र का आकार" },
  "form.issueType": { en: "Type of issue", hi: "समस्या का प्रकार" },
  "form.proofRequired": { en: "Photo/video proof is required for sanitation reports", hi: "स्वच्छता रिपोर्ट के लिए फ़ोटो/वीडियो प्रमाण आवश्यक है" },
  "form.description": { en: "What's happening? Include any details that can help responders...", hi: "क्या हो रहा है? कोई भी विवरण शामिल करें जो उत्तरदाताओं की मदद कर सके..." },

  // Requests
  "requests.title": { en: "Requests", hi: "अनुरोध" },
  "requests.active": { en: "Active", hi: "सक्रिय" },
  "requests.completed": { en: "Completed", hi: "पूर्ण" },
  "requests.cancelled": { en: "Cancelled", hi: "रद्द" },
  "requests.noRequests": { en: "No requests yet.", hi: "अभी कोई अनुरोध नहीं।" },
  "requests.yourActive": { en: "Your active requests", hi: "आपके सक्रिय अनुरोध" },
  "requests.trackRequest": { en: "Track your help requests", hi: "अपने सहायता अनुरोधों को ट्रैक करें" },
  "requests.helpOnWay": { en: "Your help is on the way!", hi: "आपकी मदद रास्ते में है!" },
  "requests.etaMinutes": { en: "mins away", hi: "मिनट दूर" },
  "requests.accept": { en: "Accept", hi: "स्वीकार करें" },
  "requests.complete": { en: "Complete", hi: "पूर्ण करें" },
  "requests.start": { en: "Start", hi: "शुरू करें" },
  "requests.navigate": { en: "Navigate", hi: "नेविगेट" },

  // Chat
  "chat.title": { en: "Chat", hi: "चैट" },
  "chat.typeMessage": { en: "Type a message...", hi: "संदेश टाइप करें..." },
  "chat.iReached": { en: "I reached", hi: "मैं पहुंच गया" },
  "chat.needMoreHelp": { en: "Need more help", hi: "और मदद चाहिए" },
  "chat.onMyWay": { en: "On my way!", hi: "रास्ते में हूं!" },
  "chat.almostThere": { en: "Almost there", hi: "लगभग पहुंच गया" },
  "chat.call": { en: "Call", hi: "कॉल" },

  // Completion
  "completion.title": { en: "Request Completed", hi: "अनुरोध पूरा हुआ" },
  "completion.approve": { en: "Approve", hi: "स्वीकृत करें" },
  "completion.reportIssue": { en: "Report issue", hi: "समस्या की रिपोर्ट करें" },
  "completion.beforeAfter": { en: "Before & After", hi: "पहले और बाद में" },
  "completion.uploadProof": { en: "Upload completion proof", hi: "पूर्ण होने का प्रमाण अपलोड करें" },

  // Rating
  "rating.title": { en: "Rate your experience", hi: "अपने अनुभव को रेट करें" },
  "rating.feedback": { en: "Share your feedback", hi: "अपनी प्रतिक्रिया साझा करें" },
  "rating.submit": { en: "Submit Rating", hi: "रेटिंग सबमिट करें" },
  "rating.thankYou": { en: "Thank you for your feedback!", hi: "आपकी प्रतिक्रिया के लिए धन्यवाद!" },

  // Profile
  "profile.title": { en: "Profile", hi: "प्रोफ़ाइल" },
  "profile.trustScore": { en: "Trust Score", hi: "विश्वास स्कोर" },
  "profile.badges": { en: "Badges", hi: "बैज" },
  "profile.stats": { en: "Stats", hi: "आंकड़े" },
  "profile.requestsRaised": { en: "Requests Raised", hi: "अनुरोध उठाए" },
  "profile.solved": { en: "Solved", hi: "हल किए" },
  "profile.peopleHelped": { en: "People Helped", hi: "लोगों की मदद की" },
  "profile.signOut": { en: "Sign Out", hi: "साइन आउट" },
  "profile.verified": { en: "Verified Account", hi: "सत्यापित खाता" },
  "profile.streak": { en: "Day Streak", hi: "दिन की स्ट्रीक" },
  "profile.impact": { en: "You helped {count} people", hi: "आपने {count} लोगों की मदद की" },

  // Resources
  "resources.title": { en: "Resources", hi: "संसाधन" },
  "resources.campaigns": { en: "Campaigns", hi: "अभियान" },
  "resources.nearbyNGOs": { en: "Nearby NGOs", hi: "निकटतम NGOs" },
  "resources.follow": { en: "Follow", hi: "फॉलो करें" },
  "resources.following": { en: "Following", hi: "फॉलो कर रहे हैं" },
  "resources.comment": { en: "Add a comment...", hi: "कमेंट जोड़ें..." },

  // Notifications
  "notifications.title": { en: "Notifications", hi: "सूचनाएं" },
  "notifications.requestAccepted": { en: "Request accepted", hi: "अनुरोध स्वीकार किया गया" },
  "notifications.volunteerArriving": { en: "Volunteer arriving", hi: "स्वयंसेवक आ रहा है" },
  "notifications.completionDone": { en: "Request completed", hi: "अनुरोध पूरा हुआ" },
  "notifications.badgeEarned": { en: "Badge earned!", hi: "बैज अर्जित!" },
  "notifications.noNotifications": { en: "No notifications yet", hi: "अभी कोई सूचना नहीं" },

  // Settings
  "settings.title": { en: "Settings", hi: "सेटिंग्स" },
  "settings.editProfile": { en: "Edit Profile", hi: "प्रोफ़ाइल संपादित करें" },
  "settings.privacy": { en: "Privacy", hi: "गोपनीयता" },
  "settings.language": { en: "Language", hi: "भाषा" },
  "settings.logout": { en: "Logout", hi: "लॉगआउट" },
  "settings.emergencyContacts": { en: "Emergency Contacts", hi: "आपातकालीन संपर्क" },

  // Map
  "map.title": { en: "Live coordination map", hi: "लाइव समन्वय मानचित्र" },
  "map.myRequests": { en: "My Requests", hi: "मेरे अनुरोध" },
  "map.allRequests": { en: "All Requests", hi: "सभी अनुरोध" },
  "map.volunteerLocation": { en: "Volunteer location", hi: "स्वयंसेवक स्थान" },

  // Search
  "search.title": { en: "Search", hi: "खोजें" },
  "search.placeholder": { en: "Search requests, campaigns, NGOs...", hi: "अनुरोध, अभियान, NGOs खोजें..." },

  // Safety
  "safety.reportMisuse": { en: "Report Misuse", hi: "दुरुपयोग की रिपोर्ट करें" },
  "safety.verified": { en: "Verified", hi: "सत्यापित" },
  "safety.shareContacts": { en: "Share Emergency Contacts", hi: "आपातकालीन संपर्क साझा करें" },

  // Network
  "network.title": { en: "Network", hi: "नेटवर्क" },
  "network.ngos": { en: "NGOs", hi: "एनजीओ" },
  "network.volunteers": { en: "Volunteers", hi: "स्वयंसेवक" },

  // General
  "general.loading": { en: "Loading...", hi: "लोड हो रहा है..." },
  "general.error": { en: "Something went wrong", hi: "कुछ गलत हो गया" },
  "general.save": { en: "Save", hi: "सहेजें" },
  "general.cancel": { en: "Cancel", hi: "रद्द करें" },
  "general.back": { en: "Back", hi: "वापस" },
  "general.submit": { en: "Submit", hi: "जमा करें" },
  "general.close": { en: "Close", hi: "बंद करें" },
  "general.delete": { en: "Delete", hi: "हटाएं" },
  "general.noResults": { en: "No results found", hi: "कोई परिणाम नहीं मिला" },

  // Smart Matching
  "matching.findingVolunteers": { en: "Finding nearest volunteers…", hi: "निकटतम स्वयंसेवक खोज रहे हैं…" },
  "matching.scanningMap": { en: "Scanning nearby area…", hi: "आस-पास का क्षेत्र स्कैन कर रहे हैं…" },
  "matching.matchFound": { en: "Match found!", hi: "मिलान मिला!" },
  "matching.assigningTeam": { en: "Assigning your response team…", hi: "आपकी प्रतिक्रिया टीम नियुक्त कर रहे हैं…" },

  // Landing
  "landing.tagline": { en: "Help Faster. Save Lives.", hi: "तेज़ी से मदद करें। जीवन बचाएं।" },
  "landing.hero": { en: "Emergency help should move like a live network, not a static website.", hi: "आपातकालीन मदद एक लाइव नेटवर्क की तरह चलनी चाहिए, स्थिर वेबसाइट की तरह नहीं।" },
  "landing.startEmergency": { en: "Start emergency flow", hi: "आपातकाल प्रवाह शुरू करें" },
  "landing.joinNetwork": { en: "Join the network", hi: "नेटवर्क से जुड़ें" },

  // NGO Dashboard
  "ngo.controlCenter": { en: "Control Center", hi: "कंट्रोल सेंटर" },
  "ngo.dashboard": { en: "NGO Dashboard", hi: "NGO डैशबोर्ड" },
  "ngo.activeRequests": { en: "Active Requests", hi: "सक्रिय अनुरोध" },
  "ngo.volunteersActive": { en: "Volunteers Active", hi: "सक्रिय स्वयंसेवक" },
  "ngo.tasksCompleted": { en: "Tasks Completed", hi: "कार्य पूर्ण" },
  "ngo.successRate": { en: "Success Rate", hi: "सफलता दर" },
  "ngo.liveFeed": { en: "Live Feed", hi: "लाइव फीड" },
  "ngo.overview": { en: "Overview", hi: "अवलोकन" },

  // NGO Request Management
  "ngo.allRequests": { en: "All Requests", hi: "सभी अनुरोध" },
  "ngo.filterByCategory": { en: "Filter by category", hi: "श्रेणी से फ़िल्टर करें" },
  "ngo.filterByPriority": { en: "Filter by priority", hi: "प्राथमिकता से फ़िल्टर करें" },
  "ngo.override": { en: "Override", hi: "ओवरराइड" },
  "ngo.assignManually": { en: "Assign Manually", hi: "मैन्युअल रूप से असाइन करें" },
  "ngo.peopleAffected": { en: "People Affected", hi: "प्रभावित लोग" },

  // Smart Allocation
  "ngo.smartAllocation": { en: "Smart Allocation", hi: "स्मार्ट आवंटन" },
  "ngo.whyAssigned": { en: "Why this volunteer?", hi: "यह स्वयंसेवक क्यों?" },
  "ngo.distanceScore": { en: "Distance Score", hi: "दूरी स्कोर" },
  "ngo.skillScore": { en: "Skill Score", hi: "कौशल स्कोर" },
  "ngo.trustScoreLabel": { en: "Trust Score", hi: "विश्वास स्कोर" },
  "ngo.changeLeader": { en: "Change Leader", hi: "लीडर बदलें" },
  "ngo.addVolunteer": { en: "Add Volunteer", hi: "स्वयंसेवक जोड़ें" },
  "ngo.removeVolunteer": { en: "Remove Volunteer", hi: "स्वयंसेवक हटाएं" },
  "ngo.rerunMatching": { en: "Re-run Matching", hi: "फिर से मिलान करें" },

  // Volunteer Management
  "ngo.volunteers": { en: "Volunteers", hi: "स्वयंसेवक" },
  "ngo.promoteLeader": { en: "Promote to Leader", hi: "लीडर बनाएं" },
  "ngo.blockVolunteer": { en: "Block", hi: "ब्लॉक करें" },
  "ngo.onlineNow": { en: "Online Now", hi: "अभी ऑनलाइन" },
  "ngo.currentTask": { en: "Current Task", hi: "वर्तमान कार्य" },

  // Team Monitor
  "ngo.teamMonitor": { en: "Team Monitor", hi: "टीम मॉनिटर" },
  "ngo.teamLeader": { en: "Team Leader", hi: "टीम लीडर" },
  "ngo.teamMembers": { en: "Team Members", hi: "टीम सदस्य" },
  "ngo.taskProgress": { en: "Task Progress", hi: "कार्य प्रगति" },
  "ngo.intervene": { en: "Intervene", hi: "हस्तक्षेप करें" },
  "ngo.sendBroadcast": { en: "Send Broadcast", hi: "ब्रॉडकास्ट भेजें" },

  // Communication
  "ngo.communication": { en: "Communication", hi: "संचार" },
  "ngo.directChat": { en: "Direct Chat", hi: "सीधी चैट" },
  "ngo.broadcast": { en: "Broadcast", hi: "ब्रॉडकास्ट" },
  "ngo.escalation": { en: "Escalation", hi: "एस्केलेशन" },
  "ngo.broadcastPlaceholder": { en: "Type a broadcast message…", hi: "ब्रॉडकास्ट संदेश लिखें…" },

  // Task Review
  "ngo.taskReview": { en: "Task Review", hi: "कार्य समीक्षा" },
  "ngo.approve": { en: "Approve", hi: "स्वीकृत करें" },
  "ngo.reject": { en: "Reject", hi: "अस्वीकृत करें" },
  "ngo.requestRework": { en: "Request Rework", hi: "पुनः कार्य अनुरोध" },
  "ngo.reviewNotes": { en: "Review Notes", hi: "समीक्षा नोट्स" },

  // Analytics
  "ngo.analytics": { en: "Analytics", hi: "विश्लेषण" },
  "ngo.requestsPerDay": { en: "Requests per Day", hi: "प्रति दिन अनुरोध" },
  "ngo.avgResponseTime": { en: "Avg Response Time", hi: "औसत प्रतिक्रिया समय" },
  "ngo.highNeedAreas": { en: "High-Need Areas", hi: "उच्च-आवश्यकता क्षेत्र" },
  "ngo.volunteerPerformance": { en: "Volunteer Performance", hi: "स्वयंसेवक प्रदर्शन" },

  // Campaign
  "ngo.createCampaign": { en: "Create Campaign", hi: "अभियान बनाएं" },
  "ngo.campaignTitle": { en: "Campaign Title", hi: "अभियान शीर्षक" },
  "ngo.campaignCaption": { en: "Campaign Description", hi: "अभियान विवरण" },
  "ngo.publishCampaign": { en: "Publish Campaign", hi: "अभियान प्रकाशित करें" },
  "ngo.myCampaigns": { en: "My Campaigns", hi: "मेरे अभियान" },

  // Alerts
  "ngo.alerts": { en: "Alerts", hi: "अलर्ट" },
  "ngo.emergencySpike": { en: "Emergency Spike", hi: "आपातकालीन वृद्धि" },
  "ngo.volunteerShortage": { en: "Volunteer Shortage", hi: "स्वयंसेवक की कमी" },
  "ngo.delayedTask": { en: "Delayed Task", hi: "विलंबित कार्य" },
  "ngo.lowTrustWarning": { en: "Low Trust Warning", hi: "कम विश्वास चेतावनी" },

  // Status
  "status.created": { en: "Request created", hi: "अनुरोध बनाया गया" },
  "status.matching": { en: "Finding help…", hi: "मदद खोज रहे हैं…" },
  "status.assigned": { en: "Volunteer assigned", hi: "स्वयंसेवक नियुक्त" },
  "status.inProgress": { en: "Help on the way", hi: "मदद रास्ते में" },
  "status.completed": { en: "Resolved ✓", hi: "हल किया ✓" },
  "status.cancelled": { en: "Cancelled", hi: "रद्द" },
};

let currentLanguage: Language = "en";

export function setLanguage(lang: Language) {
  currentLanguage = lang;
  localStorage.setItem("resqlink_lang", lang);
}

export function getLanguage(): Language {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("resqlink_lang") as Language;
    if (stored === "en" || stored === "hi") {
      currentLanguage = stored;
      return stored;
    }
  }
  return currentLanguage;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const lang = getLanguage();
  const entry = translations[key];
  let text = entry?.[lang] ?? entry?.en ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export default t;
