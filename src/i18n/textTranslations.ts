import type { SupportedLocale } from './config'
import { extraSpanishTextTranslations } from './textTranslationsExtra'

export const textTranslations: Partial<
  Record<SupportedLocale, Record<string, string>>
> = {
  es: {
    '1 hour before': '1 hora antes',
    'A meeting must have only one scheduler':
      'Una reunión debe tener un solo programador',
    'A meeting requires at least two participants. Please add more participants to schedule the meeting.':
      'Una reunión requiere al menos dos participantes. Añade más participantes para programar la reunión.',
    'A tooltip for the link':
      'Una información sobre herramientas para el enlace',
    'Account ID': 'ID de cuenta',
    'Account Not Found': 'Cuenta no encontrada',
    Action: 'Acción',
    'Add from Contact list': 'Añadir desde la lista de contactos',
    'Add new contact': 'Añadir nuevo contacto',
    'Add participants': 'Añadir participantes',
    Amount: 'Importe',
    'Amount:': 'Importe:',
    'An error occurred': 'Se produjo un error',
    'Any information you want to share prior to the meeting?':
      '¿Alguna información que quieras compartir antes de la reunión?',
    'Apply Crop': 'Aplicar recorte',
    'Are you sure? You can&apos;t undo this action afterwards.':
      '¿Estás seguro? No podrás deshacer esta acción después.',
    "Are you sure? You can't undo this action afterwards.":
      '¿Estás seguro? No podrás deshacer esta acción después.',
    'Availability block used for this group':
      'Bloque de disponibilidad usado para este grupo',
    Back: 'Atrás',
    'Banner Image': 'Imagen de banner',
    'Calendar URL is required': 'La URL del calendario es obligatoria',
    Cancel: 'Cancelar',
    'Cancel Meeting': 'Cancelar reunión',
    'Cancel meeting': 'Cancelar reunión',
    'Click on each cell to mark when you&apos;re available, so the host can easily find the best time for everyone.':
      'Haz clic en cada celda para marcar cuándo estás disponible, para que el anfitrión pueda encontrar fácilmente el mejor horario para todos.',
    "Click on each cell to mark when you're available, so the host can easily find the best time for everyone.":
      'Haz clic en cada celda para marcar cuándo estás disponible, para que el anfitrión pueda encontrar fácilmente el mejor horario para todos.',
    Close: 'Cerrar',
    'Close Poll': 'Cerrar encuesta',
    Continue: 'Continuar',
    'Contact invite already accepted or doesn&apos;t exist':
      'La invitación de contacto ya fue aceptada o no existe',
    "Contact invite already accepted or doesn't exist":
      'La invitación de contacto ya fue aceptada o no existe',
    'Copy link': 'Copiar enlace',
    'Could not fetch payment account': 'No se pudo obtener la cuenta de pago',
    'Could not load contact invite request':
      'No se pudo cargar la solicitud de invitación de contacto',
    'Could not load contact request':
      'No se pudo cargar la solicitud de contacto',
    "Couldn't get account's preferences":
      'No se pudieron obtener las preferencias de la cuenta',
    'Create new group': 'Crear nuevo grupo',
    Custom: 'Personalizado',
    Decline: 'Rechazar',
    'Delete Meeting': 'Eliminar reunión',
    'Delete Poll': 'Eliminar encuesta',
    'Delete group': 'Eliminar grupo',
    'Delete meeting': 'Eliminar reunión',
    Description: 'Descripción',
    'Description (optional)': 'Descripción (opcional)',
    'Description:': 'Descripción:',
    Disconnect: 'Desconectar',
    'Does not repeat': 'No se repite',
    Duration: 'Duración',
    Edit: 'Editar',
    'Edit your availability': 'Editar tu disponibilidad',
    'Email address': 'Dirección de correo electrónico',
    'Enter group name': 'Introduce el nombre del grupo',
    'Enter meeting title': 'Introduce el título de la reunión',
    'Enter your email address': 'Introduce tu dirección de correo electrónico',
    Error: 'Error',
    'Error cancelling meeting': 'Error al cancelar la reunión',
    'Failed to create video meeting': 'No se pudo crear la videollamada',
    'Failed to delete meeting': 'No se pudo eliminar la reunión',
    'Failed to schedule meeting': 'No se pudo programar la reunión',
    'Failed to update avatar': 'No se pudo actualizar el avatar',
    'Failed to update meeting': 'No se pudo actualizar la reunión',
    'Failed to update preferences':
      'No se pudieron actualizar las preferencias',
    'File is required': 'El archivo es obligatorio',
    'Full name': 'Nombre completo',
    'Get started for FREE': 'Empieza GRATIS',
    'Give a title for your meeting': 'Dale un título a tu reunión',
    'Go PRO': 'Hazte PRO',
    'Go to Home': 'Ir al inicio',
    'Google seems to be offline. Please select a different meeting location, or try again.':
      'Google parece estar sin conexión. Selecciona una ubicación de reunión diferente o inténtalo de nuevo.',
    'Huddle01 seems to be offline. Please select a custom meeting link, or try again.':
      'Huddle01 parece estar sin conexión. Selecciona un enlace de reunión personalizado o inténtalo de nuevo.',
    'Instance not found': 'Instancia no encontrada',
    'Internal server error': 'Error interno del servidor',
    'Invalid hex color format': 'Formato de color hexadecimal no válido',
    'Invalid invitees': 'Invitados no válidos',
    'Invalid token': 'Token no válido',
    'Invitation sent successfully': 'Invitación enviada correctamente',
    'Invite participants by their ID (Cc)':
      'Invitar participantes por su ID (Cc)',
    'Join Group': 'Unirse al grupo',
    'Join meeting': 'Unirse a la reunión',
    'Jump to Best Slot': 'Ir al mejor horario',
    'Leave group': 'Salir del grupo',
    'Limit reached': 'Límite alcanzado',
    'Link copied': 'Enlace copiado',
    'Load more': 'Cargar más',
    Loading: 'Cargando',
    'Loading...': 'Cargando...',
    Location: 'Ubicación',
    'Log info (for debugging)': 'Información de registro (para depuración)',
    Maybe: 'Tal vez',
    'Meeting Deleted': 'Reunión eliminada',
    'Meeting Duration:': 'Duración de la reunión:',
    'Meeting Repeat': 'Repetición de la reunión',
    'Meeting Title:': 'Título de la reunión:',
    'Meeting link:': 'Enlace de la reunión:',
    'Meeting not found': 'Reunión no encontrada',
    'Meeting participants': 'Participantes de la reunión',
    Member: 'Miembro',
    'Method not allowed': 'Método no permitido',
    Minutes: 'Minutos',
    'Missing information': 'Falta información',
    Month: 'Mes',
    No: 'No',
    'No email found for this account':
      'No se encontró ningún correo electrónico para esta cuenta',
    Notifications: 'Notificaciones',
    'Notification types': 'Tipos de notificación',
    'Number of Sessions': 'Número de sesiones',
    Ok: 'Aceptar',
    Ops: 'Ups',
    "Ops! Can't do that": '¡Ups! No se puede hacer eso',
    'Participant ID is required': 'El ID del participante es obligatorio',
    'Participants:': 'Participantes:',
    'Payment Failed': 'Pago fallido',
    Pending: 'Pendiente',
    'Permission Denied': 'Permiso denegado',
    Plan: 'Plan',
    'Please provide a valid url/link for your meeting.':
      'Proporciona una URL/enlace válido para tu reunión.',
    'Poll ID is required': 'El ID de la encuesta es obligatorio',
    'Powered by Meetwith': 'Con tecnología de Meetwith',
    'RSVP:': 'Confirmación de asistencia:',
    Reminder: 'Recordatorio',
    Remove: 'Eliminar',
    'Reopen Poll': 'Reabrir encuesta',
    Role: 'Rol',
    Save: 'Guardar',
    'Save Changes': 'Guardar cambios',
    Schedule: 'Programar',
    'Schedule now': 'Programar ahora',
    'Select Notification Alerts': 'Seleccionar alertas de notificación',
    'Select all the time slots that work for you':
      'Selecciona todos los horarios que te convengan',
    'Select payment method': 'Seleccionar método de pago',
    Settings: 'Configuración',
    'SHOULD BE LOGGED IN': 'DEBE HABER INICIADO SESIÓN',
    'Show times in': 'Mostrar horarios en',
    'Sign in': 'Iniciar sesión',
    'Someone else has updated this meeting. Please reload and try again.':
      'Otra persona ha actualizado esta reunión. Vuelve a cargar e inténtalo de nuevo.',
    'Something went wrong with your avatar upload. Please try again or contact support if the issue persists.':
      'Algo salió mal al subir tu avatar. Inténtalo de nuevo o contacta con soporte si el problema persiste.',
    Success: 'Éxito',
    'Success!': '¡Éxito!',
    'The meeting information could not be retrieved. Please try again.':
      'No se pudo recuperar la información de la reunión. Inténtalo de nuevo.',
    'The meeting was deleted successfully':
      'La reunión se eliminó correctamente',
    'The selected time is not available anymore':
      'La hora seleccionada ya no está disponible',
    'There was an issue generating a meeting url for your meeting. try using a different location':
      'Hubo un problema al generar una URL de reunión para tu reunión. Intenta usar una ubicación diferente.',
    'There was an issue scheduling your meeting. Please get in touch with us through support@meetwithwallet.xyz':
      'Hubo un problema al programar tu reunión. Ponte en contacto con nosotros a través de support@meetwithwallet.xyz',
    'There was an issue updating preferences. Please contact us at support@meetwith.xyz':
      'Hubo un problema al actualizar las preferencias. Contáctanos en support@meetwith.xyz',
    'This user has already been added to the invite list.':
      'Este usuario ya ha sido añadido a la lista de invitados.',
    Timezone: 'Zona horaria',
    'Timezone:': 'Zona horaria:',
    Title: 'Título',
    'Token has already been used or is invalid':
      'El token ya se ha usado o no es válido',
    'Token has expired': 'El token ha caducado',
    'Unable to load meeting details':
      'No se pueden cargar los detalles de la reunión',
    Unauthorized: 'No autorizado',
    'Unknown error': 'Error desconocido',
    Update: 'Actualizar',
    User: 'Usuario',
    'User already added': 'Usuario ya añadido',
    Wallet: 'Billetera',
    Yes: 'Sí',
    'You can select up to 5 notifications only.':
      'Solo puedes seleccionar hasta 5 notificaciones.',
    'You can&apos;t invite yourself': 'No puedes invitarte a ti mismo',
    "You can't invite yourself": 'No puedes invitarte a ti mismo',
    'Your name or an identifier': 'Tu nombre o un identificador',
    'Zoom seems to be offline. Please select a different meeting location, or try again.':
      'Zoom parece estar sin conexión. Selecciona una ubicación de reunión diferente o inténtalo de nuevo.',
    'insert a custom meeting url': 'insertar una URL de reunión personalizada',
    'mins per session': 'min por sesión',
    'toggle input mode': 'cambiar modo de entrada',
    ...extraSpanishTextTranslations,
  },
}
