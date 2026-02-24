import { env } from '$env/dynamic/private'

export const readServerPasscode = () => env.APP_SECRET_PASSCODE?.trim() ?? ''
