import { APP_SECRET_PASSCODE } from '$env/static/private'

export const readServerPasscode = () => APP_SECRET_PASSCODE?.trim() ?? ''
