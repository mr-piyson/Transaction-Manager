'use client';

// --- Schema & Data ---
export interface BahrainCity {
  id: string;
  en: string;
  ar: string;
  governorate: 'Capital' | 'Muharraq' | 'Northern' | 'Southern';
}

export const BAHRAIN_CITIES: BahrainCity[] = [
  // Capital Governorate
  { id: 'manama', en: 'Manama', ar: 'المنامة', governorate: 'Capital' },
  { id: 'juffair', en: 'Juffair', ar: 'الجفير', governorate: 'Capital' },
  { id: 'adliya', en: 'Adliya', ar: 'العدلية', governorate: 'Capital' },
  { id: 'hoora', en: 'Hoora', ar: 'الحورة', governorate: 'Capital' },
  { id: 'gudaibiya', en: 'Gudaibiya', ar: 'القضيبية', governorate: 'Capital' },
  { id: 'seef', en: 'Seef', ar: 'السيف', governorate: 'Capital' },
  { id: 'sanabis', en: 'Sanabis', ar: 'سنابس', governorate: 'Capital' },
  { id: 'tubli', en: 'Tubli', ar: 'توبلي', governorate: 'Capital' },
  { id: 'zinj', en: 'Zinj', ar: 'الزنج', governorate: 'Capital' },
  {
    id: 'ras-rumman',
    en: 'Ras Rumman',
    ar: 'راس الرمان',
    governorate: 'Capital',
  },
  {
    id: 'umm-al-hassam',
    en: 'Umm Al Hassam',
    ar: 'أم الحصم',
    governorate: 'Capital',
  },
  { id: 'salmaniya', en: 'Salmaniya', ar: 'السلمانية', governorate: 'Capital' },
  { id: 'sitra', en: 'Sitra', ar: 'سترة', governorate: 'Capital' },
  {
    id: 'nabih-saleh',
    en: 'Nabih Saleh',
    ar: 'النبيه صالح',
    governorate: 'Capital',
  },

  // Muharraq Governorate
  { id: 'muharraq', en: 'Muharraq', ar: 'المحرق', governorate: 'Muharraq' },
  { id: 'hidd', en: 'Al Hidd', ar: 'الحد', governorate: 'Muharraq' },
  { id: 'busaitin', en: 'Busaiteen', ar: 'البسيتين', governorate: 'Muharraq' },
  { id: 'arad', en: 'Arad', ar: 'عراد', governorate: 'Muharraq' },
  { id: 'galali', en: 'Galali', ar: 'قلالي', governorate: 'Muharraq' },
  { id: 'samaheej', en: 'Samaheej', ar: 'سماهيج', governorate: 'Muharraq' },
  {
    id: 'diyar-al-muharraq',
    en: 'Diyar Al Muharraq',
    ar: 'ديار المحرق',
    governorate: 'Muharraq',
  },
  {
    id: 'amwaj-islands',
    en: 'Amwaj Islands',
    ar: 'جزر أمواج',
    governorate: 'Muharraq',
  },

  // Northern Governorate
  {
    id: 'hamad-town',
    en: 'Hamad Town',
    ar: 'مدينة حمد',
    governorate: 'Northern',
  },
  { id: 'budaiya', en: 'Budaiya', ar: 'البديع', governorate: 'Northern' },
  { id: 'diraz', en: 'Diraz', ar: 'الدراز', governorate: 'Northern' },
  {
    id: 'bani-jamra',
    en: 'Bani Jamra',
    ar: 'بني جمرة',
    governorate: 'Northern',
  },
  { id: 'barbar', en: 'Barbar', ar: 'باربار', governorate: 'Northern' },
  { id: 'janabiya', en: 'Janabiya', ar: 'الجنبية', governorate: 'Northern' },
  { id: 'jannusan', en: 'Jannusan', ar: 'جنوسان', governorate: 'Northern' },
  { id: 'karzakan', en: 'Karzakan', ar: 'كرزكان', governorate: 'Northern' },
  {
    id: 'malikiya',
    en: 'Al Malikiyah',
    ar: 'المالكية',
    governorate: 'Northern',
  },
  { id: 'dumistan', en: 'Dumistan', ar: 'دمستان', governorate: 'Northern' },
  { id: 'sadad', en: 'Sadad', ar: 'صدد', governorate: 'Northern' },
  { id: 'jasra', en: 'Jasra', ar: 'الجسرة', governorate: 'Northern' },
  { id: 'hamala', en: 'Hamala', ar: 'الهملة', governorate: 'Northern' },
  { id: 'saar', en: 'Saar', ar: 'سار', governorate: 'Northern' },
  { id: 'aali', en: "A'ali", ar: 'عالي', governorate: 'Northern' },
  { id: 'sanad', en: 'Sanad', ar: 'سند', governorate: 'Northern' },
  { id: 'jidhafs', en: 'Jidhafs', ar: 'جدحفص', governorate: 'Northern' },
  { id: 'daih', en: 'Daih', ar: 'الدية', governorate: 'Northern' },
  { id: 'maqaba', en: 'Maqaba', ar: 'مقابة', governorate: 'Northern' },
  {
    id: 'abu-saybah',
    en: 'Abu Saiba',
    ar: 'أبو صيبع',
    governorate: 'Northern',
  },
  { id: 'shakhura', en: 'Shakhura', ar: 'شاخورة', governorate: 'Northern' },
  { id: 'karranah', en: 'Karranah', ar: 'كرانة', governorate: 'Northern' },
  { id: 'muqsha', en: 'Muqsha', ar: 'مقشع', governorate: 'Northern' },
  {
    id: 'bilad-al-qadeem',
    en: 'Bilad Al Qadeem',
    ar: 'بلاد القديم',
    governorate: 'Northern',
  },
  { id: 'jurdab', en: 'Jurdab', ar: 'جرداب', governorate: 'Northern' },
  { id: 'buri', en: 'Buri', ar: 'بوري', governorate: 'Northern' },

  // Southern Governorate
  { id: 'riffa', en: 'Riffa', ar: 'الرفاع', governorate: 'Southern' },
  {
    id: 'east-riffa',
    en: 'East Riffa',
    ar: 'الرفاع الشرقي',
    governorate: 'Southern',
  },
  {
    id: 'west-riffa',
    en: 'West Riffa',
    ar: 'الرفاع الغربي',
    governorate: 'Southern',
  },
  { id: 'isa-town', en: 'Isa Town', ar: 'مدينة عيسى', governorate: 'Southern' },
  { id: 'zallaq', en: 'Zallaq', ar: 'الزلاق', governorate: 'Southern' },
  { id: 'askar', en: 'Askar', ar: 'عسكر', governorate: 'Southern' },
  { id: 'jaww', en: 'Jau', ar: 'جو', governorate: 'Southern' },
  { id: 'sakhir', en: 'Sakhir', ar: 'الصخير', governorate: 'Southern' },
  {
    id: 'nuwaidrat',
    en: 'Nuwaidrat',
    ar: 'النويدرات',
    governorate: 'Southern',
  },
  { id: 'maamir', en: "Ma'ameer", ar: 'المعامير', governorate: 'Southern' },
  { id: 'eker', en: 'Eker', ar: 'عكر', governorate: 'Southern' },
  {
    id: 'dar-kulaib',
    en: 'Dar Kulaib',
    ar: 'دار كليب',
    governorate: 'Southern',
  },
  { id: 'ras-hayan', en: 'Ras Hayan', ar: 'رأس حيان', governorate: 'Southern' },
  { id: 'awali', en: 'Awali', ar: 'عوالي', governorate: 'Southern' },
  { id: 'hajiyat', en: 'Hajiyat', ar: 'الحجيات', governorate: 'Southern' },
  { id: 'bukowarah', en: 'Bukowarah', ar: 'بوكوارا', governorate: 'Southern' },
];
