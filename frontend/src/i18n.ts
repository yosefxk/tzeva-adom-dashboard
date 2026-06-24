export type Language = 'en' | 'he' | 'ar';

export const TRANSLATIONS: Record<string, Record<Language, string>> = {
  // Header
  appTitle: { en: 'Red Alerts', he: 'התרעות צבע אדום', ar: 'إنذارات اللون الأحمر' },
  appLive: { en: 'LIVE', he: 'לייב', ar: 'مباشر' },
  appSubtitle: { en: 'Hosted on BaileyTV', he: 'באירוח BaileyTV', ar: 'مستضاف على BaileyTV' },
  tabRadar: { en: 'Radar Map', he: 'מפת מכ"ם', ar: 'خريطة الرادار' },
  tabLogs: { en: 'Alert Logs', he: 'יומן התרעות', ar: 'سجل الإنذارات' },
  tabStats: { en: 'Data Analytics', he: 'ניתוח נתונים', ar: 'تحليل البيانات' },
  notificationsEnabled: { en: 'Notifications Enabled', he: 'התראות דפדפן פעילות', ar: 'تم تفعيل الإشعارات' },
  enableNotifications: { en: 'Enable Notifications', he: 'אפשר התראות דפדפן', ar: 'تفعيل الإشعارات' },
  themeLight: { en: 'Light Mode', he: 'מצב בהיר', ar: 'الوضع الفاتح' },
  themeDark: { en: 'Dark Mode', he: 'מצב כהה', ar: 'الوضع الداكن' },

  // Status Card / Diagnostics
  diagnosticsTitle: { en: 'System Diagnostics', he: 'אבחון מערכת', ar: 'تشخيص النظام' },
  btnCheck: { en: 'Check', he: 'בדיקה', ar: 'فحص' },
  sseStream: { en: 'SSE Data Stream', he: 'זרם נתונים SSE', ar: 'تدفق بيانات SSE' },
  apiHandshake: { en: 'API Handshake', he: 'חיבור API', ar: 'اتصال API' },
  networkLatency: { en: 'Network Latency', he: 'זמן תגובה', ar: 'زمن استجابة الشبكة' },
  broadcasterSubs: { en: 'Active Connections', he: 'חיבורים פעילים', ar: 'الاتصالات النشطة' },
  statusLive: { en: 'LIVE', he: 'פעיל', ar: 'نشط' },
  statusDisconnected: { en: 'DISCONNECTED', he: 'מנותק', ar: 'غير متصل' },
  statusSecure: { en: 'SECURE', he: 'מאובטח', ar: 'آمن' },
  statusOffline: { en: 'OFFLINE', he: 'לא מחובר', ar: 'غير متصل' },
  tooltipSSE: { en: 'Real-time Server-Sent Events stream from the backend alert poller', he: 'זרם אירועים בזמן אמת מהשרת המרכזי', ar: 'تدفق أحداث في الوقت الحقيقي من الخادم' },
  tooltipAPI: { en: 'REST API health check — verifies the backend is reachable and responding', he: 'בדיקת תקינות API — מוודא שהשרת מגיב ונגיש', ar: 'فحص صحة API — يتحقق من أن الخادم يستجيب' },
  tooltipLatency: { en: 'Round-trip time from your browser to the backend server', he: 'זמן הלוך ושוב מהדפדפן לשרת', ar: 'وقت الذهاب والعودة من المتصفح إلى الخادم' },
  tooltipConnections: { en: 'Number of active SSE clients currently subscribed to live alerts', he: 'מספר הלקוחות המחוברים כרגע לזרם ההתרעות', ar: 'عدد العملاء المتصلين حالياً ببث التنبيهات' },
  statsSinceDate: { en: 'since June 2019', he: 'מאז יוני 2019', ar: 'منذ يونيو ٢٠١٩' },
  statsWeeklyTitle: { en: 'Alert Frequency by Day of Week', he: 'תדירות התרעות לפי ימי השבוע', ar: 'تكرار الإنذارات حسب أيام الأسبوع' },
  statsYearlyTitle: { en: 'Alert Timeline Trend by Year', he: 'מגמת התרעות שנתית היסטורית', ar: 'اتجاه الإنذارات السنوي التاريخي' },
  filterSearchCity: { en: 'Search City/Location', he: 'חיפוש עיר/מיקום', ar: 'البحث عن مدينة/موقع' },
  daySun: { en: 'Sun', he: 'א\'', ar: 'الأحد' },
  dayMon: { en: 'Mon', he: 'ב\'', ar: 'الاثنين' },
  dayTue: { en: 'Tue', he: 'ג\'', ar: 'الثلاثاء' },
  dayWed: { en: 'Wed', he: 'ד\'', ar: 'الأربعاء' },
  dayThu: { en: 'Thu', he: 'ה\'', ar: 'الخميس' },
  dayFri: { en: 'Fri', he: 'ו\'', ar: 'الجمعة' },
  daySat: { en: 'Sat', he: 'ש\'', ar: 'السبت' },
  emergencyHotlines: { en: 'Emergency Hotlines', he: 'מספרי חירום', ar: 'خطوط الطوارئ' },
  mada: { en: 'MADA (Ambulance)', he: 'מד"א', ar: 'نجمة داوود الحمراء' },
  police: { en: 'Police', he: 'משטרה', ar: 'الشرطة' },
  hfc: { en: 'Home Front Command', he: 'פיקוד העורף', ar: 'قيادة الجبهة الداخلية' },

  // Live Alerts Feed
  liveFeedTitle: { en: 'Live Alerts Feed', he: 'עדכון התרעות חירום', ar: 'بث الإنذارات المباشر' },
  sirenOn: { en: 'Siren ON', he: 'סירנה פעילה', ar: 'الصوت نشط' },
  muted: { en: 'Muted', he: 'מושתק', ar: 'مكتوم' },
  testSiren: { en: 'Test Siren', he: 'בדיקת צופר', ar: 'تجربة الإنذار' },
  playingTest: { en: 'Playing Test...', he: 'מנגן בדיקה...', ar: 'جاري التجربة...' },
  noActiveAlarms: { en: 'No active alarms sounding', he: 'אין אזעקות פעילות כרגע', ar: 'لا توجد إنذارات نشطة حالياً' },
  awaitingEvents: { en: 'Awaiting live events...', he: 'ממתין לאירועים בזמן אמת...', ar: 'بانتظار الأحداث المباشرة...' },
  immediateThreat: { en: 'IMMEDIATE THREAT', he: 'איום מיידי', ar: 'تهديد فوري' },
  testDrill: { en: 'TEST DRILL', he: 'תרגיל מערכת', ar: 'تدريب للنظام' },
  shelterTime: { en: 'Shelter time', he: 'זמן כניסה למקלט', ar: 'وقت الملجأ' },
  activeSirensDetected: { en: 'ACTIVE SIRENS DETECTED', he: 'אזעקות פעילות כרגע', ar: 'تم רصد إنذارات نشطة' },
  alarmsCurrentlyActive: { en: 'Alarms are currently active in', he: 'אזעקות פעילות כעת ב', ar: 'الإنذارات نشطة حالياً في' },

  // History Tab
  historyTitle: { en: 'Historical Archive', he: 'ארכיון התרעות', ar: 'الأرشيف التاريخي' },
  historySubtitle: { en: 'Search and filter through {count} total stored alerts', he: 'חיפוש וסינון מתוך {count} התרעות שמורות', ar: 'البحث والتصفية في {count} إنذاراً محفوظاً' },
  btnRefresh: { en: 'Refresh', he: 'רענון', ar: 'تحديث' },
  btnExportCSV: { en: 'Export CSV', he: 'ייצוא ל-CSV', ar: 'تصدير CSV' },
  filterSearch: { en: 'Search Location / Type', he: 'חיפוש מיקום / סוג התרעה', ar: 'חיפוש מיקום / סוג התרעה' },
  filterCategory: { en: 'Threat Category', he: 'קטגוריית איום', ar: 'فئة التهديد' },
  filterClass: { en: 'Event Class', he: 'סוג אירוע', ar: 'فئة الحدث' },
  filterStartDate: { en: 'Start Date', he: 'תאריך התחלה', ar: 'تاريخ البدء' },
  filterEndDate: { en: 'End Date', he: 'תאריך סיום', ar: 'تاريخ الانتهاء' },
  btnClear: { en: 'Clear Filters', he: 'ניקוי מסננים', ar: 'مسح التصفية' },
  colDateTime: { en: 'Date/Time', he: 'תאריך ושעה', ar: 'التاريخ/الوقت' },
  colThreat: { en: 'Threat Type', he: 'סוג איום', ar: 'نوع التهديد' },
  colLocationHe: { en: 'Location (Hebrew)', he: 'מיקום (עברית)', ar: 'الموقع (بالعبرية)' },
  colLocation: { en: 'Affected Location', he: 'יישוב מושפע', ar: 'الموقع المتأثر' },
  colZone: { en: 'Zone', he: 'אזור הנחיות', ar: 'المنطقة' },
  colCountdown: { en: 'Countdown', he: 'זמן התגוננות', ar: 'وقت الاستجابة' },
  colClass: { en: 'Class', he: 'סיווג', ar: 'الفئة' },
  allThreats: { en: 'All Threats', he: 'כל האיומים', ar: 'جميع التهديدات' },
  allAlertClasses: { en: 'All Alerts', he: 'כל ההתרעות', ar: 'جميع التنبيهات' },
  realAlarmsOnly: { en: 'Real Alarms Only', he: 'אזעקות אמת בלבד', ar: 'الإنذارات الحقيقية فقط' },
  drillsOnly: { en: 'Drills Only', he: 'תרגילים בלבד', ar: 'التدريبات فقط' },
  classDrill: { en: 'Drill', he: 'תרגיל', ar: 'تدريب' },
  classActive: { en: 'Active', he: 'אמת', ar: 'حقيقي' },
  placeholderSearch: { en: 'e.g. Tel Aviv, Sderot...', he: 'לדוגמה: תל אביב, שדרות...', ar: 'مثال: تل أبيب، سديروت...' },
  loadingLogs: { en: 'Loading history logs...', he: 'טוען יומן התרעות...', ar: 'جاري تحميل سجل التنبيهات...' },
  noAlertsMatched: { en: 'No alerts matched the selected query filters.', he: 'לא נמצאו התרעות המתאימות למסננים שנבחרו.', ar: 'لا توجد إنذارات تطابق عوامل التصفية المحددة.' },
  showingPage: { en: 'Showing page {page} of {total} ({items} alerts total)', he: 'מציג עמוד {page} מתוך {total} ({items} התרעות סך הכל)', ar: 'عرض الصفحة {page} من {total} (إجمالي {items} إنذاراً)' },
  btnPrev: { en: 'Previous', he: 'הקודם', ar: 'السابق' },
  btnNext: { en: 'Next', he: 'הבא', ar: 'التالي' },

  // Stats Tab
  statsTotalStored: { en: 'Total Alerts Stored', he: 'סה"כ התרעות במאגר', ar: 'إجمالي الإنذارات المخزنة' },
  statsPeakHour: { en: 'Peak Active Hour', he: 'שעת שיא פעילות', ar: 'ساعة ذروة النشاط' },
  statsTopDistrict: { en: 'Top Target District', he: 'אזור מטווח ביותר', ar: 'المنطقة الأكثر استهدافاً' },
  statsHourlyTitle: { en: 'Alert Frequency by Hour of Day', he: 'תדירות התרעות לפי שעות היממה', ar: 'تكرار الإنذارات حسب ساعات اليوم' },
  statsCategoryTitle: { en: 'Threat Category Breakdown', he: 'פילוח התרעות לפי סוג איום', ar: 'تقسيم فئات التهديد' },
  statsTopTargetsTitle: { en: 'Most Targeted Cities & Guideline Zones', he: 'ערים ואזורי הנחיות מטווחים ביותר', ar: 'المدن والمناطق الأكثر استهدافاً' },
  statsTopCities: { en: 'Top 5 Targeted Cities', he: '5 ערים מטווחות ביותר', ar: 'أعلى 5 مدن استهدافاً' },
  statsTopZones: { en: 'Top 5 Targeted Zones', he: '5 אזורי הנחיות מטווחים ביותר', ar: 'أعلى 5 مناطق استهدافاً' },
  alertsUnit: { en: 'alerts', he: 'התרעות', ar: 'إنذاراً' },
  timesUnit: { en: 'times', he: 'פעמים', ar: 'مرة' },
  loadingStats: { en: 'Loading statistical dashboard models...', he: 'טוען נתונים סטטיסטיים...', ar: 'جاري تحميل لوحة الإحصائيات...' },
  noCategoryData: { en: 'No category data available.', he: 'אין נתונים זמינים עבור סוגי איומים.', ar: 'لا توجد بيانات متاحة لفئات التهديد.' },
  noCitiesLogged: { en: 'No cities logged yet.', he: 'טרם נרשמו ערים במאגר.', ar: 'لم يتم تسجيل أي مدن بعد.' },
  noZonesLogged: { en: 'No zones logged yet.', he: 'טרם נרשמו אזורים במאגר.', ar: 'لم يتم تسجيل أي مناطق بعد.' },

  // Legend
  legendTitle: { en: 'Legend', he: 'מקרא', ar: 'دليل الخريطة' },
  legendRocket: { en: 'Rocket / Missile Alarm', he: 'אזעקת ירי רקטות וטילים', ar: 'إنذار إطلاق صواريخ' },
  legendDrone: { en: 'UAV / Aircraft Intrusion', he: 'חדירת כלי טיס עוין', ar: 'تسلل طائرة معادية' },
  activeDangerZone: { en: 'Active Danger Zone', he: 'אזור סכנה פעיל', ar: 'منطقة خطر نشطة' },
  
  // Custom alert settings & Heatmap
  tabHeatmap: { en: 'Threat Heatmap', he: 'מפת חום', ar: 'خريطة حرارية' },
  soundMode: { en: 'Alert Sound Mode', he: 'מצב צליל התרעה', ar: 'وضع صوت الإنذار' },
  soundNone: { en: 'No Alerts (Muted)', he: 'ללא צליל (מושתק)', ar: 'بدون صوت (مكتوم)' },
  soundAll: { en: 'All Alerts', he: 'כל ההתרעות', ar: 'جميع الإنذارات' },
  soundCustom: { en: 'Zones of Interest', he: 'אזורי עניין', ar: 'المناطق המحددة' },
  volume: { en: 'Volume', he: 'עוצמת שמע', ar: 'مستوى الصوت' },
  enableTts: { en: 'Voice Announcer (TTS)', he: 'הקראת שמות יישובים (TTS)', ar: 'قارئ الأسماء صوتياً (TTS)' },
  searchPlaceholder: { en: 'Search zones or cities...', he: 'חפש אזורים או יישובים...', ar: 'البحث عن مناطق أو مدن...' },
  heatmapTitle: { en: 'Historical Siren Heatmap', he: 'מפת חום של אזעקות', ar: 'الخريطة الحرارية للإنذارات' },
  heatmapSelectRange: { en: 'Select Timeframe', he: 'בחר טווח זמן', ar: 'اختر النطاق الزمني' },
  presetDay: { en: 'Last 24 Hours', he: '24 שעות אחרונות', ar: 'آخر ٢٤ ساعة' },
  presetWeek: { en: 'Last 7 Days', he: 'שבוע אחרון', ar: 'آخر ٧ أيام' },
  presetMonth: { en: 'Last 30 Days', he: '30 ימים אחרונים', ar: 'آخر ٣٠ يوم' },
  presetYear: { en: 'Last Year', he: 'שנה אחרונה', ar: 'آخر عام' },
  presetCustom: { en: 'Custom Range', he: 'טווח מותאם אישית', ar: 'نطاق مخصص' },
  sirenCount: { en: 'Sirens', he: 'אזעקות', ar: 'إنذاراً' },
  tabFeed: { en: 'Alerts Feed', he: 'יומן לייב', ar: 'الأحداث המباشرة' },
  settingsTitle: { en: 'Warning Settings', he: 'הגדרות התרעות', ar: 'إعدادات التنبيهات' },
  soundTypeLabel: { en: 'Alert Audio Style', he: 'סגנון צליל התרעה', ar: 'نمط صوت الإنذار' },
  soundTypeSiren: { en: 'Air Raid Siren', he: 'סירנה עולה ויורדת', ar: 'صفارة الإنذار' },
  soundTypeBeep: { en: 'Pulsating Beeps', he: 'צפצוף חירום', ar: 'رنين متقطع' },
  soundTypeMute: { en: 'Visual Popup Only', he: 'התראה חזותית בלבד', ar: 'تنبيه بصري فقط' }
};

export const THREAT_TRANSLATIONS: Record<number, { title: Record<Language, string>; desc: Record<Language, string> }> = {
  1: {
    title: { en: 'Rocket / Missile Barrage', he: 'ירי רקטות וטילים', ar: 'إطلاق صواريخ وقذائف' },
    desc: { en: 'Enter the protected space and stay there for 10 minutes', he: 'היכנסו למרחב המוגן ושהו בו 10 דקות', ar: 'ادخل إلى المساحة المحمية وابق فيها لمدة 10 دقائق' }
  },
  2: {
    title: { en: 'Hostile Aircraft Intrusion', he: 'חדירת כלי טיס עוין', ar: 'تسلل طائرة معادية' },
    desc: { en: 'Enter the protected space and stay there for 10 minutes', he: 'היכנסו למרחב המוגן ושהו בו 10 דקות', ar: 'ادخل إلى المساحة المحمية وابق فيها لمدة 10 دقائق' }
  },
  3: {
    title: { en: 'Earthquake Warning', he: 'רעידת אדמה', ar: 'تحذير من زلزال' },
    desc: { en: 'Go out to an open area immediately', he: 'צאו לשטח פתוח באופן מיידי', ar: 'اخرج إلى منطقة مفتوحة على الفور' }
  },
  4: {
    title: { en: 'Tsunami Threat', he: 'צונאמי', ar: 'خطر تسونامي' },
    desc: { en: 'Stay away from the beach at least 1 km', he: 'התרחקו מחוף הים לפחות קילומטר אחד', ar: 'ابتعد عن الشاطئ مسافة 1 كم على الأقل' }
  },
  5: {
    title: { en: 'Radiological Event', he: 'אירוע רדיולוגי', ar: 'حدث إشعاعي' },
    desc: { en: 'Enter a closed building, close windows and turn off AC', he: 'היכנסו למבנה סגור, סגרו חלונות וכבו מזגנים', ar: 'ادخل إلى مبنى مغلق وأغلق النوافذ وأوقف المكيفات' }
  },
  6: {
    title: { en: 'Hazardous Materials', he: 'חומרים מסוכנים', ar: 'حادث مواد خطرة' },
    desc: { en: 'Enter a closed building, close windows and turn off AC', he: 'היכנסו למבנה סגור, סגרו חלונות וכבו מזגנים', ar: 'ادخل إلى مبنى مغلق وأغلق النوافذ وأوقف المكيفات' }
  },
  7: {
    title: { en: 'Terrorist Infiltration', he: 'חדירת מחבלים', ar: 'تسلل مسلحين' },
    desc: { en: 'Enter a building, lock doors and shut windows', he: 'היכנסו למבנה, נעלו דלתות וסגרו חלונות', ar: 'ادخل إلى المبنى وأغلق الأبواب والنوافذ' }
  },
  8: {
    title: { en: 'General Emergency Alert', he: 'התרעה כללית', ar: 'إنذار طوارئ عام' },
    desc: { en: 'Follow instructions of the Home Front Command', he: 'פעלו לפי הנחיות פיקוד העורף', ar: 'اتبع تعليمات قيادة الجبهة الداخلية' }
  },
  13: {
    title: { en: 'Event Concluded', he: 'האירוע הסתיים', ar: 'انتهاء الحدث' },
    desc: { en: 'You may now exit the protected space', he: 'ניתן לצאת מהמרחב המוגן', ar: 'يمكنك الآن الخروج من المساحة المحمية' }
  },
  14: {
    title: { en: 'Pre-Alert Warning', he: 'התרעה מוקדמת', ar: 'إنذار مبكر' },
    desc: { en: 'Alarms are expected in your area in the coming minutes', he: 'בדקות הקרובות צפויות להתקבל התרעות באזורך', ar: 'من المتوقع تلقي إنذارات في منطقتك خلال الدقائق القادمة' }
  },
  // Drills
  101: {
    title: { en: 'Rocket / Missile Drill', he: 'ירי רקטות וטילים (תרגיל)', ar: 'إطلاق صוاريخ (تدريب)' },
    desc: { en: 'System Drill - Enter the protected space', he: 'תרגיל מערכת - היכנסו למרחב המוגן', ar: 'تدريب للنظام - ادخل إلى المساحة المحمية' }
  },
  102: {
    title: { en: 'Hostile Aircraft Drill', he: 'חדירת כלי טיס עוין (תרגיל)', ar: 'تسلل طائرة معادية (تدريب)' },
    desc: { en: 'System Drill - Enter the protected space', he: 'תרגיל מערכת - היכנסו למרחב המוגן', ar: 'تدريب للنظام - ادخل إلى المساحة المحمية' }
  },
  103: {
    title: { en: 'Earthquake Drill', he: 'רעידת אדמה (תרגיל)', ar: 'زلزال (تدريب)' },
    desc: { en: 'System Drill - Go out to open area', he: 'תרגיל מערכת - צאו לשטח פתוח', ar: 'تدريب للنظام - اخرج إلى منطقة مفتوحة' }
  },
  104: {
    title: { en: 'Tsunami Drill', he: 'צונאמי (תרגיל)', ar: 'تسونامي (تدريب)' },
    desc: { en: 'System Drill - Stay away from beach', he: 'תרגיל מערכת - התרחקו מהחוף', ar: 'تدريب للنظام - ابتعد عن الشاطئ' }
  },
  105: {
    title: { en: 'Radiological Drill', he: 'אירוע רדיולוגי (תרגיל)', ar: 'حدث إشعاعي (تدريب)' },
    desc: { en: 'System Drill - Close windows and turn off AC', he: 'תרגיל מערכת - סגרו חלונות וכבו מזגנים', ar: 'تدريب للنظام - أغلق النوافذ وأوقف المكيفات' }
  },
  106: {
    title: { en: 'Hazardous Materials Drill', he: 'חומרים מסוכנים (תרגיל)', ar: 'مواد خطرة (تدريب)' },
    desc: { en: 'System Drill - Close windows and turn off AC', he: 'תרגיל מערכת - סגרו חלונות וכבו מזגנים', ar: 'تدريب للنظام - أغلق النوافذ وأوقف المكيفات' }
  },
  107: {
    title: { en: 'Terrorist Infiltration Drill', he: 'חדירת מחבלים (תרגיל)', ar: 'تسلل مسلحين (تدريب)' },
    desc: { en: 'System Drill - Lock doors and close windows', he: 'תרגיל מערכת - נעלו דלתות וסגרו חלונות', ar: 'تدريب للنظام - أغلق الأبواب والنوافذ' }
  }
};

// Arabic Zone Translation Map
export const ZONE_ARABIC: Record<string, string> = {
  'Confrontation Line': 'خط المواجهة',
  'Upper Galilee': 'الجليل الأعلى',
  'Lower Galilee': 'الجليل الأسفل',
  'Central Galilee': 'الجليل المركزي',
  'Haifa': 'حيفا',
  'Sharon': 'شارون',
  'Dan': 'دان (تل أبيب وضواحيها)',
  'Judea': 'يهودا',
  'Samaria': 'السامرة',
  'Gaza Envelope': 'غلاف غزة',
  'Negev': 'النقب',
  'Arava': 'وادي عربة',
  'Beit Shean Valley': 'سهل بيسان',
  'Judean Lowlands': 'שפלת יהודה',
  'Menashe': 'منشة',
  'Wadi Ara': 'وادي عارة',
  'Hefer Valley': 'وادي حوارث',
  'Yarkon': 'اليركون',
  'Judean Desert': 'برية الخليل (يهودا)',
  'South Negev': 'جنوب النقب',
  'Dead Sea': 'البحر الميت',
  'Eilat': 'إيلات',
};

// Hebrew Zone Translation Map
export const ZONE_HEBREW: Record<string, string> = {
  'Confrontation Line': 'קו העימות',
  'Upper Galilee': 'גליל עליון',
  'Lower Galilee': 'גליל תחתון',
  'Central Galilee': 'גליל מרכזי',
  'Haifa': 'חיפה',
  'Sharon': 'השרון',
  'Dan': 'דן',
  'Judea': 'יהודה',
  'Samaria': 'שומרון',
  'Gaza Envelope': 'עוטף עזה',
  'Negev': 'נגב',
  'Arava': 'ערבה',
  'Beit Shean Valley': 'בקעת בית שאן',
  'Judean Lowlands': 'שפלת יהודה',
  'Menashe': 'מנשה',
  'Wadi Ara': 'ואדי ערה',
  'Hefer Valley': 'עמק חפר',
  'Yarkon': 'ירקון',
  'Judean Desert': 'מדבר יהודה',
  'South Negev': 'דרום הנגב',
  'Dead Sea': 'ים המלח',
  'Eilat': 'אילת',
};

// Main Translate functions
export function t(key: string, lang: Language): string {
  if (TRANSLATIONS[key]) {
    return TRANSLATIONS[key][lang];
  }
  return key;
}

export function translateThreat(category: number, lang: Language): { title: string; desc: string } {
  const mapping = THREAT_TRANSLATIONS[category] || THREAT_TRANSLATIONS[8];
  return {
    title: mapping.title[lang],
    desc: mapping.desc[lang]
  };
}

export function translateCity(cityRef: string, lang: Language, cities: any[]): string {
  if (!Array.isArray(cities) || cities.length === 0) return cityRef;
  
  const cleaned = cityRef.split(' - ')[0].trim();
  const match = cities.find(c => 
    c.name === cleaned || 
    c.value === cleaned || 
    cityRef.includes(c.name) ||
    c.name_en.toLowerCase() === cleaned.toLowerCase()
  );
  
  if (match) {
    if (lang === 'en') return match.name_en;
    if (lang === 'ar') return match.name_ar || match.name_en;
    return match.name;
  }
  
  return cityRef;
}

export function translateZone(zoneName: string, lang: Language): string {
  if (lang === 'he') {
    return ZONE_HEBREW[zoneName] || zoneName;
  }
  if (lang === 'ar') {
    return ZONE_ARABIC[zoneName] || zoneName;
  }
  return zoneName;
}
