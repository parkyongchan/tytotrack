// gmtZone 적용 날짜 포맷
export const getGmtZone = () => parseFloat(localStorage.getItem('gmtZone') ?? '9');

// yyyyMMddHHmmss 형식 → gmtZone 적용 후 표시
export const formatDateWithGmt = (regDate) => {
  if (!regDate || regDate.length < 12) return regDate || '-';

  // UTC 기준으로 파싱
  const year = regDate.slice(0, 4);
  const month = regDate.slice(4, 6);
  const day = regDate.slice(6, 8);
  const hour = regDate.slice(8, 10);
  const min = regDate.slice(10, 12);

  // DB 저장 시간이 KST(+9) 기준이므로 UTC로 변환 후 gmtZone 적용
  const kstDate = new Date(`${year}-${month}-${day}T${hour}:${min}:00+09:00`);
  const gmtZone = getGmtZone();
  const localMs = kstDate.getTime() + gmtZone * 3600 * 1000;
  const localDate = new Date(localMs);

  const y = localDate.getUTCFullYear();
  const mo = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(localDate.getUTCDate()).padStart(2, '0');
  const h = String(localDate.getUTCHours()).padStart(2, '0');
  const m = String(localDate.getUTCMinutes()).padStart(2, '0');

  return `${y}-${mo}-${d} ${h}:${m}`;
};

// 검색 파라미터용 (yyyyMMddHHmm 형식)
export const toSearchDate = (date) => {
  const gmtZone = getGmtZone();
  // 입력된 로컬시간을 KST로 변환
  const localMs = date.getTime() - (gmtZone - 9) * 3600 * 1000;
  const kst = new Date(localMs);
  return kst.toISOString().replace('T', '').replace(/-|:/g, '').slice(0, 12);
};

// GMT 라벨
export const getGmtLabel = () => {
  const g = getGmtZone();
  return `GMT${g >= 0 ? '+' : ''}${g}`;
};