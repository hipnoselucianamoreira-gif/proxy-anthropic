// Voz natural do paciente simulado (Clinica-Escola). Recebe { texto, voz, gesto } e devolve audio mp3.
// Usa a chave OPENAI_KEY guardada na Vercel. Sem a chave, responde 501 e o aplicativo usa a voz do navegador.
const ORIGENS = ['https://app.portaldoinconsciente.com.br', 'https://clinicapro-plum.vercel.app'];
const TOM = {
  neutro: 'Tom de conversa, calmo, natural, como alguém falando com o seu analista numa sala silenciosa.',
  riso: 'Com um sorriso na voz, rindo de leve de si mesma, sem exagero.',
  olhos: 'Voz um pouco embargada, emocionada, mais baixa e mais lenta, segurando o choro.',
  maos: 'Tensa, respiração curta, frases mais presas, como quem se segura.'
};
export default async function handler(req, res) {
  const origem = req.headers.origin || '';
  const permitida = ORIGENS.includes(origem);
  res.setHeader('Access-Control-Allow-Origin', permitida ? origem : ORIGENS[0]);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!permitida) return res.status(403).json({ erro: 'origem_nao_permitida' });
  if (!process.env.OPENAI_KEY) return res.status(501).json({ erro: 'sem_chave_de_voz' });
  try {
    const { texto, voz, gesto } = req.body || {};
    const fala = String(texto || '').slice(0, 1200).trim();
    if (!fala) return res.status(400).json({ erro: 'sem_texto' });
    const masc = voz === 'masculina';
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.OPENAI_KEY },
      body: JSON.stringify({
        model: process.env.VOZ_MODELO || 'gpt-4o-mini-tts',
        voice: masc ? (process.env.VOZ_MASC || 'onyx') : (process.env.VOZ_FEM || 'coral'),
        input: fala,
        instructions: 'Fale em português do Brasil, com sotaque brasileiro natural, nunca de Portugal. Você é ' + (masc ? 'um homem' : 'uma mulher') + ' em sessão de análise. Fala espontânea, com pausas e hesitações naturais, nunca tom de locutor, de leitura ou de assistente virtual. ' + (TOM[gesto] || TOM.neutro),
        response_format: 'mp3'
      })
    });
    if (!r.ok) { let d = ''; try { d = (await r.text()).slice(0, 300); } catch (_) {} return res.status(502).json({ erro: 'voz_falhou', status: r.status, detalhe: d }); }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ erro: 'erro', detalhe: String(e && e.message || e) });
  }
}
