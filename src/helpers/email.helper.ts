import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  resend ??= new Resend(apiKey);
  return resend;
}

function getSender(): string {
  const sender = process.env.RESEND_FROM_EMAIL;
  if (!sender) throw new Error("RESEND_FROM_EMAIL is not configured");
  return sender;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

export async function sendEbookPurchaseConfirmationEmail(input: {
  to: string;
  name: string;
  amount: number;
  extras: Array<"recipe_book" | "whatsapp_vip">;
  clientTransactionId: string;
}): Promise<void> {
  const items = [
    "Ebook Quema Grasa, Construye Músculo",
    ...(input.extras.includes("recipe_book") ? ["Recetario Secreto de Scarlett"] : []),
    ...(input.extras.includes("whatsapp_vip") ? ["Grupo VIP de WhatsApp"] : []),
  ];
  const itemList = items.map((item) => `<li style="margin-bottom: 8px;">${item}</li>`).join("");

  await getResend().emails.send({
    from: getSender(),
    to: input.to,
    subject: "Compra confirmada — Quema Grasa, Construye Músculo",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fffaf4; color: #12110f;">
        <div style="padding: 28px; background: #12110f; color: #ffffff; text-align: center;">
          <p style="margin: 0 0 8px; color: #d7ff45; font-size: 12px; font-weight: 700; letter-spacing: 1.5px;">SCARLETT CORDOVA</p>
          <h1 style="margin: 0; font-size: 30px; line-height: 1.05;">Quema Grasa,<br>Construye Músculo</h1>
        </div>
        <div style="padding: 28px;">
          <h2 style="margin-top: 0; color: #ff4b2b;">¡Tu compra está confirmada, ${escapeHtml(input.name)}!</h2>
          <p>PayPhone aprobó correctamente tu pago. Estos son los productos registrados en tu compra:</p>
          <ul style="padding: 18px 18px 10px 36px; border-radius: 10px; background: #f3ede4;">${itemList}</ul>
          <div style="margin: 22px 0; padding: 18px; border-left: 4px solid #ff4b2b; background: #ffffff;">
            <p style="margin: 0 0 6px;"><strong>Total pagado:</strong> $${input.amount.toFixed(2)} USD</p>
            <p style="margin: 0; font-size: 12px; color: #6d655e; word-break: break-all;"><strong>Referencia:</strong> ${escapeHtml(input.clientTransactionId)}</p>
          </div>
          <p>Conserva este correo. Tu compra quedará vinculada al acceso que habilitaremos en el sitio de Scarlett Cordova.</p>
          <p style="margin-top: 28px;"><strong>Con amor,<br>Scarlett</strong></p>
        </div>
      </div>
    `,
  });
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  frontendUrl: string,
): Promise<void> {
  const link = `${frontendUrl}/verificar-email?token=${token}`;

  await getResend().emails.send({
    from: getSender(),
    to,
    subject: "Verifica tu cuenta — Scarlett Cordova",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #111;">Confirma tu correo electrónico</h2>
        <p>Gracias por registrarte en <strong>Scarlett Cordova</strong>. Haz clic en el botón para verificar tu cuenta:</p>
        <a href="${link}" style="display: inline-block; margin: 16px 0; padding: 14px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Verificar mi cuenta</a>
        <p style="font-size: 14px; color: #666;">O copia y pega este enlace en tu navegador:</p>
        <p style="font-size: 14px; word-break: break-all;">${link}</p>
        <p style="font-size: 12px; color: #999; margin-top: 24px;">Este enlace expira en 24 horas.</p>
      </div>
    `,
  });
}

export async function sendLoginEmail(to: string, name: string): Promise<void> {
  await getResend().emails.send({
    from: getSender(),
    to,
    subject: "Nuevo inicio de sesión — Scarlett Cordova",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #111;">Hola, ${name}</h2>
        <p>Acabas de iniciar sesión en tu cuenta de <strong>Scarlett Cordova</strong>.</p>
        <p style="font-size: 14px; color: #666;">Si no fuiste tú, por favor cambia tu contraseña de inmediato.</p>
      </div>
    `,
  });
}

export async function sendAdminInviteEmail(
  to: string,
  name: string,
  password: string,
  verificationLink: string,
): Promise<void> {
  await getResend().emails.send({
    from: getSender(),
    to,
    subject: "Tu invitación a Scarlett Cordova",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #111;">Bienvenido, ${name}</h2>
        <p>Has sido invitado a unirte a <strong>Scarlett Cordova</strong>.</p>
        <p>Tus credenciales de acceso son:</p>
        <ul style="font-size: 14px; color: #666;">
          <li><strong>Correo:</strong> ${to}</li>
          <li><strong>Contraseña:</strong> ${password}</li>
        </ul>
        <p>Para activar tu cuenta, verifica tu correo haciendo clic en el siguiente botón:</p>
        <a href="${verificationLink}" style="display: inline-block; margin: 16px 0; padding: 14px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Verificar mi cuenta</a>
        <p style="font-size: 14px; color: #666;">O copia y pega este enlace:</p>
        <p style="font-size: 14px; word-break: break-all;">${verificationLink}</p>
        <p style="font-size: 12px; color: #999; margin-top: 24px;">Este enlace expira en 24 horas. Te recomendamos cambiar tu contraseña después de iniciar sesión.</p>
      </div>
    `,
  });
}

export async function sendAccessExtendedEmail(
  to: string,
  name: string,
  accessUntil: Date,
): Promise<void> {
  const dateLabel = accessUntil.toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await getResend().emails.send({
    from: getSender(),
    to,
    subject: "Tu acceso fue extendido — Scarlett Cordova",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #111;">Hola, ${name}</h2>
        <p>Tu acceso a <strong>Scarlett Cordova</strong> ha sido extendido exitosamente.</p>
        <p style="font-size: 16px; margin: 16px 0;">Ahora tienes acceso activo hasta el <strong>${dateLabel}</strong>.</p>
        <p style="font-size: 12px; color: #999; margin-top: 24px;">Si tienes preguntas, escríbenos por WhatsApp.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
): Promise<void> {
  await getResend().emails.send({
    from: getSender(),
    to,
    subject: "Restablece tu contraseña — Scarlett Cordova",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #111;">Hola, ${name}</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Scarlett Cordova</strong>.</p>
        <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
        <a href="${resetUrl}" style="display: inline-block; margin: 16px 0; padding: 14px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Restablecer contraseña</a>
        <p style="font-size: 14px; color: #666;">O copia y pega este enlace:</p>
        <p style="font-size: 14px; word-break: break-all;">${resetUrl}</p>
        <p style="font-size: 12px; color: #999; margin-top: 24px;">Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este mensaje.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetConfirmationEmail(
  to: string,
  name: string,
): Promise<void> {
  await getResend().emails.send({
    from: getSender(),
    to,
    subject: "Contraseña actualizada — Scarlett Cordova",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #111;">Hola, ${name}</h2>
        <p>Tu contraseña de <strong>Scarlett Cordova</strong> fue actualizada correctamente.</p>
        <p style="font-size: 14px; color: #666;">Si no fuiste tú quien realizó este cambio, por favor contacta a soporte de inmediato.</p>
      </div>
    `,
  });
}

export async function sendPaymentWelcomeEmail(
  to: string,
  name: string,
  password: string,
  loginUrl: string,
): Promise<void> {
  await getResend().emails.send({
    from: getSender(),
    to,
    subject: "Bienvenida a Scarlett Cordova",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #111;">Bienvenida, ${name}</h2>
        <p>Tu pago fue procesado correctamente y ya tienes acceso a <strong>Scarlett Cordova</strong>.</p>
        <p>Tus credenciales de acceso son:</p>
        <ul style="font-size: 14px; color: #666;">
          <li><strong>Correo:</strong> ${to}</li>
          <li><strong>Contraseña:</strong> ${password}</li>
        </ul>
        <p>Para ingresar, haz clic en el siguiente botón:</p>
        <a href="${loginUrl}" style="display: inline-block; margin: 16px 0; padding: 14px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Iniciar sesión</a>
        <p style="font-size: 14px; color: #666;">O copia y pega este enlace:</p>
        <p style="font-size: 14px; word-break: break-all;">${loginUrl}</p>
        <p style="font-size: 14px; color: #666;">En breve podrás encontrar tus clases grabadas dentro de la comunidad.</p>
        <p style="font-size: 12px; color: #999; margin-top: 24px;">Te recomendamos cambiar tu contraseña después de iniciar sesión.</p>
      </div>
    `,
  });
}

export async function sendPaymentAccessEmail(
  to: string,
  name: string,
  loginUrl: string,
): Promise<void> {
  await getResend().emails.send({
    from: getSender(),
    to,
    subject: "Tu acceso a Scarlett Cordova está activo",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #111;">Hola, ${name}</h2>
        <p>Tu pago fue aprobado y tu acceso a <strong>Scarlett Cordova</strong> está activo.</p>
        <p>Tu cuenta de ingreso es:</p>
        <div style="margin: 16px 0; padding: 16px; background: #f0fff8; border: 1px solid #16c784; border-radius: 8px;">
          <strong>Correo:</strong> ${to}
        </div>
        <p>Ingresa con tu contraseña habitual. Si no la recuerdas, utiliza la opción de recuperar contraseña en la pantalla de acceso.</p>
        <a href="${loginUrl}" style="display: inline-block; margin: 16px 0; padding: 14px 24px; background: #0d1117; color: #fff; text-decoration: none; border-radius: 6px;">Entrar a la comunidad</a>
        <p style="font-size: 14px; color: #666;">En breve podrás encontrar tus clases grabadas dentro de la comunidad.</p>
        <p style="font-size: 12px; color: #999; margin-top: 24px;">Si no reconoces este pago, contacta a soporte.</p>
      </div>
    `,
  });
}

export async function sendManualPaymentReceiptEmail(
  to: string,
  name: string,
  plan: "monthly" | "annual",
  amount: number,
  accessUntil: Date,
  receiptUrl: string,
): Promise<void> {
  const planLabel = plan === "annual" ? "anualidad" : "mensualidad";
  const dateLabel = accessUntil.toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  await getResend().emails.send({
    from: getSender(),
    to,
    subject: "Comprobante de pago registrado — Scarlett Cordova",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #111;">Hola, ${name}</h2>
        <p>Hemos registrado tu pago por <strong>USD ${amount}</strong> correspondiente a la ${planLabel}.</p>
        <p style="font-size: 16px; margin: 16px 0;">Tu acceso está activo hasta el <strong>${dateLabel}</strong>.</p>
        <p>Puedes ver el comprobante aquí:</p>
        <a href="${receiptUrl}" style="display: inline-block; margin: 16px 0; padding: 14px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Ver comprobante</a>
        <p style="font-size: 14px; word-break: break-all;">${receiptUrl}</p>
        <p style="font-size: 12px; color: #999; margin-top: 24px;">Gracias por ser parte de Scarlett Cordova.</p>
      </div>
    `,
  });
}
