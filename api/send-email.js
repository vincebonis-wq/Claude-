const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { to, pdfBase64, fileName, coachName, annee, credit } = req.body;

  if (!to || !pdfBase64 || !fileName) {
    return res.status(400).json({ error: 'Champs manquants : to, pdfBase64, fileName' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from   = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const { data, error } = await resend.emails.send({
      from,
      to:      [to],
      subject: `Votre attestation fiscale SAP ${annee} — ${coachName}`,
      html:    buildHTML(coachName, annee, credit),
      attachments: [{
        filename: fileName,
        content:  pdfBase64,
      }],
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.status(200).json({ success: true, id: data?.id });

  } catch (err) {
    console.error('Resend error:', err);
    return res.status(500).json({ error: err.message });
  }
};

function buildHTML(coachName, annee, credit) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f4f0;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e2dc">

    <div style="background:#1a1a1a;padding:20px 28px">
      <p style="color:#fff;font-size:18px;font-weight:700;margin:0">Attestation Fiscale SAP</p>
      <p style="color:rgba(255,255,255,.7);font-size:12px;margin:4px 0 0">Service à la Personne · Année ${annee}</p>
    </div>

    <div style="padding:28px">
      <p style="color:#1a1a1a;margin:0 0 16px">Bonjour,</p>
      <p style="color:#444;line-height:1.6;margin:0 0 20px">
        Veuillez trouver en pièce jointe votre <strong>attestation fiscale SAP pour l'année ${annee}</strong>,
        établie par <strong>${coachName}</strong>.
      </p>

      ${credit ? `
      <div style="background:#edf7ed;border:1px solid #b8ddb8;border-radius:8px;padding:14px 18px;margin-bottom:20px">
        <p style="color:#2d6a2d;margin:0;font-size:14px">
          Crédit d'impôt estimé (50%) : <strong style="font-size:16px">${credit} €</strong>
        </p>
        <p style="color:#2d6a2d;margin:6px 0 0;font-size:12px;opacity:.85">
          Ce document est à conserver — il peut être réclamé par l'administration fiscale.
        </p>
      </div>` : ''}

      <p style="color:#888;font-size:12px;border-top:1px solid #e2e2dc;padding-top:16px;margin:0">
        Cordialement,<br>
        <strong style="color:#1a1a1a">${coachName}</strong>
      </p>
    </div>

  </div>
</body>
</html>`;
}
