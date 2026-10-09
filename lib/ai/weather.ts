// Real-time location & weather resolver for Zyntra AI

const THAI_LOCATIONS: Record<string, string> = {
  'กรุงเทพ': 'Bangkok',
  'กทม': 'Bangkok',
  'bangkok': 'Bangkok',
  'นนทบุรี': 'Nonthaburi',
  'ปทุมธานี': 'Pathum Thani',
  'สมุทรปราการ': 'Samut Prakan',
  'สมุทรสาคร': 'Samut Sakhon',
  'นครปฐม': 'Nakhon Pathom',
  'เชียงใหม่': 'Chiang Mai',
  'เชียงราย': 'Chiang Rai',
  'ภูเก็ต': 'Phuket',
  'ชลบุรี': 'Chon Buri',
  'พัทยา': 'Pattaya',
  'ขอนแก่น': 'Khon Kaen',
  'นครราชสีมา': 'Nakhon Ratchasima',
  'โคราช': 'Nakhon Ratchasima',
  'สงขลา': 'Songkhla',
  'หาดใหญ่': 'Hat Yai',
  'หัวหิน': 'Hua Hin',
  'ระยอง': 'Rayong',
  'อุบลราชธานี': 'Ubon Ratchathani',
  'อุบล': 'Ubon Ratchathani',
  'อุดรธานี': 'Udon Thani',
  'อุดร': 'Udon Thani',
  'สุราษฎร์ธานี': 'Surat Thani',
  'สุราษฎร์': 'Surat Thani',
  'กระบี่': 'Krabi',
  'เกาะสมุย': 'Ko Samui',
  'สมุย': 'Ko Samui',
  'พิษณุโลก': 'Phitsanulok',
  'อยุธยา': 'Phra Nakhon Si Ayutthaya',
  'ลำปาง': 'Lampang',
  'กาญจนบุรี': 'Kanchanaburi',
  'ประจวบ': 'Prachuap Khiri Khan',
  'ตราด': 'Trat',
  'จันทบุรี': 'Chanthaburi',
  'เพชรบูรณ์': 'Phetchabun',
  'ตรัง': 'Trang',
  'นครศรีธรรมราช': 'Nakhon Si Thammarat',
  'นครศรี': 'Nakhon Si Thammarat',
};

export function isWeatherQuery(text: string, priorContext: string = ''): boolean {
  const combined = `${text} ${priorContext}`.toLowerCase();
  const weatherKeywords = /(ฝน|สภาพอากาศ|พยากรณ์|อากาศ|ตกไหม|ร้อนไหม|หนาวไหม|แดด|พายุ|อุณหภูมิ|องศา|weather|rain|forecast|temp|temperature|cloud)/i;
  return weatherKeywords.test(combined);
}

export async function getRealtimeWeatherInfo(text: string, priorContext: string = ''): Promise<string | null> {
  if (!isWeatherQuery(text, priorContext)) return null;

  const combined = `${text} ${priorContext}`.toLowerCase();
  let selectedLocation = 'Bangkok';
  let thaiName = 'กรุงเทพมหานคร';

  for (const [th, en] of Object.entries(THAI_LOCATIONS)) {
    if (combined.includes(th.toLowerCase())) {
      selectedLocation = en;
      thaiName = th;
      break;
    }
  }

  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(selectedLocation)}?format=j1`, {
      headers: { 'User-Agent': 'curl/7.68.0' },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const curr = data.current_condition?.[0];
    const today = data.weather?.[0];
    const tomorrow = data.weather?.[1];

    if (!curr) return null;

    const translateCondition = (c: string) => {
      const lower = (c || '').toLowerCase();
      if (lower.includes('thunder')) return 'มีพายุฝนฟ้าคะนอง';
      if (lower.includes('rain') || lower.includes('shower')) return 'มีฝนตก / ฝนฟ้าคะนอง';
      if (lower.includes('drizzle')) return 'ฝนตกปรอยๆ';
      if (lower.includes('overcast')) return 'เมฆมาก ท้องฟ้ามืดครึ้ม';
      if (lower.includes('cloud')) return 'มีเมฆเป็นบางส่วน';
      if (lower.includes('clear') || lower.includes('sunny')) return 'ท้องฟ้าแจ่มใส แดดจัด';
      if (lower.includes('fog') || lower.includes('mist')) return 'มีหมอก';
      return c;
    };

    const currentConditionTh = translateCondition(curr.weatherDesc?.[0]?.value || '');
    const todayConditionTh = translateCondition(today?.hourly?.[4]?.weatherDesc?.[0]?.value || '');
    const tomorrowConditionTh = translateCondition(tomorrow?.hourly?.[4]?.weatherDesc?.[0]?.value || '');

    const lines: string[] = [
      `[ข้อมูลพยากรณ์อากาศแบบเรียลไทม์ (Live Weather Data) สำหรับพื้นที่: ${thaiName} (${selectedLocation})]`,
      `- สภาพอากาศปัจจุบัน: ${curr.temp_C}°C (${currentConditionTh}), ความชื้น ${curr.humidity}%`,
    ];

    if (today) {
      lines.push(
        `- วันนี้: อุณหภูมิสูงสุด ${today.maxtempC}°C / ต่ำสุด ${today.mintempC}°C (${todayConditionTh}), โอกาสฝนตก ${today.hourly?.[4]?.chanceofrain || 0}%`
      );
    }

    if (tomorrow) {
      lines.push(
        `- พรุ่งนี้: อุณหภูมิสูงสุด ${tomorrow.maxtempC}°C / ต่ำสุด ${tomorrow.mintempC}°C (${tomorrowConditionTh}), โอกาสฝนตก ${tomorrow.hourly?.[4]?.chanceofrain || 0}%`
      );
    }

    lines.push(
      `*ข้อแนะนำสำหรับ AI: นำข้อมูลสภาพอากาศจริงด้านบนนี้ไปตอบคำถามของผู้ใช้ทันทีอย่างชัดเจน แม่นยำ และเป็นประโยชน์ ห้ามปฏิเสธว่าไม่มีข้อมูล หรือไล่ผู้ใช้ไปเช็คเองเด็ดขาด*`
    );

    return lines.join('\n');
  } catch (err) {
    console.warn('Weather fetch failed or timed out:', err);
    return null;
  }
}
