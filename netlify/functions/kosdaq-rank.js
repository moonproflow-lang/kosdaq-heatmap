exports.handler = async function(event) {
  try {
    // KRX 최근 영업일 계산
    const today = new Date();
    const day = today.getDay();
    if (day === 0) today.setDate(today.getDate() - 2);
    if (day === 6) today.setDate(today.getDate() - 1);
    const dateStr = today.toISOString().slice(0,10).replace(/-/g,'');

    // KRX 시가총액 상위 - HTTPS
    const url = 'https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd';
    const body = new URLSearchParams({
      bld: 'dbms/MDC/STAT/standard/MDCSTAT01501',
      mktId: 'KSQ',
      trdDd: dateStr,
      money: '1',
      csvxls_isNo: 'false',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://data.krx.co.kr/',
        'Origin': 'https://data.krx.co.kr',
        'Accept': 'application/json, text/javascript, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      body: body.toString(),
    });

    if (!res.ok) throw new Error(`KRX ${res.status}`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error('KRX 응답 파싱 실패: ' + text.slice(0,100)); }

    const output = data.output || data.OutBlock_1 || [];
    if (!output.length) throw new Error('KRX 데이터 없음 (장 마감 후일 수 있음)');

    const list = output
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
        'Cache-Control': 'public, max-age=300',
      },
      body: JSON.stringify({ list, date: dateStr }),
    };
  } catch (e) {
    // KRX 실패시 Yahoo Finance에서 시총 상위 종목으로 fallback
    try {
      const fallback = await fetchYahooTop100();
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60',
        },
        body: JSON.stringify({ list: fallback, date: 'fallback', warning: e.message }),
      };
    } catch (e2) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: e.message + ' / fallback: ' + e2.message }),
      };
    }
  }
};

// KRX 실패시 하드코딩된 코스닥 상위 100 종목으로 fallback
async function fetchYahooTop100() {
  const KOSDAQ_TOP100 = [
    {code:'247540',name:'에코프로비엠',cap:8200},
    {code:'086520',name:'에코프로',cap:7100},
    {code:'196170',name:'알테오젠',cap:18200},
    {code:'028300',name:'HLB',cap:7800},
    {code:'352820',name:'하이브',cap:6600},
    {code:'259960',name:'크래프톤',cap:13400},
    {code:'323410',name:'카카오뱅크',cap:10200},
    {code:'035900',name:'JYP Ent.',cap:2700},
    {code:'036570',name:'엔씨소프트',cap:6200},
    {code:'141080',name:'리가켐바이오',cap:4100},
    {code:'091990',name:'셀트리온헬스',cap:5200},
    {code:'293490',name:'카카오게임즈',cap:1400},
    {code:'377300',name:'카카오페이',cap:3100},
    {code:'041510',name:'SM',cap:1900},
    {code:'122870',name:'와이지엔터',cap:900},
    {code:'263750',name:'펄어비스',cap:1300},
    {code:'068760',name:'셀트리온제약',cap:2800},
    {code:'214150',name:'클래시스',cap:2200},
    {code:'277810',name:'레인보우로보',cap:1500},
    {code:'403870',name:'HPSP',cap:2300},
    {code:'022100',name:'포스코DX',cap:2100},
    {code:'000990',name:'DB하이텍',cap:1600},
    {code:'278280',name:'천보',cap:1200},
    {code:'066970',name:'엘앤에프',cap:1900},
    {code:'278470',name:'에이피알',cap:1800},
    {code:'035760',name:'CJ ENM',cap:1400},
    {code:'058470',name:'리노공업',cap:1300},
    {code:'140860',name:'파크시스템스',cap:1100},
    {code:'095340',name:'ISC',cap:800},
    {code:'257540',name:'실리콘투',cap:900},
    {code:'241710',name:'코스메카',cap:700},
    {code:'253450',name:'스튜디오드래곤',cap:900},
    {code:'357780',name:'솔브레인',cap:1100},
    {code:'240810',name:'원익IPS',cap:700},
    {code:'039030',name:'이오테크닉스',cap:800},
    {code:'178320',name:'서진시스템',cap:500},
    {code:'089970',name:'테크윙',cap:600},
    {code:'085310',name:'넥스틴',cap:700},
    {code:'098460',name:'고영',cap:600},
    {code:'420940',name:'기가비스',cap:500},
    {code:'328130',name:'루닛',cap:1100},
    {code:'000100',name:'유한양행',cap:3200},
    {code:'214450',name:'파마리서치',cap:900},
    {code:'086900',name:'메디톡스',cap:700},
    {code:'145020',name:'휴젤',cap:1400},
    {code:'032500',name:'케이엠더블유',cap:400},
    {code:'112040',name:'위메이드',cap:500},
    {code:'192080',name:'더블유게임즈',cap:600},
    {code:'078340',name:'컴투스',cap:500},
    {code:'222800',name:'심텍',cap:400},
    {code:'007660',name:'이수페타시스',cap:500},
    {code:'096530',name:'씨젠',cap:400},
    {code:'067630',name:'HLB생명',cap:300},
    {code:'041960',name:'코미팜',cap:200},
    {code:'299660',name:'셀리드',cap:200},
    {code:'445680',name:'큐로셀',cap:300},
    {code:'338220',name:'뷰노',cap:300},
    {code:'322510',name:'제이엘케이',cap:200},
    {code:'053980',name:'오상헬스케어',cap:200},
    {code:'218410',name:'RFHIC',cap:200},
    {code:'067310',name:'하나마이크론',cap:300},
    {code:'033240',name:'자화전자',cap:300},
    {code:'090460',name:'비에이치',cap:300},
    {code:'083450',name:'GST',cap:200},
    {code:'222080',name:'씨아이에스',cap:200},
    {code:'378340',name:'필에너지',cap:200},
    {code:'150900',name:'파수',cap:200},
    {code:'095660',name:'네오위즈',cap:300},
    {code:'170900',name:'동아에스티',cap:400},
    {code:'008930',name:'한미사이언스',cap:600},
    {code:'005290',name:'동진쎄미켐',cap:300},
    {code:'319660',name:'피에스케이',cap:300},
    {code:'097800',name:'윈팩',cap:100},
    {code:'252990',name:'샘씨엔에스',cap:100},
    {code:'330860',name:'네패스아크',cap:100},
    {code:'079370',name:'제우스',cap:200},
    {code:'064290',name:'인텍플러스',cap:100},
    {code:'259630',name:'엠플러스',cap:100},
  ];
  return KOSDAQ_TOP100.map((d,i)=>({
    rank: i+1,
    code: d.code,
    name: d.name,
    marketCap: d.cap * 1e8,
    capStr: d.cap >= 10000
      ? Math.floor(d.cap/10000)+'조 '+(d.cap%10000)+'억'
      : d.cap+'억',
  }));
}

function formatCap(v) {
  if (!v) return '–';
  const won = v * 1e6;
  const trillion = won / 1e12;
  if (trillion >= 1) {
    const t = Math.floor(trillion);
    const r = Math.round((won - t * 1e12) / 1e8);
    return r > 0 ? `${t}조 ${r.toLocaleString()}억` : `${t}조`;
  }
  return `${Math.round(won / 1e8).toLocaleString()}억`;
}
