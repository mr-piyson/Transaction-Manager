/**
 * Cities, towns and villages in Bahrain.
 *
 * Kept in code (not a database table) so the list ships with the app and can
 * be reviewed in version control. `en` is the canonical value stored on
 * records; `ar` is used for display and search.
 */
export interface BahrainCity {
  en: string;
  ar: string;
}

export const BAHRAIN_CITIES: readonly BahrainCity[] = [
  { en: "Manama", ar: "المنامة" },
  { en: "Muharraq", ar: "المحرق" },
  { en: "Arad", ar: "عراد" },
  { en: "Busaiteen", ar: "البسيتين" },
  { en: "Galali", ar: "قلالي" },
  { en: "Hidd", ar: "الحد" },
  { en: "Samaheej", ar: "سماهيج" },
  { en: "Amwaj Islands", ar: "جزر أمواج" },
  { en: "Diyar Al Muharraq", ar: "ديار المحرق" },
  { en: "Riffa", ar: "الرفاع" },
  { en: "East Riffa", ar: "الرفاع الشرقي" },
  { en: "West Riffa", ar: "الرفاع الغربي" },
  { en: "Hamad Town", ar: "مدينة حمد" },
  { en: "Isa Town", ar: "مدينة عيسى" },
  { en: "Zayed Town", ar: "مدينة زايد" },
  { en: "A'ali", ar: "عالي" },
  { en: "Sitra", ar: "سترة" },
  { en: "Budaiya", ar: "البديع" },
  { en: "Jidhafs", ar: "جدحفص" },
  { en: "Sanabis", ar: "السنابس" },
  { en: "Seef", ar: "السيف" },
  { en: "Juffair", ar: "الجفير" },
  { en: "Adliya", ar: "العدلية" },
  { en: "Hoora", ar: "الحورة" },
  { en: "Salmaniya", ar: "السلمانية" },
  { en: "Umm Al Hassam", ar: "أم الحصم" },
  { en: "Gudaibiya", ar: "القضيبية" },
  { en: "Zinj", ar: "الزنج" },
  { en: "Bilad Al Qadeem", ar: "بلاد القديم" },
  { en: "Tubli", ar: "توبلي" },
  { en: "Salmabad", ar: "سلماباد" },
  { en: "Nuwaidrat", ar: "النويدرات" },
  { en: "Ma'ameer", ar: "المعامير" },
  { en: "Diraz", ar: "الدراز" },
  { en: "Bani Jamra", ar: "بني جمرة" },
  { en: "Saar", ar: "سار" },
  { en: "Shahrakan", ar: "شهركان" },
  { en: "Karranah", ar: "كرانة" },
  { en: "Abu Saiba", ar: "أبو صيبع" },
  { en: "Jannusan", ar: "جنوسان" },
  { en: "Barbar", ar: "بربار" },
  { en: "Dumistan", ar: "دمستان" },
  { en: "Sadad", ar: "سداد" },
  { en: "Askar", ar: "عسكر" },
  { en: "Jaww", ar: "جو" },
  { en: "Zallaq", ar: "الزلاق" },
  { en: "Awali", ar: "العوالي" },
  { en: "Sakhir", ar: "الصخير" },
  { en: "Hamala", ar: "الهملة" },
  { en: "Durrat Al Bahrain", ar: "درة البحرين" },
  { en: "Al Daih", ar: "الديه" },
  { en: "Al Dair", ar: "الدير" },
  { en: "Al Maqsha", ar: "المقشة" },
  { en: "Al Markh", ar: "المرخ" },
  { en: "Al Musalla", ar: "المصلى" },
  { en: "Al Qadam", ar: "القدم" },
  { en: "Al Qurayyah", ar: "القرية" },
  { en: "Al Lawzi", ar: "اللوزي" },
  { en: "Al Sehla", ar: "السهلة" },
  { en: "Al Sayah", ar: "الساية" },
  { en: "Al Shakhura", ar: "الشاخورة" },
  { en: "Abu Baham", ar: "أبو بهام" },
  { en: "Adhari", ar: "عذاري" },
  { en: "Buri", ar: "بوري" },
  { en: "Jid Ali", ar: "جد علي" },
  { en: "Jasra", ar: "الجسرة" },
  { en: "Karbabad", ar: "كرباباد" },
  { en: "Malkiya", ar: "المالكية" },
  { en: "Naim", ar: "النعيم" },
  { en: "Sanad", ar: "سند" },
  { en: "Bu Quwah", ar: "بوقوة" },
  { en: "Dar Kulayb", ar: "دار كليب" },
  { en: "Al Ghuraifa", ar: "الغريفة" },
  { en: "Al Hajar", ar: "الحجر" },
  { en: "Al Mahooz", ar: "الماحوز" },
  { en: "Muqaba", ar: "المقابة" },
  { en: "Al Qala'a", ar: "القلعة" },
  { en: "Al Fadhel", ar: "الفاضل" },
  { en: "Khamis", ar: "خميس" },
  { en: "Hawar Islands", ar: "جزر حوار" },

  { en: "Janabiya", ar: "الجنبية" },
  { en: "Karzakan", ar: "كرزكان" },
  { en: "Jurdab", ar: "جرداب" },
  { en: "Al Aker", ar: "العكر" },
  { en: "Bu Ashira", ar: "بو عشيرة" },
  { en: "Al Salihiya", ar: "الصالحية" },
  { en: "Jabalat Habshi", ar: "جبلة حبشي" },
  { en: "North Sehla", ar: "السهلة الشمالية" },
  { en: "Al Safiria", ar: "الصفيرية" },
  { en: "Jid Al-Haj", ar: "جد الحاج" },
  { en: "Hillat Abdul Saleh", ar: "حلة عبد الصالح" },
  { en: "Al Jubaylat", ar: "الجبيليات" },
  { en: "Al Hujayr", ar: "الحجيرة" },

  // Smaller villages and localities
  { en: "Abu Mahir", ar: "أبو ماهر" },
  { en: "Halat Abu Mahir", ar: "حالة أبو ماهر" },
  { en: "Halat Al Naim", ar: "حالة النعيم" },
  { en: "Halat As Suluta", ar: "حالة السلطة" },
  { en: "Al Badi'ah", ar: "البدعة" },
  { en: "Umm Ash Sha'um", ar: "أم الشعوم" },
  { en: "Tashan", ar: "طشان" },
  { en: "Al Dur", ar: "الدور" },

  // Islands and newer urban developments
  { en: "Northern City", ar: "المدينة الشمالية" },
  { en: "Jidda Island", ar: "جزيرة جدة" },
  { en: "Nurana Islands", ar: "جزر نورانا" },
  { en: "Umm Al Naasan Island", ar: "جزيرة أم النعسان" },
  { en: "Umm As Sabaan", ar: "أم الصبان" },
  { en: "Hawrat Aali", ar: "هورة عالي" },

  // Ports and industrial areas
  { en: "Mina Salman", ar: "ميناء سلمان" },
  { en: "Mina Manama", ar: "ميناء المنامة" },
  { en: "Mina Salman Industrial Area", ar: "منطقة ميناء سلمان الصناعية" },
  { en: "Salman Industrial City", ar: "مدينة سلمان الصناعية" },
  { en: "Sitra Industrial Park", ar: "منطقة سترة الصناعية" },
  { en: "Ma'ameer Industrial Park", ar: "منطقة المعامير الصناعية" },
  { en: "Al Mazara'a Industrial Park", ar: "منطقة المزرعة الصناعية" },
  { en: "Hafeera Industrial Area", ar: "منطقة حفيرة الصناعية" },
  { en: "Al-Lhaasay Industrial Park", ar: "منطقة اللحساي الصناعية" },
  { en: "Industrial Area", ar: "المنطقة الصناعية" },

  // Additional Sitra villages and localities
  { en: "Al Aker Al Sharqi", ar: "العكر الشرقي" },
  { en: "Al Aker Al Gharbi", ar: "العكر الغربي" },
  { en: "Al Hamriya", ar: "الحمريّة" },
  { en: "Al Kharijiya", ar: "الخارجية" },
  { en: "Mahazza", ar: "مهزة" },
  { en: "Sufala", ar: "سفالة" },
  { en: "Wadyan", ar: "الواديان" },
  { en: "Marquban", ar: "مركوبان" },
  { en: "Abu Al Aish", ar: "أبو العيش" },
  { en: "Halat Umm Al Baidh", ar: "حالة أم البيض" },
  { en: "East Sitra", ar: "شرق سترة" },
  { en: "Sharq Sitra City", ar: "مدينة شرق سترة" },
  { en: "Nabih Saleh", ar: "النبيه صالح" },
  { en: "Juzur Al Dar", ar: "جزر الدار" },

  // Manama neighborhoods and districts
  { en: "Diplomatic Area", ar: "المنطقة الدبلوماسية" },
  { en: "Al Fateh", ar: "الفاتح" },
  { en: "Al Guful", ar: "القفول" },
  { en: "Al Suqaiya", ar: "السقّاية" },
  { en: "Bu Ghazal", ar: "بو غزال" },
  { en: "Al Suwayfiyah", ar: "السويفية" },
  { en: "Manama Center", ar: "وسط المنامة" },
  { en: "Manama Seafront", ar: "واجهة المنامة البحرية" },
  { en: "Corniche", ar: "الكورنيش" },
  { en: "Sea Front", ar: "الواجهة البحرية" },
  { en: "Al Burhama", ar: "البرهامة" },

  // Additional northern villages and localities
  { en: "Jid Al Haj", ar: "جد الحاج" },
  { en: "South Sehla", ar: "السهلة الجنوبية" },
  { en: "Jabalat Al Burhama", ar: "جبلة البرهامة" },
  { en: "Jiddah Maqabah", ar: "جدة المقابة" },
  { en: "Nurana", ar: "نورانا" },
  { en: "Mohammadiyah", ar: "المحمدية" },
  { en: "Al Nasfa", ar: "الناصفة" },
  { en: "Al Ramli", ar: "الرملي" },
  { en: "Al Safriyah", ar: "الصافرية" },

  // Additional Riffa localities
  { en: "Riffa Al Shamali", ar: "الرفاع الشمالي" },
  { en: "Riffa Al Sharqi", ar: "الرفاع الشرقي" },
  { en: "Riffa Al Gharbi", ar: "الرفاع الغربي" },
  { en: "Riffa Al Rawdha", ar: "الرفاع الروضة" },
  { en: "Riffa Wadi Al Sail", ar: "الرفاع وادي السيل" },
  { en: "Riffa Al Hunayniyah", ar: "الرفاع الحنينية" },
  { en: "Riffa Al Buhair", ar: "الرفاع البحير" },
  { en: "Riffa Al Bukowarah", ar: "الرفاع بوكوارة" },
  { en: "Riffa Al Hajiyat", ar: "الرفاع الحجيات" },
  { en: "Riffa Al Swayfra", ar: "الرفاع الصويفرة" },
  { en: "Riffa Al Ghari", ar: "الرفاع الغاري" },
  { en: "Riffa Al Moaskar", ar: "الرفاع المعسكر" },

  // Southern areas and geographic localities
  { en: "Hawrat Sanad", ar: "حورة سند" },
  { en: "Hawrat Inqah", ar: "حورة إنقة" },
  { en: "Hidd Al Jamal", ar: "حد الجمال" },
  { en: "Ras Hayyan", ar: "رأس حيان" },
  { en: "Ras Zuwayed", ar: "رأس زويد" },
  { en: "Ras Abu Jarjur", ar: "رأس أبو جرجور" },
  { en: "Al Mazrowiah", ar: "المزروعية" },
  { en: "Al Qurayn", ar: "القرين" },
  { en: "Al Rumamin", ar: "الرمانين" },
  { en: "Al Rumaythah", ar: "الرميثة" },
  { en: "Al Shabak", ar: "الشبك" },
  { en: "Umm Jidr", ar: "أم جدر" },
  { en: "Wadi Ali", ar: "وادي علي" },
  { en: "Al Ghaynah", ar: "الغينة" },
  { en: "Al Mamtalah", ar: "الممطلة" },
  { en: "Hafirah", ar: "حفيرة" },
  { en: "Jazaer Beach", ar: "شاطئ الجزائر" },
  { en: "Wadi Al Sail", ar: "وادي السيل" },

  // New cities and housing developments
  { en: "Madinat Salman", ar: "مدينة سلمان" },
  { en: "East Hidd", ar: "الحد الشرقية" },
  { en: "Raya District", ar: "حي راية" },
  { en: "East Hidd Housing Project", ar: "مشروع شرق الحد الإسكاني" },
  { en: "Madinat Khalifa", ar: "مدينة خليفة" },
  { en: "Al Hala", ar: "الحالة" },
];

/** Normalizes English and Arabic text so either language can match a query. */
export function normalizeCitySearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // Latin diacritics
    .replace(/['’`-]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u0652\u0670]/g, "") // Arabic diacritics
    .replace(/\s+/g, " ");
}

/** Matches a city against an English or Arabic search query. */
export function matchesBahrainCity(city: BahrainCity, query: string): boolean {
  const q = normalizeCitySearch(query);
  if (!q) return true;
  return (
    normalizeCitySearch(city.en).includes(q) ||
    normalizeCitySearch(city.ar).includes(q)
  );
}

/** Returns `value` as a city record, when it is one of the known cities. */
export function findBahrainCity(
  value?: string | null,
): BahrainCity | undefined {
  if (!value) return undefined;
  return BAHRAIN_CITIES.find((city) => city.en === value || city.ar === value);
}

/**
 * Resolves free-typed text (English or Arabic, accents/case-insensitive) to a
 * known city. Used to canonicalise manual input before it is saved.
 */
export function findBahrainCityByQuery(
  query?: string | null,
): BahrainCity | undefined {
  const q = normalizeCitySearch(query ?? "");
  if (!q) return undefined;
  return BAHRAIN_CITIES.find(
    (city) =>
      normalizeCitySearch(city.en) === q || normalizeCitySearch(city.ar) === q,
  );
}
