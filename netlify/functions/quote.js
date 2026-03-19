exports.handler = async function(event) {
  const ticker = event.queryStringParameters?.ticker;
  if (!ticker) {
    return { statusCode: 400, body: JSON.stringify({ error: 'ticker required' }) };
  }

  try {
    // quoteSummary로 시가총액 포함한 상세 정보 가져오기
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price,summaryDetail`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);
    const data = await res.json();
    const priceData = data?.quoteSummary?.result?.[0]?.price;
    if (!priceData) throw new Error('No price data');

    const price    = priceData.regularMarketPrice?.raw;
    const prev     = priceData.regularMarketPreviousClose?.raw;
    const chg      = prev ? ((price - prev) / prev) * 100 : 0;
    const marketCap = priceData.marketCap?.raw || null;
    const open     = priceData.regularMarketOpen?.raw || null;
    const high     = priceData.regularMarketDayHigh?.raw || null;
    const low      = priceData.regularMarketDayLow?.raw || null;
    const volume   = priceData.regularMarketVolume?.raw || null;

    // 시가총액 한국식 표기 (조/억)
    function formatCap(v) {
      if (!v) return '–';
      const trillion = v / 1e12;
      if (trillion >= 1) {
        const t = Math.floor(trillion);
        const remainder = Math.round((v - t * 1e12) / 1e8);
        return remainder > 0 ? `${t}조 ${remainder.toLocaleString()}억` : `${t}조`;
      }
      const billion = Math.round(v / 1e8);
      return `${billion.toLocaleString()}억`;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
      body: JSON.stringify({
        price, chg, ticker,
        marketCap,
        capStr: formatCap(marketCap),
        open, high, low, volume,
        prev,
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
