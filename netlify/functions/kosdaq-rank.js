exports.handler = async function(event) {
  try {
    // KRX 공개 API - 코스닥 시가총액 상위 종목
    const today = new Date();
    // 주말이면 금요일로
    const day = today.getDay();
    if (day === 0) today.setDate(today.getDate() - 2);
    if (day === 6) today.setDate(today.getDate() - 1);
    const dateStr = today.toISOString().slice(0,10).replace(/-/g,'');

    const url = 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd';
    const body = new URLSearchParams({
      bld: 'dbms/MDC/STAT/standard/MDCSTAT01501',
      mktId: 'KSQ',        // KSQ = 코스닥
      trdDd: dateStr,
      money: '1',
      csvxls_isNo: 'false',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'http://data.krx.co.kr/',
      },
      body: body.toString(),
    });

    if (!res.ok) throw new Error(`KRX returned ${res.status}`);
    const data = await res.json();

    // 시가총액 순 정렬 후 상위 100
    const list = (data.output || [])
      .filter(d => d.ISU_SRT_CD && d.MKTCAP)
      .sort((a, b) => Number(b.MKTCAP) - Number(a.MKTCAP))
      .slice(0, 100)
      .map((d, i) => ({
        rank: i + 1,
        code: d.ISU_SRT_CD,
        name: d.ISU_ABBRV,
        marketCap: Number(d.MKTCAP),
        capStr: formatCap(Number(d.MKTCAP)),
      }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // 5분 캐시
      },
      body: JSON.stringify({ list, date: dateStr }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};

function formatCap(v) {
  if (!v) return '–';
  const won = v * 1e6; // KRX는 백만원 단위
  const trillion = won / 1e12;
  if (trillion >= 1) {
    const t = Math.floor(trillion);
    const r = Math.round((won - t * 1e12) / 1e8);
    return r > 0 ? `${t}조 ${r.toLocaleString()}억` : `${t}조`;
  }
  return `${Math.round(won / 1e8).toLocaleString()}억`;
}
