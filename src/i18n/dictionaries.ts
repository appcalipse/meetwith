import type { SupportedLocale } from './config'

export type TranslationKey = keyof typeof en
export type TranslationParams = Record<
  string,
  string | number | boolean | null | undefined
>

const en = {
  'app.language': 'Language',
  'app.language.english': 'English',
  'app.language.spanish': 'Spanish',

  'head.default.title': 'Group meeting scheduling made easy.',
  'head.default.description':
    'Meetwith provides an easy way to schedule group meetings while preserving your privacy.',

  'nav.dashboard': 'Dashboard',
  'nav.home': 'Home',
  'nav.features': 'Features',
  'nav.plans': 'Plans',
  'nav.discordBot': 'Discord bot',
  'nav.faq': 'FAQ',
  'nav.signIn': 'Sign in',
  'nav.logout': 'Logout',

  'footer.rights': 'Meetwith. Some rights reserved, maybe...',
  'footer.plans': 'Plans',
  'footer.faq': 'FAQ',
  'footer.featureRequests': 'Feature Requests',
  'footer.terms': 'Terms of Service',
  'footer.privacy': 'Privacy Policy',
  'footer.dataProtection': 'Data Protection',
  'footer.email': 'Email',
  'footer.twitter': 'Twitter',
  'footer.discord': 'Discord',

  'toast.success': 'Success',
  'toast.error': 'Error',
  'toast.info': 'Info',
  'toast.somethingWentWrong': 'Something went wrong',
  'toast.validationError': 'Validation Error',

  'api.error.notFound': 'Not found',
  'api.error.methodNotAllowed': 'Method not allowed',
  'api.error.invalidSignature': 'Invalid signature',
  'api.error.unauthorized': "You don't have access to this resource.",
  'api.error.badRequest': 'Bad request',
  'api.error.unexpected': 'An unexpected error occurred.',
  'api.error.serviceUnavailable':
    'Service unavailable. Please try again later.',
  'api.error.googleMeetUnavailable': 'Google Meet Unavailable',
  'api.error.invalidCredentials': 'Invalid credentials provided.',
  'api.error.emailRequired': 'An email address is required.',

  'error.timeNotAvailable': 'The selected slot is not available.',
  'error.accountNotFound': 'Account with identifier {{identifier}} not found.',
  'error.invalidSession': 'Session was invalidated.',
  'error.meetingNotFound':
    'Meeting slot with identifier {{identifier}} not found.',
  'error.meetingWithYourself': 'Trying to meet with yourself?',
  'error.meetingCreation': 'Error creating meeting',
  'error.multipleSchedulers': 'A meeting must have only one scheduler',
  'error.notGroupMember': 'Not a group member',
  'error.adminBelowOne': 'Cannot have less than one admin',
  'error.isGroupMember': 'Group member cannot perform action',
  'error.alreadyGroupMember': 'Group member cannot accept invite again',
  'error.notGroupAdmin': 'Not a group admin',
  'error.groupNotExists': 'Group does not exist',
  'error.isGroupAdmin': 'Group admin cannot perform action',
  'error.gateInUse': "This gate is being used and therefore can't be deleted.",
  'error.gateConditionNotValid':
    'You do not meet the necessary token conditions to do this action.',
  'error.meetingChangeConflict':
    'Somebody edited the meeting before you. Please refresh the page to get the latest status.',
  'error.meetingCancelConflict':
    'Somebody else cancelled the meeting before you. Please refresh the page to get the latest status.',
  'error.meetingCancelForbidden':
    'Only the host or owners can cancel the meeting. You can RSVP "no" from the calendar invite and/or ask the host to reschedule.',
  'error.huddleUnavailable': 'Huddle API is unavailable',
  'error.googleUnavailable': 'Google API is unavailable',
  'error.zoomUnavailable': 'Zoom API is unavailable',
  'error.urlCreation': 'Error creating URL',
  'error.couponExpired': 'Coupon has expired',
  'error.couponNotValid': 'Coupon is not valid',
  'error.couponAlreadyUsed': 'Coupon has already been used',
  'error.noActiveSubscription': 'No active subscription found',
  'error.subscriptionNotCustom': 'Subscription is not custom',
  'error.subscriptionDomainUpdateNotAllowed':
    'Domain can only be updated for billing subscriptions or custom subscriptions. Legacy blockchain subscriptions require on-chain transactions.',
  'error.missingSubscriptionMetadata':
    'Missing required subscription metadata: billing_plan_id or account_address',
} as const

const es: Record<TranslationKey, string> = {
  'app.language': 'Idioma',
  'app.language.english': 'Inglés',
  'app.language.spanish': 'Español',

  'head.default.title': 'Programa reuniones grupales fácilmente.',
  'head.default.description':
    'Meetwith ofrece una forma sencilla de programar reuniones grupales mientras protege tu privacidad.',

  'nav.dashboard': 'Panel',
  'nav.home': 'Inicio',
  'nav.features': 'Funciones',
  'nav.plans': 'Planes',
  'nav.discordBot': 'Bot de Discord',
  'nav.faq': 'Preguntas frecuentes',
  'nav.signIn': 'Iniciar sesión',
  'nav.logout': 'Cerrar sesión',

  'footer.rights': 'Meetwith. Algunos derechos reservados, quizá...',
  'footer.plans': 'Planes',
  'footer.faq': 'Preguntas frecuentes',
  'footer.featureRequests': 'Solicitudes de funciones',
  'footer.terms': 'Términos del servicio',
  'footer.privacy': 'Política de privacidad',
  'footer.dataProtection': 'Protección de datos',
  'footer.email': 'Correo electrónico',
  'footer.twitter': 'Twitter',
  'footer.discord': 'Discord',

  'toast.success': 'Éxito',
  'toast.error': 'Error',
  'toast.info': 'Información',
  'toast.somethingWentWrong': 'Algo salió mal',
  'toast.validationError': 'Error de validación',

  'api.error.notFound': 'No encontrado',
  'api.error.methodNotAllowed': 'Método no permitido',
  'api.error.invalidSignature': 'Firma no válida',
  'api.error.unauthorized': 'No tienes acceso a este recurso.',
  'api.error.badRequest': 'Solicitud incorrecta',
  'api.error.unexpected': 'Ocurrió un error inesperado.',
  'api.error.serviceUnavailable':
    'Servicio no disponible. Inténtalo de nuevo más tarde.',
  'api.error.googleMeetUnavailable': 'Google Meet no está disponible',
  'api.error.invalidCredentials':
    'Las credenciales proporcionadas no son válidas.',
  'api.error.emailRequired': 'Se requiere una dirección de correo electrónico.',

  'error.timeNotAvailable': 'El horario seleccionado no está disponible.',
  'error.accountNotFound':
    'No se encontró la cuenta con identificador {{identifier}}.',
  'error.invalidSession': 'La sesión fue invalidada.',
  'error.meetingNotFound':
    'No se encontró la reunión con identificador {{identifier}}.',
  'error.meetingWithYourself': '¿Intentas reunirte contigo mismo?',
  'error.meetingCreation': 'Error al crear la reunión',
  'error.multipleSchedulers': 'Una reunión debe tener solo un organizador',
  'error.notGroupMember': 'No eres miembro del grupo',
  'error.adminBelowOne': 'Debe haber al menos un administrador',
  'error.isGroupMember': 'Un miembro del grupo no puede realizar esta acción',
  'error.alreadyGroupMember':
    'El miembro del grupo no puede aceptar la invitación otra vez',
  'error.notGroupAdmin': 'No eres administrador del grupo',
  'error.groupNotExists': 'El grupo no existe',
  'error.isGroupAdmin':
    'El administrador del grupo no puede realizar esta acción',
  'error.gateInUse': 'Esta regla de acceso está en uso y no puede eliminarse.',
  'error.gateConditionNotValid':
    'No cumples las condiciones de tokens necesarias para realizar esta acción.',
  'error.meetingChangeConflict':
    'Alguien editó la reunión antes que tú. Actualiza la página para obtener el estado más reciente.',
  'error.meetingCancelConflict':
    'Alguien canceló la reunión antes que tú. Actualiza la página para obtener el estado más reciente.',
  'error.meetingCancelForbidden':
    'Solo el anfitrión o los propietarios pueden cancelar la reunión. Puedes responder "no" desde la invitación del calendario o pedirle al anfitrión que la reprograme.',
  'error.huddleUnavailable': 'La API de Huddle no está disponible',
  'error.googleUnavailable': 'La API de Google no está disponible',
  'error.zoomUnavailable': 'La API de Zoom no está disponible',
  'error.urlCreation': 'Error al crear la URL',
  'error.couponExpired': 'El cupón ha caducado',
  'error.couponNotValid': 'El cupón no es válido',
  'error.couponAlreadyUsed': 'El cupón ya se ha usado',
  'error.noActiveSubscription': 'No se encontró una suscripción activa',
  'error.subscriptionNotCustom': 'La suscripción no es personalizada',
  'error.subscriptionDomainUpdateNotAllowed':
    'El dominio solo puede actualizarse para suscripciones de facturación o suscripciones personalizadas. Las suscripciones heredadas en blockchain requieren transacciones on-chain.',
  'error.missingSubscriptionMetadata':
    'Faltan metadatos requeridos de la suscripción: billing_plan_id o account_address',
}

export const dictionaries: Record<
  SupportedLocale,
  Record<TranslationKey, string>
> = {
  en,
  es,
}
