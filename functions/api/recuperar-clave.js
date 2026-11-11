/* Recuperar la contraseña (solo administradores y digitadores, que son quienes entran con correo).
 *
 * La pantalla de inicio de sesión manda { email }. Si ese correo es de un administrador o un digitador, Supabase genera un enlace
 * de recuperación y se envía por correo (Brevo o Resend, igual que los demás correos). La respuesta es SIEMPRE la misma,
 * exista o no el correo, para no revelar quién tiene cuenta. Quien entra con cédula o con usuario NO usa esto: su PIN lo
 * restablece un administrador desde Configuración → Usuarios.
 *
 * Para que el enlace funcione, la dirección de la aplicación tiene que estar en Supabase → Authentication → URL Configuration
 * (Site URL y Redirect URLs). */
import { enviarCorreo } from './_correo.js';

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const json = (cuerpo, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function correoRecuperacion({ nombre, enlace }) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F5F4EF;font-family:Georgia,'Times New Roman',serif;color:#16241C;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4EF;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #D9DDD2;">
<tr><td style="background:#0F3D22;padding:22px 28px;color:#ffffff;"><div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#E8C677;">Finca Torremolinos</div><div style="font-size:26px;margin-top:6px;">Sistema de Gestión</div></td></tr>
<tr><td style="padding:28px;font-size:17px;line-height:1.55;">
<p style="margin:0 0 14px;">Hola${nombre ? `, ${esc(nombre)}` : ''}.</p>
<p style="margin:0 0 20px;">Pediste restablecer tu contraseña. Toca el botón y escribe una nueva; el enlace sirve <strong>una sola vez</strong> y vence en 1 hora.</p>
<p style="margin:0 0 24px;"><a href="${esc(enlace)}" style="display:inline-block;background:#166534;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-bottom:4px solid #C9932B;">Crear mi nueva contraseña</a></p>
<p style="margin:0;font-size:14px;color:#566158;">Si no fuiste tú, ignora este correo: tu contraseña no cambia.</p>
</td></tr></table></td></tr></table></body></html>`;
}

export async function onRequestPost({ request, env }) {
  try {
    const url = String(env.SUPABASE_URL || '').replace(/\/+$/, ''), llave = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !llave) return json({ error: 'Falta configurar SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en Cloudflare Pages.' }, 500);
    const proveedor = (env.PROVEEDOR_CORREO || 'resend').trim().toLowerCase();
    if ((proveedor === 'brevo' && !env.BREVO_API_KEY) || (proveedor !== 'brevo' && !env.RESEND_API_KEY)) return json({ error: 'El envío de correos no está configurado todavía. Pídele al administrador que lo configure.' }, 503);
    let cuerpo; try { cuerpo = await request.json(); } catch { return json({ error: 'La petición no es válida.' }, 400); }
    const email = String(cuerpo?.email || '').trim().toLowerCase();
    if (!email || email.length > 254 || !CORREO.test(email)) return json({ error: 'Escribe un correo válido.' }, 400);

    const base = String(env.URL_PUBLICA || new URL(request.url).origin).replace(/\/$/, '');
    const H = { apikey: llave, Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' };
    const r = await fetch(`${url}/rest/v1/indicadores_usuarios?email=eq.${encodeURIComponent(email)}&select=rol,tipo_acceso,nombre`, { headers: H });
    const fila = r.ok ? (await r.json().catch(() => []))[0] : null;
    if (fila && ['admin', 'digitador'].includes(fila.rol) && (fila.tipo_acceso || 'correo') === 'correo') {
      const g = await fetch(`${url}/auth/v1/admin/generate_link`, { method: 'POST', headers: H, body: JSON.stringify({ type: 'recovery', email, redirect_to: base }) });
      const datos = g.ok ? await g.json().catch(() => null) : null;
      const enlace = datos?.action_link;
      if (enlace) {
        try { await enviarCorreo(env, { destinatarios: [email], asunto: 'Restablece tu contraseña · Sistema de Gestión', html: correoRecuperacion({ nombre: fila.nombre, enlace }) }); }
        catch { /* sin revelar nada: el administrador lo ve en los registros de Cloudflare */ }
      }
    }
    return json({ ok: true });
  } catch {
    return json({ error: 'Error inesperado del servidor.' }, 500);
  }
}

export async function onRequest({ request, env }) {
  if (request.method === 'POST') return onRequestPost({ request, env });
  return json({ error: 'Método no permitido.' }, 405);
}
