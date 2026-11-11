/* Envío de correo con Brevo o Resend (el mismo que usa el despertador de recordatorios). */

/** Separa "Nombre <correo@dominio>" en sus dos partes. */
function partirRemitente(texto) {
  const m = String(texto || '').match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { nombre: m[1] || 'Finca Torremolinos', email: m[2].trim() };
  return { nombre: 'Finca Torremolinos', email: String(texto || '').trim() };
}

/** Envío con Resend (requiere dominio verificado para escribir a terceros). */
async function enviarConResend(env, { destinatarios, asunto, html, adjuntos }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CORREO_REMITENTE || 'Torremolinos Indicadores <onboarding@resend.dev>',
      to: destinatarios, subject: asunto, html,
      attachments: adjuntos && adjuntos.map(a => ({
        filename: a.nombre, content: a.base64, content_type: 'image/png',
        content_id: a.cid, disposition: 'inline',
      })),
    }),
  });
  if (r.ok) return;
  const texto = await r.text();
  if (r.status === 403 && texto.includes('your own email address')) {
    const propio = (texto.match(/\(([^)]+@[^)]+)\)/) || [])[1] || 'tu correo de registro';
    throw new Error(
      `Resend solo te deja enviar a ${propio} mientras uses el remitente de prueba. ` +
      `Opciones: verificar un dominio en resend.com/domains, o cambiar a Brevo ` +
      `(gratis, permite verificar una sola dirección de Gmail) poniendo PROVEEDOR_CORREO=brevo.`);
  }
  if (r.status === 401) throw new Error('La RESEND_API_KEY no es válida o fue revocada.');
  throw new Error(`Resend respondió ${r.status}: ${texto.slice(0, 250)}`);
}

/** Envío con Brevo: gratis hasta 300 correos al día y basta con verificar
 *  una sola dirección de remitente (sirve una de Gmail), sin dominio propio. */
async function enviarConBrevo(env, { destinatarios, asunto, html, adjuntos }) {
  const de = partirRemitente(env.CORREO_REMITENTE);
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: de.nombre, email: de.email },
      to: destinatarios.map(email => ({ email })),
      subject: asunto,
      htmlContent: html,
      attachment: adjuntos && adjuntos.map(a => ({ name: a.nombre, content: a.base64 })),
    }),
  });
  if (r.ok) return;
  const texto = await r.text();
  if (r.status === 400 && /sender/i.test(texto)) {
    throw new Error(
      `Brevo no reconoce el remitente "${de.email}". Entra a Brevo → Senders & IP → Senders, ` +
      `agrégalo y confirma el enlace que llega a esa bandeja. Luego vuelve a intentar.`);
  }
  if (r.status === 401) throw new Error('La BREVO_API_KEY no es válida.');
  throw new Error(`Brevo respondió ${r.status}: ${texto.slice(0, 250)}`);
}

export async function enviarCorreo(env, { destinatarios, asunto, html }) {
  const proveedor = (env.PROVEEDOR_CORREO || 'resend').trim().toLowerCase();
  if (proveedor === 'brevo' && !env.BREVO_API_KEY) throw new Error('Falta configurar BREVO_API_KEY.');
  if (proveedor !== 'brevo' && !env.RESEND_API_KEY) throw new Error('Falta configurar RESEND_API_KEY.');

  // MODO PRUEBAS: desvía todos los correos a una sola dirección.
  const prueba = (env.CORREO_PRUEBAS || '').trim();
  let destinoReal = destinatarios, asuntoFinal = asunto, htmlFinal = html;
  if (prueba) {
    destinoReal = [prueba];
    asuntoFinal = `[PRUEBA] ${asunto}`;
    htmlFinal = `<div style="font-family:Arial,Helvetica,sans-serif;background:#FAF0D8;border:1px solid #EBD9A8;color:#8A6410;padding:12px 16px;margin:0 0 14px;font-size:13px;">
        <strong>Modo pruebas.</strong> En producción este correo se habría enviado a: ${destinatarios.join(', ')}.
      </div>${html}`;
  }

  const datos = { destinatarios: destinoReal, asunto: asuntoFinal, html: htmlFinal };
  return proveedor === 'brevo' ? enviarConBrevo(env, datos) : enviarConResend(env, datos);
}
