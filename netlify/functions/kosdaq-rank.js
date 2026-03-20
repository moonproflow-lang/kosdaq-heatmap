exports.handler = async function(event) {
  try {
    // 네이버 금융 코스닥 시가총액 상위 API
    // 페이지당 50개, 2페이지 = 100개
    const results = [];
    
    for (let page = 1; page <= 2; page++) {
      const url = `https://finance.naver.com/sise/sise_market_sum.naver?sosok=1&page=${page}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Referer': 'https://finance.naver.com/',
        },
      });
      if (!res.ok) throw new Error(`네이버 ${res.status}`);
      const html = await res.text();

      // 종목 파싱 - 테이블 행에서 추출
      const rowRegex = /<tr[^>]*class="[^"]*"[^>]*>[\s\S]*?<\/tr>/g;
      const codeRegex = /code=(\d{6})/;
      const nameRegex = /title="([^"]+)"/;
      const capRegex = /<td[^>]*class="number"[^>]*>([\d,]+)<\/td>/g;

      const rows = html.match(rowRegex) || [];
      for (const row of rows) {
        const codeMatch = row.match(codeRegex);
        const nameMatch = row.match(nameRegex);
        if (!codeMatch || !nameMatch) continue;

        const code = codeMatch[1];
        const name = nameMatch[1].replace(/&amp;/g, '&').trim();

        // 숫자 컬럼들 추출 (시가총액은 4번째 숫자 컬럼)
        const numbers = [];
        let m;
        const numRegex = /<td[^>]*class="[^"]*number[^"]*"[^>]*>([\d,]+)<\/td>/g;
        while ((m = numRegex.exec(row)) !== null) {
          numbers.push(parseInt(m[1].replace(/,/g, ''), 10));
        }

        if (numbers.length >= 4) {
          results.push({ code, name, marketCap: numbers[3] }); // 억원 단위
        }
      }
    }

    if (!results.length) throw new Error('네이버 파싱 결과 없음');

    // 시가총액 내림차순 정렬 후 상위 100
    const list = results
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 100)
      .map((d, i) => ({
        rank: i + 1,
        code: d.code,
        name: d.name,
        marketCap: d.marketCap * 1e8, // 억원 → 원
        capStr: formatCap(d.marketCap),
      }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
      body: JSON.stringify({ list, date: new Date().toISOString().slice(0,10), source: 'naver' }),
    };

  } catch (e) {
    // fallback: 최신 수동 목록 (삼천당제약 포함)
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
      body: JSON.stringify({ list: getFallback(), date: 'fallback', warning: e.message }),
    };
  }
};

function formatCap(억) {
  if (!억) return '–';
  if (억 >= 10000) {
    const 조 = Math.floor(억 / 10000);
    const 나머지 = 억 % 10000;
    return 나머지 > 0 ? `${조}조 ${나머지.toLocaleString()}억` : `${조}조`;
  }
  return `${억.toLocaleString()}억`;
}

function getFallback() {
  // 2026.03.20 기준 코스닥 시가총액 상위 100 (네이버 금융 기준)
  const TOP = [
    {code:'000250',name:'삼천당제약',cap:21600},
    {code:'196170',name:'알테오젠',cap:18800},
    {code:'277810',name:'레인보우로보틱스',cap:16200},
    {code:'259960',name:'크래프톤',cap:13700},
    {code:'323410',name:'카카오뱅크',cap:10500},
    {code:'247540',name:'에코프로비엠',cap:9200},
    {code:'086520',name:'에코프로',cap:8100},
    {code:'028300',name:'HLB',cap:7400},
    {code:'352820',name:'하이브',cap:6800},
    {code:'036570',name:'엔씨소프트',cap:6300},
    {code:'091990',name:'셀트리온헬스케어',cap:5400},
    {code:'141080',name:'리가켐바이오',cap:4200},
    {code:'000100',name:'유한양행',cap:4100},
    {code:'377300',name:'카카오페이',cap:3200},
    {code:'068760',name:'셀트리온제약',cap:2900},
    {code:'403870',name:'HPSP',cap:2700},
    {code:'214150',name:'클래시스',cap:2500},
    {code:'022100',name:'포스코DX',cap:2300},
    {code:'041510',name:'SM',cap:2100},
    {code:'000990',name:'DB하이텍',cap:1900},
    {code:'145020',name:'휴젤',cap:1800},
    {code:'066970',name:'엘앤에프',cap:1800},
    {code:'278470',name:'에이피알',cap:1700},
    {code:'263750',name:'펄어비스',cap:1600},
    {code:'035900',name:'JYP Ent.',cap:1600},
    {code:'328130',name:'루닛',cap:1500},
    {code:'277810',name:'레인보우로보',cap:1500},
    {code:'035760',name:'CJ ENM',cap:1400},
    {code:'293490',name:'카카오게임즈',cap:1400},
    {code:'278280',name:'천보',cap:1300},
    {code:'058470',name:'리노공업',cap:1300},
    {code:'357780',name:'솔브레인',cap:1200},
    {code:'122870',name:'와이지엔터',cap:1000},
    {code:'253450',name:'스튜디오드래곤',cap:1000},
    {code:'257540',name:'실리콘투',cap:900},
    {code:'214450',name:'파마리서치',cap:900},
    {code:'140860',name:'파크시스템스',cap:900},
    {code:'039030',name:'이오테크닉스',cap:800},
    {code:'095340',name:'ISC',cap:800},
    {code:'085310',name:'넥스틴',cap:800},
    {code:'086900',name:'메디톡스',cap:750},
    {code:'241710',name:'코스메카코리아',cap:720},
    {code:'240810',name:'원익IPS',cap:700},
    {code:'098460',name:'고영',cap:680},
    {code:'420940',name:'기가비스',cap:650},
    {code:'178320',name:'서진시스템',cap:630},
    {code:'089970',name:'테크윙',cap:600},
    {code:'192080',name:'더블유게임즈',cap:580},
    {code:'008930',name:'한미사이언스',cap:570},
    {code:'222800',name:'심텍',cap:550},
    {code:'007660',name:'이수페타시스',cap:540},
    {code:'112040',name:'위메이드',cap:520},
    {code:'078340',name:'컴투스',cap:500},
    {code:'145020',name:'휴젤',cap:480},
    {code:'096530',name:'씨젠',cap:450},
    {code:'067630',name:'HLB생명과학',cap:430},
    {code:'032500',name:'케이엠더블유',cap:410},
    {code:'170900',name:'동아에스티',cap:400},
    {code:'095660',name:'네오위즈',cap:380},
    {code:'005290',name:'동진쎄미켐',cap:360},
    {code:'319660',name:'피에스케이',cap:340},
    {code:'445680',name:'큐로셀',cap:330},
    {code:'338220',name:'뷰노',cap:320},
    {code:'090460',name:'비에이치',cap:310},
    {code:'067310',name:'하나마이크론',cap:300},
    {code:'033240',name:'자화전자',cap:290},
    {code:'063980',name:'하이크비전',cap:280},
    {code:'218410',name:'RFHIC',cap:270},
    {code:'068270',name:'셀트리온',cap:260},
    {code:'083450',name:'GST',cap:250},
    {code:'041960',name:'코미팜',cap:240},
    {code:'299660',name:'셀리드',cap:230},
    {code:'222080',name:'씨아이에스',cap:220},
    {code:'378340',name:'필에너지',cap:210},
    {code:'053980',name:'오상헬스케어',cap:200},
    {code:'150900',name:'파수',cap:190},
    {code:'259630',name:'엠플러스',cap:180},
    {code:'322510',name:'제이엘케이',cap:170},
    {code:'079370',name:'제우스',cap:160},
    {code:'064290',name:'인텍플러스',cap:150},
    {code:'097800',name:'윈팩',cap:140},
    {code:'252990',name:'샘씨엔에스',cap:130},
    {code:'330860',name:'네패스아크',cap:120},
  ];
  return TOP.map((d,i) => ({
    rank: i+1,
    code: d.code,
    name: d.name,
    marketCap: d.cap * 1e8,
    capStr: formatCap(d.cap),
  }));
}
