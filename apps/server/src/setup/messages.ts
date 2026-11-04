export const en = {
    pageTitle: 'Set up Quizaroni',
    stepsNav: 'Setup steps',
    stepOf: 'Step {n} of 3',
    stepToken: 'Setup token',
    stepInstance: 'Instance settings',
    stepAdmin: 'Admin account',
    tokenLabel: 'Setup token',
    tokenHint:
        "Find it in the server's startup output, or in the setup-token file in the data directory.",
    publicUrlLabel: 'Public URL',
    publicUrlHint:
        'The address people use to reach Quizaroni, such as https://quiz.example.org. Check it if the server runs behind a proxy.',
    publicUrlEnvHint:
        'QZ_PUBLIC_URL is set and takes precedence over this value.',
    registrationLegend: 'Who can create an account?',
    registrationOpen: 'Anyone',
    registrationOpenHint: 'People can sign up on their own.',
    registrationInvite: 'Invited people only',
    registrationInviteHint: 'An admin has to invite each new account.',
    teacherLegend: 'How do people become teachers?',
    teacherApproved: 'An admin approves them',
    teacherApprovedHint:
        'People can ask to be teachers, and an admin approves each request.',
    teacherSelf: 'They choose it themselves',
    teacherSelfHint: 'Anyone with an account can turn on teacher features.',
    nameLabel: 'Your name',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    passwordHint: '8 to 128 characters.',
    confirmPasswordLabel: 'Confirm password',
    next: 'Next',
    back: 'Back',
    finish: 'Create admin and finish',
    errorSummaryTitle: 'There is a problem',
    errTokenInvalid:
        'That setup token is not right. Copy it again from the server output or the setup-token file.',
    errPublicUrl:
        'Enter an http or https address with no path, such as https://quiz.example.org.',
    errRequiredChoice: 'Choose one of the options.',
    errName: 'Enter your name, up to 100 characters.',
    errEmail: 'Enter a valid email address, such as name@example.com.',
    errPasswordLength: 'Enter a password of 8 to 128 characters.',
    errPasswordMismatch: 'The passwords do not match.',
    errSetupFailed:
        'Setup could not be saved. Check the server log, then try again.',
    doneTitle: 'Quizaroni is set up',
    doneBody: 'Setup is complete. You can now open Quizaroni.',
    doneLink: 'Open Quizaroni',
    alreadyTitle: 'Quizaroni is already set up',
    alreadyBody: 'An admin account already exists, so setup cannot run again.',
    language: 'Language',
} as const;

export type MessageKey = keyof typeof en;

export const es: Record<MessageKey, string> = {
    pageTitle: 'Configura Quizaroni',
    stepsNav: 'Pasos de configuración',
    stepOf: 'Paso {n} de 3',
    stepToken: 'Código de configuración',
    stepInstance: 'Ajustes de la instancia',
    stepAdmin: 'Cuenta de administrador',
    tokenLabel: 'Código de configuración',
    tokenHint:
        'Lo encuentras en la salida de inicio del servidor o en el archivo setup-token del directorio de datos.',
    publicUrlLabel: 'URL pública',
    publicUrlHint:
        'La dirección con la que la gente accede a Quizaroni, por ejemplo https://quiz.example.org. Revísala si el servidor está detrás de un proxy.',
    publicUrlEnvHint:
        'QZ_PUBLIC_URL está definida y tiene prioridad sobre este valor.',
    registrationLegend: '¿Quién puede crear una cuenta?',
    registrationOpen: 'Cualquiera',
    registrationOpenHint: 'La gente puede registrarse por su cuenta.',
    registrationInvite: 'Solo personas invitadas',
    registrationInviteHint:
        'Un administrador tiene que invitar a cada cuenta nueva.',
    teacherLegend: '¿Cómo se convierte alguien en profesor?',
    teacherApproved: 'Lo aprueba un administrador',
    teacherApprovedHint:
        'La gente puede pedir ser profesor y un administrador aprueba cada solicitud.',
    teacherSelf: 'Lo elige cada persona',
    teacherSelfHint:
        'Cualquiera con una cuenta puede activar las funciones de profesor.',
    nameLabel: 'Tu nombre',
    emailLabel: 'Correo electrónico',
    passwordLabel: 'Contraseña',
    passwordHint: 'De 8 a 128 caracteres.',
    confirmPasswordLabel: 'Confirma la contraseña',
    next: 'Siguiente',
    back: 'Atrás',
    finish: 'Crear administrador y terminar',
    errorSummaryTitle: 'Hay un problema',
    errTokenInvalid:
        'Ese código de configuración no es correcto. Cópialo de nuevo de la salida del servidor o del archivo setup-token.',
    errPublicUrl:
        'Escribe una dirección http o https sin ruta, por ejemplo https://quiz.example.org.',
    errRequiredChoice: 'Elige una de las opciones.',
    errName: 'Escribe tu nombre, de hasta 100 caracteres.',
    errEmail:
        'Escribe un correo electrónico válido, por ejemplo nombre@example.com.',
    errPasswordLength: 'Escribe una contraseña de 8 a 128 caracteres.',
    errPasswordMismatch: 'Las contraseñas no coinciden.',
    errSetupFailed:
        'No se pudo guardar la configuración. Revisa el registro del servidor y vuelve a intentarlo.',
    doneTitle: 'Quizaroni está configurado',
    doneBody: 'La configuración ha terminado. Ya puedes abrir Quizaroni.',
    doneLink: 'Abrir Quizaroni',
    alreadyTitle: 'Quizaroni ya está configurado',
    alreadyBody:
        'Ya existe una cuenta de administrador, así que la configuración no puede volver a ejecutarse.',
    language: 'Idioma',
};

export type Locale = 'en' | 'es';
export const LOCALES: readonly Locale[] = ['en', 'es'];

export const messages: Record<Locale, Record<MessageKey, string>> = { en, es };

function asLocale(value: string | undefined): Locale | undefined {
    return LOCALES.find((locale) => locale === value);
}

export function pickLocale(
    explicit: string | undefined,
    acceptLanguage: string | undefined
): Locale {
    const chosen = asLocale(explicit);
    if (chosen) return chosen;
    let best: { locale: Locale; q: number } | undefined;
    for (const part of (acceptLanguage ?? '').split(',')) {
        const [tag = '', ...params] = part.trim().split(';');
        const locale = asLocale(tag.trim().toLowerCase().split('-')[0]);
        if (!locale) continue;
        const qParam = params.find((p) => p.trim().startsWith('q='));
        const q = qParam ? Number(qParam.trim().slice(2)) : 1;
        if (!(q > 0)) continue;
        if (!best || q > best.q) best = { locale, q };
    }
    return best?.locale ?? 'en';
}
