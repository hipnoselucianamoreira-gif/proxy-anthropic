export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { system, prompt } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5-5',
        max_tokens: 8000,
        system: system,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    // Sem texto: devolve o motivo que a Anthropic informou (tipo e mensagem), para o erro nao ficar escondido.
    const text = data.content?.[0]?.text || '';
    if (!text) return res.status(200).json({ text: '', erro: data.error?.type || 'sem_texto', detalhe: data.error?.message || '', status: response.status });
    res.status(200).json({ text });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
