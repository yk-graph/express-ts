const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || '3000',
  debug: process.env.APP_DEBUG === 'true',
} as const

export default config
