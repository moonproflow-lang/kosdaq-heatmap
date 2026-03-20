exports.handler = async function(event) {
  const ticker = event.queryStringParameters?.ticker;
  if (!ticker) {
    return { statusCode: 400, body: JSON.stringify({ error: 'ticker required' }) };
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
  };

  // v8 chart API (안정적) + v10 quoteSummary (시가총액) 병렬 요청
  try {
    const [chartRes, summaryRes] = await Promise.allSettled([
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`, { headers }),
      fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=price`, { headers }),
    ]);

    // chart에서 가격 데이터
    let price, prev, chg, open, high, low, volume;
    if (chartRes.status === 'fulfilled' && chartRes.value.ok) {
      const cd = await chartRes.value.json();
      const meta = cd?.chart?.result?.[0]?.meta;
      if (meta) {
        price  = meta.regularMarketPrice;
        prev   = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPreviousClose;
        chg    = prev ? ((price - prev) / prev) * 100 : 0;
        open   = meta.regularMarketOpen;
        high   = meta.regularMarketDayHigh;
        low    = meta.regularMarketDayLow;
        volume = meta.regularMarketVolume;
      }
    }

    if (!price) throw new Error('No price data from chart API');

    // summary에서 시가총액
    let marketCap = null;
    if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
      const sd = await summaryRes.value.json();
      marketCap = sd?.quoteSummary?.result?.[0]?.price?.marketCap?.raw || null;
    }

    function formatCap(v) {
      if (!v) return '–';
      const trillion = v / 1e12;
      if (trillion >= 1) {
        const t = Math.floor(trillion);
        const r = Math.round((v - t * 1e12) / 1e8);
        return r > 0 ? `${t}조 ${r.toLocaleString()}억` : `${t}조`;
      }
      return `${Math.round(v / 1e8).toLocaleString()}억`;
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
        prev, open, high, low, volume,
        marketCap,
        capStr: formatCap(marketCap),
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
