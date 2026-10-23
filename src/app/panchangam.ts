export interface PanchangamDay {
  month: string;
  day: number;
  nakshatra: string;
  nakshatraEn: string;
  specialities: string[];
}

const NAKSHATRAS = [
  { en: 'Ashwathi', ml: 'അശ്വതി' },
  { en: 'Bharani', ml: 'ഭരണി' },
  { en: 'Karthika', ml: 'കാർത്തിക' },
  { en: 'Rohini', ml: 'രോഹിണി' },
  { en: 'Makayiram', ml: 'മകയിരം' },
  { en: 'Thiruvathira', ml: 'തിരുവാതിര' },
  { en: 'Punartham', ml: 'പുണർതം' },
  { en: 'Pooyam', ml: 'പൂയം' },
  { en: 'Ayilyam', ml: 'അയില്യം' },
  { en: 'Makam', ml: 'മകം' },
  { en: 'Pooram', ml: 'പൂരം' },
  { en: 'Uthram', ml: 'ഉത്രം' },
  { en: 'Atham', ml: 'അത്തം' },
  { en: 'Chithira', ml: 'ചിത്തിര' },
  { en: 'Chothi', ml: 'ചോതി' },
  { en: 'Visakham', ml: 'വിശാഖം' },
  { en: 'Anizham', ml: 'അനിഴം' },
  { en: 'Thrikketta', ml: 'തൃക്കേട്ട' },
  { en: 'Moolam', ml: 'മൂലം' },
  { en: 'Pooradam', ml: 'പൂരാടം' },
  { en: 'Uthradam', ml: 'ഉത്രാടം' },
  { en: 'Thiruvonam', ml: 'തിരുവോണം' },
  { en: 'Avittam', ml: 'അവിട്ടം' },
  { en: 'Chathayam', ml: 'ചതയം' },
  { en: 'Pooruruttathi', ml: 'പൂരുരുട്ടാതി' },
  { en: 'Uthrattathi', ml: 'ഉത്രട്ടാതി' },
  { en: 'Revathi', ml: 'രേവതി' },
];

const MALAYALAM_MONTHS = [
  { name: 'ചിങ്ങം', month: 8, day: 17 },
  { name: 'കന്നി', month: 9, day: 17 },
  { name: 'തുലാം', month: 10, day: 17 },
  { name: 'വൃശ്ചികം', month: 11, day: 16 },
  { name: 'ധനു', month: 12, day: 16 },
  { name: 'മകരം', month: 1, day: 14 },
  { name: 'കുംഭം', month: 2, day: 13 },
  { name: 'മീനം', month: 3, day: 14 },
  { name: 'മേടം', month: 4, day: 14 },
  { name: 'ഇടവം', month: 5, day: 15 },
  { name: 'മിഥുനം', month: 6, day: 15 },
  { name: 'കർക്കടകം', month: 7, day: 17 },
];

export function panchangamFor(date: Date): PanchangamDay {
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const starts = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].flatMap((year) =>
    MALAYALAM_MONTHS.map((month) => ({
      name: month.name,
      start: new Date(year, month.month - 1, month.day),
    })),
  );
  const current = starts.filter((item) => item.start <= today).sort((a, b) => b.start.getTime() - a.start.getTime())[0];
  const day = Math.round((today.getTime() - current.start.getTime()) / 86400000) + 1;
  const anchor = new Date(2024, 8, 15);
  const elapsed = Math.round((today.getTime() - anchor.getTime()) / 86400000);
  const star = NAKSHATRAS[((21 + elapsed) % 27 + 27) % 27];
  const moon = Date.UTC(2000, 0, 6, 18, 14);
  const lunar = (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12) - moon) / 86400000;
  const tithi = Math.floor(((((lunar % 29.530588) + 29.530588) % 29.530588) / 29.530588) * 30);
  return {
    month: current.name,
    day,
    nakshatra: star.ml,
    nakshatraEn: star.en,
    specialities: specialities(current.name, day, star.en, tithi),
  };
}

function specialities(month: string, day: number, nakshatra: string, tithi: number): string[] {
  const marks: string[] = [];
  if (day === 1) {
    marks.push('സംക്രമം');
  }
  if (nakshatra === 'Rohini') {
    marks.push('രോഹിണി വിളക്ക്');
  }
  if (nakshatra === 'Ayilyam') {
    marks.push('അയില്യം');
  }
  if (nakshatra === 'Thiruvonam' && month === 'ചിങ്ങം') {
    marks.push('ഓണം');
  }
  if (tithi % 15 === 5) {
    marks.push('ഷഷ്ഠി');
  }
  if (tithi % 15 === 10) {
    marks.push('ഏകാദശി');
  }
  if (tithi === 14) {
    marks.push('പൗർണമി');
  }
  if (tithi === 29) {
    marks.push('അമാവാസി');
  }
  return marks.length ? marks : ['സാധാരണ ദിവസം'];
}
